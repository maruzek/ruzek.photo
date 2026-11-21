import type { InquiryInput } from '../../lib/inquiry/schema';

export type InquiryStatus = 'new' | 'won' | 'lost';

/** One row of `inquiries` (db/migrations/0001_inquiries.sql) in camelCase. */
export interface InquiryRecord extends Omit<InquiryInput, 'turnstileToken' | 'website' | 'source'> {
  id: string;
  createdAt: number;
  estimateFrom: number;
  estimateTo: number;
  noticeVersion: string;
  status: InquiryStatus;
  referrer: string | null;
  landingPath: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  notifiedAt: number | null;
  confirmedAt: number | null;
  /** Listed in a successfully sent anonymization preview at this time. */
  previewedAt: number | null;
  anonymizedAt: number | null;
}

export interface InquiryStore {
  /** false when a row with the same `submissionId` exists already (a repeated request): nothing is written. */
  insert(r: InquiryRecord): Promise<boolean>;
  markNotified(id: string, at: number): Promise<void>;
  markConfirmed(id: string, at: number): Promise<void>;
  /** Not anonymized, owner mail or confirmation not sent yet, created in [createdAfter, createdBefore). */
  listPendingMail(createdAfter: number, createdBefore: number, limit: number): Promise<InquiryRecord[]>;
  /** status != 'won', not anonymized, not yet in a sent preview, created before `createdBefore`. */
  listPreviewDue(createdBefore: number): Promise<InquiryRecord[]>;
  markPreviewed(ids: readonly string[], at: number): Promise<void>;
  /**
   * status != 'won', not anonymized, created before `ts` and listed in a preview sent no later than
   * `previewedBefore`. Returns the number of rows changed.
   */
  /** Anonymizes rows created before `ts` that a sent preview listed before `previewedBefore`, and every row created
   * before `hardBefore` even without a preview (the retention limit must hold when mail is broken). */
  anonymizeCreatedBefore(ts: number, at: number, previewedBefore: number, hardBefore: number): Promise<number>;
}

export interface MailMessage {
  /** Lets the provider drop a repeated send of the same mail (Resend `Idempotency-Key`). */
  idempotencyKey?: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface Mailer {
  send(m: MailMessage): Promise<void>;
}

export interface InquiryDeps {
  store: InquiryStore;
  mailer: Mailer;
  verifyTurnstile(token: string, ip: string | null): Promise<boolean>;
  /** true = allowed */
  rateLimit(key: string): Promise<boolean>;
  now(): number;
  newId(): string;
  waitUntil(p: Promise<unknown>): void;
  /** 'foto@martinruzek.cz' */
  ownerEmail: string;
  /** 'noreply@martinruzek.eu' */
  fromEmail: string;
  allowedOrigin: string;
}
