// Measurement is switched on in the e2e build (privacy.spec.ts checks cookies with it on), but no test may reach a
// third party: Umami points to a reserved .test host, and the browser resolves it and the Cloudflare beacon hosts to
// 127.0.0.1, where nothing listens on 443 (playwright.config.ts). analytics.spec.ts serves stand-ins with
// page.route, which intercepts before DNS.
export const ANALYTICS_TEST_ENV = {
  PUBLIC_UMAMI_SRC: 'https://umami.test/script.js',
  PUBLIC_UMAMI_WEBSITE_ID: 'e2e-site',
  PUBLIC_CF_BEACON_TOKEN: 'e2e-token',
};

export const BLOCKED_HOSTS = [
  'umami.test',
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
];
