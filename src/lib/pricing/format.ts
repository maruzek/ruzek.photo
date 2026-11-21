import type { Range } from '../../config/pricing';
import type { Locale } from '../../i18n';

const NBSP = '\u00A0';
const EN_DASH = '–';

const intl: Record<Locale, Intl.NumberFormat> = {
  cs: new Intl.NumberFormat('cs-CZ', { useGrouping: 'always' }),
  en: new Intl.NumberFormat('en-GB', { useGrouping: 'always' }),
};

// ICU may emit a normal, narrow or thin space; every one of them becomes a non-breaking space
// so a price never wraps in the middle (Review Focus 3: 360 px).
const nbsp = (text: string): string => text.replace(/[ \u202F\u2009]/g, NBSP);

const num = (n: number, locale: Locale): string => nbsp(intl[locale].format(n));

function span(from: number, to: number, locale: Locale): string {
  return from === to ? num(from, locale) : `${num(from, locale)}${EN_DASH}${num(to, locale)}`;
}

/** "1 500 Kč" | "3 500–3 900 Kč" (cs) and "CZK 1,500" | "CZK 1,500–2,500" (en), all spaces non-breaking. */
export function formatRange(r: Range, locale: Locale): string {
  const body = span(r.from, r.to, locale);
  return locale === 'cs' ? `${body}${NBSP}Kč` : `CZK${NBSP}${body}`;
}

/** "20–30 %" (cs) | "20–30%" (en), for percent add-ons. */
export function formatPercentRange(r: Range, locale: Locale): string {
  const body = span(r.from, r.to, locale);
  return locale === 'cs' ? `${body}${NBSP}%` : `${body}%`;
}
