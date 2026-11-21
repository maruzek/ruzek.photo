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
    // Form island, endpoint and e-mails (tasks 10–12). Keys the prototype did not need.
    fields: {
      phone: { label: 'Phone' },
      timeFrom: { label: 'Start' },
      timeTo: { label: 'End' },
      guests: { label: 'Number of people' },
      addons: { legend: 'Requested deliverables' },
      honeypot: { label: 'Leave this field empty' },
    },
    errors: {
      service: 'Choose what we are shooting.',
      hours: 'Enter the event length in whole hours, from 1 to 12.',
      date: 'The date could not be read. Pick it in the calendar.',
      time: 'The time could not be read. Enter it like 18:30.',
      guests: 'Enter the number of people as a whole number.',
      tooLong: 'The text is too long. Please shorten it.',
      turnstile: 'We could not verify that a person is sending the inquiry. Please send it again.',
      rateLimit: 'Several inquiries came from your network in a short time. Please try again in a few minutes.',
      network: 'The inquiry was not sent, the connection dropped. Check your connection and send it again. Your details are still in the form.',
      server: 'The inquiry was not sent because of an error on my side. Please try again shortly, or send me an e-mail.',
    },
    noscript: 'The form needs JavaScript. Write to me directly:',
    mail: {
      // To Martin, always in Czech
      owner: {
        subject: 'Inquiry from the website: {service}, {name}',
        intro: 'A new inquiry came from the website. If you reply to this e-mail, the reply goes straight to the client.',
        estimate: 'Estimate',
        source: 'Source',
        locale: 'Website language',
        id: 'Inquiry ID',
        empty: '–',
      },
      // To the client, in the language of the page. Fixed text only, never free text from the form.
      client: {
        subject: 'Your photography inquiry is confirmed',
        greeting: 'Hello,',
        body: 'thank you for your inquiry. I will get back to you with a price and whether I am free on that date.',
        summary: 'What you asked for:',
        estimateNote: 'The estimate is indicative. I will send an exact offer based on the length and type of the event.',
        reply: 'Want to add something? Reply to this e-mail.',
        notYou: 'If you did not send this inquiry, please ignore this e-mail.',
      },
      // To Martin before inquiries are anonymized (maintenance worker)
      preview: {
        subject: 'Inquiries that will be anonymized within {days} days',
        intro: 'These inquiries will be anonymized within {days} days: the name, e-mail, phone, place, time and note will be removed. If any of them became an order, mark it as won (see the README).',
      },
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
