export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'ledger.theme'
const THEME_COLORS = { light: '#F6F2EA', dark: '#1A1815' }

/** Applies the preference to <html data-theme> and keeps the browser chrome in sync. */
export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref

  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // ignore storage errors
  }

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  metas.forEach((meta) => {
    if (pref === 'system') {
      meta.content = meta.media.includes('dark') ? THEME_COLORS.dark : THEME_COLORS.light
    } else {
      meta.content = THEME_COLORS[pref]
    }
  })
}
