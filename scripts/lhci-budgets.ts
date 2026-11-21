// Budget that Lighthouse's own assertions cannot express: the JavaScript needed for the first render
// (concept.md, kap. 13: "JS pro první vykreslení", 10 kB). Deferred module scripts and their static imports run
// before DOMContentLoaded; the motion layer (GSAP, Lenis) and the React island are loaded afterwards by dynamic
// import. So: transferred script bytes that finished loading by the observed DOMContentLoaded.

/** Concept budget for first-render JS (compressed transfer size). One place to change it. */
export const FIRST_RENDER_JS_BUDGET = 10 * 1024;

interface NetworkItem {
  resourceType?: string;
  transferSize?: number;
  networkEndTime?: number;
}

/** The parts of a Lighthouse result this module reads. */
export interface LhrLike {
  finalDisplayedUrl?: string;
  audits: {
    metrics?: { details?: { items?: Array<{ observedDomContentLoaded?: number }> } };
    'network-requests'?: { details?: { items?: NetworkItem[] } };
  };
}

export function firstRenderScriptBytes(lhr: LhrLike): number {
  const dcl = lhr.audits.metrics?.details?.items?.[0]?.observedDomContentLoaded;
  const requests = lhr.audits['network-requests']?.details?.items;
  if (dcl === undefined || !requests)
    throw new Error('Lighthouse result has no DOMContentLoaded or network data');
  return requests
    .filter((r) => r.resourceType === 'Script' && (r.networkEndTime ?? Infinity) <= dcl)
    .reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
}

/** One line per run that is over budget (empty = all within budget). */
export function budgetProblems(runs: LhrLike[], budget = FIRST_RENDER_JS_BUDGET): string[] {
  return runs.flatMap((lhr) => {
    const bytes = firstRenderScriptBytes(lhr);
    return bytes > budget
      ? [
          `first-render JS ${(bytes / 1024).toFixed(1)} kB > ${(budget / 1024).toFixed(1)} kB (${lhr.finalDisplayedUrl ?? 'page'})`,
        ]
      : [];
  });
}
