# Fotky na webu

Přehled, která vlastní fotka je na kterém místě, odkud pochází a čím ji jde nahradit. Výběr vznikl 22. 11. 2026 z exportů v `private/photos-inbox/` (73 souborů). Podrobná triáž s hodnocením všech fotek a důvody vyřazení je jen lokálně v `private/photos-triage/` (tabule `board.html`, poznámky `README.md`).

Postup přidání fotky je v [README](../README.md#jak-přidat-fotku), umístění určuje `src/config/placement.ts`.

## Kde je která fotka

| Místo | Slug (`src/content/photos/`) | Zdroj | Ořez při importu | Náhradníci |
|---|---|---|---|---|
| Úvod (`hero`) | `ball-dance-red` | `IMG_5436` | | `IMG_6410`, `IMG_5925` |
| Fotka přes obrazovku: akce | `conference-speaker` | `text-remove.jpg` (`IMG_7167`, Martinova retuš bez textu na plátně) | | `IMG_5925`, `IMG_5952` |
| Fotka přes obrazovku: sport | `football-slide-tackle` | `IMG_4428` | `left=0.06,top=0.2` | `IMG_2211`, `IMG_1068` |
| Galerie w1 | `football-goalkeeper-dive` | `IMG_4386` | | `IMG_1814`, `IMG_4505-2` |
| Galerie w2 | `gathering-table-smile` | `IMG_3724` | | `IMG_7350`, `IMG_6410` |
| Galerie w3 | `floorball-faceoff` | `IMG_9964` | | `IMG_8731`, `IMG_0421` |
| Galerie w4 | `party-table-laugh` | `IMG_5952` | | `IMG_4197`, `IMG_5429` |
| Galerie w5 | `football-team-huddle` | `IMG_2211` | | `IMG_2195`, `IMG_1068` |
| Galerie w6 | `talk-speaker-microphone` | `IMG_1202` | | `IMG_8513`, `IMG_4124` |
| Galerie w7 | `football-assistant-referee` | `IMG_1978` | | `IMG_4830`, `IMG_4510` |
| Galerie w8 | `party-beer-glance` | `IMG_5966` | | `IMG_6410`, `IMG_5429` |
| Karta služby: akce | `conference-audience` | `IMG_6139` | | `IMG_8513`, `IMG_5925` |
| Karta služby: sport | `football-duel` | `IMG_0948` | | `IMG_1548`, `IMG_1973` |
| Karta služby: portrét | `portrait-street-peace` | `IMG_4124` | | `IMG_3828`, `IMG_4028` |
| Ještě ten den, krok 2 | `football-shoulder-run` | `IMG_4591` | | `IMG_4510`, `IMG_8731` |
| O mně | `martin-ruzek-portrait` | `profile/IMG_9844-Edit-2` | | `profile/IMG_3866-2`, `profile/IMG_4151` |

Pořadí v galerii odpovídá slotům w1–w8. Slot patří fotce: když se fotka stáhne (`published: false`), její místo zůstane prázdné a ostatní fotky si drží svou velikost.

## Rezerva pro větší galerii

11 fotek z rezervy je naimportovaných (22. 11. 2026) a v `placement.ts` jsou jako `reserve`. Žádné rozvržení je zatím neukazuje, slouží prototypům galerie (kontaktní arch, sloupce). S galerií je to 19 fotek, z toho 1 na výšku (`floorball-goalkeeper-kneel`).

| Slug | Zdroj | Kategorie |
|---|---|---|
| `ball-smile-through-crowd` | `IMG_6410` | akce |
| `ball-tiara-portrait` | `IMG_5429` | akce |
| `street-newspapers` | `IMG_4197` | akce |
| `street-hat-flower` | `IMG_4028` | akce |
| `conference-group-photo` | `IMG_8513` | akce |
| `football-corner-crowd` | `IMG_1814` | sport |
| `football-header-jump` | `IMG_1548` | sport |
| `football-smile-touchline` | `IMG_4830` | sport |
| `football-arms-raised` | `IMG_1068` | sport |
| `floorball-shot-goalkeeper` | `IMG_0421` | sport |
| `floorball-goalkeeper-kneel` | `IMG_8731` | sport |

Zbývají `IMG_4505-2` a `IMG_4510`: v hledišti jsou poznatelné děti. Před zveřejněním je Martin rozmaže ručně, teprve pak se importují.

## Otevřené body

- **`conference-speaker` na mobilu:** fotka přes obrazovku se ořezává na střed, přednášející stojí vlevo, a tak mu na 360 px uřízne půlku obličeje. Ořez souboru to nespraví (na desktopu by se uřízla hlava). Řešením je ohnisko ořezu (`object-position`) u fotky v komponentě `PhotoFold`.
- **`IMG_3724`** čeká na Martinovo ověření. Kdyby nešla použít, v galerii ji nahradí `IMG_7350`.
- **Popisky:** místo a datum zatím ukazuje mřížka jako `TODO`. Pole `caption` se doplní, až je Martin dodá.

## Jak vyměnit fotku na místě

1. Zdroj je v `private/photos-inbox/` (exporty, nejsou v gitu).
2. `pnpm photos:import private/photos-inbox/IMG_xxxx.jpg --slug <anglický-slug-podle-obsahu>`, případně s `--crop left=…,top=…,right=…,bottom=…` (podíl strany, 0–1).
3. Doplňte YAML (alt česky i anglicky, `category`, `minors`, `shade`).
4. Změňte slug v `src/config/placement.ts` a starou fotku smažte (JPEG i YAML), pokud ji už nic nepoužívá.
5. U úvodu a fotek přes obrazovku spusťte `pnpm check:contrast`, pak `pnpm check` a `pnpm build`.
