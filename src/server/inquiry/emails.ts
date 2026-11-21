import { addons as addonConfig, services } from '../../config/pricing';
import { site } from '../../config/site';
import { fill, t, type Locale } from '../../i18n';
import { formatRange } from '../../lib/pricing/format';
import type { InquiryRecord } from './types';

export interface MailText {
  subject: string;
  text: string;
}

/** Header values must stay on one line (no header injection through the name). */
const oneLine = (s: string): string => s.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200);

const DATE_FORMAT: Record<Locale, Intl.DateTimeFormat> = {
  cs: new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeZone: 'UTC' }),
  en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }),
};

/** "14. března 2027"; a date that does not exist (2027-02-31) is shown as entered. */
function formatDate(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? iso : DATE_FORMAT[locale].format(d);
}

const isHourly = (r: InquiryRecord): boolean =>
  services.find((s) => s.id === r.service)?.pricing.kind === 'hourly';

function addonList(r: InquiryRecord, locale: Locale): string | undefined {
  const labels = t(locale).services.addons;
  const picked = addonConfig.filter((a) => r.addons.includes(a.id)).map((a) => labels[a.id].label);
  return picked.length ? picked.join(', ') : undefined;
}

const lines = (rows: readonly (readonly [string, string | number | undefined | null])[], empty?: string): string[] =>
  rows.flatMap(([label, value]) =>
    value === undefined || value === null || value === '' ? (empty ? [`${label}: ${empty}`] : []) : [`${label}: ${value}`],
  );

/** The whole inquiry for Martin, always in Czech. Reply-To is the client. */
export function ownerEmail(r: InquiryRecord): MailText {
  const d = t('cs');
  const f = d.inquiry.form;
  const m = d.inquiry.mail.owner;
  const service = f.type.options[r.service];
  const source = [r.referrer, r.landingPath, r.utmSource, r.utmMedium, r.utmCampaign].filter(Boolean).join(' · ');

  const text = [
    m.intro,
    '',
    ...lines(
      [
        [f.name.label, r.name],
        [f.email.label, r.email],
        [d.inquiry.fields.phone.label, r.phone],
        [f.type.label, service],
        [f.hours.label, isHourly(r) ? r.hours : undefined],
        [f.date.label, r.date && formatDate(r.date, 'cs')],
        [d.inquiry.fields.timeFrom.label, r.timeFrom],
        [d.inquiry.fields.timeTo.label, r.timeTo],
        [f.place.label, r.place],
        [d.inquiry.fields.guests.label, r.guests],
        [d.inquiry.fields.addons.legend, addonList(r, 'cs')],
        [m.estimate, formatRange({ from: r.estimateFrom, to: r.estimateTo }, 'cs')],
      ],
      m.empty,
    ),
    '',
    `${f.note.label}:`,
    r.note ?? m.empty,
    '',
    ...lines([
      [m.source, source || m.empty],
      [m.locale, r.locale],
      [m.id, r.id],
    ]),
  ].join('\n');

  return {
    subject: oneLine(fill(m.subject, { service, name: r.name })),
    text,
  };
}

/**
 * Short confirmation for the client, in the language of the page. A fixed template: it never contains free
 * text from the form (name, place, note), so the form cannot be used to send spam (concept.md, kap. 11).
 */
export function clientConfirmation(r: InquiryRecord): MailText {
  const d = t(r.locale);
  const f = d.inquiry.form;
  const m = d.inquiry.mail.client;
  const text = [
    m.greeting,
    m.body,
    '',
    m.summary,
    ...lines([
      [f.type.label, f.type.options[r.service]],
      [f.hours.label, isHourly(r) ? r.hours : undefined],
      [f.date.label, r.date && formatDate(r.date, r.locale)],
      [d.inquiry.fields.addons.legend, addonList(r, r.locale)],
      [d.inquiry.mail.owner.estimate, formatRange({ from: r.estimateFrom, to: r.estimateTo }, r.locale)],
    ]),
    m.estimateNote,
    '',
    m.reply,
    m.notYou,
    '',
    site.name,
    d.hero.kicker.replace(/\u00A0/g, ' '),
  ].join('\n');
  return { subject: oneLine(m.subject), text };
}

/**
 * For Martin, before anonymization (risk R11): the inquiries that will lose their personal data within
 * `days` days, so he can mark the ones that became an order as `won`. Always in Czech.
 */
export function anonymizationPreview(rows: readonly InquiryRecord[], days: number): MailText {
  const d = t('cs');
  const m = d.inquiry.mail.preview;
  const list = rows.map((r) => {
    const created = DATE_FORMAT.cs.format(new Date(r.createdAt));
    return `- ${created} · ${d.inquiry.form.type.options[r.service]} · ${oneLine(r.name)} · ${r.id}`;
  });
  return { subject: oneLine(fill(m.subject, { days })), text: [fill(m.intro, { days }), '', ...list].join('\n') };
}
