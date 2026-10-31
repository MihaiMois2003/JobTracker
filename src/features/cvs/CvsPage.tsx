import { Ellipsis, FileText, Search, Star, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, IconButton } from '../../components/Button'
import { Banner, EmptyState, Skeleton } from '../../components/Feedback'
import { Select } from '../../components/Field'
import { Menu, Segmented, type MenuEntry } from '../../components/Menu'
import { Page, PageHeader } from '../../components/Page'
import { cx } from '../../lib/cx'
import { formatShortDate } from '../../lib/dates'
import { useIsPhone } from '../../lib/useMediaQuery'
import { useApplications } from '../applications/ApplicationsProvider'
import styles from './Cvs.module.css'
import { useCvs } from './CvsProvider'
import { cvPerformance, pct, type CvStat } from './cvStats'
import { currentVersion, matchesCvQuery } from './labels'
import type { Cv, CvLanguage } from './types'
import { useCvCommands } from './useCvCommands'

type Scope = 'active' | 'archived'

export function CvsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isPhone = useIsPhone()
  const { cvs, loading, error } = useCvs()
  const { items } = useApplications()
  const commands = useCvCommands({ onCreated: (id) => navigate(`/cvs/${id}`) })
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [language, setLanguage] = useState<CvLanguage | 'all'>('all')
  const [scope, setScope] = useState<Scope>('active')
  const [dragging, setDragging] = useState(false)

  // "Upload CV" from the command palette lands here with ?upload=1.
  const { openUpload } = commands
  useEffect(() => {
    if (params.get('upload') !== '1') return
    openUpload({ kind: 'new' })
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete('upload')
        return next
      },
      { replace: true },
    )
  }, [params, setParams, openUpload])

  const archivedCount = cvs.filter((c) => c.archived).length
  const effectiveScope = archivedCount ? scope : 'active'
  const languages = useMemo(() => [...new Set(cvs.map((c) => c.language))], [cvs])
  const visible = cvs.filter(
    (c) => (effectiveScope === 'archived') === c.archived && (language === 'all' || c.language === language) && matchesCvQuery(c, q),
  )
  const stats = useMemo(() => new Map(cvs.map((c) => [c.id, cvPerformance(items, c).total])), [cvs, items])

  // Desktop: drop a PDF anywhere on the page to upload it as a new CV.
  const dropProps = isPhone
    ? {}
    : {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes('Files') || document.querySelector('dialog[open]')) return
          e.preventDefault()
          setDragging(true)
        },
        onDragLeave: (e: DragEvent) => {
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
        },
        onDrop: (e: DragEvent) => {
          if (!dragging) return
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) commands.openUpload({ kind: 'new' }, file)
        },
      }

  const uploadButton = (
    <Button variant="primary" icon={<Upload aria-hidden />} onClick={() => commands.openUpload({ kind: 'new' })}>
      {t('cvs.upload')}
    </Button>
  )

  return (
    <div className={styles.dropTarget} {...dropProps}>
      <Page>
        <PageHeader title={t('cvs.title')} subtitle={t('cvs.subtitle')} actions={cvs.length > 0 && uploadButton} />

        {error && (
          <Banner tone="danger" className={styles.banner}>
            {t('errors.loadFailed')}
          </Banner>
        )}

        {loading ? (
          <div className={styles.grid} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={148} radius={14} />
            ))}
          </div>
        ) : cvs.length === 0 ? (
          <div className={styles.welcome}>
            <EmptyState
              icon={<FileText aria-hidden />}
              title={t('cvs.emptyTitle')}
              action={
                <Button variant="primary" size="lg" icon={<Upload aria-hidden />} onClick={() => commands.openUpload({ kind: 'new' })}>
                  {t('cvs.upload')}
                </Button>
              }
            >
              {t('cvs.emptyText')}
            </EmptyState>
            {!isPhone && <p className={styles.welcomeHint}>{t('cvs.dropHint')}</p>}
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <label className={styles.search}>
                <Search aria-hidden />
                <span className="visually-hidden">{t('cvs.searchLabel')}</span>
                <input
                  type="search"
                  placeholder={t('cvs.searchPlaceholder')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && q) {
                      e.preventDefault()
                      setQ('')
                    }
                  }}
                />
                {q && (
                  <button type="button" className={styles.clearSearch} aria-label={t('common.clear')} onClick={() => setQ('')}>
                    <X aria-hidden />
                  </button>
                )}
              </label>
              {languages.length > 1 && (
                <Select
                  aria-label={t('cvLanguage.filter')}
                  className={styles.languageFilter}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as CvLanguage | 'all')}
                >
                  <option value="all">{t('cvLanguage.all')}</option>
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {t(`cvLanguage.${l}`)}
                    </option>
                  ))}
                </Select>
              )}
              {archivedCount > 0 && (
                <Segmented<Scope>
                  label={t('cvs.scopeLabel')}
                  value={effectiveScope}
                  onChange={setScope}
                  options={[
                    { value: 'active', label: t('cvs.scope.active') },
                    { value: 'archived', label: t('cvs.scope.archived', { count: archivedCount }) },
                  ]}
                />
              )}
            </div>

            {visible.length === 0 ? (
              <EmptyState icon={<Search aria-hidden />} title={t('cvs.noMatches')} />
            ) : (
              <ul className={styles.grid}>
                {visible.map((cv) => (
                  <li key={cv.id}>
                    <CvCard cv={cv} stat={stats.get(cv.id)} menu={commands.menu(cv)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Page>

      {dragging && (
        <div className={styles.dropOverlay} aria-hidden>
          <Upload />
          <p>{t('cvs.dropHere')}</p>
        </div>
      )}
      {commands.dialogs}
    </div>
  )
}

function CvCard({ cv, stat, menu }: { cv: Cv; stat?: CvStat; menu: MenuEntry[] }) {
  const { t } = useTranslation()
  const current = currentVersion(cv)
  return (
    <article className={cx(styles.card, cv.archived && styles.cardArchived)}>
      <div className={styles.cardTop}>
        <span className={styles.langTag}>{cv.language === 'other' ? t('cvLanguage.other') : cv.language.toUpperCase()}</span>
        {cv.isDefault && (
          <span className={styles.defaultMark}>
            <Star aria-hidden />
            {t('cvs.default')}
          </span>
        )}
        {cv.demo && <span className={styles.demoMark}>{t('cvs.demoBadge')}</span>}
        <span className={styles.cardMenu}>
          <Menu
            label={t('cvs.actionsFor', { name: cv.name })}
            items={menu}
            trigger={(props) => (
              <IconButton label={t('cvs.actionsFor', { name: cv.name })} size="sm" {...props}>
                <Ellipsis aria-hidden />
              </IconButton>
            )}
          />
        </span>
      </div>
      <h2 className={styles.cardTitle}>
        <Link to={`/cvs/${cv.id}`} className={styles.cardLink}>
          {cv.name}
        </Link>
      </h2>
      {cv.description && <p className={styles.cardDescription}>{cv.description}</p>}
      <p className={styles.cardMeta}>
        {current ? `v${current.versionNumber}` : t('cvs.noVersion')}
        <span aria-hidden> · </span>
        {t('cvs.updated', { date: formatShortDate(cv.updatedAt) })}
      </p>
      {stat && (
        <p className={cx(styles.cardStats, 'tabular')}>
          <span>{t('cvs.sentCount', { count: stat.sent })}</span>
          {stat.sent > 0 && (
            <>
              <span aria-hidden> · </span>
              <span>{t('cvs.responseShort', { rate: pct(stat.responseRate) })}</span>
            </>
          )}
          {stat.sent > 0 && stat.few && (
            <span className={styles.fewData} title={t('cvs.fewDataHint')}>
              {t('cvs.fewData')}
            </span>
          )}
        </p>
      )}
    </article>
  )
}
