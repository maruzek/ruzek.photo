import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';

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
 * `strong` is an assumption that has to match the `strong` gradient in the section CSS (plan task 7).
 */
export const SHADE_OPACITY = { normal: 0.41, strong: 0.7 } as const;

/** The photos with text over them (the hero and the two folds of the prototype). Pass ids to override. */
export const TEXT_OVER_PHOTOS = ['smoke', 'ball', 'soccer-goal'] as const;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`Not a #RRGGBB colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.x relative luminance of an sRGB colour (0–255 channels). */
function luminance([r, g, b]: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG contrast between the ink colour and the bottom 35 % of the photo after the `.shade` gradient
 * (mean sRGB colour of the strip blended over with `--night`, as the browser does).
 */
export async function bottomContrast(
  file: string,
  inkHex = INK,
  shade: 'normal' | 'strong'
): Promise<number> {
  const oriented = sharp(file).rotate();
  const { width, height } = await sharp(await oriented.clone().toBuffer()).metadata();
  const top = Math.floor(height * (1 - BOTTOM_FRACTION));
  const strip = await oriented.extract({ left: 0, top, width, height: height - top }).toBuffer();
  const { channels } = await sharp(strip).stats();
  const mean = [channels[0]?.mean ?? 0, channels[1]?.mean ?? 0, channels[2]?.mean ?? 0];
  const alpha = SHADE_OPACITY[shade];
  const night = hexToRgb(NIGHT);
  const blended = mean.map((c, i) => c * (1 - alpha) + (night[i] ?? 0) * alpha) as Rgb;
  return contrast(luminance(hexToRgb(inkHex)), luminance(blended));
}

interface PhotoEntry {
  id: string;
  image: string;
  shade: 'normal' | 'strong';
}

async function loadPhotos(dir: string): Promise<PhotoEntry[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort();
  return Promise.all(
    files.map(async (f) => {
      const data = parse(await readFile(join(dir, f), 'utf8')) as { image: string; shade?: 'normal' | 'strong' };
      return { id: f.replace(/\.yaml$/, ''), image: resolve(dir, data.image), shade: data.shade ?? 'normal' };
    })
  );
}

/** Reports, never fails (exit 0): the check guides the choice of `shade`, it is no gate. */
async function main(ids: string[]): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const all = await loadPhotos(resolve(root, 'src/content/photos'));
  const wanted = ids.length > 0 ? ids : [...TEXT_OVER_PHOTOS];
  let below = 0;
  for (const id of wanted) {
    const photo = all.find((p) => p.id === id);
    if (!photo) {
      console.warn(`check:contrast: no photo "${id}" in src/content/photos`);
      continue;
    }
    const ratio = await bottomContrast(photo.image, INK, photo.shade);
    const line = `${id} (shade: ${photo.shade}): ${ratio.toFixed(2)}:1`;
    if (ratio >= WCAG_AA) {
      console.log(`check:contrast: ok   ${line}`);
      continue;
    }
    below++;
    const strong = photo.shade === 'normal' ? await bottomContrast(photo.image, INK, 'strong') : undefined;
    const hint =
      strong === undefined
        ? 'even the strong shade is not enough'
        : strong >= WCAG_AA
          ? `try shade: strong (${strong.toFixed(2)}:1)`
          : `shade: strong gives only ${strong.toFixed(2)}:1`;
    console.warn(`check:contrast: WARN ${line} is below ${WCAG_AA}:1, ${hint}`);
  }
  if (below > 0) console.warn(`check:contrast: ${below} photo(s) below ${WCAG_AA}:1 (warning only)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
