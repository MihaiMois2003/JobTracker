import * as cheerio from 'cheerio'
import { DESCRIPTION_LIMIT } from '../config'
import { cleanDescription } from './html'
import { emptyJob, type EmploymentType, type ExtractedJob, type SalaryPeriod } from './types'

type Json = Record<string, unknown>

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v)
const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])

function text(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (isObj(v)) return text(v.name) ?? text(v['@value'])
  return null
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

function isoDate(v: unknown): string | null {
  const s = text(v)
  if (!s) return null
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (m) return m[1]
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function hasType(node: Json, type: string): boolean {
  return asArray(node['@type'] as string | string[]).some((t) => typeof t === 'string' && t.toLowerCase() === type)
}

/** Finds every JobPosting node, including inside @graph and nested arrays. */
function findPostings(value: unknown, out: Json[] = [], depth = 0): Json[] {
  if (depth > 6) return out
  if (Array.isArray(value)) {
    for (const v of value) findPostings(v, out, depth + 1)
  } else if (isObj(value)) {
    if (hasType(value, 'jobposting')) out.push(value)
    if (value['@graph']) findPostings(value['@graph'], out, depth + 1)
    if (value.mainEntity) findPostings(value.mainEntity, out, depth + 1)
  }
  return out
}

function parseBlocks(html: string): unknown[] {
  const $ = cheerio.load(html)
  const blocks: unknown[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el)
      .text()
      .trim()
      .replace(/^<!\[CDATA\[|\]\]>$/g, '')
      // Some sites put raw newlines/tabs inside JSON strings.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0019]+/g, ' ')
    try {
      blocks.push(JSON.parse(raw))
    } catch {
      // Ignore malformed blocks; other strategies will fill the gaps.
    }
  })
  return blocks
}

const EMPLOYMENT: Record<string, EmploymentType> = {
  FULL_TIME: 'full_time',
  FULLTIME: 'full_time',
  PART_TIME: 'part_time',
  PARTTIME: 'part_time',
  CONTRACTOR: 'contract',
  CONTRACT: 'contract',
  TEMPORARY: 'temporary',
  INTERN: 'internship',
  INTERNSHIP: 'internship',
  PER_DIEM: 'temporary',
  FREELANCE: 'freelance',
}

const PERIODS: Record<string, SalaryPeriod> = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'day',
  MONTH: 'month',
  YEAR: 'year',
}

function location(posting: Json): string | null {
  const parts = new Set<string>()
  for (const loc of asArray(posting.jobLocation as Json | Json[])) {
    if (!isObj(loc)) continue
    const address = isObj(loc.address) ? loc.address : loc
    const city = text(address.addressLocality)
    const country = text(address.addressCountry)
    const label = [city, country && country !== city ? country : null].filter(Boolean).join(', ')
    if (label) parts.add(label)
    if (parts.size >= 3) break
  }
  return parts.size ? [...parts].join(' · ') : null
}

function salary(posting: Json): Pick<ExtractedJob, 'salaryMin' | 'salaryMax' | 'currency' | 'salaryPeriod'> {
  const base = (isObj(posting.baseSalary) ? posting.baseSalary : null) ?? (isObj(posting.estimatedSalary) ? posting.estimatedSalary : null)
  const empty = { salaryMin: null, salaryMax: null, currency: null, salaryPeriod: null }
  if (!base) return empty
  const value = isObj(base.value) ? base.value : base
  const min = num(value.minValue) ?? num(value.value)
  const max = num(value.maxValue) ?? num(value.value)
  if (min === null && max === null) return empty
  const unit = (text(value.unitText) ?? text(base.unitText) ?? '').toUpperCase()
  return {
    salaryMin: min,
    salaryMax: max,
    currency: (text(base.currency) ?? text(value.currency))?.toUpperCase() ?? null,
    salaryPeriod: PERIODS[unit] ?? null,
  }
}

function tags(posting: Json): string[] {
  const raw = [posting.skills, posting.keywords, posting.occupationalCategory]
    .flatMap((v) => asArray(v as string | string[]))
    .flatMap((v) => (typeof v === 'string' ? v.split(/[,;|]/) : []))
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length <= 32)
  return [...new Set(raw)].slice(0, 10)
}

/** Reads the first schema.org JobPosting on the page, or null if there is none. */
export function extractJsonLd(html: string): ExtractedJob | null {
  const posting = parseBlocks(html)
    .flatMap((b) => findPostings(b))
    .find((p) => text(p.title))
  if (!posting) return null

  const org = isObj(posting.hiringOrganization) ? posting.hiringOrganization : null
  const remote =
    asArray(posting.jobLocationType as string | string[]).some((t) => /telecommute|remote/i.test(String(t))) ||
    (Boolean(posting.applicantLocationRequirements) && !posting.jobLocation)
  const employment = asArray(posting.employmentType as string | string[])
    .map((e) => EMPLOYMENT[String(e).toUpperCase().replace(/[\s-]/g, '_')])
    .find(Boolean)
  const description = text(posting.description)

  return {
    ...emptyJob(),
    title: text(posting.title),
    company: org ? text(org.name) : text(posting.hiringOrganization),
    companyWebsite: org ? (text(org.sameAs) ?? text(org.url)) : null,
    location: location(posting),
    workMode: remote ? 'remote' : null,
    employmentType: employment ?? null,
    ...salary(posting),
    description: description ? cleanDescription(description).slice(0, DESCRIPTION_LIMIT) : null,
    tags: tags(posting),
    datePosted: isoDate(posting.datePosted),
    deadline: isoDate(posting.validThrough),
  }
}
