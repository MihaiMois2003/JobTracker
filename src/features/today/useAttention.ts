import { useMemo } from 'react'
import { useApplications } from '../applications/ApplicationsProvider'
import { useSettings } from '../settings/SettingsProvider'
import { computeAttention } from './attention'

export function useAttention() {
  const { items } = useApplications()
  const { settings } = useSettings()
  return useMemo(
    () => computeAttention(items, settings.ghostDays, settings.followUpDays),
    [items, settings.ghostDays, settings.followUpDays],
  )
}
