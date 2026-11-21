import { expect, it } from 'vitest';
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
it('is pending until enough frames are measured', () => {
  const p = createQualityProbe({ frames: 3 });
  p.sample(10);
  expect(p.verdict()).toBe('pending');
});
it('low memory or save-data starts lite', () => {
  expect(initialQuality({ deviceMemory: 2 })).toBe('lite');
  expect(initialQuality({ connection: { saveData: true } })).toBe('lite');
  expect(initialQuality({ deviceMemory: 8 })).toBe('full');
});
