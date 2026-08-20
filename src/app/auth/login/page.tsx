// src/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // 1. Autenticar credenciales
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !authData.user) {
      if (error?.message === 'Invalid login credentials') {
        setErrorMsg('Correo o contraseña incorrectos.')
      } else if (error?.message?.toLowerCase().includes('email not confirmed')) {
        setErrorMsg('El correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o solicita al administrador su activación.')
      } else {
        setErrorMsg(error?.message || 'Error al iniciar sesión.')
      }
      setLoading(false)
      return
    }

    const user = authData.user

    // 2. Consultar el perfil del usuario en la tabla 'profiles'
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    let userRole = profileData?.role

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
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30">
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
            <span className="text-xs text-stone-500 hidden sm:inline">¿Nuevo por aquí?</span>
            <Link 
              href="/auth/register"
              className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-2xl font-black text-stone-900 tracking-tight">
            Inicia sesión en tu cuenta
          </h2>
          <p className="mt-2 text-center text-xs text-stone-500">
            Gestiona tus reservas y frontones favoritos
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
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:bg-stone-300"
                >
                  {loading ? 'Iniciando sesión...' : 'Entrar'}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-stone-100">
                <span className="text-xs text-stone-500">¿Aún no tienes cuenta? </span>
                <Link href="/auth/register" className="text-xs font-bold text-emerald-700 hover:underline">
                  Regístrate gratis
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