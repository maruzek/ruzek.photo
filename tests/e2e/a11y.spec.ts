import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/en/'])
  for (const motion of ['reduce', 'no-preference'] as const)
    test(`axe ${path} ${motion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto(path);
      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(r.violations).toEqual([]);
    });
