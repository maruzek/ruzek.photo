import { connect } from 'node:net';

/** True when something already accepts connections on `port` (IPv4 or IPv6 loopback). */
export async function isPortTaken(port: number): Promise<boolean> {
  const attempt = (host: string): Promise<boolean> =>
    new Promise((done) => {
      const socket = connect({ port, host });
      socket.once('connect', () => {
        socket.destroy();
        done(true);
      });
      socket.once('error', () => done(false));
    });
  return (await Promise.all(['127.0.0.1', '::1'].map(attempt))).some(Boolean);
}
