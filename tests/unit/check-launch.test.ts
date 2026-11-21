import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  launchEnv,
  launchProblems,
  leftoverTodos,
  readShipped,
  type Shipped,
  TURNSTILE_TEST_SECRETS,
} from '../../scripts/check-launch';
import type { Photo } from '../../src/lib/photos/schema';

const photo = (over: Partial<Photo<unknown>> = {}): Photo<unknown> => ({
  image: 'x.jpg',
  alt: { cs: 'Řečník', en: 'A speaker' },
  category: 'event',
  published: true,
  placeholder: false,
  consentRef: 'C-2026-001',
  minors: false,
  parentalConsent: false,
  shade: 'normal',
  ...over,
});

const goodEnv: Record<string, string> = {
  TURNSTILE_SECRET: 'prod-secret-value',
  RESEND_API_KEY: 're_prodkey',
};
const goodShipped: Shipped = {
  siteKey: '0x4AAAAAAAprodkey',
  umami: {
    src: 'https://cloud.umami.is/script.js',
    websiteId: '3c1f0b52-0000-4000-8000-000000000000',
  },
  cfBeaconToken: 'cfbeacontoken0123',
};
const problemsFor = (over: {
  env?: Record<string, string | undefined>;
  shipped?: Partial<Shipped> | null;
  photos?: Photo<unknown>[];
}): string[] =>
  launchProblems({
    photos: over.photos ?? [],
    env: { ...goodEnv, ...over.env },
    shipped: over.shipped === null ? null : { ...goodShipped, ...over.shipped },
  });

describe('launchProblems', () => {
  it('passes with real photos and every setting in place', () => {
    expect(problemsFor({ photos: [photo()] })).toEqual([]);
  });

  it('ignores an unpublished placeholder', () => {
    const photos = [photo(), photo({ placeholder: true, published: false })];
    expect(problemsFor({ photos })).toEqual([]);
  });

  it('flags a published placeholder photo', () => {
    const problems = problemsFor({ photos: [photo({ placeholder: true, image: 'stock.jpg' })] });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/placeholder/i);
  });

  it.each([
    ['TURNSTILE_SECRET', /TURNSTILE_SECRET/],
    ['RESEND_API_KEY', /mail provider/i],
  ])('flags a missing server secret %s', (name, pattern) => {
    const problems = problemsFor({ env: { [name]: undefined } });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(pattern);
  });

  it.each([
    ['site key', { siteKey: null }, /PUBLIC_TURNSTILE_SITE_KEY/],
    ['Umami', { umami: null }, /Umami/],
    ['Cloudflare beacon', { cfBeaconToken: null }, /PUBLIC_CF_BEACON_TOKEN/],
  ] as const)('flags a built page without the %s', (_name, shipped, pattern) => {
    const problems = problemsFor({ shipped });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(pattern);
  });

  it('does not judge the public values when there is no usable build', () => {
    expect(problemsFor({ shipped: null })).toEqual([]);
  });

  it('flags an empty value like a missing one', () => {
    expect(problemsFor({ env: { TURNSTILE_SECRET: '  ' } }).join()).toMatch(/TURNSTILE_SECRET/);
  });

  it('flags MAILER=console even when a key is set (nothing would be sent)', () => {
    expect(problemsFor({ env: { MAILER: 'console' } }).join()).toMatch(/MAILER/);
  });

  // every key Cloudflare publishes at developers.cloudflare.com/turnstile/troubleshooting/testing
  it.each([
    '1x00000000000000000000AA',
    '2x00000000000000000000AB',
    '1x00000000000000000000BB',
    '2x00000000000000000000BB',
    '3x00000000000000000000FF',
  ])('flags the Cloudflare test site key %s in the built pages', (siteKey) => {
    const problems = problemsFor({ shipped: { siteKey } });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/PUBLIC_TURNSTILE_SITE_KEY/);
  });

  it.each([
    '1x0000000000000000000000000000000AA',
    '2x0000000000000000000000000000000AA',
    '3x0000000000000000000000000000000AA',
  ])('flags the Cloudflare test secret %s', (secret) => {
    const problems = problemsFor({ env: { TURNSTILE_SECRET: secret } });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/TURNSTILE_SECRET/);
  });

  it('flags a build made with the e2e / Lighthouse test analytics values', () => {
    const problems = problemsFor({
      shipped: {
        umami: { src: 'https://umami.test/script.js', websiteId: 'e2e-site' },
        cfBeaconToken: 'e2e-token',
      },
    });
    expect(problems).toHaveLength(2);
    expect(problems.join()).toMatch(/e2e test Umami/);
    expect(problems.join()).toMatch(/e2e test Cloudflare/);
  });

  it('lists every problem at once', () => {
    expect(
      launchProblems({
        photos: [photo({ placeholder: true })],
        env: {},
        shipped: { siteKey: null, umami: null, cfBeaconToken: null },
      }).length,
    ).toBeGreaterThan(4);
  });
});

describe('readShipped (the values as they are built into the pages)', () => {
  const root = mkdtempSync(join(tmpdir(), 'launch-shipped-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const page = (siteKey: string | null, cfToken = 'cfbeacontoken0123'): string => {
    const config = JSON.stringify({
      umami: { src: 'https://cloud.umami.is/script.js', websiteId: 'site-id', hostUrl: 'x' },
      cfBeaconToken: cfToken,
    });
    const props = siteKey === null ? '[0]' : `[0,&quot;${siteKey}&quot;]`;
    return `<html><script type="application/json" id="analytics-config">${config}</script>
<astro-island props="{&quot;locale&quot;:[0,&quot;cs&quot;],&quot;siteKey&quot;:${props}}"></astro-island></html>`;
  };
  const write = (dist: string, cs: string, en = cs): void => {
    mkdirSync(join(dist, 'en'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), cs);
    writeFileSync(join(dist, 'en', 'index.html'), en);
  };
  let n = 0;
  const fresh = (): string => join(root, `dist-${n++}`);

  it('reads the site key, Umami and beacon token from the built pages', async () => {
    const dist = fresh();
    write(dist, page('0x4AAAAprodkey'));
    expect(await readShipped(dist, [])).toEqual({
      shipped: {
        siteKey: '0x4AAAAprodkey',
        umami: { src: 'https://cloud.umami.is/script.js', websiteId: 'site-id' },
        cfBeaconToken: 'cfbeacontoken0123',
      },
    });
  });

  it('reports no site key when the build had none', async () => {
    const dist = fresh();
    write(dist, page(null));
    expect(await readShipped(dist, [])).toMatchObject({ shipped: { siteKey: null } });
  });

  it('ignores what the env files say: a test key built into the page is what counts', async () => {
    // the real-world case: `.env` has a test key, `.env.production` the real one, and the build shipped the
    // test key (the Cloudflare adapter puts `.env` into process.env first, which beats `.env.production`)
    const dist = fresh();
    writeFileSync(join(root, '.env.production'), 'PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAprodkey\n');
    write(dist, page('1x00000000000000000000AA'));
    const result = await readShipped(dist, []);
    expect('shipped' in result && result.shipped.siteKey).toBe('1x00000000000000000000AA');
    expect(
      launchProblems({
        photos: [],
        env: goodEnv,
        shipped: 'shipped' in result ? result.shipped : null,
      }).join(),
    ).toMatch(/test Turnstile site key/);
  });

  it('is a problem when dist is missing', async () => {
    expect(await readShipped(fresh(), [])).toEqual({
      problem: expect.stringMatching(/pnpm build/),
    });
  });

  it('is a problem when the build is older than an input file', async () => {
    const dist = fresh();
    write(dist, page('0x4AAAAprodkey'));
    const input = join(root, 'input.env');
    writeFileSync(input, 'X=1\n');
    const past = new Date(Date.now() - 60_000);
    utimesSync(join(dist, 'index.html'), past, past);
    utimesSync(join(dist, 'en', 'index.html'), past, past);
    expect(await readShipped(dist, [input])).toEqual({
      problem: expect.stringMatching(/older than .*input\.env/),
    });
    const future = new Date(Date.now() + 60_000);
    utimesSync(join(dist, 'index.html'), future, future);
    utimesSync(join(dist, 'en', 'index.html'), future, future);
    expect(await readShipped(dist, [input])).toHaveProperty('shipped');
  });

  it('is a problem when the two languages carry different values', async () => {
    const dist = fresh();
    write(dist, page('0x4AAAAprodkey'), page('0x4AAAAotherkey'));
    expect(await readShipped(dist, [])).toEqual({ problem: expect.stringMatching(/different/) });
  });
});

describe('launchEnv (server secrets only)', () => {
  const root = mkdtempSync(join(tmpdir(), 'launch-env-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('reads the same files as the production build, the most specific one wins', () => {
    writeFileSync(join(root, '.env'), 'TURNSTILE_SECRET=from-env\nRESEND_API_KEY=from-env\n');
    writeFileSync(join(root, '.env.production'), 'TURNSTILE_SECRET=from-production\n');
    writeFileSync(join(root, '.env.production.local'), 'TURNSTILE_SECRET=from-production-local\n');
    // .env.local is read by the build too; .env.development must not be
    writeFileSync(join(root, '.env.local'), 'RESEND_API_KEY=from-local\n');
    writeFileSync(join(root, '.env.development'), 'MAILER=dev-only\n');
    const env = launchEnv(root, {});
    expect(env['TURNSTILE_SECRET']).toBe('from-production-local');
    expect(env['RESEND_API_KEY']).toBe('from-local');
    expect(env['MAILER']).toBeUndefined();
  });

  it('lets the process environment win over every file', () => {
    expect(launchEnv(root, { TURNSTILE_SECRET: 'from-process' })['TURNSTILE_SECRET']).toBe(
      'from-process',
    );
  });

  it('loads only the secret names, not every variable of the files', () => {
    writeFileSync(join(root, '.env.local'), 'PUBLIC_SOMETHING=1\nUNRELATED_TOKEN=x\n');
    const env = launchEnv(root, {});
    expect(env['PUBLIC_SOMETHING']).toBeUndefined();
    expect(env['UNRELATED_TOKEN']).toBeUndefined();
  });
});

describe('leftoverTodos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'launch-todos-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('counts visible TODO text per page and skips pages without it', async () => {
    mkdirSync(join(dir, 'en'), { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<p>TODO: IČO</p><p>TODO: sídlo</p>');
    writeFileSync(join(dir, 'en', 'index.html'), '<p>Clean page</p>');
    writeFileSync(join(dir, 'app.js'), 'TODO: not a page');
    expect(await leftoverTodos(dir)).toEqual([{ file: 'index.html', count: 2 }]);
  });

  it('returns nothing for a missing dist', async () => {
    expect(await leftoverTodos(join(dir, 'missing'))).toEqual([]);
  });
});

describe('.dev.vars.example', () => {
  it('ships a published Turnstile test secret, so a copied file lets the local form submit', () => {
    const text = readFileSync(join(import.meta.dirname, '../../.dev.vars.example'), 'utf8');
    const value = /^TURNSTILE_SECRET=(.*)$/m.exec(text)?.[1]?.trim();
    expect(TURNSTILE_TEST_SECRETS).toContain(value);
  });
});
