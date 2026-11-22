import type { SpreadSlot } from '../lib/photos/contact-sheet';

/**
 * Which photos the home page puts text over: the hero and the two photo folds (events, sport).
 * Home.astro renders them and `pnpm check:contrast` measures them, so a swap is one edit here.
 */
export const PLACEMENT = {
  hero: 'ball-dance-red',
  /** Events fold, then sport fold */
  folds: ['conference-speaker', 'football-slide-tackle'],
  /**
   * The work gallery, a contact sheet that opens (ContactSheet.astro). `sheet` is the order of the frames on the
   * sheet: frame numbers 01, 02, … follow it, counting only published photos. `picks` are the frames the open
   * sheet enlarges, each into its own slot of the spread (s1–s8, see work.css). The slot belongs to the photo:
   * a withdrawn pick leaves its slot empty and the other picks keep theirs.
   */
  work: {
    sheet: [
      'football-goalkeeper-dive',
      'gathering-table-smile',
      'floorball-faceoff',
      'conference-group-photo',
      'talk-speaker-microphone',
      'football-corner-crowd',
      'ball-tiara-portrait',
      'football-header-jump',
      'party-table-laugh',
      'football-team-huddle',
      'street-newspapers',
      'street-hat-flower',
      'football-arms-raised',
      'party-beer-glance',
      'football-smile-touchline',
      'ball-smile-through-crowd',
      'floorball-shot-goalkeeper',
      'football-assistant-referee',
      'floorball-goalkeeper-kneel',
    ],
    picks: {
      'football-goalkeeper-dive': 's1',
      'floorball-faceoff': 's2',
      'talk-speaker-microphone': 's3',
      'ball-tiara-portrait': 's4',
      'party-table-laugh': 's5',
      'street-hat-flower': 's6',
      'party-beer-glance': 's7',
      'floorball-shot-goalkeeper': 's8',
    },
  },
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
} as const satisfies {
  work: { sheet: readonly string[]; picks: Readonly<Record<string, SpreadSlot>> };
  [key: string]: unknown;
};

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];
