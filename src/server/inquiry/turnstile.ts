const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Server-side Turnstile check. Any network or parsing problem counts as a failed check. */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
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
    const data = (await res.json()) as { success?: unknown };
    return data.success === true;
  } catch {
    return false;
  }
}
