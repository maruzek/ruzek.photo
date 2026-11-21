import { anonymizationPreview } from '../../../src/server/inquiry/emails';
import { confirmClient, notifyOwner } from '../../../src/server/inquiry/notify';
import type { InquiryStore, Mailer } from '../../../src/server/inquiry/types';

const DAY = 86_400_000;
/** A mail that has not gone out this long after creation is sent again. */
export const RESEND_AFTER_MS = 10 * 60_000;
/** Mails are retried for this many days after the inquiry, then given up (the row stays in D1). */
export const RETRY_WINDOW_DAYS = 7;
/** At most this many rows per run, so a provider outage cannot make one run endless. */
export const RESEND_BATCH = 50;
/**
 * The preview sent in a month lists everything anonymized before the 1st of that month + this many days, so the
 * next month's preview (which may need a few daily retries) is out before any of it is due (risk R11).
 */
export const PREVIEW_DAYS = 35;
/** A row is anonymized only once a preview listing it went out at least this many days ago. */
export const MIN_NOTICE_DAYS = 3;
/**
 * Hard limit: a row is anonymized this many days after the retention period even if no preview could be sent
 * (e.g. mail is misconfigured for weeks), so personal data never outlives the retention period without bound (FM-13).
 */
export const NOTICE_GRACE_DAYS = 30;
/** A retention period this short is a configuration error: refuse instead of anonymizing (almost) everything. */
export const MIN_ANONYMIZE_DAYS = 30;

export interface MaintenanceDeps {
  store: InquiryStore;
  mailer: Mailer;
  now(): number;
  anonymizeAfterDays: number;
  ownerEmail: string;
  fromEmail: string;
}

export interface MaintenanceResult {
  anonymized: number;
  /** mails sent again (owner mails and confirmations) */
  resent: number;
  previewed: number;
}

/** Daily run (cron): resend missing mails, the monthly preview, then anonymization (concept.md, kap. 11). */
export async function runMaintenance(d: MaintenanceDeps): Promise<MaintenanceResult> {
  if (!Number.isFinite(d.anonymizeAfterDays) || d.anonymizeAfterDays <= MIN_ANONYMIZE_DAYS)
    throw new Error(`anonymizeAfterDays must be a number above ${MIN_ANONYMIZE_DAYS}, got ${d.anonymizeAfterDays}`);
  const now = d.now();

  // 1. Mails that failed in the endpoint, the owner mail and the confirmation each on its own.
  //    One failure does not stop the others.
  let resent = 0;
  const pending = await d.store.listPendingMail(now - RETRY_WINDOW_DAYS * DAY, now - RESEND_AFTER_MS, RESEND_BATCH);
  for (const r of pending) {
    if (r.notifiedAt === null && (await notifyOwner(r, d))) resent++;
    if (r.confirmedAt === null && (await confirmClient(r, d))) resent++;
  }

  // 2. Preview: rows due before the 1st of this month + PREVIEW_DAYS that no sent preview has listed yet.
  //    Normally that is one mail on the 1st; a failed send is retried the next day.
  const day = new Date(now);
  const dueBy = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1) + PREVIEW_DAYS * DAY;
  let previewed = 0;
  const soon = await d.store.listPreviewDue(dueBy - d.anonymizeAfterDays * DAY);
  if (soon.length) {
    try {
      const days = Math.ceil((dueBy - now) / DAY);
      await d.mailer.send({
        from: d.fromEmail,
        to: d.ownerEmail,
        ...anonymizationPreview(soon, days),
      });
      await d.store.markPreviewed(
        soon.map((r) => r.id),
        now,
      );
      previewed = soon.length;
    } catch {
      console.error('maintenance: anonymization preview mail failed');
    }
  }

  // 3. Anonymize (never delete) inquiries without an order after the retention period, once previewed
  const anonymized = await d.store.anonymizeCreatedBefore(
    now - d.anonymizeAfterDays * DAY,
    now,
    now - MIN_NOTICE_DAYS * DAY,
    now - (d.anonymizeAfterDays + NOTICE_GRACE_DAYS) * DAY,
  );
  return { anonymized, resent, previewed };
}
