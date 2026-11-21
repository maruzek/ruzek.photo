import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://martinruzek.eu',
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }), // images processed at build time only
  integrations: [react({ include: ['**/islands/**'] }), sitemap()],
  i18n: { defaultLocale: 'cs', locales: ['cs', 'en'], routing: { prefixDefaultLocale: false } },
  build: { inlineStylesheets: 'auto' },
});
