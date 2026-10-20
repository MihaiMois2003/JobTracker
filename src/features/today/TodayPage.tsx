import { useTranslation } from 'react-i18next'
import { Page, PageHeader } from '../../components/Page'

export function TodayPage() {
  const { t } = useTranslation()
  return (
    <Page>
      <PageHeader title={t('nav.today')} />
    </Page>
  )
}
