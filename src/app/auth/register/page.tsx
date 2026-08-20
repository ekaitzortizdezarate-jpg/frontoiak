// src/app/auth/register/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [calle, setCalle] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // 1. Registrar el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setErrorMsg(authError.message)
      setLoading(false)
      return
    }

    const user = authData.user
    if (user) {
      // 2. Guardar todos los campos extendidos en la tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nombre_completo: nombre,
          apellidos,
          dni,
          calle,
          fecha_nacimiento: fechaNacimiento || null,
          localidad,
          codigo_postal: codigoPostal,
        })
        .eq('id', user.id)

      if (profileError) {
        await supabase.from('profiles').upsert({
          id: user.id,
          nombre_completo: nombre,
          apellidos,
          dni,
          calle,
          fecha_nacimiento: fechaNacimiento || null,
          localidad,
          codigo_postal: codigoPostal,
        })
      }

      alert('¡Registro completado con éxito! Ya puedes iniciar sesión o acceder a la plataforma.')
      router.push('/reservas')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA / HEADER UNIFICADO */}
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
            <span className="text-xs text-stone-500 hidden sm:inline">¿Ya tienes cuenta?</span>
            <Link 
              href="/auth/login"
              className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <h2 className="text-center text-2xl font-black text-stone-900 tracking-tight">
            Crea tu cuenta de usuario
          </h2>
          <p className="mt-1 text-center text-xs text-stone-500">
            Rellena tus datos personales para completar el registro y poder realizar reservas.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4">
          <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 rounded-3xl sm:px-10">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Tus apellidos"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    DNI *
                  </label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="00000000X"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Calle / Dirección *
                </label>
                <input
                  type="text"
                  required
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
                  placeholder="ej. Kale Nagusia, 12, 1º A"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Localidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    placeholder="ej. Donostia"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    placeholder="ej. 20001"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <hr className="border-stone-100 my-2" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Correo Electrónico *
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
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:bg-stone-300"
                >
                  {loading ? 'Registrando usuario...' : 'Completar Registro'}
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-stone-500">¿Ya tienes cuenta? </span>
                <Link href="/auth/login" className="text-xs font-bold text-emerald-700 hover:underline">
                  Inicia sesión aquí
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