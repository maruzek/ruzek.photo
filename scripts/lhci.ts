import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { budgetProblems, describeJs, pageJs } from './lhci-budgets';
import { isPortTaken } from './port';

// `pnpm lhci`: starts the preview (scripts/lhci-server.ts), runs Lighthouse CI with lighthouserc.json, then checks
// the JS budgets from the build output (scripts/lhci-budgets.ts). Lighthouse runs from a temp directory: on WSL, the old chrome-launcher that Lighthouse
// CI bundles creates a profile directory named like a Windows path (`C:\Users\…\lighthouse.XXXX`) in the working
// directory, and that must never land in the repository. Chrome is the one Playwright installed (`pnpm exec
// playwright install chromium`), unless CHROME_PATH says otherwise.

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env['E2E_PORT'] ?? 8787);
const READY_TIMEOUT_MS = 240_000;

async function waitForServer(server: ChildProcess): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('the preview server exited before it was ready');
    try {
      // `/en/` is also measured, so both must answer
      const [a, b] = await Promise.all([
        fetch(`http://localhost:${PORT}/`),
        fetch(`http://localhost:${PORT}/en/`),
      ]);
      if (a.ok && b.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('the preview server did not become ready in time');
}

function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((done) => {
    spawn(cmd, args, { cwd, env, stdio: 'inherit' }).on('exit', (code) => done(code ?? 1));
  });
}

// Another server on the port (a running `pnpm preview`, say) would be audited instead of the fresh build.
if (await isPortTaken(PORT)) {
  console.error(
    `Port ${PORT} is already in use, so Lighthouse could audit an old server. Stop it (for example \`pnpm preview\`) or set E2E_PORT to a free port.`,
  );
  process.exit(1);
}

const server = spawn('pnpm', ['exec', 'tsx', 'scripts/lhci-server.ts'], {
  cwd: root,
  stdio: 'inherit',
  // its own process group, so the whole tree (pnpm, tsx, wrangler, workerd) can be stopped together
  detached: true,
});
// Ctrl-C reaches only this process (the server has its own group), so pass it on
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    if (server.pid !== undefined) process.kill(-server.pid, 'SIGTERM');
    process.exit(130);
  });
const work = mkdtempSync(join(tmpdir(), 'lhci-'));
let code: number;
try {
  await waitForServer(server);
  const env = {
    ...process.env,
    CHROME_PATH: process.env['CHROME_PATH'] ?? chromium.executablePath(),
  };
  const lhci = join(root, 'node_modules/@lhci/cli/src/cli.js');
  const base = `http://localhost:${PORT}`;
  const lhciCode = await run(
    process.execPath,
    [
      lhci,
      'autorun',
      `--config=${join(root, 'lighthouserc.json')}`,
      `--collect.url=${base}/`,
      `--collect.url=${base}/en/`,
      `--upload.outputDir=${join(root, '.lighthouseci')}`,
    ],
    work,
    env,
  );
  // the page JS comes from the build output the server just made (dist/client), for the pages Lighthouse audited
  const problems: string[] = [];
  for (const [path, file] of [
    ['/', 'index.html'],
    ['/en/', 'en/index.html'],
  ] as const) {
    const js = await pageJs(join(root, 'dist/client'), file);
    console.log(`\n${describeJs(js, path)}`);
    problems.push(...budgetProblems(js, path));
  }
  if (problems.length > 0) {
    console.error('\nJS budget failed:');
    for (const p of problems) console.error(`  - ${p}`);
  } else {
    console.log('\nJS budgets: ok');
  }
  code = lhciCode !== 0 || problems.length > 0 ? 1 : 0;
} finally {
  // killing only the `pnpm` wrapper would leave wrangler and workerd running on the port
  if (server.pid !== undefined) process.kill(-server.pid, 'SIGTERM');
  rmSync(work, { recursive: true, force: true });
}
process.exit(code);
