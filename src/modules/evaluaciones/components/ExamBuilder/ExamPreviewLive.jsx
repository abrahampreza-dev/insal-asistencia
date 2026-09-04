import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIPOS_PREGUNTA, ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';
import RecomendacionesExamen from './RecomendacionesExamen';
import SimuladorEstudiante from './SimuladorEstudiante';

const ICONO_PREVISTA = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: 'fa-list-check',
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: 'fa-toggle-on',
  [TIPOS_PREGUNTA.ABIERTO]: 'fa-pen-fancy',
  [TIPOS_PREGUNTA.ORDENAR]: 'fa-up-down-left-right',
  [TIPOS_PREGUNTA.EMPAREJAR]: 'fa-link',
  [TIPOS_PREGUNTA.FORMULA]: 'fa-superscript',
};

export default function ExamPreviewLive({ titulo, descripcion, preguntas = [], configuracion = {} }) {
  const [modoVista, setModoVista] = useState('lista');
  const [simulando, setSimulando] = useState(false);

  const preguntasValidas = preguntas.filter((p) => p?.enunciado && p.enunciado.trim().length > 0);
  const preguntasInvalidas = preguntas.filter((p) => !p?.enunciado || p.enunciado.trim().length === 0);

  if (simulando) {
    return (
      <SimuladorEstudiante
        titulo={titulo}
        descripcion={descripcion}
        preguntas={preguntas}
        configuracion={configuracion}
        onCerrar={() => setSimulando(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-black uppercase text-indigo-400 italic tracking-widest">
            Vista Previa del Examen
          </h3>
          <p className="text-[10px] font-black uppercase text-slate-500 italic">
            {preguntasValidas.length}/{preguntas.length} preguntas válidas · {configuracion.duracionMinutos || 60} min · {configuracion.puntajeTotal || 0} pts
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setModoVista('lista')}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                modoVista === 'lista'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fas fa-list mr-1" /> Lista
            </button>
            <button
              onClick={() => setModoVista('tarjetas')}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                modoVista === 'tarjetas'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fas fa-th mr-1" /> Tarjetas
            </button>
          </div>
          <button
            onClick={() => setSimulando(true)}
            disabled={preguntasValidas.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <i className="fas fa-graduation-cap" /> Simular como estudiante
          </button>
        </div>
      </div>

      {preguntasInvalidas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-4 flex items-start gap-3"
        >
          <i className="fas fa-exclamation-triangle text-amber-400 mt-0.5" />
          <div>
            <p className="font-black uppercase text-xs mb-1">
              {preguntasInvalidas.length} pregunta(s) incompletas
            </p>
            <p className="text-[10px] italic">
              Las preguntas sin enunciado no se mostrarán al estudiante. Complétalas antes de publicar.
            </p>
          </div>
        </motion.div>
      )}

      <RecomendacionesExamen
        titulo={titulo}
        descripcion={descripcion}
        preguntas={preguntasValidas}
        configuracion={configuracion}
      />

      <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-8">
        <div className="border-b border-slate-800 pb-6 mb-6">
          <h1 className="text-2xl font-black italic uppercase text-slate-100 mb-2">
            {titulo || '[Sin título]'}
          </h1>
          {descripcion && (
            <p className="text-slate-300 font-bold italic text-sm">{descripcion}</p>
          )}
          <div className="flex gap-6 mt-4 text-[9px] font-black uppercase text-slate-500 italic">
            <span>Duración: {configuracion.duracionMinutos || 60} min</span>
            <span>Puntaje total: {configuracion.puntajeTotal || 0} pts</span>
            <span>Randomizar: {configuracion.randomizar ? 'Sí' : 'No'}</span>
            <span>Mostrar puntaje: {configuracion.mostrarPuntaje ? 'Sí' : 'No'}</span>
          </div>
        </div>

        {preguntasValidas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-500"
          >
            <i className="fas fa-edit text-4xl mb-3" />
            <p className="text-sm font-bold italic">No hay preguntas para previsualizar.</p>
            <p className="text-xs mt-2">Agrega preguntas desde la pestaña "Preguntas".</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {modoVista === 'lista' && (
              <motion.div
                key="lista"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {preguntasValidas.map((p, idx) => (
                  <PreviewItem key={p.id || idx} pregunta={p} indice={idx + 1} />
                ))}
              </motion.div>
            )}

            {modoVista === 'tarjetas' && (
              <motion.div
                key="tarjetas"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {preguntasValidas.map((p, idx) => (
                  <PreviewTarjeta key={p.id || idx} pregunta={p} indice={idx + 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function PreviewItem({ pregunta, indice }) {
  return (
    <motion.div
      layout
      className="border border-slate-700 rounded-xl p-4 bg-slate-800/30"
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xs font-black uppercase text-slate-400 italic bg-slate-800 px-2 py-1 rounded-lg flex-shrink-0">
          #{indice}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <i className={`fas ${ICONO_PREVISTA[pregunta.tipo] || 'fa-circle'} text-indigo-400 text-xs`} />
            <span className="text-[9px] font-black uppercase text-indigo-400 italic">
              {ETIQUETAS_TIPOS_PREGUNTA[pregunta.tipo] || pregunta.tipo}
            </span>
            <span className="ml-auto text-[8px] font-black uppercase text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {pregunta.puntaje || 0} pts
            </span>
          </div>
          <p className="font-bold italic text-sm text-slate-200 leading-relaxed">
            {pregunta.enunciado}
          </p>
        </div>
      </div>

      <PreviewContenido pregunta={pregunta} />
    </motion.div>
  );
}

function PreviewTarjeta({ pregunta, indice }) {
  return (
    <motion.div
      layout
      className="border border-slate-700 rounded-2xl p-4 bg-slate-800/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-black uppercase text-slate-400 italic bg-slate-800 px-2 py-1 rounded-lg">
          #{indice}
        </span>
        <i className={`fas ${ICONO_PREVISTA[pregunta.tipo] || 'fa-circle'} text-indigo-400`} />
        <span className="text-[9px] font-black uppercase text-indigo-400 italic">
          {ETIQUETAS_TIPOS_PREGUNTA[pregunta.tipo] || pregunta.tipo}
        </span>
        <span className="ml-auto text-[8px] font-black uppercase text-slate-500">
          {pregunta.puntaje || 0} pts
        </span>
      </div>
      <p className="font-bold italic text-xs text-slate-300 mb-2 line-clamp-2">
        {pregunta.enunciado}
      </p>
      <PreviewContenido pregunta={pregunta} compacto />
    </motion.div>
  );
}

function PreviewContenido({ pregunta, compacto = false }) {
  switch (pregunta.tipo) {
    case TIPOS_PREGUNTA.OPCION_MULTIPLE:
      return (
        <div className={compacto ? "grid grid-cols-1 gap-1" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
          {(pregunta.opciones || []).map((o, idx) => {
            const idOpcion = typeof o === 'object' ? o.id : idx;
            const textoOpcion = typeof o === 'object' ? o.texto : o;
            const esCorrecta = Array.isArray(pregunta.opcionesCorrectas)
              ? pregunta.opcionesCorrectas.includes(idOpcion)
              : pregunta.respuestaCorrecta === idOpcion;

            return (
              <div
                key={idOpcion || idx}
                className={`text-xs p-2 rounded-lg font-bold italic ${
                  compacto
                    ? 'bg-slate-800 text-slate-400'
                    : esCorrecta
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {String(idOpcion).toUpperCase()}. {textoOpcion || '[Sin texto]'}
                {!compacto && esCorrecta && ' ✓'}
              </div>
            );
          })}
        </div>
      );

    case TIPOS_PREGUNTA.VERDADERO_FALSO:
      return (
        <div className="flex gap-3">
          <span className="text-xs font-black uppercase text-slate-400 italic bg-slate-800 px-2 py-1 rounded">
            {pregunta.respuestaCorrecta ? 'Verdadero' : 'Falso'}
          </span>
          {pregunta.justificacionCorrecta && (
            <span className="text-xs text-slate-500 italic">
              {pregunta.justificacionCorrecta}
            </span>
          )}
        </div>
      );

    case TIPOS_PREGUNTA.ORDENAR:
      return (
        <div className="flex flex-wrap gap-2">
          {(pregunta.items || []).map((item, i) => (
            <span key={i} className="text-xs font-black uppercase text-slate-400 italic bg-slate-800 px-2 py-1 rounded">
              {i + 1}. {item || '[Sin texto]'}
            </span>
          ))}
        </div>
      );

    case TIPOS_PREGUNTA.EMPAREJAR:
      return (
        <div className={compacto ? "grid grid-cols-1 gap-1" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
          {(pregunta.pares || []).map((p, idx) => (
            <div key={p.id || idx} className="flex gap-2 text-xs">
              <span className="font-black text-slate-400">{p.izquierda || '?'}</span>
              <span className="text-slate-500">→</span>
              <span className="font-black text-slate-300">{p.derecha || '?'}</span>
            </div>
          ))}
        </div>
      );

    case TIPOS_PREGUNTA.FORMULA:
      return (
        <div className="font-mono text-xs text-slate-300 bg-slate-800 p-2 rounded-lg">
          {pregunta.formula || '[Sin fórmula]'}
        </div>
      );

    case TIPOS_PREGUNTA.ABIERTO:
      return (
        <p className="text-xs text-slate-400 font-bold italic">
          Pregunta de desarrollo — responde con texto libre.
          {pregunta.rubrica && <span className="block mt-1">Rúbrica: {pregunta.rubrica}</span>}
        </p>
      );

    default:
      return null;
  }
}