// Cookieless measurement (concept.md, kap. 12): Umami for visits and events, Cloudflare Web Analytics for Core Web
// Vitals. Both come from public build-time variables; a missing variable switches that tool off (`null`), so local
// builds and forks measure nothing. Moving Umami to Martin's own server = a new PUBLIC_UMAMI_SRC, nothing else.
// The parsing lives in `analytics-from.ts` (no `import.meta.env`), so Node scripts can reuse it.

import { analyticsFrom, type AnalyticsConfig } from './analytics-from';

export { analyticsFrom, umamiHostUrl, UMAMI_CLOUD, type AnalyticsConfig } from './analytics-from';

export const analytics: AnalyticsConfig = analyticsFrom(import.meta.env);
