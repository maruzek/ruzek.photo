// The photos of the "same day" time axis (SameDay.astro). Pure data: which photo sits in which cell of the event
// chart, in which crop, which cell is the marked pick, and the order of the gallery wall.

/** A photo in the chart. `focus` (object-position of the face or the action) and `zoom` crop it into its cell. */
export interface DayFrame {
  photo: string;
  focus?: string;
  zoom?: number;
}
export type DayPick = DayFrame;
/** Six moments of the event, left to right */
export type DayFrames = readonly [Column, Column, Column, Column, Column, Column];
type Column = readonly DayFrame[];

/** Cells per moment: the shape of the chart, the same for any number of photos. 40 cells together. */
export const DAY_COLUMNS = [5, 7, 5, 9, 6, 8] as const;
/** Cells in a row of the gallery wall on desktop and phones (day.css); it has as many cells as the chart */
export const WALL_COLUMNS = 5;
/** The marked cell is the one nearest this row, counted from the axis: inside the pile, not at its edge */
const PICK_ROW = 2;
/** Zoom of the 1st, 2nd, 3rd, … use of one frame, times its own zoom */
const REPEAT_ZOOM = [1, 1.35, 1.9, 1.15, 1.6, 1.25, 2.1, 1] as const;
/** A closer crop of a thumbnail is only blur */
const MAX_ZOOM = 2.4;
/** Step through the chart that mixes the moments on the wall (no common divisor with 40) */
const WALL_STRIDE = 13;
const CENTRE = '50% 50%';

export interface DayCell<P> {
  id: string;
  photo: P;
  focus: string;
  zoom: number;
  /** The photo is sent the same day: its cell keeps its colour and gets the coral frame */
  pick: boolean;
}

export interface DayLayout<P> {
  /** Chart columns, each from the axis up */
  columns: DayCell<P>[][];
  /** The same cells in the order of the gallery */
  wall: DayCell<P>[];
  /** The photos shown large, in their order; a withdrawn one is left out */
  picks: Array<{ id: string; photo: P; focus: string; zoom: number }>;
}

const round = (v: number): number => Math.round(v * 100) / 100;

/** The `n`-th use of a frame: the first is the crop from the config, the next ones are closer or wider. */
function repeatZoom(own: number, n: number): number {
  const factor = REPEAT_ZOOM[n % REPEAT_ZOOM.length] ?? 1;
  const closer = own * factor;
  return round(Math.max(1, closer > MAX_ZOOM ? own / factor : closer));
}

/**
 * Fills the chart from the placement and the photos that resolved (`undefined` = missing or withdrawn). A moment with
 * fewer frames than cells repeats its own ones with other crops; a moment left without photos borrows those of the
 * whole event, so the chart keeps its shape. Frames beyond the column's height do not show. With no photo at all
 * there are no cells.
 */
export function buildDay<P>(
  frames: DayFrames,
  picks: readonly DayPick[],
  photoOf: (id: string) => P | undefined,
): DayLayout<P> {
  type Usable = DayFrame & { resolved: P };
  const usable = (list: readonly DayFrame[]): Usable[] =>
    list.flatMap((frame) => {
      const resolved = photoOf(frame.photo);
      return resolved === undefined ? [] : [{ ...frame, resolved }];
    });
  const all = usable(frames.flat());
  const columns =
    all.length === 0
      ? []
      : DAY_COLUMNS.map((height, c) => {
          const own = usable(frames[c] ?? []);
          const source = own.length > 0 ? own : all;
          return Array.from({ length: height }, (_, i): DayCell<P> => {
            const frame = source[i % source.length] as Usable;
            return {
              id: frame.photo,
              photo: frame.resolved,
              focus: frame.focus ?? CENTRE,
              zoom: repeatZoom(frame.zoom ?? 1, Math.floor(i / source.length)),
              pick: false,
            };
          });
        });

  const large = usable(picks).map(({ photo, focus, zoom, resolved }) => ({
    id: photo,
    photo: resolved,
    focus: focus ?? CENTRE,
    zoom: zoom ?? 1,
  }));
  for (const { id } of large) {
    const cell = pickCell(columns, id);
    if (cell) cell.pick = true;
  }
  return { columns, wall: wallOrder(columns.flat()), picks: large };
}

/** The cell of a pick: in the moment with most of its frames, the one nearest PICK_ROW (the higher of two). */
function pickCell<P>(columns: DayCell<P>[][], id: string): DayCell<P> | undefined {
  const count = (column: DayCell<P>[]): number => column.filter((c) => c.id === id).length;
  const column = columns.reduce<DayCell<P>[]>((best, c) => (count(c) > count(best) ? c : best), []);
  let found: DayCell<P> | undefined;
  let distance = Infinity;
  column.forEach((cell, row) => {
    if (cell.id !== id || Math.abs(row - PICK_ROW) > distance) return;
    found = cell;
    distance = Math.abs(row - PICK_ROW);
  });
  return found;
}

/**
 * The gallery order: the frames of the whole event mixed, no photo next to or above itself where that is possible.
 * The same input always gives the same order, so both languages and every build match. Of the cells that fit, the
 * photo with most cells left goes first, otherwise the last rows would be one photo over and over.
 */
function wallOrder<P>(cells: readonly DayCell<P>[]): DayCell<P>[] {
  const left = new Map<string, DayCell<P>[]>();
  cells.forEach((_, i) => {
    const cell = cells[(i * WALL_STRIDE) % cells.length] as DayCell<P>;
    left.set(cell.id, [...(left.get(cell.id) ?? []), cell]);
  });
  const wall: DayCell<P>[] = [];
  while (wall.length < cells.length) {
    const i = wall.length;
    const before = i % WALL_COLUMNS === 0 ? undefined : wall[i - 1]?.id;
    const above = wall[i - WALL_COLUMNS]?.id;
    const stock = [...left.entries()].filter(([, list]) => list.length > 0);
    const fits = stock.filter(([id]) => id !== before && id !== above);
    const pool = fits.length > 0 ? fits : stock;
    const [first] = pool.sort(([, a], [, b]) => b.length - a.length);
    const next = first?.[1].shift();
    if (!next) break;
    wall.push(next);
  }
  return wall;
}
