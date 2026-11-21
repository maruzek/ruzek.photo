// Event tracking and the loader for Umami and Cloudflare Web Analytics (concept.md, kap. 12). Both tools are
// cookieless; their scripts are injected only after `load`, in an idle callback, so they never compete with the LCP
// photo. Without a configuration nothing is loaded, and `track` does nothing whenever Umami is missing (blocked, not
// configured, development). Never pass personal data as event data.
import type { AnalyticsConfig } from '../config/analytics';
import { GENERIC_UTM_MEDIUMS, GENERIC_UTM_SOURCES } from '../config/utm';

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

/** Global the Umami tracker calls before every request (`data-before-send`), with (type, payload). */
export const UMAMI_BEFORE_SEND = '__umamiBeforeSend';
/**
 * The only query parameters Umami may see, each only with a generic channel name (ST-10); utm_campaign is free
 * text and never sent. Anything else (an e-mail in a link, a token) is dropped.
 */
export const UMAMI_KEPT_PARAMS: Readonly<Record<string, readonly string[]>> = {
  utm_source: GENERIC_UTM_SOURCES,
  utm_medium: GENERIC_UTM_MEDIUMS,
};

/** The page address for Umami: the path and the generic UTM tags only, never another parameter or the hash. */
export function sanitizeUrl(url: string, base: string): string {
  try {
    const u = new URL(url, base);
    const kept = new URLSearchParams();
    for (const [k, allowed] of Object.entries(UMAMI_KEPT_PARAMS)) {
      const v = u.searchParams.get(k)?.trim().toLowerCase();
      if (v && allowed.includes(v)) kept.set(k, v);
    }
    const q = kept.toString();
    return q ? `${u.pathname}?${q}` : u.pathname;
  } catch {
    return '/';
  }
}

/** The referrer for Umami: the origin of another site only; the own site and anything not http(s) give ''. */
export function sanitizeReferrer(referrer: string, ownOrigin: string): string {
  if (!referrer || referrer.startsWith('/')) return ''; // the tracker turns an own-site referrer into a path
  try {
    const u = new URL(referrer);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.origin === ownOrigin) return '';
    return u.origin;
  } catch {
    return '';
  }
}

/** Applied to every Umami payload (page views, events, performance) before it leaves the browser. */
export function sanitizeUmamiPayload<T extends object>(payload: T, ownOrigin: string): T {
  const p = { ...payload } as T & { url?: unknown; referrer?: unknown };
  if (typeof p.url === 'string') p.url = sanitizeUrl(p.url, ownOrigin);
  if (typeof p.referrer === 'string') p.referrer = sanitizeReferrer(p.referrer, ownOrigin);
  return p;
}

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
    if (cfg.umami) {
      const origin = win.location.origin;
      (win as unknown as Record<string, unknown>)[UMAMI_BEFORE_SEND] = (
        _type: string,
        payload: object,
      ) => sanitizeUmamiPayload(payload, origin);
      inject(win, cfg.umami.src, {
        'data-website-id': cfg.umami.websiteId,
        'data-host-url': cfg.umami.hostUrl,
        'data-before-send': UMAMI_BEFORE_SEND,
        'data-exclude-hash': 'true',
      });
    }
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
