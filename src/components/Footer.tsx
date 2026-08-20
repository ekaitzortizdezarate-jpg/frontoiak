'use client'

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

interface FooterProps {
  className?: string
  superadmin?: boolean
}

export default function Footer({ className = '', superadmin = false }: FooterProps) {
  const { t } = useLanguage()

  const handleOpenCookieSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-cookie-settings'))
    }
  }

  const baseClasses = superadmin
    ? 'bg-stone-900 border-t border-stone-800 text-stone-400'
    : 'bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400'

  const linkHoverClasses = superadmin
    ? 'hover:text-emerald-400 transition-colors'
    : 'hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors'

  return (
    <footer className={`${baseClasses} py-8 px-4 sm:px-6 transition-colors duration-200 ${className}`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* IZQUIERDA: MARCA Y DERECHOS */}
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <span className="font-bold text-stone-700 dark:text-stone-200 tracking-tight">
            Frontoiak
          </span>
          <span className="hidden sm:inline text-stone-300 dark:text-stone-700">•</span>
          <span className="text-stone-400 dark:text-stone-500">
            © {new Date().getFullYear()} {t.legal?.footer_rights || 'Todos los derechos reservados.'}
          </span>
        </div>

        {/* DERECHA: ENLACES LEGALES Y CONTACTO */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
          <Link href="/legal?tab=aviso-legal" className={linkHoverClasses}>
            {t.legal?.footer_legal_notice || 'Aviso Legal'}
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <Link href="/legal?tab=privacidad" className={linkHoverClasses}>
            {t.legal?.footer_privacy || 'Privacidad'}
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <Link href="/legal?tab=terminos" className={linkHoverClasses}>
            {t.legal?.footer_terms || 'Términos de Uso'}
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <Link href="/legal?tab=cookies" className={linkHoverClasses}>
            {t.legal?.footer_cookies || 'Cookies'}
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <Link href="/legal?tab=contacto" className={linkHoverClasses}>
            {t.legal?.footer_contact || 'Contacto'}
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <button
            type="button"
            onClick={handleOpenCookieSettings}
            className={`${linkHoverClasses} underline underline-offset-2 cursor-pointer`}
          >
            {t.legal?.footer_cookie_settings || 'Configurar Cookies'}
          </button>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-stone-100 dark:border-stone-800/60 text-center text-[11px] text-stone-400 dark:text-stone-600">
        {t.home?.footer || 'Frontoiak — Euskal Herriko frontoiak kudeatzeko eta gozatzeko plataforma.'}
      </div>
    </footer>
  )
}
