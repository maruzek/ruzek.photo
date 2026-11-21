# Zadání

Zdroj: Martinovo zadání a odpovědi z brainstormu (2026-11-20). Texty o Martinovi se smí psát **jen** z tohoto souboru. Co tu chybí, je `TODO`.

## O Martinovi
- Martin Růžek, fotograf v Praze, působí i v Karlových Varech (uvedeno v bio na Instagramu).
- Studuje informatiku (Business Informatics) na VŠE a pracuje jako webový vývojář. Na webu to zmínit **jen okrajově**, nestavět na tom.
- Instagram: `@ruzek.jpg` (fotografický profil), `@martin_ruzek` (osobní).
- OSVČ, **neplátce DPH**. `TODO: IČO`, `TODO: sídlo`.
- Vlastní portrét dodá.
- Případové studie zatím nemá. Model pro ně má být připravený s obsahem `TODO`. Dodá i fotky, které nejsou na Instagramu.

## Zaměření
| Oblast | Role | Příklady |
|---|---|---|
| Akce | hlavní příjem | firemní akce, konference, přednášky a debaty, univerzitní a spolkové akce, plesy, večírky, bary |
| Sport | vášeň a odlišení | fotbal, florbal, turnaje, závody |
| Portréty | doplněk | — |
| Sociální sítě | unikátní nabídka | výběr na sítě týž den, vertikální videa (reels), vlastní obsah |

**Klienti:** firmy, eventové agentury, univerzity, spolky, sportovní kluby a organizátoři, hlavně v Praze.

## Ceny (orientační, uvádět jako „od“, bez DPH, Martin není plátce)
| Služba | Cena | Co klient dostane |
|---|---|---|
| Akce | 1. hodina 1 500 Kč, každá další 1 000–1 200 Kč | úpravy a online galerie do 3–5 dnů, zhruba 30–50 fotek za hodinu |
| Krátké focení (do 1 h) | 1 500 Kč | 15–25 fotek do 2–3 dnů |
| Expres | +20–30 % | výběr na sítě týž den |
| Klubový zápas nebo turnaj | 1 500–2 500 Kč za zápas | 30–50 fotek do 24 h, sezónní sleva |
| Portrét | 1 500 Kč | 45–60 min, 8–10 fotek |
| Video (doplněk) | +1 000–2 000 Kč | 1–3 vertikální videa |
| Opakovaná spolupráce | individuálně | se slevou |

- **Doprava:** v Praze zdarma, mimo Prahu 5–6 Kč/km.
- **Záloha:** 30–50 %.
- **Předání:** galerie přes Pixieset nebo Pic-Time.

## Poptávkový formulář
- **Pole:** typ akce, datum, čas od–do, místo, počet lidí, požadované výstupy, kontakt.
- **Povinné:** ochrana proti spamu (Turnstile) a odkaz na zásady ochrany osobních údajů. Zaškrtávátko souhlasu nebude (rozhodnutí 2026-11-21).
- **Po odeslání:** e-mail Martinovi na `foto@martinruzek.cz`, potvrzení klientovi a uložení do databáze (D1). Poptávky bez zakázky se po 12 měsících anonymizují.
- Na webu bude vidět i telefon a WhatsApp.
- Kalkulačka cen poptávku předvyplní.

## Obsah webu
- Případové studie jednotlivých akcí, ne jen galerie (zatím `TODO`).
- Vertikální videa hostovaná přes Cloudflare (Stream nebo R2), bez vkládání z Instagramu.
- Jazyky: CZ i EN od spuštění.
- Prvky ukazující vývojářskou stránku:
  - rychlost webu jako argument;
  - interaktivní kalkulačka cen;
  - geometrický systém podle loga;
  - „ze zákulisí“ a technická data fotek (bez GPS).

## SEO
- Lokální dotazy, například „fotograf akcí Praha“ nebo „sportovní fotograf Praha“.
- JSON-LD (`LocalBusiness`, `Person`, nabídky).
- Open Graph, sitemap, robots.txt, canonical URL, `hreflang`.
- České alt texty, Core Web Vitals.
- Napojení na Google profil firmy, Firmy.cz a Instagram.

## Právní a obsahová pravidla
Viz [AGENTS.md](../AGENTS.md#obsahová-a-právní-pravidla-závazná): souhlasy, děti, rychlé stažení fotek, EXIF, zásady ochrany údajů, měření bez cookies (Umami, Cloudflare Web Analytics), žádná technika na webu, žádný vymyšlený obsah.

Relevantní předpisy:
- občanský zákoník § 84–90 (podobizna);
- GDPR;
- autorský zákon § 61 (licence).

Smlouvy a podmínky má zkontrolovat odborník. Tento soubor není právní rada.

## Výbava
Na web nepatří. Výbava se bude měnit, proto se web nesmí stavět kolem konkrétní techniky.
