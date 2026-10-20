import { useTranslation } from 'react-i18next'
import { Page, PageHeader } from '../../components/Page'

export function JobsPage() {
  const { t } = useTranslation()
  return (
    <Page>
      <PageHeader title={t('nav.jobs')} />
    </Page>
  )
}
