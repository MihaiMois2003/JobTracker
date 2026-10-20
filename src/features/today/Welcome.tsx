import { ArrowRight, Link2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button } from '../../components/Button'
import { Wordmark } from '../../components/Wordmark'
import { useAuth } from '../auth/AuthProvider'
import styles from './Welcome.module.css'

/** First run: one big field, one sentence. */
export function Welcome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { openAdd } = useUI()
  const [url, setUrl] = useState('')
  const name = user?.displayName?.split(' ')[0] ?? ''

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <Wordmark size={28} />
        <h1 className={styles.title}>
          {t('welcome.title')}
          {name && `, ${name}`}
        </h1>
        <p className={styles.lead}>{t('welcome.lead')}</p>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            openAdd(url.trim())
          }}
        >
          <label className={styles.field}>
            <Link2 aria-hidden />
            <span className="visually-hidden">{t('add.linkLabel')}</span>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={t('welcome.placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text').trim()
                if (/^https?:\/\//i.test(text)) {
                  e.preventDefault()
                  setUrl(text)
                  openAdd(text)
                }
              }}
            />
          </label>
          <Button type="submit" variant="primary" size="lg" icon={<ArrowRight aria-hidden />}>
            {t('welcome.go')}
          </Button>
        </form>
        <button type="button" className={styles.manual} onClick={() => openAdd()}>
          {t('welcome.noLink')}
        </button>
      </div>
    </div>
  )
}
