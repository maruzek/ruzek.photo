import { describe, expect, it } from 'vitest';
import { buildJsonLd } from '@/lib/seo/jsonld';
import { services } from '@/config/pricing';
import { site } from '@/config/site';

type Node = Record<string, unknown>;
const byType = (nodes: object[], type: string): Node => {
  const n = (nodes as Node[]).find((x) => x['@type'] === type);
  if (!n) throw new Error(`no ${type}`);
  return n;
};
const offers = (locale: 'cs' | 'en'): Node[] => {
  const catalog = byType(buildJsonLd(locale), 'ProfessionalService')['hasOfferCatalog'] as Node;
  return catalog['itemListElement'] as Node[];
};

describe('buildJsonLd', () => {
  it('has a Person and a ProfessionalService', () => {
    const nodes = buildJsonLd('cs');
    expect(byType(nodes, 'Person')['name']).toBe(site.name);
    expect(byType(nodes, 'ProfessionalService')['name']).toBe(site.name);
  });

  for (const locale of ['cs', 'en'] as const) {
    it(`one offer per service with the lowest price in CZK (${locale})`, () => {
      const list = offers(locale);
      expect(list).toHaveLength(services.length);
      for (const s of services) {
        const matching = list.filter((o) => o['sku'] === s.id);
        expect(matching).toHaveLength(1);
        const spec = matching[0]?.['priceSpecification'] as Node;
        expect(spec['priceCurrency']).toBe('CZK');
        expect(spec['minPrice']).toBe(
          s.pricing.kind === 'hourly' ? s.pricing.firstHour : s.pricing.price.from,
        );
      }
    });
  }

  it('event and match start at 1 500 CZK', () => {
    const min = (id: string): unknown =>
      (offers('cs').find((o) => o['sku'] === id)?.['priceSpecification'] as Node)['minPrice'];
    expect(min('event')).toBe(1500);
    expect(min('match')).toBe(1500);
  });

  it('leaves out the address while the seat is unknown', () => {
    expect(site.legal.seat).toBeNull();
    expect(byType(buildJsonLd('cs'), 'ProfessionalService')).not.toHaveProperty('address');
    const known = buildJsonLd('cs', { ...site, legal: { ico: null, seat: 'Praha' } });
    expect(byType(known, 'ProfessionalService')['address']).toBe('Praha');
  });

  it('sameAs has Instagram and no null', () => {
    for (const type of ['Person', 'ProfessionalService']) {
      const sameAs = byType(buildJsonLd('cs'), type)['sameAs'] as unknown[];
      expect(sameAs).toContain(site.instagram);
      expect(sameAs).not.toContain(null);
    }
  });

  it('invents nothing: no ratings, reviews, opening hours or phone while unknown', () => {
    const json = JSON.stringify(buildJsonLd('cs'));
    for (const key of ['aggregateRating', 'review', 'openingHours', 'telephone', 'geo'])
      expect(json).not.toContain(key);
  });
});
