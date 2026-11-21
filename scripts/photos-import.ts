import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    // without `consentRef` and `minors` the build fails until both are filled in (or `published` is set to false)
    'published: true',
    '# consentRef: C-2026-001  # sequential ID of the consent record, assigned in private/. Nothing else: no name, e-mail or phone number',
    '# minors: false  # REQUIRED: true if anyone under 18 is recognisable (then also parentalConsent: true), otherwise false',
    'shade: normal # normal | strong',
  ].join('\n')}\n`;
}

/**
 * Applies the orientation, scales down to at most MAX_EDGE and re-encodes as JPEG.
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
  const jpeg = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
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

async function main(files: string[]): Promise<void> {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  if (files.length === 0) {
    console.error(
      'Usage: pnpm photos:import <photo…>\n' +
        'Strips all metadata, writes src/assets/photos/<name>.jpg and a YAML skeleton in src/content/photos/.',
    );
    process.exitCode = 1;
    return;
  }
  for (const file of files) {
    const result = await importPhoto(file, {
      outDir: resolve(root, 'src/assets/photos'),
      yamlDir: resolve(root, 'src/content/photos'),
    });
    console.log(`${result.imagePath} + ${result.yamlPath}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
