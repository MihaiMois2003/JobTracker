export const PIPELINE_STATUSES = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'accepted',
] as const
export const CLOSED_STATUSES = ['rejected', 'ghosted', 'withdrawn'] as const
export const STATUSES = [...PIPELINE_STATUSES, ...CLOSED_STATUSES] as const

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]
export type ClosedStatus = (typeof CLOSED_STATUSES)[number]
export type Status = (typeof STATUSES)[number]

export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
  'freelance',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const SALARY_PERIODS = ['hour', 'day', 'month', 'year'] as const
export type SalaryPeriod = (typeof SALARY_PERIODS)[number]

export const SOURCES = ['linkedin', 'ejobs', 'bestjobs', 'indeed', 'company', 'other'] as const
export type SourceName = (typeof SOURCES)[number]

export const PRIORITIES = [1, 2, 3] as const
export type Priority = (typeof PRIORITIES)[number]
export const PRIORITY_KEY = { 1: 'low', 2: 'normal', 3: 'high' } as const

export const INTERVIEW_TYPES = ['hr', 'technical', 'final', 'other'] as const
export type InterviewType = (typeof INTERVIEW_TYPES)[number]

export const INTERVIEW_OUTCOMES = ['pending', 'passed', 'failed', 'cancelled'] as const
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number]

export interface Contact {
  id: string
  name: string
  role: string
  email: string
  phone: string
  linkedin: string
}

export interface Interview {
  id: string
  /** Local date-time, `yyyy-MM-ddTHH:mm`. */
  at: string
  durationMin: number
  type: InterviewType
  location: string
  people: string
  notes: string
  questions: string
  outcome: InterviewOutcome
}

export type TimelineEventType =
  | 'created'
  | 'status'
  | 'interview_added'
  | 'interview_updated'
  | 'interview_removed'
  | 'contact_added'
  | 'followed_up'
  | 'archived'
  | 'unarchived'
  | 'reloaded'
  | 'listing_closed'
  | 'imported'

export interface TimelineEvent {
  id: string
  /** ISO timestamp. */
  at: string
  type: TimelineEventType
  from?: Status
  to?: Status
  /** Free-form detail (e.g. interview type). */
  detail?: string
}

export interface Application {
  id: string
  title: string
  company: string
  companyWebsite: string
  location: string
  workMode: WorkMode | null
  employmentType: EmploymentType | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  salaryPeriod: SalaryPeriod | null
  salaryOffered: number | null
  description: string
  tags: string[]
  sourceUrl: string
  sourceName: SourceName
  status: Status
  priority: Priority
  cvVersion: string
  /** Dates are `yyyy-MM-dd`. */
  appliedAt: string | null
  deadline: string | null
  nextFollowUpAt: string | null
  notes: string
  contacts: Contact[]
  interviews: Interview[]
  timeline: TimelineEvent[]
  archived: boolean
  /** Set when a reload found the listing gone (404 / error). */
  listingClosed: boolean
  /** The user dismissed the "mark as ghosted?" suggestion at this ISO time. */
  ghostDismissedAt: string | null
  /** Marks rows created by "load demo data". */
  demo: boolean
  createdAt: string
  updatedAt: string
}

/** The editable subset used by forms (everything but bookkeeping). */
export type ApplicationDraft = Omit<
  Application,
  'id' | 'timeline' | 'createdAt' | 'updatedAt' | 'demo' | 'listingClosed' | 'ghostDismissedAt'
>

export function isClosed(status: Status): status is ClosedStatus {
  return (CLOSED_STATUSES as readonly string[]).includes(status)
}

export function emptyDraft(currency: string): ApplicationDraft {
  return {
    title: '',
    company: '',
    companyWebsite: '',
    location: '',
    workMode: null,
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    currency,
    salaryPeriod: null,
    salaryOffered: null,
    description: '',
    tags: [],
    sourceUrl: '',
    sourceName: 'other',
    status: 'saved',
    priority: 2,
    cvVersion: '',
    appliedAt: null,
    deadline: null,
    nextFollowUpAt: null,
    notes: '',
    contacts: [],
    interviews: [],
    archived: false,
  }
}
