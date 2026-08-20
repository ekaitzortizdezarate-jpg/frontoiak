// src/app/admin/super/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// Cliente aislado de Supabase sin persistencia de sesión para crear nuevos usuarios sin alterar la sesión del Superadmin
const authSignUpClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
)

export default function SuperAdminDashboard() {
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'municipios' | 'gestores' | 'iot' | 'provincias'>('municipios')

  // Datos globales
  const [municipios, setMunicipios] = useState<any[]>([])
  const [provincias, setProvincias] = useState<any[]>([])
  const [gestores, setGestores] = useState<any[]>([])
  const [ciudadanos, setCiudadanos] = useState<any[]>([])
  const [frontones, setFrontones] = useState<any[]>([])

  // Filtros y búsquedas
  const [busquedaMunicipio, setBusquedaMunicipio] = useState('')
  const [filtroProvinciaMun, setFiltroProvinciaMun] = useState('')
  const [filtroEstadoMun, setFiltroEstadoMun] = useState<'todos' | 'activo' | 'en_pruebas' | 'inactivo'>('activo')
  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState<string[]>([])
  const [ejecutandoAccionLote, setEjecutandoAccionLote] = useState(false)

  const [busquedaGestor, setBusquedaGestor] = useState('')
  const [filtroMunicipioGestor, setFiltroMunicipioGestor] = useState('')
  const [filtroEstadoAprobacionGestor, setFiltroEstadoAprobacionGestor] = useState<'todos' | 'aprobado' | 'pendiente' | 'rechazado'>('todos')

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

  // Formulario y gestión de Frontones dentro de Municipio
  const [mostrarFormFronton, setMostrarFormFronton] = useState(false)
  const [frontonEnEdicion, setFrontonEnEdicion] = useState<any | null>(null)
  const [nuevoFronton, setNuevoFronton] = useState({
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
    solo_empadronados: false,
    tiene_sensor_iot: false,
    hardware_token: '',
    imagen_url: '',
    hora_apertura: '08:00',
    hora_cierre: '22:00',
    duracion_slot_minutos: 60,
    dias_antelacion_maxima: 7,
    max_reservas_activas: 1,
    habilitado: true
  })
  const [archivoImagenFronton, setArchivoImagenFronton] = useState<File | null>(null)
  const [guardandoFronton, setGuardandoFronton] = useState(false)

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

    // 3. Gestores (tanto los que tienen role='gestor_municipio' como los que tienen estado_aprobacion='pendiente')
    let profsData: any[] = []
    const { data: profs, error: profsError } = await supabase
      .from('profiles')
      .select('*, municipios(id, nombre, provincia_id, provincias(nombre))')
      .or('role.eq.gestor_municipio,estado_aprobacion.eq.pendiente')

    if (profsError) {
      console.warn('Aviso al cargar gestores con relación:', profsError)
      const { data: fallbackProfs } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.gestor_municipio,estado_aprobacion.eq.pendiente')
      profsData = fallbackProfs || []
    } else {
      profsData = profs || []
    }
    setGestores(profsData)

    // 3b. Otros usuarios para poder promoverlos a gestores
    const { data: ciuds } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'gestor_municipio')
    setCiudadanos(ciuds || [])

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

    setTimeout(() => {
      const el = document.getElementById('formulario-municipio-edicion')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
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

  const handleGuardarMunicipio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoMunicipio.nombre.trim() || !nuevoMunicipio.provincia_id) {
      alert('Por favor completa el nombre del municipio y la provincia.')
      return
    }

    setGuardandoMunicipio(true)
    let finalImagenUrl = nuevoMunicipio.imagen_url

    // Subir imagen si se seleccionó archivo
    if (archivoImagenMun) {
      const fileExt = archivoImagenMun.name.split('.').pop()
      const fileName = `municipio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `municipios/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('frontones-fotos')
        .upload(filePath, archivoImagenMun, { upsert: true, contentType: archivoImagenMun.type })

      if (uploadError) {
        console.warn('Aviso al subir imagen de municipio:', uploadError)
      } else {
        const { data: urlData } = supabase.storage
          .from('frontones-fotos')
          .getPublicUrl(filePath)
        finalImagenUrl = urlData.publicUrl
      }
    }

    const datosMunicipio = {
      nombre: nuevoMunicipio.nombre.trim(),
      provincia_id: nuevoMunicipio.provincia_id,
      estado: nuevoMunicipio.estado,
      codigos_postales: nuevoMunicipio.codigos_postales,
      imagen_url: finalImagenUrl || null
    }

    let error = null
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
      if (error.message?.includes('column') || error.code === 'PGRST204') {
        const fallback = { ...datosMunicipio }
        delete (fallback as any).estado
        delete (fallback as any).imagen_url
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
      aviso += `\n\n⚠️ Atención: Este municipio tiene ${frontonesVinculados} frontón(es) y ${gestoresVinculados} gestor(es) vinculados. Si continúas, los frontones se eliminarán y los gestores quedarán desvinculados.`
    }

    if (!confirm(aviso)) return

    // 1. Desvincular perfiles asociados a este municipio
    await supabase.from('profiles').update({ municipio_id: null }).eq('municipio_id', mun.id)

    // 2. Eliminar frontones asociados
    await supabase.from('frontones').delete().eq('municipio_id', mun.id)

    // 3. Eliminar el municipio
    const { error } = await supabase
      .from('municipios')
      .delete()
      .eq('id', mun.id)

    if (error) {
      alert('Error al eliminar municipio: ' + error.message)
    } else {
      alert('Municipio eliminado correctamente.')
      setMunicipiosSeleccionados(prev => prev.filter(id => id !== mun.id))
      await cargarDatosGlobales()
    }
  }

  // ==========================================
  // GESTIÓN DE FRONTONES DEL MUNICIPIO
  // ==========================================
  const resetFormFronton = () => {
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
      solo_empadronados: false,
      tiene_sensor_iot: false,
      hardware_token: '',
      imagen_url: '',
      hora_apertura: '08:00',
      hora_cierre: '22:00',
      duracion_slot_minutos: 60,
      dias_antelacion_maxima: 7,
      max_reservas_activas: 1,
      habilitado: true
    })
    setArchivoImagenFronton(null)
    setFrontonEnEdicion(null)
    setMostrarFormFronton(false)
  }

  const handleIniciarCrearFronton = () => {
    resetFormFronton()
    setMostrarFormFronton(true)

    setTimeout(() => {
      const el = document.getElementById('formulario-fronton-edicion')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handleIniciarEditarFronton = (f: any) => {
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
      anchura: anchura ? String(anchura) : '',
      largura: largura ? String(largura) : '',
      cuadros: f.cuadros ? String(f.cuadros) : '',
      labur: f.labur ? String(f.labur) : '',
      luze: f.luze ? String(f.luze) : '',
      tiene_luz: !!f.tiene_luz,
      luz_pago: !!f.luz_pago,
      tiene_vestuarios: !!f.tiene_vestuarios,
      tiene_duchas: !!f.tiene_duchas,
      solo_empadronados: !!f.solo_empadronados,
      tiene_sensor_iot: !!f.tiene_sensor_iot,
      hardware_token: f.hardware_token || f.iot_token || '',
      imagen_url: f.imagen_url || '',
      hora_apertura: f.hora_apertura ? f.hora_apertura.slice(0, 5) : '08:00',
      hora_cierre: f.hora_cierre ? f.hora_cierre.slice(0, 5) : '22:00',
      duracion_slot_minutos: f.duracion_slot_minutos || 60,
      dias_antelacion_maxima: f.dias_antelacion_maxima || 7,
      max_reservas_activas: f.max_reservas_activas || 1,
      habilitado: f.habilitado !== false
    })
    setArchivoImagenFronton(null)
    setMostrarFormFronton(true)

    setTimeout(() => {
      const el = document.getElementById('formulario-fronton-edicion')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handleGuardarFronton = async (e: React.FormEvent, municipioId: string) => {
    e.preventDefault()
    if (!nuevoFronton.nombre.trim()) {
      alert('Por favor introduce el nombre del frontón.')
      return
    }

    setGuardandoFronton(true)
    let finalImageUrl = nuevoFronton.imagen_url

    if (archivoImagenFronton) {
      const fileExt = archivoImagenFronton.name.split('.').pop()
      const fileName = `fronton_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `frontones/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('frontones-fotos')
        .upload(filePath, archivoImagenFronton, { upsert: true, contentType: archivoImagenFronton.type })

      if (uploadError) {
        console.warn('Aviso al subir imagen de frontón:', uploadError)
      } else {
        const { data: urlData } = supabase.storage
          .from('frontones-fotos')
          .getPublicUrl(filePath)
        finalImageUrl = urlData.publicUrl
      }
    }

    const datosFronton: any = {
      nombre: nuevoFronton.nombre.trim(),
      municipio_id: municipioId,
      largura: nuevoFronton.largura || null,
      anchura: nuevoFronton.anchura || null,
      medidas: nuevoFronton.largura && nuevoFronton.anchura 
        ? `${nuevoFronton.largura}x${nuevoFronton.anchura} m` 
        : nuevoFronton.largura ? `${nuevoFronton.largura} m` : nuevoFronton.anchura ? `${nuevoFronton.anchura} m` : null,
      cuadros: nuevoFronton.cuadros || null,
      labur: nuevoFronton.labur || null,
      luze: nuevoFronton.luze || null,
      tiene_luz: nuevoFronton.tiene_luz,
      luz_pago: nuevoFronton.luz_pago,
      tiene_vestuarios: nuevoFronton.tiene_vestuarios,
      tiene_duchas: nuevoFronton.tiene_duchas,
      solo_empadronados: nuevoFronton.solo_empadronados,
      tiene_sensor_iot: nuevoFronton.tiene_sensor_iot,
      hardware_token: nuevoFronton.hardware_token || (nuevoFronton.tiene_sensor_iot ? `esp32-${Date.now().toString(36)}` : null),
      imagen_url: finalImageUrl || null,
      hora_apertura: nuevoFronton.hora_apertura,
      hora_cierre: nuevoFronton.hora_cierre,
      duracion_slot_minutos: Number(nuevoFronton.duracion_slot_minutos) || 60,
      dias_antelacion_maxima: Number(nuevoFronton.dias_antelacion_maxima) || 7,
      max_reservas_activas: Number(nuevoFronton.max_reservas_activas) || 1,
      habilitado: nuevoFronton.habilitado
    }

    let res
    if (frontonEnEdicion) {
      res = await supabase.from('frontones').update(datosFronton).eq('id', frontonEnEdicion.id)
    } else {
      res = await supabase.from('frontones').insert([datosFronton])
    }

    if (res.error) {
      console.warn('Aviso al guardar frontón:', res.error)
      if (res.error.message?.includes('column') || res.error.code === 'PGRST204' || res.error.message?.includes('uuid') || res.error.message?.includes('syntax')) {
        const fallback = { ...datosFronton }
        delete fallback.anchura
        delete fallback.largura
        delete fallback.labur
        delete fallback.luze
        delete fallback.habilitado
        if (res.error.message?.includes('uuid') || res.error.message?.includes('syntax')) {
          // Si hardware_token en la base de datos es de tipo UUID, omitirlo o usar null en el fallback
          delete fallback.hardware_token
        }
        let fallbackRes
        if (frontonEnEdicion) {
          fallbackRes = await supabase.from('frontones').update(fallback).eq('id', frontonEnEdicion.id)
        } else {
          fallbackRes = await supabase.from('frontones').insert([fallback])
        }

        if (fallbackRes.error) {
          alert('Error al guardar frontón: ' + fallbackRes.error.message)
          setGuardandoFronton(false)
          return
        }
      } else {
        alert('Error al guardar frontón: ' + res.error.message)
        setGuardandoFronton(false)
        return
      }
    }

    alert(`Frontón "${nuevoFronton.nombre}" guardado correctamente.`)
    setGuardandoFronton(false)
    resetFormFronton()
    await cargarDatosGlobales()

    setTimeout(() => {
      const el = document.getElementById('seccion-frontones-municipio') || document.getElementById('formulario-municipio-edicion')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 150)
  }

  const handleEliminarFronton = async (f: any) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el frontón "${f.nombre}"? Esta acción borrará el frontón y sus reservas.`)) {
      return
    }

    // 1. Eliminar reservas asociadas
    await supabase.from('reservas').delete().eq('fronton_id', f.id)

    // 2. Eliminar telemetría si existiera
    await supabase.from('telemetria_iot').delete().eq('fronton_id', f.id)

    // 3. Eliminar frontón
    const { error } = await supabase.from('frontones').delete().eq('id', f.id)
    if (error) {
      alert('Error al eliminar frontón: ' + error.message)
    } else {
      alert(`Frontón "${f.nombre}" eliminado correctamente.`)
      resetFormFronton()
      await cargarDatosGlobales()

      setTimeout(() => {
        const el = document.getElementById('seccion-frontones-municipio') || document.getElementById('formulario-municipio-edicion')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 150)
    }
  }

  // ACCIONES EN LOTE PARA MUNICIPIOS
  const handleToggleSeleccionarMunicipio = (id: string) => {
    setMunicipiosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleToggleSeleccionarTodos = () => {
    const todosFiltradosIds = municipiosFiltrados.map(m => m.id)
    const todosSeleccionados = todosFiltradosIds.length > 0 && todosFiltradosIds.every(id => municipiosSeleccionados.includes(id))

    if (todosSeleccionados) {
      setMunicipiosSeleccionados(prev => prev.filter(id => !todosFiltradosIds.includes(id)))
    } else {
      setMunicipiosSeleccionados(prev => Array.from(new Set([...prev, ...todosFiltradosIds])))
    }
  }

  const handleCambiarEstadoLote = async (nuevoEstado: 'activo' | 'en_pruebas' | 'inactivo') => {
    if (municipiosSeleccionados.length === 0) return

    setEjecutandoAccionLote(true)
    const { error } = await supabase
      .from('municipios')
      .update({ estado: nuevoEstado })
      .in('id', municipiosSeleccionados)

    if (error) {
      alert('Error al actualizar municipios en lote: ' + error.message)
    } else {
      alert(`Se han actualizado ${municipiosSeleccionados.length} municipio(s) a "${nuevoEstado}".`)
      setMunicipiosSeleccionados([])
      await cargarDatosGlobales()
    }
    setEjecutandoAccionLote(false)
  }

  const handleEliminarLote = async () => {
    if (municipiosSeleccionados.length === 0) return

    if (!confirm(`¿Estás seguro de que deseas eliminar los ${municipiosSeleccionados.length} municipios seleccionados?\n\n⚠️ Esta acción eliminará los municipios y sus frontones asociados, y desvinculará a los gestores.`)) {
      return
    }

    setEjecutandoAccionLote(true)

    // 1. Desvincular gestores
    await supabase.from('profiles').update({ municipio_id: null }).in('municipio_id', municipiosSeleccionados)

    // 2. Eliminar frontones asociados
    await supabase.from('frontones').delete().in('municipio_id', municipiosSeleccionados)

    // 3. Eliminar municipios
    const { error } = await supabase
      .from('municipios')
      .delete()
      .in('id', municipiosSeleccionados)

    if (error) {
      alert('Error al eliminar municipios seleccionados: ' + error.message)
    } else {
      alert(`Se han eliminado ${municipiosSeleccionados.length} municipio(s) correctamente.`)
      setMunicipiosSeleccionados([])
      await cargarDatosGlobales()
    }
    setEjecutandoAccionLote(false)
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

    // 1. Crear usuario en Auth mediante cliente aislado sin persistencia de sesión
    const { data: authData, error: authError } = await authSignUpClient.auth.signUp({
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
      alert('Error al crear cuenta en Supabase Auth: ' + authError.message)
      setGuardandoGestor(false)
      return
    }

    const userId = authData?.user?.id

    if (userId) {
      // 2. Insertar o actualizar perfil en la tabla profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: nuevoGestor.email.trim(),
        nombre: nuevoGestor.nombre.trim(),
        apellidos: nuevoGestor.apellidos.trim(),
        nombre_completo: nombreCompleto,
        role: 'gestor_municipio',
        municipio_id: nuevoGestor.municipio_id || null,
        estado_aprobacion: 'aprobado'
      })

      if (profileError) {
        console.error('Aviso al insertar perfil de gestor:', profileError)
        // Intento directo por email si el id ya existía
        await supabase
          .from('profiles')
          .update({
            role: 'gestor_municipio',
            municipio_id: nuevoGestor.municipio_id || null,
            nombre: nuevoGestor.nombre.trim(),
            apellidos: nuevoGestor.apellidos.trim(),
            nombre_completo: nombreCompleto,
            estado_aprobacion: 'aprobado'
          })
          .eq('email', nuevoGestor.email.trim())
      }
    } else {
      // Si ya existía el usuario en Auth, actualizamos su rol en profiles
      await supabase
        .from('profiles')
        .update({
          role: 'gestor_municipio',
          municipio_id: nuevoGestor.municipio_id || null,
          nombre: nuevoGestor.nombre.trim(),
          apellidos: nuevoGestor.apellidos.trim(),
          nombre_completo: nombreCompleto,
          estado_aprobacion: 'aprobado'
        })
        .eq('email', nuevoGestor.email.trim())
    }

    alert(`¡Gestor "${nombreCompleto}" dado de alta y activado con éxito!`)
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

  const handleAprobarGestor = async (gestor: any) => {
    if (!confirm(`¿Aprobar y activar la solicitud de "${gestor.nombre_completo || gestor.email}" como Gestor Municipal?`)) {
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ estado_aprobacion: 'aprobado', role: 'gestor_municipio' })
      .eq('id', gestor.id)

    if (error) {
      alert('Error al aprobar gestor: ' + error.message)
    } else {
      alert(`Gestor "${gestor.nombre_completo || gestor.email}" aprobado y activado correctamente.`)
      await cargarDatosGlobales()
    }
  }

  const handleRechazarGestor = async (gestor: any) => {
    if (!confirm(`¿Rechazar / pausar la solicitud de "${gestor.nombre_completo || gestor.email}"? No tendrá acceso al panel.`)) {
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ estado_aprobacion: 'rechazado' })
      .eq('id', gestor.id)

    if (error) {
      alert('Error al rechazar gestor: ' + error.message)
    } else {
      alert(`Solicitud rechazada correctamente.`)
      await cargarDatosGlobales()
    }
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
      .update({ role: nuevoRol, estado_aprobacion: nuevoRol === 'gestor_municipio' ? 'aprobado' : undefined })
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

  const handleEliminarProvincia = async (prov: any) => {
    const munDeProv = municipios.filter(m => m.provincia_id === prov.id)
    const munIds = munDeProv.map(m => m.id)

    let aviso = `¿Estás seguro de que deseas eliminar la provincia "${prov.nombre}"?`
    if (munDeProv.length > 0) {
      aviso += `\n\n⚠️ ¡ATENCIÓN!: Se eliminarán también los ${munDeProv.length} municipio(s) asociados a esta provincia y todos sus frontones, y se desvincularán los gestores.`
    }

    if (!confirm(aviso)) return

    if (munIds.length > 0) {
      // 1. Desvincular gestores
      await supabase.from('profiles').update({ municipio_id: null }).in('municipio_id', munIds)

      // 2. Eliminar frontones asociados
      await supabase.from('frontones').delete().in('municipio_id', munIds)

      // 3. Eliminar municipios asociados
      const { error: munErr } = await supabase.from('municipios').delete().in('id', munIds)
      if (munErr) {
        alert('Error al eliminar los municipios de la provincia: ' + munErr.message)
        return
      }
    }

    // 4. Eliminar la provincia
    const { error: provErr } = await supabase
      .from('provincias')
      .delete()
      .eq('id', prov.id)

    if (provErr) {
      alert('Error al eliminar provincia: ' + provErr.message)
    } else {
      alert(`Provincia "${prov.nombre}" y sus municipios asociados eliminados correctamente.`)
      await cargarDatosGlobales()
    }
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
    const estadoAprobacion = g.estado_aprobacion || 'aprobado'
    const coincideEstado = filtroEstadoAprobacionGestor === 'todos' || estadoAprobacion === filtroEstadoAprobacionGestor
    return coincideTexto && coincideMun && coincideEstado
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
              <div id="formulario-municipio-edicion" className="bg-stone-900 p-6 rounded-3xl border border-stone-800 space-y-4 shadow-xl animate-in fade-in duration-150">
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
                      {guardandoMunicipio ? 'Guardando...' : municipioEnEdicion ? 'Actualizar Datos del Municipio' : 'Crear Municipio'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setMostrarFormMunicipio(false)
                        resetFormMunicipio()
                        resetFormFronton()
                      }}
                      className="bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Cerrar
                    </button>
                  </div>
                </form>

                {/* GESTIÓN DE FRONTONES DEL MUNICIPIO */}
                {municipioEnEdicion && (
                  <div id="seccion-frontones-municipio" className="border-t border-stone-800 pt-6 mt-6 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>🏟️</span> Frontones de {municipioEnEdicion.nombre}
                          <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            {frontones.filter(f => f.municipio_id === municipioEnEdicion.id).length}
                          </span>
                        </h4>
                        <p className="text-xs text-stone-400">Edita los frontones existentes, añade nuevos o elimina instalaciones de este municipio</p>
                      </div>

                      {!mostrarFormFronton && (
                        <button
                          type="button"
                          onClick={handleIniciarCrearFronton}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <span>+</span> Añadir Nuevo Frontón
                        </button>
                      )}
                    </div>

                    {/* FORMULARIO CREAR / EDITAR FRONTÓN */}
                    {mostrarFormFronton && (
                      <div id="formulario-fronton-edicion" className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                          <h5 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">
                            {frontonEnEdicion ? `Editar Frontón: ${frontonEnEdicion.nombre}` : 'Crear Nuevo Frontón'}
                          </h5>
                          <button
                            type="button"
                            onClick={resetFormFronton}
                            className="text-stone-400 hover:text-white font-bold text-xs"
                          >
                            ✕ Cancelar
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nombre del Frontón *</label>
                              <input
                                type="text"
                                required
                                value={nuevoFronton.nombre}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, nombre: e.target.value })}
                                placeholder="ej. Frontón Municipal Uarkape"
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Largura (m)</label>
                              <input
                                type="text"
                                value={nuevoFronton.largura}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, largura: e.target.value })}
                                placeholder="ej. 36"
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Anchura (m)</label>
                              <input
                                type="text"
                                value={nuevoFronton.anchura}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, anchura: e.target.value })}
                                placeholder="ej. 10"
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Hora Apertura</label>
                              <input
                                type="time"
                                value={nuevoFronton.hora_apertura}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, hora_apertura: e.target.value })}
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Hora Cierre</label>
                              <input
                                type="time"
                                value={nuevoFronton.hora_cierre}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, hora_cierre: e.target.value })}
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Duración Slot (minutos)</label>
                              <input
                                type="number"
                                min={30}
                                step={15}
                                value={nuevoFronton.duracion_slot_minutos}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, duracion_slot_minutos: Number(e.target.value) })}
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Antelación Máx. (días)</label>
                              <input
                                type="number"
                                min={1}
                                value={nuevoFronton.dias_antelacion_maxima}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, dias_antelacion_maxima: Number(e.target.value) })}
                                className="w-full p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* SERVICIOS Y EQUIPAMIENTO */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                            <label className="flex items-center gap-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.tiene_luz}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, tiene_luz: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>💡 Tiene Luz</span>
                            </label>

                            <label className="flex items-center gap-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.luz_pago}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, luz_pago: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>💳 Luz de Pago</span>
                            </label>

                            <label className="flex items-center gap-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.tiene_vestuarios}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, tiene_vestuarios: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>🚪 Vestuarios</span>
                            </label>

                            <label className="flex items-center gap-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.tiene_duchas}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, tiene_duchas: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>🚿 Duchas</span>
                            </label>

                            <label className="flex items-center gap-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.solo_empadronados}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, solo_empadronados: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>👥 Solo Empadronados</span>
                            </label>

                            <label className="flex items-center gap-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.habilitado}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, habilitado: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>🟢 Habilitado</span>
                            </label>
                          </div>

                          {/* SENSOR IOT Y TOKEN */}
                          <div className="p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-stone-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={nuevoFronton.tiene_sensor_iot}
                                onChange={(e) => setNuevoFronton({ ...nuevoFronton, tiene_sensor_iot: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-0"
                              />
                              <span>📡 Equipado con Sensor de Presencia IoT (ESP32)</span>
                            </label>

                            {nuevoFronton.tiene_sensor_iot && (
                              <div>
                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Token ESP32 (Opcional, se genera automáticamente)</label>
                                <input
                                  type="text"
                                  value={nuevoFronton.hardware_token}
                                  onChange={(e) => setNuevoFronton({ ...nuevoFronton, hardware_token: e.target.value })}
                                  placeholder="esp32-xxxx..."
                                  className="w-full p-2 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-stone-300 focus:border-emerald-500 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>

                          {/* IMAGEN DEL FRONTÓN */}
                          <div>
                            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Foto del Frontón</label>
                            {(archivoImagenFronton || nuevoFronton.imagen_url) && (
                              <div className="flex items-center gap-3 mb-2 p-2.5 bg-stone-900 rounded-xl border border-stone-800">
                                <img
                                  src={archivoImagenFronton ? URL.createObjectURL(archivoImagenFronton) : nuevoFronton.imagen_url}
                                  alt="Frontón"
                                  className="w-14 h-14 object-cover rounded-xl border border-stone-700 bg-stone-950"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNuevoFronton({ ...nuevoFronton, imagen_url: '' })
                                    setArchivoImagenFronton(null)
                                  }}
                                  className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                                >
                                  Quitar foto
                                </button>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setArchivoImagenFronton(e.target.files[0])
                                }
                              }}
                              className="w-full text-xs text-stone-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              disabled={guardandoFronton}
                              onClick={(e) => handleGuardarFronton(e, municipioEnEdicion.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl text-xs font-bold transition disabled:bg-stone-800 shadow-sm"
                            >
                              {guardandoFronton ? 'Guardando Frontón...' : frontonEnEdicion ? 'Actualizar Frontón' : 'Guardar Nuevo Frontón'}
                            </button>
                            <button
                              type="button"
                              onClick={resetFormFronton}
                              className="bg-stone-900 hover:bg-stone-800 text-stone-300 px-4 py-2.5 rounded-xl text-xs font-bold border border-stone-800"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LISTA DE FRONTONES DEL MUNICIPIO */}
                    <div className="space-y-2">
                      {frontones.filter(f => f.municipio_id === municipioEnEdicion.id).length === 0 ? (
                        <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800/80 text-center text-xs text-stone-500 italic">
                          Este municipio no tiene frontones registrados todavía. Pulsa "+ Añadir Nuevo Frontón" para crear uno.
                        </div>
                      ) : (
                        frontones.filter(f => f.municipio_id === municipioEnEdicion.id).map(f => (
                          <div
                            key={f.id}
                            className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex items-center justify-between gap-3 hover:border-stone-700 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {f.imagen_url ? (
                                <img src={f.imagen_url} alt="" className="w-10 h-10 object-cover rounded-xl border border-stone-800 bg-stone-900 flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-base flex-shrink-0">
                                  🎾
                                </div>
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h6 className="font-bold text-xs text-white truncate">{f.nombre}</h6>
                                  {f.medidas && (
                                    <span className="text-[10px] text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                                      {f.medidas}
                                    </span>
                                  )}
                                  {f.tiene_sensor_iot && (
                                    <span className="text-[10px] text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/60 font-bold">
                                      📡 IoT
                                    </span>
                                  )}
                                  {f.tiene_luz && (
                                    <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60 font-bold">
                                      💡 Luz
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-500">
                                  Horario: {f.hora_apertura?.slice(0, 5)} - {f.hora_cierre?.slice(0, 5)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleIniciarEditarFronton(f)}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarFronton(f)}
                                className="bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                title="Eliminar frontón"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BARRA DE SELECCIÓN Y ACCIONES EN LOTE */}
            <div className="flex items-center justify-between bg-stone-900 border border-stone-800 p-3 px-4 rounded-2xl gap-3 flex-wrap shadow-sm">
              <label className="flex items-center gap-2.5 text-xs font-bold text-stone-300 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={municipiosFiltrados.length > 0 && municipiosFiltrados.every(m => municipiosSeleccionados.includes(m.id))}
                  onChange={handleToggleSeleccionarTodos}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span>
                  Seleccionar todos los filtrados ({municipiosFiltrados.length})
                </span>
              </label>

              {municipiosSeleccionados.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-xl">
                    {municipiosSeleccionados.length} seleccionados
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleCambiarEstadoLote('activo')}
                      disabled={ejecutandoAccionLote}
                      className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      🟢 Pasar a Activo
                    </button>
                    <button
                      onClick={() => handleCambiarEstadoLote('en_pruebas')}
                      disabled={ejecutandoAccionLote}
                      className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      🟡 Pasar a En pruebas
                    </button>
                    <button
                      onClick={() => handleCambiarEstadoLote('inactivo')}
                      disabled={ejecutandoAccionLote}
                      className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      🔴 Pasar a Inactivo
                    </button>
                    <button
                      onClick={handleEliminarLote}
                      disabled={ejecutandoAccionLote}
                      className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Eliminar municipios seleccionados"
                    >
                      🗑️ Borrar ({municipiosSeleccionados.length})
                    </button>
                    <button
                      onClick={() => setMunicipiosSeleccionados([])}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white px-2.5 py-1 rounded-xl text-xs font-bold transition"
                      title="Deseleccionar todos"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* LISTADO DE MUNICIPIOS (ANCHO COMPLETO) */}
            <div className="space-y-3 w-full">
              {municipiosFiltrados.map((mun) => {
                const estado = mun.estado || 'activo'
                const frontonesDelMun = frontones.filter(f => f.municipio_id === mun.id)
                const gestoresDelMun = gestores.filter(g => g.municipio_id === mun.id)
                const estaSeleccionado = municipiosSeleccionados.includes(mun.id)

                return (
                  <div 
                    key={mun.id} 
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition w-full group ${
                      estaSeleccionado 
                        ? 'bg-stone-900/95 border-emerald-500/60 ring-1 ring-emerald-500/30' 
                        : 'bg-stone-900 border-stone-800/80 hover:border-stone-700'
                    }`}
                  >
                    {/* IZQUIERDA: CASILLA + ESCUDO + DATOS PRINCIPALES */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <input 
                        type="checkbox"
                        checked={estaSeleccionado}
                        onChange={() => handleToggleSeleccionarMunicipio(mun.id)}
                        className="w-4 h-4 mt-1 sm:mt-0 rounded text-emerald-600 focus:ring-0 cursor-pointer flex-shrink-0"
                      />

                      {mun.imagen_url ? (
                        <img src={mun.imagen_url} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-2xl border border-stone-800 bg-stone-950 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-xl flex-shrink-0">
                          🏛️
                        </div>
                      )}
                      
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition tracking-tight">
                            {mun.nombre}
                          </h4>
                          <span className="text-xs text-stone-400 font-semibold bg-stone-950 px-2.5 py-0.5 rounded-lg border border-stone-800">
                            {mun.provincias?.nombre || 'Sin provincia'}
                          </span>
                        </div>

                        {/* CÓDIGOS POSTALES */}
                        {mun.codigos_postales && mun.codigos_postales.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {mun.codigos_postales.map((cp: string) => (
                              <span key={cp} className="bg-stone-800/80 text-stone-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-stone-700/50">
                                {cp}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-500 italic block">Sin códigos postales configurados</span>
                        )}
                      </div>
                    </div>

                    {/* CENTRO: MÉTRICAS RÁPIDAS (FRONTONES Y GESTORES) */}
                    <div className="flex items-center gap-3 flex-wrap text-xs self-stretch sm:self-auto justify-start sm:justify-center">
                      <div className="bg-stone-950 px-3.5 py-2 rounded-xl border border-stone-800 flex items-center gap-2">
                        <span className="text-stone-400 font-bold">🎾 Frontones:</span>
                        <span className="font-extrabold text-white">{frontonesDelMun.length}</span>
                      </div>
                      <div className="bg-stone-950 px-3.5 py-2 rounded-xl border border-stone-800 flex items-center gap-2">
                        <span className="text-stone-400 font-bold">👤 Gestores:</span>
                        <span className="font-extrabold text-white">{gestoresDelMun.length}</span>
                      </div>
                    </div>

                    {/* DERECHA: ESTADO + BOTONES DE ACCIÓN */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-800/80">
                      {/* SELECTOR RÁPIDO DE ESTADO */}
                      <select 
                        value={estado}
                        onChange={(e) => handleCambiarEstadoMunicipio(mun, e.target.value as any)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition cursor-pointer ${
                          estado === 'activo'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : estado === 'en_pruebas'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : 'bg-rose-950/60 text-rose-300 border-rose-800'
                        }`}
                      >
                        <option value="activo">🟢 Activo</option>
                        <option value="en_pruebas">🟡 En pruebas</option>
                        <option value="inactivo">🔴 Inactivo</option>
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleIniciarEdicionMunicipio(mun)}
                          className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleEliminarMunicipio(mun)}
                          className="bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                          title="Eliminar municipio"
                        >
                          🗑️
                        </button>
                      </div>
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
                <select 
                  value={filtroEstadoAprobacionGestor} 
                  onChange={(e) => setFiltroEstadoAprobacionGestor(e.target.value as any)}
                  className="p-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">🟡 Pendientes de Aprobación</option>
                  <option value="aprobado">🟢 Aprobados / Activos</option>
                  <option value="rechazado">🔴 Rechazados</option>
                </select>
              </div>

              <button 
                onClick={() => setMostrarFormGestor(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <span>+</span> Dar de Alta Gestor
              </button>
            </div>

            {/* BANNER DE SOLICITUDES PENDIENTES */}
            {gestores.filter(g => g.estado_aprobacion === 'pendiente').length > 0 && (
              <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <h4 className="font-bold text-xs text-amber-200 uppercase tracking-wider">
                      Solicitudes de Gestores Pendientes
                    </h4>
                    <p className="text-xs text-stone-300">
                      Hay <strong className="text-amber-400">{gestores.filter(g => g.estado_aprobacion === 'pendiente').length}</strong> solicitud(es) de registro esperando validación.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFiltroEstadoAprobacionGestor('pendiente')}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap"
                >
                  Ver Pendientes
                </button>
              </div>
            )}

            {/* FORMULARIO DAR DE ALTA GESTOR */}
            {mostrarFormGestor && (
              <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800 space-y-4 shadow-xl animate-in fade-in duration-150">
                <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                  <h3 className="font-bold text-base text-white">Alta de Nuevo Gestor Municipal (Directa)</h3>
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
                      {guardandoGestor ? 'Creando cuenta...' : 'Dar de Alta y Activar'}
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
                      <th className="p-4">Estado / Validación</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {gestoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                          No se encontraron gestores municipales registrados con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      gestoresFiltrados.map((g) => {
                        const munObj = g.municipios || municipios.find(m => m.id === g.municipio_id)
                        const tieneMunicipio = !!munObj
                        const estadoAprobacion = g.estado_aprobacion || 'aprobado'

                        return (
                          <tr key={g.id} className="hover:bg-stone-800/40 transition">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs ${
                                  estadoAprobacion === 'pendiente'
                                    ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                                    : estadoAprobacion === 'rechazado'
                                      ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                                      : 'bg-teal-950/60 border-teal-800/60 text-teal-300'
                                }`}>
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
                                  🏛️ {munObj.nombre}
                                </span>
                              ) : (
                                <span className="bg-rose-950/40 text-rose-300 border border-rose-800/50 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                  Sin municipio asignado
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              {estadoAprobacion === 'pendiente' ? (
                                <span className="bg-amber-950/70 text-amber-300 border border-amber-700/60 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 animate-pulse">
                                  🟡 Pendiente de Aprobación
                                </span>
                              ) : estadoAprobacion === 'rechazado' ? (
                                <span className="bg-rose-950/70 text-rose-300 border border-rose-700/60 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                  🔴 Rechazado / Inactivo
                                </span>
                              ) : (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                  🟢 Aprobado / Activo
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {estadoAprobacion === 'pendiente' && (
                                  <>
                                    <button 
                                      onClick={() => handleAprobarGestor(g)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
                                      title="Aprobar solicitud y activar acceso"
                                    >
                                      ✅ Aprobar
                                    </button>
                                    <button 
                                      onClick={() => handleRechazarGestor(g)}
                                      className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                      title="Rechazar solicitud"
                                    >
                                      ❌ Rechazar
                                    </button>
                                  </>
                                )}

                                {estadoAprobacion === 'rechazado' && (
                                  <button 
                                    onClick={() => handleAprobarGestor(g)}
                                    className="bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                                    title="Reactivar y aprobar gestor"
                                  >
                                    ✅ Reactivar
                                  </button>
                                )}

                                <button 
                                  onClick={() => {
                                    setGestorParaReasignar(g)
                                    setMunicipioReasignadoId(g.municipio_id || '')
                                  }}
                                  className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                                >
                                  Reasignar
                                </button>
                                <button 
                                  onClick={() => handleResetPasswordEmail(g.email)}
                                  className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                  title="Enviar email de reseteo de contraseña"
                                >
                                  🔑
                                </button>
                                {estadoAprobacion === 'aprobado' && (
                                  <button 
                                    onClick={() => handleRechazarGestor(g)}
                                    className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                    title="Pausar o deshabilitar gestor"
                                  >
                                    Pausar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
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

            {/* LISTADO DE HARDWARE IOT (ANCHO COMPLETO) */}
            <div className="space-y-3 w-full">
              {frontonesIotFiltrados.length === 0 ? (
                <div className="bg-stone-900 p-8 rounded-3xl border border-stone-800 text-center text-stone-500 italic">
                  No se encontraron frontones con sensor IoT con los filtros actuales.
                </div>
              ) : (
                frontonesIotFiltrados.map((f) => {
                  const token = f.hardware_token || f.iot_token || `esp32-${f.id.slice(0, 8)}`
                  return (
                    <div 
                      key={f.id}
                      className="bg-stone-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-800/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:border-stone-700 transition w-full group"
                    >
                      {/* IZQUIERDA: DATOS DEL FRONTÓN Y ESTADO */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-xl flex-shrink-0">
                          📡
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition tracking-tight">
                              {f.nombre}
                            </h4>
                            <span className="text-xs text-stone-400 font-semibold bg-stone-950 px-2.5 py-0.5 rounded-lg border border-stone-800">
                              🏛️ {f.municipios?.nombre || 'Sin municipio'}
                            </span>
                            {/* ESTADO TIEMPO REAL */}
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${
                              f.en_uso
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${f.en_uso ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`}></span>
                              {f.en_uso ? 'En uso (Presencia detectada)' : 'Libre'}
                            </span>
                          </div>

                          <p className="text-xs text-stone-500">
                            Horario de apertura: <span className="text-stone-300 font-bold">{f.hora_apertura?.slice(0,5)} - {f.hora_cierre?.slice(0,5)}</span>
                          </p>
                        </div>
                      </div>

                      {/* CENTRO: TOKEN ESP32 */}
                      <div className="bg-stone-950 px-3.5 py-2 rounded-2xl border border-stone-800 flex items-center gap-2 w-full lg:w-auto min-w-[280px]">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
                          ESP32:
                        </span>
                        <input 
                          type="text" 
                          readOnly 
                          value={token}
                          className="bg-stone-900 border border-stone-800 text-stone-300 font-mono text-xs px-2.5 py-1 rounded-xl flex-1 select-all"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(token)
                            alert('Token copiado al portapapeles.')
                          }}
                          className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-2.5 py-1 rounded-xl text-xs font-bold transition flex-shrink-0"
                          title="Copiar token"
                        >
                          📋 Copiar
                        </button>
                      </div>

                      {/* DERECHA: BOTONES DE ACCIÓN */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-800/80 flex-shrink-0">
                        <button 
                          onClick={() => abrirGraficaIoT(f)}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                        >
                          📊 Telemetría por Franjas
                        </button>

                        <button 
                          onClick={() => handleRegenerarHardwareToken(f)}
                          className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                        >
                          🔄 Regenerar Token
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {provincias.length === 0 ? (
                <div className="col-span-full bg-stone-900 p-8 rounded-3xl border border-stone-800 text-center text-stone-500 italic">
                  No hay provincias registradas.
                </div>
              ) : (
                provincias.map((p) => {
                  const munDeProv = municipios.filter(m => m.provincia_id === p.id)
                  return (
                    <div key={p.id} className="bg-stone-900 p-5 rounded-3xl border border-stone-800/80 shadow-sm flex items-center justify-between gap-3 hover:border-stone-700 transition group">
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-base text-white group-hover:text-emerald-400 transition truncate">{p.nombre}</h4>
                        <span className="bg-stone-950 text-stone-300 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-stone-800 inline-block">
                          {munDeProv.length} municipio(s)
                        </span>
                      </div>

                      <button 
                        onClick={() => handleEliminarProvincia(p)}
                        className="bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 p-2.5 rounded-2xl text-xs font-bold transition shadow-2xs flex-shrink-0 flex items-center gap-1"
                        title="Eliminar provincia y sus municipios"
                      >
                        <span>🗑️</span>
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  )
                })
              )}
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
