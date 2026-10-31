import { CalendarDays, ChartColumn, FileText, Kanban, Settings, Sun, type LucideIcon } from 'lucide-react'

export type NavKey = 'today' | 'jobs' | 'cvs' | 'calendar' | 'stats' | 'settings'

export interface NavItem {
  key: NavKey
  to: string
  icon: LucideIcon
  /** Shown in the phone bottom bar. */
  mobile: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'today', to: '/', icon: Sun, mobile: true },
  { key: 'jobs', to: '/jobs', icon: Kanban, mobile: true },
  // Phones reach CVs from Settings, so the bottom bar keeps four tabs.
  { key: 'cvs', to: '/cvs', icon: FileText, mobile: false },
  { key: 'calendar', to: '/calendar', icon: CalendarDays, mobile: false },
  { key: 'stats', to: '/stats', icon: ChartColumn, mobile: true },
  { key: 'settings', to: '/settings', icon: Settings, mobile: true },
]
