import { anonymizationPreview } from '../../../src/server/inquiry/emails';
import { confirmClient, notifyOwner } from '../../../src/server/inquiry/notify';
import type { InquiryStore, Mailer } from '../../../src/server/inquiry/types';

const DAY = 86_400_000;
/** An inquiry whose owner mail has not gone out this long after creation is sent again. */
export const RESEND_AFTER_MS = 10 * 60_000;
/** At most this many retries per run, so a provider outage cannot make one run endless. */
export const RESEND_BATCH = 50;
/** The monthly preview lists inquiries that will be anonymized within this many days (risk R11). */
export const PREVIEW_DAYS = 31;
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
  resent: number;
  previewed: number;
}

/** Daily run (cron): resend missing mails, the monthly preview, then anonymization (concept.md, kap. 11). */
export async function runMaintenance(d: MaintenanceDeps): Promise<MaintenanceResult> {
  if (!Number.isFinite(d.anonymizeAfterDays) || d.anonymizeAfterDays <= MIN_ANONYMIZE_DAYS)
    throw new Error(`anonymizeAfterDays must be a number above ${MIN_ANONYMIZE_DAYS}, got ${d.anonymizeAfterDays}`);
  const now = d.now();

  // 1. Mails that failed in the endpoint. Each row on its own: one failure does not stop the others.
  let resent = 0;
  for (const r of await d.store.listUnnotified(now - RESEND_AFTER_MS, RESEND_BATCH)) {
    if (await notifyOwner(r, d)) resent++;
    if (r.confirmedAt === null) await confirmClient(r, d);
  }

  // 2. First day of the month: what will be anonymized within PREVIEW_DAYS. No list, no mail.
  let previewed = 0;
  if (new Date(now).getUTCDate() === 1) {
    const soon = await d.store.listAnonymizable(now - (d.anonymizeAfterDays - PREVIEW_DAYS) * DAY);
    if (soon.length) {
      try {
        await d.mailer.send({ from: d.fromEmail, to: d.ownerEmail, ...anonymizationPreview(soon, PREVIEW_DAYS) });
        previewed = soon.length;
      } catch {
        console.error('maintenance: anonymization preview mail failed');
      }
    }
  }

  // 3. Anonymize (never delete) inquiries without an order after the retention period
  const anonymized = await d.store.anonymizeCreatedBefore(now - d.anonymizeAfterDays * DAY, now);
  return { anonymized, resent, previewed };
}
