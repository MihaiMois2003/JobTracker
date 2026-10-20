import { BellRing, CalendarClock, CircleSlash, MapPin } from 'lucide-react'
import { forwardRef, type HTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { PriorityMark } from '../../components/Badge'
import { cx } from '../../lib/cx'
import { daysSince, daysUntil, todayISO } from '../../lib/dates'
import type { Application } from '../applications/types'
import styles from './JobCard.module.css'

interface JobCardProps extends HTMLAttributes<HTMLDivElement> {
  app: Application
  dragging?: boolean
  overlay?: boolean
}

export const JobCard = forwardRef<HTMLDivElement, JobCardProps>(function JobCard(
  { app, dragging, overlay, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(styles.card, dragging && styles.dragging, overlay && styles.overlay, className)}
      {...rest}
    >
      <JobCardContent app={app} />
    </div>
  )
})

export function JobCardContent({ app }: { app: Application }) {
  const { t } = useTranslation()
  const applied = daysSince(app.appliedAt)
  const followUpDue = app.nextFollowUpAt !== null && app.nextFollowUpAt <= todayISO()
  const nextInterview = app.interviews.find((i) => {
    const d = daysUntil(i.at)
    return d !== null && d >= 0 && d <= 7 && i.outcome === 'pending'
  })
  const mode = app.workMode ? t(`workMode.${app.workMode}`) : null
  // "Remote · Remote (EU)" reads twice; drop the mode when the location already says it.
  const place = [mode && !app.location.toLowerCase().includes(mode.toLowerCase()) ? mode : null, app.location]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className={styles.top}>
        <span className={styles.company}>{app.company || t('jobs.noCompany')}</span>
        <PriorityMark priority={app.priority} />
      </div>
      <p className={styles.title}>{app.title || t('jobs.untitled')}</p>
      <div className={styles.meta}>
        {place && (
          <span className={styles.metaItem}>
            <MapPin aria-hidden />
            <span className={styles.truncate}>{place}</span>
          </span>
        )}
        <span className={styles.spacer} />
        {app.listingClosed && (
          <span className={cx(styles.flag, styles.flagMuted)} title={t('job.listingClosedShort')}>
            <CircleSlash aria-hidden />
            <span className="visually-hidden">{t('job.listingClosedShort')}</span>
          </span>
        )}
        {nextInterview && (
          <span className={cx(styles.flag, styles.flagInterview)} title={t('jobs.interviewSoon')}>
            <CalendarClock aria-hidden />
            <span className="visually-hidden">{t('jobs.interviewSoon')}</span>
          </span>
        )}
        {followUpDue && (
          <span className={cx(styles.flag, styles.flagFollow)} title={t('jobs.followUpDue')}>
            <BellRing aria-hidden />
            <span className="visually-hidden">{t('jobs.followUpDue')}</span>
          </span>
        )}
        {applied !== null && app.status !== 'saved' && (
          <span className={cx(styles.days, 'tabular')} title={t('jobs.appliedDaysAgo', { count: applied })}>
            {applied === 0 ? t('common.today') : t('jobs.daysShort', { count: applied })}
          </span>
        )}
      </div>
    </>
  )
}
