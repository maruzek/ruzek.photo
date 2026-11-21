import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.tif',
  '.tiff',
  '.gif',
]);

/** True for a symbolic link that points to a directory (or nowhere): the scan does not follow it. */
export async function isDirectorySymlink(
  path: string,
  entry: { isSymbolicLink(): boolean },
): Promise<boolean> {
  if (!entry.isSymbolicLink()) return false;
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return true; // dangling link: cannot prove what is behind it
  }
}

/**
 * All image files below `dir`, recursively. A missing directory yields an empty list.
 * A symbolic link to a directory is not followed but listed as it is, so that the caller reports it
 * (files behind it would otherwise escape the scan).
 */
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
      if (await isDirectorySymlink(path, entry)) return [path];
      const dot = entry.name.lastIndexOf('.');
      return dot >= 0 && IMAGE_EXTENSIONS.has(entry.name.slice(dot).toLowerCase()) ? [path] : [];
    }),
  );
  return nested.flat();
}
