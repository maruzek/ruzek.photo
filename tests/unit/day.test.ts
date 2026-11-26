import { describe, expect, it } from 'vitest';
import { PLACEMENT } from '@/config/placement';
import { buildDay, DAY_COLUMNS, WALL_COLUMNS, type DayFrames } from '@/lib/photos/day';

const CELLS = DAY_COLUMNS.reduce((sum, n) => sum + n, 0);
const photoOf = (id: string): string => `photo:${id}`;
/** A chart of `n` different photos, dealt to the six moments in turn (more than a moment holds go to the next one) */
function event(n: number): DayFrames {
  const columns: Array<Array<{ photo: string; focus?: string; zoom?: number }>> = [
    [],
    [],
    [],
    [],
    [],
    [],
  ];
  let c = 0;
  for (let i = 0; i < n; i++) {
    while ((columns[c % 6]?.length ?? 0) >= (DAY_COLUMNS[c % 6] ?? 0)) c++;
    columns[c % 6]?.push({ photo: `p${i}` });
    c++;
  }
  return columns as unknown as DayFrames;
}
const count = (ids: string[], id: string): number => ids.filter((x) => x === id).length;

describe('buildDay', () => {
  it.each([6, 15, 25, 40])('keeps the chart and the wall full with %i photos', (n) => {
    const { columns, wall } = buildDay(event(n), [], photoOf);
    expect(columns.map((c) => c.length)).toEqual([...DAY_COLUMNS]);
    expect(wall).toHaveLength(CELLS);
    const shown = new Set(columns.flat().map((c) => c.id));
    expect(shown.size, 'every photo has a cell').toBe(n);
    // the wall has the very same cells
    const ids = (cells: Array<{ id: string }>): string[] => cells.map((c) => c.id).sort();
    expect(ids(wall)).toEqual(ids(columns.flat()));
  });

  it('shows no photo next to or above itself on the wall', () => {
    for (const n of [6, 15, 40]) {
      const ids = buildDay(event(n), [], photoOf).wall.map((c) => c.id);
      ids.forEach((id, i) => {
        if (i % WALL_COLUMNS > 0) expect(ids[i - 1], `${n} photos, cell ${i}`).not.toBe(id);
        if (i >= WALL_COLUMNS) expect(ids[i - WALL_COLUMNS], `${n} photos, cell ${i}`).not.toBe(id);
      });
    }
  });

  it('repeats a frame with other crops, within the zoom limit', () => {
    const frames = event(6).map((c) => c.map((f) => ({ ...f, focus: '30% 20%', zoom: 1.5 })));
    const { columns } = buildDay(frames as unknown as DayFrames, [], photoOf);
    const zooms = columns[3]!.map((c) => c.zoom);
    expect(zooms[0]).toBe(1.5);
    expect(new Set(zooms).size).toBeGreaterThan(4);
    for (const z of zooms) {
      expect(z).toBeGreaterThanOrEqual(1);
      expect(z).toBeLessThanOrEqual(2.4);
    }
    expect(columns[3]!.every((c) => c.focus === '30% 20%')).toBe(true);
  });

  it('drops a withdrawn photo and keeps the shape', () => {
    const { columns, wall } = buildDay(event(15), [], (id) =>
      id === 'p3' ? undefined : photoOf(id),
    );
    expect(columns.map((c) => c.length)).toEqual([...DAY_COLUMNS]);
    expect(
      count(
        wall.map((c) => c.id),
        'p3',
      ),
    ).toBe(0);
  });

  it('a moment left without photos borrows those of the whole event', () => {
    const frames = event(6);
    const { columns } = buildDay(frames, [], (id) => (id === 'p3' ? undefined : photoOf(id)));
    expect(columns[3]).toHaveLength(DAY_COLUMNS[3]);
    expect(new Set(columns[3]!.map((c) => c.id)).size).toBe(5);
  });

  it('has no cells and no picks without any photo', () => {
    expect(buildDay(event(6), [{ photo: 'p0' }], () => undefined)).toEqual({
      columns: [],
      wall: [],
      picks: [],
    });
  });

  it('marks one cell of every pick, inside the pile', () => {
    const { columns, picks } = buildDay(
      event(15),
      [
        { photo: 'p1', focus: '10% 10%' },
        { photo: 'p8', zoom: 1.2 },
      ],
      photoOf,
    );
    expect(picks.map((p) => [p.id, p.focus, p.zoom])).toEqual([
      ['p1', '10% 10%', 1],
      ['p8', '50% 50%', 1.2],
    ]);
    const marked = columns.flat().filter((c) => c.pick);
    expect(marked.map((c) => c.id).sort()).toEqual(['p1', 'p8']);
  });

  it('a withdrawn pick leaves the others in their order', () => {
    const picks = ['p0', 'p1', 'p2'].map((photo) => ({ photo }));
    const layout = buildDay(event(15), picks, (id) => (id === 'p1' ? undefined : photoOf(id)));
    expect(layout.picks.map((p) => p.id)).toEqual(['p0', 'p2']);
    expect(layout.columns.flat().filter((c) => c.pick)).toHaveLength(2);
  });
});

describe('PLACEMENT.sameDay', () => {
  const { frames, picks } = PLACEMENT.sameDay;
  const ids = frames.flat().map((f) => f.photo);
  it('has six moments that fit the chart', () => {
    expect(frames).toHaveLength(DAY_COLUMNS.length);
    frames.forEach((column, i) => {
      expect(column.length).toBeGreaterThan(0);
      expect(column.length).toBeLessThanOrEqual(DAY_COLUMNS[i] ?? 0);
    });
  });
  it('has at most three picks, all of them in the chart', () => {
    expect(picks.length).toBeLessThanOrEqual(3);
    expect(new Set(picks.map((p) => p.photo)).size).toBe(picks.length);
    for (const { photo } of picks) expect(ids).toContain(photo);
  });
  it('shows one event only (conference-audience is from another one)', () => {
    expect(ids).not.toContain('conference-audience');
  });
});
