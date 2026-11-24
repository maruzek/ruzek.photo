import { getImage } from 'astro:assets';

/**
 * Widths generated for every photo (concept.md, kap. 8). Widths above the source width are skipped by Astro, so
 * 2880 (a retina laptop) and 3840 (4K) only exist for the full-screen photos imported with `--max-edge`.
 */
export const IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920, 2560, 2880, 3840];
export const IMAGE_FORMATS: ('avif' | 'webp')[] = ['avif', 'webp'];

/**
 * Encoder quality for every generated photo. Without it Sharp encodes AVIF at 50, which smooths away the grain of
 * high-ISO event photos and bands soft backgrounds. At 65 the grain survives for about twice the bytes; higher
 * values cost much more and look the same. Astro passes one value to every format, so the WebP fallback gets 65 too.
 */
export const IMAGE_QUALITY = 65;

/**
 * `sizes` for a photo that fills a full-bleed box with `object-fit: cover`. When the box is narrower than the photo's
 * aspect ratio (a portrait phone, a 4:3 monitor), the photo is scaled to the box height and rendered wider than
 * the viewport, so `100vw` would pick a file that is too small.
 *
 * @param minHeight the box's `min-height` in CSS px (the box is at least one screen high, `100svh`)
 */
export function coverSizes(image: ImageMetadata, minHeight: number): string {
  const aspect = image.width / image.height;
  return `max(100vw, ${Math.ceil(aspect * 100)}svh, ${Math.ceil(aspect * minHeight)}px)`;
}

/** The hero is at least one screen and 640 px high (hero.css). */
export const heroSizes = (image: ImageMetadata): string => coverSizes(image, 640);

/**
 * The AVIF `srcset` of the hero photo for `<link rel="preload">`. It asks `getImage()` with the same
 * options `<Picture>` uses for its AVIF `<source>`, so the preload fetches exactly the file the
 * browser picks later (a different URL would download the photo twice).
 */
export async function avifSrcset(src: ImageMetadata): Promise<string> {
  const image = await getImage({ src, format: 'avif', widths: IMAGE_WIDTHS, quality: IMAGE_QUALITY });
  return image.srcSet.attribute;
}
