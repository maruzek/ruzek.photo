import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bottomContrast } from '../../scripts/check-contrast';

// Fixtures are generated, never committed: a light and a dark photo whose bottom 35 % is flat.
let dir = '';
const INK = '#E9EAEE';

async function fixture(name: string, top: string, bottom: string): Promise<string> {
  const file = join(dir, name);
  const size = { width: 200, height: 100 };
  await sharp({ create: { ...size, channels: 3, background: top } })
    .composite([
      {
        input: await sharp({
          create: { width: 200, height: 40, channels: 3, background: bottom },
        })
          .png()
          .toBuffer(),
        top: 60,
        left: 0,
      },
    ])
    .jpeg({ quality: 100 })
    .toFile(file);
  return file;
}

let light = '';
let dark = '';

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'contrast-'));
  light = await fixture('light.jpg', '#888888', '#DDDDDD');
  dark = await fixture('dark.jpg', '#888888', '#202020');
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('bottomContrast', () => {
  it('light bottom with normal shade is below 4.5', async () =>
    expect(await bottomContrast(light, INK, 'normal')).toBeLessThan(4.5));
  it('dark bottom with normal shade is at least 4.5', async () =>
    expect(await bottomContrast(dark, INK, 'normal')).toBeGreaterThanOrEqual(4.5));
  it('strong shade raises the contrast of a light photo', async () => {
    const normal = await bottomContrast(light, INK, 'normal');
    const strong = await bottomContrast(light, INK, 'strong');
    expect(strong).toBeGreaterThan(normal);
    expect(strong).toBeGreaterThanOrEqual(4.5);
  });
  it('measures only the bottom 35 %, not the top', async () => {
    // same bottom, very different top: same result
    const bright = await fixture('bright-top.jpg', '#FFFFFF', '#202020');
    const a = await bottomContrast(dark, INK, 'normal');
    const b = await bottomContrast(bright, INK, 'normal');
    expect(Math.abs(a - b)).toBeLessThan(0.1);
  });
  it('averages the luminance of the pixels, not their sRGB values (half white, half black strip)', async () => {
    const file = join(dir, 'mixed.png');
    const half = (background: string) =>
      sharp({ create: { width: 100, height: 100, channels: 3, background } })
        .png()
        .toBuffer();
    await sharp({ create: { width: 200, height: 100, channels: 3, background: '#000000' } })
      .composite([{ input: await half('#FFFFFF'), left: 0, top: 0 }])
      .png()
      .toFile(file);
    // independent calculation: the normal shade (0.41 of #07080b) over each half, then the mean luminance
    const lin = (c: number): number => ((c / 255 + 0.055) / 1.055) ** 2.4;
    const lum = (r: number, g: number, b: number): number =>
      0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const a = 0.41;
    const white = lum(255 * (1 - a) + 7 * a, 255 * (1 - a) + 8 * a, 255 * (1 - a) + 11 * a);
    const black = lum(7 * a, 8 * a, 11 * a);
    const ink = lum(0xe9, 0xea, 0xee);
    const expected = (ink + 0.05) / ((white + black) / 2 + 0.05);
    // the old way (mean sRGB first) would give about 6.9:1 here
    expect(expected).toBeLessThan(4.5);
    expect(await bottomContrast(file, INK, 'normal')).toBeCloseTo(expected, 1);
  });
});
