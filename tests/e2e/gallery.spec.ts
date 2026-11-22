import { test, expect, type Page } from './fixtures';

// The work gallery is a contact sheet that opens (ContactSheet.astro, scripts/motion/sheet.ts). The server render
// is the open sheet; the motion layer folds each pick into its seat with a transform and the scroll opens it.

// A function, not a string: the CSP has no 'unsafe-eval' (see motion.spec.ts)
const motionIs = (state: 'on' | 'off'): boolean =>
  document.documentElement.dataset['motion'] === state;

const IDENTITY = ['none', 'matrix(1, 0, 0, 1, 0, 0)'];

/** Scrolls so that the sheet's top sits at `line` × the viewport height (negative: above the viewport). */
async function sheetTopAt(page: Page, line: number): Promise<void> {
  await page.evaluate((l) => {
    const sheet = document.querySelector('.cs-sheet');
    if (sheet) window.scrollTo(0, sheet.getBoundingClientRect().top + scrollY - innerHeight * l);
  }, line);
}

/** The pick's picture and its seat on the sheet, as viewport boxes. */
async function pickAndSeat(page: Page, slot: string) {
  return page.evaluate((s) => {
    const box = (el: Element | null) => {
      const r = el?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
    };
    return {
      pick: box(document.querySelector(`.cs-pick.${s} .cs-box`)),
      seat: box(document.querySelector(`[data-seat="${s}"] .cs-box`)),
    };
  }, slot);
}

for (const path of ['/', '/en/']) {
  test(`the sheet numbers every frame once and marks each pick's seat ${path}`, async ({ page }) => {
    await page.goto(path);
    const numbers = await page
      .locator('.cs-sheet > :is(.cs-thumb, .cs-seat) > .cs-no')
      .allTextContents();
    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers).toEqual(numbers.map((_, i) => String(i + 1).padStart(2, '0')));
    // every photo is one link: the sheet's thumbnails plus the enlarged picks
    const hrefs = await page.locator('[data-cs] [data-lb]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('href')),
    );
    expect(hrefs).toHaveLength(numbers.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    // a pick keeps its frame number: the same number under the seat and under the print
    for (const pick of await page.locator('.cs-pick').all()) {
      const slot = (await pick.getAttribute('class'))?.match(/\bs\d\b/)?.[0] ?? 'missing';
      await expect(page.locator(`[data-seat="${slot}"] .cs-no`)).toHaveText(
        await pick.locator('.cs-no').innerText(),
      );
    }
    // the seats are decorative, the pick itself is the link
    await expect(page.locator('.cs-seat a, .cs-seat[tabindex]')).toHaveCount(0);
    await expect(page.locator('.cs-front')).toHaveAttribute('aria-hidden', 'true');
    // a vertical frame lies turned on the sheet (thumbnail and seat alike), an enlarged pick stands upright
    const turned = page.locator('.cs-sheet .cs-turn .cs-box');
    expect(await turned.count()).toBeGreaterThan(0);
    for (const box of await turned.all()) await expect(box).toHaveCSS('rotate', '-90deg');
    await expect(page.locator('.cs-spread .cs-turn')).toHaveCount(0);
  });
}

test('a pick starts folded into its seat and the scroll opens it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  // s1 lies flat on the sheet, s2 (a vertical frame) lies turned like its seat: the boxes cover each other
  for (const slot of ['s1', 's2']) {
    const folded = await pickAndSeat(page, slot);
    expect(folded.pick && folded.seat, slot).toBeTruthy();
    if (!folded.pick || !folded.seat) return;
    expect(Math.abs(folded.pick.x - folded.seat.x), slot).toBeLessThan(2);
    expect(Math.abs(folded.pick.y - folded.seat.y), slot).toBeLessThan(2);
    expect(Math.abs(folded.pick.w - folded.seat.w), slot).toBeLessThan(2);
    expect(Math.abs(folded.pick.h - folded.seat.h), slot).toBeLessThan(2);
  }

  // past the end of the run (desktop: top −10 %, phone: top −60 %) every pick is in its slot
  await sheetTopAt(page, -0.8);
  for (const pick of await page.locator('.cs-pick').all())
    await expect
      .poll(() => pick.evaluate((el) => getComputedStyle(el).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  const open = await pickAndSeat(page, 's1');
  expect(open.pick?.y ?? 0).toBeGreaterThan((open.seat?.y ?? 0) + (open.seat?.h ?? 0));
});

test('keyboard focus opens the sheet at once', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.locator('.cs-thumb').last().focus();
  await page.keyboard.press('Tab');
  const pick = page.locator('.cs-pick').first();
  await expect(pick).toBeFocused();
  for (const p of await page.locator('.cs-pick').all())
    expect(IDENTITY).toContain(await p.evaluate((el) => getComputedStyle(el).transform));
  await expect(pick).toBeInViewport();
});

test('reduced motion: the sheet is rendered open and still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await sheetTopAt(page, 0.6);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('.cs-front')).toBeHidden();
  for (const pick of await page.locator('.cs-pick').all())
    expect(IDENTITY).toContain(await pick.evaluate((el) => getComputedStyle(el).transform));
  const { pick, seat } = await pickAndSeat(page, 's1');
  // the pick is in the spread below the sheet, its seat keeps a dimmed copy and the mark
  expect(pick?.y ?? 0).toBeGreaterThan((seat?.y ?? 0) + (seat?.h ?? 0));
  await expect(page.locator('[data-seat="s1"] .cs-box')).toHaveCSS('outline-style', 'solid');
});

test('at 360 px the sheet fits the width, folded, opening and open', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  for (const line of [0.9, 0.4, 0.1, -0.5, -0.8]) {
    await sheetTopAt(page, line);
    await page.waitForTimeout(150);
    const { sw, cw, right } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      right: Math.max(
        ...[...document.querySelectorAll('[data-cs] .cs-box')].map(
          (el) => el.getBoundingClientRect().right,
        ),
      ),
    }));
    expect(sw, `sheet top at ${line}`).toBeLessThanOrEqual(cw);
    expect(right, `sheet top at ${line}`).toBeLessThanOrEqual(cw);
  }
  // the sheet has 3 columns on a phone
  const columns = await page
    .locator('.cs-sheet')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(3);
});
