import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Input, Select } from '../../components/Field'
import { Segmented } from '../../components/Menu'
import { Page, PageHeader } from '../../components/Page'
import type { Language } from '../../i18n'
import { CURRENCIES } from '../../lib/money'
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

      <SettingsGroup title={t('settings.rhythm')}>
        <SettingsRow label={t('settings.followUpDays')} hint={t('settings.followUpDaysHint')}>
          <NumberSetting
            label={t('settings.followUpDays')}
            value={settings.followUpDays}
            min={1}
            max={60}
            suffix={t('settings.days')}
            onCommit={(followUpDays) => update({ followUpDays })}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.ghostDays')} hint={t('settings.ghostDaysHint')}>
          <NumberSetting
            label={t('settings.ghostDays')}
            value={settings.ghostDays}
            min={3}
            max={120}
            suffix={t('settings.days')}
            onCommit={(ghostDays) => update({ ghostDays })}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.weeklyGoal')} hint={t('settings.weeklyGoalHint')}>
          <NumberSetting
            label={t('settings.weeklyGoal')}
            value={settings.weeklyGoal}
            min={0}
            max={100}
            suffix={t('settings.perWeek')}
            onCommit={(weeklyGoal) => update({ weeklyGoal })}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.currency')} hint={t('settings.currencyHint')}>
          <Select
            aria-label={t('settings.currency')}
            className={styles.currency}
            value={settings.currency}
            onChange={(e) => update({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
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

function NumberSetting({
  label,
  value,
  min,
  max,
  suffix,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setDraft(String(value))
  }
  const commit = () => {
    const n = Math.round(Number(draft))
    if (!Number.isFinite(n) || draft.trim() === '') {
      setDraft(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, n))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }
  return (
    <span className={styles.number}>
      <Input
        aria-label={label}
        inputMode="numeric"
        className={styles.numberInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <span className={styles.suffix}>{suffix}</span>
    </span>
  )
}
