import { describe, it, expect, vi } from 'vitest';
import { runMaintenance } from '../../workers/maintenance/src/run';
import type { InquiryRecord, InquiryStore, MailMessage } from '@/server/inquiry/types';

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 5, 15, 3); // not the first day of a month
const FIRST = Date.UTC(2027, 6, 1, 3);

const rec = (id: string, over: Partial<InquiryRecord> = {}): InquiryRecord => ({
  id,
  submissionId: `sub-${id}`,
  createdAt: NOW - DAY,
  locale: 'cs',
  status: 'new',
  name: `Jméno ${id}`,
  email: `${id}@example.com`,
  service: 'event',
  hours: 3,
  addons: [],
  estimateFrom: 3500,
  estimateTo: 3900,
  noticeVersion: '2026-11-21',
  referrer: null,
  landingPath: '/',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  notifiedAt: NOW - DAY,
  confirmedAt: NOW - DAY,
  previewedAt: null,
  anonymizedAt: null,
  ...over,
});

/** In-memory store with the same filters as d1Store (tests/workers/store.test.ts covers the SQL). */
function memoryStore(rows: InquiryRecord[]): InquiryStore {
  const anonymizable = (r: InquiryRecord, before: number) =>
    r.status !== 'won' && r.anonymizedAt === null && r.createdAt < before;
  const byId = (id: string) => rows.find((r) => r.id === id)!;
  return {
    insert: async (r) => (rows.push(r), true),
    markNotified: async (id, at) => void Object.assign(byId(id), { notifiedAt: at }),
    markConfirmed: async (id, at) => void Object.assign(byId(id), { confirmedAt: at }),
    listPendingMail: async (after, before, limit) =>
      rows
        .filter(
          (r) =>
            (r.notifiedAt === null || r.confirmedAt === null) &&
            r.anonymizedAt === null &&
            r.createdAt >= after &&
            r.createdAt < before,
        )
        .slice(0, limit),
    listPreviewDue: async (before) => rows.filter((r) => anonymizable(r, before) && r.previewedAt === null),
    markPreviewed: async (ids, at) => ids.forEach((id) => Object.assign(byId(id), { previewedAt: at })),
    anonymizeCreatedBefore: async (before, at, previewedBefore, hardBefore) => {
      const hit = rows.filter(
        (r) =>
          anonymizable(r, before) &&
          ((r.previewedAt !== null && r.previewedAt <= previewedBefore) || r.createdAt < hardBefore),
      );
      // like d1Store (ST-04): month-rounded created_at, no mail timestamps, no campaign name
      for (const r of hit) {
        const d = new Date(r.createdAt);
        Object.assign(r, {
          name: '',
          email: '',
          createdAt: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1),
          notifiedAt: null,
          confirmedAt: null,
          previewedAt: null,
          utmCampaign: null,
          anonymizedAt: at,
        });
      }
      return hit.length;
    },
  };
}

function deps(rows: InquiryRecord[], over: { now?: number; days?: number; failTo?: string } = {}) {
  const sent: MailMessage[] = [];
  return {
    sent,
    rows,
    d: {
      store: memoryStore(rows),
      mailer: {
        send: async (m: MailMessage) => {
          if (m.to === over.failTo) throw new Error('mail down');
          sent.push(m);
        },
      },
      now: () => over.now ?? NOW,
      anonymizeAfterDays: over.days ?? 365,
      ownerEmail: 'foto@martinruzek.cz',
      fromEmail: 'noreply@martinruzek.eu',
    },
  };
}

describe('runMaintenance', () => {
  it('anonymizes old new and lost rows, keeps won and young rows', async () => {
    const old = NOW - 366 * DAY;
    const previewedAt = NOW - 14 * DAY;
    const { d, rows } = deps([
      rec('a', { createdAt: old, previewedAt }),
      rec('b', { createdAt: old, status: 'lost', previewedAt }),
      rec('c', { createdAt: old, status: 'won' }),
      rec('d', { createdAt: NOW - 364 * DAY, previewedAt }),
    ]);
    const res = await runMaintenance(d);
    expect(res.anonymized).toBe(2);
    expect(rows.map((r) => [r.id, r.anonymizedAt !== null])).toEqual([
      ['a', true],
      ['b', true],
      ['c', false],
      ['d', false],
    ]);
  });

  it('resends the owner mail for rows unnotified for more than 10 minutes, and marks them', async () => {
    const { d, rows, sent } = deps([
      rec('old', { createdAt: NOW - 11 * 60_000, notifiedAt: null, confirmedAt: null }),
      rec('fresh', { createdAt: NOW - 2 * 60_000, notifiedAt: null }),
    ]);
    const res = await runMaintenance(d);
    expect(res.resent).toBe(2); // counts mails, not rows
    expect(sent.map((m) => [m.to, m.replyTo])).toEqual([
      ['foto@martinruzek.cz', 'old@example.com'],
      ['old@example.com', 'foto@martinruzek.cz'], // the confirmation was missing too
    ]);
    expect(rows[0]!.notifiedAt).toBe(NOW);
    expect(rows[0]!.confirmedAt).toBe(NOW);
    expect(rows[1]!.notifiedAt).toBeNull();
  });

  it('resends only the confirmation when only the confirmation is missing (FM-02)', async () => {
    const { d, rows, sent } = deps([
      rec('c', { createdAt: NOW - DAY, confirmedAt: null }),
      rec('stale', { createdAt: NOW - 8 * DAY, confirmedAt: null }), // past the retry window
    ]);
    const res = await runMaintenance(d);
    expect(sent.map((m) => m.to)).toEqual(['c@example.com']);
    expect(res.resent).toBe(1);
    expect(rows[0]!.confirmedAt).toBe(NOW);
    expect(rows[0]!.notifiedAt).toBe(NOW - DAY);
    expect(rows[1]!.confirmedAt).toBeNull();
  });

  it('a failing mail does not stop the others', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { d, rows } = deps(
      [
        rec('x', { createdAt: NOW - DAY, notifiedAt: null, email: 'bad@example.com' }),
        rec('y', { createdAt: NOW - DAY, notifiedAt: null }),
      ],
      { failTo: 'foto@martinruzek.cz' },
    );
    // every owner mail fails here; both rows are still tried and stay unnotified
    const res = await runMaintenance(d);
    expect(res.resent).toBe(0);
    expect(rows.every((r) => r.notifiedAt === null)).toBe(true);
    expect(String(err.mock.calls)).not.toContain('example.com'); // no personal data in logs
    err.mockRestore();

    const ok = deps([
      rec('x', { createdAt: NOW - DAY, notifiedAt: null }),
      rec('y', { createdAt: NOW - DAY, notifiedAt: null }),
    ]);
    let calls = 0;
    const flaky = {
      ...ok.d,
      mailer: {
        send: async () => {
          if (calls++ === 0) throw new Error('first fails');
        },
      },
    };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await runMaintenance(flaky)).resent).toBe(1);
    quiet.mockRestore();
  });

  it.each([30, 0, -1, NaN, Infinity])('refuses anonymizeAfterDays = %s', async (days) => {
    const { d, rows } = deps([rec('a', { createdAt: NOW - 400 * DAY })], { days });
    await expect(runMaintenance(d)).rejects.toThrow(/anonymizeAfterDays/);
    expect(rows[0]!.anonymizedAt).toBeNull();
  });

  it('on the 1st previews what is due within 35 days and anonymizes it only after the notice (FM-04)', async () => {
    const { d, sent, rows } = deps(
      [
        rec('soon', { createdAt: FIRST - 340 * DAY, name: 'Jana Nováková' }),
        rec('due', { createdAt: FIRST - 366 * DAY }),
        rec('edge', { createdAt: FIRST - 331 * DAY }), // due on day 34 of the window
        rec('later', { createdAt: FIRST - 329 * DAY }), // due on day 36
        rec('won', { createdAt: FIRST - 340 * DAY, status: 'won' }),
      ],
      { now: FIRST },
    );
    const res = await runMaintenance(d);
    expect(res.previewed).toBe(3);
    const preview = sent.find((m) => m.to === 'foto@martinruzek.cz' && /anonymiz/.test(m.subject));
    expect(preview!.text).toContain('Jana Nováková');
    for (const id of ['soon', 'due', 'edge']) expect(preview!.text).toContain(id);
    expect(preview!.text).not.toContain('later');
    expect(preview!.text).not.toContain('Jméno won');
    expect(rows.find((r) => r.id === 'later')!.previewedAt).toBeNull();
    // overdue, but just previewed: it waits for the notice period
    expect(res.anonymized).toBe(0);

    const after = await runMaintenance({ ...d, now: () => FIRST + 3 * DAY });
    expect(after.anonymized).toBe(1);
    expect(after.previewed).toBe(0); // nothing new, no second mail
    expect(rows.find((r) => r.id === 'due')!.anonymizedAt).toBe(FIRST + 3 * DAY);
  });

  it('a failed preview is retried the next day and nothing is anonymized without it (FM-04)', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    // past the retention period but within NOTICE_GRACE_DAYS
    const { d, rows, sent } = deps([rec('due', { createdAt: FIRST - 370 * DAY })], {
      now: FIRST,
      failTo: 'foto@martinruzek.cz',
    });
    const first = await runMaintenance(d);
    expect(first).toMatchObject({ previewed: 0, anonymized: 0 });
    expect(rows[0]!.previewedAt).toBeNull();
    quiet.mockRestore();

    // the provider is back the next day
    const next = await runMaintenance({
      ...d,
      mailer: { send: async (m) => void sent.push(m) },
      now: () => FIRST + DAY,
    });
    expect(next.previewed).toBe(1);
    expect(next.anonymized).toBe(0);
    expect(rows[0]!.previewedAt).toBe(FIRST + DAY);
  });

  it('past the grace period a row is anonymized even though no preview could be sent (FM-13)', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { d, rows } = deps([rec('stuck', { createdAt: FIRST - 400 * DAY })], {
      now: FIRST,
      failTo: 'foto@martinruzek.cz',
    });
    expect(await runMaintenance(d)).toMatchObject({ previewed: 0, anonymized: 1 });
    expect(rows[0]!.anonymizedAt).toBe(FIRST);
    quiet.mockRestore();
  });

  it('no preview mail when nothing is due or everything due was previewed', async () => {
    const empty = deps([rec('later', { createdAt: FIRST - 300 * DAY })], { now: FIRST });
    expect((await runMaintenance(empty.d)).previewed).toBe(0);
    expect(empty.sent).toHaveLength(0);

    const done = deps([rec('soon', { createdAt: NOW - 340 * DAY, previewedAt: NOW - 14 * DAY })]);
    expect((await runMaintenance(done.d)).previewed).toBe(0);
    expect(done.sent).toHaveLength(0);
  });
});
