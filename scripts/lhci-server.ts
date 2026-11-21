import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ANALYTICS_TEST_ENV } from '../tests/e2e/analytics-env';
import { BEACON_STUB, UMAMI_STUB } from '../tests/e2e/analytics-stubs';

// The server `pnpm lhci` measures (lighthouserc.json: startServerCommand). It is the same setup as the e2e suite
// (playwright.config.ts): a fresh build, the local D1 migrated, wrangler dev serving dist/ the way Workers with
// static assets will. Measurement is switched ON in the build, but Umami and the Cloudflare beacon never reach the
// real services: Chrome maps their hosts to the local HTTPS stub below (lighthouserc.json: --host-resolver-rules,
// --ignore-certificate-errors), which serves the same stand-in scripts as the e2e tests.
// The stand-ins are far smaller than the real scripts (concept budget: a few kB), so the analytics bytes in the
// numbers are optimistic; the real scripts load after `load` and do not influence LCP or CLS.

/** Port of the stub; keep in sync with the host-resolver rules in lighthouserc.json. */
const STUB_PORT = 8443;
const PORT = Number(process.env['E2E_PORT'] ?? 8787);
// Cloudflare's public Turnstile TEST site key (always passes); never a real key
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

const run = (args: string[], env: NodeJS.ProcessEnv = process.env): void => {
  execFileSync('pnpm', args, { stdio: 'inherit', env });
};

run(['build'], {
  ...process.env,
  PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
  ...ANALYTICS_TEST_ENV,
});
run([
  'exec',
  'wrangler',
  'd1',
  'migrations',
  'apply',
  'ruzek-inquiries',
  '--local',
  '-c',
  'wrangler.jsonc',
]);

// throwaway self-signed certificate for the stub, only in a temp dir
const certDir = mkdtempSync(join(tmpdir(), 'lhci-stub-'));
execFileSync(
  'openssl',
  ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=stub.test'].concat([
    '-keyout',
    join(certDir, 'key.pem'),
    '-out',
    join(certDir, 'cert.pem'),
  ]),
  { stdio: 'ignore' },
);
const stub = createServer(
  { key: readFileSync(join(certDir, 'key.pem')), cert: readFileSync(join(certDir, 'cert.pem')) },
  (req, res) => {
    const host = req.headers.host?.split(':')[0] ?? '';
    const script =
      host === new URL(ANALYTICS_TEST_ENV.PUBLIC_UMAMI_SRC).hostname ? UMAMI_STUB : BEACON_STUB;
    if (req.method === 'POST') {
      req.resume();
      res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
    } else {
      res.writeHead(200, { 'content-type': 'text/javascript' }).end(script);
    }
  },
).listen(STUB_PORT, '127.0.0.1');

const wrangler = spawn(
  'pnpm',
  ['exec', 'wrangler', 'dev', '--port', String(PORT), '--env-file', 'tests/e2e/preview.env'].concat(
    ['--var', `ALLOWED_ORIGIN:http://localhost:${PORT}`],
  ),
  { stdio: 'inherit' },
);

function stop(code: number): never {
  wrangler.kill();
  stub.close();
  rmSync(certDir, { recursive: true, force: true });
  process.exit(code);
}
process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));
wrangler.on('exit', (code) => stop(code ?? 1));
