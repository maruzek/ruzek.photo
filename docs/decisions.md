# Rozhodnutí

Uzavřená rozhodnutí se znovu neotevírají, pokud to Martin sám nenavrhne. Nové záznamy přidávej nahoru s datem.

## Otevřené otázky
| Otázka | Stav / poznámka |
|---|---|
| Mřížka „kontaktní arch“ | Líbí se, ale musí být výrazně přetvořená. Ověřit, jestli šlo o mřížku ze směru A, nebo o izometrickou ze směru D |
| Stack Sans Notch | Zkouší se. Argumenty: v malých velikostech působí jako chyba, má jinou geometrii než logo, pochází z rebrandingu Stack Overflow, je zdarma. Doporučení: jen display ≥ 64 px. Pro porovnání vzniká i varianta bez něj |
| Ikony místo typografických znaků | Ikony jsou ze sady Hugeicons (zdarma, MIT), zatím jen u kontaktů. Šipky „→“ a „↗“ v tlačítkách a odkazech a kosočtverec „◆“ jsou zatím znaky písma. Možná výměna, hlavně šipek, za ikony ze stejné sady. Rozhodne Martin |
| Loader po dodání skutečné hero fotky | Podoba a barvy loaderu (tmavé pozadí, světlé dlaždice, tlumené pole se zářícím rohem) jsou laděné k zástupné fotce. Až bude skutečná hero fotka, je potřeba loader znovu vyhodnotit: přechod z loaderu do úvodu, barvy dlaždic a jas plné hustoty. Rozhodne Martin |
| Fotky v repozitáři, nebo v R2 | Primárně repozitář. R2 jen tam, kde to dává smysl, rozhodne koncept |
| Podoba ceníku | Hodinové ceny, nebo balíčky? Řeší se mimo repozitář |
| Využití `martinruzek.cz` | Zatím neurčeno (přesměrování na .eu?) |
| Poskytovatel odesílání e-mailů (úkol 11) | Neověřeno: implementace se nesměla přihlásit k Martinovu účtu Cloudflare. Hotový je Resend za rozhraním `Mailer` (`src/server/inquiry/mailer.ts`, secret `RESEND_API_KEY`). Bez nastaveného poskytovatele e-maily selžou, poptávka zůstane uložená s `notified_at = NULL` a údržbový worker ji pošle, jakmile poskytovatel bude. Když Cloudflare Email Service na účtu umí posílat na libovolné adresy, stačí přidat jeho implementaci do `createMailer`. Rozhodne Martin |

## Rozhodnuto

### 2026-11-26: menší soubory písem pro češtinu a angličtinu
- Build zmenšuje WOFF2 pro běžné znaky v češtině a angličtině. Ostatní znaky se načítají z původních souborů podle potřeby. Přednačítají se menší soubory pro Notch 700 a Text 400, dohromady 28,9 KiB místo 52,2 KiB.
- Na první obrazovce v Chromiu při 360 × 780 px klesl objem použitých písem v češtině ze 104,0 na 62,8 KiB a v angličtině z 91,8 na 57,0 KiB. Limit je 70 KiB. Snímky první obrazovky před úpravou a po ní byly v obou jazycích pixelově shodné. [Test rozpočtu a doplňkových znaků](../tests/e2e/font-swap.spec.ts).

### 2026-11-25: sekce „Ještě ten den“ bude časová osa
- Ze čtyř prototypů (`private/day-protos/`, jen lokálně) Martin vybral **A „Osa dne“**: hustota fotek na ose ukazuje průběh, hodně záběrů během akce → pár vybraných ještě ten den → dny čekání → celá galerie. Verze s ořezem 9:16 (A2) se nepoužije.
- Sekce vysvětluje předání: expres (+20–30 %) i celou galerii v ceně, s odkazem do poptávky s předvybraným expresem. Bez konkrétních hodin, jen „ještě ten den“ a „za 3–5 dnů“ (zápasy a turnaje do 24 h).
- Fotky na ose jsou z jednoho focení (konference). `conference-audience` je z jiné akce a do osy nepatří. Další snímky z konference může Martin dodat, vyřazené záběry už neexistují. Banner na skupinové fotce může zůstat vidět.

### 2026-11-22: úpravy po redesignu galerie
- V O mně zůstává Instagram. V patičce zůstávají sloupce „Fotím“ a „Kde“.
- Akce i Sport mají dál po jedné celoobrazovkové fotce. Šířka layoutu na 2560 × 1440 Martinovi vyhovuje.
- Stávající ukazatel kroků „Ještě ten den“ počká na případný redesign sekce. Ke zkoušce je obrazová časová osa od záběru přes ořez pro sítě po hotový výběr.
- Poptávka má pořadí Akce, Sport, Portrét, Jiné. Krátké focení se vyřazuje. Typ Sport používá identifikátor `sport` a Jiné má individuální cenu. Na mobilu bude souhrn odhadu u odeslání. Při tabulátoru se zvýrazní právě fokusované pole.
- Serifová kurzíva zůstává jako akcent na méně místech. U nadpisu poptávky smysl nemá. V sekci „Ještě ten den“ pokryje celou frázi „ještě ten den“.
- Lightbox otevře zvolený snímek celý a bez nutnosti posouvat obsah. Během načítání se nesmí ukázat předchozí snímek.
- Kosočtvercový přechod vyzkoušet samostatně až po ostatních změnách. Místo a datum se k fotkám doplňovat nebudou. Případové studie přijdou, až bude skutečný obsah.
- Nápady do budoucna jsou pás s konkrétními momenty z vlastních fotek a plovoucí odhad s výběrem služeb přímo v ceníku.

### 2026-11-22: vlastní fotky místo zástupných
- **Výběr:** 16 vlastních fotek nahradilo všech 14 zástupných, přehled a náhradníci jsou v [`photos.md`](photos.md). Rezerva do 30 fotek je připravená pro galerii „kontaktní arch“.
- **Nezletilí:** na vybraných fotkách nejsou (Martin), všechny mají `minors: false`. Děti se objevují jen v hledišti na fotbale; takové fotky (`IMG_4505-2`, `IMG_4510`) jsou jen v rezervě a před zveřejněním je Martin ručně rozmaže.
- **Loga sponzorů a bannery** na fotkách nevadí. Kontext akce (noviny, banner pořadatele) se neřeší.
- **Fotka přes obrazovku „akce“** je `IMG_7167` s vymazaným textem na plátně (retuš dodal Martin).
- **`consentRef` zrušen.** Souhlasy klientů a pořadatelů se v repozitáři neevidují a build je nevyžaduje. Pravidlo, že se zveřejňují jen fotky se souhlasem, platí dál. Kontrola `minors` a `parentalConsent` zůstává.
- **Import:** delší strana 2400 px (dříve 3000), `--slug` a `--crop` v `pnpm photos:import`. Originály jsou v `private/photos-inbox/`, `public/` se pro fotky nepoužívá.

### 2026-11-22: texty, kontakt, načítání
- **Texty** podle revize (`private/copy-review-2026-11-21.md`): bary pryč (akce v tmavých podnicích nejsou Martinův obor), DPH jen u ceníku, méně výčtů a popisků, „Doplňky“ místo „Výstupy“. Zástupné fotky zůstávají, vymění se celé.
- **„Ještě ten den“ všude** místo „týž den“: zní přirozeněji a méně knižně.
- **Titulek:** „Fotograf akcí a sportu Praha · Martin Růžek“.
- **Kontakt u formuláře:** tři řádky (Zavolat, WhatsApp, E-mail), bez dělicích čar, ikony Hugeicons.
- **Načítací obrazovka:** koncept **b-1 „Práh“** podle prototypu, na konci logo odletí na své místo v hlavičce. Jen při příchodu z jiného webu nebo přímém zadání adresy (pozná se z odkazující stránky, nic se neukládá), bez cookies a bez lišty. Při omezeném pohybu a bez JavaScriptu se nezobrazí. Neukáže se ani po obnovení stránky, při pohybu zpět/vpřed a při zapnutém Save-Data. Barvy prototypu jsou převedené na tmavé pozadí webu (dlaždice světlé, plná hustota je tlumené pole se zářícím rohem, ne bílé probliknutí). Načtení čeká na písma a hero fotku, nejdéle 2,5 s od začátku navigace. Při rychlém načtení je web vidět zhruba za 1,8 s, logo dosedne do hlavičky kolem 2,4 s. Vstupní animace hero začíná, až logo vyletí.
- **Rozpočet JS pro první vykreslení zvýšen z 10 na 12 kB.** Loader má 2,1 kB a musí běžet hned (statický import, ne až s pohybovou vrstvou). Nově 11,9 kB. Pohybová vrstva (GSAP, Lenis, 56 kB) se dál stahuje odloženě a načte se během loaderu.

### 2026-11-21: úpravy po první prohlídce
- **Telefon +420 731 808 342** je veřejný (poptávka, patička, JSON-LD), WhatsApp je na stejném čísle (odkaz `wa.me`, žádné vložení ani cookies).
- **E-mail:** na zařízení s myší klik adresu zkopíruje a ukáže hlášku s odkazem do pošty, na dotykovém zařízení otevře poštu. Odkaz zůstává `mailto:`.
- **Formulář:** typ focení vybírá dlaždicemi, délka akce se dopočítá ze začátku a konce, pole jsou ve skupinách Kontakt / Akce / Výstupy.
- **Odkazy v textu** mají tečkované podtržení jako „Prohlédnout práci“, hlavní menu ne.
- **Astro audit „tabindex“:** neřeší se. `tabindex="-1"` na `main` a sekcích je cíl fokusu po skoku z menu a do pořadí tabulátoru nic nepřidává.
- **Serif:** akcentem je **Instrument Serif** (kurzíva), nahrazuje Crimson Pro. Martin ho vybral po porovnání obou verzí.
- **Sekce s fotkou:** popisek s nadpisem se při najíždění sekce drží u spodního okraje obrazovky, takže se čte hned, ne až po celé fotce.
- **Služby:** odznak „hlavní“ u akcí je pryč. **Formulář:** skupiny nemají dělicí čáry.
- **Ikona a titulek:** ikona v záložce je logo (`pnpm icons` ji vygeneruje z `design/logo/logo-tiles.json`), titulek je zkrácený na „Martin Růžek · fotograf akcí a sportu“.

### 2026-11-21: výkon, první měření Lighthouse CI
Lab měření (`pnpm lhci`, emulace mobilu, medián z 5 běhů, zástupné fotky; opraveno po review PF-03 až PF-05): výkon 1,0, přístupnost 1, LCP ≈ 1,1 s, TBT 75 ms, CLS 0. Rozpočty na JS a písma se po review počítají poctivěji, viz níže.
- **LCP není fotka.** Chrome nepočítá do LCP obrázek, který zabírá celý viewport, a hero fotka ho zabírá. LCP je proto úvodní odstavec. Odstavec se proto při načtení neskrývá (`opacity: 0` ho dřív odkrývalo až po načtení GSAP a po zpoždění 1,1 s, v labu LCP ≈ 4,3 s). Ostatní prvky hero (kicker, tlačítka, meta) se odkrývají jako dřív. **Martin potvrdí, že mu vzhled úvodu takhle vyhovuje.**
- **JS pro první vykreslení: 9,3 kB z 10 kB (v pořádku).** Počítá se z výstupu buildu (gzip -9): inline skripty 2,7 kB, moduly stránky se statickými importy 6,6 kB. První měření 13,8 kB bylo chybné, protože sčítalo požadavky podle času `DOMContentLoaded` a vynechalo inline skripty.
- **JS celkem: 201,0 kB, rozpočet je 150 kB (nesplněno).** Rozpis: první vykreslení 9,3 kB, pohybová vrstva 55,0 kB, formulář (island, hlavně React) 95,6 kB, skutečné skripty mimo build 41,0 kB (Umami 4,1 kB, Cloudflare beacon 10,0 kB, Turnstile `api.js` 26,9 kB, který formulář načte hned po hydrataci). Rozpočet zůstává, `pnpm lhci` na něm končí chybou. Koncept počítal s formulářem 55 kB a měřením 10 kB. Rozhodne Martin (například odložit načtení Reactu a Turnstile až k interakci s formulářem).
- **Písma nad ohybem: 123,6 kB z 70 kB (nesplněno).** Na mobilu (360 × 780 px) první obrazovka opravdu používá 9 souborů písem. Předem se načítají jen 4 (53 kB) a ty se do rozpočtu počítaly dřív, což bylo příliš optimistické. Rozpočet zůstává a test `font files used above the fold on a phone fit the 70 kB budget` selhává. Rozhodne Martin (méně řezů nebo předčítání jen nejdůležitějších).
- **Posun při záměně písma:** záložní písma s upravenými metrikami od Fonts API drží jméno i odstavec na místě na 360, 480 a 1440 px v CS i EN (test `tests/e2e/font-swap.spec.ts`). Platí pro zařízení, kde existuje Arial (Windows, macOS, iOS). Samostatný test na 360 px nechává produkční `@font-face` beze změny a na tomto Linuxu (bez Arialu, záloha je DejaVu Sans) vychází posun 0 px, i když se šířka textu záměnou změní. Skutečný Android (Roboto) takhle změřit nejde, zůstává to v ručním `TODO` v README.

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
