'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatShortDateWithTime } from '@/lib/dateUtils'

export interface FrontonForumMessage {
  id: string
  fronton_id: string
  user_id: string
  user_name: string
  user_role?: string
  mensaje: string
  created_at: string
}

interface FrontonForumModalProps {
  fronton: any | null
  isOpen: boolean
  onClose: () => void
  user: any
  lang: 'es' | 'eu' | 'en'
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

    const payload = {
      fronton_id: fronton.id,
      user_id: user.id,
      user_name: nombre,
      user_role: rol,
      mensaje: texto,
    }

    try {
      const { data, error } = await supabase
        .from('mensajes_foro_fronton')
        .insert([payload])
        .select()

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
        }
      }
    } catch (err: any) {
      alert('Error al enviar el mensaje: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (!isOpen || !fronton) return null

  const esGestorOAdmin = (rol?: string) => rol === 'admin' || rol === 'gestor_municipio'

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

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-lg font-bold transition cursor-pointer flex-shrink-0"
            title={t.common?.close || 'Cerrar'}
          >
            ✕
          </button>
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
              const esGestor = esGestorOAdmin(msg.user_role)

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${esMio ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-2xs space-y-1.5 ${
                      esMio
                        ? 'bg-emerald-700 text-white rounded-br-xs'
                        : esGestor
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
                        {esGestor && (
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
