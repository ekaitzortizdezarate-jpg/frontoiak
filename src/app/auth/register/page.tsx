// src/app/auth/register/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [tipoCuenta, setTipoCuenta] = useState<'usuario' | 'gestor_municipio'>('usuario')
  
  // Campos comunes
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Campos de Ciudadano
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [calle, setCalle] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')

  // Campos de Gestor Municipal
  const [provincias, setProvincias] = useState<any[]>([])
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<any[]>([])
  const [selectedProvinciaId, setSelectedProvinciaId] = useState('')
  const [selectedMunicipioId, setSelectedMunicipioId] = useState('')
  const [codigosPostales, setCodigosPostales] = useState<string[]>([])
  const [nuevoCp, setNuevoCp] = useState('')

  const router = useRouter()

  useEffect(() => {
    cargarProvincias()
  }, [])

  const cargarProvincias = async () => {
    const { data } = await supabase.from('provincias').select('*').order('nombre', { ascending: true })
    setProvincias(data || [])
  }

  const handleProvinciaChange = async (provId: string) => {
    setSelectedProvinciaId(provId)
    setSelectedMunicipioId('')
    setCodigosPostales([])

    if (!provId) {
      setMunicipiosDisponibles([])
      return
    }

    const { data: munData } = await supabase
      .from('municipios')
      .select('*')
      .eq('provincia_id', provId)
      .order('nombre', { ascending: true })

    setMunicipiosDisponibles(munData || [])
  }

  const handleMunicipioChange = (munId: string) => {
    setSelectedMunicipioId(munId)
    const mun = municipiosDisponibles.find(m => m.id === munId)
    if (mun) {
      setCodigosPostales(mun.codigos_postales || [])
    } else {
      setCodigosPostales([])
    }
  }

  const handleAddCp = () => {
    const cpLimpio = nuevoCp.trim()
    if (cpLimpio && !codigosPostales.includes(cpLimpio)) {
      setCodigosPostales([...codigosPostales, cpLimpio])
      setNuevoCp('')
    }
  }

  const handleRemoveCp = (cpToRemove: string) => {
    setCodigosPostales(codigosPostales.filter(cp => cp !== cpToRemove))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (tipoCuenta === 'gestor_municipio') {
      if (!selectedMunicipioId) {
        setErrorMsg('Por favor selecciona una provincia y un municipio.')
        setLoading(false)
        return
      }

      // Registro como Gestor Municipal
      const nombreCompleto = apellidos ? `${nombre.trim()} ${apellidos.trim()}` : nombre.trim()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin/dashboard` : undefined,
          data: {
            nombre_completo: nombreCompleto,
            nombre: nombre.trim(),
            apellidos: apellidos ? apellidos.trim() : '',
            municipio_id: selectedMunicipioId,
            role: 'gestor_municipio'
          }
        }
      })

      if (authError) {
        setErrorMsg(authError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        if (authData.session) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email,
            nombre: nombre.trim(),
            apellidos: apellidos ? apellidos.trim() : '',
            nombre_completo: nombreCompleto,
            municipio_id: selectedMunicipioId,
            role: 'gestor_municipio'
          })

          if (codigosPostales.length > 0) {
            await supabase.from('municipios').update({ codigos_postales: codigosPostales }).eq('id', selectedMunicipioId)
          }
        }

        alert('¡Registro de gestor completado con éxito! Revisa tu correo para confirmar la cuenta.')
        router.push('/admin/dashboard')
      }

      setLoading(false)
      return
    }

    // Registro como Ciudadano
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reservas` : undefined,
        data: {
          nombre_completo: nombre,
          nombre: nombre,
          apellidos,
          dni,
          calle,
          fecha_nacimiento: fechaNacimiento || null,
          localidad,
          codigo_postal: codigoPostal,
          role: 'usuario'
        }
      }
    })

    if (authError) {
      setErrorMsg(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      if (authData.session) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email,
          nombre,
          nombre_completo: nombre,
          apellidos,
          dni,
          calle,
          fecha_nacimiento: fechaNacimiento || null,
          localidad,
          codigo_postal: codigoPostal,
          role: 'usuario'
        })
      }

      alert('¡Registro completado con éxito! Ya puedes iniciar sesión.')
      router.push('/reservas')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
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

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
          <h2 className="text-center text-2xl font-black text-stone-900 tracking-tight">
            Crear nueva cuenta
          </h2>
          <p className="mt-1 text-center text-xs text-stone-500">
            Selecciona si eres un ciudadano o un gestor municipal para acceder a la plataforma.
          </p>

          {/* SELECTOR DE TIPO DE CUENTA */}
          <div className="flex bg-stone-200/80 p-1 rounded-2xl mt-6 border border-stone-200">
            <button
              type="button"
              onClick={() => {
                setTipoCuenta('usuario')
                setErrorMsg('')
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                tipoCuenta === 'usuario'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>👤 Ciudadano</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoCuenta('gestor_municipio')
                setErrorMsg('')
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                tipoCuenta === 'gestor_municipio'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>🏛️ Gestor Municipal</span>
            </button>
          </div>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-xl px-4">
          <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 rounded-3xl sm:px-10">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {tipoCuenta === 'gestor_municipio' ? (
                /* FORMULARIO GESTOR MUNICIPAL */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        Nombre del Gestor *
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="ej. Jon"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        Apellidos del Gestor
                      </label>
                      <input
                        type="text"
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        placeholder="ej. Pérez Gómez"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        Provincia *
                      </label>
                      <select
                        value={selectedProvinciaId}
                        onChange={(e) => handleProvinciaChange(e.target.value)}
                        required
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                      >
                        <option value="">Selecciona provincia...</option>
                        {provincias.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        Población / Municipio *
                      </label>
                      <select
                        value={selectedMunicipioId}
                        onChange={(e) => handleMunicipioChange(e.target.value)}
                        required
                        disabled={!selectedProvinciaId}
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                      >
                        <option value="">Selecciona pueblo / municipio...</option>
                        {municipiosDisponibles.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Códigos Postales del Municipio
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[36px] items-center">
                      {codigosPostales.length > 0 ? (
                        codigosPostales.map((cp) => (
                          <span 
                            key={cp} 
                            className="bg-stone-50 border border-stone-300 px-3 py-1 rounded-xl text-xs font-bold text-stone-700 shadow-2xs flex items-center gap-1.5"
                          >
                            <span>{cp}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCp(cp)} 
                              className="text-rose-500 hover:text-rose-700 font-black ml-1 text-sm leading-none"
                              title="Eliminar código postal"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-400 italic">No hay códigos postales configurados</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Añadir C.P. (ej. 20500)" 
                        value={nuevoCp}
                        onChange={(e) => setNuevoCp(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCp()
                          }
                        }}
                        className="p-2.5 border border-stone-300 rounded-xl flex-1 text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddCp} 
                        className="bg-stone-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-900 transition"
                      >
                        Añadir C.P.
                      </button>
                    </div>
                  </div>

                  <hr className="border-stone-100 my-2" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        Correo Electrónico de Contacto *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="gestor@ayuntamiento.eus"
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
                      {loading ? 'Registrando gestor...' : 'Completar Registro de Gestor'}
                    </button>
                  </div>
                </>
              ) : (
                /* FORMULARIO CIUDADANO */
                <>
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
                </>
              )}

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