import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { CACHE_MAX_AGE_DAYS, DAILY_EXTRACTION_LIMIT, LIMIT_TIMEZONE } from '../config'
import type { ExtractionResult } from '../extract/types'

if (!getApps().length) initializeApp()
const db = getFirestore()

/** Calendar day in the limit timezone, e.g. "2026-10-20". */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMIT_TIMEZONE }).format(new Date())
}

// usage/{uid} lives outside users/{uid}, so clients (by rules) cannot reset their own counter.
const usageRef = (uid: string) => db.collection('usage').doc(uid)

async function usedToday(uid: string): Promise<number> {
  const snap = await usageRef(uid).get()
  const data = snap.data() as { day?: string; count?: number } | undefined
  return data?.day === today() ? (data.count ?? 0) : 0
}

/** Throws a friendly `resource-exhausted` error when the user has no extractions left today. */
export async function assertUnderLimit(uid: string): Promise<number> {
  const used = await usedToday(uid)
  if (used >= DAILY_EXTRACTION_LIMIT) {
    throw new HttpsError('resource-exhausted', 'Daily extraction limit reached', {
      reason: 'daily_limit',
      limit: DAILY_EXTRACTION_LIMIT,
    })
  }
  return DAILY_EXTRACTION_LIMIT - used
}

/** Records one extraction and returns how many are left today. */
export async function recordExtraction(uid: string): Promise<number> {
  const ref = usageRef(uid)
  const day = today()
  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data() as { day?: string; count?: number } | undefined
    const next = data?.day === day ? (data.count ?? 0) + 1 : 1
    tx.set(ref, { day, count: next, updatedAt: FieldValue.serverTimestamp() })
    return next
  })
  return Math.max(0, DAILY_EXTRACTION_LIMIT - count)
}

type Cached = Omit<ExtractionResult, 'cached' | 'remaining'>

const cacheRef = (hash: string) => db.collection('extractionCache').doc(hash)

export async function readCache(hash: string): Promise<Cached | null> {
  const snap = await cacheRef(hash).get()
  if (!snap.exists) return null
  const data = snap.data() as Cached & { createdAt?: FirebaseFirestore.Timestamp }
  const age = Date.now() - (data.createdAt?.toMillis() ?? 0)
  if (age > CACHE_MAX_AGE_DAYS * 86_400_000) return null
  return {
    job: data.job,
    sourceUrl: data.sourceUrl,
    sourceName: data.sourceName,
    confidence: data.confidence,
    filledBy: data.filledBy,
  }
}

export async function writeCache(hash: string, value: Cached): Promise<void> {
  await cacheRef(hash).set({ ...value, createdAt: FieldValue.serverTimestamp() })
}
