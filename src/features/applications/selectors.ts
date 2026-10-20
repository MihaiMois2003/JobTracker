import {
  isClosed,
  type Application,
  type Priority,
  type SourceName,
  type Status,
  type WorkMode,
} from './types'

export interface Filters {
  q: string
  statuses: Status[]
  sources: SourceName[]
  workModes: WorkMode[]
  priorities: Priority[]
  tag: string | null
  /** Applied-at range, `yyyy-MM-dd`. */
  from: string | null
  to: string | null
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  statuses: [],
  sources: [],
  workModes: [],
  priorities: [],
  tag: null,
  from: null,
  to: null,
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.statuses.length ? 1 : 0) +
    (f.sources.length ? 1 : 0) +
    (f.workModes.length ? 1 : 0) +
    (f.priorities.length ? 1 : 0) +
    (f.tag ? 1 : 0) +
    (f.from || f.to ? 1 : 0)
  )
}

/** On the board / in the default list: not archived and not in a final status. */
export function isActive(app: Application): boolean {
  return !app.archived && !isClosed(app.status)
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function matchesQuery(app: Application, q: string): boolean {
  const needle = fold(q.trim())
  if (!needle) return true
  const hay = fold(
    [app.title, app.company, app.location, app.cvVersion, app.tags.join(' '), app.notes, app.sourceName].join(' '),
  )
  return needle.split(/\s+/).every((word) => hay.includes(word))
}

export function applyFilters(items: Application[], f: Filters): Application[] {
  return items.filter((a) => {
    if (!matchesQuery(a, f.q)) return false
    if (f.statuses.length && !f.statuses.includes(a.status)) return false
    if (f.sources.length && !f.sources.includes(a.sourceName)) return false
    if (f.workModes.length && (!a.workMode || !f.workModes.includes(a.workMode))) return false
    if (f.priorities.length && !f.priorities.includes(a.priority)) return false
    if (f.tag && !a.tags.includes(f.tag)) return false
    if (f.from && (!a.appliedAt || a.appliedAt < f.from)) return false
    if (f.to && (!a.appliedAt || a.appliedAt > f.to)) return false
    return true
  })
}

export function allTags(items: Application[]): string[] {
  const counts = new Map<string, number>()
  for (const a of items) for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)
}

/** ISO timestamp of the latest meaningful activity (status change, interview, etc.). */
export function lastActivityAt(app: Application): string {
  let latest = app.appliedAt ?? app.createdAt
  for (const e of app.timeline) if (e.at > latest) latest = e.at
  for (const i of app.interviews) if (i.at > latest && i.at <= new Date().toISOString()) latest = i.at
  return latest
}

/** Board order: priority first, then most recently touched. */
export function boardOrder(a: Application, b: Application): number {
  return b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt)
}

export type SortKey = 'company' | 'status' | 'appliedAt' | 'priority' | 'updatedAt' | 'source'
export type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<Status, number> = {
  saved: 0,
  applied: 1,
  screening: 2,
  interview: 3,
  offer: 4,
  accepted: 5,
  rejected: 6,
  ghosted: 7,
  withdrawn: 8,
}

export function sortApplications(items: Application[], key: SortKey, dir: SortDir): Application[] {
  const m = dir === 'asc' ? 1 : -1
  const cmp = (a: Application, b: Application): number => {
    switch (key) {
      case 'company':
        return (a.company || a.title).localeCompare(b.company || b.title)
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      case 'appliedAt':
        // Empty dates sink to the bottom regardless of direction.
        if (!a.appliedAt || !b.appliedAt) return a.appliedAt ? -m : b.appliedAt ? m : 0
        return a.appliedAt.localeCompare(b.appliedAt)
      case 'priority':
        return a.priority - b.priority
      case 'source':
        return a.sourceName.localeCompare(b.sourceName)
      case 'updatedAt':
        return a.updatedAt.localeCompare(b.updatedAt)
    }
  }
  return [...items].sort((a, b) => cmp(a, b) * m || b.updatedAt.localeCompare(a.updatedAt))
}
