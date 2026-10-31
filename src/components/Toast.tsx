import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'

interface ToastOptions {
  message: string
  tone?: 'neutral' | 'danger'
  action?: { label: string; onClick: () => void }
  /** Shown before `action`, e.g. "Change CV" next to "Undo". */
  secondaryAction?: { label: string; onClick: () => void }
  durationMs?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-2), { ...options, id }])
      window.setTimeout(() => dismiss(id), options.durationMs ?? (options.action || options.secondaryAction ? 6000 : 3500))
    },
    [dismiss],
  )

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={styles.toast} data-tone={item.tone ?? 'neutral'}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.message}>{item.message}</span>
            {item.secondaryAction && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  item.secondaryAction?.onClick()
                  dismiss(item.id)
                }}
              >
                {item.secondaryAction.label}
              </button>
            )}
            {item.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  item.action?.onClick()
                  dismiss(item.id)
                }}
              >
                {item.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
