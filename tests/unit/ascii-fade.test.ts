import { expect, it } from 'vitest';
import { fadeLoad, narrowestCandidate } from '../../src/scripts/effects/ascii';

// HM-11: switching to `lite` mid-intro continues from the amount on screen, without a jump
it('the lite dissolve starts at the rendered amount and ends at the photo', () => {
  expect(fadeLoad(0.6, 0, 450)).toBe(0.6);
  expect(fadeLoad(0.6, 225, 450)).toBeCloseTo(0.3);
  expect(fadeLoad(0.6, 450, 450)).toBe(0);
  expect(fadeLoad(0.6, 900, 450)).toBe(0);
});

// The sampler reads the narrowest file of the picked format instead of decoding the full hero photo
it('picks the narrowest w candidate of a srcset', () => {
  expect(narrowestCandidate('/a-1080.avif 1080w, /a-480.avif 480w, /a-768.avif 768w')).toBe('/a-480.avif');
  expect(narrowestCandidate('/only.avif 2400w')).toBe('/only.avif');
  expect(narrowestCandidate('/a.avif 1x, /b.avif 2x')).toBeNull();
  expect(narrowestCandidate('')).toBeNull();
});
