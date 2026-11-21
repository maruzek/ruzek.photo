import { describe, it, expect, vi } from 'vitest';
import { createMailer } from '@/server/inquiry/mailer';
import { verifyTurnstile } from '@/server/inquiry/turnstile';

const msg = {
  from: 'noreply@martinruzek.eu',
  to: 'jana@example.com',
  subject: 'S',
  text: 'T',
  replyTo: 'foto@martinruzek.cz',
};

describe('createMailer', () => {
  it('sends through Resend when the key is set', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    await createMailer({ RESEND_API_KEY: 'k' }, fetchImpl).send(msg);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer k');
    expect(JSON.parse(init.body as string)).toEqual({
      from: msg.from,
      to: [msg.to],
      subject: 'S',
      text: 'T',
      reply_to: msg.replyTo,
    });
  });
  it('throws when Resend refuses', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"to":"jana@example.com"}', { status: 422 }));
    await expect(createMailer({ RESEND_API_KEY: 'k' }, fetchImpl).send(msg)).rejects.toThrow(/422/);
  });
  it('console mailer only when asked for, and it logs no personal data', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    await createMailer({ MAILER: 'console' }).send(msg);
    expect(String(log.mock.calls[0])).not.toContain('jana');
    log.mockRestore();
  });
  it('an explicit MAILER=console wins over a Resend key (FM-10)', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    await createMailer({ MAILER: 'console', RESEND_API_KEY: 'k' }, fetchImpl).send(msg);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
  it('sends the idempotency key as a Resend header', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    await createMailer({ RESEND_API_KEY: 'k' }, fetchImpl).send({
      ...msg,
      idempotencyKey: 'id-1/owner',
    });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe('id-1/owner');
  });
  it('fails without a provider, so nothing is silently dropped', async () => {
    await expect(createMailer({}).send(msg)).rejects.toThrow(/not configured/);
  });
});

describe('verifyTurnstile', () => {
  it('posts secret, token and IP and reads success', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ success: true }));
    expect(await verifyTurnstile('s', 't', '203.0.113.7', fetchImpl)).toBe(true);
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect([body.get('secret'), body.get('response'), body.get('remoteip')]).toEqual(['s', 't', '203.0.113.7']);
  });
  it('fails on success false, a network error or a missing secret', async () => {
    expect(await verifyTurnstile('s', 't', null, async () => Response.json({ success: false }))).toBe(false);
    expect(
      await verifyTurnstile('s', 't', null, async () => {
        throw new Error('down');
      }),
    ).toBe(false);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await verifyTurnstile('', 't', null, async () => Response.json({ success: true }))).toBe(false);
    err.mockRestore();
  });
});
