import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { launchProblems, leftoverTodos } from '../../scripts/check-launch';
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

  it('flags Cloudflare test Turnstile keys', () => {
    const problems = launchProblems({
      photos: [],
      env: {
        ...goodEnv,
        TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
        PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      },
    });
    expect(problems).toHaveLength(2);
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
