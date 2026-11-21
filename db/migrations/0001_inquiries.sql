-- db/migrations/0001_inquiries.sql
CREATE TABLE inquiries (
  -- random UUID; replaced by a new random value on anonymization, so the row no longer matches the ID
  -- quoted in the owner's e-mail
  id TEXT PRIMARY KEY,
  -- random UUID from the browser, kept across retries: a repeated request does not create a second row.
  -- NULL after anonymization.
  submission_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('cs', 'en')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'won', 'lost')),
  -- personal data: set to NULL on anonymization
  name TEXT,
  email TEXT,
  phone TEXT,
  place TEXT,
  note TEXT,
  time_from TEXT,
  time_to TEXT,
  -- kept for statistics (event_date reduced to YYYY-MM on anonymization)
  service TEXT NOT NULL,
  hours INTEGER,
  event_date TEXT,
  guests INTEGER,
  addons TEXT NOT NULL DEFAULT '[]',
  estimate_from INTEGER NOT NULL,
  estimate_to INTEGER NOT NULL,
  -- source, sanitized on insert (src/server/inquiry/source.ts): referrer host only, landing path only when it
  -- is a known route, UTM values [a-z0-9._-]{1,64}. Anonymization sets anything else to NULL as well.
  referrer TEXT,
  landing_path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notice_version TEXT NOT NULL,
  notified_at INTEGER,
  confirmed_at INTEGER,
  -- set when the row was listed in a successfully sent anonymization preview (risk R11)
  previewed_at INTEGER,
  anonymized_at INTEGER,
  CHECK (anonymized_at IS NOT NULL OR (name IS NOT NULL AND email IS NOT NULL AND submission_id IS NOT NULL))
);
CREATE INDEX idx_inquiries_created_at ON inquiries (created_at);
CREATE INDEX idx_inquiries_pending_mail ON inquiries (created_at) WHERE notified_at IS NULL OR confirmed_at IS NULL;
