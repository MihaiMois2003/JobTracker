import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
  type Locale,
} from 'date-fns'
import { enGB, ro } from 'date-fns/locale'
import { currentLanguage } from '../i18n'

export function dateLocale(): Locale {
  return currentLanguage() === 'ro' ? ro : enGB
}

/** Today as `yyyy-MM-dd` in local time. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function addDaysISO(isoDate: string, days: number): string {
  return format(addDays(parseISO(isoDate), days), 'yyyy-MM-dd')
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

/** Whole calendar days from `value` to today (positive = in the past). */
export function daysSince(value: string | null | undefined): number | null {
  const d = parseDate(value)
  return d ? differenceInCalendarDays(new Date(), d) : null
}

/** Whole calendar days from today to `value` (positive = in the future). */
export function daysUntil(value: string | null | undefined): number | null {
  const d = parseDate(value)
  return d ? differenceInCalendarDays(d, new Date()) : null
}

export function formatDate(value: string | null | undefined, pattern = 'd MMM yyyy'): string {
  const d = parseDate(value)
  return d ? format(d, pattern, { locale: dateLocale() }) : ''
}

/** "12 Mar" this year, "12 Mar 2025" otherwise. */
export function formatShortDate(value: string | null | undefined): string {
  const d = parseDate(value)
  if (!d) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return format(d, sameYear ? 'd MMM' : 'd MMM yyyy', { locale: dateLocale() })
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value)
  return d ? format(d, 'EEE d MMM, HH:mm', { locale: dateLocale() }) : ''
}

export function formatTime(value: string | null | undefined): string {
  const d = parseDate(value)
  return d ? format(d, 'HH:mm', { locale: dateLocale() }) : ''
}

export function formatRelative(value: string | null | undefined): string {
  const d = parseDate(value)
  return d ? formatDistanceToNowStrict(d, { addSuffix: true, locale: dateLocale() }) : ''
}
