import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'
import { IconButton } from './Button'
import styles from './Dialog.module.css'

type Variant = 'modal' | 'panel' | 'sheet'

interface DialogProps {
  open: boolean
  onClose: () => void
  variant?: Variant
  size?: 'narrow' | 'default' | 'wide'
  /** Modal variant only: take the whole screen on phones. */
  fullOnMobile?: boolean
  /** Accessible name when no DialogHeader title is rendered. */
  label?: string
  className?: string
  children: ReactNode
}

const CLOSE_MS = 150

/**
 * Built on the native <dialog>: focus trapping, Escape and inert background come for free.
 * We only add enter/exit motion, backdrop click and `data-autofocus` for the initial focus.
 */
export function Dialog({
  open,
  onClose,
  variant = 'modal',
  size = 'default',
  fullOnMobile,
  label,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(open)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  if (open && !mounted) setMounted(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      el.removeAttribute('data-closing')
      if (!el.open) {
        el.showModal()
        // showModal() focuses the first focusable element; prefer an explicit target.
        el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
      }
      return
    }
    if (!el.open) return
    el.setAttribute('data-closing', '')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => {
        el.close()
        el.removeAttribute('data-closing')
        setMounted(false)
      },
      reduce ? 0 : CLOSE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={cx(
        styles.dialog,
        styles[variant],
        size !== 'default' && styles[size],
        fullOnMobile && styles.fullOnMobile,
        className,
      )}
      onCancel={(e) => {
        e.preventDefault()
        onCloseRef.current()
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current()
      }}
    >
      <div className={styles.inner}>{children}</div>
    </dialog>
  )
}

interface DialogHeaderProps {
  title: ReactNode
  description?: ReactNode
  onClose?: () => void
  actions?: ReactNode
  /** id used by aria-labelledby; generated when omitted. */
  id?: string
}

export function DialogHeader({ title, description, onClose, actions, id }: DialogHeaderProps) {
  const { t } = useTranslation()
  const generated = useId()
  const titleId = id ?? generated
  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions}
      {onClose && (
        <IconButton label={t('common.close')} onClick={onClose}>
          <X />
        </IconButton>
      )}
    </header>
  )
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.body, className)}>{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>
}
