import type { InquiryRecord, InquiryStatus, InquiryStore } from './types';

interface Row {
  id: string;
  submission_id: string | null;
  created_at: number;
  locale: 'cs' | 'en';
  status: InquiryStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  place: string | null;
  note: string | null;
  time_from: string | null;
  time_to: string | null;
  service: InquiryRecord['service'];
  hours: number | null;
  event_date: string | null;
  guests: number | null;
  addons: string;
  estimate_from: number;
  estimate_to: number;
  referrer: string | null;
  landing_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  notice_version: string;
  notified_at: number | null;
  confirmed_at: number | null;
  previewed_at: number | null;
  anonymized_at: number | null;
}

/** Optional record fields are left out when the column is NULL (exactOptionalPropertyTypes). */
function opt<K extends string, V>(key: K, v: V | null): { [P in K]?: V } {
  return (v === null ? {} : { [key]: v }) as { [P in K]?: V };
}

function fromRow(r: Row): InquiryRecord {
  return {
    id: r.id,
    // anonymized rows have no submission id; the record type keeps it as a string, empty here
    submissionId: r.submission_id ?? '',
    createdAt: r.created_at,
    locale: r.locale,
    status: r.status,
    // anonymized rows have no name or e-mail; the record type keeps them as strings, empty here
    name: r.name ?? '',
    email: r.email ?? '',
    ...opt('phone', r.phone),
    ...opt('place', r.place),
    ...opt('note', r.note),
    ...opt('timeFrom', r.time_from),
    ...opt('timeTo', r.time_to),
    service: r.service,
    ...opt('hours', r.hours),
    ...opt('date', r.event_date),
    ...opt('guests', r.guests),
    addons: JSON.parse(r.addons) as InquiryRecord['addons'],
    estimateFrom: r.estimate_from,
    estimateTo: r.estimate_to,
    referrer: r.referrer,
    landingPath: r.landing_path,
    utmSource: r.utm_source,
    utmMedium: r.utm_medium,
    utmCampaign: r.utm_campaign,
    noticeVersion: r.notice_version,
    notifiedAt: r.notified_at,
    confirmedAt: r.confirmed_at,
    previewedAt: r.previewed_at,
    anonymizedAt: r.anonymized_at,
  };
}

const ANONYMIZABLE = `status != 'won' AND anonymized_at IS NULL AND created_at < ?1`;

/** Source values are sanitized on insert; anonymization drops anything that still does not fit (defence in depth). */
const keepUtm = (c: string): string => `CASE
    WHEN ${c} GLOB '*[^a-z0-9._-]*' OR length(${c}) > 64
      OR replace(replace(replace(${c}, '.', ''), '-', ''), '_', '') GLOB '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
    THEN NULL ELSE ${c} END`;

// Personal and free-text columns become NULL, event_date keeps the month. The id gets a new random value,
// so the row no longer matches the ID quoted in the owner's e-mail (which still holds the personal data).
const ANONYMIZE_SET = `
  id = lower(hex(randomblob(16))),
  submission_id = NULL,
  name = NULL, email = NULL, phone = NULL, place = NULL, note = NULL, time_from = NULL, time_to = NULL,
  event_date = substr(event_date, 1, 7),
  referrer = CASE WHEN referrer GLOB '*[^a-z0-9.-]*' OR length(referrer) > 253 THEN NULL ELSE referrer END,
  landing_path = CASE WHEN landing_path GLOB '*[^a-z0-9/-]*' OR length(landing_path) > 120 THEN NULL ELSE landing_path END,
  utm_source = ${keepUtm('utm_source')},
  utm_medium = ${keepUtm('utm_medium')},
  utm_campaign = ${keepUtm('utm_campaign')},
  anonymized_at = ?2`;

export function d1Store(db: D1Database): InquiryStore {
  return {
    async insert(r) {
      const res = await db
        .prepare(
          `INSERT INTO inquiries (id, submission_id, created_at, locale, status, name, email, phone, place, note, time_from, time_to,
            service, hours, event_date, guests, addons, estimate_from, estimate_to, referrer, landing_path,
            utm_source, utm_medium, utm_campaign, notice_version, notified_at, confirmed_at, previewed_at, anonymized_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22,
            ?23, ?24, ?25, ?26, ?27, ?28, ?29)
           ON CONFLICT (submission_id) DO NOTHING`,
        )
        .bind(
          r.id,
          r.submissionId,
          r.createdAt,
          r.locale,
          r.status,
          r.name,
          r.email,
          r.phone ?? null,
          r.place ?? null,
          r.note ?? null,
          r.timeFrom ?? null,
          r.timeTo ?? null,
          r.service,
          r.hours ?? null,
          r.date ?? null,
          r.guests ?? null,
          JSON.stringify(r.addons),
          r.estimateFrom,
          r.estimateTo,
          r.referrer,
          r.landingPath,
          r.utmSource,
          r.utmMedium,
          r.utmCampaign,
          r.noticeVersion,
          r.notifiedAt,
          r.confirmedAt,
          r.previewedAt,
          r.anonymizedAt,
        )
        .run();
      return res.meta.changes > 0;
    },
    async markNotified(id, at) {
      await db.prepare('UPDATE inquiries SET notified_at = ?2 WHERE id = ?1').bind(id, at).run();
    },
    async markConfirmed(id, at) {
      await db.prepare('UPDATE inquiries SET confirmed_at = ?2 WHERE id = ?1').bind(id, at).run();
    },
    async listPendingMail(createdAfter, createdBefore, limit) {
      const { results } = await db
        .prepare(
          `SELECT * FROM inquiries
           WHERE (notified_at IS NULL OR confirmed_at IS NULL) AND anonymized_at IS NULL
             AND created_at >= ?1 AND created_at < ?2
           ORDER BY created_at LIMIT ?3`,
        )
        .bind(createdAfter, createdBefore, limit)
        .all<Row>();
      return results.map(fromRow);
    },
    async listPreviewDue(createdBefore) {
      const { results } = await db
        .prepare(`SELECT * FROM inquiries WHERE ${ANONYMIZABLE} AND previewed_at IS NULL ORDER BY created_at`)
        .bind(createdBefore)
        .all<Row>();
      return results.map(fromRow);
    },
    async markPreviewed(ids, at) {
      if (!ids.length) return;
      await db.batch(ids.map((id) => db.prepare('UPDATE inquiries SET previewed_at = ?2 WHERE id = ?1').bind(id, at)));
    },
    async anonymizeCreatedBefore(ts, at, previewedBefore) {
      const res = await db
        .prepare(
          `UPDATE inquiries SET ${ANONYMIZE_SET}
           WHERE ${ANONYMIZABLE} AND previewed_at IS NOT NULL AND previewed_at <= ?3`,
        )
        .bind(ts, at, previewedBefore)
        .run();
      return res.meta.changes;
    },
  };
}
