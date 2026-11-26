# Fotky na webu

Přehled, která vlastní fotka je na kterém místě, odkud pochází a čím ji jde nahradit. Výběr vznikl 22. 11. 2026 z exportů v `private/photos-inbox/` (73 souborů). Podrobná triáž s hodnocením všech fotek a důvody vyřazení je jen lokálně v `private/photos-triage/` (tabule `board.html`, poznámky `README.md`).

Postup přidání fotky je v [README](../README.md#jak-přidat-fotku), umístění určuje `src/config/placement.ts`.

## Kde je která fotka

| Místo | Slug (`src/content/photos/`) | Zdroj | Ořez při importu | Náhradníci |
|---|---|---|---|---|
| Úvod (`hero`) | `ball-dance-red` | `IMG_5436` | | `IMG_6410`, `IMG_5925` |
| Fotka přes obrazovku: akce | `conference-speaker` | `text-remove.jpg` (`IMG_7167`, Martinova retuš bez textu na plátně) | | `IMG_5925`, `IMG_5952` |
| Fotka přes obrazovku: sport | `football-slide-tackle` | `IMG_4428` | `left=0.06,top=0.2` | `IMG_2211`, `IMG_1068` |
| Galerie: kontaktní arch | 18 fotek níže, pořadí a výběr v `PLACEMENT.work` | | | |
| Karta služby: akce | `conference-group-photo` | `IMG_8513` | | `IMG_6139`, `IMG_5925` |
| Karta služby: sport | `football-duel` | `IMG_0948` | | `IMG_1548`, `IMG_1973` |
| Karta služby: portrét | `portrait-street-peace` | `IMG_4124` | | `IMG_3828`, `IMG_4028` |
| Ještě ten den (časová osa) | 19 fotek jedné konference, viz [níže](#časová-osa-ještě-ten-den) | | | |
| O mně | `martin-ruzek-portrait` | `profile/IMG_9844-Edit-2` | | `profile/IMG_3866-2`, `profile/IMG_4151` |

Galerie je kontaktní arch (prototyp 3, větev `proto/gallery-contact-sheet-v2`). `PLACEMENT.work.sheet` určuje pořadí políček v archu, čísla snímků 01, 02, … z něj berou pořadí (počítají se jen zveřejněné fotky). `PLACEMENT.work.picks` vybírá 8 fotek, které se zvětší do rozvržení pod archem, každou do vlastního slotu `s1`–`s8`. Slot patří fotce: když se fotka stáhne (`published: false`), její slot zůstane prázdný a ostatní si drží svůj.

| Políčko | Slug | Zdroj | Zvětšená (slot) |
|---|---|---|---|
| 01 | `conference-audience` | `IMG_6139` | |
| 02 | `talk-speaker-microphone` | `IMG_1202` | s2 |
| 03 | `football-team-huddle` | `IMG_2211` | |
| 04 | `football-goalkeeper-dive` | `IMG_4386` | s1 |
| 05 | `football-smile-touchline` | `IMG_4830` | |
| 06 | `ball-smile-through-crowd` | `IMG_6410` | |
| 07 | `ball-tiara-portrait` | `IMG_5429` | s4 |
| 08 | `football-header-jump` | `IMG_1548` | |
| 09 | `football-arms-raised` | `IMG_1068` | |
| 10 | `gathering-table-smile` | `IMG_3724` | |
| 11 | `party-table-laugh` | `IMG_5952` | s5 |
| 12 | `party-beer-glance` | `IMG_5966` | s7 |
| 13 | `floorball-faceoff` | `IMG_9964` | s3 |
| 14 | `floorball-goalkeeper-kneel` | `IMG_8731` | |
| 15 | `floorball-shot-goalkeeper` | `IMG_0421` | s8 |
| 16 | `street-newspapers` | `IMG_4197` | |
| 17 | `street-hat-flower` | `IMG_4028` | s6 |
| 18 | `football-corner-crowd` | `IMG_1814` | |

Pořadí jde po focení jako na skutečném filmu: diskuse, zápas, ples, zápas, večírek, florbal, ulice, zápas. Vybrané snímky tak v archu leží nepravidelně. Rozvržení začíná zápasem vedle diskuse (nadpis slibuje „akce a zápasy“) a dál se střídá. 18 políček vyplní celé řady při 9, 6 i 3 sloupcích. Snímky na výšku stojí v archu rovně, oříznuté na políčko 3:2 (výřez sedí na 40 % výšky, u jednotlivé fotky jde posunout přes `--cs-focus`). Když vybraný snímek odlétá, výřez se rozbalí na celou fotku.

## Časová osa „Ještě ten den“

Fotky v sekci určuje `PLACEMENT.sameDay`. Všechny patří k **jedné akci**. `conference-audience` je z jiné akce, na osu nesmí.

| Slug | Zdroj | Na ose |
|---|---|---|
| `conference-thumbs-up` | `IMG_7152` | záběr |
| `conference-speaker` | `IMG_7167` (Martinova retuš) | záběr a výběr |
| `conference-listening` | `IMG_7173` | záběr |
| `conference-row` | `IMG_7178` | záběr |
| `conference-attentive-profile` | `IMG_7200` | záběr |
| `conference-street-conversation` | `IMG_7268` | záběr |
| `conference-table-talk` | `IMG_7332` | záběr |
| `conference-discussion` | `IMG_7350` | záběr a výběr |
| `conference-focused-discussion` | `IMG_7379` | záběr |
| `conference-table-smile` | `IMG_7399` | záběr |
| `conference-blue-suit` | `IMG_7647` | záběr |
| `conference-clasped-hands` | `IMG_7725` | záběr |
| `conference-banner-speech` | `IMG_7758` | záběr |
| `conference-lectern-laugh` | `IMG_8057` | záběr |
| `conference-laughing-glasses` | `IMG_8121` | záběr |
| `conference-chin-rest` | `IMG_8145` | záběr |
| `conference-bearded-laugh` | `IMG_8158` | záběr |
| `conference-slat-wall-portrait` | `IMG_8387` | záběr |
| `conference-group-photo` | `IMG_8513` | záběr a výběr |

Tabulka jde podle času pořízení (11.–12. 4. 2026), stejně jako chvíle ve `frames`. Nové fotky z 26. 11. 2026 mají zdroj v `private/photos-inbox/same-day/`.

Výměna fotek:

1. Importujte fotky a doplňte YAML jako u každé jiné (postup dole).
2. V `frames` je šest chvil akce zleva doprava, do každé se vejde 5, 7, 5, 9, 6 a 8 fotek. Každou fotku napište do chvíle, kdy vznikla. `focus` je místo obličeje (stejné hodnoty jako `object-position`), `zoom` výřez přiblíží.
3. V `picks` jsou nejvýš tři fotky pro velký výběr: dvě na výšku, třetí na šířku. Musí být i ve `frames`, tam dostanou korálový rámeček.

Osa drží tvar se 6 až 40 fotkami, chybějící políčka doplní jiné výřezy stejných fotek. **Ideál je 16–20 různých fotek**: každá se objeví jen párkrát a stahování zůstane malé (miniatura má zhruba 4–12 kB a stáhne se jen jednou pro graf i zeď). Víc fotek už je vidět málo. Zeď s celou galerií se skládá ze stejných fotek sama. Stažená fotka (`published: false`) z osy zmizí, zbytek se přerovná. Banner na skupinové fotce může zůstat vidět.

## Rezerva

`football-shoulder-run` (`IMG_4591`) je zveřejněná, ale teď není na žádném místě (dřív krok 2 v „Ještě ten den“). Náhradníci na stejné místo: `IMG_4510`, `IMG_8731`.

`football-assistant-referee` (`IMG_1978`) je zveřejněná, ale arch ji teď vynechává (`PLACEMENT.work.reserve`), aby řady vyšly celé. Vrátí se, až budou hotové `IMG_4505-2` a `IMG_4510` (20 políček vyplní 10, 5 i 4 sloupce, jen se upraví počty sloupců ve `work.css`). Na výšku jsou 3 z 18: `talk-speaker-microphone`, `floorball-faceoff`, `floorball-goalkeeper-kneel`.

Zbývají `IMG_4505-2` a `IMG_4510`: v hledišti jsou poznatelné děti. Před zveřejněním je Martin rozmaže ručně, teprve pak se importují.

## Otevřené body

- **`IMG_7639`** (podpis listiny delegátů, `private/photos-inbox/same-day/`) není importovaná: na listině jsou čitelná jména a podpisy. Před zveřejněním je potřeba je rozmazat, pak patří do čtvrté chvíle před `conference-blue-suit`.
- **`IMG_3724`** čeká na Martinovo ověření. Náhradník `IMG_7350` už je na časové ose „Ještě ten den“ (`conference-discussion`), takže kdyby nešla použít, je potřeba vybrat jiný.

Mobilní ohniska pro `conference-speaker` (přednášející), `ball-dance-red` (zaostřená tanečnice) a `football-slide-tackle` (souboj) určuje `MOBILE_PHOTO_POSITION` v `src/config/placement.ts`. Úvodní fotka sdílí výřez s ASCII vrstvou. Políčko ukazuje číslo snímku a lightbox zobrazuje číslo, kategorii a případný popisek.

## Jak vyměnit fotku na místě

1. Zdroj je v `private/photos-inbox/` (exporty, nejsou v gitu).
2. `pnpm photos:import private/photos-inbox/IMG_xxxx.jpg --slug <anglický-slug-podle-obsahu>`, případně s `--crop left=…,top=…,right=…,bottom=…` (podíl strany, 0–1).
3. Doplňte YAML (alt česky i anglicky, `category`, `minors`, `shade`).
4. Změňte slug v `src/config/placement.ts` a starou fotku smažte (JPEG i YAML), pokud ji už nic nepoužívá.
5. U úvodu a fotek přes obrazovku spusťte `pnpm check:contrast`, pak `pnpm check` a `pnpm build`.
