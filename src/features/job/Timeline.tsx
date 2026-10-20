import {
  Archive,
  ArchiveRestore,
  CalendarMinus,
  CalendarPlus,
  CalendarSync,
  CircleSlash,
  FileInput,
  MailCheck,
  Plus,
  RefreshCw,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatusDot } from '../../components/Badge'
import { formatDateTime, formatRelative } from '../../lib/dates'
import { STATUS_ICON } from '../applications/status'
import type { TimelineEvent, TimelineEventType } from '../applications/types'
import styles from './Timeline.module.css'

const ICONS: Record<Exclude<TimelineEventType, 'status'>, LucideIcon> = {
  created: Plus,
  interview_added: CalendarPlus,
  interview_updated: CalendarSync,
  interview_removed: CalendarMinus,
  contact_added: UserPlus,
  followed_up: MailCheck,
  archived: Archive,
  unarchived: ArchiveRestore,
  reloaded: RefreshCw,
  listing_closed: CircleSlash,
  imported: FileInput,
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const { t } = useTranslation()
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at))

  const describe = (e: TimelineEvent): string => {
    switch (e.type) {
      case 'status':
        return e.from
          ? t('timeline.statusFromTo', { from: t(`status.${e.from}`), to: t(`status.${e.to ?? 'saved'}`) })
          : t('timeline.status', { to: t(`status.${e.to ?? 'saved'}`) })
      case 'created':
        return e.to && e.to !== 'saved' ? t('timeline.createdAs', { status: t(`status.${e.to}`) }) : t('timeline.created')
      case 'interview_added':
      case 'interview_updated':
        return t(`timeline.${e.type}`, {
          type: e.detail ? t(`interviews.types.${e.detail as 'hr' | 'technical' | 'final' | 'other'}`) : '',
        })
      case 'contact_added':
        return t('timeline.contact_added', { name: e.detail ?? '' })
      default:
        return t(`timeline.${e.type}`)
    }
  }

  return (
    <ol className={styles.list}>
      {sorted.map((e) => {
        const Icon = e.type === 'status' && e.to ? STATUS_ICON[e.to] : ICONS[e.type as Exclude<TimelineEventType, 'status'>]
        return (
          <li key={e.id} className={styles.item}>
            <span className={styles.marker} aria-hidden>
              {e.type === 'status' && e.to ? <StatusDot status={e.to} /> : Icon ? <Icon /> : null}
            </span>
            <div className={styles.body}>
              <p className={styles.text}>{describe(e)}</p>
              <time className={styles.time} dateTime={e.at} title={formatDateTime(e.at)}>
                {formatRelative(e.at)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
