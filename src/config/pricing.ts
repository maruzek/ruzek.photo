// The single source of truth for prices (concept.md, kap. 10). Every number comes from docs/brief.md.
// The service card, the add-ons, the estimate in the form, JSON-LD offers and the estimate stored
// with an inquiry all read this file. Prices are starting prices in whole CZK, without VAT
// (Martin is not a VAT payer). Dictionaries never contain prices: use `formatRange`.

export type Czk = number;
/** `from === to` is a fixed price. */
export interface Range {
  from: Czk;
  to: Czk;
}

export type ServiceId = 'event' | 'short' | 'match' | 'portrait';
export type AddonId = 'sameDay' | 'video';

// A package variant can be added here later without rewriting pages (concept.md, kap. 10).
export type ServicePricing =
  | { kind: 'hourly'; firstHour: Czk; nextHour: Range; minHours: 1; maxHours: number }
  | { kind: 'flat'; price: Range; unit: 'session' | 'match' };

export interface Service {
  id: ServiceId;
  pricing: ServicePricing;
  deliverables: {
    photos: Range;
    /** The photo count is per hour (events), not per session. */
    perHour?: true;
    /** Left out when brief.md does not state a delivery time. */
    turnaround?: { value: Range; unit: 'days' | 'hours' };
    /** Length of the shoot in minutes. */
    durationMin?: Range;
  };
}

export type Addon =
  | { id: 'sameDay'; kind: 'percent'; value: Range }
  | { id: 'video'; kind: 'fixed'; value: Range };

export const SERVICE_IDS = ['event', 'short', 'match', 'portrait'] as const satisfies readonly ServiceId[];
export const ADDON_IDS = ['sameDay', 'video'] as const satisfies readonly AddonId[];

export const services: readonly Service[] = [
  {
    id: 'event',
    pricing: { kind: 'hourly', firstHour: 1500, nextHour: { from: 1000, to: 1200 }, minHours: 1, maxHours: 12 },
    deliverables: { photos: { from: 30, to: 50 }, perHour: true, turnaround: { value: { from: 3, to: 5 }, unit: 'days' } },
  },
  {
    id: 'short',
    pricing: { kind: 'flat', price: { from: 1500, to: 1500 }, unit: 'session' },
    deliverables: { photos: { from: 15, to: 25 }, turnaround: { value: { from: 2, to: 3 }, unit: 'days' } },
  },
  {
    id: 'match',
    pricing: { kind: 'flat', price: { from: 1500, to: 2500 }, unit: 'match' },
    deliverables: { photos: { from: 30, to: 50 }, turnaround: { value: { from: 24, to: 24 }, unit: 'hours' } },
  },
  {
    id: 'portrait',
    pricing: { kind: 'flat', price: { from: 1500, to: 1500 }, unit: 'session' },
    deliverables: { photos: { from: 8, to: 10 }, durationMin: { from: 45, to: 60 } },
  },
];

/** The estimate applies percent add-ons first and fixed add-ons after (like the prototype). */
export const addons: readonly Addon[] = [
  { id: 'sameDay', kind: 'percent', value: { from: 20, to: 30 } },
  { id: 'video', kind: 'fixed', value: { from: 1000, to: 2000 } },
];

/** Information for texts. The calculator does not price travel or the deposit (v1). */
export const terms = {
  travel: { freeIn: 'Praha', perKm: { from: 5, to: 6 } },
  depositPercent: { from: 30, to: 50 },
  vatPayer: false,
} as const satisfies {
  travel: { freeIn: 'Praha'; perKm: Range };
  depositPercent: Range;
  vatPayer: false;
};
