import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets a second checkout (worktree) run its own preview next to the main one
const PORT = Number(process.env['E2E_PORT'] ?? 8787);

// Cloudflare's public Turnstile TEST site key (always passes); never a real key. It lives here and not only in the
// git-ignored .dev.vars, because Playwright always builds fresh (lead note L1-02). The matching test secret and
// the console mailer are in tests/e2e/preview.env.
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

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
    // the local D1 gets the migrations first (-c wrangler.jsonc: the built config keeps a relative migrations_dir);
    // --env-file replaces .dev.vars, so a developer's local secrets are never used; mails go to the console
    // mailer, which sends nothing
    command: [
      'pnpm build',
      'pnpm exec wrangler d1 migrations apply ruzek-inquiries --local -c wrangler.jsonc',
      `pnpm exec wrangler dev --port ${PORT} --env-file tests/e2e/preview.env` +
        ` --var ALLOWED_ORIGIN:http://localhost:${PORT}`,
    ].join(' && '),
    env: { PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY },
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
