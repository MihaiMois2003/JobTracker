import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import styles from './charts.module.css'

/** Bar path with 4px rounded data-end, square at the baseline. */
function barPath(x: number, y: number, w: number, base: number): string {
  const h = base - y
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`
}

function niceMax(v: number): number {
  if (v <= 4) return 4
  const step = v <= 10 ? 2 : v <= 25 ? 5 : 10
  return Math.ceil(v / step) * step
}

export interface Column {
  key: string
  label: string
  value: number
  /** Full label for tooltips and the table view. */
  title: string
}

/** Single-series column chart: one hue, recessive grid, tooltip on hover/focus, table for AT. */
export function ColumnChart({ data, caption, valueLabel }: { data: Column[]; caption: string; valueLabel: (v: number) => string }) {
  const [active, setActive] = useState<number | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  // Draw at the real pixel width so text and marks keep their size on any screen.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = 220
  const pad = { top: 12, right: 8, bottom: 26, left: 28 }
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom
  const slot = plotW / data.length
  const barW = Math.max(6, Math.min(28, slot - 6))
  const base = pad.top + plotH
  const y = (v: number) => base - (v / max) * plotH
  const ticks = [0, max / 2, max]
  const current = active !== null ? data[active] : null

  return (
    <figure className={styles.figure}>
      <div ref={areaRef} className={styles.chartArea} onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={styles.svg} role="img" aria-label={caption}>
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={pad.left} x2={W - pad.right} y1={y(tk)} y2={y(tk)} className={tk === 0 ? styles.baseline : styles.grid} />
              <text x={pad.left - 8} y={y(tk)} className={styles.axisText} textAnchor="end" dominantBaseline="middle">
                {tk}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx0 = pad.left + slot * i + slot / 2
            return (
              <g
                key={d.key}
                tabIndex={0}
                role="img"
                aria-label={`${d.title}: ${valueLabel(d.value)}`}
                className={styles.barGroup}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {/* Hit target spans the whole slot, bigger than the mark. */}
                <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill="transparent" />
                <path d={barPath(cx0 - barW / 2, y(d.value), barW, base)} className={cx(styles.bar, active === i && styles.barActive)} />
                {(slot >= 44 || i % 2 === (data.length - 1) % 2) && (
                  <text x={cx0} y={H - 8} className={styles.axisText} textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {current && active !== null && (
          <div
            className={styles.tooltip}
            style={{ left: `${((pad.left + slot * active + slot / 2) / W) * 100}%`, top: `${(y(current.value) / H) * 100}%` } as CSSProperties}
            aria-hidden
          >
            <span className={styles.tooltipTitle}>{current.title}</span>
            <span className={styles.tooltipValue}>{valueLabel(current.value)}</span>
          </div>
        )}
      </div>
      <table className="visually-hidden">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{valueLabel(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export interface BarRow {
  key: string
  label: ReactNode
  value: number
  display: string
  /** Optional per-row color (status identity); defaults to the accent. */
  color?: string
  hint?: string
}

/** Horizontal labelled bars: values are always written, so color is never the only cue. */
export function BarList({ rows, max }: { rows: BarRow[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className={styles.barList}>
      {rows.map((r) => (
        <li key={r.key} className={styles.barRow} title={r.hint}>
          <span className={styles.barLabel}>{r.label}</span>
          <span className={styles.track} aria-hidden>
            <span
              className={styles.fill}
              style={{ width: `${Math.max(r.value > 0 ? 2 : 0, (r.value / top) * 100)}%`, background: r.color ?? 'var(--accent)' } as CSSProperties}
            />
          </span>
          <span className={cx(styles.barValue, 'tabular')}>{r.display}</span>
        </li>
      ))}
    </ul>
  )
}
