// Structured data for the home page (concept.md, kap. 12). Built only from src/config: prices from pricing.ts,
// facts from site.ts. Nothing is added that is not known: no address while the seat is unknown, no phone, no
// ratings, reviews or opening hours.
import { services, type Service } from '../../config/pricing';
import { SITE_URL, site, type SiteFacts } from '../../config/site';
import { localePath, t, type Locale } from '../../i18n';

const lowestPrice = (s: Service): number =>
  s.pricing.kind === 'hourly' ? s.pricing.firstHour : s.pricing.price.from;

/** Upper price only where pricing.ts gives one for the whole service (a flat range); hourly has no upper bound. */
const highestPrice = (s: Service): number | undefined =>
  s.pricing.kind === 'flat' && s.pricing.price.to > s.pricing.price.from
    ? s.pricing.price.to
    : undefined;

const present = (values: readonly (string | null)[]): string[] =>
  values.filter((v): v is string => typeof v === 'string' && v !== '');

export function buildJsonLd(locale: Locale, facts: SiteFacts = site): object[] {
  const d = t(locale);
  const url = new URL(localePath(locale, 'home'), SITE_URL).href;
  const personId = `${SITE_URL}/#person`;
  const sameAs = present([facts.instagram, facts.profiles.google, facts.profiles.firmy]);
  const contact = {
    email: facts.contact.email,
    ...(facts.contact.phone ? { telephone: facts.contact.phone } : {}),
  };

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId,
    name: facts.name,
    jobTitle: d.hero.kicker.replace(/\u00A0/g, ' '),
    url,
    sameAs,
    ...contact,
  };

  const business = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}/#business`,
    name: facts.name,
    url,
    inLanguage: locale,
    founder: { '@id': personId },
    areaServed: facts.cities.map((name) => ({ '@type': 'City', name })),
    sameAs,
    ...contact,
    ...(facts.legal.seat ? { address: facts.legal.seat } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: d.nav.services.replace(/\u00A0/g, ' '),
      itemListElement: services.map((s) => {
        const max = highestPrice(s);
        return {
          '@type': 'Offer',
          sku: s.id,
          itemOffered: { '@type': 'Service', name: d.inquiry.form.type.options[s.id] },
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'CZK',
            minPrice: lowestPrice(s),
            ...(max === undefined ? {} : { maxPrice: max }),
          },
        };
      }),
    },
  };

  return [person, business];
}
