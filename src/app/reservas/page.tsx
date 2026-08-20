'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'
import Footer from '@/components/Footer'
import IncidentHistoryModal from '@/components/reservas/IncidentHistoryModal'
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

export default function PortalReservas() {
  const [user, setUser] = useState<any>(null)
  const { t, lang } = useLanguage()
  const { isDark } = useTheme()
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
  const [proximasReservasDesplegadas, setProximasReservasDesplegadas] = useState(true)
  const [favoritosDesplegados, setFavoritosDesplegados] = useState(true)

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

  // Búsqueda de frontones libres por fecha y hora
  const hoyInicialStr = new Date().toISOString().split('T')[0]
  const [busquedaLibresDesplegada, setBusquedaLibresDesplegada] = useState(false)
  const [busquedaLibresProvincia, setBusquedaLibresProvincia] = useState('')
  const [busquedaLibresFecha, setBusquedaLibresFecha] = useState(hoyInicialStr)
  const [busquedaLibresHoraInicio, setBusquedaLibresHoraInicio] = useState('17:00')
  const [busquedaLibresHoraFin, setBusquedaLibresHoraFin] = useState('18:00')
  const [frontonesLibresResultados, setFrontonesLibresResultados] = useState<any[]>([])
  const [buscandoLibres, setBuscandoLibres] = useState(false)
  const [busquedaLibresRealizada, setBusquedaLibresRealizada] = useState(false)
  const [busquedaLibresSoloFavoritos, setBusquedaLibresSoloFavoritos] = useState(false)
  const [reservandoDesdeLibresId, setReservandoDesdeLibresId] = useState<string | null>(null)
  const [slotDestacadoHoraInicio, setSlotDestacadoHoraInicio] = useState<string | null>(null)

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

    const munsValidos = (muns || []).filter(m => m.estado !== 'inactivo')
    setMunicipios(munsValidos)
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
      .select('*, municipios(*)')
      .eq('municipio_id', munId)

    setFrontones(fronts || [])
  }

  const ejecutarBusquedaFrontonesLibres = async (
    provId = busquedaLibresProvincia,
    fecha = busquedaLibresFecha,
    horaIni = busquedaLibresHoraInicio,
    horaFin = busquedaLibresHoraFin
  ) => {
    if (horaFin <= horaIni) {
      alert(t.reservas.time_range_error || 'La hora final debe ser posterior a la hora inicial.')
      return
    }

    setBuscandoLibres(true)
    setBusquedaLibresRealizada(true)
    setBusquedaLibresDesplegada(true)

    try {
      // 1. Consultar todos los frontones con sus municipios y provincias
      const { data: todosFronts, error: frontsError } = await supabase
        .from('frontones')
        .select('*, municipios(*, provincias(*))')
        .neq('habilitado', false)

      if (frontsError || !todosFronts) {
        setFrontonesLibresResultados([])
        setBuscandoLibres(false)
        return
      }

      // 2. Filtrar candidatos según provincia, horarios del frontón y antelación
      const frontonesCandidatos = todosFronts.filter(f => {
        if (f.habilitado === false) return false
        if (f.municipios?.estado === 'inactivo') return false
        if (provId) {
          const pId = f.municipios?.provincia_id || f.municipios?.provincias?.id
          if (pId !== provId) return false
        }

        // Horarios del frontón
        const apertura = (f.hora_apertura || '08:00').slice(0, 5)
        const cierre = (f.hora_cierre || '22:00').slice(0, 5)
        if (horaIni < apertura || horaFin > cierre) {
          return false
        }

        // Comprobación de antelación máxima
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const [anio, mes, dia] = fecha.split('-').map(Number)
        const fechaObj = new Date(anio, mes - 1, dia)
        fechaObj.setHours(0, 0, 0, 0)
        const diffDias = Math.round((fechaObj.getTime() - hoy.getTime()) / (1000 * 3600 * 24))
        const antelacionMaxima = f.dias_antelacion_maxima ?? 7

        if (diffDias < 0 || diffDias > antelacionMaxima) {
          return false
        }

        // Si la fecha es hoy, comprobar si la hora ya pasó
        const ahora = new Date()
        const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
        const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
        if (fecha === hoyStr && horaIni < horaActualStr) {
          return false
        }

        return true
      })

      if (frontonesCandidatos.length === 0) {
        setFrontonesLibresResultados([])
        setBuscandoLibres(false)
        return
      }

      // 3. Consultar eventos/reservas para esa fecha
      const { data: eventosDia } = await supabase
        .from('eventos_fronton')
        .select('*')
        .eq('fecha', fecha)

      const eventos = eventosDia || []

      // 4. Comprobar cuáles NO tienen colisión con la franja solicitada
      const frontonesLibres = frontonesCandidatos.filter(f => {
        const eventosFronton = eventos.filter(ev => ev.fronton_id === f.id)
        const hayConflicto = eventosFronton.some(ev => {
          const evInicio = (ev.hora_inicio || '').slice(0, 5)
          const evFin = (ev.hora_fin || '').slice(0, 5)
          return horaIni < evFin && horaFin > evInicio
        })
        return !hayConflicto
      })

      setFrontonesLibresResultados(frontonesLibres)
    } catch (err) {
      console.error('Error al buscar frontones libres:', err)
      setFrontonesLibresResultados([])
    } finally {
      setBuscandoLibres(false)
    }
  }

  const handleReservarDesdeBusqueda = async (fronton: any) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const munNombre = fronton.municipios?.nombre || ''
    const confirmMsg = `¿Deseas reservar el frontón "${fronton.nombre}" (${munNombre}) para el ${formatFullDateWithWeekday(busquedaLibresFecha, lang)} de ${busquedaLibresHoraInicio} a ${busquedaLibresHoraFin}?`
    if (!confirm(confirmMsg)) return

    setReservandoDesdeLibresId(fronton.id)

    try {
      if (fronton.habilitado === false) {
        alert('Este frontón está actualmente deshabilitado.')
        return
      }

      if (fronton.solo_empadronados && !esUsuarioEmpadronado(user, fronton)) {
        alert(`Acceso restringido: Este frontón está reservado exclusivamente para personas empadronadas en ${munNombre}.`)
        return
      }

      const maxReservas = fronton.max_reservas_activas || 1
      const { count: reservasMismoDia } = await supabase
        .from('eventos_fronton')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('fronton_id', fronton.id)
        .eq('fecha', busquedaLibresFecha)

      if ((reservasMismoDia || 0) >= maxReservas) {
        alert(`Ya has alcanzado el límite de ${maxReservas} reserva(s) por usuario al día en este frontón.`)
        return
      }

      let { error } = await supabase.from('eventos_fronton').insert([{
        fronton_id: fronton.id,
        user_id: user.id,
        titulo: user.profile?.nombre_completo || user.email,
        fecha: busquedaLibresFecha,
        hora_inicio: busquedaLibresHoraInicio,
        hora_fin: busquedaLibresHoraFin,
        tipo: 'reserva_usuario'
      }])

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
          fronton_id: fronton.id,
          user_id: user.id,
          titulo: user.profile?.nombre_completo || user.email,
          fecha: busquedaLibresFecha,
          hora_inicio: busquedaLibresHoraInicio,
          hora_fin: busquedaLibresHoraFin,
          tipo: 'reserva_usuario'
        }])
        error = retry.error
      }

      if (error) {
        alert('Error al realizar la reserva: ' + error.message)
      } else {
        alert(t.reservas.booking_success || '¡Reserva realizada con éxito!')
        await cargarMisReservas(user.id)
        await ejecutarBusquedaFrontonesLibres()
        if (frontonSeleccionado?.id === fronton.id) {
          await cargarEventosFronton(fronton.id)
        }
      }
    } catch (err: any) {
      alert('Error inesperado: ' + err.message)
    } finally {
      setReservandoDesdeLibresId(null)
    }
  }

  const handleIrAReservarSlotDesdeBusqueda = async (fronton: any) => {
    let frontonConMun = fronton
    if (!frontonConMun.municipios && frontonConMun.municipio_id) {
      const mun = municipios.find(m => m.id === frontonConMun.municipio_id)
      if (mun) {
        frontonConMun = { ...frontonConMun, municipios: mun }
      } else {
        const { data: munData } = await supabase.from('municipios').select('*').eq('id', frontonConMun.municipio_id).maybeSingle()
        if (munData) {
          frontonConMun = { ...frontonConMun, municipios: munData }
        }
      }
    }

    setFrontonSeleccionado(frontonConMun)
    if (frontonConMun.municipio_id) {
      setMunicipioSeleccionado(frontonConMun.municipio_id)
    }

    // Configurar la fecha seleccionada con la fecha introducida en la búsqueda
    setFechaSeleccionada(busquedaLibresFecha)

    // Ajustar el preview de días para que muestre la fecha seleccionada
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const [anio, mes, dia] = busquedaLibresFecha.split('-').map(Number)
    const fechaObj = new Date(anio, mes - 1, dia)
    fechaObj.setHours(0, 0, 0, 0)
    const diffDias = Math.round((fechaObj.getTime() - hoy.getTime()) / (1000 * 3600 * 24))
    if (diffDias >= 0) {
      setOffsetDiasPreview(diffDias)
    }

    setCalendarioAbierto(false)
    setSlotDestacadoHoraInicio(busquedaLibresHoraInicio)

    // Cargar eventos del frontón seleccionado
    await cargarEventosFronton(frontonConMun.id)

    // Scrollear suavemente hasta la franja horaria correspondiente a la hora inicial
    setTimeout(() => {
      const slotElement = document.getElementById(`slot-${busquedaLibresHoraInicio}`)
      if (slotElement) {
        slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (franjasHorariasRef.current) {
        franjasHorariasRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 200)

    // Quitar el resalte tras unos segundos
    setTimeout(() => {
      setSlotDestacadoHoraInicio(null)
    }, 4500)
  }

  const handleVerFrontonDesdeBusqueda = async (fronton: any) => {
    await handleIrAReservarSlotDesdeBusqueda(fronton)
  }

  const seleccionarFronton = async (fronton: any) => {
    let frontonConMun = fronton
    if (!frontonConMun.municipios && frontonConMun.municipio_id) {
      const mun = municipios.find(m => m.id === frontonConMun.municipio_id)
      if (mun) {
        frontonConMun = { ...frontonConMun, municipios: mun }
      } else {
        const { data: munData } = await supabase.from('municipios').select('*').eq('id', frontonConMun.municipio_id).maybeSingle()
        if (munData) {
          frontonConMun = { ...frontonConMun, municipios: munData }
        }
      }
    }

    setFrontonSeleccionado(frontonConMun)
    if (frontonConMun.municipio_id) {
      setMunicipioSeleccionado(frontonConMun.municipio_id)
    }
    setOffsetSemanas(0)
    setOffsetDiasPreview(0)
    setCalendarioAbierto(false)
    const hoyStr = new Date().toISOString().split('T')[0]
    setFechaSeleccionada(hoyStr)
    await cargarEventosFronton(frontonConMun.id)

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
      return { esPasado: false, bloqueadoPorAntelacion: false, noReservable: false, diasFaltantes: 0, antelacionMaxima: 7 }
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const [anio, mes, dia] = fechaStr.split('-').map(Number)
    const fechaObj = new Date(anio, mes - 1, dia)
    fechaObj.setHours(0, 0, 0, 0)

    const diffDias = Math.round((fechaObj.getTime() - hoy.getTime()) / (1000 * 3600 * 24))
    const antelacionMaxima = frontonSeleccionado.dias_antelacion_maxima ?? 7

    const esPasado = diffDias < 0
    // Si diffDias > antelacionMaxima (ej. 6 días cuando el máximo es 5), no se puede reservar
    const bloqueadoPorAntelacion = !esPasado && diffDias > antelacionMaxima
    const noReservable = esPasado || bloqueadoPorAntelacion

    return { esPasado, bloqueadoPorAntelacion, noReservable, diasFaltantes: diffDias, antelacionMaxima }
  }

  const esUsuarioEmpadronado = (usuario: any, fronton: any): boolean => {
    if (!fronton?.solo_empadronados) return true
    if (!usuario) return false

    const profile = usuario.profile || {}
    const meta = usuario.user_metadata || {}

    // 1. Superadmin tiene acceso a todos los frontones
    if (profile.role === 'admin' || meta.role === 'admin') return true

    // 2. Gestor municipal asignado a este municipio
    if (profile.role === 'gestor_municipio' && (profile.municipio_id === fronton.municipio_id || meta.municipio_id === fronton.municipio_id)) {
      return true
    }

    // 3. Coincidencia directa por municipio_id
    if (profile.municipio_id && profile.municipio_id === fronton.municipio_id) {
      return true
    }
    if (meta.municipio_id && meta.municipio_id === fronton.municipio_id) {
      return true
    }

    // Obtener datos del municipio del frontón
    const mun = fronton.municipios || municipios.find(m => m.id === fronton.municipio_id)

    // 4. Coincidencia por Código Postal
    const userCp = String(profile.codigo_postal || meta.codigo_postal || '').trim()
    if (userCp && mun?.codigos_postales && Array.isArray(mun.codigos_postales)) {
      const matchCp = mun.codigos_postales.some((cp: string) => String(cp).trim() === userCp)
      if (matchCp) return true
    }

    // 5. Coincidencia por Localidad / Nombre del Municipio
    const userLocalidad = String(profile.localidad || meta.localidad || '').trim().toLowerCase()
    const munNombre = String(mun?.nombre || '').trim().toLowerCase()
    if (userLocalidad && munNombre) {
      if (munNombre.includes(userLocalidad) || userLocalidad.includes(munNombre)) {
        return true
      }
    }

    return false
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

    // Calculamos si la fecha es hoy para bloquear franjas horarias pasadas
    const ahora = new Date()
    const anio = ahora.getFullYear()
    const mes = String(ahora.getMonth() + 1).padStart(2, '0')
    const dia = String(ahora.getDate()).padStart(2, '0')
    const hoyStr = `${anio}-${mes}-${dia}`
    const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

    const esFechaHoy = fechaStr === hoyStr

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

      // Si la fecha es hoy y la hora de inicio ya ha transcurrido
      const esPasadoPorHora = esFechaHoy && horaInicioStr < horaActualStr

      slots.push({
        inicio: horaInicioStr,
        fin: horaFinStr,
        ocupado: Boolean(eventoOcupante),
        titulo: tituloMostrado,
        esMia,
        esMunicipal,
        esPasadoPorHora,
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

    const { esPasado, bloqueadoPorAntelacion, antelacionMaxima } = calcularEstadoFechaReservable(fechaSeleccionada)

    if (esPasado) {
      alert('No se pueden hacer reservas en fechas pasadas.')
      return
    }

    if (bloqueadoPorAntelacion) {
      alert(`Este frontón solo permite realizar reservas con un máximo de ${antelacionMaxima} día(s) de antelación.`)
      return
    }

    // Comprobamos si la franja horaria ya ha pasado si la reserva es para hoy
    const ahora = new Date()
    const anio = ahora.getFullYear()
    const mes = String(ahora.getMonth() + 1).padStart(2, '0')
    const dia = String(ahora.getDate()).padStart(2, '0')
    const hoyStr = `${anio}-${mes}-${dia}`
    const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

    if (frontonSeleccionado.habilitado === false) {
      alert('Este frontón está actualmente deshabilitado para reservas por decisión del municipio.')
      return
    }

    if (frontonSeleccionado.solo_empadronados && !esUsuarioEmpadronado(user, frontonSeleccionado)) {
      const munNombre = frontonSeleccionado.municipios?.nombre || 'este municipio'
      alert(`Acceso restringido: Este frontón está reservado exclusivamente para personas empadronadas o residentes en ${munNombre}. Tu código postal o localidad de usuario no coincide con las autorizadas para este municipio.`)
      return
    }

    if (fechaSeleccionada === hoyStr && horaInicio < horaActualStr) {
      alert('No se puede reservar una franja horaria que ya ha pasado.')
      return
    }

    const maxReservasPermitidas = frontonSeleccionado.max_reservas_activas || 1
    const { count: reservasMismoDiaFronton } = await supabase
      .from('eventos_fronton')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('fronton_id', frontonSeleccionado.id)
      .eq('fecha', fechaSeleccionada)

    if ((reservasMismoDiaFronton || 0) >= maxReservasPermitidas) {
      alert(`Ya has alcanzado el límite de ${maxReservasPermitidas} reserva(s) por usuario al día en este frontón.`)
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
        {t.common.loading}
      </div>
    )
  }

  const diasCalendario = generarDiasCalendario()
  const diasPreview = generarDiasPreview()
  const slotsDelDiaSeleccionado = generarSlotsHorariosParaFecha(fechaSeleccionada)
  const esFavoritoActual = frontonSeleccionado ? idsFavoritos.includes(frontonSeleccionado.id) : false
  const estadoFechaActual = calcularEstadoFechaReservable(fechaSeleccionada)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col selection:bg-emerald-100 dark:selection:bg-emerald-900 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors">
      {/* CABECERA */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          {/* IZQUIERDA: Frontoiak y debajo usuario */}
          <div className="flex flex-col items-start min-w-0">
            <div 
              onClick={handleLogoClick}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 dark:bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm group-hover:bg-emerald-800 dark:group-hover:bg-emerald-700 transition">
                F
              </div>
              <span className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Frontoiak
              </span>
            </div>

            {user ? (
              <button 
                onClick={() => router.push('/auth/ajustes')}
                title={`${t.common.settings} (${user.profile?.nombre_completo || user.email})`}
                className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[280px] text-left mt-0.5"
              >
                👤 {user.profile?.nombre_completo || user.email} {user.profile?.role === 'admin' ? '(Admin)' : user.profile?.role === 'gestor_municipio' ? '(Gestor)' : ''}
              </button>
            ) : null}
          </div>

          {/* DERECHA: Cerrar sesión y debajo tema/idiomas */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {user.profile?.role === 'admin' && (
                  <button 
                    onClick={() => router.push('/admin/super')}
                    className="bg-stone-900 dark:bg-stone-800 text-amber-300 border border-amber-400/40 hover:bg-stone-800 dark:hover:bg-stone-700 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition shadow-xs flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    title="Ir a la Consola Central Superadmin"
                  >
                    👑 {t.common.superadmin}
                  </button>
                )}

                {user.profile?.role === 'gestor_municipio' && (
                  <button 
                    onClick={() => router.push('/admin/dashboard')}
                    className="bg-stone-800 dark:bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition shadow-xs flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    title="Ir al Panel de Gestión Municipal"
                  >
                    🏛️ {t.common.dashboard}
                  </button>
                )}

                <button 
                  onClick={handleSignOut}
                  className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-2xs whitespace-nowrap active:scale-95 cursor-pointer"
                >
                  {t.common.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-2.5 py-1.5 rounded-xl transition whitespace-nowrap"
                >
                  {t.common.login}
                </button>
                <button 
                  onClick={() => router.push('/auth/register')}
                  className="bg-emerald-700 dark:bg-emerald-600 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-800 dark:hover:bg-emerald-700 transition shadow-sm whitespace-nowrap active:scale-95"
                >
                  {t.common.register}
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageSelector variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        
        {/* 1. SECCIÓN: MIS PRÓXIMAS RESERVAS */}
        <section className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200">
          {/* CABECERA CLICABLE PARA DESPLEGAR / RECOGER */}
          <button
            type="button"
            onClick={() => setProximasReservasDesplegadas(!proximasReservasDesplegadas)}
            className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-emerald-200/50 dark:border-emerald-800/50 flex-shrink-0">
                📅
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>{t.reservas.my_upcoming_bookings}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {misProximasReservas.length} {t.reservas.active_count}
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {misProximasReservas.length === 0
                    ? t.reservas.no_upcoming_bookings
                    : 'Consulta o gestiona tus reservas confirmadas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                proximasReservasDesplegadas
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}>
                <span>{proximasReservasDesplegadas ? (t.reservas.search_free_toggle_close || 'Recoger') : (t.reservas.search_free_toggle_open || 'Desplegar')}</span>
                <span className={`text-[10px] transform transition-transform duration-200 ${proximasReservasDesplegadas ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>
          </button>

          {/* CONTENIDO DESPLEGABLE */}
          {proximasReservasDesplegadas && (
            <div className="p-4 sm:p-6 pt-0 space-y-4 border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in duration-200">
              {misProximasReservas.length === 0 ? (
                <div className="p-6 bg-stone-50 dark:bg-stone-950/40 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-center space-y-1 mt-4">
                  <span className="text-2xl">📅</span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{t.reservas.no_upcoming_bookings}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4">
                  {misProximasReservas.map((res) => (
                    <div key={res.id} className="w-full p-4 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition">
                      <div>
                        <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200 block">
                          {res.frontones?.nombre} <span className="font-normal text-stone-500 dark:text-stone-400">({res.frontones?.municipios?.nombre})</span>
                        </span>
                        <span className="inline-block mt-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                          📅 {formatFullDateWithWeekday(res.fecha, lang)} • ⏰ {res.hora_inicio?.slice(0,5)} - {res.hora_fin?.slice(0,5)}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleCancelarReserva(res.id)}
                        className="bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer"
                      >
                        {t.reservas.cancel_booking}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 2. SECCIÓN: MIS FRONTONES FAVORITOS */}
        <section className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200">
          {/* CABECERA CLICABLE PARA DESPLEGAR / RECOGER */}
          <button
            type="button"
            onClick={() => setFavoritosDesplegados(!favoritosDesplegados)}
            className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-amber-200/50 dark:border-amber-800/50 flex-shrink-0">
                ★
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>{t.reservas.my_favorites}</span>
                  {misFavoritos.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                      {misFavoritos.length}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {misFavoritos.length === 0
                    ? t.reservas.no_favorites
                    : 'Acceso rápido y disponibilidad en tiempo real de tus frontones guardados'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                favoritosDesplegados
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}>
                <span>{favoritosDesplegados ? (t.reservas.search_free_toggle_close || 'Recoger') : (t.reservas.search_free_toggle_open || 'Desplegar')}</span>
                <span className={`text-[10px] transform transition-transform duration-200 ${favoritosDesplegados ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>
          </button>

          {/* CONTENIDO DESPLEGABLE */}
          {favoritosDesplegados && (
            <div className="p-4 sm:p-6 pt-0 space-y-4 border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in duration-200">
              {misFavoritos.length === 0 ? (
                <div className="p-6 bg-stone-50 dark:bg-stone-950/40 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-center space-y-1 mt-4">
                  <span className="text-2xl">⭐</span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {t.reservas.no_favorites}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                  {misFavoritos.map((f) => {
                    const { pendientes, enCurso } = getContadorIncidenciasFronton(f.id)
                    return (
                      <div 
                        key={f.id}
                        onClick={() => seleccionarFronton(f)}
                        className="border border-stone-200 dark:border-stone-800 rounded-2xl p-4 bg-stone-50 dark:bg-stone-950/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition flex flex-col justify-between gap-3 group shadow-2xs hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          {f.imagen_url ? (
                            <img src={f.imagen_url} alt="" className="w-12 h-12 object-cover rounded-xl border border-stone-200 dark:border-stone-700" />
                          ) : (
                            <div className="w-12 h-12 bg-stone-200 dark:bg-stone-800 rounded-xl flex items-center justify-center text-xs text-stone-500 dark:text-stone-400 font-bold">
                              F
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-900 dark:group-hover:text-emerald-300 block truncate">
                              {f.nombre} {f.habilitado === false ? ` (🚫 ${t.reservas.disabled})` : ''}
                            </span>
                            <span className="text-xs text-stone-500 dark:text-stone-400 block truncate">
                              {f.municipios?.nombre}
                            </span>
                          </div>
                        </div>

                        {/* CONTADORES DE INCIDENCIAS EN FAVORITOS */}
                        {(pendientes > 0 || enCurso > 0) && (
                          <div className="flex flex-wrap gap-1.5">
                            {pendientes > 0 && (
                              <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <span className="text-stone-600 dark:text-stone-400">{t.common.pending}:</span>
                                <span className="font-black text-rose-700 dark:text-rose-400">{pendientes}</span>
                              </span>
                            )}
                            {enCurso > 0 && (
                              <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <span className="text-stone-600 dark:text-stone-400">{t.reservas.status_in_progress_short}:</span>
                                <span className="font-black text-amber-800 dark:text-amber-400">{enCurso}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Estado en tiempo real */}
                        <div className="flex justify-between items-center pt-2 border-t border-stone-200/80 dark:border-stone-800">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            f.en_uso
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              f.en_uso ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'
                            }`}></span>
                            {f.en_uso ? t.reservas.in_use_now : t.reservas.free_now}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition">
                            {t.reservas.view}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECCIÓN: BÚSQUEDA DE FRONTONES LIBRES POR FECHA Y HORA */}
        <section className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200">
          {/* CABECERA CLICABLE PARA DESPLEGAR / RECOGER */}
          <button
            type="button"
            onClick={() => setBusquedaLibresDesplegada(!busquedaLibresDesplegada)}
            className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-emerald-200/50 dark:border-emerald-800/50 flex-shrink-0">
                🔍
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                  {t.reservas.search_free_frontons_title || 'Búsqueda de Frontones Libres'}
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {t.reservas.search_free_frontons_subtitle || 'Selecciona provincia, día y franja horaria para encontrar pistas activas y libres al instante'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                busquedaLibresDesplegada
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}>
                <span>{busquedaLibresDesplegada ? (t.reservas.search_free_toggle_close || 'Recoger') : (t.reservas.search_free_toggle_open || 'Desplegar')}</span>
                <span className={`text-[10px] transform transition-transform duration-200 ${busquedaLibresDesplegada ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>
          </button>

          {/* CONTENIDO DESPLEGABLE */}
          {busquedaLibresDesplegada && (
            <div className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-5 border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in duration-200">
              {/* FORMULARIO DE FILTROS */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  ejecutarBusquedaFrontonesLibres()
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-stone-50 dark:bg-stone-950/60 p-3 sm:p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 items-end"
              >
                {/* 1. Provincia */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.reservas.all_provinces ? t.reservas.all_provinces.replace('Todas las ', '') : 'Provincia'}
                  </label>
                  <select
                    value={busquedaLibresProvincia}
                    onChange={(e) => setBusquedaLibresProvincia(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  >
                    <option value="">{t.reservas.all_provinces || 'Todas las provincias'}</option>
                    {provincias.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Día / Fecha */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.reservas.filter_date || 'Día / Fecha'}
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={busquedaLibresFecha}
                    onChange={(e) => setBusquedaLibresFecha(e.target.value)}
                    style={{ colorScheme: isDark ? 'dark' : 'light' }}
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium dark:[color-scheme:dark] [color-scheme:light] cursor-pointer"
                  />
                </div>

                {/* 3. Hora Inicial */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.reservas.filter_start_time || 'Hora inicial'}
                  </label>
                  <select
                    value={busquedaLibresHoraInicio}
                    onChange={(e) => setBusquedaLibresHoraInicio(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  >
                    {['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Hora Final */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    {t.reservas.filter_end_time || 'Hora final'}
                  </label>
                  <select
                    value={busquedaLibresHoraFin}
                    onChange={(e) => setBusquedaLibresHoraFin(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                  >
                    {['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Botón de Búsqueda */}
                <div>
                  <button
                    type="submit"
                    disabled={buscandoLibres}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
                  >
                    <span>{buscandoLibres ? '⏳' : '🔎'}</span>
                    <span>{buscandoLibres ? (t.reservas.searching_free || 'Buscando...') : (t.reservas.search_free_btn || 'Buscar Libres')}</span>
                  </button>
                </div>
              </form>

              {/* RESULTADOS DE LA BÚSQUEDA */}
              {busquedaLibresRealizada && (() => {
                const frontonesAMostrar = busquedaLibresSoloFavoritos
                  ? frontonesLibresResultados.filter((f) => idsFavoritos.includes(f.id))
                  : frontonesLibresResultados

                return (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {frontonesAMostrar.length} {t.reservas.free_frontons_found || 'frontón(es) libre(s) encontrado(s)'} (📅 {formatFullDateWithWeekday(busquedaLibresFecha, lang)} • ⏰ {busquedaLibresHoraInicio} - {busquedaLibresHoraFin})
                      </span>

                      {/* TOGGLE MIS FAVORITOS */}
                      <button
                        type="button"
                        onClick={() => setBusquedaLibresSoloFavoritos(!busquedaLibresSoloFavoritos)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer select-none self-start sm:self-auto ${
                          busquedaLibresSoloFavoritos
                            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-2xs'
                            : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        <span className={busquedaLibresSoloFavoritos ? 'text-amber-500 text-sm' : 'text-stone-400 text-sm'}>★</span>
                        <span>{t.reservas.filter_favorites || 'Mis favoritos'}</span>
                        <span
                          className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center p-0.5 ${
                            busquedaLibresSoloFavoritos ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded-full bg-white transition-transform ${
                              busquedaLibresSoloFavoritos ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    {frontonesAMostrar.length === 0 ? (
                      <div className="p-6 bg-stone-50 dark:bg-stone-950/40 rounded-2xl border border-stone-200 dark:border-stone-800 text-center space-y-1">
                        <span className="text-2xl">{busquedaLibresSoloFavoritos ? '⭐' : '🏟️'}</span>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                          {busquedaLibresSoloFavoritos && frontonesLibresResultados.length > 0
                            ? 'Ninguno de tus frontones favoritos está libre en esta fecha y horario.'
                            : (t.reservas.no_free_frontons_found || 'No se han encontrado frontones activos y libres para la fecha, horario y provincia seleccionados.')}
                        </p>
                        {busquedaLibresSoloFavoritos && frontonesLibresResultados.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBusquedaLibresSoloFavoritos(false)}
                            className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Ver todos los {frontonesLibresResultados.length} frontones libres disponibles
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {frontonesAMostrar.map((f) => {
                          const esEmpadronado = esUsuarioEmpadronado(user, f)
                          const puedeReservar = !f.solo_empadronados || esEmpadronado

                          return (
                            <div
                              key={f.id}
                              className="border border-stone-200 dark:border-stone-800 rounded-2xl p-4 bg-stone-50 dark:bg-stone-950/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition flex flex-col justify-between gap-3 shadow-2xs group"
                            >
                              <div className="space-y-2.5">
                                {/* Fila superior: Imagen y Nombre */}
                                <div className="flex items-start gap-3">
                                  {f.imagen_url ? (
                                    <img
                                      src={f.imagen_url}
                                      alt=""
                                      className="w-14 h-14 object-cover rounded-xl border border-stone-200 dark:border-stone-700 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                                      🎾
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                                      {f.nombre}
                                    </h3>
                                    <span className="text-xs text-stone-500 dark:text-stone-400 block truncate">
                                      🏛️ {f.municipios?.nombre} {f.municipios?.provincias?.nombre ? `(${f.municipios.provincias.nombre})` : ''}
                                    </span>
                                    <span className="text-[11px] text-stone-400 dark:text-stone-500 block">
                                      ⏰ {f.hora_apertura?.slice(0,5) || '08:00'} - {f.hora_cierre?.slice(0,5) || '22:00'}
                                    </span>
                                  </div>
                                </div>

                                {/* Medidas y badges */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {f.medidas && (
                                    <span className="bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      📏 {f.medidas}
                                    </span>
                                  )}
                                  {f.luz_disponible && (
                                    <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      💡 {t.admin?.light || 'Luz'}
                                    </span>
                                  )}
                                  {f.vestuarios && (
                                    <span className="bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      🚪 {t.admin?.dressing_rooms || 'Vestuarios'}
                                    </span>
                                  )}
                                  {f.duchas && (
                                    <span className="bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      🚿 {t.admin?.showers || 'Duchas'}
                                    </span>
                                  )}
                                  {f.sensor_iot_disponible && (
                                    <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      📡 IoT
                                    </span>
                                  )}
                                  {f.solo_empadronados && (
                                    <span className="bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      🔒 {t.common?.solo_empadronados || 'Solo Empadronados'}
                                    </span>
                                  )}
                                </div>

                                {/* Estado de libre en la franja */}
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl flex items-center justify-between text-xs">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-[11px]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {t.reservas.free_in_selected_slot || 'Libre en esta franja'}
                                  </span>
                                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                                    {busquedaLibresHoraInicio} - {busquedaLibresHoraFin}
                                  </span>
                                </div>
                              </div>

                              {/* Botón de acción: Reservar esta franja */}
                              <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800">
                                <button
                                  type="button"
                                  disabled={!puedeReservar}
                                  onClick={() => handleIrAReservarSlotDesdeBusqueda(f)}
                                  className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer group-hover:scale-[1.01]"
                                >
                                  <span>📅</span>
                                  <span>{t.reservas.book_this_slot || 'Reservar esta Franja'}</span>
                                  <span className="text-emerald-200 dark:text-emerald-300 font-mono text-[11px]">
                                    ({busquedaLibresHoraInicio} - {busquedaLibresHoraFin})
                                  </span>
                                  <span className="text-xs">↓</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </section>

        {/* 3. SECCIÓN: BUSCADOR POR MUNICIPIO (COLAPSABLE) */}
        <section className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200">
          {/* CABECERA CLICABLE PARA DESPLEGAR / RECOGER */}
          <button
            type="button"
            onClick={() => setBuscadorAbierto(!buscadorAbierto)}
            className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-emerald-200/50 dark:border-emerald-800/50 flex-shrink-0">
                🏛️
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>{t.reservas.search_and_explore || 'Buscar y Explorar Frontones'}</span>
                  {frontonSeleccionado && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate max-w-[150px] sm:max-w-[220px]">
                      {frontonSeleccionado.nombre}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {buscadorAbierto ? t.reservas.search_desc_open : t.reservas.search_desc_closed}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                buscadorAbierto
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}>
                <span>{buscadorAbierto ? (t.reservas.search_free_toggle_close || 'Recoger') : (t.reservas.search_free_toggle_open || 'Desplegar')}</span>
                <span className={`text-[10px] transform transition-transform duration-200 ${buscadorAbierto ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>
          </button>

          {/* CONTENIDO DESPLEGABLE */}
          {buscadorAbierto && (
            <div className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-5 border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">{t.reservas.step_province}</label>
                  <select 
                    value={provinciaSeleccionada}
                    onChange={(e) => handleProvinciaChange(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 dark:border-stone-700 rounded-xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  >
                    <option value="">{t.reservas.select_province}</option>
                    {provincias.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">{t.reservas.step_municipality}</label>
                  <select 
                    value={municipioSeleccionado}
                    onChange={(e) => handleMunicipioChange(e.target.value)}
                    disabled={!provinciaSeleccionada}
                    className="w-full p-2.5 border border-stone-300 dark:border-stone-700 rounded-xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:bg-stone-100 dark:disabled:bg-stone-900 disabled:text-stone-400 dark:disabled:text-stone-600 transition"
                  >
                    <option value="">{t.reservas.select_town}</option>
                    {municipios.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">{t.reservas.step_fronton}</label>
                  <select 
                    value={frontonSeleccionado?.id || ''}
                    onChange={(e) => {
                      const f = frontones.find(item => item.id === e.target.value)
                      if (f) seleccionarFronton(f)
                      else setFrontonSeleccionado(null)
                    }}
                    disabled={!municipioSeleccionado}
                    className="w-full p-2.5 border border-stone-300 dark:border-stone-700 rounded-xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:bg-stone-100 dark:disabled:bg-stone-900 disabled:text-stone-400 dark:disabled:text-stone-600 transition"
                  >
                    <option value="">{t.reservas.select_fronton}</option>
                    {frontones.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}{f.habilitado === false ? ` (🚫 ${t.reservas.disabled})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. SECCIÓN: CALENDARIO Y FRANJAS DEL FRONTÓN SELECCIONADO */}
        {frontonSeleccionado && (
          <div ref={frontonDetalleRef} className="space-y-6 pt-2 scroll-mt-24">
            
            {/* TARJETA DEL FRONTÓN */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  {frontonSeleccionado.imagen_url ? (
                    <img src={frontonSeleccionado.imagen_url} alt="" className="w-20 h-20 object-cover rounded-2xl border border-stone-200 dark:border-stone-700" />
                  ) : (
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-2xl rounded-2xl flex items-center justify-center">
                      F
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {/* Fila 1: Nombre del frontón y estado de ocupación */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100">{frontonSeleccionado.nombre}</h3>
                      
                      {frontonSeleccionado.solo_empadronados && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {t.reservas.solo_empadronados_badge}
                        </span>
                      )}

                      {frontonSeleccionado.habilitado === false ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          🚫 {t.reservas.fronton_disabled}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                          frontonSeleccionado.en_uso
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            frontonSeleccionado.en_uso ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'
                          }`}></span>
                          {frontonSeleccionado.en_uso ? t.reservas.in_use_now : t.reservas.free_now}
                        </span>
                      )}
                    </div>

                    {/* Fila 2: Horario y características */}
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {t.reservas.hours}: {frontonSeleccionado.hora_apertura?.slice(0,5)} - {frontonSeleccionado.hora_cierre?.slice(0,5)} | Slot: {frontonSeleccionado.duracion_slot_minutos || 60}m | {frontonSeleccionado.dias_antelacion_maxima ?? 7} {t.common.days}
                      {(frontonSeleccionado.largura || frontonSeleccionado.anchura || frontonSeleccionado.medidas) && (
                        <> | {t.reservas.dimensions}: {frontonSeleccionado.largura && frontonSeleccionado.anchura ? `${frontonSeleccionado.largura}x${frontonSeleccionado.anchura}m` : frontonSeleccionado.largura ? `${frontonSeleccionado.largura}m` : frontonSeleccionado.anchura ? `${frontonSeleccionado.anchura}m` : frontonSeleccionado.medidas}</>
                      )}
                      {frontonSeleccionado.cuadros && <> | Cuadros: {frontonSeleccionado.cuadros}</>}
                      {(frontonSeleccionado.luze || frontonSeleccionado.numero_luze) && <> | Luze: {frontonSeleccionado.luze || frontonSeleccionado.numero_luze}</>}
                    </p>

                    {/* Fila 3: 'Incidencias', 'Pendientes: X' y 'En curso: Y' todo seguido en la misma fila */}
                    {(() => {
                      const { pendientes, enCurso } = getContadorIncidenciasFronton(frontonSeleccionado.id)
                      if (pendientes === 0 && enCurso === 0) return null

                      return (
                        <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                          <span className="font-bold text-stone-700 dark:text-stone-300 text-xs">
                            {t.common.incidents}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold flex items-center gap-1 shadow-2xs ${
                            pendientes > 0 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}>
                            <span className="text-stone-600 dark:text-stone-400 font-semibold text-[11px]">{t.common.pending}:</span>
                            <span className={`font-black ${pendientes > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-stone-800 dark:text-stone-200'}`}>{pendientes}</span>
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold flex items-center gap-1 shadow-2xs ${
                            enCurso > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800' : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}>
                            <span className="text-stone-600 dark:text-stone-400 font-semibold text-[11px]">{t.reservas.status_in_progress_short}:</span>
                            <span className={`font-black ${enCurso > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-stone-800 dark:text-stone-200'}`}>{enCurso}</span>
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                  <button 
                    onClick={() => toggleFavorito(frontonSeleccionado.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition active:scale-95 w-full sm:w-auto justify-center cursor-pointer ${
                      esFavoritoActual 
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60' 
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>{esFavoritoActual ? t.reservas.in_favorites : t.reservas.mark_favorite}</span>
                  </button>

                  {/* BOTÓN VER INCIDENCIAS (Sólo visible si hay incidencias pendientes o en curso) */}
                  {(() => {
                    const { pendientes, enCurso } = getContadorIncidenciasFronton(frontonSeleccionado.id)
                    if (pendientes === 0 && enCurso === 0) return null

                    return (
                      <button
                        onClick={() => abrirModalIncidenciasFronton(frontonSeleccionado)}
                        className="bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-300 dark:border-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 w-full sm:w-auto cursor-pointer"
                        title={t.reservas.view_incidents}
                      >
                        <span>{t.reservas.view_incidents}</span>
                      </button>
                    )
                  })()}
                </div>
              </div>

              {/* AVISO SI EL FRONTÓN ESTÁ DESHABILITADO */}
              {frontonSeleccionado.habilitado === false && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
                  <span className="text-lg">🚫</span>
                  <div>
                    <p className="text-rose-900 dark:text-rose-300 font-extrabold text-xs uppercase tracking-wide">Frontón deshabilitado temporalmente</p>
                    <p className="text-rose-700 dark:text-rose-400 font-medium text-xs mt-0.5">El municipio ha deshabilitado este frontón para nuevas reservas.</p>
                  </div>
                </div>
              )}

              {/* AVISO SI EL FRONTÓN ES SOLO PARA EMPADRONADOS Y EL USUARIO NO LO ES */}
              {frontonSeleccionado.solo_empadronados && !esUsuarioEmpadronado(user, frontonSeleccionado) && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 p-4 rounded-2xl text-xs font-bold flex items-start gap-3 shadow-2xs">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-amber-900 dark:text-amber-300 font-extrabold text-xs uppercase tracking-wide">
                      {t.reservas.exclusive_residents}
                    </p>
                    <p className="text-amber-800 dark:text-amber-400 font-medium text-xs mt-0.5 leading-relaxed">
                      {t.reservas.exclusive_residents_desc} <strong className="text-amber-950 dark:text-amber-200">{frontonSeleccionado.municipios?.nombre || 'este municipio'}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* VISTA PREVIA DE 3 DÍAS */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{t.reservas.next_occupations}</h4>
                    <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-semibold px-2 py-0.5 rounded-md">
                      {t.reservas.blocked_days_notice}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-950 px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
                    <button 
                      onClick={() => setOffsetDiasPreview(prev => prev - 1)}
                      className="p-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold px-2 transition cursor-pointer"
                      title={t.reservas.prev_day}
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => setOffsetDiasPreview(0)}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold text-[11px] transition cursor-pointer"
                    >
                      {t.reservas.today}
                    </button>
                    <button 
                      onClick={() => setOffsetDiasPreview(prev => prev + 1)}
                      className="p-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold px-2 transition cursor-pointer"
                      title={t.reservas.next_day}
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
                            ? 'bg-stone-200/70 dark:bg-stone-800/50 border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400 opacity-80' 
                            : esSeleccionado 
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-600/20' 
                              : esHoy 
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700' 
                                : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                        }`}
                      >
                        <div className={`font-bold border-b pb-1 mb-2 flex justify-between ${
                          noReservable ? 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400' : 'text-stone-800 dark:text-stone-200 border-stone-200/80 dark:border-stone-800'
                        }`}>
                          <span className={`capitalize ${noReservable ? 'line-through' : ''}`}>
                            {formatPreviewDay(dia, lang)}
                          </span>
                          {esHoy && <span className="text-emerald-700 dark:text-emerald-400 font-extrabold no-underline">({t.reservas.today})</span>}
                        </div>

                        {noReservable && (
                          <div className="mb-2">
                            <span className="bg-stone-300/90 dark:bg-stone-800 text-stone-800 dark:text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider block text-center shadow-2xs">
                              {esPasado ? t.reservas.blocked : t.reservas.blocked}
                            </span>
                          </div>
                        )}
                        
                        {eventosDelDia.length === 0 ? (
                          <p className="text-stone-500 dark:text-stone-400 italic text-[11px] py-1">
                            {noReservable ? t.reservas.no_reservations : t.reservas.free_now}
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
                                      ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                                      : esMia 
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300 font-bold' 
                                        : esDelMunicipio
                                          ? 'bg-blue-100/80 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-300 font-bold'
                                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
                                  }`}
                                >
                                  <span className="font-bold text-emerald-900 dark:text-emerald-300">{ev.hora_inicio.slice(0,5)} - {ev.hora_fin.slice(0,5)}</span>
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
            <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200">
              {/* CABECERA CLICABLE PARA DESPLEGAR / RECOGER */}
              <button
                type="button"
                onClick={() => setCalendarioAbierto(!calendarioAbierto)}
                className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-emerald-200/50 dark:border-emerald-800/50 flex-shrink-0">
                    🗓️
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{t.reservas.select_day_calendar}</span>
                      {fechaSeleccionada && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {formatPreviewDay(fechaSeleccionada, lang)}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                      {calendarioAbierto ? t.reservas.calendar_desc_open : t.reservas.calendar_desc_closed}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    calendarioAbierto
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                  }`}>
                    <span>{calendarioAbierto ? (t.reservas.search_free_toggle_close || 'Recoger') : (t.reservas.search_free_toggle_open || 'Desplegar')}</span>
                    <span className={`text-[10px] transform transition-transform duration-200 ${calendarioAbierto ? 'rotate-180' : ''}`}>▼</span>
                  </span>
                </div>
              </button>

              {calendarioAbierto && (
                <div className="p-4 sm:p-6 pt-0 border-t border-stone-100 dark:border-stone-800 overflow-x-auto space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center pt-4">
                    <button 
                      type="button"
                      onClick={() => setOffsetSemanas(prev => prev - 1)}
                      className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      {t.reservas.prev_4_weeks}
                    </button>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">{t.reservas.monthly_grid}</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {diasCalendario[0] && formatShortMonthDay(diasCalendario[0], lang)} — {diasCalendario[27] && formatShortMonthDay(diasCalendario[27], lang, true)}
                      </p>
                    </div>
                    <button 
                      onClick={() => setOffsetSemanas(prev => prev + 1)}
                      className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      {t.reservas.next_4_weeks}
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 min-w-[800px] mb-1">
                    {[
                      t.reservas.days_of_week.mon,
                      t.reservas.days_of_week.tue,
                      t.reservas.days_of_week.wed,
                      t.reservas.days_of_week.thu,
                      t.reservas.days_of_week.fri,
                      t.reservas.days_of_week.sat,
                      t.reservas.days_of_week.sun
                    ].map((diaSemana, idx) => (
                      <div key={idx} className="text-center font-bold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 py-1 bg-stone-100/60 dark:bg-stone-800/60 rounded-xl">
                        {diaSemana}
                      </div>
                    ))}
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
                              ? 'bg-stone-100/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-500 opacity-60' 
                              : esSeleccionado 
                                ? 'border-emerald-700 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-600/30' 
                                : esHoy 
                                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50' 
                                  : 'bg-stone-50/80 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-900'
                          }`}
                        >
                          <span className={`font-bold mb-1 border-b pb-1 flex justify-between ${
                            noReservable ? 'border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800'
                          }`}>
                            <span className={noReservable ? 'line-through' : ''}>
                              {formatCalendarCellDay(dia, lang)}
                            </span>
                            {esHoy && <span className="text-emerald-700 dark:text-emerald-400 font-black text-[10px]">({t.reservas.today})</span>}
                          </span>

                          <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] pr-1">
                            {eventosDia.length === 0 ? (
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 italic block text-center mt-2 font-medium">
                                {noReservable ? t.reservas.blocked : t.reservas.available}
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
                                        ? 'bg-stone-200/60 dark:bg-stone-800/60 border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                                        : esMia 
                                          ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300 font-bold' 
                                          : esDelMunicipio
                                            ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-300 font-bold'
                                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                                    }`}
                                  >
                                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block">{ev.hora_inicio.slice(0,5)} - {ev.hora_fin.slice(0,5)}</span>
                                    <span className="truncate block">
                                      {esDelMunicipio ? `🏛️ ${nombreMostrado}` : nombreMostrado}
                                    </span>
                                  </div>
                                )
                              })
                            )}
                          </div>

                          <span className={`text-[10px] mt-auto text-center font-bold ${
                            noReservable ? 'text-stone-400 dark:text-stone-500' : 'text-stone-500 dark:text-stone-400'
                          }`}>
                            {esSeleccionado ? '✓' : noReservable ? t.reservas.not_available : t.reservas.book_slot}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* LISTA LINEAL DE FRANJAS */}
            <div ref={franjasHorariasRef} className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">
                  {t.reservas.schedules_for} <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{formatWeekdayAndDayMonth(fechaSeleccionada, lang)}</span>
                </h3>
              </div>

              <div className="space-y-2.5">
                {slotsDelDiaSeleccionado.map((slot, idx) => {
                  const noEsEmpadronado = frontonSeleccionado.solo_empadronados && !esUsuarioEmpadronado(user, frontonSeleccionado)
                  let badgeTexto = t.reservas.available
                  let descripcionTexto = t.reservas.free_slot_to_play

                  if (frontonSeleccionado.habilitado === false) {
                    badgeTexto = t.reservas.disabled
                    descripcionTexto = t.reservas.fronton_disabled
                  } else if (noEsEmpadronado) {
                    badgeTexto = t.reservas.solo_empadronados_badge
                    descripcionTexto = `${t.reservas.exclusive_residents_desc} ${frontonSeleccionado.municipios?.nombre || ''}`
                  } else if (slot.ocupado) {
                    if (slot.esMunicipal) {
                      badgeTexto = t.reservas.municipal_event
                      descripcionTexto = `${slot.titulo}`
                    } else {
                      badgeTexto = t.reservas.occupied
                      descripcionTexto = `${slot.titulo}`
                    }
                  } else if (estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion || slot.esPasadoPorHora) {
                    badgeTexto = t.reservas.not_available
                    descripcionTexto = t.reservas.not_available
                  }

                  const estaBloqueado = frontonSeleccionado.habilitado === false || noEsEmpadronado || estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion || slot.esPasadoPorHora

                  const esSlotDestacado = slotDestacadoHoraInicio === slot.inicio

                  return (
                    <div 
                      key={idx} 
                      id={`slot-${slot.inicio}`}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition scroll-mt-32 ${
                        esSlotDestacado
                          ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-600 shadow-md animate-pulse'
                          : slot.ocupado 
                            ? slot.esMunicipal
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                              : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' 
                            : estaBloqueado
                              ? 'bg-stone-100/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-60'
                              : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`font-mono font-bold text-base w-28 px-2.5 py-1 rounded-xl border text-center shadow-2xs ${
                          esSlotDestacado
                            ? 'bg-emerald-700 text-white border-emerald-600 dark:bg-emerald-600'
                            : 'text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800'
                        }`}>
                          {slot.inicio} - {slot.fin}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              slot.ocupado 
                                ? slot.esMunicipal
                                  ? 'bg-blue-200 dark:bg-blue-900 text-blue-950 dark:text-blue-200'
                                  : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200' 
                                : noEsEmpadronado
                                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200'
                                  : estaBloqueado
                                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                                    : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                            }`}>
                              {badgeTexto}
                            </span>
                            {esSlotDestacado && (
                              <span className="text-[10px] font-extrabold text-emerald-900 dark:text-emerald-200 bg-emerald-200 dark:bg-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span>🎯</span>
                                <span>Franja buscada</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-medium">
                            {descripcionTexto}
                          </p>
                        </div>
                      </div>

                      {!slot.ocupado ? (
                        frontonSeleccionado.habilitado === false ? (
                          <button 
                            disabled
                            className="bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-500 cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold shadow-none"
                          >
                            {t.reservas.fronton_disabled}
                          </button>
                        ) : noEsEmpadronado ? (
                          <button 
                            disabled
                            className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold shadow-none"
                            title={t.reservas.solo_empadronados_warning}
                          >
                            {t.reservas.solo_empadronados_btn}
                          </button>
                        ) : (estadoFechaActual.esPasado || estadoFechaActual.bloqueadoPorAntelacion || slot.esPasadoPorHora) ? (
                          <button 
                            disabled
                            className="bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-500 cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold shadow-none"
                          >
                            {t.reservas.not_available}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReservarSlot(slot.inicio, slot.fin)}
                            className="bg-emerald-700 dark:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-800 dark:hover:bg-emerald-700 transition shadow-sm active:scale-95 cursor-pointer"
                          >
                            {t.reservas.book_slot_btn}
                          </button>
                        )
                      ) : slot.esMia ? (
                        <button 
                          onClick={() => handleCancelarReserva(slot.idEvento)}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
                        >
                          {t.reservas.cancel_my_booking}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider pr-2">{t.reservas.not_available}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: MIS INCIDENCIAS */}
        <section className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200">
          {/* CABECERA CLICABLE PARA DESPLEGAR / RECOGER */}
          <button
            type="button"
            onClick={() => setMostrarMisIncidencias(!mostrarMisIncidencias)}
            className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-rose-200/50 dark:border-rose-800/50 flex-shrink-0">
                ⚠️
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>{t.reservas.my_incidents || 'Mis Incidencias'}</span>
                  {misIncidencias.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {misIncidencias.length}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {t.reservas.communicate_incident_desc || 'Consulta el estado de tus incidencias reportadas o comunica una nueva'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                mostrarMisIncidencias
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}>
                <span>{mostrarMisIncidencias ? (t.reservas.search_free_toggle_close || 'Recoger') : (t.reservas.search_free_toggle_open || 'Desplegar')}</span>
                <span className={`text-[10px] transform transition-transform duration-200 ${mostrarMisIncidencias ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </div>
          </button>

          {/* CONTENIDO DESPLEGABLE */}
          {mostrarMisIncidencias && (
            <div className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-5 border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-4">
                <div>
                  <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    {misIncidencias.length > 0
                      ? `${misIncidencias.length} ${t.reservas.incidents_reported || 'incidencia(s) reportada(s)'}`
                      : (t.reservas.no_incidents_recorded || 'No tienes incidencias registradas')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => abrirModalIncidencia()}
                  className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer self-start sm:self-auto"
                >
                  <span>{t.reservas.report_incident_btn || '+ Reportar Incidencia'}</span>
                </button>
              </div>

              {/* LISTA DE INCIDENCIAS */}
              {misIncidencias.length === 0 ? (
                <div className="p-6 bg-stone-50 dark:bg-stone-950/40 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-center space-y-1">
                  <span className="text-2xl">✅</span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {t.reservas.no_incidents_desc || 'No has reportado ninguna incidencia todavía.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {misIncidencias.map((inc) => {
                    let badgeClass = 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    let estadoTexto = t.reservas.status_pending_review

                    if (inc.estado === 'en_curso') {
                      badgeClass = 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      estadoTexto = t.reservas.status_in_progress
                    } else if (inc.estado === 'resuelta') {
                      badgeClass = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      estadoTexto = t.reservas.status_resolved
                    }

                    return (
                      <div key={inc.id} className="p-4 sm:p-5 border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl bg-stone-50/70 dark:bg-stone-950/60 space-y-3 shadow-2xs">
                        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 items-start sm:items-center">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">{inc.titulo}</span>
                              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                                🏟️ {inc.frontones?.nombre || 'Frontón'} {inc.frontones?.municipios?.nombre ? `(${inc.frontones.municipios.nombre})` : ''}
                              </span>
                            </div>
                            {inc.descripcion && (
                              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{inc.descripcion}</p>
                            )}
                            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium block">
                              📅 {t.reservas.reported_on} {formatLongDateWithTime(inc.created_at, lang)}
                            </span>
                          </div>

                          <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${badgeClass}`}>
                              {estadoTexto}
                            </span>
                          </div>
                        </div>

                        {/* HISTÓRICO DE ACTUACIONES */}
                        {Array.isArray(inc.historial) && inc.historial.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setIncidenciasHistorialAbierto(prev => 
                                prev.includes(inc.id) ? prev.filter(id => id !== inc.id) : [...prev, inc.id]
                              )}
                              className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <span>💬 {incidenciasHistorialAbierto.includes(inc.id) ? `${t.reservas.hide_actions} (${inc.historial.length})` : `${t.reservas.show_actions} (${inc.historial.length})`}</span>
                              <span className="text-[10px]">{incidenciasHistorialAbierto.includes(inc.id) ? '▲' : '▼'}</span>
                            </button>

                            {incidenciasHistorialAbierto.includes(inc.id) && (
                              <div className="mt-2.5 p-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-2 text-xs shadow-2xs">
                                <h4 className="font-bold text-stone-800 dark:text-stone-200 border-b border-stone-100 dark:border-stone-800 pb-1.5 flex items-center gap-1.5">
                                  <span>📜 {t.reservas.actions_timeline}:</span>
                                </h4>
                                <div className="space-y-2">
                                  {inc.historial.map((h: any, hIdx: number) => (
                                    <div key={hIdx} className="p-2.5 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-150 dark:border-stone-800 space-y-1">
                                      <div className="flex justify-between items-center flex-wrap gap-1">
                                        <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                                          {t.common.active}: <span className="capitalize">{h.estado_anterior || 'Inicio'}</span> ➔ <span className="capitalize text-emerald-800 dark:text-emerald-400 font-extrabold">{h.estado_nuevo}</span>
                                        </span>
                                        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                                          📅 {formatShortDateWithTime(h.fecha, lang)}
                                        </span>
                                      </div>
                                      <p className="text-stone-700 dark:text-stone-300 italic text-xs">"{h.comentario}"</p>
                                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold block">Por: {h.autor || 'Gestor Municipal'}</span>
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
        </section>

        {/* MODAL CREAR INCIDENCIA */}
        {mostrarModalIncidencia && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center text-lg font-black">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">{t.reservas.communicate_incident}</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{t.reservas.communicate_incident_desc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMostrarModalIncidencia(false)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xl font-bold w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearIncidencia} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                    {t.reservas.affected_fronton}
                  </label>
                  <select
                    value={incidenciaFrontonId}
                    onChange={(e) => setIncidenciaFrontonId(e.target.value)}
                    required
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  >
                    <option value="">{t.reservas.select_fronton}</option>
                    {todosLosFrontones.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} {f.municipios?.nombre ? `(${f.municipios.nombre})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                    {t.reservas.incident_title}
                  </label>
                  <input
                    type="text"
                    required
                    value={incidenciaTitulo}
                    onChange={(e) => setIncidenciaTitulo(e.target.value)}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                    {t.reservas.incident_description}
                  </label>
                  <textarea
                    rows={4}
                    value={incidenciaDescripcion}
                    onChange={(e) => setIncidenciaDescripcion(e.target.value)}
                    className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition resize-none font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={enviandoIncidencia}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold transition shadow-sm disabled:bg-stone-300 dark:disabled:bg-stone-800 active:scale-98 cursor-pointer"
                  >
                    {enviandoIncidencia ? t.reservas.sending_incident : t.reservas.send_incident}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModalIncidencia(false)}
                    className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-4 py-3 rounded-2xl text-sm font-bold transition cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VER HISTÓRICO DE INCIDENCIA */}
        <IncidentHistoryModal
          incidencia={incidenciaVerHistoricoModal}
          onClose={() => setIncidenciaVerHistoricoModal(null)}
          lang={lang}
          t={t}
        />

        {/* MODAL: VER INCIDENCIAS DEL FRONTÓN SELECCIONADO */}
        {modalFrontonIncidencias && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-800 pb-3 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span className="text-amber-500">⚠️</span>
                    {t.common.incidents}: {modalFrontonIncidencias.nombre}
                  </h3>
                </div>
                <button 
                  onClick={() => setModalFrontonIncidencias(null)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xl font-bold p-1 leading-none transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                {cargandoIncidenciasFronton ? (
                  <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500 font-bold">
                    {t.common.loading}
                  </div>
                ) : incidenciasDelFronton.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="text-3xl">✅</div>
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">{t.reservas.no_incidents_recorded}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{t.reservas.no_incidents_desc}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incidenciasDelFronton.map((inc) => {
                      let badgeClass = 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      let estadoTexto = t.reservas.status_pending_short
                      if (inc.estado === 'en_curso') {
                        badgeClass = 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        estadoTexto = t.reservas.status_in_progress_short
                      } else if (inc.estado === 'resuelta') {
                        badgeClass = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        estadoTexto = t.reservas.status_resolved_short
                      }

                      const historial = Array.isArray(inc.historial) ? inc.historial : []
                      const estaAbierto = incidenciasHistorialAbierto.includes(inc.id)

                      return (
                        <div key={inc.id} className="p-4 border border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/70 dark:bg-stone-950/60 space-y-2 shadow-2xs">
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm block">{inc.titulo}</span>
                              {inc.descripcion && (
                                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{inc.descripcion}</p>
                              )}
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium block">
                                📅 {t.reservas.reported_on} {formatLongDateWithTime(inc.created_at, lang)}
                              </span>
                            </div>

                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs flex-shrink-0 ${badgeClass}`}>
                              {estadoTexto}
                            </span>
                          </div>

                          {/* HISTÓRICO DE ACTUACIONES */}
                          {historial.length > 0 && (
                            <div className="pt-1 border-t border-stone-200/60 dark:border-stone-800">
                              <button
                                onClick={() => setIncidenciasHistorialAbierto(prev => 
                                   prev.includes(inc.id) ? prev.filter(id => id !== inc.id) : [...prev, inc.id]
                                )}
                                className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-200 flex items-center gap-1 transition cursor-pointer"
                              >
                                <span>💬 {estaAbierto ? `${t.reservas.hide_actions} (${historial.length})` : `${t.reservas.show_actions} (${historial.length})`}</span>
                                <span className="text-[9px]">{estaAbierto ? '▲' : '▼'}</span>
                              </button>

                              {estaAbierto && (
                                <div className="mt-2 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 text-xs">
                                  {historial.map((h: any, hIdx: number) => (
                                    <div key={hIdx} className="p-2 bg-stone-50 dark:bg-stone-950 rounded-lg border border-stone-150 dark:border-stone-800 space-y-1 text-xs">
                                      <div className="flex justify-between items-center flex-wrap gap-1">
                                        <span className="font-bold text-stone-800 dark:text-stone-200 text-[11px]">
                                          <span className="capitalize">{h.estado_anterior || 'Inicio'}</span> ➔ <span className="capitalize text-emerald-800 dark:text-emerald-400 font-extrabold">{h.estado_nuevo}</span>
                                        </span>
                                        <span className="text-[10px] text-stone-400 dark:text-stone-500">
                                          {formatShortDateWithTime(h.fecha, lang)}
                                        </span>
                                      </div>
                                      <p className="text-stone-700 dark:text-stone-300 italic text-xs">"{h.comentario}"</p>
                                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold block">Por: {h.autor || 'Gestor Municipal'}</span>
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
              <div className="flex justify-end items-center gap-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalFrontonIncidencias(null)}
                  className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}