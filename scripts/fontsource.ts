import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FontProvider } from 'astro';
import subsetFont from 'subset-font';

// Fontsource's original coverage for Latin and Latin Extended.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const CORE_CHARACTERS =
  Array.from({ length: 95 }, (_, index) => String.fromCodePoint(0x20 + index)).join('') +
  'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž\u00a0„“”‚‘’–—…·€×©';
const CORE_CODE_POINTS = new Set(Array.from(CORE_CHARACTERS, (char) => char.codePointAt(0)));
const CORE_SUBSET = 'core';

interface FontsourceOptions {
  packageName: string;
  weights: number[];
  style?: 'normal' | 'italic';
  compact?: boolean;
}

function partitionRange(unicodeRange: string) {
  const core: string[] = [];
  const remaining: string[] = [];
  for (const range of unicodeRange.split(',')) {
    const [first = '', last = first] = range.slice(2).split('-');
    let start = Number.parseInt(first, 16);
    const end = Number.parseInt(last, 16);
    // Split a run whenever membership changes, closing the last run at end + 1.
    for (let next = start + 1; next <= end + 1; next++) {
      const inCore = CORE_CODE_POINTS.has(start);
      if (next <= end && CORE_CODE_POINTS.has(next) === inCore) continue;
      const lowerBound = start.toString(16);
      const upperBound = (next - 1).toString(16);
      (inCore ? core : remaining).push(
        next === start + 1 ? `U+${lowerBound}` : `U+${lowerBound}-${upperBound}`,
      );
      start = next;
    }
  }
  return { core, remaining };
}

// Keep Latin first so Astro computes fallback metrics from the original Latin file.
const SOURCE_SUBSETS = (
  [
    ['latin', LATIN],
    ['latin-ext', LATIN_EXT],
  ] as const
).map(([name, coverage]) => ({ name, coverage, ...partitionRange(coverage) }));

export function fontsource(): FontProvider<FontsourceOptions> {
  let root: URL;
  return {
    name: 'local-fontsource',
    init(context) {
      root = context.root;
    },
    async resolveFont({ options }) {
      if (!options) return;
      const { packageName, weights, style = 'normal', compact = true } = options;
      const variants = await Promise.all(
        weights.flatMap((weight) =>
          SOURCE_SUBSETS.map(async ({ name, coverage, core, remaining }) => {
            const source = fileURLToPath(
              new URL(
                `./node_modules/@fontsource/${packageName}/files/${packageName}-${name}-${weight}-${style}.woff2`,
                root,
              ),
            );
            const original = {
              weight,
              style,
              src: [{ url: source, format: 'woff2' as const }],
              unicodeRange: compact ? remaining : [coverage],
            };
            if (!compact) return [original];

            const subset = await subsetFont(await readFile(source), CORE_CHARACTERS, {
              targetFormat: 'woff2',
              preserveNameIds: [0, 13, 14], // copyright, license and license URL
            });
            return [
              original,
              {
                weight,
                style,
                // Astro emits a hashed, self-hosted font asset from these bytes.
                src: [
                  {
                    url: `data:font/woff2;base64,${subset.toString('base64')}`,
                    format: 'woff2' as const,
                  },
                ],
                unicodeRange: core,
                meta: { subset: CORE_SUBSET },
              },
            ];
          }),
        ),
      );
      return { fonts: variants.flat() };
    },
  };
}
