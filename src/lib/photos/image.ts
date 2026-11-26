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

/** Widths of the thumbnails on the "same day" time axis: the phone and the retina laptop both get the larger one */
const THUMB_WIDTHS = [160, 320];
/**
 * Rendered width of a thumbnail: 5 in a row on a phone (8 on a tablet), about 5 % of a desktop screen, and up to
 * twice that where the crop zooms in. One value for every cell, so a photo is downloaded once for all of them.
 */
const THUMB_SIZES = '(max-width: 599px) 25vw, (max-width: 960px) 14vw, 8vw';

export interface DayThumb {
  srcset: string;
  sizes: string;
  src: string;
  width: number;
  height: number;
}

/** One thumbnail of the time axis, shared by every cell that shows the photo (DayCell.astro). */
export async function dayThumb(image: ImageMetadata): Promise<DayThumb> {
  const [avif, webp] = await Promise.all([
    getImage({ src: image, format: 'avif', widths: THUMB_WIDTHS, quality: IMAGE_QUALITY }),
    getImage({ src: image, format: 'webp', width: THUMB_WIDTHS.at(-1), quality: IMAGE_QUALITY }),
  ]);
  const width = THUMB_WIDTHS[0] ?? 160;
  return {
    srcset: avif.srcSet.attribute,
    sizes: THUMB_SIZES,
    src: webp.src,
    width,
    height: Math.round((width * image.height) / image.width),
  };
}

/** Slots of the large photos on the time axis: two upright ones and a wide one, or all wide when a pick is missing */
export type DaySlot = 'tall' | 'wide' | 'half' | 'only';

/**
 * `sizes` of a large photo on the time axis (day.css). The boxes crop the photo (`object-fit: cover`), so where a box
 * is taller than the photo's proportions the photo is rendered wider than the box.
 */
export function daySizes(image: ImageMetadata, slot: DaySlot, zoom: number): string {
  const aspect = image.width / image.height;
  const times = (v: number): string => (v * aspect * zoom).toFixed(2);
  const z = (v: number): number => Math.ceil(v * zoom);
  // box widths in vw (desktop, tablet, phone) and height shares of the picture area (desktop) or of the box width
  const box = {
    tall: { desk: 11, share: 0.62, tab: 22, tabShare: 1, phone: 43, tall: 14 / 9 },
    wide: { desk: 22, share: 0.38, tab: 50, tabShare: 1, phone: 86, tall: 9 / 16 },
    half: { desk: 22, share: 0.5, tab: 47, tabShare: 1, phone: 86, tall: 9 / 16 },
    only: { desk: 22, share: 1, tab: 94, tabShare: 1, phone: 86, tall: 5 / 4 },
  }[slot];
  const phone = `${Math.ceil(Math.max(box.phone, box.phone * box.tall * aspect) * zoom)}vw`;
  const tablet = `max(${z(box.tab)}vw, ${times(box.tabShare)} * clamp(230px, 40vw, 360px))`;
  const desktop = `max(${z(box.desk)}vw, ${times(box.share)} * clamp(250px, 100vh - 480px, 640px))`;
  return `(max-width: 599px) ${phone}, (max-width: 960px) ${tablet}, ${desktop}`;
}
