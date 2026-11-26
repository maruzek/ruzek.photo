import { test, expect, type Page } from './fixtures';

// "Same day" as a time axis (SameDay.astro, day.css, motion/day.ts)
const motionIs = (state: 'on' | 'off'): boolean =>
  document.documentElement.dataset['motion'] === state;
/** Where the sticky stage is (day.css) */
const DESKTOP = 'the stage is sticky on desktop only';

async function scrollRun(page: Page, share: number): Promise<void> {
  await page.evaluate((part) => {
    const day = document.querySelector('.day') as HTMLElement;
    const top = day.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, top + (day.offsetHeight - innerHeight) * part);
  }, share);
}

async function expectFinished(page: Page): Promise<void> {
  await expect(page.locator('.day .hist .f')).toHaveCount(40);
  await expect(page.locator('.day .wall .f')).toHaveCount(40);
  await expect(page.locator('.day .slot')).toHaveCount(3);
  await expect(page.locator('.day .hist .pick')).toHaveCount(3);
  const hidden = await page.locator('.day .tl *').evaluateAll((els) =>
    els
      .filter((el) => {
        const s = getComputedStyle(el);
        const clipped = s.clipPath.startsWith('inset') && /[1-9]/.test(s.clipPath);
        return s.opacity !== '1' || s.visibility !== 'visible' || clipped;
      })
      .map((el) => el.className),
  );
  expect(hidden).toEqual([]);
  expect(await page.locator('.day .run').evaluate((el) => getComputedStyle(el).transform)).toBe(
    'none',
  );
}

test('reduced motion: the finished timeline, no sticky stage and no scroll run', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(motionIs, 'off' as const);
  await expectFinished(page);
  await expect(page.locator('.day .stage')).toHaveCSS('position', 'static');
  await page.locator('.day .wall').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('.day .tl img')
        .evaluateAll(
          (imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth === 0).length,
        ),
    )
    .toBe(0);
});

test('a switch to reduced motion restores the finished timeline and the crops', async ({
  page,
}) => {
  await page.goto('/');
  const crop = (): Promise<string[]> =>
    page.locator('.day .tl img').evaluateAll((els) =>
      els.map((el) => {
        const s = getComputedStyle(el);
        return `${s.scale} ${s.transform}`;
      }),
    );
  await page.waitForFunction(motionIs, 'on' as const);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForFunction(motionIs, 'off' as const);
  const before = await crop();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.waitForFunction(motionIs, 'on' as const);
  await scrollRun(page, 0.4);
  await page.waitForTimeout(600);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(motionIs, 'off' as const);
  await expectFinished(page);
  expect(await crop()).toEqual(before);
  await expect(page.locator('.day')).not.toHaveClass(/\bis-live\b/);
});

test('crossing 961 px and back rebuilds the axis without leftovers', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', DESKTOP);
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.setViewportSize({ width: 800, height: 1000 });
  await expect(page.locator('.day .stage')).toHaveCSS('position', 'static');
  // the vertical line grows, nothing of the horizontal one stays
  await page.locator('.day .wall').scrollIntoViewIfNeeded();
  await expect(page.locator('.day .wall img').last()).toHaveCSS('opacity', '1', { timeout: 4000 });
  await expect(page.locator('.day .slot figure').first()).toHaveCSS('opacity', '1');
  await expect(page.locator('.day .slot figure').first()).toHaveCSS('transform', 'none');
  await expect(page.locator('.day .fill')).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.day .stage')).toHaveCSS('position', 'sticky');
  await scrollRun(page, 0.1);
  await expect(page.locator('.day .wall img').last()).toHaveCSS('opacity', '0', { timeout: 4000 });
  await scrollRun(page, 1);
  await expect(page.locator('.day .wall img').last()).toHaveCSS('opacity', '1', { timeout: 4000 });
});

// The stage holds the whole section, heading to texts, so it is sticky only where all of it fits (day.css)
test('the stage is sticky only where it fits, with the heading and the button in view', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', DESKTOP);
  for (const path of ['/', '/en/'])
    for (const [width, height, sticky] of [
      [1920, 1040, true],
      [1440, 900, true],
      [1280, 760, true],
      [1000, 780, true],
      [1280, 680, false],
      [900, 900, false],
    ] as const) {
      const at = `${path} ${width} x ${height}`;
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await page.waitForFunction(motionIs, 'on' as const);
      const stage = page.locator('.day .stage');
      await expect(stage, at).toHaveCSS('position', sticky ? 'sticky' : 'static');
      if (!sticky) continue;
      await scrollRun(page, 0.5);
      await expect.poll(async () => Math.round((await stage.boundingBox())?.y ?? -1), at).toBe(0);
      const header = await page
        .locator('header.top')
        .evaluate((el: HTMLElement) => el.offsetHeight);
      for (const part of ['#day-h', '.day .btn', '.day .same .txt', '.day .all .txt']) {
        const box = await page.locator(part).boundingBox();
        expect(box?.y ?? -1, `${at} ${part}`).toBeGreaterThanOrEqual(header - 2);
        expect((box?.y ?? 0) + (box?.height ?? 0), `${at} ${part}`).toBeLessThanOrEqual(height);
      }
    }
});

test('the scroll run is there from the first paint and stays after the safety net, with no layout shift', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', DESKTOP);
  await page.addInitScript(() => {
    const w = window as unknown as { __shift: number };
    w.__shift = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<
        PerformanceEntry & { value: number; sources?: Array<{ node?: Node }> }
      >)
        if (e.sources?.some((s) => s.node instanceof Element && s.node.closest('.day, .about')))
          w.__shift += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const heights = (): Promise<number[]> =>
    page.evaluate(() => [
      (document.querySelector('.day') as HTMLElement).offsetHeight,
      (document.querySelector('.day .stage') as HTMLElement).offsetHeight,
    ]);
  expect(await heights()).toEqual([1530, 900]);
  await page.waitForFunction(motionIs, 'on' as const);
  expect(await heights()).toEqual([1530, 900]);
  await expect(page.locator('html')).toHaveClass(/\breveal-fallback\b/, { timeout: 5000 });
  expect(await heights()).toEqual([1530, 900]);
  for (const share of [-0.5, 0, 0.25, 0.5, 0.75, 1, 1.3]) {
    await scrollRun(page, share);
    await page.waitForTimeout(200);
  }
  expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift)).toBe(0);
});

test('the scroll run plays the day: chart, picks, days, gallery', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', DESKTOP);
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  const opacity = (selector: string) =>
    expect.poll(() =>
      page.locator(selector).evaluateAll((els) => {
        const values = els.map((el) => Number(getComputedStyle(el).opacity));
        return [Math.min(...values), Math.max(...values)];
      }),
    );
  await scrollRun(page, -0.95);
  await opacity('.day .hist img').toEqual([0, 0]);
  await opacity('.day .wall img').toEqual([0, 0]);
  await opacity('.day .slot figure').toEqual([0, 0]);
  await opacity('.day .days i').toEqual([0, 0]);
  await scrollRun(page, 0.4);
  await opacity('.day .hist img').toEqual([1, 1]);
  await opacity('.day .slot figure').toEqual([1, 1]);
  await opacity('.day .wall img').toEqual([0, 0]);
  await scrollRun(page, 1);
  await opacity('.day .wall img').toEqual([1, 1]);
  await opacity('.day .days i').toEqual([1, 1]);
});

for (const [path, event, sport, addon] of [
  ['/', 'Akce', 'Sport', /Výběr na sítě ještě ten den/],
  ['/en/', 'Event', 'Sport', /same-day/i],
] as const) {
  test(`the button preselects an event with same-day photos ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator('#inq').scrollIntoViewIfNeeded();
    await expect(page.locator('#inq button[type="submit"]')).toBeEnabled(); // hydrated
    // both are the defaults of the form, so change them first
    const form = page.locator('#inq');
    await form.getByRole('checkbox', { name: addon }).uncheck();
    await form.getByRole('radio', { name: sport }).check();
    await expect(form.getByRole('radio', { name: event })).not.toBeChecked();
    const button = page.locator('.day .btn');
    await expect(button).toHaveAttribute(
      'href',
      path === '/'
        ? '#poptavka?sluzba=event&doplnky=sameDay'
        : '#inquiry?service=event&addons=sameDay',
    );
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(form.getByRole('radio', { name: event })).toBeChecked();
    await expect(form.getByRole('checkbox', { name: addon })).toBeChecked();
    await expect(form).toBeInViewport();
  });

  test(`no horizontal scroll at 360 px in "same day" ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(path);
    await page.locator('.day .wall').scrollIntoViewIfNeeded();
    const [sw, cw] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(sw).toBeLessThanOrEqual(cw ?? 0);
    // no text or button is cut by the edge of the page (only photos and the dust bleed)
    const wide = await page
      .locator('.day .txt, .day .btn, .day .tag, .day h2')
      .evaluateAll(
        (els) => els.filter((el) => el.getBoundingClientRect().right > innerWidth).length,
      );
    expect(wide).toBe(0);
  });
}

test('the button can be focused from the keyboard in the middle of the run', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await scrollRun(page, 0.3);
  const button = page.locator('.day .btn');
  await button.focus();
  await expect(button).toBeFocused();
  await expect(button).toBeInViewport();
  await page.waitForTimeout(400);
  const box = await button.boundingBox();
  const onTop = await page.evaluate(
    ([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('.day .btn'),
    [(box?.x ?? 0) + 20, (box?.y ?? 0) + 20],
  );
  expect(onTop).toBe(true);
});
