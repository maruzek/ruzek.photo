import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PUBLISHED_PHOTOS_ID, publishedPhotos } from '../../scripts/vite-published-photos';
import {
  MOBILE_CROP_ASPECT,
  mobileCropRegion,
  positionX,
} from '../../src/lib/photos/mobile-crop';
import { writeFile } from 'node:fs/promises';

describe('mobileCropRegion', () => {
  it('cuts a full-height 3:5 strip placed by the mobile position', () => {
    expect(mobileCropRegion(3840, 2560, '66% 50%')).toEqual({
      left: Math.round((3840 - 1536) * 0.66),
      top: 0,
      width: 1536,
      height: 2560,
    });
    expect(mobileCropRegion(2400, 1600, '0% 50%')?.left).toBe(0);
    expect(mobileCropRegion(2400, 1600, '100% 50%')?.left).toBe(2400 - 960);
  });

  it('skips a photo that is not wider than the crop', () => {
    expect(mobileCropRegion(1400, 2400, '50% 50%')).toBeUndefined();
  });

  it('shows the same part of the photo in the crop as in the whole photo, for any narrower box', () => {
    const [W, H, x] = [3840, 2560, 0.66];
    const crop = mobileCropRegion(W, H, '66% 50%')!;
    for (const boxAspect of [0.42, 0.46, 0.5, MOBILE_CROP_ASPECT]) {
      const visible = H * boxAspect; // box covered by height: visible width in photo pixels
      const inPhoto = (W - visible) * x;
      const inCrop = crop.left + (crop.width - visible) * x;
      expect(Math.abs(inCrop - inPhoto)).toBeLessThan(1);
    }
  });

  it('reads the horizontal percentage of an object-position', () => {
    expect(positionX('35% 50%')).toBe(0.35);
    expect(() => positionX('left center')).toThrow(/percentage/);
    expect(() => positionX('120% 50%')).toThrow(/beyond/);
  });
});

describe('virtual:published-photos mobile crops', () => {
  it('crops only published photos with a mobile position', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crops-'));
    const photos = join(root, 'photos');
    await mkdir(photos);
    for (const name of ['hero', 'hidden', 'grid'])
      await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#555555' } })
        .jpeg()
        .toFile(join(root, `${name}.jpg`));
    await writeFile(join(photos, 'hero.yaml'), 'image: ../hero.jpg\npublished: true\n');
    await writeFile(join(photos, 'hidden.yaml'), 'image: ../hidden.jpg\npublished: false\n');
    await writeFile(join(photos, 'grid.yaml'), 'image: ../grid.jpg\npublished: true\n');
    const plugin = publishedPhotos(photos, {
      positions: { hero: '66% 50%', hidden: '50% 50%' },
      cacheDir: join(root, 'cache'),
    }) as unknown as {
      load(this: { addWatchFile(p: string): void }, id: string): Promise<string>;
    };
    const code = await plugin.load.call({ addWatchFile: () => undefined }, `\0${PUBLISHED_PHOTOS_ID}`);
    const crops = [...code.matchAll(/import m\d+ from "([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(crops).toHaveLength(1);
    expect(crops[0]).toMatch(/hero\.mobile\.[0-9a-f]{12}\.jpg$/);
    expect(code).toMatch(/export const mobile = \{ "hero": m\d+ \}/);
    const meta = await sharp(crops[0]).metadata();
    expect([meta.width, meta.height]).toEqual([480, 800]);
    expect(meta.exif).toBeUndefined();
  });
});
