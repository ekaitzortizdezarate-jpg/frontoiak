// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUserSession()
  }, [])

  const checkUserSession = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
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
      setUser({ ...user, profile: finalProfile })
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-emerald-800 font-medium">
        Cargando Frontoiak...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-emerald-800 transition">
              F
            </div>
            <span className="text-2xl font-black text-stone-900 tracking-tight">
              Frontoiak
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                  {user.profile?.nombre_completo || user.email}
                </span>
                <button 
                  onClick={handleSignOut}
                  className="bg-rose-50 text-rose-600 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-100 transition shadow-2xs"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="text-sm font-bold text-stone-700 hover:text-emerald-700 px-4 py-2 rounded-xl transition"
                >
                  Iniciar Sesión
                </button>
                <button 
                  onClick={() => router.push('/auth/register')}
                  className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm hover:shadow-md active:scale-95"
                >
                  Registrarse
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
            Euskal Frontoiak Sarea
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            Gestión inteligente de frontones en Euskadi
          </h2>
          <p className="text-stone-600 text-base md:text-lg leading-relaxed">
            Consulta la disponibilidad en tiempo real, reserva tu hora o gestiona los frontones de tu municipio desde un único lugar.
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
                Soy Pelotari / Jugador
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                Encuentra tu frontón, mira si está libre con sensores en vivo y reserva tu plaza.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl group-hover:bg-emerald-700 group-hover:text-white transition">
              Entrar a Reservas →
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
                Soy un Municipio
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                Configura frontones, bloquea franjas para escuelas o eventos y monitoriza el uso IoT.
              </p>
            </div>
            <span className="text-xs font-bold text-stone-800 bg-stone-100 px-4 py-2 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition">
              Panel de Control →
            </span>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        Frontoiak — Plataforma para la gestión y disfrute de los frontones de Euskadi.
      </footer>
    </div>
  )
}