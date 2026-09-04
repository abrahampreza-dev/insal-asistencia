import React from 'react';
import { motion } from 'framer-motion';
import { ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';

export default function ItemAnalysisChart({ analisis, maxBarWidth = 200 }) {
  if (!analisis || analisis.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <i className="fas fa-chart-bar text-3xl mb-3" />
        <p className="text-xs font-bold italic">Sin datos de análisis de ítems.</p>
      </div>
    );
  }

  const itemsError = [...analisis].sort((a, b) => b.indiceError - a.indiceError);
  const maxError = Math.max(...itemsError.map((i) => i.indiceError), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest mb-4">
        Análisis del Ítem — Ítems con mayor índice de error
      </h3>

      {itemsError.map((item, idx) => {
        const colorBarr = item.indiceExito >= 70
          ? 'bg-emerald-500'
          : item.indiceExito >= 40
          ? 'bg-amber-500'
          : 'bg-rose-500';

        const anchoBarr = (item.indiceExito / 100) * maxBarWidth;
        const anchoError = (item.indiceError / maxError) * maxBarWidth;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-black uppercase text-slate-500 bg-slate-800 px-2 py-1 rounded-lg flex-shrink-0">
                #{idx + 1}
              </span>
              <span className="text-[8px] font-black uppercase text-slate-400 italic">
                {ETIQUETAS_TIPOS_PREGUNTA[item.tipo] || item.tipo}
              </span>
              <span className="ml-auto text-xs font-black text-slate-400">
                {item.acertadas}/{item.total}
              </span>
            </div>

            <p className="text-xs font-bold italic text-slate-200 mb-3 line-clamp-2">
              {item.enunciado}
            </p>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 mb-1">
                  <span>Índice de éxito: {Math.round(item.indiceExito)}%</span>
                  <span>Índice de error: {Math.round(item.indiceError)}%</span>
                </div>
                <div className="relative h-5 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${colorBarr} rounded-full`}
                    style={{ width: `${anchoBarr}px` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.indiceExito}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                <span>Promedio: {item.promedio}/{item.puntajeMaximo} pts</span>
                <span>Tiempo promedio: {item.tiempoPromedio}s</span>
              </div>
            </div>

            {item.indiceError > 50 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2"
              >
                <i className="fas fa-exclamation-triangle text-rose-400" />
                <span className="text-[8px] font-black uppercase text-rose-300">
                  Recomendación: Revisar formulación o retroalimentación de esta pregunta.
                </span>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
