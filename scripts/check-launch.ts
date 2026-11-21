import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { loadEnv } from 'vite';
import { parse } from 'yaml';
import { analyticsFrom } from '../src/config/analytics-from';
import { photoSchema, type Photo } from '../src/lib/photos/schema';

// Last look before a real launch (plan, task 15). It is NOT part of `pnpm check`: the placeholder photos are
// published on purpose until Martin delivers real ones. Run it with the production values in the environment
// (`pnpm check:launch`, values from a git-ignored `.env`, see `.env.example`).

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Cloudflare's published Turnstile test keys (always pass, always fail, forced challenge, spent token). They
 * never protect anything. Source: developers.cloudflare.com/turnstile/troubleshooting/testing
 */
const TURNSTILE_TEST_SITE_KEYS: readonly string[] = [
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
];
export const TURNSTILE_TEST_SECRETS: readonly string[] = [
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
];

const set = (value: string | undefined): value is string => Boolean(value?.trim());

/**
 * The values the production build sees: Vite's own loader with mode `production` (`.env`, `.env.local`,
 * `.env.production`, `.env.production.local`, later files win), then the process environment on top.
 */
export function launchEnv(root: string, processEnv: Env = process.env): Env {
  return { ...loadEnv('production', root, ''), ...processEnv };
}

/**
 * Everything that must be true before the site goes live, as a list of readable problems (empty = ready).
 * Secrets that live only at Cloudflare (`wrangler secret put`) are checked here from the environment, so the
 * values have to be exported for this run. Never print the values.
 */
export function launchProblems(opts: { photos: Photo<unknown>[]; env: Env }): string[] {
  const { photos, env } = opts;
  const problems: string[] = [];

  for (const p of photos) {
    if (p.published && p.placeholder) {
      problems.push(
        `placeholder photo is published (${String(p.image).split('/').pop()}): set published: false or replace it with a real photo`,
      );
    }
  }

  const secret = env['TURNSTILE_SECRET'];
  if (!set(secret))
    problems.push('TURNSTILE_SECRET is not set (Turnstile would refuse every inquiry)');
  else if (TURNSTILE_TEST_SECRETS.includes(secret.trim()))
    problems.push('TURNSTILE_SECRET is a Cloudflare test secret, use the real widget secret');

  const siteKey = env['PUBLIC_TURNSTILE_SITE_KEY'];
  if (!set(siteKey))
    problems.push('PUBLIC_TURNSTILE_SITE_KEY is not set (the form cannot be sent)');
  else if (TURNSTILE_TEST_SITE_KEYS.includes(siteKey.trim()))
    problems.push('PUBLIC_TURNSTILE_SITE_KEY is a Cloudflare test key, use the real widget key');

  // mailer.ts: MAILER=console sends nothing; without RESEND_API_KEY every send fails
  if (env['MAILER']?.trim() === 'console')
    problems.push('MAILER=console: no inquiry mail would be sent, unset it for production');
  else if (!set(env['RESEND_API_KEY']))
    problems.push(
      'mail provider is not configured (RESEND_API_KEY): inquiries would be stored but no mail sent',
    );

  // the same validation the build uses (src/config/analytics-from.ts), so a typo is caught the same way
  const analytics = analyticsFrom({
    PUBLIC_UMAMI_SRC: env['PUBLIC_UMAMI_SRC'],
    PUBLIC_UMAMI_WEBSITE_ID: 'x',
    PUBLIC_CF_BEACON_TOKEN: env['PUBLIC_CF_BEACON_TOKEN'],
  });
  if (!set(env['PUBLIC_UMAMI_SRC']))
    problems.push('PUBLIC_UMAMI_SRC is not set (Umami would be off)');
  else if (!analytics.umami)
    problems.push('PUBLIC_UMAMI_SRC must be an absolute https URL of the Umami script');
  if (!set(env['PUBLIC_UMAMI_WEBSITE_ID']))
    problems.push('PUBLIC_UMAMI_WEBSITE_ID is not set (Umami would be off)');
  else if (!analyticsFrom({ ...env, PUBLIC_UMAMI_SRC: 'https://u.example/s.js' }).umami)
    problems.push('PUBLIC_UMAMI_WEBSITE_ID has an invalid format');
  if (!set(env['PUBLIC_CF_BEACON_TOKEN']))
    problems.push('PUBLIC_CF_BEACON_TOKEN is not set (no Core Web Vitals from real visitors)');
  else if (!analytics.cfBeaconToken) problems.push('PUBLIC_CF_BEACON_TOKEN has an invalid format');

  return problems;
}

/** Visible `TODO` text left in the built pages: a warning, because visible TODOs are allowed by the project rules. */
export async function leftoverTodos(distDir: string): Promise<{ file: string; count: number }[]> {
  const found: { file: string; count: number }[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.html')) {
        const count = (
          (await readFile(path, 'utf8'))
            // only visible text counts, not scripts or styles
            .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
            .match(/\bTODO\b/g) ?? []
        ).length;
        if (count > 0) found.push({ file: relative(distDir, path), count });
      }
    }
  }
  await walk(distDir);
  return found;
}

async function loadPhotos(dir: string): Promise<Photo<unknown>[]> {
  const schema = photoSchema(z.string());
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort();
  return Promise.all(
    files.map(async (file) => schema.parse(parse(await readFile(join(dir, file), 'utf8')))),
  );
}

async function main(): Promise<void> {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const photos = await loadPhotos(join(root, 'src/content/photos'));
  const problems = launchProblems({ photos, env: launchEnv(root) });
  const todos = await leftoverTodos(join(root, 'dist/client'));

  if (todos.length > 0) {
    const total = todos.reduce((sum, t) => sum + t.count, 0);
    console.warn(
      `warning: ${total} visible TODO in dist/client (allowed, but fill them before launch):`,
    );
    for (const t of todos) console.warn(`  ${t.file}: ${t.count}`);
  } else {
    console.warn('no visible TODO in dist/client (or dist is missing: run pnpm build first)');
  }

  if (problems.length > 0) {
    console.error(`\ncheck:launch failed, ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log('check:launch: ready to launch');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
