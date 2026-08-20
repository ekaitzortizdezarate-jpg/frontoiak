'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    checkUserSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        await checkUserSession()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkUserSession = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setLoading(false)
        return
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        const meta = user.user_metadata || {}
        const finalProfile = profile ? {
          ...profile,
          nombre_completo: profile.nombre_completo || meta.nombre_completo || meta.nombre || meta.full_name || '',
          apellidos: profile.apellidos || meta.apellidos || '',
          role: profile.role || meta.role || 'usuario'
        } : {
          nombre_completo: meta.nombre_completo || meta.nombre || meta.full_name || '',
          apellidos: meta.apellidos || '',
          role: meta.role || 'usuario',
          email: user.email
        }

        // Si el perfil no existía aún en la tabla profiles, sincronizarlo
        if (!profile) {
          const nombreFinal = finalProfile.nombre_completo || meta.nombre || 'Usuario'
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            nombre: nombreFinal,
            nombre_completo: nombreFinal,
            apellidos: finalProfile.apellidos || '',
            role: finalProfile.role || 'usuario',
            ...(meta.municipio_id ? { municipio_id: meta.municipio_id } : {}),
            ...(meta.dni ? { dni: meta.dni } : {}),
            ...(meta.calle ? { calle: meta.calle } : {}),
            ...(meta.fecha_nacimiento ? { fecha_nacimiento: meta.fecha_nacimiento } : {}),
            ...(meta.localidad ? { localidad: meta.localidad } : {}),
            ...(meta.codigo_postal ? { codigo_postal: meta.codigo_postal } : {})
          })
        }

        setUser({ ...user, profile: finalProfile })

        // Redirigir automáticamente según el rol del usuario
        if (finalProfile.role === 'admin') {
          router.replace('/admin/super')
          return
        } else if (finalProfile.role === 'gestor_municipio') {
          router.replace('/admin/dashboard')
          return
        } else {
          router.replace('/reservas')
          return
        }
      }
    } catch (err) {
      console.error('Excepción al verificar sesión en Home:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setErrorMsg('')

    // 1. Iniciar sesión con Supabase Auth
    const { data: { user: loggedUser }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMsg(t.auth.email + ' / ' + t.auth.password + ' ' + t.common.error)
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMsg(t.auth.gestor_notice_desc)
      } else {
        setErrorMsg(error.message)
      }
      setLoginLoading(false)
      return
    }

    if (!loggedUser) {
      setErrorMsg('Error')
      setLoginLoading(false)
      return
    }

    // 2. Comprobar perfil y rol en la tabla profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', loggedUser.id)
      .maybeSingle()

    let userRole = profileData?.role || loggedUser.user_metadata?.role || 'usuario'

    if (!profileData || !profileData.nombre_completo || !profileData.nombre) {
      const meta = loggedUser.user_metadata || {}
      userRole = profileData?.role || meta.role || 'usuario'
      const nombreFinal = profileData?.nombre || profileData?.nombre_completo || meta.nombre || meta.nombre_completo || meta.full_name || ''
      await supabase.from('profiles').upsert({
        id: loggedUser.id,
        email: loggedUser.email,
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

    setLoginLoading(false)

    // 3. Redirigir según el rol
    if (userRole === 'admin') {
      router.push('/admin/super')
    } else if (userRole === 'gestor_municipio') {
      router.push('/admin/dashboard')
    } else {
      router.push('/reservas')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-emerald-800 font-medium">
        {t.common.loading}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          {/* IZQUIERDA: Frontoiak y debajo usuario */}
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
            {user && (
              <button 
                onClick={() => router.push('/auth/ajustes')}
                title={`${t.common.settings} (${user.profile?.nombre_completo || user.email})`}
                className="text-[11px] sm:text-xs font-semibold text-stone-500 hover:text-emerald-800 transition truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[280px] text-left mt-0.5"
              >
                👤 {user.profile?.nombre_completo || user.email}
              </button>
            )}
          </div>

          {/* DERECHA: Cerrar sesión (o registro) y debajo idiomas */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {user ? (
              <button 
                onClick={handleSignOut}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 transition shadow-2xs whitespace-nowrap active:scale-95"
              >
                {t.common.logout}
              </button>
            ) : (
              <Link 
                href="/auth/register"
                className="bg-emerald-700 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-800 transition shadow-2xs whitespace-nowrap active:scale-95"
              >
                {t.common.register}
              </Link>
            )}
            <div>
              <LanguageSelector variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL: LOGIN CENTRADO */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-center items-center">
        {/* TEXTOS PRINCIPALES DE CABECERA */}
        <div className="text-center space-y-3 max-w-xl mx-auto mb-8">
          <span className="inline-block bg-emerald-100/80 text-emerald-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-emerald-200 shadow-2xs">
            {t.home.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            {t.home.hero_title}
          </h1>
        </div>

        {/* TARJETA DE LOGIN */}
        <div className="w-full max-w-md">
          <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-stone-200 rounded-3xl space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {t.auth.login_title}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                {t.auth.login_subtitle}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  {t.auth.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="posta@adibidea.eus"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
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
                  disabled={loginLoading}
                  className="w-full bg-emerald-700 text-white p-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm hover:shadow-md active:scale-95 disabled:bg-stone-300 cursor-pointer"
                >
                  {loginLoading ? t.auth.logging_in : t.auth.login_btn}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-stone-100 flex flex-col sm:flex-row justify-center items-center gap-1.5 text-xs text-stone-500 font-medium">
                <span>{t.auth.no_account}</span>
                <Link href="/auth/register" className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline">
                  {t.auth.register_free}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        {t.home.footer}
      </footer>
    </div>
  )
}