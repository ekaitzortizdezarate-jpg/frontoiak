// src/app/auth/ajustes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AjustesUsuarioPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [cambiandoPass, setCambiandoPass] = useState(false)

  // Control para mostrar el formulario de cambio de contraseña
  const [modoCambioPass, setModoCambioPass] = useState(false)

  // Campos del formulario de perfil
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [calle, setCalle] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [email, setEmail] = useState('')

  // Campos para cambio de contraseña seguro
  const [passwordActual, setPasswordActual] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')

  const router = useRouter()

  useEffect(() => {
    cargarDatosUsuario()
  }, [])

  const cargarDatosUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUser(user)
    setEmail(user.email || '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setNombre(profile.nombre_completo || '')
      setApellidos(profile.apellidos || '')
      setDni(profile.dni || '')
      setCalle(profile.calle || '')
      setFechaNacimiento(profile.fecha_nacimiento || '')
      setLocalidad(profile.localidad || '')
      setCodigoPostal(profile.codigo_postal || '')
    }
    setLoading(false)
  }

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setGuardando(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        nombre_completo: nombre,
        apellidos,
        dni,
        calle,
        fecha_nacimiento: fechaNacimiento || null,
        localidad,
        codigo_postal: codigoPostal
      })
      .eq('id', user.id)

    if (error) {
      alert('Error al actualizar perfil: ' + error.message)
    } else {
      alert('¡Datos de usuario actualizados correctamente!')
      router.push('/reservas')
    }

    setGuardando(false)
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordActual || !nuevaPassword) {
      alert('Debes rellenar la contraseña actual y la nueva.')
      return
    }

    if (nuevaPassword !== confirmarPassword) {
      alert('Las nuevas contraseñas no coinciden.')
      return
    }

    setCambiandoPass(true)

    // 1. Verificamos la contraseña actual haciendo un signIn de prueba
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: passwordActual
    })

    if (signInError) {
      alert('La contraseña actual es incorrecta.')
      setCambiandoPass(false)
      return
    }

    // 2. Si es correcta, actualizamos a la nueva contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: nuevaPassword
    })

    if (updateError) {
      alert('Error al actualizar la contraseña: ' + updateError.message)
    } else {
      alert('¡Contraseña actualizada con éxito!')
      setPasswordActual('')
      setNuevaPassword('')
      setConfirmarPassword('')
      setModoCambioPass(false)
    }

    setCambiandoPass(false)
  }

  const handleLogoClick = () => {
    router.push('/reservas')
  }

  if (loading) {
    return <div className="p-8 text-center text-emerald-800 font-medium">Cargando ajustes de usuario...</div>
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-emerald-800 transition">
              F
            </div>
            <span className="text-2xl font-black text-stone-900 tracking-tight">
              Frontoiak
            </span>
          </div>

          <button 
            onClick={() => router.push('/reservas')}
            className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            ← Volver a Reservas
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        
        {/* TARJETA 1: INFORMACIÓN PERSONAL */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6">
          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
              👤
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">Mi Perfil y Datos Personales</h1>
              <p className="text-xs text-stone-500 font-medium">Modifica tu información cuando lo necesites</p>
            </div>
          </div>

          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nombre
                </label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  placeholder="Tu nombre"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Apellidos
                </label>
                <input 
                  type="text" 
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
                  DNI
                </label>
                <input 
                  type="text" 
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
                Calle / Dirección
              </label>
              <input 
                type="text" 
                value={calle} 
                onChange={(e) => setCalle(e.target.value)} 
                placeholder="ej. Kale Nagusia, 12, 1º A"
                className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Localidad
                </label>
                <input 
                  type="text" 
                  value={localidad} 
                  onChange={(e) => setLocalidad(e.target.value)} 
                  placeholder="ej. Donostia"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Código Postal
                </label>
                <input 
                  type="text" 
                  value={codigoPostal} 
                  onChange={(e) => setCodigoPostal(e.target.value)} 
                  placeholder="ej. 20001"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input 
                  type="email" 
                  value={email} 
                  disabled 
                  className="w-full p-3 border border-stone-200 rounded-2xl text-sm bg-stone-100 text-stone-500 cursor-not-allowed font-medium truncate"
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={guardando}
                className="w-full bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:bg-stone-300"
              >
                {guardando ? 'Guardando...' : 'Guardar Cambios de Perfil'}
              </button>
            </div>
          </form>
        </div>

        {/* TARJETA 2: SEGURIDAD / CAMBIAR CONTRASEÑA */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6">
          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
            <div className="w-12 h-12 bg-stone-100 text-stone-800 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900">Seguridad / Contraseña</h2>
              <p className="text-xs text-stone-500 font-medium">Gestiona tu clave de acceso</p>
            </div>
          </div>

          {!modoCambioPass ? (
            <div className="text-center py-4">
              <button 
                onClick={() => setModoCambioPass(true)}
                className="bg-stone-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-stone-800 transition shadow-sm active:scale-95"
              >
                Cambiar contraseña
              </button>
            </div>
          ) : (
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Contraseña Actual (Obligatoria)
                </label>
                <input 
                  type="password" 
                  value={passwordActual} 
                  onChange={(e) => setPasswordActual(e.target.value)} 
                  required 
                  placeholder="Introduce tu contraseña actual"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Nueva Contraseña
                </label>
                <input 
                  type="password" 
                  value={nuevaPassword} 
                  onChange={(e) => setNuevaPassword(e.target.value)} 
                  required 
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input 
                  type="password" 
                  value={confirmarPassword} 
                  onChange={(e) => setConfirmarPassword(e.target.value)} 
                  required 
                  placeholder="Repite la nueva contraseña"
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800 focus:outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={cambiandoPass}
                  className="flex-1 bg-stone-900 text-white p-3 rounded-2xl text-sm font-bold hover:bg-stone-800 transition shadow-sm active:scale-95 disabled:bg-stone-300"
                >
                  {cambiandoPass ? 'Actualizando...' : 'Confirmar Cambio de Contraseña'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setModoCambioPass(false)
                    setPasswordActual('')
                    setNuevaPassword('')
                    setConfirmarPassword('')
                  }}
                  className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-4 py-3 rounded-2xl text-sm font-bold transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

      </main>

      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        Frontoiak — Plataforma para la gestión y disfrute de los frontones de Euskadi.
      </footer>
    </div>
  )
}