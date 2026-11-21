import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';

// POST /api/inquiry against the preview (wrangler dev, local D1, Turnstile test secret, console mailer).
// Desktop project only (mobile-360 sets isMobile): the endpoint is rate limited to 5 requests per IP and minute (wrangler.jsonc).
test.skip(({ isMobile }) => isMobile, 'runs once (desktop), not per viewport');

// unique per run, so the rows of this run can be counted in the persisted local D1
const run = randomUUID().slice(0, 8);
const email = (tag: string): string => `test-${run}-${tag}@example.com`;

/** Rows in the preview's local D1 (the same .wrangler/state as wrangler dev) with this e-mail. */
function stored(address: string): number {
  const out = execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'ruzek-inquiries',
      '--local',
      '-c',
      'wrangler.jsonc',
      '--json',
      '--command',
      `SELECT count(*) AS n FROM inquiries WHERE email = '${address}'`,
    ],
    { encoding: 'utf8' },
  );
  return (JSON.parse(out) as { results: { n: number }[] }[])[0]!.results[0]!.n;
}

const valid = {
  name: 'Test Osoba',
  email: email('valid'),
  service: 'event',
  hours: 3,
  addons: ['sameDay'],
  locale: 'cs',
  // the Turnstile test secret accepts this dummy token
  turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
  submissionId: randomUUID(),
  source: { landingPath: '/' },
};

test.describe.configure({ mode: 'serial' });
// Its own rate-limit key (wrangler dev passes this header through; Cloudflare sets it itself in production), so
// these requests do not use up the bucket of the form test that sends through the real widget (inquiry.spec.ts)
test.use({ extraHTTPHeaders: { 'cf-connecting-ip': '192.0.2.10' } });

test('GET is not allowed', async ({ request }) => {
  const res = await request.get('/api/inquiry');
  expect(res.status()).toBe(405);
  expect(res.headers()['allow']).toBe('POST');
});

test('a foreign origin is refused', async ({ request }) => {
  const data = { ...valid, email: email('origin'), submissionId: randomUUID() };
  const res = await request.post('/api/inquiry', {
    data,
    headers: { origin: 'https://evil.example' },
  });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ ok: false, errors: { form: 'origin' } });
  expect(stored(data.email)).toBe(0);
});

test('an invalid e-mail comes back as a field error', async ({ request, baseURL }) => {
  const res = await request.post('/api/inquiry', {
    data: { ...valid, email: 'test@', submissionId: randomUUID() },
    headers: { origin: new URL(baseURL!).origin },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).errors.email).toBe('invalid');
  expect(stored('test@')).toBe(0);
});

test('a valid inquiry is stored', async ({ request, baseURL }) => {
  const res = await request.post('/api/inquiry', {
    data: valid,
    headers: { origin: new URL(baseURL!).origin },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(res.headers()['set-cookie']).toBeUndefined();
  expect(stored(valid.email)).toBe(1);
});

test('the same submission again (the response got lost) adds no row', async ({ request, baseURL }) => {
  // both posts inside this test, so it does not depend on the previous test having run (FM-16)
  const data = { ...valid, email: email('retry'), submissionId: randomUUID() };
  for (let i = 0; i < 2; i++) {
    const res = await request.post('/api/inquiry', {
      data,
      headers: { origin: new URL(baseURL!).origin },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  }
  expect(stored(data.email)).toBe(1);
});

test('a filled honeypot looks like a success', async ({ request, baseURL }) => {
  const res = await request.post('/api/inquiry', {
    data: {
      ...valid,
      email: email('honeypot'),
      submissionId: randomUUID(),
      website: 'https://spam.example',
    },
    headers: { origin: new URL(baseURL!).origin },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(stored(email('honeypot'))).toBe(0);
});
