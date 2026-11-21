import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import exifReader from 'exif-reader';
import sharp from 'sharp';
import { listImages } from './photo-files';

export interface MetadataRule {
  path: string;
  /** `gps`: only location data is forbidden. `any`: any EXIF, XMP or IPTC block is forbidden. */
  forbid: 'gps' | 'any';
}

const GPS_IN_XMP = /GPS(Latitude|Longitude)/i;

/** Why a file breaks the rule, or `undefined` when it is clean. A file that cannot be read counts as a violation. */
async function violation(file: string, forbid: MetadataRule['forbid']): Promise<string | undefined> {
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
    for (const file of await listImages(path)) {
      if (await violation(file, forbid)) found.push(file);
    }
  }
  return found;
}

/** `src/assets` may not carry GPS (the repo is public), `dist` may not carry any EXIF. */
async function main(): Promise<void> {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const rules: MetadataRule[] = [
    { path: resolve(root, 'src/assets'), forbid: 'gps' },
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
    `check:exif: ${found.length} file(s) with forbidden metadata. Run \`pnpm photos:import <file>\` to strip it.`
  );
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
