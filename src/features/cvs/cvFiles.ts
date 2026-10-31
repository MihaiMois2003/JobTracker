import type { StorageReference } from 'firebase/storage'
import { loadStorage } from '../../lib/storage'
import { CV_MAX_BYTES } from './types'

export type CvFileErrorCode = 'not_pdf' | 'too_large' | 'empty' | 'offline' | 'unauthorized' | 'not_found' | 'canceled' | 'quota' | 'unknown'

export class CvFileError extends Error {
  readonly code: CvFileErrorCode
  constructor(code: CvFileErrorCode) {
    super(code)
    this.code = code
  }
}

export function cvStoragePath(uid: string, cvId: string, versionId: string): string {
  return `users/${uid}/cvs/${cvId}/${versionId}.pdf`
}

function toCvFileError(err: unknown): CvFileError {
  if (err instanceof CvFileError) return err
  const code = (err as { code?: string } | null)?.code ?? ''
  if (!navigator.onLine || code === 'storage/retry-limit-exceeded') return new CvFileError('offline')
  if (code === 'storage/object-not-found') return new CvFileError('not_found')
  if (code === 'storage/canceled') return new CvFileError('canceled')
  if (code === 'storage/quota-exceeded') return new CvFileError('quota')
  // Rule rejections (wrong type, over 5 MB, other user) also arrive as "unauthorized".
  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') return new CvFileError('unauthorized')
  return new CvFileError('unknown')
}

/** Checks a picked file before uploading: a real PDF (by signature, not just the extension), at most 5 MB. */
export async function validateCvFile(file: File): Promise<CvFileErrorCode | null> {
  const named = /\.pdf$/i.test(file.name)
  if (file.type !== 'application/pdf' && !(file.type === '' && named)) return 'not_pdf'
  if (file.size === 0) return 'empty'
  if (file.size > CV_MAX_BYTES) return 'too_large'
  try {
    const head = await file.slice(0, 5).text()
    if (head !== '%PDF-') return 'not_pdf'
  } catch {
    return 'unknown'
  }
  return null
}

async function refFor(path: string): Promise<StorageReference> {
  const { sdk, storage } = await loadStorage()
  return sdk.ref(storage, path)
}

/** `inline` keeps previews in the browser; the filename is used when the user saves it. */
function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '')
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export interface UploadHandle {
  done: Promise<void>
  cancel: () => void
}

/** Uploads a PDF with progress (0..1). Rejects with CvFileError. */
export function uploadCvFile(path: string, file: File, onProgress: (ratio: number) => void): UploadHandle {
  let cancel = () => {}
  let cancelled = false
  const done = (async () => {
    if (!navigator.onLine) throw new CvFileError('offline')
    const { sdk } = await loadStorage()
    if (cancelled) throw new CvFileError('canceled')
    const task = sdk.uploadBytesResumable(await refFor(path), file, {
      contentType: 'application/pdf',
      contentDisposition: contentDisposition(file.name),
    })
    cancel = () => task.cancel()
    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => onProgress(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
        reject,
        () => resolve(),
      )
    })
  })().catch((err: unknown) => {
    throw toCvFileError(err)
  })
  return {
    done,
    cancel: () => {
      cancelled = true
      cancel()
    },
  }
}

const urlCache = new Map<string, Promise<string>>()

/** Download URL for a stored CV (cached for the session). Rejects with CvFileError. */
export function cvFileUrl(path: string): Promise<string> {
  let url = urlCache.get(path)
  if (!url) {
    url = (async () => {
      const { sdk } = await loadStorage()
      return sdk.getDownloadURL(await refFor(path))
    })().catch((err: unknown) => {
      urlCache.delete(path)
      throw toCvFileError(err)
    })
    urlCache.set(path, url)
  }
  return url
}

/**
 * Opens the PDF in a new tab. The tab is opened synchronously (inside the click) so popup
 * blockers allow it, then pointed at the file once its URL is known.
 */
export async function openCvFile(path: string): Promise<void> {
  const win = window.open('', '_blank')
  try {
    const url = await cvFileUrl(path)
    if (win) {
      win.opener = null
      win.location.href = url
    } else {
      window.open(url, '_blank', 'noopener')
    }
  } catch (err) {
    win?.close()
    throw err
  }
}

/** Saves the PDF under its original name; falls back to opening it if the bucket has no CORS setup. */
export async function downloadCvFile(path: string, fileName: string): Promise<void> {
  const url = await cvFileUrl(path)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blobUrl = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName || 'cv.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

/** Deletes one file; a file that is already gone counts as deleted. */
export async function deleteCvFile(path: string): Promise<void> {
  if (!path) return
  try {
    const { sdk } = await loadStorage()
    await sdk.deleteObject(await refFor(path))
  } catch (err) {
    const e = toCvFileError(err)
    if (e.code !== 'not_found') throw e
  } finally {
    urlCache.delete(path)
  }
}

/** Deletes every file under `users/{uid}/`, including any left behind by interrupted uploads. */
export async function deleteAllUserFiles(uid: string): Promise<void> {
  const { sdk } = await loadStorage()
  const walk = async (dir: StorageReference): Promise<void> => {
    const page = await sdk.listAll(dir)
    await Promise.all(page.items.map((item) => deleteCvFile(item.fullPath)))
    for (const prefix of page.prefixes) await walk(prefix)
  }
  try {
    await walk(await refFor(`users/${uid}`))
  } catch (err) {
    throw toCvFileError(err)
  }
}
