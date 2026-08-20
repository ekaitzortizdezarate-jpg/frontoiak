'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'
import Footer from '@/components/Footer'

type LegalTab = 'aviso-legal' | 'privacidad' | 'terminos' | 'cookies' | 'contacto'

function LegalContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as LegalTab | null

  const [activeTab, setActiveTab] = useState<LegalTab>('privacidad')

  // Contact form state
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [tipoConsulta, setTipoConsulta] = useState('general')
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviadoExito, setEnviadoExito] = useState(false)

  useEffect(() => {
    if (tabParam && ['aviso-legal', 'privacidad', 'terminos', 'cookies', 'contacto'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleResetCookies = () => {
    try {
      localStorage.removeItem('frontoiak_cookies_consent')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('open-cookie-settings'))
      }
    } catch {}
  }

  const handleEnviarContacto = (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    // Simular envío de consulta con feedback inmediato
    setTimeout(() => {
      setEnviando(false)
      setEnviadoExito(true)
      setNombre('')
      setEmail('')
      setAsunto('')
      setMensaje('')
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors duration-200">
      {/* CABECERA DE NAVEGACIÓN */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-black text-lg sm:text-xl tracking-tight text-emerald-800 dark:text-emerald-400 hover:opacity-90 transition"
            >
              <span>🎾</span>
              <span>Frontoiak</span>
            </Link>
            <span className="hidden sm:inline text-xs font-bold text-stone-400 dark:text-stone-600">/</span>
            <span className="hidden sm:inline text-xs font-bold text-stone-600 dark:text-stone-400">
              {t.legal?.hub_title || 'Centro Legal'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <Link
              href="/"
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>{t.legal?.back_to_home || '← Inicio'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* TÍTULO Y SUBTÍTULO */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            {t.legal?.hub_title || 'Centro Legal y de Contacto'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {t.legal?.hub_subtitle || 'Información sobre privacidad, condiciones de uso, cookies y atención a la ciudadanía'}
          </p>
        </div>

        {/* PESTAÑAS NAVEGABLES */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('aviso-legal')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'aviso-legal'
                ? 'bg-emerald-700 text-white dark:bg-emerald-600 shadow-sm'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700'
            }`}
          >
            <span>⚖️</span>
            <span>{t.legal?.tab_aviso || 'Aviso Legal'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacidad')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'privacidad'
                ? 'bg-emerald-700 text-white dark:bg-emerald-600 shadow-sm'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700'
            }`}
          >
            <span>🔒</span>
            <span>{t.legal?.tab_privacidad || 'Privacidad'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terminos')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'terminos'
                ? 'bg-emerald-700 text-white dark:bg-emerald-600 shadow-sm'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700'
            }`}
          >
            <span>📜</span>
            <span>{t.legal?.tab_terminos || 'Términos de Uso'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cookies'
                ? 'bg-emerald-700 text-white dark:bg-emerald-600 shadow-sm'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700'
            }`}
          >
            <span>🍪</span>
            <span>{t.legal?.tab_cookies || 'Cookies'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacto')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'contacto'
                ? 'bg-emerald-700 text-white dark:bg-emerald-600 shadow-sm'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700'
            }`}
          >
            <span>✉️</span>
            <span>{t.legal?.tab_contacto || 'Contacto y Soporte'}</span>
          </button>
        </div>

        {/* CONTENEDOR DEL CONTENIDO ACTIVO */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-10 shadow-sm">
          {/* ======================================================== */}
          {/* PESTAÑA 1: AVISO LEGAL */}
          {/* ======================================================== */}
          {activeTab === 'aviso-legal' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
              <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  {t.legal?.aviso_title || 'Aviso Legal e Información Corporativa'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {t.legal?.aviso_intro}
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.aviso_sec1_title || '1. Titularidad del Servicio'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.aviso_sec1_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.aviso_sec2_title || '2. Condiciones de Acceso y Uso'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.aviso_sec2_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.aviso_sec3_title || '3. Propiedad Intelectual e Industrial'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.aviso_sec3_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.aviso_sec4_title || '4. Exención de Responsabilidad'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.aviso_sec4_text}
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 2: POLÍTICA DE PRIVACIDAD */}
          {/* ======================================================== */}
          {activeTab === 'privacidad' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
              <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  {t.legal?.privacidad_title || 'Política de Privacidad y Protección de Datos'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {t.legal?.privacidad_intro}
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_responsable_title || '1. Responsable del Tratamiento'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_responsable_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_datos_title || '2. Datos que Recogemos'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_datos_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_finalidad_title || '3. Finalidad del Tratamiento'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_finalidad_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_legitimacion_title || '4. Base Jurídica'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_legitimacion_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_cesion_title || '5. Destinatarios y Cesión de Datos'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_cesion_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_derechos_title || '6. Tus Derechos'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_derechos_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.privacidad_iot_title || '7. Sensores IoT y Telemetría'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.privacidad_iot_text}
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 3: TÉRMINOS Y CONDICIONES */}
          {/* ======================================================== */}
          {activeTab === 'terminos' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
              <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  {t.legal?.terminos_title || 'Términos y Condiciones de Uso y Reservas'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {t.legal?.terminos_intro}
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.terminos_sec1_title || '1. Requisitos de Reserva y Antelación'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.terminos_sec1_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.terminos_sec2_title || '2. Política de Cancelación y Uso Cívico'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.terminos_sec2_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.terminos_sec3_title || '3. Frontones con Acceso Exclusivo a Empadronados'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.terminos_sec3_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.terminos_sec4_title || '4. Normativa de Instalaciones y Alumbrado'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.terminos_sec4_text}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.terminos_sec5_title || '5. Comunicación de Incidencias'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.terminos_sec5_text}
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 4: POLÍTICA DE COOKIES */}
          {/* ======================================================== */}
          {activeTab === 'cookies' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
              <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  {t.legal?.cookies_title || 'Política de Cookies y Almacenamiento Local'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {t.legal?.cookies_intro}
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.cookies_what_title || '1. ¿Qué son las cookies?'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.cookies_what_text}
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.cookies_types_title || '2. Cookies y elementos técnicos utilizados'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.cookies_types_text}
                </p>

                {/* TABLA DE COOKIES */}
                <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-800">
                      <tr>
                        <th className="p-3">{t.legal?.cookies_table_name || 'Nombre'}</th>
                        <th className="p-3">{t.legal?.cookies_table_provider || 'Origen'}</th>
                        <th className="p-3">{t.legal?.cookies_table_purpose || 'Finalidad'}</th>
                        <th className="p-3">{t.legal?.cookies_table_duration || 'Duración'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 text-stone-600 dark:text-stone-300">
                      <tr>
                        <td className="p-3 font-mono font-bold text-stone-900 dark:text-white">sb-*-auth-token</td>
                        <td className="p-3">Supabase</td>
                        <td className="p-3">Gestión de sesión segura y autenticación de usuario</td>
                        <td className="p-3">Sesión / 7 días</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-stone-900 dark:text-white">frontoiak_lang</td>
                        <td className="p-3">Frontoiak</td>
                        <td className="p-3">Almacena la preferencia de idioma seleccionada (Euskera, Castellano, English)</td>
                        <td className="p-3">Persistente (localStorage)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-stone-900 dark:text-white">frontoiak_theme</td>
                        <td className="p-3">Frontoiak</td>
                        <td className="p-3">Almacena la preferencia de modo claro / modo oscuro</td>
                        <td className="p-3">Persistente (localStorage)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-stone-900 dark:text-white">frontoiak_cookies_consent</td>
                        <td className="p-3">Frontoiak</td>
                        <td className="p-3">Registra el estado del consentimiento de cookies para no mostrar el aviso continuamente</td>
                        <td className="p-3">Persistente (localStorage)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  {t.legal?.cookies_manage_title || '3. Gestión y Desactivación'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.legal?.cookies_manage_text}
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetCookies}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>🔄</span>
                    <span>{t.legal?.cookies_open_settings || 'Restablecer Preferencias de Cookies'}</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 5: CONTACTO Y SOPORTE */}
          {/* ======================================================== */}
          {activeTab === 'contacto' && (
            <div className="space-y-6 max-w-3xl animate-in fade-in duration-150">
              <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  {t.legal?.contacto_title || 'Contacto y Atención a la Ciudadanía'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {t.legal?.contacto_subtitle}
                </p>
              </div>

              {enviadoExito ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3">
                  <span className="text-3xl">✅</span>
                  <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                    {t.legal?.contacto_success || '¡Mensaje enviado con éxito!'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEnviadoExito(false)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Enviar otra consulta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnviarContacto} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">
                        {t.legal?.contacto_name || 'Nombre completo *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="ej. Ainhoa Otermin"
                        className="w-full p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">
                        {t.legal?.contacto_email || 'Correo electrónico *'}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ej. ainhoa@adibidea.eus"
                        className="w-full p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">
                        {t.legal?.contacto_type || 'Tipo de consulta *'}
                      </label>
                      <select
                        value={tipoConsulta}
                        onChange={(e) => setTipoConsulta(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        <option value="citizen">{t.legal?.contacto_type_citizen || '👤 Ciudadano / Pelotari'}</option>
                        <option value="manager">{t.legal?.contacto_type_manager || '🏛️ Ayuntamiento / Gestor'}</option>
                        <option value="privacy">{t.legal?.contacto_type_privacy || '🔒 Privacidad (RGPD)'}</option>
                        <option value="general">{t.legal?.contacto_type_general || '💬 Consulta general'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">
                        {t.legal?.contacto_subject || 'Asunto *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                        placeholder="ej. Duda con reserva de frontón en Bergara"
                        className="w-full p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">
                      {t.legal?.contacto_message || 'Mensaje *'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Escribe tu mensaje con el mayor detalle posible..."
                      className="w-full p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {enviando ? (t.legal?.contacto_sending || 'Enviando...') : (t.legal?.contacto_send || 'Enviar Consulta')}
                    </button>
                  </div>
                </form>
              )}

              {/* AVISO DE INCIDENCIAS URGENTES */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-start gap-3">
                <span className="text-xl flex-shrink-0">💡</span>
                <div className="space-y-0.5 text-xs text-stone-600 dark:text-stone-400">
                  <h5 className="font-bold text-stone-800 dark:text-stone-200">
                    {t.legal?.contacto_info_title || 'Soporte Directo'}
                  </h5>
                  <p className="leading-relaxed">
                    {t.legal?.contacto_info_text}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-xs text-stone-500">Cargando información legal...</div>}>
      <LegalContent />
    </Suspense>
  )
}
