import type { Locale } from '../../i18n';

/** og:locale per language. `en_US` matches the US spelling of en.ts (anonymize). */
export const OG_LOCALE: Record<Locale, string> = { cs: 'cs_CZ', en: 'en_US' };

/** Share image size for Open Graph. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The largest OG_SIZE-ratio crop a source photo allows, at most OG_SIZE (Astro never upscales). */
export function ogSize(source: { width: number; height: number }): {
  width: number;
  height: number;
} {
  const width = Math.min(
    OG_SIZE.width,
    source.width,
    Math.floor((source.height * OG_SIZE.width) / OG_SIZE.height),
  );
  return { width, height: Math.round((width * OG_SIZE.height) / OG_SIZE.width) };
}
