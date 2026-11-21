import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/** The longest edge of an imported photo (concept.md, kap. 9). Smaller photos are never enlarged. */
export const MAX_EDGE = 3000;
export const JPEG_QUALITY = 90;

export interface ImportOptions {
  /** Where the stripped JPEG goes (default `src/assets/photos`). */
  outDir: string;
  /** Where the YAML skeleton goes (default `src/content/photos`). */
  yamlDir: string;
  /** File name without extension; default is derived from the source file. */
  slug?: string;
  /** Write the skeleton of a CC0 placeholder instead of a real photo. */
  placeholder?: { credit: string };
}

export interface ImportResult {
  slug: string;
  imagePath: string;
  yamlPath: string;
  /** False when the YAML already existed and was left alone. */
  yamlWritten: boolean;
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function skeleton(slug: string, placeholder: ImportOptions['placeholder']): string {
  const lines = [
    `image: ../../assets/photos/${slug}.jpg`,
    'alt: { cs: "TODO", en: "TODO" }',
    'category: event # event | sport | portrait',
    // `published: true` without `consentRef` fails the build until the consent is recorded (or published is set to false)
    'published: true',
  ];
  if (placeholder) {
    lines.push('placeholder: true', `credit: ${JSON.stringify(placeholder.credit)}`);
  } else {
    lines.push('# consentRef: C-2026-001  # id of the consent record in private/, never a name or an e-mail');
  }
  lines.push('minors: false', 'shade: normal # normal | strong');
  return `${lines.join('\n')}\n`;
}

/**
 * Applies the orientation, scales down to at most MAX_EDGE and re-encodes as JPEG.
 * sharp keeps no metadata unless asked (no `withMetadata` / `keepMetadata`), so EXIF, XMP, IPTC and the
 * embedded colour profile are all dropped (the output is sRGB).
 */
export async function importPhoto(source: string, options: ImportOptions): Promise<ImportResult> {
  const slug = slugify(options.slug ?? basename(source, extname(source)));
  if (!slug) throw new Error(`Cannot derive a file name from ${source}`);
  const input = await readFile(source); // read first: the source may live in the output directory
  await mkdir(options.outDir, { recursive: true });
  const imagePath = join(options.outDir, `${slug}.jpg`);
  await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(imagePath);

  await mkdir(options.yamlDir, { recursive: true });
  const yamlPath = join(options.yamlDir, `${slug}.yaml`);
  const yamlWritten = !existsSync(yamlPath);
  if (yamlWritten) await writeFile(yamlPath, skeleton(slug, options.placeholder));
  return { slug, imagePath, yamlPath, yamlWritten };
}

interface Credit {
  slot: string;
  creator: string;
  source: string;
  license: string;
}

const SOURCE_NAMES: Record<string, string> = { stocksnap: 'StockSnap', flickr: 'Flickr' };

function creditLine(entry: Credit): string {
  const source = SOURCE_NAMES[entry.source] ?? entry.source;
  return `${entry.creator}, ${entry.license.toUpperCase()} (${source})`;
}

async function main(args: string[]): Promise<void> {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const files: string[] = [];
  let creditsFile: string | undefined;
  let placeholder = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--placeholder') placeholder = true;
    else if (arg === '--credits') creditsFile = args[++i];
    else files.push(arg);
  }
  if (files.length === 0) {
    console.error(
      'Usage: pnpm photos:import [--placeholder --credits <credits.json>] <photo…>\n' +
        'Strips all metadata, writes src/assets/photos/<name>.jpg and a YAML skeleton in src/content/photos/.'
    );
    process.exitCode = 1;
    return;
  }
  let credits: Credit[] = [];
  if (placeholder) {
    if (!creditsFile) throw new Error('--placeholder needs --credits <credits.json>');
    credits = JSON.parse(await readFile(creditsFile, 'utf8')) as Credit[];
  }
  for (const file of files) {
    const slug = slugify(basename(file, extname(file)));
    let ph: ImportOptions['placeholder'];
    if (placeholder) {
      const entry = credits.find((c) => c.slot === slug);
      if (!entry) throw new Error(`No credit for "${slug}" in ${creditsFile}`);
      ph = { credit: creditLine(entry) };
    }
    const result = await importPhoto(file, {
      outDir: resolve(root, 'src/assets/photos'),
      yamlDir: resolve(root, 'src/content/photos'),
      ...(ph ? { placeholder: ph } : {}),
    });
    console.log(
      `${result.imagePath}${result.yamlWritten ? ` + ${result.yamlPath}` : ` (kept existing ${result.yamlPath})`}`
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
