import { useCallback, useEffect, useRef, type RefObject } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** The widget starts loading this far before the form reaches the viewport. */
const ROOT_MARGIN = '400px';

interface TurnstileApi {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      appearance: 'interaction-only';
      language: string;
      callback(token: string): void;
      'expired-callback'(): void;
      'error-callback'(): void;
    },
  ): string;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => {
      scriptPromise = null; // allow a retry on the next submit
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(s); // not append(): the Worker runtime types (wrangler types) overload Element.append
  });
  return scriptPromise;
}

export interface Turnstile {
  /** Resolves with a fresh token, or `null` when none arrives within `timeoutMs`. */
  getToken(timeoutMs: number): Promise<string | null>;
  /** Tokens are single use: call after every submit attempt. */
  reset(): void;
}

/**
 * Loads Turnstile only when the form comes near the viewport or gets focus (concept.md, kap. 11),
 * then renders the widget in `container` (visible only when Cloudflare needs an interaction).
 */
export function useTurnstile(
  siteKey: string | undefined,
  language: string,
  form: RefObject<HTMLFormElement | null>,
  container: RefObject<HTMLDivElement | null>,
): Turnstile {
  const token = useRef<string | null>(null);
  const widget = useRef<string | null>(null);
  const waiters = useRef<((t: string | null) => void)[]>([]);
  const started = useRef<Promise<void> | null>(null);

  const settle = (t: string | null): void => {
    token.current = t;
    if (t) for (const w of waiters.current.splice(0)) w(t);
  };

  const start = useCallback((): Promise<void> => {
    if (!siteKey) return Promise.resolve();
    started.current ??= loadScript()
      .then((api) => {
        const el = container.current;
        if (!el || widget.current) return;
        widget.current = api.render(el, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          language,
          callback: (t) => settle(t),
          'expired-callback': () => settle(null),
          'error-callback': () => settle(null),
        });
      })
      .catch(() => {
        started.current = null;
      });
    return started.current;
  }, [siteKey, language, container]);

  useEffect(() => {
    const el = form.current;
    if (!el || !siteKey) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void start();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    io.observe(el);
    const onFocus = (): void => void start();
    el.addEventListener('focusin', onFocus, { once: true });
    return () => {
      io.disconnect();
      el.removeEventListener('focusin', onFocus);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
      started.current = null;
    };
  }, [form, siteKey, start]);

  const getToken = useCallback(
    async (timeoutMs: number): Promise<string | null> => {
      if (token.current) return token.current;
      await start();
      if (token.current) return token.current;
      return new Promise((resolve) => {
        const done = (t: string | null): void => {
          clearTimeout(timer);
          resolve(t);
        };
        const timer = setTimeout(() => {
          waiters.current = waiters.current.filter((w) => w !== done);
          resolve(null);
        }, timeoutMs);
        waiters.current.push(done);
      });
    },
    [start],
  );

  const reset = useCallback((): void => {
    token.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return { getToken, reset };
}
