import type { Language } from '../../i18n'
import type { ThemePreference } from '../../lib/theme'

export interface Settings {
  /** `null` = follow the browser. */
  language: Language | null
  theme: ThemePreference
  followUpDays: number
  ghostDays: number
  weeklyGoal: number
  currency: string
  jobsView: 'board' | 'list'
}

export const DEFAULT_SETTINGS: Settings = {
  language: null,
  theme: 'system',
  followUpDays: 7,
  ghostDays: 21,
  weeklyGoal: 10,
  currency: 'RON',
  jobsView: 'board',
}
