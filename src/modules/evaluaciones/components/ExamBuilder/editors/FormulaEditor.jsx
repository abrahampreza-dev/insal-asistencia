import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function FormulaEditor({ pregunta, onChange, onRemove, indice }) {
  const [errorEnunciado, setErrorEnunciado] = useState('');

  const actualizarEnunciado = (e) => {
    const texto = e.target.value;
    setErrorEnunciado(texto.trim() ? '' : 'El enunciado es obligatorio.');
    onChange({ ...pregunta, enunciado: texto });
  };

  const handleFormulaChange = (e) => {
    const texto = e.target.value;
    onChange({ ...pregunta, formula: texto });
  };

  const handleRespuestaChange = (e) => {
    const texto = e.target.value;
    onChange({ ...pregunta, respuestaCorrecta: texto });
  };

  const formulasEjemplo = [
    'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
    '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
    'E = mc^2',
    '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
  ];

  const insertarFormula = (formula) => {
    const textarea = document.getElementById(`formula-input-${indice}`);
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const valor = pregunta.formula || '';
      const nuevoValor = valor.substring(0, start) + formula + valor.substring(end);
      onChange({ ...pregunta, formula: nuevoValor });
    }
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
            placeholder="Enunciado de la pregunta (ej. Resuelve la siguiente ecuación)..."
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
        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
          Fórmula (LaTeX)
        </label>
        <textarea
          id={`formula-input-${indice}`}
          value={pregunta.formula || ''}
          onChange={handleFormulaChange}
          placeholder="\frac{a}{b} o x^2 + y^2 = r^2"
          rows={2}
          className="w-full p-3 bg-slate-900 rounded-xl font-bold italic text-xs text-slate-200 font-mono outline-none border border-slate-700 focus:ring-2 focus:ring-indigo-500 resize-y"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {formulasEjemplo.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => insertarFormula(f)}
              className="text-[8px] font-black uppercase text-slate-400 italic bg-slate-900 px-2 py-1 rounded-lg hover:bg-slate-700 transition"
              title={f}
            >
              Fórmula {i + 1}
            </button>
          ))}
        </div>
        {pregunta.formula && (
          <div className="mt-3 p-4 bg-slate-900 rounded-xl border border-slate-700 min-h-[40px] flex items-center justify-center">
            <p className="font-mono text-sm text-slate-300 break-all">
              {pregunta.formula}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
          Respuesta correcta (LaTeX o valor numérico)
        </label>
        <input
          type="text"
          value={pregunta.respuestaCorrecta || ''}
          onChange={handleRespuestaChange}
          placeholder="\frac{3}{2} o 42"
          className="w-full p-3 bg-slate-900 rounded-xl font-bold italic text-xs text-slate-200 font-mono outline-none border border-slate-700 focus:ring-2 focus:ring-indigo-500"
        />
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
