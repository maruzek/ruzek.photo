import { execFile } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');
// `conference-speaker` is on the home page (photo fold), `party-beer-glance` in the work grid: neither may leave any file in `dist`
const WITHDRAWN = ['conference-speaker', 'party-beer-glance'];

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

// Issue E-14: a withdrawn photo (`published: false`) must not be served at all, not even its original JPEG.
describe('build with withdrawn photos', () => {
  let tmp = '';
  let files: string[] = [];

  beforeAll(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'ruzek-unpublished-'));
    const entries = [
      'src',
      'scripts',
      'public', // _headers holds the CSP placeholder the build fills in
      'design/logo',
      'astro.config.ts',
      'tsconfig.json',
      'package.json',
      'wrangler.jsonc',
    ];
    for (const entry of entries) {
      await cp(join(ROOT, entry), join(tmp, entry), { recursive: true });
    }
    await symlink(join(ROOT, 'node_modules'), join(tmp, 'node_modules'), 'dir');
    for (const id of WITHDRAWN) {
      const path = join(tmp, 'src/content/photos', `${id}.yaml`);
      const yaml = await readFile(path, 'utf8');
      expect(yaml).toMatch(/^published: true$/m);
      await writeFile(path, yaml.replace(/^published: true$/m, 'published: false'));
    }
    await run(join(ROOT, 'node_modules/.bin/astro'), ['build'], {
      cwd: tmp,
      maxBuffer: 64 * 1024 * 1024,
    });
    files = await listFiles(join(tmp, 'dist'));
  }, 180_000);

  afterAll(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true });
  });

  it.each(WITHDRAWN)('emits no file derived from %s', (id) => {
    const derived = files.filter((f) => f.split('/').pop()?.startsWith(`${id}.`));
    expect(derived).toEqual([]);
  });

  it('still emits the published hero photo', () => {
    expect(files.some((f) => /\/ball-dance-red\.[^/]+\.avif$/.test(f))).toBe(true);
  });

  it('mentions no withdrawn photo in the HTML', async () => {
    for (const html of files.filter((f) => f.endsWith('.html'))) {
      const text = await readFile(html, 'utf8');
      for (const id of WITHDRAWN) expect(text).not.toMatch(new RegExp(`/_astro/${id}\\.`));
    }
  });
});
