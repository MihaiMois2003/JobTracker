import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../components/Toast'
import type { Application } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import { ExtractionError, extractFromLink } from '../add/extraction'

const isEmpty = (v: unknown) => v === null || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * Re-reads the listing behind `sourceUrl`. Only empty fields are filled, so nothing the user
 * edited is overwritten. A 404 marks the listing as closed.
 */
export function useReloadFromLink() {
  const { t } = useTranslation()
  const actions = useApplicationActions()
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = async (app: Application) => {
    if (!app.sourceUrl || busyId) return
    setBusyId(app.id)
    try {
      const { job } = await extractFromLink(app.sourceUrl, true)
      const patch: Partial<Application> = {}
      const fill = <K extends keyof Application>(key: K, value: Application[K] | null | undefined) => {
        if (value !== null && value !== undefined && !isEmpty(value) && isEmpty(app[key])) patch[key] = value
      }
      fill('title', job.title)
      fill('company', job.company)
      fill('companyWebsite', job.companyWebsite)
      fill('location', job.location)
      fill('workMode', job.workMode)
      fill('employmentType', job.employmentType)
      fill('description', job.description)
      fill('tags', job.tags)
      fill('deadline', job.deadline)
      if (app.salaryMin === null && app.salaryMax === null && (job.salaryMin !== null || job.salaryMax !== null)) {
        Object.assign(patch, {
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency ?? app.currency,
          salaryPeriod: job.salaryPeriod,
        })
      }
      const changed = Object.keys(patch).length
      actions.addEvent(app.id, 'reloaded', { ...patch, listingClosed: false })
      toast({ message: changed ? t('job.reload.updated', { count: changed }) : t('job.reload.upToDate') })
    } catch (err) {
      const reason = err instanceof ExtractionError ? err.reason : 'internal'
      if (reason === 'not_found') {
        if (!app.listingClosed) actions.addEvent(app.id, 'listing_closed', { listingClosed: true })
        toast({ message: t('job.reload.closed') })
      } else {
        toast({ message: t(`add.failures.${reason}`), tone: 'danger' })
      }
    } finally {
      setBusyId(null)
    }
  }

  return { reload, busyId }
}
