import { format } from 'date-fns'
import { CalendarPlus, Mail, MapPin, Pencil, Phone, Plus, SquareUser, Video } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, IconButton } from '../../components/Button'
import { formatDateTime, formatShortDate, formatTime } from '../../lib/dates'
import { googleCalendarUrl } from '../../lib/gcal'
import type { Application, Contact, Interview } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import { ContactDialog } from './ContactDialog'
import { InterviewDialog } from './InterviewDialog'
import { PanelSection } from './PanelSection'
import styles from './PeopleAndInterviews.module.css'

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim())

export function InterviewsSection({ app }: { app: Application }) {
  const { t } = useTranslation()
  const actions = useApplicationActions()
  const [editing, setEditing] = useState<Interview | null>(null)
  const [open, setOpen] = useState(false)
  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm")

  return (
    <PanelSection
      title={t('interviews.title')}
      action={
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus aria-hidden />}
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          {t('interviews.add')}
        </Button>
      }
    >
      {app.interviews.length === 0 ? (
        <p className={styles.empty}>{t('interviews.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {app.interviews.map((iv) => {
            const past = iv.at < now
            const gcal = googleCalendarUrl({
              title: t('calendar.eventTitle', { company: app.company, title: app.title }),
              start: iv.at,
              durationMin: iv.durationMin,
              location: iv.location,
              details: [iv.people, iv.questions].filter(Boolean).join('\n\n'),
            })
            return (
              <li key={iv.id} className={styles.item} data-past={past ? '' : undefined}>
                <span className={styles.chip} aria-hidden>
                  <span className={styles.chipDay}>{formatShortDate(iv.at).split(' ')[0]}</span>
                  <span className={styles.chipSub}>{formatShortDate(iv.at).split(' ')[1]}</span>
                </span>
                <div className={styles.body}>
                  <p className={styles.title}>
                    {t(`interviews.typeLabel.${iv.type}`)}
                    <span className={styles.muted}> · {formatTime(iv.at)}</span>
                    {iv.outcome !== 'pending' && <span className={styles.outcome} data-outcome={iv.outcome}>{t(`interviews.outcomes.${iv.outcome}`)}</span>}
                  </p>
                  <p className="visually-hidden">{formatDateTime(iv.at)}</p>
                  {iv.location &&
                    (isUrl(iv.location) ? (
                      <a className={styles.meta} href={iv.location} target="_blank" rel="noopener noreferrer">
                        <Video aria-hidden />
                        {t('interviews.joinLink')}
                      </a>
                    ) : (
                      <p className={styles.meta}>
                        <MapPin aria-hidden />
                        {iv.location}
                      </p>
                    ))}
                  {iv.people && <p className={styles.meta}>{iv.people}</p>}
                  {!past && gcal && (
                    <a className={styles.gcal} href={gcal} target="_blank" rel="noopener noreferrer">
                      <CalendarPlus aria-hidden />
                      {t('calendar.addToGoogle')}
                    </a>
                  )}
                </div>
                <IconButton
                  label={t('interviews.edit')}
                  size="sm"
                  onClick={() => {
                    setEditing(iv)
                    setOpen(true)
                  }}
                >
                  <Pencil aria-hidden />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}
      <InterviewDialog
        open={open}
        interview={editing}
        onClose={() => setOpen(false)}
        onSave={(iv) => actions.upsertInterview(app, iv)}
        onDelete={(id) => actions.removeInterview(app, id)}
      />
    </PanelSection>
  )
}

export function ContactsSection({ app }: { app: Application }) {
  const { t } = useTranslation()
  const actions = useApplicationActions()
  const [editing, setEditing] = useState<Contact | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <PanelSection
      title={t('contacts.title')}
      action={
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus aria-hidden />}
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          {t('contacts.add')}
        </Button>
      }
    >
      {app.contacts.length === 0 ? (
        <p className={styles.empty}>{t('contacts.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {app.contacts.map((c) => (
            <li key={c.id} className={styles.item}>
              <span className={styles.avatar} aria-hidden>
                {c.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('')}
              </span>
              <div className={styles.body}>
                <p className={styles.title}>
                  {c.name}
                  {c.role && <span className={styles.muted}> · {c.role}</span>}
                </p>
                <div className={styles.links}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} aria-label={`${t('contacts.email')}: ${c.email}`}>
                      <Mail aria-hidden />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/\s/g, '')}`} aria-label={`${t('contacts.phone')}: ${c.phone}`}>
                      <Phone aria-hidden />
                      {c.phone}
                    </a>
                  )}
                  {c.linkedin && isUrl(c.linkedin) && (
                    <a href={c.linkedin} target="_blank" rel="noopener noreferrer">
                      <SquareUser aria-hidden />
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
              <IconButton
                label={t('contacts.edit')}
                size="sm"
                onClick={() => {
                  setEditing(c)
                  setOpen(true)
                }}
              >
                <Pencil aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <ContactDialog
        open={open}
        contact={editing}
        onClose={() => setOpen(false)}
        onSave={(c) => actions.upsertContact(app, c)}
        onDelete={(id) => actions.removeContact(app, id)}
      />
    </PanelSection>
  )
}
