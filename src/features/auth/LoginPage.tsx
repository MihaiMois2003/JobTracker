import { FirebaseError } from 'firebase/app'
import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'
import { Button } from '../../components/Button'
import { Wordmark } from '../../components/Wordmark'
import { auth, googleProvider } from '../../lib/firebase'
import { useAuth } from './AuthProvider'
import styles from './LoginPage.module.css'

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const signIn = async () => {
    setPending(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(t('auth.errors.popupClosed'))
      } else if (code === 'auth/network-request-failed') {
        setError(t('auth.errors.network'))
      } else {
        setError(t('auth.errors.generic'))
      }
      setPending(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Wordmark size={34} />
        <h1 className={styles.title}>{t('auth.title')}</h1>
        <p className={styles.lead}>{t('auth.lead')}</p>
        <Button variant="secondary" size="lg" block onClick={signIn} loading={pending} icon={<GoogleGlyph />}>
          {pending ? t('auth.signingIn') : t('auth.continueWithGoogle')}
        </Button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.fineprint}>{t('auth.privacy')}</p>
      </div>
      <Ruled />
    </main>
  )
}

/** Decorative ledger rules, quiet in the background. */
function Ruled() {
  return <div className={styles.rules} aria-hidden />
}
