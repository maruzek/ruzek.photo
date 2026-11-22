import { test, expect, type Page } from './fixtures';
import { PLACEMENT } from '../../src/config/placement';

// The work grid ("Developing" prototype): no empty cells at any width, still frames with sliding photos, two
// photos that develop out of the Bayer dither, and a designed static grid with reduced motion.

const motionOn = (): boolean => document.documentElement.dataset['motion'] === 'on';

/**
 * Rows of the grid by the top edge of each shot: every row spans the grid's full width with shots of equal
 * height and gaps no wider than the grid's own column gap, so no cell is left empty.
 */
async function gridHoles(page: Page): Promise<string[]> {
  return page.locator('.work').evaluate((grid) => {
    const g = grid.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const boxes = [...grid.querySelectorAll<HTMLElement>('.shot .frame')].map((f) =>
      f.getBoundingClientRect(),
    );
    const rows = new Map<number, DOMRect[]>();
    for (const b of boxes) {
      const key = Math.round(b.top);
      rows.set(key, [...(rows.get(key) ?? []), b]);
    }
    const problems: string[] = [];
    for (const [top, row] of rows) {
      row.sort((a, b) => a.left - b.left);
      const first = row[0];
      const last = row.at(-1);
      if (!first || !last) continue;
      if (Math.abs(first.left - g.left) > 1 || Math.abs(last.right - g.right) > 1)
        problems.push(`row at ${top} does not span the grid`);
      for (let i = 1; i < row.length; i++) {
        const prev = row[i - 1];
        const cur = row[i];
        if (prev && cur && cur.left - prev.right > gap + 1) problems.push(`gap in row at ${top}`);
        if (prev && cur && Math.abs(cur.height - prev.height) > 1)
          problems.push(`uneven heights in row at ${top}`);
      }
    }
    return problems;
  });
}

test('the grid shows every published work photo with no empty cell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.work .shot')).toHaveCount(PLACEMENT.work.length);
  expect(await gridHoles(page)).toEqual([]);
  // the tiles carry no labels: category, place and date are in the lightbox caption
  await expect(page.locator('.work .todo')).toHaveCount(0);
  await expect(page.locator('.work .shot').first()).toHaveAttribute('data-lb', /TODO: /);
});

test('360 px: no horizontal scroll and no empty cell in the grid', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  expect(await gridHoles(page)).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('reduced motion: whole still photos, no dither and no overscan, still no empty cell', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('.work').scrollIntoViewIfNeeded();
  for (const cv of await page.locator('.work canvas.dz').all()) await expect(cv).toBeHidden();
  const layers = await page.locator('.work .par').evaluateAll((els) =>
    els.map((el) => {
      const frame = el.parentElement?.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return {
        transform: getComputedStyle(el).transform,
        fits: !!frame && Math.abs(box.top - frame.top) < 1 && Math.abs(box.height - frame.height) < 1,
      };
    }),
  );
  for (const l of layers) expect(l).toEqual({ transform: 'none', fits: true });
  expect(await gridHoles(page)).toEqual([]);
});

test('motion: photos slide inside still frames and the links stay put', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionOn);
  const drifting = page.locator('.work .par[data-drift]').first();
  await drifting.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect
    .poll(() => drifting.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none');
  for (const t of await page
    .locator('.work .shot, .work .frame')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform)))
    expect(t).toBe('none');
});

test('motion: the lead photo develops out of the dither, keyboard focus clears it', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(motionOn);
  const lead = page.locator('.work .shot[data-role="develop"]').first();
  const canvas = lead.locator('canvas.dz');
  // its top just inside the screen: still mostly covered
  await lead.evaluate((el) =>
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.95),
  );
  await expect(canvas).toHaveAttribute('data-painted', 'live');
  const covered = (): Promise<number> =>
    canvas.evaluate((cv: HTMLCanvasElement) => {
      const data = cv.getContext('2d')?.getImageData(0, 0, cv.width, cv.height).data ?? [];
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) n++;
      return n / Math.max(1, data.length / 4);
    });
  await expect.poll(covered).toBeGreaterThan(0.5);
  await lead.focus();
  await expect.poll(covered).toBe(0);
});
