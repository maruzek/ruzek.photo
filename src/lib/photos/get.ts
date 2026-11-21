import { getEntry, type CollectionEntry } from 'astro:content';
import images from 'virtual:published-photos';
import type { Photo } from './schema';

/** A published photo with its image resolved for `astro:assets`. */
export interface PublishedPhoto {
  id: string;
  data: Photo<ImageMetadata>;
}

/**
 * A published photo of the collection, or `undefined` when it is missing or withdrawn. Withdrawing a photo
 * (consent gone) must be one content change and a redeploy, so a section that uses it renders its text on the
 * plain surface instead of failing the build. The warning keeps that visible in the build log.
 * A published photo whose file is missing fails the build.
 */
export async function getPhoto(id: string): Promise<PublishedPhoto | undefined> {
  const entry: CollectionEntry<'photos'> | undefined = await getEntry('photos', id);
  if (!entry) {
    console.warn(`getPhoto: photo "${id}" is not in the photos collection, rendering without it`);
    return undefined;
  }
  if (!entry.data.published) {
    console.warn(`getPhoto: photo "${id}" is not published, rendering without it`);
    return undefined;
  }
  // Only published photos are imported (scripts/vite-published-photos.ts), so a withdrawn photo has no file in
  // the build at all (issue E-14).
  const image = images[entry.id];
  if (!image)
    throw new Error(`getPhoto: published photo "${id}" has no image in virtual:published-photos`);
  return { id: entry.id, data: { ...entry.data, image } };
}
