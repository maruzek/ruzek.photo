import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { d1Store } from '@/server/inquiry/store';
import type { InquiryRecord, InquiryStore } from '@/server/inquiry/types';

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 5, 1);

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
let store: InquiryStore;

/** Statements of every migration file, comments removed, in order. */
function migrations(): string[] {
  const dir = new URL('../../db/migrations/', import.meta.url);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .flatMap((f) =>
      readFileSync(new URL(f, dir), 'utf8')
        .replace(/--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
    );
}

const rec = (over: Partial<InquiryRecord> = {}): InquiryRecord => ({
  id: 'a',
  createdAt: NOW,
  locale: 'cs',
  status: 'new',
  name: 'Jana Nováková',
  email: 'jana@example.com',
  phone: '+420 600 000 000',
  place: 'Praha',
  note: 'Program',
  timeFrom: '18:00',
  timeTo: '23:00',
  service: 'event',
  hours: 3,
  date: '2027-03-14',
  guests: 80,
  addons: ['sameDay'],
  estimateFrom: 4200,
  estimateTo: 5070,
  noticeVersion: '2026-11-21',
  referrer: 'https://www.instagram.com/some/path?x=1',
  landingPath: '/',
  utmSource: 'ig',
  utmMedium: null,
  utmCampaign: 'jaro',
  notifiedAt: null,
  confirmedAt: null,
  anonymizedAt: null,
  ...over,
});

const count = async (): Promise<number> =>
  (await db.prepare('SELECT count(*) AS n FROM inquiries').first<{ n: number }>())?.n ?? -1;
const row = (id: string) => db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first<Record<string, unknown>>();

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.jsonc', persist: false });
  db = proxy.env.DB;
  await db.batch(migrations().map((s) => db.prepare(s)));
  store = d1Store(db);
});
afterAll(async () => {
  await proxy?.dispose();
});
beforeEach(async () => {
  await db.prepare('DELETE FROM inquiries').run();
});

describe('d1Store', () => {
  it('round-trips a record', async () => {
    await store.insert(rec());
    const [r] = await store.listUnnotified(NOW + 1, 10);
    expect(r).toEqual(rec());
  });

  it('round-trips a record without optional fields', async () => {
    const minimal = rec();
    for (const k of ['phone', 'place', 'note', 'timeFrom', 'timeTo', 'hours', 'date', 'guests'] as const) delete minimal[k];
    await store.insert({ ...minimal, addons: [], referrer: null });
    const [r] = await store.listUnnotified(NOW + 1, 10);
    expect(r).toEqual({ ...minimal, addons: [], referrer: null });
  });

  it('listUnnotified returns new rows until markNotified', async () => {
    await store.insert(rec());
    expect(await store.listUnnotified(NOW + 1, 10)).toHaveLength(1);
    expect(await store.listUnnotified(NOW, 10)).toHaveLength(0); // created_at must be before the cut-off
    await store.markNotified('a', NOW + 5);
    expect(await store.listUnnotified(NOW + 1, 10)).toHaveLength(0);
    await store.markConfirmed('a', NOW + 6);
    expect(await row('a')).toMatchObject({ notified_at: NOW + 5, confirmed_at: NOW + 6 });
  });

  it('anonymizes old new and lost rows, keeps won and young rows, and keeps the row count', async () => {
    const old = NOW - 400 * DAY;
    await store.insert(rec({ id: 'old-new', createdAt: old }));
    await store.insert(rec({ id: 'old-lost', createdAt: old, status: 'lost', referrer: 'https://seznam.cz/' }));
    await store.insert(rec({ id: 'old-won', createdAt: old, status: 'won' }));
    await store.insert(rec({ id: 'young', createdAt: NOW - 10 * DAY }));
    const before = await count();

    const cut = NOW - 365 * DAY;
    expect((await store.listAnonymizable(cut)).map((r) => r.id).sort()).toEqual(['old-lost', 'old-new']);
    expect(await store.anonymizeCreatedBefore(cut, NOW)).toBe(2);

    expect(await row('old-new')).toMatchObject({
      name: null,
      email: null,
      phone: null,
      place: null,
      note: null,
      time_from: null,
      time_to: null,
      event_date: '2027-03',
      referrer: 'https://www.instagram.com',
      anonymized_at: NOW,
      // statistics stay
      service: 'event',
      hours: 3,
      guests: 80,
      addons: '["sameDay"]',
      estimate_from: 4200,
      utm_source: 'ig',
      utm_campaign: 'jaro',
      landing_path: '/',
      locale: 'cs',
      status: 'new',
    });
    expect(await row('old-lost')).toMatchObject({ referrer: 'https://seznam.cz', name: null, status: 'lost' });
    expect(await row('old-won')).toMatchObject({ name: 'Jana Nováková', anonymized_at: null });
    expect(await row('young')).toMatchObject({ name: 'Jana Nováková', anonymized_at: null });

    expect(await store.anonymizeCreatedBefore(cut, NOW + 1)).toBe(0);
    expect(await row('old-new')).toMatchObject({ anonymized_at: NOW });
    expect(await count()).toBe(before);
    expect(await store.listAnonymizable(cut)).toHaveLength(0);
  });

  it('anonymized rows are not resent', async () => {
    await store.insert(rec({ createdAt: NOW - 400 * DAY }));
    await store.anonymizeCreatedBefore(NOW - 365 * DAY, NOW);
    expect(await store.listUnnotified(NOW, 10)).toHaveLength(0);
  });

  it('the database refuses a live row without name or e-mail', async () => {
    await expect(
      db
        .prepare(
          `INSERT INTO inquiries (id, created_at, locale, service, estimate_from, estimate_to, notice_version)
           VALUES ('x', 1, 'cs', 'event', 1, 1, 'v')`,
        )
        .run(),
    ).rejects.toThrow();
  });
});
