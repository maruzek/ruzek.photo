import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { cspHeaders } from './scripts/csp-headers';
import { publishedPhotos } from './scripts/vite-published-photos';
import { SITE_URL } from './src/config/site';
import { alternates } from './src/i18n';

// Sitemap alternates (concept.md, kap. 5): pages whose paths differ per language (the privacy page) are paired here,
// case studies by their shared slug. The 404 page is left out; draft case studies have no page at all.
const PAIRS = [alternates('home'), alternates('privacy')];
// the two case-study path prefixes (`/pripadove-studie/`, `/en/case-studies/`), cut from a dummy slug `x`
const CASE_PREFIXES = Object.values(alternates('caseStudy', 'x')).map((p) =>
  p.slice(0, -'x/'.length),
);
function sitemapLinks(url: string): { lang: string; url: string }[] | undefined {
  const path = new URL(url).pathname;
  let pair = PAIRS.find((p) => p.cs === path || p.en === path);
  const prefix = CASE_PREFIXES.find((p) => path.startsWith(p));
  if (!pair && prefix) pair = alternates('caseStudy', path.slice(prefix.length).replace(/\/$/, ''));
  if (!pair) return undefined;
  return [
    { lang: 'cs', url: new URL(pair.cs, SITE_URL).href },
    { lang: 'en', url: new URL(pair.en, SITE_URL).href },
    { lang: 'x-default', url: new URL(pair.cs, SITE_URL).href },
  ];
}

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
  site: SITE_URL,
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }), // images processed at build time only
  integrations: [
    react({ include: ['**/islands/**'] }),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/404'),
      serialize: (item) => {
        const links = sitemapLinks(item.url);
        return links ? { ...item, links } : item;
      },
    }),
    cspHeaders(),
  ],
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
