// src/app/reservas/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalReservas() {
  const [user, setUser] = useState<any>(null)
  const [provincias, setProvincias] = useState<any[]>([])
  const [municipios, setMunicipios] = useState<any[]>([])
  const [frontones, setFrontones] = useState<any[]>([])

  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('')
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState('')
  const [frontonSeleccionado, setFrontonSeleccionado] = useState<any | null>(null)

  // Desplazamiento (offset) de días para la vista previa de 3 días
  const [offsetDiasPreview, setOffsetDiasPreview] = useState(0)

  // Estado para desplegar/recoger el calendario mensual y el buscador
  const [calendarioAbierto, setCalendarioAbierto] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)

  // Referencias para scroll automático
  const frontonDetalleRef = useRef<HTMLDivElement>(null)
  const franjasHorariasRef = useRef<HTMLDivElement>(null)

  // Próximas reservas y favoritos
  const [misProximasReservas, setMisProximasReservas] = useState<any[]>([])
  const [misFavoritos, setMisFavoritos] = useState<any[]>([])
  const [idsFavoritos, setIdsFavoritos] = useState<string[]>([])

  // Incidencias del usuario y globales activas
  const [misIncidencias, setMisIncidencias] = useState<any[]>([])
  const [todasIncidenciasActivas, setTodasIncidenciasActivas] = useState<any[]>([])
  const [mostrarMisIncidencias, setMostrarMisIncidencias] = useState(false)
  const [mostrarModalIncidencia, setMostrarModalIncidencia] = useState(false)
  const [incidenciaVerHistoricoModal, setIncidenciaVerHistoricoModal] = useState<any | null>(null)
  const [modalFrontonIncidencias, setModalFrontonIncidencias] = useState<any | null>(null)
  const [incidenciasDelFronton, setIncidenciasDelFronton] = useState<any[]>([])
  const [cargandoIncidenciasFronton, setCargandoIncidenciasFronton] = useState(false)
  const [incidenciaFrontonId, setIncidenciaFrontonId] = useState('')
  const [incidenciaTitulo, setIncidenciaTitulo] = useState('')
  const [incidenciaDescripcion, setIncidenciaDescripcion] = useState('')
  const [enviandoIncidencia, setEnviandoIncidencia] = useState(false)
  const [todosLosFrontones, setTodosLosFrontones] = useState<any[]>([])
  const [incidenciasHistorialAbierto, setIncidenciasHistorialAbierto] = useState<string[]>([])

  // Calendario y Navegación de 4 semanas
  const [offsetSemanas, setOffsetSemanas] = useState(0)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(new Date().toISOString().split('T')[0])
  const [eventosFronton, setEventosFronton] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  useEffect(() => {
    checkUserSessionAndLoadInitial()
  }, [])

  const checkUserSessionAndLoadInitial = async () => {
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

    // Si la fila en la tabla profiles no existía, la creamos para que no fallen las foreign keys de favoritos y reservas
    if (!profile) {
      const nombreFinal = finalProfile.nombre || finalProfile.nombre_completo || meta.nombre || meta.nombre_completo || 'Usuario'
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nombre: nombreFinal,
        nombre_completo: nombreFinal,
        apellidos: finalProfile.apellidos,
        role: finalProfile.role || 'usuario',
        dni: meta.dni || '',
        calle: meta.calle || '',
        fecha_nacimiento: meta.fecha_nacimiento || null,
        localidad: meta.localidad || '',
        codigo_postal: meta.codigo_postal || ''
      })
    }

    const { data: provs } = await supabase.from('provincias').select('*')
    setProvincias(provs || [])

    await cargarMisReservas(user.id)
    await cargarMisFavoritos(user.id)
    await cargarMisIncidencias(user.id)
    await cargarIncidenciasActivas()
    await cargarTodosLosFrontones()

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleLogoClick = () => {
    if (!user) {
      router.push('/')
    } else if (user.profile?.role === 'gestor_municipio') {
      router.push('/admin/dashboard')
    } else {
      router.push('/reservas')
    }
  }

  const cargarMisReservas = async (userId: string) => {
    const hoyStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('eventos_fronton')
      .select('*, frontones(id, nombre, municipio_id, municipios(nombre))')
      .eq('user_id', userId)
      .gte('fecha', hoyStr)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })

    setMisProximasReservas(data || [])
  }

  const cargarMisFavoritos = async (userId: string) => {
    try {
      // 1. Intentamos cargar con join de frontones y municipios
      const { data, error } = await supabase
        .from('frontones_favoritos')
        .select('*, frontones(*, municipios(*))')
        .eq('user_id', userId)

      if (!error && data) {
        setMisFavoritos(data.map(item => item.frontones).filter(Boolean))
        setIdsFavoritos(data.map(item => item.fronton_id).filter(Boolean))
        return
      }

      // 2. Respaldo: si el join relacional da error, consultamos los IDs y luego los frontones por separado
      const { data: favsData, error: favsError } = await supabase
        .from('frontones_favoritos')
        .select('fronton_id')
        .eq('user_id', userId)

      if (!favsError && favsData) {
        const ids = favsData.map(item => item.fronton_id).filter(Boolean)
        setIdsFavoritos(ids)

        if (ids.length > 0) {
          const { data: frontsData } = await supabase
            .from('frontones')
            .select('*, municipios(*)')
            .in('id', ids)

          if (frontsData) {
            setMisFavoritos(frontsData)
          }
        } else {
          setMisFavoritos([])
        }
      }
    } catch (err) {
      console.error('Error al cargar favoritos:', err)
    }
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
    const pendientes = todasIncidenciasActivas.filter(i => i.fronton_id === frontonId && i.estado === 'pendiente').length
    const enCurso = todasIncidenciasActivas.filter(i => i.fronton_id === frontonId && i.estado === 'en_curso').length
    return { pendientes, enCurso, total: pendientes + enCurso }
  }

  const cargarIncidenciasActivas = async () => {
    try {
      const { data, error } = await supabase
        .from('incidencias_fronton')
        .select('id, fronton_id, estado')
        .in('estado', ['pendiente', 'en_curso'])

      if (!error && data) {
        setTodasIncidenciasActivas(data)
      }
    } catch (err) {
      console.error('Error al cargar incidencias activas:', err)
    }
  }

  const cargarMisIncidencias = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('incidencias_fronton')
        .select('*, frontones(id, nombre, municipios(nombre))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setMisIncidencias(data.map(normalizarIncidencia))
        return
      }

      // Fallback en caso de que el join anidado falle
      const { data: fallbackData } = await supabase
        .from('incidencias_fronton')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fallbackData) {
        const frontonIds = Array.from(new Set(fallbackData.map((i: any) => i.fronton_id).filter(Boolean)))
        if (frontonIds.length > 0) {
          const { data: fronts } = await supabase
            .from('frontones')
            .select('id, nombre, municipios(nombre)')
            .in('id', frontonIds)

          const frontsMap = (fronts || []).reduce((acc: any, f: any) => {
            acc[f.id] = f
            return acc
          }, {})

          setMisIncidencias(fallbackData.map((i: any) => normalizarIncidencia({
            ...i,
            frontones: frontsMap[i.fronton_id]
          })))
        } else {
          setMisIncidencias(fallbackData.map(normalizarIncidencia))
        }
      }
    } catch (err) {
      console.error('Error al cargar incidencias del usuario:', err)
    }
  }

  const cargarTodosLosFrontones = async () => {
    try {
      const { data } = await supabase
        .from('frontones')
        .select('id, nombre, municipio_id, municipios(nombre)')
        .order('nombre', { ascending: true })

      setTodosLosFrontones(data || [])
    } catch (err) {
      console.error('Error al cargar todos los frontones:', err)
    }
  }

  const abrirModalIncidencia = (fronton?: any) => {
    if (fronton) {
      setIncidenciaFrontonId(fronton.id)
    } else if (frontonSeleccionado) {
      setIncidenciaFrontonId(frontonSeleccionado.id)
    } else if (todosLosFrontones.length > 0) {
      setIncidenciaFrontonId(todosLosFrontones[0].id)
    } else {
      setIncidenciaFrontonId('')
    }
    setIncidenciaTitulo('')
    setIncidenciaDescripcion('')
    setMostrarModalIncidencia(true)
  }

  const abrirModalIncidenciasFronton = async (fronton: any) => {
    setModalFrontonIncidencias(fronton)
    setCargandoIncidenciasFronton(true)
    try {
      const { data, error } = await supabase
        .from('incidencias_fronton')
        .select('*')
        .eq('fronton_id', fronton.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setIncidenciasDelFronton(data.map(normalizarIncidencia))
      } else {
        setIncidenciasDelFronton([])
      }
    } catch (err) {
      console.error('Error al cargar incidencias del frontón:', err)
      setIncidenciasDelFronton([])
    } finally {
      setCargandoIncidenciasFronton(false)
    }
  }

  const handleCrearIncidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !incidenciaFrontonId || !incidenciaTitulo.trim()) {
      alert('Por favor selecciona un frontón e introduce un título para la incidencia.')
      return
    }

    setEnviandoIncidencia(true)

    let { error } = await supabase.from('incidencias_fronton').insert([{
      fronton_id: incidenciaFrontonId,
      user_id: user.id,
      titulo: incidenciaTitulo.trim(),
      descripcion: incidenciaDescripcion.trim(),
      estado: 'pendiente'
    }])

    // Si falló por clave foránea (perfil no sincronizado), sincronizamos y reintentamos
    if (error && error.message?.includes('foreign key')) {
      const meta = user?.user_metadata || {}
      const nombreFinal = user.profile?.nombre || user.profile?.nombre_completo || meta.nombre || meta.nombre_completo || 'Usuario'
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nombre: nombreFinal,
        nombre_completo: nombreFinal,
        apellidos: user.profile?.apellidos || meta.apellidos || '',
        role: user.profile?.role || meta.role || 'usuario'
      })

      const retry = await supabase.from('incidencias_fronton').insert([{
        fronton_id: incidenciaFrontonId,
        user_id: user.id,
        titulo: incidenciaTitulo.trim(),
        descripcion: incidenciaDescripcion.trim(),
        estado: 'pendiente'
      }])
      error = retry.error
    }

    if (error) {
      alert('Error al enviar la incidencia: ' + error.message)
    } else {
      alert('¡Incidencia enviada correctamente al municipio! Podrás consultar su estado y evolución en tu buzón.')
      setIncidenciaTitulo('')
      setIncidenciaDescripcion('')
      setMostrarModalIncidencia(false)
      await cargarMisIncidencias(user.id)
      await cargarIncidenciasActivas()
    }

    setEnviandoIncidencia(false)
  }

  const toggleFavorito = async (frontonId: string) => {
    let currentUserId = user?.id
    if (!currentUserId) {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        alert('Debes iniciar sesión para guardar frontones favoritos.')
        return
      }
      currentUserId = currentUser.id
    }

    const yaEsFavorito = idsFavoritos.includes(frontonId)

    // Actualización optimista inmediata en la interfaz
    if (yaEsFavorito) {
      setIdsFavoritos(prev => prev.filter(id => id !== frontonId))
      setMisFavoritos(prev => prev.filter(f => f.id !== frontonId))
    } else {
      setIdsFavoritos(prev => [...prev, frontonId])
      if (frontonSeleccionado && frontonSeleccionado.id === frontonId) {
        setMisFavoritos(prev => [...prev.filter(f => f.id !== frontonId), frontonSeleccionado])
      }
    }

    try {
      if (yaEsFavorito) {
        const { error } = await supabase
          .from('frontones_favoritos')
          .delete()
          .eq('user_id', currentUserId)
          .eq('fronton_id', frontonId)

        if (error) {
          console.error('Error al eliminar favorito:', error)
          alert('No se pudo quitar de favoritos: ' + error.message)
          await cargarMisFavoritos(currentUserId)
        }
      } else {
        let { error } = await supabase
          .from('frontones_favoritos')
          .insert([{ user_id: currentUserId, fronton_id: frontonId }])

        // Si falló por clave foránea (el perfil no existía en profiles), lo creamos y reintentamos
        if (error && error.message?.includes('foreign key')) {
          const meta = user?.user_metadata || (await supabase.auth.getUser()).data.user?.user_metadata || {}
          const nombreFinal = user?.profile?.nombre || user?.profile?.nombre_completo || meta.nombre || meta.nombre_completo || meta.full_name || 'Usuario'
          await supabase.from('profiles').upsert({
            id: currentUserId,
            email: user?.email,
            nombre: nombreFinal,
            nombre_completo: nombreFinal,
            apellidos: user?.profile?.apellidos || meta.apellidos || '',
            role: user?.profile?.role || meta.role || 'usuario',
            dni: meta.dni || '',
            calle: meta.calle || '',
            fecha_nacimiento: meta.fecha_nacimiento || null,
            localidad: meta.localidad || '',
            codigo_postal: meta.codigo_postal || ''
          })

          const retry = await supabase
            .from('frontones_favoritos')
            .insert([{ user_id: currentUserId, fronton_id: frontonId }])
          error = retry.error
        }

        if (error) {
          console.error('Error al guardar favorito:', error)
          alert('No se pudo añadir a favoritos: ' + error.message)
          await cargarMisFavoritos(currentUserId)
        }
      }
    } catch (err: any) {
      console.error('Error en toggleFavorito:', err)
      await cargarMisFavoritos(currentUserId)
    }
  }

  const handleProvinciaChange = async (provId: string) => {
    setProvinciaSeleccionada(provId)
    setMunicipioSeleccionado('')
    setFrontones([])
    setFrontonSeleccionado(null)

    if (!provId) {
      setMunicipios([])
      return
    }

    const { data: muns } = await supabase
      .from('municipios')
      .select('*')
      .eq('provincia_id', provId)

    setMunicipios(muns || [])
  }

  const handleMunicipioChange = async (munId: string) => {
    setMunicipioSeleccionado(munId)
    setFrontonSeleccionado(null)

    if (!munId) {
      setFrontones([])
      return
    }

    const { data: fronts } = await supabase
      .from('frontones')
      .select('*')
      .eq('municipio_id', munId)

    setFrontones(fronts || [])
  }

  const seleccionarFronton = async (fronton: any) => {
    setFrontonSeleccionado(fronton)
    if (fronton.municipio_id) {
      setMunicipioSeleccionado(fronton.municipio_id)
    }
    setOffsetSemanas(0)
    setOffsetDiasPreview(0)
    setCalendarioAbierto(false)
    const hoyStr = new Date().toISOString().split('T')[0]
    setFechaSeleccionada(hoyStr)
    await cargarEventosFronton(fronton.id)

    setTimeout(() => {
      if (frontonDetalleRef.current) {
        frontonDetalleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const cargarEventosFronton = async (frontonId: string) => {
    const { data: eventos, error } = await supabase
      .from('eventos_fronton')
      .select('*')
      .eq('fronton_id', frontonId)

    if (error || !eventos) {
      setEventosFronton([])
      return
    }

    const userIds = Array.from(new Set(eventos.map(e => e.user_id).filter(Boolean)))
    let profilesMap: { [key: string]: any } = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', userIds)

      if (profiles) {
        profilesMap = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p
          return acc
        }, {})
      }
    }

    const eventosConProfiles = eventos.map(ev => ({
      ...ev,
      profiles: profilesMap[ev.user_id] || { nombre_completo: ev.titulo || 'Usuario', email: '' }
    }))

    setEventosFronton(eventosConProfiles)
  }

  const generarDiasPreview = () => {
    const dias = []
    const base = new Date()
    base.setDate(base.getDate() + offsetDiasPreview)

    for (let i = 0; i < 3; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      dias.push(d)
    }
    return dias
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

  const calcularEstadoFechaReservable = (fechaStr: string) => {
    if (!frontonSeleccionado) {
      return { esPasado: false, bloqueadoPorAntelacion: false, noReservable: false, diasFaltantes: 0 }
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const [anio, mes, dia] = fechaStr.split('-').map(Number)
    const fechaObj = new Date(anio, mes - 1, dia)
    fechaObj.setHours(0, 0, 0, 0)

    const diffDias = Math.round((fechaObj.getTime() - hoy.getTime()) / (1000 * 3600 * 24))
    const antelacionMinima = frontonSeleccionado.dias_antelacion_maxima ?? 1

    const esPasado = diffDias < 0
    const bloqueadoPorAntelacion = !esPasado && diffDias < antelacionMinima
    const noReservable = esPasado || bloqueadoPorAntelacion

    return { esPasado, bloqueadoPorAntelacion, noReservable, diasFaltantes: diffDias }
  }

  const obtenerTextoVisibilidadEvento = (ev: any) => {
    const esGestor = user?.profile?.role === 'gestor_municipio'
    const esMia = ev.user_id === user?.id
    const esDelMunicipio = ev.tipo === 'bloqueo_municipal'

    if (esGestor || esMia || esDelMunicipio) {
      return {
        texto: ev.titulo || (esMia ? user.profile?.nombre_completo || 'Mi reserva' : 'Evento Municipal'),
        esDelMunicipio
      }
    }

    return {
      texto: 'Ocupado',
      esDelMunicipio: false
    }
  }

  const generarSlotsHorariosParaFecha = (fechaStr: string) => {
    if (!frontonSeleccionado) return []
    const apertura = frontonSeleccionado.hora_apertura || '08:00'
    const cierre = frontonSeleccionado.hora_cierre || '22:00'
    const duracionMin = frontonSeleccionado.duracion_slot_minutos || 60

    const slots = []
    let [hApertura, mApertura] = apertura.split(':').map(Number)
    let [hCierre, mCierre] = cierre.split(':').map(Number)

    let minutoActual = hApertura * 60 + mApertura
    const minutoCierre = hCierre * 60 + mCierre

    const eventosDia = eventosFronton.filter(ev => ev.fecha === fechaStr)

    while (minutoActual + duracionMin <= minutoCierre) {
      const hIni = Math.floor(minutoActual / 60)
      const mIni = minutoActual % 60
      minutoActual += duracionMin
      const hFin = Math.floor(minutoActual / 60)
      const mFin = minutoActual % 60

      const horaInicioStr = `${String(hIni).padStart(2, '0')}:${String(mIni).padStart(2, '0')}`
      const horaFinStr = `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}`

      const eventoOcupante = eventosDia.find(ev => {
        const evInicio = ev.hora_inicio.slice(0, 5)
        const evFin = ev.hora_fin.slice(0, 5)
        return horaInicioStr < evFin && horaFinStr > evInicio
      })

      let tituloMostrado = 'Libre'
      let esMia = false
      let esMunicipal = false

      if (eventoOcupante) {
        esMia = eventoOcupante.user_id === user?.id
        const info = obtenerTextoVisibilidadEvento(eventoOcupante)
        tituloMostrado = info.texto
        esMunicipal = info.esDelMunicipio
      }

      slots.push({
        inicio: horaInicioStr,
        fin: horaFinStr,
        ocupado: Boolean(eventoOcupante),
        titulo: tituloMostrado,
        esMia,
        esMunicipal,
        idEvento: eventoOcupante ? eventoOcupante.id : null
      })
    }
    return slots
  }

  const handleSeleccionarDia = (fechaStr: string) => {
    setFechaSeleccionada(fechaStr)
    setTimeout(() => {
      if (franjasHorariasRef.current) {
        franjasHorariasRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleReservarSlot = async (horaInicio: string, horaFin: string) => {
    if (!frontonSeleccionado || !user) return

    const { esPasado, bloqueadoPorAntelacion } = calcularEstadoFechaReservable(fechaSeleccionada)
    const antelacionMinima = frontonSeleccionado.dias_antelacion_maxima ?? 1

    if (esPasado) {
      alert('No se pueden hacer reservas en fechas pasadas.')
      return
    }

    if (bloqueadoPorAntelacion) {
      alert(`Este frontón requiere realizar la reserva con un mínimo de ${antelacionMinima} día(s) de antelación.`)
      return
    }

    const { count: reservasMismoDiaFronton } = await supabase
      .from('eventos_fronton')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('fronton_id', frontonSeleccionado.id)
      .eq('fecha', fechaSeleccionada)

    if ((reservasMismoDiaFronton || 0) > 0) {
      alert('Ya tienes una reserva realizada en este frontón para este día. Solo se permite 1 reserva por usuario al día por frontón.')
      return
    }

    let { error } = await supabase.from('eventos_fronton').insert([{
      fronton_id: frontonSeleccionado.id,
      user_id: user.id,
      titulo: user.profile?.nombre_completo || user.email,
      fecha: fechaSeleccionada,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      tipo: 'reserva_usuario'
    }])

    // Si falló por clave foránea (el perfil no existía en profiles), lo creamos y reintentamos
    if (error && error.message?.includes('foreign key')) {
      const meta = user?.user_metadata || {}
      const nombreFinal = user.profile?.nombre || user.profile?.nombre_completo || meta.nombre || meta.nombre_completo || meta.full_name || 'Usuario'
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nombre: nombreFinal,
        nombre_completo: nombreFinal,
        apellidos: user.profile?.apellidos || meta.apellidos || '',
        role: user.profile?.role || meta.role || 'usuario',
        dni: meta.dni || '',
        calle: meta.calle || '',
        fecha_nacimiento: meta.fecha_nacimiento || null,
        localidad: meta.localidad || '',
        codigo_postal: meta.codigo_postal || ''
      })

      const retry = await supabase.from('eventos_fronton').insert([{
        fronton_id: frontonSeleccionado.id,
        user_id: user.id,
        titulo: user.profile?.nombre_completo || user.email,
        fecha: fechaSeleccionada,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        tipo: 'reserva_usuario'
      }])
      error = retry.error
    }

    if (error) {
      alert('Error al realizar la reserva: ' + error.message)
    } else {
      alert('¡Reserva realizada con éxito!')
      await cargarEventosFronton(frontonSeleccionado.id)
      await cargarMisReservas(user.id)
    }
  }

  const handleCancelarReserva = async (idEvento: string) => {
    if (!confirm('¿Deseas cancelar tu reserva para esta franja?')) return

    const { error } = await supabase
      .from('eventos_fronton')
      .delete()
      .eq('id', idEvento)
      .eq('user_id', user.id)

    if (error) {
      alert('Error al cancelar: ' + error.message)
    } else {
      alert('Reserva cancelada correctamente.')
      if (frontonSeleccionado) {
        await cargarEventosFronton(frontonSeleccionado.id)
      }
      await cargarMisReservas(user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-emerald-800 font-medium">
        Cargando portal de reservas...
      </div>
    )
  }

  const diasCalendario = generarDiasCalendario()
  const diasPreview = generarDiasPreview()
  const slotsDelDiaSeleccionado = generarSlotsHorariosParaFecha(fechaSeleccionada)
  const esFavoritoActual = frontonSeleccionado ? idsFavoritos.includes(frontonSeleccionado.id) : false
  const estadoFechaActual = calcularEstadoFechaReservable(fechaSeleccionada)

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

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* ICONO / FIGURITA DE ACCESO A AJUSTES DE USUARIO */}
                <button
                  onClick={() => router.push('/auth/ajustes')}
                  title="Ir a Ajustes de Usuario"
                  className="w-9 h-9 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-700 border border-stone-200 rounded-full flex items-center justify-center text-base transition shadow-2xs"
                >
                  👤
                </button>

                <span className="text-sm font-semibold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                  {user.profile?.nombre_completo || user.email} {user.profile?.role === 'gestor_municipio' && '(Gestor)'}
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
                  onClick={() => router.push('/auth/login')}
                  className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm"
                >
                  Registrarse
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        
        {/* 1. SECCIÓN: MIS PRÓXIMAS RESERVAS */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              Mis Próximas Reservas
            </h2>
            <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
              {misProximasReservas.length} activa(s)
            </span>
          </div>

          {misProximasReservas.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-stone-400 italic">Sin próximas reservas activas.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {misProximasReservas.map((res) => (
                <div key={res.id} className="w-full p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs hover:border-emerald-300 transition">
                  <div>
                    <span className="font-bold text-sm text-emerald-950 block">
                      {res.frontones?.nombre} <span className="font-normal text-stone-500">({res.frontones?.municipios?.nombre})</span>
                    </span>
                    <span className="inline-block mt-1 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                      📅 {new Date(res.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ⏰ {res.hora_inicio?.slice(0,5)} - {res.hora_fin?.slice(0,5)}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleCancelarReserva(res.id)}
                    className="bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs"
                  >
                    Cancelar Reserva
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. SECCIÓN: MIS FRONTONES FAVORITOS */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4">
          <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <span className="text-amber-500 text-lg">★</span>
            Mis Frontones Favoritos
          </h2>

          {misFavoritos.length === 0 ? (
            <p className="text-sm text-stone-400 italic py-2 text-center">
              Aún no has añadido favoritos. Selecciónalos abajo y pulsa la estrella para acceso rápido.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {misFavoritos.map((f) => {
                const { pendientes, enCurso } = getContadorIncidenciasFronton(f.id)
                return (
                  <div 
                    key={f.id}
                    onClick={() => seleccionarFronton(f)}
                    className="border border-stone-200 rounded-2xl p-4 bg-stone-50 hover:bg-emerald-50/60 hover:border-emerald-300 cursor-pointer transition flex flex-col justify-between gap-3 group shadow-2xs hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {f.imagen_url ? (
                        <img src={f.imagen_url} alt="" className="w-12 h-12 object-cover rounded-xl border border-stone-200" />
                      ) : (
                        <div className="w-12 h-12 bg-stone-200 rounded-xl flex items-center justify-center text-xs text-stone-500 font-bold">
                          F
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-stone-900 group-hover:text-emerald-900 block truncate">
                          {f.nombre}
                        </span>
                        <span className="text-xs text-stone-500 block truncate">
                          {f.municipios?.nombre}
                        </span>
                      </div>
                    </div>

                    {/* CONTADORES DE INCIDENCIAS EN FAVORITOS */}
                    {(pendientes > 0 || enCurso > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {pendientes > 0 && (
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <span className="text-stone-600">Pendientes:</span>
                            <span className="font-black text-rose-700">{pendientes}</span>
                          </span>
                        )}
                        {enCurso > 0 && (
                          <span className="bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <span className="text-stone-600">En curso:</span>
                            <span className="font-black text-amber-800">{enCurso}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Estado en tiempo real */}
                    <div className="flex justify-between items-center pt-2 border-t border-stone-200/80">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        f.en_uso
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          f.en_uso ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'
                        }`}></span>
                        {f.en_uso ? 'En uso ahora mismo' : 'Libre en estos momentos'}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition">
                        Ver →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 3. SECCIÓN: MIS INCIDENCIAS Y MANTENIMIENTO */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="text-rose-500 text-base">⚠️</span>
              Mis Incidencias y Mantenimiento
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              {misIncidencias.length > 0 && (
                <button
                  onClick={() => setMostrarMisIncidencias(!mostrarMisIncidencias)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <span>{mostrarMisIncidencias ? 'Ocultar mis incidencias' : `Mostrar mis incidencias (${misIncidencias.length})`}</span>
                  <span className="text-[10px]">{mostrarMisIncidencias ? '▲' : '▼'}</span>
                </button>
              )}

              <button
                onClick={() => abrirModalIncidencia()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <span>+ Reportar Incidencia</span>
              </button>
            </div>
          </div>

          {/* LISTA DE INCIDENCIAS (Sólo cuando se pulsa Mostrar mis incidencias) */}
          {mostrarMisIncidencias && misIncidencias.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-stone-100">
              {misIncidencias.map((inc) => {
                let badgeClass = 'bg-rose-100 text-rose-800 border-rose-200'
                let estadoTexto = '⏳ Pendiente de revisión'
                let descEstado = 'El municipio aún no ha comenzado la revisión'

                if (inc.estado === 'en_curso') {
                  badgeClass = 'bg-amber-100 text-amber-900 border-amber-300'
                  estadoTexto = '🔧 En curso / En reparación'
                  descEstado = 'El municipio está trabajando en solucionar este aviso'
                } else if (inc.estado === 'resuelta') {
                  badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  estadoTexto = '✅ Resuelta / Solucionado'
                  descEstado = 'El municipio ha dado por reparada esta incidencia'
                }

                return (
                  <div key={inc.id} className="p-5 border border-stone-200 rounded-3xl bg-stone-50/70 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 text-base">{inc.titulo}</span>
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                            🏟️ {inc.frontones?.nombre || 'Frontón'} {inc.frontones?.municipios?.nombre ? `(${inc.frontones.municipios.nombre})` : ''}
                          </span>
                        </div>
                        {inc.descripcion && (
                          <p className="text-xs text-stone-600 leading-relaxed">{inc.descripcion}</p>
                        )}
                        <span className="text-[10px] text-stone-400 font-medium block">
                          📅 Reportado el {new Date(inc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${badgeClass}`}>
                          {estadoTexto}
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium">{descEstado}</span>
                      </div>
                    </div>

                    {/* HISTÓRICO DE ACTUACIONES */}
                    {Array.isArray(inc.historial) && inc.historial.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setIncidenciasHistorialAbierto(prev => 
                            prev.includes(inc.id) ? prev.filter(id => id !== inc.id) : [...prev, inc.id]
                          )}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition"
                        >
                          <span>💬 {incidenciasHistorialAbierto.includes(inc.id) ? 'Ocultar histórico de actuaciones' : `Ver histórico de actuaciones (${inc.historial.length})`}</span>
                          <span className="text-[10px]">{incidenciasHistorialAbierto.includes(inc.id) ? '▲' : '▼'}</span>
                        </button>

                        {incidenciasHistorialAbierto.includes(inc.id) && (
                          <div className="mt-2.5 p-3.5 bg-white border border-stone-200 rounded-2xl space-y-2 text-xs shadow-2xs">
                            <h4 className="font-bold text-stone-800 border-b border-stone-100 pb-1.5 flex items-center gap-1.5">
                              <span>📜 Historial cronológico de cambios de estado:</span>
                            </h4>
                            <div className="space-y-2">
                              {inc.historial.map((h: any, hIdx: number) => (
                                <div key={hIdx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-150 space-y-1">
                                  <div className="flex justify-between items-center flex-wrap gap-1">
                                    <span className="font-bold text-stone-800 text-xs">
                                      Estado: <span className="capitalize">{h.estado_anterior || 'Inicio'}</span> ➔ <span className="capitalize text-emerald-800 font-extrabold">{h.estado_nuevo}</span>
                                    </span>
                                    <span className="text-[10px] text-stone-400 font-medium">
                                      📅 {new Date(h.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
        </section>

        {/* 4. SECCIÓN: BUSCADOR POR MUNICIPIO (COLAPSABLE) */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden transition-all duration-300">
          <div 
            onClick={() => setBuscadorAbierto(!buscadorAbierto)}
            className="p-6 bg-stone-50 hover:bg-stone-100/80 cursor-pointer flex justify-between items-center transition"
          >
            <div>
              <h2 className="text-base font-bold text-stone-900">🔍 Buscar y Explorar Frontones</h2>
              <p className="text-xs text-stone-500">Haz clic aquí para {buscadorAbierto ? 'ocultar' : 'abrir'} el buscador por provincia y municipio</p>
            </div>
            <span className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 shadow-2xs">
              {buscadorAbierto ? '−' : '+'}
            </span>
          </div>

          {buscadorAbierto && (
            <div className="p-6 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">1. Provincia</label>
                <select 
                  value={provinciaSeleccionada}
                  onChange={(e) => handleProvinciaChange(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                >
                  <option value="">Selecciona provincia...</option>
                  {provincias.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">2. Municipio</label>
                <select 
                  value={municipioSeleccionado}
                  onChange={(e) => handleMunicipioChange(e.target.value)}
                  disabled={!provinciaSeleccionada}
                  className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 transition"
                >
                  <option value="">Selecciona pueblo...</option>
                  {municipios.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">3. Frontón</label>
                <select 
                  value={frontonSeleccionado?.id || ''}
                  onChange={(e) => {
                    const f = frontones.find(item => item.id === e.target.value)
                    if (f) seleccionarFronton(f)
                    else setFrontonSeleccionado(null)
                  }}
                  disabled={!municipioSeleccionado}
                  className="w-full p-2.5 border border-stone-300 rounded-xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400 transition"
                >
                  <option value="">Selecciona frontón...</option>
                  {frontones.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* 4. SECCIÓN: CALENDARIO Y FRANJAS DEL FRONTÓN SELECCIONADO */}
        {frontonSeleccionado && (
          <div ref={frontonDetalleRef} className="space-y-6 pt-2 scroll-mt-24">
            
            {/* TARJETA DEL FRONTÓN */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  {frontonSeleccionado.imagen_url ? (
                    <img src={frontonSeleccionado.imagen_url} alt="" className="w-20 h-20 object-cover rounded-2xl border border-stone-200" />
                  ) : (
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-800 font-black text-2xl rounded-2xl flex items-center justify-center">
                      F
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {/* Fila 1: Nombre del frontón y estado de ocupación */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-black text-stone-900">{frontonSeleccionado.nombre}</h3>
                      
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                        frontonSeleccionado.en_uso
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          frontonSeleccionado.en_uso ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'
                        }`}></span>
                        {frontonSeleccionado.en_uso ? 'En uso ahora mismo' : 'Libre en estos momentos'}
                      </span>
                    </div>

                    {/* Fila 2: Horario y características */}
                    <p className="text-xs text-stone-500 font-medium">
                      Horario: {frontonSeleccionado.hora_apertura?.slice(0,5)} - {frontonSeleccionado.hora_cierre?.slice(0,5)} | Slot: {frontonSeleccionado.duracion_slot_minutos || 60}m | Mínimo: {frontonSeleccionado.dias_antelacion_maxima ?? 1} día(s) antelación
                    </p>

                    {/* Fila 3: 'Incidencias', 'Pendientes: X' y 'En curso: Y' todo seguido en la misma fila */}
                    {(() => {
                      const { pendientes, enCurso } = getContadorIncidenciasFronton(frontonSeleccionado.id)
                      if (pendientes === 0 && enCurso === 0) return null

                      return (
                        <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                          <span className="font-bold text-stone-700 text-xs">
                            Incidencias
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold flex items-center gap-1 shadow-2xs ${
                            pendientes > 0 ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}>
                            <span className="text-stone-600 font-semibold text-[11px]">Pendientes:</span>
                            <span className={`font-black ${pendientes > 0 ? 'text-rose-700' : 'text-stone-800'}`}>{pendientes}</span>
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold flex items-center gap-1 shadow-2xs ${
                            enCurso > 0 ? 'bg-amber-50 text-amber-950 border-amber-300' : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}>
                            <span className="text-stone-600 font-semibold text-[11px]">En curso:</span>
                            <span className={`font-black ${enCurso > 0 ? 'text-amber-800' : 'text-stone-800'}`}>{enCurso}</span>
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                  <button 
                    onClick={() => toggleFavorito(frontonSeleccionado.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition active:scale-95 w-full sm:w-auto justify-center ${
                      esFavoritoActual 
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' 
                        : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <span>{esFavoritoActual ? '★ En Favoritos' : '☆ Marcar Favorito'}</span>
                  </button>

                  {/* BOTÓN VER INCIDENCIAS (Sólo visible si hay incidencias pendientes o en curso) */}
                  {(() => {
                    const { pendientes, enCurso } = getContadorIncidenciasFronton(frontonSeleccionado.id)
                    if (pendientes === 0 && enCurso === 0) return null

                    return (
                      <button
                        onClick={() => abrirModalIncidenciasFronton(frontonSeleccionado)}
                        className="bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 border border-stone-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 w-full sm:w-auto"
                        title="Ver incidencias activas en este frontón"
                      >
                        <span>⚠️ Ver Incidencias</span>
                      </button>
                    )
                  })()}
                </div>
              </div>

              {/* VISTA PREVIA DE 3 DÍAS */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Próximas ocupaciones / reservas</h4>
                    <span className="text-[10px] bg-stone-100 text-stone-500 font-semibold px-2 py-0.5 rounded-md">
                      (Días en gris = Bloqueados para reserva)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-xl border border-stone-200 text-xs">
                    <button 
                      onClick={() => setOffsetDiasPreview(prev => prev - 1)}
                      className="p-1 rounded-lg bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold px-2 transition"
                      title="Día anterior"
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => setOffsetDiasPreview(0)}
                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold text-[11px] transition"
                    >
                      Hoy
                    </button>
                    <button 
                      onClick={() => setOffsetDiasPreview(prev => prev + 1)}
                      className="p-1 rounded-lg bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold px-2 transition"
                      title="Día siguiente"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {diasPreview.map((dia, idx) => {
                    const fechaStr = dia.toISOString().split('T')[0]
                    const eventosDelDia = eventosFronton.filter(ev => ev.fecha === fechaStr).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                    const esHoy = new Date().toISOString().split('T')[0] === fechaStr
                    const esSeleccionado = fechaSeleccionada === fechaStr

                    const { esPasado, bloqueadoPorAntelacion, noReservable } = calcularEstadoFechaReservable(fechaStr)

                    return (
                      <div 
                        key={idx}
                        onClick={() => handleSeleccionarDia(fechaStr)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                          noReservable 
                            ? 'bg-stone-200/70 border-stone-300 text-stone-500 opacity-80' 
                            : esSeleccionado 
                              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-600/20' 
                              : esHoy 
                                ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300' 
                                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className={`font-bold border-b pb-1 mb-2 flex justify-between ${
                          noReservable ? 'border-stone-300 text-stone-600' : 'text-stone-800 border-stone-200/80'
                        }`}>
                          <span className={`capitalize ${noReservable ? 'line-through' : ''}`}>
                            {dia.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </span>
                          {esHoy && <span className="text-emerald-700 font-extrabold no-underline">(Hoy)</span>}
                        </div>

                        {noReservable && (
                          <div className="mb-2">
                            <span className="bg-stone-300/90 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider block text-center shadow-2xs">
                              {esPasado ? 'Bloqueado (Día pasado)' : 'Bloqueado (Antelación)'}
                            </span>
                          </div>
                        )}
                        
                        {eventosDelDia.length === 0 ? (
                          <p className="text-stone-500 italic text-[11px] py-1">
                            {noReservable ? 'Sin reservas' : 'Sin ocupaciones'}
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                            {eventosDelDia.map(ev => {
                              const esMia = ev.user_id === user?.id
                              const { texto: nombreMostrado, esDelMunicipio } = obtenerTextoVisibilidadEvento(ev)

                              return (
                                <div 
                                  key={ev.id} 
                                  className={`border rounded-xl p-1.5 shadow-2xs flex justify-between items-center text-[11px] ${
                                    noReservable
                                      ? 'bg-stone-100 border-stone-300 text-stone-600'
                                      : esMia 
                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold' 
                                        : esDelMunicipio
                                          ? 'bg-blue-100/80 border-blue-300 text-blue-950 font-bold'
                                          : 'bg-white border-stone-200 text-stone-800'
                                  }`}
                                >
                                  <span className="font-bold text-emerald-900">{ev.hora_inicio.slice(0,5)} - {ev.hora_fin.slice(0,5)}</span>
                                  <span className="truncate max-w-[120px] font-medium">
                                    {esDelMunicipio ? `🏛️ ${nombreMostrado}` : nombreMostrado}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* CALENDARIO 4 SEMANAS COLAPSABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden transition-all duration-300">
              <div 
                onClick={() => setCalendarioAbierto(!calendarioAbierto)}
                className="p-6 bg-stone-50 hover:bg-stone-100/80 cursor-pointer flex justify-between items-center transition"
              >
                <div>
                  <h3 className="text-base font-bold text-stone-900">Seleccionar un día en calendario</h3>
                  <p className="text-xs text-stone-500">Haz clic aquí para {calendarioAbierto ? 'ocultar' : 'abrir'} el calendario completo de 4 semanas</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 shadow-2xs">
                  {calendarioAbierto ? '−' : '+'}
                </span>
              </div>

              {calendarioAbierto && (
                <div className="p-6 border-t border-stone-100 overflow-x-auto space-y-4">
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setOffsetSemanas(prev => prev - 1)}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition"
                    >
                      ← Anteriores 4 semanas
                    </button>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-stone-900">Parrilla mensual</h4>
                      <p className="text-xs text-stone-500">
                        {diasCalendario[0]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {diasCalendario[27]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button 
                      onClick={() => setOffsetSemanas(prev => prev + 1)}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition"
                    >
                      Siguientes 4 semanas →
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 min-w-[800px]">
                    {diasCalendario.map((dia, idx) => {
                      const fechaStr = dia.toISOString().split('T')[0]
                      const esSeleccionado = fechaSeleccionada === fechaStr
                      const esHoy = new Date().toISOString().split('T')[0] === fechaStr
                      const eventosDia = eventosFronton.filter(ev => ev.fecha === fechaStr)

                      const { esPasado, bloqueadoPorAntelacion, noReservable } = calcularEstadoFechaReservable(fechaStr)

                      return (
                        <div 
                          key={idx} 
                          onClick={() => handleSeleccionarDia(fechaStr)}
                          className={`border rounded-2xl p-2.5 text-xs min-h-[120px] flex flex-col cursor-pointer transition ${
                            noReservable 
                              ? 'bg-stone-100/70 border-stone-200 text-stone-400 opacity-60' 
                              : esSeleccionado 
                                ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-600/30' 
                                : esHoy 
                                  ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50' 
                                  : 'bg-stone-50/80 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span className={`font-bold mb-1 border-b pb-1 flex justify-between ${
                            noReservable ? 'border-stone-200 text-stone-400' : 'text-stone-800 border-stone-200'
                          }`}>
                            <span className={noReservable ? 'line-through' : ''}>
                              {dia.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            {esHoy && <span className="text-emerald-700 font-black text-[10px]">(Hoy)</span>}
                          </span>

                          <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] pr-1">
                            {eventosDia.length === 0 ? (
                              <span className="text-[10px] text-stone-400 italic block text-center mt-2 font-medium">
                                {noReservable ? (esPasado ? 'Pasado' : 'Bloqueado') : 'Libre'}
                              </span>
                            ) : (
                              eventosDia.map(ev => {
                                const esMia = ev.user_id === user?.id
                                const { texto: nombreMostrado, esDelMunicipio } = obtenerTextoVisibilidadEvento(ev)

                                return (
                                  <div 
                                    key={ev.id} 
                                    className={`border p-1 rounded-lg text-[10px] shadow-2xs leading-tight ${
                                      noReservable
                                        ? 'bg-stone-200/60 border-stone-300 text-stone-500'
                                        : esMia 
                                          ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold' 
                                          : esDelMunicipio
                                            ? 'bg-blue-100 border-blue-300 text-blue-950 font-bold'
                                            : 'bg-white border-stone-200 text-stone-700'
                                    }`}
                                  >
                                    <span className="font-bold text-emerald-900 block">{ev.hora_inicio.slice(0,5)} - {ev.hora_fin.slice(0,5)}</span>
                                    <span className="truncate block">
                                      {esDelMunicipio ? `🏛️ ${nombreMostrado}` : nombreMostrado}
                                    </span>
                                  </div>
                                )
                              })
                            )}
                          </div>

                          <span className={`text-[10px] mt-auto text-center font-bold ${
                            noReservable ? 'text-stone-400' : 'text-stone-500'
                          }`}>
                            {esSeleccionado ? '✓ Elegido' : noReservable ? (esPasado ? 'No disponible' : 'Min. antelación') : 'Ver franjas'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* LISTA LINEAL DE FRANJAS */}
            <div ref={franjasHorariasRef} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-bold text-lg text-stone-900">
                  Horarios para el <span className="text-emerald-700 font-extrabold">{new Date(fechaSeleccionada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </h3>
                
                {estadoFechaActual.noReservable && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    ⚠️ {estadoFechaActual.esPasado ? 'Fecha pasada (No reservable)' : `Requiere mínimo ${frontonSeleccionado.dias_antelacion_maxima ?? 1} día(s) de antelación`}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {slotsDelDiaSeleccionado.map((slot, idx) => {
                  let badgeTexto = 'Disponible'
                  let descripcionTexto = 'Hueco libre para jugar'

                  if (slot.ocupado) {
                    if (slot.esMunicipal) {
                      badgeTexto = 'Evento Municipal'
                      descripcionTexto = `Motivo: ${slot.titulo}`
                    } else {
                      badgeTexto = 'Ocupado'
                      descripcionTexto = `Estado: ${slot.titulo}`
                    }
                  } else if (estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion) {
                    badgeTexto = 'No disponible'
                    descripcionTexto = estadoFechaActual.esPasado ? 'Día pasado' : 'Fuera del margen de antelación mínima'
                  }

                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                        slot.ocupado 
                          ? slot.esMunicipal
                            ? 'bg-blue-50/70 border-blue-200'
                            : 'bg-rose-50/60 border-rose-200' 
                          : (estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion)
                            ? 'bg-stone-100/70 border-stone-200 opacity-60'
                            : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-base text-stone-800 w-28 bg-white px-2.5 py-1 rounded-xl border border-stone-200 text-center shadow-2xs">
                          {slot.inicio} - {slot.fin}
                        </span>
                        <div>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            slot.ocupado 
                              ? slot.esMunicipal
                                ? 'bg-blue-200 text-blue-950'
                                : 'bg-rose-200 text-rose-900' 
                              : (estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion)
                                ? 'bg-stone-200 text-stone-600'
                                : 'bg-emerald-200 text-emerald-900'
                          }`}>
                            {badgeTexto}
                          </span>
                          <p className="text-xs text-stone-600 mt-1 font-medium">
                            {descripcionTexto}
                          </p>
                        </div>
                      </div>

                      {!slot.ocupado ? (
                        (estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion) ? (
                          <button 
                            disabled
                            className="bg-stone-300 text-stone-500 cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold shadow-none"
                          >
                            No disponible
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReservarSlot(slot.inicio, slot.fin)}
                            className="bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95"
                          >
                            Reservar Franja
                          </button>
                        )
                      ) : slot.esMia ? (
                        <button 
                          onClick={() => handleCancelarReserva(slot.idEvento)}
                          className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 transition shadow-sm active:scale-95"
                        >
                          Cancelar mi reserva
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider pr-2">No disponible</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        {/* MODAL CREAR INCIDENCIA */}
        {mostrarModalIncidencia && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg font-black">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-stone-900">Comunicar Incidencia al Municipio</h3>
                    <p className="text-xs text-stone-500">Informa de desperfectos, averías de luz o mantenimiento</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMostrarModalIncidencia(false)}
                  className="text-stone-400 hover:text-stone-700 text-xl font-bold w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearIncidencia} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    1. Frontón Afectado *
                  </label>
                  <select
                    value={incidenciaFrontonId}
                    onChange={(e) => setIncidenciaFrontonId(e.target.value)}
                    required
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  >
                    <option value="">Selecciona el frontón...</option>
                    {todosLosFrontones.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} {f.municipios?.nombre ? `(${f.municipios.nombre})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    2. Título / Asunto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Luces de cuadro 4 fundidas, red rota, goteras..."
                    value={incidenciaTitulo}
                    onChange={(e) => setIncidenciaTitulo(e.target.value)}
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    3. Descripción Detallada
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Explica qué ocurre detalladamente para que el personal de mantenimiento municipal pueda revisarlo..."
                    value={incidenciaDescripcion}
                    onChange={(e) => setIncidenciaDescripcion(e.target.value)}
                    className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={enviandoIncidencia}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white p-3 rounded-2xl text-sm font-bold transition shadow-sm disabled:bg-stone-300 active:scale-98"
                  >
                    {enviandoIncidencia ? 'Enviando al municipio...' : 'Enviar Incidencia'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModalIncidencia(false)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-3 rounded-2xl text-sm font-bold transition"
                  >
                    Cancelar
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
                    <h3 className="font-bold text-lg text-stone-900">Histórico de la Incidencia</h3>
                    <p className="text-xs text-stone-500">
                      {incidenciaVerHistoricoModal.frontones?.nombre || 'Frontón'} • {incidenciaVerHistoricoModal.titulo}
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
                      {incidenciaVerHistoricoModal.estado === 'en_curso' ? '🔧 En curso' : incidenciaVerHistoricoModal.estado === 'resuelta' ? '✅ Resuelta' : '⏳ Pendiente'}
                    </span>
                  </div>

                  {incidenciaVerHistoricoModal.descripcion && (
                    <p className="text-stone-600 leading-relaxed bg-white p-2.5 rounded-xl border border-stone-150">
                      "{incidenciaVerHistoricoModal.descripcion}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-500 pt-1">
                    <span>🏟️ Frontón: <strong>{incidenciaVerHistoricoModal.frontones?.nombre || 'Frontón'}</strong></span>
                    {incidenciaVerHistoricoModal.frontones?.municipios?.nombre && (
                      <span>({incidenciaVerHistoricoModal.frontones.municipios.nombre})</span>
                    )}
                  </div>
                </div>

                {/* TIMELINE / LÍNEA TEMPORAL */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🕒 Cronología de actuaciones del ayuntamiento</span>
                  </h4>

                  <div className="relative pl-6 border-l-2 border-stone-200 space-y-6">
                    
                    {/* HITO 1: REPORTE INICIAL */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-xs"></div>
                      <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-1 text-xs">
                        <div className="flex justify-between items-center flex-wrap gap-1">
                          <span className="font-bold text-rose-950 flex items-center gap-1.5">
                            📋 Incidencia Registrada
                          </span>
                          <span className="text-[10px] text-rose-700 font-medium">
                            {new Date(incidenciaVerHistoricoModal.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px]">
                          Comunicaste esta incidencia al ayuntamiento. Estado inicial: <strong>Pendiente de revisión</strong>.
                        </p>
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
                                    <span>Actualización:</span>
                                    <span className="capitalize font-semibold text-stone-600">{h.estado_anterior || 'Inicio'}</span>
                                    <span>➔</span>
                                    <span className="capitalize font-black text-emerald-800">{h.estado_nuevo}</span>
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-medium">
                                    📅 {new Date(h.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="bg-white p-2.5 rounded-xl border border-stone-150 text-stone-800 italic text-xs">
                                  "{h.comentario}"
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-stone-400 font-semibold pt-0.5">
                                  <span>🏛️ Ayuntamiento ({h.autor || 'Gestor Municipal'})</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-xs text-stone-400 italic py-2 pl-1">
                          El ayuntamiento aún no ha registrado actuaciones posteriores para esta incidencia.
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* BOTONES DEL PIE DEL MODAL */}
              <div className="flex justify-end items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIncidenciaVerHistoricoModal(null)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VER INCIDENCIAS DEL FRONTÓN SELECCIONADO */}
        {modalFrontonIncidencias && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-start border-b border-stone-100 pb-3 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    <span className="text-amber-500">⚠️</span>
                    Incidencias: {modalFrontonIncidencias.nombre}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Avisos y estado de reparaciones registradas en este frontón
                  </p>
                </div>
                <button 
                  onClick={() => setModalFrontonIncidencias(null)}
                  className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1 leading-none transition"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                {cargandoIncidenciasFronton ? (
                  <div className="py-12 text-center text-xs text-stone-400 font-bold">
                    Cargando incidencias del frontón...
                  </div>
                ) : incidenciasDelFronton.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="text-3xl">✅</div>
                    <p className="text-sm font-bold text-stone-700">Sin incidencias registradas</p>
                    <p className="text-xs text-stone-400">Este frontón no tiene desperfectos ni avisos pendientes.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidenciasDelFronton.map((inc) => {
                      let badgeClass = 'bg-rose-100 text-rose-800 border-rose-200'
                      let estadoTexto = '⏳ Pendiente'
                      if (inc.estado === 'en_curso') {
                        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300'
                        estadoTexto = '🔧 En curso'
                      } else if (inc.estado === 'resuelta') {
                        badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        estadoTexto = '✅ Resuelta'
                      }

                      const historial = Array.isArray(inc.historial) ? inc.historial : []
                      const estaAbierto = incidenciasHistorialAbierto.includes(inc.id)

                      return (
                        <div key={inc.id} className="p-4 border border-stone-200 rounded-2xl bg-stone-50/70 space-y-2 shadow-2xs">
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <span className="font-bold text-stone-900 text-sm block">{inc.titulo}</span>
                              {inc.descripcion && (
                                <p className="text-xs text-stone-600 leading-relaxed">{inc.descripcion}</p>
                              )}
                              <span className="text-[10px] text-stone-400 font-medium block">
                                📅 Reportado el {new Date(inc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs flex-shrink-0 ${badgeClass}`}>
                              {estadoTexto}
                            </span>
                          </div>

                          {/* HISTÓRICO DE ACTUACIONES */}
                          {historial.length > 0 && (
                            <div className="pt-1 border-t border-stone-200/60">
                              <button
                                onClick={() => setIncidenciasHistorialAbierto(prev => 
                                  prev.includes(inc.id) ? prev.filter(id => id !== inc.id) : [...prev, inc.id]
                                )}
                                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
                              >
                                <span>💬 {estaAbierto ? 'Ocultar actuaciones' : `Ver actuaciones (${historial.length})`}</span>
                                <span className="text-[9px]">{estaAbierto ? '▲' : '▼'}</span>
                              </button>

                              {estaAbierto && (
                                <div className="mt-2 p-3 bg-white border border-stone-200 rounded-xl space-y-2 text-xs">
                                  {historial.map((h: any, hIdx: number) => (
                                    <div key={hIdx} className="p-2 bg-stone-50 rounded-lg border border-stone-150 space-y-1 text-xs">
                                      <div className="flex justify-between items-center flex-wrap gap-1">
                                        <span className="font-bold text-stone-800 text-[11px]">
                                          <span className="capitalize">{h.estado_anterior || 'Inicio'}</span> ➔ <span className="capitalize text-emerald-800 font-extrabold">{h.estado_nuevo}</span>
                                        </span>
                                        <span className="text-[10px] text-stone-400">
                                          {new Date(h.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="text-stone-700 italic text-xs">"{h.comentario}"</p>
                                      <span className="text-[10px] text-stone-400 font-semibold block">Por: {h.autor || 'Gestor Municipal'}</span>
                                    </div>
                                  ))}
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

              {/* BOTONES DEL PIE */}
              <div className="flex justify-end items-center gap-3 pt-2 border-t border-stone-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalFrontonIncidencias(null)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cerrar
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