// Privacy constants shared by the form, the inquiry endpoint and the maintenance worker (concept.md, kap. 11).

/** Stored with every inquiry. Bump whenever the text of the privacy page changes. */
export const PRIVACY_NOTICE_VERSION = '2026-11-21';

/** Inquiries without an order (`status` other than `won`) are anonymized this many days after creation. */
export const ANONYMIZE_AFTER_DAYS = 365;

/**
 * Hard limit: a row is anonymized this many days after the retention period even if no preview could be sent
 * (e.g. mail is misconfigured for weeks), so personal data never outlives the retention period without bound (FM-13).
 * The privacy page states it.
 */
export const NOTICE_GRACE_DAYS = 30;
