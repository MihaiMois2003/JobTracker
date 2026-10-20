import { AddJobDialog } from '../features/add/AddJobDialog'
import { ApplicationsProvider } from '../features/applications/ApplicationsProvider'
import { RequireAuth } from '../features/auth/RequireAuth'
import { JobPanel } from '../features/job/JobPanel'
import { SettingsProvider } from '../features/settings/SettingsProvider'
import { useAttention } from '../features/today/useAttention'
import { AppShell } from './AppShell'
import { CommandPalette } from './CommandPalette'
import { ShortcutsDialog } from './ShortcutsDialog'
import { ShellSkeleton } from './ShellSkeleton'
import { UIProvider } from './UIProvider'
import { useShortcuts } from './useShortcuts'

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
  useShortcuts()
  return (
    <AppShell
      attention={count}
      overlays={
        <>
          <AddJobDialog />
          <JobPanel />
          <CommandPalette />
          <ShortcutsDialog />
        </>
      }
    />
  )
}
