# Fotky na webu

Přehled, která vlastní fotka je na kterém místě, odkud pochází a čím ji jde nahradit. Výběr vznikl 22. 11. 2026 z exportů v `private/photos-inbox/` (73 souborů). Podrobná triáž s hodnocením všech fotek a důvody vyřazení je jen lokálně v `private/photos-triage/` (tabule `board.html`, poznámky `README.md`).

Postup přidání fotky je v [README](../README.md#jak-přidat-fotku), umístění určuje `src/config/placement.ts`.

## Kde je která fotka

| Místo | Slug (`src/content/photos/`) | Zdroj | Ořez při importu | Náhradníci |
|---|---|---|---|---|
| Úvod (`hero`) | `ball-dance-red` | `IMG_5436` | | `IMG_6410`, `IMG_5925` |
| Fotka přes obrazovku: akce | `conference-speaker` | `text-remove.jpg` (`IMG_7167`, Martinova retuš bez textu na plátně) | | `IMG_5925`, `IMG_5952` |
| Fotka přes obrazovku: sport | `football-slide-tackle` | `IMG_4428` | `left=0.06,top=0.2` | `IMG_2211`, `IMG_1068` |
| Galerie: kontaktní arch | všech 19 fotek níže, pořadí a výběr v `PLACEMENT.work` | | | |
| Karta služby: akce | `conference-audience` | `IMG_6139` | | `IMG_8513`, `IMG_5925` |
| Karta služby: sport | `football-duel` | `IMG_0948` | | `IMG_1548`, `IMG_1973` |
| Karta služby: portrét | `portrait-street-peace` | `IMG_4124` | | `IMG_3828`, `IMG_4028` |
| Ještě ten den, krok 2 | `football-shoulder-run` | `IMG_4591` | | `IMG_4510`, `IMG_8731` |
| O mně | `martin-ruzek-portrait` | `profile/IMG_9844-Edit-2` | | `profile/IMG_3866-2`, `profile/IMG_4151` |

Galerie je kontaktní arch (prototyp 3, větev `proto/gallery-contact-sheet`). `PLACEMENT.work.sheet` určuje pořadí políček v archu, čísla snímků 01, 02, … z něj berou pořadí (počítají se jen zveřejněné fotky). `PLACEMENT.work.picks` vybírá 8 fotek, které se zvětší do rozvržení pod archem, každou do vlastního slotu `s1`–`s8`. Slot patří fotce: když se fotka stáhne (`published: false`), její slot zůstane prázdný a ostatní si drží svůj.

| Políčko | Slug | Zdroj | Zvětšená (slot) |
|---|---|---|---|
| 01 | `football-goalkeeper-dive` | `IMG_4386` | s1 |
| 02 | `gathering-table-smile` | `IMG_3724` | |
| 03 | `floorball-faceoff` | `IMG_9964` | s2 |
| 04 | `conference-group-photo` | `IMG_8513` | |
| 05 | `talk-speaker-microphone` | `IMG_1202` | s3 |
| 06 | `football-corner-crowd` | `IMG_1814` | |
| 07 | `ball-tiara-portrait` | `IMG_5429` | s4 |
| 08 | `football-header-jump` | `IMG_1548` | |
| 09 | `party-table-laugh` | `IMG_5952` | s5 |
| 10 | `football-team-huddle` | `IMG_2211` | |
| 11 | `street-newspapers` | `IMG_4197` | |
| 12 | `street-hat-flower` | `IMG_4028` | s6 |
| 13 | `football-arms-raised` | `IMG_1068` | |
| 14 | `party-beer-glance` | `IMG_5966` | s7 |
| 15 | `football-smile-touchline` | `IMG_4830` | |
| 16 | `ball-smile-through-crowd` | `IMG_6410` | |
| 17 | `floorball-shot-goalkeeper` | `IMG_0421` | s8 |
| 18 | `football-assistant-referee` | `IMG_1978` | |
| 19 | `floorball-goalkeeper-kneel` | `IMG_8731` | |

## Rezerva

Všech 11 fotek z rezervy (22. 11. 2026) je v kontaktním archu. Na výšku jsou 3 z 19: `floorball-faceoff`, `talk-speaker-microphone`, `floorball-goalkeeper-kneel`.

Zbývají `IMG_4505-2` a `IMG_4510`: v hledišti jsou poznatelné děti. Před zveřejněním je Martin rozmaže ručně, teprve pak se importují.

## Otevřené body

- **`conference-speaker` na mobilu:** fotka přes obrazovku se ořezává na střed, přednášející stojí vlevo, a tak mu na 360 px uřízne půlku obličeje. Ořez souboru to nespraví (na desktopu by se uřízla hlava). Řešením je ohnisko ořezu (`object-position`) u fotky v komponentě `PhotoFold`.
- **`IMG_3724`** čeká na Martinovo ověření. Kdyby nešla použít, v galerii ji nahradí `IMG_7350`.
- **Popisky:** políčko ukazuje jen číslo snímku. Kategorii a místo ukazuje lightbox, místo a datum zatím jako `TODO`. Pole `caption` se doplní, až je Martin dodá.

## Jak vyměnit fotku na místě

1. Zdroj je v `private/photos-inbox/` (exporty, nejsou v gitu).
2. `pnpm photos:import private/photos-inbox/IMG_xxxx.jpg --slug <anglický-slug-podle-obsahu>`, případně s `--crop left=…,top=…,right=…,bottom=…` (podíl strany, 0–1).
3. Doplňte YAML (alt česky i anglicky, `category`, `minors`, `shade`).
4. Změňte slug v `src/config/placement.ts` a starou fotku smažte (JPEG i YAML), pokud ji už nic nepoužívá.
5. U úvodu a fotek přes obrazovku spusťte `pnpm check:contrast`, pak `pnpm check` a `pnpm build`.
