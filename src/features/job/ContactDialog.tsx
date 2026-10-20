import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Field, FieldRow, Input } from '../../components/Field'
import { newId } from '../../lib/id'
import type { Contact } from '../applications/types'
import styles from './JobDialogs.module.css'

interface Props {
  open: boolean
  contact: Contact | null
  onSave: (contact: Contact) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export function ContactDialog({ open, contact, onSave, onDelete, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" label={contact ? t('contacts.edit') : t('contacts.add')}>
      {open && <ContactForm key={contact?.id ?? 'new'} contact={contact} onSave={onSave} onDelete={onDelete} onClose={onClose} />}
    </Dialog>
  )
}

function ContactForm({ contact, onSave, onDelete, onClose }: Omit<Props, 'open'>) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Contact>(
    contact ?? { id: newId(), name: '', role: '', email: '', phone: '', linkedin: '' },
  )
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const set = (patch: Partial<Contact>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = () => {
    const e: typeof errors = {}
    if (!draft.name.trim()) e.name = t('contacts.nameRequired')
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) e.email = t('contacts.emailInvalid')
    setErrors(e)
    if (Object.keys(e).length) return
    onSave({
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      linkedin: draft.linkedin.trim(),
    })
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
      <DialogHeader title={contact ? t('contacts.edit') : t('contacts.add')} onClose={onClose} />
      <DialogBody>
        <div className={styles.fields}>
          <FieldRow>
            <Field label={t('contacts.name')} error={errors.name}>
              {(p) => <Input {...p} value={draft.name} autoComplete="off" onChange={(e) => set({ name: e.target.value })} data-autofocus />}
            </Field>
            <Field label={t('contacts.role')} optional>
              {(p) => <Input {...p} value={draft.role} placeholder={t('contacts.rolePlaceholder')} onChange={(e) => set({ role: e.target.value })} />}
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t('contacts.email')} optional error={errors.email}>
              {(p) => <Input {...p} type="email" inputMode="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />}
            </Field>
            <Field label={t('contacts.phone')} optional>
              {(p) => <Input {...p} type="tel" inputMode="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />}
            </Field>
          </FieldRow>
          <Field label="LinkedIn" optional>
            {(p) => <Input {...p} type="url" inputMode="url" placeholder="https://linkedin.com/in/…" value={draft.linkedin} onChange={(e) => set({ linkedin: e.target.value })} />}
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        {contact && onDelete && (
          <Button
            variant="dangerGhost"
            className={styles.footerStart}
            onClick={() => {
              onDelete(contact.id)
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
