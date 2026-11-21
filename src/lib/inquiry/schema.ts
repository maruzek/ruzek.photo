import { z } from 'astro/zod';
import { ADDON_IDS, SERVICE_IDS } from '../../config/pricing';

/** Upper limit for every source value (referrer, landing path, UTM). */
export const SOURCE_MAX = 200;

const time = z.string().regex(/^\d{2}:\d{2}$/);

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
  service: z.enum(SERVICE_IDS),
  hours: z.number().int().min(1).max(12).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
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
      referrer: z.url({ protocol: /^https?$/ }).max(SOURCE_MAX).optional(),
      landingPath: z.string().startsWith('/').max(SOURCE_MAX).optional(),
      utmSource: z.string().max(SOURCE_MAX).optional(),
      utmMedium: z.string().max(SOURCE_MAX).optional(),
      utmCampaign: z.string().max(SOURCE_MAX).optional(),
    })
    .default({}),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(0).optional(), // honeypot: people never see it, bots fill it
});

export type InquiryInput = z.infer<typeof inquirySchema>;
export type InquiryField = keyof InquiryInput;
