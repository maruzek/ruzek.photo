# Koncept: směr Rozpad jako web v Astru na Cloudflare

Stav: **návrh ke schválení** (2026-11-20, upraveno 2026-11-21 podle Martinových rozhodnutí o e-mailu, uchování poptávek a měření). Dokud ho Martin neschválí, nepíše se žádný kód aplikace.

Zdroje: [AGENTS.md](../AGENTS.md), [brief.md](brief.md), [decisions.md](decisions.md), [design/final/rozpad/HANDOFF.md](../design/final/rozpad/HANDOFF.md) a prototyp v [design/final/rozpad/](../design/final/rozpad/). Plán po krocích je v [docs/superpowers/plans/2026-11-20-rozpad-astro.md](superpowers/plans/2026-11-20-rozpad-astro.md).

## 1. Co spouštíme (v1)

**Součástí v1:**
- jednostránkový web v pořadí z prototypu, CZ na `/` a EN na `/en/`;
- stránka zásad ochrany osobních údajů (CZ a EN), stránka 404;
- poptávkový formulář s orientačním odhadem ceny, Turnstile, D1 a e-maily;
- model případových studií: kolekce a šablona stránky existují, ale dokud nemají obsah, nejsou v navigaci ani v sitemapě;
- SEO: meta, Open Graph, JSON-LD, sitemap, robots, `hreflang`;
- měření bez cookies a bez cookie lišty: **Umami** (události, zdroje poptávek) a **Cloudflare Web Analytics** (rychlost u skutečných návštěvníků); Google Search Console.

**Až po v1** (samostatné rozhodnutí):
- vertikální videa (R2, nebo Stream, viz [otázky](#17-otevřené-otázky-pro-martina));
- načítací obrazovka a animace loga. Obojí podle AGENTS.md navrhne Martin, agent se na ně zeptá, až na ně dojde řeč. Layout pro ně jen nechá místo;
- „ze zákulisí“ a technická data fotek;
- přetvořená mřížka kontaktního archu (v prototypu Rozpad není, otázka zůstává otevřená).

## 2. Principy

1. **Nejdřív statická stránka, pohyb navrch.** Každá sekce je hotová a čitelná jako čisté HTML a CSS. GSAP, Lenis a canvasy ji jen rozhýbou. Když JS spadne, nenačte se nebo je zapnutý `prefers-reduced-motion`, nic nechybí.
2. **Server jen tam, kde musí být.** Všechny stránky se generují při buildu. Jediný kód na serveru je endpoint poptávky (`/api/inquiry`) a malý worker na úklid databáze.
3. **Jeden zdroj pravdy.** Ceny jsou v jednom typovaném configu, texty ve slovnících CZ/EN, fotky v content collection i se záznamem o souhlasu.
4. **Prototyp je reference, ne kód.** Vzhled, rozměry a choreografii převezmeme věrně. Kód se napíše znovu v TypeScriptu, rozdělený do malých modulů.

## 3. Architektura

```
            build (pnpm build)                         Cloudflare
 ┌───────────────────────────────────┐    ┌──────────────────────────────────────┐
 │ Astro (static)                    │    │ Worker "ruzek-web"                   │
 │  ├─ stránky CZ/EN → HTML          │──▶ │  ├─ static assets (HTML/CSS/JS/img)  │
 │  ├─ astro:assets → AVIF/WebP/JPEG │    │  │   servírováno bez spuštění kódu   │
 │  ├─ GSAP, Lenis z pnpm → bundle   │    │  └─ /api/inquiry (prerender=false)   │
 │  └─ React island: InquiryForm     │    │       ├─ Turnstile siteverify        │
 └───────────────────────────────────┘    │       ├─ D1: insert                  │
                                          │       └─ e-mail Martinovi + klientovi│
                                          │ Worker "ruzek-maintenance" (cron)    │
                                          │  ├─ anonymizace po době uchování     │
                                          │  └─ dodatečné odeslání e-mailů       │
                                          └──────────────────────────────────────┘
```

- **Hosting:** Cloudflare Workers se statickými assety a adaptérem `@astrojs/cloudflare`. Stránky mají `output: 'static'`, jen endpoint poptávky má `export const prerender = false`. Statické soubory obsluhuje přímo síť Cloudflare a Worker se spustí jen pro `/api/*`. To je rychlé i levné.
- **Měření:** skript Umami (cloud, později Martinův vlastní server) a beacon Cloudflare Web Analytics. Oba se načtou až po události `load`.
- **Údržba databáze** běží jako samostatný malý Worker s cron triggerem ve stejném repu (`workers/maintenance/`), napojený na stejnou D1. Nezávisí tak na tom, jestli adaptér Astra umí `scheduled` handler.
- **Verze:** nejnovější stabilní Astro a adaptér. Konkrétní verze se zamknou v prvním kroku plánu (`pnpm-lock.yaml`). Všechny závislosti jsou z pnpm, žádné CDN.

## 4. Struktura repozitáře

```
astro.config.ts
wrangler.jsonc                     web worker, D1 binding, assets
tsconfig.json                      extends astro/tsconfigs/strictest
db/migrations/0001_inquiries.sql
workers/maintenance/               cron worker (vlastní wrangler.jsonc)
scripts/
  photos-import.ts                 import fotek: odstraní EXIF/GPS, zmenší originál
  check-exif.ts                    selže, pokud fotka v repu nebo v dist/ obsahuje GPS
  check-contrast.ts                odhad kontrastu textu přes fotky (riziko R3)
  check-launch.ts                  před spuštěním: zástupné fotky, zbylá TODO
src/
  config/
    pricing.ts                     ceník, jediný zdroj pravdy
    site.ts                        jméno, domény, kontakty, sociální sítě
    analytics.ts                   adresa a ID Umami, token Cloudflare Web Analytics
    privacy.ts                     lhůta anonymizace (365 dní), verze zásad
  i18n/
    cs.ts  en.ts  index.ts         slovníky a pomocné funkce pro jazyk a cesty
  content.config.ts                kolekce photos, caseStudies
  content/photos/*.yaml            metadata fotek (alt CZ/EN, popisek, souhlas)
  content/case-studies/*.md
  assets/photos/*.jpg              zdrojové fotky (bez EXIF, max. 3000 px)
  assets/logo/                     logo SVG
  styles/  tokens.css base.css sections/*.css
  layouts/Base.astro
  components/                      viz kap. 6
  islands/InquiryForm.tsx          jediný React island
  scripts/                         klientský TS bez frameworku
    motion/  boot.ts start.ts lenis.ts choreo.ts
    effects/ bayer.ts scheduler.ts ascii.ts dither.ts wipe.ts
    lightbox.ts  cursor.ts
  lib/
    pricing/estimate.ts format.ts
    inquiry/schema.ts              zod schéma, sdílené klientem i serverem
    photos/schema.ts
    seo/jsonld.ts
  server/inquiry/                  handler, turnstile, db, mailer
  pages/
    index.astro                    CZ
    zasady-ochrany-osobnich-udaju.astro
    pripadove-studie/[slug].astro
    en/index.astro  en/privacy.astro  en/case-studies/[slug].astro
    404.astro
    api/inquiry.ts
tests/
  unit/  e2e/
```

## 5. Stránky, jazyky a cesty

- Vestavěné i18n routování Astra: `defaultLocale: 'cs'`, `locales: ['cs', 'en']`, `prefixDefaultLocale: false`. Čeština je na `/`, angličtina na `/en/`.
- **Texty** jsou ve slovnících `src/i18n/cs.ts` a `en.ts`. Typ slovníku se odvozuje z češtiny a angličtina ho musí splnit (`satisfies Dictionary`). Chybějící překlad tak shodí typovou kontrolu, ne až produkci.
- Zvýrazněné slovo v serifové kurzívě je ve slovníku označené (`'Akce, které *chcete* vidět znovu.'`). Malá komponenta `<Rich>` ho převede na `<em class="s">`. V angličtině si překlad zvolí vlastní zvýrazněné slovo.
- **Anglické texty:** HANDOFF je vede jako TODO. Návrh: agent přeloží češtinu věrně a bez nových tvrzení, každou větu označí ke kontrole a Martin je schválí. Do schválení zůstane u EN verze viditelné `TODO: kontrola překladu`.
- Přepínač jazyka v hlavičce vede na stejnou stránku v druhém jazyce. Každá stránka má `canonical`, `hreflang="cs"`, `hreflang="en"` a `x-default` (→ CZ).
- Kotvy sekcí jsou v každém jazyce zvlášť (`#prace` / `#work`) a berou se ze slovníku.

## 6. Komponenty

Každá sekce prototypu je jedna komponenta `.astro`. Kromě formuláře není nikde React. Klientský kód je v `src/scripts/` a komponenty ho připojí přes `data-*` atributy, stejně jako v prototypu.

| Sekce (HANDOFF) | Komponenta | Klientský kód | Poznámka |
|---|---|---|---|
| 1. Header | `Header.astro`, `Logo.astro` | `choreo.ts` (schování při scrollu) | Logo jako inline SVG generované z `design/logo/logo-tiles.json` při buildu. Přepínač jazyka |
| 2. Hero | `Hero.astro`, `AsciiHero.astro` | `effects/ascii.ts`, SplitText | Fotka přes `<Picture>` s `fetchpriority="high"`. Viz rizika R1 a R4 |
| 3. Pás typů akcí | `Marquee.astro` | `choreo.ts` | Tlačítko **Pozastavit** (WCAG 2.2.2). Druhá kopie má `aria-hidden` |
| 4. Akce, Sport | `PhotoFold.astro` + `DitherImage.astro` | `effects/dither.ts`, scrub | Props: fotka, titulek, čipy, index, `shade` |
| 5. Přechody | `DitherWipe.astro` | `effects/wipe.ts` | Props `from`, `to`. Bez JS jen pevný předěl |
| 6. Vybraná práce | `WorkGrid.astro`, `Shot.astro`, `Lightbox.astro` | `lightbox.ts`, `cursor.ts`, parallax | Rozložení `w1`–`w8` jako v prototypu, fotky z kolekce |
| 7. Služby a ceny | `Services.astro`, `ServiceCard.astro`, `Addon.astro` | `dither.ts` (režim hover) | Všechna čísla z `pricing.ts`. Odkaz „Spočítat cenu“ předvyplní formulář |
| 8. Týž den | `SameDay.astro` | `choreo.ts` (pin jen na desktopu) | Na mobilu bez pinu |
| 9. O mně | `About.astro` | `dither.ts`, SplitText | Text jen z `brief.md`, příběh je `TODO` |
| 10. Poptávka | `Inquiry.astro` + `islands/InquiryForm.tsx` | React, `client:visible` | Kap. 11 |
| 11. Patička | `Footer.astro` | SplitText | E-mail `foto@martinruzek.cz`, IČO a sídlo jako `TODO` ze `site.ts` |
| sdílené | `Todo.astro`, `PlaceholderTag.astro`, `Rich.astro`, `Button.astro`, `SeoHead.astro`, `JsonLd.astro` | — | `Todo` vykreslí viditelné `TODO: …` |

**Design tokeny** z prototypu (`:root` v `index.html`) se přenesou beze změny do `src/styles/tokens.css`. Styly sekcí jsou v obyčejném CSS po souborech (`styles/sections/*.css`), bez Tailwindu a bez CSS-in-JS. Pravidlo „Stack Sans Notch jen od 64 px“ hlídá to, že písmo `--f-name` používají jen třídy `.name`, `.big` a `.idx b`, jejichž `clamp()` nikdy neklesne pod 64 px. Ověří to test v kap. 13.

## 7. Pohyb: GSAP a Lenis z pnpm

**Závislosti:** `gsap` (od 3.13 jsou ScrollTrigger, SplitText i ostatní pluginy zdarma) a `lenis`. Obojí jde do bundlu přes Vite, CSS Lenisu se importuje z balíčku.

**Spouštění ve třech vrstvách:**
1. **Inline skript v `<head>`** (pár řádků) nastaví na `<html>` třídu `motion`, nebo `rm` podle `prefers-reduced-motion`. CSS pak ví, jestli smí prvky schovat před animací. Pojistka: když se do 3 s neobjeví třída `motion-ready`, CSS animace vše odkryje. Stránka tedy nikdy nezůstane prázdná.
2. **`scripts/motion/boot.ts`** se načte jako modul. Při `reduce` nebo `Save-Data` skončí a GSAP ani Lenis se **vůbec nestáhnou** (dynamický `import()`).
3. **`scripts/motion/start.ts`** zaregistruje pluginy, spustí Lenis napojený na `gsap.ticker` a choreografii v `gsap.matchMedia()`. Když uživatel přepne `reduce` za běhu, `matchMedia` animace vrátí a Lenis se zničí.

**Sdílený plánovač snímků** (`effects/scheduler.ts`): prototyp má tři vlastní smyčky `requestAnimationFrame`, které běží pořád a v každém snímku volají `getBoundingClientRect`. V Astru poběží jediná smyčka na `gsap.ticker` (bez GSAP na `requestAnimationFrame`). Efekt se do ní přihlásí, jen když je ve viewportu (IntersectionObserver), a průběh dostane z ScrollTriggeru, ne z měření layoutu. Když není nic vidět, smyčka stojí.

**Tabulka chování:**

| Prvek | Plný pohyb | `prefers-reduced-motion` | Bez JS |
|---|---|---|---|
| ASCII úvod | rozpuštění, lupa, návrat při odjezdu | canvas skrytý, fotka | fotka |
| Dithering fotek | skládání a rozpad scrollem | celé statické fotky | celé fotky |
| Přechody tma/světlo | vzor posouvaný scrollem | statický vzor (q = 0,55) | pevný předěl |
| Titulky, jméno | SplitText v masce | hned viditelné | viditelné |
| Fotografické sekce | scrub 1,16 → 1 | statické | statické |
| Pás typů akcí | smyčka podle rychlosti scrollu, pauza | stojí | stojí |
| Týž den | pin a linka průběhu (desktop) | všechny kroky aktivní | všechny kroky aktivní |
| Lenis | zapnutý (dotyk nativně) | vypnutý | — |
| Magnetická tlačítka, kurzor | jen `pointer: fine` | ne | ne |
| Lightbox | `<dialog>` | `<dialog>` | odkaz na plnou fotku |

## 8. Písma (self-hosted)

- Všechna čtyři písma mají licenci **SIL OFL 1.1**: Stack Sans Notch, Stack Sans Text, Instrument Serif i Geist Mono. Šířit je i commitovat smíme, licence se přiloží. Před commitem se to přesto ověří v souboru licence každého balíčku (AGENTS.md).
- Zdroj: balíčky `@fontsource/*` z pnpm. Pokud zamčená verze Astra má stabilní Fonts API s providerem Fontsource, použijeme ho, protože sám vygeneruje `preload` a záložní metriky. Jinak Fontsource, ruční `preload` a `@font-face` s `size-adjust` pro záložní písmo.
- Jen řezy, které design používá: Notch 700, Text 400/500/600, Instrument Serif Italic 400, Geist Mono 400/500. Sady `latin` a `latin-ext` (čeština), formát WOFF2.
- `preload` jen pro dvě písma nad ohybem: Notch 700 (jméno) a Text 400. Ostatní `font-display: swap`.
- Žádný požadavek na `fonts.googleapis.com` ani `gstatic.com`. Hlídá to e2e test.

## 9. Fotky

### Zdroj a zpracování
- **Fotky webu jsou v repozitáři** (`src/assets/photos/`) a zpracuje je `astro:assets` při buildu. R2 až pro videa. Tím je otevřená otázka „repo, nebo R2“ pro fotky uzavřená návrhem, Martin to potvrdí.
- Komponenta `<Picture>` vygeneruje AVIF, WebP a JPEG v šířkách `[480, 768, 1080, 1440, 1920, 2560]` se `sizes` podle sekce, s `width`/`height` (žádné CLS) a `loading="lazy"` všude kromě hero fotky.
- Lightbox dostane větší variantu (2000 px) z `getImage()` v atributu `data-full`. Načte se až po otevření.

### EXIF a GPS: dvojitá pojistka
Repozitář je **veřejný**. Nestačí tedy odstranit EXIF při buildu, protože zdrojová fotka by GPS prozradila přímo na GitHubu.
1. `pnpm photos:import <soubory>` fotku zmenší na max. 3000 px, odstraní všechna metadata a uloží ji do `src/assets/photos/`. Zároveň připraví YAML s metadaty, kde zůstanou `TODO` pro alt texty a souhlas.
2. `pnpm check:exif` projde `src/assets/` i `dist/` a selže, pokud najde GPS (nebo jakékoli EXIF v `dist/`). Spouští se v `pnpm check` i v CI. `astro:assets` (sharp) metadata ve výstupu standardně zahazuje, test to potvrdí.

### Souhlasy a rychlé stažení
Každá fotka má v `src/content/photos/<id>.yaml` záznam ověřovaný schématem:

```yaml
image: ../../assets/photos/2026-10-ples-01.jpg
alt: { cs: "Pár tančí na plese pod lustrem", en: "A couple dancing at a ball under a chandelier" }
caption: { cs: "Ples", en: "Ball" }
category: event
published: true
consentRef: C-2026-014        # odkaz na záznam v private/, ne jméno klienta
minors: false
shade: normal                 # normal | strong (ztmavení pod textem)
```

- Build **selže**, pokud je publikovaná skutečná fotka bez `consentRef`, nebo fotka s dětmi (`minors: true`) bez `parentalConsent: true`.
- `consentRef` je jen identifikátor. Kdo a kdy souhlas dal, je v `private/` (gitignore), protože jméno klienta do veřejného repa nepatří.
- **Stažení fotky** = `published: false` (nebo smazání YAML a souboru) a nové nasazení. Postup bude v README.
- **Zástupné fotky** (CC0 z prototypu) mají `placeholder: true` a kredit. Vykreslí štítek „Zástupná fotka“. `pnpm check:launch` selže, pokud nějaká zůstane publikovaná v produkčním buildu.

## 10. Ceník jako typovaný config

`src/config/pricing.ts` je **jediný zdroj** pro kartu služeb, příplatky, kalkulačku ve formuláři, JSON-LD (`Offer`) i odhad uložený s poptávkou na serveru. Čísla jsou přesně z [brief.md](brief.md).

```ts
export type Czk = number; // celé koruny, bez DPH (neplátce)
export interface Range { from: Czk; to: Czk } // from === to → pevná cena

export type ServicePricing =
  | { kind: 'hourly'; firstHour: Czk; nextHour: Range; minHours: 1; maxHours: number }
  | { kind: 'flat'; price: Range; unit: 'session' | 'match' };

export interface Service {
  id: 'event' | 'short' | 'match' | 'portrait';
  pricing: ServicePricing;
  deliverables: { photos: Range; perHour?: true; turnaround: { value: Range; unit: 'days' | 'hours' }; durationMin?: Range };
}

export type Addon =
  | { id: 'sameDay'; kind: 'percent'; value: Range }   // +20–30 %
  | { id: 'video'; kind: 'fixed'; value: Range };      // +1 000–2 000 Kč
```

- Typy jsou připravené i na **balíčky** (otázka „hodinové ceny, nebo balíčky“ je otevřená). Balíček by byl další varianta `ServicePricing`, kterou kalkulačka a JSON-LD obslouží bez přepisu stránek.
- `estimate()` v `lib/pricing/estimate.ts` je čistá funkce pokrytá testy. Počítá jako prototyp: hodinová cena, potom procentní příplatek, potom pevné příplatky. Výsledek je vždy rozsah.
- Formátování čísel přes `Intl.NumberFormat('cs-CZ')` s nezlomitelnými mezerami, v angličtině `CZK 1,500`.
- Doprava (Praha zdarma, jinde 5–6 Kč/km), záloha 30–50 % a opakovaná spolupráce jsou v configu jako informace pro text. Kalkulačka je v1 nepočítá.

## 11. Poptávka: React island, D1, Turnstile, e-mail

### Formulář (klient)
- `islands/InquiryForm.tsx`, hydratace `client:visible`. Astro ho vykreslí i na serveru, takže pole jsou v HTML hned a nic neposkočí.
- Pole podle briefu: typ akce, délka (jen u akce), datum, čas od–do, místo, počet lidí, požadované výstupy (příplatky jako zaškrtávátka), poznámka, jméno, e-mail, telefon (nepovinný), skryté pole proti robotům.
- **Žádné zaškrtávátko souhlasu** (rozhodnutí 2026-11-21). Poptávku zpracováváme kvůli jednání před uzavřením smlouvy, souhlas k tomu není potřeba. Nad tlačítkem je věta „Odesláním berete na vědomí [zásady ochrany osobních údajů](…).“ a s poptávkou se uloží verze zásad, které platily.
- **Zdroj poptávky:** formulář při odeslání přidá `document.referrer`, vstupní cestu a parametry UTM z adresy. Nic se kvůli tomu neukládá do prohlížeče. Slouží to pro statistiku a později i pro vyhodnocení reklam.
- Odhad ceny vedle formuláře počítá `estimate()` ze stejného configu. Odkazy „Spočítat cenu“ u služeb předvyplní typ (`#poptavka?sluzba=match`).
- Validace sdíleným schématem `lib/inquiry/schema.ts` (zod z `astro/zod`) při opuštění pole a při odeslání. Chyby jsou u pole, napojené přes `aria-describedby`, a po odeslání se fokus přesune na první chybu.
- **Turnstile** se načte, až když je formulář blízko viewportu nebo uživatel začne psát. Neblokuje tak načtení stránky.
- Bez JS formulář nejde odeslat (Turnstile JS potřebuje). `<noscript>` proto nabídne telefon, WhatsApp a e-mail. Ty jsou vedle formuláře vidět vždy.

### Endpoint `/api/inquiry` (server)
Logika je v `server/inquiry/handler.ts` a závislosti dostává zvenku (DB, ověření Turnstile, mailer, čas, rate limit). Dá se tak testovat bez sítě. Astro route ji jen propojí s bindingy Cloudflare.

1. Jen `POST` s JSON a stejným `Origin`. Rate limit podle IP přes binding Workers Rate Limiting. IP se nikam neukládá.
2. Ověření Turnstile tokenu (`siteverify`, IP z `CF-Connecting-IP`).
3. Validace stejným zod schématem. Vyplněné skryté pole → odpověď 200 bez uložení.
4. Odhad ceny se přepočítá na serveru (klientovi se nevěří).
5. Zápis do D1. Ukládá se jen to, co je ve formuláři, zdroj poptávky a verze zásad ochrany osobních údajů.
6. E-maily přes `ctx.waitUntil`: na `foto@martinruzek.cz` celá poptávka s `Reply-To` na klienta (Martin odpovídá rovnou ze své adresy), klientovi z `noreply@martinruzek.eu` krátké potvrzení s `Reply-To: foto@martinruzek.cz` a **bez** volného textu z formuláře, aby se formulář nedal zneužít k rozesílání spamu. Když e-mail selže, poptávka zůstane uložená s `notified_at = NULL` a údržbový worker ji pošle znovu.
7. Odpověď `{ ok: true }`, nebo `{ ok: false, errors }` se stavovým kódem 400, 403 nebo 429.

### Databáze
`db/migrations/0001_inquiries.sql`: tabulka `inquiries` s poli formuláře, `created_at`, `estimate_from/to`, `notice_version`, zdrojem (`referrer`, `landing_path`, `utm_*`), stavem (`status`: `new` / `won` / `lost`), `notified_at`, `confirmed_at`, `anonymized_at` a indexem na `created_at`. Osobní sloupce jsou `NULL`-ovatelné kvůli anonymizaci. Migrace přes `wrangler d1 migrations`. Stav zatím Martin mění ručně (`wrangler d1 execute`). Později ho převezme jeho vlastní aplikace.

### Doba uchování (GDPR): anonymizace místo mazání
Rozhodnutí 2026-11-21. Martin chce z poptávek dlouhodobě dělat statistiku (a později je převzít do vlastní aplikace pro fotografy). GDPR dovoluje držet osobní údaje jen po dobu nutnou pro účel, anonymní data ale ne. Proto:
- Poptávka, ze které **nebyla zakázka** (`status` není `won`): po **12 měsících** od vytvoření údržbový worker záznam **anonymizuje**. Smaže jméno, e-mail, telefon, místo a poznámku, datum akce zkrátí na rok a měsíc a odkazující stránku na doménu. Nastaví `anonymized_at`.
- Zůstane: typ akce, měsíc, délka, počet lidí, příplatky, odhad ceny, jazyk, zdroj (doména, UTM) a stav. To je anonymní statistika, kterou lze držet bez omezení.
- Poptávka, ze které **byla zakázka** (`won`): údaje zůstávají po dobu spolupráce. Doklady se řídí daňovými předpisy. Kdy anonymizovat bývalé klienty, upřesní odborník a účetní (`TODO` v zásadách).
- Lhůta 365 dní je konstanta v `src/config/privacy.ts`, ne proměnná prostředí. Změna = commit a nasazení.
- Zásady ochrany osobních údajů popíšou: účel, právní základ (jednání před uzavřením smlouvy), dobu uchování a anonymizaci, příjemce (Cloudflare včetně Turnstile, poskytovatel e-mailu, Umami), práva subjektu a kontakt. Text je `TODO` pro odborníka, šablona stránky je hotová.

### E-mail
Rozhodnutí 2026-11-21:
- **Veřejný kontakt** je `foto@martinruzek.cz` (alias nebo schránka u Martinova stávajícího Email Profi). Na `.eu` žádná schránka nevzniká.
- **Formulář odesílá** z `noreply@martinruzek.eu`. Doména `.eu` k tomu potřebuje jen DNS záznamy SPF, DKIM a DMARC u Cloudflare.
- **Poskytovatel odesílání** (Cloudflare Email Service, nebo Resend) je technická volba. Ověří se v úkolu 11 podle toho, jestli Cloudflare na Martinově účtu umí posílat na libovolné adresy. Mailer je za rozhraním `Mailer`, takže výměna je změna jednoho souboru.

## 12. SEO a měření

- `SeoHead.astro`: `title`, `description`, `canonical`, `hreflang`, Open Graph a Twitter karta. OG obrázek 1200×630 vznikne při buildu z hero fotky přes `getImage()`.
- **JSON-LD** z `lib/seo/jsonld.ts`: `Person` (Martin Růžek, `sameAs` Instagram, Google profil, Firmy.cz jako `TODO`), `ProfessionalService` s `areaServed` Praha a Karlovy Vary a `OfferCatalog` s nabídkami generovanými z `pricing.ts` (`priceSpecification` s `minPrice`, měna CZK). Adresa se doplní, až bude známé sídlo. Do té doby se `address` vynechá a nic se nevymýšlí.
- `@astrojs/sitemap` s alternativami jazyků, `robots.txt`, české alt texty z kolekce fotek.
- `<html lang>` podle jazyka, smysluplné nadpisy (jediné `h1` = jméno).
- **Google Search Console** se ověří přes DNS. Na webu nic neměří.

### Měření (rozhodnutí 2026-11-21)
Dva nástroje, každý na něco jiného. Oba jsou bez cookies, takže web **nemá cookie lištu**.

| Nástroj | K čemu | Jak |
|---|---|---|
| **Umami** (zatím cloud zdarma, později Martinův vlastní server) | návštěvy, zdroje, UTM a **události**: `inquiry_sent` (s typem služby), `inquiry_error`, `estimate_used`, `contact_click` (telefon, WhatsApp, e-mail, Instagram), `lightbox_open`, `lang_switch` | Adresa skriptu a ID webu v `src/config/analytics.ts` (z proměnných `PUBLIC_UMAMI_SRC` a `PUBLIC_UMAMI_WEBSITE_ID`). Přechod na vlastní server = změna jedné hodnoty. Události přes atributy `data-umami-event`, z formuláře `umami.track()` |
| **Cloudflare Web Analytics** | Core Web Vitals od skutečných návštěvníků po stránkách (LCP, INP, CLS). U malého webu je Google (CrUX) často nemá | beacon s tokenem `PUBLIC_CF_BEACON_TOKEN` |

- **Výkon:** oba skripty (jednotky kB) se vloží až po `load` v `requestIdleCallback`. Neovlivní LCP ani CLS a jsou v rozpočtech Lighthouse CI. Malá komponenta `track()` volání bezpečně zahodí, když skript chybí (blokátor, vývoj).
- **Blokátory reklam** oba nástroje často blokují, čísla budou nižší než skutečnost. Přesměrování Umami přes vlastní doménu zatím neděláme.
- **Statistika poptávek** se nebere z analytiky, ale z D1 (zdroj poptávky, kap. 11). Je přesnější a patří Martinovi.
- **Google Ads později:** až to bude aktuální, přibude lišta se souhlasem a Google tag. Umami a Cloudflare zůstanou beze změny. Zdroj poptávky v D1 pak umožní vyhodnotit, které reklamy přinesly zakázky. Dnes se nic z toho nestaví.

## 13. Výkon a Core Web Vitals

**Cíle (mobil, 75. percentil):** LCP < 2,5 s, INP < 200 ms, CLS < 0,1. Laboratorní rozpočet pro Lighthouse (Moto G, 4× CPU, pomalé 4G): LCP ≤ 2,2 s, TBT ≤ 200 ms, CLS ≤ 0,05.

**Rozpočet přenosu na první načtení:**

| Položka | Strop (gzip/br) |
|---|---|
| HTML úvodní stránky | 30 kB |
| CSS | 25 kB |
| JS pro první vykreslení (inline boot, ascii, loader) | 12 kB |
| Měření (Umami, Cloudflare beacon), po `load` | 10 kB |
| JS pohybu (GSAP, ScrollTrigger, SplitText, Lenis, choreo, efekty), odložený | 75 kB |
| React island a formulář, při `client:visible` | 55 kB |
| Písma nad ohybem (2 × WOFF2) | 70 kB |
| Hero fotka (AVIF, mobil) | 120 kB |

**Opatření:**
- Hero fotka je prvek LCP: `<Picture>` s `fetchpriority="high"`, AVIF a `preload` přes `imagesrcset`. Pozor na skrývání: prvek s `opacity: 0` se do LCP nepočítá. Fotka proto zůstává viditelná a ASCII se kreslí přes ni.
- Jméno v hero se animuje maskou, ne průhledností. Test ověří, že LCP prvkem je fotka, ne nadpis.
- **Ověřeno měřením (2026-11-21):** fotka přes celý viewport se do LCP nepočítá (Chrome ji bere jako pozadí), LCP je tedy největší text v hero, úvodní odstavec. Ten se proto nikdy nesmí skrývat ani animovat průhledností.
- Celý pohyb se načítá až po prvním vykreslení a při `reduce` vůbec.
- Canvasy kreslí jen ve viewportu a jen když se mění průběh (sdílený plánovač).
- Písma mají záložní metriky, obrázky rozměry, SplitText se spouští po `document.fonts.ready`, header je `position: fixed`. Výsledek: CLS ≈ 0.
- `astro build` + Lighthouse CI s rozpočty na náhledu každé větve. Před spuštěním ověření na skutečném levném Androidu (viz R1).

## 14. Přístupnost (WCAG 2.2 AA)

- Odkaz „Přeskočit na obsah“, viditelný fokus všude (prototyp ho má), cíle aspoň 44 × 44 px.
- Pás typů akcí má tlačítko Pozastavit (2.2.2). Lupa na dotykových zařízeních bloudí jen 5 s, pak zastaví.
- Lightbox: nativní `<dialog>`, šipky, Esc, návrat fokusu, popisek a pořadí fotky (`01 / 08`).
- Canvasy mají `aria-hidden`. Informace nesou jen HTML a text.
- Formulář: popisky, chybové zprávy u polí, `aria-live` pro odhad a výsledek odeslání.
- Header s `mix-blend-mode: difference` může mít na středně šedých fotkách slabý kontrast. Ověří se na skutečných fotkách. Pojistka: po odscrollování z hero dostane header plné pozadí.
- Automaticky: `@axe-core/playwright` na obou jazycích, v plném i omezeném pohybu.

## 15. Soukromí, cookies a bezpečnost

> **Upozornění na cookies a sledování (AGENTS.md):**
> - Web sám **nenastavuje žádné cookies** a **nepotřebuje cookie lištu**. Umami i Cloudflare Web Analytics měří bez cookies a bez ukládání do prohlížeče. Uvedou se v zásadách ochrany osobních údajů. Lenis ani GSAP nic neukládají.
> - **Turnstile** načítá skript z `challenges.cloudflare.com` a vyhodnocuje signály prohlížeče, aby poznal robota. Podle dokumentace Cloudflare nepoužívá cookies pro sledování, ale zpracovává údaje o návštěvníkovi. Musí být uvedený v zásadách ochrany osobních údajů. Načte se jen u formuláře.
> - Žádné vložené příspěvky z Instagramu ani YouTube, žádné Google Fonts.
> - E2e test projde stránku a ověří, že po načtení, scrollu a odeslání formuláře nejsou žádné cookies ani zápisy do `localStorage`.

- Bezpečnostní hlavičky v `public/_headers`: `Content-Security-Policy` (povoleno jen `self`, Turnstile, Umami a beacon Web Analytics), `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, `frame-ancestors 'none'`.
- Tajné klíče (Turnstile secret, klíč e-mailové služby) jen přes `wrangler secret`. Lokálně `.dev.vars`, který je v `.gitignore`. Pro vývoj a testy se použijí veřejné testovací klíče Turnstile.

## 16. Rizika

### Z HANDOFF.md

| # | Riziko | Opatření | Jak se ověří |
|---|---|---|---|
| **R1** | **Výkon canvasů na slabších telefonech.** ASCII kreslí až ~10 000 znaků na snímek | 1) Na mobilu buňka 10 px místo 8 px (o ~35 % méně znaků) a strop 6 000 buněk. 2) Znaky se nekreslí přes `fillText`, ale kopírují z předem vykresleného atlasu glyfů (`drawImage`), což je řádově levnější. 3) Kreslí se jen při změně (rozpouštění, lupa, odjezd), jinak canvas stojí. Náhodné „blikání“ znaků poběží jen na desktopu. 4) **Adaptivní kvalita:** během prvních 30 snímků se měří čas snímku. Při průměru nad 24 ms se ASCII přeskočí a fotka se jen prolne. Totéž hned při `deviceMemory ≤ 2` nebo `Save-Data`. 5) DPR max. 1,5, plánovač zastaví vše mimo viewport | Playwright trace se 4× zpomaleným CPU: medián snímku ≤ 16 ms, nejhorší úvod ≤ 50 ms. Ruční test na levném Androidu před spuštěním |
| **R2** | **Lenis spolu s pinem a lightboxem** | Lenis napojený na `gsap.ticker` a `lenis.on('scroll', ScrollTrigger.update)`, `lagSmoothing(0)`. Pin jen na desktopu přes `gsap.matchMedia`. Při otevření `<dialog>` `lenis.stop()` a `overflow: hidden` na `<html>`, při zavření `lenis.start()` a návrat fokusu. `data-lenis-prevent` na dialogu a `<textarea>`. Kotvy přes `lenis.scrollTo` s posunem o header a přesunem fokusu na cílovou sekci. Na dotyku Lenis nechá nativní scroll (`syncTouch: false`). `ScrollTrigger.refresh()` po načtení písem a obrázků | E2e: otevřený lightbox nescrolluje stránku kolečkem ani klávesami, po zavření je fokus na fotce. Kotva doskočí a sekce má fokus. Pin nepřekrývá další sekci na šířkách 901, 1280 a 1920 px |
| **R3** | **Kontrast textu přes fotky** závisí na skutečných fotkách | `shade` u každé fotky (`normal` / `strong`) mění gradient pod textem. Skript `check:contrast` při buildu změří jas oblasti pod textem (spodních ~35 % výřezu přes sharp) a spočítá kontrast s `--ink`. Pod 4,5 : 1 zahlásí fotku a navrhne `strong` | Test skriptu na světlé a tmavé testovací fotce. Ruční kontrola na Martinových fotkách |

### Další rizika, která koncept odhalil

| # | Riziko | Opatření |
|---|---|---|
| R4 | **Bliknutí hero:** fotka se ukáže dřív, než ASCII skript naběhne, a pak skočí do znaků | ASCII skript je malý a načte se hned v hero, ne s GSAP. Když je fotka už dekódovaná (opakovaná návštěva z cache), úvodní rozpouštění se přeskočí a zůstane jen lupa a odjezd |
| R5 | **GPS ve zdrojových fotkách ve veřejném repu** | `photos:import` a `check:exif` (kap. 9) |
| R6 | **Jména klientů v záznamech o souhlasu** ve veřejném repu | v repu jen `consentRef`, údaje v `private/` |
| R7 | **Formulář jako rozesílač spamu** přes potvrzovací e-mail | Turnstile, rate limit, potvrzení bez volného textu, stejný `Origin` |
| R8 | **Pohybující se obsah déle než 5 s** (pás typů akcí, lupa) | tlačítko Pozastavit, lupa po 5 s zastaví |
| R9 | **Nečitelný header** přes `mix-blend-mode` | plné pozadí po odjezdu z hero, kontrola na skutečných fotkách |
| R10 | **Spuštění se zástupnými fotkami nebo bez nastaveného e-mailu a měření** | `check:launch` v produkčním buildu |
| R11 | **Anonymizace nevratně smaže údaje** u poptávky, ze které se zakázka stala, protože ji Martin neoznačil jako `won` | Worker anonymizuje jen po 12 měsících. Měsíc předem pošle Martinovi přehled poptávek, které se budou anonymizovat |

## 17. Otevřené otázky pro Martina

Rozhodnuto 2026-11-21: e-mail (kap. 11), uchování a anonymizace (kap. 11), formulář bez zaškrtávátka (kap. 11), měření (kap. 12). Zbývá, ptát se budu postupně:

1. **Fotky v repu, videa v R2** (kap. 9). *Doporučení:* ano.
2. **Videa:** R2 a nativní `<video>` (jednoduché, bez cizího přehrávače a cookies), nebo Stream (adaptivní kvalita, placený). *Doporučení:* R2, při pár krátkých videích stačí. Řeší se až po v1.
3. **Anglické texty:** agent přeloží, ty schválíš (kap. 5)?
4. **Případové studie:** při spuštění skryté, dokud nebude obsah?

Technicky se v úkolu 11 ověří poskytovatel odesílání e-mailů (Cloudflare Email Service, nebo Resend).

Načítací obrazovka a animace loga se v plánu záměrně neřeší. Zeptám se na ně, až na ně dojde řeč.

## 18. Co koncept záměrně neřeší

- Přesměrování `martinruzek.cz` a pozdější `ruzek.photo`. Jde jen o DNS a pravidla přesměrování u Cloudflare, doplní se při nasazení.
- Obsah: fotky, texty o Martinovi, telefon a WhatsApp, IČO, sídlo a zásady. V kódu zůstanou jako `TODO`.
- Rozhraní pro správu poptávek. Stav `won` / `lost` se zatím mění ručně, později v Martinově vlastní aplikaci.
- Smlouvy a obchodní podmínky (odborník).
