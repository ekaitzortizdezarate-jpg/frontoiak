'use client'

import React from 'react'

interface IncidentStatusChangeModalProps {
  incidencia: any | null
  nuevoEstado: 'pendiente' | 'en_curso' | 'resuelta'
  setNuevoEstado: (estado: 'pendiente' | 'en_curso' | 'resuelta') => void
  comentario: string
  setComentario: (comentario: string) => void
  guardando: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  t: any
}

export default function IncidentStatusChangeModal({
  incidencia,
  nuevoEstado,
  setNuevoEstado,
  comentario,
  setComentario,
  guardando,
  onSubmit,
  onClose,
  t,
}: IncidentStatusChangeModalProps) {
  if (!incidencia) return null

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl border border-stone-200 dark:border-stone-800">
        <div className="flex justify-between items-start border-b border-stone-100 dark:border-stone-800 pb-3">
          <div>
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">
              {t.admin.update_incident_status}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {incidencia.frontones?.nombre} • {incidencia.titulo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold text-lg w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {t.admin.new_status}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNuevoEstado('pendiente')}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  nuevoEstado === 'pendiente'
                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-600 text-rose-900 dark:text-rose-200 ring-2 ring-rose-400 dark:ring-rose-600'
                    : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span>⏳</span>
                <span>{t.reservas.status_pending_short}</span>
              </button>

              <button
                type="button"
                onClick={() => setNuevoEstado('en_curso')}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  nuevoEstado === 'en_curso'
                    ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 dark:ring-amber-600'
                    : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
                }`}
              >
                <span>🔧</span>
                <span>{t.reservas.status_in_progress_short}</span>
              </button>

              <button
                type="button"
                onClick={() => setNuevoEstado('resuelta')}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  nuevoEstado === 'resuelta'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500 dark:ring-emerald-600'
                    : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span>✅</span>
                <span>{t.reservas.status_resolved_short}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              {t.admin.action_comment}
            </label>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-2">
              {t.admin.action_comment_desc}
            </p>
            <textarea
              rows={4}
              required
              placeholder="Describe qué se ha hecho o se va a hacer..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="w-full p-3 border border-stone-300 dark:border-stone-700 rounded-2xl text-sm bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white p-3 rounded-2xl text-sm font-bold transition shadow-sm disabled:bg-stone-300 dark:disabled:bg-stone-800 active:scale-98 cursor-pointer"
            >
              {guardando ? t.admin.saving_in_history : t.admin.save_in_history}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-4 py-3 rounded-2xl text-sm font-bold transition cursor-pointer"
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
