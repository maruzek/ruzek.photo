// Portrait crops of the full-screen photos (hero, folds) for phones. On a portrait phone such a photo covers the
// screen by height, so the browser would download the whole landscape file and show about a third of it. The
// build cuts a portrait strip instead (scripts/vite-published-photos.ts) and the page offers it to phones.
// Plain module without astro:assets: the Vite plugin, the components and the unit tests all import it.

/** Width / height of the portrait crop. */
export const MOBILE_CROP_ASPECT = 3 / 5;

/**
 * Where the crop replaces the full photo: the 700 px breakpoint of the mobile `object-position` (hero.css,
 * fold.css), on a screen at least 16:9 tall. The box is one screen high (`100svh`), so its aspect stays within
 * the crop's 3:5 even with the browser bars shown (9/16 ÷ 0.85 ≈ 0.66 would zoom the crop by 10 % at worst).
 */
export const MOBILE_CROP_MEDIA = '(max-width: 700px) and (max-aspect-ratio: 9/16)';
/** The complement of `MOBILE_CROP_MEDIA`, for the preload of the full photo (`not all and …` negates it all). */
export const NOT_MOBILE_CROP_MEDIA = `not all and ${MOBILE_CROP_MEDIA}`;

/** The horizontal fraction of an `object-position` value such as `66% 50%`. */
export function positionX(position: string): number {
  const match = /^\s*(\d+(?:\.\d+)?)%/.exec(position);
  if (!match) throw new Error(`Mobile photo position "${position}" must start with a percentage`);
  const x = Number(match[1]) / 100;
  if (x > 1) throw new Error(`Mobile photo position "${position}" is beyond 100 %`);
  return x;
}

/**
 * The full-height strip of a `width` × `height` photo that becomes the phone crop, or `undefined` when the photo is
 * not wider than the crop. The strip is placed with the same percentage that positions the photo on the phone:
 * for any box narrower than the strip, `object-position: x%` then shows exactly the same part of the photo in
 * the strip as in the whole photo, so the CSS needs no second value.
 */
export function mobileCropRegion(
  width: number,
  height: number,
  position: string,
): { left: number; top: number; width: number; height: number } | undefined {
  const cropWidth = Math.round(height * MOBILE_CROP_ASPECT);
  if (cropWidth >= width) return undefined;
  return { left: Math.round((width - cropWidth) * positionX(position)), top: 0, width: cropWidth, height };
}
