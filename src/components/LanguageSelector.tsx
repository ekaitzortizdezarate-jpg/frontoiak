// src/components/LanguageSelector.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage, Language } from '@/context/LanguageContext'

interface LanguageSelectorProps {
  variant?: 'light' | 'dark'
}

const languages: { code: Language; label: string; flag: string; short: string }[] = [
  { code: 'eu', label: 'Euskara', flag: '🔴⚪🟢', short: 'EUS' },
  { code: 'es', label: 'Castellano', flag: '🇪🇸', short: 'CAS' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'ENG' }
]

export default function LanguageSelector({ variant = 'light' }: LanguageSelectorProps) {
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

  const isDark = variant === 'dark'

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs border ${
          isDark
            ? 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-800 hover:border-stone-700'
            : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200 hover:border-stone-300'
        }`}
        title="Aldatu hizkuntza / Cambiar idioma / Change language"
      >
        <span className="text-sm leading-none">🌐</span>
        <span className="font-extrabold tracking-wider">{currentLang.short}</span>
        <span className="text-[9px] opacity-60">▾</span>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-1.5 w-36 rounded-2xl shadow-xl border z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-stone-900 border-stone-800 text-stone-200'
              : 'bg-white border-stone-200 text-stone-800'
          }`}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition ${
                lang === l.code
                  ? isDark
                    ? 'bg-emerald-950/70 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-800 font-black'
                  : isDark
                    ? 'hover:bg-stone-800 text-stone-300 hover:text-white'
                    : 'hover:bg-stone-50 text-stone-700 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono">{l.short}</span>
                <span className="font-medium text-[11px]">{l.label}</span>
              </div>
              {lang === l.code && <span className="text-xs text-emerald-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
