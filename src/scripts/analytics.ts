// Event tracking and the loader for Umami and Cloudflare Web Analytics (concept.md, kap. 12). Both tools are
// cookieless; their scripts are injected only after `load`, in an idle callback, so they never compete with the LCP
// photo. Without a configuration nothing is loaded, and `track` does nothing whenever Umami is missing (blocked, not
// configured, development). Never pass personal data as event data.
import type { AnalyticsConfig } from '../config/analytics';

export type TrackEvent =
  | 'inquiry_sent'
  | 'inquiry_error'
  | 'estimate_used'
  | 'contact_click'
  | 'lightbox_open'
  | 'lang_switch';

type EventData = Record<string, string | number>;

declare global {
  interface Window {
    umami?: { track(event: string, data?: EventData): void };
  }
}

export const CF_BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function track(event: TrackEvent, data?: EventData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // measurement must never break the page
  }
}

function inject(win: Window, src: string, attrs: Record<string, string>): void {
  const doc = win.document;
  if (doc.querySelector(`script[src="${src}"]`)) return;
  const s = doc.createElement('script');
  s.defer = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  doc.head.appendChild(s); // not append(): the Worker runtime types overload Element.append
}

/** Injects the configured scripts after `load` and an idle moment. Safe to call more than once. */
export function loadAnalytics(cfg: AnalyticsConfig, win: Window = window): void {
  if (!cfg.umami && !cfg.cfBeaconToken) return;
  const run = (): void => {
    if (cfg.umami) inject(win, cfg.umami.src, { 'data-website-id': cfg.umami.websiteId });
    if (cfg.cfBeaconToken)
      inject(win, CF_BEACON_SRC, {
        'data-cf-beacon': JSON.stringify({ token: cfg.cfBeaconToken }),
      });
  };
  const idle = (): void => {
    if (typeof win.requestIdleCallback === 'function')
      win.requestIdleCallback(run, { timeout: 3000 });
    else win.setTimeout(run, 1);
  };
  if (win.document.readyState === 'complete') idle();
  else win.addEventListener('load', idle, { once: true });
}
