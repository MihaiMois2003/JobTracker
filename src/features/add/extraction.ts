import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'
import type {
  ApplicationDraft,
  EmploymentType,
  SalaryPeriod,
  SourceName,
  WorkMode,
} from '../applications/types'

/** Mirrors functions/src/extract/types.ts. */
export interface ExtractedJob {
  title: string | null
  company: string | null
  companyWebsite: string | null
  location: string | null
  workMode: WorkMode | null
  employmentType: EmploymentType | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string | null
  salaryPeriod: SalaryPeriod | null
  description: string | null
  tags: string[]
  datePosted: string | null
  deadline: string | null
}

export interface ExtractionResult {
  job: ExtractedJob
  sourceUrl: string | null
  sourceName: SourceName
  confidence: 'high' | 'medium' | 'low'
  filledBy: Partial<Record<keyof ExtractedJob, 'jsonld' | 'ai'>>
  cached: boolean
  remaining: number
}

export type ExtractionFailure =
  | 'invalid_url'
  | 'blocked'
  | 'not_found'
  | 'timeout'
  | 'not_html'
  | 'unreachable'
  | 'not_a_job'
  | 'daily_limit'
  | 'ai_unavailable'
  | 'text_too_short'
  | 'offline'
  | 'internal'

export class ExtractionError extends Error {
  readonly reason: ExtractionFailure
  constructor(reason: ExtractionFailure) {
    super(reason)
    this.reason = reason
  }
}

const KNOWN: ExtractionFailure[] = [
  'invalid_url',
  'blocked',
  'not_found',
  'timeout',
  'not_html',
  'unreachable',
  'not_a_job',
  'daily_limit',
  'ai_unavailable',
  'text_too_short',
]

function toExtractionError(err: unknown): ExtractionError {
  if (!navigator.onLine) return new ExtractionError('offline')
  if (err instanceof FirebaseError) {
    const reason = (err as FirebaseError & { details?: { reason?: string } }).details?.reason
    if (reason && (KNOWN as string[]).includes(reason)) return new ExtractionError(reason as ExtractionFailure)
    if (err.code === 'functions/resource-exhausted') return new ExtractionError('daily_limit')
    if (err.code === 'functions/deadline-exceeded') return new ExtractionError('timeout')
  }
  return new ExtractionError('internal')
}

const extractJobFn = httpsCallable<{ url: string; force?: boolean }, ExtractionResult>(functions, 'extractJob', {
  timeout: 70_000,
})
const extractTextFn = httpsCallable<{ text: string; url?: string }, ExtractionResult>(functions, 'extractJobFromText', {
  timeout: 70_000,
})

export async function extractFromLink(url: string, force = false): Promise<ExtractionResult> {
  try {
    return (await extractJobFn({ url, force })).data
  } catch (err) {
    throw toExtractionError(err)
  }
}

export async function extractFromPastedText(text: string, url?: string): Promise<ExtractionResult> {
  try {
    return (await extractTextFn({ text, url: url || undefined })).data
  } catch (err) {
    throw toExtractionError(err)
  }
}

/** Failures where pasting the listing text is the natural next step. */
export function suggestsPaste(reason: ExtractionFailure): boolean {
  return ['blocked', 'timeout', 'not_html', 'unreachable', 'not_a_job', 'ai_unavailable'].includes(reason)
}

/** Loose check before calling the server; the server does the real validation. */
export function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value.trim())
}

/** Form keys that get the "auto-filled" marker. */
export type AutoKey =
  | 'title'
  | 'company'
  | 'companyWebsite'
  | 'location'
  | 'workMode'
  | 'employmentType'
  | 'salary'
  | 'tags'
  | 'deadline'
  | 'description'

/** Applies an extraction to a draft and reports which form fields it filled. */
export function applyExtraction(
  base: ApplicationDraft,
  result: ExtractionResult,
  fallbackUrl: string,
): { draft: ApplicationDraft; autoFilled: Set<AutoKey> } {
  const j = result.job
  const auto = new Set<AutoKey>()
  const pick = <T,>(key: AutoKey, value: T | null | undefined, current: T): T => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return current
    auto.add(key)
    return value
  }
  const hasSalary = j.salaryMin !== null || j.salaryMax !== null
  const draft: ApplicationDraft = {
    ...base,
    title: pick('title', j.title, base.title),
    company: pick('company', j.company, base.company),
    companyWebsite: pick('companyWebsite', j.companyWebsite, base.companyWebsite),
    location: pick('location', j.location, base.location),
    workMode: pick('workMode', j.workMode, base.workMode),
    employmentType: pick('employmentType', j.employmentType, base.employmentType),
    salaryMin: hasSalary ? pick('salary', j.salaryMin, base.salaryMin) : base.salaryMin,
    salaryMax: hasSalary ? pick('salary', j.salaryMax, base.salaryMax) : base.salaryMax,
    currency: hasSalary && j.currency ? j.currency : base.currency,
    salaryPeriod: hasSalary ? (j.salaryPeriod ?? base.salaryPeriod) : base.salaryPeriod,
    description: pick('description', j.description, base.description),
    tags: pick('tags', j.tags, base.tags),
    deadline: pick('deadline', j.deadline, base.deadline),
    sourceUrl: result.sourceUrl ?? fallbackUrl,
    sourceName: result.sourceName,
  }
  return { draft, autoFilled: auto }
}
