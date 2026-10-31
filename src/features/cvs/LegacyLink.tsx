import { CircleCheck, Link2, Sparkles } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Banner, EmptyState } from '../../components/Feedback'
import { Select } from '../../components/Field'
import { useToast } from '../../components/Toast'
import { useApplications } from '../applications/ApplicationsProvider'
import type { Application } from '../applications/types'
import styles from './Cvs.module.css'
import { useCvs } from './CvsProvider'
import { cvLabel, suggestCvFor } from './labels'
import type { Cv, CvVersion } from './types'
import { useCvActions } from './useCvActions'

interface LegacyGroup {
  key: string
  /** The most common spelling of the old free text. */
  text: string
  appIds: string[]
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Jobs that only have the old free-text "CV used", grouped by that text (ignoring case, accents and spacing). */
function legacyGroups(items: Application[]): LegacyGroup[] {
  const map = new Map<string, { spellings: Map<string, number>; appIds: string[] }>()
  for (const a of items) {
    const text = a.cvVersion.trim()
    if (!text || a.cvId) continue
    const key = fold(text)
    const g = map.get(key) ?? { spellings: new Map<string, number>(), appIds: [] }
    g.spellings.set(text, (g.spellings.get(text) ?? 0) + 1)
    g.appIds.push(a.id)
    map.set(key, g)
  }
  return [...map.entries()]
    .map(([key, g]) => ({ key, text: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0], appIds: g.appIds }))
    .sort((a, b) => b.appIds.length - a.appIds.length || a.text.localeCompare(b.text))
}

/** Shown on the CVs page only while some jobs have old free text and no linked CV. */
export function LegacyLinkSection() {
  const { t } = useTranslation()
  const { items } = useApplications()
  const groups = useMemo(() => legacyGroups(items), [items])
  const [open, setOpen] = useState(false)
  if (!groups.length && !open) return null
  const jobs = groups.reduce((n, g) => n + g.appIds.length, 0)

  return (
    <>
      {groups.length > 0 && (
        <Banner
          tone="accent"
          icon={<Link2 aria-hidden />}
          className={styles.banner}
          actions={
            <Button size="sm" onClick={() => setOpen(true)}>
              {t('legacy.open')}
            </Button>
          }
        >
          {t('legacy.banner', { count: jobs })}
        </Banner>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} size="wide" fullOnMobile label={t('legacy.title')}>
        {open && <LegacyLinkBody groups={groups} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}

interface Pending {
  group: LegacyGroup
  cv: Cv
  version: CvVersion
}

function LegacyLinkBody({ groups, onClose }: { groups: LegacyGroup[]; onClose: () => void }) {
  const { t } = useTranslation()
  const { cvs } = useCvs()
  const actions = useCvActions()
  const toast = useToast()
  const usable = cvs.filter((c) => !c.archived && c.versions.length > 0)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)

  const apply = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await actions.linkJobs(pending.group.appIds, pending.cv, pending.version)
      toast({ message: t('legacy.linked', { count: pending.group.appIds.length, label: cvLabel(pending.cv, pending.version) }) })
      setPending(null)
    } catch {
      toast({ message: t('errors.saveFailed'), tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DialogHeader title={t('legacy.title')} description={t('legacy.lead')} onClose={onClose} />
      <DialogBody>
        {groups.length === 0 ? (
          <EmptyState icon={<CircleCheck aria-hidden />} title={t('legacy.doneTitle')}>
            {t('legacy.doneText')}
          </EmptyState>
        ) : usable.length === 0 ? (
          <EmptyState icon={<Link2 aria-hidden />} title={t('legacy.noCvsTitle')}>
            {t('legacy.noCvsText')}
          </EmptyState>
        ) : (
          <ul className={styles.legacyList}>
            {groups.map((g) => (
              <LegacyRow key={g.key} group={g} cvs={usable} onLink={(cv, version) => setPending({ group: g, cv, version })} />
            ))}
          </ul>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant={groups.length ? 'ghost' : 'primary'} onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={pending !== null}
        title={t('legacy.confirmTitle')}
        confirmLabel={t('legacy.confirm')}
        loading={busy}
        onClose={() => !busy && setPending(null)}
        onConfirm={() => void apply()}
      >
        {pending &&
          t('legacy.confirmText', {
            count: pending.group.appIds.length,
            text: pending.group.text,
            label: cvLabel(pending.cv, pending.version),
          })}
      </ConfirmDialog>
    </>
  )
}

function LegacyRow({ group, cvs, onLink }: { group: LegacyGroup; cvs: Cv[]; onLink: (cv: Cv, version: CvVersion) => void }) {
  const { t } = useTranslation()
  const suggestion = useMemo(() => suggestCvFor(group.text, cvs), [group.text, cvs])
  const suggested = suggestion?.version ? `${suggestion.cv.id}/${suggestion.version.id}` : ''
  const [value, setValue] = useState(suggested)
  const [cvId, versionId] = value.split('/')
  const cv = cvs.find((c) => c.id === cvId)
  const version = cv?.versions.find((v) => v.id === versionId)
  const selectId = useId()

  return (
    <li className={styles.legacyRow}>
      <div className={styles.legacyText}>
        <label htmlFor={selectId} className={styles.legacyQuote}>
          „{group.text}”
        </label>
        <span className={styles.legacyCount}>{t('jobs.count', { count: group.appIds.length })}</span>
      </div>
      <div className={styles.legacyControls}>
        <Select id={selectId} value={value} onChange={(e) => setValue(e.target.value)} className={styles.legacySelect}>
          <option value="">{t('legacy.choose')}</option>
          {cvs.map((c) => (
            <optgroup key={c.id} label={cvLabel(c, null)}>
              {c.versions.map((v, i) => (
                <option key={v.id} value={`${c.id}/${v.id}`}>
                  {`${c.name} · v${v.versionNumber}${i === 0 ? ` (${t('cvs.current')})` : ''}`}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Button variant="primary" disabled={!cv || !version} onClick={() => cv && version && onLink(cv, version)}>
          {t('legacy.link')}
        </Button>
      </div>
      {suggested && value === suggested && (
        <p className={styles.legacyHint}>
          <Sparkles aria-hidden />
          {t('legacy.suggested')}
        </p>
      )}
    </li>
  )
}
