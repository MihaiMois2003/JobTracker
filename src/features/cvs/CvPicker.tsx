import { Check, ChevronDown, FileText, Settings2, Star, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { EmptyState } from '../../components/Feedback'
import { cx } from '../../lib/cx'
import { formatShortDate } from '../../lib/dates'
import type { Application } from '../applications/types'
import styles from './CvPicker.module.css'
import { useCvs } from './CvsProvider'
import { currentVersion, cvSelection, NO_CV, resolveJobCv } from './labels'
import { CV_LANGUAGES, type Cv, type CvSelection } from './types'

type CvValue = Pick<Application, 'cvId' | 'cvVersionId' | 'cvLabelSnapshot' | 'cvDeleted'>

interface CvPickerProps {
  id?: string
  value: CvValue
  onChange: (selection: CvSelection) => void
  /** Keeps the sheet open (e.g. from the "Change CV" toast) until it is closed, which calls onAutoOpenDone. */
  autoOpen?: boolean
  onAutoOpenDone?: () => void
  /** Context for screen readers, e.g. the job title. */
  context?: string
  /** `inline` in the job page's fact rows, `field` in forms. */
  variant?: 'inline' | 'field'
}

/** "CV used" control: a field-like trigger that opens a sheet (bottom sheet on phones). */
export function CvPicker({ id, value, onChange, autoOpen, onAutoOpenDone, context, variant = 'inline' }: CvPickerProps) {
  const { t } = useTranslation()
  const { byId } = useCvs()
  const [opened, setOpened] = useState(false)
  const open = opened || !!autoOpen
  const close = () => {
    setOpened(false)
    if (autoOpen) onAutoOpenDone?.()
  }
  const resolved = resolveJobCv(value, byId)
  const text = resolved ? (resolved.deleted ? `${resolved.label} ${t('cvPicker.deletedSuffix')}` : resolved.label) : t('cvPicker.none')

  return (
    <>
      <button
        id={id}
        type="button"
        className={cx(styles.trigger, variant === 'field' && styles.field, !resolved && styles.empty, resolved?.deleted && styles.deleted)}
        aria-haspopup="dialog"
        onClick={() => setOpened(true)}
      >
        <span className={styles.triggerText}>{text}</span>
        <ChevronDown aria-hidden />
      </button>
      <Dialog open={open} onClose={close} variant="sheet" label={t('cvPicker.title')}>
        {open && (
          <PickerBody
            value={value}
            context={context}
            onPick={(sel) => {
              close()
              onChange(sel)
            }}
            onClose={close}
          />
        )}
      </Dialog>
    </>
  )
}

function PickerBody({
  value,
  context,
  onPick,
  onClose,
}: {
  value: CvValue
  context?: string
  onPick: (sel: CvSelection) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cvs } = useCvs()
  // Archived CVs are hidden, except the one this job already uses.
  const usable = cvs.filter((c) => c.versions.length > 0 && (!c.archived || c.id === value.cvId))
  const selectedCv = usable.find((c) => c.id === value.cvId)
  const [expanded, setExpanded] = useState<string | null>(() =>
    selectedCv && value.cvVersionId && currentVersion(selectedCv)?.id !== value.cvVersionId ? selectedCv.id : null,
  )

  const goToCvs = (upload: boolean) => {
    onClose()
    navigate(upload ? '/cvs?upload=1' : '/cvs')
  }

  // Grouped by language; the default CV's language comes first, and the default CV first within it.
  const defaultLang = usable.find((c) => c.isDefault)?.language
  const languages = CV_LANGUAGES.filter((l) => usable.some((c) => c.language === l)).sort(
    (a, b) => Number(b === defaultLang) - Number(a === defaultLang),
  )
  const groups = languages.map((language) => ({
    language,
    cvs: usable
      .filter((c) => c.language === language)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)),
  }))

  const cvOption = (cv: Cv) => {
    const current = currentVersion(cv)
    const isSelected = value.cvId === cv.id && !value.cvDeleted
    const onCurrent = isSelected && value.cvVersionId === current?.id
    const isOpen = expanded === cv.id
    return (
      <li key={cv.id} className={styles.cvItem}>
        <div className={styles.cvRow}>
          <button type="button" className={styles.option} aria-pressed={onCurrent} onClick={() => onPick(cvSelection(cv, current))}>
            <span className={styles.optionIcon}>
              <FileText aria-hidden />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionName}>
                {cv.name}
                {cv.isDefault && (
                  <span className={styles.defaultMark}>
                    <Star aria-hidden />
                    {t('cvs.default')}
                  </span>
                )}
              </span>
              <span className={styles.optionMeta}>
                {current && t('cvPicker.currentVersion', { n: current.versionNumber })}
                {isSelected && !onCurrent && ` · ${t('cvPicker.olderChosen')}`}
              </span>
            </span>
            {onCurrent && <Check aria-hidden className={styles.check} />}
          </button>
          {cv.versions.length > 1 && (
            <button
              type="button"
              className={styles.more}
              aria-expanded={isOpen}
              aria-controls={`cv-versions-${cv.id}`}
              onClick={() => setExpanded(isOpen ? null : cv.id)}
            >
              {t('cvPicker.otherVersion')}
              <ChevronDown aria-hidden />
            </button>
          )}
        </div>
        {isOpen && (
          <ul id={`cv-versions-${cv.id}`} className={styles.versions}>
            {cv.versions.map((v, i) => {
              const chosen = isSelected && value.cvVersionId === v.id
              return (
                <li key={v.id}>
                  <button type="button" className={styles.versionOption} aria-pressed={chosen} onClick={() => onPick(cvSelection(cv, v))}>
                    <span className={styles.versionNumber}>v{v.versionNumber}</span>
                    <span className={styles.optionText}>
                      <span className={styles.optionMeta}>
                        {formatShortDate(v.uploadedAt)}
                        {i === 0 && ` · ${t('cvs.current')}`}
                      </span>
                      {v.note && <span className={styles.versionNote}>{v.note}</span>}
                    </span>
                    {chosen && <Check aria-hidden className={styles.check} />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <>
      <DialogHeader title={t('cvPicker.title')} description={context} onClose={onClose} />
      <DialogBody>
        {usable.length === 0 ? (
          <EmptyState
            icon={<FileText aria-hidden />}
            title={t('cvPicker.emptyTitle')}
            action={
              <Button variant="primary" icon={<Upload aria-hidden />} onClick={() => goToCvs(true)}>
                {t('cvs.upload')}
              </Button>
            }
          >
            {t('cvPicker.emptyText')}
          </EmptyState>
        ) : (
          <div className={styles.groups}>
            {groups.map((g) => (
              <section key={g.language} aria-label={t(`cvLanguage.${g.language}`)}>
                {languages.length > 1 && <p className={styles.groupLabel}>{t(`cvLanguage.${g.language}`)}</p>}
                <ul className={styles.list}>{g.cvs.map(cvOption)}</ul>
              </section>
            ))}
            {(value.cvId || value.cvLabelSnapshot) && (
              <button type="button" className={cx(styles.option, styles.clear)} onClick={() => onPick(NO_CV)}>
                {t('cvPicker.clear')}
              </button>
            )}
          </div>
        )}
      </DialogBody>
      {usable.length > 0 && (
        <DialogFooter>
          <Button variant="ghost" icon={<Settings2 aria-hidden />} onClick={() => goToCvs(false)}>
            {t('cvPicker.manage')}
          </Button>
        </DialogFooter>
      )}
    </>
  )
}
