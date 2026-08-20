// src/app/auth/ajustes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AjustesUsuarioPage() {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'usuario' | 'gestor_municipio' | 'admin'>('usuario')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [modoCambioPass, setModoCambioPass] = useState(false)

  // Campos de perfil de Ciudadano
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [calle, setCalle] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [email, setEmail] = useState('')

  // Campos de perfil de Gestor Municipal
  const [provincias, setProvincias] = useState<any[]>([])
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<any[]>([])
  const [selectedProvinciaId, setSelectedProvinciaId] = useState('')
  const [selectedMunicipioId, setSelectedMunicipioId] = useState('')
  const [codigosPostales, setCodigosPostales] = useState<string[]>([])
  const [nuevoCp, setNuevoCp] = useState('')
  const [nombreMunicipioActual, setNombreMunicipioActual] = useState('')
  const [nombreProvinciaActual, setNombreProvinciaActual] = useState('')
  const [imagenMunicipioUrl, setImagenMunicipioUrl] = useState('')
  const [archivoImagenMunicipio, setArchivoImagenMunicipio] = useState<File | null>(null)
  const [uploadingImageMunicipio, setUploadingImageMunicipio] = useState(false)

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

    // 1. Cargamos provincias
    const { data: provData } = await supabase.from('provincias').select('*').order('nombre', { ascending: true })
    setProvincias(provData || [])

    // 2. Intentamos leer de la tabla profiles con el municipio
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, municipios(*)')
      .eq('id', user.id)
      .single()

    const meta = user.user_metadata || {}
    const role = profile?.role || meta.role || 'usuario'
    setUserRole(role)

    // Datos generales
    const nombreVal = profile?.nombre || profile?.nombre_completo || meta.nombre || meta.nombre_completo || meta.full_name || (user.email ? user.email.split('@')[0] : 'Usuario')
    setNombre(nombreVal)
    setApellidos(profile?.apellidos || meta.apellidos || '')
    setDni(profile?.dni || meta.dni || '')
    setCalle(profile?.calle || meta.calle || '')
    setFechaNacimiento(profile?.fecha_nacimiento || meta.fecha_nacimiento || '')
    setLocalidad(profile?.localidad || meta.localidad || '')
    setCodigoPostal(profile?.codigo_postal || meta.codigo_postal || '')

    // Datos de gestor
    if (role === 'gestor_municipio' && profile?.municipios) {
      const mun = profile.municipios
      setSelectedMunicipioId(mun.id || '')
      setSelectedProvinciaId(mun.provincia_id || '')
      setCodigosPostales(mun.codigos_postales || [])
      setNombreMunicipioActual(mun.nombre || '')
      setImagenMunicipioUrl(mun.imagen_url || '')
      setArchivoImagenMunicipio(null)

      const prov = (provData || []).find((p: any) => p.id === mun.provincia_id)
      setNombreProvinciaActual(prov ? prov.nombre : '')

      if (mun.provincia_id) {
        const { data: munData } = await supabase
          .from('municipios')
          .select('*')
          .eq('provincia_id', mun.provincia_id)
          .order('nombre', { ascending: true })
        setMunicipiosDisponibles(munData || [])
      }
    } else if (role === 'gestor_municipio') {
      // Si no tiene municipio vinculado aún
      setSelectedMunicipioId('')
      setSelectedProvinciaId('')
      setCodigosPostales([])
      setNombreMunicipioActual('Sin municipio configurado')
      setNombreProvinciaActual('')
      setImagenMunicipioUrl('')
      setArchivoImagenMunicipio(null)
    }

    setLoading(false)
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
      setNombreMunicipioActual(mun.nombre || '')
    } else {
      setCodigosPostales([])
      setNombreMunicipioActual('')
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

  const subirImagenMunicipio = async (): Promise<string | null> => {
    if (!archivoImagenMunicipio) return imagenMunicipioUrl || null

    try {
      setUploadingImageMunicipio(true)
      const extension = archivoImagenMunicipio.name.split('.').pop()
      const nombreArchivo = `municipio-${selectedMunicipioId || user.id}-${Date.now()}.${extension}`

      const { data, error } = await supabase.storage
        .from('frontones-fotos')
        .upload(nombreArchivo, archivoImagenMunicipio)

      if (error) {
        alert('Error al subir imagen del municipio: ' + error.message)
        return imagenMunicipioUrl || null
      }

      const { data: publicUrlData } = supabase.storage
        .from('frontones-fotos')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (err) {
      console.error(err)
      return imagenMunicipioUrl || null
    } finally {
      setUploadingImageMunicipio(false)
    }
  }

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const nombreLimpio = (nombre && nombre.trim().length > 0)
      ? nombre.trim()
      : (user?.profile?.nombre || user?.user_metadata?.nombre || user?.user_metadata?.nombre_completo || (user.email ? user.email.split('@')[0] : 'Usuario'))

    const nombreCompleto = apellidos && apellidos.trim() ? `${nombreLimpio} ${apellidos.trim()}` : nombreLimpio

    setGuardando(true)

    if (userRole === 'gestor_municipio') {
      // 1. Guardar datos de gestor
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: email || user.email,
          nombre: nombreLimpio,
          apellidos: apellidos ? apellidos.trim() : '',
          nombre_completo: nombreCompleto,
          municipio_id: selectedMunicipioId || null,
          role: 'gestor_municipio'
        })

      if (profileError) {
        alert('Error al actualizar el perfil de gestor: ' + profileError.message)
        setGuardando(false)
        return
      }

      // 2. Subir imagen si se seleccionó archivo nuevo
      let finalImageUrl = imagenMunicipioUrl
      if (archivoImagenMunicipio) {
        const subida = await subirImagenMunicipio()
        if (subida) finalImageUrl = subida
      }

      // 3. Actualizar códigos postales e imagen en la tabla de municipios si hay un municipio seleccionado
      if (selectedMunicipioId) {
        const { error: munError } = await supabase
          .from('municipios')
          .update({ 
            codigos_postales: codigosPostales,
            imagen_url: finalImageUrl || null
          })
          .eq('id', selectedMunicipioId)

        if (munError) {
          console.warn('Aviso al actualizar datos del municipio:', munError)
          if (munError.message?.includes('column') || munError.code === 'PGRST204') {
            await supabase.from('municipios').update({ codigos_postales: codigosPostales }).eq('id', selectedMunicipioId)
          }
        }
      }

      // 4. Sincronizar metadatos en Auth
      try {
        await supabase.auth.updateUser({
          data: {
            nombre: nombreLimpio,
            apellidos: apellidos ? apellidos.trim() : '',
            nombre_completo: nombreCompleto,
            municipio_id: selectedMunicipioId || null,
            role: 'gestor_municipio'
          }
        })
      } catch (authErr) {
        console.warn('No se pudieron actualizar metadatos de Auth:', authErr)
      }

      alert('¡Ajustes de gestor municipal actualizados correctamente!')
      setEditandoPerfil(false)
      setGuardando(false)
      setArchivoImagenMunicipio(null)
      cargarDatosUsuario()
      return
    }

    // Guardar datos de Ciudadano
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
        codigo_postal: codigoPostal ? codigoPostal.trim() : '',
        role: 'usuario'
      })

    if (error) {
      alert('Error al actualizar el perfil: ' + error.message)
      setGuardando(false)
      return
    }

    setNombre(nombreLimpio)

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
          codigo_postal: codigoPostal ? codigoPostal.trim() : '',
          role: 'usuario'
        }
      })
    } catch (authErr) {
      console.warn('No se pudieron actualizar metadatos de Auth:', authErr)
    }

    alert('¡Datos personales actualizados correctamente!')
    setEditandoPerfil(false)
    setGuardando(false)
    cargarDatosUsuario()
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

  const handleVolver = () => {
    if (userRole === 'gestor_municipio' || userRole === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/reservas')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-emerald-800 font-bold text-sm">Cargando ajustes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div 
            onClick={handleVolver}
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
            <button 
              onClick={handleVolver}
              className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex-shrink-0 whitespace-nowrap"
            >
              {userRole === 'gestor_municipio' ? '← Volver al Panel' : '← Volver a Reservas'}
            </button>

            <button 
              onClick={handleSignOut}
              className="bg-rose-50 text-rose-600 border border-rose-200 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition shadow-2xs flex-shrink-0 whitespace-nowrap"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        
        {/* TARJETA 1: DATOS DE PERFIL (GESTOR O CIUDADANO) */}
        {userRole === 'gestor_municipio' ? (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
                  🏛️
                </div>
                <div>
                  <h1 className="text-xl font-black text-stone-900">Ajustes del Gestor Municipal</h1>
                  <p className="text-xs text-stone-500 font-medium">Datos de tu municipio y contacto de gestión</p>
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
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Nombre del Gestor *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    disabled={!editandoPerfil}
                    placeholder="ej. Jon"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
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
                    disabled={!editandoPerfil}
                    placeholder="ej. Pérez Gómez"
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 disabled:bg-stone-100 disabled:text-stone-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Imagen / Escudo del Municipio (Opcional)
                </label>
                {imagenMunicipioUrl && !archivoImagenMunicipio && (
                  <div className="flex items-center gap-3 mb-2">
                    <img src={imagenMunicipioUrl} alt="Escudo/Imagen del municipio" className="w-16 h-16 object-cover rounded-2xl border border-stone-200 shadow-2xs" />
                    {editandoPerfil && (
                      <button 
                        type="button" 
                        onClick={() => setImagenMunicipioUrl('')} 
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                )}
                {editandoPerfil && (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArchivoImagenMunicipio(e.target.files[0])
                      }
                    }}
                    className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 transition cursor-pointer"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Provincia *
                  </label>
                  {editandoPerfil ? (
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
                  ) : (
                    <input 
                      type="text" 
                      value={nombreProvinciaActual || 'Sin provincia'} 
                      disabled
                      className="w-full p-3 border border-stone-200 rounded-2xl text-sm bg-stone-100 text-stone-800 font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Población / Municipio *
                  </label>
                  {editandoPerfil ? (
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
                  ) : (
                    <input 
                      type="text" 
                      value={nombreMunicipioActual || 'Sin municipio'} 
                      disabled
                      className="w-full p-3 border border-stone-200 rounded-2xl text-sm bg-stone-100 text-stone-800 font-medium"
                    />
                  )}
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
                        className="bg-white border border-stone-300 px-3 py-1 rounded-xl text-xs font-bold text-stone-700 shadow-2xs flex items-center gap-1.5"
                      >
                        <span>{cp}</span>
                        {editandoPerfil && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCp(cp)} 
                            className="text-rose-500 hover:text-rose-700 font-black ml-1 text-sm leading-none"
                            title="Eliminar código postal"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic">No hay códigos postales configurados</span>
                  )}
                </div>

                {editandoPerfil && (
                  <div className="flex gap-2 pt-1">
                    <input 
                      type="text" 
                      placeholder="Añadir otro C.P. (ej. 20500)" 
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
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Correo de Contacto / Acceso
                </label>
                <input 
                  type="email" 
                  value={email} 
                  disabled 
                  className="w-full p-3 border border-stone-200 rounded-2xl text-sm bg-stone-100 text-stone-600 cursor-not-allowed font-medium truncate"
                />
              </div>

              {editandoPerfil && (
                <div className="flex gap-3 pt-3 border-t border-stone-100">
                  <button 
                    type="submit" 
                    disabled={guardando}
                    className="flex-1 bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm disabled:bg-stone-300"
                  >
                    {guardando ? 'Guardando...' : 'Guardar Ajustes'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditandoPerfil(false)
                      cargarDatosUsuario()
                    }}
                    className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-5 py-3 rounded-2xl text-sm font-bold transition"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4 flex-wrap gap-2">
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
                <div className="flex gap-3 pt-3 border-t border-stone-100">
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
                    className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-5 py-3 rounded-2xl text-sm font-bold transition"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TARJETA 2: SEGURIDAD / CONTRASEÑA */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 space-y-6">
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

              <div className="flex gap-3 pt-3 border-t border-stone-100">
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
                  className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-5 py-3 rounded-2xl text-sm font-bold transition"
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