# Rozpad: předávka finálního směru

Vybraný vizuální směr webu (2026-11-20). Prototyp vznikl v OpenDesignu a slouží jako **vizuální a pohybová reference** pro Astro web. Není to produkční kód. Komponenty se mají postavit znovu podle [`AGENTS.md`](../../../AGENTS.md) a schváleného konceptu.

## Jak prototyp otevřít
ASCII efekt čte pixely fotky, a to prohlížeč povolí jen přes HTTP, ne ze `file://`. Spusť server ve složce:

```bash
cd design/final/rozpad && python3 -m http.server 8080
# pak http://localhost:8080
```

Ze `file://` stránka funguje, jen místo ASCII úvodu ukáže obyčejnou fotku.

## Soubory
| Soubor | Co obsahuje |
|---|---|
| `index.html` | Celá stránka: markup, CSS proměnné a styly sekcí |
| `assets/rozpad.js` | ASCII úvod, jemný dithering fotek, ditheringové přechody, choreografie GSAP, lightbox |
| `assets/r2.js` | Poptávkový formulář: validace a orientační odhad ceny. Jeho ditheringová část se tu nepoužívá |
| `assets/base.css` | Reset, rozvržovací primitiva, `.todo` a `.ph-tag` (označení zástupných fotek) |
| `assets/logo/` | Logo, černá a šedá varianta (kopie z `design/logo/`) |
| `assets/stock/` | **Zástupné** fotky CC0 (StockSnap, Flickr) a `credits.json`. Nahradit Martinovými |

## Design tokeny
**Barvy**
| Token | Hodnota | Použití |
|---|---|---|
| `--night` | `#07080B` | Tmavé plochy, krytí ditheru |
| `--ink` | `#E9EAEE` | Text na tmavé |
| `--muted` | `#A3A8B2` | Sekundární text na tmavé |
| `--light` | `#F2F2F3` | Světlé plochy |
| `--light-ink` | `#0B0C10` | Text na světlé |
| `--light-muted` | `#50545C` | Sekundární text na světlé |
| `--accent` | `#FF7A66` | Korál: hlavní tlačítko, hrana „vyvolávání“ v ditheru, značky. Šetřit, nikdy jako plocha |
| `--accent-ink` | `#1A0703` | Text na korálu |
| `--ok` / `--err` | `#1F6B45` / `#B3352A` | Stavy formuláře |

**Písma**
- **Stack Sans Notch 700:** jen jméno „Martin Růžek“ a velká čísla, vždy od 64 px.
- **Stack Sans Text 400/500/600:** všechno ostatní, titulky sekcí v řezu 600.
- **Crimson Pro Italic:** jedno nebo dvě zvýrazněná slova v titulku (`<em class="s">`).
- **Geist Mono:** popisky, indexy, štítky (verzálky, prostrkání 0,06em).
- V Astru je potřeba písma hostovat lokálně, např. přes `@fontsource`. U každého písma ověřit licenci, než se soubory commitnou: repo je veřejné.

**Velikosti a rytmus**
- Text 16 px, větší odstavce 18–21 px, titulky sekcí `clamp(40px, 4.8vw, 80px)`, jméno `clamp(76px, 13.6vw, 240px)`.
- Okraje `clamp(20px, 3.4vw, 56px)`, svislý rytmus sekcí `clamp(96px, 11vw, 184px)`.
- Rohy ostré (0 px), u štítků 24 px.

## Struktura stránky (pořadí)
1. **Header:** pevný, přes `mix-blend-mode: difference`, schová se při scrollu dolů.
2. **Hero:** fotka a ASCII canvas, jméno, popis, CTA, `@ruzek.jpg`.
3. **Pás typů akcí:** nekonečný marquee.
4. **Dvě fotografické sekce:** Akce a Sport, přes celou obrazovku, dithering.
5. **Ditheringový přechod** do světlé části.
6. **Vybraná práce:** asymetrická mřížka 8 fotek s lightboxem.
7. **Služby a ceny:** 3 karty a 2 příplatky. Ceny jsou z `docs/brief.md`.
8. **Týž den:** 3 kroky, na desktopu připnuté s linkou průběhu.
9. **O mně:** tmavá sekce, portrét s ditheringem.
10. **Poptávka:** formulář a orientační odhad ceny.
11. **Patička:** velké jméno, kontakty, IČO, sídlo, zásady ochrany údajů.

## Efekty a jak je přenést
| Efekt | Prototyp | Astro |
|---|---|---|
| **ASCII úvod** | Canvas: fotka navzorkovaná do mřížky znaků (`' .,:;-=+*#%@'`, buňka 10 px, na mobilu 8 px). Při načtení se znaky rozpustí do fotky podle Bayerovy matice 8×8 (2,4 s). Kurzor otevírá ASCII lupu (poloměr 190 px), na dotykových zařízeních lupa pomalu bloudí sama. Při odjezdu z úvodu se fotka vrací do znaků | Komponenta `AsciiHero.astro` a skript (bez Reactu). Fotka ze stejné domény. Pozastavit mimo viewport. DPR omezit na 1,5 |
| **Dithering fotek** | Canvas přes `<img>`, ImageData, buňka 9 px (mobil 6 px), Bayer 8×8 a radiální posun. Složí se při vjezdu a rozpadne při odjezdu, na hraně korálový pás | `DitherImage.astro` (atribut `data-dz`, režim `hover` u karet služeb) |
| **Přechody tma/světlo** | Canvas `dwipe`, vzor posouvaný scrollem | `DitherWipe.astro` |
| **Jméno a titulky** | GSAP SplitText: znaky nebo řádky v masce, `expo.out` | Stejně, GSAP z npm. SplitText je od verze 3.13 zdarma |
| **Fotografické sekce** | ScrollTrigger scrub: zmenšení 1,16 → 1, posun popisku | Stejně |
| **Pás typů akcí** | GSAP loop, rychlost podle rychlosti scrollu | Stejně |
| **Týž den** | ScrollTrigger pin (jen desktop) a linka průběhu | Stejně (`gsap.matchMedia`) |
| **Plynulý scroll** | Lenis, napojený na `gsap.ticker` | Stejně |
| **Magnetická tlačítka a kurzor nad fotkami** | `gsap.quickTo`, jen pro jemný ukazatel (myš) | Stejně |
| **Lightbox** | Nativní `<dialog>`, šipky, Esc, návrat fokusu | Malá komponenta. Funguje i bez JS frameworku |

**Omezený pohyb (`prefers-reduced-motion`):** žádné ASCII, Lenis, pin ani scrub. Fotky jsou celé a statické, přechody statický vzor, všechno je vidět. **Bez GSAP:** stránka je celá viditelná. Animace se nastavují až z JS.

## Co je jen v prototypu
- GSAP a Lenis se načítají z CDN. V Astru přijdou z npm do bundle.
- Formulář nic neodesílá. V Astru: React island, Cloudflare D1, Turnstile, e-mail Martinovi a potvrzení klientovi.
- Ceny jsou natvrdo v HTML. V Astru z typovaného configu ceníku (jediný zdroj pro stránku, kalkulačku i JSON-LD).
- Fotky mají jen 960 px. V Astru `astro:assets` se `srcset` a AVIF/WebP, EXIF bez GPS.
- Logo je vložené jako inline SVG. Animaci loga ani načítací obrazovku směr neřeší, rozhodne o nich Martin později.

## Otevřené TODO
- Martinovy fotky: hero, akce, sport, galerie a portrét do „O mně“.
- Popisky fotek (akce, místo) a souhlas s publikací každé fotky.
- Kontakt: e-mail, telefon, WhatsApp.
- IČO, sídlo, zásady ochrany osobních údajů a doba uchování poptávek.
- Martinův vlastní příběh do „O mně“.
- Termín dodání celé galerie.
- Anglická verze textů.

## Rizika k ověření v konceptu
- Výkon canvasů na slabších telefonech: ASCII vykresluje až kolem 10 000 znaků na snímek, ale jen během přechodů.
- Lenis spolu s pinem a lightboxem (při otevřeném dialogu zastavit scroll).
- Kontrast textu přes fotky závisí na skutečných fotkách. Ztmavení (`.shade`) bude možná potřeba ladit.
