import React, { useState, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';

export default function MCUEditor({ pregunta, onChange, onRemove, indice }) {
  const [errorEnunciado, setErrorEnunciado] = useState('');

  const actualizarEnunciado = (e) => {
    const texto = e.target.value;
    setErrorEnunciado(texto.trim() ? '' : 'El enunciado es obligatorio.');
    onChange({ ...pregunta, enunciado: texto });
  };

  const actualizarOpcion = (id, texto) => {
    const opciones = pregunta.opciones.map((o) =>
      o.id === id ? { ...o, texto } : o
    );
    onChange({ ...pregunta, opciones });
  };

  const toggleCorrecta = (id) => {
    const correctas = pregunta.opcionesCorrectas || [];
    const nuevas = correctas.includes(id)
      ? correctas.filter((c) => c !== id)
      : [...correctas, id];
    if (nuevas.length === 0) return;
    onChange({ ...pregunta, opcionesCorrectas: nuevas });
  };

  const agregarOpcion = () => {
    const letras = ['a', 'b', 'c', 'd', 'e', 'f'];
    // Elegir la primera letra NO usada: evita ids duplicados tras borrar y
    // volver a agregar (antes: borrar 'a' generaba otro 'd' repetido).
    const usadas = new Set(pregunta.opciones.map((o) => o.id));
    const idNueva = letras.find((l) => !usadas.has(l)) || `opt-${Date.now()}`;
    onChange({
      ...pregunta,
      opciones: [...pregunta.opciones, { id: idNueva, texto: '' }],
    });
  };

  const eliminarOpcion = (idEliminar) => {
    if (pregunta.opciones.length <= 2) return;
    const nuevasOpciones = pregunta.opciones.filter((o) => o.id !== idEliminar);
    const nuevasCorrectas = (pregunta.opcionesCorrectas || []).filter((c) => c !== idEliminar);
    onChange({
      ...pregunta,
      opciones: nuevasOpciones,
      opcionesCorrectas: nuevasCorrectas,
    });
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
        <span className="text-[10px] font-black uppercase text-slate-500 italic mt-1">
          #{indice}
        </span>

        <div className="flex-1">
          <textarea
            value={pregunta.enunciado || ''}
            onChange={actualizarEnunciado}
            placeholder="Enunciado de la pregunta..."
            rows={3}
            className={`w-full p-4 bg-slate-900 rounded-xl font-bold italic text-sm text-slate-100 outline-none border transition resize-y ${
              errorEnunciado ? 'border-rose-500 focus:ring-rose-400' : 'border-slate-700 focus:ring-indigo-500'
            } focus:ring-2`}
          />
          {errorEnunciado && <p className="text-[9px] text-rose-400 font-bold italic mt-1 ml-1">{errorEnunciado}</p>}
        </div>

        <button
          onClick={onRemove}
          type="button"
          className="text-rose-400 hover:text-rose-300 transition text-[11px] font-black uppercase"
          title="Eliminar pregunta"
        >
          <i className="fas fa-trash" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {(pregunta.opciones || []).map((opcion, idx) => (
          <div key={opcion.id} className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase italic w-5 h-5 flex items-center justify-center bg-slate-900 rounded-lg">
              {opcion.id}
            </span>
            <input
              type="text"
              value={opcion.texto}
              onChange={(e) => actualizarOpcion(opcion.id, e.target.value)}
              placeholder={`Opción ${idx + 1}`}
              className="flex-1 p-2 bg-slate-900 rounded-xl border border-slate-700 font-bold italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 italic cursor-pointer">
                <input
                  type="checkbox"
                  checked={pregunta.opcionesCorrectas?.includes(opcion.id) || false}
                  onChange={() => toggleCorrecta(opcion.id)}
                  className="w-3 h-3"
                />
                OK
              </label>
              {pregunta.opciones.length > 2 && (
                <button
                  onClick={() => eliminarOpcion(opcion.id)}
                  type="button"
                  className="text-rose-400 hover:text-rose-300 transition"
                  title="Eliminar opción"
                >
                  <i className="fas fa-xmark text-xs" />
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={agregarOpcion}
          type="button"
          className="col-span-2 sm:col-span-4 flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-400 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500/20 transition"
        >
          <i className="fas fa-plus" /> Agregar opción
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex gap-4 items-center flex-wrap">
        <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 italic">
          <input
            type="checkbox"
            checked={pregunta.multiple || false}
            onChange={(e) => onChange({ ...pregunta, multiple: e.target.checked })}
            className="w-3 h-3"
          />
          Permitir múltiples respuestas
        </label>
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
