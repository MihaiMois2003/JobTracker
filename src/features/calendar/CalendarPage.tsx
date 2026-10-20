import { useTranslation } from 'react-i18next'
import { Page, PageHeader } from '../../components/Page'

export function CalendarPage() {
  const { t } = useTranslation()
  return (
    <Page>
      <PageHeader title={t('nav.calendar')} />
    </Page>
  )
}
