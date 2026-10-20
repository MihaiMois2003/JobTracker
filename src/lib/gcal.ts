import { addMinutes, format } from 'date-fns'
import { parseDate } from './dates'

/** Builds a "create event" link for Google Calendar; no OAuth involved. */
export function googleCalendarUrl(input: {
  title: string
  /** Local date-time, `yyyy-MM-ddTHH:mm`, or a date `yyyy-MM-dd` for all-day events. */
  start: string
  durationMin?: number
  details?: string
  location?: string
}): string | null {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: input.title })
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.start)) {
    const day = parseDate(input.start)
    if (!day) return null
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    params.set('dates', `${format(day, 'yyyyMMdd')}/${format(next, 'yyyyMMdd')}`)
  } else {
    const start = parseDate(input.start)
    if (!start) return null
    const end = addMinutes(start, input.durationMin ?? 45)
    params.set('dates', `${format(start, "yyyyMMdd'T'HHmmss")}/${format(end, "yyyyMMdd'T'HHmmss")}`)
    params.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone)
  }
  if (input.details) params.set('details', input.details.slice(0, 1500))
  if (input.location) params.set('location', input.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
