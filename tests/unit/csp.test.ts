import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  analyticsFromHtml,
  applyCsp,
  buildCsp,
  inlineScriptHashes,
} from '../../scripts/csp-headers';

const sha = (s: string): string => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
const directive = (csp: string, name: string): string[] =>
  csp
    .split('; ')
    .find((d) => d.startsWith(`${name} `))
    ?.split(' ')
    .slice(1) ?? [];

describe('inlineScriptHashes', () => {
  it('hashes executed inline scripts only', () => {
    const html =
      '<script>a()</script><script type="module">b()</script><script src="/x.js"></script>' +
      '<script type="application/ld+json">{}</script><script type="application/json" id="c">{}</script>';
    expect(inlineScriptHashes(html)).toEqual([sha('a()'), sha('b()')].sort());
  });
});

describe('buildCsp', () => {
  it('without analytics allows only self, the hashes and Turnstile', () => {
    const csp = buildCsp({ scriptHashes: ["'sha256-x'"], analytics: null });
    expect(directive(csp, 'script-src')).toEqual([
      "'self'",
      "'sha256-x'",
      'https://challenges.cloudflare.com',
    ]);
    expect(directive(csp, 'frame-src')).toEqual(['https://challenges.cloudflare.com']);
    expect(directive(csp, 'connect-src')).toEqual(["'self'"]);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'");
  });
  it('adds the beacon and the Umami origin taken from its script URL', () => {
    const csp = buildCsp({
      scriptHashes: [],
      analytics: {
        umami: { src: 'https://stats.example.cz/u.js', websiteId: 'a' },
        cfBeaconToken: 't',
      },
    });
    expect(directive(csp, 'script-src')).toEqual(
      expect.arrayContaining(['https://static.cloudflareinsights.com', 'https://stats.example.cz']),
    );
    expect(directive(csp, 'connect-src')).toEqual([
      "'self'",
      'https://cloudflareinsights.com',
      'https://stats.example.cz',
    ]);
  });
  it('allows the Umami Cloud collection endpoint only for Umami Cloud', () => {
    const csp = buildCsp({
      scriptHashes: [],
      analytics: {
        umami: { src: 'https://cloud.umami.is/script.js', websiteId: 'a' },
        cfBeaconToken: null,
      },
    });
    expect(directive(csp, 'connect-src')).toEqual([
      "'self'",
      'https://cloud.umami.is',
      'https://api-gateway.umami.dev',
    ]);
    expect(directive(csp, 'script-src')).not.toContain('https://static.cloudflareinsights.com');
  });
});

describe('applyCsp', () => {
  it('fills the one placeholder line', () =>
    expect(
      applyCsp('# __CSP__ note\n/*\n  Content-Security-Policy: __CSP__\n', "default-src 'self'"),
    ).toBe("# __CSP__ note\n/*\n  Content-Security-Policy: default-src 'self'\n"));
  it('fails without the placeholder', () => expect(() => applyCsp('/*\n', 'x')).toThrow());
});

describe('analyticsFromHtml', () => {
  it('reads the page configuration', () => {
    const cfg = { umami: null, cfBeaconToken: 't' };
    expect(
      analyticsFromHtml(
        `<script type="application/json" id="analytics-config">${JSON.stringify(cfg)}</script>`,
      ),
    ).toEqual(cfg);
    expect(analyticsFromHtml('<p></p>')).toBeNull();
  });
});
