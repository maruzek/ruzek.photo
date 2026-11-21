import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { loadEnv } from 'vite';
import { parse } from 'yaml';
import { ANALYTICS_TEST_ENV } from '../tests/e2e/analytics-env';
import { photoSchema, type Photo } from '../src/lib/photos/schema';

// Last look before a real launch (plan, task 15). It is NOT part of `pnpm check`: the placeholder photos are
// published on purpose until Martin delivers real ones. Run it with the production values in the environment
// (`pnpm check:launch`, values from a git-ignored `.env`, see `.env.example`).
//
// Two kinds of values, read in two ways:
// - PUBLIC_* values are baked into the pages at build time, and the build does not see exactly the files this
//   script could read (the Cloudflare adapter first copies wrangler `vars`, `.dev.vars` and `.env` into
//   process.env, which then beats `.env.production`). So they are read from the BUILT pages in dist/client, which
//   is what would really ship. A missing or stale dist is itself a problem: run `pnpm build` with the production
//   values first.
// - server secrets (TURNSTILE_SECRET, the mail provider) never reach the build. They come from the process
//   environment and the `.env*` files (Vite's loader, mode production), limited to those names.

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

/** Names of the server secrets the check reads; only these are ever loaded from the `.env*` files. */
const SERVER_ENV = ['TURNSTILE_SECRET', 'RESEND_API_KEY', 'MAILER'];

/**
 * Server secrets as the production setup has them: Vite's loader with mode `production` (`.env`, `.env.local`,
 * `.env.production`, `.env.production.local`, later files win), limited to the names above, then the process
 * environment on top.
 */
export function launchEnv(root: string, processEnv: Env = process.env): Env {
  return { ...loadEnv('production', root, SERVER_ENV), ...processEnv };
}

/** The PUBLIC_* values as they are baked into the built pages. `null` = not set in the build. */
export interface Shipped {
  siteKey: string | null;
  umami: { src: string; websiteId: string } | null;
  cfBeaconToken: string | null;
}

type ShippedResult = { shipped: Shipped } | { problem: string };

// Base.astro renders the validated analytics configuration as JSON, Inquiry.astro passes the site key as a prop
// of the form island (serialised into the astro-island `props` attribute, quotes escaped as &quot;)
const ANALYTICS_JSON =
  /<script type="application\/json" id="analytics-config">([\s\S]*?)<\/script>/;
const SITE_KEY_PROP = /&quot;siteKey&quot;:\[0(?:,&quot;([^&]*)&quot;)?\]/;

function shippedFrom(html: string): Shipped | null {
  const json = ANALYTICS_JSON.exec(html)?.[1];
  if (json === undefined) return null;
  const config = JSON.parse(json) as {
    umami: { src: string; websiteId: string } | null;
    cfBeaconToken: string | null;
  };
  return {
    siteKey: SITE_KEY_PROP.exec(html)?.[1] ?? null,
    umami: config.umami ? { src: config.umami.src, websiteId: config.umami.websiteId } : null,
    cfBeaconToken: config.cfBeaconToken,
  };
}

async function newestMtime(path: string): Promise<{ file: string; time: number } | null> {
  let info;
  try {
    info = await stat(path);
  } catch {
    return null;
  }
  if (!info.isDirectory()) return { file: path, time: info.mtimeMs };
  let newest: { file: string; time: number } | null = null;
  for (const entry of await readdir(path)) {
    const found = await newestMtime(join(path, entry));
    if (found && (!newest || found.time > newest.time)) newest = found;
  }
  return newest;
}

/**
 * Reads the public values from the built Czech and English home pages. Problem when dist is missing, older than
 * any of the `inputs` (files or folders that feed the build), unreadable, or the two languages disagree.
 */
export async function readShipped(distDir: string, inputs: string[]): Promise<ShippedResult> {
  const pages = ['index.html', 'en/index.html'].map((f) => join(distDir, f));
  let htmls: string[];
  let builtAt: number;
  try {
    htmls = await Promise.all(pages.map((p) => readFile(p, 'utf8')));
    builtAt = Math.min(...(await Promise.all(pages.map(async (p) => (await stat(p)).mtimeMs))));
  } catch {
    return {
      problem: 'dist/client has no built pages: run `pnpm build` with the production values first',
    };
  }
  for (const input of inputs) {
    const newer = await newestMtime(input);
    if (newer && newer.time > builtAt)
      return {
        problem: `dist/client is older than ${relative(resolve(distDir, '..', '..'), newer.file)}: run \`pnpm build\` again with the production values`,
      };
  }
  const [cs, en] = htmls.map(shippedFrom);
  if (!cs || !en)
    return {
      problem: 'the built pages have no analytics configuration: rebuild with `pnpm build`',
    };
  if (JSON.stringify(cs) !== JSON.stringify(en))
    return {
      problem:
        'the Czech and English built pages carry different public values: rebuild with `pnpm build`',
    };
  return { shipped: cs };
}

/** Problems with the public values the pages carry. */
function shippedProblems(shipped: Shipped): string[] {
  const problems: string[] = [];
  const siteKey = shipped.siteKey?.trim();
  if (!siteKey)
    problems.push(
      'the built pages have no Turnstile site key (PUBLIC_TURNSTILE_SITE_KEY was not set at build): the form cannot be sent',
    );
  else if (TURNSTILE_TEST_SITE_KEYS.includes(siteKey))
    problems.push(
      'the built pages ship a Cloudflare test Turnstile site key (PUBLIC_TURNSTILE_SITE_KEY), build with the real widget key',
    );

  // the build switches a tool off when its variables are missing or invalid, so `null` covers both
  if (!shipped.umami)
    problems.push(
      'the built pages have Umami switched off (PUBLIC_UMAMI_SRC or PUBLIC_UMAMI_WEBSITE_ID missing or invalid at build)',
    );
  else if (
    new URL(shipped.umami.src).hostname === new URL(ANALYTICS_TEST_ENV.PUBLIC_UMAMI_SRC).hostname ||
    shipped.umami.websiteId === ANALYTICS_TEST_ENV.PUBLIC_UMAMI_WEBSITE_ID
  )
    problems.push('the built pages carry the e2e test Umami values: build with the real ones');
  if (!shipped.cfBeaconToken)
    problems.push(
      'the built pages have no Cloudflare beacon (PUBLIC_CF_BEACON_TOKEN missing or invalid at build): no Core Web Vitals from real visitors',
    );
  else if (shipped.cfBeaconToken === ANALYTICS_TEST_ENV.PUBLIC_CF_BEACON_TOKEN)
    problems.push(
      'the built pages carry the e2e test Cloudflare beacon token: build with the real one',
    );
  return problems;
}

/**
 * Everything that must be true before the site goes live, as a list of readable problems (empty = ready).
 * `shipped` is what the built pages carry (`readShipped`); `env` holds the server secrets, which live only at
 * Cloudflare (`wrangler secret put`), so the values have to be exported for this run. Never print the values.
 */
export function launchProblems(opts: {
  photos: Photo<unknown>[];
  env: Env;
  /** null = no usable build: the public values are not judged (readShipped reports why) */
  shipped: Shipped | null;
}): string[] {
  const { photos, env, shipped } = opts;
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

  // mailer.ts: MAILER=console sends nothing; without RESEND_API_KEY every send fails
  if (env['MAILER']?.trim() === 'console')
    problems.push('MAILER=console: no inquiry mail would be sent, unset it for production');
  else if (!set(env['RESEND_API_KEY']))
    problems.push(
      'mail provider is not configured (RESEND_API_KEY): inquiries would be stored but no mail sent',
    );

  if (shipped) problems.push(...shippedProblems(shipped));

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
  const built = await readShipped(join(root, 'dist/client'), [
    ...['.env', '.env.local', '.env.production', '.env.production.local'].map((f) => join(root, f)),
    ...['.dev.vars', 'wrangler.jsonc', 'astro.config.ts', 'package.json', 'src'].map((f) =>
      join(root, f),
    ),
  ]);
  const problems = launchProblems({
    photos,
    env: launchEnv(root),
    shipped: 'shipped' in built ? built.shipped : null,
  });
  if ('problem' in built) problems.unshift(built.problem);
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
