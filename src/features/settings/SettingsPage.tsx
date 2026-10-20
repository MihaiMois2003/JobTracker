import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/Menu'
import { Page, PageHeader } from '../../components/Page'
import type { Language } from '../../i18n'
import type { ThemePreference } from '../../lib/theme'
import { useAuth } from '../auth/AuthProvider'
import styles from './SettingsPage.module.css'
import { useSettings } from './SettingsProvider'

export function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  const { user, signOut } = useAuth()

  return (
    <Page width="narrow">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <SettingsGroup title={t('settings.appearance')}>
        <SettingsRow label={t('language.label')} hint={t('settings.languageHint')}>
          <Segmented<'auto' | Language>
            label={t('language.label')}
            value={settings.language ?? 'auto'}
            onChange={(v) => update({ language: v === 'auto' ? null : v })}
            options={[
              { value: 'auto', label: t('settings.auto') },
              { value: 'ro', label: t('language.ro') },
              { value: 'en', label: t('language.en') },
            ]}
          />
        </SettingsRow>
        <SettingsRow label={t('theme.label')}>
          <Segmented<ThemePreference>
            label={t('theme.label')}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'system', label: t('theme.system'), icon: <Monitor aria-hidden /> },
              { value: 'light', label: t('theme.light'), icon: <Sun aria-hidden /> },
              { value: 'dark', label: t('theme.dark'), icon: <Moon aria-hidden /> },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title={t('settings.account')}>
        <SettingsRow label={user?.displayName ?? ''} hint={user?.email ?? ''}>
          <Button variant="secondary" icon={<LogOut aria-hidden />} onClick={() => void signOut()}>
            {t('auth.signOut')}
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </Page>
  )
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <div className={styles.rows}>{children}</div>
    </section>
  )
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowLabel}>{label}</p>
        {hint && <p className={styles.rowHint}>{hint}</p>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  )
}
