'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'
import { 
  parseSafeDate, 
  formatFullDateWithWeekday, 
  formatWeekdayAndDayMonth, 
  formatPreviewDay, 
  formatCalendarCellDay, 
  formatShortMonthDay, 
  formatShortDateWithTime, 
  formatLongDateWithTime 
} from '@/lib/dateUtils'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'gestion' | 'frontones' | 'incidencias' | 'ciudadanos' | 'ajustes'>('gestion')
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const { t, lang } = useLanguage()

  // Refs para scroll
  const calendarioCompletoRef = useRef<HTMLDivElement>(null)
  const formSueltoRef = useRef<HTMLDivElement>(null)
  const formRepetitivoRef = useRef<HTMLDivElement>(null)
  const edicionEventoRef = useRef<HTMLDivElement>(null)
  const formularioFrontonRef = useRef<HTMLDivElement>(null)

  // Listas maestras
  const [provincias, setProvincias] = useState<any[]>([])
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<any[]>([])

  // Ajustes pueblo
  const [selectedProvinciaId, setSelectedProvinciaId] = useState('')
  const [selectedMunicipioId, setSelectedMunicipioId] = useState('')
  const [codigosPostales, setCodigosPostales] = useState<string[]>([])
  const [nuevoCp, setNuevoCp] = useState('')
  const [editandoAjustes, setEditandoAjustes] = useState(false)
  const [imagenMunicipioUrl, setImagenMunicipioUrl] = useState('')
  const [archivoImagenMunicipio, setArchivoImagenMunicipio] = useState<File | null>(null)
  const [uploadingImageMunicipio, setUploadingImageMunicipio] = useState(false)

  // Frontones
  const [frontones, setFrontones] = useState<any[]>([])
  const [mostrarFormularioFronton, setMostrarFormularioFronton] = useState(false)
  const [frontonEnEdicion, setFrontonEnEdicion] = useState<any | null>(null)
  const [frontonTokenModal, setFrontonTokenModal] = useState<any | null>(null)
  const [frontonGraficaModal, setFrontonGraficaModal] = useState<any | null>(null)
  const [fechaGraficaIoT, setFechaGraficaIoT] = useState(new Date().toISOString().split('T')[0])
  const [datosTelemetria, setDatosTelemetria] = useState<any[]>([])

  const [archivoImagen, setArchivoImagen] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Calendario y Horarios
  const [frontonSeleccionadoCalendario, setFrontonSeleccionadoCalendario] = useState<any | null>(null)
  const [eventosFronton, setEventosFronton] = useState<any[]>([])
  const [todosLosEventos, setTodosLosEventos] = useState<any[]>([])
  const [offsetSemanas, setOffsetSemanas] = useState(0)
  const [offsetsDiasPorFronton, setOffsetsDiasPorFronton] = useState<Record<string, number>>({})

  // Eventos edición
  const [eventoEnEdicion, setEventoEnEdicion] = useState<any | null>(null)
  const [aplicarATodaLaSerie, setAplicarATodaLaSerie] = useState(true)
  const [edicionDesdeResumen, setEdicionDesdeResumen] = useState(false)
  const [mostrarFormSuelto, setMostrarFormSuelto] = useState(false)
  const [mostrarFormRepetitivo, setMostrarFormRepetitivo] = useState(false)
  
  const [eventoSuelto, setEventoSuelto] = useState({
    titulo: '',
    fecha: '',
    hora_inicio: '09:00',
    hora_fin: '10:00'
  })

  const [eventoRepetitivo, setEventoRepetitivo] = useState({
    titulo: '',
    diasSeleccionados: [] as number[],
    hora_inicio: '17:00',
    hora_fin: '19:00',
    fechaInicio: '',
    fechaFin: ''
  })

  const [nuevoFronton, setNuevoFronton] = useState({
    nombre: '',
    anchura: '' as string | number,
    largura: '' as string | number,
    cuadros: '' as string | number,
    labur: '' as string | number,
    luze: '' as string | number,
    tiene_luz: false,
    luz_pago: false,
    tiene_vestuarios: false,
    tiene_duchas: false,
    solo_empadronados: true,
    tiene_sensor_iot: false,
    imagen_url: '',
    hora_apertura: '08:00',
    hora_cierre: '22:00',
    duracion_slot_minutos: 60,
    dias_antelacion_maxima: 7,
    max_reservas_activas: 1,
    habilitado: true
  })

  // Incidencias
  const [incidencias, setIncidencias] = useState<any[]>([])
  const [filtroEstadoIncidencia, setFiltroEstadoIncidencia] = useState<'todas' | 'pendiente' | 'en_curso' | 'resuelta'>('todas')
  const [incidenciaCambioEstadoModal, setIncidenciaCambioEstadoModal] = useState<any | null>(null)
  const [incidenciaVerHistoricoModal, setIncidenciaVerHistoricoModal] = useState<any | null>(null)
  const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState<'pendiente' | 'en_curso' | 'resuelta'>('en_curso')
  const [comentarioCambioEstado, setComentarioCambioEstado] = useState('')
  const [guardandoCambioEstado, setGuardandoCambioEstado] = useState(false)
  const [incidenciasHistorialAbierto, setIncidenciasHistorialAbierto] = useState<string[]>([])

  // Ciudadanos / Personas del municipio
  const [ciudadanos, setCiudadanos] = useState<any[]>([])

  const router = useRouter()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('*, municipios(*)')
      .eq('id', user.id)
      .single()

    const meta = user.user_metadata || {}

    // Si el perfil aún no existe en la base de datos (por ejemplo, recién confirmado por correo)
    if (!profile) {
      if (meta.role === 'gestor_municipio' || meta.role === 'admin') {
        const nombreFinal = meta.nombre || meta.nombre_completo || meta.full_name || 'Gestor'
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          nombre: nombreFinal,
          nombre_completo: nombreFinal,
          role: meta.role || 'gestor_municipio',
          municipio_id: meta.municipio_id || null
        })

        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*, municipios(*)')
          .eq('id', user.id)
          .single()
        profile = newProfile
      }
    }

    if (!profile || (profile.role !== 'gestor_municipio' && profile.role !== 'admin')) {
      alert('Acceso no autorizado.')
      router.push('/')
      return
    }

    setUserProfile(profile)

    // Si el gestor está pendiente de validación o rechazado, no cargamos los datos del panel
    if (profile.role === 'gestor_municipio' && (profile.estado_aprobacion === 'pendiente' || profile.estado_aprobacion === 'rechazado')) {
      setLoading(false)
      return
    }

    const { data: provData } = await supabase.from('provincias').select('*')
    setProvincias(provData || [])

    if (profile.municipios) {
      setSelectedMunicipioId(profile.municipios.id)
      setSelectedProvinciaId(profile.municipios.provincia_id || '')
      setCodigosPostales(profile.municipios.codigos_postales || [])
      setImagenMunicipioUrl(profile.municipios.imagen_url || '')
      setArchivoImagenMunicipio(null)
      setEditandoAjustes(false)

      if (profile.municipios.provincia_id) {
        const { data: munData } = await supabase
          .from('municipios')
          .select('*')
          .eq('provincia_id', profile.municipios.provincia_id)
        setMunicipiosDisponibles(munData || [])
      }

      const { data: frontonesData } = await supabase
        .from('frontones')
        .select('*')
        .eq('municipio_id', profile.municipios.id)

      setFrontones(frontonesData || [])

      const { data: allEvents } = await supabase
        .from('eventos_fronton')
        .select('*')
      setTodosLosEventos(allEvents || [])

      cargarIncidencias(profile.municipios.id)
      cargarCiudadanos(profile.municipios.nombre, profile.municipios.codigos_postales || [])
    } else {
      setImagenMunicipioUrl('')
      setArchivoImagenMunicipio(null)
      setEditandoAjustes(true)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleLogoClick = () => {
    setFrontonSeleccionadoCalendario(null)
    setFrontonGraficaModal(null)
    setFrontonTokenModal(null)
    setMostrarFormularioFronton(false)
    setFrontonEnEdicion(null)
    setActiveTab('gestion')
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

  const parseHistorial = (raw: any): any[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      } catch {}
    }
    return []
  }

  const normalizarIncidencia = (inc: any) => {
    return {
      ...inc,
      historial: parseHistorial(inc.historial)
    }
  }

  const getContadorIncidenciasFronton = (frontonId: string) => {
    const pendientes = incidencias.filter(i => i.fronton_id === frontonId && i.estado === 'pendiente').length
    const enCurso = incidencias.filter(i => i.fronton_id === frontonId && i.estado === 'en_curso').length
    return { pendientes, enCurso, total: pendientes + enCurso }
  }

  const cargarIncidencias = async (municipioId: string) => {
    try {
      const { data, error } = await supabase
        .from('incidencias_fronton')
        .select('*, frontones!inner(*), profiles(id, nombre, nombre_completo, apellidos, email, dni, localidad, codigo_postal)')
        .eq('frontones.municipio_id', municipioId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setIncidencias(data.map(normalizarIncidencia))
        return
      }

      // Respaldo por si el join de profiles necesita fallback
      const { data: incData } = await supabase
        .from('incidencias_fronton')
        .select('*, frontones!inner(*)')
        .eq('frontones.municipio_id', municipioId)
        .order('created_at', { ascending: false })

      if (incData) {
        const userIds = Array.from(new Set(incData.map((i: any) => i.user_id).filter(Boolean)))
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, nombre, nombre_completo, apellidos, email, dni, localidad, codigo_postal')
            .in('id', userIds)

          const profsMap = (profs || []).reduce((acc: any, p: any) => {
            acc[p.id] = p
            return acc
          }, {})

          setIncidencias(incData.map((i: any) => normalizarIncidencia({
            ...i,
            profiles: profsMap[i.user_id] || null
          })))
        } else {
          setIncidencias(incData.map(normalizarIncidencia))
        }
      }
    } catch (err) {
      console.error('Error al cargar incidencias en dashboard:', err)
    }
  }

  const cargarCiudadanos = async (nombreMunicipio: string, codigosPostalesMunicipio: string[]) => {
    // Excluimos a los gestores municipales para listar únicamente a los ciudadanos
    let query = supabase.from('profiles').select('*').neq('role', 'gestor_municipio')

    const { data } = await query
    if (data) {
      const filtrados = data.filter(p => 
        (p.localidad && p.localidad.toLowerCase().trim() === nombreMunicipio.toLowerCase().trim()) ||
        (p.codigo_postal && codigosPostalesMunicipio.includes(p.codigo_postal.trim()))
      )
      setCiudadanos(filtrados)
    }
  }

  const handleBorrarCiudadano = async (userId: string, nombreCiudadano: string) => {
    const confirmado = confirm(`¿Estás seguro de que quieres borrar al ciudadano "${nombreCiudadano || 'Sin nombre'}"?\n\nEsto eliminará permanentemente su cuenta, su perfil y todas sus reservas activas de la base de datos. Esta acción no se puede deshacer.`)

    if (!confirmado) return

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      alert('Error al borrar al ciudadano: ' + error.message)
    } else {
      alert('El ciudadano ha sido eliminado correctamente de la plataforma.')
      if (userProfile?.municipios) {
        cargarCiudadanos(userProfile.municipios.nombre, userProfile.municipios.codigos_postales || [])
      }
    }
  }

  const toggleVerHistorialIncidencia = (incidenciaId: string) => {
    setIncidenciasHistorialAbierto(prev => 
      prev.includes(incidenciaId) ? prev.filter(id => id !== incidenciaId) : [...prev, incidenciaId]
    )
  }

  const abrirModalCambioEstado = (incidencia: any, defaultEstado?: 'pendiente' | 'en_curso' | 'resuelta') => {
    setIncidenciaCambioEstadoModal(incidencia)
    setNuevoEstadoSeleccionado(defaultEstado || incidencia.estado)
    setComentarioCambioEstado('')
  }

  const handleGuardarCambioEstadoConComentario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incidenciaCambioEstadoModal) return

    if (!comentarioCambioEstado.trim()) {
      alert('Es obligatorio introducir un comentario explicando la actuación o motivo del cambio de estado.')
      return
    }

    setGuardandoCambioEstado(true)

    const historialPrevio = parseHistorial(incidenciaCambioEstadoModal.historial)

    const entradaHistorial = {
      fecha: new Date().toISOString(),
      estado_anterior: incidenciaCambioEstadoModal.estado,
      estado_nuevo: nuevoEstadoSeleccionado,
      comentario: comentarioCambioEstado.trim(),
      autor: userProfile?.nombre_completo || userProfile?.nombre || userProfile?.email || 'Gestor Municipal'
    }

    const nuevoHistorial = [...historialPrevio, entradaHistorial]

    // 1. Intentamos actualizar con historial y respuesta_municipio
    let { error } = await supabase
      .from('incidencias_fronton')
      .update({
        estado: nuevoEstadoSeleccionado,
        historial: nuevoHistorial,
        respuesta_municipio: comentarioCambioEstado.trim()
      })
      .eq('id', incidenciaCambioEstadoModal.id)

    // Fallback si las columnas historial o respuesta_municipio aún no existen en la BD
    if (error && (error.message?.includes('column') || error.message?.includes('schema') || error.message?.includes('historial'))) {
      console.warn('La columna historial no existe aún en la base de datos Supabase:', error.message)
      const retry = await supabase
        .from('incidencias_fronton')
        .update({ estado: nuevoEstadoSeleccionado })
        .eq('id', incidenciaCambioEstadoModal.id)

      if (retry.error) {
        alert('Error al actualizar: ' + retry.error.message)
      } else {
        alert('⚠️ El estado se actualizó a "' + nuevoEstadoSeleccionado + '", pero para que los comentarios y el histórico se guarden permanentemente en Supabase debes ejecutar en el SQL Editor:\n\nALTER TABLE public.incidencias_fronton ADD COLUMN IF NOT EXISTS historial jsonb DEFAULT \'[]\'::jsonb;\nALTER TABLE public.incidencias_fronton ADD COLUMN IF NOT EXISTS respuesta_municipio text;')
        setIncidenciaCambioEstadoModal(null)
        setComentarioCambioEstado('')
        if (userProfile?.municipio_id) {
          await cargarIncidencias(userProfile.municipio_id)
        }
      }
    } else if (error) {
      alert('Error al actualizar la incidencia: ' + error.message)
    } else {
      alert('¡Estado y comentario guardados correctamente en el histórico!')
      setIncidenciaCambioEstadoModal(null)
      setComentarioCambioEstado('')
      if (userProfile?.municipio_id) {
        await cargarIncidencias(userProfile.municipio_id)
      }
    }

    setGuardandoCambioEstado(false)
  }

  const handleBorrarIncidencia = async (incidenciaId: string, tituloIncidencia: string) => {
    const confirmado = confirm(`¿Estás seguro de que deseas eliminar permanentemente la incidencia "${tituloIncidencia}"?\n\nEsta acción no se puede deshacer.`)
    if (!confirmado) return

    const { error } = await supabase
      .from('incidencias_fronton')
      .delete()
      .eq('id', incidenciaId)

    if (error) {
      alert('Error al borrar la incidencia: ' + error.message)
    } else {
      alert('Incidencia eliminada correctamente.')
      if (userProfile?.municipio_id) {
        await cargarIncidencias(userProfile.municipio_id)
      }
    }
  }

  const cargarTodosLosEventos = async () => {
    const { data: allEvents } = await supabase
      .from('eventos_fronton')
      .select('*')
    setTodosLosEventos(allEvents || [])
  }

  const cargarEventosFronton = async (frontonId: string) => {
    const { data, error } = await supabase
      .from('eventos_fronton')
      .select('*')
      .eq('fronton_id', frontonId)

    if (!error && data) {
      setEventosFronton([...data])
    }
    await cargarTodosLosEventos()
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
    if (nuevoCp.trim() && !codigosPostales.includes(nuevoCp.trim())) {
      setCodigosPostales([...codigosPostales, nuevoCp.trim()])
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
      const nombreArchivo = `municipio-${selectedMunicipioId || userProfile?.id || Date.now()}-${Date.now()}.${extension}`

      const { data, error } = await supabase.storage
        .from('frontones-fotos')
        .upload(nombreArchivo, archivoImagenMunicipio, {
          cacheControl: '3600',
          upsert: true,
          contentType: archivoImagenMunicipio.type || 'image/jpeg'
        })

      if (error) {
        console.error('Error detallado al subir imagen a Supabase Storage:', error)
        alert(`Error al subir imagen al Storage: ${error.message}\n\nAsegúrate de haber ejecutado las políticas RLS para el bucket "frontones-fotos" en Supabase.`)
        return imagenMunicipioUrl || null
      }

      const { data: publicUrlData } = supabase.storage
        .from('frontones-fotos')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (err: any) {
      console.error('Excepción al subir imagen:', err)
      alert('Error inesperado al subir imagen: ' + (err?.message || err))
      return imagenMunicipioUrl || null
    } finally {
      setUploadingImageMunicipio(false)
    }
  }

  const handleBorrarImagenMunicipio = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar la imagen/escudo de la población?')) {
      return
    }

    if (selectedMunicipioId) {
      const { error } = await supabase
        .from('municipios')
        .update({ imagen_url: null })
        .eq('id', selectedMunicipioId)

      if (error) {
        console.warn('Aviso al borrar imagen de municipio:', error)
      }
    }

    setImagenMunicipioUrl('')
    setArchivoImagenMunicipio(null)
    alert('Imagen del municipio eliminada.')
    await loadInitialData()
  }

  const handleSaveAjustes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMunicipioId) return

    let finalImageUrl = imagenMunicipioUrl
    if (archivoImagenMunicipio) {
      const subida = await subirImagenMunicipio()
      if (subida) finalImageUrl = subida
    }

    const { error: munError } = await supabase
      .from('municipios')
      .update({ 
        codigos_postales: codigosPostales,
        imagen_url: finalImageUrl || null
      })
      .eq('id', selectedMunicipioId)

    if (munError) {
      console.warn('Aviso al guardar municipio:', munError)
      if (munError.message?.includes('column') || munError.code === 'PGRST204') {
        await supabase.from('municipios').update({ codigos_postales: codigosPostales }).eq('id', selectedMunicipioId)
      } else {
        alert('Error al guardar datos de la población: ' + munError.message)
        return
      }
    }

    await supabase.from('profiles').update({ municipio_id: selectedMunicipioId }).eq('id', userProfile.id)
    alert('Datos de población guardados correctamente.')
    setArchivoImagenMunicipio(null)
    setEditandoAjustes(false)
    await loadInitialData()
  }

  const subirImagenFronton = async (): Promise<string | null> => {
    if (!archivoImagen) return nuevoFronton.imagen_url || null

    try {
      setUploadingImage(true)
      const extension = archivoImagen.name.split('.').pop() || 'jpg'
      const nombreArchivo = `fronton-${userProfile?.id || Date.now()}-${Date.now()}.${extension}`

      const { data, error } = await supabase.storage
        .from('frontones-fotos')
        .upload(nombreArchivo, archivoImagen, {
          cacheControl: '3600',
          upsert: true,
          contentType: archivoImagen.type || 'image/jpeg'
        })

      if (error) {
        console.error('Error al subir imagen de frontón a Supabase Storage:', error)
        alert(`Error al subir imagen: ${error.message}\n\nAsegúrate de haber ejecutado las políticas RLS para el bucket "frontones-fotos" en Supabase.`)
        return nuevoFronton.imagen_url || null
      }

      const { data: publicUrlData } = supabase.storage
        .from('frontones-fotos')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (err: any) {
      console.error('Excepción al subir imagen:', err)
      alert('Error inesperado al subir imagen: ' + (err?.message || err))
      return nuevoFronton.imagen_url || null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCreateOrUpdateFronton = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile?.municipio_id) return

    let finalImageUrl = nuevoFronton.imagen_url
    if (archivoImagen) {
      const subida = await subirImagenFronton()
      if (subida) finalImageUrl = subida
    }

    const datosFronton: any = {
      municipio_id: userProfile.municipio_id,
      nombre: nuevoFronton.nombre,
      anchura: nuevoFronton.anchura !== '' ? Number(nuevoFronton.anchura) : null,
      largura: nuevoFronton.largura !== '' ? Number(nuevoFronton.largura) : null,
      cuadros: nuevoFronton.cuadros !== '' ? Number(nuevoFronton.cuadros) : null,
      labur: nuevoFronton.labur !== '' ? Number(nuevoFronton.labur) : null,
      luze: nuevoFronton.luze !== '' ? Number(nuevoFronton.luze) : null,
      medidas: nuevoFronton.largura && nuevoFronton.anchura 
        ? `${nuevoFronton.largura}x${nuevoFronton.anchura} m` 
        : nuevoFronton.largura ? `${nuevoFronton.largura} m` : nuevoFronton.anchura ? `${nuevoFronton.anchura} m` : null,
      tiene_luz: nuevoFronton.tiene_luz,
      luz_pago: nuevoFronton.luz_pago,
      tiene_vestuarios: nuevoFronton.tiene_vestuarios,
      tiene_duchas: nuevoFronton.tiene_duchas,
      solo_empadronados: nuevoFronton.solo_empadronados,
      tiene_sensor_iot: nuevoFronton.tiene_sensor_iot,
      imagen_url: finalImageUrl || null,
      hora_apertura: nuevoFronton.hora_apertura,
      hora_cierre: nuevoFronton.hora_cierre,
      duracion_slot_minutos: Number(nuevoFronton.duracion_slot_minutos),
      dias_antelacion_maxima: Number(nuevoFronton.dias_antelacion_maxima),
      max_reservas_activas: Number(nuevoFronton.max_reservas_activas),
      habilitado: nuevoFronton.habilitado
    }

    let res
    if (frontonEnEdicion) {
      res = await supabase.from('frontones').update(datosFronton).eq('id', frontonEnEdicion.id)
    } else {
      if (frontones.length >= 5) {
        alert('Límite de 5 frontones alcanzado.')
        return
      }
      res = await supabase.from('frontones').insert([datosFronton])
    }

    if (res.error) {
      console.warn('Aviso al guardar frontón con nuevos campos:', res.error)
      if (res.error.message?.includes('column') || res.error.code === 'PGRST204') {
        const fallbackDatos = { ...datosFronton }
        delete fallbackDatos.anchura
        delete fallbackDatos.largura
        delete fallbackDatos.labur
        delete fallbackDatos.luze
        delete fallbackDatos.habilitado
        if (frontonEnEdicion) {
          await supabase.from('frontones').update(fallbackDatos).eq('id', frontonEnEdicion.id)
        } else {
          await supabase.from('frontones').insert([fallbackDatos])
        }
      } else {
        alert('Error al guardar frontón: ' + res.error.message)
        return
      }
    }

    if (frontonEnEdicion) {
      setFrontonEnEdicion(null)
    }
    resetFormulario()
    setMostrarFormularioFronton(false)
    loadInitialData()
  }

  const resetFormulario = () => {
    setNuevoFronton({
      nombre: '',
      anchura: '',
      largura: '',
      cuadros: '',
      labur: '',
      luze: '',
      tiene_luz: false,
      luz_pago: false,
      tiene_vestuarios: false,
      tiene_duchas: false,
      solo_empadronados: true,
      tiene_sensor_iot: false,
      imagen_url: '',
      hora_apertura: '08:00',
      hora_cierre: '22:00',
      duracion_slot_minutos: 60,
      dias_antelacion_maxima: 7,
      max_reservas_activas: 1,
      habilitado: true
    })
    setArchivoImagen(null)
  }

  const iniciarEdicion = (f: any) => {
    let anchura = f.anchura ?? ''
    let largura = f.largura ?? ''
    if (!anchura && !largura && f.medidas) {
      const match = f.medidas.match(/(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/)
      if (match) {
        largura = match[1]
        anchura = match[2]
      }
    }

    setFrontonEnEdicion(f)
    setNuevoFronton({
      nombre: f.nombre || '',
      anchura: anchura,
      largura: largura,
      cuadros: f.cuadros ?? '',
      labur: f.labur ?? f.numero_labur ?? '',
      luze: f.luze ?? f.numero_luze ?? '',
      tiene_luz: f.tiene_luz || false,
      luz_pago: f.luz_pago || false,
      tiene_vestuarios: f.tiene_vestuarios || false,
      tiene_duchas: f.tiene_duchas || false,
      solo_empadronados: f.solo_empadronados ?? true,
      tiene_sensor_iot: f.tiene_sensor_iot || false,
      imagen_url: f.imagen_url || '',
      hora_apertura: f.hora_apertura || '08:00',
      hora_cierre: f.hora_cierre || '22:00',
      duracion_slot_minutos: f.duracion_slot_minutos || 60,
      dias_antelacion_maxima: f.dias_antelacion_maxima ?? 7,
      max_reservas_activas: f.max_reservas_activas ?? 1,
      habilitado: f.habilitado !== false
    })
    setArchivoImagen(null)
    setMostrarFormularioFronton(true)
    setTimeout(() => {
      formularioFrontonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleToggleHabilitarFronton = async (f: any) => {
    const nuevoEstado = !(f.habilitado !== false)
    const accion = nuevoEstado ? 'habilitar' : 'deshabilitar'
    if (!confirm(`¿Estás seguro de que deseas ${accion} el frontón "${f.nombre}"?\n\n${!nuevoEstado ? 'Los usuarios no podrán realizar reservas mientras esté deshabilitado.' : 'Los usuarios volverán a poder realizar reservas.'}`)) {
      return
    }

    let { error } = await supabase
      .from('frontones')
      .update({ habilitado: nuevoEstado })
      .eq('id', f.id)

    if (error) {
      console.warn('Aviso al actualizar habilitado en frontón:', error)
      if (error.message?.includes('column') || error.code === 'PGRST204') {
        const resActivo = await supabase.from('frontones').update({ activo: nuevoEstado }).eq('id', f.id)
        if (resActivo.error) {
          alert('Error al cambiar estado del frontón: ' + error.message)
          return
        }
      } else {
        alert('Error al cambiar estado del frontón: ' + error.message)
        return
      }
    }

    alert(`Frontón "${f.nombre}" ${nuevoEstado ? 'habilitado' : 'deshabilitado'} correctamente.`)
    await loadInitialData()
  }

  const generarDiasCalendario = () => {
    const dias = []
    const hoy = new Date()
    const d = new Date(hoy)
    d.setDate(hoy.getDate() - 7 + (offsetSemanas * 28))
    const day = d.getDay()
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1)
    const inicioLunes = new Date(d.setDate(diffToMonday))

    for (let i = 0; i < 28; i++) {
      const current = new Date(inicioLunes)
      current.setDate(inicioLunes.getDate() + i)
      dias.push(current)
    }
    return dias
  }

  const generarDiasPreviewParaFronton = (frontonId: string) => {
    const dias = []
    const offset = offsetsDiasPorFronton[frontonId] || 0
    const base = new Date()
    base.setDate(base.getDate() + offset)

    for (let i = 0; i < 3; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      dias.push(d)
    }
    return dias
  }

  const cambiarOffsetFronton = (frontonId: string, cambio: number) => {
    setOffsetsDiasPorFronton(prev => ({
      ...prev,
      [frontonId]: (prev[frontonId] || 0) + cambio
    }))
  }

  const resetOffsetFronton = (frontonId: string) => {
    setOffsetsDiasPorFronton(prev => ({
      ...prev,
      [frontonId]: 0
    }))
  }

  const handleCrearEventoSuelto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!frontonSeleccionadoCalendario) return

    const { error } = await supabase.from('eventos_fronton').insert([{
      fronton_id: frontonSeleccionadoCalendario.id,
      user_id: userProfile.id,
      titulo: eventoSuelto.titulo,
      fecha: eventoSuelto.fecha,
      hora_inicio: eventoSuelto.hora_inicio,
      hora_fin: eventoSuelto.hora_fin,
      tipo: 'bloqueo_municipal',
      grupo_repeticion_id: null
    }])

    if (error) alert('Error: ' + error.message)
    else {
      alert('Evento suelto añadido.')
      setEventoSuelto({ titulo: '', fecha: '', hora_inicio: '09:00', hora_fin: '10:00' })
      setMostrarFormSuelto(false)
      cargarEventosFronton(frontonSeleccionadoCalendario.id)
    }
  }

  const handleActualizarEvento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventoEnEdicion) return

    let query
    if (eventoEnEdicion.grupo_repeticion_id && aplicarATodaLaSerie) {
      query = supabase.from('eventos_fronton').update({
        titulo: eventoEnEdicion.titulo,
        hora_inicio: eventoEnEdicion.hora_inicio,
        hora_fin: eventoEnEdicion.hora_fin
      }).eq('grupo_repeticion_id', eventoEnEdicion.grupo_repeticion_id)
    } else {
      query = supabase.from('eventos_fronton').update({
        titulo: eventoEnEdicion.titulo,
        fecha: eventoEnEdicion.fecha,
        hora_inicio: eventoEnEdicion.hora_inicio,
        hora_fin: eventoEnEdicion.hora_fin
      }).eq('id', eventoEnEdicion.id)
    }

    const { data, error } = await query.select()

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else if (!data || data.length === 0) {
      alert('Aviso: La base de datos no aplicó el cambio.')
    } else {
      alert('Evento(s) actualizado(s) correctamente.')
      const idFrontonActual = frontonSeleccionadoCalendario?.id
      setEventoEnEdicion(null)
      await cargarTodosLosEventos()
      if (idFrontonActual) {
        await cargarEventosFronton(idFrontonActual)
      }

      if (edicionDesdeResumen) {
        setFrontonSeleccionadoCalendario(null)
        setEdicionDesdeResumen(false)
        if (idFrontonActual) {
          setTimeout(() => {
            const el = document.getElementById(`fronton-card-${idFrontonActual}`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 100)
        }
      }
    }
  }

  const toggleDiaSemana = (diaNum: number) => {
    const actual = eventoRepetitivo.diasSeleccionados
    if (actual.includes(diaNum)) {
      setEventoRepetitivo({ ...eventoRepetitivo, diasSeleccionados: actual.filter(d => d !== diaNum) })
    } else {
      setEventoRepetitivo({ ...eventoRepetitivo, diasSeleccionados: [...actual, diaNum] })
    }
  }

  const handleCrearEventoRepetitivo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!frontonSeleccionadoCalendario) return
    if (eventoRepetitivo.diasSeleccionados.length === 0) {
      alert('Selecciona al menos un día de la semana.')
      return
    }

    const nuevoGrupoId = crypto.randomUUID()
    const inicio = new Date(eventoRepetitivo.fechaInicio)
    const fin = new Date(eventoRepetitivo.fechaFin)

    let actual = new Date(inicio)
    const eventosAInsertar = []

    while (actual <= fin) {
      const diaActualNum = actual.getDay()
      if (eventoRepetitivo.diasSeleccionados.includes(diaActualNum)) {
        const fechaStr = actual.toISOString().split('T')[0]
        eventosAInsertar.push({
          fronton_id: frontonSeleccionadoCalendario.id,
          user_id: userProfile.id,
          titulo: eventoRepetitivo.titulo,
          fecha: fechaStr,
          hora_inicio: eventoRepetitivo.hora_inicio,
          hora_fin: eventoRepetitivo.hora_fin,
          tipo: 'bloqueo_municipal',
          grupo_repeticion_id: nuevoGrupoId
        })
      }
      actual.setDate(actual.getDate() + 1)
    }

    if (eventosAInsertar.length === 0) {
      alert('No se encontraron días que coincidan.')
      return
    }

    const { error } = await supabase.from('eventos_fronton').insert(eventosAInsertar)
    if (error) alert('Error: ' + error.message)
    else {
      alert(`Se han creado ${eventosAInsertar.length} eventos repetitivos correctamente.`)
      setEventoRepetitivo({ titulo: '', diasSeleccionados: [], hora_inicio: '17:00', hora_fin: '19:00', fechaInicio: '', fechaFin: '' })
      setMostrarFormRepetitivo(false)
      cargarEventosFronton(frontonSeleccionadoCalendario.id)
    }
  }

  const handleBorrarEvento = async (id: string, grupoId?: string) => {
    let borrarTodo = false
    if (grupoId) {
      borrarTodo = confirm('Este evento es parte de una serie repetitiva.\n\n¿Deseas borrar TODA la serie de repetición?\n(Pulsa Cancelar para borrar únicamente este día)')
    } else {
      if (!confirm('¿Seguro que deseas borrar este evento?')) return
    }

    let error
    if (borrarTodo && grupoId) {
      const res = await supabase.from('eventos_fronton').delete().eq('grupo_repeticion_id', grupoId)
      error = res.error
    } else {
      const res = await supabase.from('eventos_fronton').delete().eq('id', id)
      error = res.error
    }

    if (error) {
      alert('Error al borrar: ' + error.message)
    } else {
      const idFrontonActual = frontonSeleccionadoCalendario?.id
      setEventoEnEdicion(null)
      await cargarTodosLosEventos()
      if (idFrontonActual) {
        await cargarEventosFronton(idFrontonActual)
      }

      if (edicionDesdeResumen) {
        setFrontonSeleccionadoCalendario(null)
        setEdicionDesdeResumen(false)
        if (idFrontonActual) {
          setTimeout(() => {
            const el = document.getElementById(`fronton-card-${idFrontonActual}`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 100)
        }
      }
    }
  }

  const handleCerrarEdicion = () => {
    if (edicionDesdeResumen) {
      const idFrontonActual = frontonSeleccionadoCalendario?.id
      setEventoEnEdicion(null)
      setFrontonSeleccionadoCalendario(null)
      setEdicionDesdeResumen(false)
      if (idFrontonActual) {
        setTimeout(() => {
          const el = document.getElementById(`fronton-card-${idFrontonActual}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    } else {
      setEventoEnEdicion(null)
    }
  }

  const abrirEdicionEvento = (ev: any, frontonAsociado?: any, desdeResumen: boolean = false) => {
    setEdicionDesdeResumen(desdeResumen)
    if (frontonAsociado) {
      setOffsetSemanas(0)
      setFrontonSeleccionadoCalendario(frontonAsociado)
      cargarEventosFronton(frontonAsociado.id)
    }
    setEventoEnEdicion(ev)
    setAplicarATodaLaSerie(true)
    setTimeout(() => {
      edicionEventoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-emerald-800 font-medium">
        Cargando panel de gestión...
      </div>
    )
  }

  // PANTALLA PARA GESTOR PENDIENTE DE APROBACIÓN
  if (userProfile?.role === 'gestor_municipio' && userProfile?.estado_aprobacion === 'pendiente') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
        <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
            {/* IZQUIERDA: Frontoiak y debajo usuario */}
            <div className="flex flex-col items-start min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm">
                  F
                </div>
                <span className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">Frontoiak</span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-stone-500 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[280px] text-left mt-0.5">
                👤 {userProfile.nombre_completo || userProfile.email}
              </span>
            </div>

            {/* DERECHA: Cerrar sesión y debajo idiomas */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                onClick={handleSignOut}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 transition shadow-2xs whitespace-nowrap active:scale-95"
              >
                {t.common.logout}
              </button>
              <div>
                <LanguageSelector variant="light" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-amber-200">
            ⏳
          </div>
          <div className="space-y-2">
            <span className="inline-block bg-amber-100 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-amber-200">
              Solicitud de Gestor Municipal
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Cuenta pendiente de validación
            </h2>
            <p className="text-stone-600 text-sm max-w-md leading-relaxed">
              Hola <span className="font-bold text-stone-900">{userProfile.nombre_completo || userProfile.nombre || userProfile.email}</span>. Tu solicitud como Gestor Municipal ha sido registrada y está en espera de validación por el Administrador de la plataforma.
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm w-full space-y-2.5 text-xs text-stone-500 text-left">
            <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
              <span className="font-bold text-stone-700">Municipio Solicitado:</span>
              <span className="font-bold text-emerald-800">🏛️ {userProfile.municipios?.nombre || 'Pendiente de asignar'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
              <span className="font-bold text-stone-700">Estado:</span>
              <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">En revisión</span>
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto pt-2">
            <button
              onClick={() => router.push('/reservas')}
              className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-2xl text-xs font-bold transition shadow-sm"
            >
              Explorar Reservas →
            </button>
            <button
              onClick={handleSignOut}
              className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-5 py-3 rounded-2xl text-xs font-bold transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </main>
      </div>
    )
  }

  // PANTALLA PARA GESTOR RECHAZADO
  if (userProfile?.role === 'gestor_municipio' && userProfile?.estado_aprobacion === 'rechazado') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-rose-100 selection:text-rose-900">
        <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
            {/* IZQUIERDA: Frontoiak y debajo usuario */}
            <div className="flex flex-col items-start min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm">
                  F
                </div>
                <span className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">Frontoiak</span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-stone-500 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[280px] text-left mt-0.5">
                👤 {userProfile.nombre_completo || userProfile.email}
              </span>
            </div>

            {/* DERECHA: Cerrar sesión y debajo idiomas */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                onClick={handleSignOut}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 transition shadow-2xs whitespace-nowrap active:scale-95"
              >
                {t.common.logout}
              </button>
              <div>
                <LanguageSelector variant="light" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-rose-100 text-rose-700 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-rose-200">
            🚫
          </div>
          <div className="space-y-2">
            <span className="inline-block bg-rose-100 text-rose-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-rose-200">
              Acceso Denegado
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Solicitud no aprobada
            </h2>
            <p className="text-stone-600 text-sm max-w-md leading-relaxed">
              La solicitud como Gestor Municipal para la cuenta <span className="font-bold text-stone-900">{userProfile.email}</span> no ha sido autorizada por el Administrador. Si crees que se trata de un error, contacta con el soporte de Frontoiak.
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto pt-2">
            <button
              onClick={() => router.push('/reservas')}
              className="flex-1 sm:flex-none bg-stone-900 hover:bg-stone-800 text-white px-5 py-3 rounded-2xl text-xs font-bold transition shadow-sm"
            >
              Ir a Reservas →
            </button>
            <button
              onClick={handleSignOut}
              className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-5 py-3 rounded-2xl text-xs font-bold transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </main>
      </div>
    )
  }

  const puebloConfigurado = !!userProfile?.municipio_id
  const diasCalendario = generarDiasCalendario()

  const diasSemanaMap = [
    { id: 1, nombre: 'Lun' },
    { id: 2, nombre: 'Mar' },
    { id: 3, nombre: 'Mié' },
    { id: 4, nombre: 'Jue' },
    { id: 5, nombre: 'Vie' },
    { id: 6, nombre: 'Sáb' },
    { id: 0, nombre: 'Dom' },
  ]

  const nombreProvinciaActual = provincias.find(p => p.id === selectedProvinciaId)?.nombre || 'No definida'
  const nombreMunicipioActual = userProfile?.municipios?.nombre || 'No definido'

  const incidenciasFiltradas = incidencias.filter(inc => {
    if (filtroEstadoIncidencia === 'todas') return true
    return inc.estado === filtroEstadoIncidencia
  })

  const horasDelDia = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* CABECERA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          {/* IZQUIERDA: Frontoiak y debajo usuario */}
          <div className="flex flex-col items-start min-w-0">
            <div 
              onClick={handleLogoClick}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm group-hover:bg-emerald-800 transition">
                F
              </div>
              <span className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                Frontoiak
              </span>
            </div>

            {userProfile ? (
              <button 
                onClick={() => router.push('/auth/ajustes')}
                title={`${t.common.settings} (${userProfile.nombre_completo || userProfile.email})`}
                className="text-[11px] sm:text-xs font-semibold text-stone-500 hover:text-emerald-800 transition truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[280px] text-left mt-0.5"
              >
                👤 {userProfile.nombre_completo || userProfile.email} {userProfile.role === 'admin' ? '(Admin)' : '(Gestor)'}
              </button>
            ) : null}
          </div>

          {/* DERECHA: Cerrar sesión (y botón superadmin) y debajo idiomas */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {userProfile ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {userProfile.role === 'admin' && (
                  <button 
                    onClick={() => router.push('/admin/super')}
                    className="bg-stone-900 text-amber-300 border border-amber-400/40 hover:bg-stone-800 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition shadow-xs flex items-center gap-1 flex-shrink-0"
                    title="Ir a la Consola Central Superadmin"
                  >
                    👑 {t.common.superadmin}
                  </button>
                )}

                <button 
                  onClick={handleSignOut}
                  className="bg-rose-50 text-rose-700 border border-rose-200 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 transition shadow-2xs whitespace-nowrap active:scale-95"
                >
                  {t.common.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="text-xs sm:text-sm font-bold text-stone-700 hover:text-emerald-700 px-2.5 py-1.5 rounded-xl transition whitespace-nowrap"
                >
                  {t.common.login}
                </button>
                <button 
                  onClick={() => router.push('/auth/register')}
                  className="bg-emerald-700 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-800 transition shadow-sm whitespace-nowrap active:scale-95"
                >
                  {t.common.register}
                </button>
              </div>
            )}

            <div>
              <LanguageSelector variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="flex justify-between items-center border-b border-stone-200 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{t.admin.dashboard_title}</span>
              <h1 className="text-2xl md:text-3xl font-black text-stone-900 mt-0.5">
                {userProfile?.municipios?.nombre ? `Ayuntamiento de ${userProfile.municipios.nombre}` : t.admin.dashboard_title}
              </h1>
            </div>
            {(userProfile?.municipios?.imagen_url || imagenMunicipioUrl) && (
              <img 
                src={userProfile?.municipios?.imagen_url || imagenMunicipioUrl} 
                alt="Escudo/Imagen del municipio" 
                className="w-14 h-14 object-cover rounded-2xl border border-stone-200 shadow-sm"
              />
            )}
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-stone-200 overflow-x-auto gap-2">
          <button 
            onClick={() => setActiveTab('gestion')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${activeTab === 'gestion' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t.admin.schedule_tab}
          </button>
          <button 
            onClick={() => setActiveTab('frontones')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${activeTab === 'frontones' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t.admin.frontons_tab} ({frontones.length}/5)
          </button>
          <button 
            onClick={() => setActiveTab('incidencias')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${activeTab === 'incidencias' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t.admin.incidents_tab}
            {incidencias.filter(i => i.estado === 'pendiente').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {incidencias.filter(i => i.estado === 'pendiente').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('ciudadanos')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${activeTab === 'ciudadanos' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t.admin.citizens_tab}
          </button>
          <button 
            onClick={() => setActiveTab('ajustes')}
            className={`py-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${activeTab === 'ajustes' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t.admin.settings_tab}
          </button>
        </div>

        {/* PESTAÑA 1: GESTIÓN DE HORARIOS */}
        {activeTab === 'gestion' && (
          <div className="space-y-6">
            {!puebloConfigurado ? (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center">
                <p className="text-amber-700 font-bold text-sm">Configura primero los datos de tu población en la pestaña Ajustes.</p>
              </div>
            ) : frontones.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center">
                <p className="text-stone-500 text-sm">Da de alta al menos un frontón en la pestaña Frontones para organizar los horarios.</p>
              </div>
            ) : !frontonSeleccionadoCalendario ? (
              <div className="space-y-4">
                {frontones.map((f) => {
                  const diasPreviewFronton = generarDiasPreviewParaFronton(f.id)
                  const { pendientes, enCurso } = getContadorIncidenciasFronton(f.id)
                  return (
                    <div key={f.id} id={`fronton-card-${f.id}`} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4 scroll-mt-24">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-bold text-xl text-stone-900">{f.nombre}</h3>
                          {f.habilitado === false ? (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                              🚫 {t.reservas.disabled}
                            </span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${f.en_uso ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {f.en_uso ? `🔴 ${t.common.in_use} (IoT)` : `🟢 ${t.common.free}`}
                            </span>
                          )}

                          {/* CONTADORES DE INCIDENCIAS */}
                          {pendientes > 0 && (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              ⏳ {pendientes} {t.common.pending}
                            </span>
                          )}
                          {enCurso > 0 && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              🔧 {enCurso} {t.reservas.status_in_progress_short}
                            </span>
                          )}
                          {pendientes === 0 && enCurso === 0 && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              ✅ {t.reservas.no_incidents_recorded}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {f.tiene_sensor_iot && (
                            <button 
                              onClick={() => abrirGraficaIoT(f)}
                              className="bg-stone-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-stone-900 transition"
                            >
                              {t.admin.see_usage}
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setOffsetSemanas(0)
                              setFrontonSeleccionadoCalendario(f)
                              cargarEventosFronton(f.id)
                              setTimeout(() => {
                                calendarioCompletoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }, 100)
                            }}
                            className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-xs"
                          >
                            {t.admin.open_full_calendar}
                          </button>
                        </div>
                      </div>

                      {/* Vista previa 3 días */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">{t.admin.next_occupation}</h4>
                          <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-xl border border-stone-200 text-xs">
                            <button 
                              onClick={() => cambiarOffsetFronton(f.id, -1)}
                              className="p-1 rounded-lg bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold px-2"
                            >
                              ←
                            </button>
                            <button 
                              onClick={() => resetOffsetFronton(f.id)}
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold text-[11px]"
                            >
                              {t.reservas.today}
                            </button>
                            <button 
                              onClick={() => cambiarOffsetFronton(f.id, 1)}
                              className="p-1 rounded-lg bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold px-2"
                            >
                              →
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {diasPreviewFronton.map((dia, idx) => {
                            const fechaStr = dia.toISOString().split('T')[0]
                            const eventosDelDia = todosLosEventos.filter(ev => ev.fronton_id === f.id && ev.fecha === fechaStr)
                            const esHoy = new Date().toISOString().split('T')[0] === fechaStr

                            return (
                              <div key={idx} className={`p-3.5 rounded-2xl border text-xs ${esHoy ? 'bg-emerald-50/40 border-emerald-300' : 'bg-stone-50 border-stone-200'}`}>
                                <div className="font-bold text-stone-800 border-b border-stone-200 pb-1 mb-2 flex justify-between">
                                  <span>{formatPreviewDay(dia, lang)}</span>
                                  {esHoy && <span className="text-emerald-700 font-extrabold">({t.reservas.today})</span>}
                                </div>
                                
                                {eventosDelDia.length === 0 ? (
                                  <p className="text-stone-400 italic text-[11px]">{t.reservas.free_now}</p>
                                ) : (
                                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                                    {eventosDelDia.map(ev => (
                                      <div 
                                        key={ev.id} 
                                        onClick={() => abrirEdicionEvento(ev, f, true)}
                                        className="bg-white border border-stone-200 rounded-xl p-2 shadow-2xs flex justify-between items-center text-[11px] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition group"
                                      >
                                        <div className="min-w-0 pr-1.5">
                                          <span className="font-bold text-emerald-900 block">{ev.hora_inicio.slice(0,5)} - {ev.hora_fin.slice(0,5)}</span>
                                          <span className="text-stone-600 truncate max-w-[120px] font-medium block">{ev.titulo}</span>
                                        </div>
                                        <span className="text-emerald-700 font-bold px-1.5 py-0.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 border border-emerald-200/60 transition text-[11px] flex-shrink-0">
                                          ✎
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div ref={calendarioCompletoRef} className="space-y-6 scroll-mt-24">
                <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  {(() => {
                    const { pendientes: pendCal, enCurso: enCursoCal } = getContadorIncidenciasFronton(frontonSeleccionadoCalendario.id)
                    return (
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-xl font-bold text-stone-900">Calendario: {frontonSeleccionadoCalendario.nombre}</h2>
                          {pendCal > 0 && (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              ⏳ {pendCal} {pendCal === 1 ? 'pendiente' : 'pendientes'}
                            </span>
                          )}
                          {enCursoCal > 0 && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              🔧 {enCursoCal} en curso
                            </span>
                          )}
                          {pendCal === 0 && enCursoCal === 0 && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              ✅ Sin incidencias
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">Bloqueo de horarios, escuelas y eventos</p>
                      </div>
                    )
                  })()}
                  <button 
                    onClick={() => setFrontonSeleccionadoCalendario(null)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    ← Volver a lista
                  </button>
                </div>

                {/* Formularios de Bloqueo */}
                <div className="space-y-4">
                  {/* Evento suelto */}
                  <div ref={formSueltoRef} className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden scroll-mt-24">
                    <div 
                      onClick={() => {
                        const nuevoEstado = !mostrarFormSuelto
                        setMostrarFormSuelto(nuevoEstado)
                        if (nuevoEstado) {
                          setTimeout(() => {
                            formSueltoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }, 100)
                        }
                      }}
                      className="p-4 bg-stone-50 hover:bg-stone-100/80 cursor-pointer flex justify-between items-center transition"
                    >
                      <h3 className="text-sm font-bold text-stone-800">+ Añadir Bloqueo / Evento Suelto</h3>
                      <span className="text-lg font-bold text-stone-500">{mostrarFormSuelto ? '−' : '+'}</span>
                    </div>
                    {mostrarFormSuelto && (
                      <form onSubmit={handleCrearEventoSuelto} className="p-6 space-y-4 border-t border-stone-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Título / Motivo</label>
                            <input 
                              type="text" 
                              placeholder="Ej. Mantenimiento de suelo"
                              value={eventoSuelto.titulo} 
                              onChange={(e) => setEventoSuelto({...eventoSuelto, titulo: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Fecha</label>
                            <input 
                              type="date" 
                              value={eventoSuelto.fecha} 
                              onChange={(e) => setEventoSuelto({...eventoSuelto, fecha: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hora Inicio</label>
                            <input 
                              type="time" 
                              value={eventoSuelto.hora_inicio} 
                              onChange={(e) => setEventoSuelto({...eventoSuelto, hora_inicio: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hora Fin</label>
                            <input 
                              type="time" 
                              value={eventoSuelto.hora_fin} 
                              onChange={(e) => setEventoSuelto({...eventoSuelto, hora_fin: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-sm">
                          Guardar Bloqueo Suelto
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Evento Repetitivo */}
                  <div ref={formRepetitivoRef} className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden scroll-mt-24">
                    <div 
                      onClick={() => {
                        const nuevoEstado = !mostrarFormRepetitivo
                        setMostrarFormRepetitivo(nuevoEstado)
                        if (nuevoEstado) {
                          setTimeout(() => {
                            formRepetitivoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }, 100)
                        }
                      }}
                      className="p-4 bg-stone-50 hover:bg-stone-100/80 cursor-pointer flex justify-between items-center transition"
                    >
                      <h3 className="text-sm font-bold text-stone-800">+ Añadir Serie Repetitiva Semanal</h3>
                      <span className="text-lg font-bold text-stone-500">{mostrarFormRepetitivo ? '−' : '+'}</span>
                    </div>
                    {mostrarFormRepetitivo && (
                      <form onSubmit={handleCrearEventoRepetitivo} className="p-6 space-y-4 border-t border-stone-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Título / Actividad</label>
                            <input 
                              type="text" 
                              placeholder="Ej. Escuela de Pelota"
                              value={eventoRepetitivo.titulo} 
                              onChange={(e) => setEventoRepetitivo({...eventoRepetitivo, titulo: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Días de la semana</label>
                            <div className="flex flex-wrap gap-1.5">
                              {diasSemanaMap.map((d) => {
                                const seleccionado = eventoRepetitivo.diasSeleccionados.includes(d.id)
                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => toggleDiaSemana(d.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                      seleccionado 
                                        ? 'bg-emerald-700 text-white border-emerald-700' 
                                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                                    }`}
                                  >
                                    {d.nombre}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hora Inicio</label>
                            <input 
                              type="time" 
                              value={eventoRepetitivo.hora_inicio} 
                              onChange={(e) => setEventoRepetitivo({...eventoRepetitivo, hora_inicio: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hora Fin</label>
                            <input 
                              type="time" 
                              value={eventoRepetitivo.hora_fin} 
                              onChange={(e) => setEventoRepetitivo({...eventoRepetitivo, hora_fin: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Desde Fecha</label>
                            <input 
                              type="date" 
                              value={eventoRepetitivo.fechaInicio} 
                              onChange={(e) => setEventoRepetitivo({...eventoRepetitivo, fechaInicio: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hasta Fecha</label>
                            <input 
                              type="date" 
                              value={eventoRepetitivo.fechaFin} 
                              onChange={(e) => setEventoRepetitivo({...eventoRepetitivo, fechaFin: e.target.value})} 
                              required 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-800 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-emerald-900 transition shadow-sm">
                          Generar Bloqueos Repetitivos
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Modal Edición de Evento */}
                {eventoEnEdicion && (
                  <div ref={edicionEventoRef} className="bg-amber-50/80 border border-amber-300 p-6 rounded-3xl shadow-md space-y-4 scroll-mt-24">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-amber-900">
                        Editar Bloqueo {eventoEnEdicion.grupo_repeticion_id ? '(Serie Semanal)' : ''}
                      </h3>
                      <button onClick={handleCerrarEdicion} className="text-stone-400 font-bold hover:text-stone-700">✕</button>
                    </div>

                    <form onSubmit={handleActualizarEvento} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Título</label>
                          <input 
                            type="text" 
                            value={eventoEnEdicion.titulo} 
                            onChange={(e) => setEventoEnEdicion({...eventoEnEdicion, titulo: e.target.value})} 
                            required 
                            className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Fecha</label>
                          <input 
                            type="date" 
                            value={eventoEnEdicion.fecha} 
                            onChange={(e) => setEventoEnEdicion({...eventoEnEdicion, fecha: e.target.value})} 
                            required 
                            disabled={Boolean(eventoEnEdicion.grupo_repeticion_id && aplicarATodaLaSerie)}
                            className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white disabled:bg-stone-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hora Inicio</label>
                          <input 
                            type="time" 
                            value={eventoEnEdicion.hora_inicio} 
                            onChange={(e) => setEventoEnEdicion({...eventoEnEdicion, hora_inicio: e.target.value})} 
                            required 
                            className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Hora Fin</label>
                          <input 
                            type="time" 
                            value={eventoEnEdicion.hora_fin} 
                            onChange={(e) => setEventoEnEdicion({...eventoEnEdicion, hora_fin: e.target.value})} 
                            required 
                            className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white"
                          />
                        </div>
                      </div>

                      {eventoEnEdicion.grupo_repeticion_id && (
                        <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-2xl">
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={aplicarATodaLaSerie} 
                              onChange={(e) => setAplicarATodaLaSerie(e.target.checked)} 
                              className="rounded text-amber-700"
                            />
                            <span className="text-xs font-bold text-amber-900">
                              Aplicar a toda la serie repetitiva
                            </span>
                          </label>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-amber-700 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-amber-800 transition">
                          Guardar Cambios
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleBorrarEvento(eventoEnEdicion.id, eventoEnEdicion.grupo_repeticion_id)}
                          className="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-700 transition"
                        >
                          Borrar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* CALENDARIO 4 SEMANAS */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 overflow-x-auto space-y-4">
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setOffsetSemanas(prev => prev - 1)}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition"
                    >
                      {t.reservas.prev_4_weeks}
                    </button>
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-stone-900">{t.reservas.monthly_grid}</h3>
                      <p className="text-xs text-stone-500">
                        {diasCalendario[0] && formatShortMonthDay(diasCalendario[0], lang)} — {diasCalendario[27] && formatShortMonthDay(diasCalendario[27], lang, true)}
                      </p>
                    </div>
                    <button 
                      onClick={() => setOffsetSemanas(prev => prev + 1)}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition"
                    >
                      {t.reservas.next_4_weeks}
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 min-w-[700px] mb-1">
                    {[
                      t.reservas.days_of_week.mon,
                      t.reservas.days_of_week.tue,
                      t.reservas.days_of_week.wed,
                      t.reservas.days_of_week.thu,
                      t.reservas.days_of_week.fri,
                      t.reservas.days_of_week.sat,
                      t.reservas.days_of_week.sun
                    ].map((diaSemana, idx) => (
                      <div key={idx} className="text-center font-bold text-xs uppercase tracking-wider text-stone-500 py-1 bg-stone-100/60 rounded-xl">
                        {diaSemana}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                    {diasCalendario.map((dia, idx) => {
                      const fechaStr = dia.toISOString().split('T')[0]
                      const eventosDia = eventosFronton.filter(ev => ev.fecha === fechaStr)
                      const esHoy = new Date().toISOString().split('T')[0] === fechaStr

                      return (
                        <div key={idx} className={`border rounded-2xl p-2.5 text-xs min-h-[120px] flex flex-col ${esHoy ? 'border-emerald-500 bg-emerald-50/40' : 'bg-stone-50 border-stone-200'}`}>
                          <span className="font-bold text-stone-800 mb-1 border-b border-stone-200 pb-1 flex justify-between">
                            <span>{formatCalendarCellDay(dia, lang)}</span>
                            {esHoy && <span className="text-emerald-700 font-black text-[10px]">({t.reservas.today})</span>}
                          </span>
                          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[100px] pr-1">
                            {eventosDia.map(ev => (
                              <div 
                                key={ev.id} 
                                onClick={() => abrirEdicionEvento(ev, null, false)}
                                className="bg-white border border-stone-200 p-1.5 rounded-xl shadow-2xs cursor-pointer hover:border-emerald-400 flex justify-between items-center text-[10px]"
                              >
                                <div>
                                  <span className="font-bold text-emerald-900 block">{ev.hora_inicio.slice(0,5)} - {ev.hora_fin.slice(0,5)}</span>
                                  <span className="text-stone-600 truncate block font-medium">{ev.titulo}</span>
                                </div>
                                <span className="text-emerald-700 font-bold">✎</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: FRONTONES */}
        {activeTab === 'frontones' && (
          <div className="space-y-6">
            {!puebloConfigurado ? (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center">
                <p className="text-amber-700 font-bold text-sm">{t.admin.no_frontons}</p>
              </div>
            ) : (
              <>
                {/* Listado */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                    <h2 className="text-base font-bold text-stone-900">{t.admin.frontons_title} ({frontones.length}/5)</h2>
                  </div>

                  {frontones.length === 0 ? (
                    <p className="text-stone-400 italic text-sm py-4 text-center">{t.admin.no_frontons}</p>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {frontones.map((f) => {
                        const { pendientes, enCurso } = getContadorIncidenciasFronton(f.id)
                        return (
                          <li key={f.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                              {f.imagen_url ? (
                                <img src={f.imagen_url} alt="" className="w-16 h-16 object-cover rounded-2xl border border-stone-200" />
                              ) : (
                                <div className="w-16 h-16 bg-stone-100 rounded-2xl border border-stone-200 flex items-center justify-center text-xs text-stone-400 font-bold">
                                  {t.admin.no_photo}
                                </div>
                              )}

                              <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="font-bold text-lg text-stone-900">{f.nombre}</h3>
                                  
                                  {/* BADGE HABILITADO / DESHABILITADO */}
                                  {f.habilitado === false ? (
                                    <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                      {t.admin.disabled_no_booking}
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                      {t.admin.enabled}
                                    </span>
                                  )}

                                  {/* CONTADORES DE INCIDENCIAS */}
                                  {pendientes > 0 && (
                                    <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                      ⏳ {pendientes} {t.common.pending}
                                    </span>
                                  )}
                                  {enCurso > 0 && (
                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                      🔧 {enCurso} {t.reservas.status_in_progress_short}
                                    </span>
                                  )}
                                  {pendientes === 0 && enCurso === 0 && (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                      ✅ {t.reservas.no_incidents_recorded}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-stone-500 font-medium mt-0.5">
                                  {t.admin.schedule_info}: {f.hora_apertura?.slice(0,5)} - {f.hora_cierre?.slice(0,5)} | {t.admin.slot}: {f.duracion_slot_minutos || 60}m | {t.admin.max}: {f.dias_antelacion_maxima ?? 7} {t.admin.days}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {(f.largura || f.anchura || f.medidas) && (
                                    <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      📐 {f.largura && f.anchura ? `${f.largura}x${f.anchura}m` : f.largura ? `${f.largura}m` : f.anchura ? `${f.anchura}m` : f.medidas}
                                    </span>
                                  )}
                                  {f.cuadros && <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md">{t.admin.courts}: {f.cuadros}</span>}
                                  {(f.labur || f.numero_labur) && <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Labur: {f.labur || f.numero_labur}</span>}
                                  {(f.luze || f.numero_luze) && <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Luze: {f.luze || f.numero_luze}</span>}
                                  {f.tiene_luz && <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">{f.luz_pago ? t.admin.light_paid : t.admin.light}</span>}
                                  {f.tiene_vestuarios && <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md">{t.admin.dressing_rooms}</span>}
                                  {f.tiene_duchas && <span className="bg-stone-100 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md">{t.admin.showers}</span>}
                                  {f.tiene_sensor_iot && <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md">{t.admin.iot_active}</span>}
                                </div>
                              </div>
                            </div>

                          <div className="flex gap-2 flex-wrap items-center">
                            {f.tiene_sensor_iot && (
                              <button 
                                onClick={() => abrirGraficaIoT(f)}
                                className="bg-stone-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-stone-900 transition"
                              >
                                {t.admin.iot_telemetry}
                              </button>
                            )}
                            <button 
                              onClick={() => handleToggleHabilitarFronton(f)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                                f.habilitado === false
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700 shadow-2xs'
                                  : 'bg-stone-100 text-stone-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border-stone-300'
                              }`}
                            >
                              {f.habilitado === false ? t.admin.btn_enable : t.admin.btn_disable}
                            </button>
                            <button 
                              onClick={() => iniciarEdicion(f)}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                            >
                              {t.common.edit}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                    </ul>
                  )}
                </div>

                {/* Formulario Añadir/Editar */}
                <div ref={formularioFrontonRef} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 scroll-mt-24">
                  {!mostrarFormularioFronton ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-bold text-stone-900">{t.admin.add_new_fronton}</h3>
                        <p className="text-xs text-stone-500">{t.admin.frontons_limit_desc}</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (frontones.length >= 5) alert('Límite de 5 alcanzado.')
                          else {
                            setFrontonEnEdicion(null)
                            resetFormulario()
                            setMostrarFormularioFronton(true)
                            setTimeout(() => {
                              formularioFrontonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }, 100)
                          }
                        }}
                        className="bg-emerald-700 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
                        <h3 className="text-lg font-bold text-stone-900">
                          {frontonEnEdicion ? `${t.admin.editing_fronton}: ${frontonEnEdicion.nombre}` : t.admin.new_fronton}
                        </h3>
                        <button 
                          onClick={() => { setMostrarFormularioFronton(false); setFrontonEnEdicion(null); resetFormulario(); }}
                          className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                        >
                          {t.common.cancel} ✕
                        </button>
                      </div>

                      <form onSubmit={handleCreateOrUpdateFronton} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.admin.fronton_name}</label>
                          <input 
                            type="text" 
                            value={nuevoFronton.nombre} 
                            onChange={(e) => setNuevoFronton({...nuevoFronton, nombre: e.target.value})} 
                            required 
                            className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.admin.image_optional}</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setArchivoImagen(e.target.files[0])
                              }
                            }}
                            className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100"
                          />
                        </div>

                        {/* Fila 1: Anchura y Largura (opcionales) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.admin.width}</label>
                            <input 
                              type="number" 
                              step="any"
                              min="0"
                              placeholder="ej. 10"
                              value={nuevoFronton.anchura} 
                              onChange={(e) => setNuevoFronton({...nuevoFronton, anchura: e.target.value})} 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.admin.length}</label>
                            <input 
                              type="number" 
                              step="any"
                              min="0"
                              placeholder="ej. 36"
                              value={nuevoFronton.largura} 
                              onChange={(e) => setNuevoFronton({...nuevoFronton, largura: e.target.value})} 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                        </div>

                        {/* Fila 2: Nº de cuadros, Nº Labur y Nº Luze (opcionales) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.admin.num_courts}</label>
                            <input 
                              type="number" 
                              min="0"
                              placeholder="ej. 7"
                              value={nuevoFronton.cuadros} 
                              onChange={(e) => setNuevoFronton({...nuevoFronton, cuadros: e.target.value})} 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Nº Labur (opcional)</label>
                            <input 
                              type="number" 
                              min="0"
                              placeholder="ej. 4"
                              value={nuevoFronton.labur} 
                              onChange={(e) => setNuevoFronton({...nuevoFronton, labur: e.target.value})} 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-600 uppercase mb-1">Nº Luze (opcional)</label>
                            <input 
                              type="number" 
                              min="0"
                              placeholder="ej. 7"
                              value={nuevoFronton.luze} 
                              onChange={(e) => setNuevoFronton({...nuevoFronton, luze: e.target.value})} 
                              className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                            />
                          </div>
                        </div>

                        {/* Reglas de Horarios */}
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">{t.admin.schedule_rules}</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-stone-600 mb-1">{t.admin.opening}</label>
                              <input 
                                type="time" 
                                value={nuevoFronton.hora_apertura} 
                                onChange={(e) => setNuevoFronton({...nuevoFronton, hora_apertura: e.target.value})} 
                                required 
                                className="w-full p-2 border border-stone-300 rounded-xl text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-600 mb-1">{t.admin.closing}</label>
                              <input 
                                type="time" 
                                value={nuevoFronton.hora_cierre} 
                                onChange={(e) => setNuevoFronton({...nuevoFronton, hora_cierre: e.target.value})} 
                                required 
                                className="w-full p-2 border border-stone-300 rounded-xl text-sm bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-stone-600 mb-1">{t.admin.slot_duration}</label>
                              <select 
                                value={nuevoFronton.duracion_slot_minutos} 
                                onChange={(e) => setNuevoFronton({...nuevoFronton, duracion_slot_minutos: Number(e.target.value)})}
                                className="w-full p-2 border border-stone-300 rounded-xl text-sm bg-white"
                              >
                                <option value="30">30 min</option>
                                <option value="60">60 min</option>
                                <option value="90">90 min</option>
                                <option value="120">120 min</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-600 mb-1">{t.admin.max_advance}</label>
                              <select 
                                value={nuevoFronton.dias_antelacion_maxima} 
                                onChange={(e) => setNuevoFronton({...nuevoFronton, dias_antelacion_maxima: Number(e.target.value)})}
                                className="w-full p-2 border border-stone-300 rounded-xl text-sm bg-white"
                              >
                                <option value="0">0 {t.admin.days} ({t.reservas.today})</option>
                                <option value="1">1 {t.admin.days.slice(0,-1)}</option>
                                <option value="2">2 {t.admin.days}</option>
                                <option value="3">3 {t.admin.days}</option>
                                <option value="4">4 {t.admin.days}</option>
                                <option value="5">5 {t.admin.days}</option>
                                <option value="6">6 {t.admin.days}</option>
                                <option value="7">7 {t.admin.days}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-600 mb-1">{t.admin.max_bookings_day}</label>
                              <input 
                                type="number" 
                                min="1" 
                                max="10"
                                value={nuevoFronton.max_reservas_activas} 
                                onChange={(e) => setNuevoFronton({...nuevoFronton, max_reservas_activas: Number(e.target.value)})}
                                className="w-full p-2 border border-stone-300 rounded-xl text-sm bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.tiene_luz} onChange={(e) => setNuevoFronton({...nuevoFronton, tiene_luz: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-bold text-stone-700">{t.admin.light}</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.luz_pago} onChange={(e) => setNuevoFronton({...nuevoFronton, luz_pago: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-bold text-stone-700">{t.admin.light_paid}</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.tiene_vestuarios} onChange={(e) => setNuevoFronton({...nuevoFronton, tiene_vestuarios: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-bold text-stone-700">{t.admin.dressing_rooms}</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.tiene_duchas} onChange={(e) => setNuevoFronton({...nuevoFronton, tiene_duchas: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-bold text-stone-700">{t.admin.showers}</span>
                          </label>
                        </div>

                        <div className="pt-3 border-t border-stone-200 space-y-2">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.habilitado} onChange={(e) => setNuevoFronton({...nuevoFronton, habilitado: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-bold text-stone-800">{t.admin.allow_bookings}</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.tiene_sensor_iot} onChange={(e) => setNuevoFronton({...nuevoFronton, tiene_sensor_iot: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-extrabold text-emerald-900">{t.admin.iot_device_active}</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={nuevoFronton.solo_empadronados} onChange={(e) => setNuevoFronton({...nuevoFronton, solo_empadronados: e.target.checked})} className="rounded text-emerald-700"/>
                            <span className="text-xs font-medium text-stone-600">{t.admin.only_registered_residents}</span>
                          </label>
                        </div>

                        <button 
                          type="submit" 
                          disabled={uploadingImage}
                          className="w-full bg-emerald-700 text-white p-3 rounded-xl hover:bg-emerald-800 disabled:bg-stone-300 font-bold text-xs transition shadow-sm"
                        >
                          {uploadingImage ? 'Subiendo imagen...' : frontonEnEdicion ? t.admin.update_fronton : t.admin.save_fronton}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PESTAÑA 3: INCIDENCIAS */}
        {activeTab === 'incidencias' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">{t.admin.incidents_mailbox}</h2>
                <p className="text-xs text-stone-500">{t.admin.incidents_desc}</p>
              </div>

              <div className="flex gap-1.5 text-xs font-bold flex-wrap">
                <button 
                  onClick={() => setFiltroEstadoIncidencia('todas')}
                  className={`px-3 py-1.5 rounded-xl border transition ${filtroEstadoIncidencia === 'todas' ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-200'}`}
                >
                  {t.admin.filter_all} ({incidencias.length})
                </button>
                <button 
                  onClick={() => setFiltroEstadoIncidencia('pendiente')}
                  className={`px-3 py-1.5 rounded-xl border transition ${filtroEstadoIncidencia === 'pendiente' ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                >
                  {t.admin.filter_pending} ({incidencias.filter(i => i.estado === 'pendiente').length})
                </button>
                <button 
                  onClick={() => setFiltroEstadoIncidencia('en_curso')}
                  className={`px-3 py-1.5 rounded-xl border transition ${filtroEstadoIncidencia === 'en_curso' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-800 border-amber-200'}`}
                >
                  {t.admin.filter_in_progress} ({incidencias.filter(i => i.estado === 'en_curso').length})
                </button>
                <button 
                  onClick={() => setFiltroEstadoIncidencia('resuelta')}
                  className={`px-3 py-1.5 rounded-xl border transition ${filtroEstadoIncidencia === 'resuelta' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}
                >
                  {t.admin.filter_resolved} ({incidencias.filter(i => i.estado === 'resuelta').length})
                </button>
              </div>
            </div>

            {incidenciasFiltradas.length === 0 ? (
              <p className="text-stone-400 italic text-center py-8 text-sm">{t.admin.no_incidents_category}</p>
            ) : (
              <div className="space-y-3">
                {incidenciasFiltradas.map((inc) => {
                  const nombreUsuario = inc.profiles?.nombre_completo || inc.profiles?.nombre || 'Usuario'
                  const apellidosUsuario = inc.profiles?.apellidos || ''
                  const nombreCompletoUsuario = `${nombreUsuario} ${apellidosUsuario}`.trim()
                  const historial = Array.isArray(inc.historial) ? inc.historial : []
                  const estaHistorialAbierto = incidenciasHistorialAbierto.includes(inc.id)

                  let badgeClass = 'bg-rose-100 text-rose-800 border-rose-200'
                  let badgeTexto = `⏳ ${t.reservas.status_pending_short}`
                  if (inc.estado === 'en_curso') {
                    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300'
                    badgeTexto = `🔧 ${t.reservas.status_in_progress_short}`
                  } else if (inc.estado === 'resuelta') {
                    badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    badgeTexto = `✅ ${t.reservas.status_resolved_short}`
                  }

                  return (
                    <div key={inc.id} className="p-5 border border-stone-200 rounded-3xl bg-stone-50/70 space-y-3 shadow-2xs">
                      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-stone-900 text-base">{inc.titulo}</span>
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                              🏟️ {inc.frontones?.nombre}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${badgeClass}`}>
                              {badgeTexto}
                            </span>
                          </div>
                          
                          {inc.descripcion && (
                            <p className="text-xs text-stone-600 leading-relaxed">{inc.descripcion}</p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                            <span className="text-[11px] text-stone-400 font-medium mr-1">
                              📅 {t.reservas.reported_on} {formatShortDateWithTime(inc.created_at, lang)}
                            </span>

                            {/* INFORMACIÓN DEL USUARIO REPORTADOR */}
                            <span className="font-bold text-stone-700 bg-white px-2.5 py-0.5 rounded-lg border border-stone-200 shadow-2xs flex items-center gap-1">
                              👤 {nombreCompletoUsuario}
                            </span>
                            
                            {inc.profiles?.email && (
                              <span className="text-stone-500 bg-white px-2 py-0.5 rounded-lg border border-stone-200 text-[11px]">
                                ✉️ {inc.profiles.email}
                              </span>
                            )}

                            {inc.profiles?.dni && (
                              <span className="text-stone-500 bg-white px-2 py-0.5 rounded-lg border border-stone-200 text-[11px]">
                                🪪 {t.auth.dni}: {inc.profiles.dni}
                              </span>
                            )}

                            {inc.profiles?.localidad && (
                              <span className="text-stone-500 bg-white px-2 py-0.5 rounded-lg border border-stone-200 text-[11px]">
                                📍 {inc.profiles.localidad} {inc.profiles.codigo_postal ? `(${inc.profiles.codigo_postal})` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* BOTONES DE ACCIÓN PARA EL GESTOR */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 w-full md:w-auto">
                          <button
                            onClick={() => abrirModalCambioEstado(inc)}
                            className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                            title={t.admin.change_status}
                          >
                            <span>📝 {t.admin.change_status}</span>
                          </button>

                          <button
                            onClick={() => handleBorrarIncidencia(inc.id, inc.titulo)}
                            className="bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                            title={t.admin.delete_incident}
                          >
                            <span>🗑️ {t.admin.delete_incident}</span>
                          </button>
                        </div>
                      </div>

                      {/* HISTÓRICO DE ACTUACIONES */}
                      {historial.length > 0 && (
                        <div className="pt-1">
                          <button
                            onClick={() => toggleVerHistorialIncidencia(inc.id)}
                            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition"
                          >
                            <span>💬 {estaHistorialAbierto ? t.admin.hide_actions_history : `${t.admin.view_actions_history} (${historial.length})`}</span>
                            <span className="text-[10px]">{estaHistorialAbierto ? '▲' : '▼'}</span>
                          </button>

                          {estaHistorialAbierto && (
                            <div className="mt-2.5 p-3.5 bg-white border border-stone-200 rounded-2xl space-y-2.5 text-xs shadow-2xs">
                              <h4 className="font-bold text-stone-800 border-b border-stone-100 pb-1.5 flex items-center gap-1.5">
                                <span>📜 {t.admin.chronological_history}</span>
                              </h4>
                              <div className="space-y-2">
                                {historial.map((h: any, hIdx: number) => (
                                  <div key={hIdx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-150 space-y-1">
                                    <div className="flex justify-between items-center flex-wrap gap-1">
                                      <span className="font-bold text-stone-800 text-xs">
                                        Estado: <span className="capitalize">{h.estado_anterior || 'Inicio'}</span> ➔ <span className="capitalize text-emerald-800 font-extrabold">{h.estado_nuevo}</span>
                                      </span>
                                      <span className="text-[10px] text-stone-400 font-medium">
                                        📅 {formatShortDateWithTime(h.fecha, lang)}
                                      </span>
                                    </div>
                                    <p className="text-stone-700 italic text-xs">"{h.comentario}"</p>
                                    <span className="text-[10px] text-stone-400 font-semibold block">Por: {h.autor || 'Gestor Municipal'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA NUEVA: CIUDADANOS (CON BOTÓN DE BORRAR Y ALERTA DE CONFIRMACIÓN) */}
        {activeTab === 'ciudadanos' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <h2 className="text-base font-bold text-stone-900">{t.admin.citizens_title} {nombreMunicipioActual}</h2>
              <p className="text-xs text-stone-500">{t.admin.citizens_desc}</p>
            </div>

            {ciudadanos.length === 0 ? (
              <p className="text-stone-400 italic text-center py-8 text-sm">{t.admin.no_citizens}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold text-stone-600 uppercase tracking-wider">
                      <th className="p-3">{t.admin.name_and_surname}</th>
                      <th className="p-3">{t.auth.dni}</th>
                      <th className="p-3">{t.admin.address_street}</th>
                      <th className="p-3">{t.admin.town_cp}</th>
                      <th className="p-3">{t.auth.email}</th>
                      <th className="p-3 text-right">{t.admin.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {ciudadanos.map((c) => (
                      <tr key={c.id} className="hover:bg-stone-50/50 transition">
                        <td className="p-3 font-bold text-stone-900">
                          {c.nombre_completo || '-'} {c.apellidos || ''}
                        </td>
                        <td className="p-3 font-mono text-stone-700">
                          {c.dni || '-'}
                        </td>
                        <td className="p-3 text-stone-600">
                          {c.calle || '-'}
                        </td>
                        <td className="p-3 text-stone-600">
                          {c.localidad || '-'} ({c.codigo_postal || 'S/C'})
                        </td>
                        <td className="p-3 text-emerald-800 font-medium">
                          {c.email || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleBorrarCiudadano(c.id, c.nombre_completo)}
                            className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs"
                          >
                            {t.admin.delete_incident}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: AJUSTES */}
        {activeTab === 'ajustes' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900">{t.admin.town_settings_title}</h2>
              {puebloConfigurado && !editandoAjustes && (
                <button 
                  onClick={() => setEditandoAjustes(true)}
                  className="bg-stone-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-stone-900 transition"
                >
                  {t.admin.edit_config}
                </button>
              )}
            </div>

            {puebloConfigurado && !editandoAjustes ? (
              <div className="space-y-5 bg-stone-50 p-6 rounded-2xl border border-stone-200">
                {/* IMAGEN DEL MUNICIPIO */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
                  <div className="flex items-center gap-4">
                    {imagenMunicipioUrl ? (
                      <img 
                        src={imagenMunicipioUrl} 
                        alt="Imagen/Escudo del municipio" 
                        className="w-20 h-20 object-cover rounded-2xl border border-stone-200 shadow-2xs bg-white"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-stone-200 rounded-2xl border border-stone-300 flex flex-col items-center justify-center text-stone-400 text-xs font-bold gap-1">
                        <span className="text-2xl">🏛️</span>
                        <span>{t.admin.no_photo}</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider">{t.ajustes.municipality_logo}</span>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">
                        {imagenMunicipioUrl ? t.admin.town_logo_desc : t.admin.no_town_logo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditandoAjustes(true)}
                      className="bg-white text-stone-700 hover:bg-stone-100 border border-stone-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                    >
                      {imagenMunicipioUrl ? t.admin.change_image : t.admin.add_image}
                    </button>
                    {imagenMunicipioUrl && (
                      <button 
                        onClick={handleBorrarImagenMunicipio}
                        className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                      >
                        {t.admin.delete_image}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider">{t.auth.province}</span>
                  <p className="text-base font-bold text-stone-800 mt-0.5">{nombreProvinciaActual}</p>
                </div>

                <div>
                  <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider">{t.auth.municipality}</span>
                  <p className="text-base font-bold text-stone-800 mt-0.5">{nombreMunicipioActual}</p>
                </div>

                <div>
                  <span className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">{t.ajustes.postal_codes}</span>
                  <div className="flex flex-wrap gap-2">
                    {codigosPostales.map((cp) => (
                      <span key={cp} className="bg-white border border-stone-300 px-3 py-1 rounded-xl text-xs font-bold text-stone-700 shadow-2xs">
                        {cp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveAjustes} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">
                    {t.ajustes.municipality_logo}
                  </label>
                  
                  {(archivoImagenMunicipio || imagenMunicipioUrl) ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <img 
                        src={archivoImagenMunicipio ? URL.createObjectURL(archivoImagenMunicipio) : imagenMunicipioUrl} 
                        alt="Escudo/Imagen del municipio" 
                        className="w-20 h-20 object-cover rounded-2xl border border-stone-200 shadow-2xs bg-white" 
                      />
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-stone-800">
                          {archivoImagenMunicipio ? `${t.common.save}: ${archivoImagenMunicipio.name}` : t.admin.town_logo_desc}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <label className="bg-white text-stone-700 hover:bg-stone-100 border border-stone-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer">
                            {t.admin.change_image}
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
                            className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                          >
                            {t.admin.delete_image}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 rounded-2xl hover:border-emerald-500 bg-stone-50/50 hover:bg-emerald-50/30 transition cursor-pointer group">
                      <span className="text-3xl mb-1 group-hover:scale-110 transition">🏛️</span>
                      <span className="text-xs font-bold text-stone-700 group-hover:text-emerald-800">{t.ajustes.upload_logo}</span>
                      <span className="text-[11px] text-stone-400 mt-0.5">PNG, JPG o WEBP</span>
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
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.auth.province}</label>
                  <select 
                    value={selectedProvinciaId} 
                    onChange={(e) => handleProvinciaChange(e.target.value)}
                    required
                    className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white"
                  >
                    <option value="">{t.reservas.all_provinces}...</option>
                    {provincias.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.auth.municipality}</label>
                  <select 
                    value={selectedMunicipioId} 
                    onChange={(e) => handleMunicipioChange(e.target.value)}
                    required
                    disabled={!selectedProvinciaId}
                    className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-white disabled:bg-stone-100"
                  >
                    <option value="">{t.reservas.all_municipalities}...</option>
                    {municipiosDisponibles.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">{t.ajustes.postal_codes}</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {codigosPostales.map((cp) => (
                      <span key={cp} className="bg-stone-100 border border-stone-300 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2">
                        {cp}
                        <button type="button" onClick={() => handleRemoveCp(cp)} className="text-rose-500 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={t.ajustes.add_cp_placeholder} 
                      value={nuevoCp}
                      onChange={(e) => setNuevoCp(e.target.value)}
                      className="p-2 border border-stone-300 rounded-xl flex-1 text-sm bg-white"
                    />
                    <button type="button" onClick={handleAddCp} className="bg-stone-200 text-stone-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-300">
                      {t.ajustes.add_cp}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-emerald-800 transition">
                    {t.admin.save_config}
                  </button>
                  {puebloConfigurado && (
                    <button 
                      type="button" 
                      onClick={() => setEditandoAjustes(false)} 
                      className="bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-300"
                    >
                      {t.common.cancel}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODAL UTILIZACIÓN / IOT */}
        {frontonGraficaModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-stone-200">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-bold text-lg text-stone-900">Telemetría IoT: {frontonGraficaModal.nombre}</h3>
                  <p className="text-xs text-stone-500">Presencia detectada en tiempo real por franjas</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFrontonTokenModal(frontonGraficaModal)}
                    className="bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    title="Ver token de hardware ESP32"
                  >
                    🔑 Token IoT
                  </button>
                  <button onClick={() => setFrontonGraficaModal(null)} className="text-stone-400 font-bold hover:text-stone-700">✕</button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-600">Fecha:</label>
                <input 
                  type="date" 
                  value={fechaGraficaIoT}
                  onChange={(e) => {
                    setFechaGraficaIoT(e.target.value)
                    cargarTelemetriaFronton(frontonGraficaModal.id, e.target.value)
                  }}
                  className="p-1.5 border border-stone-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-2">
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {horasDelDia.map((hora) => {
                    const registro = datosTelemetria.find(t => t.hora_inicio?.slice(0,2) === hora.slice(0,2))
                    const hayPresencia = registro ? registro.presencia_detectada : false

                    return (
                      <div key={hora} className="flex items-center gap-3 text-xs">
                        <span className="font-mono w-12 text-stone-600 font-bold">{hora}</span>
                        <div className="flex-1 h-6 bg-stone-200 rounded-lg overflow-hidden relative">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              hayPresencia ? 'bg-emerald-600 w-full' : 'bg-stone-200 w-0'
                            }`} 
                          />
                          <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
                            hayPresencia ? 'text-white' : 'text-stone-400'
                          }`}>
                            {hayPresencia ? 'Presencia Detectada' : 'Sin Actividad'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setFrontonTokenModal(frontonGraficaModal)}
                  className="bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  🔑 Token IoT (ESP32)
                </button>
                <button 
                  onClick={() => setFrontonGraficaModal(null)}
                  className="flex-1 bg-stone-900 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-stone-800 transition"
                >
                  Cerrar Visualizador
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TOKEN IOT */}
        {frontonTokenModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-stone-200">
              <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                <h3 className="font-bold text-base text-stone-900">Token IoT: {frontonTokenModal.nombre}</h3>
                <button onClick={() => setFrontonTokenModal(null)} className="text-stone-400 font-bold">✕</button>
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-stone-500 uppercase">Token de Hardware (ESP32)</label>
                <input 
                  type="text" 
                  readOnly 
                  value={frontonTokenModal.hardware_token || 'No generado'} 
                  className="w-full p-2.5 bg-stone-100 font-mono text-xs border border-stone-200 rounded-xl"
                />
              </div>
              <button 
                onClick={() => setFrontonTokenModal(null)}
                className="w-full bg-stone-900 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-stone-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* MODAL CAMBIO DE ESTADO Y COMENTARIO OBLIGATORIO DE INCIDENCIA */}
        {incidenciaCambioEstadoModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl border border-stone-200">
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black shadow-inner">
                    📝
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-stone-900">{t.admin.update_incident_status}</h3>
                    <p className="text-xs text-stone-500">
                      {incidenciaCambioEstadoModal.frontones?.nombre} • {incidenciaCambioEstadoModal.titulo}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIncidenciaCambioEstadoModal(null)}
                  className="text-stone-400 font-bold text-lg w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:text-stone-700 transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarCambioEstadoConComentario} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {t.admin.new_status}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNuevoEstadoSeleccionado('pendiente')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                        nuevoEstadoSeleccionado === 'pendiente'
                          ? 'bg-rose-100 border-rose-400 text-rose-900 ring-2 ring-rose-400'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-rose-50/50'
                      }`}
                    >
                      <span>⏳</span>
                      <span>{t.reservas.status_pending_short}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoEstadoSeleccionado('en_curso')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                        nuevoEstadoSeleccionado === 'en_curso'
                          ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-400'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-amber-50/50'
                      }`}
                    >
                      <span>🔧</span>
                      <span>{t.reservas.status_in_progress_short}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoEstadoSeleccionado('resuelta')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                        nuevoEstadoSeleccionado === 'resuelta'
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span>✅</span>
                      <span>{t.reservas.status_resolved_short}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {t.admin.action_comment}
                  </label>
                  <p className="text-[11px] text-stone-500 mb-2">
                    {t.admin.action_comment_desc}
                  </p>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe qué se ha hecho o se va a hacer..."
                    value={comentarioCambioEstado}
                    onChange={(e) => setComentarioCambioEstado(e.target.value)}
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={guardandoCambioEstado}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white p-3 rounded-2xl text-sm font-bold transition shadow-sm disabled:bg-stone-300 active:scale-98"
                  >
                    {guardandoCambioEstado ? t.admin.saving_in_history : t.admin.save_in_history}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncidenciaCambioEstadoModal(null)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-3 rounded-2xl text-sm font-bold transition"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VER HISTÓRICO DE INCIDENCIA */}
        {incidenciaVerHistoricoModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl border border-stone-200">
              
              {/* CABECERA DEL MODAL */}
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black shadow-inner">
                    📜
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-stone-900">{t.reservas.incident_history_modal_title}</h3>
                    <p className="text-xs text-stone-500">
                      {incidenciaVerHistoricoModal.frontones?.nombre} • {incidenciaVerHistoricoModal.titulo}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIncidenciaVerHistoricoModal(null)}
                  className="text-stone-400 font-bold text-lg w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:text-stone-700 transition"
                >
                  ✕
                </button>
              </div>

              {/* CONTENIDO SCROLLEABLE */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                
                {/* FICHA RESUMEN DE LA INCIDENCIA */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="font-bold text-sm text-stone-900">{incidenciaVerHistoricoModal.titulo}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${
                      incidenciaVerHistoricoModal.estado === 'en_curso'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : incidenciaVerHistoricoModal.estado === 'resuelta'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {incidenciaVerHistoricoModal.estado === 'en_curso' ? `🔧 ${t.reservas.status_in_progress_short}` : incidenciaVerHistoricoModal.estado === 'resuelta' ? `✅ ${t.reservas.status_resolved_short}` : `⏳ ${t.reservas.status_pending_short}`}
                    </span>
                  </div>

                  {incidenciaVerHistoricoModal.descripcion && (
                    <p className="text-stone-600 leading-relaxed bg-white p-2.5 rounded-xl border border-stone-150">
                      "{incidenciaVerHistoricoModal.descripcion}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-500 pt-1">
                    <span>🏟️ Frontón: <strong>{incidenciaVerHistoricoModal.frontones?.nombre}</strong></span>
                    <span>•</span>
                    <span>👤 {t.admin.reported_by}: <strong>{incidenciaVerHistoricoModal.profiles?.nombre_completo || incidenciaVerHistoricoModal.profiles?.nombre || 'Usuario'} {incidenciaVerHistoricoModal.profiles?.apellidos || ''}</strong></span>
                    {incidenciaVerHistoricoModal.profiles?.email && (
                      <span>({incidenciaVerHistoricoModal.profiles.email})</span>
                    )}
                  </div>
                </div>

                {/* TIMELINE / LÍNEA TEMPORAL */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🕒 {t.reservas.timeline_title}</span>
                  </h4>

                  <div className="relative pl-6 border-l-2 border-stone-200 space-y-6">
                    
                    {/* HITO 1: REPORTE INICIAL */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-xs"></div>
                      <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-1 text-xs">
                        <div className="flex justify-between items-center flex-wrap gap-1">
                          <span className="font-bold text-rose-950 flex items-center gap-1.5">
                            📋 {t.reservas.incident_registered}
                          </span>
                          <span className="text-[10px] text-rose-700 font-medium">
                            {formatLongDateWithTime(incidenciaVerHistoricoModal.created_at, lang)}
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px]">
                          {t.reservas.incident_initial_status_text}
                        </p>
                        <span className="text-[10px] text-stone-400 font-semibold block">
                          {t.reservas.by}: {incidenciaVerHistoricoModal.profiles?.nombre_completo || incidenciaVerHistoricoModal.profiles?.nombre || 'Ciudadano'}
                        </span>
                      </div>
                    </div>

                    {/* HITOS POSTERIORES: HISTÓRICO DE CAMBIOS */}
                    {(() => {
                      const listaHistorial = parseHistorial(incidenciaVerHistoricoModal.historial)
                      return listaHistorial.length > 0 ? (
                        listaHistorial.map((h: any, idx: number) => {
                          let colorBadge = 'bg-stone-500'
                          let bgCard = 'bg-stone-50/80 border-stone-200'
                          if (h.estado_nuevo === 'en_curso') {
                            colorBadge = 'bg-amber-500'
                            bgCard = 'bg-amber-50/60 border-amber-200/80'
                          } else if (h.estado_nuevo === 'resuelta') {
                            colorBadge = 'bg-emerald-600'
                            bgCard = 'bg-emerald-50/60 border-emerald-200/80'
                          } else if (h.estado_nuevo === 'pendiente') {
                            colorBadge = 'bg-rose-500'
                            bgCard = 'bg-rose-50/60 border-rose-200/80'
                          }

                          return (
                            <div key={idx} className="relative">
                              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full ${colorBadge} border-2 border-white shadow-xs`}></div>
                              <div className={`p-3.5 ${bgCard} border rounded-2xl space-y-2 text-xs shadow-2xs`}>
                                <div className="flex justify-between items-center flex-wrap gap-1">
                                  <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                                    <span>{t.reservas.status_change_label}:</span>
                                    <span className="capitalize font-semibold text-stone-600">{h.estado_anterior || 'Inicio'}</span>
                                    <span>➔</span>
                                    <span className="capitalize font-black text-emerald-800">{h.estado_nuevo}</span>
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-medium">
                                    📅 {formatShortDateWithTime(h.fecha, lang)}
                                  </span>
                                </div>

                                <div className="bg-white p-2.5 rounded-xl border border-stone-150 text-stone-800 italic text-xs">
                                  "{h.comentario}"
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-stone-400 font-semibold pt-0.5">
                                  <span>🏛️ Gestor: {h.autor || 'Equipo Municipal'}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-xs text-stone-400 italic py-2 pl-1">
                          {t.reservas.no_subsequent_actions}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* BOTONES DEL PIE DEL MODAL */}
              <div className="flex justify-between items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    const incActual = incidenciaVerHistoricoModal
                    setIncidenciaVerHistoricoModal(null)
                    abrirModalCambioEstado(incActual)
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <span>📝 {t.admin.change_status}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncidenciaVerHistoricoModal(null)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        Frontoiak — Plataforma para la gestión y disfrute de los frontones de Euskadi.
      </footer>
    </div>
  )
}