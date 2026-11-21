import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Budgets that Lighthouse's own assertions cannot express (concept.md, kap. 13). They are computed from the BUILD
// OUTPUT, not from network timing, so the numbers do not depend on how fast a run was:
//
//   first render  inline executable scripts + the module scripts the page loads + their STATIC imports.
//                 Dynamic imports (the motion layer) and islands are not in it.
//   deferred      everything reachable only through a dynamic `import()` from the first-render files (the motion
//                 layer: GSAP, Lenis, choreo, wipes) and its own static imports.
//   island        the `client:visible` React island(s): component, renderer and their static imports.
//   trackers      the real Umami, Cloudflare beacon and Turnstile scripts, which are not in the build (constants
//                 below).
//
// Size is gzip level 9, each script on its own (so a little more than the HTML or the chunk costs on the wire in
// brotli, which Cloudflare serves to browsers). A chunk shared by several parts is counted once, in the first one.

/** Concept budget for first-render JS (compressed): 10 kB plus the entry loader (decisions.md, 2026-11-22). */
export const FIRST_RENDER_JS_BUDGET = 12 * 1024;
/** Concept budget for all JS of the home page: first render + motion + island + trackers (10 + 10 + 75 + 55 kB). */
export const TOTAL_JS_BUDGET = 150 * 1024;

/**
 * Gzip transfer size of the real third-party scripts that are not in the build, measured once on 2026-11-21 with
 * `curl -L -H 'Accept-Encoding: gzip'` on https://cloud.umami.is/script.js,
 * https://static.cloudflareinsights.com/beacon.min.js and
 * https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit (the form island loads it as soon as it
 * hydrates, src/islands/useTurnstile.ts). They change rarely; measure again when updating.
 */
export const TRACKER_GZIP_BYTES = {
  umami: 4173,
  cloudflareBeacon: 10264,
  turnstile: 27594,
} as const;

export interface JsPart {
  label: string;
  bytes: number;
}

export interface PageJs {
  firstRender: JsPart[];
  deferred: JsPart[];
  island: JsPart[];
  trackers: JsPart[];
}

const gzipBytes = (data: string | Buffer): number => gzipSync(data, { level: 9 }).length;
export const sumBytes = (parts: JsPart[]): number => parts.reduce((s, p) => s + p.bytes, 0);

// minified Vite output: `import{a as b}from"./x.js"`, `import"./x.js"`, `export{a}from"./x.js"`
const STATIC_IMPORT =
  /\b(?:import|export)\s*(?:[\w$\s{},*]*?\bfrom\s*)?["'](\.{0,2}\/[^"']+\.js)["']/g;
// `import(`./x.js`)`: loaded later, on demand
const DYNAMIC_IMPORT = /\bimport\(\s*[`"'](\.{0,2}\/[^`"']+\.js)[`"']\s*\)/g;

interface Module {
  url: string;
  bytes: number;
  static: string[];
  dynamic: string[];
}

async function readModule(distDir: string, url: string): Promise<Module> {
  const source = await readFile(join(distDir, url), 'utf8');
  const resolve = (spec: string): string => new URL(spec, `https://x${url}`).pathname;
  return {
    url,
    bytes: gzipBytes(source),
    static: [...source.matchAll(STATIC_IMPORT)].map((m) => resolve(m[1] ?? '')),
    dynamic: [...source.matchAll(DYNAMIC_IMPORT)].map((m) => resolve(m[1] ?? '')),
  };
}

/** Modules reachable from `entries` (static imports only, or dynamic ones too), minus `seen`. Adds to `seen`. */
async function reach(
  distDir: string,
  entries: string[],
  follow: 'static' | 'all',
  seen: Set<string>,
): Promise<Module[]> {
  const found: Module[] = [];
  const queue = [...entries];
  for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
    if (seen.has(url)) continue;
    seen.add(url);
    const mod = await readModule(distDir, url);
    found.push(mod);
    queue.push(...mod.static, ...(follow === 'all' ? mod.dynamic : []));
  }
  return found;
}

const toParts = (mods: Module[]): JsPart[] =>
  mods.map((m) => ({ label: m.url.replace(/^\/_astro\//, ''), bytes: m.bytes }));

/** The JavaScript of one built page, split by when it loads. `pagePath` is a file under `distDir`. */
export async function pageJs(distDir: string, pagePath: string): Promise<PageJs> {
  const html = await readFile(join(distDir, pagePath), 'utf8');

  const inline: JsPart[] = [];
  const entries: string[] = [];
  let n = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] ?? '';
    const type = /\btype="([^"]*)"/.exec(attrs)?.[1];
    // data blocks (JSON-LD) are not executable
    if (type !== undefined && type !== 'module' && type !== 'text/javascript') continue;
    const src = /\bsrc="([^"]+)"/.exec(attrs)?.[1];
    if (src) entries.push(src);
    else if ((m[2] ?? '').trim()) {
      n += 1;
      inline.push({
        label: `inline ${type === 'module' ? 'module ' : ''}script ${n}`,
        bytes: gzipBytes(m[2] ?? ''),
      });
    }
  }
  for (const m of html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*>/g)) {
    const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
    if (href) entries.push(href);
  }

  const seen = new Set<string>();
  const first = await reach(distDir, entries, 'static', seen);
  const later = await reach(
    distDir,
    first.flatMap((m) => m.dynamic),
    'all',
    seen,
  );

  const islandEntries: string[] = [];
  for (const m of html.matchAll(/<astro-island\b[^>]*>/g)) {
    for (const attr of ['component-url', 'renderer-url']) {
      const url = new RegExp(`\\b${attr}="([^"]+)"`).exec(m[0])?.[1];
      if (url) islandEntries.push(url);
    }
  }
  const island = await reach(distDir, islandEntries, 'all', seen);

  return {
    firstRender: [...inline, ...toParts(first)],
    deferred: toParts(later),
    island: toParts(island),
    trackers: [
      { label: 'Umami (real script, gzip, measured 2026-11-21)', bytes: TRACKER_GZIP_BYTES.umami },
      {
        label: 'Cloudflare beacon (real script, gzip, measured 2026-11-21)',
        bytes: TRACKER_GZIP_BYTES.cloudflareBeacon,
      },
      {
        label: 'Turnstile api.js (real script, gzip, measured 2026-11-21, loads with the form)',
        bytes: TRACKER_GZIP_BYTES.turnstile,
      },
    ],
  };
}

export const totalJsBytes = (js: PageJs): number =>
  sumBytes(js.firstRender) + sumBytes(js.deferred) + sumBytes(js.island) + sumBytes(js.trackers);

const kB = (bytes: number): string => `${(bytes / 1024).toFixed(1)} kB`;

/** One line per budget a page is over (empty = within budget). */
export function budgetProblems(
  js: PageJs,
  page: string,
  budgets = { firstRender: FIRST_RENDER_JS_BUDGET, total: TOTAL_JS_BUDGET },
): string[] {
  const problems: string[] = [];
  const first = sumBytes(js.firstRender);
  if (first > budgets.firstRender)
    problems.push(`first-render JS ${kB(first)} > ${kB(budgets.firstRender)} (${page})`);
  const total = totalJsBytes(js);
  if (total > budgets.total)
    problems.push(`total JS ${kB(total)} > ${kB(budgets.total)} (${page})`);
  return problems;
}

/** A readable breakdown, one block per part, for the log. */
export function describeJs(js: PageJs, page: string): string {
  const block = (title: string, parts: JsPart[]): string =>
    [
      `  ${title}: ${kB(sumBytes(parts))}`,
      ...parts.map((p) => `      ${kB(p.bytes).padStart(8)}  ${p.label}`),
    ].join('\n');
  return [
    `${page} (gzip -9, from the build output)`,
    block('first render', js.firstRender),
    block('deferred (motion)', js.deferred),
    block('island (client:visible)', js.island),
    block('external scripts (real, constants)', js.trackers),
    `  TOTAL: ${kB(totalJsBytes(js))}`,
  ].join('\n');
}
