import { ArrowLeft, CircleSlash, Download, Ellipsis, Eye, ExternalLink, Star, Trash, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { useUI } from '../../app/UIProvider'
import { StatusBadge } from '../../components/Badge'
import { Button, IconButton } from '../../components/Button'
import { EmptyState, Skeleton } from '../../components/Feedback'
import { Menu } from '../../components/Menu'
import { Page, PageHeader, Section } from '../../components/Page'
import { cx } from '../../lib/cx'
import { formatShortDate } from '../../lib/dates'
import { useIsPhone } from '../../lib/useMediaQuery'
import { useApplications } from '../applications/ApplicationsProvider'
import { CvPreview } from './CvPreview'
import styles from './Cvs.module.css'
import { useCvs } from './CvsProvider'
import { cvPerformance, pct, type CvStat } from './cvStats'
import { currentVersion, formatBytes, jobsUsingCv } from './labels'
import type { Cv } from './types'
import { useCvCommands } from './useCvCommands'
import { useCvFileCommands } from './useCvFileCommands'

export function CvDetailPage() {
  const { t } = useTranslation()
  const { cvId } = useParams()
  const { byId, loading } = useCvs()
  const cv = cvId ? byId.get(cvId) : undefined

  if (cv) return <CvDetail key={cv.id} cv={cv} />

  return (
    <Page>
      <BackLink />
      {loading ? (
        <div className={styles.detailSkeleton} aria-busy="true">
          <Skeleton width="40%" height={32} />
          <Skeleton height={420} radius={14} />
        </div>
      ) : (
        <EmptyState
          icon={<CircleSlash aria-hidden />}
          title={t('cvs.detail.notFound')}
          action={
            <Link to="/cvs" className={styles.textLink}>
              {t('cvs.detail.back')}
            </Link>
          }
        />
      )}
    </Page>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Link to="/cvs" className={styles.back}>
      <ArrowLeft aria-hidden />
      {t('cvs.detail.back')}
    </Link>
  )
}

function CvDetail({ cv }: { cv: Cv }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isPhone = useIsPhone()
  const { items } = useApplications()
  const { openJob } = useUI()
  const files = useCvFileCommands()
  const commands = useCvCommands({ onDeleted: () => navigate('/cvs', { replace: true }) })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = cv.versions.find((v) => v.id === selectedId) ?? currentVersion(cv)
  const perf = useMemo(() => cvPerformance(items, cv), [items, cv])
  const jobs = useMemo(
    () => jobsUsingCv(items, cv.id).sort((a, b) => (b.appliedAt ?? b.createdAt).localeCompare(a.appliedAt ?? a.createdAt)),
    [items, cv.id],
  )
  const languageLabel = t(`cvLanguage.${cv.language}`)

  return (
    <Page>
      <BackLink />
      <PageHeader
        title={cv.name}
        subtitle={[languageLabel, cv.description].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="primary" icon={<Upload aria-hidden />} onClick={() => commands.openUpload({ kind: 'version', cv })}>
              {t('cvs.actions.newVersion')}
            </Button>
            <Menu
              label={t('cvs.actionsFor', { name: cv.name })}
              items={commands.menu(cv)}
              trigger={(props) => (
                <IconButton label={t('cvs.actionsFor', { name: cv.name })} variant="secondary" {...props}>
                  <Ellipsis aria-hidden />
                </IconButton>
              )}
            />
          </>
        }
      />
      {(cv.isDefault || cv.archived || cv.demo) && (
        <p className={styles.badges}>
          {cv.isDefault && (
            <span className={styles.defaultMark}>
              <Star aria-hidden />
              {t('cvs.default')}
            </span>
          )}
          {cv.archived && <span className={styles.demoMark}>{t('cvs.archivedBadge')}</span>}
          {cv.demo && <span className={styles.demoMark}>{t('cvs.demoBadge')}</span>}
        </p>
      )}

      <div className={styles.detailGrid}>
        <div className={styles.previewColumn}>
          <CvPreview cv={cv} version={selected} />
        </div>

        <div className={styles.sideColumn}>
          <Section title={t('cvs.detail.versions')} meta={t('cvs.versionsCount', { count: cv.versions.length })}>
            <ul className={styles.versions}>
              {cv.versions.map((v, i) => {
                const vStat = perf.byVersion.get(v.id)
                const isSelected = !isPhone && selected?.id === v.id
                return (
                  <li key={v.id} className={cx(styles.version, isSelected && styles.versionSelected)}>
                    <div className={styles.versionHead}>
                      <span className={styles.versionNumber}>v{v.versionNumber}</span>
                      {i === 0 && <span className={styles.currentMark}>{t('cvs.current')}</span>}
                      <span className={cx(styles.versionMeta, 'tabular')}>
                        {formatShortDate(v.uploadedAt)}
                        {v.size > 0 && ` · ${formatBytes(v.size, i18n.language)}`}
                        {vStat && vStat.sent > 0 && ` · ${t('cvs.sentCount', { count: vStat.sent })}`}
                      </span>
                    </div>
                    {v.note && <p className={styles.versionNote}>{v.note}</p>}
                    {v.fileName && <p className={styles.versionFile}>{v.fileName}</p>}
                    <div className={styles.versionActions}>
                      {isPhone ? (
                        <Button size="sm" variant="ghost" icon={<ExternalLink aria-hidden />} onClick={() => files.open(v)}>
                          {t('cvs.actions.openPdf')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Eye aria-hidden />}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedId(v.id)}
                        >
                          {t('cvs.actions.preview')}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={<Download aria-hidden />} onClick={() => files.download(v)}>
                        {t('cvs.actions.download')}
                      </Button>
                      {cv.versions.length > 1 && (
                        <IconButton
                          size="sm"
                          variant="dangerGhost"
                          label={t('cvs.actions.deleteVersion', { n: v.versionNumber })}
                          onClick={() => commands.askDeleteVersion(cv, v)}
                        >
                          <Trash aria-hidden />
                        </IconButton>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {cv.versions.length === 1 && <p className={styles.sectionHint}>{t('cvs.lastVersion')}</p>}
          </Section>

          <Section title={t('cvs.detail.stats')}>
            <StatTiles stat={perf.total} />
            {cv.versions.length > 1 && perf.total.sent > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className="visually-hidden">{t('cvs.stats.byVersion')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('cvs.stats.version')}</th>
                      <th scope="col" className={styles.num}>
                        {t('cvs.stats.sent')}
                      </th>
                      <th scope="col" className={styles.num}>
                        {t('cvs.stats.responses')}
                      </th>
                      <th scope="col" className={styles.num}>
                        {t('cvs.stats.interviews')}
                      </th>
                      <th scope="col" className={styles.num}>
                        {t('cvs.stats.offers')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cv.versions.map((v) => {
                      const s = perf.byVersion.get(v.id)
                      if (!s) return null
                      return (
                        <tr key={v.id}>
                          <th scope="row">
                            v{v.versionNumber}
                            {s.sent > 0 && s.few && <span className={styles.fewData}>{t('cvs.fewData')}</span>}
                          </th>
                          <td className={cx(styles.num, 'tabular')}>{s.sent}</td>
                          <td className={cx(styles.num, 'tabular')}>{pct(s.responseRate)}</td>
                          <td className={cx(styles.num, 'tabular')}>{pct(s.interviewRate)}</td>
                          <td className={cx(styles.num, 'tabular')}>{s.offers}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>

      <Section title={t('cvs.detail.jobs')} meta={jobs.length ? t('jobs.count', { count: jobs.length }) : undefined}>
        {jobs.length === 0 ? (
          <p className={styles.sectionHint}>{t('cvs.detail.jobsEmpty')}</p>
        ) : (
          <ul className={styles.jobs}>
            {jobs.map((app) => {
              const version = cv.versions.find((v) => v.id === app.cvVersionId)
              return (
                <li key={app.id}>
                  <button type="button" className={styles.jobRow} onClick={() => openJob(app.id)}>
                    <span className={styles.jobMain}>
                      <span className={styles.jobTitle}>{app.title || t('jobs.untitled')}</span>
                      <span className={styles.jobCompany}>{app.company || t('jobs.noCompany')}</span>
                    </span>
                    <span className={cx(styles.jobVersion, 'tabular')}>
                      {version ? `v${version.versionNumber}` : t('cvs.versionDeletedShort')}
                      {app.appliedAt && ` · ${formatShortDate(app.appliedAt)}`}
                    </span>
                    <StatusBadge status={app.status} compact />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {commands.dialogs}
    </Page>
  )
}

function StatTiles({ stat }: { stat: CvStat }) {
  const { t } = useTranslation()
  return (
    <>
      <div className={styles.tiles}>
        <Tile label={t('cvs.stats.sent')} value={String(stat.sent)} />
        <Tile label={t('cvs.stats.responseRate')} value={pct(stat.responseRate)} />
        <Tile label={t('cvs.stats.interviewRate')} value={pct(stat.interviewRate)} />
        <Tile label={t('cvs.stats.offers')} value={String(stat.offers)} />
      </div>
      {stat.sent > 0 && stat.few && <p className={styles.sectionHint}>{t('cvs.fewDataHint')}</p>}
    </>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.tile}>
      <p className={styles.tileLabel}>{label}</p>
      <p className={cx(styles.tileValue, 'tabular')}>{value}</p>
    </div>
  )
}
