import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { addons as addonConfig, services, type AddonId, type ServiceId } from '../config/pricing';
import { site } from '../config/site';
import type { Dictionary, Locale } from '../i18n';
import { inquirySchema, type InquiryField } from '../lib/inquiry/schema';
import { readSource, type InquiryResponse } from '../lib/inquiry/source';
import { estimate } from '../lib/pricing/estimate';
import { formatPercentRange, formatRange } from '../lib/pricing/format';
import { track } from '../scripts/analytics';
import { readPrefill } from './prefill';
import { useTurnstile } from './useTurnstile';
// the react integration transforms everything under islands/, so the stylesheet lives in styles/
import '../styles/inquiry-form.css';

interface Props {
  locale: Locale;
  /** Public Turnstile site key (`PUBLIC_TURNSTILE_SITE_KEY`). Without it the form cannot be sent. */
  siteKey: string | undefined;
  /** `t(locale).inquiry`: passed in so the island does not bundle both dictionaries. */
  text: Dictionary['inquiry'];
  /** `t(locale).services.addons` */
  addonText: Dictionary['services']['addons'];
  /** `localePath(locale, 'privacy')` */
  privacyHref: string;
  /** Astro named slot: eyebrow, heading and lead of the section, rendered above the estimate. */
  intro?: ReactNode;
  /** Astro named slot: the direct contacts, rendered below the estimate. */
  direct?: ReactNode;
}

const ENDPOINT = '/api/inquiry';
/** How long a submit waits for Turnstile before it shows the verification error. */
const TURNSTILE_WAIT_MS = 10_000;

type Text = 'name' | 'email' | 'phone' | 'hours' | 'date' | 'timeFrom' | 'timeTo' | 'place' | 'guests' | 'note' | 'website';
type Values = Record<Text, string> & { service: ServiceId; addons: AddonId[] };
type Errors = Partial<Record<InquiryField | 'form', string>>;
type Status = 'idle' | 'sending' | 'sent' | 'error';

// Same defaults as the prototype: an event of 3 hours with the same-day selection.
const INITIAL: Values = {
  name: '',
  email: '',
  phone: '',
  service: 'event',
  hours: '3',
  date: '',
  timeFrom: '',
  timeTo: '',
  place: '',
  guests: '',
  addons: ['sameDay'],
  note: '',
  website: '',
};

/** Order of the fields in the form, used to focus the first error. */
const ORDER: readonly InquiryField[] = [
  'name',
  'email',
  'phone',
  'service',
  'hours',
  'date',
  'timeFrom',
  'timeTo',
  'place',
  'guests',
  'addons',
  'note',
];

const isHourly = (id: ServiceId): boolean => services.find((s) => s.id === id)?.pricing.kind === 'hourly';

const str = (v: string): string | undefined => (v.trim() === '' ? undefined : v);
const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));

/** The value of one field as the schema expects it (empty optional fields are left out). */
function fieldValue(v: Values, f: InquiryField): unknown {
  switch (f) {
    case 'hours':
      return isHourly(v.service) ? num(v.hours) : undefined;
    case 'guests':
      return num(v.guests);
    case 'service':
    case 'addons':
      return v[f];
    case 'name':
    case 'email':
      return v[f];
    case 'phone':
    case 'date':
    case 'timeFrom':
    case 'timeTo':
    case 'place':
    case 'note':
    case 'website':
      return str(v[f]);
    default:
      return undefined;
  }
}

function payload(v: Values, locale: Locale, turnstileToken: string): Record<string, unknown> {
  const out: Record<string, unknown> = {
    locale,
    turnstileToken,
    source: readSource(location, document.referrer, location.host),
  };
  for (const f of [...ORDER, 'website'] as const) {
    const x = fieldValue(v, f);
    if (x !== undefined) out[f] = x;
  }
  return out;
}

const DOM_ID: Partial<Record<InquiryField, string>> = {
  name: 'inq-name',
  email: 'inq-mail',
  phone: 'inq-phone',
  service: 'inq-type',
  hours: 'inq-hours',
  date: 'inq-date',
  timeFrom: 'inq-from',
  timeTo: 'inq-to',
  place: 'inq-place',
  guests: 'inq-guests',
  addons: 'inq-same',
  note: 'inq-note',
};

/** Allows a line break after the en dash, so the longest EN range fits at 360 px (lead note T4-02). */
function Range({ text }: { text: string }): ReactNode {
  const i = text.indexOf('–');
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i + 1)}
      <wbr />
      {text.slice(i + 1)}
    </>
  );
}

export default function InquiryForm({ locale, siteKey, text, addonText, privacyHref, intro, direct }: Props) {
  const f = text.form;
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [hydrated, setHydrated] = useState(false);
  const sending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const turnstile = useTurnstile(siteKey, locale, formRef, widgetRef);

  const message = (field: InquiryField): string => {
    const e = text.errors;
    switch (field) {
      case 'name':
        return f.name.error;
      case 'email':
        return f.email.error;
      case 'service':
        return e.service;
      case 'hours':
        return e.hours;
      case 'date':
        return e.date;
      case 'timeFrom':
      case 'timeTo':
        return e.time;
      case 'guests':
        return e.guests;
      default:
        return e.tooLong;
    }
  };

  const formMessage = (code: string | undefined): string => {
    switch (code) {
      case 'turnstile':
        return text.errors.turnstile;
      case 'rateLimit':
        return text.errors.rateLimit;
      case 'network':
        return text.errors.network;
      default:
        return text.errors.server;
    }
  };

  // Prefill from the "Spočítat cenu" links, on load and whenever the hash changes
  useEffect(() => {
    setHydrated(true);
    const apply = (): void => {
      const p = readPrefill(location.hash);
      if (!p.service && !p.hours && !p.addons) return;
      setValues((v) => ({
        ...v,
        ...(p.service ? { service: p.service } : {}),
        ...(p.hours ? { hours: String(p.hours) } : {}),
        ...(p.addons ? { addons: p.addons } : {}),
      }));
    };
    apply();
    addEventListener('hashchange', apply);
    return () => removeEventListener('hashchange', apply);
  }, []);

  const validate = (field: InquiryField, v: Values): boolean => {
    const ok = inquirySchema.shape[field].safeParse(fieldValue(v, field)).success;
    setErrors((e) => {
      const next = { ...e };
      if (ok) delete next[field];
      else next[field] = message(field);
      return next;
    });
    return ok;
  };

  const set = <K extends keyof Values>(key: K, value: Values[K]): void => {
    setValues((v) => ({ ...v, [key]: value }));
    // an error disappears as soon as the field is valid again
    if (key !== 'website' && errors[key as InquiryField]) validate(key as InquiryField, { ...values, [key]: value });
  };

  const toggleAddon = (id: AddonId, on: boolean): void => {
    set('addons', on ? [...new Set([...values.addons, id])] : values.addons.filter((a) => a !== id));
  };

  const focusField = (field: InquiryField): void => {
    const id = DOM_ID[field];
    if (id) document.getElementById(id)?.focus();
  };

  async function onSubmit(ev: SubmitEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    if (sending.current) return; // double click: the second submit is dropped before React re-renders
    sending.current = true;
    setStatus('sending');
    try {
      // Validate everything except the token, which comes last
      const check = inquirySchema.safeParse(payload(values, locale, 'pending'));
      if (!check.success) {
        const next: Errors = {};
        for (const issue of check.error.issues) {
          const field = issue.path[0] as InquiryField | undefined;
          if (field && field !== 'website' && !next[field]) next[field] = message(field);
        }
        setErrors(next);
        setStatus('idle');
        const first = ORDER.find((x) => next[x]);
        if (first) focusField(first);
        return;
      }

      const token = await turnstile.getToken(TURNSTILE_WAIT_MS);
      if (!token) {
        fail({ form: formMessage('turnstile') });
        return;
      }

      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload(values, locale, token)),
        });
      } catch {
        fail({ form: formMessage('network') });
        return;
      } finally {
        turnstile.reset(); // a token is valid for one request only
      }

      const body = (await res.json().catch(() => null)) as InquiryResponse | null;
      if (res.ok && body?.ok) {
        setErrors({});
        setStatus('sent');
        track('inquiry_sent', { service: values.service });
        requestAnimationFrame(() => doneRef.current?.focus());
        return;
      }

      const serverErrors = body && !body.ok ? body.errors : {};
      const next: Errors = {};
      for (const field of ORDER) if (serverErrors[field]) next[field] = message(field);
      next.form = formMessage(
        res.status === 429 ? 'rateLimit' : res.status === 403 ? (serverErrors.form ?? 'server') : serverErrors.form,
      );
      fail(next);
      const first = ORDER.find((x) => next[x]);
      if (first) focusField(first);
    } finally {
      sending.current = false;
    }
  }

  function fail(next: Errors): void {
    setErrors(next);
    setStatus('error');
    track('inquiry_error');
  }

  const reset = (): void => {
    setValues(INITIAL);
    setErrors({});
    setStatus('idle');
    focusField('name');
  };

  const range = estimate({
    service: values.service,
    ...(isHourly(values.service) ? { hours: Number(values.hours) } : {}),
    addons: values.addons,
  });

  const field = (
    name: InquiryField,
    label: string,
    input: (aria: { 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode,
    opts: { optional?: boolean; full?: boolean; hidden?: boolean } = {},
  ): ReactNode => {
    const id = DOM_ID[name] ?? name;
    const err = errors[name];
    return (
      <div className={['field', opts.full && 'full', err && 'bad'].filter(Boolean).join(' ')} hidden={opts.hidden}>
        <label htmlFor={id}>
          {label}
          {opts.optional && (
            <>
              {' '}
              <span className="opt">{f.optional}</span>
            </>
          )}
        </label>
        {input(err ? { 'aria-invalid': true, 'aria-describedby': `${id}-msg` } : {})}
        {err && (
          <span className="msg" id={`${id}-msg`}>
            {err}
          </span>
        )}
      </div>
    );
  };

  const blur = (name: InquiryField) => () => {
    if (status !== 'sending') validate(name, values);
  };
  const hourly = isHourly(values.service);

  return (
    <>
      <div className="inq-side">
        {intro}
        <div className="est" aria-live="polite">
          <span className="mono">{text.estimate.label}</span>
          <output htmlFor="inq-type inq-hours inq-same inq-video">
            <Range text={formatRange(range, locale)} />
          </output>
          <small>{text.estimate.note}</small>
        </div>
        {direct}
      </div>

      <form
        id="inq"
        className="inq-form"
        ref={formRef}
        method="post"
        noValidate
        onSubmit={(e) => void onSubmit(e)}
        aria-busy={status === 'sending'}
      >
        {field('name', f.name.label, (aria) => (
          <input
            id="inq-name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder={f.name.placeholder}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={blur('name')}
            {...aria}
          />
        ))}
        {field('email', f.email.label, (aria) => (
          <input
            id="inq-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder={f.email.placeholder}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={blur('email')}
            {...aria}
          />
        ))}
        {field(
          'phone',
          text.fields.phone.label,
          (aria) => (
            <input
              id="inq-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={blur('phone')}
              {...aria}
            />
          ),
          { optional: true },
        )}
        {field('service', f.type.label, (aria) => (
          <select
            id="inq-type"
            name="service"
            value={values.service}
            onChange={(e) => set('service', e.target.value as ServiceId)}
            onBlur={blur('service')}
            {...aria}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {f.type.options[s.id]}
              </option>
            ))}
          </select>
        ))}
        {field(
          'hours',
          f.hours.label,
          (aria) => (
            <input
              id="inq-hours"
              name="hours"
              type="number"
              min={1}
              max={12}
              step={1}
              inputMode="numeric"
              value={values.hours}
              onChange={(e) => set('hours', e.target.value)}
              onBlur={blur('hours')}
              {...aria}
            />
          ),
          { hidden: !hourly },
        )}
        {field(
          'date',
          f.date.label,
          (aria) => (
            <input
              id="inq-date"
              name="date"
              type="date"
              value={values.date}
              onChange={(e) => set('date', e.target.value)}
              onBlur={blur('date')}
              {...aria}
            />
          ),
          { optional: true },
        )}
        {field(
          'timeFrom',
          text.fields.timeFrom.label,
          (aria) => (
            <input
              id="inq-from"
              name="timeFrom"
              type="time"
              value={values.timeFrom}
              onChange={(e) => set('timeFrom', e.target.value)}
              onBlur={blur('timeFrom')}
              {...aria}
            />
          ),
          { optional: true },
        )}
        {field(
          'timeTo',
          text.fields.timeTo.label,
          (aria) => (
            <input
              id="inq-to"
              name="timeTo"
              type="time"
              value={values.timeTo}
              onChange={(e) => set('timeTo', e.target.value)}
              onBlur={blur('timeTo')}
              {...aria}
            />
          ),
          { optional: true },
        )}
        {field(
          'place',
          f.place.label,
          (aria) => (
            <input
              id="inq-place"
              name="place"
              maxLength={200}
              placeholder={f.place.placeholder}
              value={values.place}
              onChange={(e) => set('place', e.target.value)}
              onBlur={blur('place')}
              {...aria}
            />
          ),
          { optional: true },
        )}
        {field(
          'guests',
          text.fields.guests.label,
          (aria) => (
            <input
              id="inq-guests"
              name="guests"
              type="number"
              min={1}
              max={10000}
              step={1}
              inputMode="numeric"
              value={values.guests}
              onChange={(e) => set('guests', e.target.value)}
              onBlur={blur('guests')}
              {...aria}
            />
          ),
          { optional: true },
        )}

        <fieldset className="ticks">
          <legend className="vh">{text.fields.addons.legend}</legend>
          {addonConfig.map((a) => (
            <label className="tick" key={a.id}>
              <input
                type="checkbox"
                id={a.id === 'sameDay' ? 'inq-same' : 'inq-video'}
                name="addons"
                value={a.id}
                checked={values.addons.includes(a.id)}
                onChange={(e) => toggleAddon(a.id, e.target.checked)}
              />
              <span>
                {addonText[a.id].label}
                <small>
                  +{a.kind === 'percent' ? formatPercentRange(a.value, locale) : formatRange(a.value, locale)}
                </small>
              </span>
            </label>
          ))}
        </fieldset>

        {field(
          'note',
          f.note.label,
          (aria) => (
            <textarea
              id="inq-note"
              name="note"
              maxLength={4000}
              placeholder={f.note.placeholder}
              value={values.note}
              onChange={(e) => set('note', e.target.value)}
              onBlur={blur('note')}
              {...aria}
            />
          ),
          { optional: true, full: true },
        )}

        {/* Honeypot: hidden from people and assistive technology, bots fill it in */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="inq-website">{text.fields.honeypot.label}</label>
          <input
            id="inq-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>

        <p className="privacy">
          {text.privacy.acknowledge} <a href={privacyHref}>{text.privacy.link}</a>.
        </p>

        <div className="turnstile" ref={widgetRef} />

        <div className="actions">
          <button className="btn dark" type="submit" disabled={!hydrated || status === 'sending'} data-magnetic="">
            {status === 'sending' ? f.sending : f.send}
            <span className="tile" aria-hidden="true" />
          </button>
        </div>

        <p className="msg form-msg" role="alert">
          {errors.form}
        </p>

        {status === 'sent' && (
          <div className="done" role="status" tabIndex={-1} ref={doneRef}>
            <span>{f.done}</span>
            <button type="button" onClick={reset}>
              {f.reset}
            </button>
          </div>
        )}

        <noscript>
          <p className="noscript">
            {text.noscript} <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </p>
        </noscript>
      </form>
    </>
  );
}
