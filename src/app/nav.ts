import { CalendarDays, ChartColumn, Kanban, Settings, Sun, type LucideIcon } from 'lucide-react'

export type NavKey = 'today' | 'jobs' | 'calendar' | 'stats' | 'settings'

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
  { key: 'calendar', to: '/calendar', icon: CalendarDays, mobile: false },
  { key: 'stats', to: '/stats', icon: ChartColumn, mobile: true },
  { key: 'settings', to: '/settings', icon: Settings, mobile: true },
]
