import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleInquiry } from '../../server/inquiry/handler';
import { createMailer, FROM_EMAIL, type MailerEnv } from '../../server/inquiry/mailer';
import { d1Store } from '../../server/inquiry/store';
import { verifyTurnstile } from '../../server/inquiry/turnstile';

// The only server route of the site (concept.md, kap. 2). Bindings come from wrangler.jsonc; secrets
// (TURNSTILE_SECRET, RESEND_API_KEY) from `wrangler secret`, locally from .dev.vars or --var.
export const prerender = false;

// Secrets are not in wrangler.jsonc, so the generated Env type does not know them
type Secrets = MailerEnv & { TURNSTILE_SECRET?: string };

export const ALL: APIRoute = ({ request, locals }) => {
  const secrets = env as unknown as Secrets;
  return handleInquiry(request, {
    store: d1Store(env.DB),
    mailer: createMailer(secrets),
    verifyTurnstile: (token, ip) => verifyTurnstile(secrets.TURNSTILE_SECRET ?? '', token, ip),
    rateLimit: async (key) => (await env.INQUIRY_RL.limit({ key })).success,
    now: () => Date.now(),
    newId: () => crypto.randomUUID(),
    waitUntil: (p) => locals.cfContext.waitUntil(p),
    ownerEmail: env.OWNER_EMAIL,
    fromEmail: FROM_EMAIL,
    allowedOrigin: env.ALLOWED_ORIGIN,
  });
};
