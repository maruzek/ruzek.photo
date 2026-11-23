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

export const cs = {
  meta: {
    title: 'Fotograf akcí a sportu Praha · Martin Růžek',
    description:
      'Fotograf akcí a sportu v Praze a Karlových Varech: firemní akce, konference, plesy, zápasy. Výběr fotek na sítě ještě ten den. Poptejte focení.',
    // Shown on the English page until Martin approves the translation (concept.md, kap. 5).
    translationTodo: 'kontrola překladu',
  },
  common: {
    skip: 'Přeskočit na obsah',
    placeholderPhoto: 'Zástupná fotka',
    cursorView: 'Zobrazit',
    emailCopied: 'Adresa je zkopírovaná.',
    copyFailed: 'Adresu se nepodařilo zkopírovat.',
    openMail: 'Otevřít v\u00A0poště',
  },
  anchors: {
    work: 'prace',
    services: 'sluzby',
    about: 'o-mne',
    inquiry: 'poptavka',
  },
  nav: {
    label: 'Hlavní navigace',
    homeLabel: '{name}, úvod',
    logoLabel: 'Logo {name}',
    work: 'Práce',
    services: 'Služby a\u00A0ceny',
    about: 'O\u00A0mně',
    inquiry: 'Poptat focení',
  },
  lang: {
    // Name of the other language, written in that language (the link carries its `lang`).
    other: 'English',
  },
  hero: {
    kicker: 'Fotograf akcí a\u00A0sportu',
    lead: 'Fotím firemní akce, konference, plesy a\u00A0sport. Výběr na vaše sítě máte *ještě ten den.*',
    cta: 'Poptat focení',
    ctaWork: 'Prohlédnout práci',
  },
  marquee: {
    label: 'Co fotím',
    pause: 'Pozastavit',
    items: [
      'Firemní akce',
      'konference',
      'Přednášky a\u00A0debaty',
      'plesy',
      'Večírky',
      'univerzitní a\u00A0spolkové akce',
      'Fotbal',
      'florbal',
      'Turnaje a\u00A0závody',
      'portréty',
    ],
  },
  folds: {
    events: {
      title: 'Akce, které chcete vidět znovu.',
      text: 'Nehledám pózy. Fotím, co se opravdu stalo: řečníka, plný sál, přípitek i\u00A0poslední tanec.',
    },
    sport: {
      title: 'Na hřišti se nic neopakuje.',
      text: 'Fotím fotbal, florbal, turnaje a\u00A0závody.',
    },
  },
  work: {
    title: 'Z\u00A0akcí a\u00A0zápasů, naostro.',
    footLink: 'Chci podobné fotky',
    // The category of a photo, shown with its caption in the lightbox (the sheet itself shows only the number)
    categories: { event: 'Akce', sport: 'Sport', portrait: 'Portrét' },
    /** Accessible name of the sheet of all frames, before the enlarged picks */
    sheetLabel: 'Kontaktní arch',
  },
  services: {
    title: 'Co fotím a\u00A0za kolik.',
    lead: 'Ceny jsou orientační („od“), nejsem plátce DPH. Přesnou nabídku dostanete podle délky a\u00A0typu akce.',
    calcLink: 'Spočítat cenu',
    cards: {
      event: {
        title: 'Akce',
        text: 'Firemní akce, konference, přednášky a\u00A0debaty, univerzitní a\u00A0spolkové akce, plesy a\u00A0večírky.',
        priceLabel: 'První hodina',
        priceNote: 'každá další {price}',
      },
      sport: {
        title: 'Sport',
        text: 'Fotbal, florbal, turnaje a\u00A0závody. Pro kluby, týmy i\u00A0pořadatele.',
        priceLabel: 'Zápas',
      },
      portrait: {
        title: 'Portrét',
        text: 'Portréty na profil, pro tým nebo řečníky.',
        priceLabel: 'Portrét',
      },
    },
    // What a shoot delivers, from pricing.ts (numbers come in as `{range}`); joined with ' · '
    deliverables: {
      photos: '{range}\u00A0fotek',
      photosPerHour: '{range}\u00A0fotek za hodinu',
      turnaroundDays: 'dodání za\u00A0{range}\u00A0dnů',
      turnaroundHours: 'dodání do\u00A0{range}\u00A0h',
      durationMin: '{range}\u00A0min',
    },
    addons: {
      sameDay: { label: 'Výběr na sítě ještě ten den', note: 'Expres' },
      video: { label: 'Videa pro sítě', note: '1–3 videa na výšku' },
    },
  },
  day: {
    title: 'Výběr na sítě *ještě ten den*.',
    lead: 'Zatímco hosté odcházejí, vybírám fotky. Na sítích jsou dřív, než akce vychladne.',
    steps: [
      {
        no: '01 · Během akce',
        title: 'Fotím, co se děje',
      },
      {
        no: '02 · Hned po akci',
        title: 'Vybírám to nejsilnější',
        text: 'Z\u00A0celého dne vyberu snímky pro sítě. Na přání přidám videa na výšku.',
      },
      {
        no: '03 · Ještě ten den',
        title: 'Posílám výběr',
        // Followed by <Todo>{galleryTodo}</Todo> and a full stop.
        text: 'Celou galerii dodám',
      },
    ],
    galleryTodo: 'termín',
  },
  about: {
    title: 'Jsem Martin. Fotím *lidi v\u00A0pohybu*.',
    storyTodo: 'Martinův vlastní příběh, jak se k\u00A0focení dostal',
    portraitAlt: 'Zástupný portrét, místo pro Martinovu fotku',
    portraitTodo: 'Martinův portrét',
    facts: {
      forWhom: { label: 'Pro koho', value: 'Firmy, agentury, univerzity, spolky, kluby' },
      instagram: { label: 'Instagram' },
    },
  },
  inquiry: {
    title: 'Kdy je vaše akce?',
    lead: 'Napište datum, místo a\u00A0typ akce. Odpovím s\u00A0cenou a\u00A0potvrdím, jestli mám volno.',
    estimate: {
      label: 'Orientačně od',
      note: 'Podle vybraných možností.',
      individual: 'Cena individuálně',
    },
    direct: {
      label: 'Radši napřímo',
      call: 'Zavolat',
      phoneTodo: 'číslo',
      whatsapp: 'WhatsApp',
      whatsappAction: 'Napsat zprávu',
      email: 'E-mail',
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
        error: 'E-mail vypadá neúplně. Zkontrolujte zavináč a\u00A0doménu.',
      },
      type: {
        label: 'Co fotíme',
        options: {
          event: 'Akce',
          sport: 'Sport',
          portrait: 'Portrét',
          other: 'Jiné',
        },
      },
      hours: { label: 'Délka akce (hodiny)' },
      hoursFromTimes: 'Spočítáno ze začátku a\u00A0konce.',
      hoursLess: 'Ubrat hodinu',
      hoursMore: 'Přidat hodinu',
      groups: { contact: 'Kontakt', event: 'Akce', extras: 'Doplňky a\u00A0poznámka' },
      required: 'Stačí vyplnit jméno a\u00A0e-mail.',
      date: { label: 'Datum' },
      place: { label: 'Místo', placeholder: 'Praha, Karlovy Vary…' },
      note: {
        label: 'Co mám vědět',
        placeholder: 'Program, na čem vám nejvíc záleží',
        otherHelp: 'Můžete stručně popsat, co potřebujete nafotit.',
      },
      send: 'Odeslat poptávku',
      sending: 'Odesílám…',
      done: 'Děkuji, poptávka je odeslaná. Potvrzení vám přijde na e-mail.',
      reset: 'Napsat další poptávku',
    },
    privacy: {
      acknowledge: 'Odesláním berete na vědomí',
      link: 'zásady ochrany osobních údajů',
    },
    // Form island, endpoint and e-mails (tasks 10–12). Keys the prototype did not need.
    fields: {
      phone: { label: 'Telefon' },
      timeFrom: { label: 'Začátek' },
      timeTo: { label: 'Konec' },
      guests: { label: 'Počet lidí' },
      addons: { legend: 'Doplňky' },
      honeypot: { label: 'Toto pole nechte prázdné' },
    },
    errors: {
      service: 'Vyberte, co budeme fotit.',
      hours: 'Napište délku akce v\u00A0celých hodinách, od 1 do 12.',
      hoursFromTimes: 'Mezi začátkem a\u00A0koncem je víc než 12 hodin. Konec nechte prázdný a\u00A0délku akce popište v\u00A0poznámce.',
      date: 'Datum se nepodařilo přečíst. Vyberte ho v\u00A0kalendáři.',
      time: 'Čas se nepodařilo přečíst. Napište ho jako 18:30.',
      guests: 'Počet lidí napište celým číslem.',
      tooLong: 'Text je příliš dlouhý, zkraťte ho prosím.',
      turnstile: 'Nepodařilo se ověřit, že poptávku posílá člověk. Odešlete ji prosím znovu.',
      rateLimit: 'Z\u00A0vaší sítě přišlo za krátkou dobu více poptávek. Zkuste to prosím za pár minut.',
      network: 'Poptávka neodešla, spojení se přerušilo. Zkuste ji odeslat znovu, vyplněné údaje zůstaly ve formuláři.',
      server: 'Poptávka neodešla kvůli chybě na mé straně. Zkuste to prosím za chvíli, nebo mi napište e-mail.',
    },
    noscript: 'Formulář potřebuje zapnutý JavaScript. Napište mi napřímo:',
    mail: {
      // To Martin, always in Czech
      owner: {
        subject: 'Poptávka z\u00A0webu: {service}, {name}',
        intro: 'Z\u00A0webu přišla nová poptávka. Odpověď na tento e-mail půjde rovnou klientovi.',
        estimate: 'Orientační odhad',
        source: 'Zdroj',
        locale: 'Jazyk webu',
        id: 'ID poptávky',
        empty: '–',
      },
      // To the client, in the language of the page. Fixed text only, never free text from the form.
      client: {
        subject: 'Potvrzení vaší poptávky na focení',
        greeting: 'Dobrý den,',
        body: 'děkuji za poptávku. Ozvu se vám s\u00A0cenou a\u00A0potvrdím, jestli mám v\u00A0termínu volno.',
        summary: 'Shrnutí poptávky:',
        estimateNote: 'Odhad je orientační. Přesnou nabídku pošlu podle délky a\u00A0typu akce.',
        reply: 'Chcete něco doplnit? Odpovězte na tento e-mail.',
        notYou: 'Pokud jste poptávku neposílali vy, e-mail prosím ignorujte.',
        closing: 'S\u00A0pozdravem',
      },
      // To Martin before inquiries are anonymized (maintenance worker)
      preview: {
        subject: 'Poptávky, které se do {days} dní anonymizují',
        intro: 'Tyto poptávky se do {days} dní anonymizují: zmizí jméno, e-mail, telefon, místo, čas a\u00A0poznámka. Pokud se z\u00A0některé stala zakázka, označte ji jako won (návod je v\u00A0README).',
      },
    },
  },
  footer: {
    lead: 'Máte akci nebo zápas? Napište mi, co chcete nafotit.',
    cta: 'Poptat focení',
    shoot: { label: 'Fotím', value: 'Akce, sport, portréty' },
    where: { label: 'Kde', value: 'Praha a\u00A0Karlovy Vary' },
    instagram: { label: 'Instagram' },
    contact: { label: 'Kontakt', phoneTodo: 'telefon' },
    legal: {
      copyright: '© {year} {name}',
      ico: 'IČO',
      seat: 'Sídlo',
      privacy: 'Zásady ochrany osobních údajů',
    },
  },
  // Privacy page (task 13). Placeholders: {name}, {email}, {months}, {graceDays}. Facts follow what the code
  // stores and sends (db/migrations, src/server/inquiry, workers/maintenance); a lawyer still reviews the text.
  privacy: {
    meta: {
      title: 'Zásady ochrany osobních údajů · Martin Růžek',
      description: 'Jaké osobní údaje zpracovávám, když mi pošlete poptávku nebo si prohlížíte web, proč a jak dlouho.',
    },
    title: 'Zásady ochrany osobních údajů',
    lead: 'Jaké osobní údaje zpracovávám, když mi pošlete poptávku nebo si prohlížíte web, proč to dělám a jak dlouho je mám.',
    reviewTodo: 'text zkontroluje odborník na ochranu osobních údajů',
    version: 'Verze zásad',
    sections: {
      controller: {
        title: 'Kdo vaše údaje zpracovává',
        paragraphs: ['Správcem osobních údajů jsem já, {name}, fotograf. Napsat mi můžete na {email}.'],
        todo: 'IČO a sídlo správce',
      },
      data: {
        title: 'Co ukládám, když pošlete poptávku',
        paragraphs: ['Z formuláře uložím to, co vyplníte:'],
        items: [
          'jméno a e-mail,',
          'telefon, pokud ho uvedete,',
          'co a kdy fotíme: typ focení, délku akce, datum, čas od–do, místo, počet lidí a požadované výstupy,',
          'vaši poznámku,',
          'orientační odhad ceny spočítaný z ceníku.',
        ],
      },
      source: {
        title: 'Co se k poptávce uloží navíc a vaše IP adresa',
        paragraphs: [
          'K poptávce se uloží také čas přijetí, náhodné ID poptávky, náhodné ID odeslání (podle něj databáze pozná poptávku, kterou prohlížeč po výpadku spojení odeslal znovu, a neuloží ji dvakrát), jazyk webu, verze těchto zásad a stav poptávky (nová, zakázka, bez zakázky). Uloží se i to, kdy odešel e-mail s poptávkou mně, kdy potvrzení vám a kdy byla poptávka v měsíčním přehledu před anonymizací.',
          'Kvůli statistice si uložím, odkud poptávka přišla: stránku tohoto webu, ze které jste formulář odeslali (třeba /en/), doménu jiného webu, ze kterého jste na ni přišli, a značky kampaně (UTM) zdroj, médium a název kampaně, pokud je odkaz měl. Když jste na stránku přišli odkazem z tohoto webu, doménu neukládám.',
          'Vaši IP adresu použiji jen k ochraně formuláře. Podle ní omezím počet poptávek z jedné sítě a předám ji službě Cloudflare Turnstile, která ověřuje, že formulář vyplňuje člověk. Do databáze ji neukládám.',
        ],
      },
      purpose: {
        title: 'Proč údaje zpracovávám',
        paragraphs: [
          'Poptávku potřebuji, abych vám mohl poslat nabídku a domluvit focení. Právním základem je jednání o smlouvě na vaši žádost (čl. 6 odst. 1 písm. b) GDPR). Souhlas k tomu nepotřebuji, proto ve formuláři není zaškrtávátko.',
          'Údaje o tom, odkud jste přišli, mi ukazují, odkud poptávky přicházejí.',
        ],
        todo: 'právní základ pro statistiku zdrojů poptávek',
      },
      retention: {
        title: 'Jak dlouho údaje uchovávám',
        paragraphs: [
          'Když z poptávky nebude zakázka, poptávku anonymizuji po {months} měsících od odeslání, nejpozději {graceDays} dní po této lhůtě. Smažu jméno, e-mail, telefon, místo, čas, poznámku, ID odeslání a název kampaně. ID poptávky nahradím novým náhodným, datum akce zkrátím na měsíc a rok, čas přijetí na první den měsíce a smažu, kdy odešly e-maily a kdy byla poptávka v přehledu.',
          'Jednou měsíčně mi před anonymizací přijde e-mail s poptávkami, na které brzy dojde: jméno, datum přijetí, typ focení a ID poptávky. Podle něj označím ty, ze kterých byla zakázka.',
          'Po anonymizaci zůstane jen typ focení, měsíc akce, délka, počet lidí, požadované výstupy, odhad ceny, jazyk webu, verze zásad, stav poptávky, měsíc přijetí a měsíc anonymizace. Dál stránka webu, ze které poptávka přišla, doména webu, ze kterého jste přišli, a zdroj a médium kampaně, ale jen když jde o obecný kanál, třeba instagram nebo email. Tyto údaje mi slouží ke statistice.',
          'Když z poptávky bude zakázka, údaje si nechám po dobu spolupráce. Doklady uchovávám tak dlouho, jak ukládají daňové předpisy.',
          'Kopie poptávky se všemi údaji mi přijde e-mailem do schránky. Anonymizace v databázi se jí netýká.',
        ],
        todo: 'kdy anonymizovat údaje bývalých klientů a jak dlouho držet e-maily s poptávkou ve schránce',
      },
      recipients: {
        title: 'Komu údaje předávám',
        paragraphs: ['Údaje neprodávám a nikomu je nedávám k marketingu. Pomáhají mi tito zpracovatelé:'],
        items: [
          'Cloudflare provozuje web a databázi poptávek. Jeho služba Turnstile chrání formulář: podle signálů z prohlížeče a vaší IP adresy ověří, že ho vyplňuje člověk. Načte se jen u formuláře.',
          'Resend odesílá e-mail s poptávkou mně, potvrzení vám a jednou měsíčně mně přehled poptávek před anonymizací (jméno, datum přijetí, typ focení a ID poptávky).',
          'Poskytovatel mé e-mailové schránky, kam poptávky chodí.',
          'Umami a Cloudflare Web Analytics měří návštěvnost (viz níže).',
        ],
        todo: 'úplný seznam zpracovatelů s jejich sídly a předávání údajů mimo EU',
      },
      analytics: {
        title: 'Měření návštěvnosti bez cookies',
        paragraphs: [
          'Web nenastavuje cookies a kvůli měření nic neukládá do vašeho prohlížeče. Proto tu není cookie lišta.',
          'Návštěvnost měřím nástrojem Umami: kolik lidí web navštívilo, odkud přišli a co na webu udělali, třeba odeslali poptávku nebo otevřeli fotku. Při každém zobrazení stránky a u takové akce mu prohlížeč pošle adresu stránky bez parametrů a bez části za znakem #. Ze značek kampaně ponechá jen zdroj a médium, a to jen když jde o obecný kanál, třeba instagram nebo email. Název kampaně neposílá. Dál pošle doménu webu, ze kterého jste přišli (bez konkrétní stránky), název stránky, jazyk prohlížeče a velikost obrazovky, u akce i její název a upřesnění, třeba na jaký jazyk jste přepnuli.',
          'Rychlost načítání stránek měřím přes Cloudflare Web Analytics. Kromě časů načítání mu prohlížeč pošle adresu navštívené stránky bez parametrů a bez části za znakem # a adresu, ze které jste na stránku přišli, pokud ji prohlížeč zná.',
          'Ani jeden nástroj nepoužívá cookies a oba se načtou až po načtení stránky. Jako každý server, se kterým prohlížeč komunikuje, vidí i vaši IP adresu. Na stránce pro neexistující adresu (chyba 404) se měření nenačte vůbec.',
        ],
      },
      rights: {
        title: 'Vaše práva',
        paragraphs: [
          'Máte právo vědět, jaké údaje o vás mám, nechat je opravit nebo smazat, omezit jejich zpracování, vznést námitku a dostat je ve strojově čitelné podobě. Stačí napsat na {email}.',
          'Když si myslíte, že s vašimi údaji nakládám špatně, můžete si stěžovat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).',
        ],
      },
      changes: {
        title: 'Změny zásad',
        paragraphs: [
          'Když zásady změním, změní se i verze nahoře. K poptávce si ukládám verzi, která platila, když jste ji odeslali.',
        ],
      },
    },
    back: 'Zpět na úvod',
  },
  notFound: {
    meta: { title: 'Stránka nenalezena · Martin Růžek', description: 'Stránka neexistuje.' },
    code: '404',
    title: 'Stránka *neexistuje.*',
    text: 'Možná se změnila adresa, nebo je v odkazu překlep. Fotky, ceny i poptávku najdete na úvodní stránce.',
    home: 'Na úvodní stránku',
  },
  // Case study template (task 13). Pages exist only for entries with `draft: false`.
  caseStudy: {
    eyebrow: 'Případová studie',
    score: 'Skóre',
    venue: 'Místo',
    date: 'Datum',
    photos: 'Fotky z akce',
    back: 'Zpět na úvod',
    cta: 'Poptat podobné focení',
  },
  lightbox: {
    label: 'Náhled fotky',
    close: 'Zavřít',
    prev: 'Předchozí fotka',
    next: 'Další fotka',
    counter: '{n} / {total}',
    loading: 'Načítám fotku…',
    unavailable: 'Fotku se nepodařilo načíst.',
  },
} as const;

export type Dictionary = Widen<typeof cs>;
