import { expect, it } from 'vitest';
import { B8, b8 } from '@/scripts/effects/bayer';

it('first row matches the standard 8x8 Bayer matrix', () =>
  expect([...Array(8)].map((_, x) => b8(x, 0) * 64 - 0.5)).toEqual([0, 32, 8, 40, 2, 34, 10, 42]));
it('contains each threshold once', () =>
  expect([...B8].map((v) => v * 64 - 0.5).sort((a, b) => a - b)).toEqual([...Array(64).keys()]));
it('wraps coordinates', () => expect(b8(9, 17)).toBe(b8(1, 1)));
