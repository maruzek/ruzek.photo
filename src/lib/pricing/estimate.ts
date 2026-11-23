import { addons, services, type AddonId, type InquiryType, type Range } from '../../config/pricing';

export interface EstimateInput {
  service: InquiryType;
  /** Only used by hourly services; clamped to the service's limits. Missing or NaN counts as one hour. */
  hours?: number;
  addons: readonly AddonId[];
}

/** Starting-price range for priced services, with percent add-ons applied before fixed add-ons. */
export function estimate({ service, hours, addons: picked }: EstimateInput): Range | null {
  if (service === 'other') return null;
  const s = services.find((x) => x.id === service);
  if (!s) throw new Error(`Unknown service ${service}`);

  let r: Range;
  if (s.pricing.kind === 'hourly') {
    const p = s.pricing;
    const wanted = hours !== undefined && Number.isFinite(hours) ? Math.trunc(hours) : 1;
    const h = Math.min(p.maxHours, Math.max(p.minHours, wanted));
    r = { from: p.firstHour + (h - 1) * p.nextHour.from, to: p.firstHour + (h - 1) * p.nextHour.to };
  } else {
    r = { ...s.pricing.price };
  }

  const set = new Set(picked); // duplicates count once
  for (const a of addons) {
    if (a.kind === 'percent' && set.has(a.id)) {
      r = {
        from: Math.round(r.from * (1 + a.value.from / 100)),
        to: Math.round(r.to * (1 + a.value.to / 100)),
      };
    }
  }
  for (const a of addons) {
    if (a.kind === 'fixed' && set.has(a.id)) {
      r = { from: r.from + a.value.from, to: r.to + a.value.to };
    }
  }
  return r;
}
