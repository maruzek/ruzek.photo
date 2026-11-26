import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import type { ViteUserConfig } from 'astro';
import sharp from 'sharp';
import { parse } from 'yaml';
import { MOBILE_CROP_ASPECT, mobileCropRegion } from '../src/lib/photos/mobile-crop';

export const PUBLISHED_PHOTOS_ID = 'virtual:published-photos';
// `vite` is no direct dependency: take its plugin type from Astro's config type
type PluginOption = NonNullable<ViteUserConfig['plugins']>[number];
type Plugin = Extract<NonNullable<Awaited<PluginOption>>, { name: string }>;

const RESOLVED_ID = `\0${PUBLISHED_PHOTOS_ID}`;

export interface MobileCrops {
  /** `object-position` on phones by photo id (src/config/placement.ts); each listed photo gets a portrait crop. */
  positions: Readonly<Partial<Record<string, string>>>;
  /** Where the generated crops are cached (outside the repo, they are build output). */
  cacheDir: string;
}

/**
 * Writes the portrait crop of `image` into `cacheDir` (src/lib/photos/mobile-crop.ts) and returns its path, or
 * `undefined` when the photo is not wider than the crop. The file name hashes the source and the position, so an
 * edited photo or a moved position makes a new file and an unchanged one is reused. JPEG at 95 is only the
 * intermediate: Astro encodes the served files from it.
 */
export async function writeMobileCrop(
  image: string,
  position: string,
  cacheDir: string,
): Promise<string | undefined> {
  const input = await readFile(image);
  const { width = 0, height = 0 } = await sharp(input).metadata();
  const region = mobileCropRegion(width, height, position);
  if (!region) return undefined;
  const hash = createHash('sha256')
    .update(input)
    .update(`${position}|${MOBILE_CROP_ASPECT}`)
    .digest('hex')
    .slice(0, 12);
  const name = image.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'photo';
  const out = join(cacheDir, `${name}.mobile.${hash}.jpg`);
  if (!existsSync(out)) {
    await mkdir(cacheDir, { recursive: true });
    const tmp = `${out}.${process.pid}.tmp`;
    await writeFile(tmp, await sharp(input).extract(region).jpeg({ quality: 95 }).toBuffer());
    await rename(tmp, out); // two builds at once never read a half-written file
    // older crops of the same photo (an earlier edit or position) are no longer imported
    for (const file of await readdir(cacheDir))
      if (file.startsWith(`${name}.mobile.`) && file !== basename(out))
        await rm(join(cacheDir, file), { force: true });
  }
  return out;
}

/**
 * `import images from 'virtual:published-photos'` gives `{ [photoId]: ImageMetadata }` for the published photos
 * only. The module imports nothing else, so a withdrawn photo never enters the build graph and no file of it
 * (original or resized) reaches `dist` (issue E-14). The `image()` helper of content collections and
 * `import.meta.glob` (even lazy) both import every file, published or not.
 *
 * The YAML rules (consent, alt texts) are still checked by the collection schema. A published photo whose file
 * is missing fails the build here, because its import cannot resolve. Two entries (published or not) that point
 * to the same file fail the build too: withdrawing one of them would leave the file published through the
 * other (HM-01).
 *
 * The named export `mobile` gives the portrait phone crops of the photos listed in `crops.positions`, again for
 * published photos only, so a withdrawn photo leaves no crop in the build either.
 */
export function publishedPhotos(photosDir: string, crops?: MobileCrops): Plugin {
  return {
    name: 'ruzek:published-photos',
    resolveId(id: string) {
      return id === PUBLISHED_PHOTOS_ID ? RESOLVED_ID : undefined;
    },
    async load(id: string) {
      if (id !== RESOLVED_ID) return undefined;
      const files = (await readdir(photosDir)).filter((f) => f.endsWith('.yaml')).sort();
      const imports: string[] = [];
      const entries: string[] = [];
      const mobile: string[] = [];
      const owners = new Map<string, string>();
      for (const [i, file] of files.entries()) {
        const path = join(photosDir, file);
        this.addWatchFile(path);
        const data = parse(await readFile(path, 'utf8')) as {
          image?: unknown;
          published?: unknown;
        } | null;
        if (typeof data?.image !== 'string') continue;
        const image = resolve(photosDir, data.image);
        const owner = owners.get(image);
        if (owner) throw new Error(`${owner} and ${file} point to the same image ${data.image}`);
        owners.set(image, file);
        // `published` defaults to false in the schema: only an explicit `true` imports the file
        if (data.published !== true) continue;
        const id = file.slice(0, -'.yaml'.length);
        imports.push(`import p${i} from ${JSON.stringify(image)};`);
        entries.push(`${JSON.stringify(id)}: p${i}`);
        const position = crops?.positions[id];
        if (crops && position) {
          this.addWatchFile(image);
          const crop = await writeMobileCrop(image, position, crops.cacheDir);
          if (crop) {
            imports.push(`import m${i} from ${JSON.stringify(crop)};`);
            mobile.push(`${JSON.stringify(id)}: m${i}`);
          }
        }
      }
      return (
        `${imports.join('\n')}\nexport default { ${entries.join(', ')} };\n` +
        `export const mobile = { ${mobile.join(', ')} };\n`
      );
    },
  };
}
