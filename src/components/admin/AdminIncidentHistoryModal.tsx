'use client'

import React from 'react'
import { formatLongDateWithTime, formatShortDateWithTime } from '@/lib/dateUtils'

interface AdminIncidentHistoryModalProps {
  incidencia: any | null
  onClose: () => void
  onOpenStatusChange: (incidencia: any) => void
  lang: 'es' | 'eu' | 'en'
  t: any
}

function parseHistorial(historialRaw: any): any[] {
  if (!historialRaw) return []
  if (Array.isArray(historialRaw)) return historialRaw
  try {
    const parsed = JSON.parse(historialRaw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function AdminIncidentHistoryModal({
  incidencia,
  onClose,
  onOpenStatusChange,
  lang,
  t,
}: AdminIncidentHistoryModalProps) {
  if (!incidencia) return null

  const listaHistorial = parseHistorial(incidencia.historial)

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl border border-stone-200 dark:border-stone-800">
        {/* CABECERA DEL MODAL */}
        <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-lg font-black shadow-inner border border-emerald-200/60 dark:border-emerald-800/60">
              📜
            </div>
            <div>
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">
                {t.reservas.incident_history_modal_title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {incidencia.frontones?.nombre} • {incidencia.titulo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold text-lg w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* FICHA RESUMEN DE LA INCIDENCIA */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                {incidencia.titulo}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${
                  incidencia.estado === 'en_curso'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : incidencia.estado === 'resuelta'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {incidencia.estado === 'en_curso'
                  ? `🔧 ${t.reservas.status_in_progress_short}`
                  : incidencia.estado === 'resuelta'
                  ? `✅ ${t.reservas.status_resolved_short}`
                  : `⏳ ${t.reservas.status_pending_short}`}
              </span>
            </div>

            {incidencia.descripcion && (
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-150 dark:border-stone-800">
                &ldquo;{incidencia.descripcion}&rdquo;
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-500 dark:text-stone-400 pt-1">
              <span>
                🏟️ Frontón: <strong>{incidencia.frontones?.nombre}</strong>
              </span>
              <span>•</span>
              <span>
                👤 {t.admin.reported_by}:{' '}
                <strong>
                  {incidencia.profiles?.nombre_completo ||
                    incidencia.profiles?.nombre ||
                    'Usuario'}{' '}
                  {incidencia.profiles?.apellidos || ''}
                </strong>
              </span>
              {incidencia.profiles?.email && (
                <span>({incidencia.profiles.email})</span>
              )}
            </div>
          </div>

          {/* TIMELINE / LÍNEA TEMPORAL */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🕒 {t.reservas.timeline_title}</span>
            </h4>

            <div className="relative pl-6 border-l-2 border-stone-200 dark:border-stone-800 space-y-6">
              {/* HITO 1: REPORTE INICIAL */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-stone-900 shadow-xs"></div>
                <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <span className="font-bold text-rose-950 dark:text-rose-300 flex items-center gap-1.5">
                      📋 {t.reservas.incident_registered}
                    </span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                      {formatLongDateWithTime(incidencia.created_at, lang)}
                    </span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                    {t.reservas.incident_initial_status_text}
                  </p>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold block">
                    {t.reservas.by}:{' '}
                    {incidencia.profiles?.nombre_completo ||
                      incidencia.profiles?.nombre ||
                      'Usuario'}
                  </span>
                </div>
              </div>

              {/* HITOS POSTERIORES: HISTÓRICO DE CAMBIOS */}
              {listaHistorial.length > 0 ? (
                listaHistorial.map((h: any, idx: number) => {
                  let colorBadge = 'bg-stone-500'
                  let bgCard =
                    'bg-stone-50/80 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800'
                  if (h.estado_nuevo === 'en_curso') {
                    colorBadge = 'bg-amber-500'
                    bgCard =
                      'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60'
                  } else if (h.estado_nuevo === 'resuelta') {
                    colorBadge = 'bg-emerald-600'
                    bgCard =
                      'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60'
                  } else if (h.estado_nuevo === 'pendiente') {
                    colorBadge = 'bg-rose-500'
                    bgCard =
                      'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60'
                  }

                  return (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full ${colorBadge} border-2 border-white dark:border-stone-900 shadow-xs`}
                      ></div>
                      <div
                        className={`p-3.5 ${bgCard} border rounded-2xl space-y-2 text-xs shadow-2xs`}
                      >
                        <div className="flex justify-between items-center flex-wrap gap-1">
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center gap-1.5">
                            <span>{t.reservas.status_change_label}:</span>
                            <span className="capitalize font-semibold text-stone-600 dark:text-stone-400">
                              {h.estado_anterior || 'Inicio'}
                            </span>
                            <span>➔</span>
                            <span className="capitalize font-black text-emerald-800 dark:text-emerald-300">
                              {h.estado_nuevo}
                            </span>
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                            📅 {formatShortDateWithTime(h.fecha, lang)}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-150 dark:border-stone-800 text-stone-800 dark:text-stone-200 italic text-xs">
                          &ldquo;{h.comentario}&rdquo;
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-stone-400 dark:text-stone-500 font-semibold pt-0.5">
                          <span>🏛️ Gestor: {h.autor || 'Equipo Municipal'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-xs text-stone-400 dark:text-stone-500 italic py-2 pl-1">
                  {t.reservas.no_subsequent_actions}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTONES DEL PIE DEL MODAL */}
        <div className="flex justify-between items-center gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={() => {
              const incActual = incidencia
              onClose()
              onOpenStatusChange(incActual)
            }}
            className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
          >
            <span>📝 {t.admin.change_status}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  )
}
