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
  // Only detail pages exist (concept.md, kap. 3): the path is `${prefix}${slug}/` and needs a slug.
  caseStudy: { cs: '/pripadove-studie/', en: '/en/case-studies/' },
};

export function t(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Routes with one fixed path per locale. `caseStudy` has no index page, so it always needs a slug. */
export type StaticRoute = Exclude<RouteKey, 'caseStudy'>;

function pathFor(locale: Locale, route: RouteKey, slug?: string): string {
  const base = routes[route][locale];
  if (route !== 'caseStudy') return base;
  if (!slug) throw new Error('Route caseStudy needs a slug');
  return `${base}${slug}/`;
}

export function localePath(locale: Locale, route: StaticRoute): string;
export function localePath(locale: Locale, route: 'caseStudy', slug: string): string;
export function localePath(locale: Locale, route: RouteKey, slug?: string): string {
  return pathFor(locale, route, slug);
}

export function alternates(route: StaticRoute): { cs: string; en: string };
export function alternates(route: 'caseStudy', slug: string): { cs: string; en: string };
export function alternates(route: RouteKey, slug?: string): { cs: string; en: string } {
  return { cs: pathFor('cs', route, slug), en: pathFor('en', route, slug) };
}

/** Replaces `{name}` placeholders in a dictionary string. A missing value is a bug, so it throws. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Missing value for {${key}} in "${template}"`);
    return String(value);
  });
}
