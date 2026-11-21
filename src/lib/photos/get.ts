import { getEntry, type CollectionEntry } from 'astro:content';

/**
 * A published photo of the collection, or `undefined` when it is missing or withdrawn. Withdrawing a photo
 * (consent gone) must be one content change and a redeploy, so a section that uses it renders its text on the
 * plain surface instead of failing the build. The warning keeps that visible in the build log.
 */
export async function getPhoto(id: string): Promise<CollectionEntry<'photos'> | undefined> {
  const entry = await getEntry('photos', id);
  if (!entry) {
    console.warn(`getPhoto: photo "${id}" is not in the photos collection, rendering without it`);
    return undefined;
  }
  if (!entry.data.published) {
    console.warn(`getPhoto: photo "${id}" is not published, rendering without it`);
    return undefined;
  }
  return entry;
}
