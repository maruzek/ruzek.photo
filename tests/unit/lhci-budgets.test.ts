import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import {
  budgetProblems,
  pageJs,
  sumBytes,
  totalJsBytes,
  TRACKER_GZIP_BYTES,
  type PageJs,
} from '../../scripts/lhci-budgets';

const dist = mkdtempSync(join(tmpdir(), 'js-budget-'));
afterAll(() => rmSync(dist, { recursive: true, force: true }));
mkdirSync(join(dist, '_astro'));

// incompressible-ish filler so every file has a distinct, non-trivial gzip size
const filler = (seed: number, length: number): string => {
  let x = seed;
  let out = '';
  while (out.length < length) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out += x.toString(36);
  }
  return `/*${out.slice(0, length)}*/`;
};
const gz = (s: string): number => gzipSync(s, { level: 9 }).length;
const files: Record<string, string> = {
  'entry.js': `import{t as a}from"./shared.js";import"./side.js";const m=()=>import(\`./motion.js\`);${filler(1, 800)}`,
  'shared.js': `export const t=1;${filler(2, 600)}`,
  'side.js': `export{x}from"./shared.js";${filler(3, 300)}`,
  'motion.js': `import{t}from"./shared.js";import"./motion-dep.js";${filler(4, 3000)}`,
  'motion-dep.js': filler(5, 1500),
  'island.js': `import{t}from"./shared.js";import"./island-dep.js";${filler(6, 2000)}`,
  'island-dep.js': filler(7, 900),
  'renderer.js': filler(8, 700),
  'unreferenced.js': filler(9, 5000),
};
for (const [name, source] of Object.entries(files))
  writeFileSync(join(dist, '_astro', name), source);

const inlineBoot = `const r=document.documentElement;r.classList.add('motion');${filler(10, 400)}`;
writeFileSync(
  join(dist, 'index.html'),
  `<html><head>
<script>${inlineBoot}</script>
<script type="application/ld+json">${filler(11, 2000)}</script>
<script type="module" src="/_astro/entry.js"></script>
</head><body>
<astro-island uid="a" component-url="/_astro/island.js" renderer-url="/_astro/renderer.js" client="visible"></astro-island>
</body></html>`,
);

describe('pageJs (from the build output)', () => {
  it('counts inline scripts and the static import graph, but not data blocks or dynamic imports', async () => {
    const js = await pageJs(dist, 'index.html');
    const labels = js.firstRender.map((p) => p.label);
    expect(labels).toEqual(['inline script 1', 'entry.js', 'shared.js', 'side.js']);
    expect(sumBytes(js.firstRender)).toBe(
      gz(inlineBoot) + gz(files['entry.js']!) + gz(files['shared.js']!) + gz(files['side.js']!),
    );
  });

  it('puts dynamically imported chunks in deferred, with their own static imports', async () => {
    const js = await pageJs(dist, 'index.html');
    expect(js.deferred.map((p) => p.label)).toEqual(['motion.js', 'motion-dep.js']);
  });

  it('puts the island in its own part and counts a shared chunk only once', async () => {
    const js = await pageJs(dist, 'index.html');
    expect(js.island.map((p) => p.label).sort()).toEqual([
      'island-dep.js',
      'island.js',
      'renderer.js',
    ]);
    const all = [...js.firstRender, ...js.deferred, ...js.island].map((p) => p.label);
    expect(all.filter((l) => l === 'shared.js')).toHaveLength(1);
    expect(all).not.toContain('unreferenced.js');
  });

  it('adds the real sizes of Umami, the beacon and Turnstile api.js to the total', async () => {
    const js = await pageJs(dist, 'index.html');
    expect(sumBytes(js.trackers)).toBe(
      TRACKER_GZIP_BYTES.umami + TRACKER_GZIP_BYTES.cloudflareBeacon + TRACKER_GZIP_BYTES.turnstile,
    );
    expect(js.trackers.map((p) => p.label.split(' ')[0])).toContain('Turnstile');
    expect(totalJsBytes(js)).toBe(
      sumBytes(js.firstRender) +
        sumBytes(js.deferred) +
        sumBytes(js.island) +
        sumBytes(js.trackers),
    );
  });
});

describe('budgetProblems', () => {
  const part = (bytes: number) => [{ label: 'x', bytes }];
  const js = (first: number, rest: number): PageJs => ({
    firstRender: part(first),
    deferred: part(rest),
    island: [],
    trackers: [],
  });

  it('passes within both budgets', () => {
    expect(budgetProblems(js(9000, 50000), '/')).toEqual([]);
  });

  it('names the page and the budget that is over', () => {
    const problems = budgetProblems(js(12000, 50000), '/en/');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/first-render.*\/en\//);
    expect(budgetProblems(js(1000, 200000), '/').join()).toMatch(/total JS/);
  });
});
