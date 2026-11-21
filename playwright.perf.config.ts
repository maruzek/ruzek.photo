import { defineConfig, devices } from '@playwright/test';

// Frame budget of the ASCII hero on a throttled phone (plan, task 9). Separate from the e2e suite: it is slow
// and its numbers depend on the machine, so it runs on demand with `pnpm test:perf`.
const PORT = Number(process.env['E2E_PORT'] ?? 8787);

export default defineConfig({
  testDir: 'tests/perf',
  testMatch: '**/*.perf.ts',
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm build && pnpm exec wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'phone-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
