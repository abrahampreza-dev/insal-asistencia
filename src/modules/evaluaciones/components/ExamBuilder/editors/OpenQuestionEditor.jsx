import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function OpenQuestionEditor({ pregunta, onChange, onRemove, indice }) {
  const [errorEnunciado, setErrorEnunciado] = useState('');

  const actualizarEnunciado = (e) => {
    const texto = e.target.value;
    setErrorEnunciado(texto.trim() ? '' : 'El enunciado es obligatorio.');
    onChange({ ...pregunta, enunciado: texto });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50 mb-4"
    >
      <div className="flex items-start gap-4">
        <span className="text-[10px] font-black uppercase text-slate-500 italic mt-1">#{indice}</span>
        <div className="flex-1">
          <textarea
            value={pregunta.enunciado || ''}
            onChange={actualizarEnunciado}
            placeholder="Enunciado de la pregunta de desarrollo..."
            rows={3}
            className={`w-full p-4 bg-slate-900 rounded-xl font-bold italic text-sm text-slate-100 outline-none border transition resize-y ${
              errorEnunciado ? 'border-rose-500 focus:ring-rose-400' : 'border-slate-700 focus:ring-indigo-500'
            } focus:ring-2`}
          />
          {errorEnunciado && <p className="text-[9px] text-rose-400 font-bold italic mt-1 ml-1">{errorEnunciado}</p>}
        </div>
        <button onClick={onRemove} type="button" className="text-rose-400 hover:text-rose-300 transition text-[11px] font-black">
          <i className="fas fa-trash" />
        </button>
      </div>

      <div className="mt-4">
        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
          Rúbrica de calificación (guía el puntaje de la respuesta)
        </label>
        <textarea
          value={pregunta.rubrica || ''}
          onChange={(e) => onChange({ ...pregunta, rubrica: e.target.value })}
          placeholder="Ej. 3 pts: identifica la hipótesis; 3 pts: menciona la conclusión; 4 pts: justifica con argumentos..."
          rows={3}
          className="w-full p-3 bg-slate-900 rounded-xl font-bold italic text-xs text-slate-200 outline-none border border-slate-700 focus:ring-2 focus:ring-indigo-500 resize-y"
        />
        <p className="text-[8px] text-slate-500 font-bold italic mt-1 ml-1">
          La rúbrica asegura una calificación justa y consistente.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2">
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={pregunta.puntaje || 10}
          onChange={(e) => onChange({ ...pregunta, puntaje: parseFloat(e.target.value) || 0 })}
          className="w-16 p-1 bg-slate-900 rounded-lg border border-slate-700 font-black text-slate-100 text-center text-xs outline-none"
        />
        <span className="text-[9px] font-black uppercase text-slate-500 italic">puntos</span>
      </div>
    </motion.div>
  );
}
