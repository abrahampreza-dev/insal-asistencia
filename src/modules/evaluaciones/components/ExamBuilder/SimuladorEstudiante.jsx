import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIPOS_PREGUNTA } from '../../constants';
import QuestionRenderer from '../ExamTaking/QuestionRenderer';
import ProgressBar from '../ExamTaking/ProgressBar';

export default function SimuladorEstudiante({ titulo, descripcion, preguntas, configuracion, onCerrar }) {
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [iniciado, setIniciado] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const preguntasValidas = preguntas.filter((p) => p.enunciado && p.enunciado.trim().length > 0);
  const total = preguntasValidas.length;

  if (preguntasValidas.length === 0) return null;

  const responder = (id, valor) => setRespuestas((prev) => ({ ...prev, [id]: valor }));
  const irA = (idx) => setPreguntaActual(idx);

  const finalizar = () => {
    setFinalizado(true);
    setIniciado(false);
  };

  const puntajeTotal = Math.round(preguntasValidas.reduce((s, p) => s + (p.puntaje || 0), 0) * 100) / 100;

  if (finalizado) {
    const contestadas = preguntasValidas.filter((p) => {
      const v = respuestas[p.id];
      if (p.tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE) return Array.isArray(v) && v.length > 0;
      if (p.tipo === TIPOS_PREGUNTA.VERDADERO_FALSO) return v === true || v === false;
      if (p.tipo === TIPOS_PREGUNTA.ORDENAR) return Array.isArray(v) && v.length > 0;
      if (p.tipo === TIPOS_PREGUNTA.EMPAREJAR) return v && Object.keys(v).length > 0;
      return v && String(v).trim().length > 0;
    }).length;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-x-hidden">
        <div className="max-w-3xl mx-auto p-8 flex flex-col items-center justify-center min-h-screen text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6"
          >
            <i className="fas fa-flag-check text-4xl text-emerald-400" />
          </motion.div>
          <h2 className="text-3xl font-black italic uppercase text-slate-100 mb-4">
            ¡Examen finalizado!
          </h2>
          <p className="text-sm font-bold italic text-slate-300 mb-2">
            {titulo}
          </p>
          <p className="text-[10px] font-black uppercase text-slate-500 italic mb-8">
            Esto es lo que verá el estudiante al terminar
          </p>

          <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-emerald-400">{contestadas}</p>
              <p className="text-[8px] font-black uppercase text-slate-500 italic">Respondidas</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-slate-100">{total}</p>
              <p className="text-[8px] font-black uppercase text-slate-500 italic">Preguntas</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-indigo-400">{puntajeTotal} pts</p>
              <p className="text-[8px] font-black uppercase text-slate-500 italic">Puntaje total</p>
            </div>
          </div>

          <p className="text-xs font-bold italic text-slate-400 mb-8">
            El estudiante verá aquí su calificación (si el docente lo permite) y la retroalimentación de cada respuesta.
          </p>

          <button
            onClick={onCerrar}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
          >
            <i className="fas fa-arrow-left mr-2" /> Volver al constructor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-x-hidden">
      {iniciado ? (
        <>
          <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <i className="fas fa-graduation-cap text-indigo-400" />
                </div>
                <div>
                  <p className="font-black text-xs uppercase italic text-slate-100">{titulo}</p>
                  <p className="text-[8px] text-slate-500 uppercase font-bold italic">
                    Modo simulación · Vista del estudiante
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase text-emerald-400 italic">
                  <i className="fas fa-shield-check mr-1" /> Integridad: Normal
                </span>
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500 flex flex-col items-center justify-center bg-slate-800">
                  <span className="font-black text-lg text-slate-100">{configuracion.duracionMinutos}:00</span>
                  <span className="text-[6px] font-black uppercase text-slate-500 italic">min</span>
                </div>
                <button
                  onClick={onCerrar}
                  className="text-[9px] font-black uppercase text-rose-400 tracking-widest hover:text-rose-300 transition border border-rose-500/20 py-2 px-3 rounded-xl"
                >
                  <i className="fas fa-door-open mr-1" /> Salir
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-3xl mx-auto p-6 pb-40">
            <div className="mb-6">
              <h1 className="text-xl font-black italic uppercase text-slate-100 mb-2">{titulo}</h1>
              <p className="text-[10px] font-bold uppercase text-slate-500 italic tracking-widest">
                Pregunta {preguntaActual + 1} de {total}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={preguntasValidas[preguntaActual].id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
              >
                <QuestionRenderer
                  pregunta={preguntasValidas[preguntaActual]}
                  valor={respuestas[preguntasValidas[preguntaActual].id]}
                  onChange={(v) => responder(preguntasValidas[preguntaActual].id, v)}
                  indice={preguntaActual + 1}
                />
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
              <button
                onClick={() => irA(preguntaActual - 1)}
                disabled={preguntaActual === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
                  preguntaActual === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <i className="fas fa-chevron-left" /> Anterior
              </button>

              {preguntaActual < total - 1 ? (
                <button
                  onClick={() => irA(preguntaActual + 1)}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
                >
                  Siguiente <i className="fas fa-chevron-right" />
                </button>
              ) : (
                <button
                  onClick={finalizar}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition"
                >
                  <i className="fas fa-flag-check" /> Finalizar examen
                </button>
              )}
            </div>
          </main>

          <ProgressBar
            preguntaActual={preguntaActual}
            totalPreguntas={total}
            respuestas={respuestas}
            preguntas={preguntasValidas}
            onNavegar={irA}
            permitirNavegacion={configuracion.permitirNavegacion}
          />
        </>
      ) : (
        <div className="max-w-2xl mx-auto p-8 flex flex-col items-center justify-center min-h-screen text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6"
          >
            <i className="fas fa-graduation-cap text-4xl text-indigo-400" />
          </motion.div>
          <h2 className="text-3xl font-black italic uppercase text-slate-100 mb-2">{titulo}</h2>
          {descripcion && <p className="text-sm font-bold italic text-slate-300 mb-2">{descripcion}</p>}
          <p className="text-[10px] font-black uppercase text-indigo-400 italic tracking-widest mb-8">
            Modo simulación — cómo lo verá el estudiante
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 w-full max-w-md mb-8">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-black text-slate-100">{total}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 italic">Preguntas</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-100">{configuracion.duracionMinutos} min</p>
                <p className="text-[8px] font-black uppercase text-slate-500 italic">Duración</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-100">{puntajeTotal} pts</p>
                <p className="text-[8px] font-black uppercase text-slate-500 italic">Puntaje</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 text-left space-y-2">
              <p className="text-[9px] font-bold italic text-slate-400">
                <i className="fas fa-check-circle text-emerald-500 mr-2" />
                Supervisión continua de integridad
              </p>
              <p className="text-[9px] font-bold italic text-slate-400">
                <i className="fas fa-check-circle text-emerald-500 mr-2" />
                Tiempo con recordatorio visual
              </p>
              <p className="text-[9px] font-bold italic text-slate-400">
                <i className="fas fa-check-circle text-emerald-500 mr-2" />
                Navegación entre preguntas con avance
              </p>
              <p className="text-[9px] font-bold italic text-slate-400">
                <i className="fas fa-check-circle text-emerald-500 mr-2" />
                Auto-guardado de respuestas
              </p>
            </div>
          </div>

          <button
            onClick={() => setIniciado(true)}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
          >
            <i className="fas fa-play mr-2" /> Comenzar simulación
          </button>
          <button
            onClick={onCerrar}
            className="mt-3 text-[9px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-300 transition"
          >
            Volver al constructor
          </button>
        </div>
      )}
    </div>
  );
}
