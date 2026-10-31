/** Languages offered for a CV; add a code here (and its label in i18n `cvLanguage`) to offer more. */
export const CV_LANGUAGES = ['ro', 'en', 'fr', 'de', 'es', 'it', 'other'] as const
export type CvLanguage = (typeof CV_LANGUAGES)[number]

/** Must match storage.rules. */
export const CV_MAX_BYTES = 5 * 1024 * 1024

/** Below this many applications, rates are shown with a "little data" note. */
export const CV_FEW_DATA = 5

export interface CvVersion {
  id: string
  versionNumber: number
  fileName: string
  size: number
  /** `users/{uid}/cvs/{cvId}/{versionId}.pdf`; empty for demo versions, which have no file. */
  storagePath: string
  /** What changed in this version. */
  note: string
  /** ISO timestamp. */
  uploadedAt: string
}

export interface Cv {
  id: string
  name: string
  language: CvLanguage
  description: string
  isDefault: boolean
  archived: boolean
  /** Marks CVs created by "load demo data". */
  demo: boolean
  createdAt: string
  updatedAt: string
  /** From the `versions` subcollection, newest first. */
  versions: CvVersion[]
}

export type CvDoc = Omit<Cv, 'id' | 'versions'>
export type CvVersionDoc = Omit<CvVersion, 'id'>

/** What a job stores about the CV it was sent with. */
export interface CvSelection {
  cvId: string | null
  cvVersionId: string | null
  cvLabelSnapshot: string
  cvDeleted: boolean
}
