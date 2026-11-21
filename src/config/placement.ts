/**
 * Which photos the home page puts text over: the hero and the two photo folds (events, sport).
 * Home.astro renders them and `pnpm check:contrast` measures them, so a swap is one edit here.
 */
export const PLACEMENT = {
  hero: 'smoke',
  folds: ['ball', 'soccer-goal'],
} as const;

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];
