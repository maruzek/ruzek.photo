const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare's public test secrets (always pass / always fail / token already spent). Their Siteverify answer has
 * the hostname `example.com` and no real action, so `expected` is not checked with them (local runs and e2e).
 */
const TEST_SECRET = /^[123]x0{31}AA$/;

/**
 * Server-side Turnstile check. Any network or parsing problem counts as a failed check. With `expected`, the token
 * must also have been issued for this action on this hostname (FM-11), so a token solved on another site using the
 * same site key, or for another widget, is refused.
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
  expected?: { action: string; hostname: string },
): Promise<boolean> {
  if (!secret) {
    console.error('turnstile: TURNSTILE_SECRET is not set');
    return false;
  }
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetchImpl(SITEVERIFY, { method: 'POST', body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown; action?: unknown; hostname?: unknown };
    if (data.success !== true) return false;
    if (!expected || TEST_SECRET.test(secret)) return true;
    return data.action === expected.action && data.hostname === expected.hostname;
  } catch {
    return false;
  }
}
