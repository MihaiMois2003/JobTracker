import type { ApplicationDraft } from '../applications/types'

export type DraftErrors = Partial<Record<'title' | 'company' | 'sourceUrl' | 'salary', string>>

export function validateDraft(d: ApplicationDraft, t: (k: 'add.errors.title' | 'add.errors.company' | 'add.errors.url' | 'add.errors.salary') => string): DraftErrors {
  const e: DraftErrors = {}
  if (!d.title.trim()) e.title = t('add.errors.title')
  if (!d.company.trim()) e.company = t('add.errors.company')
  if (d.sourceUrl && !/^https?:\/\/\S+$/i.test(d.sourceUrl.trim())) e.sourceUrl = t('add.errors.url')
  if (d.salaryMin !== null && d.salaryMax !== null && d.salaryMin > d.salaryMax) e.salary = t('add.errors.salary')
  return e
}
