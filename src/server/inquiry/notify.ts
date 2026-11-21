import { clientConfirmation, ownerEmail } from './emails';
import type { InquiryRecord, InquiryStore, Mailer } from './types';

export interface NotifyDeps {
  store: InquiryStore;
  mailer: Mailer;
  now(): number;
  ownerEmail: string;
  fromEmail: string;
}

/** The whole inquiry to Martin, Reply-To the client. Marks the row; returns false when the mail failed. */
export async function notifyOwner(r: InquiryRecord, d: NotifyDeps): Promise<boolean> {
  try {
    const m = ownerEmail(r);
    await d.mailer.send({ from: d.fromEmail, to: d.ownerEmail, replyTo: r.email, ...m });
    await d.store.markNotified(r.id, d.now());
    return true;
  } catch {
    // only the id: no personal data in logs
    console.error(`inquiry ${r.id}: owner mail failed`);
    return false;
  }
}

/** The fixed confirmation to the client, Reply-To Martin. Marks the row; returns false when the mail failed. */
export async function confirmClient(r: InquiryRecord, d: NotifyDeps): Promise<boolean> {
  try {
    const m = clientConfirmation(r);
    await d.mailer.send({ from: d.fromEmail, to: r.email, replyTo: d.ownerEmail, ...m });
    await d.store.markConfirmed(r.id, d.now());
    return true;
  } catch {
    console.error(`inquiry ${r.id}: confirmation mail failed`);
    return false;
  }
}
