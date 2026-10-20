import { arrayUnion, collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../components/Toast'
import { addDaysISO, todayISO } from '../../lib/dates'
import { db } from '../../lib/firebase'
import { newId } from '../../lib/id'
import { useUser } from '../auth/AuthProvider'
import { useSettings } from '../settings/SettingsProvider'
import {
  isClosed,
  type Application,
  type ApplicationDraft,
  type Contact,
  type Interview,
  type Status,
  type TimelineEvent,
} from './types'

type Patch = Partial<Omit<Application, 'id'>>

function event(type: TimelineEvent['type'], extra: Partial<TimelineEvent> = {}): TimelineEvent {
  // Firestore rejects `undefined` inside arrays, so only set keys that have values.
  const e: TimelineEvent = { id: newId(), at: new Date().toISOString(), type }
  if (extra.from) e.from = extra.from
  if (extra.to) e.to = extra.to
  if (extra.detail) e.detail = extra.detail
  return e
}

/**
 * Side effects of moving to a status: applied date, follow-up reminder, clean-up when closed.
 * Exported for the add flow and demo data, which build documents directly.
 */
export function statusAutomation(
  current: Pick<Application, 'appliedAt' | 'nextFollowUpAt'>,
  to: Status,
  followUpDays: number,
): Pick<Application, 'appliedAt' | 'nextFollowUpAt'> {
  const today = todayISO()
  if (isClosed(to) || to === 'accepted') return { appliedAt: current.appliedAt, nextFollowUpAt: null }
  if (to === 'saved') return { appliedAt: current.appliedAt, nextFollowUpAt: current.nextFollowUpAt }
  const appliedAt = current.appliedAt ?? today
  if (to === 'applied') return { appliedAt, nextFollowUpAt: addDaysISO(today, followUpDays) }
  return { appliedAt, nextFollowUpAt: current.nextFollowUpAt }
}

export function useApplicationActions() {
  const user = useUser()
  const { settings } = useSettings()
  const toast = useToast()
  const { t } = useTranslation()

  return useMemo(() => {
    const col = collection(db, 'users', user.uid, 'applications')
    const ref = (id: string) => doc(col, id)
    const fail = () => toast({ message: t('errors.saveFailed'), tone: 'danger' })
    // Writes resolve only once the server acknowledges them; with the offline cache the UI
    // updates immediately, so we never block on them and only surface failures.
    const run = (p: Promise<unknown>) => void p.catch(fail)

    const update = (id: string, patch: Patch) => run(updateDoc(ref(id), { ...patch, updatedAt: new Date().toISOString() }))

    const create = (draft: ApplicationDraft, opts: { demo?: boolean } = {}): string => {
      const id = doc(col).id
      const now = new Date().toISOString()
      const auto = draft.status === 'saved' ? null : statusAutomation(draft, draft.status, settings.followUpDays)
      const timeline = [event('created', { to: draft.status })]
      const data: Omit<Application, 'id'> = {
        ...draft,
        appliedAt: auto?.appliedAt ?? draft.appliedAt,
        // Keep an explicit follow-up date chosen in the form.
        nextFollowUpAt: draft.nextFollowUpAt ?? auto?.nextFollowUpAt ?? null,
        timeline,
        listingClosed: false,
        ghostDismissedAt: null,
        demo: opts.demo === true,
        createdAt: now,
        updatedAt: now,
      }
      run(setDoc(ref(id), data))
      return id
    }

    const setStatus = (app: Application, to: Status) => {
      if (app.status === to) return
      const auto = statusAutomation(app, to, settings.followUpDays)
      const e = event('status', { from: app.status, to })
      run(
        updateDoc(ref(app.id), {
          status: to,
          ...auto,
          timeline: arrayUnion(e),
          updatedAt: new Date().toISOString(),
        }),
      )
      toast({
        message: t('jobs.movedTo', { status: t(`status.${to}`) }),
        action: {
          label: t('common.undo'),
          onClick: () =>
            update(app.id, {
              status: app.status,
              appliedAt: app.appliedAt,
              nextFollowUpAt: app.nextFollowUpAt,
              timeline: app.timeline,
            }),
        },
      })
    }

    const setArchived = (app: Application, archived: boolean) => {
      run(
        updateDoc(ref(app.id), {
          archived,
          timeline: arrayUnion(event(archived ? 'archived' : 'unarchived')),
          updatedAt: new Date().toISOString(),
        }),
      )
      toast({
        message: t(archived ? 'jobs.archivedToast' : 'jobs.unarchivedToast'),
        action: archived ? { label: t('common.undo'), onClick: () => update(app.id, { archived: false }) } : undefined,
      })
    }

    const remove = (id: string) => run(deleteDoc(ref(id)))

    const duplicate = (app: Application): string => {
      const { id: _id, timeline: _t, createdAt: _c, updatedAt: _u, demo: _d, listingClosed: _l, ghostDismissedAt: _g, ...draft } = app
      return create({
        ...draft,
        title: t('jobs.copyOf', { title: app.title }),
        status: 'saved',
        appliedAt: null,
        nextFollowUpAt: null,
        interviews: [],
        archived: false,
      })
    }

    const upsertInterview = (app: Application, interview: Interview) => {
      const exists = app.interviews.some((i) => i.id === interview.id)
      const interviews = exists
        ? app.interviews.map((i) => (i.id === interview.id ? interview : i))
        : [...app.interviews, interview]
      interviews.sort((a, b) => a.at.localeCompare(b.at))
      const patch: Record<string, unknown> = {
        interviews,
        timeline: arrayUnion(event(exists ? 'interview_updated' : 'interview_added', { detail: interview.type })),
        updatedAt: new Date().toISOString(),
      }
      // Scheduling an interview moves an earlier-stage application forward.
      if (!exists && ['saved', 'applied', 'screening'].includes(app.status)) {
        Object.assign(patch, statusAutomation(app, 'interview', settings.followUpDays), { status: 'interview' })
        patch.timeline = arrayUnion(
          event('interview_added', { detail: interview.type }),
          event('status', { from: app.status, to: 'interview' }),
        )
      }
      run(updateDoc(ref(app.id), patch))
    }

    const removeInterview = (app: Application, interviewId: string) =>
      run(
        updateDoc(ref(app.id), {
          interviews: app.interviews.filter((i) => i.id !== interviewId),
          timeline: arrayUnion(event('interview_removed')),
          updatedAt: new Date().toISOString(),
        }),
      )

    const upsertContact = (app: Application, contact: Contact) => {
      const exists = app.contacts.some((c) => c.id === contact.id)
      const contacts = exists ? app.contacts.map((c) => (c.id === contact.id ? contact : c)) : [...app.contacts, contact]
      const patch: Record<string, unknown> = { contacts, updatedAt: new Date().toISOString() }
      if (!exists) patch.timeline = arrayUnion(event('contact_added', { detail: contact.name }))
      run(updateDoc(ref(app.id), patch))
    }

    const removeContact = (app: Application, contactId: string) =>
      update(app.id, { contacts: app.contacts.filter((c) => c.id !== contactId) })

    const addEvent = (id: string, e: TimelineEvent['type'], patch: Patch = {}) =>
      run(updateDoc(ref(id), { ...patch, timeline: arrayUnion(event(e)), updatedAt: new Date().toISOString() }))

    /** Writes many documents in batches of 400 (Firestore limit is 500 per batch). */
    const writeMany = async (docs: Array<{ id?: string; data: Omit<Application, 'id'> }>) => {
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db)
        for (const d of docs.slice(i, i + 400)) batch.set(d.id ? ref(d.id) : doc(col), d.data)
        await batch.commit()
      }
    }

    const deleteMany = async (ids: string[]) => {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db)
        for (const id of ids.slice(i, i + 400)) batch.delete(ref(id))
        await batch.commit()
      }
    }

    return {
      create,
      update,
      setStatus,
      setArchived,
      remove,
      duplicate,
      upsertInterview,
      removeInterview,
      upsertContact,
      removeContact,
      addEvent,
      writeMany,
      deleteMany,
      newEvent: event,
    }
  }, [user.uid, settings.followUpDays, toast, t])
}

export type ApplicationActions = ReturnType<typeof useApplicationActions>
