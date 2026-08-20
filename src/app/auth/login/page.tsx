// src/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const { t } = useLanguage()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // 1. Iniciar sesión con Supabase Auth
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMsg('Credenciales incorrectas. Comprueba tu correo y contraseña.')
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMsg('Tu correo electrónico aún no ha sido confirmado. Si eres un Gestor Municipal nuevo, tu cuenta debe ser aprobada primero por el Administrador.')
      } else {
        setErrorMsg(error.message)
      }
      setLoading(false)
      return
    }

    if (!user) {
      setErrorMsg('No se ha podido recuperar la información de usuario.')
      setLoading(false)
      return
    }

    // 2. Comprobar perfil y rol en la tabla profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    let userRole = profileData?.role || user.user_metadata?.role || 'usuario'

    // Si el perfil no existe o no tiene datos, lo creamos/sincronizamos desde los metadatos de Auth
    if (!profileData || !profileData.nombre_completo || !profileData.nombre) {
      const meta = user.user_metadata || {}
      userRole = profileData?.role || meta.role || 'usuario'
      const nombreFinal = profileData?.nombre || profileData?.nombre_completo || meta.nombre || meta.nombre_completo || meta.full_name || ''
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nombre: nombreFinal,
        nombre_completo: nombreFinal,
        apellidos: profileData?.apellidos || meta.apellidos || '',
        dni: profileData?.dni || meta.dni || '',
        calle: profileData?.calle || meta.calle || '',
        fecha_nacimiento: profileData?.fecha_nacimiento || meta.fecha_nacimiento || null,
        localidad: profileData?.localidad || meta.localidad || '',
        codigo_postal: profileData?.codigo_postal || meta.codigo_postal || '',
        role: userRole
      })
    }

    setLoading(false)

    // 3. Redirigir según el rol
    if (userRole === 'admin') {
      router.push('/admin/super')
    } else if (userRole === 'gestor_municipio') {
      router.push('/admin/dashboard')
    } else {
      router.push('/reservas')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          {/* IZQUIERDA: Frontoiak */}
          <div className="flex flex-col items-start min-w-0">
            <div 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm group-hover:bg-emerald-800 transition">
                F
              </div>
              <span className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                Frontoiak
              </span>
            </div>
          </div>

          {/* DERECHA: Registro y debajo idiomas */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Link 
              href="/auth/register"
              className="bg-emerald-700 text-white hover:bg-emerald-800 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition shadow-2xs whitespace-nowrap"
            >
              {t.common.register}
            </Link>
            <div>
              <LanguageSelector variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-2xl font-black text-stone-900 tracking-tight">
            {t.auth.login_title}
          </h2>
          <p className="mt-2 text-center text-xs text-stone-500">
            {t.auth.login_subtitle}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 rounded-3xl sm:px-10">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  {t.auth.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  {t.auth.password}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:bg-stone-300"
                >
                  {loading ? t.auth.logging_in : t.auth.login_btn}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-stone-100">
                <span className="text-xs text-stone-500">{t.auth.no_account} </span>
                <Link href="/auth/register" className="text-xs font-bold text-emerald-700 hover:underline">
                  {t.auth.register_free}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        Frontoiak — Plataforma para la gestión y disfrute de los frontones de Euskadi.
      </footer>
    </div>
  )
}