import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { recomendarExamenIA } from '../../services/geminiService';
import { ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';

const COLOR_CALIFICACION = {
  'Excelente': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  'Muy bueno': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  'Bueno': 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  'Necesita ajustes': 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  'Incompleto': 'bg-rose-500/10 border-rose-500/30 text-rose-300',
};

export default function RecomendacionesExamen({ titulo, descripcion, preguntas, configuracion, autoAnalizar = true }) {
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [visible, setVisible] = useState(false);

  const analizar = useCallback(async () => {
    setCargando(true);
    try {
      const resultado = await recomendarExamenIA({ titulo, descripcion, preguntas, configuracion });
      setAnalisis(resultado);
      setVisible(true);
    } finally {
      setCargando(false);
    }
  }, [titulo, descripcion, preguntas, configuracion]);

  useEffect(() => {
    if (autoAnalizar && preguntas.length > 0) {
      const timer = setTimeout(() => analizar(), 400);
      return () => clearTimeout(timer);
    }
  }, [autoAnalizar, preguntas.length, analizar]);

  if (cargando) {
    return (
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm flex items-center justify-center gap-3">
        <i className="fas fa-spinner fa-pulse text-indigo-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
          Analizando la calidad del examen...
        </span>
      </div>
    );
  }

  if (!analisis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[2rem] border p-6 shadow-sm ${
        analisis.listoParaAplicar
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <i className="fas fa-list-check text-2xl text-indigo-400" />
            <h3 className="text-sm font-black uppercase italic tracking-widest text-indigo-400">
              Recomendaciones del sistema
            </h3>
            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase italic border ${COLOR_CALIFICACION[analisis.calificacion] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
              {analisis.calificacion}
            </span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={analisis.puntajeCalidad >= 80 ? '#10b981' : analisis.puntajeCalidad >= 50 ? '#0ea5e9' : '#f43f5e'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(analisis.puntajeCalidad / 100) * 100} ${100}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-lg text-slate-100">{analisis.puntajeCalidad}</span>
              </div>
            </div>
            <div className="text-[10px] font-bold italic text-slate-300">
              <p className="mb-1">{analisis.resumen}</p>
              <p className="text-slate-400">
                <i className="fas fa-clock mr-1" /> Tiempo sugerido: <b>{analisis.tiempoSugeridoMin} min</b>
              </p>
              <p className="text-slate-400">
                <i className="fas fa-coins mr-1" /> {analisis.distribucionTipos?.reduce((s, t) => s + t.cantidad, 0) || 0} preguntas
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setVisible(!visible)}
          className="text-[9px] font-black uppercase text-indigo-400 tracking-widest hover:text-indigo-300 transition self-start"
        >
          <i className={`fas ${visible ? 'fa-chevron-up' : 'fa-chevron-down'} mr-1`} />
          {visible ? 'Ocultar' : 'Ver detalle'}
        </button>
      </div>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 italic mb-2">
                  <i className="fas fa-chart-pie mr-1" /> Distribución de tipos
                </p>
                <div className="space-y-2">
                  {(analisis.distribucionTipos || []).map((t) => (
                    <div key={t.tipo} className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-slate-400 italic w-28 flex-shrink-0">
                        {ETIQUETAS_TIPOS_PREGUNTA[t.tipo] || t.tipo}
                      </span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${t.porcentaje}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-black text-slate-400 w-8 text-right">{t.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase text-emerald-400 italic mb-2">
                  <i className="fas fa-thumbs-up mr-1" /> Fortalezas
                </p>
                <ul className="space-y-2">
                  {(analisis.fortalezas || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] font-bold italic text-slate-300">
                      <i className="fas fa-circle-check text-emerald-500 mt-0.5 text-xs" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase text-amber-400 italic mb-2">
                  <i className="fas fa-wrench mr-1" /> Recomendaciones
                </p>
                <ul className="space-y-2">
                  {(analisis.recomendaciones || []).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] font-bold italic text-slate-300">
                      <i className="fas fa-arrow-right text-amber-400 mt-0.5 text-xs" />
                      {r}
                    </li>
                  ))}
                  {(analisis.debilidades || []).map((d, i) => (
                    <li key={`d-${i}`} className="flex items-start gap-2 text-[10px] font-bold italic text-rose-300">
                      <i className="fas fa-triangle-exclamation text-rose-400 mt-0.5 text-xs" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={`mt-4 p-4 rounded-2xl text-[11px] font-black italic ${analisis.listoParaAplicar ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
              <i className={`fas ${analisis.listoParaAplicar ? 'fa-circle-check' : 'fa-circle-info'} mr-2`} />
              {analisis.mensajeFinal}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
