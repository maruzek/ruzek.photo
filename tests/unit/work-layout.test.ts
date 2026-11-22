import { describe, expect, it } from 'vitest';
import { WORK_SLOTS, layoutWork, type WorkCell } from '@/lib/work-layout';

type P = { id: string; portrait: boolean };
const PORTRAITS = new Set([1, 5]);
const all: P[] = WORK_SLOTS.map((_, i) => ({ id: `p${i}`, portrait: PORTRAITS.has(i) }));
const place = (items: Array<P | undefined>): WorkCell<P>[] => layoutWork(items, (p) => p.portrait);
const span = (c: WorkCell<P>): number => Number(/span (\d+)/.exec(c.column)?.[1]);
const start = (c: WorkCell<P>): number => Number(c.column.split(' / ')[0]);

/** Groups cells into desktop rows (a row starts at column 1) and checks each fills all 12 columns. */
function desktopRows(cells: WorkCell<P>[]): WorkCell<P>[][] {
  const rows: WorkCell<P>[][] = [];
  for (const c of cells) {
    if (start(c) === 1) rows.push([]);
    rows.at(-1)?.push(c);
  }
  return rows;
}

/** Phone rows: a full-width photo or exactly two halves, nothing else. */
function phoneRowsComplete(cells: WorkCell<P>[]): boolean {
  let half = 0;
  for (const c of cells) {
    if (c.phoneColumn === '1 / -1') {
      if (half % 2) return false;
    } else half++;
  }
  return half % 2 === 0;
}

describe('layoutWork', () => {
  it('fills every desktop row and every phone row with all photos published', () => {
    const cells = place(all);
    expect(cells).toHaveLength(all.length);
    for (const row of desktopRows(cells)) {
      expect(row.reduce((a, c) => a + span(c), 0)).toBe(12);
      expect(row.filter((c) => c.ratio !== null)).toHaveLength(1);
    }
    expect(phoneRowsComplete(cells)).toBe(true);
    expect(cells.filter((c) => c.role === 'develop').map((c) => c.item.id)).toEqual(['p0', 'p6']);
  });

  it('keeps the slot of each photo when one is withdrawn and closes the row up', () => {
    const items = all.map((p, i) => (i === 3 ? undefined : p));
    const cells = place(items);
    expect(cells.map((c) => c.item.id)).not.toContain('p3');
    // the photo after the withdrawn one keeps its own role and travel
    const p4 = cells.find((c) => c.item.id === 'p4');
    expect(p4?.role).toBe('drift');
    expect(p4?.drift).toBe(WORK_SLOTS[4]?.drift?.[0]);
    for (const row of desktopRows(cells)) {
      expect(row.reduce((a, c) => a + span(c), 0)).toBe(12);
      expect(row.filter((c) => c.ratio !== null)).toHaveLength(1);
    }
    expect(phoneRowsComplete(cells)).toBe(true);
  });

  it('never leaves a hole for any single withdrawal', () => {
    for (let gone = 0; gone < all.length; gone++) {
      const cells = place(all.map((p, i) => (i === gone ? undefined : p)));
      for (const row of desktopRows(cells))
        expect(row.reduce((a, c) => a + span(c), 0)).toBe(12);
      expect(phoneRowsComplete(cells)).toBe(true);
    }
  });

  it('handles one photo and no photo', () => {
    const one = place([all[0]]);
    expect(one).toHaveLength(1);
    expect(one[0]?.column).toBe('1 / span 12');
    expect(one[0]?.phoneColumn).toBe('1 / -1');
    expect(place([])).toEqual([]);
  });
});
