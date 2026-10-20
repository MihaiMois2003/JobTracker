import type { ReactNode } from 'react'
import styles from './SettingsPage.module.css'

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
