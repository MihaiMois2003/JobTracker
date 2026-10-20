import { createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { JobsPage } from '../features/jobs/JobsPage'
import { TodayPage } from '../features/today/TodayPage'
import { NotFound } from './NotFound'
import { ProtectedRoot } from './ProtectedRoot'

// Today and Jobs are the daily screens and ship in the main bundle; the rest load on demand.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoot />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'calendar', lazy: async () => ({ Component: (await import('../features/calendar/CalendarPage')).CalendarPage }) },
      { path: 'stats', lazy: async () => ({ Component: (await import('../features/stats/StatsPage')).StatsPage }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('../features/settings/SettingsPage')).SettingsPage }) },
      { path: '*', element: <NotFound /> },
    ],
  },
])
