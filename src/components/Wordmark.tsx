import type { CSSProperties } from 'react'
import styles from './Wordmark.module.css'

/** Typographic logo: "Ledger." with a single ruled line under the L. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className={styles.wordmark} style={{ fontSize: size } as CSSProperties} aria-label="Ledger">
      <span className={styles.mark} aria-hidden>
        L
      </span>
      <span aria-hidden>edger</span>
      <span className={styles.period} aria-hidden>
        .
      </span>
    </span>
  )
}

export function Monogram() {
  return (
    <span className={styles.monogram} aria-hidden>
      L
    </span>
  )
}
