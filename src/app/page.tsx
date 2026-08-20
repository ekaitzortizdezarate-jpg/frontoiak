'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
        console.warn('Error al obtener usuario en Home:', userError)
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
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-4">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm group-hover:bg-emerald-800 transition">
              F
            </div>
            <span className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Frontoiak
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-end">
            {/* SELECTOR DE IDIOMA */}
            <LanguageSelector variant="light" />

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-end">
                <button 
                  onClick={() => router.push('/auth/ajustes')}
                  title={`${t.common.settings} (${user.profile?.nombre_completo || user.email})`}
                  className="text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-stone-200 truncate min-w-0 max-w-[120px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-xs transition shadow-2xs cursor-pointer text-left"
                >
                  {user.profile?.nombre_completo || user.email}
                </button>
                <button 
                  onClick={handleSignOut}
                  className="bg-rose-50 text-rose-600 border border-rose-200 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-100 transition shadow-2xs flex-shrink-0 whitespace-nowrap"
                >
                  {t.common.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="text-xs sm:text-sm font-bold text-stone-700 hover:text-emerald-700 px-3 sm:px-4 py-2 rounded-xl transition whitespace-nowrap"
                >
                  {t.common.login}
                </button>
                <button 
                  onClick={() => router.push('/auth/register')}
                  className="bg-emerald-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-800 transition shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
                >
                  {t.common.register}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO / SELECTOR DE ACCESO */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 flex flex-col justify-center items-center text-center space-y-10">
        <div className="space-y-4 max-w-2xl">
          <span className="inline-block bg-emerald-100/80 text-emerald-900 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider border border-emerald-200">
            {t.home.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            {t.home.hero_title}
          </h2>
          <p className="text-stone-600 text-base md:text-lg leading-relaxed">
            {t.home.hero_subtitle}
          </p>
        </div>

        {/* TARJETAS DE ROL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Jugador */}
          <div 
            onClick={() => router.push('/reservas')}
            className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl hover:border-emerald-600 cursor-pointer transition-all duration-200 flex flex-col items-center text-center space-y-4 group relative overflow-hidden"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-emerald-700 group-hover:text-white transition-all duration-200 shadow-inner">
              ⚾
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900 group-hover:text-emerald-800 transition">
                {t.home.card_player_title}
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                {t.home.card_player_desc}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl group-hover:bg-emerald-700 group-hover:text-white transition">
              {t.home.card_player_btn}
            </span>
          </div>

          {/* Municipio */}
          <div 
            onClick={() => router.push('/admin/dashboard')}
            className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl hover:border-stone-800 cursor-pointer transition-all duration-200 flex flex-col items-center text-center space-y-4 group relative overflow-hidden"
          >
            <div className="w-16 h-16 bg-stone-100 text-stone-800 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-stone-900 group-hover:text-white transition-all duration-200 shadow-inner">
              🏛️
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900 group-hover:text-stone-800 transition">
                {t.home.card_municipio_title}
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                {t.home.card_municipio_desc}
              </p>
            </div>
            <span className="text-xs font-bold text-stone-800 bg-stone-100 px-4 py-2 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition">
              {t.home.card_municipio_btn}
            </span>
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