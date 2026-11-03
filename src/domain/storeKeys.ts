/**
 * The keys Kept writes into the host's AsyncStorage (docs/dev/history/technical-design-clean-break.md §4).
 * Every key starts with STORE_PREFIX, so Remove Kept's data finds all of Kept's keys and never
 * another plugin's. Storage that switches with a profile appends `:<profileId>`
 * (storage/profileKeys.ts).
 */
export const STORE_PREFIX = 'kept:';

export const SETTINGS_KEY = `${STORE_PREFIX}settings:v1`;
export const SECRETS_KEY = `${STORE_PREFIX}profileSecrets:v1`;
export const CAPTURE_DESTINATIONS_KEY = `${STORE_PREFIX}captureDestinations:v1`;
export const TAG_USAGE_KEY = `${STORE_PREFIX}tagUsage:v1`;
export const GOOGLE_CALENDAR_CACHE_KEY = `${STORE_PREFIX}googleCalendarCache:v1`;
/** Device-wide, not per profile: switching profiles doesn't show the update notice again. */
export const UPDATE_STATE_KEY = `${STORE_PREFIX}updates:v1`;
