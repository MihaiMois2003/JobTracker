import { createBrowserRouter } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { JobsPage } from '../features/jobs/JobsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StatsPage } from '../features/stats/StatsPage'
import { TodayPage } from '../features/today/TodayPage'
import { NotFound } from './NotFound'
import { ProtectedRoot } from './ProtectedRoot'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoot />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
