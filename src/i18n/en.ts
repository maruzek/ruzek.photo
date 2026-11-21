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
    eyebrow: 'How it works',
    title: 'Your social media picks *the same* day.',
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
      hoursFromTimes: 'Calculated from the start and end.',
      hoursLess: 'One hour less',
      hoursMore: 'One hour more',
      groups: { contact: 'Contact', event: 'Event', extras: 'Extras and notes' },
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
      hoursFromTimes: 'There are more than 12 hours between the start and end. Describe a longer event in the note.',
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
  privacy: {
    meta: {
      title: 'Privacy policy · Martin Růžek',
      description: 'What personal data I process when you send me an inquiry or browse the website, why, and for how long.',
    },
    title: 'Privacy policy',
    lead: 'What personal data I process when you send me an inquiry or browse the website, why I do it and how long I keep it.',
    reviewTodo: 'text to be reviewed by a data protection expert',
    version: 'Policy version',
    sections: {
      controller: {
        title: 'Who processes your data',
        paragraphs: ['The controller of your personal data is me, {name}, photographer. You can write to me at {email}.'],
        todo: 'company ID (IČO) and registered office of the controller',
      },
      data: {
        title: 'What I store when you send an inquiry',
        paragraphs: ['From the form I store what you fill in:'],
        items: [
          'your name and e-mail,',
          'your phone number, if you give it,',
          'what and when we shoot: type of shoot, length of the event, date, time from–to, place, number of people and the outputs you want,',
          'your note,',
          'the indicative price estimate calculated from the price list.',
        ],
      },
      source: {
        title: 'What else is stored with the inquiry, and your IP address',
        paragraphs: [
          'The inquiry is also stored with the time it arrived, a random inquiry ID, a random submission ID (it lets the database recognise an inquiry your browser sent again after a lost connection, so it is not stored twice), the language of the website, the version of this policy and the state of the inquiry (new, order, no order). It also records when the inquiry e-mail was sent to me, when the confirmation was sent to you and when the inquiry was listed in the monthly overview before anonymization.',
          'For statistics I store where the inquiry came from: the page of this website you sent the form from (for example /en/), the domain of another website you came to that page from, and the campaign tags (UTM) source, medium and campaign name if the link had them. If you reached the page through a link on this website, I do not store the domain.',
          'I use your IP address only to protect the form. I use it to limit the number of inquiries from one network and pass it to Cloudflare Turnstile, which checks that a human is filling in the form. I do not store it in the database.',
        ],
      },
      purpose: {
        title: 'Why I process the data',
        paragraphs: [
          'I need the inquiry to send you an offer and arrange the shoot. The legal basis is steps taken at your request before entering into a contract (Art. 6(1)(b) GDPR). I do not need your consent for this, so there is no checkbox in the form.',
          'The data about where you came from shows me where inquiries come from.',
        ],
        todo: 'legal basis for the statistics of inquiry sources',
      },
      retention: {
        title: 'How long I keep the data',
        paragraphs: [
          'If an inquiry does not become an order, I anonymize it after {months} months from sending, at the latest {graceDays} days after that period. I delete the name, e-mail, phone, place, time, note, submission ID and campaign name. I replace the inquiry ID with a new random one, shorten the event date to month and year and the time it arrived to the first day of the month, and delete when the e-mails were sent and when the inquiry was listed in the overview.',
          'Once a month, before anonymization, I receive an e-mail listing the inquiries that are about to be anonymized: name, date received, type of shoot and inquiry ID. I use it to mark the ones that became an order.',
          'After anonymization only this remains: type of shoot, month of the event, length, number of people, requested deliverables, price estimate, language of the website, policy version, state of the inquiry, month received and the month of anonymization. Also the page of this website the inquiry came from, the domain of the website you came from, and the campaign source and medium, but only when they name a general channel, such as instagram or email. I use this data for statistics.',
          'If an inquiry becomes an order, I keep the data for the duration of our cooperation. I keep invoices and receipts for as long as tax law requires.',
          'A copy of the inquiry with all its details reaches my mailbox by e-mail. Anonymization in the database does not affect it.',
        ],
        todo: 'when to anonymize the data of former clients and how long to keep inquiry e-mails in the mailbox',
      },
      recipients: {
        title: 'Who I share the data with',
        paragraphs: ['I do not sell the data or give it to anyone for marketing. These processors help me:'],
        items: [
          'Cloudflare runs the website and the inquiry database. Its Turnstile service protects the form: it uses signals from your browser and your IP address to check that a human is filling it in. It loads only with the form.',
          'Resend sends the inquiry e-mail to me, the confirmation to you and, once a month, an overview of inquiries before anonymization to me (name, date received, type of shoot and inquiry ID).',
          'The provider of my mailbox, where inquiries arrive.',
          'Umami and Cloudflare Web Analytics measure traffic (see below).',
        ],
        todo: 'full list of processors with their seats and transfers of data outside the EU',
      },
      analytics: {
        title: 'Cookieless traffic measurement',
        paragraphs: [
          'The website sets no cookies and stores nothing in your browser for measurement. That is why there is no cookie banner.',
          'I measure traffic with Umami: how many people visited, where they came from and what they did on the website, such as sending an inquiry or opening a photo. With every page view and such action your browser sends it the page address without parameters and without the part after the # sign. Of the campaign tags it keeps only the source and medium, and only when they name a general channel, such as instagram or email. It never sends the campaign name. It also sends the domain of the website you came from (without the specific page), the page title, the browser language and the screen size, and for an action its name and a detail, such as the language you switched to.',
          'I measure page loading speed with Cloudflare Web Analytics. Besides the loading times, your browser sends it the address of the visited page without parameters and without the part after the # sign, and the address you came to the page from, if the browser knows it.',
          'Neither tool uses cookies, and both load only after the page has loaded. Like every server your browser talks to, they also see your IP address. On the page for an address that does not exist (error 404) no measurement loads at all.',
        ],
      },
      rights: {
        title: 'Your rights',
        paragraphs: [
          'You have the right to know what data I hold about you, to have it corrected or deleted, to restrict its processing, to object and to receive it in a machine-readable form. Just write to {email}.',
          'If you think I handle your data wrongly, you can complain to the Czech Office for Personal Data Protection (uoou.gov.cz).',
        ],
      },
      changes: {
        title: 'Changes to this policy',
        paragraphs: [
          'When I change this policy, the version at the top changes too. With each inquiry I store the version that applied when you sent it.',
        ],
      },
    },
    back: 'Back to the home page',
  },
  notFound: {
    meta: { title: 'Page not found · Martin Růžek', description: 'This page does not exist.' },
    code: '404',
    title: 'This page *does not* exist.',
    text: 'The address may have changed, or the link has a typo. Photos, prices and the inquiry form are on the home page.',
    home: 'Go to the home page',
  },
  caseStudy: {
    eyebrow: 'Case study',
    score: 'Score',
    venue: 'Venue',
    date: 'Date',
    photos: 'Photos from the event',
    back: 'Back to the home page',
    cta: 'Request a similar shoot',
  },
  lightbox: {
    label: 'Photo preview',
    close: 'Close',
    prev: 'Previous photo',
    next: 'Next photo',
    counter: '{n} / {total}',
  },
} as const satisfies Dictionary;
