import type { Mailer } from './types';

/** Sender of every form mail (concept.md, kap. 11). The domain needs SPF, DKIM and DMARC at Cloudflare. */
export const FROM_EMAIL = 'noreply@martinruzek.eu';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface MailerEnv {
  /** Resend API key (wrangler secret). */
  RESEND_API_KEY?: string;
  /** `console` for local runs and tests: nothing is sent. */
  MAILER?: string;
}

/** Local runs and tests: sends nothing and logs no address or content (no personal data in logs). */
export function consoleMailer(): Mailer {
  return {
    async send(m) {
      console.info(`[console mailer] not sent: from ${m.from}, ${m.text.length} characters`);
    },
  };
}

/** No provider configured: every send fails, so the rows keep notified_at NULL and are sent again later. */
export function unconfiguredMailer(): Mailer {
  return {
    async send() {
      throw new Error('mail provider is not configured');
    },
  };
}

/** Resend (https://resend.com/docs/api-reference/emails/send-email). */
export function resendMailer(apiKey: string, fetchImpl: typeof fetch = fetch): Mailer {
  return {
    async send(m) {
      const res = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          // a retry of the same mail (e.g. after markNotified failed) is dropped by Resend
          ...(m.idempotencyKey ? { 'idempotency-key': m.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: m.from,
          to: [m.to],
          subject: m.subject,
          text: m.text,
          ...(m.replyTo ? { reply_to: m.replyTo } : {}),
        }),
      });
      // the status only: the response body may echo the address
      if (!res.ok) throw new Error(`resend responded ${res.status}`);
    },
  };
}

/**
 * The provider is chosen in one place (docs/decisions.md): the console mailer when explicitly asked for,
 * otherwise Resend when its key is set, otherwise a mailer that fails, so nothing is silently dropped.
 */
export function createMailer(env: MailerEnv, fetchImpl: typeof fetch = fetch): Mailer {
  // an explicit MAILER=console wins over a key that happens to be present (e.g. in a developer's .dev.vars)
  if (env.MAILER === 'console') return consoleMailer();
  if (env.RESEND_API_KEY) return resendMailer(env.RESEND_API_KEY, fetchImpl);
  return unconfiguredMailer();
}
