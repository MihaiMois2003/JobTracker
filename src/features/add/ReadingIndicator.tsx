import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ReadingIndicator.module.css'

/** "Reading the listing…": ruled lines fill in one by one, like someone taking notes. */
export function ReadingIndicator({ url }: { url: string }) {
  const { t } = useTranslation()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // Pasted text has no URL.
  }

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.sheet} aria-hidden>
        {[72, 94, 58, 86, 40].map((w, i) => (
          <span key={i} className={styles.line} style={{ width: `${w}%`, animationDelay: `${i * 260}ms` }} />
        ))}
      </div>
      <p className={styles.title}>{t('add.reading')}</p>
      <p className={styles.sub}>{slow ? t('add.readingSlow') : host ? t('add.readingFrom', { host }) : t('add.readingText')}</p>
    </div>
  )
}
