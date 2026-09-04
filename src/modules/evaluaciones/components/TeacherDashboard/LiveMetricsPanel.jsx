import React from 'react';
import { motion } from 'framer-motion';

/** Firebase guarda eventos como objeto con claves: convertir a arreglo. */
function _eventosLista(eventos) {
  if (Array.isArray(eventos)) return eventos;
  if (eventos && typeof eventos === 'object') return Object.values(eventos);
  return [];
}

const _META_KEYS = new Set(['nie', 'nombre', 'startTime', 'endTime', 'status', 'updatedAt']);

function _avance(respuestasObj, totalPreguntas) {
  if (!respuestasObj || typeof respuestasObj !== 'object') return { respondidas: 0, total: totalPreguntas || 0 };
  const keys = Object.keys(respuestasObj).filter((k) => !_META_KEYS.has(k));
  return {
    respondidas: Math.min(keys.length, totalPreguntas || 0),
    total: totalPreguntas || 0,
  };
}

const COLORES_PANEL = {
  emerald: { fondo: 'bg-emerald-500/10', texto: 'text-emerald-400', barra: 'bg-emerald-500' },
  amber: { fondo: 'bg-amber-500/10', texto: 'text-amber-400', barra: 'bg-amber-500' },
  rose: { fondo: 'bg-rose-500/10', texto: 'text-rose-400', barra: 'bg-rose-500' },
  indigo: { fondo: 'bg-indigo-500/10', texto: 'text-indigo-400', barra: 'bg-indigo-500' },
};

export default function LiveMetricsPanel({ estudiantes, respuestas = {}, preguntas = [] }) {
  const totalEstudiantes = Object.keys(estudiantes).length;
  const totalPreguntas = preguntas.length;
  // Sin incidentes = todo lo que no sea advertencia o sospecha (incluye en_curso).
  const normales = Object.values(estudiantes).filter(
    (s) => s.status !== 'warning' && s.status !== 'suspicion'
  ).length;
  const warnings = Object.values(estudiantes).filter((s) => s.status === 'warning').length;
  const sospechas = Object.values(estudiantes).filter((s) => s.status === 'suspicion').length;

  const totalIncidentes = Object.values(estudiantes).reduce((acc, s) => {
    const eventos = _eventosLista(s.eventos);
    return acc + eventos.filter((e) => e.severidad !== 'normal' && e.severidad !== undefined).length;
  }, 0);

  const completados = Object.entries(respuestas).filter(
    ([, est]) => est?.status === 'finalizado'
  ).length;

  const totalRespondidas = Object.values(respuestas).reduce(
    (acc, est) => acc + _avance(est?.respuestas, totalPreguntas).respondidas,
    0
  );

  const metricas = [
    {
      label: 'Normales',
      valor: normales,
      color: 'emerald',
      icono: 'fa-check-circle',
      porcentaje: totalEstudiantes > 0 ? (normales / totalEstudiantes) * 100 : 0,
    },
    {
      label: 'Advertencias',
      valor: warnings,
      color: 'amber',
      icono: 'fa-exclamation-triangle',
      porcentaje: totalEstudiantes > 0 ? (warnings / totalEstudiantes) * 100 : 0,
    },
    {
      label: 'Sospechas',
      valor: sospechas,
      color: 'rose',
      icono: 'fa-shield-halved',
      porcentaje: totalEstudiantes > 0 ? (sospechas / totalEstudiantes) * 100 : 0,
    },
    {
      label: 'Completaron',
      valor: completados,
      color: 'indigo',
      icono: 'fa-flag-checkered',
      porcentaje: totalEstudiantes > 0 ? (completados / totalEstudiantes) * 100 : 0,
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {metricas.map((m, idx) => {
          const c = COLORES_PANEL[m.color] || COLORES_PANEL.indigo;
          return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 text-center"
          >
            <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${c.fondo} flex items-center justify-center`}>
              <i className={`fas ${m.icono} ${c.texto} text-lg`} />
            </div>
            <motion.span
              key={m.valor}
              className={`text-2xl font-black ${c.texto} block mb-1`}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              {m.valor}
            </motion.span>
            <p className="text-[8px] font-black uppercase text-slate-500 italic mb-2">{m.label}</p>

            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${c.barra} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${m.porcentaje}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[7px] text-slate-500 font-bold mt-1">{Math.round(m.porcentaje)}%</p>
          </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase text-slate-500 italic mb-1">Total incidentes</p>
              <motion.span
                key={totalIncidentes}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-black text-rose-400 block"
              >
                {totalIncidentes}
              </motion.span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <i className="fas fa-bug text-rose-400 text-lg" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase text-slate-500 italic mb-1">Respuestas en vivo</p>
              <motion.span
                key={totalRespondidas}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-black text-indigo-400 block"
              >
                {totalRespondidas}
                <span className="text-sm text-slate-500"> / {totalEstudiantes * totalPreguntas}</span>
              </motion.span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <i className="fas fa-clipboard-check text-indigo-400 text-lg" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
