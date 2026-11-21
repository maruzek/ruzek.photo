// English dictionary: a faithful translation of cs.ts with no new claims.
// Not yet approved by Martin, so the English page shows `meta.translationTodo` through <Todo>
// until he signs the translation off (concept.md, kap. 5). See cs.ts for the string conventions.
import type { Dictionary } from './cs';

// Same shared card as in cs.ts: one card for the short shoot and the portrait.
const shortAndPortraitCard = {
  title: 'Portrait and short shoot',
  text: 'Portraits for a profile, a team or speakers. A short shoot for smaller events.',
  priceLabel: 'Portrait / short shoot',
} as const;

export const en = {
  meta: {
    title: 'Martin Růžek · event and sports photographer, Prague and Karlovy Vary',
    description:
      'Martin Růžek photographs corporate events, conferences, balls, parties and sport in Prague and Karlovy Vary. A selection of photos for your social media the same day.',
    translationTodo: 'kontrola překladu',
  },
  common: {
    skip: 'Skip to content',
    placeholderPhoto: 'Placeholder photo',
    cursorView: 'View',
  },
  anchors: {
    work: 'work',
    services: 'services',
    about: 'about',
    inquiry: 'inquiry',
  },
  nav: {
    label: 'Main',
    homeLabel: '{name}, home',
    logoLabel: '{name} logo',
    work: 'Work',
    services: 'Services and prices',
    about: 'About',
    inquiry: 'Request a shoot →',
  },
  lang: {
    other: 'Čeština',
  },
  hero: {
    kicker: 'Event and sports photographer',
    places: 'Prague · Karlovy Vary',
    scrollHint: 'Scroll',
    lead: 'I photograph corporate events, conferences, balls, parties and matches. A selection of photos for your social media goes out *the same day.*',
    cta: 'Request a shoot',
    ctaWork: 'See the work',
    instagram: 'Instagram {handle}',
    onPhoto: 'In the photo:',
    onPhotoTodo: 'who is in the photo',
  },
  marquee: {
    label: 'What I shoot',
    pause: 'Pause',
    items: [
      'Corporate events',
      'conferences',
      'Talks and debates',
      'balls',
      'Parties and bars',
      'universities and associations',
      'Football',
      'floorball',
      'Tournaments and races',
      'portraits',
    ],
  },
  folds: {
    events: {
      title: 'Events you will *want* to see again.',
      chips: ['Corporate events', 'Conferences', 'Talks and debates', 'Balls', 'Parties and bars'],
      text: 'I don’t look for poses. I photograph what actually happened: the speaker, the packed hall, the toast and the last dance.',
      index: '01',
      indexLabel: 'Events',
    },
    sport: {
      title: 'Sport is my *passion.*',
      chips: ['Football', 'Floorball', 'Tournaments', 'Races'],
      text: 'On the pitch you don’t get a second chance. I bring that speed to events too.',
      index: '02',
      indexLabel: 'Sport',
    },
  },
  work: {
    eyebrow: 'Selected work',
    title: 'Moments from events, *not* arrangements.',
    lead: 'Samples from events and sport. Click a photo to open it in full.',
    foot: 'I deliver the photos from an event to clients in a private online gallery. The website only shows photos with the consent of the client or organiser.',
    footLink: 'I want photos like these',
    captionTodo: 'place and date',
  },
  services: {
    eyebrow: 'Services and prices',
    title: 'What I shoot and *for how much.*',
    lead: 'The prices shown are indicative starting prices. I am not a VAT payer. I will send an exact quote based on the length and type of the event.',
    calcLink: 'Calculate the price',
    cards: {
      event: {
        title: 'Events',
        tag: 'main',
        text: 'Corporate events, conferences, talks and debates, university and association events, balls, parties and bars.',
        priceLabel: 'First hour',
        priceNote: 'each additional hour {price}',
      },
      match: {
        title: 'Sport',
        text: 'Football, floorball, tournaments and races. For clubs, teams and organisers.',
        priceLabel: 'Match',
      },
      short: shortAndPortraitCard,
      portrait: shortAndPortraitCard,
    },
    deliverables: {
      photos: '{range}\u00A0photos',
      photosPerHour: '{range}\u00A0photos per hour',
      turnaroundDays: 'within {range}\u00A0days',
      turnaroundHours: 'within {range}\u00A0h',
      durationMin: '{range}\u00A0min',
      durationMaxHours: 'shoot up to {n}\u00A0h',
      durationMaxMinutes: 'shoot up to {n}\u00A0min',
    },
    addons: {
      sameDay: { label: 'Same-day selection for social media', note: 'Selected photos on the day of the event' },
      video: { label: 'Vertical videos', note: 'Short vertical videos for social media' },
    },
  },
  day: {
    eyebrow: 'Same day',
    title: 'From arrival *to* your feeds.',
    lead: 'While the guests are leaving, I am choosing photos. They are on your social media before the event cools down.',
    steps: [
      {
        no: '01 · During the event',
        title: 'I shoot what happens',
        text: 'Speakers, guests, atmosphere, details. At sporting events, movement and emotion.',
      },
      {
        no: '02 · Right after the event',
        title: 'I pick the strongest',
        text: 'From the whole day I prepare a selection for social media and, if needed, vertical videos.',
      },
      {
        no: '03 · Same day',
        title: 'I send the selection',
        // Followed by <Todo>{galleryTodo}</Todo> and a full stop.
        text: 'The finished photos are yours the same day. I will deliver the full gallery',
      },
    ],
    galleryTodo: 'deadline',
  },
  about: {
    eyebrow: 'About me',
    title: 'I’m Martin. I *photograph* people in motion.',
    leadStrong: 'I am an event and sports photographer. I shoot in Prague and also work in Karlovy Vary.',
    lead: 'Most often I photograph corporate events, conferences, university and association events, balls and parties. Sport is my passion, portraits are a supplement.',
    speed: 'My strength is speed. I send a selection of photos for social media the same day, and I also shoot vertical videos.',
    storyTodo: 'Martin’s own story, how he got into photography',
    portraitAlt: 'Placeholder portrait, a spot for Martin’s photo',
    portraitTodo: 'Martin’s portrait',
    facts: {
      where: { label: 'Where', value: 'Prague, Karlovy Vary' },
      forWhom: { label: 'For whom', value: 'Companies, agencies, universities, associations, clubs' },
      instagram: { label: 'Instagram' },
    },
  },
  inquiry: {
    eyebrow: 'Inquiry',
    title: 'When is *your* event?',
    lead: 'Send the date, place and type of event. I will reply with a price and whether I am free.',
    estimate: {
      label: 'Estimate from',
      note: 'Based on the selected options. I am not a VAT payer.',
    },
    direct: {
      label: 'Prefer to reach me directly',
      phone: 'Phone and WhatsApp:',
      phoneTodo: 'number',
      email: 'E-mail:',
    },
    form: {
      name: {
        label: 'Name',
        placeholder: 'Jane Smith',
        error: 'Please enter your name so I know who I am replying to.',
      },
      email: {
        label: 'E-mail',
        placeholder: 'jane@company.com',
        error: 'The e-mail looks incomplete. Check the @ sign and the domain.',
      },
      type: {
        label: 'What are we shooting',
        options: {
          event: 'Event',
          match: 'Match',
          short: 'Short shoot',
          portrait: 'Portrait',
        },
      },
      hours: { label: 'Event length (hours)' },
      optional: '(optional)',
      date: { label: 'Date' },
      place: { label: 'Place', placeholder: 'Prague, Karlovy Vary…' },
      note: {
        label: 'What should I know',
        placeholder: 'Programme, number of guests, what matters to you',
      },
      send: 'Send inquiry',
      sending: 'Sending…',
      done: 'Thanks! The inquiry has been sent. A confirmation will arrive at your e-mail.',
      reset: 'Write another inquiry',
    },
    privacy: {
      acknowledge: 'By sending it you acknowledge the',
      link: 'privacy policy',
    },
  },
  footer: {
    lead: 'Have an event or a match? Tell me what you’d like photographed.',
    cta: 'Request a shoot',
    shoot: { label: 'I shoot', value: 'Events, sport, portraits' },
    where: { label: 'Where', value: 'Prague · Karlovy Vary' },
    instagram: { label: 'Instagram' },
    contact: { label: 'Contact', phoneTodo: 'phone' },
    legal: {
      copyright: '© {year} {name}',
      ico: 'Company ID (IČO)',
      seat: 'Registered office',
      vat: 'I am not a VAT payer',
      privacy: 'Privacy policy',
    },
  },
  lightbox: {
    label: 'Photo preview',
    close: 'Close',
    prev: 'Previous photo',
    next: 'Next photo',
    counter: '{n} / {total}',
  },
} as const satisfies Dictionary;
