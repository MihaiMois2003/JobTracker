import type { Application } from '../applications/types'
import { gotResponse, reachedDepth, wasSent } from '../stats/metrics'
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
