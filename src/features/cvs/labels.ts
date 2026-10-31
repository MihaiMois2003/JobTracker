import type { Application } from '../applications/types'
import type { Cv, CvSelection, CvVersion } from './types'

/** "Frontend · v3 · RO" (the language is left out for "other"). */
export function cvLabel(cv: Pick<Cv, 'name' | 'language'>, version: Pick<CvVersion, 'versionNumber'> | null): string {
  return [cv.name, version ? `v${version.versionNumber}` : null, cv.language === 'other' ? null : cv.language.toUpperCase()]
    .filter(Boolean)
    .join(' · ')
}

export function currentVersion(cv: Cv): CvVersion | null {
  return cv.versions[0] ?? null
}

/** The fields a job stores when a CV (and version) is chosen for it. */
export function cvSelection(cv: Cv, version: CvVersion | null): CvSelection {
  return { cvId: cv.id, cvVersionId: version?.id ?? null, cvLabelSnapshot: cvLabel(cv, version), cvDeleted: false }
}

export const NO_CV: CvSelection = { cvId: null, cvVersionId: null, cvLabelSnapshot: '', cvDeleted: false }

/** Default CV for new applications: never archived, and only once it has a version. */
export function defaultCv(cvs: Cv[]): Cv | null {
  return cvs.find((c) => c.isDefault && !c.archived && c.versions.length > 0) ?? null
}

export interface ResolvedCv {
  cv: Cv | null
  version: CvVersion | null
  /** Live label when the CV still exists, otherwise the snapshot taken when it was chosen. */
  label: string
  /** The CV or the chosen version was deleted afterwards. */
  deleted: boolean
}

/** What a job shows for its CV, robust to CVs or versions that no longer exist. */
export function resolveJobCv(app: Pick<Application, 'cvId' | 'cvVersionId' | 'cvLabelSnapshot' | 'cvDeleted'>, byId: Map<string, Cv>): ResolvedCv | null {
  if (!app.cvId && !app.cvLabelSnapshot) return null
  const cv = app.cvId ? (byId.get(app.cvId) ?? null) : null
  const version = cv && app.cvVersionId ? (cv.versions.find((v) => v.id === app.cvVersionId) ?? null) : null
  const missing = !cv || (app.cvVersionId !== null && !version)
  if (app.cvDeleted || missing) return { cv, version, label: app.cvLabelSnapshot || (cv ? cvLabel(cv, null) : ''), deleted: true }
  return { cv, version, label: cvLabel(cv, version), deleted: false }
}

/** Jobs sent with this CV (any version). */
export function jobsUsingCv(items: Application[], cvId: string): Application[] {
  return items.filter((a) => a.cvId === cvId)
}

export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function matchesCvQuery(cv: Cv, q: string): boolean {
  const needle = fold(q.trim())
  return !needle || fold(`${cv.name} ${cv.description}`).includes(needle)
}

/**
 * Best guess for a legacy "CV used" text: the CV whose name appears in it (longest name wins),
 * and the version whose number appears as "v3". Only a suggestion; nothing is applied without confirmation.
 */
export function suggestCvFor(text: string, cvs: Cv[]): { cv: Cv; version: CvVersion | null } | null {
  const hay = fold(text)
  const cv = cvs
    .filter((c) => !c.archived && c.versions.length > 0 && fold(c.name).length >= 2 && hay.includes(fold(c.name)))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (!cv) return null
  const n = /\bv\s?(\d+)\b/i.exec(text)?.[1]
  const version = (n && cv.versions.find((v) => v.versionNumber === Number(n))) || currentVersion(cv)
  return { cv, version }
}
