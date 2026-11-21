import { z } from 'astro/zod';

/**
 * `consentRef` is only a sequential ID of the consent record, assigned by hand in `private/`
 * (`C-<year>-<running number>`). Nothing else belongs in it: no name, e-mail, phone number or date of birth
 * (concept.md, kap. 9).
 */
export const CONSENT_REF = /^C-\d{4}-\d{3,}$/;

export const PHOTO_CATEGORIES = ['event', 'sport', 'portrait'] as const;
export const PHOTO_SHADES = ['normal', 'strong'] as const;

export interface Photo<I> {
  image: I;
  alt: { cs: string; en: string };
  caption?: { cs: string; en: string } | undefined;
  category: (typeof PHOTO_CATEGORIES)[number];
  published: boolean;
  placeholder: boolean;
  credit?: string | undefined;
  consentRef?: string | undefined;
  minors: boolean;
  parentalConsent: boolean;
  shade: (typeof PHOTO_SHADES)[number];
}

const text = z.string().trim().min(1);
const bilingual = z.object({ cs: text, en: text });

/**
 * Metadata of one photo (`src/content/photos/*.yaml`). The rules that keep the public site legal:
 * - a placeholder needs a `credit`;
 * - a published real photo needs a `consentRef`;
 * - a published real photo must say `minors: true` or `minors: false` (there is no default, so a tournament of
 *   children cannot slip through with only the organiser's consent);
 * - a published photo of minors also needs `parentalConsent`;
 * - a published photo needs a real alt text (the import skeleton starts with TODO).
 * Un-publishing (`published: false`) never fails the build, so a photo can always be withdrawn quickly.
 * `published` defaults to false: nothing goes live by omission.
 *
 * @param image the Astro `image()` helper (or `z.string()` in unit tests)
 */
export function photoSchema<I extends z.ZodType>(image: I): z.ZodType<Photo<z.infer<I>>> {
  return (
    z
      .object({
        image,
        alt: bilingual,
        caption: bilingual.optional(),
        category: z.enum(PHOTO_CATEGORIES),
        published: z.boolean().default(false),
        placeholder: z.boolean().default(false),
        credit: text.optional(),
        consentRef: z
          .string()
          .regex(CONSENT_REF, 'consentRef must look like C-2026-014')
          .optional(),
        minors: z.boolean().optional(),
        parentalConsent: z.boolean().default(false),
        shade: z.enum(PHOTO_SHADES).default('normal'),
      })
      .superRefine((photo, ctx) => {
        if (photo.placeholder && !photo.credit) {
          ctx.addIssue({
            code: 'custom',
            path: ['credit'],
            message: 'A placeholder photo needs a credit',
          });
        }
        if (!photo.published) return;
        if (!photo.placeholder && !photo.consentRef) {
          ctx.addIssue({
            code: 'custom',
            path: ['consentRef'],
            message: 'A published photo needs a consentRef (or set published: false)',
          });
        }
        if (!photo.placeholder && photo.minors === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['minors'],
            message:
              'A published photo must state minors: true or minors: false (or set published: false)',
          });
        }
        if (photo.minors && !photo.parentalConsent) {
          ctx.addIssue({
            code: 'custom',
            path: ['parentalConsent'],
            message:
              'A published photo of minors needs parentalConsent: true (or set published: false)',
          });
        }
        for (const lang of ['cs', 'en'] as const) {
          if (/^TODO\b/i.test(photo.alt[lang])) {
            ctx.addIssue({
              code: 'custom',
              path: ['alt', lang],
              message: 'A published photo needs a real alt text (or set published: false)',
            });
          }
        }
      })
      // an unpublished or placeholder photo that leaves `minors` out counts as `false`
      .transform((photo) => ({ ...photo, minors: photo.minors ?? false })) as unknown as z.ZodType<
      Photo<z.infer<I>>
    >
  );
}
