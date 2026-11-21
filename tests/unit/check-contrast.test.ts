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
});
