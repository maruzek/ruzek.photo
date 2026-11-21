import type { Page } from '@playwright/test';
import { ANALYTICS_TEST_ENV } from './analytics-env';

// Working stand-ins for the two trackers, served with page.route (no real network). They do what matters for the
// tests the way the real scripts do:
// - Umami (checked against cloud.umami.is/script.js): sends to `${data-host-url}/api/send` as JSON {type, payload}
//   with the full location.href and document.referrer, after passing the payload through the global named in
//   data-before-send; turns data-umami-event clicks into events (name from the attribute, data from
//   data-umami-event-*); window.umami.track records its calls in window.__umami.
// - Cloudflare beacon: reports to https://cloudflareinsights.com/cdn-cgi/rum.
// A collect request blocked by the CSP never reaches page.route, so a recorded collect proves that connect-src
// allows it.

const UMAMI_STUB = `(function () {
  var s = document.currentScript;
  var host = (s.getAttribute('data-host-url') || new URL(s.src).origin).replace(/\\/$/, '');
  var hook = window[s.getAttribute('data-before-send') || ''];
  var calls = (window.__umami = []);
  function base() {
    var o = location.origin, r = document.referrer;
    return { website: s.getAttribute('data-website-id'), hostname: location.hostname, url: location.href,
      referrer: r === o || r.indexOf(o + '/') === 0 ? r.slice(o.length) : r, title: document.title };
  }
  function send(type, payload) {
    if (typeof hook === 'function') payload = hook(type, payload);
    if (!payload) return;
    fetch(host + '/api/send', { method: 'POST', keepalive: true, credentials: 'omit',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: type, payload: payload }) })
      .catch(function () {});
  }
  window.umami = { track: function (name, data) {
    calls.push({ name: name, data: data || null });
    var p = base(); p.name = name; if (data) p.data = data; send('event', p);
  } };
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-umami-event]');
    if (!el) return;
    var data = {};
    for (var a of el.attributes) if (a.name.indexOf('data-umami-event-') === 0) data[a.name.slice(17)] = a.value;
    e.preventDefault();
    window.umami.track(el.getAttribute('data-umami-event'), data);
  }, true);
  send('event', base());
})();`;

const BEACON_STUB = `fetch('https://cloudflareinsights.com/cdn-cgi/rum', { method: 'POST', keepalive: true, credentials: 'omit',
  body: '{}' }).catch(function () {});`;

export const UMAMI_COLLECT = `${new URL(ANALYTICS_TEST_ENV.PUBLIC_UMAMI_SRC).origin}/api/send`;
export const BEACON_COLLECT = 'https://cloudflareinsights.com/cdn-cgi/rum';

export interface Hit {
  url: string;
  at: number;
}

export interface Collect {
  url: string;
  body: string;
}

export interface Stubs {
  /** script downloads */
  hits: Hit[];
  /** requests to the collect endpoints */
  collects: Collect[];
  /** securitypolicyviolation events seen in the page */
  violations: () => Promise<string[]>;
}

export async function stubAnalytics(page: Page): Promise<Stubs> {
  const hits: Hit[] = [];
  const collects: Collect[] = [];
  await page.route(ANALYTICS_TEST_ENV.PUBLIC_UMAMI_SRC, (r) => {
    hits.push({ url: r.request().url(), at: Date.now() });
    return r.fulfill({ contentType: 'text/javascript', body: UMAMI_STUB });
  });
  await page.route('https://static.cloudflareinsights.com/**', (r) => {
    hits.push({ url: r.request().url(), at: Date.now() });
    return r.fulfill({ contentType: 'text/javascript', body: BEACON_STUB });
  });
  for (const url of [UMAMI_COLLECT, BEACON_COLLECT])
    await page.route(url, (r) => {
      collects.push({ url: r.request().url(), body: r.request().postData() ?? '' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  await page.addInitScript(() => {
    const w = window as unknown as { __loadAt: number; __csp: string[] };
    w.__csp = [];
    addEventListener('load', () => (w.__loadAt = Date.now()));
    document.addEventListener('securitypolicyviolation', (e) =>
      w.__csp.push(`${e.effectiveDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`),
    );
  });
  return {
    hits,
    collects,
    violations: () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp),
  };
}
