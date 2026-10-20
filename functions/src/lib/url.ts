import { createHash } from 'node:crypto'
import type { SourceName } from '../extract/types'

/** Query parameters that only track the visit and never identify the job. */
const TRACKING_PARAMS = new Set([
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'dclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'ref',
  'refid',
  'ref_src',
  'referrer',
  'trackingid',
  'trk',
  'trkinfo',
  'lipi',
  'midtoken',
  'midsig',
  'eborigin',
  'originalsubdomain',
  'src',
  'source',
  'gh_src',
  'lever-source',
  'lever-origin',
  'from',
  'si',
  'spm',
  'share_id',
  'sharing',
])

/**
 * Canonical form of a job URL: no fragment, no tracking parameters, sorted query,
 * lower-case host. LinkedIn search URLs with `currentJobId` become the job's own page.
 */
export function normalizeUrl(url: URL): URL {
  const out = new URL(url.toString())
  out.hash = ''
  out.hostname = out.hostname.toLowerCase().replace(/^m\./, 'www.')

  if (/(^|\.)linkedin\.com$/.test(out.hostname)) {
    const current = out.searchParams.get('currentJobId')
    if (current && /^\d+$/.test(current)) return new URL(`https://www.linkedin.com/jobs/view/${current}/`)
    const view = /\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(out.pathname)
    if (view) return new URL(`https://www.linkedin.com/jobs/view/${view[1]}/`)
  }

  const kept = [...out.searchParams.entries()].filter(
    ([k]) => !k.toLowerCase().startsWith('utm_') && !TRACKING_PARAMS.has(k.toLowerCase()),
  )
  kept.sort(([a], [b]) => a.localeCompare(b))
  out.search = ''
  for (const [k, v] of kept) out.searchParams.append(k, v)
  if (out.pathname.length > 1) out.pathname = out.pathname.replace(/\/+$/, '')
  return out
}

export function hashUrl(url: URL): string {
  return createHash('sha256').update(url.toString()).digest('hex').slice(0, 40)
}

const ATS_HOSTS = [
  'greenhouse.io',
  'lever.co',
  'workable.com',
  'smartrecruiters.com',
  'ashbyhq.com',
  'recruitee.com',
  'teamtailor.com',
  'personio.de',
  'personio.com',
  'bamboohr.com',
  'breezy.hr',
  'myworkdayjobs.com',
  'workday.com',
  'jobvite.com',
  'icims.com',
  'successfactors.com',
  'taleo.net',
  'join.com',
  'homerun.co',
]

/** Where a listing lives, inferred from its domain. */
export function sourceFromUrl(url: URL | null): SourceName {
  if (!url) return 'other'
  const host = url.hostname.toLowerCase()
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`)
  if (is('linkedin.com')) return 'linkedin'
  if (is('ejobs.ro')) return 'ejobs'
  if (host.includes('bestjobs.')) return 'bestjobs'
  if (/(^|\.)indeed\.[a-z.]+$/.test(host)) return 'indeed'
  if (ATS_HOSTS.some(is)) return 'company'
  if (/^(careers?|jobs|cariere|join|work)\./.test(host)) return 'company'
  if (/\/(careers?|jobs|cariere|job|positions|openings|vacancies)(\/|$)/i.test(url.pathname)) return 'company'
  return 'other'
}
