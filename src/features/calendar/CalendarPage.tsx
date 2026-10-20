import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { BellRing, CalendarPlus, CalendarRange, ChevronLeft, ChevronRight, Clock, List, Users } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button, IconButton } from '../../components/Button'
import { EmptyState } from '../../components/Feedback'
import { Segmented } from '../../components/Menu'
import { Page, PageHeader } from '../../components/Page'
import { cx } from '../../lib/cx'
import { dateLocale, parseDate, todayISO } from '../../lib/dates'
import { googleCalendarUrl } from '../../lib/gcal'
import { useApplications } from '../applications/ApplicationsProvider'
import styles from './CalendarPage.module.css'
import { collectEvents, type CalendarEvent, type EventKind } from './events'

const KIND_ICON = { interview: Users, deadline: Clock, followup: BellRing } as const
const KIND_COLOR: Record<EventKind, string> = {
  interview: 'var(--st-interview)',
  deadline: 'var(--st-rejected)',
  followup: 'var(--st-applied)',
}

export function CalendarPage() {
  const { t } = useTranslation()
  const { items } = useApplications()
  const [view, setView] = useState<'agenda' | 'month'>('agenda')
  const events = useMemo(() => collectEvents(items), [items])

  return (
    <Page>
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        actions={
          <Segmented<'agenda' | 'month'>
            label={t('calendar.viewLabel')}
            value={view}
            onChange={setView}
            options={[
              { value: 'agenda', label: t('calendar.agenda'), icon: <List aria-hidden /> },
              { value: 'month', label: t('calendar.month'), icon: <CalendarRange aria-hidden /> },
            ]}
          />
        }
      />
      <Legend />
      {view === 'agenda' ? <Agenda events={events} /> : <MonthView events={events} />}
    </Page>
  )
}

function Legend() {
  const { t } = useTranslation()
  return (
    <ul className={styles.legend}>
      {(Object.keys(KIND_COLOR) as EventKind[]).map((k) => (
        <li key={k}>
          <span className={styles.legendDot} style={{ background: KIND_COLOR[k] }} aria-hidden />
          {t(`calendar.kinds.${k}`)}
        </li>
      ))}
    </ul>
  )
}

function dayHeading(date: string, t: (k: 'calendar.today' | 'calendar.tomorrow') => string): string {
  const today = todayISO()
  const d = parseDate(date)
  if (!d) return date
  const tomorrow = format(new Date(Date.now() + 86_400_000), 'yyyy-MM-dd')
  const label = format(d, 'EEEE, d MMMM', { locale: dateLocale() })
  if (date === today) return `${t('calendar.today')} · ${label}`
  if (date === tomorrow) return `${t('calendar.tomorrow')} · ${label}`
  return label
}

function Agenda({ events }: { events: CalendarEvent[] }) {
  const { t } = useTranslation()
  const [showPast, setShowPast] = useState(false)
  const today = todayISO()
  const visible = events.filter((e) => (showPast ? e.date < today : e.date >= today))
  const days = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of visible) map.set(e.date, [...(map.get(e.date) ?? []), e])
    const list = [...map.entries()]
    return showPast ? list.reverse() : list
  }, [visible, showPast])

  return (
    <div className={styles.agenda}>
      {days.length === 0 ? (
        <EmptyState icon={<CalendarRange aria-hidden />} title={t(showPast ? 'calendar.emptyPast' : 'calendar.empty')}>
          {!showPast && t('calendar.emptyText')}
        </EmptyState>
      ) : (
        days.map(([date, list]) => (
          <section key={date} className={styles.day} aria-labelledby={`day-${date}`}>
            <h2 id={`day-${date}`} className={cx(styles.dayTitle, date === today && styles.dayToday)}>
              {dayHeading(date, t)}
            </h2>
            <ul className={styles.dayList}>
              {list.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          </section>
        ))
      )}
      <Button variant="ghost" size="sm" className={styles.pastToggle} onClick={() => setShowPast((v) => !v)}>
        {showPast ? t('calendar.showUpcoming') : t('calendar.showPast')}
      </Button>
    </div>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation()
  const { openJob } = useUI()
  const Icon = KIND_ICON[event.kind]
  const { app, interview } = event
  const gcal =
    event.date >= todayISO()
      ? googleCalendarUrl({
          title:
            event.kind === 'interview'
              ? t('calendar.eventTitle', { company: app.company, title: app.title })
              : t(`calendar.kindTitle.${event.kind}`, { company: app.company, title: app.title }),
          start: interview ? interview.at : event.date,
          durationMin: interview?.durationMin,
          location: interview?.location,
          details: app.sourceUrl,
        })
      : null

  return (
    <li className={styles.event} style={{ '--kind': KIND_COLOR[event.kind] } as CSSProperties}>
      <span className={cx(styles.eventTime, 'tabular')}>{event.time ?? t('calendar.allDay')}</span>
      <button type="button" className={styles.eventMain} onClick={() => openJob(app.id)}>
        <span className={styles.eventKind}>
          <Icon aria-hidden />
          {event.kind === 'interview' && interview
            ? `${t('calendar.kinds.interview')} ${t(`interviews.types.${interview.type}`)}`.trim()
            : t(`calendar.kinds.${event.kind}`)}
        </span>
        <span className={styles.eventTitle}>
          {app.company} · {app.title}
        </span>
        {interview?.location && <span className={styles.eventMeta}>{interview.location}</span>}
      </button>
      {gcal && (
        <a className={styles.gcal} href={gcal} target="_blank" rel="noopener noreferrer" aria-label={t('calendar.addToGoogle')} title={t('calendar.addToGoogle')}>
          <CalendarPlus aria-hidden />
        </a>
      )}
    </li>
  )
}

function MonthView({ events }: { events: CalendarEvent[] }) {
  const { t } = useTranslation()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(todayISO())
  const today = todayISO()

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return map
  }, [events])

  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const weekdays = days.slice(0, 7).map((d) => format(d, 'EEEEEE', { locale: dateLocale() }))
  const selectedEvents = byDay.get(selected) ?? []

  return (
    <div className={styles.monthWrap}>
      <div className={styles.monthNav}>
        <h2 className={styles.monthTitle}>{format(month, 'LLLL yyyy', { locale: dateLocale() })}</h2>
        <div className={styles.monthButtons}>
          <IconButton label={t('calendar.prevMonth')} onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft aria-hidden />
          </IconButton>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMonth(startOfMonth(new Date()))
              setSelected(today)
            }}
          >
            {t('calendar.today')}
          </Button>
          <IconButton label={t('calendar.nextMonth')} onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className={styles.grid} role="grid" aria-label={format(month, 'LLLL yyyy', { locale: dateLocale() })}>
        {weekdays.map((w) => (
          <div key={w} className={styles.weekday} role="columnheader">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd')
          const list = byDay.get(iso) ?? []
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={iso === selected}
              aria-label={`${format(d, 'd MMMM', { locale: dateLocale() })}${list.length ? `, ${t('calendar.eventsCount', { count: list.length })}` : ''}`}
              className={cx(styles.cell, !isSameMonth(d, month) && styles.outside, iso === today && styles.cellToday)}
              onClick={() => setSelected(iso)}
            >
              <span className={cx(styles.cellDay, 'tabular')}>{format(d, 'd')}</span>
              <span className={styles.pills}>
                {list.slice(0, 3).map((e) => (
                  <span key={e.id} className={styles.pill} style={{ '--kind': KIND_COLOR[e.kind] } as CSSProperties}>
                    <span className={styles.pillText}>{e.app.company}</span>
                  </span>
                ))}
                {list.length > 3 && <span className={styles.more}>+{list.length - 3}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <section className={styles.selected} aria-live="polite">
        <h3 className={styles.dayTitle}>{dayHeading(selected, t)}</h3>
        {selectedEvents.length === 0 ? (
          <p className={styles.nothing}>{t('calendar.nothingThatDay')}</p>
        ) : (
          <ul className={styles.dayList}>
            {selectedEvents.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
