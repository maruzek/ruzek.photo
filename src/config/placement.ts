/**
 * Which photos the home page puts text over: the hero and the two photo folds (events, sport).
 * Home.astro renders them and `pnpm check:contrast` measures them, so a swap is one edit here.
 */
export const PLACEMENT = {
  hero: 'ball-dance-red',
  /** Events fold, then sport fold */
  folds: ['conference-speaker', 'football-slide-tackle'],
  /**
   * The work grid ("Developing" prototype): the photo at index i always takes slot i of WorkGrid.astro (row,
   * width, role). A withdrawn photo leaves the grid and the others keep their slots; its row closes up.
   * Roles: 1 and 7 develop out of the Bayer dither, 2–6 drift inside their frames, 8 and 9 stand still.
   */
  work: [
    'football-goalkeeper-dive',
    'floorball-faceoff',
    'gathering-table-smile',
    'football-header-jump',
    'party-table-laugh',
    'talk-speaker-microphone',
    'street-hat-flower',
    'football-team-huddle',
    'party-beer-glance',
  ],
  /** Imported spares no layout shows yet */
  reserve: [
    'ball-smile-through-crowd', 'ball-tiara-portrait', 'street-newspapers', 'conference-group-photo',
    'football-corner-crowd', 'football-smile-touchline', 'football-arms-raised', 'football-assistant-referee',
    'floorball-shot-goalkeeper', 'floorball-goalkeeper-kneel',
  ],
  /** Photo of each service card (the `short` card is shared with the portrait) */
  services: {
    event: 'conference-audience',
    match: 'football-duel',
    short: 'portrait-street-peace',
  },
  /** The vertical photo in step 2 of "Same day" */
  sameDay: 'football-shoulder-run',
  /** Martin's portrait in "About" */
  about: 'martin-ruzek-portrait',
} as const;

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];
