import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';
import { PLACEMENT, TEXT_OVER_PHOTOS } from '../src/config/placement';

/** `--night` from src/styles/tokens.css: the colour of the `.shade` gradient. */
export const NIGHT = '#07080b';
export const INK = '#E9EAEE';
export const WCAG_AA = 4.5;
/** The measured strip is the bottom part of the photo, where the text sits (concept.md, R3). */
export const BOTTOM_FRACTION = 0.35;

/**
 * Opacity of the `.shade` gradient over the measured strip. The gradient grows towards the bottom,
 * so the *weakest* point is where the strip starts, and that is where the text is hardest to read:
 * we use that value, not the average. `normal` is the fold gradient of the prototype
 * (0 at 35 % of the height, 0.9 at 100 %) sampled at 65 % of the height: 0.9 × 30/65 ≈ 0.41.
 * `strong` is `.shade.strong` in styles/sections/fold.css (and hero.css): 0.7 at 65 % and rising.
 * `hero` is the hero gradient of the prototype (0 at 48 %, 0.86 at 86 %) at 65 %: 0.86 × 17/38 ≈ 0.38,
 * the weakest point of the strip. It applies to a hero photo whose YAML says `shade: normal`.
 */
export const SHADE_OPACITY = { normal: 0.41, strong: 0.7, hero: 0.38 } as const;
export type ShadeName = keyof typeof SHADE_OPACITY;


type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`Not a #RRGGBB colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.2 relative luminance of an sRGB colour (0–255 channels, threshold 0.04045 of the sRGB standard). */
function luminance([r, g, b]: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG contrast between the ink colour and the bottom 35 % of the photo after the `.shade` gradient.
 * The shade is blended over each pixel (as the browser does), each pixel becomes a relative luminance, and
 * only then are the luminances averaged. Averaging the sRGB channels first would overestimate the contrast
 * of a strip that is half light and half dark.
 */
export async function bottomContrast(
  file: string,
  inkHex = INK,
  shade: ShadeName,
): Promise<number> {
  const oriented = sharp(file).rotate();
  const { width, height } = await sharp(await oriented.clone().toBuffer()).metadata();
  const top = Math.floor(height * (1 - BOTTOM_FRACTION));
  const strip = await oriented.extract({ left: 0, top, width, height: height - top }).toBuffer();
  const { data, info } = await sharp(strip)
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = SHADE_OPACITY[shade];
  const night = hexToRgb(NIGHT);
  const pixels = info.width * info.height;
  let sum = 0;
  for (let i = 0; i < pixels; i++) {
    const o = i * info.channels;
    sum += luminance([
      (data[o] ?? 0) * (1 - alpha) + (night[0] ?? 0) * alpha,
      (data[o + 1] ?? 0) * (1 - alpha) + (night[1] ?? 0) * alpha,
      (data[o + 2] ?? 0) * (1 - alpha) + (night[2] ?? 0) * alpha,
    ]);
  }
  return contrast(luminance(hexToRgb(inkHex)), sum / pixels);
}

interface PhotoEntry {
  id: string;
  image: string;
  shade: ShadeName;
}

/** Reads one `<id>.yaml`. Throws when the file is missing or unreadable; the caller reports that per photo. */
async function loadPhoto(dir: string, id: string): Promise<PhotoEntry> {
  const data = parse(await readFile(join(dir, `${id}.yaml`), 'utf8')) as {
    image?: string;
    shade?: 'normal' | 'strong';
  };
  if (!data?.image) throw new Error('no `image` in the YAML');
  const shade = data.shade ?? 'normal';
  return {
    id,
    image: resolve(dir, data.image),
    shade: shade === 'normal' && id === PLACEMENT.hero ? 'hero' : shade,
  };
}

/** Reports, never fails (exit 0): the check guides the choice of `shade`, it is no gate. */
async function main(ids: string[]): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dir = resolve(root, 'src/content/photos');
  const wanted = ids.length > 0 ? ids : [...TEXT_OVER_PHOTOS];
  let below = 0;
  for (const id of wanted) {
    let photo: PhotoEntry;
    let ratio: number;
    try {
      photo = await loadPhoto(dir, id);
      ratio = await bottomContrast(photo.image, INK, photo.shade);
    } catch (error) {
      console.warn(
        `check:contrast: WARN ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const line = `${id} (shade: ${photo.shade}): ${ratio.toFixed(2)}:1`;
    if (ratio >= WCAG_AA) {
      console.log(`check:contrast: ok   ${line}`);
      continue;
    }
    below++;
    const strong =
      photo.shade !== 'strong' ? await bottomContrast(photo.image, INK, 'strong') : undefined;
    const hint =
      strong === undefined
        ? 'even the strong shade is not enough'
        : strong >= WCAG_AA
          ? `try shade: strong (${strong.toFixed(2)}:1)`
          : `shade: strong gives only ${strong.toFixed(2)}:1`;
    console.warn(`check:contrast: WARN ${line} is below ${WCAG_AA}:1, ${hint}`);
  }
  if (below > 0)
    console.warn(`check:contrast: ${below} photo(s) below ${WCAG_AA}:1 (warning only)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
