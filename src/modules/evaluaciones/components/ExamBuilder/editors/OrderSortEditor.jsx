import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';

export default function OrderSortEditor({ pregunta, onChange, onRemove, indice }) {
  const [errorEnunciado, setErrorEnunciado] = useState('');

  const actualizarEnunciado = (e) => {
    const texto = e.target.value;
    setErrorEnunciado(texto.trim() ? '' : 'El enunciado es obligatorio.');
    onChange({ ...pregunta, enunciado: texto });
  };

  const items = pregunta.items || ['', '', '', ''];

  const actualizarItem = (idx, valor) => {
    const nuevosItems = [...items];
    nuevosItems[idx] = valor;
    onChange({ ...pregunta, items: nuevosItems });
  };

  const agregarItem = () => {
    onChange({ ...pregunta, items: [...items, ''] });
  };

  const eliminarItem = (idx) => {
    if (items.length <= 2) return;
    const nuevosItems = items.filter((_, i) => i !== idx);
    onChange({ ...pregunta, items: nuevosItems });
  };

  // El orden visual tras arrastrar ES la respuesta correcta: se guarda tal cual.
  // El estudiante verá estos ítems barajados y deberá reconstruir esta secuencia.
  const handleReorder = (nuevosItems) => {
    onChange({ ...pregunta, items: nuevosItems });
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
            placeholder="Instrucción: Ordena los siguientes elementos..."
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

      <div className="mt-4 space-y-2">
        <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">
          Ítems — escríbelos y arrástralos en el ORDEN CORRECTO (el estudiante los recibirá barajados)
        </label>
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {items.map((item, idx) => (
            <Reorder.Item
              key={`item-${idx}`}
              value={item}
              className="flex items-center gap-2"
            >
              <span className="text-xs font-black text-slate-500 w-6 text-center">{idx + 1}.</span>
              <input
                type="text"
                value={item}
                onChange={(e) => actualizarItem(idx, e.target.value)}
                placeholder={`Ítem ${idx + 1}`}
                className="flex-1 p-2 bg-slate-900 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {items.length > 2 && (
                <button
                  onClick={() => eliminarItem(idx)}
                  type="button"
                  className="text-rose-400 hover:text-rose-300 transition"
                  title="Eliminar ítem"
                >
                  <i className="fas fa-xmark text-xs" />
                </button>
              )}
              <span className="cursor-grab text-slate-500 hover:text-slate-300">
                <i className="fas fa-grip-vertical text-xs" />
              </span>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <button
        onClick={agregarItem}
        type="button"
        className="mt-3 flex items-center gap-2 bg-indigo-500/10 text-indigo-400 py-2 px-4 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500/20 transition"
      >
        <i className="fas fa-plus" /> Agregar ítem
      </button>

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
