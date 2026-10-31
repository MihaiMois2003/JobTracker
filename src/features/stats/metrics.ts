import { addWeeks, differenceInCalendarDays, format, startOfWeek } from 'date-fns'
import { parseDate } from '../../lib/dates'
import type { Application, SourceName, Status, WorkMode } from '../applications/types'

/** Pipeline depth reached; closed statuses keep the depth they had before closing. */
const DEPTH: Partial<Record<Status, number>> = { applied: 1, screening: 2, interview: 3, offer: 4, accepted: 5 }

export function reachedDepth(app: Application): number {
  let depth = DEPTH[app.status] ?? 0
  for (const e of app.timeline) {
    if (e.to) depth = Math.max(depth, DEPTH[e.to] ?? 0)
    if (e.from) depth = Math.max(depth, DEPTH[e.from] ?? 0)
  }
  if (app.interviews.length) depth = Math.max(depth, 3)
  if (app.appliedAt) depth = Math.max(depth, 1)
  return depth
}

/** Sent applications: anything that got past "saved" (including later closed ones). */
export function wasSent(app: Application): boolean {
  return reachedDepth(app) >= 1 || (app.status === 'rejected' && app.appliedAt !== null)
}

/** Any answer from the company: moved past applied, or rejected after applying. */
export function gotResponse(app: Application): boolean {
  return reachedDepth(app) >= 2 || app.status === 'rejected'
}

/** Days between applying and the first status change after it. */
export function daysToFirstResponse(app: Application): number | null {
  const applied = parseDate(app.appliedAt)
  if (!applied) return null
  const first = [...app.timeline]
    .filter((e) => e.type === 'status' && e.to && e.to !== 'applied' && e.to !== 'saved' && e.to !== 'ghosted' && e.to !== 'withdrawn')
    .sort((a, b) => a.at.localeCompare(b.at))
    .find((e) => e.at.slice(0, 10) >= (app.appliedAt ?? ''))
  const at = parseDate(first?.at)
  return at ? Math.max(0, differenceInCalendarDays(at, applied)) : null
}

export interface WeekBucket {
  start: string
  label: string
  count: number
}

export function applicationsPerWeek(items: Application[], weeks = 12, now = new Date()): WeekBucket[] {
  const first = startOfWeek(addWeeks(now, -(weeks - 1)), { weekStartsOn: 1 })
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const d = addWeeks(first, i)
    return { start: format(d, 'yyyy-MM-dd'), label: format(d, 'd.MM'), count: 0 }
  })
  for (const app of items) {
    const d = parseDate(app.appliedAt)
    if (!d) continue
    const idx = Math.floor(differenceInCalendarDays(startOfWeek(d, { weekStartsOn: 1 }), first) / 7)
    if (idx >= 0 && idx < weeks) buckets[idx].count++
  }
  return buckets
}

export interface GroupStat<K extends string> {
  key: K
  sent: number
  responses: number
  interviews: number
}

export function groupStats<K extends string>(items: Application[], keyOf: (a: Application) => K | null): GroupStat<K>[] {
  const map = new Map<K, GroupStat<K>>()
  for (const app of items) {
    if (!wasSent(app)) continue
    const key = keyOf(app)
    if (key === null) continue
    const s = map.get(key) ?? { key, sent: 0, responses: 0, interviews: 0 }
    s.sent++
    if (gotResponse(app)) s.responses++
    if (reachedDepth(app) >= 3) s.interviews++
    map.set(key, s)
  }
  return [...map.values()].sort((a, b) => b.sent - a.sent)
}

export interface Summary {
  sent: number
  responseRate: number | null
  interviewRate: number | null
  offerRate: number | null
  avgDaysToResponse: number | null
  funnel: Array<{ status: 'applied' | 'screening' | 'interview' | 'offer'; count: number }>
  bySource: GroupStat<SourceName>[]
  byWorkMode: Array<{ key: WorkMode | 'unknown'; count: number }>
}

const rate = (part: number, total: number) => (total ? part / total : null)

export function summarize(items: Application[]): Summary {
  const sent = items.filter(wasSent)
  const depths = sent.map(reachedDepth)
  const responses = sent.filter(gotResponse).length
  const waits = sent.map(daysToFirstResponse).filter((d): d is number => d !== null)

  const modes = new Map<WorkMode | 'unknown', number>()
  for (const app of items) {
    const key = app.workMode ?? 'unknown'
    modes.set(key, (modes.get(key) ?? 0) + 1)
  }

  return {
    sent: sent.length,
    responseRate: rate(responses, sent.length),
    interviewRate: rate(depths.filter((d) => d >= 3).length, sent.length),
    offerRate: rate(depths.filter((d) => d >= 4).length, sent.length),
    avgDaysToResponse: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
    funnel: (['applied', 'screening', 'interview', 'offer'] as const).map((status, i) => ({
      status,
      count: depths.filter((d) => d >= i + 1).length,
    })),
    bySource: groupStats(items, (a) => a.sourceName),
    byWorkMode: (['remote', 'hybrid', 'onsite', 'unknown'] as const)
      .map((key) => ({ key, count: modes.get(key) ?? 0 }))
      .filter((m) => m.count > 0),
  }
}
