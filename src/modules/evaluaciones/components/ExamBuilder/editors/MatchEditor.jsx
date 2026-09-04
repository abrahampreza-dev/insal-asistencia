import React, { useState } from 'react';
import { motion, Reorder as ReorderList } from 'framer-motion';

export default function MatchEditor({ pregunta, onChange, onRemove, indice }) {
  const [errorEnunciado, setErrorEnunciado] = useState('');

  const actualizarEnunciado = (e) => {
    const texto = e.target.value;
    setErrorEnunciado(texto.trim() ? '' : 'El enunciado es obligatorio.');
    onChange({ ...pregunta, enunciado: texto });
  };

  const pares = pregunta.pares || [{ id: 1, izquierda: '', derecha: '' }, { id: 2, izquierda: '', derecha: '' }];

  const actualizarPar = (parId, campo, valor) => {
    const nuevosPares = pares.map((p) =>
      p.id === parId ? { ...p, [campo]: valor } : p
    );
    onChange({ ...pregunta, pares: nuevosPares });
  };

  const agregarPar = () => {
    const nuevoId = Math.max(0, ...pares.map((p) => p.id)) + 1;
    onChange({
      ...pregunta,
      pares: [...pares, { id: nuevoId, izquierda: '', derecha: '' }],
    });
  };

  const eliminarPar = (parId) => {
    if (pares.length <= 2) return;
    onChange({ ...pregunta, pares: pares.filter((p) => p.id !== parId) });
  };

  const handleReorder = (nuevosPares) => {
    onChange({ ...pregunta, pares: nuevosPares });
  };

  const itemsValidos = pares.filter((p) => p.izquierda.trim() && p.derecha.trim());

  const generateMatching = () => {
    const valores = pares.map((p) => ({ id: p.id, texto: p.derecha }));
    // Fisher-Yates: barajado uniforme (el sort con random sesgaba el resultado)
    const shuffled = [...valores];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    onChange({ ...pregunta, opcionesDerecha: shuffled });
  };

  const opcionesDerecha = pregunta.opcionesDerecha || [];

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
            placeholder="Empareja cada ítem de la izquierda con su respuesta correcta..."
            rows={2}
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
        <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-2 ml-1">
          Pares izquierda-derecha (el orden de la derecha define la correspondencia correcta)
        </label>
        <div className="space-y-2">
          {pares.map((par, idx) => (
            <div key={par.id} className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 w-5">{idx + 1}.</span>
              <input
                type="text"
                value={par.izquierda}
                onChange={(e) => actualizarPar(par.id, 'izquierda', e.target.value)}
                placeholder="Ítem izquierda"
                className="flex-1 p-2 bg-slate-900 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">→</span>
              <input
                type="text"
                value={par.derecha}
                onChange={(e) => actualizarPar(par.id, 'derecha', e.target.value)}
                placeholder="Respuesta derecha"
                className="flex-1 p-2 bg-slate-900 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {pares.length > 2 && (
                <button
                  onClick={() => eliminarPar(par.id)}
                  type="button"
                  className="text-rose-400 hover:text-rose-300 transition"
                  title="Eliminar par"
                >
                  <i className="fas fa-xmark text-xs" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          onClick={agregarPar}
          type="button"
          className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 py-2 px-4 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500/20 transition"
        >
          <i className="fas fa-plus" /> Agregar par
        </button>
        <button
          onClick={generateMatching}
          type="button"
          disabled={itemsValidos.length === 0}
          className="flex items-center gap-2 bg-amber-500/10 text-amber-400 py-2 px-4 rounded-xl text-[9px] font-black uppercase hover:bg-amber-500/20 transition disabled:opacity-50"
        >
          <i className="fas fa-shuffle" /> Barajar respuestas (derecha)
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2">
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={pregunta.puntaje || 1}
          onChange={(e) => onChange({ ...pregunta, puntaje: parseFloat(e.target.value) || 0 })}
          className="w-16 p-1 bg-slate-900 rounded-lg border border-slate-700 font-black text-slate-100 text-center text-xs outline-none"
        />
        <span className="text-[9px] font-black uppercase text-slate-500 italic">puntos</span>
      </div>
    </motion.div>
  );
}
