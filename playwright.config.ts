import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets a second checkout (worktree) run its own preview next to the main one
const PORT = Number(process.env['E2E_PORT'] ?? 8787);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    // wrangler dev serves dist/ the way Workers with static assets will on Cloudflare
    command: `pnpm build && pnpm exec wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // always build the current source; an already running preview would serve stale HTML
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'mobile-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 780 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
