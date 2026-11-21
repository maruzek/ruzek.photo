/**
 * Public facts about the site owner. Single source for the name, handle, cities and contacts.
 * `null` means "not known yet": the page renders a visible <Todo> instead of inventing content.
 * Task 7 completes the consumers (footer, JSON-LD); the shape is fixed by the plan.
 */
export const site = {
  name: 'Martin Růžek',
  handle: '@ruzek.jpg',
  instagram: 'https://www.instagram.com/ruzek.jpg/',
  cities: ['Praha', 'Karlovy Vary'],
  contact: { email: 'foto@martinruzek.cz', phone: null, whatsapp: null },
  legal: { ico: null, seat: null },
} as const satisfies {
  name: string;
  handle: string;
  instagram: string;
  cities: readonly string[];
  contact: { email: string; phone: string | null; whatsapp: string | null };
  legal: { ico: string | null; seat: string | null };
};
