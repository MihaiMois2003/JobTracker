import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '../components/Feedback'
import { Page } from '../components/Page'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <Page>
      <EmptyState icon={<Compass aria-hidden />} title={t('errors.notFound')} action={<Link to="/">{t('errors.backHome')}</Link>} />
    </Page>
  )
}
