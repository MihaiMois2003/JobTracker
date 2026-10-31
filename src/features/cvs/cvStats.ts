import type { Application } from '../applications/types'
import { gotResponse, reachedDepth, wasSent } from '../stats/metrics'
import { cvLabel } from './labels'
import { CV_FEW_DATA, type Cv } from './types'

export interface CvStat {
  /** Sent applications (same definition as the Stats page). */
  sent: number
  responses: number
  interviews: number
  offers: number
  responseRate: number | null
  interviewRate: number | null
  /** Under CV_FEW_DATA applications: show a "little data" note. */
  few: boolean
}

/** Same rules as the Stats page: a response is any status after Applied (rejections too), an interview is depth ≥ 3. */
export function statOf(apps: Application[]): CvStat {
  const sent = apps.filter(wasSent)
  const responses = sent.filter(gotResponse).length
  const interviews = sent.filter((a) => reachedDepth(a) >= 3).length
  const offers = sent.filter((a) => reachedDepth(a) >= 4).length
  return {
    sent: sent.length,
    responses,
    interviews,
    offers,
    responseRate: sent.length ? responses / sent.length : null,
    interviewRate: sent.length ? interviews / sent.length : null,
    few: sent.length < CV_FEW_DATA,
  }
}

export interface CvPerformance {
  cv: Cv
  total: CvStat
  byVersion: Map<string, CvStat>
}

export function cvPerformance(items: Application[], cv: Cv): CvPerformance {
  const mine = items.filter((a) => a.cvId === cv.id)
  return {
    cv,
    total: statOf(mine),
    byVersion: new Map(cv.versions.map((v) => [v.id, statOf(mine.filter((a) => a.cvVersionId === v.id))])),
  }
}

export const pct = (v: number | null): string => (v === null ? '—' : `${Math.round(v * 100)}%`)

export interface CvRow {
  key: string
  label: string
  /** `deleted`: the CV was deleted (label from the job's snapshot); `legacy`: old free text, not linked. */
  kind: 'cv' | 'deleted' | 'legacy'
  cvId: string | null
  stat: CvStat
}

/** Rows for "Performance by CV": uploaded CVs, then deleted ones, then old free-text values still unlinked. */
export function cvPerformanceRows(items: Application[], cvs: Cv[]): CvRow[] {
  const known = new Set(cvs.map((c) => c.id))
  const rows: CvRow[] = []
  for (const cv of cvs) {
    const stat = statOf(items.filter((a) => a.cvId === cv.id))
    if (stat.sent) rows.push({ key: cv.id, label: cvLabel(cv, null), kind: 'cv', cvId: cv.id, stat })
  }
  const grouped = (kind: 'deleted' | 'legacy', keyOf: (a: Application) => string | null) => {
    const map = new Map<string, Application[]>()
    for (const a of items) {
      const k = keyOf(a)
      if (k) map.set(k, [...(map.get(k) ?? []), a])
    }
    const out: CvRow[] = []
    for (const [label, apps] of map) {
      const stat = statOf(apps)
      if (stat.sent) out.push({ key: `${kind}:${label}`, label, kind, cvId: null, stat })
    }
    return out.sort((a, b) => b.stat.sent - a.stat.sent)
  }
  rows.sort((a, b) => b.stat.sent - a.stat.sent)
  return [
    ...rows,
    ...grouped('deleted', (a) => ((a.cvId ? !known.has(a.cvId) : a.cvDeleted) ? a.cvLabelSnapshot.trim() || null : null)),
    ...grouped('legacy', (a) => (!a.cvId && !a.cvDeleted ? a.cvVersion.trim() || null : null)),
  ]
}
