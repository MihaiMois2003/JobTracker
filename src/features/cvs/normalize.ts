import { CV_LANGUAGES, type CvDoc, type CvLanguage, type CvVersion } from './types'

type Raw = Record<string, unknown>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Turns an untrusted object (Firestore doc, imported JSON) into a well-formed CV document. */
export function normalizeCv(raw: Raw): CvDoc {
  const now = new Date().toISOString()
  return {
    name: str(raw.name).trim() || 'CV',
    language: CV_LANGUAGES.includes(raw.language as CvLanguage) ? (raw.language as CvLanguage) : 'other',
    description: str(raw.description),
    isDefault: raw.isDefault === true,
    archived: raw.archived === true,
    demo: raw.demo === true,
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now,
  }
}

export function normalizeVersion(id: string, raw: Raw): CvVersion {
  const n = raw.versionNumber
  const size = raw.size
  return {
    id,
    versionNumber: typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : 1,
    fileName: str(raw.fileName),
    size: typeof size === 'number' && Number.isFinite(size) && size >= 0 ? size : 0,
    storagePath: str(raw.storagePath),
    note: str(raw.note),
    uploadedAt: str(raw.uploadedAt) || new Date().toISOString(),
  }
}
