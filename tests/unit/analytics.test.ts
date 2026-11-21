import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsFrom, type AnalyticsConfig } from '@/config/analytics';
import { CF_BEACON_SRC, loadAnalytics, track } from '@/scripts/analytics';

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

const full: AnalyticsConfig = {
  umami: { src: 'https://cloud.umami.is/script.js', websiteId: 'abc-123' },
  cfBeaconToken: 'tok123',
};

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
      attrs: { 'data-website-id': 'abc-123' },
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
      umami: { src: 'https://cloud.umami.is/script.js', websiteId: 'a-1' },
      cfBeaconToken: null,
    });
  });
  it('rejects a token with markup', () =>
    expect(analyticsFrom({ PUBLIC_CF_BEACON_TOKEN: '"><script>' }).cfBeaconToken).toBeNull());
});
