import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

interface UIState {
  /** Add-job flow; `addUrl` pre-fills the link field. */
  addOpen: boolean
  addUrl: string
  openAdd: (url?: string) => void
  closeAdd: () => void
  /** Job detail is addressed by `?job=<id>` so it survives reloads and back/forward. */
  jobId: string | null
  /** `pickCv` also opens the job's "CV used" picker. */
  openJob: (id: string, options?: { pickCv?: boolean }) => void
  closeJob: () => void
  /** Job whose CV picker should open once its page renders. */
  cvPickerFor: string | null
  clearCvPicker: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
}

const UIContext = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  // Home-screen shortcut "Add job" opens the app at /?add=1.
  const [addOpen, setAddOpen] = useState(() => new URLSearchParams(window.location.search).get('add') === '1')
  const [addUrl, setAddUrl] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [cvPickerFor, setCvPickerFor] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const jobId = params.get('job')

  const openAdd = useCallback((url?: string) => {
    setAddUrl(url ?? '')
    setAddOpen(true)
  }, [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  const openJob = useCallback(
    (id: string, options?: { pickCv?: boolean }) => {
      setCvPickerFor(options?.pickCv ? id : null)
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('job', id)
        return next
      })
    },
    [setParams],
  )
  const clearCvPicker = useCallback(() => setCvPickerFor(null), [])
  const closeJob = useCallback(() => {
    setCvPickerFor(null)
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete('job')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  // Drop the one-shot ?add=1 from the URL.
  useEffect(() => {
    if (params.get('add') !== '1') return
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete('add')
        return next
      },
      { replace: true },
    )
  }, [params, setParams])

  const value = useMemo<UIState>(
    () => ({
      addOpen,
      addUrl,
      openAdd,
      closeAdd,
      jobId,
      openJob,
      closeJob,
      cvPickerFor,
      clearCvPicker,
      paletteOpen,
      setPaletteOpen,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [addOpen, addUrl, openAdd, closeAdd, jobId, openJob, closeJob, cvPickerFor, clearCvPicker, paletteOpen, shortcutsOpen],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useUI(): UIState {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI() must be used inside <UIProvider>')
  return ctx
}
