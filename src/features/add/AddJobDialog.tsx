import { Bookmark, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Segmented } from '../../components/Menu'
import { useToast } from '../../components/Toast'
import { todayISO } from '../../lib/dates'
import { emptyDraft, type ApplicationDraft } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import { useSettings } from '../settings/SettingsProvider'
import styles from './AddJobDialog.module.css'
import { JobForm } from './JobForm'
import { validateDraft, type DraftErrors } from './validate'

export function AddJobDialog() {
  const { t } = useTranslation()
  const { addOpen, closeAdd } = useUI()
  return (
    <Dialog open={addOpen} onClose={closeAdd} size="wide" fullOnMobile label={t('add.title')}>
      {addOpen && <AddJobFlow onDone={closeAdd} />}
    </Dialog>
  )
}

function AddJobFlow({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const { openJob } = useUI()
  const actions = useApplicationActions()
  const toast = useToast()
  const [draft, setDraft] = useState<ApplicationDraft>(() => emptyDraft(settings.currency))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const change = (patch: Partial<ApplicationDraft>) => {
    const next = { ...draft, ...patch }
    if (patch.status && patch.status !== 'saved' && !next.appliedAt) next.appliedAt = todayISO()
    setDraft(next)
    if (submitted) setErrors(validateDraft(next, t))
  }

  const save = () => {
    setSubmitted(true)
    const errs = validateDraft(draft, t)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const id = actions.create({ ...draft, sourceUrl: draft.sourceUrl.trim(), title: draft.title.trim(), company: draft.company.trim() })
    toast({ message: t('add.savedToast'), action: { label: t('common.open'), onClick: () => openJob(id) } })
    onDone()
  }

  return (
    <>
      <DialogHeader title={t('add.title')} description={t('add.manualLead')} onClose={onDone} />
      <DialogBody>
        <div className={styles.quickStatus}>
          <span className={styles.quickLabel}>{t('add.quickStatus')}</span>
          <Segmented<'saved' | 'applied'>
            label={t('add.quickStatus')}
            value={draft.status === 'saved' ? 'saved' : 'applied'}
            onChange={(v) => change({ status: v, appliedAt: v === 'applied' ? (draft.appliedAt ?? todayISO()) : null })}
            options={[
              { value: 'saved', label: t('add.justSave'), icon: <Bookmark aria-hidden /> },
              { value: 'applied', label: t('add.appliedToday'), icon: <Send aria-hidden /> },
            ]}
          />
        </div>
        <JobForm draft={draft} onChange={change} errors={errors} />
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={save}>
          {t('add.save')}
        </Button>
      </DialogFooter>
    </>
  )
}
