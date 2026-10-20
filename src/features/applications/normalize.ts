import { newId } from '../../lib/id'
import {
  EMPLOYMENT_TYPES,
  INTERVIEW_OUTCOMES,
  INTERVIEW_TYPES,
  PRIORITIES,
  SALARY_PERIODS,
  SOURCES,
  STATUSES,
  WORK_MODES,
  type Application,
  type Contact,
  type Interview,
  type TimelineEvent,
} from './types'

type Raw = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const oneOf = <T extends string | number>(list: readonly T[], v: unknown): T | null =>
  list.includes(v as T) ? (v as T) : null
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter((x): x is Raw => !!x && typeof x === 'object') : [])

function contact(raw: Raw): Contact {
  return {
    id: str(raw.id) || newId(),
    name: str(raw.name),
    role: str(raw.role),
    email: str(raw.email),
    phone: str(raw.phone),
    linkedin: str(raw.linkedin),
  }
}

function interview(raw: Raw): Interview {
  return {
    id: str(raw.id) || newId(),
    at: str(raw.at),
    durationMin: num(raw.durationMin) ?? 45,
    type: oneOf(INTERVIEW_TYPES, raw.type) ?? 'other',
    location: str(raw.location),
    people: str(raw.people),
    notes: str(raw.notes),
    questions: str(raw.questions),
    outcome: oneOf(INTERVIEW_OUTCOMES, raw.outcome) ?? 'pending',
  }
}

function timelineEvent(raw: Raw): TimelineEvent {
  return {
    id: str(raw.id) || newId(),
    at: str(raw.at),
    type: (str(raw.type) || 'created') as TimelineEvent['type'],
    from: oneOf(STATUSES, raw.from) ?? undefined,
    to: oneOf(STATUSES, raw.to) ?? undefined,
    detail: strOrNull(raw.detail) ?? undefined,
  }
}

/**
 * Turns an untrusted object (Firestore doc, imported JSON) into a well-formed Application.
 * Missing fields get safe defaults; unknown enum values are dropped.
 */
export function normalizeApplication(id: string, raw: Raw): Application {
  const now = new Date().toISOString()
  return {
    id,
    title: str(raw.title),
    company: str(raw.company),
    companyWebsite: str(raw.companyWebsite),
    location: str(raw.location),
    workMode: oneOf(WORK_MODES, raw.workMode),
    employmentType: oneOf(EMPLOYMENT_TYPES, raw.employmentType),
    salaryMin: num(raw.salaryMin),
    salaryMax: num(raw.salaryMax),
    currency: str(raw.currency, 'RON') || 'RON',
    salaryPeriod: oneOf(SALARY_PERIODS, raw.salaryPeriod),
    salaryOffered: num(raw.salaryOffered),
    description: str(raw.description),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    sourceUrl: str(raw.sourceUrl),
    sourceName: oneOf(SOURCES, raw.sourceName) ?? 'other',
    status: oneOf(STATUSES, raw.status) ?? 'saved',
    priority: oneOf(PRIORITIES, raw.priority) ?? 2,
    cvVersion: str(raw.cvVersion),
    appliedAt: strOrNull(raw.appliedAt),
    deadline: strOrNull(raw.deadline),
    nextFollowUpAt: strOrNull(raw.nextFollowUpAt),
    notes: str(raw.notes),
    contacts: arr(raw.contacts).map(contact),
    interviews: arr(raw.interviews).map(interview),
    timeline: arr(raw.timeline).map(timelineEvent),
    archived: raw.archived === true,
    listingClosed: raw.listingClosed === true,
    ghostDismissedAt: strOrNull(raw.ghostDismissedAt),
    demo: raw.demo === true,
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now,
  }
}
