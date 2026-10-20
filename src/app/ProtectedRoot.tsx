import { RequireAuth } from '../features/auth/RequireAuth'
import { SettingsProvider } from '../features/settings/SettingsProvider'
import { AppShell } from './AppShell'
import { ShellSkeleton } from './ShellSkeleton'
import { UIProvider } from './UIProvider'

export function ProtectedRoot() {
  return (
    <RequireAuth fallback={<ShellSkeleton />}>
      <SettingsProvider>
        <UIProvider>
          <AppShell attention={0} />
        </UIProvider>
      </SettingsProvider>
    </RequireAuth>
  )
}
