/**
 * Which photos the home page puts text over: the hero and the two photo folds (events, sport).
 * Home.astro renders them and `pnpm check:contrast` measures them, so a swap is one edit here.
 */
export const PLACEMENT = {
  hero: 'ball-dance-red',
  /** Events fold, then sport fold */
  folds: ['conference-speaker', 'football-slide-tackle'],
  /**
   * The work grid: the photo at index i always takes the prototype's slot w(i+1). A withdrawn photo leaves its
   * slot empty, the other photos keep theirs.
   */
  work: [
    'football-goalkeeper-dive',
    'gathering-table-smile',
    'floorball-faceoff',
    'party-table-laugh',
    'football-team-huddle',
    'talk-speaker-microphone',
    'football-assistant-referee',
    'party-beer-glance',
  ],
  /** Imported spares for a bigger gallery (contact sheet, columns); no layout shows them yet */
  reserve: [
    'ball-smile-through-crowd', 'ball-tiara-portrait', 'street-newspapers', 'street-hat-flower', 'conference-group-photo',
    'football-corner-crowd', 'football-header-jump', 'football-smile-touchline', 'football-arms-raised',
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
