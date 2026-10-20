import { setGlobalOptions } from 'firebase-functions'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { REGION } from './config'
import { AiUnavailableError } from './extract/ai'
import { extractFromText, extractFromUrl, NotAJobError, type PipelineResult } from './extract/pipeline'
import type { ExtractionResult } from './extract/types'
import { FetchError } from './lib/fetchPage'
import { assertPublicHttpUrl, UnsafeUrlError } from './lib/ssrf'
import { assertUnderLimit, readCache, recordExtraction, writeCache } from './lib/store'
import { hashUrl, normalizeUrl } from './lib/url'

setGlobalOptions({ region: REGION, maxInstances: 10 })

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

const callableOptions = {
  secrets: [ANTHROPIC_API_KEY],
  timeoutSeconds: 60,
  memory: '512MiB' as const,
}

function requireUser(request: CallableRequest): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first')
  return request.auth.uid
}

function parseUrl(raw: unknown): URL {
  if (typeof raw !== 'string' || raw.length > 2048) {
    throw new HttpsError('invalid-argument', 'url must be a string', { reason: 'invalid_url' })
  }
  try {
    return normalizeUrl(assertPublicHttpUrl(raw))
  } catch (err) {
    if (err instanceof UnsafeUrlError) throw new HttpsError('invalid-argument', 'Unsupported URL', { reason: 'invalid_url' })
    throw err
  }
}

/** Maps internal failures to errors the client can act on (`details.reason`). */
function toHttpsError(err: unknown): HttpsError {
  if (err instanceof HttpsError) return err
  if (err instanceof FetchError) {
    switch (err.reason) {
      case 'blocked':
        return new HttpsError('failed-precondition', 'The page requires a login or blocks automated access', { reason: 'blocked', status: err.status })
      case 'not_found':
        return new HttpsError('not-found', 'The listing no longer exists', { reason: 'not_found', status: err.status })
      case 'timeout':
        return new HttpsError('deadline-exceeded', 'The page took too long to respond', { reason: 'timeout' })
      case 'unsafe_url':
        return new HttpsError('invalid-argument', 'Unsupported URL', { reason: 'invalid_url' })
      case 'not_html':
      case 'too_large':
        return new HttpsError('failed-precondition', 'Not a readable web page', { reason: 'not_html' })
      default:
        return new HttpsError('unavailable', 'Could not reach the page', { reason: 'unreachable', status: err.status })
    }
  }
  if (err instanceof NotAJobError) return new HttpsError('failed-precondition', 'No job listing found', { reason: 'not_a_job' })
  if (err instanceof AiUnavailableError) return new HttpsError('unavailable', 'Extraction service unavailable', { reason: 'ai_unavailable' })
  logger.error('extraction failed', err)
  return new HttpsError('internal', 'Extraction failed', { reason: 'internal' })
}

function respond(result: PipelineResult, remaining: number, cached: boolean): ExtractionResult {
  const { usedAi: _usedAi, ...rest } = result
  return { ...rest, cached, remaining }
}

/**
 * extractJob({ url, force? }) – reads a job listing from a link.
 * `force` skips the cache (used by "reload from link").
 */
export const extractJob = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const data = (request.data ?? {}) as { url?: unknown; force?: unknown }
  const url = parseUrl(data.url)
  const key = hashUrl(url)

  if (data.force !== true) {
    const cached = await readCache(key)
    if (cached) {
      const remaining = await assertUnderLimit(uid).catch(() => 0)
      return { ...cached, cached: true, remaining }
    }
  }

  await assertUnderLimit(uid)
  try {
    const result = await extractFromUrl(url)
    const remaining = await recordExtraction(uid)
    await writeCache(key, respond(result, 0, false))
    logger.info('extracted', { host: url.hostname, ai: result.usedAi, confidence: result.confidence })
    return respond(result, remaining, false)
  } catch (err) {
    // Model calls cost money even when the page turns out not to be a listing.
    if (err instanceof NotAJobError) await recordExtraction(uid)
    throw toHttpsError(err)
  }
})

/** extractJobFromText({ text, url? }) – the "paste the listing" fallback. */
export const extractJobFromText = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const data = (request.data ?? {}) as { text?: unknown; url?: unknown }
  const text = typeof data.text === 'string' ? data.text.trim() : ''
  if (text.length < 80) throw new HttpsError('invalid-argument', 'Text too short', { reason: 'text_too_short' })
  if (text.length > 100_000) throw new HttpsError('invalid-argument', 'Text too long', { reason: 'text_too_long' })
  const url = typeof data.url === 'string' && data.url.trim() ? parseUrl(data.url) : null

  await assertUnderLimit(uid)
  try {
    const result = await extractFromText(text, url)
    const remaining = await recordExtraction(uid)
    return respond(result, remaining, false)
  } catch (err) {
    if (err instanceof NotAJobError) await recordExtraction(uid)
    throw toHttpsError(err)
  }
})
