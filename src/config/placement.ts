/**
 * Which photos the home page puts text over: the hero and the two photo folds (events, sport).
 * Home.astro renders them and `pnpm check:contrast` measures them, so a swap is one edit here.
 */
export const PLACEMENT = {
  hero: 'ball-dance-red',
  /** Events fold, then sport fold */
  folds: ['conference-speaker', 'football-slide-tackle'],
  /**
   * The work gallery ("three speeds"): three lanes that scroll at different rates (WorkGrid.astro, motion/work.ts).
   * Each photo keeps its lane and its crop: a withdrawn photo leaves its lane shorter and the others stay put.
   * `crop` is the frame's aspect ratio, `focus` the CSS `object-position` of the photo inside it; the files are
   * never cropped. Below 1100 px the lanes flow into two columns, below 641 px into one, in this order; `md` is
   * another crop for the two columns, which the browser balances photo by photo (these two even them out).
   */
  work: {
    left: [
      { id: 'gathering-table-smile', crop: '4/5', focus: '54% 50%' },
      { id: 'football-goalkeeper-dive', crop: '3/2' },
      { id: 'street-hat-flower', crop: '4/5', focus: '67% 50%' },
      { id: 'football-header-jump', crop: '3/2', md: { crop: '4/5', focus: '45% 50%' } },
    ],
    middle: [
      { id: 'floorball-faceoff', crop: '2/3' },
      { id: 'party-table-laugh', crop: '3/2' },
      { id: 'football-smile-touchline', crop: '5/4', focus: '40% 50%', md: { crop: '3/2' } },
      { id: 'street-newspapers', crop: '3/2' },
    ],
    right: [
      { id: 'football-team-huddle', crop: '3/2' },
      { id: 'talk-speaker-microphone', crop: '2/3' },
      { id: 'football-corner-crowd', crop: '3/2' },
      { id: 'party-beer-glance', crop: '1/1', focus: '35% 50%' },
    ],
  },
  /** Imported spares the gallery does not show now */
  reserve: [
    'football-assistant-referee', 'ball-smile-through-crowd', 'ball-tiara-portrait', 'conference-group-photo',
    'football-arms-raised', 'floorball-shot-goalkeeper', 'floorball-goalkeeper-kneel',
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

/** Frame aspect ratios a work photo can take (width / height) */
export type WorkCrop = '3/2' | '4/5' | '2/3' | '1/1' | '5/4';
export interface WorkShot {
  readonly id: string;
  readonly crop: WorkCrop;
  /** `object-position` of the photo in its frame; the centre when left out */
  readonly focus?: string;
  /** Crop in the two-column layout (641–1099 px), when it differs */
  readonly md?: { readonly crop: WorkCrop; readonly focus?: string };
}
export type WorkLane = keyof typeof PLACEMENT.work;

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];
