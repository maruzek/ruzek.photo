# Zadání pro OpenDesign: varianty webu Martin Růžek

Pro tři skilly: **Taste**, **Impeccable**, **Hallmark**. Každý skill udělá **3 návrhy**, jeden v každé ze tří linií níže, takže vznikne 9 návrhů. Každá linie tak má tři interpretace a skilly se dají férově porovnat.

Postup: pro každý skill vlož **společné zadání** a k němu blok **jedné linie**. Ideálně jeden běh na jeden návrh, tedy 9 běhů.

---

## Společné zadání (vložit do každého běhu)

### Kdo a pro koho
- **Martin Růžek**, fotograf akcí a sportu, Praha a Karlovy Vary.
- Instagram **@ruzek.jpg**. Značka: jméno je hlavní, „ruzek.jpg“ slouží jako hravý podpis.
- **Hlavní byznys** jsou akce: firemní akce, konference, přednášky a debaty, univerzitní a spolkové akce, plesy, večírky, bary.
- **Sport** je vášeň a háček, kterým se odliší: fotbal, florbal, turnaje, závody.
- **Doplněk:** portréty.
- **Klienti:** firmy, eventové agentury, univerzity, spolky, sportovní kluby, organizátoři.
- **Unikátní nabídka:** výběr fotek na sociální sítě ještě týž den a vertikální videa (reels).
- Web je **česky i anglicky** (přepínač CZ/EN).

### Charakter
- **Velmi odvážný design**, v duchu Awwwards: výrazná typografie, promyšlený pohyb (GSAP, ScrollTrigger, plynulé scrollování).
- Fotky musí zůstat hlavní hvězdou.
- **Žádná šablona.** Design musí být jedinečný a rozpoznatelný, nesmí působit jako Squarespace, Framer šablona ani generický web „vytvořený AI“.
- Hlavní linie je **modernistická (sans-serif)**. Serif se používá jako **akcent**.

### Písma (povinné k vyzkoušení)
- **Stack Sans Notch** (Google Fonts, 200–700): výhradně pro display a velké nadpisy, ideálně od 64 px výš. Zářezy v písmenech působí v menších velikostech a v delším textu rušivě.
- **Stack Sans Text**: běžný text a UI.
- **Serifový akcent:** jednotlivá slova v kurzívě uvnitř sans-serif textu (viz níže). Kandidáti jsou Newsreader Italic, Fraunces Italic nebo Instrument Serif Italic. Lze navrhnout i jiný, s výjimkou Playfair. Stack Sans nemá kurzívu, takže serifová kurzíva roli kurzívy přirozeně přebírá.

### Povinné komponenty (každý návrh je musí obsahovat)
1. **Sloupce fotek pohyblivé scrollem**
   - Na desktopu 3–4 svislé sloupce vedle sebe, každý jede jinou rychlostí, případně opačným směrem.
   - Na mobilu 1–2 sloupce.
   - Může tvořit hero nebo samostatnou sekci.
2. **Sekce s jedinou fotkou doplněnou textem**
   - Jedna velká fotka a krátký text, třeba příběh akce nebo citát organizátora (`TODO`).
   - Volit lze klidnou, editoriální kompozici.
3. **Textový blok s míchanými písmy**
   - Velký odstavec v sans-serif, ve kterém jsou vybraná slova v serifové kurzívě.
   - Příklad: „Fotím akce, kde se něco *děje*. Konference, plesy, zápasy a výběr na sítě máte *ještě týž večer.*“
   - Tohle je klíčový motiv značky, ne jednorázový efekt.
4. **Animované přechody mezi světlými a tmavými částmi**
   - Pozadí se při scrollu přelije, prolne maskou nebo „otočí“.
   - Platí od jasné sekce k tmavé a zpět.
5. **Logo**
   - Izometrický roh krychle z kosočtverečných dlaždic, který se k okrajům rozpadá. Existuje černá a šedá (gradient) varianta.
   - Logo se používá staticky. Animaci loga **nenavrhovat**, o té se rozhodne později.
6. **Služby a ceny jako produkt**
   - Ceny jsou orientační a uvádějí se jako „od“, Martin není plátce DPH:
     - Akce: první hodina 1 500 Kč, každá další 1 000–1 200 Kč. Úpravy a online galerie do 3–5 dnů.
     - Krátké focení do 1 h: 1 500 Kč, 15–25 fotek do 2–3 dnů.
     - Expres (výběr na sítě týž den): +20–30 %.
     - Zápas nebo turnaj: 1 500–2 500 Kč, 30–50 fotek do 24 h, sezónní sleva.
     - Portrét: 1 500 Kč za 45–60 min, 8–10 fotek.
     - Video: +1 000–2 000 Kč za 1–3 vertikální videa.
   - Stačí ukázat náznak kalkulačky, která předvyplní poptávku.
7. **Poptávka**
   - Pole: typ akce, datum, čas od–do, místo, počet lidí, požadované výstupy.
   - Dále souhlas se zpracováním údajů (GDPR) a telefon/WhatsApp.
8. **Patička**
   - Jméno, `TODO: IČO`, `TODO: sídlo`, odkaz na zásady ochrany osobních údajů, Instagram.

### Mřížka
Martinovi se líbila mřížka ve stylu **kontaktního archu** (fotky v rastru s ručně zakroužkovaným výběrem). Musí ale být **výrazně přetvořená**, ne doslovný kontaktní arch: rozbitá, s měnícím se měřítkem, propojená s pohybem a typografií.

### Obsahová pravidla (závazná)
- Nevymýšlet reference, recenze, loga klientů, čísla ani citace. Kde chybí obsah, použít viditelný placeholder `TODO: …`.
- Texty o Martinovi psát jen z tohoto zadání: student VŠE (informatika) a webový vývojář, což má být zmíněno jen okrajově.
- Žádná fotografická technika ani značky fotoaparátů, protože se bude měnit.
- Fotky jsou zástupné, pokud nejsou nahrané v projektu. Pak použít nahrané fotky.
- Žádné cookies ani vložené příspěvky z Instagramu.

### Technické mantinely pro realismus
- Výsledek se bude stavět v **Astro + GSAP** na **Cloudflare**, takže navrhovat věci, které jdou postavit bez těžkého WebGL na každé stránce.
- Respektovat `prefers-reduced-motion`.
- Mobil je plnohodnotný, ne zmenšený desktop.

---

## Linie 1: „Arch“ (světlá převaha, mřížka)

- Převážně světlý papír, zhruba #F2F1EE, s jednou ostrou akcentní barvou podle návrhu.
- **Stack Sans Notch** je dominantní v obřích velikostech. Serif jen ve vzácných akcentech.
- Kontaktní arch je přetvořený v **modulární editoriální mřížku**:
  - značky výběru (kroužek, rámeček, číslo snímku) jako grafický systém napříč webem;
  - sloupce fotek jako „pás negativu“, který se scrollem posouvá.
- Tmavé části vstupují jen 1–2krát, například u sportu, s výrazným animovaným přechodem.
- Nálada: přesná, inteligentní, „vývojářsky čistá“, ale ne sterilní.

## Linie 2: „Zápas“ (tmavá převaha, energie)

- Převážně tma (téměř černá) se světlými vložkami. Přechody světlo/tma jsou hlavní dramaturgie stránky.
- Sport a večerní akce: reflektory, rychlost, výsledková tabule nebo časomíra jako typografický prvek, ne jako ilustrace.
- **Hero tvoří sloupce fotek**, 4 sloupce v různých rychlostech, přes ně obří jméno v Notch.
- Serif dává nečekaný kontrast uprostřed agresivní sans-serif typografie.
- Nálada: hlasitá, rytmická, sebevědomá. Pořád ale musí být důvěryhodná pro firemního klienta.

## Linie 3: „Text jako obraz“ (editoriál, nejvíc serifu)

- Typografický manifest: stránku nese **velký sans-serif text s serifovými slovy**, střídaný se **sekcemi s jedinou velkou fotkou**.
- Nejvíc prostoru pro serif, ale stále jako akcent uvnitř sans-serif textu, ne jako hlavní písmo.
- **Kontrolní varianta:** v této linii zkusit display i **bez Notch**, tedy Stack Sans Headline/Text a serif, aby šlo porovnat, co Notch přináší.
- Teplejší paleta (lomená bílá, hluboká tmavá, jedna tlumená akcentní barva). Pomalejší, elegantnější pohyb.
- Nálada: magazín, prémiový dojem pro firmy a agentury, klidná sebejistota.

---

## Tipy k použití
- **Nahraj do OpenDesign projektu 10–15 vlastních fotek** (akce, sport, jeden portrét). Se skutečnými fotkami vypadají návrhy úplně jinak než se šedými plochami a líp se soudí kontrast i barvy.
- Nahraj i obě PNG loga: `design/logo/logo-black.png` a `logo-grey.png`.
- Vzorník Stack Sans s českou diakritikou a třemi serifovými párováními: `research/stack-sans-specimen.png`.
- Po vygenerování mi pošli odkazy nebo exporty. Projdu je, porovnám s rozborem konkurence a navrhnu finální směr (klidně kombinaci).
