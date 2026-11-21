// Generic channel names for utm_source and utm_medium: the only UTM values that reach statistics after
// anonymization (src/server/inquiry/store.ts) and the only ones Umami receives (src/scripts/analytics.ts).
// A value outside these lists (a free campaign name, an e-mail) is dropped.

export const GENERIC_UTM_SOURCES = [
  'instagram',
  'ig',
  'facebook',
  'fb',
  'google',
  'seznam',
  'firmy',
  'linkedin',
  'tiktok',
  'youtube',
  'email',
  'newsletter',
  'qr',
] as const;
export const GENERIC_UTM_MEDIUMS = [
  'social',
  'organic',
  'cpc',
  'paid',
  'email',
  'referral',
  'qr',
  'print',
  'display',
] as const;
