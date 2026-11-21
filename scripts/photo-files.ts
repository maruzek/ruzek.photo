import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif']);

/** All image files below `dir`, recursively. A missing directory yields an empty list. */
export async function listImages(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listImages(path);
      const dot = entry.name.lastIndexOf('.');
      return dot >= 0 && IMAGE_EXTENSIONS.has(entry.name.slice(dot).toLowerCase()) ? [path] : [];
    })
  );
  return nested.flat();
}
