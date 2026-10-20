import { ArrowRight, Bookmark, ClipboardPaste, CopyCheck, Link2, PenLine, Send, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Banner } from '../../components/Feedback'
import { Textarea } from '../../components/Field'
import { Segmented } from '../../components/Menu'
import { useToast } from '../../components/Toast'
import { todayISO } from '../../lib/dates'
import { useApplications } from '../applications/ApplicationsProvider'
import { findDuplicates, type DuplicateReport } from '../applications/duplicates'
import { emptyDraft, type ApplicationDraft } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import { useSettings } from '../settings/SettingsProvider'
import styles from './AddJobDialog.module.css'
import {
  applyExtraction,
  ExtractionError,
  extractFromLink,
  extractFromPastedText,
  looksLikeUrl,
  suggestsPaste,
  type AutoKey,
  type ExtractionFailure,
  type ExtractionResult,
} from './extraction'
import { AutoFilledLegend, JobForm } from './JobForm'
import { ReadingIndicator } from './ReadingIndicator'
import { validateDraft, type DraftErrors } from './validate'

export function AddJobDialog() {
  const { t } = useTranslation()
  const { addOpen, addUrl, closeAdd } = useUI()
  return (
    <Dialog open={addOpen} onClose={closeAdd} size="wide" fullOnMobile label={t('add.title')}>
      {addOpen && <AddJobFlow initialUrl={addUrl} onDone={closeAdd} />}
    </Dialog>
  )
}

type Step = 'link' | 'reading' | 'paste' | 'review'

interface ReviewMeta {
  confidence: ExtractionResult['confidence'] | null
  remaining: number | null
  cached: boolean
}

function AddJobFlow({ initialUrl, onDone }: { initialUrl: string; onDone: () => void }) {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const { items } = useApplications()
  const { openJob } = useUI()
  const actions = useApplicationActions()
  const toast = useToast()

  const [step, setStep] = useState<Step>('link')
  const [url, setUrl] = useState(initialUrl)
  const [pasted, setPasted] = useState('')
  const [failure, setFailure] = useState<ExtractionFailure | null>(null)
  const [draft, setDraft] = useState<ApplicationDraft>(() => emptyDraft(settings.currency))
  const [autoFilled, setAutoFilled] = useState<Set<AutoKey>>(new Set())
  const [meta, setMeta] = useState<ReviewMeta>({ confidence: null, remaining: null, cached: false })
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submitted, setSubmitted] = useState(false)
  // Ignores results of a reading the user cancelled.
  const request = useRef(0)

  // Opened with a link (welcome screen, palette): start reading right away, once.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current || !looksLikeUrl(initialUrl)) return
    autoStarted.current = true
    void readLink(initialUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Each step marks its primary control with data-autofocus.
  useEffect(() => {
    document.querySelector<HTMLElement>('dialog[open] [data-autofocus]')?.focus()
  }, [step])

  const linkDuplicate = useMemo(
    () => (looksLikeUrl(url) ? findDuplicates(items, { sourceUrl: url, company: '', title: '' }).sameJob : null),
    [items, url],
  )
  const duplicates = useMemo(() => findDuplicates(items, draft), [items, draft])

  const toReview = (result: ExtractionResult | null, sourceUrl: string) => {
    const base = { ...emptyDraft(settings.currency), sourceUrl }
    if (result) {
      const applied = applyExtraction(base, result, sourceUrl)
      setDraft(applied.draft)
      setAutoFilled(applied.autoFilled)
      setMeta({ confidence: result.confidence, remaining: result.remaining, cached: result.cached })
    } else {
      setDraft(base)
      setAutoFilled(new Set())
      setMeta({ confidence: null, remaining: null, cached: false })
    }
    setStep('review')
  }

  const readLink = async (value = url) => {
    const target = value.trim()
    if (!looksLikeUrl(target)) {
      setFailure('invalid_url')
      return
    }
    const id = ++request.current
    setFailure(null)
    setStep('reading')
    try {
      const result = await extractFromLink(target)
      if (id === request.current) toReview(result, target)
    } catch (err) {
      if (id !== request.current) return
      const reason = err instanceof ExtractionError ? err.reason : 'internal'
      setFailure(reason)
      setStep(suggestsPaste(reason) ? 'paste' : 'link')
    }
  }

  const readText = async () => {
    const id = ++request.current
    setFailure(null)
    setStep('reading')
    try {
      const result = await extractFromPastedText(pasted, looksLikeUrl(url) ? url.trim() : undefined)
      if (id === request.current) toReview(result, looksLikeUrl(url) ? url.trim() : '')
    } catch (err) {
      if (id !== request.current) return
      setFailure(err instanceof ExtractionError ? err.reason : 'internal')
      setStep('paste')
    }
  }

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

  const openExisting = (id: string) => {
    onDone()
    openJob(id)
  }

  if (step === 'reading') {
    return (
      <>
        <DialogHeader title={t('add.title')} onClose={onDone} />
        <DialogBody>
          <ReadingIndicator url={url} />
        </DialogBody>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              request.current++
              setStep(pasted ? 'paste' : 'link')
            }}
          >
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </>
    )
  }

  if (step === 'link') {
    return (
      <>
        <DialogHeader title={t('add.title')} description={t('add.linkLead')} onClose={onDone} />
        <DialogBody>
          <form
            className={styles.linkForm}
            onSubmit={(e) => {
              e.preventDefault()
              void readLink()
            }}
          >
            <label className={styles.linkField}>
              <Link2 aria-hidden />
              <span className="visually-hidden">{t('add.linkLabel')}</span>
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                data-autofocus
                placeholder={t('add.linkPlaceholder')}
                value={url}
                aria-invalid={failure === 'invalid_url' || undefined}
                aria-describedby={failure ? 'add-link-error' : undefined}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (failure) setFailure(null)
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text').trim()
                  if (!url && looksLikeUrl(text)) {
                    e.preventDefault()
                    setUrl(text)
                    void readLink(text)
                  }
                }}
              />
            </label>
            <Button type="submit" variant="primary" size="lg" icon={<ArrowRight aria-hidden />} disabled={!url.trim()}>
              {t('add.read')}
            </Button>
          </form>
          {failure && (
            <p id="add-link-error" className={styles.linkError} role="alert">
              {t(`add.failures.${failure}`)}
            </p>
          )}
          {linkDuplicate && (
            <Banner
              tone="warning"
              icon={<CopyCheck aria-hidden />}
              className={styles.banner}
              actions={
                <Button size="sm" onClick={() => openExisting(linkDuplicate.id)}>
                  {t('add.openExisting')}
                </Button>
              }
            >
              {t('add.duplicateLink', { title: linkDuplicate.title, company: linkDuplicate.company })}
            </Banner>
          )}
          <div className={styles.alternatives}>
            <button type="button" className={styles.altButton} onClick={() => setStep('paste')}>
              <ClipboardPaste aria-hidden />
              <span>
                <strong>{t('add.pasteInstead')}</strong>
                <span>{t('add.pasteInsteadHint')}</span>
              </span>
            </button>
            <button type="button" className={styles.altButton} onClick={() => toReview(null, looksLikeUrl(url) ? url.trim() : '')}>
              <PenLine aria-hidden />
              <span>
                <strong>{t('add.manual')}</strong>
                <span>{t('add.manualHint')}</span>
              </span>
            </button>
          </div>
        </DialogBody>
      </>
    )
  }

  if (step === 'paste') {
    return (
      <>
        <DialogHeader title={t('add.pasteTitle')} description={t('add.pasteLead')} onClose={onDone} />
        <DialogBody>
          {failure && (
            <Banner tone={failure === 'daily_limit' ? 'warning' : 'neutral'} icon={<TriangleAlert aria-hidden />} className={styles.banner}>
              {t(`add.failures.${failure}`)}
            </Banner>
          )}
          <Textarea
            className={styles.pasteArea}
            rows={14}
            value={pasted}
            placeholder={t('add.pastePlaceholder')}
            aria-label={t('add.pasteTitle')}
            data-autofocus
            onChange={(e) => setPasted(e.target.value)}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => toReview(null, looksLikeUrl(url) ? url.trim() : '')}>
            {t('add.manual')}
          </Button>
          <Button variant="primary" onClick={() => void readText()} disabled={pasted.trim().length < 80}>
            {t('add.extract')}
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader
        title={meta.confidence ? t('add.reviewTitle') : t('add.title')}
        description={meta.confidence ? t(`add.confidence.${meta.confidence}`) : t('add.manualLead')}
        onClose={onDone}
      />
      <DialogBody>
        <DuplicateBanners report={duplicates} onOpen={openExisting} />
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
        {autoFilled.size > 0 && <AutoFilledLegend />}
        <JobForm draft={draft} onChange={change} errors={errors} autoFilled={autoFilled} />
        {meta.remaining !== null && meta.remaining <= 5 && (
          <p className={styles.remaining}>{t('add.remaining', { count: meta.remaining })}</p>
        )}
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

function DuplicateBanners({ report, onOpen }: { report: DuplicateReport; onOpen: (id: string) => void }) {
  const { t } = useTranslation()
  const { sameJob, appliedAtCompany } = report
  if (!sameJob && appliedAtCompany.length === 0) return null
  return (
    <div className={styles.banners}>
      {sameJob && (
        <Banner
          tone="warning"
          icon={<CopyCheck aria-hidden />}
          actions={
            <Button size="sm" onClick={() => onOpen(sameJob.id)}>
              {t('add.openExisting')}
            </Button>
          }
        >
          {t('add.duplicateJob', { title: sameJob.title, status: t(`status.${sameJob.status}`) })}
        </Banner>
      )}
      {appliedAtCompany.length > 0 && (
        <Banner tone="neutral" icon={<TriangleAlert aria-hidden />}>
          {t('add.appliedAtCompany', {
            count: appliedAtCompany.length,
            company: appliedAtCompany[0].company,
            titles: appliedAtCompany
              .slice(0, 3)
              .map((a) => a.title)
              .join(', '),
          })}
        </Banner>
      )}
    </div>
  )
}
