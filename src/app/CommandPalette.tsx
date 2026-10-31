import {
  CalendarDays,
  ChartColumn,
  CornerDownLeft,
  FileText,
  Kanban,
  Keyboard,
  List,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { StatusDot } from '../components/Badge'
import { Dialog } from '../components/Dialog'
import { cx } from '../lib/cx'
import { useApplications } from '../features/applications/ApplicationsProvider'
import { matchesQuery } from '../features/applications/selectors'
import type { Application } from '../features/applications/types'
import { useSettings } from '../features/settings/SettingsProvider'
import styles from './CommandPalette.module.css'
import { useUI } from './UIProvider'

interface Command {
  id: string
  label: string
  hint?: string
  icon?: LucideIcon
  app?: Application
  run: () => void
}

export function CommandPalette() {
  const { t } = useTranslation()
  const { paletteOpen, setPaletteOpen } = useUI()
  return (
    <Dialog open={paletteOpen} onClose={() => setPaletteOpen(false)} label={t('palette.label')} className={styles.dialog}>
      {paletteOpen && <PaletteBody onClose={() => setPaletteOpen(false)} />}
    </Dialog>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { openAdd, openJob, setShortcutsOpen } = useUI()
  const { items } = useApplications()
  const { settings, update } = useSettings()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const actions = useMemo<Command[]>(() => {
    const dark = document.documentElement.dataset.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    return [
      { id: 'add', label: t('nav.addJob'), icon: Plus, hint: 'N', run: () => openAdd() },
      { id: 'today', label: t('palette.goTo', { page: t('nav.today') }), icon: Sun, run: () => navigate('/') },
      {
        id: 'board',
        label: t('palette.goTo', { page: t('jobs.view.board') }),
        icon: Kanban,
        run: () => {
          update({ jobsView: 'board' })
          navigate('/jobs')
        },
      },
      {
        id: 'list',
        label: t('palette.goTo', { page: t('jobs.view.list') }),
        icon: List,
        run: () => {
          update({ jobsView: 'list' })
          navigate('/jobs')
        },
      },
      { id: 'cvs', label: t('palette.goTo', { page: t('nav.cvs') }), icon: FileText, run: () => navigate('/cvs') },
      { id: 'upload-cv', label: t('cvs.upload'), icon: Upload, run: () => navigate('/cvs?upload=1') },
      { id: 'calendar', label: t('palette.goTo', { page: t('nav.calendar') }), icon: CalendarDays, run: () => navigate('/calendar') },
      { id: 'stats', label: t('palette.goTo', { page: t('nav.stats') }), icon: ChartColumn, run: () => navigate('/stats') },
      { id: 'settings', label: t('palette.goTo', { page: t('nav.settings') }), icon: Settings, run: () => navigate('/settings') },
      {
        id: 'theme',
        label: dark ? t('palette.lightTheme') : t('palette.darkTheme'),
        icon: dark ? Sun : Moon,
        run: () => update({ theme: dark ? 'light' : 'dark' }),
      },
      { id: 'shortcuts', label: t('shortcuts.title'), icon: Keyboard, hint: '?', run: () => setShortcutsOpen(true) },
    ]
  }, [t, navigate, openAdd, update, setShortcutsOpen, settings.theme])

  const q = query.trim().toLowerCase()
  const commands = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions
  const jobs: Command[] = (q ? items.filter((a) => matchesQuery(a, q)) : items.slice(0, 5)).slice(0, 8).map((app) => ({
    id: `job-${app.id}`,
    label: `${app.title} · ${app.company}`,
    hint: t(`status.${app.status}`),
    app,
    run: () => openJob(app.id),
  }))
  const all = [...jobs, ...commands]
  const index = Math.min(active, Math.max(0, all.length - 1))

  const run = (cmd: Command | undefined) => {
    if (!cmd) return
    onClose()
    // Let the palette close before the next dialog opens.
    requestAnimationFrame(() => cmd.run())
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((index + 1) % Math.max(1, all.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((index - 1 + all.length) % Math.max(1, all.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(all[index])
    }
  }

  const option = (cmd: Command, i: number) => {
    const Icon = cmd.icon
    return (
      <li
        key={cmd.id}
        id={`cmd-${cmd.id}`}
        role="option"
        aria-selected={i === index}
        className={cx(styles.option, i === index && styles.active)}
        onMouseMove={() => setActive(i)}
        onClick={() => run(cmd)}
      >
        <span className={styles.optionIcon}>{cmd.app ? <StatusDot status={cmd.app.status} /> : Icon && <Icon aria-hidden />}</span>
        <span className={styles.optionLabel}>{cmd.label}</span>
        {cmd.hint && <span className={styles.optionHint}>{cmd.hint}</span>}
        {i === index && <CornerDownLeft aria-hidden className={styles.enter} />}
      </li>
    )
  }

  return (
    <div className={styles.palette}>
      <div className={styles.searchRow}>
        <Search aria-hidden />
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={all[index] ? `cmd-${all[index].id}` : undefined}
          aria-label={t('palette.label')}
          placeholder={t('palette.placeholder')}
          value={query}
          data-autofocus
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKey}
        />
      </div>
      <ul id="palette-list" role="listbox" className={styles.list} aria-label={t('palette.results')}>
        {jobs.length > 0 && (
          <li role="presentation" className={styles.group}>
            {q ? t('palette.jobs') : t('palette.recent')}
          </li>
        )}
        {jobs.map((cmd, i) => option(cmd, i))}
        {commands.length > 0 && (
          <li role="presentation" className={styles.group}>
            {t('palette.actions')}
          </li>
        )}
        {commands.map((cmd, i) => option(cmd, jobs.length + i))}
        {all.length === 0 && (
          <li role="presentation" className={styles.none}>
            {t('palette.none')}
          </li>
        )}
      </ul>
    </div>
  )
}
