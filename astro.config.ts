import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { publishedPhotos } from './scripts/vite-published-photos';

const fontFile = (pkg: string, file: string): string => `./node_modules/@fontsource/${pkg}/files/${file}`;

// Latin + Latin Extended (Czech diacritics); ranges as published by Fontsource (Google Fonts subsets)
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

type Style = 'normal' | 'italic';
interface Variant {
  weight: number;
  style: Style;
  src: [string];
  unicodeRange: [string];
}

// One @font-face per weight and subset. The cast is safe: `weights` is non-empty, so the result is too
// (the local provider's types want a non-empty tuple).
const variants = (pkg: string, weights: readonly number[], style: Style = 'normal') =>
  weights.flatMap((weight) =>
    (
      [
        // `latin` first: Astro derives the fallback face metrics (size-adjust etc.) from the first variant,
        // and the latin-ext file gave 147 % / 166 % instead of the real values for the text people read
        ['latin', LATIN],
        ['latin-ext', LATIN_EXT],
      ] as const
    ).map(([subset, unicodeRange]) => ({
      weight,
      style,
      src: [fontFile(pkg, `${pkg}-${subset}-${weight}-${style}.woff2`)],
      unicodeRange: [unicodeRange],
    }))
  ) as [Variant, ...Variant[]];

export default defineConfig({
  site: 'https://martinruzek.eu',
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }), // images processed at build time only
  integrations: [react({ include: ['**/islands/**'] }), sitemap()],
  i18n: { defaultLocale: 'cs', locales: ['cs', 'en'], routing: { prefixDefaultLocale: false } },
  build: { inlineStylesheets: 'auto' },
  // no sessions: they would set cookies and make the adapter provision an unused KV binding
  session: false,
  // only published photos are imported, so a withdrawn photo emits no file (issue E-14)
  vite: {
    plugins: [publishedPhotos(fileURLToPath(new URL('./src/content/photos', import.meta.url)))],
  },
  // Fonts API with the local provider: the woff2 files come from the pnpm-installed @fontsource/* packages
  // (OFL 1.1, see README), nothing is fetched at build time and nothing from Google
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Stack Sans Notch',
      cssVariable: '--font-notch',
      fallbacks: ['system-ui', 'sans-serif'],
      options: { variants: variants('stack-sans-notch', [700]) },
    },
    {
      provider: fontProviders.local(),
      name: 'Stack Sans Text',
      cssVariable: '--font-text',
      fallbacks: ['system-ui', 'sans-serif'],
      options: { variants: variants('stack-sans-text', [400, 500, 600]) },
    },
    {
      provider: fontProviders.local(),
      name: 'Crimson Pro',
      cssVariable: '--font-accent',
      fallbacks: ['Georgia', 'serif'],
      options: { variants: variants('crimson-pro', [400], 'italic') },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: { variants: variants('geist-mono', [400, 500]) },
    },
  ],
});
