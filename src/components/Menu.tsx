import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import styles from './Menu.module.css'

export interface MenuItem {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  checked?: boolean
  onSelect: () => void
}

export type MenuEntry = MenuItem | 'separator'

interface MenuProps {
  /** Renders the trigger; spread the given props onto a button. */
  trigger: (props: {
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    'aria-controls': string
    onClick: () => void
    onKeyDown: (e: KeyboardEvent) => void
  }) => ReactElement
  items: MenuEntry[]
  align?: 'start' | 'end'
  side?: 'bottom' | 'top'
  label?: string
}

export function Menu({ trigger, items, align = 'end', side = 'bottom', label }: MenuProps) {
  /** `null` = closed; otherwise which item receives focus on open. */
  const [openAt, setOpenAt] = useState<'first' | 'last' | null>(null)
  const open = openAt !== null
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openAt) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenAt(null)
    }
    document.addEventListener('pointerdown', onDown)
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')
    if (buttons?.length) (openAt === 'first' ? buttons[0] : buttons[buttons.length - 1]).focus()
    return () => document.removeEventListener('pointerdown', onDown)
  }, [openAt])

  const close = (refocus: boolean) => {
    setOpenAt(null)
    if (refocus) wrapRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
  }

  const onMenuKey = (e: KeyboardEvent) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      buttons[(index + 1) % buttons.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      buttons[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      buttons[buttons.length - 1]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      setOpenAt(null)
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {trigger({
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': id,
        onClick: () => setOpenAt((o) => (o ? null : 'first')),
        onKeyDown: (e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpenAt(e.key === 'ArrowDown' ? 'first' : 'last')
          }
        },
      })}
      {open && (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          aria-label={label}
          className={styles.menu}
          data-align={align}
          data-side={side}
          onKeyDown={onMenuKey}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={`sep-${i}`} className={styles.separator} role="separator" />
            ) : (
              <button
                key={item.key}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                tabIndex={-1}
                className={styles.item}
                data-danger={item.danger ? '' : undefined}
                onClick={() => {
                  close(true)
                  item.onSelect()
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; icon?: ReactNode; hideLabel?: boolean }>
  label: string
}

export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]
    onChange(next.value)
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
    el?.focus()
  }
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-value={o.value}
          aria-checked={o.value === value}
          aria-label={o.hideLabel ? o.label : undefined}
          title={o.hideLabel ? o.label : undefined}
          tabIndex={o.value === value ? 0 : -1}
          className={styles.segment}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {!o.hideLabel && o.label}
        </button>
      ))}
    </div>
  )
}
