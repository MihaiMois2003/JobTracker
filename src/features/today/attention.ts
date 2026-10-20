import { addDays, differenceInCalendarDays, format, startOfWeek } from 'date-fns'
import { daysSince, parseDate, todayISO } from '../../lib/dates'
import { isActive, lastActivityAt } from '../applications/selectors'
import type { Application, Interview } from '../applications/types'

export interface UpcomingInterview {
  app: Application
  interview: Interview
}

export interface Attention {
  /** Follow-ups due today or overdue. */
  followUps: Application[]
  /** Pending interviews from now through the next 7 days. */
  interviews: UpcomingInterview[]
  /** Saved jobs whose application deadline is within 7 days. */
  deadlines: Application[]
  /** Applied a while ago, no answer yet, not stale enough to suggest Ghosted. */
  waiting: Application[]
  /** No activity for `ghostDays`: suggest marking as Ghosted. */
  ghostSuggestions: Application[]
  /** Number shown on the nav badge. */
  count: number
}

const AWAITING = new Set(['applied', 'screening'])

export function computeAttention(items: Application[], ghostDays: number, followUpDays: number, now = new Date()): Attention {
  const today = todayISO()
  const active = items.filter(isActive)

  const followUps = active
    .filter((a) => a.nextFollowUpAt && a.nextFollowUpAt <= today && a.status !== 'saved')
    .sort((a, b) => (a.nextFollowUpAt ?? '').localeCompare(b.nextFollowUpAt ?? ''))

  const horizon = format(addDays(now, 7), "yyyy-MM-dd'T'23:59")
  const nowLocal = format(now, "yyyy-MM-dd'T'HH:mm")
  const interviews: UpcomingInterview[] = []
  for (const app of items) {
    if (app.archived) continue
    for (const interview of app.interviews) {
      // Keep today's interviews visible for a couple of hours after they start.
      const start = parseDate(interview.at)
      const recent = start ? (now.getTime() - start.getTime()) / 3_600_000 < 2 : false
      if (interview.outcome === 'pending' && interview.at <= horizon && (interview.at >= nowLocal || recent)) {
        interviews.push({ app, interview })
      }
    }
  }
  interviews.sort((a, b) => a.interview.at.localeCompare(b.interview.at))

  const deadlines = active
    .filter((a) => {
      if (a.status !== 'saved' || !a.deadline) return false
      const left = differenceInCalendarDays(parseDate(a.deadline) ?? now, now)
      return left >= 0 && left <= 7
    })
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))

  const followUpIds = new Set(followUps.map((a) => a.id))
  const ghostSuggestions: Application[] = []
  const waiting: Application[] = []
  for (const app of active) {
    if (!AWAITING.has(app.status)) continue
    const last = lastActivityAt(app)
    const idle = daysSince(last) ?? 0
    const dismissed = app.ghostDismissedAt && app.ghostDismissedAt > last ? daysSince(app.ghostDismissedAt) ?? 0 : null
    if (idle >= ghostDays && (dismissed === null || dismissed >= ghostDays)) ghostSuggestions.push(app)
    else if (idle >= followUpDays * 2 && !followUpIds.has(app.id)) waiting.push(app)
  }
  ghostSuggestions.sort((a, b) => lastActivityAt(a).localeCompare(lastActivityAt(b)))
  waiting.sort((a, b) => lastActivityAt(a).localeCompare(lastActivityAt(b)))

  const soonInterviews = interviews.filter((i) => {
    const d = parseDate(i.interview.at)
    return d ? differenceInCalendarDays(d, now) <= 1 : false
  }).length
  const soonDeadlines = deadlines.filter((a) => differenceInCalendarDays(parseDate(a.deadline) ?? now, now) <= 3).length

  return {
    followUps,
    interviews,
    deadlines,
    waiting,
    ghostSuggestions,
    count: followUps.length + ghostSuggestions.length + soonInterviews + soonDeadlines,
  }
}

/** Applications sent this week (Monday start). */
export function appliedThisWeek(items: Application[], now = new Date()): number {
  const monday = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return items.filter((a) => a.appliedAt && a.appliedAt >= monday).length
}
