import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ViteUserConfig } from 'astro';
import { parse } from 'yaml';

export const PUBLISHED_PHOTOS_ID = 'virtual:published-photos';
// `vite` is no direct dependency: take its plugin type from Astro's config type
type PluginOption = NonNullable<ViteUserConfig['plugins']>[number];
type Plugin = Extract<NonNullable<Awaited<PluginOption>>, { name: string }>;

const RESOLVED_ID = `\0${PUBLISHED_PHOTOS_ID}`;

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
 */
export function publishedPhotos(photosDir: string): Plugin {
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
        imports.push(`import p${i} from ${JSON.stringify(image)};`);
        entries.push(`${JSON.stringify(file.slice(0, -'.yaml'.length))}: p${i}`);
      }
      return `${imports.join('\n')}\nexport default { ${entries.join(', ')} };\n`;
    },
  };
}
