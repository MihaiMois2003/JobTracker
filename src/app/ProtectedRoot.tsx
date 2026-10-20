import { AddJobDialog } from '../features/add/AddJobDialog'
import { ApplicationsProvider } from '../features/applications/ApplicationsProvider'
import { RequireAuth } from '../features/auth/RequireAuth'
import { JobPanel } from '../features/job/JobPanel'
import { SettingsProvider } from '../features/settings/SettingsProvider'
import { useAttention } from '../features/today/useAttention'
import { AppShell } from './AppShell'
import { ShellSkeleton } from './ShellSkeleton'
import { UIProvider } from './UIProvider'

export function ProtectedRoot() {
  return (
    <RequireAuth fallback={<ShellSkeleton />}>
      <SettingsProvider>
        <ApplicationsProvider>
          <UIProvider>
            <Shell />
          </UIProvider>
        </ApplicationsProvider>
      </SettingsProvider>
    </RequireAuth>
  )
}

function Shell() {
  const { count } = useAttention()
  return (
    <AppShell
      attention={count}
      overlays={
        <>
          <AddJobDialog />
          <JobPanel />
        </>
      }
    />
  )
}
