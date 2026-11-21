// Maintenance worker for the inquiry database (concept.md, kap. 2 and 11): a separate Worker with a cron
// trigger, on the same D1 as the site. Deploy with `pnpm deploy:maintenance`.
import { ANONYMIZE_AFTER_DAYS } from '../../../src/config/privacy';
import { createMailer, FROM_EMAIL } from '../../../src/server/inquiry/mailer';
import { d1Store } from '../../../src/server/inquiry/store';
import { runMaintenance } from './run';

interface MaintenanceEnv {
  DB: D1Database;
  OWNER_EMAIL: string;
  // secrets (wrangler secret put -c workers/maintenance/wrangler.jsonc)
  RESEND_API_KEY?: string;
  MAILER?: string;
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runMaintenance({
        store: d1Store(env.DB),
        mailer: createMailer(env),
        now: () => Date.now(),
        anonymizeAfterDays: ANONYMIZE_AFTER_DAYS,
        ownerEmail: env.OWNER_EMAIL,
        fromEmail: FROM_EMAIL,
      }).then((r) => console.info(`maintenance: ${JSON.stringify(r)}`)), // counts only, no personal data
    );
  },
} satisfies ExportedHandler<MaintenanceEnv>;
