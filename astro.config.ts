import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { cspHeaders } from './scripts/csp-headers';
import { fontsource } from './scripts/fontsource';
import { publishedPhotos } from './scripts/vite-published-photos';
import { MOBILE_PHOTO_POSITION } from './src/config/placement';
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

const localFonts = fontsource();

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
    plugins: [
      publishedPhotos(fileURLToPath(new URL('./src/content/photos', import.meta.url)), {
        positions: MOBILE_PHOTO_POSITION,
        // generated build input, kept between builds so Astro's image cache stays valid
        cacheDir: fileURLToPath(new URL('./node_modules/.cache/mobile-crops', import.meta.url)),
      }),
    ],
  },
  // Fonts API with the local provider: the woff2 files come from the pnpm-installed @fontsource/* packages
  // (OFL 1.1, see README), nothing is fetched at build time and nothing from Google
  fonts: [
    {
      provider: localFonts,
      name: 'Stack Sans Notch',
      cssVariable: '--font-notch',
      fallbacks: ['system-ui', 'sans-serif'],
      options: { packageName: 'stack-sans-notch', weights: [700] },
    },
    {
      provider: localFonts,
      name: 'Stack Sans Text',
      cssVariable: '--font-text',
      fallbacks: ['system-ui', 'sans-serif'],
      options: { packageName: 'stack-sans-text', weights: [400, 500, 600] },
    },
    {
      provider: localFonts,
      name: 'Instrument Serif',
      cssVariable: '--font-accent',
      fallbacks: ['Georgia', 'serif'],
      options: { packageName: 'instrument-serif', weights: [400], style: 'italic' },
    },
    {
      provider: localFonts,
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: { packageName: 'geist-mono', weights: [400, 500], compact: false },
    },
  ],
});
