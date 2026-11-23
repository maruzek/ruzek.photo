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
   * sheet: frame numbers 01, 02, … follow it, counting only published photos. Like a real roll, the frames of
   * one shoot sit together (talk, match, ball, match, party, floorball, street, match), so the picks fall
   * irregularly across the sheet. 18 frames fill whole rows of 9, 6 and 3 columns (work.css). `picks` are the
   * frames the open sheet enlarges, each into its own slot of the spread (s1–s8, see work.css). The slot belongs
   * to the photo: a withdrawn pick leaves its slot empty and the other picks keep theirs.
   */
  work: {
    sheet: [
      'conference-group-photo',
      'talk-speaker-microphone',
      'football-team-huddle',
      'football-goalkeeper-dive',
      'football-smile-touchline',
      'ball-smile-through-crowd',
      'ball-tiara-portrait',
      'football-header-jump',
      'football-arms-raised',
      'gathering-table-smile',
      'party-table-laugh',
      'party-beer-glance',
      'floorball-faceoff',
      'floorball-goalkeeper-kneel',
      'floorball-shot-goalkeeper',
      'street-newspapers',
      'street-hat-flower',
      'football-corner-crowd',
    ],
    /** The spread opens with a match next to a talk ("from events and matches"), then alternates */
    picks: {
      'football-goalkeeper-dive': 's1',
      'talk-speaker-microphone': 's2',
      'floorball-faceoff': 's3',
      'ball-tiara-portrait': 's4',
      'party-table-laugh': 's5',
      'street-hat-flower': 's6',
      'party-beer-glance': 's7',
      'floorball-shot-goalkeeper': 's8',
    },
    /** Published photos the sheet leaves out now (back on the sheet when a 19th and 20th frame fill a row again) */
    reserve: ['football-assistant-referee'],
  },
  /** Photo of each service card */
  services: {
    event: 'conference-audience',
    sport: 'football-duel',
    portrait: 'portrait-street-peace',
  },
  /** The vertical photo in step 2 of "Same day" */
  sameDay: 'football-shoulder-run',
  /** Martin's portrait in "About" */
  about: 'martin-ruzek-portrait',
} as const satisfies {
  work: {
    sheet: readonly string[];
    picks: Readonly<Record<string, SpreadSlot>>;
    reserve: readonly string[];
  };
  [key: string]: unknown;
};

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];

/** Mobile cover positioning for the selected hero and event fold photos. */
export const MOBILE_PHOTO_POSITION: Readonly<Partial<Record<string, string>>> = {
  'ball-dance-red': '66% 50%', // Keep the dancer to the right of the lettering.
  'conference-speaker': '35% 50%',
};
