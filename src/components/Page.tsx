import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Page.module.css'

export function Page({
  children,
  width = 'default',
}: {
  children: ReactNode
  width?: 'default' | 'wide' | 'narrow'
}) {
  return <div className={cx(styles.page, width !== 'default' && styles[width])}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className={styles.header}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}

export function Section({
  title,
  meta,
  children,
  id,
}: {
  title: ReactNode
  meta?: ReactNode
  children: ReactNode
  id?: string
}) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHeader}>
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        {meta && <span className={styles.sectionMeta}>{meta}</span>}
      </div>
      {children}
    </section>
  )
}
