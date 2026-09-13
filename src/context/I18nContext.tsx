import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from '@/lib/i18n'

interface I18nContextType {
  lang: Language
  setLang: (l: Language) => void
  t: (key: TranslationKey) => string
  dir: 'ltr' | 'rtl'
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bookora-lang') as Language) || 'en'
    }
    return 'en'
  })

  const setLang = (l: Language) => {
    setLangState(l)
    localStorage.setItem('bookora-lang', l)
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' || l === 'ur' ? 'rtl' : 'ltr'
  }

  const t = (key: TranslationKey): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key
  }

  const dir: 'ltr' | 'rtl' = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
