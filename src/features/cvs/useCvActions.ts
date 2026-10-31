import { collection, doc, updateDoc, writeBatch, type WriteBatch } from 'firebase/firestore'
import { useMemo } from 'react'
import { db } from '../../lib/firebase'
import { useApplications } from '../applications/ApplicationsProvider'
import type { Application } from '../applications/types'
import { useUser } from '../auth/AuthProvider'
import { cvStoragePath, deleteCvFile, uploadCvFile, type UploadHandle } from './cvFiles'
import { useCvs } from './CvsProvider'
import { cvLabel, cvSelection, jobsUsingCv } from './labels'
import type { Cv, CvDoc, CvLanguage, CvVersion, CvVersionDoc } from './types'

type Op = (batch: WriteBatch) => void

/** Commits writes in batches of 400 (Firestore allows 500 per batch). */
async function commitAll(ops: Op[]): Promise<void> {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + 400)) op(batch)
    await batch.commit()
  }
}

export interface NewCvInput {
  file: File
  name: string
  language: CvLanguage
  description: string
  makeDefault: boolean
}

export interface CvUpload<T> {
  done: Promise<T>
  cancel: () => void
}

export function useCvActions() {
  const user = useUser()
  const { cvs } = useCvs()
  const { items } = useApplications()

  return useMemo(() => {
    const cvCol = collection(db, 'users', user.uid, 'cvs')
    const cvRef = (id: string) => doc(cvCol, id)
    const versionsCol = (cvId: string) => collection(cvCol, cvId, 'versions')
    const appRef = (id: string) => doc(db, 'users', user.uid, 'applications', id)
    const now = () => new Date().toISOString()

    const clearOtherDefaults = (keepId: string): Op[] =>
      cvs.filter((c) => c.isDefault && c.id !== keepId).map((c) => (b) => b.update(cvRef(c.id), { isDefault: false }))

    /** Uploads the file first, then writes metadata; if the write fails the uploaded file is removed. */
    const uploadThenWrite = <T>(path: string, file: File, onProgress: (r: number) => void, write: () => Promise<T>): CvUpload<T> => {
      const handle: UploadHandle = uploadCvFile(path, file, onProgress)
      const done = handle.done.then(async () => {
        try {
          return await write()
        } catch (err) {
          await deleteCvFile(path).catch(() => {})
          throw err
        }
      })
      return { done, cancel: handle.cancel }
    }

    const versionDoc = (file: File, path: string, versionNumber: number, note: string): CvVersionDoc => ({
      versionNumber,
      fileName: file.name,
      size: file.size,
      storagePath: path,
      note: note.trim(),
      uploadedAt: now(),
    })

    const createCv = (input: NewCvInput, onProgress: (r: number) => void): CvUpload<string> => {
      const cvId = doc(cvCol).id
      const versionId = doc(versionsCol(cvId)).id
      const path = cvStoragePath(user.uid, cvId, versionId)
      // The first CV becomes the default automatically.
      const isDefault = input.makeDefault || !cvs.some((c) => !c.archived)
      return uploadThenWrite(path, input.file, onProgress, async () => {
        const stamp = now()
        const data: CvDoc = {
          name: input.name.trim() || input.file.name.replace(/\.pdf$/i, ''),
          language: input.language,
          description: input.description.trim(),
          isDefault,
          archived: false,
          demo: false,
          createdAt: stamp,
          updatedAt: stamp,
        }
        await commitAll([
          ...(isDefault ? clearOtherDefaults(cvId) : []),
          (b) => b.set(cvRef(cvId), data),
          (b) => b.set(doc(versionsCol(cvId), versionId), versionDoc(input.file, path, 1, '')),
        ])
        return cvId
      })
    }

    const addVersion = (cv: Cv, file: File, note: string, onProgress: (r: number) => void): CvUpload<string> => {
      const versionId = doc(versionsCol(cv.id)).id
      const path = cvStoragePath(user.uid, cv.id, versionId)
      const next = Math.max(0, ...cv.versions.map((v) => v.versionNumber)) + 1
      return uploadThenWrite(path, file, onProgress, async () => {
        await commitAll([
          (b) => b.set(doc(versionsCol(cv.id), versionId), versionDoc(file, path, next, note)),
          (b) => b.update(cvRef(cv.id), { updatedAt: now() }),
        ])
        return versionId
      })
    }

    const updateCv = (cv: Cv, patch: Partial<Pick<CvDoc, 'name' | 'language' | 'description'>>) =>
      updateDoc(cvRef(cv.id), { ...patch, updatedAt: now() })

    const setDefault = (cv: Cv, isDefault: boolean) =>
      commitAll([...(isDefault ? clearOtherDefaults(cv.id) : []), (b) => b.update(cvRef(cv.id), { isDefault })])

    /** Archived CVs leave the pickers (and stop being the default); jobs keep their link. */
    const setArchived = (cv: Cv, archived: boolean) =>
      updateDoc(cvRef(cv.id), archived ? { archived, isDefault: false, updatedAt: now() } : { archived, updatedAt: now() })

    const snapshotFor = (app: Application, cv: Cv): string =>
      app.cvLabelSnapshot || cvLabel(cv, cv.versions.find((v) => v.id === app.cvVersionId) ?? null)

    /** Files first (so nothing is orphaned in Storage), then metadata; linked jobs keep a "(deleted)" label. */
    const deleteCv = async (cv: Cv) => {
      for (const v of cv.versions) await deleteCvFile(v.storagePath)
      const stamp = now()
      await commitAll([
        ...jobsUsingCv(items, cv.id).map<Op>((app) => (b) =>
          b.update(appRef(app.id), {
            cvId: null,
            cvVersionId: null,
            cvLabelSnapshot: snapshotFor(app, cv),
            cvDeleted: true,
            updatedAt: stamp,
          }),
        ),
        ...cv.versions.map<Op>((v) => (b) => b.delete(doc(versionsCol(cv.id), v.id))),
        (b) => b.delete(cvRef(cv.id)),
      ])
    }

    /** Same rule as deleting a CV, for one (non-last) version. */
    const deleteVersion = async (cv: Cv, version: CvVersion) => {
      await deleteCvFile(version.storagePath)
      const stamp = now()
      await commitAll([
        ...items
          .filter((a) => a.cvId === cv.id && a.cvVersionId === version.id)
          .map<Op>((app) => (b) =>
            b.update(appRef(app.id), {
              cvVersionId: null,
              cvLabelSnapshot: snapshotFor(app, cv),
              cvDeleted: true,
              updatedAt: stamp,
            }),
          ),
        (b) => b.delete(doc(versionsCol(cv.id), version.id)),
        (b) => b.update(cvRef(cv.id), { updatedAt: stamp }),
      ])
    }

    /** Links many jobs to one CV version at once (used by the legacy-text tool). */
    const linkJobs = (appIds: string[], cv: Cv, version: CvVersion | null) => {
      const sel = cvSelection(cv, version)
      const stamp = now()
      return commitAll(appIds.map<Op>((id) => (b) => b.update(appRef(id), { ...sel, updatedAt: stamp })))
    }

    return { createCv, addVersion, updateCv, setDefault, setArchived, deleteCv, deleteVersion, linkJobs }
  }, [user.uid, cvs, items])
}

export type CvActions = ReturnType<typeof useCvActions>
