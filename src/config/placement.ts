import type { SpreadSlot } from '../lib/photos/contact-sheet';
import type { DayFrames, DayPick } from '../lib/photos/day';

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
      'conference-audience',
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
    event: 'conference-group-photo',
    sport: 'football-duel',
    portrait: 'portrait-street-peace',
  },
  /**
   * The time axis of "Same day" (SameDay.astro), photos of ONE event only. `frames` are its six moments, left to
   * right: list each photo once, in the moment it was taken, with the face or the action as `focus`. A moment has
   * room for 5, 7, 5, 9, 6 and 8 photos (DAY_COLUMNS, lib/photos/day.ts); fewer repeat with other crops (a crop can also be listed by hand, as now), so 6 to 40
   * photos work. The gallery wall mixes the same frames by itself.
   * `picks` are the photos shown large as the same-day selection, at most three: two upright crops, then a wide one.
   * Each must also be in `frames`, where it gets the coral frame.
   */
  sameDay: {
    frames: [
      [
        { photo: 'conference-thumbs-up', focus: '50% 28%' },
        { photo: 'conference-speaker', focus: '37% 22%' },
      ],
      [
        { photo: 'conference-listening', focus: '74% 42%' },
        { photo: 'conference-row', focus: '36% 46%', zoom: 1.3 },
        { photo: 'conference-attentive-profile', focus: '52% 40%' },
      ],
      [
        { photo: 'conference-street-conversation', focus: '62% 30%' },
        { photo: 'conference-table-talk', focus: '53% 45%' },
        { photo: 'conference-discussion', focus: '50% 33%' },
      ],
      [
        { photo: 'conference-focused-discussion', focus: '60% 45%' },
        { photo: 'conference-table-smile', focus: '58% 36%' },
        { photo: 'conference-blue-suit', focus: '49% 25%' },
        { photo: 'conference-clasped-hands', focus: '73% 42%' },
      ],
      [
        { photo: 'conference-banner-speech', focus: '50% 35%' },
        { photo: 'conference-lectern-laugh', focus: '46% 35%' },
        { photo: 'conference-laughing-glasses', focus: '55% 45%' },
      ],
      [
        { photo: 'conference-chin-rest', focus: '70% 42%' },
        { photo: 'conference-bearded-laugh', focus: '62% 48%' },
        { photo: 'conference-slat-wall-portrait', focus: '50% 10%' },
        { photo: 'conference-group-photo', focus: '14% 62%', zoom: 1.5 },
      ],
    ],
    picks: [
      { photo: 'conference-speaker', focus: '33% 50%' },
      { photo: 'conference-discussion', focus: '58% 30%' },
      { photo: 'conference-group-photo', focus: '0% 66%', zoom: 1.28 },
    ],
  },
  /** Martin's portrait in "About" */
  about: 'martin-ruzek-portrait',
} as const satisfies {
  work: {
    sheet: readonly string[];
    picks: Readonly<Record<string, SpreadSlot>>;
    reserve: readonly string[];
  };
  sameDay: { frames: DayFrames; picks: readonly DayPick[] };
  [key: string]: unknown;
};

export const TEXT_OVER_PHOTOS: readonly string[] = [PLACEMENT.hero, ...PLACEMENT.folds];

/** Mobile cover positioning for the selected hero and fold photos. */
export const MOBILE_PHOTO_POSITION: Readonly<Partial<Record<string, string>>> = {
  'ball-dance-red': '66% 50%', // Keep the dancer to the right of the lettering.
  'conference-speaker': '35% 50%',
  'football-slide-tackle': '45% 50%',
};
