import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import styles from './InlineFields.module.css'

/** Keeps a local draft while focused; re-syncs from props otherwise. */
function useDraft<T>(value: T) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  const [prev, setPrev] = useState(value)
  if (!focused && value !== prev) {
    setPrev(value)
    setDraft(value)
  }
  return { draft, setDraft, focused, setFocused }
}

interface RowProps {
  label: string
  icon?: ReactNode
  children: (id: string) => ReactNode
}

/** Label + control laid out as a definition row. */
export function FactRow({ label, icon, children }: RowProps) {
  const id = useId()
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>
        {icon}
        {label}
      </label>
      <div className={styles.value}>{children(id)}</div>
    </div>
  )
}

interface InlineTextProps {
  id?: string
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  type?: 'text' | 'url' | 'email' | 'tel'
  className?: string
  ariaLabel?: string
  inputMode?: 'text' | 'url' | 'email' | 'tel'
}

export function InlineText({ id, value, onCommit, placeholder, type = 'text', className, ariaLabel }: InlineTextProps) {
  const { draft, setDraft, setFocused } = useDraft(value)
  const commit = () => {
    setFocused(false)
    const next = draft.trim()
    if (next !== value) onCommit(next)
  }
  return (
    <input
      id={id}
      type={type}
      aria-label={ariaLabel}
      className={cx(styles.input, className)}
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape' && draft !== value) {
          // With unsaved edits, Escape reverts the field instead of closing the dialog.
          e.preventDefault()
          e.stopPropagation()
          setDraft(value)
          // Let the blur commit the restored value (a no-op).
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
        }
      }}
    />
  )
}

export function InlineNumber({
  id,
  value,
  onCommit,
  placeholder,
  ariaLabel,
}: {
  id?: string
  value: number | null
  onCommit: (value: number | null) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const asText = value === null ? '' : String(value)
  const { draft, setDraft, setFocused } = useDraft(asText)
  const commit = () => {
    setFocused(false)
    const cleaned = draft.replace(/[\s.,](?=\d{3}\b)/g, '').replace(',', '.').trim()
    const next = cleaned === '' ? null : Number(cleaned)
    if (next !== null && !Number.isFinite(next)) {
      setDraft(asText)
      return
    }
    if (next !== value) onCommit(next)
  }
  return (
    <input
      id={id}
      inputMode="decimal"
      aria-label={ariaLabel}
      className={cx(styles.input, styles.number, 'tabular')}
      value={draft}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

export function InlineSelect<T extends string | number>({
  id,
  value,
  options,
  onCommit,
  placeholder,
  ariaLabel,
}: {
  id?: string
  value: T | null
  options: Array<{ value: T; label: string }>
  onCommit: (value: T | null) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      className={cx(styles.input, styles.select, value === null && styles.empty)}
      value={value === null ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value
        const match = options.find((o) => String(o.value) === raw)
        onCommit(match ? match.value : null)
      }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function InlineDate({
  id,
  value,
  onCommit,
  ariaLabel,
}: {
  id?: string
  value: string | null
  onCommit: (value: string | null) => void
  ariaLabel?: string
}) {
  return (
    <input
      id={id}
      type="date"
      aria-label={ariaLabel}
      className={cx(styles.input, styles.date, !value && styles.empty, 'tabular')}
      value={value ?? ''}
      onChange={(e) => onCommit(e.target.value || null)}
    />
  )
}

/** Multi-line text that saves itself shortly after typing stops. */
export function AutosaveTextarea({
  id,
  value,
  onSave,
  placeholder,
  savingLabel,
  savedLabel,
  minRows = 5,
  ariaLabel,
}: {
  id?: string
  value: string
  onSave: (value: string) => void
  placeholder?: string
  savingLabel: string
  savedLabel: string
  minRows?: number
  ariaLabel?: string
}) {
  const { draft, setDraft, setFocused } = useDraft(value)
  const [state, setState] = useState<'idle' | 'pending' | 'saved'>('idle')
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef(draft)
  const saveRef = useRef(onSave)
  const valueRef = useRef(value)

  useEffect(() => {
    saveRef.current = onSave
    valueRef.current = value
  })

  const flush = () => {
    window.clearTimeout(timer.current)
    if (latest.current !== valueRef.current) {
      saveRef.current(latest.current)
      setState('saved')
    }
  }

  // Save on unmount (closing the panel mid-sentence must not lose text).
  useEffect(() => () => flush(), [])

  return (
    <div className={styles.autosave}>
      <textarea
        id={id}
        aria-label={ariaLabel}
        className={styles.textarea}
        rows={minRows}
        value={draft}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          flush()
          setFocused(false)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          latest.current = e.target.value
          setState('pending')
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(flush, 700)
        }}
      />
      <span className={styles.saveState} aria-live="polite">
        {state === 'pending' ? savingLabel : state === 'saved' ? savedLabel : ''}
      </span>
    </div>
  )
}
