import { describe, it, expect, vi } from 'vitest';
import { runMaintenance } from '../../workers/maintenance/src/run';
import type { InquiryRecord, InquiryStore, MailMessage } from '@/server/inquiry/types';

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 5, 15, 3); // not the first day of a month
const FIRST = Date.UTC(2027, 6, 1, 3);

const rec = (id: string, over: Partial<InquiryRecord> = {}): InquiryRecord => ({
  id,
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
  anonymizedAt: null,
  ...over,
});

/** In-memory store with the same filters as d1Store (tests/workers/store.test.ts covers the SQL). */
function memoryStore(rows: InquiryRecord[]): InquiryStore {
  const anonymizable = (r: InquiryRecord, before: number) =>
    r.status !== 'won' && r.anonymizedAt === null && r.createdAt < before;
  return {
    insert: async (r) => void rows.push(r),
    markNotified: async (id, at) => void Object.assign(rows.find((r) => r.id === id)!, { notifiedAt: at }),
    markConfirmed: async (id, at) => void Object.assign(rows.find((r) => r.id === id)!, { confirmedAt: at }),
    listUnnotified: async (before, limit) =>
      rows.filter((r) => r.notifiedAt === null && r.anonymizedAt === null && r.createdAt < before).slice(0, limit),
    listAnonymizable: async (before) => rows.filter((r) => anonymizable(r, before)),
    anonymizeCreatedBefore: async (before, at) => {
      const hit = rows.filter((r) => anonymizable(r, before));
      for (const r of hit) Object.assign(r, { name: '', email: '', anonymizedAt: at });
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
    const { d, rows } = deps([
      rec('a', { createdAt: old }),
      rec('b', { createdAt: old, status: 'lost' }),
      rec('c', { createdAt: old, status: 'won' }),
      rec('d', { createdAt: NOW - 364 * DAY }),
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
    expect(res.resent).toBe(1);
    expect(sent.map((m) => [m.to, m.replyTo])).toEqual([
      ['foto@martinruzek.cz', 'old@example.com'],
      ['old@example.com', 'foto@martinruzek.cz'], // the confirmation was missing too
    ]);
    expect(rows[0]!.notifiedAt).toBe(NOW);
    expect(rows[0]!.confirmedAt).toBe(NOW);
    expect(rows[1]!.notifiedAt).toBeNull();
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

  it('on the first day of a month previews what will be anonymized within 31 days', async () => {
    const { d, sent } = deps(
      [
        rec('soon', { createdAt: FIRST - 340 * DAY, name: 'Jana Nováková' }),
        rec('due', { createdAt: FIRST - 366 * DAY }),
        rec('later', { createdAt: FIRST - 300 * DAY }),
        rec('won', { createdAt: FIRST - 340 * DAY, status: 'won' }),
      ],
      { now: FIRST },
    );
    const res = await runMaintenance(d);
    expect(res.previewed).toBe(2);
    const preview = sent.find((m) => m.to === 'foto@martinruzek.cz' && /anonymiz/.test(m.subject));
    expect(preview).toBeDefined();
    expect(preview!.text).toContain('Jana Nováková');
    expect(preview!.text).toContain('soon');
    expect(preview!.text).toContain('due');
    expect(preview!.text).not.toContain('later');
    expect(preview!.text).not.toContain('Jméno won');
    expect(res.anonymized).toBe(1);
  });

  it('no preview mail when nothing is due, and none on other days', async () => {
    const empty = deps([rec('later', { createdAt: FIRST - 300 * DAY })], { now: FIRST });
    expect((await runMaintenance(empty.d)).previewed).toBe(0);
    expect(empty.sent).toHaveLength(0);

    const otherDay = deps([rec('soon', { createdAt: NOW - 340 * DAY })]);
    expect((await runMaintenance(otherDay.d)).previewed).toBe(0);
    expect(otherDay.sent).toHaveLength(0);
  });
});
