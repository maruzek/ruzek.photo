import { PRIVACY_NOTICE_VERSION } from '../../config/privacy';
import { inquirySchema, type InquiryField } from '../../lib/inquiry/schema';
import type { InquiryFormError, InquiryResponse } from '../../lib/inquiry/source';
import { estimate } from '../../lib/pricing/estimate';
import { confirmClient, notifyOwner } from './notify';
import type { InquiryDeps, InquiryRecord } from './types';

/** A real inquiry is a few kB; anything bigger is refused before parsing. */
export const MAX_BODY_BYTES = 32_768;

const reply = (status: number, body: InquiryResponse, headers: Record<string, string> = {}): Response =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

const formError = (status: number, code: InquiryFormError, headers?: Record<string, string>): Response =>
  reply(status, { ok: false, errors: { form: code } }, headers);

function omit<T extends object, K extends keyof T>(o: T, keys: readonly K[]): Omit<T, K> {
  const out = { ...o };
  for (const k of keys) delete out[k];
  return out;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Stored as `URL.href`, so anonymization can cut it to the origin at the first "/" after the host. */
function normalizeReferrer(ref: string | undefined): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).href;
  } catch {
    return null;
  }
}

/**
 * POST /api/inquiry (concept.md, kap. 11). Order: method → origin → rate limit → JSON → Turnstile →
 * honeypot → schema → server-side estimate → insert → mails in waitUntil. The IP is used for the rate
 * limit and siteverify only and is never stored.
 */
export async function handleInquiry(req: Request, deps: InquiryDeps): Promise<Response> {
  if (req.method !== 'POST') return formError(405, 'method', { allow: 'POST' });
  if (req.headers.get('origin') !== deps.allowedOrigin) return formError(403, 'origin');

  const ip = req.headers.get('cf-connecting-ip');
  if (!(await deps.rateLimit(ip ?? 'unknown'))) return formError(429, 'rateLimit');

  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json'))
    return formError(415, 'invalid');
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return formError(413, 'invalid');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return formError(400, 'invalid');
  }
  if (!isRecord(body)) return formError(400, 'invalid');

  const token = body['turnstileToken'];
  if (typeof token !== 'string' || token === '' || token.length > 2048 || !(await deps.verifyTurnstile(token, ip)))
    return formError(403, 'turnstile');

  // Honeypot: answer like a success so a bot learns nothing, store and send nothing
  if (typeof body['website'] === 'string' && body['website'] !== '') return reply(200, { ok: true });

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    const errors: Partial<Record<InquiryField | 'form', string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      const key = typeof field === 'string' && field in inquirySchema.shape ? (field as InquiryField) : 'form';
      errors[key] = 'invalid';
    }
    return reply(400, { ok: false, errors });
  }

  // the token and the honeypot are not stored; the source goes into its own columns
  const { source, ...rest } = parsed.data;
  const input = omit(rest, ['turnstileToken', 'website']);
  const range = estimate({ service: input.service, ...(input.hours ? { hours: input.hours } : {}), addons: input.addons });
  const record: InquiryRecord = {
    ...input,
    id: deps.newId(),
    createdAt: deps.now(),
    estimateFrom: range.from,
    estimateTo: range.to,
    noticeVersion: PRIVACY_NOTICE_VERSION,
    status: 'new',
    referrer: normalizeReferrer(source.referrer),
    landingPath: source.landingPath ?? null,
    utmSource: source.utmSource ?? null,
    utmMedium: source.utmMedium ?? null,
    utmCampaign: source.utmCampaign ?? null,
    notifiedAt: null,
    confirmedAt: null,
    anonymizedAt: null,
  };

  try {
    await deps.store.insert(record);
  } catch {
    console.error(`inquiry ${record.id}: insert failed`);
    return formError(500, 'server');
  }

  // A failed mail leaves notified_at / confirmed_at NULL; the maintenance worker sends it again
  deps.waitUntil(Promise.all([notifyOwner(record, deps), confirmClient(record, deps)]));
  return reply(200, { ok: true });
}
