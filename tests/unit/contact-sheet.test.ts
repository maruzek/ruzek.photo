import { describe, expect, it } from 'vitest';
import { PLACEMENT } from '@/config/placement';
import { SPREAD_SLOTS, buildContactSheet } from '@/lib/photos/contact-sheet';

const sheet = ['a', 'b', 'c', 'd', 'e'];
const picks = { b: 's2', d: 's1' } as const;
const all = (id: string): string => `photo-${id}`;

describe('buildContactSheet', () => {
  it('numbers frames in sheet order and orders the spread by slot', () => {
    const { frames, spread } = buildContactSheet(sheet, picks, all);
    expect(frames.map((f) => `${f.no}:${f.id}`)).toEqual(['01:a', '02:b', '03:c', '04:d', '05:e']);
    expect(spread.map((f) => `${f.slot}:${f.id}:${f.no}`)).toEqual(['s1:d:04', 's2:b:02']);
  });

  it('a withdrawn frame closes the numbering, the picks keep their slots', () => {
    const { frames, spread } = buildContactSheet(sheet, picks, (id) => (id === 'a' ? undefined : all(id)));
    expect(frames.map((f) => `${f.no}:${f.id}`)).toEqual(['01:b', '02:c', '03:d', '04:e']);
    expect(spread.map((f) => `${f.slot}:${f.id}`)).toEqual(['s1:d', 's2:b']);
  });

  it('a withdrawn pick leaves its slot empty instead of moving another photo into it', () => {
    const { frames, spread } = buildContactSheet(sheet, picks, (id) => (id === 'd' ? undefined : all(id)));
    expect(frames.map((f) => f.id)).toEqual(['a', 'b', 'c', 'e']);
    expect(spread.map((f) => `${f.slot}:${f.id}`)).toEqual(['s2:b']);
  });

  it('handles one photo and no photo', () => {
    const one = buildContactSheet(sheet, picks, (id) => (id === 'c' ? all(id) : undefined));
    expect(one.frames.map((f) => `${f.no}:${f.id}`)).toEqual(['01:c']);
    expect(one.spread).toEqual([]);
    const none = buildContactSheet(sheet, picks, () => undefined);
    expect(none).toEqual({ frames: [], spread: [] });
  });
});

describe('PLACEMENT.work', () => {
  it('lists every sheet photo once', () => {
    expect(new Set(PLACEMENT.work.sheet).size).toBe(PLACEMENT.work.sheet.length);
  });
  it('picks only photos on the sheet, one photo per slot', () => {
    const entries = Object.entries(PLACEMENT.work.picks);
    for (const [id] of entries) expect(PLACEMENT.work.sheet).toContain(id);
    const slots = entries.map(([, slot]) => slot);
    expect(new Set(slots).size).toBe(slots.length);
    for (const slot of slots) expect(SPREAD_SLOTS).toContain(slot);
  });
  it('keeps the placed photos off the sheet (one photo, one place on the page)', () => {
    const elsewhere = [
      PLACEMENT.hero,
      ...PLACEMENT.folds,
      ...Object.values(PLACEMENT.services),
      PLACEMENT.sameDay,
      PLACEMENT.about,
    ];
    for (const id of elsewhere) expect(PLACEMENT.work.sheet).not.toContain(id);
  });
});
