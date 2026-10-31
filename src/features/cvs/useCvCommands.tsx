import { Archive, ArchiveRestore, Download, ExternalLink, Pencil, Star, StarOff, Trash, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { MenuEntry } from '../../components/Menu'
import { useToast } from '../../components/Toast'
import { useApplications } from '../applications/ApplicationsProvider'
import { CvFileError } from './cvFiles'
import styles from './Cvs.module.css'
import { EditCvDialog } from './EditCvDialog'
import { currentVersion, cvLabel, jobsUsingCv } from './labels'
import type { Cv, CvVersion } from './types'
import { UploadDialog, type UploadMode } from './UploadDialog'
import { useCvActions } from './useCvActions'
import { useCvFileCommands } from './useCvFileCommands'

/**
 * Everything you can do to a CV (menu entries + the dialogs they open),
 * shared by the list cards and the CV page.
 */
export function useCvCommands({ onCreated, onDeleted }: { onCreated?: (cvId: string) => void; onDeleted?: () => void } = {}) {
  const { t } = useTranslation()
  const actions = useCvActions()
  const files = useCvFileCommands()
  const { items } = useApplications()
  const toast = useToast()
  const [upload, setUpload] = useState<{ mode: UploadMode; file: File | null } | null>(null)
  const [editing, setEditing] = useState<Cv | null>(null)
  const [deleting, setDeleting] = useState<Cv | null>(null)
  const [deletingVersion, setDeletingVersion] = useState<{ cv: Cv; version: CvVersion } | null>(null)
  const [busy, setBusy] = useState(false)

  const fail = (err: unknown) =>
    toast({ message: err instanceof CvFileError ? t(`cvs.errors.${err.code}`) : t('errors.saveFailed'), tone: 'danger' })

  const run = async (work: () => Promise<void>, done: string, after?: () => void) => {
    setBusy(true)
    try {
      await work()
      toast({ message: done })
      after?.()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const menu = (cv: Cv): MenuEntry[] => {
    const current = currentVersion(cv)
    return [
      { key: 'open', label: t('cvs.actions.openPdf'), icon: <ExternalLink aria-hidden />, onSelect: () => files.open(cv, current) },
      { key: 'download', label: t('cvs.actions.download'), icon: <Download aria-hidden />, onSelect: () => files.download(cv, current) },
      { key: 'version', label: t('cvs.actions.newVersion'), icon: <Upload aria-hidden />, onSelect: () => setUpload({ mode: { kind: 'version', cv }, file: null }) },
      { key: 'edit', label: t('cvs.actions.edit'), icon: <Pencil aria-hidden />, onSelect: () => setEditing(cv) },
      ...(cv.archived
        ? []
        : [
            {
              key: 'default',
              label: cv.isDefault ? t('cvs.actions.unsetDefault') : t('cvs.actions.setDefault'),
              icon: cv.isDefault ? <StarOff aria-hidden /> : <Star aria-hidden />,
              onSelect: () =>
                void actions
                  .setDefault(cv, !cv.isDefault)
                  .then(() => !cv.isDefault && toast({ message: t('cvs.defaultSet', { name: cv.name }) }))
                  .catch(fail),
            },
          ]),
      {
        key: 'archive',
        label: cv.archived ? t('cvs.actions.unarchive') : t('cvs.actions.archive'),
        icon: cv.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />,
        onSelect: () => {
          actions.setArchived(cv, !cv.archived).catch(fail)
          toast({ message: t(cv.archived ? 'cvs.unarchivedToast' : 'cvs.archivedToast') })
        },
      },
      'separator',
      { key: 'delete', label: t('cvs.actions.delete'), icon: <Trash aria-hidden />, danger: true, onSelect: () => setDeleting(cv) },
    ]
  }

  const usedBy = deleting ? jobsUsingCv(items, deleting.id).length : 0
  const versionUsedBy = deletingVersion
    ? items.filter((a) => a.cvId === deletingVersion.cv.id && a.cvVersionId === deletingVersion.version.id).length
    : 0

  const dialogs = (
    <>
      <UploadDialog mode={upload?.mode ?? null} initialFile={upload?.file ?? null} onClose={() => setUpload(null)} onCreated={onCreated} />
      <EditCvDialog cv={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title={t('cvs.deleteTitle')}
        confirmLabel={t('common.delete')}
        danger
        loading={busy}
        onClose={() => !busy && setDeleting(null)}
        onConfirm={() => {
          const cv = deleting
          if (!cv) return
          void run(() => actions.deleteCv(cv), t('cvs.deleted'), () => {
            setDeleting(null)
            onDeleted?.()
          })
        }}
      >
        {deleting && (
          <div className={styles.confirmText}>
            <p>{t('cvs.deleteText', { name: deleting.name, count: deleting.versions.length })}</p>
            <p>{usedBy ? t('cvs.deleteUsed', { count: usedBy, label: cvLabel(deleting, currentVersion(deleting)) }) : t('cvs.deleteUnused')}</p>
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={deletingVersion !== null}
        title={t('cvs.deleteVersionTitle', { n: deletingVersion?.version.versionNumber ?? '' })}
        confirmLabel={t('common.delete')}
        danger
        loading={busy}
        onClose={() => !busy && setDeletingVersion(null)}
        onConfirm={() => {
          const target = deletingVersion
          if (!target) return
          void run(() => actions.deleteVersion(target.cv, target.version), t('cvs.versionDeleted'), () => setDeletingVersion(null))
        }}
      >
        {deletingVersion && (
          <div className={styles.confirmText}>
            <p>{t('cvs.deleteVersionText')}</p>
            <p>
              {versionUsedBy
                ? t('cvs.deleteVersionUsed', { count: versionUsedBy, label: cvLabel(deletingVersion.cv, deletingVersion.version) })
                : t('cvs.deleteUnused')}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )

  return {
    menu,
    dialogs,
    openUpload: (mode: UploadMode, file: File | null = null) => setUpload({ mode, file }),
    askDeleteVersion: (cv: Cv, version: CvVersion) => setDeletingVersion({ cv, version }),
  }
}
