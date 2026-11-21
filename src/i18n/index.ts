import { cs, type Dictionary } from './cs';
import { en } from './en';

export type { Dictionary };
export type Locale = 'cs' | 'en';
export type RouteKey = 'home' | 'privacy' | 'caseStudy';

export const LOCALES: readonly Locale[] = ['cs', 'en'];

const dictionaries: Record<Locale, Dictionary> = { cs, en };

/** Path of each route per locale. Czech is the default locale, so it has no prefix (astro.config.ts). */
const routes: Record<RouteKey, Record<Locale, string>> = {
  home: { cs: '/', en: '/en/' },
  privacy: { cs: '/zasady-ochrany-osobnich-udaju/', en: '/en/privacy/' },
  // Index of the case-study section; detail pages are `${path}${slug}/`.
  caseStudy: { cs: '/pripadove-studie/', en: '/en/case-studies/' },
};

export function t(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function localePath(locale: Locale, route: RouteKey): string {
  return routes[route][locale];
}

export function alternates(route: RouteKey): { cs: string; en: string } {
  return { cs: routes[route].cs, en: routes[route].en };
}

/** Replaces `{name}` placeholders in a dictionary string. A missing value is a bug, so it throws. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Missing value for {${key}} in "${template}"`);
    return String(value);
  });
}
