// Shared test base. A test opens pages with no referrer, which is exactly when the entry loader runs
// (src/scripts/loader.ts), and its curtain would cover every page for ~2 s. So by default every page behaves as if
// it was reached by an internal link; loader.spec.ts uses @playwright/test directly to see the real entry.
import { test as base, type BrowserContext } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Page, Route } from '@playwright/test';

/** An empty `document.referrer` reads as same-origin in every page of the context, so the entry loader stays off. */
export async function skipLoader(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    // a referrer a test sets on purpose (analytics.spec.ts) stays as it is
    const real = Object.getOwnPropertyDescriptor(Document.prototype, 'referrer')?.get;
    Object.defineProperty(Document.prototype, 'referrer', {
      configurable: true,
      get(this: Document) {
        return (real?.call(this) as string | undefined) || `${location.origin}/`;
      },
    });
  });
}

export const test = base.extend<{ internalEntry: undefined }>({
  internalEntry: [
    async ({ context }, use) => {
      await skipLoader(context);
      await use(undefined);
    },
    { auto: true },
  ],
});
