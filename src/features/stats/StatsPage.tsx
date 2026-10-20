import { ChartColumn } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button } from '../../components/Button'
import { EmptyState, Skeleton } from '../../components/Feedback'
import { Page, PageHeader } from '../../components/Page'
import { cx } from '../../lib/cx'
import { formatDate } from '../../lib/dates'
import { formatNumber } from '../../lib/money'
import { useApplications } from '../applications/ApplicationsProvider'
import { STATUS_ICON } from '../applications/status'
import { BarList, ColumnChart } from './charts'
import { applicationsPerWeek, summarize, type GroupStat } from './metrics'
import styles from './StatsPage.module.css'

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

export function StatsPage() {
  const { t } = useTranslation()
  const { items, loading } = useApplications()
  const { openAdd } = useUI()
  const summary = useMemo(() => summarize(items), [items])
  const weeks = useMemo(() => applicationsPerWeek(items), [items])

  if (loading) {
    return (
      <Page>
        <PageHeader title={t('stats.title')} />
        <div className={styles.tiles}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={96} radius={12} />
          ))}
        </div>
      </Page>
    )
  }

  if (summary.sent === 0) {
    return (
      <Page>
        <PageHeader title={t('stats.title')} />
        <EmptyState
          icon={<ChartColumn aria-hidden />}
          title={t('stats.emptyTitle')}
          action={
            items.length === 0 ? (
              <Button variant="primary" onClick={() => openAdd()}>
                {t('nav.addJob')}
              </Button>
            ) : undefined
          }
        >
          {t('stats.emptyText')}
        </EmptyState>
      </Page>
    )
  }

  const funnelTop = summary.funnel[0]?.count ?? 0

  return (
    <Page>
      <PageHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />

      <div className={styles.tiles}>
        <Tile label={t('stats.sent')} value={formatNumber(summary.sent)} />
        <Tile label={t('stats.responseRate')} value={pct(summary.responseRate)} hint={t('stats.responseRateHint')} />
        <Tile label={t('stats.interviewRate')} value={pct(summary.interviewRate)} hint={t('stats.interviewRateHint')} />
        <Tile
          label={t('stats.avgResponse')}
          value={summary.avgDaysToResponse === null ? '—' : t('stats.days', { count: Math.round(summary.avgDaysToResponse) })}
          hint={t('stats.avgResponseHint')}
        />
      </div>

      <div className={styles.grid}>
        <Card title={t('stats.perWeek')} wide>
          <ColumnChart
            caption={t('stats.perWeek')}
            data={weeks.map((w) => ({
              key: w.start,
              label: w.label,
              value: w.count,
              title: t('stats.weekOf', { date: formatDate(w.start, 'd MMM') }),
            }))}
            valueLabel={(v) => t('stats.applications', { count: v })}
          />
        </Card>

        <Card title={t('stats.funnel')} subtitle={t('stats.funnelHint')}>
          <BarList
            max={funnelTop}
            rows={summary.funnel.map((f) => {
              const Icon = STATUS_ICON[f.status]
              return {
                key: f.status,
                label: (
                  <>
                    <Icon aria-hidden />
                    {t(`status.${f.status}`)}
                  </>
                ),
                value: f.count,
                display: `${f.count} · ${pct(funnelTop ? f.count / funnelTop : null)}`,
                color: `var(--st-${f.status})`,
              }
            })}
          />
        </Card>

        <Card title={t('stats.workMode')}>
          <BarList
            rows={summary.byWorkMode.map((m) => ({
              key: m.key,
              label: m.key === 'unknown' ? t('job.unknown') : t(`workMode.${m.key}`),
              value: m.count,
              display: String(m.count),
            }))}
          />
        </Card>

        <Card title={t('stats.bySource')} wide>
          <GroupTable rows={summary.bySource} name={(k) => t(`source.${k}`)} />
        </Card>

        <Card title={t('stats.byCv')} subtitle={summary.byCv.length === 0 ? t('stats.byCvEmpty') : undefined} wide>
          {summary.byCv.length > 0 && <GroupTable rows={summary.byCv} name={(k) => k} />}
        </Card>
      </div>
    </Page>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.tile}>
      <p className={styles.tileLabel}>{label}</p>
      <p className={cx(styles.tileValue, 'tabular')}>{value}</p>
      {hint && <p className={styles.tileHint}>{hint}</p>}
    </div>
  )
}

function Card({ title, subtitle, wide, children }: { title: string; subtitle?: string; wide?: boolean; children?: ReactNode }) {
  return (
    <section className={cx(styles.card, wide && styles.wide)}>
      <header className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function GroupTable<K extends string>({ rows, name }: { rows: GroupStat<K>[]; name: (k: K) => string }) {
  const { t } = useTranslation()
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('stats.cols.name')}</th>
            <th scope="col" className={styles.num}>
              {t('stats.cols.sent')}
            </th>
            <th scope="col">{t('stats.cols.responses')}</th>
            <th scope="col">{t('stats.cols.interviews')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{name(r.key)}</th>
              <td className={cx(styles.num, 'tabular')}>{r.sent}</td>
              <td>
                <RateCell part={r.responses} total={r.sent} />
              </td>
              <td>
                <RateCell part={r.interviews} total={r.sent} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RateCell({ part, total }: { part: number; total: number }) {
  const ratio = total ? part / total : 0
  return (
    <span className={styles.rate}>
      <span className={styles.rateTrack} aria-hidden>
        <span className={styles.rateFill} style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="tabular">{pct(total ? ratio : null)}</span>
    </span>
  )
}
