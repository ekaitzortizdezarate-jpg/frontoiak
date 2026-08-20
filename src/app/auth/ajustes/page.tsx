'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'

export default function AjustesUsuarioPage() {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'usuario' | 'gestor_municipio' | 'admin'>('usuario')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [modoCambioPass, setModoCambioPass] = useState(false)
  const { t } = useLanguage()

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
      const extension = archivoImagenMunicipio.name.split('.').pop() || 'jpg'
      const nombreArchivo = `municipio-${selectedMunicipioId || user.id}-${Date.now()}.${extension}`

      const { data, error } = await supabase.storage
        .from('frontones-fotos')
        .upload(nombreArchivo, archivoImagenMunicipio, {
          cacheControl: '3600',
          upsert: true,
          contentType: archivoImagenMunicipio.type || 'image/jpeg'
        })

      if (error) {
        console.error('Error al subir imagen a Supabase Storage:', error)
        alert(`Error al subir imagen del municipio: ${error.message}\n\nVerifica las políticas RLS del bucket "frontones-fotos" en Supabase.`)
        return imagenMunicipioUrl || null
      }

      const { data: publicUrlData } = supabase.storage
        .from('frontones-fotos')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (err: any) {
      console.error(err)
      alert('Error inesperado al subir imagen: ' + (err?.message || err))
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
        <p className="text-emerald-800 font-bold text-sm">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors">
      {/* CABECERA */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          {/* IZQUIERDA: Frontoiak y debajo usuario */}
          <div className="flex flex-col items-start min-w-0">
            <div 
              onClick={handleVolver}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 dark:bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm group-hover:bg-emerald-800 dark:group-hover:bg-emerald-700 transition">
                F
              </div>
              <span className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Frontoiak
              </span>
            </div>

            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[280px] text-left mt-0.5">
              👤 {`${nombre} ${apellidos}`.trim() || email} {userRole === 'admin' ? '(Admin)' : userRole === 'gestor_municipio' ? '(Gestor)' : ''}
            </span>
          </div>

          {/* DERECHA: Botón volver + Cerrar sesión y debajo tema/idiomas */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button 
                onClick={handleVolver}
                className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex-shrink-0 whitespace-nowrap cursor-pointer"
              >
                {userRole === 'gestor_municipio' ? `← ${t.common.dashboard}` : `← ${t.common.reservations}`}
              </button>

              <button 
                onClick={handleSignOut}
                className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-2xs flex-shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
              >
                {t.common.logout}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageSelector variant="light" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        
        {/* TARJETA 1: DATOS DE PERFIL (GESTOR O CIUDADANO) */}
        {userRole === 'gestor_municipio' ? (
          <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
                  🏛️
                </div>
                <div>
                  <h1 className="text-xl font-black text-stone-900 dark:text-stone-100">{t.ajustes.title_gestor}</h1>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{t.ajustes.subtitle_gestor}</p>
                </div>
              </div>

              {!editandoPerfil && (
                <button 
                  onClick={() => setEditandoPerfil(true)}
                  className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  {t.ajustes.edit_data}
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarPerfil} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.ajustes.manager_name} *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.ajustes.manager_last_name}
                  </label>
                  <input 
                    type="text" 
                    value={apellidos} 
                    onChange={(e) => setApellidos(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                  {t.ajustes.municipality_logo}
                </label>
                {(archivoImagenMunicipio || imagenMunicipioUrl) ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-stone-50 dark:bg-stone-950/60 rounded-2xl border border-stone-200 dark:border-stone-800">
                    <img 
                      src={archivoImagenMunicipio ? URL.createObjectURL(archivoImagenMunicipio) : imagenMunicipioUrl} 
                      alt="Escudo/Imagen del municipio" 
                      className="w-16 h-16 object-cover rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xs bg-white dark:bg-stone-900" 
                    />
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        {archivoImagenMunicipio ? `Nueva imagen: ${archivoImagenMunicipio.name}` : 'Imagen guardada'}
                      </p>
                      {editandoPerfil && (
                        <div className="flex gap-2 flex-wrap">
                          <label className="bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer">
                            {t.common.edit}
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setArchivoImagenMunicipio(e.target.files[0])
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <button 
                            type="button" 
                            onClick={() => {
                              setImagenMunicipioUrl('')
                              setArchivoImagenMunicipio(null)
                            }} 
                            className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : editandoPerfil ? (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl hover:border-emerald-500 bg-stone-50/50 dark:bg-stone-950/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition cursor-pointer group">
                    <span className="text-2xl mb-1 group-hover:scale-110 transition">🏛️</span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-400">{t.ajustes.upload_logo}</span>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">PNG, JPG, WEBP</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setArchivoImagenMunicipio(e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <p className="text-xs text-stone-400 dark:text-stone-500 italic">Sin imagen configurada</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.auth.province} *
                  </label>
                  {editandoPerfil ? (
                    <select 
                      value={selectedProvinciaId} 
                      onChange={(e) => handleProvinciaChange(e.target.value)} 
                      required
                      className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                    >
                      <option value="">{t.reservas.select_province}</option>
                      {provincias.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={nombreProvinciaActual || 'Sin provincia'} 
                      disabled
                      className="w-full p-3 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm bg-stone-100 dark:bg-stone-800/60 text-stone-800 dark:text-stone-300 font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.auth.municipality} *
                  </label>
                  {editandoPerfil ? (
                    <select 
                      value={selectedMunicipioId} 
                      onChange={(e) => handleMunicipioChange(e.target.value)} 
                      required
                      disabled={!selectedProvinciaId}
                      className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-stone-50 dark:bg-stone-950 disabled:bg-stone-100 dark:disabled:bg-stone-900 focus:bg-white dark:focus:bg-stone-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                    >
                      <option value="">{t.reservas.select_town}</option>
                      {municipiosDisponibles.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={nombreMunicipioActual || 'Sin municipio'} 
                      disabled
                      className="w-full p-3 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm bg-stone-100 dark:bg-stone-800/60 text-stone-800 dark:text-stone-300 font-medium"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                  {t.ajustes.postal_codes}
                </label>
                <div className="flex flex-wrap gap-2 mb-2 min-h-[36px] items-center">
                  {codigosPostales.length > 0 ? (
                    codigosPostales.map((cp) => (
                      <span 
                        key={cp} 
                        className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 px-3 py-1 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-200 shadow-2xs flex items-center gap-1.5"
                      >
                        <span>{cp}</span>
                        {editandoPerfil && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCp(cp)} 
                            className="text-rose-500 hover:text-rose-700 font-black ml-1 text-sm leading-none cursor-pointer"
                            title="Eliminar código postal"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 dark:text-stone-500 italic">No hay códigos postales configurados</span>
                  )}
                </div>

                {editandoPerfil && (
                  <div className="flex gap-2 pt-1">
                    <input 
                      type="text" 
                      placeholder={t.ajustes.add_cp_placeholder} 
                      value={nuevoCp}
                      onChange={(e) => setNuevoCp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCp()
                        }
                      }}
                      className="p-2.5 border border-stone-300 dark:border-stone-700 rounded-xl flex-1 text-sm bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddCp} 
                      className="bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {t.ajustes.add_cp}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                  {t.auth.email}
                </label>
                <input 
                  type="email" 
                  value={email} 
                  disabled 
                  className="w-full p-3 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 cursor-not-allowed font-medium truncate"
                />
              </div>

              {editandoPerfil && (
                <div className="flex gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button 
                    type="submit" 
                    disabled={guardando}
                    className="flex-1 bg-emerald-700 dark:bg-emerald-600 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 dark:hover:bg-emerald-700 transition shadow-sm disabled:bg-stone-300 dark:disabled:bg-stone-800 cursor-pointer"
                  >
                    {guardando ? t.ajustes.saving : t.ajustes.save_changes}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditandoPerfil(false)
                      cargarDatosUsuario()
                    }}
                    className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-5 py-3 rounded-2xl text-sm font-bold transition cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
                  👤
                </div>
                <div>
                  <h1 className="text-xl font-black text-stone-900 dark:text-stone-100">{t.ajustes.title_user}</h1>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{t.ajustes.subtitle_user}</p>
                </div>
              </div>

              {!editandoPerfil && (
                <button 
                  onClick={() => setEditandoPerfil(true)}
                  className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  {t.ajustes.edit_data}
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarPerfil} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.name} *</label>
                  <input 
                    type="text" 
                    required
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.last_name}</label>
                  <input 
                    type="text" 
                    value={apellidos} 
                    onChange={(e) => setApellidos(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.dni}</label>
                  <input 
                    type="text" 
                    value={dni} 
                    onChange={(e) => setDni(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.birth_date}</label>
                  <input 
                    type="date" 
                    value={fechaNacimiento} 
                    onChange={(e) => setFechaNacimiento(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.address}</label>
                <input 
                  type="text" 
                  value={calle} 
                  onChange={(e) => setCalle(e.target.value)} 
                  disabled={!editandoPerfil}
                  className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.city}</label>
                  <input 
                    type="text" 
                    value={localidad} 
                    onChange={(e) => setLocalidad(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.postal_code}</label>
                  <input 
                    type="text" 
                    value={codigoPostal} 
                    onChange={(e) => setCodigoPostal(e.target.value)} 
                    disabled={!editandoPerfil}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 disabled:bg-stone-100 dark:disabled:bg-stone-800/60 disabled:text-stone-700 dark:disabled:text-stone-300 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.auth.email}</label>
                  <input 
                    type="email" 
                    value={email} 
                    disabled 
                    className="w-full p-3 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 cursor-not-allowed font-medium truncate"
                  />
                </div>
              </div>

              {editandoPerfil && (
                <div className="flex gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button 
                    type="submit" 
                    disabled={guardando}
                    className="flex-1 bg-emerald-700 dark:bg-emerald-600 text-white p-3 rounded-2xl text-sm font-bold hover:bg-emerald-800 dark:hover:bg-emerald-700 transition shadow-sm disabled:bg-stone-300 dark:disabled:bg-stone-800 cursor-pointer"
                  >
                    {guardando ? t.ajustes.saving : t.ajustes.save_changes}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditandoPerfil(false)
                      cargarDatosUsuario()
                    }}
                    className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-5 py-3 rounded-2xl text-sm font-bold transition cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TARJETA 2: SEGURIDAD / CONTRASEÑA */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
          <div className="flex items-center gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-black text-xl rounded-2xl flex items-center justify-center shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">{t.ajustes.security}</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{t.ajustes.change_password}</p>
            </div>
          </div>

          {!modoCambioPass ? (
            <div className="text-center py-2">
              <button 
                onClick={() => setModoCambioPass(true)}
                className="bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition shadow-sm cursor-pointer"
              >
                {t.ajustes.change_password}
              </button>
            </div>
          ) : (
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.ajustes.current_password}</label>
                <input 
                  type="password" 
                  value={passwordActual} 
                  onChange={(e) => setPasswordActual(e.target.value)} 
                  required 
                  className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-stone-800 dark:focus:ring-stone-400 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.ajustes.new_password}</label>
                <input 
                  type="password" 
                  value={nuevaPassword} 
                  onChange={(e) => setNuevaPassword(e.target.value)} 
                  required 
                  className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-stone-800 dark:focus:ring-stone-400 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">{t.ajustes.confirm_new_password}</label>
                <input 
                  type="password" 
                  value={confirmarPassword} 
                  onChange={(e) => setConfirmarPassword(e.target.value)} 
                  required 
                  className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-stone-800 dark:focus:ring-stone-400 focus:outline-none transition font-medium"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button 
                  type="submit" 
                  disabled={cambiandoPass}
                  className="flex-1 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white p-3 rounded-2xl text-sm font-bold transition shadow-sm disabled:bg-stone-300 dark:disabled:bg-stone-800 cursor-pointer"
                >
                  {cambiandoPass ? t.ajustes.saving : t.common.confirm}
                </button>
                <button 
                  type="button" 
                  onClick={() => setModoCambioPass(false)}
                  className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-5 py-3 rounded-2xl text-sm font-bold transition cursor-pointer"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}
        </div>

      </main>

      <footer className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 py-6 text-center text-xs text-stone-400 dark:text-stone-500">
        {t.home.footer}
      </footer>
    </div>
  )
}