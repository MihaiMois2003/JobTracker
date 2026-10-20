import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { StatusDot } from '../../components/Badge'
import { boardOrder } from '../applications/selectors'
import { StatusSelect } from '../applications/StatusSelect'
import { STATUSES, type Application } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import styles from './GroupedList.module.css'
import { JobCardContent } from './JobCard'

/** Phone view: one section per status; status changes go through a bottom sheet. */
export function GroupedList({ items }: { items: Application[] }) {
  const { t } = useTranslation()
  const { openJob } = useUI()
  const actions = useApplicationActions()

  const groups = STATUSES.map((status) => ({
    status,
    apps: items.filter((a) => a.status === status).sort(boardOrder),
  })).filter((g) => g.apps.length > 0)

  return (
    <div className={styles.groups}>
      {groups.map(({ status, apps }) => (
        <section key={status} aria-labelledby={`group-${status}`}>
          <h2 id={`group-${status}`} className={styles.groupHeader}>
            <StatusDot status={status} />
            {t(`status.${status}`)}
            <span className="tabular">{apps.length}</span>
          </h2>
          <ul className={styles.list}>
            {apps.map((app) => (
              <li key={app.id} className={styles.item}>
                <button type="button" className={styles.open} onClick={() => openJob(app.id)}>
                  <JobCardContent app={app} />
                </button>
                <div className={styles.side}>
                  <StatusSelect
                    compact
                    value={app.status}
                    onChange={(s) => actions.setStatus(app, s)}
                    context={`${app.title}, ${app.company}`}
                  />
                  <ChevronRight aria-hidden className={styles.chevron} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
