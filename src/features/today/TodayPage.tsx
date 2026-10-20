import { format } from 'date-fns'
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Clock,
  Ghost,
  Hourglass,
  Send,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useUI } from '../../app/UIProvider'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Feedback'
import { Page } from '../../components/Page'
import { dateLocale, daysSince, daysUntil, formatDateTime, formatShortDate, formatTime } from '../../lib/dates'
import { googleCalendarUrl } from '../../lib/gcal'
import { useAuth } from '../auth/AuthProvider'
import { useApplications } from '../applications/ApplicationsProvider'
import { isActive, lastActivityAt } from '../applications/selectors'
import type { Application } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import { useSettings } from '../settings/SettingsProvider'
import { appliedThisWeek } from './attention'
import styles from './TodayPage.module.css'
import { useAttention } from './useAttention'
import { Welcome } from './Welcome'

function greetingKey(hour: number) {
  if (hour < 5) return 'today.greeting.night'
  if (hour < 12) return 'today.greeting.morning'
  if (hour < 18) return 'today.greeting.day'
  return 'today.greeting.evening'
}

export function TodayPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { items, loading } = useApplications()
  const { settings } = useSettings()
  const { openJob } = useUI()
  const actions = useApplicationActions()
  const attention = useAttention()

  if (loading) return <TodaySkeleton />
  if (items.length === 0) return <Welcome />

  const now = new Date()
  const firstName = user?.displayName?.split(' ')[0] ?? ''
  const todo = attention.followUps.length + attention.ghostSuggestions.length + attention.deadlines.length
  const active = items.filter(isActive).length
  const nothing =
    todo === 0 && attention.interviews.length === 0 && attention.waiting.length === 0

  return (
    <Page>
      <header className={styles.header}>
        <p className={styles.date}>{format(now, 'EEEE, d MMMM', { locale: dateLocale() })}</p>
        <h1 className={styles.greeting}>
          {t(greetingKey(now.getHours()))}
          {firstName && `, ${firstName}`}
        </h1>
        <p className={styles.summary}>
          {nothing
            ? t('today.summaryNone')
            : t('today.summary', { count: todo + attention.interviews.length })}
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.tasks}>
          {attention.interviews.length > 0 && (
            <TaskGroup icon={<CalendarClock aria-hidden />} title={t('today.interviews')} count={attention.interviews.length}>
              {attention.interviews.map(({ app, interview }) => {
                const gcal = googleCalendarUrl({
                  title: t('calendar.eventTitle', { company: app.company, title: app.title }),
                  start: interview.at,
                  durationMin: interview.durationMin,
                  location: interview.location,
                  details: [interview.people, app.sourceUrl].filter(Boolean).join('\n'),
                })
                return (
                  <TaskRow
                    key={interview.id}
                    app={app}
                    onOpen={() => openJob(app.id)}
                    lead={<DateChip value={interview.at} withTime />}
                    meta={[
                      interview.type !== 'other' ? t(`interviews.typeLabel.${interview.type}`) : t('interviews.typeLabel.other'),
                      formatDateTime(interview.at),
                      interview.location,
                    ]}
                    actions={
                      gcal && (
                        <a className={styles.textAction} href={gcal} target="_blank" rel="noopener noreferrer">
                          <CalendarPlus aria-hidden />
                          {t('calendar.addToGoogle')}
                        </a>
                      )
                    }
                  />
                )
              })}
            </TaskGroup>
          )}

          {attention.followUps.length > 0 && (
            <TaskGroup icon={<BellRing aria-hidden />} title={t('today.followUps')} count={attention.followUps.length}>
              {attention.followUps.map((app) => {
                const late = -(daysUntil(app.nextFollowUpAt) ?? 0)
                return (
                  <TaskRow
                    key={app.id}
                    app={app}
                    onOpen={() => openJob(app.id)}
                    tone={late > 0 ? 'warning' : undefined}
                    meta={[
                      late > 0 ? t('today.overdue', { count: late }) : t('today.dueToday'),
                      app.appliedAt ? t('today.appliedOn', { date: formatShortDate(app.appliedAt) }) : null,
                    ]}
                    actions={
                      <>
                        <Button size="sm" variant="secondary" onClick={() => actions.followedUp(app)}>
                          {t('today.didFollowUp')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => actions.snoozeFollowUp(app, 3)}>
                          {t('today.snooze')}
                        </Button>
                      </>
                    }
                  />
                )
              })}
            </TaskGroup>
          )}

          {attention.deadlines.length > 0 && (
            <TaskGroup icon={<Clock aria-hidden />} title={t('today.deadlines')} count={attention.deadlines.length}>
              {attention.deadlines.map((app) => {
                const left = daysUntil(app.deadline) ?? 0
                return (
                  <TaskRow
                    key={app.id}
                    app={app}
                    onOpen={() => openJob(app.id)}
                    tone={left <= 2 ? 'warning' : undefined}
                    lead={<DateChip value={app.deadline} />}
                    meta={[left === 0 ? t('today.deadlineToday') : t('today.deadlineIn', { count: left })]}
                    actions={
                      <Button size="sm" variant="secondary" icon={<Send aria-hidden />} onClick={() => actions.setStatus(app, 'applied')}>
                        {t('today.markApplied')}
                      </Button>
                    }
                  />
                )
              })}
            </TaskGroup>
          )}

          {attention.ghostSuggestions.length > 0 && (
            <TaskGroup icon={<Ghost aria-hidden />} title={t('today.ghost')} count={attention.ghostSuggestions.length}>
              {attention.ghostSuggestions.map((app) => (
                <TaskRow
                  key={app.id}
                  app={app}
                  onOpen={() => openJob(app.id)}
                  meta={[t('today.idleFor', { count: daysSince(lastActivityAt(app)) ?? 0 })]}
                  actions={
                    <>
                      <Button size="sm" variant="secondary" icon={<Ghost aria-hidden />} onClick={() => actions.setStatus(app, 'ghosted')}>
                        {t('today.markGhosted')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => actions.dismissGhost(app)}>
                        {t('today.stillWaiting')}
                      </Button>
                    </>
                  }
                />
              ))}
            </TaskGroup>
          )}

          {attention.waiting.length > 0 && (
            <TaskGroup icon={<Hourglass aria-hidden />} title={t('today.waiting')} count={attention.waiting.length} quiet>
              {attention.waiting.slice(0, 6).map((app) => (
                <TaskRow
                  key={app.id}
                  app={app}
                  onOpen={() => openJob(app.id)}
                  meta={[t('today.waitingFor', { count: daysSince(app.appliedAt ?? lastActivityAt(app)) ?? 0 })]}
                />
              ))}
            </TaskGroup>
          )}

          {nothing && (
            <div className={styles.calm}>
              <p className={styles.calmTitle}>{t('today.calmTitle')}</p>
              <p>{t('today.calmText')}</p>
            </div>
          )}
        </div>

        <aside className={styles.aside}>
          {settings.weeklyGoal > 0 && <WeeklyGoal done={appliedThisWeek(items)} goal={settings.weeklyGoal} />}
          <dl className={styles.snapshot}>
            <div>
              <dt>{t('today.activeJobs')}</dt>
              <dd className="tabular">{active}</dd>
            </div>
            <div>
              <dt>{t('today.upcomingInterviews')}</dt>
              <dd className="tabular">{attention.interviews.length}</dd>
            </div>
          </dl>
          <Link to="/calendar" className={styles.asideLink}>
            <CalendarDays aria-hidden />
            {t('today.openCalendar')}
            <ArrowRight aria-hidden className={styles.arrow} />
          </Link>
        </aside>
      </div>
    </Page>
  )
}

function TaskGroup({
  icon,
  title,
  count,
  quiet,
  children,
}: {
  icon: ReactNode
  title: string
  count: number
  quiet?: boolean
  children: ReactNode
}) {
  return (
    <section className={styles.group} data-quiet={quiet ? '' : undefined}>
      <h2 className={styles.groupTitle}>
        {icon}
        {title}
        <span className="tabular">{count}</span>
      </h2>
      <ul className={styles.rows}>{children}</ul>
    </section>
  )
}

function TaskRow({
  app,
  onOpen,
  lead,
  meta,
  actions,
  tone,
}: {
  app: Application
  onOpen: () => void
  lead?: ReactNode
  meta: Array<string | null | undefined>
  actions?: ReactNode
  tone?: 'warning'
}) {
  const { t } = useTranslation()
  return (
    <li className={styles.row} data-tone={tone}>
      {lead}
      <button type="button" className={styles.rowMain} onClick={onOpen}>
        <span className={styles.rowTitle}>
          <span className={styles.rowCompany}>{app.company || t('jobs.noCompany')}</span>
          <span className={styles.rowSep} aria-hidden>
            ·
          </span>
          {app.title || t('jobs.untitled')}
        </span>
        <span className={styles.rowMeta}>{meta.filter(Boolean).join(' · ')}</span>
      </button>
      {actions && <div className={styles.rowActions}>{actions}</div>}
    </li>
  )
}

function DateChip({ value, withTime }: { value: string | null; withTime?: boolean }) {
  if (!value) return null
  return (
    <span className={styles.dateChip} aria-hidden>
      <span className={styles.dateDay}>{formatShortDate(value).split(' ')[0]}</span>
      <span className={styles.dateMonth}>{withTime ? formatTime(value) : formatShortDate(value).split(' ')[1]}</span>
    </span>
  )
}

function WeeklyGoal({ done, goal }: { done: number; goal: number }) {
  const { t } = useTranslation()
  const ticks = Math.min(goal, 20)
  const filled = Math.round((Math.min(done, goal) / goal) * ticks)
  return (
    <section className={styles.goal} aria-label={t('today.goal.label')}>
      <p className={styles.goalLabel}>{t('today.goal.label')}</p>
      <p className={styles.goalValue}>
        <span className="tabular">{done}</span>
        <span className={styles.goalOf}>/ {goal}</span>
      </p>
      <div
        className={styles.ticks}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(done, goal)}
        aria-label={t('today.goal.progress', { done, goal })}
      >
        {Array.from({ length: ticks }, (_, i) => (
          <span key={i} data-on={i < filled ? '' : undefined} />
        ))}
      </div>
      <p className={styles.goalHint}>
        {done >= goal ? t('today.goal.reached') : t('today.goal.left', { count: goal - done })}
      </p>
    </section>
  )
}

function TodaySkeleton() {
  return (
    <Page>
      <div className={styles.header} aria-busy="true">
        <Skeleton width={140} height={12} />
        <Skeleton width="min(360px, 80%)" height={36} />
        <Skeleton width={220} height={14} />
      </div>
      <div className={styles.layout}>
        <div className={styles.tasks}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={68} radius={10} />
          ))}
        </div>
        <div className={styles.aside}>
          <Skeleton height={140} radius={12} />
        </div>
      </div>
    </Page>
  )
}
