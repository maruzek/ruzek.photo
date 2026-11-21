// Privacy constants shared by the form, the inquiry endpoint and the maintenance worker (concept.md, kap. 11).

/** Stored with every inquiry. Bump whenever the text of the privacy page changes. */
export const PRIVACY_NOTICE_VERSION = '2026-11-21';

/** Inquiries without an order (`status` other than `won`) are anonymized this many days after creation. */
export const ANONYMIZE_AFTER_DAYS = 365;
