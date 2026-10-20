import { Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { CountBadge, Kbd } from '../components/Badge'
import { Monogram, Wordmark } from '../components/Wordmark'
import { cx } from '../lib/cx'
import styles from './AppShell.module.css'
import { NAV_ITEMS, type NavKey } from './nav'
import { useUI } from './UIProvider'

interface AppShellProps {
  /** Number of items that need attention; shown on the Today nav item. */
  attention: number
  /** Global overlays (add job, job panel, palette...). */
  overlays?: ReactNode
}

export function AppShell({ attention, overlays }: AppShellProps) {
  const { t } = useTranslation()
  const { openAdd } = useUI()
  const online = useOnline()
  const attentionLabel = t('nav.attention', { count: attention })

  const badgeFor = (key: NavKey) =>
    key === 'today' ? <CountBadge count={attention} label={attentionLabel} /> : null

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        {t('app.skipToContent')}
      </a>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandFull}>
            <Wordmark size={24} />
          </span>
          <span className={styles.brandCompact}>
            <Monogram />
          </span>
        </div>

        <button type="button" className={styles.addButton} onClick={() => openAdd()}>
          <Plus aria-hidden />
          <span className={styles.label}>{t('nav.addJob')}</span>
          <span className={styles.addKbd}>
            <Kbd>N</Kbd>
          </span>
        </button>

        <nav aria-label={t('nav.main')} className={styles.nav}>
          {NAV_ITEMS.map(({ key, to, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cx(styles.navItem, isActive && styles.active)}
              title={t(`nav.${key}`)}
            >
              <span className={styles.navIcon}>
                <Icon aria-hidden />
                {key === 'today' && attention > 0 && <span className={styles.navDot} aria-hidden />}
              </span>
              <span className={styles.label}>{t(`nav.${key}`)}</span>
              <span className={styles.navBadge}>{badgeFor(key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main" className={styles.main} tabIndex={-1}>
        {!online && (
          <div className={styles.offline} role="status">
            {t('app.offline')}
          </div>
        )}
        <Outlet />
      </main>

      <nav aria-label={t('nav.main')} className={styles.bottombar}>
        {NAV_ITEMS.filter((i) => i.mobile).map(({ key, to, icon: Icon }, index) => (
          <BottomSlot key={key} withAddBefore={index === 2} onAdd={() => openAdd()} addLabel={t('nav.add')}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => cx(styles.tab, isActive && styles.active)}
              aria-label={key === 'today' && attention > 0 ? `${t(`nav.${key}`)}, ${attentionLabel}` : undefined}
            >
              <span className={styles.navIcon}>
                <Icon aria-hidden />
                {key === 'today' && attention > 0 && (
                  <span className={styles.tabBadge} aria-hidden>
                    {attention > 9 ? '9+' : attention}
                  </span>
                )}
              </span>
              <span className={styles.tabLabel}>{t(`nav.${key}`)}</span>
            </NavLink>
          </BottomSlot>
        ))}
      </nav>

      {overlays}
    </div>
  )
}

function BottomSlot({
  withAddBefore,
  onAdd,
  addLabel,
  children,
}: {
  withAddBefore: boolean
  onAdd: () => void
  addLabel: string
  children: ReactNode
}) {
  return (
    <>
      {withAddBefore && (
        <button type="button" className={styles.tabAdd} onClick={onAdd}>
          <span className={styles.tabAddCircle}>
            <Plus aria-hidden />
          </span>
          <span className={styles.tabLabel}>{addLabel}</span>
        </button>
      )}
      {children}
    </>
  )
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
