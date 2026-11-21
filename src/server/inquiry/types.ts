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
  anonymizedAt: number | null;
}

export interface InquiryStore {
  insert(r: InquiryRecord): Promise<void>;
  markNotified(id: string, at: number): Promise<void>;
  markConfirmed(id: string, at: number): Promise<void>;
  /** Not anonymized, owner mail not sent yet, created before `createdBefore`. */
  listUnnotified(createdBefore: number, limit: number): Promise<InquiryRecord[]>;
  /** status != 'won' AND anonymized_at IS NULL AND created before `createdBefore`. */
  listAnonymizable(createdBefore: number): Promise<InquiryRecord[]>;
  /** Same filter as `listAnonymizable`; returns the number of rows changed. */
  anonymizeCreatedBefore(ts: number, at: number): Promise<number>;
}

export interface MailMessage {
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
