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
  submissionId: over.id ? `sub-${over.id}` : 'sub-a',
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
  referrer: 'www.instagram.com',
  landingPath: '/',
  utmSource: 'ig',
  utmMedium: null,
  utmCampaign: 'jaro',
  notifiedAt: null,
  confirmedAt: null,
  previewedAt: null,
  anonymizedAt: null,
  ...over,
});

const count = async (): Promise<number> =>
  (await db.prepare('SELECT count(*) AS n FROM inquiries').first<{ n: number }>())?.n ?? -1;
const row = (id: string) =>
  db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first<Record<string, unknown>>();
/** The id and created_at change on anonymization, so anonymized rows are found by their (unique here) status. */
const anonRow = (status: InquiryRecord['status']) =>
  db
    .prepare('SELECT * FROM inquiries WHERE anonymized_at IS NOT NULL AND status = ?')
    .bind(status)
    .first<Record<string, unknown>>();

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.jsonc',
    persist: false,
  });
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
  const pending = () => store.listPendingMail(0, NOW + 1, 10);

  it('round-trips a record', async () => {
    expect(await store.insert(rec())).toBe(true);
    const [r] = await pending();
    expect(r).toEqual(rec());
  });

  it('reloads an individually quoted inquiry for mail retries', async () => {
    const other = rec({ service: 'other', estimateFrom: null, estimateTo: null });
    await store.insert(other);
    const [r] = await pending();
    expect(r).toEqual(other);
  });

  it.each([
    { service: 'other', estimateFrom: 0, estimateTo: 0 },
    { service: 'sport', estimateFrom: null, estimateTo: 1 },
  ] as const)('refuses an invalid estimate for $service', async (values) => {
    await expect(store.insert(rec(values))).rejects.toThrow(/CHECK/);
  });

  it('round-trips a record without optional fields', async () => {
    const minimal = rec();
    for (const k of ['phone', 'place', 'note', 'timeFrom', 'timeTo', 'hours', 'date', 'guests'] as const)
      delete minimal[k];
    await store.insert({ ...minimal, addons: [], referrer: null });
    const [r] = await pending();
    expect(r).toEqual({ ...minimal, addons: [], referrer: null });
  });

  it('a second insert with the same submission id is ignored (FM-03)', async () => {
    expect(await store.insert(rec())).toBe(true);
    expect(await store.insert(rec({ id: 'b', submissionId: 'sub-a', name: 'Retry' }))).toBe(false);
    expect(await count()).toBe(1);
    expect(await row('a')).toMatchObject({ name: 'Jana Nováková' });
  });

  it('listPendingMail returns a row until both mails are marked, also when only the confirmation is missing (FM-02)', async () => {
    await store.insert(rec());
    expect(await pending()).toHaveLength(1);
    expect(await store.listPendingMail(0, NOW, 10)).toHaveLength(0); // created_at must be before the cut-off
    expect(await store.listPendingMail(NOW + 1, NOW + 2, 10)).toHaveLength(0); // and inside the retry window
    await store.markNotified('a', NOW + 5);
    const [onlyConfirmation] = await pending();
    expect(onlyConfirmation).toMatchObject({ id: 'a', notifiedAt: NOW + 5, confirmedAt: null });
    await store.markConfirmed('a', NOW + 6);
    expect(await pending()).toHaveLength(0);
    expect(await row('a')).toMatchObject({ notified_at: NOW + 5, confirmed_at: NOW + 6 });
  });

  it('anonymizes previewed old new and lost rows, keeps won, young and unpreviewed rows and the row count', async () => {
    const old = NOW - 400 * DAY;
    const seen = NOW - 10 * DAY;
    await store.insert(rec({ id: 'old-new', createdAt: old }));
    await store.insert(rec({ id: 'old-lost', createdAt: old + 1, status: 'lost', referrer: 'seznam.cz' }));
    await store.insert(rec({ id: 'old-won', createdAt: old + 2, status: 'won' }));
    await store.insert(rec({ id: 'old-unseen', createdAt: old + 3 }));
    await store.insert(rec({ id: 'young', createdAt: NOW - 10 * DAY }));
    const before = await count();

    const cut = NOW - 365 * DAY;
    const due = (await store.listPreviewDue(cut)).map((r) => r.id).sort();
    expect(due).toEqual(['old-lost', 'old-new', 'old-unseen']);
    await store.markPreviewed(['old-new', 'old-lost'], seen);
    expect((await store.listPreviewDue(cut)).map((r) => r.id)).toEqual(['old-unseen']);
    // the preview must be old enough
    expect(await store.anonymizeCreatedBefore(cut, NOW, seen - 1, 0)).toBe(0);
    expect(await store.anonymizeCreatedBefore(cut, NOW, NOW - 3 * DAY, 0)).toBe(2);

    const anon = await anonRow('new');
    expect(anon).toMatchObject({
      submission_id: null,
      name: null,
      email: null,
      phone: null,
      place: null,
      note: null,
      time_from: null,
      time_to: null,
      event_date: '2027-03',
      referrer: 'www.instagram.com',
      anonymized_at: NOW,
      // statistics stay
      service: 'event',
      hours: 3,
      guests: 80,
      addons: '["sameDay"]',
      estimate_from: 4200,
      utm_source: 'ig',
      landing_path: '/',
      locale: 'cs',
      status: 'new',
    });
    // a new random id, so the row no longer matches the id quoted in the owner's mail
    expect(anon!['id']).toMatch(/^[0-9a-f]{32}$/);
    expect(await row('old-new')).toBeNull();
    expect(await anonRow('lost')).toMatchObject({
      referrer: 'seznam.cz',
      name: null,
      status: 'lost',
    });
    expect(await row('old-won')).toMatchObject({ name: 'Jana Nováková', anonymized_at: null });
    expect(await row('old-unseen')).toMatchObject({ name: 'Jana Nováková', anonymized_at: null });
    expect(await row('young')).toMatchObject({ name: 'Jana Nováková', anonymized_at: null });

    expect(await store.anonymizeCreatedBefore(cut, NOW + 1, NOW, 0)).toBe(0);
    expect(await anonRow('new')).toMatchObject({ anonymized_at: NOW });
    expect(await count()).toBe(before);
  });

  it('anonymizes an unpreviewed row past the hard limit, so broken mail cannot extend retention (FM-13)', async () => {
    await store.insert(rec({ id: 'stuck', createdAt: NOW - 400 * DAY }));
    await store.insert(rec({ id: 'stuck-won', createdAt: NOW - 400 * DAY + 1, status: 'won' }));
    await store.insert(rec({ id: 'grace', createdAt: NOW - 380 * DAY }));
    // no preview was ever sent: only the row older than the hard limit (here 395 days) goes
    expect(await store.anonymizeCreatedBefore(NOW - 365 * DAY, NOW, NOW - 3 * DAY, NOW - 395 * DAY)).toBe(1);
    expect((await store.listPreviewDue(NOW - 365 * DAY)).map((r) => r.id)).toEqual(['grace']);
  });

  it('anonymization drops identifiers hidden in the source columns (FM-01)', async () => {
    // written past sanitizeSource (older data, manual edits): the SQL must not trust it
    await store.insert(
      rec({
        createdAt: NOW - 400 * DAY,
        referrer: 'https://jana:secret@example.com/jana.novakova',
        landingPath: '/?email=jana@example.com',
        utmSource: 'Jana.Novakova',
        utmMedium: 'call-777123456',
        utmCampaign: 'jana@example.com',
        previewedAt: NOW - 10 * DAY,
      }),
    );
    expect(await store.anonymizeCreatedBefore(NOW - 365 * DAY, NOW, NOW - 3 * DAY, 0)).toBe(1);
    const r = await anonRow('new');
    expect(r).toMatchObject({
      referrer: null,
      landing_path: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      anonymized_at: NOW,
    });
    expect(JSON.stringify(r)).not.toMatch(/jana|777123456/i);
  });

  it('anonymization leaves nothing that links the row to the owner\'s e-mail (ST-04)', async () => {
    const created = Date.UTC(2026, 3, 17, 14, 23, 5, 120); // 2026-04-17 14:23:05.120 UTC
    await store.insert(
      rec({
        createdAt: created,
        utmSource: 'jana-novakova',
        utmMedium: 'social',
        utmCampaign: 'jana-novakova',
        notifiedAt: created + 1500,
        confirmedAt: created + 2100,
        previewedAt: NOW - 10 * DAY,
      }),
    );
    expect(await store.anonymizeCreatedBefore(NOW - 365 * DAY, NOW, NOW - 3 * DAY, 0)).toBe(1);
    expect(await anonRow('new')).toMatchObject({
      created_at: Date.UTC(2026, 3, 1), // the first day of the month, UTC
      notified_at: null,
      confirmed_at: null,
      previewed_at: null,
      utm_source: null, // a free value, not a generic channel
      utm_medium: 'social',
      utm_campaign: null,
      referrer: 'www.instagram.com',
      landing_path: '/',
    });
  });

  it('an anonymized row reveals neither the day it was anonymized nor its place in the order of arrival (L2-01)', async () => {
    await store.insert(rec({ id: 'first', submissionId: 's1', createdAt: NOW - 400 * DAY, previewedAt: NOW - 10 * DAY }));
    await store.insert(rec({ id: 'second', submissionId: 's2', createdAt: NOW - 399 * DAY, previewedAt: NOW - 10 * DAY }));
    const at = NOW + 14 * DAY + 3 * 3_600_000; // the daily run on the 15th at 03:00 UTC
    expect(await store.anonymizeCreatedBefore(at - 365 * DAY, at, at - 3 * DAY, 0)).toBe(2);
    const rows = (await db.prepare('SELECT anonymized_at FROM inquiries').all<{ anonymized_at: number }>()).results;
    expect(rows.map((r) => r.anonymized_at)).toEqual([NOW, NOW]); // the first day of the month, UTC
    // no hidden insertion counter to sort by
    await expect(db.prepare('SELECT rowid FROM inquiries').all()).rejects.toThrow(/rowid/);
  });

  it('anonymized rows are not resent', async () => {
    await store.insert(rec({ createdAt: NOW - 400 * DAY, previewedAt: NOW - 10 * DAY }));
    await store.anonymizeCreatedBefore(NOW - 365 * DAY, NOW, NOW, 0);
    expect(await store.listPendingMail(0, NOW, 10)).toHaveLength(0);
  });

  it('the database refuses a live row without name, e-mail or submission id', async () => {
    await expect(
      db
        .prepare(
          `INSERT INTO inquiries (id, submission_id, created_at, locale, service, estimate_from, estimate_to, notice_version)
           VALUES ('x', 's', 1, 'cs', 'event', 1, 1, 'v')`,
        )
        .run(),
    ).rejects.toThrow();
    await expect(
      db
        .prepare(
          `INSERT INTO inquiries (id, created_at, locale, name, email, service, estimate_from, estimate_to, notice_version)
           VALUES ('y', 1, 'cs', 'J', 'j@example.com', 'event', 1, 1, 'v')`,
        )
        .run(),
    ).rejects.toThrow();
  });
});
