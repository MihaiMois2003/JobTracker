import { CopyCheck, FileText, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Banner } from '../../components/Feedback'
import { Field, Input, Select, Textarea } from '../../components/Field'
import { useToast } from '../../components/Toast'
import { currentLanguage } from '../../i18n'
import { cx } from '../../lib/cx'
import { useIsPhone } from '../../lib/useMediaQuery'
import { CvFileError, validateCvFile, type CvFileErrorCode } from './cvFiles'
import styles from './Cvs.module.css'
import { useCvs } from './CvsProvider'
import { cvLabel, formatBytes } from './labels'
import { CV_LANGUAGES, type Cv, type CvLanguage, type CvVersion } from './types'
import { useCvActions, type CvUpload } from './useCvActions'

export type UploadMode = { kind: 'new' } | { kind: 'version'; cv: Cv }

interface UploadDialogProps {
  mode: UploadMode | null
  /** A file dropped on the page before the dialog opened. */
  initialFile: File | null
  onClose: () => void
  /** Called with the new CV's id after a successful first upload. */
  onCreated?: (cvId: string) => void
}

export function UploadDialog({ mode, initialFile, onClose, onCreated }: UploadDialogProps) {
  const { t } = useTranslation()
  const title = mode?.kind === 'version' ? t('cvs.uploadVersionTitle', { name: mode.cv.name }) : t('cvs.uploadNew')
  return (
    <Dialog open={mode !== null} onClose={onClose} fullOnMobile label={title}>
      {mode && <UploadFlow mode={mode} title={title} initialFile={initialFile} onClose={onClose} onCreated={onCreated} />}
    </Dialog>
  )
}

/** Any existing version with the same file name and size: most likely the same file again. */
function findDuplicate(cvs: Cv[], file: File): { cv: Cv; version: CvVersion } | null {
  for (const cv of cvs) {
    const version = cv.versions.find((v) => v.fileName === file.name && v.size === file.size)
    if (version) return { cv, version }
  }
  return null
}

function UploadFlow({
  mode,
  title,
  initialFile,
  onClose,
  onCreated,
}: {
  mode: UploadMode
  title: string
  initialFile: File | null
  onClose: () => void
  onCreated?: (cvId: string) => void
}) {
  const { t, i18n } = useTranslation()
  const { cvs } = useCvs()
  const actions = useCvActions()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [language, setLanguage] = useState<CvLanguage>(currentLanguage())
  const [description, setDescription] = useState('')
  const [makeDefault, setMakeDefault] = useState(false)
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const upload = useRef<CvUpload<string> | null>(null)
  const uploading = progress !== null
  const isFirst = !cvs.some((c) => !c.archived)

  // Closing the dialog mid-upload cancels it.
  useEffect(() => () => upload.current?.cancel(), [])

  const fileErrorText = (code: CvFileErrorCode, f: File) =>
    code === 'too_large' ? t('cvs.errors.too_large', { size: formatBytes(f.size, i18n.language) }) : t(`cvs.errors.${code}`)

  const pick = async (f: File) => {
    setSubmitError(null)
    const code = await validateCvFile(f)
    if (code) {
      setFile(null)
      setFileError(fileErrorText(code, f))
      return
    }
    setFileError(null)
    setFile(f)
    if (mode.kind === 'new') {
      setName((n) => n || f.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim())
      setNameError(false)
    }
  }

  const started = useRef(false)
  useEffect(() => {
    if (started.current || !initialFile) return
    started.current = true
    void pick(initialFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const duplicate = useMemo(() => (file ? findDuplicate(cvs, file) : null), [cvs, file])

  const submit = () => {
    if (!file || uploading) return
    if (mode.kind === 'new' && !name.trim()) {
      setNameError(true)
      return
    }
    setSubmitError(null)
    setProgress(0)
    const handle =
      mode.kind === 'new'
        ? actions.createCv({ file, name, language, description, makeDefault }, setProgress)
        : actions.addVersion(mode.cv, file, note, setProgress)
    upload.current = handle
    handle.done
      .then((id) => {
        upload.current = null
        if (mode.kind === 'new') {
          toast({ message: t('cvs.uploaded'), action: onCreated ? { label: t('common.open'), onClick: () => onCreated(id) } : undefined })
        } else {
          toast({ message: t('cvs.versionUploaded') })
        }
        onClose()
      })
      .catch((err: unknown) => {
        upload.current = null
        setProgress(null)
        if (err instanceof CvFileError && err.code === 'canceled') return
        setSubmitError(err instanceof CvFileError ? t(`cvs.errors.${err.code}`) : t('errors.saveFailed'))
      })
  }

  const cancel = () => {
    upload.current?.cancel()
    onClose()
  }

  return (
    <>
      <DialogHeader title={title} description={t('cvs.form.lead')} onClose={cancel} />
      <DialogBody>
        <form
          className={styles.uploadForm}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <DropZone file={file} error={fileError} disabled={uploading} onFile={(f) => void pick(f)} />

          {duplicate && (
            <Banner tone="warning" icon={<CopyCheck aria-hidden />}>
              {t('cvs.form.duplicate', { label: cvLabel(duplicate.cv, duplicate.version) })}
            </Banner>
          )}

          {mode.kind === 'new' ? (
            <>
              <Field label={t('cvs.form.name')} error={nameError ? t('cvs.form.nameRequired') : null}>
                {(p) => (
                  <Input
                    {...p}
                    value={name}
                    placeholder={t('cvs.form.namePlaceholder')}
                    maxLength={80}
                    disabled={uploading}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (e.target.value.trim()) setNameError(false)
                    }}
                  />
                )}
              </Field>
              <Field label={t('cvLanguage.label')}>
                {(p) => (
                  <Select {...p} value={language} disabled={uploading} onChange={(e) => setLanguage(e.target.value as CvLanguage)}>
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
                    rows={2}
                    value={description}
                    placeholder={t('cvs.form.descriptionPlaceholder')}
                    disabled={uploading}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                )}
              </Field>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={makeDefault || isFirst}
                  disabled={isFirst || uploading}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                />
                <span>
                  {t('cvs.form.makeDefault')}
                  {isFirst && <span className={styles.checkHint}>{t('cvs.form.firstIsDefault')}</span>}
                </span>
              </label>
            </>
          ) : (
            <Field label={t('cvs.form.note')} optional>
              {(p) => (
                <Textarea
                  {...p}
                  rows={2}
                  value={note}
                  placeholder={t('cvs.form.notePlaceholder')}
                  disabled={uploading}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </Field>
          )}

          {uploading && <ProgressBar ratio={progress} label={t('cvs.form.uploading', { pct: Math.round(progress * 100) })} />}
          {submitError && (
            <p className={styles.formError} role="alert">
              {submitError}
            </p>
          )}
          {/* Lets Enter submit from the name field. */}
          <button type="submit" hidden tabIndex={-1} aria-hidden />
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={cancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" icon={<Upload aria-hidden />} disabled={!file} loading={uploading} onClick={submit}>
          {duplicate ? t('cvs.form.submitAnyway') : t('cvs.form.submit')}
        </Button>
      </DialogFooter>
    </>
  )
}

function DropZone({
  file,
  error,
  disabled,
  onFile,
}: {
  file: File | null
  error: string | null
  disabled: boolean
  onFile: (file: File) => void
}) {
  const { t, i18n } = useTranslation()
  const isPhone = useIsPhone()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const errorId = useId()
  const browse = () => inputRef.current?.click()

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f && !disabled) onFile(f)
  }

  return (
    <div>
      <div
        className={cx(styles.drop, over && styles.dropOver, error && styles.dropError)}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) onFile(f)
          }}
        />
        {file ? (
          <div className={styles.fileRow}>
            <FileText aria-hidden />
            <span className={styles.fileName}>{file.name}</span>
            <span className={cx(styles.fileSize, 'tabular')}>{formatBytes(file.size, i18n.language)}</span>
            <Button size="sm" onClick={browse} disabled={disabled} aria-describedby={error ? errorId : undefined}>
              {t('cvs.form.change')}
            </Button>
          </div>
        ) : (
          <>
            <span className={styles.dropIcon}>
              <Upload aria-hidden />
            </span>
            {!isPhone && <p className={styles.dropText}>{t('cvs.form.drop')}</p>}
            <Button variant={isPhone ? 'primary' : 'secondary'} onClick={browse} disabled={disabled} data-autofocus aria-describedby={error ? errorId : undefined}>
              {t('cvs.form.pick')}
            </Button>
            <p className={styles.dropHint}>{t('cvs.form.limits')}</p>
          </>
        )}
      </div>
      {error && (
        <p id={errorId} className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function ProgressBar({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div className={styles.progress}>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <span className={styles.progressFill} style={{ width: `${Math.max(2, ratio * 100)}%` }} />
      </div>
      <span className={styles.progressLabel} aria-hidden>
        {label}
      </span>
    </div>
  )
}
