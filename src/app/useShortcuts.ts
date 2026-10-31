import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useSettings } from '../features/settings/SettingsProvider'
import { useUI } from './UIProvider'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Focuses the jobs search once the Jobs page has rendered. */
export function focusJobsSearch(attempt = 0) {
  const el = document.getElementById('jobs-search')
  if (el) el.focus()
  else if (attempt < 10) requestAnimationFrame(() => focusJobsSearch(attempt + 1))
}

/**
 * Desktop shortcuts: N new job, / search, G then T/B/L/V/C/S navigation, ? help, Cmd/Ctrl+K palette.
 * Single-key shortcuts are ignored while typing or while a dialog is open.
 */
export function useShortcuts() {
  const navigate = useNavigate()
  const { openAdd, setPaletteOpen, setShortcutsOpen } = useUI()
  const { update } = useSettings()
  const pendingG = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (isTyping(e.target) || document.querySelector('dialog[open]')) return

      const key = e.key.toLowerCase()
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current)
        pendingG.current = null
        const go: Record<string, () => void> = {
          t: () => navigate('/'),
          b: () => {
            update({ jobsView: 'board' })
            navigate('/jobs')
          },
          l: () => {
            update({ jobsView: 'list' })
            navigate('/jobs')
          },
          v: () => navigate('/cvs'),
          c: () => navigate('/calendar'),
          s: () => navigate('/stats'),
        }
        if (go[key]) {
          e.preventDefault()
          go[key]()
        }
        return
      }

      if (key === 'g') {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200)
      } else if (key === 'n') {
        e.preventDefault()
        openAdd()
      } else if (e.key === '/') {
        e.preventDefault()
        navigate('/jobs')
        focusJobsSearch()
      } else if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, openAdd, setPaletteOpen, setShortcutsOpen, update])
}
