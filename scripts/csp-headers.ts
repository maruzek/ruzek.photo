import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import type { AnalyticsConfig } from '../src/config/analytics';

// The Content-Security-Policy is the only one the site sends (lead note M: one CSP source). It lives in
// public/_headers as the placeholder `__CSP__`, and this integration fills it in after the build, because two parts
// are only known then: the hashes of the inline scripts Astro writes into the HTML (the reduced-motion boot in
// Base.astro, the island loader), and the Umami origin, which comes from PUBLIC_UMAMI_SRC. The origin is read from
// the analytics JSON the pages carry, so the policy always allows exactly what the built pages load.

export const CSP_PLACEHOLDER = '__CSP__';
export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
/** Cloudflare Web Analytics: the beacon script and the endpoint it reports to. */
export const CF_BEACON_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
export const CF_BEACON_CONNECT_ORIGIN = 'https://cloudflareinsights.com';
/**
 * Umami Cloud serves its tracker from cloud.umami.is; the plan lists api-gateway.umami.dev as its collection
 * endpoint as well. Allowed only while the script comes from Umami Cloud; a self-hosted Umami reports to its own
 * origin (the tracker sends to the script's host by default). Verify against the real requests at launch.
 */
export const UMAMI_CLOUD = {
  script: 'https://cloud.umami.is',
  connect: ['https://api-gateway.umami.dev'],
} as const;

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
/** Data blocks are never executed, so script-src does not apply to them. */
const DATA_TYPE = /\btype\s*=\s*["']?application\/(?:ld\+)?json/i;

/** `'sha256-…'` of every inline script that the browser executes. */
export function inlineScriptHashes(html: string): string[] {
  const out = new Set<string>();
  for (const [, attrs = '', body = ''] of html.matchAll(SCRIPT)) {
    if (/\bsrc\s*=/i.test(attrs) || DATA_TYPE.test(attrs)) continue;
    out.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return [...out].sort();
}

/** The analytics configuration a built page carries (Base.astro), or `null` when measurement is off. */
export function analyticsFromHtml(html: string): AnalyticsConfig | null {
  const m = /<script type="application\/json" id="analytics-config">([\s\S]*?)<\/script>/.exec(
    html,
  );
  return m?.[1] ? (JSON.parse(m[1]) as AnalyticsConfig) : null;
}

export function buildCsp(opts: {
  scriptHashes: readonly string[];
  analytics: AnalyticsConfig | null;
}): string {
  const umami = opts.analytics?.umami ? new URL(opts.analytics.umami.src).origin : null;
  const beacon = Boolean(opts.analytics?.cfBeaconToken);
  const script = ["'self'", ...opts.scriptHashes, TURNSTILE_ORIGIN];
  const connect = ["'self'"];
  if (beacon) {
    script.push(CF_BEACON_SCRIPT_ORIGIN);
    connect.push(CF_BEACON_CONNECT_ORIGIN);
  }
  if (umami) {
    script.push(umami);
    connect.push(umami, ...(umami === UMAMI_CLOUD.script ? UMAMI_CLOUD.connect : []));
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    `connect-src ${connect.join(' ')}`,
    "img-src 'self' data:",
    // The Fonts API and `inlineStylesheets: 'auto'` write <style> blocks into every page, so inline styles stay
    // allowed. (GSAP sets styles through the CSSOM, which CSP does not restrict.)
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** Replaces the placeholder in `_headers`; a missing placeholder is a build error, never a site without a policy. */
export function applyCsp(headers: string, csp: string): string {
  const line = `Content-Security-Policy: ${CSP_PLACEHOLDER}`;
  if (headers.split('\n').filter((l) => l.trim() === line).length !== 1)
    throw new Error(`csp-headers: _headers needs exactly one "${line}" line`);
  return headers.replace(line, `Content-Security-Policy: ${csp}`);
}

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => join(e.parentPath, e.name));
}

export function cspHeaders(): AstroIntegration {
  let clientDir: URL | undefined;
  return {
    name: 'csp-headers',
    hooks: {
      'astro:config:done': ({ config }) => {
        clientDir = config.build.client;
      },
      'astro:build:done': async ({ logger }) => {
        if (!clientDir) throw new Error('csp-headers: build.client unknown');
        const dir = fileURLToPath(clientDir);
        const hashes = new Set<string>();
        const configs = new Set<string>();
        for (const file of await htmlFiles(dir)) {
          const html = await readFile(file, 'utf8');
          for (const h of inlineScriptHashes(html)) hashes.add(h);
          configs.add(JSON.stringify(analyticsFromHtml(html)));
        }
        // every page renders the same Base, so they all carry the same configuration
        if (configs.size > 1)
          throw new Error('csp-headers: pages disagree on the analytics configuration');
        const [config = 'null'] = configs;
        const csp = buildCsp({
          scriptHashes: [...hashes].sort(),
          analytics: JSON.parse(config) as AnalyticsConfig | null,
        });
        const path = join(dir, '_headers');
        await writeFile(path, applyCsp(await readFile(path, 'utf8'), csp));
        logger.info(
          `Content-Security-Policy with ${hashes.size} inline script hashes written to _headers`,
        );
      },
    },
  };
}
