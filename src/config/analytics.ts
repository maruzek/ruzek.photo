// Cookieless measurement (concept.md, kap. 12): Umami for visits and events, Cloudflare Web Analytics for Core Web
// Vitals. Both come from public build-time variables; a missing variable switches that tool off (`null`), so local
// builds and forks measure nothing. Moving Umami to Martin's own server = a new PUBLIC_UMAMI_SRC, nothing else.

export interface AnalyticsConfig {
  /** `hostUrl`: where the tracker sends its data (`${hostUrl}/api/send`), set on the script as data-host-url. */
  umami: { src: string; websiteId: string; hostUrl: string } | null;
  cfBeaconToken: string | null;
}

/** Umami Cloud serves the tracker from one origin and collects on another (its script.js defaults to the gateway). */
export const UMAMI_CLOUD = {
  script: 'https://cloud.umami.is',
  collect: 'https://gateway.umami.is',
} as const;

/** Collection origin: the gateway for Umami Cloud; a self-hosted Umami collects on its own origin. */
export function umamiHostUrl(src: string): string {
  const origin = new URL(src).origin;
  return origin === UMAMI_CLOUD.script ? UMAMI_CLOUD.collect : origin;
}

/** Only an absolute https URL is accepted as a script source (a typo must not load a script from the own origin). */
function httpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const token = (value: string | undefined): string | null => {
  const v = value?.trim();
  return v && /^[\w-]{1,128}$/.test(v) ? v : null;
};

export function analyticsFrom(env: Readonly<Record<string, string | undefined>>): AnalyticsConfig {
  const src = httpsUrl(env['PUBLIC_UMAMI_SRC']);
  const websiteId = token(env['PUBLIC_UMAMI_WEBSITE_ID']);
  return {
    umami: src && websiteId ? { src, websiteId, hostUrl: umamiHostUrl(src) } : null,
    cfBeaconToken: token(env['PUBLIC_CF_BEACON_TOKEN']),
  };
}

export const analytics: AnalyticsConfig = analyticsFrom(import.meta.env);
