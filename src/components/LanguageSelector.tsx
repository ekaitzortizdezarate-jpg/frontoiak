// src/components/LanguageSelector.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage, Language } from '@/context/LanguageContext'

interface LanguageSelectorProps {
  variant?: 'light' | 'dark' | 'auto'
}

const languages: { code: Language; label: string; flag: string; short: string }[] = [
  { code: 'eu', label: 'Euskara', flag: '🔴⚪🟢', short: 'EUS' },
  { code: 'es', label: 'Castellano', flag: '🇪🇸', short: 'CAS' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'ENG' }
]

export default function LanguageSelector({ variant = 'auto' }: LanguageSelectorProps) {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLang = languages.find(l => l.code === lang) || languages[0]

  const isExplicitDark = variant === 'dark'

  const btnClasses = isExplicitDark
    ? 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-800 hover:border-stone-700'
    : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300 dark:bg-stone-900 dark:hover:bg-stone-800 dark:text-stone-200 dark:border-stone-800 dark:hover:border-stone-700'

  const dropdownClasses = isExplicitDark
    ? 'bg-stone-900 border-stone-800 text-stone-200'
    : 'bg-white border-stone-200 text-stone-800 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-200'

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition shadow-2xs border cursor-pointer ${btnClasses}`}
        title="Aldatu hizkuntza / Cambiar idioma / Change language"
      >
        <span className="text-[11px] leading-none">🌐</span>
        <span className="tracking-wider">{currentLang.short}</span>
        <span className="text-[8px] opacity-60">▾</span>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-1.5 w-36 rounded-2xl shadow-xl border z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ${dropdownClasses}`}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition cursor-pointer ${
                lang === l.code
                  ? 'bg-emerald-50 text-emerald-800 font-black dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'hover:bg-stone-50 text-stone-700 hover:text-stone-900 dark:hover:bg-stone-800 dark:text-stone-300 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono">{l.short}</span>
                <span className="font-medium text-[11px]">{l.label}</span>
              </div>
              {lang === l.code && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
