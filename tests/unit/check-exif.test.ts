import { crc32 } from 'node:zlib';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findMetadataViolations, hasJpegComment } from '../../scripts/check-exif';
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
  for (const d of ['gps', 'exif-only', 'plain']) mkdirSync(join(root, d));
  withGps = join(root, 'gps', 'gps.jpg');
  withExifOnly = join(root, 'exif-only', 'exif-only.jpg');
  plain = join(root, 'plain', 'plain.jpg');
  await sharp(grey)
    .withExif({ IFD0: { Copyright: 'fixture' }, IFD3: FAKE_GPS })
    .jpeg()
    .toFile(withGps);
  await sharp(grey)
    .withExif({ IFD0: { Copyright: 'fixture' } })
    .jpeg()
    .toFile(withExifOnly);
  await sharp(grey).jpeg().toFile(plain);
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const yamlDir = (): string => mkdtempSync(join(root, 'yaml-'));

describe('findMetadataViolations', () => {
  it('reports a file with GPS data', async () =>
    expect(await findMetadataViolations([{ path: join(root, 'gps'), forbid: 'gps' }])).toEqual([
      withGps,
    ]));

  it('with forbid "gps" ignores EXIF without GPS', async () =>
    expect(
      await findMetadataViolations([{ path: join(root, 'exif-only'), forbid: 'gps' }]),
    ).toEqual([]));

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
    expect(await findMetadataViolations([{ path: join(root, 'missing'), forbid: 'any' }])).toEqual(
      [],
    ));

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

describe('metadata outside EXIF, XMP and IPTC (forbid "any")', () => {
  const scan = (dir: string) => findMetadataViolations([{ path: dir, forbid: 'any' }]);
  const fresh = (name: string): string => {
    const dir = join(root, name);
    mkdirSync(dir);
    return dir;
  };

  it('reports a JPEG with a COM comment, which can hold client data', async () => {
    const dir = fresh('com');
    const clean = await sharp(grey).jpeg().toBuffer();
    const text = Buffer.from('Svatba Novakovi, tel. 123');
    const com = Buffer.concat([Buffer.from([0xff, 0xfe, 0, text.length + 2]), text]);
    const file = join(dir, 'com.jpg');
    writeFileSync(file, Buffer.concat([clean.subarray(0, 2), com, clean.subarray(2)]));
    expect(hasJpegComment(clean)).toBe(false);
    expect(hasJpegComment(readFileSync(file))).toBe(true);
    expect(await scan(dir)).toEqual([file]);
  });

  it('reports a PNG text chunk', async () => {
    const dir = fresh('png-text');
    const png = await sharp(grey).png().toBuffer();
    const body = Buffer.concat([Buffer.from('Comment\0client data')]);
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write('tEXt', 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
    const ihdrEnd = 8 + 25; // signature + IHDR chunk
    const file = join(dir, 'text.png');
    writeFileSync(
      file,
      Buffer.concat([png.subarray(0, ihdrEnd), head, body, crc, png.subarray(ihdrEnd)]),
    );
    expect(await scan(dir)).toEqual([file]);
  });

  it('reports an embedded ICC profile in a WebP, but not a plain one', async () => {
    const dir = fresh('icc');
    const withIcc = join(dir, 'icc.webp');
    await sharp(grey).withIccProfile('p3').webp().toFile(withIcc);
    await sharp(grey).webp().toFile(join(dir, 'plain.webp'));
    expect(await scan(dir)).toEqual([withIcc]);
  });
});

describe('symbolic links', () => {
  it('reports a symlink to a directory instead of silently skipping the photos behind it', async () => {
    const dir = join(root, 'links');
    mkdirSync(dir);
    const link = join(dir, 'gps-link');
    symlinkSync(join(root, 'gps'), link, 'dir');
    expect(await findMetadataViolations([{ path: dir, forbid: 'gps' }])).toEqual([link]);
  });
});

describe('importPhoto', () => {
  it('strips every kind of metadata', async () => {
    const { imagePath } = await importPhoto(withGps, {
      outDir: join(root, 'strip'),
      yamlDir: yamlDir(),
    });
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
    const { imagePath } = await importPhoto(big, {
      outDir: join(root, 'big-out'),
      yamlDir: yamlDir(),
    });
    const meta = await sharp(imagePath).metadata();
    // orientation 6 turns the long edge vertical; then it is scaled so that the long edge is 3000
    expect([meta.width, meta.height]).toEqual([1500, 3000]);
    expect(meta.orientation).toBeUndefined();
  });

  it('never enlarges a small photo', async () => {
    const { imagePath } = await importPhoto(plain, {
      outDir: join(root, 'small-out'),
      yamlDir: yamlDir(),
    });
    const meta = await sharp(imagePath).metadata();
    expect([meta.width, meta.height]).toEqual([400, 300]);
  });

  it('writes a YAML skeleton that cannot be published by accident', async () => {
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
    expect(text).not.toMatch(/^minors:/m); // must be decided per photo, never pre-filled
  });

  it('refuses to overwrite an existing photo or YAML, so a second DSC_001.jpg cannot inherit consent', async () => {
    const dir = join(root, 'collision-out');
    const yamlOut = join(root, 'collision-yaml');
    const other = join(root, 'other-event', 'plain.jpg');
    mkdirSync(join(root, 'other-event'));
    await sharp({ create: { width: 400, height: 300, channels: 3, background: '#ff0000' } })
      .jpeg()
      .toFile(other);
    const first = await importPhoto(plain, { outDir: dir, yamlDir: yamlOut });
    // the first photo has been approved by hand in the meantime
    writeFileSync(first.yamlPath, 'consentRef: C-2026-001\npublished: true\n');
    const imageBefore = readFileSync(first.imagePath);
    const yamlBefore = readFileSync(first.yamlPath);
    await expect(importPhoto(other, { outDir: dir, yamlDir: yamlOut })).rejects.toThrow(
      /already exists/,
    );
    expect(readFileSync(first.imagePath).equals(imageBefore)).toBe(true);
    expect(readFileSync(first.yamlPath).equals(yamlBefore)).toBe(true);
  });

  it('refuses when only the YAML exists, and leaves no half-written JPEG behind', async () => {
    const dir = join(root, 'yaml-only-out');
    const yamlOut = join(root, 'yaml-only-yaml');
    mkdirSync(yamlOut);
    writeFileSync(join(yamlOut, 'plain.yaml'), 'consentRef: C-2026-002\n');
    await expect(importPhoto(plain, { outDir: dir, yamlDir: yamlOut })).rejects.toThrow(
      /already exists/,
    );
    expect(existsSync(join(dir, 'plain.jpg'))).toBe(false);
  });
});
