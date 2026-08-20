// src/context/LanguageContext.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { es, TranslationType } from '@/locales/es'
import { eu } from '@/locales/eu'
import { en } from '@/locales/en'

export type Language = 'eu' | 'es' | 'en'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: TranslationType
}

const dictionaries: Record<Language, TranslationType> = {
  eu: eu as TranslationType,
  es: es as TranslationType,
  en: en as TranslationType
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'eu',
  setLang: () => {},
  t: eu as TranslationType
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('eu')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('frontoiak_lang') as Language
      if (saved && (saved === 'eu' || saved === 'es' || saved === 'en')) {
        setLangState(saved)
      } else {
        // Detectar si el navegador está en euskera o español
        const browserLang = navigator.language.toLowerCase()
        if (browserLang.startsWith('eu')) {
          setLangState('eu')
        } else if (browserLang.startsWith('es')) {
          setLangState('es')
        } else if (browserLang.startsWith('en')) {
          setLangState('en')
        }
      }
    } catch {
      // Ignorar errores de localStorage
    }
    setMounted(true)
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    try {
      localStorage.setItem('frontoiak_lang', newLang)
    } catch {
      // Ignorar errores de localStorage
    }
  }

  const currentDict = dictionaries[lang] || dictionaries.eu

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: currentDict }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  return context
}
