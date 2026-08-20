'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme, Theme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'

export default function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: t.common?.theme_light || 'Claro', icon: '☀️' },
    { value: 'dark', label: t.common?.theme_dark || 'Oscuro', icon: '🌙' },
    { value: 'system', label: t.common?.theme_system || 'Auto', icon: '💻' }
  ]

  const currentIcon = theme === 'system' ? '💻' : isDark ? '🌙' : '☀️'

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition shadow-2xs border bg-white hover:bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300 dark:bg-stone-900 dark:hover:bg-stone-800 dark:text-stone-200 dark:border-stone-800 dark:hover:border-stone-700 cursor-pointer"
        title="Aldatu itxura / Cambiar tema / Toggle theme"
      >
        <span className="text-[11px] leading-none">{currentIcon}</span>
        <span className="text-[8px] opacity-60">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-2xl shadow-xl border z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 bg-white border-stone-200 text-stone-800 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTheme(opt.value)
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                theme === opt.value
                  ? 'bg-emerald-50 text-emerald-800 font-black dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'hover:bg-stone-50 text-stone-700 hover:text-stone-900 dark:hover:bg-stone-800 dark:text-stone-300 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{opt.icon}</span>
                <span className="text-[11px]">{opt.label}</span>
              </div>
              {theme === opt.value && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
