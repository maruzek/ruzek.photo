import { z } from 'astro/zod';
import { ADDON_IDS, INQUIRY_TYPES } from '../../config/pricing';

// Zod probes `Function('')` to decide whether it may compile validators; the CSP forbids eval, so in the browser the
// probe only produced a securitypolicyviolation report. The interpreted validators are fast enough for one form.
z.config({ jitless: true });

/** Upper limit for every source value (referrer, landing path, UTM). */
export const SOURCE_MAX = 200;

/** "18:30": hours 00–23, minutes 00–59. */
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** "2027-03-14" that exists in the calendar (no 2027-02-31). */
const isRealDate = (v: string): boolean => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/**
 * One schema for the form (field by field on blur, whole on submit) and the endpoint.
 * Only what the form asks for, the inquiry source and the Turnstile token; nothing else is accepted
 * into the stored record (concept.md, kap. 11).
 */
export const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  // trim first: z.email() alone would reject the spaces a phone keyboard adds after the address
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z.string().trim().max(40).optional(),
  service: z.enum(INQUIRY_TYPES),
  hours: z.number().int().min(1).max(12).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isRealDate)
    .optional(),
  timeFrom: time.optional(),
  timeTo: time.optional(),
  place: z.string().trim().max(200).optional(),
  guests: z.number().int().min(1).max(10000).optional(),
  addons: z.array(z.enum(ADDON_IDS)).max(ADDON_IDS.length),
  note: z.string().trim().max(4000).optional(),
  locale: z.enum(['cs', 'en']),
  source: z
    .object({
      referrer: z
        .url({ protocol: /^https?$/ })
        .max(SOURCE_MAX)
        .optional(),
      landingPath: z.string().startsWith('/').max(SOURCE_MAX).optional(),
      utmSource: z.string().max(SOURCE_MAX).optional(),
      utmMedium: z.string().max(SOURCE_MAX).optional(),
      utmCampaign: z.string().max(SOURCE_MAX).optional(),
    })
    .default({}),
  turnstileToken: z.string().min(1).max(2048),
  // generated once per inquiry in the browser and kept across retries: a resent request is not a new inquiry
  submissionId: z.uuid(),
  website: z.string().max(0).optional(), // honeypot: people never see it, bots fill it
});

export type InquiryInput = z.infer<typeof inquirySchema>;
export type InquiryField = keyof InquiryInput;
