// The work gallery as a contact sheet (ContactSheet.astro). Pure data: which published photo gets which frame
// number, which frames stay on the sheet and which are enlarged into the spread below it.

/** Slots of the spread, in reading order (work.css places each one at 360 px and on desktop) */
export const SPREAD_SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;
export type SpreadSlot = (typeof SPREAD_SLOTS)[number];

export interface Frame<P> {
  id: string;
  photo: P;
  /** Frame number on the sheet, two digits: its position among the published photos */
  no: string;
  /** The slot of the spread for a pick, `undefined` for a frame that stays on the sheet */
  slot: SpreadSlot | undefined;
}

export interface ContactSheet<P> {
  /** Every published frame in sheet order; a pick is a marked seat on the sheet */
  frames: Frame<P>[];
  /** The picks in slot order (= reading and tab order of the spread); a withdrawn pick is left out */
  spread: Array<Frame<P> & { slot: SpreadSlot }>;
}

/**
 * Builds the sheet from the placement and the photos that resolved (`undefined` = missing or withdrawn).
 * Numbers count published frames only, so a withdrawn photo never leaves a gap in the numbering. A pick keeps its
 * own slot whatever happens to the others.
 */
export function buildContactSheet<P>(
  sheet: readonly string[],
  picks: Readonly<Partial<Record<string, SpreadSlot>>>,
  photoOf: (id: string) => P | undefined,
): ContactSheet<P> {
  const frames: Frame<P>[] = [];
  for (const id of sheet) {
    const photo = photoOf(id);
    if (photo === undefined) continue;
    frames.push({ id, photo, no: String(frames.length + 1).padStart(2, '0'), slot: picks[id] });
  }
  const spread = SPREAD_SLOTS.flatMap((slot) =>
    frames.filter((f): f is Frame<P> & { slot: SpreadSlot } => f.slot === slot),
  );
  return { frames, spread };
}
