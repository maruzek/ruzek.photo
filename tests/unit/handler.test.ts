import { describe, it, expect } from 'vitest';
import { handleInquiry } from '@/server/inquiry/handler';
import type { InquiryDeps, InquiryRecord, InquiryStore, MailMessage } from '@/server/inquiry/types';
import { PRIVACY_NOTICE_VERSION } from '@/config/privacy';

const valid = {
  name: 'Jana Nováková',
  email: 'jana@example.com',
  service: 'event',
  hours: 3,
  addons: ['sameDay'],
  locale: 'cs',
  turnstileToken: 'ok',
  submissionId: '6f1c2a4e-8b1d-4c3a-9e2f-1a2b3c4d5e6f',
  source: { utmSource: 'ig' },
};

const req = (body: unknown, origin = 'https://martinruzek.eu', method = 'POST') =>
  new Request('https://martinruzek.eu/api/inquiry', {
    method,
    headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': '203.0.113.7' },
    ...(method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });

interface Fake extends InquiryDeps {
  rows: InquiryRecord[];
  sent: MailMessage[];
  pending: Promise<unknown>[];
  verified: { token: string; ip: string | null }[];
  limited: string[];
}

function fakeDeps(over: Partial<InquiryDeps> & { failMailTo?: string } = {}): Fake {
  const rows: InquiryRecord[] = [];
  const sent: MailMessage[] = [];
  const pending: Promise<unknown>[] = [];
  const verified: { token: string; ip: string | null }[] = [];
  const limited: string[] = [];
  const used = new Set<string>();
  const store: InquiryStore = {
    // like the UNIQUE submission_id column
    insert: async (r) => {
      if (rows.some((x) => x.submissionId === r.submissionId)) return false;
      rows.push({ ...r });
      return true;
    },
    markNotified: async (id, at) =>
      void Object.assign(
        rows.find((r) => r.id === id)!,
        { notifiedAt: at },
      ),
    markConfirmed: async (id, at) =>
      void Object.assign(
        rows.find((r) => r.id === id)!,
        { confirmedAt: at },
      ),
    listPendingMail: async () => [],
    listPreviewDue: async () => [],
    markPreviewed: async () => {},
    anonymizeCreatedBefore: async () => 0,
  };
  let n = 0;
  return {
    rows,
    sent,
    pending,
    verified,
    limited,
    store,
    mailer: {
      send: async (m) => {
        if (m.to === over.failMailTo) throw new Error('mail down');
        sent.push(m);
      },
    },
    // like the real siteverify: a token is valid once
    verifyTurnstile: async (token, ip) => {
      verified.push({ token, ip });
      if (token !== 'ok' && !token.startsWith('ok-')) return false;
      if (used.has(token)) return false;
      used.add(token);
      return true;
    },
    rateLimit: async (key) => {
      limited.push(key);
      return true;
    },
    now: () => 1_800_000_000_000,
    newId: () => `id-${++n}`,
    waitUntil: (p) => void pending.push(p),
    ownerEmail: 'foto@martinruzek.cz',
    fromEmail: 'noreply@martinruzek.eu',
    allowedOrigin: 'https://martinruzek.eu',
    ...over,
  };
}

const json = async (res: Response) => (await res.json()) as { ok: boolean; errors?: Record<string, string> };

describe('handleInquiry', () => {
  it('stores valid inquiry with server-side estimate and sends two mails', async () => {
    const d = fakeDeps();
    const res = await handleInquiry(req({ ...valid }), d);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true });
    await Promise.all(d.pending);
    expect(d.rows[0]).toMatchObject({
      estimateFrom: 4200,
      estimateTo: 5070,
      noticeVersion: PRIVACY_NOTICE_VERSION,
      status: 'new',
      utmSource: 'ig',
    });
    expect(d.sent.map((m) => [m.from, m.to, m.replyTo])).toEqual([
      ['noreply@martinruzek.eu', 'foto@martinruzek.cz', 'jana@example.com'],
      ['noreply@martinruzek.eu', 'jana@example.com', 'foto@martinruzek.cz'],
    ]);
    expect(d.rows[0]!.notifiedAt).not.toBeNull();
    expect(d.rows[0]!.confirmedAt).not.toBeNull();
    expect(d.verified[0]).toEqual({ token: 'ok', ip: '203.0.113.7' });
    expect(d.limited).toEqual(['203.0.113.7']);
  });

  it('stores only what the form asks for (no IP, no token, no honeypot)', async () => {
    const d = fakeDeps();
    await handleInquiry(req({ ...valid, website: '', extra: 'x' }), d);
    const row = d.rows[0]!;
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
    expect(row).not.toHaveProperty('turnstileToken');
    expect(row).not.toHaveProperty('website');
    expect(row).not.toHaveProperty('extra');
    expect(row).not.toHaveProperty('source');
  });

  it('ignores client-sent estimate fields', async () => {
    const d = fakeDeps();
    await handleInquiry(req({ ...valid, estimateFrom: 1, estimateTo: 2 }), d);
    expect(d.rows[0]).toMatchObject({ estimateFrom: 4200, estimateTo: 5070 });
  });

  it('403 when Turnstile fails, nothing stored', async () => {
    const d = fakeDeps({ verifyTurnstile: async () => false });
    const res = await handleInquiry(req({ ...valid }), d);
    expect(res.status).toBe(403);
    expect((await json(res)).errors).toEqual({ form: 'turnstile' });
    expect(d.rows).toHaveLength(0);
    expect(d.sent).toHaveLength(0);
  });

  it('403 on foreign origin', async () => {
    const d = fakeDeps();
    const res = await handleInquiry(req({ ...valid }, 'https://evil.example'), d);
    expect(res.status).toBe(403);
    expect((await json(res)).errors).toEqual({ form: 'origin' });
    expect(d.rows).toHaveLength(0);
    expect(d.verified).toHaveLength(0);
  });

  it('403 without an origin header', async () => {
    const d = fakeDeps();
    const r = new Request('https://martinruzek.eu/api/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(valid),
    });
    expect((await handleInquiry(r, d)).status).toBe(403);
  });

  it('429 when rate limited', async () => {
    const d = fakeDeps({ rateLimit: async () => false });
    const res = await handleInquiry(req({ ...valid }), d);
    expect(res.status).toBe(429);
    expect((await json(res)).errors).toEqual({ form: 'rateLimit' });
    expect(d.verified).toHaveLength(0);
  });

  it('400 with field errors on invalid body', async () => {
    const d = fakeDeps();
    const res = await handleInquiry(req({ ...valid, email: 'jana@' }), d);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.ok).toBe(false);
    expect(body.errors?.['email']).toBe('invalid');
    expect(d.rows).toHaveLength(0);
  });

  it('400 on malformed JSON or a non-JSON content type', async () => {
    const d = fakeDeps();
    expect((await handleInquiry(req('{not json'), d)).status).toBe(400);
    const form = new Request('https://martinruzek.eu/api/inquiry', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://martinruzek.eu',
      },
      body: 'name=x',
    });
    expect((await handleInquiry(form, d)).status).toBe(415);
  });

  it('honeypot: 200, nothing stored, no mail', async () => {
    const d = fakeDeps();
    const res = await handleInquiry(req({ ...valid, website: 'x' }), d);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true });
    await Promise.all(d.pending);
    expect(d.rows).toHaveLength(0);
    expect(d.sent).toHaveLength(0);
  });

  it('405 on GET', async () => {
    const d = fakeDeps();
    const res = await handleInquiry(req(undefined, 'https://martinruzek.eu', 'GET'), d);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('owner mail failure keeps row with notifiedAt null and still returns 200', async () => {
    const d = fakeDeps({ failMailTo: 'foto@martinruzek.cz' });
    const res = await handleInquiry(req({ ...valid }), d);
    expect(res.status).toBe(200);
    await Promise.all(d.pending);
    expect(d.rows).toHaveLength(1);
    expect(d.rows[0]!.notifiedAt).toBeNull();
    // the client still gets the confirmation
    expect(d.sent.map((m) => m.to)).toEqual(['jana@example.com']);
    expect(d.rows[0]!.confirmedAt).not.toBeNull();
  });

  it('client confirmation never contains the free-text note', async () => {
    const d = fakeDeps();
    await handleInquiry(req({ ...valid, note: 'BUY CHEAP PILLS http://spam', place: 'http://spam.place' }), d);
    await Promise.all(d.pending);
    expect(d.sent[1]!.text).not.toContain('spam');
    expect(d.sent[1]!.text).not.toContain('Jana');
    expect(d.sent[1]!.subject).not.toContain('Jana');
    // Martin gets everything
    expect(d.sent[0]!.text).toContain('BUY CHEAP PILLS');
  });

  it('confirmation follows the page language', async () => {
    const d = fakeDeps();
    await handleInquiry(req({ ...valid, locale: 'en' }), d);
    await Promise.all(d.pending);
    expect(d.sent[1]!.text).toMatch(/thank you/i);
    expect(d.sent[0]!.text).toMatch(/poptávka/i); // the owner mail is always Czech
  });

  it('same turnstile token twice stores one row', async () => {
    const d = fakeDeps();
    expect((await handleInquiry(req({ ...valid }), d)).status).toBe(200);
    expect((await handleInquiry(req({ ...valid }), d)).status).toBe(403);
    expect(d.rows).toHaveLength(1);
  });

  it('keeps only the referrer host, known landing paths and plain UTM tags (FM-01)', async () => {
    const d = fakeDeps();
    await handleInquiry(
      req({
        ...valid,
        source: {
          referrer: 'https://jana:secret@www.Instagram.com/jana.novakova?id=7',
          landingPath: '/en/',
          utmSource: 'IG',
          utmMedium: 'jana@example.com',
          utmCampaign: 'call-777123456',
        },
      }),
      d,
    );
    expect(d.rows[0]).toMatchObject({
      referrer: 'www.instagram.com',
      landingPath: '/en/',
      utmSource: 'ig',
      utmMedium: null,
      utmCampaign: null,
    });
    const other = fakeDeps();
    await handleInquiry(
      req({
        ...valid,
        source: { landingPath: '/?email=jana@example.com', utmCampaign: 'x'.repeat(65) },
      }),
      other,
    );
    expect(other.rows[0]).toMatchObject({ landingPath: null, utmCampaign: null });
    const study = fakeDeps();
    await handleInquiry(req({ ...valid, source: { landingPath: '/pripadove-studie/turnaj-2027/' } }), study);
    expect(study.rows[0]!.landingPath).toBe('/pripadove-studie/turnaj-2027/');
  });

  it('a retry after a lost response stores one row and sends one set of mails (FM-03)', async () => {
    const d = fakeDeps();
    // first request: written and mailed, but the browser never saw the response
    expect((await handleInquiry(req({ ...valid, turnstileToken: 'ok-1' }), d)).status).toBe(200);
    // the retry carries the same submission id and a fresh Turnstile token
    const res = await handleInquiry(req({ ...valid, turnstileToken: 'ok-2' }), d);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true });
    await Promise.all(d.pending);
    expect(d.rows).toHaveLength(1);
    expect(d.sent).toHaveLength(2);
  });

  it('passes a per-mail idempotency key to the mailer', async () => {
    const d = fakeDeps();
    await handleInquiry(req({ ...valid }), d);
    await Promise.all(d.pending);
    expect(d.sent.map((m) => m.idempotencyKey)).toEqual(['id-1/owner', 'id-1/client']);
  });

  it('413 for a multi-byte body over 32 KiB even though it has fewer UTF-16 units (FM-06)', async () => {
    const d = fakeDeps();
    const note = 'ř'.repeat(17_000); // 34 000 bytes, 17 000 UTF-16 units
    const body = new TextEncoder().encode(JSON.stringify({ ...valid, note }));
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(body);
        c.close();
      },
    });
    const r = new Request('https://martinruzek.eu/api/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://martinruzek.eu' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect((await handleInquiry(r, d)).status).toBe(413);
    expect(d.verified).toHaveLength(0);
  });

  it('413 from Content-Length before reading the body (FM-06)', async () => {
    const d = fakeDeps();
    const r = new Request('https://martinruzek.eu/api/inquiry', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://martinruzek.eu',
        'content-length': '40000',
      },
      body: '{}',
    });
    expect((await handleInquiry(r, d)).status).toBe(413);
  });

  it('500 without leaking details when the database fails', async () => {
    const d = fakeDeps();
    d.store.insert = async () => {
      throw new Error('D1 down jana@example.com');
    };
    const res = await handleInquiry(req({ ...valid }), d);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('jana');
  });
});
