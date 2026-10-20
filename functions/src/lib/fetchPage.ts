import { Agent, fetch } from 'undici'
import { FETCH_TIMEOUT_MS, MAX_REDIRECTS, MAX_RESPONSE_BYTES } from '../config'
import { assertPublicHttpUrl, safeLookup } from './ssrf'

const agent = new Agent({
  connect: { lookup: safeLookup, timeout: FETCH_TIMEOUT_MS },
  headersTimeout: FETCH_TIMEOUT_MS,
  bodyTimeout: FETCH_TIMEOUT_MS,
})

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
}

export type FetchFailure = 'blocked' | 'not_found' | 'timeout' | 'too_large' | 'not_html' | 'unreachable' | 'unsafe_url'

export class FetchError extends Error {
  constructor(
    readonly reason: FetchFailure,
    readonly status?: number,
  ) {
    super(reason)
  }
}

export interface FetchedPage {
  finalUrl: string
  status: number
  html: string
}

/**
 * GETs a public web page like a normal browser would, with SSRF-safe DNS, a hard timeout,
 * a response size cap and manually followed (re-validated) redirects.
 */
export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let url = assertPublicHttpUrl(rawUrl)
  const deadline = AbortSignal.timeout(FETCH_TIMEOUT_MS)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Awaited<ReturnType<typeof fetch>>
    try {
      res = await fetch(url, { dispatcher: agent, redirect: 'manual', headers: BROWSER_HEADERS, signal: deadline })
    } catch (err) {
      if (deadline.aborted) throw new FetchError('timeout')
      const code = (err as { cause?: { code?: string } }).cause?.code
      throw new FetchError(code === 'EBLOCKED' ? 'unsafe_url' : 'unreachable')
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      await res.body?.cancel()
      if (!location) throw new FetchError('unreachable', res.status)
      url = assertPublicHttpUrl(new URL(location, url).toString())
      continue
    }

    if (res.status === 404 || res.status === 410) {
      await res.body?.cancel()
      throw new FetchError('not_found', res.status)
    }
    // 999 is LinkedIn's "no bots" status.
    if ([401, 403, 429, 451, 999].includes(res.status)) {
      await res.body?.cancel()
      throw new FetchError('blocked', res.status)
    }
    if (res.status >= 400) {
      await res.body?.cancel()
      throw new FetchError('unreachable', res.status)
    }

    const type = res.headers.get('content-type') ?? ''
    if (type && !/html|xml/i.test(type)) {
      await res.body?.cancel()
      throw new FetchError('not_html', res.status)
    }

    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_RESPONSE_BYTES) {
      await res.body?.cancel()
      throw new FetchError('too_large', res.status)
    }

    const html = await readCapped(res.body, deadline, /charset=([^;]+)/i.exec(type)?.[1]?.trim())
    return { finalUrl: url.toString(), status: res.status, html }
  }
  throw new FetchError('unreachable')
}

async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal,
  charset: string | undefined,
): Promise<string> {
  if (!body) return ''
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      if (signal.aborted) throw new FetchError('timeout')
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new FetchError('too_large')
      }
      chunks.push(value)
    }
  } catch (err) {
    if (err instanceof FetchError) throw err
    throw new FetchError(signal.aborted ? 'timeout' : 'unreachable')
  }
  const bytes = Buffer.concat(chunks)
  try {
    return new TextDecoder(charset || 'utf-8').decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}
