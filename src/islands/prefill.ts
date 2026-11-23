import { ADDON_IDS, INQUIRY_TYPES, type AddonId, type InquiryType } from '../config/pricing';

export interface Prefill {
  service?: InquiryType;
  hours?: number;
  addons?: AddonId[];
}

const isService = (v: string): v is InquiryType => (INQUIRY_TYPES as readonly string[]).includes(v);
const isAddon = (v: string): v is AddonId => (ADDON_IDS as readonly string[]).includes(v);

/**
 * Reads the "Spočítat cenu" link: `#poptavka?sluzba=sport&doplnky=video`
 * (English: `#inquiry?service=…&hours=…&addons=…`). Unknown values are ignored.
 */
export function readPrefill(hash: string): Prefill {
  const q = hash.indexOf('?');
  if (q < 0) return {};
  const params = new URLSearchParams(hash.slice(q + 1));
  const get = (cs: string, en: string): string | null => params.get(cs) ?? params.get(en);
  const out: Prefill = {};

  const service = get('sluzba', 'service');
  if (service && isService(service)) out.service = service;

  const hours = Number(get('hodiny', 'hours'));
  if (Number.isInteger(hours) && hours >= 1 && hours <= 12) out.hours = hours;

  const addons = [...new Set((get('doplnky', 'addons') ?? '').split(',').filter(isAddon))];
  if (addons.length) out.addons = addons;

  return out;
}
