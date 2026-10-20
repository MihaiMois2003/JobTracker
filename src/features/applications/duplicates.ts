import type { Application } from './types'

const TRACKING = /^(utm_.*|gclid|fbclid|ref|refid|trackingid|trk|trkinfo|src|source|gh_src|lever-source|lever-origin|from)$/i

/** Comparable form of a job link: host without www, path without trailing slash, no tracking. */
export function urlKey(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    const linkedIn = /linkedin\.com$/i.test(u.hostname) && /\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(u.pathname)
    if (linkedIn) return `linkedin:${linkedIn[1]}`
    const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b))
    const query = params.map(([k, v]) => `${k}=${v}`).join('&')
    return `${u.hostname.replace(/^(www|m)\./i, '').toLowerCase()}${u.pathname.replace(/\/+$/, '')}${query ? `?${query}` : ''}`
  } catch {
    return null
  }
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

const COMPANY_SUFFIX = /\b(s\.?r\.?l|s\.?a|inc|ltd|llc|gmbh|plc|ag|bv|corp|corporation|company|co|group|romania|technologies|technology)\b\.?/g

export function companyKey(name: string): string {
  return fold(name).replace(COMPANY_SUFFIX, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function words(title: string): Set<string> {
  return new Set(
    fold(title)
      .replace(/[^a-z0-9+#]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 1),
  )
}

/** Jaccard similarity of title words, 0..1. */
export function titleSimilarity(a: string, b: string): number {
  const wa = words(a)
  const wb = words(b)
  if (!wa.size || !wb.size) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / (wa.size + wb.size - shared)
}

export interface DuplicateReport {
  /** Same link, or same company with a near-identical title. */
  sameJob: Application | null
  /** Other applications at the same company that went beyond "saved". */
  appliedAtCompany: Application[]
}

export function findDuplicates(
  items: Application[],
  draft: { sourceUrl: string; company: string; title: string },
  ignoreId?: string,
): DuplicateReport {
  const others = items.filter((a) => a.id !== ignoreId)
  const key = draft.sourceUrl ? urlKey(draft.sourceUrl) : null
  const company = draft.company ? companyKey(draft.company) : ''

  let sameJob = key ? (others.find((a) => a.sourceUrl && urlKey(a.sourceUrl) === key) ?? null) : null
  if (!sameJob && company && draft.title) {
    sameJob =
      others.find((a) => companyKey(a.company) === company && titleSimilarity(a.title, draft.title) >= 0.6) ?? null
  }

  const appliedAtCompany = company
    ? others.filter((a) => a.id !== sameJob?.id && companyKey(a.company) === company && a.status !== 'saved')
    : []
  return { sameJob, appliedAtCompany }
}
