import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { STATUS_ICON, statusVars } from '../features/applications/status'
import { PRIORITY_KEY, type Priority, type Status } from '../features/applications/types'
import { cx } from '../lib/cx'
import styles from './Badge.module.css'

export function StatusBadge({ status, compact }: { status: Status; compact?: boolean }) {
  const { t } = useTranslation()
  const Icon = STATUS_ICON[status]
  const v = statusVars(status)
  return (
    <span
      className={cx(styles.status, compact && styles.compact)}
      style={{ '--fg': v.fg, '--bg': v.bg } as CSSProperties}
    >
      <Icon aria-hidden />
      {t(`status.${status}`)}
    </span>
  )
}

export function StatusDot({ status }: { status: Status }) {
  return <span className={styles.dot} style={{ '--solid': statusVars(status).solid } as CSSProperties} aria-hidden />
}

export function Tag({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <span className={styles.tag}>
      {children}
      {onRemove && (
        <button type="button" className={styles.tagRemove} onClick={onRemove} aria-label={removeLabel}>
          <X aria-hidden />
        </button>
      )}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>
}

export function PriorityMark({ priority }: { priority: Priority }) {
  const { t } = useTranslation()
  const label = `${t('priority.label')}: ${t(`priority.${PRIORITY_KEY[priority]}`)}`
  return (
    <span className={styles.priority} data-level={priority} role="img" aria-label={label} title={label}>
      {[1, 2, 3].map((n) => (
        <span key={n} data-on={n <= priority ? '' : undefined} />
      ))}
    </span>
  )
}

export function CountBadge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null
  return (
    <span className={styles.count} aria-label={label}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
