/**
 * Which photos the home page puts text over: the hero and the two photo folds (events, sport).
 * Home.astro renders them and `pnpm check:contrast` measures them, so a swap is one edit here.
 */
export const PLACEMENT = {
  hero: 'smoke',
  folds: ['ball', 'soccer-goal'],
  /** The work grid, in the order of the prototype's slots w1–w8 (a withdrawn photo leaves its slot out) */
  work: ['stage', 'dance', 'bartender', 'soccer-night', 'floorball', 'graduation', 'athlete', 'toast'],
  /** Photo of each service card (the `short` card is shared with the portrait) */
  services: { event: 'conference', match: 'hockey', short: 'portrait' },
  /** The vertical photo in step 2 of "Same day" */
  sameDay: 'athlete',
  /** Martin's portrait in "About" (TODO: a placeholder until his own portrait exists) */
  about: 'portrait',
} as const;

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];
