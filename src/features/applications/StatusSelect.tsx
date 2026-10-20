import { Check, ChevronDown } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogBody, DialogHeader } from '../../components/Dialog'
import { Menu } from '../../components/Menu'
import { useIsPhone } from '../../lib/useMediaQuery'
import { STATUS_ICON, statusVars } from './status'
import styles from './StatusSelect.module.css'
import { CLOSED_STATUSES, PIPELINE_STATUSES, type Status } from './types'

interface StatusSelectProps {
  value: Status
  onChange: (status: Status) => void
  /** Smaller trigger for list rows. */
  compact?: boolean
  /** Extra context for screen readers, e.g. the job title. */
  context?: string
}

/** Status chip that opens a menu on desktop and a bottom sheet on phones. */
export function StatusSelect({ value, onChange, compact, context }: StatusSelectProps) {
  const { t } = useTranslation()
  const isPhone = useIsPhone()
  const [sheetOpen, setSheetOpen] = useState(false)
  const Icon = STATUS_ICON[value]
  const v = statusVars(value)
  const label = context ? t('status.changeFor', { job: context }) : t('status.change')

  const chip = (props: Record<string, unknown>) => (
    <button
      type="button"
      className={styles.trigger}
      data-compact={compact ? '' : undefined}
      style={{ '--fg': v.fg, '--bg': v.bg } as CSSProperties}
      aria-label={`${label}: ${t(`status.${value}`)}`}
      {...props}
    >
      <Icon aria-hidden />
      <span>{t(`status.${value}`)}</span>
      <ChevronDown aria-hidden className={styles.chevron} />
    </button>
  )

  if (isPhone) {
    return (
      <>
        {chip({ onClick: () => setSheetOpen(true), 'aria-haspopup': 'dialog' })}
        <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} variant="sheet" label={label}>
          <DialogHeader title={t('status.change')} description={context} onClose={() => setSheetOpen(false)} />
          <DialogBody>
            <StatusOptions
              value={value}
              onPick={(s) => {
                setSheetOpen(false)
                onChange(s)
              }}
            />
          </DialogBody>
        </Dialog>
      </>
    )
  }

  const item = (s: Status) => {
    const SIcon = STATUS_ICON[s]
    return {
      key: s,
      label: t(`status.${s}`),
      checked: s === value,
      icon: <SIcon aria-hidden style={{ color: statusVars(s).solid }} />,
      onSelect: () => onChange(s),
    }
  }

  return (
    <Menu
      label={label}
      align="start"
      trigger={(props) => chip(props)}
      items={[...PIPELINE_STATUSES.map(item), 'separator', ...CLOSED_STATUSES.map(item)]}
    />
  )
}

function StatusOptions({ value, onPick }: { value: Status; onPick: (s: Status) => void }) {
  const { t } = useTranslation()
  const option = (s: Status) => {
    const SIcon = STATUS_ICON[s]
    const v = statusVars(s)
    return (
      <li key={s}>
        <button
          type="button"
          className={styles.option}
          aria-pressed={s === value}
          onClick={() => onPick(s)}
          style={{ '--solid': v.solid, '--fg': v.fg, '--bg': v.bg } as CSSProperties}
        >
          <span className={styles.optionIcon}>
            <SIcon aria-hidden />
          </span>
          {t(`status.${s}`)}
          {s === value && <Check aria-hidden className={styles.check} />}
        </button>
      </li>
    )
  }
  return (
    <div className={styles.options}>
      <ul>{PIPELINE_STATUSES.map(option)}</ul>
      <p className={styles.groupLabel}>{t('status.closedGroup')}</p>
      <ul>{CLOSED_STATUSES.map(option)}</ul>
    </div>
  )
}
