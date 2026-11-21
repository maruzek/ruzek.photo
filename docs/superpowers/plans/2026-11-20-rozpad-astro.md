# Web Rozpad v Astru: plán implementace

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Brána:** Plán se začne provádět až po tom, co Martin výslovně schválí [koncept](../../concept.md) i tento plán (AGENTS.md). Do té doby se nepíše kód aplikace.
>
> **Způsob provedení (Martin, 2026-11-21):** úkol po úkolu (superpowers:subagent-driven-development). Každý úkol implementuje nový agent a před dalším úkolem ho zkontroluje **Codex, model 6.2 Sol**. Pokud model není dostupný, orchestrátor se zastaví a zeptá se Martina. Nenahrazuje ho jiným modelem.

**Cíl:** Postavit web Martina Růžka ve směru Rozpad jako statický Astro web na Cloudflare s poptávkou přes D1 a Turnstile, v CZ a EN.

**Architektura:** Astro `output: 'static'` na Cloudflare Workers se statickými assety. Jediný serverový kód je `/api/inquiry` (`prerender = false`) a samostatný cron worker na údržbu D1. Pohyb (GSAP, Lenis, canvasy) je vrstva nad hotovým HTML a při `prefers-reduced-motion` se nenačte. Ceny, texty a fotky mají každé jeden typovaný zdroj.

**Tech Stack:** pnpm, Astro (nejnovější stabilní, zamkne se v úkolu 1), TypeScript strictest, `@astrojs/cloudflare`, `@astrojs/react` (jen formulář), `@astrojs/sitemap`, `gsap` ≥ 3.13, `lenis`, `@fontsource/*`, sharp (přes `astro:assets`), zod (`astro/zod`), Wrangler, D1, Turnstile, Vitest, `@cloudflare/vitest-pool-workers`, Playwright, `@axe-core/playwright`, ESLint, Prettier, Lighthouse CI.

**Spec:** [docs/concept.md](../../concept.md). Vizuální a pohybová reference: [design/final/rozpad/](../../../design/final/rozpad/) (`index.html`, `assets/rozpad.js`, `assets/r2.js`, `HANDOFF.md`).

## Global Constraints

- Jen `pnpm`, nikdy `npm`. Žádné CDN, všechny knihovny z pnpm.
- TypeScript `strictest`. Žádné `any` bez komentáře s důvodem.
- Kód, názvy souborů a commity anglicky. Texty webu česky a anglicky ve slovnících, nikdy natvrdo v komponentách.
- Nevymýšlet obsah. Chybějící místo = viditelné `TODO: …` přes `<Todo>`. Texty o Martinovi jen z `docs/brief.md`.
- Barvy, písma, velikosti a rytmus přesně podle `:root` v `design/final/rozpad/index.html` a tabulky tokenů v HANDOFF.md.
- Stack Sans Notch jen ve velikosti ≥ 64 px.
- Žádné cookies, žádné zápisy do `localStorage` kvůli měření, žádná cookie lišta. Žádné vložené příspěvky z Instagramu ani YouTube, žádné Google Fonts. Měření jen Umami a Cloudflare Web Analytics, oba načtené až po `load`.
- Veřejný e-mail `foto@martinruzek.cz`, formulář odesílá z `noreply@martinruzek.eu`. Osobní adresy do repa nepatří.
- Formulář nemá zaškrtávátko souhlasu, jen větu s odkazem na zásady. Poptávky bez zakázky se po 365 dnech anonymizují, nemažou.
- Žádná fotografická technika ani značky na webu.
- Žádné EXIF ve výstupu, žádné GPS v repozitáři.
- Do repa nepatří osobní údaje (jména klientů, e-maily, telefony mimo to, co bude veřejně na webu) ani tajemství (`.dev.vars`, `.env`).
- `prefers-reduced-motion: reduce` → žádné ASCII, Lenis, pin ani scrub. GSAP a Lenis se ani nestáhnou.
- Šířka 360 px bez vodorovného scrollu. WCAG 2.2 AA. Core Web Vitals zelené na mobilu.
- Animaci loga ani načítací obrazovku neimplementovat a nenavrhovat.
- Hotovo = `pnpm check` (astro check, typy, lint, unit testy, check:exif) a `pnpm test:e2e` projdou.

## Review Focus

1. **`prefers-reduced-motion` při načtení i přepnutí za běhu:** veškerý obsah je vidět, GSAP ani Lenis se nestáhnou a po přepnutí za běhu se animace vrátí do klidu. Test v úkolu 8.
2. **JS selže nebo je pomalá síť:** stránka je do 3 s celá viditelná (CSS pojistka), nic nezůstane schované. Test v úkolu 2 (blokovaný JS) a v úkolu 8.
3. **360 px a dlouhé texty v CZ i EN:** jméno v hero, pás typů akcí, ceny s nezlomitelnými mezerami a štítky nezpůsobí vodorovný scroll. Test v úkolu 7 pro oba jazyky.
4. **Dvojí odeslání, výpadek sítě a chyba serveru ve formuláři:** vznikne jeden záznam, uživatel vidí srozumitelnou chybu a nepřijde o vyplněná pole. Testy v úkolech 10 a 11.
5. **Lightbox, Lenis a klávesnice:** při otevřeném dialogu kolečko, mezerník ani šipky nescrollují stránku, Esc zavře dialog a vrátí fokus na fotku. Test v úkolu 8.

---

### Úkol 1: Kostra projektu a nástroje

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `astro.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `src/pages/index.astro` (dočasná), `tests/e2e/smoke.spec.ts`, `.dev.vars.example`
- Modify: `.gitignore` (přidat `test-results/`, `playwright-report/`, `.lighthouseci/`)

**Interfaces:**
- Produces: skripty `pnpm dev`, `pnpm build`, `pnpm preview` (wrangler dev nad `dist/`), `pnpm check`, `pnpm test`, `pnpm test:e2e`. Alias `@/` → `src/`.

- [x] **Step 1:** `pnpm create astro@latest . --template minimal --typescript strictest --no-git --install`, pak `pnpm astro add cloudflare react sitemap`. Do `README.md` zapsat zamčené verze Astra a adaptéru.
- [x] **Step 2:** `astro.config.ts`:

```ts
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://martinruzek.eu',
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }), // images processed at build time only
  integrations: [react({ include: ['**/islands/**'] }), sitemap()],
  i18n: { defaultLocale: 'cs', locales: ['cs', 'en'], routing: { prefixDefaultLocale: false } },
  build: { inlineStylesheets: 'auto' },
});
```

- [x] **Step 3:** `wrangler.jsonc` s `name: "ruzek-web"`, `assets.directory: "./dist"`, binding `DB` (D1 `ruzek-inquiries`, zatím lokální) a `compatibility_date` ze dne instalace. Přesný tvar (`main`) podle dokumentace zamčeného adaptéru.
- [x] **Step 4:** Nástroje: `pnpm add -D vitest @playwright/test @axe-core/playwright eslint typescript-eslint eslint-plugin-astro eslint-plugin-jsx-a11y prettier prettier-plugin-astro`. Skripty:

```json
{
  "check": "astro check && eslint . && vitest run && pnpm check:exif",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "check:exif": "tsx scripts/check-exif.ts"
}
```

(`check:exif` zatím jen vypíše „no images“ a skončí s 0. Plnou logiku dostane v úkolu 5.)

- [x] **Step 5:** Napsat smoke test:

```ts
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';
test('home responds with Czech lang', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
});
```

`playwright.config.ts`: `webServer: { command: 'pnpm build && pnpm preview', url: 'http://localhost:8787' }`, projekty `mobile-360` (360 × 780, dotyk), `desktop` (1440 × 900).
- [x] **Step 6:** `pnpm test:e2e`. Očekávání: FAIL, dokud dočasná stránka nemá `lang="cs"`. Doplnit `<html lang="cs">` a spustit znovu: PASS. `pnpm check`: PASS.
- [x] **Step 7:** Commit `chore: scaffold Astro project on Cloudflare with test tooling`.

---

### Úkol 2: Tokeny, základní styly, písma a layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/fonts.css`, `src/layouts/Base.astro`, `src/components/Todo.astro`, `src/components/Rich.astro`, `tests/e2e/fonts.spec.ts`, `tests/e2e/no-js.spec.ts`, `tests/unit/notch-size.test.ts`

**Interfaces:**
- Produces: `Base.astro` props `{ locale: 'cs' | 'en'; title: string; description: string; path: string }`, sloty `head` a `default`. Třídy na `<html>`: `motion` | `rm`, později `motion-ready`. `<Todo>{text}</Todo>` vykreslí `<span class="todo">TODO: {text}</span>`. `<Rich text="… *slovo* …" />` vykreslí `*…*` jako `<em class="s">`.

- [x] **Step 1:** `tokens.css`: zkopírovat `:root` z `design/final/rozpad/index.html:16-26` beze změny. `base.css`: reset a primitiva z `design/final/rozpad/assets/base.css` (včetně `.todo`, `.ph-tag`, `.skip`), plus `em.s`, `.mono`, `.h`, `.eyebrow`, `.btn`, `.lnk` z `index.html:29-54`.
- [x] **Step 2:** Písma: `pnpm add @fontsource/stack-sans-notch @fontsource/stack-sans-text @fontsource/crimson-pro @fontsource/geist-mono`. Ověřit, že každý balíček obsahuje `LICENSE` s OFL 1.1, a zapsat to do README (sekce Licence písem). Pokud zamčené Astro má stabilní Fonts API s providerem Fontsource, nakonfigurovat ho tam. Jinak `fonts.css` importuje jen řezy Notch 700, Text 400/500/600, Crimson Pro 400 italic, Geist Mono 400/500 v sadách `latin` a `latin-ext`, a v `Base.astro` dát `<link rel="preload" as="font" type="font/woff2" crossorigin>` pro Notch 700 latin-ext a Text 400 latin-ext. Záložní `@font-face` se `size-adjust` pro `system-ui`.
- [x] **Step 3:** `Base.astro`: `<html lang={locale}>`, inline skript v `<head>` (`is:inline`):

```html
<script is:inline>
  document.documentElement.classList.add(
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 'rm' : 'motion'
  );
</script>
```

CSS pojistka v `base.css`: prvky s `[data-split]`, `[data-rise]` a `[data-stagger] > *` se schovávají jen pod `html.motion:not(.motion-ready)` a `@keyframes reveal` je po 3 s odkryje:

```css
html.motion:not(.motion-ready) :is([data-rise], [data-stagger] > *) {
  opacity: 0;
  animation: reveal 0s linear 3s forwards;
}
@keyframes reveal { to { opacity: 1; } }
```

- [x] **Step 4:** Napsat testy:

```ts
// tests/e2e/fonts.spec.ts
test('fonts are self-hosted', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.fonts.check('700 64px "Stack Sans Notch"'))).toBe(true);
});

// tests/e2e/no-js.spec.ts
test('content becomes visible when JS modules never load', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/');
  await page.waitForTimeout(3200);
  for (const el of await page.locator('[data-rise], [data-stagger] > *').all())
    await expect(el).toHaveCSS('opacity', '1');
});
```

`tests/unit/notch-size.test.ts`: načte všechny `src/styles/**/*.css`, najde pravidla s `var(--f-name)` a ověří, že jejich `font-size` je `clamp(` s minimem ≥ 64 px. Selektory bez explicitní velikosti test odmítne.
- [x] **Step 5:** Spustit, očekávat FAIL (stránka zatím nemá prvky ani písma), napojit dočasnou stránku na `Base.astro` s jedním `[data-rise]` a jménem v `.name`, spustit: PASS.
- [x] **Step 6:** Commit `feat: design tokens, self-hosted fonts and base layout`.

---

### Úkol 3: Jazyky CZ/EN

**Files:**
- Create: `src/i18n/cs.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/components/LangSwitch.astro`, `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces:

```ts
export type Locale = 'cs' | 'en';
export type Dictionary = typeof cs; // cs.ts: export const cs = { ... } as const satisfies DictionaryShape
export function t(locale: Locale): Dictionary;
export function localePath(locale: Locale, route: RouteKey): string; // ('en','privacy') → '/en/privacy/'
export function alternates(route: RouteKey): { cs: string; en: string };
export type RouteKey = 'home' | 'privacy' | 'caseStudy';
```

- [x] **Step 1:** Napsat test:

```ts
import { describe, it, expect } from 'vitest';
import { cs } from '@/i18n/cs';
import { en } from '@/i18n/en';
import { localePath, alternates } from '@/i18n';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe('i18n', () => {
  it('en has exactly the cs keys', () => expect(keys(en).sort()).toEqual(keys(cs).sort()));
  it('no empty strings', () => {
    for (const d of [cs, en]) for (const k of keys(d)) expect(k.split('.').reduce((o: any, x) => o[x], d)).not.toBe('');
  });
  it('builds paths', () => {
    expect(localePath('cs', 'home')).toBe('/');
    expect(localePath('en', 'home')).toBe('/en/');
    expect(alternates('privacy')).toEqual({ cs: '/zasady-ochrany-osobnich-udaju/', en: '/en/privacy/' });
  });
});
```

- [x] **Step 2:** `pnpm vitest run tests/unit/i18n.test.ts`. Očekávání: FAIL (moduly neexistují).
- [x] **Step 3:** `cs.ts`: všechny texty z `design/final/rozpad/index.html` (nav, hero, marquee, folds, práce, služby, týž den, o mně, poptávka, patička, lightbox, chybové hlášky formuláře), kotvy sekcí (`prace`, `sluzby`, `o-mne`, `poptavka`). Zvýrazněná slova jako `*…*`. `en.ts`: věrný překlad bez nových tvrzení, kotvy `work`, `services`, `about`, `inquiry`. Doplnit klíč `en.meta.translationTodo = 'TODO: kontrola překladu'`, který EN stránka vykreslí přes `<Todo>`, dokud Martin překlad neschválí.
- [x] **Step 4:** Test: PASS. `LangSwitch.astro` vykreslí odkaz na `alternates(route)[other]` s `hreflang` a `lang`.
- [x] **Step 5:** Commit `feat: cs/en dictionaries and locale routing helpers`.

---

### Úkol 4: Ceník a odhad ceny

**Files:**
- Create: `src/config/pricing.ts`, `src/lib/pricing/estimate.ts`, `src/lib/pricing/format.ts`, `tests/unit/pricing.test.ts`

**Interfaces:**
- Produces:

```ts
// src/config/pricing.ts
export type Czk = number;
export interface Range { from: Czk; to: Czk }
export type ServiceId = 'event' | 'short' | 'match' | 'portrait';
export type AddonId = 'sameDay' | 'video';
export type ServicePricing =
  | { kind: 'hourly'; firstHour: Czk; nextHour: Range; minHours: 1; maxHours: number }
  | { kind: 'flat'; price: Range; unit: 'session' | 'match' };
export interface Service {
  id: ServiceId;
  pricing: ServicePricing;
  deliverables: { photos: Range; perHour?: true; turnaround: { value: Range; unit: 'days' | 'hours' }; durationMin?: Range };
}
export type Addon =
  | { id: 'sameDay'; kind: 'percent'; value: Range }
  | { id: 'video'; kind: 'fixed'; value: Range };
export const SERVICE_IDS: readonly ServiceId[];
export const ADDON_IDS: readonly AddonId[];
export const services: readonly Service[];
export const addons: readonly Addon[];
export const terms: { travel: { freeIn: 'Praha'; perKm: Range }; depositPercent: Range; vatPayer: false };

// src/lib/pricing/estimate.ts
export interface EstimateInput { service: ServiceId; hours?: number; addons: readonly AddonId[] }
export function estimate(input: EstimateInput): Range;

// src/lib/pricing/format.ts
export function formatRange(r: Range, locale: 'cs' | 'en'): string; // "1 500 Kč" | "3 500–3 900 Kč" | "CZK 1,500"
```

- [x] **Step 1:** Napsat test:

```ts
import { describe, it, expect } from 'vitest';
import { estimate } from '@/lib/pricing/estimate';
import { formatRange } from '@/lib/pricing/format';
import { services, addons } from '@/config/pricing';

describe('estimate', () => {
  it('event 3 h', () => expect(estimate({ service: 'event', hours: 3, addons: [] })).toEqual({ from: 3500, to: 3900 }));
  it('event 3 h + same day applies percent', () =>
    expect(estimate({ service: 'event', hours: 3, addons: ['sameDay'] })).toEqual({ from: 4200, to: 5070 }));
  it('match + video adds fixed range', () =>
    expect(estimate({ service: 'match', addons: ['video'] })).toEqual({ from: 2500, to: 4500 }));
  it('percent before fixed', () =>
    expect(estimate({ service: 'portrait', addons: ['video', 'sameDay'] })).toEqual({ from: 2800, to: 3950 }));
  it('portrait flat', () => expect(estimate({ service: 'portrait', addons: [] })).toEqual({ from: 1500, to: 1500 }));
  it('clamps hours', () => {
    expect(estimate({ service: 'event', hours: 0, addons: [] })).toEqual({ from: 1500, to: 1500 });
    expect(estimate({ service: 'event', hours: 99, addons: [] })).toEqual({ from: 12500, to: 14700 });
    expect(estimate({ service: 'event', hours: Number.NaN, addons: [] })).toEqual({ from: 1500, to: 1500 });
  });
  it('ignores hours for flat services', () =>
    expect(estimate({ service: 'match', hours: 5, addons: [] })).toEqual({ from: 1500, to: 2500 }));
  it('ignores duplicate addons', () =>
    expect(estimate({ service: 'portrait', addons: ['video', 'video'] })).toEqual({ from: 2500, to: 3500 }));
});

describe('config matches docs/brief.md', () => {
  it('prices', () => {
    expect(services.find((s) => s.id === 'event')?.pricing).toEqual({ kind: 'hourly', firstHour: 1500, nextHour: { from: 1000, to: 1200 }, minHours: 1, maxHours: 12 });
    expect(addons).toEqual([
      { id: 'sameDay', kind: 'percent', value: { from: 20, to: 30 } },
      { id: 'video', kind: 'fixed', value: { from: 1000, to: 2000 } },
    ]);
  });
});

describe('formatRange', () => {
  it('cs uses nbsp and en dash', () => expect(formatRange({ from: 3500, to: 3900 }, 'cs')).toBe('3 500–3 900 Kč'));
  it('cs single', () => expect(formatRange({ from: 1500, to: 1500 }, 'cs')).toBe('1 500 Kč'));
  it('en', () => expect(formatRange({ from: 1500, to: 2500 }, 'en')).toBe('CZK 1,500–2,500'));
});
```

- [x] **Step 2:** `pnpm vitest run tests/unit/pricing.test.ts`. Očekávání: FAIL.
- [x] **Step 3:** Implementace. `pricing.ts` podle tabulky v `docs/brief.md` (akce 1 500 + 1 000–1 200/h, max 12 h; krátké focení 1 500; zápas 1 500–2 500; portrét 1 500, 45–60 min, 8–10 fotek; příplatky 20–30 % a 1 000–2 000 Kč). `estimate`:

```ts
export function estimate({ service, hours, addons: picked }: EstimateInput): Range {
  const s = services.find((x) => x.id === service);
  if (!s) throw new Error(`Unknown service ${service}`);
  let r: Range;
  if (s.pricing.kind === 'hourly') {
    const p = s.pricing;
    const h = Math.min(p.maxHours, Math.max(p.minHours, Math.trunc(Number.isFinite(hours) ? hours! : 1)));
    r = { from: p.firstHour + (h - 1) * p.nextHour.from, to: p.firstHour + (h - 1) * p.nextHour.to };
  } else r = { ...s.pricing.price };
  const set = new Set(picked);
  for (const a of addons) if (a.kind === 'percent' && set.has(a.id))
    r = { from: Math.round(r.from * (1 + a.value.from / 100)), to: Math.round(r.to * (1 + a.value.to / 100)) };
  for (const a of addons) if (a.kind === 'fixed' && set.has(a.id))
    r = { from: r.from + a.value.from, to: r.to + a.value.to };
  return r;
}
```

`format.ts` přes `Intl.NumberFormat` (`cs-CZ`, `en-GB`), mezery nahradit ` `.
- [x] **Step 4:** Test: PASS.
- [x] **Step 5:** Commit `feat: typed pricing config and estimate`.

---

### Úkol 5: Fotky: schéma, import bez EXIF a kontroly

**Files:**
- Create: `src/lib/photos/schema.ts`, `src/content.config.ts`, `src/content/photos/*.yaml` (14 zástupných z prototypu), `src/assets/photos/*.jpg` (zkopírované z `design/final/rozpad/assets/stock/` přes import), `scripts/photos-import.ts`, `scripts/check-exif.ts`, `scripts/check-contrast.ts`, `tests/unit/photo-schema.test.ts`, `tests/unit/check-exif.test.ts`, `tests/unit/check-contrast.test.ts`, `tests/fixtures/gps.jpg`, `tests/fixtures/light.jpg`, `tests/fixtures/dark.jpg`
- Modify: `package.json` (skripty `photos:import`, `check:exif`, `check:contrast`)

**Interfaces:**
- Produces:

```ts
// src/lib/photos/schema.ts
export function photoSchema<I extends z.ZodTypeAny>(image: I): z.ZodType<Photo<z.infer<I>>>;
export interface Photo<I> {
  image: I; alt: { cs: string; en: string }; caption?: { cs: string; en: string };
  category: 'event' | 'sport' | 'portrait'; published: boolean; placeholder: boolean;
  credit?: string; consentRef?: string; minors: boolean; parentalConsent: boolean;
  shade: 'normal' | 'strong';
}
// scripts/check-exif.ts
export async function findMetadataViolations(dirs: { path: string; forbid: 'gps' | 'any' }[]): Promise<string[]>;
// scripts/check-contrast.ts
export async function bottomContrast(file: string, inkHex = '#E9EAEE', shade: 'normal' | 'strong'): Promise<number>;
```

Kolekce `photos` (glob loader, `schema: ({ image }) => photoSchema(image())`) a `caseStudies` (Markdown, `draft: boolean`, `title/summary` CZ/EN, `date`, `photos: reference('photos')[]`, `matchReport?: { score: string; venue: string }`).

- [x] **Step 1:** Napsat test schématu:

```ts
import { z } from 'astro/zod';
import { photoSchema } from '@/lib/photos/schema';
const S = photoSchema(z.string());
const base = { image: 'x.jpg', alt: { cs: 'Řečník na pódiu', en: 'Speaker on stage' }, category: 'event' };

it('rejects published real photo without consentRef', () =>
  expect(S.safeParse({ ...base, published: true }).success).toBe(false));
it('accepts published real photo with consentRef', () =>
  expect(S.safeParse({ ...base, published: true, consentRef: 'C-2026-001' }).success).toBe(true));
it('rejects minors without parental consent', () =>
  expect(S.safeParse({ ...base, consentRef: 'C-1', minors: true }).success).toBe(false));
it('placeholder needs credit, not consent', () => {
  expect(S.safeParse({ ...base, placeholder: true }).success).toBe(false);
  expect(S.safeParse({ ...base, placeholder: true, credit: 'StockSnap, CC0' }).success).toBe(true);
});
it('rejects consentRef that looks like an e-mail or name', () =>
  expect(S.safeParse({ ...base, consentRef: 'jana@firma.cz' }).success).toBe(false));
it('unpublished photo needs nothing', () =>
  expect(S.safeParse({ ...base, published: false }).success).toBe(true));
```

(`consentRef` musí odpovídat `/^C-\d{4}-\d{3,}$/`.)
- [x] **Step 2:** Napsat test `check-exif`: fixture `gps.jpg` (vyrobit v testu přes sharp `withExifMerge` s GPS tagy) → `findMetadataViolations([{ path: tmp, forbid: 'gps' }])` vrátí jeho cestu. Stejná fotka po `photos:import` → prázdné pole. Pro `forbid: 'any'` vadí jakékoli EXIF.
- [x] **Step 3:** Napsat test `check-contrast`: `light.jpg` (spodek #DDDDDD) s `normal` → < 4,5. `dark.jpg` (spodek #202020) → ≥ 4,5. `light.jpg` se `strong` → vyšší než s `normal`.
- [x] **Step 4:** Spustit, FAIL. Implementovat:
  - `photos-import.ts <files…>`: sharp `rotate()` (aplikuje orientaci), `resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })`, `jpeg({ quality: 90, mozjpeg: true })` bez `withMetadata`. Výstup `src/assets/photos/<slug>.jpg` a kostra YAML s `alt: { cs: "TODO", en: "TODO" }` a bez `consentRef` (build pak selže, dokud se nedoplní, nebo se nenastaví `published: false`).
  - `check-exif.ts`: exif-reader nad `sharp(file).metadata().exif`. `src` a `public` → `gps` (fotka může ležet i vedle YAML v `src/content`), `dist` → `any` (EXIF, XMP, IPTC, ICC, PNG text, JPEG komentář; když `dist` neexistuje, přeskočí). Symlinky na adresáře se hlásí. `pnpm build` = `astro build && pnpm check:exif`. Nenulový exit při nálezu.
  - `check-contrast.ts`: výřez spodních 35 %, `stats()`, průměrný relativní jas, aplikovat průměrné krytí gradientu `.shade` (normal ≈ 0,75, strong ≈ 0,9 nad `--night`), kontrast podle WCAG. Projde kolekci fotek použitých ve `fold` a hero a vypíše varování pod 4,5. Neselhává, jen hlásí.
- [x] **Step 5:** Naimportovat 14 zástupných fotek z `design/final/rozpad/assets/stock/` s `placeholder: true` a kreditem z `credits.json`. Alt texty převzít z `index.html`.
- [x] **Step 6:** Testy PASS, `pnpm check` PASS.
- [x] **Step 7:** Commit `feat: photo collection with consent schema and EXIF-stripping import`.

---

### Úkol 6: Statické sekce, část 1 (header, hero, pás, fotografické sekce, přechody)

**Files:**
- Create: `src/components/Header.astro`, `Logo.astro`, `Hero.astro`, `AsciiHero.astro`, `Marquee.astro`, `PhotoFold.astro`, `DitherImage.astro`, `DitherWipe.astro`, `PlaceholderTag.astro`, `Button.astro`, `src/styles/sections/{header,hero,marquee,fold,wipe}.css`, `src/lib/logo.ts`, `tests/unit/logo.test.ts`

**Interfaces:**
- Consumes: `t(locale)`, `Photo` z kolekce, tokeny.
- Produces:
  - `DitherImage` props `{ photo: CollectionEntry<'photos'>; sizes: string; mode?: 'scroll' | 'hover' | 'stay'; cover: 'night' | 'light'; eager?: boolean }` → `<div class="dph" data-dz={mode} data-dz-color={…}>` + `<Picture>` + `<canvas class="dz" aria-hidden="true">`.
  - `DitherWipe` props `{ from: 'night' | 'light'; to: 'night' | 'light' }` → `<canvas class="dwipe" data-from data-to aria-hidden="true">` s CSS fallbackem (`background: linear-gradient(var(--from) 50%, var(--to) 50%)`).
  - `logoPaths(tiles: LogoTiles): { transform: string; d: string }[]` v `src/lib/logo.ts`.
  - Marquee: `<button class="marquee-toggle" aria-pressed="false">` s textem ze slovníku (Pozastavit / Spustit).

- [x] **Step 1:** Test `logo.test.ts`: `logoPaths` nad `design/logo/logo-tiles.json` vrátí 3 stěny, celkem 74 dlaždic, a `transform` první stěny je `matrix(13.8564 -8 -13.8564 -8 160 146)` (shoda s inline SVG v `index.html:262`). FAIL → implementovat → PASS.
- [x] **Step 2:** Komponenty převést 1 : 1 z `index.html` (markup řádky 261–313, CSS řádky 56–110 a 234–253). Texty jen ze slovníku. Hero fotka `<Picture … loading="eager" fetchpriority="high" sizes="100vw" widths={[480,768,1080,1440,1920,2560]} formats={['avif','webp']}>`. Do `<head>` přes slot `head` dát `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">` pro AVIF.
- [x] **Step 3:** Dočasně poskládat do `src/pages/index.astro` a vizuálně porovnat s prototypem na 1440 a 390 px (`python3 -m http.server` v `design/final/rozpad`). Rozdíly opravit.
- [x] **Step 4:** Commit `feat: header, hero, marquee, photo folds and wipes (static)`.

---

### Úkol 7: Statické sekce, část 2 a celá úvodní stránka v CZ a EN

**Files:**
- Create: `src/components/WorkGrid.astro`, `Shot.astro`, `Lightbox.astro`, `Services.astro`, `ServiceCard.astro`, `Addon.astro`, `SameDay.astro`, `About.astro`, `Inquiry.astro` (zatím bez islandu), `Footer.astro`, `src/components/Home.astro`, `src/pages/index.astro`, `src/pages/en/index.astro`, `src/config/site.ts`, `src/scripts/lightbox.ts`, `src/styles/sections/{work,services,day,about,inquiry,footer,lightbox}.css`, `tests/e2e/layout.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/lightbox.spec.ts`

**Interfaces:**
- Consumes: `services`, `addons`, `formatRange` (úkol 4), kolekce `photos` (úkol 5), `DitherImage` (úkol 6).
- Produces:
  - `Home.astro` props `{ locale: Locale }`, obě stránky jen předají jazyk.
  - `site.ts`: `{ name: 'Martin Růžek', handle: '@ruzek.jpg', instagram: 'https://www.instagram.com/ruzek.jpg/', cities: ['Praha', 'Karlovy Vary'], contact: { email: 'foto@martinruzek.cz', phone: null, whatsapp: null }, legal: { ico: null, seat: null } }`. `null` se vykreslí jako `<Todo>`.
  - `Shot` vykreslí `<button data-lb={caption} data-full={getImage(2000).src}>`.
  - `lightbox.ts` exportuje `initLightbox(root: HTMLDialogElement, hooks?: { onOpen?(): void; onClose?(): void }): void`. Hooky použije úkol 8 pro Lenis.

- [x] **Step 1:** Napsat e2e testy:

```ts
// tests/e2e/layout.spec.ts
for (const path of ['/', '/en/']) {
  test(`no horizontal scroll at 360px ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(path);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
  });
  test(`prices come from config ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#sluzby, #services')).toContainText(path === '/' ? '1 500 Kč' : 'CZK 1,500');
  });
}

// tests/e2e/a11y.spec.ts
import AxeBuilder from '@axe-core/playwright';
for (const path of ['/', '/en/']) for (const motion of ['reduce', 'no-preference'] as const)
  test(`axe ${path} ${motion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations).toEqual([]);
  });

// tests/e2e/lightbox.spec.ts
test('lightbox keyboard and focus return', async ({ page }) => {
  await page.goto('/');
  const shot = page.locator('[data-lb]').nth(1);
  await shot.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('dialog.lb')).toHaveAttribute('open', '');
  await expect(page.locator('.lb-no')).toHaveText('02 / 08');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lb-no')).toHaveText('03 / 08');
  await page.keyboard.press('Escape');
  await expect(shot).toBeFocused();
});
```

- [x] **Step 2:** `pnpm test:e2e`. Očekávání: FAIL.
- [x] **Step 3:** Komponenty převést z `index.html` (markup 315–432, CSS 112–232). Služby a příplatky generovat ze `services`/`addons`, popisy služeb ze slovníku podle `id`. `lightbox.ts` přepsat z `rozpad.js` (blok Lightbox) do TS, s `data-full` místo `currentSrc`. Mřížka práce bere 8 publikovaných fotek s polem `featured` v pořadí `w1`–`w8`.
- [x] **Step 4:** Testy PASS na projektech `mobile-360` i `desktop`.
- [x] **Step 5:** Commit `feat: complete static home page in cs and en`.

---

### Úkol 8: Pohybová vrstva: boot, Lenis, GSAP choreografie

**Files:**
- Create: `src/scripts/motion/boot.ts`, `start.ts`, `lenis.ts`, `choreo.ts`, `src/scripts/effects/scheduler.ts`, `src/scripts/cursor.ts`, `tests/unit/scheduler.test.ts`, `tests/e2e/motion.spec.ts`
- Modify: `src/layouts/Base.astro` (načtení `boot.ts`), `src/components/Marquee.astro` (tlačítko pauzy napojené na smyčku)

**Interfaces:**
- Consumes: `initLightbox(root, { onOpen, onClose })` (úkol 7).
- Produces:

```ts
// scheduler.ts
export type Effect = { el: Element; tick(progress: number, time: number): void; progress(): number };
export interface Scheduler { add(e: Effect): () => void; running(): boolean }
export function createScheduler(opts: { ticker: (cb: (t: number) => void) => () => void; observe: (el: Element, cb: (visible: boolean) => void) => () => void }): Scheduler;

// lenis.ts
export function startLenis(gsap: typeof import('gsap').gsap, ST: typeof ScrollTrigger): { lenis: Lenis; stop(): void; start(): void; destroy(): void };

// boot.ts: no exports; window.__motion = { lenis?: Lenis; state: 'off' | 'on' } jen pro e2e testy (podmínka import.meta.env.MODE !== 'production')
```

- [ ] **Step 1:** Napsat unit test plánovače s falešným tickerem a pozorovatelem: efekt mimo viewport se netiká; po zviditelnění se tiká; když nic není vidět, `running()` je `false` a ticker je odhlášený.
- [ ] **Step 2:** Napsat e2e:

```ts
test('reduced motion: no GSAP/Lenis downloaded, everything visible', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(scripts.some((u) => /gsap|lenis|start/.test(u))).toBe(false);
  for (const el of await page.locator('[data-split], [data-rise], .step').all()) await expect(el).toBeVisible();
  await expect(page.locator('canvas.ascii')).toBeHidden();
});

test('switching to reduced motion at runtime settles the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__motion?.state === 'on');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => (window as any).__motion?.state === 'off');
  await expect(page.locator('html')).not.toHaveClass(/lenis-smooth/);
});

test('open lightbox blocks page scroll (wheel, space, arrows)', async ({ page }) => {
  await page.goto('/#prace');
  await page.locator('[data-lb]').first().click();
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 800); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBe(y);
  await page.keyboard.press('Escape');
  await page.mouse.wheel(0, 800); await page.waitForTimeout(600);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y);
});

test('anchor link moves focus to the section', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Služby a ceny/ }).click();
  await expect(page.locator('#sluzby')).toBeFocused();
});

test('marquee can be paused', async ({ page }) => {
  await page.goto('/');
  await page.locator('.marquee-toggle').click();
  const a = await page.locator('.marquee .track').evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(500);
  expect(await page.locator('.marquee .track').evaluate((e) => getComputedStyle(e).transform)).toBe(a);
});
```

- [ ] **Step 3:** Spustit, FAIL. Implementovat:
  - `boot.ts`: pokud `matchMedia('(prefers-reduced-motion: reduce)').matches` nebo `navigator.connection?.saveData`, skončit. Jinak `const { start } = await import('./start')`. Po startu přidat `motion-ready` na `<html>`. Při změně `reduce` za běhu zavolat `revert()` ze `start`, odebrat `motion`, přidat `rm`.
  - `start.ts`: `gsap.registerPlugin(ScrollTrigger, SplitText)`, `startLenis`, `initLightbox(dialog, { onOpen: lenis.stop, onClose: lenis.start })`, choreografie z `choreo.ts` uvnitř `gsap.matchMedia()` a `ScrollTrigger.refresh()` po `document.fonts.ready` a `load`.
  - `lenis.ts`: konfigurace z `rozpad.js` (duration 1.15, easing), `syncTouch: false`, `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add`, `lagSmoothing(0)`. Kotvy přes `lenis.scrollTo(target, { offset: 0, onComplete: () => target.focus({ preventScroll: true }) })`, sekce mají `tabindex="-1"`. Import `lenis/dist/lenis.css`.
  - `choreo.ts`: přepis bloku „GSAP choreography“ z `rozpad.js` 1 : 1 (hero leave, jméno a titulky přes SplitText, stagger, rise, folds, parallax `data-par`, marquee s rychlostí a pauzou, pin týž den jen `desktop`, footer, schování headeru, plus plné pozadí headeru po odjezdu z hero). Každá funkce dostane kořenový prvek a vrátí úklid.
  - `cursor.ts`: magnetická tlačítka a kurzor nad fotkami, jen `(hover: hover) and (pointer: fine)`.
- [ ] **Step 4:** Testy PASS. Ručně porovnat pohyb s prototypem na 1440 px.
- [ ] **Step 5:** Commit `feat: motion layer with GSAP, Lenis and reduced-motion gating`.

---

### Úkol 9: Ditheringové efekty a ASCII úvod

**Files:**
- Create: `src/scripts/effects/bayer.ts`, `dither.ts`, `wipe.ts`, `ascii.ts`, `glyph-atlas.ts`, `quality.ts`, `tests/unit/bayer.test.ts`, `tests/unit/quality.test.ts`, `tests/e2e/effects.spec.ts`, `tests/perf/ascii.perf.ts`
- Modify: `src/components/AsciiHero.astro` (malý inline modul `ascii.ts`), `start.ts` (registrace `dither` a `wipe` do plánovače)

**Interfaces:**
- Consumes: `createScheduler` (úkol 8).
- Produces:

```ts
// bayer.ts
export const B8: Float32Array;              // 64 values (m + .5) / 64, index (y & 7) * 8 + (x & 7)
export function b8(x: number, y: number): number;
// quality.ts
export interface QualityProbe { sample(frameMs: number): void; verdict(): 'full' | 'lite' | 'pending' }
export function createQualityProbe(opts?: { frames?: number; budgetMs?: number }): QualityProbe; // default 30 frames, 24 ms
export function initialQuality(nav: { deviceMemory?: number; connection?: { saveData?: boolean } }): 'full' | 'lite';
// ascii.ts
export function initAsciiHero(root: HTMLElement, opts: { reduce: boolean; fine: boolean }): () => void;
// dither.ts / wipe.ts
export function ditherEffect(el: HTMLElement): Effect;
export function wipeEffect(cv: HTMLCanvasElement): Effect;
```

- [ ] **Step 1:** Napsat unit testy:

```ts
import { B8, b8 } from '@/scripts/effects/bayer';
it('first row matches the standard 8x8 Bayer matrix', () =>
  expect([...Array(8)].map((_, x) => b8(x, 0) * 64 - 0.5)).toEqual([0, 32, 8, 40, 2, 34, 10, 42]));
it('contains each threshold once', () =>
  expect([...B8].map((v) => v * 64 - 0.5).sort((a, b) => a - b)).toEqual([...Array(64).keys()]));
it('wraps coordinates', () => expect(b8(9, 17)).toBe(b8(1, 1)));

import { createQualityProbe, initialQuality } from '@/scripts/effects/quality';
it('downgrades on slow frames', () => {
  const p = createQualityProbe({ frames: 3, budgetMs: 24 });
  [30, 28, 40].forEach((ms) => p.sample(ms));
  expect(p.verdict()).toBe('lite');
});
it('stays full on fast frames', () => {
  const p = createQualityProbe({ frames: 3 });
  [10, 12, 9].forEach((ms) => p.sample(ms));
  expect(p.verdict()).toBe('full');
});
it('low memory or save-data starts lite', () => {
  expect(initialQuality({ deviceMemory: 2 })).toBe('lite');
  expect(initialQuality({ connection: { saveData: true } })).toBe('lite');
  expect(initialQuality({ deviceMemory: 8 })).toBe('full');
});
```

- [ ] **Step 2:** Napsat e2e `effects.spec.ts`: (a) LCP prvkem je hero `<img>` (`PerformanceObserver` na `largest-contentful-paint`, `entry.element.tagName === 'IMG'`); (b) při `reduce` jsou všechny `canvas.dz` a `canvas.ascii` skryté a `canvas.dwipe` vykreslený staticky; (c) při opakované návštěvě s fotkou v cache se úvodní rozpouštění přeskočí (`window.__ascii.intro === 'skipped'` v neprodukčním buildu); (d) na `mobile-360` lupa po 5 s zastaví (`window.__ascii.lens === 'idle'`).
- [ ] **Step 3:** Spustit, FAIL. Implementovat podle `rozpad.js`, sekce 1–3, s těmito rozdíly proti prototypu:
  - Žádné vlastní smyčky `requestAnimationFrame`, vše přes plánovač. Průběh z ScrollTriggeru (fold, wipe), ne z `getBoundingClientRect` v každém snímku.
  - ASCII: buňka 10 px desktop i mobil (prototyp: 8 px na mobilu), strop 6 000 buněk (při překročení se buňka zvětší), glyfy z atlasu (`glyph-atlas.ts` předkreslí 12 znaků rampy ve 3 jasových úrovních a korálové variantě do offscreen canvasu; `paint` volá `drawImage`). Náhodné blikání znaků jen při `pointer: fine`. Překreslení jen při změně `A` nebo pohybu lupy, ne každý 8. snímek.
  - `createQualityProbe` během úvodu, verdikt `lite` → úvod se zkrátí na prolnutí a lupa se vypne.
  - Když `img.complete` při inicializaci, `heroState.load = 0` (bez úvodu, riziko R4).
  - Lupa na dotyku bloudí 5 s a pak zastaví.
  - DPR max. 1,5, `willReadFrequently` jen na vzorkovacím canvasu.
- [ ] **Step 4:** Výkonový test `tests/perf/ascii.perf.ts` (Playwright, Chromium, CDP `Emulation.setCPUThrottlingRate { rate: 4 }`, 390 × 844): z `requestAnimationFrame` změřit časy snímků během úvodu a 3 s lupy. Očekávání: medián ≤ 16,7 ms, 95. percentil ≤ 50 ms. Spouští se `pnpm test:perf`, ne v každém `pnpm check`.
- [ ] **Step 5:** Testy PASS.
- [ ] **Step 6:** Commit `feat: dither, wipe and ASCII hero effects with adaptive quality`.

---

### Úkol 10: Poptávkový formulář (React island)

**Files:**
- Create: `src/config/privacy.ts`, `src/lib/inquiry/schema.ts`, `src/lib/inquiry/source.ts`, `src/islands/InquiryForm.tsx`, `src/islands/useTurnstile.ts`, `src/islands/prefill.ts`, `tests/unit/inquiry-schema.test.ts`, `tests/unit/prefill.test.ts`, `tests/unit/source.test.ts`, `tests/e2e/inquiry.spec.ts`
- Modify: `src/components/Inquiry.astro` (vložit `<InquiryForm client:visible locale={locale} siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY} />`), `src/components/ServiceCard.astro` (odkaz „Spočítat cenu“)

**Interfaces:**
- Consumes: `estimate`, `formatRange`, `SERVICE_IDS`, `ADDON_IDS` (úkol 4), `t(locale)` (úkol 3).
- Produces:

```ts
// src/lib/inquiry/schema.ts
export const inquirySchema: z.ZodObject<…>;
export type InquiryInput = z.infer<typeof inquirySchema>;
// src/config/privacy.ts
export const PRIVACY_NOTICE_VERSION = '2026-11-21'; // bump whenever the privacy page text changes
export const ANONYMIZE_AFTER_DAYS = 365;
// src/lib/inquiry/source.ts
export interface InquirySource { referrer?: string; landingPath?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }
export function readSource(loc: { href: string }, referrer: string, ownHost: string): InquirySource; // own-host referrer dropped, values trimmed to 200 chars
export type InquiryResponse = { ok: true } | { ok: false; errors: Partial<Record<keyof InquiryInput | 'form', string>> };
// src/islands/prefill.ts
export function readPrefill(hash: string): { service?: ServiceId; hours?: number; addons?: AddonId[] }; // '#poptavka?sluzba=match&doplnky=video'
```

```ts
export const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  service: z.enum(SERVICE_IDS as [ServiceId, ...ServiceId[]]),
  hours: z.number().int().min(1).max(12).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  place: z.string().trim().max(200).optional(),
  guests: z.number().int().min(1).max(10000).optional(),
  addons: z.array(z.enum(ADDON_IDS as [AddonId, ...AddonId[]])).max(ADDON_IDS.length),
  note: z.string().trim().max(4000).optional(),
  locale: z.enum(['cs', 'en']),
  source: z.object({
    referrer: z.string().url().max(200).optional(),
    landingPath: z.string().startsWith('/').max(200).optional(),
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
  }).default({}),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(0).optional(), // honeypot
});
```

- [ ] **Step 1:** Unit testy schématu: platná poptávka projde (i bez `source`); e-mail `jana@` neprojde; `source.landingPath` bez úvodního `/` neprojde; neznámá služba neprojde; `note` 4 001 znaků neprojde; vyplněný `website` neprojde. Testy `readSource`: `('https://martinruzek.eu/?utm_source=ig&utm_campaign=jaro', 'https://www.instagram.com/', 'martinruzek.eu')` → `{ referrer: 'https://www.instagram.com/', landingPath: '/', utmSource: 'ig', utmCampaign: 'jaro' }`; referrer z vlastní domény se vynechá; prázdný referrer se vynechá. Testy `readPrefill`: `'#poptavka?sluzba=match'` → `{ service: 'match' }`, neznámá hodnota → `{}`, `'#inquiry?service=event&hours=4'` → `{ service: 'event', hours: 4 }`.
- [ ] **Step 2:** E2e (testovací klíče Turnstile `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` v `.dev.vars` pro testy; endpoint v tomto úkolu nahradí `page.route`):
  - odhad se mění s typem, hodinami a příplatky (3 h + týž den → `4 200–5 070 Kč`);
  - odeslání prázdného formuláře přesune fokus na pole Jméno a ukáže chybu propojenou přes `aria-describedby`;
  - **dvojí klik** na Odeslat pošle jediný požadavek (tlačítko se během odesílání zakáže);
  - **výpadek sítě** (`route.abort()`) a **odpověď 500** ukážou chybu ve `role="alert"` a hodnoty polí zůstanou;
  - odkaz „Spočítat cenu“ u Sportu předvyplní typ Zápas;
  - Turnstile skript se nestáhne, dokud formulář není blízko viewportu;
  - formulář nemá žádné zaškrtávátko souhlasu, nad tlačítkem je věta s odkazem na zásady ve správném jazyce;
  - po úspěšném odeslání se zavolá `umami.track('inquiry_sent', { service })` (v testu podstrčený `window.umami`), při chybě `inquiry_error`. Bez `window.umami` formulář funguje stejně.
- [ ] **Step 3:** Spustit, FAIL. Implementovat `InquiryForm.tsx` (řízené pole, validace přes `inquirySchema.shape[pole].safeParse` při blur, celé schéma při submit, stavy `idle | sending | sent | error`, vzhled a třídy z `index.html:393-416`, zaškrtávátka souhlasu z prototypu se vynechají). Zdroj poptávky přes `readSource(location, document.referrer, location.host)` při odeslání, nic se neukládá do prohlížeče. Měření přes `track()` z `src/scripts/analytics.ts` (úkol 14 ho doplní, tady stačí funkce, která volá `window.umami?.track`). `useTurnstile` vloží skript `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` až po `IntersectionObserver` (rootMargin 400 px) nebo prvním `focusin` a vykreslí widget s `appearance: 'interaction-only'`. Pod formulářem `<noscript>` s přímými kontakty.
- [ ] **Step 4:** Testy PASS.
- [ ] **Step 5:** Commit `feat: inquiry form island with live estimate and Turnstile`.

---

### Úkol 11: Endpoint poptávky, D1 a e-maily

**Files:**
- Create: `db/migrations/0001_inquiries.sql`, `src/server/inquiry/types.ts`, `store.ts`, `turnstile.ts`, `mailer.ts`, `emails.ts`, `handler.ts`, `src/pages/api/inquiry.ts`, `tests/unit/handler.test.ts`, `tests/workers/store.test.ts`, `vitest.workers.config.ts`
- Modify: `wrangler.jsonc` (rate limit binding `INQUIRY_RL`, proměnné `OWNER_EMAIL`, `ALLOWED_ORIGIN`), `.dev.vars.example`

**Interfaces:**
- Consumes: `inquirySchema`, `InquiryResponse`, `readSource` (úkol 10), `PRIVACY_NOTICE_VERSION` (`src/config/privacy.ts`, úkol 10), `estimate` (úkol 4).
- Produces:

```ts
// types.ts
export type InquiryStatus = 'new' | 'won' | 'lost';
export interface InquiryRecord extends Omit<InquiryInput, 'turnstileToken' | 'website' | 'source'> {
  id: string; createdAt: number; estimateFrom: number; estimateTo: number;
  noticeVersion: string; status: InquiryStatus;
  referrer: string | null; landingPath: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
  notifiedAt: number | null; confirmedAt: number | null; anonymizedAt: number | null;
}
export interface InquiryStore {
  insert(r: InquiryRecord): Promise<void>;
  markNotified(id: string, at: number): Promise<void>;
  markConfirmed(id: string, at: number): Promise<void>;
  listUnnotified(createdBefore: number, limit: number): Promise<InquiryRecord[]>;
  listAnonymizable(createdBefore: number): Promise<InquiryRecord[]>; // status != 'won' AND anonymized_at IS NULL
  anonymizeCreatedBefore(ts: number, at: number): Promise<number>;   // same filter; returns affected rows
}
export interface Mailer { send(m: { from: string; to: string; subject: string; text: string; replyTo?: string }): Promise<void> }
export interface InquiryDeps {
  store: InquiryStore; mailer: Mailer;
  verifyTurnstile(token: string, ip: string | null): Promise<boolean>;
  rateLimit(key: string): Promise<boolean>; // true = allowed
  now(): number; newId(): string; waitUntil(p: Promise<unknown>): void;
  ownerEmail: string;   // 'foto@martinruzek.cz'
  fromEmail: string;    // 'noreply@martinruzek.eu'
  allowedOrigin: string;
}
// handler.ts
export function handleInquiry(req: Request, deps: InquiryDeps): Promise<Response>;
// store.ts
export function d1Store(db: D1Database): InquiryStore;
// emails.ts
export function ownerEmail(r: InquiryRecord): { subject: string; text: string };
export function clientConfirmation(r: InquiryRecord): { subject: string; text: string }; // fixed template: no free-text user input (note, place, name)
```

- [ ] **Step 1:** Migrace:

```sql
-- db/migrations/0001_inquiries.sql
CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('cs', 'en')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'won', 'lost')),
  -- personal data: set to NULL on anonymization
  name TEXT,
  email TEXT,
  phone TEXT,
  place TEXT,
  note TEXT,
  time_from TEXT,
  time_to TEXT,
  -- kept for statistics (event_date reduced to YYYY-MM, referrer to origin on anonymization)
  service TEXT NOT NULL,
  hours INTEGER,
  event_date TEXT,
  guests INTEGER,
  addons TEXT NOT NULL DEFAULT '[]',
  estimate_from INTEGER NOT NULL,
  estimate_to INTEGER NOT NULL,
  referrer TEXT,
  landing_path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notice_version TEXT NOT NULL,
  notified_at INTEGER,
  confirmed_at INTEGER,
  anonymized_at INTEGER,
  CHECK (anonymized_at IS NOT NULL OR (name IS NOT NULL AND email IS NOT NULL))
);
CREATE INDEX idx_inquiries_created_at ON inquiries (created_at);
CREATE INDEX idx_inquiries_unnotified ON inquiries (notified_at) WHERE notified_at IS NULL;
```

- [ ] **Step 2:** Unit testy handleru s falešnými závislostmi (paměťový `InquiryStore`, mailer zapisující do pole, `waitUntil` sbírající promise):

```ts
const valid = { name: 'Jana Nováková', email: 'jana@example.com', service: 'event', hours: 3, addons: ['sameDay'],
  locale: 'cs', turnstileToken: 'ok', source: { utmSource: 'ig' } };
const req = (body: unknown, origin = 'https://martinruzek.eu') =>
  new Request('https://martinruzek.eu/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': '203.0.113.7' }, body: JSON.stringify(body) });

it('stores valid inquiry with server-side estimate and sends two mails', async () => {
  const d = fakeDeps();
  const res = await handleInquiry(req({ ...valid }), d);
  expect(res.status).toBe(200);
  await Promise.all(d.pending);
  expect(d.rows[0]).toMatchObject({ estimateFrom: 4200, estimateTo: 5070, noticeVersion: PRIVACY_NOTICE_VERSION, status: 'new', utmSource: 'ig' });
  expect(d.sent.map((m) => [m.from, m.to, m.replyTo])).toEqual([
    ['noreply@martinruzek.eu', 'foto@martinruzek.cz', 'jana@example.com'],
    ['noreply@martinruzek.eu', 'jana@example.com', 'foto@martinruzek.cz'],
  ]);
  expect(d.rows[0].notifiedAt).not.toBeNull();
});
it('ignores client-sent estimate fields', async () => { /* body with estimateFrom: 1 → stored 4200 */ });
it('403 when Turnstile fails, nothing stored', async () => { /* verifyTurnstile → false */ });
it('403 on foreign origin', async () => { /* origin https://evil.example */ });
it('429 when rate limited', async () => { /* rateLimit → false */ });
it('400 with field errors on invalid body', async () => { /* email 'jana@' → errors.email */ });
it('honeypot: 200, nothing stored, no mail', async () => { /* website: 'x' */ });
it('405 on GET', async () => {});
it('owner mail failure keeps row with notifiedAt null and still returns 200', async () => {});
it('client confirmation never contains the free-text note', async () => {
  const d = fakeDeps();
  await handleInquiry(req({ ...valid, note: 'BUY CHEAP PILLS http://spam' }), d);
  await Promise.all(d.pending);
  expect(d.sent[1].text).not.toContain('spam');
});
it('same turnstile token twice stores one row', async () => { /* second verify returns false like real siteverify */ });
```

- [ ] **Step 3:** Workers test `tests/workers/store.test.ts` přes `@cloudflare/vitest-pool-workers` se skutečnou lokální D1 a aplikovanými migracemi: `insert` → `listUnnotified` ho vrátí; `markNotified` → už ne; `anonymizeCreatedBefore` u starých záznamů se stavem `new` a `lost` vynuluje `name`, `email`, `phone`, `place`, `note`, `time_from`, `time_to`, zkrátí `event_date` na `YYYY-MM` a `referrer` na origin, nastaví `anonymized_at` a vrátí počet; záznam `won` a mladší záznamy nechá beze změny; druhé spuštění nic nezmění (vrátí 0); řádek zůstane (počet řádků se nemění).
- [ ] **Step 4:** Spustit, FAIL. Implementovat:
  - `turnstile.ts`: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` jako `FormData` (`secret`, `response`, `remoteip`), vrátí `success === true`, při síťové chybě `false`.
  - `mailer.ts`: rozhraní `Mailer` a implementace pro poskytovatele odesílání. Nejdřív ověřit na Martinově účtu, jestli Cloudflare Email Service umí posílat na libovolné adresy. Pokud ano, použít ho, jinak Resend. Výsledek zapsat do `docs/decisions.md`. Pro vývoj a testy `consoleMailer`. Produkční build bez nastaveného poskytovatele selže v `check:launch`.
  - `handler.ts`: pořadí metoda → origin → rate limit (`cf-connecting-ip`) → JSON → Turnstile → schéma → honeypot → `estimate` → `insert` → `waitUntil(maily + markNotified/markConfirmed)`.
  - `src/pages/api/inquiry.ts`: `export const prerender = false`, `POST` sestaví `InquiryDeps` z bindingů podle dokumentace zamčeného adaptéru (env a `waitUntil`) a zavolá `handleInquiry`.
- [ ] **Step 5:** Testy PASS. E2e z úkolu 10 přepnout z `page.route` na skutečný endpoint v `wrangler dev` s lokální D1 a testovacími klíči Turnstile. PASS.
- [ ] **Step 6:** Commit `feat: inquiry endpoint with D1, Turnstile and mail`.

---

### Úkol 12: Údržbový worker (anonymizace, opakované odeslání)

**Files:**
- Create: `workers/maintenance/wrangler.jsonc`, `workers/maintenance/src/index.ts`, `workers/maintenance/src/run.ts`, `tests/unit/maintenance.test.ts`
- Modify: `package.json` (skript `deploy:maintenance`)

**Interfaces:**
- Consumes: `InquiryStore`, `Mailer`, `ownerEmail`, `clientConfirmation` (úkol 11).
- Produces: `runMaintenance(deps: { store: InquiryStore; mailer: Mailer; now(): number; anonymizeAfterDays: number; ownerEmail: string; fromEmail: string }): Promise<{ anonymized: number; resent: number; previewed: number }>`. `anonymizeAfterDays` se bere z `ANONYMIZE_AFTER_DAYS` (úkol 10).

- [ ] **Step 1:** Unit testy: záznam `new` nebo `lost` starší než `anonymizeAfterDays` se anonymizuje, `won` a mladší zůstanou; záznam s `notifiedAt = null` starší než 10 min se pošle znovu a označí; selhání mailu u jednoho záznamu nezastaví ostatní; `anonymizeAfterDays` ≤ 30 nebo `NaN` vyhodí chybu (nikdy neanonymizuje všechno); **přehled předem** (riziko R11): první den v měsíci pošle na `ownerEmail` seznam poptávek, které se během příštích 31 dnů anonymizují (datum, typ, jméno), aby Martin mohl označit zakázky jako `won`. Prázdný seznam = žádný e-mail.
- [ ] **Step 2:** FAIL → implementovat. `index.ts` exportuje `scheduled` (cron `0 3 * * *`) a importuje `ANONYMIZE_AFTER_DAYS` ze sdíleného `src/config/privacy.ts`. README: jak označit zakázku (`wrangler d1 execute ruzek-inquiries --remote --command "UPDATE inquiries SET status='won' WHERE id='…'"`).
- [ ] **Step 3:** PASS. Commit `feat: maintenance worker for anonymization and mail retries`.

---

### Úkol 13: SEO, zásady, 404 a případové studie

**Files:**
- Create: `src/components/SeoHead.astro`, `src/components/JsonLd.astro`, `src/lib/seo/jsonld.ts`, `src/pages/zasady-ochrany-osobnich-udaju.astro`, `src/pages/en/privacy.astro`, `src/pages/404.astro`, `src/pages/pripadove-studie/[slug].astro`, `src/pages/en/case-studies/[slug].astro`, `src/components/CaseStudy.astro`, `public/robots.txt`, `tests/unit/jsonld.test.ts`, `tests/e2e/seo.spec.ts`
- Modify: `astro.config.ts` (sitemap i18n a filtr draftů), `src/layouts/Base.astro`

**Interfaces:**
- Consumes: `services`, `addons`, `terms` (úkol 4), `site` (úkol 7), `alternates` (úkol 3).
- Produces: `buildJsonLd(locale: Locale): object[]` (`Person`, `ProfessionalService` s `OfferCatalog`).

- [ ] **Step 1:** Unit test: každá služba z `services` má v `OfferCatalog` jednu nabídku s `priceSpecification.minPrice` rovnou spodní ceně (akce 1 500, zápas 1 500) a `priceCurrency: 'CZK'`; `address` chybí, dokud `site.legal.seat` je `null`; `sameAs` obsahuje Instagram a žádné `null`.
- [ ] **Step 2:** E2e: `/` i `/en/` mají `canonical`, `hreflang` cs/en/x-default, `og:image` (1200 × 630); `/sitemap-index.xml` obsahuje obě úvodní stránky s alternativami a neobsahuje drafty případových studií; `/neexistuje` vrací 404 se stránkou v češtině; zásady obsahují `TODO`, zmínku o Turnstile, Cloudflare a Umami, větu o anonymizaci po 12 měsících a verzi rovnou `PRIVACY_NOTICE_VERSION`.
- [ ] **Step 3:** FAIL → implementovat. Zásady jako šablona s nadpisy (správce, účel, právní základ: jednání před uzavřením smlouvy, doba uchování a anonymizace, měření bez cookies: Umami a Cloudflare Web Analytics, příjemci: Cloudflare včetně Turnstile, poskytovatel e-mailu, Umami, práva, kontakt `foto@martinruzek.cz`) a obsahem `TODO` pro odborníka. Na stránce je vidět verze `PRIVACY_NOTICE_VERSION`. Případové studie se generují jen z `draft: false`. Šablona obsahuje hlavičku ve stylu „match report“ (skóre a místo jen pokud jsou vyplněné) a mozaiku fotek.
- [ ] **Step 4:** PASS. Commit `feat: SEO, privacy page, 404 and case study model`.

---

### Úkol 14: Hlavičky, měření (Umami a Cloudflare) a test cookies

**Files:**
- Create: `public/_headers`, `src/config/analytics.ts`, `src/scripts/analytics.ts`, `tests/unit/analytics.test.ts`, `tests/e2e/privacy.spec.ts`, `tests/e2e/analytics.spec.ts`
- Modify: `src/layouts/Base.astro` (načtení měření), komponenty s `data-umami-event` (kontakty, přepínač jazyka, lightbox, odkazy „Spočítat cenu“)

**Interfaces:**
- Produces:

```ts
// src/config/analytics.ts
export const analytics: { umami: { src: string; websiteId: string } | null; cfBeaconToken: string | null }; // null when env var missing
// src/scripts/analytics.ts
export type TrackEvent = 'inquiry_sent' | 'inquiry_error' | 'estimate_used' | 'contact_click' | 'lightbox_open' | 'lang_switch';
export function track(event: TrackEvent, data?: Record<string, string | number>): void; // no-op without window.umami
export function loadAnalytics(cfg: typeof analytics, win?: Window): void; // injects scripts after load + requestIdleCallback
```

- [ ] **Step 0:** Unit test `analytics.test.ts`: `track` bez `window.umami` nevyhodí chybu; s podstrčeným `umami.track` mu předá název a data; `loadAnalytics` s `null` konfigurací nic nevloží; s konfigurací vloží dva `<script defer>` (Umami s `data-website-id`, Cloudflare s `data-cf-beacon`) až po `load` a `requestIdleCallback`. Pak e2e `analytics.spec.ts`: požadavky na skript Umami a `static.cloudflareinsights.com` přijdou až po události `load`; klik na telefon pošle `contact_click`. Ověřit, že tvar atributů a API Umami odpovídá jejich aktuální dokumentaci.

- [ ] **Step 1:** E2e: po načtení (se zapnutým měřením), scrollu na konec, otevření lightboxu a odeslání formuláře je `context.cookies()` prázdné a `localStorage.length === 0`; na stránce není cookie lišta; odpověď `/` má hlavičky `content-security-policy`, `referrer-policy: strict-origin-when-cross-origin`, `x-content-type-options: nosniff`, `permissions-policy`; v DOM není `iframe` mimo Turnstile.
- [ ] **Step 2:** FAIL → `_headers`:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cloud.umami.is; frame-src https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com https://cloud.umami.is https://api-gateway.umami.dev; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Inline skript z úkolu 2 povolit hashem (`'sha256-…'`, generovaný při buildu, nebo CSP podpora zamčeného Astra). Domény Umami ověřit podle skutečných požadavků cloudu a při přechodu na vlastní server je vyměnit (hodnota se generuje z `PUBLIC_UMAMI_SRC`). Ověřit, že `style-src 'unsafe-inline'` je nutné (GSAP píše inline styly přes CSSOM, to CSP neblokuje). Pokud ne, odstranit.
- [ ] **Step 3:** PASS. Commit `feat: security headers and cookieless analytics (Umami, Cloudflare)`.

---

### Úkol 15: Výkonové rozpočty, kontrola před spuštěním a README

**Files:**
- Create: `lighthouserc.json`, `scripts/check-launch.ts`, `tests/unit/check-launch.test.ts`
- Modify: `README.md` (vývoj, přidání fotky, stažení fotky, změna cen, překlady, nasazení, licence písem), `package.json` (`check:launch`, `lhci`), `docs/decisions.md`

**Interfaces:**
- Produces: `launchProblems(opts: { photos: Photo<unknown>[]; env: Record<string, string | undefined> }): string[]`.

- [ ] **Step 1:** Unit test `check-launch`: publikovaná zástupná fotka → problém; chybí `TURNSTILE_SECRET`, poskytovatel e-mailu, `PUBLIC_UMAMI_WEBSITE_ID` nebo `PUBLIC_CF_BEACON_TOKEN` → problém; vše v pořádku → `[]`. Zbylá `TODO` v `dist/` se vypíšou jako seznam (varování, ne chyba, protože viditelná TODO jsou podle pravidel povolená).
- [ ] **Step 2:** FAIL → implementovat → PASS.
- [ ] **Step 3:** `lighthouserc.json` s rozpočty z konceptu, kap. 13 (mobil: LCP ≤ 2 200 ms, TBT ≤ 200 ms, CLS ≤ 0,05, Performance ≥ 0,95, Accessibility = 1) a `resource-summary` rozpočty (JS první vykreslení ≤ 10 kB, celkový JS včetně měření ≤ 150 kB, písma ≤ 70 kB nad ohybem). Lighthouse běží se zapnutým měřením.. `pnpm lhci` nad `pnpm preview`. Opravit, co nesplní.
- [ ] **Step 4:** `pnpm test:perf` (úkol 9). Ruční kontrola na levném Androidu: plynulost úvodu, lupa, pin, lightbox. Výsledek zapsat do README.
- [ ] **Step 5:** README sekce „Jak přidat fotku“ (`pnpm photos:import`, YAML, `consentRef`, záznam v `private/`), „Jak fotku stáhnout“ (`published: false`, nasadit), „Jak změnit ceny“ (`src/config/pricing.ts`, testy, nasadit), „Poptávky a anonymizace“ (označení `won`, měsíční přehled, změna zásad = zvýšit `PRIVACY_NOTICE_VERSION`), „Měření“ (Umami, Cloudflare, přechod Umami na vlastní server). Do `docs/decisions.md` zapsat schválení konceptu s datem.
- [ ] **Step 6:** Commit `chore: performance budgets, launch check and docs`.

---

### Úkol 16: Nasazení (s Martinem)

Kroky na Cloudflare účtu dělá Martin, nebo agent s jeho výslovným souhlasem u každého kroku (jsou nevratné nebo veřejné).

- [ ] **Step 1:** `wrangler d1 create ruzek-inquiries`, ID do `wrangler.jsonc` (obou workerů), `wrangler d1 migrations apply ruzek-inquiries --remote`.
- [ ] **Step 2:** Turnstile widget pro `martinruzek.eu`, `wrangler secret put TURNSTILE_SECRET`, site key do `PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] **Step 3:** Alias `foto@martinruzek.cz` u Email Profi (Martin). Odesílání z `noreply@martinruzek.eu` přes poskytovatele z úkolu 11: DNS záznamy SPF, DKIM a DMARC na `martinruzek.eu`, tajný klíč přes `wrangler secret`.
- [ ] **Step 4:** Nasazení `workers/maintenance`. Umami: web v cloudu, ID do `PUBLIC_UMAMI_WEBSITE_ID`. Cloudflare Web Analytics: token do `PUBLIC_CF_BEACON_TOKEN`. Google Search Console: ověření domény přes DNS a odeslání sitemap.
- [ ] **Step 5:** `pnpm check && pnpm test:e2e && pnpm check:launch`, pak `pnpm build && wrangler deploy`. `pnpm build` spouští `astro build && pnpm check:exif`, takže `dist` se prohledá při každém buildu a nasazuje se jen výstup, který prošel (nikdy `wrangler deploy` bez předchozího `pnpm build`). Vlastní doména `martinruzek.eu`.
- [ ] **Step 6:** Kontrola na produkci: testovací poptávka dojde na `foto@` (odpověď jde klientovi) i na testovací adresu klienta (odpověď jde na `foto@`), záznam je v D1 se zdrojem, v Umami je vidět `inquiry_sent`, v Cloudflare první data, Lighthouse na produkční URL, žádné cookies.
- [ ] **Step 7:** Commit `chore: production configuration` (bez tajemství) a záznam do `docs/decisions.md`.

---

## Browser check

Kontrolu v prohlížeči dělá Codex Sol v T3 po každých 2 přijatých UI chunkách (B, E, F, G, H, I, L), nejvýš 2× za běh.

- **Setup:** `pnpm install`, `pnpm build && pnpm preview` (web na `http://localhost:8787`). Prototyp pro srovnání: `cd design/final/rozpad && python3 -m http.server 8080` (`http://localhost:8080`). Po kontrole oba procesy ukončit.
- **Přihlášení:** žádné.
- **Flows:**
  1. `/` na 1440 × 900 a 390 × 844 vedle prototypu: header, hero, pás, fotografické sekce, přechody, práce, služby, týž den, o mně, poptávka, patička. Hledat rozdíly v barvách, písmech, rozestupech a textech.
  2. `/en/` totéž, dlouhé anglické texty se nesmí lámat ani přetékat.
  3. `/` a `/en/` na 360 × 780: žádný vodorovný scroll, jméno v hero, pás, ceny a štítky se vejdou.
  4. `prefers-reduced-motion: reduce` (emulace): veškerý obsah vidět, žádné ASCII ani pin, přechody statické.
  5. Klávesnice: Tab od skip linku přes navigaci, kotvy sekcí (fokus na sekci), lightbox (Enter otevře, šipky listují, Esc zavře a vrátí fokus), pauza pásu.
  6. Formulář (od chunku I): prázdné odeslání (chyby a fokus), vyplněný stav s odhadem ceny, chyba sítě, úspěch. Žádné zaškrtávátko souhlasu, věta se zásadami nad tlačítkem.
  7. Zásady, 404 a EN zásady (od chunku L).
- **Vždy:** konzole bez chyb, žádné požadavky na Google Fonts ani jiné CDN, žádné cookies. Web nemá tmavý přepínač, tmavý režim systému se nekontroluje.

## Mimo tento plán

- Vertikální videa (R2, nebo Stream): samostatný plán po rozhodnutí.
- Načítací obrazovka a animace loga: až po Martinově zadání.
- „Ze zákulisí“ a technická data fotek, přetvořená mřížka kontaktního archu.
- Přesměrování `martinruzek.cz`.
- Google Ads, lišta se souhlasem a Google tag: až budou kampaně aktuální.
- Přesun Umami na Martinův vlastní server (změna `PUBLIC_UMAMI_SRC` a CSP).
- Rozhraní pro správu poptávek (budoucí Martinova aplikace).
