import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// D1 tests against a real local D1 (Miniflare through wrangler's getPlatformProxy), with the migrations
// applied in the test. Separate from vitest.config.ts: they start a local runtime and take a few seconds.
// (@cloudflare/vitest-pool-workers needs vitest ^4.1; this repo is on 5.x, lead note L1-01.)
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/workers/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
