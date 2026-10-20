import {
  Archive,
  ArchiveRestore,
  Banknote,
  BellRing,
  Briefcase,
  CalendarCheck,
  CalendarX,
  CircleSlash,
  Copy,
  Ellipsis,
  ExternalLink,
  FileText,
  Flag,
  Ghost,
  Globe,
  Link2,
  MapPin,
  Monitor,
  RefreshCw,
  Trash,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button, IconButton } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { Banner, EmptyState, Skeleton } from '../../components/Feedback'
import { Menu, type MenuEntry } from '../../components/Menu'
import { TagInput } from '../../components/TagInput'
import { useToast } from '../../components/Toast'
import { CURRENCIES } from '../../lib/money'
import { useApplications } from '../applications/ApplicationsProvider'
import { StatusSelect } from '../applications/StatusSelect'
import {
  EMPLOYMENT_TYPES,
  PRIORITIES,
  PRIORITY_KEY,
  SALARY_PERIODS,
  SOURCES,
  WORK_MODES,
  type Application,
} from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import { useAttention } from '../today/useAttention'
import { daysSince } from '../../lib/dates'
import { lastActivityAt } from '../applications/selectors'
import { AutosaveTextarea, FactRow, InlineDate, InlineNumber, InlineSelect, InlineText } from './InlineFields'
import styles from './JobPanel.module.css'
import { PanelSection } from './PanelSection'
import { ContactsSection, InterviewsSection } from './PeopleAndInterviews'
import { Timeline } from './Timeline'
import { useReloadFromLink } from './useReloadFromLink'

export function JobPanel() {
  const { t } = useTranslation()
  const { jobId, closeJob } = useUI()
  const { byId, loading } = useApplications()
  const app = jobId ? byId.get(jobId) : undefined

  return (
    <Dialog open={jobId !== null} onClose={closeJob} variant="panel" label={app ? `${app.title}, ${app.company}` : t('job.label')}>
      {app ? (
        <JobDetail key={app.id} app={app} onClose={closeJob} />
      ) : loading ? (
        <PanelSkeleton />
      ) : (
        <div className={styles.missing}>
          <EmptyState icon={<CircleSlash aria-hidden />} title={t('job.notFound')} action={<Button onClick={closeJob}>{t('common.close')}</Button>} />
        </div>
      )}
    </Dialog>
  )
}

function JobDetail({ app, onClose }: { app: Application; onClose: () => void }) {
  const { t } = useTranslation()
  const actions = useApplicationActions()
  const { openJob } = useUI()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { reload, busyId } = useReloadFromLink()
  const { ghostSuggestions } = useAttention()
  const suggestGhost = ghostSuggestions.some((a) => a.id === app.id)
  const reloading = busyId === app.id
  const set = (patch: Partial<Application>) => actions.update(app.id, patch)

  const menuItems: MenuEntry[] = [
    ...(app.sourceUrl
      ? [
          {
            key: 'reload',
            label: t('job.actions.reload'),
            icon: <RefreshCw aria-hidden />,
            onSelect: () => void reload(app),
          },
        ]
      : []),
    {
      key: 'duplicate',
      label: t('job.actions.duplicate'),
      icon: <Copy aria-hidden />,
      onSelect: () => {
        const id = actions.duplicate(app)
        toast({ message: t('job.duplicated') })
        openJob(id)
      },
    },
    {
      key: 'archive',
      label: app.archived ? t('job.actions.unarchive') : t('job.actions.archive'),
      icon: app.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />,
      onSelect: () => actions.setArchived(app, !app.archived),
    },
    'separator',
    {
      key: 'delete',
      label: t('job.actions.delete'),
      icon: <Trash aria-hidden />,
      danger: true,
      onSelect: () => setConfirmDelete(true),
    },
  ]

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <InlineText
            value={app.company}
            onCommit={(company) => set({ company })}
            placeholder={t('job.fields.company')}
            ariaLabel={t('job.fields.company')}
            className={styles.company}
          />
          <Menu
            label={t('common.more')}
            items={menuItems}
            trigger={(props) => (
              <IconButton label={t('common.more')} {...props}>
                <Ellipsis aria-hidden />
              </IconButton>
            )}
          />
          {/* Initial focus lands here (not in the first editable field). */}
          <IconButton label={t('common.close')} onClick={onClose} data-autofocus>
            <X aria-hidden />
          </IconButton>
        </div>
        <InlineText
          value={app.title}
          onCommit={(title) => set({ title })}
          placeholder={t('job.fields.title')}
          ariaLabel={t('job.fields.title')}
          className={styles.title}
        />
        <div className={styles.headerActions}>
          <StatusSelect value={app.status} onChange={(s) => actions.setStatus(app, s)} />
          {app.sourceUrl && (
            <a className={styles.linkButton} href={app.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              {t('job.openOriginal')}
            </a>
          )}
          {reloading && (
            <span className={styles.archivedNote} role="status">
              {t('job.reload.busy')}
            </span>
          )}
          {app.archived && <span className={styles.archivedNote}>{t('job.archivedNote')}</span>}
        </div>
      </header>

      <div className={styles.body}>
        {app.listingClosed && (
          <Banner
            tone="warning"
            icon={<CircleSlash aria-hidden />}
            actions={
              app.status !== 'withdrawn' && app.status !== 'rejected' && !app.archived ? (
                <Button size="sm" onClick={() => actions.setArchived(app, true)}>
                  {t('job.actions.archive')}
                </Button>
              ) : undefined
            }
          >
            {t('job.listingClosed')}
          </Banner>
        )}

        {suggestGhost && (
          <Banner
            tone="neutral"
            icon={<Ghost aria-hidden />}
            actions={
              <>
                <Button size="sm" onClick={() => actions.setStatus(app, 'ghosted')}>
                  {t('today.markGhosted')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => actions.dismissGhost(app)}>
                  {t('today.stillWaiting')}
                </Button>
              </>
            }
          >
            {t('job.ghostSuggestion', { count: daysSince(lastActivityAt(app)) ?? 0 })}
          </Banner>
        )}

        <PanelSection title={t('job.sections.details')}>
          <div className={styles.facts}>
            <FactRow label={t('job.fields.location')} icon={<MapPin aria-hidden />}>
              {(id) => <InlineText id={id} value={app.location} onCommit={(location) => set({ location })} placeholder={t('job.add')} />}
            </FactRow>
            <FactRow label={t('workMode.label')} icon={<Monitor aria-hidden />}>
              {(id) => (
                <InlineSelect
                  id={id}
                  value={app.workMode}
                  placeholder={t('job.unknown')}
                  options={WORK_MODES.map((m) => ({ value: m, label: t(`workMode.${m}`) }))}
                  onCommit={(workMode) => set({ workMode })}
                />
              )}
            </FactRow>
            <FactRow label={t('employmentType.label')} icon={<Briefcase aria-hidden />}>
              {(id) => (
                <InlineSelect
                  id={id}
                  value={app.employmentType}
                  placeholder={t('job.unknown')}
                  options={EMPLOYMENT_TYPES.map((m) => ({ value: m, label: t(`employmentType.${m}`) }))}
                  onCommit={(employmentType) => set({ employmentType })}
                />
              )}
            </FactRow>
            <FactRow label={t('job.fields.salary')} icon={<Banknote aria-hidden />}>
              {(id) => (
                <div className={styles.salary}>
                  <InlineNumber id={id} value={app.salaryMin} onCommit={(salaryMin) => set({ salaryMin })} placeholder={t('job.min')} ariaLabel={t('job.fields.salaryMin')} />
                  <span aria-hidden>–</span>
                  <InlineNumber value={app.salaryMax} onCommit={(salaryMax) => set({ salaryMax })} placeholder={t('job.max')} ariaLabel={t('job.fields.salaryMax')} />
                  <InlineSelect
                    value={app.currency}
                    ariaLabel={t('job.fields.currency')}
                    options={withCurrent(CURRENCIES, app.currency).map((c) => ({ value: c, label: c }))}
                    onCommit={(currency) => set({ currency: currency ?? 'RON' })}
                  />
                  <InlineSelect
                    value={app.salaryPeriod}
                    ariaLabel={t('salaryPeriod.label')}
                    placeholder="—"
                    options={SALARY_PERIODS.map((p) => ({ value: p, label: t(`salaryPeriod.${p}`) }))}
                    onCommit={(salaryPeriod) => set({ salaryPeriod })}
                  />
                </div>
              )}
            </FactRow>
            {['offer', 'accepted'].includes(app.status) && (
              <FactRow label={t('job.fields.salaryOffered')} icon={<Banknote aria-hidden />}>
                {(id) => (
                  <InlineNumber id={id} value={app.salaryOffered} onCommit={(salaryOffered) => set({ salaryOffered })} placeholder={t('job.add')} />
                )}
              </FactRow>
            )}
            <FactRow label={t('priority.label')} icon={<Flag aria-hidden />}>
              {(id) => (
                <InlineSelect
                  id={id}
                  value={app.priority}
                  options={[...PRIORITIES].reverse().map((p) => ({ value: p, label: t(`priority.${PRIORITY_KEY[p]}`) }))}
                  onCommit={(priority) => set({ priority: priority ?? 2 })}
                />
              )}
            </FactRow>
            <FactRow label={t('job.fields.cvVersion')} icon={<FileText aria-hidden />}>
              {(id) => <InlineText id={id} value={app.cvVersion} onCommit={(cvVersion) => set({ cvVersion })} placeholder={t('job.cvPlaceholder')} />}
            </FactRow>
            <FactRow label={t('job.fields.appliedAt')} icon={<CalendarCheck aria-hidden />}>
              {(id) => <InlineDate id={id} value={app.appliedAt} onCommit={(appliedAt) => set({ appliedAt })} />}
            </FactRow>
            <FactRow label={t('job.fields.nextFollowUpAt')} icon={<BellRing aria-hidden />}>
              {(id) => <InlineDate id={id} value={app.nextFollowUpAt} onCommit={(nextFollowUpAt) => set({ nextFollowUpAt })} />}
            </FactRow>
            <FactRow label={t('job.fields.deadline')} icon={<CalendarX aria-hidden />}>
              {(id) => <InlineDate id={id} value={app.deadline} onCommit={(deadline) => set({ deadline })} />}
            </FactRow>
            <FactRow label={t('source.label')} icon={<Link2 aria-hidden />}>
              {(id) => (
                <InlineSelect
                  id={id}
                  value={app.sourceName}
                  options={SOURCES.map((s) => ({ value: s, label: t(`source.${s}`) }))}
                  onCommit={(sourceName) => set({ sourceName: sourceName ?? 'other' })}
                />
              )}
            </FactRow>
            <FactRow label={t('job.fields.sourceUrl')} icon={<Link2 aria-hidden />}>
              {(id) => <InlineText id={id} type="url" value={app.sourceUrl} onCommit={(sourceUrl) => set({ sourceUrl })} placeholder="https://" />}
            </FactRow>
            <FactRow label={t('job.fields.companyWebsite')} icon={<Globe aria-hidden />}>
              {(id) => (
                <InlineText id={id} type="url" value={app.companyWebsite} onCommit={(companyWebsite) => set({ companyWebsite })} placeholder="https://" />
              )}
            </FactRow>
          </div>
        </PanelSection>

        <InterviewsSection app={app} />

        <ContactsSection app={app} />

        <PanelSection title={t('job.sections.tags')}>
          <TagInput value={app.tags} onChange={(tags) => set({ tags })} />
        </PanelSection>

        <PanelSection title={t('job.sections.notes')}>
          <AutosaveTextarea
            value={app.notes}
            onSave={(notes) => set({ notes })}
            placeholder={t('job.notesPlaceholder')}
            savingLabel={t('common.saving')}
            savedLabel={t('common.saved')}
            ariaLabel={t('job.sections.notes')}
          />
        </PanelSection>

        <details className={styles.description}>
          <summary>{t('job.sections.description')}</summary>
          <AutosaveTextarea
            value={app.description}
            onSave={(description) => set({ description })}
            placeholder={t('job.descriptionPlaceholder')}
            savingLabel={t('common.saving')}
            savedLabel={t('common.saved')}
            minRows={12}
            ariaLabel={t('job.sections.description')}
          />
        </details>

        <PanelSection title={t('job.sections.timeline')}>
          <Timeline events={app.timeline} />
        </PanelSection>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('job.deleteTitle')}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onClose()
          actions.remove(app.id)
          toast({ message: t('job.deleted') })
        }}
      >
        {t('job.deleteText', { title: app.title || t('jobs.untitled') })}
      </ConfirmDialog>
    </div>
  )
}

function withCurrent(list: readonly string[], current: string): string[] {
  return list.includes(current) ? [...list] : [current, ...list]
}

function PanelSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <Skeleton width={120} height={12} />
      <Skeleton width="80%" height={28} />
      <Skeleton width={110} height={30} />
      <div className={styles.skeletonRows}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={20} />
        ))}
      </div>
    </div>
  )
}
