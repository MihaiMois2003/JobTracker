/** Central knobs for the extraction functions. */

/** Region for all functions; must match `FUNCTIONS_REGION` in src/lib/firebase.ts. */
export const REGION = 'europe-west1'

/** Maximum fresh extractions (link or pasted text) per user per day. Cache hits are free. */
export const DAILY_EXTRACTION_LIMIT = 30

/** Timezone used to decide when "today" ends for the daily limit. */
export const LIMIT_TIMEZONE = 'Europe/Bucharest'

/** Cached results older than this are fetched again. */
export const CACHE_MAX_AGE_DAYS = 14

export const FETCH_TIMEOUT_MS = 10_000
export const MAX_RESPONSE_BYTES = 3 * 1024 * 1024
export const MAX_REDIRECTS = 5

/** Characters of page text sent to the model. */
export const AI_TEXT_LIMIT = 12_000

export const AI_MODEL = 'claude-haiku-5-5'

/** Longest description we store. */
export const DESCRIPTION_LIMIT = 20_000
