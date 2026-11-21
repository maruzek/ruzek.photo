// Cookieless measurement (concept.md, kap. 12): Umami for visits and events, Cloudflare Web Analytics for Core Web
// Vitals. Both come from public build-time variables; a missing variable switches that tool off (`null`), so local
// builds and forks measure nothing. Moving Umami to Martin's own server = a new PUBLIC_UMAMI_SRC, nothing else.

export interface AnalyticsConfig {
  umami: { src: string; websiteId: string } | null;
  cfBeaconToken: string | null;
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
    umami: src && websiteId ? { src, websiteId } : null,
    cfBeaconToken: token(env['PUBLIC_CF_BEACON_TOKEN']),
  };
}

export const analytics: AnalyticsConfig = analyticsFrom(import.meta.env);
