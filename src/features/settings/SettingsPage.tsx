import { ChevronRight, FileText, Keyboard, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Input, Select } from '../../components/Field'
import { Segmented } from '../../components/Menu'
import { Page, PageHeader } from '../../components/Page'
import type { Language } from '../../i18n'
import { CURRENCIES } from '../../lib/money'
import type { ThemePreference } from '../../lib/theme'
import { useUI } from '../../app/UIProvider'
import { useAuth } from '../auth/AuthProvider'
import { DataSection } from './DataSection'
import { SettingsGroup, SettingsRow } from './SettingsLayout'
import styles from './SettingsPage.module.css'
import { useSettings } from './SettingsProvider'

export function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  const { user, signOut } = useAuth()
  const { setShortcutsOpen } = useUI()
  const navigate = useNavigate()

  return (
    <Page width="narrow">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* Pages that have no tab in the phone bottom bar. */}
      <div className={styles.phoneOnly}>
        <SettingsGroup title={t('settings.more')}>
          <SettingsRow label={t('nav.cvs')} hint={t('settings.cvsHint')}>
            <Button icon={<FileText aria-hidden />} onClick={() => navigate('/cvs')}>
              {t('cvs.title')}
              <ChevronRight aria-hidden />
            </Button>
          </SettingsRow>
        </SettingsGroup>
      </div>

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
        <div className={styles.desktopOnly}>
          <SettingsRow label={t('shortcuts.title')} hint={t('shortcuts.hint')}>
            <Button icon={<Keyboard aria-hidden />} onClick={() => setShortcutsOpen(true)}>
              {t('shortcuts.show')}
            </Button>
          </SettingsRow>
        </div>
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

      <DataSection />

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
