import React from 'react';
import { motion } from 'framer-motion';
import { TIPOS_PREGUNTA, ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';

export default function ProgressBar({
  preguntaActual,
  totalPreguntas,
  respuestas,
  preguntas,
  onNavegar,
  permitirNavegacion,
}) {
  const getItemStatus = (idx) => {
    const pregunta = preguntas[idx];
    if (!pregunta) return 'inactive';

    const tipo = pregunta.tipo;
    let valor;

    switch (tipo) {
      case TIPOS_PREGUNTA.OPCION_MULTIPLE:
        valor = respuestas[pregunta.id];
        return Array.isArray(valor) && valor.length > 0 ? 'answered' : 'pending';
      case TIPOS_PREGUNTA.VERDADERO_FALSO:
        valor = respuestas[pregunta.id];
        return valor === true || valor === false ? 'answered' : 'pending';
      case TIPOS_PREGUNTA.ABIERTO:
        valor = respuestas[pregunta.id];
        return valor && valor.trim().length > 0 ? 'answered' : 'pending';
      case TIPOS_PREGUNTA.ORDENAR:
        valor = respuestas[pregunta.id];
        return Array.isArray(valor) && valor.length > 0 ? 'answered' : 'pending';
      case TIPOS_PREGUNTA.EMPAREJAR:
        valor = respuestas[pregunta.id];
        return valor && Object.keys(valor).length > 0 ? 'answered' : 'pending';
      case TIPOS_PREGUNTA.FORMULA:
        valor = respuestas[pregunta.id];
        return valor && valor.trim().length > 0 ? 'answered' : 'pending';
      default:
        return 'pending';
    }
  };

  const answeredCount = preguntas.reduce((acc, p) => {
    const status = getItemStatus(preguntas.indexOf(p));
    return acc + (status === 'answered' ? 1 : 0);
  }, 0);

  const porcentaje = Math.round((answeredCount / totalPreguntas) * 100) || 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-40">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-black uppercase text-slate-500 italic tracking-widest">
            Progreso: {answeredCount}/{totalPreguntas}
          </div>
          <div className="text-[9px] font-black uppercase text-slate-500 italic">
            {porcentaje}% completado
          </div>
        </div>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${porcentaje}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {permitirNavegacion && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {preguntas.map((_, idx) => {
              const status = getItemStatus(idx);
              const esActual = idx === preguntaActual;
              const colores = {
                answered: 'bg-emerald-500 text-white',
                pending: 'bg-slate-700 text-slate-400',
                active: 'bg-indigo-600 text-white',
                inactive: 'bg-slate-800 text-slate-500',
              };
              const colorBase = esActual ? 'bg-indigo-600 text-white' : colores[status] || colores.pending;

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavegar(idx)}
                  className={`w-8 h-8 rounded-xl text-[9px] font-black flex items-center justify-center transition-all ${colorBase} ${
                    esActual ? 'ring-2 ring-indigo-400' : ''
                  }`}
                  title={`${getItemLabel(preguntas[idx])} — Pregunta ${idx + 1}`}
                >
                  {idx + 1}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getItemLabel(pregunta) {
  return ETIQUETAS_TIPOS_PREGUNTA[pregunta.tipo] || pregunta.tipo;
}
