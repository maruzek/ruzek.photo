import { PRIVACY_NOTICE_VERSION } from '../../config/privacy';
import { inquirySchema, type InquiryField } from '../../lib/inquiry/schema';
import type { InquiryFormError, InquiryResponse } from '../../lib/inquiry/source';
import { estimate } from '../../lib/pricing/estimate';
import { confirmClient, notifyOwner } from './notify';
import { sanitizeSource } from './source';
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

/**
 * Reads the body as UTF-8 and stops as soon as it is larger than `max` bytes (not UTF-16 units).
 * Returns null when it is too large.
 */
async function readLimited(req: Request, max: number): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/**
 * POST /api/inquiry (concept.md, kap. 11). Order: method → origin → rate limit → JSON → Turnstile →
 * honeypot → schema → server-side estimate → insert (once per submission id) → mails in waitUntil. The IP is used for the rate
 * limit and siteverify only and is never stored.
 */
export async function handleInquiry(req: Request, deps: InquiryDeps): Promise<Response> {
  if (req.method !== 'POST') return formError(405, 'method', { allow: 'POST' });
  if (req.headers.get('origin') !== deps.allowedOrigin) return formError(403, 'origin');

  const ip = req.headers.get('cf-connecting-ip');
  if (!(await deps.rateLimit(ip ?? 'unknown'))) return formError(429, 'rateLimit');

  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json'))
    return formError(415, 'invalid');
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return formError(413, 'invalid');
  const raw = await readLimited(req, MAX_BODY_BYTES);
  if (raw === null) return formError(413, 'invalid');
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
  const range = estimate({
    service: input.service,
    ...(input.hours ? { hours: input.hours } : {}),
    addons: input.addons,
  });
  const record: InquiryRecord = {
    ...input,
    id: deps.newId(),
    createdAt: deps.now(),
    estimateFrom: range.from,
    estimateTo: range.to,
    noticeVersion: PRIVACY_NOTICE_VERSION,
    status: 'new',
    ...sanitizeSource(source),
    notifiedAt: null,
    confirmedAt: null,
    previewedAt: null,
    anonymizedAt: null,
  };

  let inserted: boolean;
  try {
    inserted = await deps.store.insert(record);
  } catch {
    console.error(`inquiry ${record.id}: insert failed`);
    return formError(500, 'server');
  }

  // The same submission again (the first response got lost): it is stored already, so no new row and no mail
  if (!inserted) return reply(200, { ok: true });

  // A failed mail leaves notified_at / confirmed_at NULL; the maintenance worker sends it again
  deps.waitUntil(Promise.all([notifyOwner(record, deps), confirmClient(record, deps)]));
  return reply(200, { ok: true });
}
