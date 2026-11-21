import { getEntry, type CollectionEntry } from 'astro:content';

/** A published photo of the collection. Fails the build when it is missing or withdrawn, never renders it silently. */
export async function getPhoto(id: string): Promise<CollectionEntry<'photos'>> {
  const entry = await getEntry('photos', id);
  if (!entry) throw new Error(`Photo "${id}" is not in the photos collection`);
  if (!entry.data.published) throw new Error(`Photo "${id}" is not published`);
  return entry;
}
