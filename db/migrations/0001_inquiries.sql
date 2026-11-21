-- db/migrations/0001_inquiries.sql
CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
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
  -- kept for statistics (event_date reduced to YYYY-MM, referrer to origin on anonymization)
  service TEXT NOT NULL,
  hours INTEGER,
  event_date TEXT,
  guests INTEGER,
  addons TEXT NOT NULL DEFAULT '[]',
  estimate_from INTEGER NOT NULL,
  estimate_to INTEGER NOT NULL,
  referrer TEXT,
  landing_path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notice_version TEXT NOT NULL,
  notified_at INTEGER,
  confirmed_at INTEGER,
  anonymized_at INTEGER,
  CHECK (anonymized_at IS NOT NULL OR (name IS NOT NULL AND email IS NOT NULL))
);
CREATE INDEX idx_inquiries_created_at ON inquiries (created_at);
CREATE INDEX idx_inquiries_unnotified ON inquiries (notified_at) WHERE notified_at IS NULL;
