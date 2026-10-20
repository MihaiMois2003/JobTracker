export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'temporary', 'freelance'] as const
export const SALARY_PERIODS = ['hour', 'day', 'month', 'year'] as const

export type WorkMode = (typeof WORK_MODES)[number]
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]
export type SalaryPeriod = (typeof SALARY_PERIODS)[number]
export type SourceName = 'linkedin' | 'ejobs' | 'bestjobs' | 'indeed' | 'company' | 'other'

/** Fields we try to extract; every one may be unknown (null). Mirrors the app's Application. */
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

export type ExtractedField = keyof ExtractedJob
export type FieldOrigin = 'jsonld' | 'ai'

export interface ExtractionResult {
  job: ExtractedJob
  sourceUrl: string | null
  sourceName: SourceName
  /** How much to trust the result: JSON-LD is structured data, AI-only is a best effort. */
  confidence: 'high' | 'medium' | 'low'
  filledBy: Partial<Record<ExtractedField, FieldOrigin>>
  cached: boolean
  /** Extractions left today for this user. */
  remaining: number
}

export function emptyJob(): ExtractedJob {
  return {
    title: null,
    company: null,
    companyWebsite: null,
    location: null,
    workMode: null,
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    salaryPeriod: null,
    description: null,
    tags: [],
    datePosted: null,
    deadline: null,
  }
}
