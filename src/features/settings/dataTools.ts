import { newId } from '../../lib/id'
import { normalizeApplication } from '../applications/normalize'
import type { Application } from '../applications/types'
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

export function toJSON(items: Application[], settings: Settings): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), settings, applications: items },
    null,
    2,
  )
}

const CSV_COLUMNS: Array<[string, (a: Application) => string | number | null]> = [
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

export function toCSV(items: Application[]): string {
  const header = CSV_COLUMNS.map(([name]) => name).join(',')
  const rows = items.map((a) => CSV_COLUMNS.map(([, get]) => csvCell(get(a))).join(','))
  // BOM so Excel opens UTF-8 (diacritics) correctly.
  return '﻿' + [header, ...rows].join('\r\n')
}

export class ImportError extends Error {}

/** Accepts a Ledger export (or a bare array of applications) and returns clean documents. */
export function parseImport(text: string): Array<{ id: string; data: Omit<Application, 'id'> }> {
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
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((obj) => {
      const id = typeof obj.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(obj.id) ? obj.id : newId()
      const { id: _drop, ...app } = normalizeApplication(id, obj)
      if (!app.title && !app.company) return null
      return {
        id,
        data: { ...app, timeline: [...app.timeline, { id: newId(), at: now, type: 'imported' as const }] },
      }
    })
    .filter((x): x is { id: string; data: Omit<Application, 'id'> } => x !== null)
}
