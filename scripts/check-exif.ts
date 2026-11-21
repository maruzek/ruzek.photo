import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import exifReader from 'exif-reader';
import sharp from 'sharp';
import { isDirectorySymlink, listImages } from './photo-files';

export interface MetadataRule {
  path: string;
  /**
   * `gps`: only location data is forbidden.
   * `any`: any EXIF, XMP, IPTC, ICC profile, PNG text chunk or JPEG comment is forbidden (all of them can carry free text).
   */
  forbid: 'gps' | 'any';
}

const GPS_IN_XMP = /GPS(Latitude|Longitude)/i;

/**
 * True when the JPEG has a `COM` (0xFFFE) segment anywhere up to `EOI`, also between or after the scans of a
 * progressive JPEG. Inside entropy-coded data a 0xFF byte is followed only by 0x00 (stuffing), a restart marker
 * (0xD0–0xD7) or a fill byte, so any other marker found there starts a new segment.
 */
export function hasJpegComment(data: Buffer): boolean {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return false;
  let pos = 2;
  while (pos + 1 < data.length) {
    if (data[pos] !== 0xff) {
      pos += 1; // entropy-coded scan data
      continue;
    }
    const marker = data[pos + 1] ?? 0;
    if (marker === 0xff) {
      pos += 1; // fill byte
      continue;
    }
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      pos += 2; // stuffed 0xFF, TEM, restart markers, SOI: no length
      continue;
    }
    if (marker === 0xfe) return true;
    if (marker === 0xd9) return false; // end of image
    if (pos + 4 > data.length) return false;
    pos += 2 + data.readUInt16BE(pos + 2); // segment with a length (SOS: its header, then scan data follows)
  }
  return false;
}

/** PNG chunk types that carry free text (comments, EXIF). */
const PNG_TEXT_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);

/** True when the PNG has a text or EXIF chunk anywhere up to `IEND`, including after the image data. */
export function hasPngText(data: Buffer): boolean {
  if (data.length < 8 || data.readUInt32BE(0) !== 0x89504e47) return false;
  let pos = 8;
  while (pos + 8 <= data.length) {
    const length = data.readUInt32BE(pos);
    const type = data.toString('latin1', pos + 4, pos + 8);
    if (PNG_TEXT_CHUNKS.has(type)) return true;
    if (type === 'IEND') return false;
    pos += 12 + length; // length + type + data + CRC
  }
  return false;
}

/** Why a file breaks the rule, or `undefined` when it is clean. A file that cannot be read counts as a violation. */
async function violation(
  file: string,
  forbid: MetadataRule['forbid'],
): Promise<string | undefined> {
  if (await isDirectorySymlink(file, await lstat(file)))
    return 'symbolic link to a directory (not scanned)';
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    return 'unreadable image';
  }
  if (forbid === 'any') {
    if (meta.exif) return 'EXIF';
    if (meta.xmp) return 'XMP';
    if (meta.iptc) return 'IPTC';
    if (meta.icc) return 'ICC profile'; // Astro's own output has none (verified), and a profile can hold text
    if (meta.comments && meta.comments.length > 0) return 'PNG text chunk';
    if (meta.format === 'png' && hasPngText(await readFile(file))) return 'PNG text chunk';
    if (meta.format === 'jpeg' && hasJpegComment(await readFile(file))) return 'JPEG comment';
    return undefined;
  }
  if (meta.exif) {
    try {
      const gps = exifReader(meta.exif).GPSInfo;
      if (gps && Object.keys(gps).length > 0) return 'GPS in EXIF';
    } catch {
      return 'unreadable EXIF'; // cannot prove that there is no GPS
    }
  }
  if (meta.xmp && GPS_IN_XMP.test(meta.xmp.toString('latin1'))) return 'GPS in XMP';
  return undefined;
}

/** Paths of images that carry forbidden metadata. A directory that does not exist (e.g. `dist`) is skipped. */
export async function findMetadataViolations(dirs: MetadataRule[]): Promise<string[]> {
  const found: string[] = [];
  for (const { path, forbid } of dirs) {
    const root = await lstat(path).catch(() => undefined); // undefined: the directory does not exist (dist)
    if (root && (await isDirectorySymlink(path, root))) {
      found.push(path);
      continue;
    }
    for (const file of await listImages(path)) {
      if (await violation(file, forbid)) found.push(file);
    }
  }
  return found;
}

/**
 * `src` and `public` may not carry GPS (the repo is public; a photo can sit next to its YAML in `src/content`
 * or be referenced from anywhere, so the whole of `src` is scanned), `dist` may not carry any metadata.
 */
async function main(): Promise<void> {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const rules: MetadataRule[] = [
    { path: resolve(root, 'src'), forbid: 'gps' },
    { path: resolve(root, 'public'), forbid: 'gps' },
    { path: resolve(root, 'dist'), forbid: 'any' },
  ];
  const found = await findMetadataViolations(rules);
  if (found.length === 0) {
    console.log('check:exif: no forbidden metadata found');
    return;
  }
  for (const file of found) {
    const rule = rules.find((r) => file.startsWith(r.path));
    const why = rule ? await violation(file, rule.forbid) : undefined;
    console.error(`check:exif: ${file} (${why ?? 'forbidden metadata'})`);
  }
  console.error(
    `check:exif: ${found.length} file(s) with forbidden metadata. Run \`pnpm photos:import <file>\` to strip it.`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
