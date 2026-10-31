import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Field, Input, Select, Textarea } from '../../components/Field'
import { useToast } from '../../components/Toast'
import styles from './Cvs.module.css'
import { CV_LANGUAGES, type Cv, type CvLanguage } from './types'
import { useCvActions } from './useCvActions'

export function EditCvDialog({ cv, onClose }: { cv: Cv | null; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={cv !== null} onClose={onClose} variant="sheet" label={t('cvs.edit.title')}>
      {cv && <EditForm key={cv.id} cv={cv} onClose={onClose} />}
    </Dialog>
  )
}

function EditForm({ cv, onClose }: { cv: Cv; onClose: () => void }) {
  const { t } = useTranslation()
  const actions = useCvActions()
  const toast = useToast()
  const [name, setName] = useState(cv.name)
  const [language, setLanguage] = useState<CvLanguage>(cv.language)
  const [description, setDescription] = useState(cv.description)
  const [submitted, setSubmitted] = useState(false)
  const nameError = submitted && !name.trim() ? t('cvs.form.nameRequired') : null

  const save = () => {
    setSubmitted(true)
    if (!name.trim()) return
    // Firestore applies this locally at once (offline too); only a rejected write is reported.
    actions
      .updateCv(cv, { name: name.trim(), language, description: description.trim() })
      .catch(() => toast({ message: t('errors.saveFailed'), tone: 'danger' }))
    onClose()
  }

  return (
    <>
      <DialogHeader title={t('cvs.edit.title')} onClose={onClose} />
      <DialogBody>
        <form
          className={styles.uploadForm}
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label={t('cvs.form.name')} error={nameError}>
            {(p) => <Input {...p} value={name} maxLength={80} data-autofocus onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label={t('cvLanguage.label')}>
            {(p) => (
              <Select {...p} value={language} onChange={(e) => setLanguage(e.target.value as CvLanguage)}>
                {CV_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {t(`cvLanguage.${l}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('cvs.form.description')} optional>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={description}
                placeholder={t('cvs.form.descriptionPlaceholder')}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <button type="submit" hidden tabIndex={-1} aria-hidden />
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={save}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </>
  )
}
