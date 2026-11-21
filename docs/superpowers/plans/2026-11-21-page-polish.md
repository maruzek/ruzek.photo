# Úpravy po první prohlídce webu: plán implementace

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cíl:** Opravit chyby, které Martin našel při první prohlídce (oříznuté jméno, mizející portrét a odstavce, prázdná místa), zmodernizovat formulář (dlaždice místo selectu, délka akce z času, krokovač, skupiny), sjednotit odkazy, doplnit telefon a WhatsApp, zavést kopírování e-mailu na desktopu a připravit srovnání s písmem Instrument Serif ve worktree.

**Architektura:** Všechno jsou úpravy existujícího Astro webu ve vlastním worktree s větví `feat/page-polish`, založené z `feat/rozpad-astro` (úkoly 1–7). Pohyb zůstává v `src/scripts/motion/choreo.ts`, formulář v islandu `src/islands/InquiryForm.tsx`, nový je jen čistý modul `src/lib/inquiry/duration.ts` a malý skript `src/scripts/copy-email.ts` načítaný líně. Experiment s písmem žije ve vlastním worktree a větvi a nemerguje se bez Martinova rozhodnutí.

**Tech Stack:** pnpm, Astro 7, React 19 (island), TypeScript strict, GSAP 3.15 (ScrollTrigger, SplitText), Lenis, Vitest, Playwright.

**Spec:** Martinovo zadání a odpovědi v konverzaci z 2026-11-21 (shrnuto v kapitole „Rozhodnutí“ níže). Platí [AGENTS.md](../../../AGENTS.md), [docs/concept.md](../../concept.md) a [docs/decisions.md](../../decisions.md).

## Rozhodnutí (Martin, 2026-11-21)

1. Oříznuté jméno opravit.
2. Serif: v hlavní větvi zatím neměnit. Instrument Serif vyzkoušet ve worktree, aby šel porovnat se současnou verzí.
3. Prázdné místo mezi Službami a „Týž den“ zmenšit a změnit nadpis. Martin vybral „Výběr na sítě *ještě* ten den.“
4. Opravit portrét a prázdné místo v sekci O mně.
5. Select „Co fotíme“ nahradit dlaždicemi.
6. Formulář: délka akce se dopočítá ze začátku a konce, krokovač hodin, skupiny polí, na mobilu tlačítko přes celou šířku.
7. Tečkované podtržení pro odkazy v textu. E-mail se na desktopu kopíruje do schránky s hláškou, na dotykových zařízeních otevře poštu. Telefon **+420 731 808 342**, WhatsApp je na stejném čísle.
8. Tabindexy z Astro auditu se neřeší (`tabindex="-1"` na `main` a sekcích je záměrný cíl fokusu po skoku z menu).

## Global Constraints

- Jen `pnpm`, nikdy `npm`.
- TypeScript strict, žádné `any`.
- Kód, názvy souborů a commity anglicky. Texty webu česky i anglicky ve slovnících `src/i18n/cs.ts` a `src/i18n/en.ts` (`en` musí splňovat `Dictionary`), nikdy natvrdo v komponentách.
- Nevymýšlet obsah, chybějící místa přes `<Todo>`.
- Žádné cookies a žádné nové externí skripty. Odkaz na `wa.me` je jen odkaz.
- Vždy respektovat `prefers-reduced-motion`.
- Rozpočet JS pro první vykreslení je 10 kB gzip (teď 9,3 kB). Nový JS se proto načítá dynamickým importem.
- Šířka 360 px bez vodorovného scrollu (hlídá `tests/e2e/layout.spec.ts`).
- Hotovo znamená, že projde `pnpm check` a dotčené e2e testy (`pnpm test:e2e <soubor>`).

## Review Focus

1. **Skok z menu na sekci pod přišpendlenou sekcí „Týž den“:** odstavce a portrét se musí ukázat i po skoku, nejen po plynulém scrollu (test v úkolu 1).
2. **Nízký notebook (1280 × 640):** sekce „Týž den“ může být vyšší než okno. Při přišpendlení nesmí uříznout svůj nadpis (test v úkolu 3).
3. **Čas přes půlnoc, stejné časy a víc než 12 hodin:** 22:00–02:00 jsou 4 h, stejné časy délku neurčí, 14 h ukáže srozumitelnou chybu (testy v úkolu 6).
4. **Schránka odmítne zápis** (zakázané oprávnění, starý prohlížeč): uživatel nesmí zůstat bez odezvy. Hláška nabídne otevření pošty (test v úkolu 7).
5. **Dotykové zařízení:** klik na e-mail se nesmí přerušit, musí normálně otevřít `mailto:` (test v úkolu 7).

---

### Task 1: Přišpendlení „Týž den“ se přepočítá jako první

Příčina: `sameDay()` vytváří přišpendlující ScrollTrigger až v druhém `mm.add` v `start.ts`, tedy po animacích pod ním (vstupy, dithering, přechody). Ty se proto přepočítají bez odsazení, které přišpendlení přidá (naměřeno 1 011 px při výšce okna 920 px). Portrét se rozpadá příliš brzy a jednorázové vstupy se po skoku z menu přeskočí. `refreshPriority` způsobí, že ScrollTrigger pole seřadí a přišpendlení přepočítá první (`ScrollTrigger.sort()`, viz `node_modules/gsap/src/ScrollTrigger.js:652`).

**Files:**
- Modify: `src/scripts/motion/choreo.ts` (funkce `sameDay`, kolem ř. 222–247)
- Test: `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: nic nového
- Produces: nic nového (signatura `sameDay(libs, root, desktop)` se nemění)

- [ ] **Step 1: Write the failing test** – na konec `tests/e2e/motion.spec.ts`:

```ts
// Review Focus 1: triggers below the pinned "same day" section must include the pin's spacing
test('after a jump from the menu, the About section is fully shown (desktop pin)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the "same day" pin is desktop only');
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.getByRole('navigation').getByRole('link', { name: /^O\smně$/ }).click(); // the label has a nbsp
  for (const p of await page.locator('.about [data-rise]').all())
    await expect(p).toHaveCSS('opacity', '1', { timeout: 4000 });
  // the portrait's dither canvas is fully transparent once the photo has assembled
  await expect
    .poll(
      () =>
        page.locator('.about canvas.dz').evaluate((cv: HTMLCanvasElement) => {
          const ctx = cv.getContext('2d');
          if (!ctx || cv.dataset['painted'] !== 'live') return -1;
          const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
          let opaque = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) opaque++;
          return opaque;
        }),
      { timeout: 4000 },
    )
    .toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e tests/e2e/motion.spec.ts -g "About section is fully shown" --project desktop`
Expected: FAIL (opacita odstavců zůstává `0`, případně má plátno neprůhledné pixely).

- [ ] **Step 3: Write minimal implementation** – v `sameDay()` doplň do `scrollTrigger`:

```ts
      scrollTrigger: {
        trigger: day,
        start: desktop ? 'top top' : 'top 70%',
        end: desktop ? '+=110%' : 'bottom 60%',
        scrub: true,
        pin: desktop,
        // created after the triggers below it (start.ts): refreshing first lets them include the pin spacing
        refreshPriority: 1,
        onUpdate: (s) =>
```

(Úkol 3 později změní `start`. Tady se mění jen `refreshPriority`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:e2e tests/e2e/motion.spec.ts --project desktop`
Expected: PASS celý soubor.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/motion/choreo.ts tests/e2e/motion.spec.ts
git commit -m "fix: refresh the same-day pin first so triggers below it include its spacing"
```

---

### Task 2: Masky SplitText neořezávají písmena

Příčina: `#name` má `line-height: 0.84` a SplitText každé písmeno obalí maskou s `overflow: clip` o výšce řádku, takže se ořízne tečka nad „i“ a kroužek nad „Ů“. Nadpisy `[data-split]` mají `line-height: 1` a hrozí stejné oříznutí háčků u verzálek. Maska dostane třídu (SplitText k třídě písmena nebo řádku přidá `-mask`, viz `node_modules/gsap/src/SplitText.js:281`) a nahoře vnitřní odsazení vyrovnané záporným okrajem. Výška řádku se tím nemění. Výchozí posun se zvětší, aby písmeno na začátku animace nevykouklo v odsazení.

**Files:**
- Modify: `src/scripts/motion/choreo.ts` (funkce `entrances`, ř. 41–82)
- Modify: `src/styles/sections/hero.css` (za pravidlo `.hero h1`)
- Modify: `src/styles/base.css` (za `.h`)
- Test: `tests/e2e/motion.spec.ts`

**Interfaces:**
- Produces: třídy `nm-ch` / `nm-ch-mask` (jméno) a `sl` / `sl-mask` (řádky nadpisů)

- [ ] **Step 1: Write the failing test** – do `tests/e2e/motion.spec.ts`:

```ts
// Each mask (SplitText sets overflow: clip inline) must reach above the ink of its glyph: Ů's ring, i's dot
test('the name mask does not clip accents or dots', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.evaluate(() => document.fonts.ready);
  // wait until the entrance has finished
  await expect
    .poll(() =>
      page.locator('#name [style*="clip"] > *').evaluateAll((els) =>
        els.every((el) => /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(el).transform)),
      ),
    )
    .toBe(true);
  const clipped = await page.locator('#name').evaluate((h1) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return ['no canvas'];
    const out: string[] = [];
    const masks = [...h1.querySelectorAll<HTMLElement>('[style*="clip"]')];
    if (masks.length === 0) return ['no masks'];
    for (const mask of masks) {
      const ch = mask.firstElementChild as HTMLElement | null;
      if (!ch?.textContent?.trim()) continue;
      const cs = getComputedStyle(ch);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(ch.textContent);
      const lh = parseFloat(cs.lineHeight);
      const a = m.fontBoundingBoxAscent;
      const d = m.fontBoundingBoxDescent;
      const baseline = ch.getBoundingClientRect().top + (lh - (a + d)) / 2 + a;
      const inkTop = baseline - m.actualBoundingBoxAscent;
      if (mask.getBoundingClientRect().top > inkTop + 0.5) out.push(ch.textContent);
    }
    return out;
  });
  expect(clipped).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e tests/e2e/motion.spec.ts -g "does not clip" --project desktop`
Expected: FAIL, `clipped` obsahuje aspoň `i` a `ů`.

- [ ] **Step 3: Write minimal implementation**

V `entrances()` (`choreo.ts`) jméno:

```ts
    SplitText.create(name, {
      type: 'chars',
      mask: 'chars',
      charsClass: 'nm-ch', // the mask gets `nm-ch-mask` (hero.css gives it headroom for accents)
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 140, // below the mask's extra headroom, so no accent peeks out at the start
          duration: 1.25,
          ease: 'expo.out',
          stagger: 0.045,
          delay: 0.55,
        }),
    });
```

a nadpisy `[data-split]`:

```ts
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'sl', // the mask gets `sl-mask` (base.css gives it room for háčky)
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 125,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        }),
    });
```

`hero.css`, za blok `.hero h1 { … }`:

```css
/* SplitText masks (choreo.ts): the line-height of 0.84 is shorter than the glyphs, so the clip box gets headroom
   for Ů's ring and the dots; the negative margin keeps the line box as it was */
.hero h1 .nm-ch-mask {
  padding-top: 0.32em;
  margin-top: -0.32em;
}
```

`base.css`, za blok `.h { … }`:

```css
/* SplitText line masks (choreo.ts): room for háčky above capitals, the line box stays the same */
.sl-mask {
  padding-block: 0.12em;
  margin-block: -0.12em;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:e2e tests/e2e/motion.spec.ts tests/e2e/font-swap.spec.ts`
Expected: PASS (font-swap ověří, že se jméno neposunulo).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/motion/choreo.ts src/styles/sections/hero.css src/styles/base.css tests/e2e/motion.spec.ts
git commit -m "fix: give SplitText masks headroom so the name and headings keep their accents"
```

---

### Task 3: Méně prázdného místa (Týž den, sekce za přechody)

Příčina: Služby mají spodní odsazení `--sec` (až 184 px), „Týž den“ má další `--sec` nahoře a navíc `min-height: 100svh` s obsahem uprostřed. Sekce hned za dithered přechodem (`canvas.dwipe`) mají plné `--sec`, přestože přechod sám tvoří 120–220 px odstupu. Nově bude mít „Týž den“ výšku podle obsahu a při přišpendlení zůstane uprostřed okna. Když je vyšší než okno, přišpendlí se nahoře. Sekce za přechodem mají poloviční horní odsazení.

**Files:**
- Modify: `src/styles/sections/day.css`
- Modify: `src/styles/base.css` (za `.sec`)
- Modify: `src/scripts/motion/choreo.ts` (`sameDay`)
- Test: `tests/e2e/static-sections.spec.ts`, `tests/e2e/motion.spec.ts`

- [ ] **Step 1: Write the failing tests**

Do `tests/e2e/static-sections.spec.ts`:

```ts
test('no dead band between services and "same day", sections after a wipe start closer (desktop)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'measured at 1440 × 900');
  await page.emulateMedia({ reducedMotion: 'reduce' }); // layout without the pin
  await page.goto('/');
  const m = await page.evaluate(() => {
    const top = (s: string): number => document.querySelector(s)!.getBoundingClientRect().top;
    const svc = document.querySelector('.svc-sec')!;
    return {
      gap: top('.day .eyebrow') - svc.lastElementChild!.getBoundingClientRect().bottom,
      aboutPad: parseFloat(getComputedStyle(document.querySelector('.about')!).paddingTop),
      secPad: parseFloat(getComputedStyle(svc).paddingTop),
    };
  });
  expect(m.gap).toBeLessThan(300); // was ≈ 420
  expect(m.aboutPad).toBeLessThanOrEqual(m.secPad / 2 + 1);
});
```

Do `tests/e2e/motion.spec.ts`:

```ts
// Review Focus 2: on a short laptop the pinned section must not cut off its own heading
test('"same day" pinned on a short screen keeps its heading in view', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the pin is desktop only');
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.locator('.day').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300); // into the pinned range
  await page.waitForTimeout(800);
  const top = await page.locator('.day .eyebrow').evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 2: Run tests to verify the first fails**

Run: `pnpm test:e2e tests/e2e/static-sections.spec.ts -g "dead band" --project desktop`
Expected: FAIL (`gap` ≈ 420). Test nízkého notebooku může projít už teď a zůstává jako pojistka.

- [ ] **Step 3: Write minimal implementation**

`day.css`, blok `.day`:

```css
.day {
  display: grid;
  /* the section after the services: half the top spacing, the services' bottom padding already separates them */
  padding: calc(var(--sec) * 0.5) var(--m) var(--sec);
}
```

a v `@media (max-width: 900px)` smaž `.day { min-height: 0; }` (už není co přebíjet).

`base.css`, za `.sec { … }`:

```css
/* A dithered wipe already puts 120–220 px between zones: the section after it starts at half the spacing */
.dwipe + .sec,
.dwipe + .light > .sec:first-child {
  padding-top: calc(var(--sec) * 0.5);
}
```

`choreo.ts`, `sameDay()`: `start` se počítá při každém přepočtu:

```ts
        // pinned in the middle of the screen while it fits, at the top when it is taller (short laptops)
        start: desktop ? () => (day.offsetHeight < innerHeight ? 'center center' : 'top top') : 'top 70%',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:e2e tests/e2e/static-sections.spec.ts tests/e2e/motion.spec.ts tests/e2e/layout.spec.ts`
Expected: PASS. Ručně si prohlédni přechod Služby → Týž den a O mně na 1440 px.

- [ ] **Step 5: Commit**

```bash
git add src/styles/sections/day.css src/styles/base.css src/scripts/motion/choreo.ts tests/e2e/static-sections.spec.ts tests/e2e/motion.spec.ts
git commit -m "fix: drop the dead bands around the same-day section and after wipes"
```

---

### Task 4: Nový nadpis sekce „Týž den“

Nadpis s „ten den“ by zdvojil štítek „TÝŽ DEN“, štítek se proto mění na „Postup“. Krok „03 · Týž den“ zůstává.

**Files:**
- Modify: `src/i18n/cs.ts` (`day.eyebrow`, `day.title`, ř. 144–145)
- Modify: `src/i18n/en.ts` (`day.eyebrow`, `day.title`, ř. 130–131)

- [ ] **Step 1: Find tests that quote the old copy**

Run: `grep -rn "Od příjezdu\|From arrival" tests src`
Expected: shody jen ve slovnících. Pokud test cituje starý text, uprav ho v tomto úkolu.

- [ ] **Step 2: Change the copy**

`cs.ts`:

```ts
  day: {
    eyebrow: 'Postup',
    title: 'Výběr na sítě *ještě* ten den.',
```

`en.ts`:

```ts
  day: {
    eyebrow: 'How it works',
    title: 'Your social media picks *the same* day.',
```

- [ ] **Step 3: Run checks**

Run: `pnpm test && pnpm exec astro check`
Expected: PASS (`i18n.test.ts` hlídá shodu klíčů).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/cs.ts src/i18n/en.ts
git commit -m "copy: clearer same-day heading"
```

---

### Task 5: Dlaždice místo selectu „Co fotíme“

Čtyři přepínače (radio) ve stylu dlaždic příplatků (`.tick`). Bez rozbalovací nabídky a bez JS navíc.

**Files:**
- Modify: `src/islands/InquiryForm.tsx` (select ř. 446–461, `DOM_ID`, `<output htmlFor>`)
- Modify: `src/styles/inquiry-form.css`
- Test: `tests/e2e/inquiry.spec.ts` (ř. 50 a 205 plus nový test)

**Interfaces:**
- Produces: id přepínačů `inq-type-event`, `inq-type-short`, `inq-type-match`, `inq-type-portrait`. `DOM_ID.service = 'inq-type-event'`. Skupina je `fieldset` s `legend` = `f.type.label`.

- [ ] **Step 1: Write the failing test and update the old ones**

V `tests/e2e/inquiry.spec.ts` nahraď ř. 50:

```ts
    await page.getByRole('radio', { name: 'Zápas' }).check();
```

a ř. 205:

```ts
    await expect(page.getByRole('radio', { name: 'Zápas' })).toBeChecked();
```

Přidej do `test.describe('inquiry form', …)`:

```ts
  test('the service is a group of four tiles, no dropdown', async ({ page }) => {
    await open(page);
    await toForm(page);
    const group = page.getByRole('group', { name: 'Co fotíme' });
    await expect(group.getByRole('radio')).toHaveCount(4);
    await expect(page.locator('#inq select')).toHaveCount(0);
    await expect(group.getByRole('radio', { name: 'Akce' })).toBeChecked();
    await group.getByRole('radio', { name: 'Portrét' }).check();
    await expect(page.getByLabel('Délka akce (hodiny)')).toBeHidden();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:e2e tests/e2e/inquiry.spec.ts -g "tiles|estimate follows|preselects"`
Expected: FAIL (radio neexistuje).

- [ ] **Step 3: Write minimal implementation**

V `DOM_ID` změň `service: 'inq-type'` na `service: 'inq-type-event'`.

`<output htmlFor=…>` změň na:

```tsx
          <output htmlFor="inq-type-event inq-type-short inq-type-match inq-type-portrait inq-hours inq-same inq-video">
```

Celý blok `{field('service', …)}` se selectem nahraď:

```tsx
        <fieldset
          className={['field', 'full', 'choice', errors.service && 'bad'].filter(Boolean).join(' ')}
          aria-describedby={errors.service ? 'inq-type-msg' : undefined}
        >
          <legend>{f.type.label}</legend>
          <div className="choices">
            {services.map((s) => (
              <label className="tick" key={s.id}>
                <input
                  type="radio"
                  id={`inq-type-${s.id}`}
                  name="service"
                  value={s.id}
                  checked={values.service === s.id}
                  onChange={() => set('service', s.id)}
                />
                <span>{f.type.options[s.id]}</span>
              </label>
            ))}
          </div>
          {errors.service && (
            <span className="msg" id="inq-type-msg">
              {errors.service}
            </span>
          )}
        </fieldset>
```

`inquiry-form.css`: smaž blok `.inq-form select { … }` a z výběrů `:is(input, select, textarea)` odstraň `select` (pravidla zůstanou pro `input, textarea`). Přidej:

```css
/* "Co fotíme": radio tiles in the add-ons' style (.tick) */
.inq-form .choice {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.inq-form .choice legend {
  font-weight: 500;
  padding: 0;
  margin-bottom: 10px;
}
.inq-form .choices {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.inq-form .tick input[type='radio'] {
  accent-color: var(--light-ink);
}
```

a do `@media (max-width: 900px)`:

```css
  .inq-form .choices {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
```

Pravidlo `.inq-form .tick input` nastavuje `width/height 20px`. Platí i pro radio a tak to má zůstat.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:e2e tests/e2e/inquiry.spec.ts tests/e2e/layout.spec.ts tests/e2e/a11y.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/islands/InquiryForm.tsx src/styles/inquiry-form.css tests/e2e/inquiry.spec.ts
git commit -m "feat: pick the service with radio tiles instead of a select"
```

---

### Task 6: Délka akce z času, krokovač hodin, skupiny polí

**Files:**
- Create: `src/lib/inquiry/duration.ts`
- Create: `tests/unit/duration.test.ts`
- Modify: `src/islands/InquiryForm.tsx`
- Modify: `src/styles/inquiry-form.css`
- Modify: `src/i18n/cs.ts`, `src/i18n/en.ts` (`inquiry.form`, `inquiry.errors`)
- Test: `tests/e2e/inquiry.spec.ts`

**Interfaces:**
- Produces: `hoursBetween(from: string, to: string): number | undefined`. Vrací celé hodiny zaokrouhlené nahoru, konec před začátkem znamená přes půlnoc, prázdný či neplatný čas nebo stejné časy vrátí `undefined`.
- Nové klíče slovníku: `inquiry.form.groups.{contact,event,extras}`, `inquiry.form.hoursFromTimes`, `inquiry.form.hoursLess`, `inquiry.form.hoursMore`, `inquiry.errors.hoursFromTimes`.

- [ ] **Step 1: Write the failing unit test** – `tests/unit/duration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hoursBetween } from '@/lib/inquiry/duration';

describe('hoursBetween', () => {
  it('counts whole hours, rounded up', () => {
    expect(hoursBetween('18:00', '23:00')).toBe(5);
    expect(hoursBetween('18:00', '23:30')).toBe(6);
    expect(hoursBetween('09:15', '09:45')).toBe(1);
  });
  it('runs past midnight when the end is before the start', () => {
    expect(hoursBetween('22:00', '02:00')).toBe(4);
  });
  it('gives nothing for equal, missing or invalid times', () => {
    expect(hoursBetween('18:00', '18:00')).toBeUndefined();
    expect(hoursBetween('', '18:00')).toBeUndefined();
    expect(hoursBetween('18:00', '')).toBeUndefined();
    expect(hoursBetween('24:00', '02:00')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/unit/duration.test.ts`
Expected: FAIL (modul neexistuje).

- [ ] **Step 3: Implement `duration.ts`**

```ts
// Event length from the start and end time in the inquiry form: the form fills the hours from it, so a client
// never has to give the same information twice.
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MIN = 24 * 60;

const minutes = (v: string): number | undefined => {
  const m = TIME.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
};

/** Whole hours from `from` to `to` ("HH:MM"), rounded up; an end before the start runs past midnight. */
export function hoursBetween(from: string, to: string): number | undefined {
  const a = minutes(from);
  const b = minutes(to);
  if (a === undefined || b === undefined || a === b) return undefined;
  return Math.ceil(((b - a + DAY_MIN) % DAY_MIN) / 60);
}
```

Run: `pnpm test tests/unit/duration.test.ts` → PASS.

- [ ] **Step 4: Write the failing e2e tests** – do `test.describe('inquiry form', …)`:

```ts
  test('the hours follow the start and end time, also past midnight', async ({ page }) => {
    await open(page);
    await toForm(page);
    const hours = page.getByLabel('Délka akce (hodiny)');
    await page.getByLabel(/Začátek/).fill('18:00');
    await page.getByLabel(/Konec/).fill('23:30');
    await expect(hours).toHaveValue('6');
    await expect(hours).toHaveAttribute('readonly', '');
    await expect(page.getByText('Spočítáno ze začátku a konce.')).toBeVisible();
    await page.getByLabel(/Začátek/).fill('22:00');
    await page.getByLabel(/Konec/).fill('02:00');
    await expect(hours).toHaveValue('4');
    await page.getByLabel(/Konec/).fill('');
    await expect(hours).not.toHaveAttribute('readonly', '');
  });

  test('more than 12 hours between the times shows a clear error', async ({ page }) => {
    await open(page);
    await toForm(page);
    await page.getByLabel(/Začátek/).fill('08:00');
    await page.getByLabel(/Konec/).fill('22:00');
    await expect(page.getByText(/víc než 12 hodin/)).toBeVisible();
  });

  test('the stepper changes the hours within 1–12', async ({ page }) => {
    await open(page);
    await toForm(page);
    const hours = page.getByLabel('Délka akce (hodiny)');
    await page.getByRole('button', { name: 'Přidat hodinu' }).click();
    await expect(hours).toHaveValue('4');
    await hours.fill('1');
    await expect(page.getByRole('button', { name: 'Ubrat hodinu' })).toBeDisabled();
  });

  test('fields are grouped under Kontakt, Akce and Výstupy', async ({ page }) => {
    await open(page);
    await toForm(page);
    for (const name of ['Kontakt', 'Akce', 'Výstupy a poznámka'])
      await expect(page.locator('#inq').getByRole('heading', { name, level: 3 })).toBeVisible();
  });
```

Run: `pnpm test:e2e tests/e2e/inquiry.spec.ts -g "hours follow|12 hours|stepper|grouped"` → FAIL.

- [ ] **Step 5: Add the dictionary keys**

`cs.ts`, do `inquiry.form` (za `hours`):

```ts
      hoursFromTimes: 'Spočítáno ze začátku a konce.',
      hoursLess: 'Ubrat hodinu',
      hoursMore: 'Přidat hodinu',
      groups: { contact: 'Kontakt', event: 'Akce', extras: 'Výstupy a poznámka' },
```

do `inquiry.errors`:

```ts
      hoursFromTimes: 'Mezi začátkem a koncem je víc než 12 hodin. Delší akci popište v poznámce.',
```

`en.ts`, stejná místa:

```ts
      hoursFromTimes: 'Calculated from the start and end.',
      hoursLess: 'One hour less',
      hoursMore: 'One hour more',
      groups: { contact: 'Contact', event: 'Event', extras: 'Extras and notes' },
```

```ts
      hoursFromTimes: 'There are more than 12 hours between the start and end. Describe a longer event in the note.',
```

- [ ] **Step 6: Implement in `InquiryForm.tsx`**

Import: `import { hoursBetween } from '../lib/inquiry/duration';`

Pod `isHourly` přidej:

```ts
/** With both times filled in, the hours are taken from them (the client does not enter the length twice). */
const withDerivedHours = (v: Values): Values => {
  const h = hoursBetween(v.timeFrom, v.timeTo);
  return h === undefined ? v : { ...v, hours: String(h) };
};
const hoursLocked = (v: Values): boolean => isHourly(v.service) && hoursBetween(v.timeFrom, v.timeTo) !== undefined;
```

`ORDER` přeuspořádej podle nového pořadí polí:

```ts
const ORDER: readonly InquiryField[] = [
  'name', 'email', 'phone', 'service', 'date', 'place', 'timeFrom', 'timeTo', 'hours', 'guests', 'addons', 'note',
];
```

`message` dostane hodnoty, aby u odvozené délky vybrala správnou hlášku:

```ts
  const message = (field: InquiryField, v: Values = values): string => {
    const e = text.errors;
    switch (field) {
      // …beze změny…
      case 'hours':
        return hoursLocked(v) ? e.hoursFromTimes : e.hours;
      // …beze změny…
    }
  };
```

ve `validate` předávej `message(field, v)`.

`set` počítá délku z času:

```ts
  const set = <K extends keyof Values>(key: K, value: Values[K]): void => {
    const next = withDerivedHours({ ...values, [key]: value });
    setValues(next);
    // an error disappears as soon as the field is valid again
    if (key !== 'website' && errors[key as InquiryField]) validate(key as InquiryField, next);
    // a length taken from the times is checked at once (more than 12 hours)
    if ((key === 'timeFrom' || key === 'timeTo') && hoursLocked(next)) validate('hours', next);
  };

  const step = (delta: number): void => {
    const cur = Number.parseInt(values.hours, 10);
    set('hours', String(Math.min(12, Math.max(1, (Number.isFinite(cur) ? cur : 1) + delta))));
  };
```

Pomocník `field` dostane volitelnou poznámku a `aria-describedby` spojí z chyby i poznámky:

```tsx
  const field = (
    name: InquiryField,
    label: string,
    input: (aria: { 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode,
    opts: { optional?: boolean; full?: boolean; hidden?: boolean; note?: string } = {},
  ): ReactNode => {
    const id = DOM_ID[name] ?? name;
    const err = errors[name];
    const describedBy = [err && `${id}-msg`, opts.note && `${id}-note`].filter(Boolean).join(' ');
    return (
      <div className={['field', opts.full && 'full', err && 'bad'].filter(Boolean).join(' ')} hidden={opts.hidden}>
        <label htmlFor={id}>
          {label}
          {opts.optional && (
            <>
              {' '}
              <span className="opt">{f.optional}</span>
            </>
          )}
        </label>
        {input({ ...(err ? { 'aria-invalid': true as const } : {}), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
        {opts.note && (
          <span className="note" id={`${id}-note`}>
            {opts.note}
          </span>
        )}
        {err && (
          <span className="msg" id={`${id}-msg`}>
            {err}
          </span>
        )}
      </div>
    );
  };
```

Pole hodin s krokovačem (nahrazuje stávající `{field('hours', …)}`):

```tsx
        {field(
          'hours',
          f.hours.label,
          (aria) => (
            <div className="stepper">
              <button
                type="button"
                aria-label={f.hoursLess}
                aria-controls="inq-hours"
                disabled={locked || Number(values.hours) <= 1}
                onClick={() => step(-1)}
              >
                −
              </button>
              <input
                id="inq-hours"
                name="hours"
                type="number"
                min={1}
                max={12}
                step={1}
                inputMode="numeric"
                readOnly={locked}
                value={values.hours}
                onChange={(e) => set('hours', e.target.value)}
                onBlur={blur('hours')}
                {...aria}
              />
              <button
                type="button"
                aria-label={f.hoursMore}
                aria-controls="inq-hours"
                disabled={locked || Number(values.hours) >= 12}
                onClick={() => step(1)}
              >
                +
              </button>
            </div>
          ),
          { hidden: !hourly, ...(locked ? { note: f.hoursFromTimes } : {}) },
        )}
```

kde `const locked = hoursLocked(values);` stojí vedle `const hourly = …`.

Pořadí JSX ve `<form>`: `<h3 className="grp mono">{f.groups.contact}</h3>`, name, email, phone, `<h3 className="grp mono">{f.groups.event}</h3>`, fieldset služby (úkol 5), date, place, timeFrom, timeTo, hours, guests, `<h3 className="grp mono">{f.groups.extras}</h3>`, fieldset `.ticks`, note. Zbytek (honeypot, privacy, turnstile, actions, msg, done, noscript) beze změny.

- [ ] **Step 7: Styles** – do `inquiry-form.css`:

```css
/* Group headings inside the form (Kontakt / Akce / Výstupy) */
.inq-form .grp {
  grid-column: 1 / -1;
  color: var(--light-muted);
  border-top: 1px solid var(--rule-l);
  padding-top: 20px;
  margin-top: 8px;
}
.inq-form .grp:first-child {
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
}
/* Hours: − [n] + instead of the native spinner */
.inq-form .stepper {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 52px;
  align-items: stretch;
}
.inq-form .stepper input {
  text-align: center;
  appearance: textfield;
}
.inq-form .stepper input::-webkit-inner-spin-button,
.inq-form .stepper input::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}
.inq-form .stepper input[readonly] {
  color: var(--light-muted);
}
.inq-form .stepper button {
  margin: 0;
  border: 1px solid var(--rule-l);
  background: transparent;
  font-size: 22px;
  cursor: pointer;
}
.inq-form .stepper button:hover:not(:disabled) {
  border-color: var(--light-ink);
}
.inq-form .stepper button:focus-visible {
  outline: 2px solid var(--light-ink);
  outline-offset: 2px;
}
.inq-form .stepper button:disabled {
  color: var(--control);
  cursor: default;
}
.inq-form .note {
  color: var(--light-muted);
  font-size: 15px;
}
```

a do `@media (max-width: 900px)`:

```css
  .inq-form .actions .btn {
    width: 100%;
    justify-content: center;
  }
```

- [ ] **Step 8: Run all tests**

Run: `pnpm check && pnpm test:e2e tests/e2e/inquiry.spec.ts tests/e2e/layout.spec.ts tests/e2e/a11y.spec.ts tests/e2e/no-js.spec.ts`
Expected: PASS. Kontrast `--light-muted` na `--light` už hlídá `pnpm check:contrast` (poznámky používají stejnou dvojici barev jako `.opt`).

- [ ] **Step 9: Commit**

```bash
git add src/lib/inquiry/duration.ts tests/unit/duration.test.ts src/islands/InquiryForm.tsx src/styles/inquiry-form.css src/i18n/cs.ts src/i18n/en.ts tests/e2e/inquiry.spec.ts
git commit -m "feat: derive the event length from the times, hour stepper, grouped form fields"
```

---

### Task 7: Telefon, WhatsApp, podtržené odkazy a kopírování e-mailu

**Files:**
- Create: `src/lib/contact.ts`
- Create: `src/scripts/copy-email.ts`
- Create: `src/components/CopyToast.astro`
- Modify: `src/config/site.ts` (`contact`)
- Modify: `src/components/Inquiry.astro`, `src/components/Footer.astro`, `src/components/PrivacyPage.astro`
- Modify: `src/layouts/Base.astro` (vykreslit `<CopyToast>`)
- Modify: `src/styles/base.css`
- Modify: `src/i18n/cs.ts`, `src/i18n/en.ts` (`common`, `inquiry.direct`)
- Modify: `tests/unit/jsonld.test.ts`
- Modify: `docs/decisions.md`
- Test: `tests/unit/contact.test.ts`, `tests/e2e/static-sections.spec.ts`

**Interfaces:**
- Produces: `telHref(phone: string): string` (`'+420 731 808 342'` → `'tel:+420731808342'`). Atribut `data-copy-email` na odkazech `mailto:`. Toast `[data-copy-toast]` s `[data-copy-text]` a `[data-copy-open]`, živá oblast `[data-copy-live]`.
- Nové klíče: `common.emailCopied`, `common.copyFailed`, `common.openMail`, `inquiry.direct.whatsapp`.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/contact.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { telHref } from '@/lib/contact';

describe('telHref', () => {
  it('keeps only the plus and the digits', () => {
    expect(telHref('+420 731 808 342')).toBe('tel:+420731808342');
  });
});
```

V `tests/unit/jsonld.test.ts` uprav test „invents nothing“ (telefon už známý je):

```ts
  it('invents nothing: no ratings, reviews, opening hours or geo', () => {
    const json = JSON.stringify(buildJsonLd('cs'));
    for (const key of ['aggregateRating', 'review', 'openingHours', 'geo']) expect(json).not.toContain(key);
  });

  it('gives the public phone number', () => {
    expect(JSON.stringify(buildJsonLd('cs'))).toContain(`"telephone":"${site.contact.phone}"`);
  });
```

Run: `pnpm test tests/unit/contact.test.ts tests/unit/jsonld.test.ts` → FAIL.

- [ ] **Step 2: Implement contact facts**

`src/lib/contact.ts`:

```ts
/** `tel:` link for a phone number written for people ("+420 731 808 342"). */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;
```

`site.ts`:

```ts
  contact: { email: 'foto@martinruzek.cz', phone: '+420 731 808 342', whatsapp: 'https://wa.me/420731808342' },
```

Run: `pnpm test tests/unit/contact.test.ts tests/unit/jsonld.test.ts` → PASS.

- [ ] **Step 3: Write the failing e2e tests** – do `tests/e2e/static-sections.spec.ts`:

```ts
test('text links have the dashed underline, phone and WhatsApp are links', async ({ page }) => {
  await page.goto('/');
  const direct = page.locator('.direct');
  await expect(direct.getByRole('link', { name: '+420 731 808 342' })).toHaveAttribute('href', 'tel:+420731808342');
  await expect(direct.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/420731808342');
  for (const link of [direct.getByRole('link', { name: 'foto@martinruzek.cz' }), page.locator('footer.foot .cols a').first()]) {
    await expect(link).toHaveCSS('text-decoration-line', 'none');
    await expect(link).toHaveCSS('background-image', /repeating-linear-gradient/);
  }
});

test('desktop: a click on the e-mail copies it and says so', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'fine pointer only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('[data-copy-toast][data-ready]').waitFor({ state: 'attached' });
  await page.locator('footer.foot a[data-copy-email]').click();
  await expect(page.locator('[data-copy-toast]')).toBeVisible();
  await expect(page.locator('[data-copy-live]')).toHaveText('E-mail je zkopírovaný.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('foto@martinruzek.cz');
});

// Review Focus 4
test('desktop: when copying fails, the toast offers the mail app', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'fine pointer only');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
  });
  await page.goto('/');
  await page.locator('[data-copy-toast][data-ready]').waitFor({ state: 'attached' });
  await page.locator('footer.foot a[data-copy-email]').click();
  await expect(page.locator('[data-copy-live]')).toHaveText('Adresu se nepodařilo zkopírovat.');
  await expect(page.locator('[data-copy-open]')).toHaveAttribute('href', 'mailto:foto@martinruzek.cz');
});

// Review Focus 5
test('touch: a click on the e-mail is a plain mailto link', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-360', 'touch only');
  await page.goto('/');
  await page.locator('[data-copy-toast][data-ready]').waitFor({ state: 'attached' }); // the lazy module runs
  const prevented = await page.evaluate(() => {
    let seen = true;
    // window's bubble listener runs after the module's document listener: it reads its verdict, then keeps
    // the test page from following the mailto: link
    addEventListener(
      'click',
      (e) => {
        seen = e.defaultPrevented;
        e.preventDefault();
      },
      { once: true },
    );
    document.querySelector<HTMLAnchorElement>('footer.foot a[data-copy-email]')?.click();
    return seen;
  });
  expect(prevented).toBe(false);
  await expect(page.locator('[data-copy-toast]')).toBeHidden();
});
```

Run: `pnpm test:e2e tests/e2e/static-sections.spec.ts -g "underline|copies|copying fails|plain mailto"` → FAIL.

- [ ] **Step 4: Dictionary keys**

`cs.ts`, `common`: `emailCopied: 'E-mail je zkopírovaný.'`, `copyFailed: 'Adresu se nepodařilo zkopírovat.'`, `openMail: 'Otevřít v poště'`. `inquiry.direct`: `whatsapp: 'Napsat na WhatsApp'`.
`en.ts`: `emailCopied: 'Email copied.'`, `copyFailed: 'Could not copy the address.'`, `openMail: 'Open in your mail app'`, `whatsapp: 'Message on WhatsApp'`.

- [ ] **Step 5: Copy script and toast**

`src/scripts/copy-email.ts`:

```ts
// With a mouse (fine pointer), a click on an e-mail link copies the address and shows a toast with a link to the
// mail app; on touch the link opens the mail app as usual. The link stays a real mailto: without JS and for the
// browser's own "copy address". Loaded lazily (CopyToast.astro), outside the first-render JS budget.
const FINE = '(hover: hover) and (pointer: fine)';
const SHOW_MS = 6000;

export function initCopyEmail(doc: Document = document): () => void {
  const toast = doc.querySelector<HTMLElement>('[data-copy-toast]');
  const text = toast?.querySelector<HTMLElement>('[data-copy-text]');
  const open = toast?.querySelector<HTMLAnchorElement>('[data-copy-open]');
  const live = doc.querySelector<HTMLElement>('[data-copy-live]');
  if (!toast || !text || !open || !live) return () => undefined;
  let timer = 0;
  // the toast holds a link: it stays while hovered or focused (WCAG 2.2.1)
  const later = (): void => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (toast.matches(':hover, :focus-within')) later();
      else toast.hidden = true;
    }, SHOW_MS);
  };
  const show = (message: string, href: string): void => {
    text.textContent = message;
    open.href = href;
    toast.hidden = false;
    live.textContent = '';
    requestAnimationFrame(() => (live.textContent = message)); // a fresh change is announced again
    later();
  };
  const onClick = (e: MouseEvent): void => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-copy-email]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!matchMedia(FINE).matches) return;
    e.preventDefault();
    const address = decodeURIComponent(a.href.replace(/^mailto:/, '').split('?')[0] ?? '');
    const copied = navigator.clipboard?.writeText(address) ?? Promise.reject(new Error('no clipboard'));
    copied.then(
      () => show(toast.dataset['copied'] ?? '', a.href),
      () => show(toast.dataset['failed'] ?? '', a.href),
    );
  };
  doc.addEventListener('click', onClick);
  toast.dataset['ready'] = ''; // tests wait for this before clicking
  return () => {
    doc.removeEventListener('click', onClick);
    clearTimeout(timer);
    delete toast.dataset['ready'];
  };
}
```

`src/components/CopyToast.astro`:

```astro
---
// Toast for copied e-mail addresses (scripts/copy-email.ts). The live region is separate and always present, so
// screen readers announce the message even though the toast itself appears from `hidden`.
import { site } from '../config/site';
import { t, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}

const d = t(Astro.props.locale).common;
---

<div class="toast" data-copy-toast data-copied={d.emailCopied} data-failed={d.copyFailed} hidden>
  <span data-copy-text></span>
  <a data-copy-open href={`mailto:${site.contact.email}`}>{d.openMail}</a>
</div>
<p class="vh" role="status" data-copy-live></p>

<script>
  const load = (): void => void import('../scripts/copy-email').then((m) => m.initCopyEmail());
  if ('requestIdleCallback' in window) requestIdleCallback(load);
  else setTimeout(load, 1);
</script>
```

V `Base.astro` vykresli `<CopyToast locale={locale} />` jako poslední prvek v `<body>` (import nahoře).

- [ ] **Step 6: Links in components**

`Inquiry.astro`, slot `direct`:

```astro
    <div slot="direct" class="direct">
      <span class="mono">{q.direct.label}</span>
      <span>
        {q.direct.phone}{' '}
        {site.contact.phone ? (
          <a href={telHref(site.contact.phone)} data-umami-event="contact_click" data-umami-event-type="phone">
            {site.contact.phone}
          </a>
        ) : (
          <Todo>{q.direct.phoneTodo}</Todo>
        )}
        {site.contact.whatsapp && (
          <>
            {' · '}
            <a
              href={site.contact.whatsapp}
              rel="noopener"
              target="_blank"
              data-umami-event="contact_click"
              data-umami-event-type="whatsapp">{q.direct.whatsapp}</a
            >
          </>
        )}
      </span>
      <span>
        {q.direct.email}{' '}
        <a
          href={`mailto:${site.contact.email}`}
          data-copy-email
          data-umami-event="contact_click"
          data-umami-event-type="email">{site.contact.email}</a
        >
      </span>
    </div>
```

(import `telHref` z `../lib/contact`).

`Footer.astro`: e-mail dostane `data-copy-email` a telefon místo `{site.contact.phone ?? <Todo>…}`:

```astro
      {site.contact.phone ? (
        <a href={telHref(site.contact.phone)} data-umami-event="contact_click" data-umami-event-type="phone">
          {site.contact.phone}
        </a>
      ) : (
        <Todo>{f.contact.phoneTodo}</Todo>
      )}
```

`PrivacyPage.astro` ř. 58: e-mailový odkaz dostane `data-copy-email`.

- [ ] **Step 7: Link and toast styles** – do `base.css` (za `.lnk:focus-visible`):

```css
/* Links in running text (contacts, footer, privacy page): the dashed underline of the hero's .lnk, solid on hover */
:where(.direct, .foot .cols, .foot .legal, .inq-form .privacy, .inq-form .noscript, .prose, .page .back, .toast) a {
  text-decoration: none;
  padding-bottom: 3px;
  background: repeating-linear-gradient(90deg, currentcolor 0 3px, transparent 3px 6px) left bottom / 100% 1px
    no-repeat;
  box-decoration-break: clone;
}
:where(.direct, .foot .cols, .foot .legal, .inq-form .privacy, .inq-form .noscript, .prose, .page .back, .toast)
  a:hover {
  background-image: linear-gradient(currentcolor, currentcolor);
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 60;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 14px 20px;
  background: var(--night);
  color: var(--ink);
  font-size: var(--t-s);
  max-width: calc(100vw - 32px);
}
.toast[hidden] {
  display: none;
}
```

Z `footer.css` (`.foot .cols a`) a `inquiry.css` (`.direct a`) smaž `text-underline-offset`, už se nepoužívá.

- [ ] **Step 8: Decision log** – v `docs/decisions.md` přidej nahoru pod „## Rozhodnuto“:

```markdown
### 2026-11-21: úpravy po první prohlídce
- **Telefon +420 731 808 342** je veřejný (poptávka, patička, JSON-LD), WhatsApp je na stejném čísle (odkaz `wa.me`, žádné vložení ani cookies).
- **E-mail:** na zařízení s myší klik adresu zkopíruje a ukáže hlášku s odkazem do pošty, na dotykovém zařízení otevře poštu. Odkaz zůstává `mailto:`.
- **Formulář:** typ focení vybírá dlaždicemi, délka akce se dopočítá ze začátku a konce, pole jsou ve skupinách Kontakt / Akce / Výstupy.
- **Odkazy v textu** mají tečkované podtržení jako „Prohlédnout práci“, hlavní menu ne.
- **Astro audit „tabindex“:** neřeší se. `tabindex="-1"` na `main` a sekcích je cíl fokusu po skoku z menu a do pořadí tabulátoru nic nepřidává.
- **Serif:** Instrument Serif se zkouší ve worktree `exp/instrument-serif`. Crimson Pro zůstává, dokud Martin nerozhodne.
```

- [ ] **Step 9: Run all tests**

Run: `pnpm check && pnpm test:e2e tests/e2e/static-sections.spec.ts tests/e2e/layout.spec.ts tests/e2e/analytics.spec.ts tests/e2e/privacy.spec.ts tests/e2e/a11y.spec.ts tests/e2e/seo.spec.ts`
Expected: PASS. Kdyby `analytics.spec.ts` (klik na e-mail v patičce, ř. 43) na desktopu selhal kvůli kopírování, přidej mu `context.grantPermissions(['clipboard-write'])`. Událost `contact_click` posílá Umami podle atributu `data-umami-event` i při `preventDefault`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/contact.ts src/scripts/copy-email.ts src/components/CopyToast.astro src/config/site.ts src/components/Inquiry.astro src/components/Footer.astro src/components/PrivacyPage.astro src/layouts/Base.astro src/styles/base.css src/styles/sections/footer.css src/styles/sections/inquiry.css src/i18n/cs.ts src/i18n/en.ts tests/unit/contact.test.ts tests/unit/jsonld.test.ts tests/e2e/static-sections.spec.ts docs/decisions.md
git commit -m "feat: public phone and WhatsApp, dashed text links, copy the e-mail on desktop"
```

---

### Task 8: Srovnání s Instrument Serif ve worktree

Až budou úkoly 1–7 commitnuté ve `feat/page-polish`. Worktree pro písmo vzniká z této větve, aby se obě verze lišily jen písmem. Úkol provádí samostatný agent.

**Files (jen ve worktree `../ruzek.photo-instrument`):**
- Modify: `package.json`, `pnpm-lock.yaml` (`@fontsource/instrument-serif`)
- Modify: `astro.config.ts` (záznam písma `--font-accent`)
- Modify: `src/styles/tokens.css` (`--f-accent`)
- Modify: testy a README, které jmenují Crimson Pro

- [ ] **Step 1: Create the worktree**

```bash
git worktree add ../ruzek.photo-instrument -b exp/instrument-serif feat/page-polish
cd ../ruzek.photo-instrument && pnpm install
```

- [ ] **Step 2: Add the font and check license and subsets**

```bash
pnpm add @fontsource/instrument-serif
ls node_modules/@fontsource/instrument-serif/files | grep italic
grep -i "SIL Open Font License" node_modules/@fontsource/instrument-serif/LICENSE
```

Expected: soubory `instrument-serif-latin-400-italic.woff2` a `instrument-serif-latin-ext-400-italic.woff2`, licence OFL. Bez `latin-ext` (česká diakritika) se experiment zastaví a nahlásí se Martinovi.

- [ ] **Step 3: Swap the accent font**

`astro.config.ts`, záznam Crimson Pro nahraď:

```ts
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--font-accent',
      fallbacks: ['Georgia', 'serif'],
      options: { variants: variants('instrument-serif', [400], 'italic') },
    },
```

`tokens.css`: `--f-accent:"Instrument Serif",Georgia,serif;`

Run: `grep -rn "Crimson" src tests README.md astro.config.ts` a každý výskyt v testech a README přepiš na Instrument Serif (`@fontsource/instrument-serif`).

- [ ] **Step 4: Run checks and the dev server**

```bash
pnpm check && pnpm test:e2e tests/e2e/fonts.spec.ts tests/e2e/font-swap.spec.ts
pnpm dev --port 4322
```

Martin pak porovná `http://localhost:4321` (Crimson Pro) a `http://localhost:4322` (Instrument Serif). Velikost `em.s` (`base.css`, `font-size: 1.04em`) se doladí podle jeho oka, výchozí je beze změny.

- [ ] **Step 5: Commit in the worktree**

```bash
git add -A && git commit -m "exp: Instrument Serif as the serif accent"
```

- [ ] **Step 6: Martin decides**

- Instrument Serif: `git merge exp/instrument-serif` do `feat/page-polish`, v `docs/decisions.md` přepsat písmo akcentu a zapsat rozhodnutí.
- Crimson Pro: `git worktree remove ../ruzek.photo-instrument && git branch -D exp/instrument-serif`.
