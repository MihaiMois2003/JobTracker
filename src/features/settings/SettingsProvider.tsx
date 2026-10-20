import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import i18n from '../../i18n'
import { db } from '../../lib/firebase'
import { applyTheme } from '../../lib/theme'
import { useUser } from '../auth/AuthProvider'
import { DEFAULT_SETTINGS, type Settings } from './settings'

interface SettingsState {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsState | null>(null)

const LOCAL_KEY = 'ledger.settings'

function readLocal(): Settings {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  // Seed from localStorage so theme/view are right on the very first frame.
  const [settings, setSettings] = useState<Settings>(readLocal)
  const ref = useMemo(() => doc(db, 'users', user.uid, 'settings', 'prefs'), [user.uid])

  useEffect(
    () =>
      onSnapshot(ref, (snap) => {
        const data = snap.data() as Partial<Settings> | undefined
        setSettings({ ...DEFAULT_SETTINGS, ...data })
      }),
    [ref],
  )

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(settings))
    } catch {
      // Storage may be unavailable (private mode); the Firestore copy still wins.
    }
    applyTheme(settings.theme)
  }, [settings])

  useEffect(() => {
    if (settings.language) {
      if (i18n.resolvedLanguage !== settings.language) void i18n.changeLanguage(settings.language)
    } else {
      const browser = navigator.language.toLowerCase().startsWith('ro') ? 'ro' : 'en'
      if (i18n.resolvedLanguage !== browser) void i18n.changeLanguage(browser)
    }
  }, [settings.language])

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }))
      void setDoc(ref, patch, { merge: true })
    },
    [ref],
  )

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings() must be used inside <SettingsProvider>')
  return ctx
}
