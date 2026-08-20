'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function CookieBanner() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const consent = localStorage.getItem('frontoiak_cookies_consent')
      if (!consent) {
        // Mostrar con un leve retardo para suavidad
        const timer = setTimeout(() => setVisible(true), 600)
        return () => clearTimeout(timer)
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, [])

  useEffect(() => {
    const handleOpen = () => {
      setVisible(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('open-cookie-settings', handleOpen)
      return () => window.removeEventListener('open-cookie-settings', handleOpen)
    }
  }, [])

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('frontoiak_cookies_consent', 'all')
    } catch {}
    setVisible(false)
  }

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem('frontoiak_cookies_consent', 'essential')
    } catch {}
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in slide-in-from-bottom-5 duration-300">
      <div className="max-w-5xl mx-auto bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* TEXTO INFORMATIVO */}
        <div className="space-y-1 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍪</span>
            <h4 className="font-bold text-sm text-white tracking-tight">
              {t.legal?.cookie_banner_title || 'Cookies y Privacidad en Frontoiak'}
            </h4>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            {t.legal?.cookie_banner_desc ||
              'Utilizamos cookies técnicas y almacenamiento local necesarios para el inicio de sesión seguro, la gestión de reservas y recordar tus preferencias de idioma y tema. No utilizamos cookies publicitarias ni de rastreo comercial.'}{' '}
            <Link
              href="/legal?tab=cookies"
              className="text-emerald-400 hover:text-emerald-300 underline font-medium ml-1 inline-flex items-center gap-0.5"
            >
              {t.legal?.cookie_banner_more || 'Ver política de cookies'} →
            </Link>
          </p>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-shrink-0">
          <button
            type="button"
            onClick={handleAcceptEssential}
            className="flex-1 md:flex-none px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition cursor-pointer"
          >
            {t.legal?.cookie_banner_essential || 'Solo necesarias'}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            {t.legal?.cookie_banner_accept || 'Aceptar todas'}
          </button>
        </div>
      </div>
    </div>
  )
}
