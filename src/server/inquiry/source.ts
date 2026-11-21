import { alternates } from '../../i18n';
import type { InquiryInput } from '../../lib/inquiry/schema';

type InquirySource = InquiryInput['source'];

/** Only these can reach statistics; anything else (an e-mail in a UTM tag, a query string) is dropped. */
export interface StoredSource {
  referrer: string | null;
  landingPath: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

const KNOWN_PATHS = new Set([...Object.values(alternates('home')), ...Object.values(alternates('privacy'))]);
const CASE_STUDY_PREFIXES = Object.values(alternates('caseStudy', 'slug')).map((p) => p.slice(0, -'slug/'.length));
const SLUG = /^[a-z0-9-]{1,80}\/$/;
const HOST = /^[a-z0-9.-]{1,253}$/;
/** UTM tags as campaigns use them: lowercase letters, digits, ".", "_" and "-", at most 64 characters. */
const UTM = /^[a-z0-9._-]{1,64}$/;
/** Seven or more digits in a row (separators ignored) look like a phone number. */
const looksLikePhone = (v: string): boolean => /\d{7,}/.test(v.replace(/[._-]/g, ''));

/** The referrer's host only: no scheme, user info, path or query. */
function host(ref: string | undefined): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.toLowerCase();
    return HOST.test(h) ? h : null;
  } catch {
    return null;
  }
}

function landing(path: string | undefined): string | null {
  if (!path) return null;
  if (KNOWN_PATHS.has(path)) return path;
  const prefix = CASE_STUDY_PREFIXES.find((p) => path.startsWith(p));
  return prefix && SLUG.test(path.slice(prefix.length)) ? path : null;
}

function utm(v: string | undefined): string | null {
  const x = v?.trim().toLowerCase();
  return x && UTM.test(x) && !looksLikePhone(x) ? x : null;
}

export function sanitizeSource(s: InquirySource): StoredSource {
  return {
    referrer: host(s.referrer),
    landingPath: landing(s.landingPath),
    utmSource: utm(s.utmSource),
    utmMedium: utm(s.utmMedium),
    utmCampaign: utm(s.utmCampaign),
  };
}
