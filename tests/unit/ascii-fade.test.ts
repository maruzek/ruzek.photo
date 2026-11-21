import { expect, it } from 'vitest';
import { fadeLoad } from '../../src/scripts/effects/ascii';

// HM-11: switching to `lite` mid-intro continues from the amount on screen, without a jump
it('the lite dissolve starts at the rendered amount and ends at the photo', () => {
  expect(fadeLoad(0.6, 0, 450)).toBe(0.6);
  expect(fadeLoad(0.6, 225, 450)).toBeCloseTo(0.3);
  expect(fadeLoad(0.6, 450, 450)).toBe(0);
  expect(fadeLoad(0.6, 900, 450)).toBe(0);
});
