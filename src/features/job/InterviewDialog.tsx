import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Field, FieldRow, Input, Select, Textarea } from '../../components/Field'
import { addDaysISO, todayISO } from '../../lib/dates'
import { newId } from '../../lib/id'
import { INTERVIEW_OUTCOMES, INTERVIEW_TYPES, type Interview, type InterviewOutcome, type InterviewType } from '../applications/types'
import styles from './JobDialogs.module.css'

const DURATIONS = [15, 30, 45, 60, 90, 120, 180]

interface Props {
  open: boolean
  /** Existing interview to edit, or null to add one. */
  interview: Interview | null
  onSave: (interview: Interview) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export function InterviewDialog({ open, interview, onSave, onDelete, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" label={interview ? t('interviews.edit') : t('interviews.add')}>
      {open && <InterviewForm key={interview?.id ?? 'new'} interview={interview} onSave={onSave} onDelete={onDelete} onClose={onClose} />}
    </Dialog>
  )
}

function InterviewForm({ interview, onSave, onDelete, onClose }: Omit<Props, 'open'>) {
  const { t } = useTranslation()
  const [date, setDate] = useState(interview?.at.slice(0, 10) ?? addDaysISO(todayISO(), 1))
  const [time, setTime] = useState(interview?.at.slice(11, 16) || '10:00')
  const [draft, setDraft] = useState<Omit<Interview, 'id' | 'at'>>({
    durationMin: interview?.durationMin ?? 45,
    type: interview?.type ?? 'hr',
    location: interview?.location ?? '',
    people: interview?.people ?? '',
    notes: interview?.notes ?? '',
    questions: interview?.questions ?? '',
    outcome: interview?.outcome ?? 'pending',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = () => {
    if (!date || !time) {
      setError(t('interviews.whenRequired'))
      return
    }
    onSave({ id: interview?.id ?? newId(), at: `${date}T${time}`, ...draft })
    onClose()
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <DialogHeader title={interview ? t('interviews.edit') : t('interviews.add')} onClose={onClose} />
      <DialogBody>
        <div className={styles.fields}>
          <FieldRow>
            <Field label={t('interviews.date')} error={error}>
              {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} required data-autofocus />}
            </Field>
            <Field label={t('interviews.time')}>
              {(p) => <Input {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />}
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t('interviews.type')}>
              {(p) => (
                <Select {...p} value={draft.type} onChange={(e) => set({ type: e.target.value as InterviewType })}>
                  {INTERVIEW_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`interviews.typeLabel.${type}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('interviews.duration')}>
              {(p) => (
                <Select {...p} value={draft.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {t('interviews.minutes', { count: d })}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </FieldRow>
          <Field label={t('interviews.location')} optional hint={t('interviews.locationHint')}>
            {(p) => <Input {...p} value={draft.location} onChange={(e) => set({ location: e.target.value })} />}
          </Field>
          <Field label={t('interviews.people')} optional>
            {(p) => <Input {...p} value={draft.people} placeholder={t('interviews.peoplePlaceholder')} onChange={(e) => set({ people: e.target.value })} />}
          </Field>
          <Field label={t('interviews.questions')} optional>
            {(p) => <Textarea {...p} rows={3} value={draft.questions} placeholder={t('interviews.questionsPlaceholder')} onChange={(e) => set({ questions: e.target.value })} />}
          </Field>
          <Field label={t('interviews.notes')} optional>
            {(p) => <Textarea {...p} rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />}
          </Field>
          <Field label={t('interviews.outcome')}>
            {(p) => (
              <Select {...p} value={draft.outcome} onChange={(e) => set({ outcome: e.target.value as InterviewOutcome })}>
                {INTERVIEW_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {t(`interviews.outcomes.${o}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        {interview && onDelete && (
          <Button
            variant="dangerGhost"
            className={styles.footerStart}
            onClick={() => {
              onDelete(interview.id)
              onClose()
            }}
          >
            {t('common.delete')}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary">
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
