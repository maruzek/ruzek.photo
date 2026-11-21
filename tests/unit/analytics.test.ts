import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsFrom, type AnalyticsConfig } from '@/config/analytics';
import {
  CF_BEACON_SRC,
  UMAMI_BEFORE_SEND,
  loadAnalytics,
  sanitizeReferrer,
  sanitizeUmamiPayload,
  sanitizeUrl,
  track,
} from '@/scripts/analytics';

// A minimal window: enough DOM for loadAnalytics, with `load` and the idle callback under the test's control.
function fakeWindow(readyState: DocumentReadyState = 'loading') {
  const scripts: { src: string; defer: boolean; attrs: Record<string, string> }[] = [];
  const listeners = new Map<string, () => void>();
  let idle: (() => void) | undefined;
  const doc = {
    readyState,
    querySelector: (sel: string) => scripts.find((s) => sel === `script[src="${s.src}"]`) ?? null,
    createElement: () => {
      const s = { src: '', defer: false, attrs: {} as Record<string, string> };
      return Object.assign(s, { setAttribute: (k: string, v: string) => (s.attrs[k] = v) });
    },
    head: { appendChild: (s: (typeof scripts)[number]) => scripts.push(s) },
  };
  const win = {
    document: doc,
    location: { origin: 'https://martinruzek.cz' },
    addEventListener: (type: string, fn: () => void) => listeners.set(type, fn),
    requestIdleCallback: (fn: () => void) => {
      idle = fn;
      return 1;
    },
    setTimeout: () => 0,
  };
  return {
    win: win as unknown as Window,
    scripts,
    fireLoad: () => listeners.get('load')?.(),
    fireIdle: () => idle?.(),
  };
}

const full: AnalyticsConfig = analyticsFrom({
  PUBLIC_UMAMI_SRC: 'https://cloud.umami.is/script.js',
  PUBLIC_UMAMI_WEBSITE_ID: 'abc-123',
  PUBLIC_CF_BEACON_TOKEN: 'tok123',
});

afterEach(() => vi.unstubAllGlobals());

describe('track', () => {
  it('does not throw without window.umami', () => {
    vi.stubGlobal('window', {});
    expect(() => track('contact_click', { type: 'email' })).not.toThrow();
  });
  it('passes the name and data to umami.track', () => {
    const spy = vi.fn();
    vi.stubGlobal('window', { umami: { track: spy } });
    track('inquiry_sent', { service: 'event' });
    expect(spy).toHaveBeenCalledWith('inquiry_sent', { service: 'event' });
  });
  it('swallows an error from umami', () => {
    vi.stubGlobal('window', {
      umami: {
        track: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(() => track('lightbox_open')).not.toThrow();
  });
});

describe('loadAnalytics', () => {
  it('injects nothing without a configuration', () => {
    const f = fakeWindow('complete');
    loadAnalytics({ umami: null, cfBeaconToken: null }, f.win);
    f.fireLoad();
    f.fireIdle();
    expect(f.scripts).toEqual([]);
  });

  it('injects two deferred scripts only after load and an idle callback', () => {
    const f = fakeWindow('loading');
    loadAnalytics(full, f.win);
    expect(f.scripts).toHaveLength(0);
    f.fireLoad();
    expect(f.scripts).toHaveLength(0);
    f.fireIdle();
    expect(f.scripts).toHaveLength(2);
    const [umami, cf] = f.scripts;
    expect(umami).toMatchObject({
      src: full.umami?.src,
      defer: true,
      attrs: {
        'data-website-id': 'abc-123',
        'data-host-url': 'https://gateway.umami.is',
        'data-before-send': UMAMI_BEFORE_SEND,
        'data-exclude-hash': 'true',
      },
    });
    // the hook the tracker calls is in place before the script runs
    const hook = (f.win as unknown as Record<string, (t: string, p: object) => object>)[
      UMAMI_BEFORE_SEND
    ];
    expect(
      hook?.('event', { url: 'https://martinruzek.cz/?email=a%40b.cz#x', referrer: '' }),
    ).toEqual({
      url: '/',
      referrer: '',
    });
    expect(cf).toMatchObject({ src: CF_BEACON_SRC, defer: true });
    expect(JSON.parse(cf?.attrs['data-cf-beacon'] ?? '')).toEqual({ token: 'tok123' });
  });

  it('after load already happened it waits only for idle, and never injects twice', () => {
    const f = fakeWindow('complete');
    loadAnalytics(full, f.win);
    f.fireIdle();
    loadAnalytics(full, f.win);
    f.fireIdle();
    expect(f.scripts).toHaveLength(2);
  });
});

describe('analyticsFrom', () => {
  it('is null without variables', () =>
    expect(analyticsFrom({})).toEqual({ umami: null, cfBeaconToken: null }));
  it('needs both Umami variables and an https source', () => {
    expect(
      analyticsFrom({ PUBLIC_UMAMI_SRC: 'https://cloud.umami.is/script.js' }).umami,
    ).toBeNull();
    expect(
      analyticsFrom({ PUBLIC_UMAMI_SRC: 'http://x.cz/s.js', PUBLIC_UMAMI_WEBSITE_ID: 'a' }).umami,
    ).toBeNull();
    expect(
      analyticsFrom({ PUBLIC_UMAMI_SRC: '/script.js', PUBLIC_UMAMI_WEBSITE_ID: 'a' }).umami,
    ).toBeNull();
    expect(
      analyticsFrom({
        PUBLIC_UMAMI_SRC: 'https://cloud.umami.is/script.js',
        PUBLIC_UMAMI_WEBSITE_ID: 'a-1',
      }),
    ).toEqual({
      umami: {
        src: 'https://cloud.umami.is/script.js',
        websiteId: 'a-1',
        hostUrl: 'https://gateway.umami.is',
      },
      cfBeaconToken: null,
    });
  });
  it('a self-hosted Umami collects on its own origin', () =>
    expect(
      analyticsFrom({
        PUBLIC_UMAMI_SRC: 'https://stats.example.cz/u.js',
        PUBLIC_UMAMI_WEBSITE_ID: 'a',
      }).umami?.hostUrl,
    ).toBe('https://stats.example.cz'));
  it('rejects a token with markup', () =>
    expect(analyticsFrom({ PUBLIC_CF_BEACON_TOKEN: '"><script>' }).cfBeaconToken).toBeNull());
});

// ST-03: what the Umami tracker may send
describe('Umami payload sanitizer', () => {
  const own = 'https://martinruzek.cz';
  it('keeps the path and the UTM tags, drops other parameters and the hash', () => {
    expect(
      sanitizeUrl(
        'https://martinruzek.cz/en/?email=jana%40example.test&utm_source=ig&utm_medium=social&utm_campaign=jaro&utm_term=x#private',
        own,
      ),
    ).toBe('/en/?utm_source=ig&utm_medium=social&utm_campaign=jaro');
    expect(sanitizeUrl('/?token=abc#frag', own)).toBe('/');
    expect(sanitizeUrl('/zasady-ochrany-osobnich-udaju/', own)).toBe(
      '/zasady-ochrany-osobnich-udaju/',
    );
  });
  it('reduces the referrer to the origin of another site', () => {
    expect(sanitizeReferrer('https://www.instagram.com/jana.novakova/?igsh=1#x', own)).toBe(
      'https://www.instagram.com',
    );
    expect(sanitizeReferrer('https://user:pw@example.com/a', own)).toBe('https://example.com');
    expect(sanitizeReferrer('https://martinruzek.cz/en/?x=1', own)).toBe('');
    expect(sanitizeReferrer('/en/?email=a', own)).toBe('');
    expect(sanitizeReferrer('android-app://com.x/', own)).toBe('');
    expect(sanitizeReferrer('', own)).toBe('');
  });
  it('leaves the other payload fields alone', () => {
    const p = {
      website: 'w',
      url: '/?a=1',
      referrer: 'https://x.cz/p',
      name: 'contact_click',
      data: { type: 'email' },
    };
    expect(sanitizeUmamiPayload(p, own)).toEqual({ ...p, url: '/', referrer: 'https://x.cz' });
    expect(p.url).toBe('/?a=1'); // the input is not mutated
  });
});
