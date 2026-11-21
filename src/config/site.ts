/** Production origin: astro.config.ts `site`, canonical URLs, sitemap and JSON-LD. */
export const SITE_URL = 'https://martinruzek.eu';

/** The shape of `site`, widened: `null` fields may hold a string once the fact is known. */
export interface SiteFacts {
  name: string;
  handle: string;
  instagram: string;
  profiles: { google: string | null; firmy: string | null };
  cities: readonly string[];
  contact: { email: string; phone: string | null; whatsapp: string | null };
  legal: { ico: string | null; seat: string | null };
}

/**
 * Public facts about the site owner. Single source for the name, handle, cities and contacts.
 * `null` means "not known yet": the page renders a visible <Todo> instead of inventing content.
 * Task 7 completes the consumers (footer, JSON-LD); the shape is fixed by the plan.
 */
export const site = {
  name: 'Martin Růžek',
  handle: '@ruzek.jpg',
  instagram: 'https://www.instagram.com/ruzek.jpg/',
  /** Business profiles for JSON-LD `sameAs` (concept.md, kap. 12); `null` until they exist. */
  profiles: { google: null, firmy: null },
  cities: ['Praha', 'Karlovy Vary'],
  contact: { email: 'foto@martinruzek.cz', phone: null, whatsapp: null },
  legal: { ico: null, seat: null },
} as const satisfies SiteFacts;
