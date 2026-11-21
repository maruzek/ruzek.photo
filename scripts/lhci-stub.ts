import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';

// The local stand-in for Umami and the Cloudflare beacon (scripts/lhci-server.ts). Besides the script it answers
// the collect requests the way the real services do: both trackers POST with `credentials: 'omit'` and, for
// `Content-Type: application/json`, the browser sends a CORS preflight first. Without these headers every report
// would carry a failed-request console error that has nothing to do with the site.

const CORS = {
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '600',
} as const;

function corsHeaders(req: IncomingMessage): Record<string, string> {
  const requested = req.headers['access-control-request-headers'];
  return {
    ...CORS,
    // credentials are omitted, so a wildcard is valid
    'access-control-allow-origin': '*',
    'access-control-allow-headers': typeof requested === 'string' ? requested : 'content-type',
  };
}

/** `scriptFor` picks the stand-in script by the Host header. */
export function stubListener(scriptFor: (host: string) => string): RequestListener {
  return (req: IncomingMessage, res: ServerResponse) => {
    const host = req.headers.host?.split(':')[0] ?? '';
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
    } else if (req.method === 'POST') {
      req.resume();
      res.writeHead(200, { ...cors, 'content-type': 'application/json' }).end('{}');
    } else {
      res.writeHead(200, { ...cors, 'content-type': 'text/javascript' }).end(scriptFor(host));
    }
  };
}
