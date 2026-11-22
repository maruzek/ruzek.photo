/**
 * Layout of the work grid ("Developing" prototype). A gapless editorial grid: every desktop row fills all 12
 * columns and every phone row is one full-width photo or a pair, so the grid never shows an empty cell.
 *
 * A slot belongs to a photo (PLACEMENT.work[i] takes SLOTS[i]). When a photo is withdrawn, the other photos
 * keep their slot and role, and its row closes up: the remaining widths are scaled back to 12 columns and on a
 * phone a photo left without its partner goes full width.
 */

/** `develop`: assembles from the Bayer dither; `drift`: the photo slides inside its still frame; `still`: rests */
export type WorkRole = 'develop' | 'drift' | 'still';

export interface WorkSlot {
  /** Desktop row (0-based) */
  row: number;
  /** Desktop width in columns of 12 */
  span: number;
  role: WorkRole;
  /** Phone: a full-width photo or one half of a pair */
  phone: 'full' | 'pair';
  /** `drift` only: travel in px, desktop and phone; the sign is the direction (neighbours move against each other) */
  drift?: readonly [number, number];
}

/** Desktop row heights in column widths: the height of the photo that sets the row (ignoring gaps). */
export const ROW_HEIGHTS: readonly number[] = [8 / 1.5, 5 / (4 / 3), 8 / 1.5, 7 / 1.5];

export const WORK_SLOTS: readonly WorkSlot[] = [
  // row 0: the lead develops, a portrait drifts beside it
  { row: 0, span: 8, role: 'develop', phone: 'full' },
  { row: 0, span: 4, role: 'drift', phone: 'pair', drift: [32, 8] },
  // row 1: three frames whose photos slide against each other
  { row: 1, span: 3, role: 'drift', phone: 'pair', drift: [-24, -8] },
  { row: 1, span: 5, role: 'drift', phone: 'full', drift: [40, 14] },
  { row: 1, span: 4, role: 'drift', phone: 'pair', drift: [-30, -8] },
  // row 2: mirrored row 0, the second photo develops
  { row: 2, span: 4, role: 'drift', phone: 'pair', drift: [36, 10] },
  { row: 2, span: 8, role: 'develop', phone: 'full' },
  // row 3: two still photos resolve the composition
  { row: 3, span: 7, role: 'still', phone: 'pair' },
  { row: 3, span: 5, role: 'still', phone: 'pair' },
];

const COLUMNS = 12;

export interface WorkCell<T> {
  item: T;
  role: WorkRole;
  /** `grid-column` on desktop and on a phone */
  column: string;
  phoneColumn: string;
  /** Frame aspect ratio; `null` lets the frame stretch to the row the leading photo sets */
  ratio: number | null;
  phoneRatio: number;
  /** Signed travel in px (0 = none) */
  drift: number;
  phoneDrift: number;
}

/** Scales widths to fill `total` columns (largest remainder), at least 2 columns each. */
function fill(spans: readonly number[], total = COLUMNS): number[] {
  const sum = spans.reduce((a, b) => a + b, 0);
  const exact = spans.map((s) => (s * total) / sum);
  const out = exact.map((v) => Math.max(2, Math.floor(v)));
  const order = exact.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; out.reduce((a, b) => a + b, 0) < total; k++) {
    const i = order[k % order.length]?.[1] ?? 0;
    out[i] = (out[i] ?? 0) + 1;
  }
  return out;
}

/**
 * Places the published photos. `items[i]` is the photo of slot i, `undefined` when withdrawn; `portrait`
 * tells a photo's orientation (it picks the phone crop).
 */
export function layoutWork<T>(
  items: ReadonlyArray<T | undefined>,
  portrait: (item: T) => boolean,
  slots: readonly WorkSlot[] = WORK_SLOTS,
): WorkCell<T>[] {
  const present = slots.flatMap((slot, i) => {
    const item = items[i];
    return item === undefined ? [] : [{ item, slot }];
  });
  const cells = new Map<(typeof present)[number], WorkCell<T>>();

  // desktop: each row fills 12 columns; the widest photo leads (its ratio sets the row height)
  const rows = [...new Set(present.map((p) => p.slot.row))];
  for (const row of rows) {
    const inRow = present.filter((p) => p.slot.row === row);
    const spans = fill(inRow.map((p) => p.slot.span));
    const lead = spans.indexOf(Math.max(...spans));
    const height = ROW_HEIGHTS[row] ?? 4;
    let start = 1;
    inRow.forEach((p, i) => {
      const span = spans[i] ?? 1;
      cells.set(p, {
        item: p.item,
        role: p.slot.role,
        column: `${start} / span ${span}`,
        phoneColumn: '1 / -1',
        ratio: i === lead ? span / height : null,
        phoneRatio: 1.5,
        drift: p.slot.drift?.[0] ?? 0,
        phoneDrift: p.slot.drift?.[1] ?? 0,
      });
      start += span;
    });
  }

  // phone: pairs of consecutive `pair` photos, a photo left alone goes full width
  const full = (p: (typeof present)[number]): void => {
    const cell = cells.get(p);
    if (cell) Object.assign(cell, { phoneColumn: '1 / -1', phoneRatio: portrait(p.item) ? 4 / 5 : 3 / 2 });
  };
  let pending: Array<(typeof present)[number]> = [];
  const flush = (): void => {
    if (pending.length === 2) {
      const ratio = pending.some((p) => portrait(p.item)) ? 4 / 5 : 1;
      for (const p of pending) {
        const cell = cells.get(p);
        if (cell) Object.assign(cell, { phoneColumn: 'span 1', phoneRatio: ratio });
      }
    } else pending.forEach(full);
    pending = [];
  };
  for (const p of present) {
    if (p.slot.phone === 'full') {
      flush();
      full(p);
    } else {
      pending.push(p);
      if (pending.length === 2) flush();
    }
  }
  flush();

  return present.flatMap((p) => cells.get(p) ?? []);
}
