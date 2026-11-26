import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHADE_OPACITY } from '../../scripts/check-contrast';
import { COVER } from '@/lib/palette';

const css = (file: string): string => readFileSync(`src/styles/${file}`, 'utf8');

/** Pulls the `linear-gradient(...)` out of the first rule whose selector is exactly `selector`. */
function gradientOf(source: string, selector: string): [number, number][] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
  const stops = [
    ...rule.matchAll(/color-mix\(in srgb, var\(--night\) (\d+)%, transparent\)\s+(\d+)%/g),
  ];
  expect(stops.length, `no gradient found for ${selector}`).toBeGreaterThan(1);
  return stops.map((m) => [Number(m[2]) / 100, Number(m[1]) / 100]);
}

/** The weakest shade over the measured strip (bottom 35 % of the photo, from 65 % of the height down). */
function weakestInStrip(stops: [number, number][]): number {
  const at = (p: number): number => {
    for (let i = 1; i < stops.length; i++) {
      const [p0, a0] = stops[i - 1] as [number, number];
      const [p1, a1] = stops[i] as [number, number];
      if (p <= p1) return a0 + ((a1 - a0) * (p - p0)) / (p1 - p0);
    }
    return (stops.at(-1) as [number, number])[1];
  };
  let min = 1;
  for (let p = 0.65; p <= 1.0001; p += 0.01) min = Math.min(min, at(p));
  return min;
}

describe('contrast check constants follow the real shade gradients', () => {
  const cases: [keyof typeof SHADE_OPACITY, string, string][] = [
    ['normal', 'sections/fold.css', '.fold .shade'],
    ['strong', 'sections/fold.css', '.fold .shade.strong'],
    ['hero', 'sections/hero.css', '.hero .shade'],
    ['strong', 'sections/hero.css', '.hero .shade.strong'],
  ];
  it.each(cases)('SHADE_OPACITY.%s matches %s %s', (name, file, selector) => {
    const actual = weakestInStrip(gradientOf(css(file), selector));
    // the constant may be a little lower (conservative), never higher
    expect(SHADE_OPACITY[name]).toBeLessThanOrEqual(actual + 0.001);
    expect(actual - SHADE_OPACITY[name]).toBeLessThan(0.03);
  });
});

describe('canvas cover colours follow the tokens', () => {
  const tokens = css('tokens.css');
  it('--night and --light match COVER', () => {
    expect(tokens).toContain(`--night:${COVER.night}`);
    expect(tokens).toContain(`--light:${COVER.light}`);
  });
});
