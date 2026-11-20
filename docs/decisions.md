# Rozhodnutí

Uzavřená rozhodnutí se znovu neotevírají, pokud to Martin sám nenavrhne. Nové záznamy přidávej nahoru s datem.

## Otevřené otázky
| Otázka | Stav / poznámka |
|---|---|
| Vizuální směr | Čeká se na varianty z OpenDesignu ([design/opendesign-brief.md](../design/opendesign-brief.md)) |
| Mřížka „kontaktní arch“ | Líbí se, ale musí být výrazně přetvořená. Ověřit, jestli šlo o mřížku ze směru A, nebo o izometrickou ze směru D |
| Stack Sans Notch | Zkouší se. Argumenty: v malých velikostech působí jako chyba, má jinou geometrii než logo, pochází z rebrandingu Stack Overflow, je zdarma. Doporučení: jen display ≥ 64 px. Pro porovnání vzniká i varianta bez něj |
| Serifový akcent | Kandidáti jsou Newsreader, Fraunces a Instrument Serif (vše kurzíva) |
| Animace loga | Martin zatím neví. **Nenavrhovat sám**, zeptat se ho |
| Fotky v repozitáři, nebo v R2 | Primárně repozitář. R2 jen tam, kde to dává smysl, rozhodne koncept |
| Podoba ceníku | Hodinové ceny, nebo balíčky? Řeší se mimo repozitář |
| Využití `martinruzek.cz` | Zatím neurčeno (přesměrování na .eu?) |

## Rozhodnuto

### 2026-11-20: po moodboardu
- Varianty designu vzniknou v OpenDesignu pomocí skillů Taste, Impeccable a Hallmark, každý ve 3 liniích: Arch, Zápas, Text jako obraz.
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
