import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type TranslationDict = Record<string, string>

const I18nContext = createContext<{
  locale: string
  t: (key: string, fallback?: string) => string
  setLocale: (locale: string) => void
}>({
  locale: 'zh-CN',
  t: (key, fallback) => fallback || key,
  setLocale: () => {},
})

const STORAGE_KEY = 'openumodel.locale'

let _dictionaries: Record<string, TranslationDict> = {}

export function initI18n(dictionaries: Record<string, TranslationDict>) {
  _dictionaries = dictionaries
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && _dictionaries[stored]) return stored
    } catch {}
    return 'zh-CN'
  })

  const setLocale = useCallback((next: string) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = _dictionaries[locale] || {}
      return dict[key] ?? fallback ?? key
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function t(key: string, fallback?: string): string {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  const locale = (stored && _dictionaries[stored]) ? stored : 'zh-CN'
  const dict = _dictionaries[locale] || {}
  return dict[key] ?? fallback ?? key
}
