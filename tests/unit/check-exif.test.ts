import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findMetadataViolations } from '../../scripts/check-exif';
import { importPhoto } from '../../scripts/photos-import';

// Obviously fake coordinates (0° N, 0° E, "Null Island"), written to the GPS IFD (IFD3 in sharp).
// Fixtures are generated here in a temp dir, never committed.
const FAKE_GPS = {
  GPSLatitudeRef: 'N',
  GPSLatitude: '0/1 0/1 0/1',
  GPSLongitudeRef: 'E',
  GPSLongitude: '0/1 0/1 0/1',
};
const grey = { create: { width: 400, height: 300, channels: 3 as const, background: '#777777' } };

let root = '';
let withGps = '';
let withExifOnly = '';
let plain = '';

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'exif-'));
  for (const d of ['gps', 'exif-only', 'plain', 'yaml']) mkdirSync(join(root, d));
  withGps = join(root, 'gps', 'gps.jpg');
  withExifOnly = join(root, 'exif-only', 'exif-only.jpg');
  plain = join(root, 'plain', 'plain.jpg');
  await sharp(grey).withExif({ IFD0: { Copyright: 'fixture' }, IFD3: FAKE_GPS }).jpeg().toFile(withGps);
  await sharp(grey).withExif({ IFD0: { Copyright: 'fixture' } }).jpeg().toFile(withExifOnly);
  await sharp(grey).jpeg().toFile(plain);
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const yamlDir = (): string => join(root, 'yaml');

describe('findMetadataViolations', () => {
  it('reports a file with GPS data', async () =>
    expect(await findMetadataViolations([{ path: join(root, 'gps'), forbid: 'gps' }])).toEqual([withGps]));

  it('with forbid "gps" ignores EXIF without GPS', async () =>
    expect(await findMetadataViolations([{ path: join(root, 'exif-only'), forbid: 'gps' }])).toEqual([]));

  it('with forbid "any" reports any EXIF, and only that', async () => {
    const found = await findMetadataViolations([{ path: root, forbid: 'any' }]);
    expect(found.sort()).toEqual([withExifOnly, withGps].sort());
  });

  it('is empty for the same photo after photos:import, even with forbid "any"', async () => {
    const out = join(root, 'out');
    const result = await importPhoto(withGps, { outDir: out, yamlDir: yamlDir() });
    expect(existsSync(result.imagePath)).toBe(true);
    expect(await findMetadataViolations([{ path: out, forbid: 'any' }])).toEqual([]);
    expect(await findMetadataViolations([{ path: out, forbid: 'gps' }])).toEqual([]);
  });

  it('skips a directory that does not exist (dist before the first build)', async () =>
    expect(await findMetadataViolations([{ path: join(root, 'missing'), forbid: 'any' }])).toEqual([]));

  it('looks into nested directories and ignores non-images', async () => {
    const nested = join(root, 'nested', 'a', 'b');
    mkdirSync(nested, { recursive: true });
    await sharp(grey).withExif({ IFD3: FAKE_GPS }).jpeg().toFile(join(nested, 'deep.jpg'));
    const found = await findMetadataViolations([{ path: join(root, 'nested'), forbid: 'gps' }]);
    expect(found).toEqual([join(nested, 'deep.jpg')]);
  });

  it('reports a photo that cannot be read (conservative)', async () => {
    const broken = join(root, 'broken');
    mkdirSync(broken);
    const file = join(broken, 'broken.jpg');
    writeFileSync(file, 'not an image');
    expect(await findMetadataViolations([{ path: broken, forbid: 'gps' }])).toEqual([file]);
  });
});

describe('importPhoto', () => {
  it('strips every kind of metadata', async () => {
    const { imagePath } = await importPhoto(withGps, { outDir: join(root, 'strip'), yamlDir: yamlDir() });
    const meta = await sharp(imagePath).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
  });

  it('applies the orientation and caps the size at 3000 px', async () => {
    const big = join(root, 'big.jpg');
    await sharp({ create: { width: 4000, height: 2000, channels: 3, background: '#333333' } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toFile(big);
    const { imagePath } = await importPhoto(big, { outDir: join(root, 'big-out'), yamlDir: yamlDir() });
    const meta = await sharp(imagePath).metadata();
    // orientation 6 turns the long edge vertical; then it is scaled so that the long edge is 3000
    expect([meta.width, meta.height]).toEqual([1500, 3000]);
    expect(meta.orientation).toBeUndefined();
  });

  it('never enlarges a small photo', async () => {
    const { imagePath } = await importPhoto(plain, { outDir: join(root, 'small-out'), yamlDir: yamlDir() });
    const meta = await sharp(imagePath).metadata();
    expect([meta.width, meta.height]).toEqual([400, 300]);
  });

  it('writes a YAML skeleton that cannot be published by accident, and never overwrites one', async () => {
    const dir = join(root, 'skeleton-out');
    const yamlOut = join(root, 'skeleton-yaml');
    const first = await importPhoto(plain, { outDir: dir, yamlDir: yamlOut, slug: 'Ples 01' });
    expect(first.yamlPath).toBe(join(yamlOut, 'ples-01.yaml'));
    expect(first.imagePath).toBe(join(dir, 'ples-01.jpg'));
    const text = readFileSync(first.yamlPath, 'utf8');
    expect(text).toContain('image: ../../assets/photos/ples-01.jpg');
    expect(text).toContain('alt: { cs: "TODO", en: "TODO" }');
    expect(text).toContain('published: true');
    expect(text).not.toMatch(/^consentRef:/m);
    const again = await importPhoto(plain, { outDir: dir, yamlDir: yamlOut, slug: 'Ples 01' });
    expect(again.yamlWritten).toBe(false);
  });

  it('writes placeholder metadata when asked, with the credit and no consent', async () => {
    const yamlOut = join(root, 'ph-yaml');
    const { yamlPath } = await importPhoto(plain, {
      outDir: join(root, 'ph-out'),
      yamlDir: yamlOut,
      slug: 'smoke',
      placeholder: { credit: 'Raphael Schaller, CC0 (StockSnap)' },
    });
    const text = readFileSync(yamlPath, 'utf8');
    expect(text).toContain('placeholder: true');
    expect(text).toContain('credit: "Raphael Schaller, CC0 (StockSnap)"');
    expect(text).not.toMatch(/^consentRef:/m);
  });
});
