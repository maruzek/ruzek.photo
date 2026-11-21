// Czech dictionary: the source of truth for the shape of every dictionary (concept.md, kap. 5).
//
// Conventions
// - `*word*` marks a word set in serif italic; render such strings with <Rich>.
// - `{name}` is a placeholder; fill it with `fill()` from './index'.
// - \u00A0 is a non-breaking space (kept after one-letter prepositions, like in the prototype).
// - Strings named `...Todo` hold the text of a visible placeholder. They are stored WITHOUT the
//   "TODO: " prefix: render them through <Todo>, which adds it.
// - Prices, handle, e-mail, phone and legal identifiers are NOT here: they come from
//   `src/config/pricing.ts` (via `formatRange`) and `src/config/site.ts`.
// - Photo captions and alt texts belong to the photo collection (`src/content/photos`).

/** Widens string literals to `string` but keeps object keys and tuple lengths, so `en` must have the same shape. */
type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };

// The prototype shows one card for the short shoot and the portrait; both pricing ids point to it.
const shortAndPortraitCard = {
  title: 'Portrét a\u00A0krátké focení',
  text: 'Portréty pro profil, tým nebo řečníky. Krátké focení na menší akce.',
  priceLabel: 'Portrét / krátké focení',
} as const;

export const cs = {
  meta: {
    title: 'Martin Růžek · fotograf akcí a sportu, Praha a Karlovy Vary',
    description:
      'Martin Růžek fotí firemní akce, konference, plesy, večírky a sport v Praze a Karlových Varech. Výběr fotek na sítě ještě týž den.',
    // Shown on the English page until Martin approves the translation (concept.md, kap. 5).
    translationTodo: 'kontrola překladu',
  },
  common: {
    skip: 'Přeskočit na obsah',
    placeholderPhoto: 'Zástupná fotka',
    cursorView: 'Zobrazit',
  },
  anchors: {
    work: 'prace',
    services: 'sluzby',
    about: 'o-mne',
    inquiry: 'poptavka',
  },
  nav: {
    label: 'Hlavní',
    homeLabel: '{name}, úvod',
    logoLabel: 'Logo {name}',
    work: 'Práce',
    services: 'Služby a ceny',
    about: 'O\u00A0mně',
    inquiry: 'Poptat focení →',
  },
  lang: {
    // Name of the other language, written in that language (the link carries its `lang`).
    other: 'English',
  },
  hero: {
    kicker: 'Fotograf akcí a\u00A0sportu',
    places: 'Praha · Karlovy Vary',
    scrollHint: 'Scroll',
    lead: 'Fotím firemní akce, konference, plesy, večírky i\u00A0zápasy. Výběr fotek na vaše sítě posílám *ještě týž den.*',
    cta: 'Poptat focení',
    ctaWork: 'Prohlédnout práci',
    instagram: 'Instagram {handle}',
    onPhoto: 'Na fotce:',
    onPhotoTodo: 'kdo je na fotce',
  },
  marquee: {
    label: 'Co fotím',
    pause: 'Pozastavit',
    play: 'Spustit',
    items: [
      'Firemní akce',
      'konference',
      'Přednášky a\u00A0debaty',
      'plesy',
      'Večírky a\u00A0bary',
      'univerzity a\u00A0spolky',
      'Fotbal',
      'florbal',
      'Turnaje a\u00A0závody',
      'portréty',
    ],
  },
  folds: {
    events: {
      title: 'Akce, které *chcete* vidět znovu.',
      chips: ['Firemní akce', 'Konference', 'Přednášky a\u00A0debaty', 'Plesy', 'Večírky a\u00A0bary'],
      text: 'Nehledám pózy. Fotím, co se opravdu stalo: řečníka, plný sál, přípitek i\u00A0poslední tanec.',
      index: '01',
      indexLabel: 'Akce',
    },
    sport: {
      title: 'Sport je moje *vášeň.*',
      chips: ['Fotbal', 'Florbal', 'Turnaje', 'Závody'],
      text: 'Na hřišti nedostanete druhou šanci. Tu rychlost pak nosím i\u00A0na akce.',
      index: '02',
      indexLabel: 'Sport',
    },
  },
  work: {
    eyebrow: 'Vybraná práce',
    title: 'Okamžiky z\u00A0akcí, *ne* aranžmá.',
    lead: 'Ukázky z\u00A0akcí a\u00A0sportu. Klikněte na fotku a\u00A0otevře se celá.',
    foot: 'Celé galerie z\u00A0akcí dostávají klienti přes soukromou online galerii. Na webu jsou jen fotky se souhlasem klienta nebo pořadatele.',
    footLink: 'Chci podobné fotky',
  },
  services: {
    eyebrow: 'Služby a ceny',
    title: 'Co fotím a\u00A0*za kolik.*',
    lead: 'Ceny jsou od. Nejsem plátce DPH. Přesnou nabídku pošlu podle délky a\u00A0typu akce.',
    calcLink: 'Spočítat cenu',
    cards: {
      event: {
        title: 'Akce',
        tag: 'hlavní',
        text: 'Firemní akce, konference, přednášky a\u00A0debaty, univerzitní a\u00A0spolkové akce, plesy, večírky a\u00A0bary.',
        priceLabel: 'První hodina',
        priceNote: 'každá další {price}',
      },
      match: {
        title: 'Sport',
        text: 'Fotbal, florbal, turnaje a\u00A0závody. Pro kluby, týmy i\u00A0pořadatele.',
        priceLabel: 'Zápas',
      },
      short: shortAndPortraitCard,
      portrait: shortAndPortraitCard,
    },
    addons: {
      sameDay: { label: 'Výběr na sítě týž den', note: 'Vybrané fotky ještě v\u00A0den akce' },
      video: { label: 'Vertikální videa', note: 'Krátká videa na výšku pro sítě' },
    },
  },
  day: {
    eyebrow: 'Týž den',
    title: 'Od příjezdu *po* vaše sítě.',
    lead: 'Zatímco hosté odcházejí, vybírám fotky. Na sítích jsou dřív, než akce vychladne.',
    steps: [
      {
        no: '01 · Během akce',
        title: 'Fotím, co se děje',
        text: 'Řečníci, hosté, atmosféra, detaily. Na sportu akce a\u00A0emoce.',
      },
      {
        no: '02 · Hned po',
        title: 'Vybírám to nejsilnější',
        text: 'Z\u00A0celého dne připravím výběr na sítě a\u00A0případně vertikální videa.',
      },
      {
        no: '03 · Týž den',
        title: 'Posílám výběr',
        // Followed by <Todo>{galleryTodo}</Todo> and a full stop.
        text: 'Hotové fotky máte ještě ten den. Celou galerii dodám',
      },
    ],
    galleryTodo: 'termín',
  },
  about: {
    eyebrow: 'O\u00A0mně',
    title: 'Jsem Martin. *Fotím* lidi v\u00A0pohybu.',
    leadStrong: 'Jsem fotograf akcí a\u00A0sportu. Fotím v\u00A0Praze a\u00A0působím i\u00A0v\u00A0Karlových Varech.',
    lead: 'Nejčastěji fotím firemní akce, konference, univerzitní a\u00A0spolkové akce, plesy a\u00A0večírky. Sport je moje vášeň, portréty doplněk.',
    speed: 'Moje silná stránka je rychlost. Výběr fotek na sítě posílám ještě týž den a\u00A0točím i\u00A0vertikální videa.',
    storyTodo: 'Martinův vlastní příběh, jak se k focení dostal',
    portraitAlt: 'Zástupný portrét, místo pro Martinovu fotku',
    portraitTodo: 'Martinův portrét',
    facts: {
      where: { label: 'Kde', value: 'Praha, Karlovy Vary' },
      forWhom: { label: 'Pro koho', value: 'Firmy, agentury, univerzity, spolky, kluby' },
      instagram: { label: 'Instagram' },
    },
  },
  inquiry: {
    eyebrow: 'Poptávka',
    title: 'Kdy je *vaše* akce?',
    lead: 'Napište datum, místo a\u00A0typ akce. Odpovím s\u00A0cenou a\u00A0tím, jestli mám volno.',
    estimate: {
      label: 'Orientačně od',
      note: 'Podle vybraných možností. Nejsem plátce DPH.',
    },
    direct: {
      label: 'Radši napřímo',
      phone: 'Telefon a WhatsApp:',
      phoneTodo: 'číslo',
      email: 'E-mail:',
    },
    form: {
      name: {
        label: 'Jméno',
        placeholder: 'Jana Nováková',
        error: 'Napište prosím jméno, ať vím, komu odpovídám.',
      },
      email: {
        label: 'E-mail',
        placeholder: 'jana@firma.cz',
        error: 'E-mail vypadá neúplně. Zkontrolujte zavináč a doménu.',
      },
      type: {
        label: 'Co fotíme',
        options: {
          event: 'Akce',
          match: 'Zápas',
          short: 'Krátké focení',
          portrait: 'Portrét',
        },
      },
      hours: { label: 'Délka akce (hodiny)' },
      optional: '(nepovinné)',
      date: { label: 'Datum' },
      place: { label: 'Místo', placeholder: 'Praha, Karlovy Vary…' },
      note: {
        label: 'Co mám vědět',
        placeholder: 'Program, počet hostů, co je pro vás důležité',
      },
      send: 'Odeslat poptávku',
      sending: 'Odesílám…',
      done: 'Díky! Poptávka je odeslaná. Potvrzení přijde na váš e-mail.',
      reset: 'Napsat další',
    },
    privacy: {
      acknowledge: 'Odesláním berete na vědomí',
      link: 'zásady ochrany osobních údajů',
    },
  },
  footer: {
    lead: 'Máte akci nebo zápas? Napište mi, ať ho máte na fotkách.',
    cta: 'Poptat focení',
    shoot: { label: 'Fotím', value: 'Akce, sport, portréty' },
    where: { label: 'Kde', value: 'Praha · Karlovy Vary' },
    instagram: { label: 'Instagram' },
    contact: { label: 'Kontakt', phoneTodo: 'telefon' },
    legal: {
      copyright: '© {year} {name}',
      ico: 'IČO',
      seat: 'Sídlo',
      vat: 'Nejsem plátce DPH',
      privacy: 'Zásady ochrany osobních údajů',
    },
  },
  lightbox: {
    label: 'Náhled fotky',
    close: 'Zavřít',
    prev: 'Předchozí fotka',
    next: 'Další fotka',
    counter: '{n} / {total}',
  },
} as const;

export type Dictionary = Widen<typeof cs>;
