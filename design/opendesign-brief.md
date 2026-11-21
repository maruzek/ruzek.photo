# Zadání pro OpenDesign: hledání směru webu Martin Růžek

Pro tři skilly: **Taste**, **Impeccable**, **Hallmark**. Každý skill navrhne **3 výrazně odlišné směry**, celkem tedy 9.

## Cíl této fáze
**Najít konkrétní směr, jak má web vypadat. Nestavět celý detailní web.**

Každý směr má ukázat svou myšlenku, typografii, barvy, práci s fotkami a pohyb natolik, aby se dalo rozhodnout, kterým směrem jít dál. Detailní stránky, všechny sekce a dotažený obsah přijdou až po výběru.

## Volná ruka
Agenti mají v designu **volnou ruku**. Všechno v části „Co se Martinovi líbí“ je **informace a inspirace, ne zadání**:
- Klidně to použij, přetvoř, nebo úplně vynech.
- Pokud máš lepší nápad, jdi za ním. Překvapení je vítané.
- Tři směry od jednoho skillu se mají od sebe opravdu lišit: myšlenkou, kompozicí, typografií i paletou, ne jen barvou.

## Co dodat za každý směr
1. **Název a jedna věta s myšlenkou směru.** Proč sedí právě k Martinovi.
2. **Úvodní sekce (hero)** na desktopu (1440 px) i mobilu (390 px).
3. **Dvě až tři ukázkové sekce,** které směr nejlépe vystihnou. Vyber si sám, třeba práce s galerií, služby, krátký příběh akce nebo poptávka.
4. **Krátký popis systému:** písma (proč), paleta, mřížka nebo kompozice, jak se pracuje s fotkami, jaký pohyb a přechody (stačí popsat nebo naznačit, nemusí být dotažené).
5. **Jak se v něm uplatní logo.** Animaci loga nenavrhovat, o té se rozhodne později.

---

## Kontext: kdo a pro koho
- **Martin Růžek**, fotograf akcí a sportu v Praze a Karlových Varech. Instagram **@ruzek.jpg**.
- **Značka:** hlavní je jméno, „ruzek.jpg“ slouží jako hravý podpis.
- **Hlavní byznys** jsou akce: firemní akce, konference, přednášky a debaty, univerzitní a spolkové akce, plesy, večírky, bary.
- **Sport** je vášeň a odlišení: fotbal, florbal, turnaje, závody. **Portréty** jsou doplněk.
- **Klienti:** firmy, eventové agentury, univerzity, spolky, sportovní kluby a organizátoři.
- **Silná stránka:** výběr fotek na sociální sítě ještě týž den a vertikální videa (reels).
- **Logo:** izometrický roh krychle z kosočtverečných dlaždic, který se k okrajům rozpadá. Existuje černá a šedá varianta (gradient), soubory jsou v `design/logo/`.
- **Jazyky:** web bude česky i anglicky. Pro návrhy stačí čeština.

## Co se Martinovi líbí (jen pro informaci)
- **Charakter:** odvážný, výrazný design v duchu webů z Awwwards, se zajímavými animacemi. Žádná šablona, má být jedinečný a rozpoznatelný. Fotky ale mají zůstat hlavní.
- **Typografie:** preferuje modernistický sans-serif, serify má rád jako akcent.
  - Rád by viděl vyzkoušené **Stack Sans Notch** (Google Fonts). Zářezy v písmenech mu ladí k příjmení Růžek a k logu.
  - K němu **Stack Sans Text**.
  - Pozor: Notch v malých velikostech a v delším textu působí rušivě, hodí se spíš na velké nadpisy.
  - Klidně ale navrhni úplně jiná písma.
- **Motivy, které ho zaujaly:**
  - sans-serifový text, ve kterém jsou vybraná slova v serifové kurzívě;
  - několik sloupců fotek vedle sebe, které se při scrollu pohybují (třeba 3–4 na desktopu);
  - sekce s jedinou fotkou doplněnou textem;
  - animované přechody mezi světlými a tmavými částmi stránky;
  - mřížka ve stylu kontaktního archu s vyznačeným výběrem, ale jen hodně přetvořená, ne doslovně.

## Pevná pravidla (platí vždy)
- **Nevymýšlet** reference, recenze, loga klientů, čísla ani citace. Kde chybí obsah, dát viditelný placeholder `TODO: …`.
- **Texty o Martinovi** brát jen z tohoto zadání.
- **Žádná fotografická technika** ani značky fotoaparátů.
- **Fotky** jsou zástupné, pokud v projektu nejsou nahrané Martinovy.
- **Žádné vložené příspěvky z Instagramu.**
- **Realizovatelnost:** výsledek se bude stavět v Astro s GSAP na Cloudflare. Navrhovat věci, které jdou postavit a budou rychlé i na mobilu. Pohyb musí mít variantu pro `prefers-reduced-motion`.

## Orientační ceny (jen kdyby je směr chtěl ukázat)
Ceny jsou „od“, Martin není plátce DPH:
- Akce: první hodina 1 500 Kč, každá další 1 000–1 200 Kč.
- Krátké focení: 1 500 Kč.
- Zápas: 1 500–2 500 Kč.
- Portrét: 1 500 Kč.
- Výběr na sítě týž den: příplatek 20–30 %.
- Vertikální videa: +1 000–2 000 Kč.

---

## Reference: načítání stránky z loga (volitelné)
Martin má vybraných 7 konceptů načítání, které vycházejí z loga. Jsou to přehratelné HTML prototypy ve složce `design/loader-concepts/concepts/`. Popisy jsou v `design/loader-concepts/concepts.json`, vybrané koncepty tam mají `"selected": true`.

| Soubor | Název | Charakter |
|---|---|---|
| `a-1.html` | Pole světla | světlé, celoplošné pole dlaždic se světlem, rozpad ditheringem do loga |
| `a-2.html` | Složená síť | z černé do světla, vyvolání negativu, síť se složí do izometrie |
| `b-1.html` | Práh | světlé, průběh načítání určuje hustotu ditheru, stažení do loga |
| `c-1.html` | Latentní obraz | tmavá mozaika, negativ loga, vyhoření od okrajů |
| `c-2.html` | Okno do fotky | dlaždice loga jako maska úvodní fotky, ponor do rohové dlaždice |
| `d-1.html` | Rejstřík 74 | světlé, švýcarské, poctivé počítadlo a přechod mezi stránkami ditheringem |
| `d-2.html` | Roh domů | tmavé, malý roh vlevo dole, který odletí do hlavičky |

- Načítání **není povinná součást** návrhu směru. Pokud se ale hodí, ukaž, jak by směr navázal na jeden nebo více konceptů, nebo navrhni vlastní variantu ve stejném duchu.
- Koncepty se dají kombinovat (vstup z jednoho, odchod z druhého) a web jich může mít i víc, třeba podle situace: první návštěva, přechod mezi stránkami, opakovaná návštěva.
- Všechny musí končit přesně na logu. Přesná data loga jsou v `design/logo/logo-tiles.json` a v SVG v `design/logo/`.

## Tipy k použití (pro Martina)
- **Nahraj do projektu 10–15 vlastních fotek** (akce, sport, jeden portrét) a obě loga z `design/logo/`. Se skutečnými fotkami se směry hodnotí mnohem líp.
- Pokud chceš, aby agenti viděli i načítání, nahraj jim soubory z `design/loader-concepts/concepts/` (kromě `b-2.html`) a `concepts.json`.
- Vzorník Stack Sans s českou diakritikou je v `research/stack-sans-specimen.png`.
- Každý skill spusť zvlášť a pokaždé vlož celé toto zadání.
- Hotové směry mi pošli. Porovnám je a navrhnu, který (nebo jakou kombinaci) rozpracovat do konceptu.
