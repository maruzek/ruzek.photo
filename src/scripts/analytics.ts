// Event tracking through Umami (cookieless). Task 14 adds the loader; until then, and whenever Umami is
// blocked or not configured, `track` does nothing. Never pass personal data as event data.

type EventData = Record<string, string | number>;

declare global {
  interface Window {
    umami?: { track(event: string, data?: EventData): void };
  }
}

export function track(event: string, data?: EventData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // measurement must never break the page
  }
}
