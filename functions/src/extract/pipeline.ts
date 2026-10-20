import { FetchError, fetchPage } from '../lib/fetchPage'
import { sourceFromUrl } from '../lib/url'
import { AiUnavailableError, extractWithAi } from './ai'
import { pageText } from './html'
import { extractJsonLd } from './jsonld'
import { emptyJob, type ExtractedField, type ExtractedJob, type ExtractionResult, type FieldOrigin } from './types'

export type PipelineResult = Omit<ExtractionResult, 'cached' | 'remaining'> & {
  /** True when the model was called (counts toward the daily limit). */
  usedAi: boolean
}

/** The page loaded but holds no job listing (removed listing, search page, etc.). */
export class NotAJobError extends Error {}

const FIELDS: ExtractedField[] = [
  'title',
  'company',
  'companyWebsite',
  'location',
  'workMode',
  'employmentType',
  'salaryMin',
  'salaryMax',
  'currency',
  'salaryPeriod',
  'description',
  'tags',
  'datePosted',
  'deadline',
]

const isEmpty = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)

/** Copies `from` into `into` wherever `into` is empty, recording the origin of each filled field. */
function fillGaps(
  into: ExtractedJob,
  from: ExtractedJob,
  origin: FieldOrigin,
  filledBy: Partial<Record<ExtractedField, FieldOrigin>>,
): ExtractedJob {
  const out = { ...into } as Record<ExtractedField, unknown>
  // Salary numbers come from one source only, never a min from one and a max from another.
  const hasSalary = into.salaryMin !== null || into.salaryMax !== null
  for (const f of FIELDS) {
    if (hasSalary && (f === 'salaryMin' || f === 'salaryMax')) continue
    if (isEmpty(out[f]) && !isEmpty(from[f])) {
      out[f] = from[f]
      filledBy[f] = origin
    }
  }
  return out as unknown as ExtractedJob
}

function confidenceOf(job: ExtractedJob, hasJsonLd: boolean): ExtractionResult['confidence'] {
  if (!job.title || !job.company) return 'low'
  return hasJsonLd ? 'high' : 'medium'
}

/** Missing pieces that justify asking the model, even when JSON-LD exists. */
function needsAi(job: ExtractedJob): boolean {
  return !job.title || !job.company || !job.description || (!job.location && !job.workMode) || job.tags.length === 0
}

/** Strategy: JSON-LD first, then the model fills whatever is still missing. */
export async function extractFromUrl(url: URL): Promise<PipelineResult> {
  const page = await fetchPage(url.toString())
  const finalUrl = new URL(page.finalUrl)
  const fromLd = extractJsonLd(page.html)
  const text = pageText(page.html)

  if (!fromLd && text.looksBlocked) throw new FetchError('blocked', page.status)

  const filledBy: Partial<Record<ExtractedField, FieldOrigin>> = {}
  let job = fromLd ? fillGaps(emptyJob(), fromLd, 'jsonld', filledBy) : emptyJob()
  let usedAi = false

  if (needsAi(job)) {
    const body = fromLd?.description
      ? [fromLd.title, fromLd.company, fromLd.location, '', fromLd.description, '', text.text.slice(0, 3000)].filter((l) => l !== null).join('\n')
      : text.text
    if (body.trim().length >= 200) {
      try {
        usedAi = true
        const ai = await extractWithAi({ text: body, url: finalUrl.toString(), pageTitle: text.title })
        if (!fromLd && !ai.isJobPosting) throw new NotAJobError()
        job = fillGaps(job, ai.job, 'ai', filledBy)
      } catch (err) {
        // Without structured data the model is the only source; with it, degrade gracefully.
        if (!(err instanceof AiUnavailableError) || !fromLd) throw err
      }
    } else if (!fromLd) {
      throw new NotAJobError()
    }
  }

  return {
    job,
    sourceUrl: url.toString(),
    sourceName: sourceFromUrl(finalUrl),
    confidence: confidenceOf(job, Boolean(fromLd)),
    filledBy,
    usedAi,
  }
}

/** Fallback for pages we cannot fetch (LinkedIn, logins): the user pastes the listing text. */
export async function extractFromText(text: string, url: URL | null): Promise<PipelineResult> {
  const ai = await extractWithAi({ text, url: url?.toString() ?? null })
  if (!ai.isJobPosting && !ai.job.title) throw new NotAJobError()
  const filledBy: Partial<Record<ExtractedField, FieldOrigin>> = {}
  const job = fillGaps(emptyJob(), ai.job, 'ai', filledBy)
  return {
    job,
    sourceUrl: url?.toString() ?? null,
    sourceName: sourceFromUrl(url),
    confidence: job.title && job.company ? 'medium' : 'low',
    filledBy,
    usedAi: true,
  }
}
