// src/app/auth/ajustes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AjustesUsuarioPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [modoCambioPass, setModoCambioPass] = useState(false)

  // Campos de perfil
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [calle, setCalle] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [email, setEmail] = useState('')

  // Seguridad
  const [passwordActual, setPasswordActual] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [cambiandoPass, setCambiandoPass] = useState(false)

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

    // 1. Intentamos leer de la tabla profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const meta = user.user_metadata || {}

    // Combinamos datos de la tabla profiles y de user_metadata como respaldo seguro
    const nombreVal = profile?.nombre || profile?.nombre_completo || meta.nombre || meta.nombre_completo || meta.full_name || (user.email ? user.email.split('@')[0] : 'Usuario')
    const apellidosVal = profile?.apellidos || meta.apellidos || ''
    const dniVal = profile?.dni || meta.dni || ''
    const calleVal = profile?.calle || meta.calle || ''
    const fechaNacVal = profile?.fecha_nacimiento || meta.fecha_nacimiento || ''
    const localidadVal = profile?.localidad || meta.localidad || ''
    const cpVal = profile?.codigo_postal || meta.codigo_postal || ''

    setNombre(nombreVal)
    setApellidos(apellidosVal)
    setDni(dniVal)
    setCalle(calleVal)
    setFechaNacimiento(fechaNacVal)
    setLocalidad(localidadVal)
    setCodigoPostal(cpVal)

    // Si la tabla profiles no existía o estaba incompleta, la sincronizamos para que quede persistida en BD
    if (!profile || !profile.nombre || !profile.dni || !profile.localidad) {
      if (nombreVal || apellidosVal || dniVal || localidadVal || cpVal) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email || '',
          nombre: nombreVal,
          nombre_completo: nombreVal,
          apellidos: apellidosVal,
          dni: dniVal,
          calle: calleVal,
          fecha_nacimiento: fechaNacVal || null,
          localidad: localidadVal,
          codigo_postal: cpVal,
          role: profile?.role || meta.role || 'usuario'
        })
      }
    }

    setLoading(false)
  }

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const nombreLimpio = (nombre && nombre.trim().length > 0)
      ? nombre.trim()
      : (user?.profile?.nombre || user?.user_metadata?.nombre || user?.user_metadata?.nombre_completo || (user.email ? user.email.split('@')[0] : 'Usuario'))

    setGuardando(true)

    // 1. Guardamos en la base de datos (tabla profiles)
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: email || user.email,
        nombre: nombreLimpio,
        nombre_completo: nombreLimpio,
        apellidos: apellidos ? apellidos.trim() : '',
        dni: dni ? dni.trim() : '',
        calle: calle ? calle.trim() : '',
        fecha_nacimiento: fechaNacimiento || null,
        localidad: localidad ? localidad.trim() : '',
        codigo_postal: codigoPostal ? codigoPostal.trim() : ''
      })

    if (error) {
      alert('Error al actualizar el perfil: ' + error.message)
      setGuardando(false)
      return
    }

    // Actualizamos el estado con el nombre guardado
    setNombre(nombreLimpio)

    // 2. Sincronizamos también los metadatos de autenticación en Supabase Auth
    try {
      await supabase.auth.updateUser({
        data: {
          nombre: nombreLimpio,
          nombre_completo: nombreLimpio,
          apellidos: apellidos ? apellidos.trim() : '',
          dni: dni ? dni.trim() : '',
          calle: calle ? calle.trim() : '',
          fecha_nacimiento: fechaNacimiento || null,
          localidad: localidad ? localidad.trim() : '',
          codigo_postal: codigoPostal ? codigoPostal.trim() : ''
        }
      })
    } catch (authErr) {
      console.warn('No se pudieron actualizar metadatos de Auth:', authErr)
    }

    alert('¡Datos actualizados correctamente!')
    setEditandoPerfil(false)
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: passwordActual
    })

    if (signInError) {
      alert('La contraseña actual es incorrecta.')
      setCambiandoPass(false)
      return
    }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-emerald-800 font-bold text-sm">Cargando ajustes de usuario...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div 
            onClick={() => router.push('/reservas')}
            className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm group-hover:bg-emerald-800 transition">
              F
            </div>
            <span className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Frontoiak
            </span>
          </div>

          <button 
            onClick={() => router.push('/reservas')}
            className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap"
          >
            ← Volver a Reservas
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        
        {/* TARJETA 1: DATOS PERSONALES */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
                👤
              </div>
              <div>
                <h1 className="text-xl font-black text-stone-900">Mi Perfil y Datos Personales</h1>
                <p className="text-xs text-stone-500 font-medium">Información registrada en tu cuenta</p>
              </div>
            </div>

            {!editandoPerfil && (
              <button 
                onClick={() => setEditandoPerfil(true)}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                Editar Datos
              </button>
            )}
          </div>

          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Nombre *</label>
                <input 
                  type="text" 
                  required
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Apellidos</label>
                <input 
                  type="text" 
                  value={apellidos} 
                  onChange={(e) => setApellidos(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">DNI</label>
                <input 
                  type="text" 
                  value={dni} 
                  onChange={(e) => setDni(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  value={fechaNacimiento} 
                  onChange={(e) => setFechaNacimiento(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Calle / Dirección</label>
              <input 
                type="text" 
                value={calle} 
                onChange={(e) => setCalle(e.target.value)} 
                disabled={!editandoPerfil}
                className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Localidad</label>
                <input 
                  type="text" 
                  value={localidad} 
                  onChange={(e) => setLocalidad(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Código Postal</label>
                <input 
                  type="text" 
                  value={codigoPostal} 
                  onChange={(e) => setCodigoPostal(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Correo</label>
                <input 
                  type="email" 
                  value={email} 
                  disabled 
                  className="w-full p-3 border border-stone-200 rounded-2xl text-sm bg-stone-100 text-stone-600 cursor-not-allowed font-medium truncate"
                />
              </div>
            </div>

            {editandoPerfil && (
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="flex-1 bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm disabled:bg-stone-300"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditandoPerfil(false)
                    cargarDatosUsuario()
                  }}
                  className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-4 py-3 rounded-2xl text-sm font-bold transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>
        </div>

        {/* TARJETA 2: SEGURIDAD */}
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
            <div className="text-center py-2">
              <button 
                onClick={() => setModoCambioPass(true)}
                className="bg-stone-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-stone-800 transition shadow-sm"
              >
                Cambiar contraseña
              </button>
            </div>
          ) : (
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Contraseña Actual</label>
                <input 
                  type="password" 
                  value={passwordActual} 
                  onChange={(e) => setPasswordActual(e.target.value)} 
                  required 
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={nuevaPassword} 
                  onChange={(e) => setNuevaPassword(e.target.value)} 
                  required 
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={confirmarPassword} 
                  onChange={(e) => setConfirmarPassword(e.target.value)} 
                  required 
                  className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800 focus:outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={cambiandoPass}
                  className="flex-1 bg-stone-900 text-white p-3 rounded-2xl text-sm font-bold hover:bg-stone-800 transition shadow-sm disabled:bg-stone-300"
                >
                  {cambiandoPass ? 'Actualizando...' : 'Confirmar Cambio'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setModoCambioPass(false)}
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