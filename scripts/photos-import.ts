import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/**
 * The longest edge of an imported photo. Smaller photos are never enlarged. 2400 px covers the grid, the 2000 px
 * lightbox file and a full-bleed photo on a common monitor, and keeps the public repo small.
 */
export const MAX_EDGE = 2400;
/**
 * The limit of `--max-edge`, for the photos that fill the screen under text (hero, folds): 3840 px gives a
 * retina laptop (2880 px) and a 4K monitor their full resolution.
 */
export const MAX_EDGE_LIMIT = 3840;
export const JPEG_QUALITY = 90;

export interface ImportOptions {
  /** Where the stripped JPEG goes (default `src/assets/photos`). */
  outDir: string;
  /** Where the YAML skeleton goes (default `src/content/photos`). */
  yamlDir: string;
  /** File name without extension; default is derived from the source file. */
  slug?: string;
  /** Trims each edge by a fraction of the (oriented) source, applied before the resize. */
  crop?: Crop;
  /** Longest edge in px (default `MAX_EDGE`, at most `MAX_EDGE_LIMIT`). */
  maxEdge?: number;
}

/** Fractions (0–1) cut off each edge, e.g. `{ left: 0.06 }` removes the left 6 %. */
export interface Crop {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

/** Parses `left=0.06,bottom=0.1` (the `--crop` option). */
export function parseCrop(value: string): Crop {
  const crop: Crop = {};
  for (const part of value.split(',')) {
    const [edge, raw] = part.split('=');
    const n = Number(raw);
    if (!edge || !['left', 'top', 'right', 'bottom'].includes(edge) || !(n >= 0 && n < 1)) {
      throw new Error(`Bad --crop part "${part}": use left|top|right|bottom=<fraction 0–1>`);
    }
    crop[edge as keyof Crop] = n;
  }
  if ((crop.left ?? 0) + (crop.right ?? 0) >= 1 || (crop.top ?? 0) + (crop.bottom ?? 0) >= 1) {
    throw new Error(`--crop ${value} leaves nothing of the photo`);
  }
  return crop;
}

/** The pixel rectangle that `crop` keeps of a `width` × `height` image. */
export function cropRegion(
  width: number,
  height: number,
  crop: Crop,
): { left: number; top: number; width: number; height: number } {
  const left = Math.round(width * (crop.left ?? 0));
  const top = Math.round(height * (crop.top ?? 0));
  const right = Math.round(width * (crop.right ?? 0));
  const bottom = Math.round(height * (crop.bottom ?? 0));
  return { left, top, width: width - left - right, height: height - top - bottom };
}

export interface ImportResult {
  slug: string;
  imagePath: string;
  yamlPath: string;
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function skeleton(slug: string): string {
  return `${[
    `image: ../../assets/photos/${slug}.jpg`,
    'alt: { cs: "TODO", en: "TODO" }',
    'category: event # event | sport | portrait',
    // without `minors` the build fails until it is filled in (or `published` is set to false)
    'published: true',
    '# minors: false  # REQUIRED: true if anyone under 18 is recognisable (then also parentalConsent: true), otherwise false',
    'shade: normal # normal | strong',
  ].join('\n')}\n`;
}

/**
 * Applies the orientation, trims the edges given in `crop`, scales down to at most MAX_EDGE and re-encodes as JPEG.
 * sharp keeps no metadata unless asked (no `withMetadata` / `keepMetadata`), so EXIF, XMP, IPTC and the
 * embedded colour profile are all dropped (the output is sRGB).
 *
 * Never overwrites: if the JPEG or the YAML of that name exists (two different `DSC_001.jpg` from two events
 * get the same slug), the import fails and nothing is written. Files are created exclusively (`wx`), and when
 * the second one cannot be written the first one is removed again (only files created by this call).
 */
export async function importPhoto(source: string, options: ImportOptions): Promise<ImportResult> {
  const slug = slugify(options.slug ?? basename(source, extname(source)));
  if (!slug) throw new Error(`Cannot derive a file name from ${source}`);
  const input = await readFile(source);
  const imagePath = join(options.outDir, `${slug}.jpg`);
  const yamlPath = join(options.yamlDir, `${slug}.yaml`);
  for (const path of [imagePath, yamlPath]) {
    if (existsSync(path))
      throw new Error(`${path} already exists: rename the source file, nothing was written`);
  }
  let oriented = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  if (options.crop) {
    const region = cropRegion(oriented.info.width, oriented.info.height, options.crop);
    oriented = await sharp(oriented.data).extract(region).toBuffer({ resolveWithObject: true });
  }
  const jpeg = await sharp(oriented.data)
    .resize({
      width: options.maxEdge ?? MAX_EDGE,
      height: options.maxEdge ?? MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  await mkdir(options.outDir, { recursive: true });
  await mkdir(options.yamlDir, { recursive: true });
  await writeFile(imagePath, jpeg, { flag: 'wx' });
  try {
    await writeFile(yamlPath, skeleton(slug), { flag: 'wx' });
  } catch (error) {
    await rm(imagePath, { force: true });
    // `wx` opened the YAML only if it did not exist, so anything but EEXIST means a partial file of ours
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') await rm(yamlPath, { force: true });
    throw error;
  }
  return { slug, imagePath, yamlPath };
}

const USAGE =
  'Usage: pnpm photos:import <photo…>\n' +
  '       pnpm photos:import <photo> --slug <name> [--crop left=0.06,top=0,right=0,bottom=0] [--max-edge 3840]\n' +
  'Strips all metadata, scales to at most ' +
  MAX_EDGE +
  ' px (--max-edge: up to ' +
  MAX_EDGE_LIMIT +
  ' px for a full-screen photo), writes src/assets/photos/<name>.jpg and a YAML skeleton in src/content/photos/.\n' +
  '--slug, --crop and --max-edge apply to a single photo only.';

interface Cli {
  files: string[];
  slug?: string;
  crop?: Crop;
  maxEdge?: number;
}

/** Parses the `--max-edge` value: whole px between `MAX_EDGE` and `MAX_EDGE_LIMIT`. */
export function parseMaxEdge(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < MAX_EDGE || n > MAX_EDGE_LIMIT) {
    throw new Error(`Bad --max-edge ${value}: use whole px from ${MAX_EDGE} to ${MAX_EDGE_LIMIT}`);
  }
  return n;
}

export function parseArgs(argv: string[]): Cli {
  const cli: Cli = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    const [flag, inline] = arg.split(/=(.*)/s, 2) as [string, string | undefined];
    if (flag === '--slug' || flag === '--crop' || flag === '--max-edge') {
      const value = inline ?? argv[++i];
      if (!value) throw new Error(`${flag} needs a value`);
      if (flag === '--slug') cli.slug = value;
      else if (flag === '--crop') cli.crop = parseCrop(value);
      else cli.maxEdge = parseMaxEdge(value);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option ${arg}`);
    } else {
      cli.files.push(arg);
    }
  }
  if ((cli.slug || cli.crop || cli.maxEdge) && cli.files.length !== 1) {
    throw new Error('--slug, --crop and --max-edge need exactly one photo');
  }
  return cli;
}

async function main(argv: string[]): Promise<void> {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  let cli: Cli;
  try {
    cli = parseArgs(argv);
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  if (cli.files.length === 0) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  for (const file of cli.files) {
    const result = await importPhoto(file, {
      outDir: resolve(root, 'src/assets/photos'),
      yamlDir: resolve(root, 'src/content/photos'),
      ...(cli.slug ? { slug: cli.slug } : {}),
      ...(cli.crop ? { crop: cli.crop } : {}),
      ...(cli.maxEdge ? { maxEdge: cli.maxEdge } : {}),
    });
    console.log(`${result.imagePath} + ${result.yamlPath}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
