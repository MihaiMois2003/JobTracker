import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Feedback.module.css'

export function Skeleton({
  width = '100%',
  height = 14,
  radius,
  className,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius } as CSSProperties}
    />
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  )
}

export function Banner({
  tone = 'neutral',
  icon,
  children,
  actions,
  className,
}: {
  tone?: 'neutral' | 'warning' | 'danger' | 'accent'
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cx(styles.banner, className)} data-tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
      {icon}
      <div className={styles.bannerBody}>
        {children}
        {actions && <div className={styles.bannerActions}>{actions}</div>}
      </div>
    </div>
  )
}
