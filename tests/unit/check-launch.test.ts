import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  launchEnv,
  launchProblems,
  leftoverTodos,
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
  PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAprodkey',
  RESEND_API_KEY: 're_prodkey',
  PUBLIC_UMAMI_SRC: 'https://cloud.umami.is/script.js',
  PUBLIC_UMAMI_WEBSITE_ID: '3c1f0b52-0000-4000-8000-000000000000',
  PUBLIC_CF_BEACON_TOKEN: 'cfbeacontoken0123',
};

describe('launchProblems', () => {
  it('passes with real photos and every setting in place', () => {
    expect(launchProblems({ photos: [photo()], env: goodEnv })).toEqual([]);
  });

  it('ignores an unpublished placeholder', () => {
    const photos = [photo(), photo({ placeholder: true, published: false })];
    expect(launchProblems({ photos, env: goodEnv })).toEqual([]);
  });

  it('flags a published placeholder photo', () => {
    const problems = launchProblems({
      photos: [photo({ placeholder: true, image: 'stock.jpg' })],
      env: goodEnv,
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/placeholder/i);
  });

  it.each([
    ['TURNSTILE_SECRET', /TURNSTILE_SECRET/],
    ['PUBLIC_TURNSTILE_SITE_KEY', /PUBLIC_TURNSTILE_SITE_KEY/],
    ['PUBLIC_UMAMI_WEBSITE_ID', /PUBLIC_UMAMI_WEBSITE_ID/],
    ['PUBLIC_UMAMI_SRC', /PUBLIC_UMAMI_SRC/],
    ['PUBLIC_CF_BEACON_TOKEN', /PUBLIC_CF_BEACON_TOKEN/],
  ])('flags a missing %s', (name, pattern) => {
    const env = { ...goodEnv };
    delete env[name];
    const problems = launchProblems({ photos: [], env });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(pattern);
  });

  it('flags an empty value like a missing one', () => {
    const problems = launchProblems({ photos: [], env: { ...goodEnv, TURNSTILE_SECRET: '  ' } });
    expect(problems.join()).toMatch(/TURNSTILE_SECRET/);
  });

  it('flags a missing mail provider', () => {
    const env = { ...goodEnv };
    delete env['RESEND_API_KEY'];
    const problems = launchProblems({ photos: [], env });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/mail provider/i);
  });

  it('flags MAILER=console even when a key is set (nothing would be sent)', () => {
    const problems = launchProblems({ photos: [], env: { ...goodEnv, MAILER: 'console' } });
    expect(problems.join()).toMatch(/MAILER/);
  });

  // every key Cloudflare publishes at developers.cloudflare.com/turnstile/troubleshooting/testing
  it.each([
    '1x00000000000000000000AA',
    '2x00000000000000000000AB',
    '1x00000000000000000000BB',
    '2x00000000000000000000BB',
    '3x00000000000000000000FF',
  ])('flags the Cloudflare test site key %s', (key) => {
    const problems = launchProblems({
      photos: [],
      env: { ...goodEnv, PUBLIC_TURNSTILE_SITE_KEY: key },
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/PUBLIC_TURNSTILE_SITE_KEY/);
  });

  it.each([
    '1x0000000000000000000000000000000AA',
    '2x0000000000000000000000000000000AA',
    '3x0000000000000000000000000000000AA',
  ])('flags the Cloudflare test secret %s', (secret) => {
    const problems = launchProblems({
      photos: [],
      env: { ...goodEnv, TURNSTILE_SECRET: secret },
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/TURNSTILE_SECRET/);
  });

  it('flags a Umami script URL that is not https (the build would drop it)', () => {
    const problems = launchProblems({
      photos: [],
      env: { ...goodEnv, PUBLIC_UMAMI_SRC: 'http://umami.example/script.js' },
    });
    expect(problems.join()).toMatch(/PUBLIC_UMAMI_SRC/);
  });

  it('lists every problem at once', () => {
    expect(
      launchProblems({ photos: [photo({ placeholder: true })], env: {} }).length,
    ).toBeGreaterThan(4);
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

describe('launchEnv', () => {
  const root = mkdtempSync(join(tmpdir(), 'launch-env-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const NAME = 'PUBLIC_LAUNCH_ENV_PROBE';

  it('reads the same files as the production build, the most specific one wins', () => {
    writeFileSync(join(root, '.env'), `${NAME}=from-env\nONLY_IN_ENV=1\n`);
    writeFileSync(join(root, '.env.production'), `${NAME}=from-production\n`);
    writeFileSync(join(root, '.env.production.local'), `${NAME}=from-production-local\n`);
    // .env.local is read by the build too; .env.development must not be
    writeFileSync(join(root, '.env.local'), 'ONLY_IN_LOCAL=1\n');
    writeFileSync(join(root, '.env.development'), 'ONLY_IN_DEV=1\n');
    const env = launchEnv(root, {});
    expect(env[NAME]).toBe('from-production-local');
    expect(env['ONLY_IN_ENV']).toBe('1');
    expect(env['ONLY_IN_LOCAL']).toBe('1');
    expect(env['ONLY_IN_DEV']).toBeUndefined();
  });

  it('lets the process environment win over every file', () => {
    expect(launchEnv(root, { [NAME]: 'from-process' })[NAME]).toBe('from-process');
  });
});

describe('.dev.vars.example', () => {
  it('ships a published Turnstile test secret, so a copied file lets the local form submit', () => {
    const text = readFileSync(join(import.meta.dirname, '../../.dev.vars.example'), 'utf8');
    const value = /^TURNSTILE_SECRET=(.*)$/m.exec(text)?.[1]?.trim();
    expect(TURNSTILE_TEST_SECRETS).toContain(value);
  });
});
