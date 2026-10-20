import { ArrowDown, ArrowUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { PriorityMark } from '../../components/Badge'
import { formatShortDate } from '../../lib/dates'
import { sortApplications, type SortDir, type SortKey } from '../applications/selectors'
import { StatusSelect } from '../applications/StatusSelect'
import type { Application } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import styles from './ListTable.module.css'

const COLUMNS: Array<{ key: SortKey; className?: string }> = [
  { key: 'company' },
  { key: 'status' },
  { key: 'source', className: styles.hideMd },
  { key: 'appliedAt' },
  { key: 'priority', className: styles.hideMd },
  { key: 'updatedAt', className: styles.hideLg },
]

export function ListTable({ items }: { items: Application[] }) {
  const { t } = useTranslation()
  const { openJob } = useUI()
  const actions = useApplicationActions()
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'updatedAt', dir: 'desc' })
  const rows = sortApplications(items, sort.key, sort.dir)

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'company' ? 'asc' : 'desc' },
    )

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={c.className}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={styles.sortButton} onClick={() => toggle(c.key)}>
                    {t(`list.columns.${c.key}`)}
                    {active && (sort.dir === 'asc' ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />)}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((app) => (
            <tr key={app.id} className={styles.row} onClick={() => openJob(app.id)}>
              <td>
                <button
                  type="button"
                  className={styles.jobCell}
                  onClick={(e) => {
                    e.stopPropagation()
                    openJob(app.id)
                  }}
                >
                  <span className={styles.title}>{app.title || t('jobs.untitled')}</span>
                  <span className={styles.company}>
                    {app.company || t('jobs.noCompany')}
                    {app.location && <span className={styles.muted}> · {app.location}</span>}
                    {app.workMode && <span className={styles.muted}> · {t(`workMode.${app.workMode}`)}</span>}
                  </span>
                </button>
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <StatusSelect
                  compact
                  value={app.status}
                  onChange={(s) => actions.setStatus(app, s)}
                  context={`${app.title}, ${app.company}`}
                />
              </td>
              <td className={styles.hideMd}>{t(`source.${app.sourceName}`)}</td>
              <td className="tabular">{formatShortDate(app.appliedAt) || <span className={styles.muted}>—</span>}</td>
              <td className={styles.hideMd}>
                <PriorityMark priority={app.priority} />
              </td>
              <td className={`${styles.hideLg} tabular ${styles.muted}`}>{formatShortDate(app.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
