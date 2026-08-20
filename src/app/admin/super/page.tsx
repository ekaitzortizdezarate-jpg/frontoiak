// src/app/admin/super/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SuperAdminDashboard() {
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'municipios' | 'gestores' | 'iot' | 'provincias'>('municipios')

  // Datos globales
  const [municipios, setMunicipios] = useState<any[]>([])
  const [provincias, setProvincias] = useState<any[]>([])
  const [gestores, setGestores] = useState<any[]>([])
  const [frontones, setFrontones] = useState<any[]>([])

  // Filtros y búsquedas
  const [busquedaMunicipio, setBusquedaMunicipio] = useState('')
  const [filtroProvinciaMun, setFiltroProvinciaMun] = useState('')
  const [filtroEstadoMun, setFiltroEstadoMun] = useState<'todos' | 'activo' | 'en_pruebas' | 'inactivo'>('todos')

  const [busquedaGestor, setBusquedaGestor] = useState('')
  const [filtroMunicipioGestor, setFiltroMunicipioGestor] = useState('')

  const [busquedaFrontonIot, setBusquedaFrontonIot] = useState('')
  const [filtroMunicipioIot, setFiltroMunicipioIot] = useState('')
  const [filtroSoloConSensor, setFiltroSoloConSensor] = useState(true)

  // Modales y formularios
  const [mostrarFormMunicipio, setMostrarFormMunicipio] = useState(false)
  const [municipioEnEdicion, setMunicipioEnEdicion] = useState<any | null>(null)
  const [nuevoMunicipio, setNuevoMunicipio] = useState({
    nombre: '',
    provincia_id: '',
    estado: 'activo' as 'activo' | 'en_pruebas' | 'inactivo',
    codigos_postales: [] as string[],
    imagen_url: ''
  })
  const [nuevoCpMun, setNuevoCpMun] = useState('')
  const [archivoImagenMun, setArchivoImagenMun] = useState<File | null>(null)
  const [guardandoMunicipio, setGuardandoMunicipio] = useState(false)

  // Formulario de Gestor
  const [mostrarFormGestor, setMostrarFormGestor] = useState(false)
  const [nuevoGestor, setNuevoGestor] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    municipio_id: ''
  })
  const [guardandoGestor, setGuardandoGestor] = useState(false)

  // Reasignar Gestor
  const [gestorParaReasignar, setGestorParaReasignar] = useState<any | null>(null)
  const [municipioReasignadoId, setMunicipioReasignadoId] = useState('')

  // Formulario de Provincia
  const [mostrarFormProvincia, setMostrarFormProvincia] = useState(false)
  const [nuevaProvinciaNombre, setNuevaProvinciaNombre] = useState('')
  const [guardandoProvincia, setGuardandoProvincia] = useState(false)

  // Modal Telemetría IoT
  const [frontonGraficaModal, setFrontonGraficaModal] = useState<any | null>(null)
  const [fechaGraficaIoT, setFechaGraficaIoT] = useState(new Date().toISOString().split('T')[0])
  const [datosTelemetria, setDatosTelemetria] = useState<any[]>([])

  const horasDelDia = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)
  const router = useRouter()

  useEffect(() => {
    verificarAdminYCargarDatos()
  }, [])

  const verificarAdminYCargarDatos = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const meta = user.user_metadata || {}
    const role = profile?.role || meta.role || 'usuario'

    if (role !== 'admin') {
      alert('Acceso restringido. Esta área es exclusiva para Administradores de la plataforma.')
      if (role === 'gestor_municipio') {
        router.push('/admin/dashboard')
      } else {
        router.push('/reservas')
      }
      return
    }

    setAdminUser({ ...user, profile: profile || { role: 'admin' } })
    await cargarDatosGlobales()
    setLoading(false)
  }

  const cargarDatosGlobales = async () => {
    // 1. Provincias
    const { data: provs } = await supabase
      .from('provincias')
      .select('*')
      .order('nombre', { ascending: true })
    setProvincias(provs || [])

    // 2. Municipios con su provincia
    const { data: muns } = await supabase
      .from('municipios')
      .select('*, provincias(id, nombre)')
      .order('nombre', { ascending: true })
    setMunicipios(muns || [])

    // 3. Gestores
    const { data: profs } = await supabase
      .from('profiles')
      .select('*, municipios(id, nombre, provincia_id, provincias(nombre))')
      .eq('role', 'gestor_municipio')
      .order('created_at', { ascending: false })
    setGestores(profs || [])

    // 4. Frontones
    const { data: fronts } = await supabase
      .from('frontones')
      .select('*, municipios(id, nombre, provincia_id, provincias(nombre))')
      .order('nombre', { ascending: true })
    setFrontones(fronts || [])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // ==========================================
  // GESTIÓN DE MUNICIPIOS
  // ==========================================
  const resetFormMunicipio = () => {
    setNuevoMunicipio({
      nombre: '',
      provincia_id: provincias[0]?.id || '',
      estado: 'activo',
      codigos_postales: [],
      imagen_url: ''
    })
    setNuevoCpMun('')
    setArchivoImagenMun(null)
    setMunicipioEnEdicion(null)
  }

  const handleIniciarEdicionMunicipio = (mun: any) => {
    setMunicipioEnEdicion(mun)
    setNuevoMunicipio({
      nombre: mun.nombre || '',
      provincia_id: mun.provincia_id || '',
      estado: mun.estado || 'activo',
      codigos_postales: mun.codigos_postales || [],
      imagen_url: mun.imagen_url || ''
    })
    setArchivoImagenMun(null)
    setMostrarFormMunicipio(true)
  }

  const handleAddCpMun = () => {
    const cp = nuevoCpMun.trim()
    if (cp && !nuevoMunicipio.codigos_postales.includes(cp)) {
      setNuevoMunicipio({
        ...nuevoMunicipio,
        codigos_postales: [...nuevoMunicipio.codigos_postales, cp]
      })
      setNuevoCpMun('')
    }
  }

  const handleRemoveCpMun = (cpToRemove: string) => {
    setNuevoMunicipio({
      ...nuevoMunicipio,
      codigos_postales: nuevoMunicipio.codigos_postales.filter(cp => cp !== cpToRemove)
    })
  }

  const subirImagenMunicipioStorage = async (): Promise<string | null> => {
    if (!archivoImagenMun) return nuevoMunicipio.imagen_url || null

    try {
      const extension = archivoImagenMun.name.split('.').pop() || 'jpg'
      const nombreArchivo = `municipio-superadmin-${Date.now()}.${extension}`

      const { data, error } = await supabase.storage
        .from('frontones-fotos')
        .upload(nombreArchivo, archivoImagenMun, {
          cacheControl: '3600',
          upsert: true,
          contentType: archivoImagenMun.type || 'image/jpeg'
        })

      if (error) {
        console.error('Error al subir imagen a Supabase Storage:', error)
        alert('Error al subir imagen: ' + error.message)
        return nuevoMunicipio.imagen_url || null
      }

      const { data: publicUrlData } = supabase.storage
        .from('frontones-fotos')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (err: any) {
      console.error('Excepción al subir imagen:', err)
      return nuevoMunicipio.imagen_url || null
    }
  }

  const handleGuardarMunicipio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoMunicipio.nombre.trim() || !nuevoMunicipio.provincia_id) {
      alert('Por favor completa el nombre y la provincia.')
      return
    }

    setGuardandoMunicipio(true)
    let finalImageUrl = nuevoMunicipio.imagen_url
    if (archivoImagenMun) {
      const subida = await subirImagenMunicipioStorage()
      if (subida) finalImageUrl = subida
    }

    const datosMunicipio: any = {
      nombre: nuevoMunicipio.nombre.trim(),
      provincia_id: nuevoMunicipio.provincia_id,
      estado: nuevoMunicipio.estado,
      codigos_postales: nuevoMunicipio.codigos_postales,
      imagen_url: finalImageUrl || null
    }

    let error
    if (municipioEnEdicion) {
      const res = await supabase
        .from('municipios')
        .update(datosMunicipio)
        .eq('id', municipioEnEdicion.id)
      error = res.error
    } else {
      const res = await supabase
        .from('municipios')
        .insert([datosMunicipio])
      error = res.error
    }

    if (error) {
      console.warn('Aviso al guardar municipio:', error)
      // Fallback si la columna estado o imagen_url no existiera aún en Postgres
      if (error.message?.includes('column') || error.code === 'PGRST204') {
        const fallback = { ...datosMunicipio }
        delete fallback.estado
        delete fallback.imagen_url
        if (municipioEnEdicion) {
          await supabase.from('municipios').update(fallback).eq('id', municipioEnEdicion.id)
        } else {
          await supabase.from('municipios').insert([fallback])
        }
      } else {
        alert('Error al guardar municipio: ' + error.message)
        setGuardandoMunicipio(false)
        return
      }
    }

    alert(`Municipio "${nuevoMunicipio.nombre}" guardado con éxito.`)
    setGuardandoMunicipio(false)
    setMostrarFormMunicipio(false)
    resetFormMunicipio()
    await cargarDatosGlobales()
  }

  const handleCambiarEstadoMunicipio = async (mun: any, nuevoEstado: 'activo' | 'en_pruebas' | 'inactivo') => {
    const { error } = await supabase
      .from('municipios')
      .update({ estado: nuevoEstado })
      .eq('id', mun.id)

    if (error) {
      alert('Error al actualizar estado del municipio: ' + error.message)
      return
    }
    await cargarDatosGlobales()
  }

  const handleEliminarMunicipio = async (mun: any) => {
    const frontonesVinculados = frontones.filter(f => f.municipio_id === mun.id).length
    const gestoresVinculados = gestores.filter(g => g.municipio_id === mun.id).length

    let aviso = `¿Estás seguro de que deseas eliminar el municipio "${mun.nombre}"?`
    if (frontonesVinculados > 0 || gestoresVinculados > 0) {
      aviso += `\n\n⚠️ Atención: Este municipio tiene ${frontonesVinculados} frontón(es) y ${gestoresVinculados} gestor(es) vinculados.`
    }

    if (!confirm(aviso)) return

    const { error } = await supabase
      .from('municipios')
      .delete()
      .eq('id', mun.id)

    if (error) {
      alert('Error al eliminar municipio: ' + error.message)
    } else {
      alert('Municipio eliminado correctamente.')
      await cargarDatosGlobales()
    }
  }

  // ==========================================
  // GESTIÓN DE GESTORES
  // ==========================================
  const handleCrearGestor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoGestor.email || !nuevoGestor.password || !nuevoGestor.nombre) {
      alert('Por favor completa todos los campos obligatorios.')
      return
    }

    if (nuevoGestor.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setGuardandoGestor(true)
    const nombreCompleto = nuevoGestor.apellidos
      ? `${nuevoGestor.nombre.trim()} ${nuevoGestor.apellidos.trim()}`
      : nuevoGestor.nombre.trim()

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: nuevoGestor.email.trim(),
      password: nuevoGestor.password,
      options: {
        data: {
          nombre: nuevoGestor.nombre.trim(),
          apellidos: nuevoGestor.apellidos.trim(),
          nombre_completo: nombreCompleto,
          role: 'gestor_municipio',
          municipio_id: nuevoGestor.municipio_id || null
        }
      }
    })

    if (authError) {
      alert('Error al crear cuenta de gestor: ' + authError.message)
      setGuardandoGestor(false)
      return
    }

    if (authData.user) {
      // 2. Crear o actualizar perfil en la tabla profiles
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: nuevoGestor.email.trim(),
        nombre: nuevoGestor.nombre.trim(),
        apellidos: nuevoGestor.apellidos.trim(),
        nombre_completo: nombreCompleto,
        role: 'gestor_municipio',
        municipio_id: nuevoGestor.municipio_id || null
      })
    }

    alert(`¡Gestor "${nombreCompleto}" dado de alta con éxito!`)
    setGuardandoGestor(false)
    setMostrarFormGestor(false)
    setNuevoGestor({
      nombre: '',
      apellidos: '',
      email: '',
      password: '',
      municipio_id: ''
    })
    await cargarDatosGlobales()
  }

  const handleReasignarMunicipioGestor = async () => {
    if (!gestorParaReasignar) return

    const { error } = await supabase
      .from('profiles')
      .update({ municipio_id: municipioReasignadoId || null })
      .eq('id', gestorParaReasignar.id)

    if (error) {
      alert('Error al reasignar municipio: ' + error.message)
    } else {
      alert('Municipio reasignado correctamente.')
      setGestorParaReasignar(null)
      await cargarDatosGlobales()
    }
  }

  const handleRevocarAccesoGestor = async (gestor: any) => {
    const nuevoRol = gestor.role === 'gestor_municipio' ? 'usuario' : 'gestor_municipio'
    const accion = nuevoRol === 'usuario' ? 'revocar permisos de gestor a' : 'restaurar como gestor a'

    if (!confirm(`¿Estás seguro de que deseas ${accion} "${gestor.nombre_completo || gestor.email}"?`)) {
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: nuevoRol })
      .eq('id', gestor.id)

    if (error) {
      alert('Error al cambiar rol: ' + error.message)
    } else {
      alert('Rol actualizado con éxito.')
      await cargarDatosGlobales()
    }
  }

  const handleResetPasswordEmail = async (email: string) => {
    if (!confirm(`¿Enviar correo de restablecimiento de contraseña a ${email}?`)) return

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/ajustes`
    })

    if (error) {
      alert('Error al enviar correo de recuperación: ' + error.message)
    } else {
      alert(`Correo de recuperación enviado a ${email}.`)
    }
  }

  // ==========================================
  // GESTIÓN DE HARDWARE / IOT
  // ==========================================
  const handleRegenerarHardwareToken = async (fronton: any) => {
    const nuevoToken = `esp32-${fronton.id.slice(0, 8)}-${Math.random().toString(36).substring(2, 10)}`

    if (!confirm(`¿Generar/Regenerar nuevo token ESP32 para el frontón "${fronton.nombre}"?`)) {
      return
    }

    const { error } = await supabase
      .from('frontones')
      .update({ hardware_token: nuevoToken })
      .eq('id', fronton.id)

    if (error) {
      alert('Error al actualizar token: ' + error.message)
    } else {
      alert(`Nuevo token generado: ${nuevoToken}`)
      await cargarDatosGlobales()
    }
  }

  const cargarTelemetriaFronton = async (frontonId: string, fecha: string) => {
    const { data } = await supabase
      .from('telemetria_iot')
      .select('*')
      .eq('fronton_id', frontonId)
      .eq('fecha', fecha)
      .order('hora_inicio', { ascending: true })

    setDatosTelemetria(data || [])
  }

  const abrirGraficaIoT = (f: any) => {
    setFrontonGraficaModal(f)
    cargarTelemetriaFronton(f.id, fechaGraficaIoT)
  }

  // ==========================================
  // GESTIÓN DE PROVINCIAS
  // ==========================================
  const handleCrearProvincia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaProvinciaNombre.trim()) return

    setGuardandoProvincia(true)
    const { error } = await supabase
      .from('provincias')
      .insert([{ nombre: nuevaProvinciaNombre.trim() }])

    if (error) {
      alert('Error al crear provincia: ' + error.message)
    } else {
      alert(`Provincia "${nuevaProvinciaNombre}" creada correctamente.`)
      setNuevaProvinciaNombre('')
      setMostrarFormProvincia(false)
      await cargarDatosGlobales()
    }
    setGuardandoProvincia(false)
  }

  // Filtros aplicados
  const municipiosFiltrados = municipios.filter(m => {
    const coincideTexto = m.nombre?.toLowerCase().includes(busquedaMunicipio.toLowerCase())
    const coincideProv = !filtroProvinciaMun || m.provincia_id === filtroProvinciaMun
    const estado = m.estado || 'activo'
    const coincideEstado = filtroEstadoMun === 'todos' || estado === filtroEstadoMun
    return coincideTexto && coincideProv && coincideEstado
  })

  const gestoresFiltrados = gestores.filter(g => {
    const texto = `${g.nombre || ''} ${g.apellidos || ''} ${g.email || ''}`.toLowerCase()
    const coincideTexto = texto.includes(busquedaGestor.toLowerCase())
    const coincideMun = !filtroMunicipioGestor || g.municipio_id === filtroMunicipioGestor
    return coincideTexto && coincideMun
  })

  const frontonesIotFiltrados = frontones.filter(f => {
    const coincideTexto = f.nombre?.toLowerCase().includes(busquedaFrontonIot.toLowerCase()) ||
      f.municipios?.nombre?.toLowerCase().includes(busquedaFrontonIot.toLowerCase())
    const coincideMun = !filtroMunicipioIot || f.municipio_id === filtroMunicipioIot
    const coincideSensor = !filtroSoloConSensor || f.tiene_sensor_iot
    return coincideTexto && coincideMun && coincideSensor
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center font-medium">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
          Cargando Consola Superadmin...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* CABECERA SUPERADMIN */}
      <header className="bg-stone-900/90 backdrop-blur-md border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">Frontoiak</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Superadmin
                </span>
              </div>
              <p className="text-xs text-stone-400">Consola Central de Gestión y Control Global</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Ir al panel de gestión municipal local"
            >
              🏛️ Panel Municipal
            </button>
            <button 
              onClick={() => router.push('/reservas')}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              title="Ir a la app de reservas de usuarios"
            >
              🎾 Vista Ciudadana
            </button>
            <button 
              onClick={handleSignOut}
              className="bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* TARJETAS DE MÉTRICAS GLOBALES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Poblaciones</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white">{municipios.length}</span>
              <span className="text-xs text-emerald-400 font-bold">{municipios.filter(m => (m.estado || 'activo') === 'activo').length} activas</span>
            </div>
          </div>

          <div className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Gestores</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white">{gestores.length}</span>
              <span className="text-xs text-teal-400 font-bold">{gestores.filter(g => g.municipio_id).length} asignados</span>
            </div>
          </div>

          <div className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Frontones</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white">{frontones.length}</span>
              <span className="text-xs text-emerald-400 font-bold">{frontones.filter(f => f.habilitado !== false).length} habilitados</span>
            </div>
          </div>

          <div className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Sensores IoT</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white">{frontones.filter(f => f.tiene_sensor_iot).length}</span>
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                {frontones.filter(f => f.tiene_sensor_iot && f.en_uso).length} en uso
              </span>
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex border-b border-stone-800 overflow-x-auto gap-2">
          <button 
            onClick={() => setActiveTab('municipios')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'municipios'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/50 rounded-t-xl'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🏛️ Municipios y Provincias ({municipios.length})
          </button>
          <button 
            onClick={() => setActiveTab('gestores')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'gestores'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/50 rounded-t-xl'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            👥 Gestores Municipales ({gestores.length})
          </button>
          <button 
            onClick={() => setActiveTab('iot')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'iot'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/50 rounded-t-xl'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            📡 Red Hardware / IoT ({frontones.filter(f => f.tiene_sensor_iot).length})
          </button>
          <button 
            onClick={() => setActiveTab('provincias')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'provincias'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/50 rounded-t-xl'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🗺️ Provincias ({provincias.length})
          </button>
        </div>

        {/* ======================================================== */}
        {/* PESTAÑA 1: GESTIÓN DE MUNICIPIOS */}
        {/* ======================================================== */}
        {activeTab === 'municipios' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Buscar población..." 
                  value={busquedaMunicipio}
                  onChange={(e) => setBusquedaMunicipio(e.target.value)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 w-full sm:w-60"
                />
                <select 
                  value={filtroProvinciaMun} 
                  onChange={(e) => setFiltroProvinciaMun(e.target.value)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Todas las provincias</option>
                  {provincias.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <select 
                  value={filtroEstadoMun} 
                  onChange={(e) => setFiltroEstadoMun(e.target.value as any)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">🟢 Activos</option>
                  <option value="en_pruebas">🟡 En pruebas</option>
                  <option value="inactivo">🔴 Inactivos</option>
                </select>
              </div>

              <button 
                onClick={() => {
                  resetFormMunicipio()
                  setMostrarFormMunicipio(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <span>+</span> Añadir Municipio
              </button>
            </div>

            {/* FORMULARIO CREAR / EDITAR MUNICIPIO */}
            {mostrarFormMunicipio && (
              <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800 space-y-4 shadow-xl animate-in fade-in duration-150">
                <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                  <h3 className="font-bold text-base text-white">
                    {municipioEnEdicion ? `Editar Municipio: ${municipioEnEdicion.nombre}` : 'Dar de Alta Nuevo Municipio'}
                  </h3>
                  <button 
                    onClick={() => {
                      setMostrarFormMunicipio(false)
                      resetFormMunicipio()
                    }}
                    className="text-stone-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarMunicipio} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nombre del Municipio *</label>
                      <input 
                        type="text" 
                        required
                        value={nuevoMunicipio.nombre}
                        onChange={(e) => setNuevoMunicipio({...nuevoMunicipio, nombre: e.target.value})}
                        placeholder="ej. Arrasate / Mondragón"
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Provincia *</label>
                      <select 
                        required
                        value={nuevoMunicipio.provincia_id}
                        onChange={(e) => setNuevoMunicipio({...nuevoMunicipio, provincia_id: e.target.value})}
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Selecciona provincia...</option>
                        {provincias.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Estado de Activación</label>
                      <select 
                        value={nuevoMunicipio.estado}
                        onChange={(e) => setNuevoMunicipio({...nuevoMunicipio, estado: e.target.value as any})}
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="activo">🟢 Activo (Visible en reservas)</option>
                        <option value="en_pruebas">🟡 En pruebas (Solo gestor/pruebas)</option>
                        <option value="inactivo">🔴 Inactivo (Deshabilitado)</option>
                      </select>
                    </div>
                  </div>

                  {/* CÓDIGOS POSTALES */}
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Códigos Postales del Municipio</label>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[32px] items-center">
                      {nuevoMunicipio.codigos_postales.map((cp) => (
                        <span key={cp} className="bg-stone-800 border border-stone-700 px-3 py-1 rounded-xl text-xs font-bold text-stone-200 flex items-center gap-2">
                          {cp}
                          <button type="button" onClick={() => handleRemoveCpMun(cp)} className="text-rose-400 hover:text-rose-300 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Añadir C.P. (ej. 20500)"
                        value={nuevoCpMun}
                        onChange={(e) => setNuevoCpMun(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCpMun()
                          }
                        }}
                        className="p-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white flex-1 focus:border-emerald-500 focus:outline-none"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddCpMun}
                        className="bg-stone-800 text-stone-200 hover:bg-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold"
                      >
                        Añadir C.P.
                      </button>
                    </div>
                  </div>

                  {/* IMAGEN / ESCUDO */}
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Escudo / Imagen de la Población</label>
                    {(archivoImagenMun || nuevoMunicipio.imagen_url) && (
                      <div className="flex items-center gap-3 mb-2 p-3 bg-stone-950 rounded-xl border border-stone-800">
                        <img 
                          src={archivoImagenMun ? URL.createObjectURL(archivoImagenMun) : nuevoMunicipio.imagen_url} 
                          alt="Escudo" 
                          className="w-14 h-14 object-cover rounded-xl border border-stone-700 bg-stone-900"
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            setNuevoMunicipio({...nuevoMunicipio, imagen_url: ''})
                            setArchivoImagenMun(null)
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                        >
                          Quitar imagen
                        </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setArchivoImagenMun(e.target.files[0])
                        }
                      }}
                      className="w-full text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={guardandoMunicipio}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl text-xs font-bold transition disabled:bg-stone-800"
                    >
                      {guardandoMunicipio ? 'Guardando...' : municipioEnEdicion ? 'Actualizar Municipio' : 'Crear Municipio'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setMostrarFormMunicipio(false)
                        resetFormMunicipio()
                      }}
                      className="bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* LISTADO DE MUNICIPIOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {municipiosFiltrados.map((mun) => {
                const estado = mun.estado || 'activo'
                const frontonesDelMun = frontones.filter(f => f.municipio_id === mun.id)
                const gestoresDelMun = gestores.filter(g => g.municipio_id === mun.id)

                return (
                  <div 
                    key={mun.id} 
                    className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm flex flex-col justify-between gap-4 hover:border-stone-700 transition group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          {mun.imagen_url ? (
                            <img src={mun.imagen_url} alt="" className="w-12 h-12 object-cover rounded-2xl border border-stone-800 bg-stone-950" />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-lg">
                              🏛️
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-base text-white group-hover:text-emerald-400 transition">{mun.nombre}</h4>
                            <p className="text-xs text-stone-400 font-medium">{mun.provincias?.nombre || 'Sin provincia'}</p>
                          </div>
                        </div>

                        {/* BADGE DE ESTADO */}
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          estado === 'activo'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : estado === 'en_pruebas'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {estado === 'activo' ? '🟢 Activo' : estado === 'en_pruebas' ? '🟡 En pruebas' : '🔴 Inactivo'}
                        </span>
                      </div>

                      {/* DATOS RÁPIDOS */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-800/60">
                        <div className="bg-stone-950/60 p-2 rounded-xl border border-stone-800">
                          <span className="text-stone-500 block text-[10px] font-bold">FRONTONES</span>
                          <span className="font-bold text-stone-200">{frontonesDelMun.length} frontón(es)</span>
                        </div>
                        <div className="bg-stone-950/60 p-2 rounded-xl border border-stone-800">
                          <span className="text-stone-500 block text-[10px] font-bold">GESTORES</span>
                          <span className="font-bold text-stone-200">{gestoresDelMun.length} asignado(s)</span>
                        </div>
                      </div>

                      {mun.codigos_postales && mun.codigos_postales.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {mun.codigos_postales.map((cp: string) => (
                            <span key={cp} className="bg-stone-800 text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {cp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleIniciarEdicionMunicipio(mun)}
                          className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleEliminarMunicipio(mun)}
                          className="bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                          title="Eliminar municipio"
                        >
                          🗑️
                        </button>
                      </div>

                      <select 
                        value={estado}
                        onChange={(e) => handleCambiarEstadoMunicipio(mun, e.target.value as any)}
                        className="bg-stone-950 border border-stone-800 text-[11px] font-bold text-stone-300 rounded-xl px-2 py-1 focus:outline-none"
                      >
                        <option value="activo">Activo</option>
                        <option value="en_pruebas">En pruebas</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: GESTIÓN DE GESTORES MUNICIPALES */}
        {/* ======================================================== */}
        {activeTab === 'gestores' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Buscar gestor por nombre o email..." 
                  value={busquedaGestor}
                  onChange={(e) => setBusquedaGestor(e.target.value)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 w-full sm:w-72"
                />
                <select 
                  value={filtroMunicipioGestor} 
                  onChange={(e) => setFiltroMunicipioGestor(e.target.value)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Todos los municipios</option>
                  {municipios.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => setMostrarFormGestor(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <span>+</span> Dar de Alta Gestor
              </button>
            </div>

            {/* FORMULARIO DAR DE ALTA GESTOR */}
            {mostrarFormGestor && (
              <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800 space-y-4 shadow-xl animate-in fade-in duration-150">
                <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                  <h3 className="font-bold text-base text-white">Alta de Nuevo Gestor Municipal</h3>
                  <button onClick={() => setMostrarFormGestor(false)} className="text-stone-400 hover:text-white font-bold">✕</button>
                </div>

                <form onSubmit={handleCrearGestor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nombre *</label>
                      <input 
                        type="text" 
                        required
                        value={nuevoGestor.nombre}
                        onChange={(e) => setNuevoGestor({...nuevoGestor, nombre: e.target.value})}
                        placeholder="ej. Jon"
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Apellidos</label>
                      <input 
                        type="text" 
                        value={nuevoGestor.apellidos}
                        onChange={(e) => setNuevoGestor({...nuevoGestor, apellidos: e.target.value})}
                        placeholder="ej. Pérez Gómez"
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Correo Electrónico (Login) *</label>
                      <input 
                        type="email" 
                        required
                        value={nuevoGestor.email}
                        onChange={(e) => setNuevoGestor({...nuevoGestor, email: e.target.value})}
                        placeholder="ej. gestor.arrasate@ayto.es"
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Contraseña Inicial *</label>
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        value={nuevoGestor.password}
                        onChange={(e) => setNuevoGestor({...nuevoGestor, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Población / Municipio Asignado</label>
                    <select 
                      value={nuevoGestor.municipio_id}
                      onChange={(e) => setNuevoGestor({...nuevoGestor, municipio_id: e.target.value})}
                      className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Sin municipio asignado (Asignar más tarde)</option>
                      {municipios.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre} ({m.provincias?.nombre || 'Sin prov'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={guardandoGestor}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl text-xs font-bold transition disabled:bg-stone-800"
                    >
                      {guardandoGestor ? 'Creando cuenta...' : 'Dar de Alta Gestor'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setMostrarFormGestor(false)}
                      className="bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODAL REASIGNAR MUNICIPIO */}
            {gestorParaReasignar && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-stone-900 rounded-3xl p-6 max-w-md w-full border border-stone-800 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                    <h3 className="font-bold text-base text-white">Reasignar Municipio</h3>
                    <button onClick={() => setGestorParaReasignar(null)} className="text-stone-400 hover:text-white font-bold">✕</button>
                  </div>

                  <p className="text-xs text-stone-400">
                    Selecciona el municipio que gestionará <strong className="text-white">{gestorParaReasignar.nombre_completo || gestorParaReasignar.email}</strong>:
                  </p>

                  <select 
                    value={municipioReasignadoId}
                    onChange={(e) => setMunicipioReasignadoId(e.target.value)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Sin municipio asignado</option>
                    {municipios.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre} ({m.provincias?.nombre || 'Sin prov'})</option>
                    ))}
                  </select>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={handleReasignarMunicipioGestor}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl text-xs font-bold transition"
                    >
                      Guardar Reasignación
                    </button>
                    <button 
                      onClick={() => setGestorParaReasignar(null)}
                      className="bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TABLA DE GESTORES */}
            <div className="bg-stone-900 rounded-3xl border border-stone-800/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
                    <tr>
                      <th className="p-4">Gestor / Responsable</th>
                      <th className="p-4">Municipio Asignado</th>
                      <th className="p-4">Rol / Permisos</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {gestoresFiltrados.map((g) => {
                      const tieneMunicipio = !!g.municipios
                      return (
                        <tr key={g.id} className="hover:bg-stone-800/40 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-950/60 border border-teal-800/60 text-teal-300 flex items-center justify-center font-bold text-xs">
                                {g.nombre ? g.nombre.slice(0, 1).toUpperCase() : 'G'}
                              </div>
                              <div>
                                <span className="font-bold text-white block">
                                  {g.nombre_completo || g.nombre || 'Gestor'}
                                </span>
                                <span className="text-stone-400 text-[11px] block">{g.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            {tieneMunicipio ? (
                              <span className="bg-stone-800 border border-stone-700 px-3 py-1 rounded-xl text-xs font-bold text-stone-200 inline-flex items-center gap-1.5">
                                🏛️ {g.municipios.nombre}
                              </span>
                            ) : (
                              <span className="bg-rose-950/40 text-rose-300 border border-rose-800/50 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                Sin municipio asignado
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                              Gestor Municipal
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setGestorParaReasignar(g)
                                  setMunicipioReasignadoId(g.municipio_id || '')
                                }}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                              >
                                Reasignar Pueblo
                              </button>
                              <button 
                                onClick={() => handleResetPasswordEmail(g.email)}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                title="Enviar email de reseteo de contraseña"
                              >
                                🔑 Reset Pass
                              </button>
                              <button 
                                onClick={() => handleRevocarAccesoGestor(g)}
                                className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                title="Revocar permisos de gestor"
                              >
                                Revocar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: VISIÓN GLOBAL DEL HARDWARE / IOT */}
        {/* ======================================================== */}
        {activeTab === 'iot' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Buscar frontón o municipio..." 
                  value={busquedaFrontonIot}
                  onChange={(e) => setBusquedaFrontonIot(e.target.value)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 w-full sm:w-72"
                />
                <select 
                  value={filtroMunicipioIot} 
                  onChange={(e) => setFiltroMunicipioIot(e.target.value)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Todos los municipios</option>
                  {municipios.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-300 bg-stone-900 border border-stone-800 px-3 py-2 rounded-2xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filtroSoloConSensor} 
                    onChange={(e) => setFiltroSoloConSensor(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Solo con sensor IoT</span>
                </label>
              </div>
            </div>

            {/* LISTADO DE HARDWARE IOT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {frontonesIotFiltrados.map((f) => {
                const token = f.hardware_token || f.iot_token || `esp32-${f.id.slice(0, 8)}`
                return (
                  <div 
                    key={f.id}
                    className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-white">{f.nombre}</h4>
                            <span className="text-xs text-stone-400">({f.municipios?.nombre || 'Sin municipio'})</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Horario: {f.hora_apertura?.slice(0,5)} - {f.hora_cierre?.slice(0,5)}
                          </p>
                        </div>

                        {/* ESTADO TIEMPO REAL */}
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${
                          f.en_uso
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${f.en_uso ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`}></span>
                          {f.en_uso ? 'En uso (Presencia detectada)' : 'Libre'}
                        </span>
                      </div>

                      {/* TOKEN ESP32 */}
                      <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          Token de Autenticación de Hardware (ESP32)
                        </span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={token}
                            className="bg-stone-900 border border-stone-800 text-stone-300 font-mono text-xs p-2 rounded-xl flex-1 select-all"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(token)
                              alert('Token copiado al portapapeles.')
                            }}
                            className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                            title="Copiar token"
                          >
                            📋 Copiar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* BOTONERA ACCIONES IOT */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
                      <button 
                        onClick={() => abrirGraficaIoT(f)}
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        📊 Telemetría por Franjas
                      </button>

                      <button 
                        onClick={() => handleRegenerarHardwareToken(f)}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                      >
                        🔄 Regenerar Token
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 4: PROVINCIAS */}
        {/* ======================================================== */}
        {activeTab === 'provincias' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">Provincias Registradas</h3>
              <button 
                onClick={() => setMostrarFormProvincia(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2"
              >
                <span>+</span> Añadir Provincia
              </button>
            </div>

            {mostrarFormProvincia && (
              <form onSubmit={handleCrearProvincia} className="bg-stone-900 p-5 rounded-3xl border border-stone-800 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nombre de la Provincia *</label>
                  <input 
                    type="text" 
                    required
                    value={nuevaProvinciaNombre}
                    onChange={(e) => setNuevaProvinciaNombre(e.target.value)}
                    placeholder="ej. Gipuzkoa / Bizkaia / Araba / Navarra"
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={guardandoProvincia}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition disabled:bg-stone-800"
                >
                  {guardandoProvincia ? 'Guardando...' : 'Crear'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setMostrarFormProvincia(false)}
                  className="bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {provincias.map((p) => {
                const munDeProv = municipios.filter(m => m.provincia_id === p.id)
                return (
                  <div key={p.id} className="bg-stone-900 p-5 rounded-3xl border border-stone-800 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-base text-white">{p.nombre}</h4>
                      <span className="bg-stone-800 text-stone-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {munDeProv.length} municipio(s)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MODAL TELEMETRÍA IOT GLOBAL */}
        {frontonGraficaModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-stone-900 rounded-3xl p-6 max-w-2xl w-full space-y-4 border border-stone-800 shadow-2xl">
              <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                <div>
                  <h3 className="font-bold text-lg text-white">Telemetría IoT: {frontonGraficaModal.nombre}</h3>
                  <p className="text-xs text-stone-400">Municipio: {frontonGraficaModal.municipios?.nombre || 'General'}</p>
                </div>
                <button onClick={() => setFrontonGraficaModal(null)} className="text-stone-400 hover:text-white font-bold text-lg">✕</button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-400">Fecha:</label>
                <input 
                  type="date" 
                  value={fechaGraficaIoT}
                  onChange={(e) => {
                    setFechaGraficaIoT(e.target.value)
                    cargarTelemetriaFronton(frontonGraficaModal.id, e.target.value)
                  }}
                  className="p-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="border border-stone-800 rounded-2xl p-4 bg-stone-950 space-y-2">
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {horasDelDia.map((hora) => {
                    const registro = datosTelemetria.find(t => t.hora_inicio?.slice(0,2) === hora.slice(0,2))
                    const hayPresencia = registro ? registro.presencia_detectada : false

                    return (
                      <div key={hora} className="flex items-center gap-3 text-xs">
                        <span className="font-mono w-12 text-stone-400 font-bold">{hora}</span>
                        <div className="flex-1 h-6 bg-stone-900 rounded-lg overflow-hidden relative border border-stone-800">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              hayPresencia ? 'bg-emerald-600 w-full' : 'bg-stone-900 w-0'
                            }`} 
                          />
                          <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
                            hayPresencia ? 'text-white' : 'text-stone-500'
                          }`}>
                            {hayPresencia ? 'Presencia Detectada' : 'Sin Actividad'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button 
                onClick={() => setFrontonGraficaModal(null)}
                className="w-full bg-stone-800 hover:bg-stone-700 text-white p-2.5 rounded-xl text-xs font-bold transition"
              >
                Cerrar Visualizador
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
