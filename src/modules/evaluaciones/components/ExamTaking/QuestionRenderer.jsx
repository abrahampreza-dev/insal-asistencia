import React, { useState, useEffect, useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { TIPOS_PREGUNTA } from '../../constants';
import { sanearTextoUTF8 } from '../../../../utils/sanearTexto';

const LETRAS_OPCION = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Normaliza opciones al formato {id, texto}. Exámenes viejos, importados o
 * generados por IA pueden traer strings planos: sin esto, opcion.id es
 * undefined y la vista del estudiante CRASHEA en .toUpperCase().
 */
function _normalizarOpciones(opciones) {
  if (!Array.isArray(opciones)) return opciones;
  return opciones.map((o, i) => {
    if (typeof o === 'string') return { id: LETRAS_OPCION[i] || 'op' + i, texto: sanearTextoUTF8(o) };
    if (o && typeof o.texto === 'string') return { ...o, texto: sanearTextoUTF8(o.texto), id: o.id ?? LETRAS_OPCION[i] ?? 'op' + i };
    return o;
  });
}

export default function QuestionRenderer({ pregunta: preguntaProp, valor, onChange, indice, readOnly = false, handlersTexto }) {
  const pregunta = {
    ...preguntaProp,
    enunciado: sanearTextoUTF8(preguntaProp.enunciado),
    opciones: _normalizarOpciones(preguntaProp.opciones),
  };
  const Componente = RENDERERS[pregunta.tipo] || RendererDefault;
  return (
    <Componente
      pregunta={pregunta}
      valor={valor}
      onChange={onChange}
      indice={indice}
      readOnly={readOnly}
      handlersTexto={handlersTexto}
    />
  );
}

function RendererDefault({ pregunta, valor, onChange, indice, readOnly }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 mb-4 leading-relaxed">
            {pregunta.enunciado}
          </p>
          <textarea
            value={valor || ''}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            placeholder="Escribe tu respuesta aquí..."
            rows={4}
            className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>
      </div>
    </motion.div>
  );
}

function RendererOpcionMultiple({ pregunta, valor, onChange, indice, readOnly }) {
  const seleccion = Array.isArray(valor) ? valor : (valor ? [valor] : []);
  const esMultiple = pregunta.multiple;

  const toggleOpcion = (idOpcion) => {
    if (readOnly) return;
    if (esMultiple) {
      const nuevaSeleccion = seleccion.includes(idOpcion)
        ? seleccion.filter((id) => id !== idOpcion)
        : [...seleccion, idOpcion];
      onChange(nuevaSeleccion);
    } else {
      onChange(seleccion.includes(idOpcion) ? [] : [idOpcion]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
          <p className="text-[8px] font-black uppercase text-slate-500 italic mt-1">
            {pregunta.puntaje} pts — {pregunta.multiple ? 'Múltiples respuestas' : 'Una respuesta'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(pregunta.opciones || []).map((opcion) => {
          const seleccionada = seleccion.includes(opcion.id);
          return (
            <motion.label
              key={opcion.id}
              whileTap={!readOnly ? { scale: 0.98 } : {}}
              className={`flex items-center gap-3 p-3 rounded-xl border font-bold italic text-sm cursor-${readOnly ? 'default' : 'pointer'} transition-all ${
                seleccionada
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <input
                type={pregunta.multiple ? 'checkbox' : 'radio'}
                name={`pregunta-${pregunta.id}`}
                checked={seleccionada}
                onChange={() => toggleOpcion(opcion.id)}
                disabled={readOnly}
                className="w-4 h-4 text-indigo-500"
              />
              <span className="font-black text-xs uppercase text-slate-400">
                {String(opcion.id ?? '?').toUpperCase()}
              </span>
              <span className="flex-1">{opcion.texto ?? String(opcion ?? '')}</span>
            </motion.label>
          );
        })}
      </div>
    </motion.div>
  );
}

function RendererTrueFalse({ pregunta, valor, onChange, indice, readOnly }) {
  const seleccion = valor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
          {readOnly && pregunta.justificacionCorrecta && (
            <p className="text-[8px] font-black uppercase text-amber-400 italic mt-1 bg-amber-500/10 px-2 py-1 rounded-lg">
              Justificación: {pregunta.justificacionCorrecta}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={!readOnly ? { scale: 0.98 } : {}}
          onClick={() => !readOnly && onChange(true)}
          disabled={readOnly}
          type="button"
          className={`p-4 rounded-xl font-black text-center text-lg transition-all ${
            seleccion === true
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
          } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          Verdadero
        </motion.button>
        <motion.button
          whileTap={!readOnly ? { scale: 0.98 } : {}}
          onClick={() => !readOnly && onChange(false)}
          disabled={readOnly}
          type="button"
          className={`p-4 rounded-xl font-black text-center text-lg transition-all ${
            seleccion === false
              ? 'bg-rose-500 text-white'
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
          } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          Falso
        </motion.button>
      </div>
    </motion.div>
  );
}

function RendererOpen({ pregunta, valor, onChange, indice, readOnly, handlersTexto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[8px] font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded">
              {pregunta.puntaje} pts · Pregunta abierta
            </span>
            {pregunta.rubrica && (
              <span className="text-[8px] font-bold text-slate-400 italic">
                Rúbrica: {pregunta.rubrica}
              </span>
            )}
          </div>
        </div>
      </div>

      <textarea
        value={valor || ''}
        {...(handlersTexto || {})}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? '' : 'Desarrolla tu respuesta con argumentos y ejemplos...'}
        rows={6}
        className={`w-full p-4 bg-slate-900 rounded-xl border font-bold italic text-sm resize-y outline-none transition ${
          readOnly
            ? 'border-slate-700 text-slate-300 cursor-default'
            : 'border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500'
        }`}
      />
    </motion.div>
  );
}

// Barajado determinista: todos los estudiantes ven el mismo orden para una
// misma pregunta, distinto entre preguntas (semilla = id de la pregunta).
function _hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function _barajarEstable(arr, semilla) {
  const a = [...arr];
  let h = _hashStr(String(semilla)) || 1;
  const rand = () => {
    h = (h * 1103515245 + 12345) | 0;
    return ((h >>> 16) & 0x7fff) / 0x7fff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function RendererOrderSort({ pregunta, valor, onChange, indice, readOnly }) {
  const items = Array.isArray(pregunta.items) ? pregunta.items : [];
  // La respuesta guardada son los TEXTOS en el orden acomodado por el estudiante.
  const valores = Array.isArray(valor) ? valor : [];

  // Vista barajada inicial estable por pregunta (nunca en orden resuelto por defecto)
  const ordenInicial = useMemo(
    () => _barajarEstable(items, pregunta.id || indice),
    [pregunta.id, indice, items]
  );
  const ordenActual = valores.length > 0 ? valores : ordenInicial;

  // Registrar el orden inicial en la respuesta del examen si aún no se ha guardado
  useEffect(() => {
    if (valores.length === 0 && ordenInicial.length > 0 && !readOnly) {
      onChange(ordenInicial);
    }
  }, [valores.length, ordenInicial, onChange, readOnly]);

  const handleReorder = (nuevosItems) => {
    if (readOnly) return;
    onChange(nuevosItems);
  };

  const moverElemento = (origenIdx, destinoIdx) => {
    if (readOnly) return;
    if (destinoIdx < 0 || destinoIdx >= ordenActual.length) return;
    const copia = [...ordenActual];
    const [elemento] = copia.splice(origenIdx, 1);
    copia.splice(destinoIdx, 0, elemento);
    handleReorder(copia);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] font-black uppercase text-slate-500 italic">
              {pregunta.puntaje} pts · Arrastra o usa las flechas para ordenar la secuencia
            </span>
          </div>
        </div>
      </div>

      <Reorder.Group
        axis="y"
        values={ordenActual}
        onReorder={handleReorder}
        className="space-y-2.5"
      >
        {ordenActual.map((item, idx) => (
          <Reorder.Item
            key={item || `item-${idx}`}
            value={item}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 font-bold italic text-sm select-none touch-none transition-colors hover:border-slate-600 cursor-grab active:cursor-grabbing"
            whileDrag={{ scale: 1.02, boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)', zIndex: 40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{
              cursor: readOnly ? 'default' : 'grab',
              userSelect: 'none',
            }}
          >
            <span className="text-xs font-black uppercase text-indigo-400 bg-slate-900 border border-slate-800 w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0">
              {idx + 1}
            </span>
            <span className="flex-1 text-slate-200 text-xs sm:text-sm">{item || '[Sin texto]'}</span>

            {!readOnly && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moverElemento(idx, idx - 1);
                  }}
                  disabled={idx === 0}
                  title="Subir posición"
                  className="w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-indigo-600 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-slate-900/90 disabled:hover:text-slate-400 flex items-center justify-center text-[10px] transition"
                >
                  <i className="fas fa-chevron-up" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moverElemento(idx, idx + 1);
                  }}
                  disabled={idx === ordenActual.length - 1}
                  title="Bajar posición"
                  className="w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-indigo-600 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-slate-900/90 disabled:hover:text-slate-400 flex items-center justify-center text-[10px] transition"
                >
                  <i className="fas fa-chevron-down" />
                </button>
              </div>
            )}

            {!readOnly && (
              <i className="fas fa-grip-vertical text-slate-500 hover:text-slate-300 px-1 text-sm flex-shrink-0 cursor-grab active:cursor-grabbing" />
            )}
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </motion.div>
  );
}

function RendererMatch({ pregunta, valor, onChange, indice, readOnly }) {
  const pares = pregunta.pares || [];
  const opcionesDerecha = pregunta.opcionesDerecha || pares.map((p) => ({ id: p.id, texto: p.derecha }));
  const emparejamientos = valor || {};

  const seleccionar = (parId, opcionId) => {
    if (readOnly) return;
    onChange({ ...emparejamientos, [parId]: opcionId });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
          <p className="text-[8px] font-black uppercase text-slate-500 italic mt-1">
            {pregunta.puntaje} pts — Empareja cada ítem izquierdo con su respuesta
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border border-slate-700 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-slate-800">
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">Ítem</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">Respuesta</th>
            </tr>
          </thead>
          <tbody>
            {pares.map((par) => (
              <tr key={par.id} className="border-t border-slate-700">
                <td className="p-3 text-sm font-bold italic text-slate-200">{par.izquierda}</td>
                <td className="p-3">
                  <select
                    value={emparejamientos[par.id] || ''}
                    onChange={(e) => seleccionar(par.id, e.target.value)}
                    disabled={readOnly}
                    className="w-full p-2 bg-slate-900 rounded-xl border border-slate-700 font-bold italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Selecciona...</option>
                    {opcionesDerecha.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.texto}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function RendererFormula({ pregunta, valor, onChange, indice, readOnly, handlersTexto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-700 rounded-2xl p-6 bg-slate-800/50"
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg mt-1 flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <p className="font-bold italic text-base text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
          <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-700">
            <p className="font-mono text-sm text-slate-300 break-all">
              {pregunta.formula || '[Sin fórmula]'}
            </p>
          </div>
          <p className="text-[8px] font-black uppercase text-slate-500 italic mt-1">
            {pregunta.puntaje} pts — Ingresa tu respuesta en formato LaTeX o numérico
          </p>
        </div>
      </div>

      <input
        type="text"
        value={valor || ''}
        {...(handlersTexto || {})}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? '' : 'Ej. \frac{3}{2} o 42'}
        className={`w-full p-3 bg-slate-900 rounded-xl border font-mono font-black italic text-sm outline-none transition ${
          readOnly
            ? 'border-slate-700 text-slate-400 cursor-default'
            : 'border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500'
        }`}
      />
    </motion.div>
  );
}

const RENDERERS = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: RendererOpcionMultiple,
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: RendererTrueFalse,
  [TIPOS_PREGUNTA.ABIERTO]: RendererOpen,
  [TIPOS_PREGUNTA.ORDENAR]: RendererOrderSort,
  [TIPOS_PREGUNTA.EMPAREJAR]: RendererMatch,
  [TIPOS_PREGUNTA.FORMULA]: RendererFormula,
};

const _RENDERERS_ICONOS = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: 'fa-list-check',
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: 'fa-toggle-on',
  [TIPOS_PREGUNTA.ABIERTO]: 'fa-pen-fancy',
  [TIPOS_PREGUNTA.ORDENAR]: 'fa-up-down-left-right',
  [TIPOS_PREGUNTA.EMPAREJAR]: 'fa-link',
  [TIPOS_PREGUNTA.FORMULA]: 'fa-superscript',
};
