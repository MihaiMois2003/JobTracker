import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { ro } from './ro'

export const LANGUAGES = ['ro', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
export const LANGUAGE_STORAGE_KEY = 'ledger.lang'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ro: { translation: ro }, en: { translation: en } },
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    returnNull: false,
  })

function syncDocumentLang(lng: string) {
  document.documentElement.lang = lng
}
syncDocumentLang(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', syncDocumentLang)

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'ro' ? 'ro' : 'en'
}

export default i18n
