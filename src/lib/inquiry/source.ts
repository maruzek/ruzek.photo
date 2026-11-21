import { SOURCE_MAX, type InquiryInput } from './schema';

/** Where the inquiry came from, for statistics. Read once on submit; nothing is stored in the browser. */
export interface InquirySource {
  referrer?: string;
  landingPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/** Server error codes for `form`; field errors carry the code `invalid`. */
export type InquiryFormError = 'origin' | 'method' | 'rateLimit' | 'turnstile' | 'invalid' | 'server';

export type InquiryResponse =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof InquiryInput | 'form', string>> };

const cut = (v: string): string => v.slice(0, SOURCE_MAX);

const UTM = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
] as const;

/** Own-host and non-http referrers are dropped, every value is cut to 200 characters. */
export function readSource(loc: { href: string }, referrer: string, ownHost: string): InquirySource {
  const url = new URL(loc.href);
  const out: InquirySource = { landingPath: cut(url.pathname) };

  if (referrer) {
    try {
      const ref = new URL(referrer);
      if ((ref.protocol === 'https:' || ref.protocol === 'http:') && ref.host !== ownHost) out.referrer = cut(ref.href);
    } catch {
      // not a URL: leave it out
    }
  }
  for (const [param, key] of UTM) {
    const v = url.searchParams.get(param)?.trim();
    if (v) out[key] = cut(v);
  }
  return out;
}
