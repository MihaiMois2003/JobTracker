import { AddJobDialog } from '../features/add/AddJobDialog'
import { ApplicationsProvider } from '../features/applications/ApplicationsProvider'
import { RequireAuth } from '../features/auth/RequireAuth'
import { JobPanel } from '../features/job/JobPanel'
import { SettingsProvider } from '../features/settings/SettingsProvider'
import { AppShell } from './AppShell'
import { ShellSkeleton } from './ShellSkeleton'
import { UIProvider } from './UIProvider'

export function ProtectedRoot() {
  return (
    <RequireAuth fallback={<ShellSkeleton />}>
      <SettingsProvider>
        <ApplicationsProvider>
          <UIProvider>
            <AppShell
              attention={0}
              overlays={
                <>
                  <AddJobDialog />
                  <JobPanel />
                </>
              }
            />
          </UIProvider>
        </ApplicationsProvider>
      </SettingsProvider>
    </RequireAuth>
  )
}
