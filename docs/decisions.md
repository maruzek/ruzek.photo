# Rozhodnutí

Uzavřená rozhodnutí se znovu neotevírají, pokud to Martin sám nenavrhne. Nové záznamy přidávej nahoru s datem.

## Otevřené otázky
| Otázka | Stav / poznámka |
|---|---|
| Mřížka „kontaktní arch“ | Líbí se, ale musí být výrazně přetvořená. Ověřit, jestli šlo o mřížku ze směru A, nebo o izometrickou ze směru D |
| Stack Sans Notch | Zkouší se. Argumenty: v malých velikostech působí jako chyba, má jinou geometrii než logo, pochází z rebrandingu Stack Overflow, je zdarma. Doporučení: jen display ≥ 64 px. Pro porovnání vzniká i varianta bez něj |
| Serifový akcent | Kandidáti jsou Newsreader, Fraunces a Instrument Serif (vše kurzíva) |
| Načítání: jeden, nebo víc? | Vybráno 7 z 8 konceptů. Martin zvažuje náhodný výběr. Doporučení: jeden společný engine a varianta podle situace (první návštěva, přechod, opakovaná návštěva) nebo náhodně jen z variant, které ladí s finálním směrem. Rozhodne se po výběru vizuálu |
| Fotky v repozitáři, nebo v R2 | Primárně repozitář. R2 jen tam, kde to dává smysl, rozhodne koncept |
| Podoba ceníku | Hodinové ceny, nebo balíčky? Řeší se mimo repozitář |
| Využití `martinruzek.cz` | Zatím neurčeno (přesměrování na .eu?) |
| Poskytovatel odesílání e-mailů (úkol 11) | Neověřeno: implementace se nesměla přihlásit k Martinovu účtu Cloudflare. Hotový je Resend za rozhraním `Mailer` (`src/server/inquiry/mailer.ts`, secret `RESEND_API_KEY`). Bez nastaveného poskytovatele e-maily selžou, poptávka zůstane uložená s `notified_at = NULL` a údržbový worker ji pošle, jakmile poskytovatel bude. Když Cloudflare Email Service na účtu umí posílat na libovolné adresy, stačí přidat jeho implementaci do `createMailer`. Rozhodne Martin |

## Rozhodnuto

### 2026-11-21: schválení konceptu a plánu
- Martin schválil [koncept](concept.md) i [plán převodu do Astra](superpowers/plans/2026-11-20-rozpad-astro.md) a dal pokyn začít implementaci.
- Implementace běží na větvi `feat/rozpad-astro`, úkol po úkolu: každý úkol píše nový agent a kontroluje ho Codex `gpt-6.2-sol`. Průběh je v [logu běhu](superpowers/plans/2026-11-20-rozpad-astro.run-log.md).

### 2026-11-21: e-mail, uchování poptávek, měření, postup
- **E-mail:** veřejný kontakt je `foto@martinruzek.cz` (alias nebo schránka u stávajícího Email Profi). Na `.eu` žádná schránka. Formulář odesílá z `noreply@martinruzek.eu` (jen DNS záznamy SPF, DKIM a DMARC). E-mail Martinovi má `Reply-To` na klienta, potvrzení klientovi má `Reply-To` na `foto@`. Poskytovatele odesílání (Cloudflare Email Service, nebo Resend) ověří implementace.
- **Formulář bez zaškrtávátka souhlasu.** Poptávka se zpracovává kvůli jednání před uzavřením smlouvy. Nad tlačítkem je jen věta „Odesláním berete na vědomí zásady ochrany osobních údajů“ a s poptávkou se ukládá verze zásad.
- **Uchování:** poptávky bez zakázky se po **12 měsících anonymizují**, nemažou. Smažou se osobní údaje, zůstane anonymní statistika (typ, měsíc, délka, počet lidí, příplatky, odhad, zdroj) pro budoucí Martinovu aplikaci pro fotografy. Zakázky (`won`) zůstávají po dobu spolupráce, detaily upřesní odborník a účetní.
- **Zdroj poptávky** (odkazující stránka, UTM) se ukládá s poptávkou do D1, bez cookies.
- **Měření:** **Umami** (události a zdroje; zatím cloud zdarma, později vlastní server) a **Cloudflare Web Analytics** (Core Web Vitals od skutečných návštěvníků). Oba bez cookies, **bez cookie lišty**, načtené až po `load`. K tomu Google Search Console. Google Ads a lišta se souhlasem možná později, teď ne.
- **Postup implementace:** úkol po úkolu (subagent-driven). Každý úkol kontroluje Codex, model 6.2 Sol.

### 2026-11-20: vizuální směr Rozpad
- Ze 3 kol v OpenDesignu (9 směrů, potom 5 variant favoritů) Martin vybral směr **Rozpad A**.
- Fotka přes celou obrazovku, tmavá „půlnoc“ #07080B se světlými plochami #F2F2F3 a korálovým akcentem #FF7A66.
- Jméno ve **Stack Sans Notch**, ostatní text **Stack Sans Text**, zvýrazněná slova kurzívou **Crimson Pro**, popisky **Geist Mono**.
- Podpis směru je dithering z loga: fotky se skládají a rozpadají při scrollu. Úvod má ASCII dithering s lupou pod kurzorem.
- Pohyb: GSAP (ScrollTrigger, SplitText), Lenis, vždy s variantou pro `prefers-reduced-motion`.
- Prototyp a předávka pro Claude Code jsou v [`design/final/rozpad/`](../design/final/rozpad/) (`HANDOFF.md`). Fotky v prototypu jsou zástupné (CC0).
- Další krok: koncept a plán převodu do Astra. Kód aplikace až po Martinově schválení.

### 2026-11-20: načítání z loga
- Martin dodal logo jako SVG (3 stěny × mřížka 7×7, 74 dlaždic, 7 odstínů šedi). Data jsou v `design/logo/logo-tiles.json`.
- Z 8 konceptů načítání (`design/loader-concepts/`) Martin vybral 7: a-1, a-2, b-1, c-1, c-2, d-1, d-2. Koncept b-2 nevybral.
- Vybrané koncepty slouží v OpenDesignu jako volitelná reference.

### 2026-11-20: zadání pro OpenDesign
- Martinovy preference jsou v zadání **jen informace**. Agenti mají v designu volnou ruku.
- Cílem je najít konkrétní směr (úvodní sekce, 2–3 ukázkové sekce a popis systému), ne vytvořit celý detailní web.
- Každý skill navrhne 3 výrazně odlišné směry. Předem dané linie (Arch, Zápas, Text jako obraz) se zrušily.

### 2026-11-20: po moodboardu
- Varianty designu vzniknou v OpenDesignu pomocí skillů Taste, Impeccable a Hallmark, každý navrhne 3.
- **Žádná šablona.** Design musí být jedinečný a rozpoznatelný.
- Hlavní je modernistický sans-serif. Serif slouží jako akcent, některé návrhy mají serif používat víc.
- Oblíbené motivy:
  - animované přechody mezi světlými a tmavými sekcemi;
  - 3–4 sloupce fotek pohyblivé scrollem (desktop);
  - sekce s jedinou fotkou a textem;
  - sans-serif text se slovy v serifové kurzívě (klíčový motiv).

### 2026-11-20: druhé kolo
- Web se spustí na `martinruzek.eu`, `ruzek.photo` se koupí později.
- Velmi odvážný design v duchu Awwwards s animacemi přes GSAP.
- Oblíbený fotograf: Štěpán Černý (blackart.cz). Inspiruje hlavně galerie zápasu jako „match report“.
- Případové studie zatím nejsou. Model pro ně bude připravený a fotky Martin dodá.

### 2026-11-20: brainstorm
- **Značka:** hlavní je jméno „Martin Růžek“, `ruzek.jpg` je podpis.
- **Pozicování:** těžiště jsou akce, sport slouží jako háček.
- **Jazyky:** CZ i EN od spuštění.
- **Vývojářské prvky:** rychlost, kalkulačka cen předvyplňující poptávku, geometrický systém z loga, zákulisí a technická data fotek (bez GPS).
- **Obsah:** případové studie jednotlivých akcí.
- **Videa:** hostovaná přes Cloudflare (Stream nebo R2), žádné vkládání z Instagramu.
- **Poptávka:** e-mail Martinovi a potvrzení klientovi, uložení do D1, na webu telefon a WhatsApp.
- **Stránka O mně:** studium a vývoj jen zmínit. Vlastní portrét Martin dodá.
- **Galerie pro klienty:** Pixieset nebo Pic-Time, ne vlastní řešení.
- **Technologie:** Astro, React islands, Cloudflare.
