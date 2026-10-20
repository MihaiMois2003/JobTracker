import type { Application, Interview } from '../applications/types'
import { isActive } from '../applications/selectors'

export type EventKind = 'interview' | 'deadline' | 'followup'

export interface CalendarEvent {
  id: string
  kind: EventKind
  /** `yyyy-MM-dd` */
  date: string
  /** `HH:mm`, interviews only. */
  time: string | null
  app: Application
  interview?: Interview
}

/** Interviews (any status), deadlines of unapplied jobs, and pending follow-ups. */
export function collectEvents(items: Application[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const app of items) {
    if (app.archived) continue
    for (const iv of app.interviews) {
      if (!iv.at) continue
      events.push({ id: `iv-${iv.id}`, kind: 'interview', date: iv.at.slice(0, 10), time: iv.at.slice(11, 16) || null, app, interview: iv })
    }
    if (!isActive(app)) continue
    if (app.deadline && app.status === 'saved') {
      events.push({ id: `dl-${app.id}`, kind: 'deadline', date: app.deadline, time: null, app })
    }
    if (app.nextFollowUpAt && app.status !== 'saved') {
      events.push({ id: `fu-${app.id}`, kind: 'followup', date: app.nextFollowUpAt, time: null, app })
    }
  }
  return events.sort((a, b) => (a.date + (a.time ?? '99')).localeCompare(b.date + (b.time ?? '99')))
}
