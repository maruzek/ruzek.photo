import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { isPortTaken } from '../../scripts/port';
import { stubListener } from '../../scripts/lhci-stub';

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});
const listen = (server: Server, host = '127.0.0.1'): Promise<number> =>
  new Promise((done) => {
    servers.push(server);
    server.listen(0, host, () => done((server.address() as AddressInfo).port));
  });

describe('stub tracker endpoints (CORS)', () => {
  it('answers the preflight and sends the CORS headers on the collect POST and the script', async () => {
    const port = await listen(createServer(stubListener(() => 'stub();')));
    const url = `http://127.0.0.1:${port}/api/send`;

    const preflight = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:8787',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
    expect(preflight.headers.get('access-control-allow-methods')).toMatch(/POST/);
    expect(preflight.headers.get('access-control-allow-headers')).toMatch(/content-type/i);

    const post = await fetch(url, { method: 'POST', body: '{}' });
    expect(post.status).toBe(200);
    expect(post.headers.get('access-control-allow-origin')).toBe('*');

    const script = await fetch(`http://127.0.0.1:${port}/script.js`);
    expect(await script.text()).toBe('stub();');
    expect(script.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('isPortTaken', () => {
  it('is true for a port something listens on and false once it is closed', async () => {
    const server = createServer();
    const port = await listen(server);
    expect(await isPortTaken(port)).toBe(true);
    await new Promise((done) => server.close(done));
    expect(await isPortTaken(port)).toBe(false);
  });
});
