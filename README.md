# Martin Růžek: fotograf akcí a sportu

Portfolio a obchodní web fotografa Martina Růžka (`@ruzek.jpg`), Praha a Karlovy Vary.

> **Stav:** koncept a plán jsou schválené (2026-11-21). Probíhá implementace na větvi `feat/rozpad-astro`.

## Cíl webu
- Získávat poptávky na **focení akcí**: firemní akce, konference, přednášky, univerzitní a spolkové akce, plesy, večírky, bary.
- Ukázat **sport** jako vášeň a odlišení: fotbal, florbal, turnaje, závody.
- Prodat **výběr na sociální sítě týž den** a **vertikální videa**.
- Nabídnout jasné orientační ceny, kalkulačku a jednoduchou poptávku.

## Domény
- `martinruzek.eu`: spuštění webu (spravuje Cloudflare)
- `martinruzek.cz`: vlastněná, využití se upřesní
- `ruzek.photo`: plánovaný nákup v budoucnu

## Plánované technologie
Astro (statický výstup) s React islands, TypeScript, GSAP a Lenis. Na Cloudflare poběží Pages/Workers, D1, Turnstile, Stream nebo R2 a Web Analytics. Detaily a pravidla jsou v [AGENTS.md](AGENTS.md).

### Zamčené verze (2026-11-21)
Přesné verze drží `pnpm-lock.yaml`. Hlavní nástroje:

| Nástroj | Verze |
|---|---|
| Astro | 7.4.13 |
| `@astrojs/cloudflare` (adaptér) | 14.4.9 |
| `@astrojs/react` | 7.1.9 |
| `@astrojs/sitemap` | 3.7.6 |
| Wrangler | 4.166.0 |
| Vitest | 5.1.1 |
| Playwright | 1.65.1 |
| TypeScript | 6.0.3 (`astro check` zatím nepodporuje 7.x) |

Příkazy: `pnpm dev`, `pnpm build`, `pnpm preview` (Wrangler nad `dist/` na portu 8787), `pnpm check`, `pnpm test`, `pnpm test:e2e`. Vždy `pnpm`, nikdy `npm`.

## Licence písem
Písma se hostují lokálně z balíčků `@fontsource/*` (pnpm). U každého balíčku je ověřený soubor `LICENSE` (SIL Open Font License 1.1) i pole `license: "OFL-1.1"` v `package.json` (2026-11-21, verze 5.3.0). OFL dovoluje písma šířit i commitovat. Soubory písem v repozitáři nejsou, vznikají při buildu z `node_modules`.

| Písmo | Balíček | Řezy | Licence |
|---|---|---|---|
| Stack Sans Notch (jen display, od 64 px) | `@fontsource/stack-sans-notch` | 700 | OFL 1.1 |
| Stack Sans Text | `@fontsource/stack-sans-text` | 400, 500, 600 | OFL 1.1 |
| Crimson Pro (kurzíva, akcent) | `@fontsource/crimson-pro` | 400 italic | OFL 1.1 |
| Geist Mono | `@fontsource/geist-mono` | 400, 500 | OFL 1.1 |

Sady `latin` a `latin-ext` (čeština), WOFF2. Písma načítá Fonts API Astra (`fonts` v `astro.config.ts`, lokální provider nad soubory z balíčků): generuje `@font-face`, záložní písma s upravenými metrikami a `preload` pro Notch 700 a Text 400. Žádný požadavek na Google Fonts ani jiné CDN.

## Dokumentace
| Soubor | Obsah |
|---|---|
| [AGENTS.md](AGENTS.md) | Pravidla pro AI agenty i lidi: postup, obsahová a právní pravidla, technologie |
| [docs/brief.md](docs/brief.md) | Zadání: služby, ceny, klienti, formulář, SEO |
| [docs/decisions.md](docs/decisions.md) | Co je rozhodnuto a co zůstává otevřené |
| [docs/research.md](docs/research.md) | Shrnutí rozboru konkurence a inspirací |
| [design/opendesign-brief.md](design/opendesign-brief.md) | Zadání pro varianty designu v OpenDesignu |
| [design/logo/](design/logo/) | Logo (černá a šedá varianta) |
| [research/](research/) | Vzorník písma a skripty na screenshoty. Podrobné rozbory jsou jen lokálně |

## Postup projektu
1. ✅ Brainstorm
2. ✅ Rozbor webů fotografů a inspirací (shrnutí v [docs/research.md](docs/research.md))
3. ⏳ Průzkum vizuálu: 9 směrů v OpenDesignu (skilly Taste, Impeccable a Hallmark, každý 3 směry s volnou rukou)
4. Koncept a plán, poté schválení
5. Implementace a nasazení na Cloudflare

## Provoz webu
Doplní se při implementaci:
- `TODO:` jak přidat fotky a případovou studii
- `TODO:` jak změnit ceny (jeden typovaný config)
- `TODO:` jak rychle stáhnout fotku z webu
- `TODO:` lokální vývoj, build a nasazení
- `TODO:` proměnné prostředí a tajné klíče (e-mail, Turnstile)
