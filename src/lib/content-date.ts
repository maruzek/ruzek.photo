import { z } from 'astro/zod';

/**
 * A date in front matter: a `Date` (unquoted YAML date) or a non-empty date string.
 * `z.coerce.date()` alone turns `null`, `""` and `0` into 1970-01-01, so empty values are rejected first.
 * An unparsable string still fails in the coercion (Invalid Date).
 */
export const contentDate = z.union([z.date(), z.string().trim().min(1)]).pipe(z.coerce.date());
