import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

interface UIState {
  /** Add-job flow; `addUrl` pre-fills the link field. */
  addOpen: boolean
  addUrl: string
  openAdd: (url?: string) => void
  closeAdd: () => void
  /** Job detail is addressed by `?job=<id>` so it survives reloads and back/forward. */
  jobId: string | null
  openJob: (id: string) => void
  closeJob: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
}

const UIContext = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const jobId = params.get('job')

  const openAdd = useCallback((url?: string) => {
    setAddUrl(url ?? '')
    setAddOpen(true)
  }, [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  const openJob = useCallback(
    (id: string) =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('job', id)
        return next
      }),
    [setParams],
  )
  const closeJob = useCallback(
    () =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          next.delete('job')
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const value = useMemo<UIState>(
    () => ({
      addOpen,
      addUrl,
      openAdd,
      closeAdd,
      jobId,
      openJob,
      closeJob,
      paletteOpen,
      setPaletteOpen,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [addOpen, addUrl, openAdd, closeAdd, jobId, openJob, closeJob, paletteOpen, shortcutsOpen],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useUI(): UIState {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI() must be used inside <UIProvider>')
  return ctx
}
