'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatShortDateWithTime } from '@/lib/dateUtils'

export interface FrontonForumMessage {
  id: string
  fronton_id: string
  user_id: string
  user_name: string
  user_email?: string
  user_role?: string
  mensaje: string
  created_at: string
}

interface FrontonForumModalProps {
  fronton: any | null
  isOpen: boolean
  onClose: () => void
  user: any
  lang: 'es' | 'eu' | 'en' | 'fr'
  t: any
}

export default function FrontonForumModal({
  fronton,
  isOpen,
  onClose,
  user,
  lang,
  t,
}: FrontonForumModalProps) {
  const [mensajes, setMensajes] = useState<FrontonForumMessage[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [vaciandoForo, setVaciandoForo] = useState(false)
  const [userEmailsMap, setUserEmailsMap] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && fronton?.id) {
      cargarMensajes(fronton.id)

      // Suscribirse en tiempo real a nuevos mensajes si Supabase Realtime está disponible
      const channel = supabase
        .channel(`foro_fronton_${fronton.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes_foro_fronton',
            filter: `fronton_id=eq.${fronton.id}`,
          },
          (payload) => {
            const nuevo = payload.new as FrontonForumMessage
            setMensajes((prev) => {
              if (prev.some((m) => m.id === nuevo.id)) return prev
              return [...prev, nuevo]
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'mensajes_foro_fronton',
            filter: `fronton_id=eq.${fronton.id}`,
          },
          (payload) => {
            const deletedId = (payload.old as any)?.id
            if (deletedId) {
              setMensajes((prev) => prev.filter((m) => m.id !== deletedId))
            } else {
              // Si fue un borrado masivo sin id específico en old, recargamos
              cargarMensajes(fronton.id)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, fronton?.id])

  useEffect(() => {
    if (mensajes.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes])

  const cargarMensajes = async (frontonId: string) => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('mensajes_foro_fronton')
        .select('*')
        .eq('fronton_id', frontonId)
        .order('created_at', { ascending: true })

      if (error) {
        // Si la tabla aún no se ha creado en Supabase, mostramos aviso claro en consola
        console.warn('Error cargando mensajes del foro:', error.message)
      } else if (data) {
        setMensajes(data)

        // Obtener los emails de los perfiles de los autores si es gestor/admin
        const userIds = Array.from(new Set(data.map((m: any) => m.user_id).filter(Boolean)))
        if (userIds.length > 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, email')
              .in('id', userIds)

            if (profs && profs.length > 0) {
              const map: Record<string, string> = {}
              profs.forEach((p: any) => {
                if (p.id && p.email) map[p.id] = p.email
              })
              setUserEmailsMap(prev => ({ ...prev, ...map }))
            }
          } catch (e) {
            console.warn('Aviso obteniendo emails de autores:', e)
          }
        }
      }
    } catch (err: any) {
      console.error('Error al consultar mensajes de foro:', err)
    } finally {
      setCargando(false)
    }
  }

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoMensaje.trim() || !fronton?.id || !user) return

    setEnviando(true)
    const texto = nuevoMensaje.trim()

    // Determinamos el nombre visible del autor
    const profile = user.profile || {}
    const meta = user.user_metadata || {}
    const nombre =
      profile.nombre_completo ||
      meta.nombre_completo ||
      `${profile.nombre || meta.nombre || ''} ${profile.apellidos || meta.apellidos || ''}`.trim() ||
      user.email?.split('@')[0] ||
      'Usuario'

    const rol = profile.role || meta.role || 'usuario'
    const email = user.email || profile.email || meta.email || null

    const payload: any = {
      fronton_id: fronton.id,
      user_id: user.id,
      user_name: nombre,
      user_role: rol,
      mensaje: texto,
    }

    if (email) {
      payload.user_email = email
    }

    try {
      let { data, error } = await supabase
        .from('mensajes_foro_fronton')
        .insert([payload])
        .select()

      if (error && error.message?.includes('user_email')) {
        // Fallback si la columna user_email aún no fue añadida en Supabase
        delete payload.user_email
        const retry = await supabase
          .from('mensajes_foro_fronton')
          .insert([payload])
          .select()
        data = retry.data
        error = retry.error
      }

      if (error) {
        alert('No se pudo enviar el mensaje: ' + error.message)
      } else {
        setNuevoMensaje('')
        if (data && data.length > 0) {
          const inserted = data[0] as FrontonForumMessage
          setMensajes((prev) => {
            if (prev.some((m) => m.id === inserted.id)) return prev
            return [...prev, inserted]
          })
          if (email) {
            setUserEmailsMap((prev) => ({ ...prev, [user.id]: email }))
          }
        }
      }
    } catch (err: any) {
      alert('Error al enviar el mensaje: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminarMensaje = async (mensajeId: string) => {
    const confirmacion = window.confirm(t.reservas?.forum_delete_message_confirm || '¿Estás seguro de que deseas eliminar este mensaje del foro?')
    if (!confirmacion) return

    setEliminandoId(mensajeId)
    try {
      const { error } = await supabase
        .from('mensajes_foro_fronton')
        .delete()
        .eq('id', mensajeId)

      if (error) {
        alert('Error al eliminar mensaje: ' + error.message)
      } else {
        setMensajes((prev) => prev.filter((m) => m.id !== mensajeId))
      }
    } catch (err: any) {
      alert('Error al eliminar mensaje: ' + err.message)
    } finally {
      setEliminandoId(null)
    }
  }

  const handleVaciarForoCompleto = async () => {
    if (!fronton?.id) return
    const confirmacion = window.confirm(
      t.reservas?.forum_clear_all_confirm || '¿Estás seguro de que deseas eliminar TODOS los mensajes de este foro? Esta acción no se puede deshacer.'
    )
    if (!confirmacion) return

    setVaciandoForo(true)
    try {
      const { error } = await supabase
        .from('mensajes_foro_fronton')
        .delete()
        .eq('fronton_id', fronton.id)

      if (error) {
        alert('Error al vaciar el foro: ' + error.message)
      } else {
        setMensajes([])
      }
    } catch (err: any) {
      alert('Error al vaciar el foro: ' + err.message)
    } finally {
      setVaciandoForo(false)
    }
  }

  const handleEnviarEmailUsuario = (msg: FrontonForumMessage) => {
    const emailDestino = msg.user_email || userEmailsMap[msg.user_id]
    if (!emailDestino) {
      alert(t.reservas?.forum_user_email_not_available || 'El correo electrónico de este usuario no está disponible.')
      return
    }

    const asunto = encodeURIComponent(`Consulta desde el Foro del Frontón ${fronton?.nombre || ''}`)
    const cuerpo = encodeURIComponent(`Hola ${msg.user_name || 'usuario'},\n\nNos ponemos en contacto contigo respecto a tu mensaje en el foro del frontón "${fronton?.nombre || ''}":\n\n"${msg.mensaje}"\n\n---\nGestión Municipal de Frontones`)
    window.location.href = `mailto:${emailDestino}?subject=${asunto}&body=${cuerpo}`
  }

  if (!isOpen || !fronton) return null

  const esGestorOAdmin = (rol?: string) => rol === 'admin' || rol === 'gestor_municipio'

  // El usuario actual es gestor del frontón si es admin o gestor municipal de este municipio
  const userRole = user?.profile?.role || user?.user_metadata?.role || user?.role || ''
  const userMunicipioId = user?.profile?.municipio_id || user?.user_metadata?.municipio_id || user?.municipio_id || ''
  const esGestorDelFronton = userRole === 'admin' || (userRole === 'gestor_municipio' && (!userMunicipioId || !fronton.municipio_id || userMunicipioId === fronton.municipio_id))

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl h-[85vh] max-h-[720px] shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* CABECERA */}
        <div className="p-4 sm:p-5 border-b border-stone-150 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xl font-black shadow-inner border border-emerald-200/50 dark:border-emerald-800/50 flex-shrink-0">
              💬
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-stone-900 dark:text-stone-100 truncate">
                  {t.reservas?.forum_title || 'Foro del Frontón'}: {fronton.nombre}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {fronton.municipios?.nombre || 'Comunidad'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {t.reservas?.forum_desc || 'Espacio de chat público entre usuarios y gestores municipales'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* BOTÓN PARA GESTOR: VACIAR TODO EL FORO */}
            {esGestorDelFronton && mensajes.length > 0 && (
              <button
                type="button"
                onClick={handleVaciarForoCompleto}
                disabled={vaciandoForo}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title={t.reservas?.forum_clear_all || 'Vaciar foro completo'}
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">
                  {vaciandoForo ? (t.common?.loading || 'Borrando...') : (t.reservas?.forum_clear_all || 'Vaciar foro')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-lg font-bold transition cursor-pointer flex-shrink-0"
              title={t.common?.close || 'Cerrar'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* LISTADO DE MENSAJES */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-stone-50/30 dark:bg-stone-950/30">
          {cargando ? (
            <div className="py-16 text-center text-xs text-stone-400 dark:text-stone-500 font-bold">
              {t.common?.loading || 'Cargando mensajes del foro...'}
            </div>
          ) : mensajes.length === 0 ? (
            <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
              <div className="text-3xl">💬</div>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                {t.reservas?.no_forum_messages || 'Aún no hay mensajes en este foro.'}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                {t.reservas?.forum_empty_desc || 'Sé el primero en compartir un aviso, organizar una partida o consultar dudas con los gestores y pelotaris.'}
              </p>
            </div>
          ) : (
            mensajes.map((msg) => {
              const esMio = user && msg.user_id === user.id
              const esGestorMsg = esGestorOAdmin(msg.user_role)
              const emailDestino = msg.user_email || userEmailsMap[msg.user_id]
              const puedeBorrar = esMio || esGestorDelFronton

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col group ${esMio ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-2xs space-y-2 relative ${
                      esMio
                        ? 'bg-emerald-700 text-white rounded-br-xs'
                        : esGestorMsg
                        ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-stone-900 dark:text-stone-100 rounded-bl-xs'
                        : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-bl-xs'
                    }`}
                  >
                    {/* ENCABEZADO MENSAJE: NOMBRE, ROL Y FECHA/HORA */}
                    <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={esMio ? 'text-emerald-100' : 'text-stone-900 dark:text-stone-100'}>
                          {msg.user_name || 'Pelotari'}
                        </span>
                        {esGestorMsg && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            {msg.user_role === 'admin' ? 'Admin' : 'Gestor'}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium whitespace-nowrap ${
                          esMio ? 'text-emerald-200' : 'text-stone-400 dark:text-stone-500'
                        }`}
                      >
                        {formatShortDateWithTime(msg.created_at, lang)}
                      </span>
                    </div>

                    {/* CONTENIDO DEL MENSAJE */}
                    <p
                      className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words font-normal ${
                        esMio ? 'text-white' : 'text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      {msg.mensaje}
                    </p>

                    {/* BARRA DE ACCIONES PARA GESTOR O AUTOR */}
                    {(puedeBorrar || (esGestorDelFronton && !esMio)) && (
                      <div className={`pt-1 border-t flex items-center gap-1.5 ${
                        esMio ? 'border-emerald-600/60 justify-end' : 'border-stone-200/60 dark:border-stone-700/60 justify-end'
                      }`}>
                        {/* ENVIAR EMAIL DIRECTO AL USUARIO (SOLO GESTORES, CUANDO NO ES EL PROPIO GESTOR) */}
                        {esGestorDelFronton && !esMio && (
                          <button
                            type="button"
                            onClick={() => handleEnviarEmailUsuario(msg)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                              esMio
                                ? 'bg-emerald-800/80 hover:bg-emerald-900 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            }`}
                            title={emailDestino ? `Enviar email a ${emailDestino}` : (t.reservas?.forum_email_user || 'Enviar email al usuario')}
                          >
                            <span>✉️</span>
                            <span>{emailDestino ? emailDestino : (t.reservas?.forum_email_user || 'Email')}</span>
                          </button>
                        )}

                        {/* BORRAR MENSAJE SUELTO */}
                        {puedeBorrar && (
                          <button
                            type="button"
                            onClick={() => handleEliminarMensaje(msg.id)}
                            disabled={eliminandoId === msg.id}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                              esMio
                                ? 'bg-emerald-800/80 hover:bg-rose-600 text-emerald-100 hover:text-white'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                            }`}
                            title={t.reservas?.forum_delete_message || 'Eliminar mensaje'}
                          >
                            <span>🗑️</span>
                            <span>{eliminandoId === msg.id ? '...' : (t.common?.delete || 'Borrar')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* FORMULARIO DE ENVÍO */}
        <form
          onSubmit={handleEnviarMensaje}
          className="p-3.5 sm:p-4 border-t border-stone-150 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2 flex-shrink-0"
        >
          <input
            type="text"
            placeholder={t.reservas?.write_forum_message || 'Escribe un mensaje en el foro para todos los usuarios...'}
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            disabled={enviando}
            className="flex-1 p-3 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-2xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          />
          <button
            type="submit"
            disabled={enviando || !nuevoMensaje.trim()}
            className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition shadow-sm active:scale-95 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:text-stone-400 dark:disabled:text-stone-600 cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <span>{enviando ? (t.common?.loading || 'Enviando...') : (t.reservas?.send_forum_message || 'Enviar')}</span>
            <span>➤</span>
          </button>
        </form>
      </div>
    </div>
  )
}
