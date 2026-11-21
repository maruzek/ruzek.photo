// Reads the build-time analytics configuration that Base.astro renders as JSON (the same JSON tells the build
// which origins the Content-Security-Policy allows, scripts/csp-headers.ts) and starts the loader.
import type { AnalyticsConfig } from '../config/analytics';
import { loadAnalytics } from './analytics';

const el = document.getElementById('analytics-config');
if (el?.textContent) {
  try {
    loadAnalytics(JSON.parse(el.textContent) as AnalyticsConfig);
  } catch {
    // a broken configuration only switches measurement off
  }
}
