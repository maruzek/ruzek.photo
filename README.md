# Martin Růžek: fotograf akcí a sportu

Portfolio a obchodní web fotografa Martina Růžka (`@ruzek.jpg`), Praha a Karlovy Vary. Web je česky a anglicky a běží na Cloudflare.

> **Stav:** koncept a plán jsou schválené (2026-11-21). Implementace běží na větvi `feat/rozpad-astro`. Nasazení na Cloudflare (úkol 16 v plánu) ještě nezačalo.

Pravidla pro každého, kdo do repozitáře píše (člověk i AI agent), jsou v [AGENTS.md](AGENTS.md). **Repozitář je veřejný**: necommitujte tajné klíče, `.env`, souhlasy klientů ani osobní údaje.

## Obsah
- [Vývoj](#vývoj)
- [Jak přidat fotku](#jak-přidat-fotku)
- [Jak fotku stáhnout](#jak-fotku-stáhnout)
- [Jak změnit ceny](#jak-změnit-ceny)
- [Překlady](#překlady)
- [Poptávky a anonymizace](#poptávky-a-anonymizace)
- [Měření](#měření)
- [Proměnné prostředí](#proměnné-prostředí)
- [Výkon a kontrola před spuštěním](#výkon-a-kontrola-před-spuštěním)
- [Nasazení](#nasazení)
- [Licence písem](#licence-písem)
- [Dokumentace](#dokumentace)

## Vývoj
Vždy `pnpm`, nikdy `npm`. Potřebujete Node 22.23.4 nebo novější.

```sh
pnpm install
pnpm dev            # Astro dev server
pnpm build          # astro build a pnpm check:exif nad dist/
pnpm preview        # wrangler dev nad dist/ na portu 8787 (nejdřív pnpm build)
pnpm check          # typy Workeru, astro check, eslint, unit testy, check:exif
pnpm test           # jen unit testy (Vitest)
pnpm test:workers   # úložiště poptávek nad lokální D1
pnpm test:e2e       # Playwright, vždy si postaví čerstvý build
pnpm test:perf      # snímková frekvence ASCII úvodu na zpomaleném telefonu
pnpm lhci           # Lighthouse CI s rozpočty
pnpm check:launch   # poslední kontrola před spuštěním (viz níže)
```

- **Port e2e:** `pnpm test:e2e` a `pnpm test:perf` spouštějí vlastní preview na portu 8787. Běžící `pnpm preview` na tomto portu před nimi zastavte. Druhý checkout může použít jiný port: `E2E_PORT=8788 pnpm test:e2e`.
- **Hotovo** znamená: `pnpm check` i `pnpm test:e2e` projdou.
- Žádné cookies a žádné zápisy do `localStorage` kvůli měření. Při `prefers-reduced-motion: reduce` se GSAP ani Lenis nestáhnou.

### Zamčené verze (2026-11-21)
Přesné verze drží `pnpm-lock.yaml`. Hlavní nástroje:

| Nástroj | Verze |
|---|---|
| Astro | 7.4.13 |
| `@astrojs/cloudflare` (adaptér) | 14.4.9 |
| `@astrojs/react` | 7.1.9 |
| `@astrojs/sitemap` | 3.7.6 |
| Wrangler | 4.166.0 |
| Vitest | 5.1.1 |
| Playwright | 1.65.1 |
| TypeScript | 6.0.3 (`astro check` zatím nepodporuje 7.x) |

## Jak přidat fotku
Fotky jsou v repozitáři: soubor v `src/assets/photos/`, popis v `src/content/photos/<název>.yaml`. Build je zpracuje do AVIF, WebP a JPEG.

1. **Souhlas.** Fotku smíte zveřejnit jen se souhlasem klienta nebo pořadatele. U dětí je potřeba souhlas rodičů. Záznam o souhlasu si vedete **mimo repozitář**, ve složce `private/` (je v `.gitignore`). Každý záznam dostane pořadové číslo ve tvaru `C-2026-014`.
2. **Import:**
   ```sh
   pnpm photos:import cesta/k/fotce.jpg
   ```
   Skript otočí fotku podle orientace, zmenší ji nejvýš na 3000 px na delší straně, uloží jako JPEG bez EXIF (tedy i bez GPS) do `src/assets/photos/` a vytvoří YAML se zástupnými hodnotami. Existující soubor nikdy nepřepíše. Podporované jsou běžné formáty včetně PNG a WebP. HEIC/HEIF se nepoužívá.
3. **Doplňte YAML.** Pole:

   | Pole | Význam |
   |---|---|
   | `image` | cesta k souboru v `src/assets/photos/` (vyplní import) |
   | `alt` | popis fotky česky i anglicky. Skutečný popis, ne `TODO` |
   | `caption` | volitelný popisek `{ cs, en }` |
   | `category` | `event`, `sport` nebo `portrait` |
   | `published` | `true` = fotka je na webu. Bez tohoto pole platí `false` |
   | `consentRef` | pořadové číslo záznamu o souhlasu, např. `C-2026-014`. **Nic jiného**: žádné jméno, e-mail, telefon ani datum narození |
   | `minors` | `true`, pokud je na fotce poznatelný někdo mladší 18 let, jinak `false`. U zveřejněné fotky je povinné, nemá výchozí hodnotu |
   | `parentalConsent` | `true`, pokud je souhlas rodičů. U `minors: true` je povinné |
   | `shade` | `normal` nebo `strong`: síla ztmavení pod textem, kde text leží přes fotku |
   | `placeholder`, `credit` | jen pro zástupné fotky. Zástupná fotka nikdy nepatří na veřejný web |

   Build selže, když zveřejněná fotka nemá `consentRef`, `minors` nebo skutečný `alt`, nebo když má `minors: true` bez `parentalConsent: true`.
4. **Umístění.** Která fotka je v úvodu, v sekcích a v mřížce prací, říká `src/config/placement.ts`. Mění-li se fotka pod textem, spusťte `pnpm check:contrast` (ověří čitelnost) a případně upravte `TEXT_OVER_PHOTOS` a `SHADE_OPACITY` ve `scripts/check-contrast.ts`.
5. `pnpm check` a nasaďte.

Pro případovou studii je vzor v `src/content/case-studies/example.md`. Koncept (`draft: true`) nemá stránku ani záznam v sitemapě.

## Jak fotku stáhnout
Když klient nebo pořadatel souhlas odvolá:

1. V `src/content/photos/<název>.yaml` nastavte `published: false`.
2. Nasaďte web znovu. Soubor fotky se do výstupu vůbec nedostane. Build kvůli stažení nikdy neselže a sekce, která fotku používala, se vykreslí bez ní.
3. Po nasazení ověřte, že fotka na webu není.

Stažení je jedna změna v obsahu a jedno nasazení. Zdrojový soubor zůstává v repozitáři; chcete-li ho smazat i z historie gitu, je to samostatná úloha, protože repozitář je veřejný.

## Jak změnit ceny
Jediný zdroj pravdy je `src/config/pricing.ts` (ceny v celých Kč bez DPH). Čtou z něj stránka služeb, doplňky, odhad ve formuláři, JSON-LD i odhad uložený s poptávkou. Texty v slovnících ceny neobsahují.

1. Upravte čísla v `src/config/pricing.ts`.
2. Spusťte `pnpm test`. `tests/unit/pricing.test.ts` hlídá výpočty a formát. Když test spadne po záměrné změně, upravte očekávané hodnoty.
3. `pnpm check`, `pnpm test:e2e` (kontroluje i ceny na stránce v obou jazycích) a nasaďte.

## Překlady
Všechny texty webu jsou ve slovnících: `src/i18n/cs.ts` (česky, určuje tvar) a `src/i18n/en.ts` (anglicky). V komponentách nejsou žádné texty natvrdo. Chybějící údaj se zobrazí jako viditelné `TODO: …` přes komponentu `<Todo>`, nikdy se nevymýšlí.

- Nový nebo změněný text: upravte obě verze. TypeScript upozorní, když anglický slovník nesedí na český.
- Cesty stránek v obou jazycích jsou v `src/i18n/index.ts`. Česky bez předpony, anglicky `/en/`.
- Anglické texty jsou zatím překlady k ověření Martinem.
- Údaje o majiteli (jméno, kontakty, IČO, sídlo) jsou v `src/config/site.ts`. `null` znamená „zatím neznámé“ a web ukáže `TODO`.
- Změní-li se text zásad ochrany osobních údajů, zvyšte `PRIVACY_NOTICE_VERSION` (viz níže).

## Poptávky a anonymizace
Formulář posílá poptávku na `/api/inquiry`. Endpoint ji ověří (Turnstile, limit 5 požadavků za minutu z jedné IP), uloží do D1 `ruzek-inquiries` a pošle e-mail na `foto@martinruzek.cz` a potvrzení klientovi. IP adresa se nikam neukládá. Formulář nemá zaškrtávátko souhlasu, jen větu s odkazem na zásady.

**Lokálně:** zkopírujte `.dev.vars.example` do `.dev.vars`. Už v něm je veřejný testovací tajný klíč Turnstile (`1x0000000000000000000000000000000AA`, vždy projde, není to tajemství) a `MAILER=console`, takže se nic neodesílá. Bez tajného klíče by se lokální formulář nikdy neodeslal. Pak:

```sh
pnpm exec wrangler d1 migrations apply ruzek-inquiries --local -c wrangler.jsonc
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA pnpm build && pnpm preview
```

`pnpm test:e2e` si to všechno nastaví samo. Test úložiště nad lokální D1: `pnpm test:workers`. Typy pro Worker vygeneruje `pnpm types:worker` (spouští ho i `pnpm check`).

**Označit zakázku.** Poptávky bez zakázky se po 365 dnech anonymizují (`ANONYMIZE_AFTER_DAYS` v `src/config/privacy.ts`). Když se z poptávky stala zakázka, označte ji, aby údaje zůstaly:

```sh
pnpm exec wrangler d1 execute ruzek-inquiries --remote --command "UPDATE inquiries SET status='won' WHERE id='…'"
```

ID poptávky najdete v každém e-mailu s poptávkou i v měsíčním přehledu. Poptávku, ze které nic nebylo, můžete označit `status='lost'`. Na anonymizaci to nic nemění.

**Měsíční přehled a anonymizace.** Údržbový worker (`workers/maintenance/`, nasazení `pnpm deploy:maintenance`) běží každý den ve 3:00 UTC:
- až 7 dní po poptávce zkouší znovu poslat e-maily, které neodešly (vám i potvrzení klientovi);
- prvního dne v měsíci pošle na `foto@martinruzek.cz` přehled poptávek, které se anonymizují do 35. dne od začátku měsíce. Když se přehled neodešle, zkusí to další den znovu. V přehledu je ID pro příkaz výše, takže stihnete označit zakázky;
- anonymizuje poptávky až 3 dny po odeslání přehledu, ve kterém byly. Po anonymizaci dostane poptávka nové ID, takže ji s e-mailem už nespojíte. Zbývá jen to, co slouží statistice (měsíc akce, typ služby, zdroj poptávky).
- Pevná horní hranice: nejpozději `NOTICE_GRACE_DAYS` (30) dní po uplynutí lhůty se poptávka anonymizuje i bez odeslaného přehledu.

**Změna zásad.** S každou poptávkou se ukládá verze zásad, které klient viděl. Kdykoli změníte text zásad (`privacy` ve slovnících `src/i18n/cs.ts` a `en.ts`, nebo to, co zásady popisují), zvyšte konstantu `PRIVACY_NOTICE_VERSION` v `src/config/privacy.ts` na dnešní datum a nasaďte. Verzi vypisuje i stránka se zásadami.

**Tajné klíče** (jen přes `wrangler secret put`, nikdy do repozitáře): `TURNSTILE_SECRET` a `RESEND_API_KEY` pro web, `RESEND_API_KEY` i pro údržbový worker (`-c workers/maintenance/wrangler.jsonc`). Veřejný klíč Turnstile jde do buildu jako `PUBLIC_TURNSTILE_SITE_KEY`. Bez poskytovatele e-mailu se poptávky uloží a odešlou se, až bude nastavený.

## Měření
Dva nástroje, oba bez cookies, takže web nemá cookie lištu. Skripty se vloží až po události `load`, v době nečinnosti prohlížeče, a bez nastavené proměnné se příslušný nástroj vůbec nenačte.

| Nástroj | K čemu | Nastavení při buildu |
|---|---|---|
| Umami (zatím cloud) | návštěvy, zdroje, UTM a události (`inquiry_sent`, `estimate_used`, `contact_click`, `lightbox_open`, `lang_switch` a další) | `PUBLIC_UMAMI_SRC`, `PUBLIC_UMAMI_WEBSITE_ID` |
| Cloudflare Web Analytics | Core Web Vitals od skutečných návštěvníků | `PUBLIC_CF_BEACON_TOKEN` |

- Nastavení je v `src/config/analytics-from.ts` (čtení proměnných) a `src/config/analytics.ts`. Události se posílají přes `track()` ze `src/scripts/analytics.ts`; do dat události nikdy nepatří osobní údaje.
- **Přechod Umami na vlastní server:** v produkčním buildu změňte `PUBLIC_UMAMI_SRC` na adresu skriptu vlastní instance (`https://…/script.js`, musí být `https`) a `PUBLIC_UMAMI_WEBSITE_ID` na ID webu v ní. Pravidla CSP si build odvodí z hotových stránek, takže se upraví sama. Nové ID webu a případně server uveďte i v zásadách ochrany osobních údajů, zvyšte `PRIVACY_NOTICE_VERSION` a ověřte e2e testem `analytics.spec.ts`.
- Statistika zdrojů poptávek se nebere z měření, ale z D1 (sloupce se zdrojem poptávky). Měření z Googlu (Analytics, Ads) by potřebovalo cookie lištu a stavět se bude jen na Martinovo rozhodnutí.

## Proměnné prostředí
Všechny názvy s komentářem jsou v [`.env.example`](.env.example). Soubor `.env` je v `.gitignore`. Tajné klíče pro Worker jdou do `.dev.vars` (lokálně) a přes `wrangler secret put` (produkce).

| Proměnná | Kde | K čemu |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | build | veřejný klíč widgetu Turnstile |
| `TURNSTILE_SECRET` | secret Workeru | ověření Turnstile na serveru |
| `RESEND_API_KEY` | secret Workeru a údržbového workeru | odesílání e-mailů přes Resend |
| `MAILER` | Worker | `console` nic neodesílá (jen lokálně a v testech). V produkci nenastavovat |
| `ALLOWED_ORIGIN` | `wrangler.jsonc` | jediný povolený Origin pro `POST /api/inquiry` |
| `PUBLIC_UMAMI_SRC`, `PUBLIC_UMAMI_WEBSITE_ID` | build | Umami |
| `PUBLIC_CF_BEACON_TOKEN` | build | Cloudflare Web Analytics |
| `E2E_PORT` | testy | port preview pro e2e a výkonové testy |

## Výkon a kontrola před spuštěním

### Rozpočty (Lighthouse CI)
`pnpm lhci` postaví web, spustí ho přes `wrangler dev` stejně jako e2e testy a změří `/` a `/en/` pětkrát v emulaci mobilu (Lighthouse: Moto G, 4× zpomalený procesor, pomalé 4G). Vyhodnocuje se medián. Rozpočty jsou v `lighthouserc.json` podle kapitoly 13 konceptu:

| Měřítko | Strop |
|---|---|
| LCP | 2 200 ms |
| TBT | 200 ms |
| CLS | 0,05 |
| Výkon (Performance) | alespoň 0,95 |
| Přístupnost (Accessibility) | 1 |
| JS celkem (první vykreslení, pohyb, formulář a skutečné skripty měření a Turnstile) | 150 kB |
| JS pro první vykreslení | 10 kB |
| Písma nad ohybem (soubory, které první obrazovka na mobilu opravdu používá) | 70 kB |

- Měření je při měření zapnuté, ale skripty Umami a Cloudflare se nestahují z internetu: Chrome je přesměruje na lokální náhradu (`scripts/lhci-server.ts`, `scripts/lhci-stub.ts`, stejné náhrady jako v e2e). Náhrady jsou mnohem menší než skutečné skripty, takže tyto bajty Lighthouse podhodnocuje a v rozpočtu JS jsou nahrazené pevnou konstantou skutečných velikostí (`TRACKER_GZIP_BYTES` v `scripts/lhci-budgets.ts`, změřeno 2026-11-21).
- Lighthouse potřebuje Chrome. Použije se ten, který nainstaloval Playwright (`pnpm exec playwright install chromium`), nebo cesta v `CHROME_PATH`. Běží z dočasné složky, aby ve WSL nevznikaly adresáře se jmény z Windows v repozitáři. Když na portu 8787 (nebo `E2E_PORT`) už něco běží, například `pnpm preview`, odmítne se spustit, aby neměřil starý server.
- Rozpočty na JS počítá `scripts/lhci-budgets.ts` z výstupu buildu (`dist/client`), ne z časování sítě. Velikost je gzip -9 každého skriptu zvlášť. „První vykreslení“ je inline spustitelné skripty plus moduly stránky a jejich statické importy. „Odložené“ je pohybová vrstva (dynamický `import()`), „island“ je formulář (`client:visible`) a k tomu skutečné skripty, které v buildu nejsou (Umami, Cloudflare beacon a Turnstile `api.js`, které formulář načte hned po hydrataci). Rozpis se vypíše při každém `pnpm lhci`.
- Rozpočet „písma nad ohybem“ hlídá test `tests/e2e/font-swap.spec.ts`: spočítá soubory písem, které opravdu používá text v prvním viewportu 360 × 780 px, ať už byly předem načtené, nebo je našlo CSS.
- Výsledky se ukládají do `.lighthouseci/` (je v `.gitignore`).
- První měření (2026-11-21) a to, co zatím rozpočet nesplňuje, je v [docs/decisions.md](docs/decisions.md).

### Ruční kontrola na levném Androidu
**TODO (Martin):** zkušební zařízení v automatickém testu nemáme. Před spuštěním projděte web na skutečném levném telefonu s Androidem a zapište výsledek sem:
- plynulost úvodu (ASCII, jméno, přechod do prvního řezu);
- lupa v sekci s fotkou;
- pin a linka průběhu v sekci „Týž den“ (na telefonu je bez pinu, ověřit, že obsah je celý);
- lightbox (otevření, listování, zavření, návrat fokusu).

Automaticky hlídá snímkovou frekvenci jen `pnpm test:perf` (zpomalený procesor v Chromiu, ne skutečné zařízení).

### Kontrola před spuštěním
`pnpm check:launch` vypíše, co brání spuštění:
- zveřejněná zástupná fotka (`placeholder: true`);
- chybějící `TURNSTILE_SECRET`, nebo testovací tajný klíč Cloudflare místo skutečného;
- žádný poskytovatel e-mailu (`RESEND_API_KEY`), nebo `MAILER=console`;
- chybí `dist/client`, nebo je starší než `.env*`, `wrangler.jsonc`, `astro.config.ts` či `src/` (spusťte znovu `pnpm build` se skutečnými hodnotami);
- veřejné hodnoty vložené do postavených stránek: chybějící nebo testovací klíč Turnstile (`PUBLIC_TURNSTILE_SITE_KEY`), vypnuté nebo testovací Umami (`PUBLIC_UMAMI_SRC`, `PUBLIC_UMAMI_WEBSITE_ID`), chybějící nebo testovací `PUBLIC_CF_BEACON_TOKEN`.

Jako varování vypíše viditelná `TODO` ve stránkách v `dist/client` (podle pravidel smí na webu být, ale před spuštěním je vyplňte). Veřejné hodnoty (`PUBLIC_*`) čte z postavených stránek v `dist/client`, tedy přesně to, co by se nasadilo. Adaptér Cloudflare totiž před buildem kopíruje `.env` a `.dev.vars` do prostředí procesu, takže build nemusí vidět stejné hodnoty jako samotné čtení souborů. Pozor: `pnpm test:e2e` a `pnpm lhci` staví web s testovacími hodnotami, takže před `check:launch` je nutné znovu spustit `pnpm build` se skutečnými. Tajné klíče pro Worker čte z prostředí procesu a ze souborů `.env`, `.env.local`, `.env.production` a `.env.production.local` (pozdější vyhrává, proces má přednost, nic se nevypisuje). Zná všechny testovací klíče Turnstile, které Cloudflare zveřejňuje. Tajné klíče jsou v produkci jen v Cloudflare, takže je pro kontrolu dočasně vložte do `.env`. Kontrola není součástí `pnpm check`, protože zástupné fotky jsou zatím zveřejněné schválně.

## Nasazení
Nasazení dělá Martin sám, nebo agent s jeho výslovným souhlasem u každého kroku, protože kroky na Cloudflare jsou nevratné nebo veřejné. Postup je v plánu, [úkol 16](docs/superpowers/plans/2026-11-20-rozpad-astro.md): D1 databáze a migrace, widget Turnstile, odesílání e-mailů (DNS záznamy SPF, DKIM, DMARC), údržbový worker, Umami a Cloudflare Web Analytics, Search Console, `pnpm check && pnpm test:e2e && pnpm check:launch`, pak `pnpm build && wrangler deploy` a kontrola na produkci.

ID databáze z `wrangler d1 create ruzek-inquiries` patří do **obou** konfigurací: `wrangler.jsonc` i `workers/maintenance/wrangler.jsonc`. Teď v nich je zástupná hodnota.

- `ID` D1 databáze v `wrangler.jsonc` je zatím nulový zástupný řetězec. Doplní se při nasazení.
- Nasazuje se jen výstup `pnpm build` (ten spouští i `check:exif`). Nikdy `wrangler deploy` bez předchozího buildu.
- `TODO:` Přesné příkazy nasazení doplní úkol 16, až se provedou.

## Licence písem
Písma se hostují lokálně z balíčků `@fontsource/*` (pnpm). U každého balíčku je ověřený soubor `LICENSE` (SIL Open Font License 1.1) i pole `license: "OFL-1.1"` v `package.json` (2026-11-21, verze 5.3.0). OFL dovoluje písma šířit i commitovat. Soubory písem v repozitáři nejsou, vznikají při buildu z `node_modules`.

| Písmo | Balíček | Řezy | Licence |
|---|---|---|---|
| Stack Sans Notch (jen display, od 64 px) | `@fontsource/stack-sans-notch` | 700 | OFL 1.1 |
| Stack Sans Text | `@fontsource/stack-sans-text` | 400, 500, 600 | OFL 1.1 |
| Instrument Serif (kurzíva, akcent) | `@fontsource/instrument-serif` | 400 italic | OFL 1.1 |
| Geist Mono | `@fontsource/geist-mono` | 400, 500 | OFL 1.1 |

Sady `latin` a `latin-ext` (čeština), WOFF2. Písma načítá Fonts API Astra (`fonts` v `astro.config.ts`, lokální provider nad soubory z balíčků): generuje `@font-face`, záložní písma s upravenými metrikami a `preload` pro Notch 700 a Text 400. Žádný požadavek na Google Fonts ani jiné CDN.

## Dokumentace
| Soubor | Obsah |
|---|---|
| [AGENTS.md](AGENTS.md) | Pravidla pro AI agenty i lidi: postup, obsahová a právní pravidla, technologie |
| [docs/concept.md](docs/concept.md) | Koncept webu: architektura, komponenty, výkon, soukromí, rizika |
| [docs/superpowers/plans/2026-11-20-rozpad-astro.md](docs/superpowers/plans/2026-11-20-rozpad-astro.md) | Plán implementace po úkolech |
| [docs/brief.md](docs/brief.md) | Zadání: služby, ceny, klienti, formulář, SEO |
| [docs/decisions.md](docs/decisions.md) | Co je rozhodnuto a co zůstává otevřené |
| [docs/research.md](docs/research.md) | Shrnutí rozboru konkurence a inspirací |
| [design/final/rozpad/](design/final/rozpad/) | Prototyp vybraného směru a předávací dokument |
| [design/logo/](design/logo/) | Logo (černá a šedá varianta) |
| [research/](research/) | Vzorník písma a skripty na screenshoty. Podrobné rozbory jsou jen lokálně |

## Domény
- `martinruzek.eu`: spuštění webu (spravuje Cloudflare)
- `martinruzek.cz`: vlastněná, veřejný e-mail `foto@martinruzek.cz`
- `ruzek.photo`: plánovaný nákup v budoucnu
