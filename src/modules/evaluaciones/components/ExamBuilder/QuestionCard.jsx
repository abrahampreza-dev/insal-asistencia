import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TIPOS_PREGUNTA, ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';
import MCUEditor from './editors/MCUEditor';
import TrueFalseEditor from './editors/TrueFalseEditor';
import OpenQuestionEditor from './editors/OpenQuestionEditor';
import OrderSortEditor from './editors/OrderSortEditor';
import MatchEditor from './editors/MatchEditor';
import FormulaEditor from './editors/FormulaEditor';

const EDITORES = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: MCUEditor,
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: TrueFalseEditor,
  [TIPOS_PREGUNTA.ABIERTO]: OpenQuestionEditor,
  [TIPOS_PREGUNTA.ORDENAR]: OrderSortEditor,
  [TIPOS_PREGUNTA.EMPAREJAR]: MatchEditor,
  [TIPOS_PREGUNTA.FORMULA]: FormulaEditor,
};

const DEFAULTS_TIPO = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: () => ({
    opciones: [
      { id: 'a', texto: '' },
      { id: 'b', texto: '' },
      { id: 'c', texto: '' },
      { id: 'd', texto: '' },
    ],
    opcionesCorrectas: [],
  }),
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: () => ({ respuestaCorrecta: null }),
  [TIPOS_PREGUNTA.ABIERTO]: () => ({}),
  [TIPOS_PREGUNTA.ORDENAR]: () => ({ items: ['', '', '', ''], ordenCorrecto: [0, 1, 2, 3] }),
  [TIPOS_PREGUNTA.EMPAREJAR]: () => ({ pares: [{ id: 1, izquierda: '', derecha: '' }, { id: 2, izquierda: '', derecha: '' }] }),
  [TIPOS_PREGUNTA.FORMULA]: () => ({ formula: '', respuestaCorrecta: '' }),
};

export default function QuestionCard({ pregunta, onChange, onRemove, indice, onConvertir }) {
  const [errorTipo, setErrorTipo] = useState('');

  useEffect(() => {
    if (!pregunta.tipo) {
      const tipoPorDefecto = TIPOS_PREGUNTA.OPCION_MULTIPLE;
      const defaults = DEFAULTS_TIPO[tipoPorDefecto]?.() || {};
      onChange({
        ...pregunta,
        id: pregunta.id || `preg-${Date.now()}-${indice}`,
        tipo: tipoPorDefecto,
        enunciado: pregunta.enunciado || '',
        puntaje: pregunta.puntaje || 1,
        orden: indice,
        ...defaults,
      });
    }
  }, []);

  const handleTipoChange = (nuevoTipo) => {
    if (pregunta.tipo === nuevoTipo) return;
    const defaults = DEFAULTS_TIPO[nuevoTipo]?.() || {};
    if (pregunta.enunciado) {
      defaults.enunciado = pregunta.enunciado;
      defaults.puntaje = pregunta.puntaje;
    }
    if (onConvertir) {
      onConvertir(pregunta, nuevoTipo);
    }
    onChange({
      ...defaults,
      id: pregunta.id || `preg-${Date.now()}-${indice}`,
      tipo: nuevoTipo,
      orden: indice,
    });
    setErrorTipo('');
  };

  const EditorComponent = EDITORES[pregunta.tipo] || MCUEditor;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-6 mb-6"
    >
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg">
            #{indice}
          </span>
          <select
            value={pregunta.tipo || ''}
            onChange={(e) => handleTipoChange(e.target.value)}
            className="p-1 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.values(TIPOS_PREGUNTA).map((t) => (
              <option key={t} value={t}>{ETIQUETAS_TIPOS_PREGUNTA[t]}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="text-[9px] font-black uppercase text-slate-500 italic mb-1">
            Tipo: {ETIQUETAS_TIPOS_PREGUNTA[pregunta.tipo] || 'Selecciona un tipo'}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRemove}
            type="button"
            className="w-10 h-10 flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
            title="Eliminar pregunta"
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>

      {errorTipo && (
        <p className="text-[9px] text-rose-400 font-bold italic mb-2 ml-1">{errorTipo}</p>
      )}

      <EditorComponent
        pregunta={pregunta}
        onChange={onChange}
        onRemove={onRemove}
        indice={indice}
      />
    </motion.div>
  );
}
