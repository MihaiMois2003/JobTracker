import { newId } from '../../lib/id'
import { normalizeApplication } from '../applications/normalize'
import type { Application } from '../applications/types'
import { resolveJobCv } from '../cvs/labels'
import { normalizeCv, normalizeVersion } from '../cvs/normalize'
import type { Cv, CvRecord } from '../cvs/types'
import type { Settings } from './settings'

const EXPORT_FORMAT = 'ledger.export'

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Version 2 adds `cvs` (metadata and versions only; the PDF files are not part of the export). */
export function toJSON(items: Application[], settings: Settings, cvs: Cv[]): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version: 2, exportedAt: new Date().toISOString(), settings, applications: items, cvs },
    null,
    2,
  )
}

const CSV_COLUMNS: Array<[string, (a: Application, cvs: Map<string, Cv>) => string | number | null]> = [
  ['title', (a) => a.title],
  ['company', (a) => a.company],
  ['status', (a) => a.status],
  ['priority', (a) => a.priority],
  ['location', (a) => a.location],
  ['workMode', (a) => a.workMode],
  ['employmentType', (a) => a.employmentType],
  ['salaryMin', (a) => a.salaryMin],
  ['salaryMax', (a) => a.salaryMax],
  ['currency', (a) => a.currency],
  ['salaryPeriod', (a) => a.salaryPeriod],
  ['salaryOffered', (a) => a.salaryOffered],
  ['source', (a) => a.sourceName],
  ['url', (a) => a.sourceUrl],
  ['appliedAt', (a) => a.appliedAt],
  ['deadline', (a) => a.deadline],
  ['nextFollowUpAt', (a) => a.nextFollowUpAt],
  ['cvVersion', (a) => a.cvVersion],
  [
    'cv',
    (a, cvs) => {
      const r = resolveJobCv(a, cvs)
      return r ? `${r.label}${r.deleted ? ' (deleted)' : ''}` : ''
    },
  ],
  ['cvId', (a) => a.cvId],
  ['cvVersionId', (a) => a.cvVersionId],
  ['tags', (a) => a.tags.join('; ')],
  ['interviews', (a) => a.interviews.length],
  ['contacts', (a) => a.contacts.map((c) => [c.name, c.email].filter(Boolean).join(' ')).join('; ')],
  ['notes', (a) => a.notes],
  ['archived', (a) => (a.archived ? 'yes' : '')],
  ['createdAt', (a) => a.createdAt],
  ['updatedAt', (a) => a.updatedAt],
]

function csvCell(v: string | number | null): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Guard against spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCSV(items: Application[], cvs: Map<string, Cv>): string {
  const header = CSV_COLUMNS.map(([name]) => name).join(',')
  const rows = items.map((a) => CSV_COLUMNS.map(([, get]) => csvCell(get(a, cvs))).join(','))
  // BOM so Excel opens UTF-8 (diacritics) correctly.
  return '﻿' + [header, ...rows].join('\r\n')
}

export class ImportError extends Error {}

const ID = /^[A-Za-z0-9_-]{1,64}$/

export interface ParsedImport {
  applications: Array<{ id: string; data: Omit<Application, 'id'> }>
  cvs: CvRecord[]
}

/**
 * CV metadata from a version 2 export. A file path is kept only if it points into this user's own
 * CV folder; otherwise the version shows as "no file" (the PDFs are never part of an export).
 */
function parseCvs(raw: unknown, uid: string): CvRecord[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string')
    .filter((obj) => ID.test(obj.id as string))
    .map((obj) => {
      const id = obj.id as string
      const versions = (Array.isArray(obj.versions) ? obj.versions : [])
        .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string')
        .filter((v) => ID.test(v.id as string))
        .map((v) => {
          const { id: vId, ...data } = normalizeVersion(v.id as string, v)
          if (!data.storagePath.startsWith(`users/${uid}/cvs/${id}/`)) data.storagePath = ''
          return { id: vId, data }
        })
      return { id, data: normalizeCv(obj), versions }
    })
}

/** Accepts a Ledger export (version 1 or 2, or a bare array of applications) and returns clean documents. */
export function parseImport(text: string, uid: string): ParsedImport {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError('invalid_json')
  }
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { applications?: unknown }).applications)
      ? (raw as { applications: unknown[] }).applications
      : null
  if (!list) throw new ImportError('not_ledger')

  const now = new Date().toISOString()
  const applications = list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((obj) => {
      const id = typeof obj.id === 'string' && ID.test(obj.id) ? obj.id : newId()
      const { id: _drop, ...app } = normalizeApplication(id, obj)
      if (!app.title && !app.company) return null
      return {
        id,
        data: { ...app, timeline: [...app.timeline, { id: newId(), at: now, type: 'imported' as const }] },
      }
    })
    .filter((x): x is { id: string; data: Omit<Application, 'id'> } => x !== null)
  const cvs = Array.isArray(raw) ? [] : parseCvs((raw as { cvs?: unknown }).cvs, uid)
  return { applications, cvs }
}
