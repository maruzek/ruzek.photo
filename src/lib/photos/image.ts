import { getImage } from 'astro:assets';

/** Widths generated for every photo (concept.md, kap. 8). Widths above the source width are skipped by Astro. */
export const IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920, 2560];
export const IMAGE_FORMATS: ('avif' | 'webp')[] = ['avif', 'webp'];

/** The hero photo spans the viewport. */
export const HERO_SIZES = '100vw';

/**
 * The AVIF `srcset` of the hero photo for `<link rel="preload">`. It asks `getImage()` with the same
 * options `<Picture>` uses for its AVIF `<source>`, so the preload fetches exactly the file the
 * browser picks later (a different URL would download the photo twice).
 */
export async function avifSrcset(src: ImageMetadata): Promise<string> {
  const image = await getImage({ src, format: 'avif', widths: IMAGE_WIDTHS });
  return image.srcSet.attribute;
}
