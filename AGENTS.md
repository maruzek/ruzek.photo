# AGENTS.md

Pokyny pro AI agenty (Claude Code, Codex, OpenDesign a další), kteří pracují v tomto repozitáři. Platí pro celý projekt. Podrobnosti jsou v [`docs/`](docs/).

## Tools

Use `pnpm` for everything. Dont use npm

## Projekt v jedné větě

Portfolio a obchodní web fotografa **Martina Růžka** (Instagram `@ruzek.jpg`). Těžiště je focení akcí, odlišuje ho sport, portréty jsou doplněk. Web běží česky a anglicky na Cloudflare.

## Fáze projektu (stav k 2026-11-20)

1. ~~Brainstorm~~ hotovo
2. ~~Rozbor konkurence a inspirace~~ hotovo, viz [`research/`](research/) a [`docs/research.md`](docs/research.md)
3. **Průzkum vizuálu, aktuální fáze.** V OpenDesignu vzniká 9 směrů (úvodní sekce a 2–3 ukázkové sekce), ne celý web. Zadání je v [`design/opendesign-brief.md`](design/opendesign-brief.md).
4. Koncept a plán. Martin je musí schválit.
5. Implementace

**Kód aplikace se nepíše, dokud Martin výslovně neschválí koncept a plán.** Dokumentace, rešerše a návrhy kódem nejsou.

## Jak spolupracovat s Martinem

- Rozhodnutí, která patří jemu, nech na něm. Ptej se postupně, ne dvaceti otázkami najednou.
- Než něco navrhneš, podívej se do [`docs/decisions.md`](docs/decisions.md). Uzavřená rozhodnutí znovu neotevírej.
- **Animaci loga nenavrhuj sám.** Zeptej se ho na ni, až na ni dojde řeč.
- Když navrhuješ něco, co používá **cookies** nebo sledování, upozorni ho na to výslovně.
- Komunikuj česky. Kód, názvy souborů a commity piš anglicky.

## Veřejný repozitář

Repozitář je **veřejný**. Necommituj do něj:

- byznysovou strategii (cenová strategie, marže, plány akvizice klientů, interní úvahy o konkurenci);
- podrobná hodnocení nebo kritiku cizích webů a fotografů. Do repa smí jen obecná shrnutí a pozitivní zmínky o inspiraci;
- screenshoty cizích webů a cizí fotky;
- soubory písem, jejichž licence nedovoluje šíření (např. Fontshare);
- osobní údaje (e-mail, telefon) mimo to, co bude stejně veřejně na webu, a žádná tajemství (`.env`, `.dev.vars`).

Tyto materiály patří do `research/notes/`, `research/moodboard/` nebo `private/`. Všechny tři složky jsou v `.gitignore` a existují jen lokálně.

## Obsahová a právní pravidla (závazná)

- **Nevymýšlej** reference, recenze, loga klientů, čísla, statistiky ani citace. Kde chybí skutečný obsah, použij viditelný placeholder `TODO: …`.
- Texty o Martinovi piš **jen** z [`docs/brief.md`](docs/brief.md). Co je nejasné, označ `TODO`.
- Publikovat se smí jen fotky se **souhlasem klienta nebo pořadatele**, děti jen se **souhlasem rodičů**. Každou fotku musí jít rychle stáhnout z webu (jeden zásah v obsahu a nové nasazení).
- Při buildu **odstraň EXIF**, hlavně GPS. Případné „technická data fotky“ ukazuj jen bez polohy.
- Patička obsahuje jméno, `TODO: IČO` a `TODO: sídlo`. Web musí mít **zásady ochrany osobních údajů**.
- Měření jen bez cookies a bez cookie lišty: **Umami** a **Cloudflare Web Analytics**, načtené až po `load`. Žádné vložené příspěvky z Instagramu ani YouTube, protože nastavují cookies. Nástroj, který potřebuje souhlas (např. Google Analytics nebo Ads), jen po Martinově rozhodnutí a s lištou se souhlasem.
- Poptávkový formulář nemá zaškrtávátko souhlasu, jen větu s odkazem na zásady. Poptávky bez zakázky se po 12 měsících **anonymizují** (viz `docs/decisions.md`).
- Veřejný e-mail je `foto@martinruzek.cz`. Jiné Martinovy adresy do repa nepatří.
- **Nestav web kolem fotografické techniky.** Výbava se změní (plánovaný přechod na Sony), nezmiňuj značky ani modely.
- Klientské galerie řeší **Pixieset nebo Pic-Time**. Na webu se nestaví.

## Značka a design (dosavadní rozhodnutí)

- Hlavní je jméno **Martin Růžek**, `ruzek.jpg` slouží jako hravý podpis.
- **Logo:** izometrický roh krychle z kosočtverečných dlaždic, který se k okrajům rozpadá. Má černou a šedou (gradient) variantu, viz `design/logo/`.
- **Charakter:** velmi odvážný design v duchu Awwwards, animace přes GSAP. **Žádná šablona**, design musí být jedinečný.
- **Typografie:** modernistický sans-serif je hlavní, serif slouží jako akcent. Ke zkoušce jsou **Stack Sans Notch** (jen display ≥ 64 px), **Stack Sans Text** a serifová kurzíva pro zvýrazněná slova.
- **Oblíbené motivy** (jsou to inspirace, ne povinnosti; při hledání směru mají agenti volnou ruku):
    - 3–4 sloupce fotek pohyblivé scrollem;
    - sekce s jedinou fotkou a textem;
    - sans-serif text se slovy v serifové kurzívě;
    - animované přechody mezi světlými a tmavými sekcemi;
    - silně přetvořená mřížka kontaktního archu.
- Finální vizuální směr **zatím není rozhodnutý**.

## Technologie (plán, upřesní se v konceptu)

- **Astro** se statickým výstupem, **React islands** jen tam, kde jsou potřeba (kalkulačka, formulář).
- **TypeScript strict.** Čistý, typovaný kód bez zbytečných závislostí.
- **GSAP** (ScrollTrigger, SplitText, Flip), **Lenis** pro plynulé scrollování. Vždy respektovat `prefers-reduced-motion`.
- **Cloudflare:**
    - Pages/Workers pro hosting;
    - **D1** pro ukládání poptávek, anonymizace po 12 měsících;
    - odesílání e-mailu Martinovi a potvrzení klientovi;
    - **Turnstile** jako ochrana proti spamu;
    - Stream nebo R2 pro vertikální videa;
    - Web Analytics a k tomu Umami.
- **Obsah:** primárně v repozitáři (Astro content collections). Jestli fotky přesunout do R2, rozhodne koncept.
- **Ceník** je typovaný config jako jediný zdroj pravdy pro stránku s cenami, kalkulačku i JSON-LD.
- **SEO:**
    - lokální dotazy a JSON-LD (`LocalBusiness` / `Person`, `Offer`);
    - Open Graph, sitemap, robots.txt, canonical URL a `hreflang` CZ/EN;
    - české alt texty;
    - odkazy na Google profil firmy, Firmy.cz a Instagram.
- **Cíle kvality:**
    - Core Web Vitals v zelených hodnotách na mobilu;
    - WCAG 2.2 AA;
    - responzivní obrázky (AVIF/WebP, `srcset`, lazy loading).

## Struktura repozitáře

```
AGENTS.md                 tento soubor
CLAUDE.md                 odkaz na AGENTS.md pro Claude Code
README.md                 přehled projektu
docs/
  brief.md                zadání: služby, ceny, klienti, požadavky
  decisions.md            log rozhodnutí a otevřené otázky
  research.md             shrnutí rozboru konkurence a inspirací
design/
  opendesign-brief.md     zadání pro varianty v OpenDesignu (3 linie)
  logo/                   logo (černá a šedá varianta, PNG)
research/
  tools/                  skripty na screenshoty a sestavení boardu
  stack-sans-specimen.*   vzorník písma s českou diakritikou
  notes/                  jen lokálně (gitignore): podrobné rozbory, byznys
  moodboard/              jen lokálně (gitignore): moodboard, screenshoty
private/                  jen lokálně (gitignore): cokoli neveřejného
```

Kód aplikace (`src/`, `public/`, konfigurace) přibude až po schválení konceptu.

## Hotovo znamená (až začne implementace)

- Build projde, typová kontrola je bez chyb, lint je čistý.
- Stránka funguje na šířce 360 px bez vodorovného scrollu. Animace se vypnou při `prefers-reduced-motion`.
- Neexistuje vymyšlený obsah, chybějící místa jsou označená `TODO`.
- README vysvětluje, jak přidat fotky a změnit ceny.
- Na veřejném webu nejsou žádná EXIF/GPS data ani cookies bez upozornění.
