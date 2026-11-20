// src/components/LanguageSelector.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useLanguage, Language } from '@/context/LanguageContext'

interface LanguageSelectorProps {
  variant?: 'light' | 'dark' | 'auto'
}

// Icono SVG nítido y oficial de la Ikurriña
function IkurrinaFlag({ className = 'w-4 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 400" className={`${className} rounded-xs shadow-2xs flex-shrink-0`} aria-hidden="true">
      <rect width="560" height="400" fill="#DA291C" />
      {/* Aspa verde */}
      <path d="M0,0 L560,400 M560,0 L0,400" stroke="#009B48" strokeWidth="85" />
      {/* Cruz blanca */}
      <path d="M280,0 L280,400 M0,200 L560,200" stroke="#FFFFFF" strokeWidth="85" />
    </svg>
  )
}

function SpanishFlag({ className = 'w-4 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 750 500" className={`${className} rounded-xs shadow-2xs flex-shrink-0`} aria-hidden="true">
      <rect width="750" height="125" fill="#AA151B" />
      <rect y="125" width="750" height="250" fill="#F1BF00" />
      <rect y="375" width="750" height="125" fill="#AA151B" />
    </svg>
  )
}

function FrenchFlag({ className = 'w-4 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 600" className={`${className} rounded-xs shadow-2xs flex-shrink-0`} aria-hidden="true">
      <rect width="300" height="600" fill="#002654" />
      <rect x="300" width="300" height="600" fill="#FFFFFF" />
      <rect x="600" width="300" height="600" fill="#CE1126" />
    </svg>
  )
}

function BritishFlag({ className = 'w-4 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={`${className} rounded-xs shadow-2xs flex-shrink-0`} aria-hidden="true">
      <clipPath id="s">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}

const languages: { code: Language; short: string; flagComponent: React.ComponentType<{ className?: string }> }[] = [
  { code: 'eu', short: 'EUS', flagComponent: IkurrinaFlag },
  { code: 'es', short: 'CAS', flagComponent: SpanishFlag },
  { code: 'fr', short: 'FRA', flagComponent: FrenchFlag },
  { code: 'en', short: 'ENG', flagComponent: BritishFlag }
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
  const CurrentFlag = currentLang.flagComponent

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
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition shadow-2xs border cursor-pointer ${btnClasses}`}
        title="Aldatu hizkuntza / Cambiar idioma / Change language / Changer de langue"
      >
        <CurrentFlag className="w-4 h-2.5 sm:w-4.5 sm:h-3" />
        <span className="tracking-wider">{currentLang.short}</span>
        <span className="text-[8px] opacity-60">▾</span>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-1.5 w-28 rounded-2xl shadow-xl border z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ${dropdownClasses}`}
        >
          {languages.map((l) => {
            const Flag = l.flagComponent
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  lang === l.code
                    ? 'bg-emerald-50 text-emerald-800 font-black dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'hover:bg-stone-50 text-stone-700 hover:text-stone-900 dark:hover:bg-stone-800 dark:text-stone-300 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-2.5" />
                  <span className="text-xs font-black tracking-wide font-mono">{l.short}</span>
                </div>
                {lang === l.code && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
