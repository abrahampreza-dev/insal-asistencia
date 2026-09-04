import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import StudentActivityDetail from './StudentActivityDetail';

const ETIQUETA_STATUS = {
  normal: 'En orden',
  en_curso: 'En orden',
  warning: 'Advertencia',
  suspicion: 'Sospecha',
  finalizado: 'Finalizado',
};

const COLOR_ANILLO = {
  normal: '#34d399',
  en_curso: '#34d399',
  warning: '#fbbf24',
  suspicion: '#fb7185',
  finalizado: '#38bdf8',
};

const PUNTO_STATUS = {
  normal: 'bg-emerald-500',
  en_curso: 'bg-emerald-500',
  warning: 'bg-amber-500',
  suspicion: 'bg-rose-500',
  finalizado: 'bg-sky-500',
};

const PALETA_AVATAR = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-fuchsia-500',
];

// Helper para parsear texto con fórmulas LaTeX
function RenderTextoConMath({ texto }) {
  if (!texto) return null;
  const partes = texto.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return (
    <span>
      {partes.map((parte, index) => {
        if (parte.startsWith('$$') && parte.endsWith('$$')) {
          const math = parte.slice(2, -2);
          return <BlockMath throwOnError={false} key={index} math={math} />;
        }
        if (parte.startsWith('$') && parte.endsWith('$')) {
          const math = parte.slice(1, -1);
          return <InlineMath throwOnError={false} key={index} math={math} />;
        }
        return <span key={index}>{parte}</span>;
      })}
    </span>
  );
}

function _iniciales(nombre, nie) {
  if (nombre) {
    const partes = nombre.trim().split(/\s+/);
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?';
  }
  return (nie || '?').slice(0, 2).toUpperCase();
}

/**
 * Firebase RTDB guarda los eventos como OBJETO con claves push, no como
 * arreglo: llamar .filter/.some directo sobre él revienta el tablero.
 */
function _eventosLista(eventos) {
  if (Array.isArray(eventos)) return eventos;
  if (eventos && typeof eventos === 'object') return Object.values(eventos);
  return [];
}

function _cronometroCorto(respuestasEstudiante) {
  const inicio = respuestasEstudiante?.startTime ? new Date(respuestasEstudiante.startTime).getTime() : null;
  if (!inicio || isNaN(inicio)) return null;
  const fin = respuestasEstudiante?.endTime ? new Date(respuestasEstudiante.endTime).getTime() : Date.now();
  const min = Math.floor((fin - inicio) / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function _respuestasKeys(respuestasObj) {
  if (!respuestasObj || typeof respuestasObj !== 'object') return [];
  const META = new Set(['nie', 'nombre', 'startTime', 'endTime', 'status']);
  return Object.keys(respuestasObj).filter((k) => !META.has(k));
}

function _avance(respuestasObj, totalPreguntas) {
  if (!respuestasObj || typeof respuestasObj !== 'object') {
    return { respondidas: 0, total: totalPreguntas || 0, porcentaje: 0 };
  }
  const keys = _respuestasKeys(respuestasObj);
  const respondidas = Math.min(keys.length, totalPreguntas || 0);
  return {
    respondidas,
    total: totalPreguntas || 0,
    porcentaje: totalPreguntas ? Math.min(100, Math.round((respondidas / totalPreguntas) * 100)) : 0,
  };
}

function _preguntaActual(respuestasObj, preguntasIds) {
  if (!respuestasObj || typeof respuestasObj !== 'object') return 1;
  const keys = _respuestasKeys(respuestasObj);
  if (keys.length === 0) return 1;
  let ultima = { idx: 0, ts: 0 };
  keys.forEach((k) => {
    const r = respuestasObj[k];
    if (r?.timestamp) {
      const ts = new Date(r.timestamp).getTime();
      if (ts > ultima.ts) {
        const idx = preguntasIds.indexOf(k);
        if (idx >= 0) ultima = { idx, ts };
      }
    }
  });
  return Math.min(ultima.idx + 1, preguntasIds.length);
}

function AnilloProgreso({ porcentaje, color, tamano = 84, grosor = 7 }) {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;

  return (
    <div className="relative" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="rotate-[-90deg]">
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          stroke="rgba(51,65,85,0.6)"
          strokeWidth={grosor}
        />
        <motion.circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          initial={{ strokeDashoffset: circunferencia }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black text-lg leading-none" style={{ color }}>
          {porcentaje}%
        </span>
        <span className="text-[7px] font-black uppercase text-slate-400 italic mt-0.5">
          avance
        </span>
      </div>
    </div>
  );
}

function TarjetaEstudiante({ alumno, respuestasEstudiante, totalPreguntas, preguntasIds, avatarColor, index, seleccionada, onToggle }) {
  const eventos = _eventosLista(alumno.eventos);
  const incidentes = eventos.filter((e) => e.severidad === 'warning' || e.severidad === 'suspicion').length;
  const finalizado = respuestasEstudiante?.status === 'finalizado';
  const status = alumno.status === 'warning' || alumno.status === 'suspicion'
    ? alumno.status
    : finalizado
    ? 'finalizado'
    : 'normal';
  const colorAnillo = COLOR_ANILLO[status] || COLOR_ANILLO.normal;
  const avance = _avance(respuestasEstudiante?.respuestas, totalPreguntas);
  const preguntaAct = _preguntaActual(respuestasEstudiante?.respuestas, preguntasIds);
  const cronometro = _cronometroCorto(respuestasEstudiante);
  const nombre = alumno.nombre || alumno.nie;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      className={`rounded-2xl border p-4 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
        seleccionada
          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg'
          : status === 'suspicion'
          ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
          : status === 'warning'
          ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
          : status === 'finalizado'
          ? 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50'
          : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
      }`}
      onClick={onToggle}
    >
<div className="relative">
          {alumno.fotoUrl ? (
            <img
              src={alumno.fotoUrl}
              alt={nombre}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
              referrerPolicy="no-referrer"
              onError={e => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=6366f1&color=fff&size=12`;
              }}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-black italic text-sm`}
            >
              {_iniciales(nombre, alumno.nie)}
            </div>
          )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
            PUNTO_STATUS[alumno.status] || PUNTO_STATUS.normal
          }`}
        />
        {avance.respondidas > 0 && avance.respondidas < avance.total && (
          <motion.span
            className="absolute -top-1 -left-1 w-3 h-3"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <span className="block w-3 h-3 rounded-full bg-emerald-400/80" />
          </motion.span>
        )}
      </div>

      <div className="text-center min-w-0">
        <p className="font-black text-[11px] uppercase italic text-slate-100 truncate max-w-[130px]">
          {nombre}
        </p>
        <p className="text-[8px] text-slate-500 uppercase font-bold">{alumno.nie}</p>
      </div>

      <AnilloProgreso porcentaje={avance.porcentaje} color={colorAnillo} />

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <span
          className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase italic ${
            status === 'suspicion'
              ? 'bg-rose-500/10 text-rose-400'
              : status === 'warning'
              ? 'bg-amber-500/10 text-amber-400'
              : status === 'finalizado'
              ? 'bg-sky-500/10 text-sky-400'
              : 'bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {ETIQUETA_STATUS[status] || ETIQUETA_STATUS.normal}
        </span>
        {incidentes > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[7px] font-black uppercase italic">
            <i className="fas fa-shield-halved mr-0.5" />
            {incidentes}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 justify-center">
        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[7px] font-black uppercase italic">
          P{preguntaAct} / {totalPreguntas}
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[7px] font-black uppercase italic">
          {avance.respondidas}/{avance.total}
        </span>
        {cronometro && (
          <span
            className={`px-2 py-0.5 rounded text-[7px] font-black uppercase italic ${
              finalizado ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            <i className={`fas ${finalizado ? 'fa-flag-checkered' : 'fa-stopwatch'} mr-0.5`} />
            {cronometro}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function LiveGameView({ estudiantes, respuestas = {}, preguntas = [], onDetalle, grado, examenId, claveAdmin }) {
  const [detalleNIE, setDetalleNIE] = useState(null);
  const [soloIncidentes, setSoloIncidentes] = useState(false);

  const lista = useMemo(
    () =>
      Object.entries(estudiantes)
        .map(([nie, data]) => ({ nie, ...data }))
        .sort((a, b) => {
          const orden = { suspicion: 0, warning: 1, normal: 2, en_curso: 2, finalizado: 3 };
          return (orden[a.status] ?? 4) - (orden[b.status] ?? 4);
        }),
    [estudiantes]
  );

  const totalPreguntas = preguntas.length;
  const preguntasIds = useMemo(() => preguntas.map((p) => p.id), [preguntas]);

  const mapaPorPregunta = useMemo(() => {
    const mapa = {};
    preguntasIds.forEach((id, idx) => {
      mapa[idx] = 0;
    });
    Object.values(respuestas).forEach((est) => {
      const keys = _respuestasKeys(est?.respuestas);
      keys.forEach((k) => {
        const idx = preguntasIds.indexOf(k);
        if (idx >= 0) mapa[idx] = (mapa[idx] || 0) + 1;
      });
    });
    return mapa;
  }, [respuestas, preguntasIds]);

  const totalEstudiantes = lista.length;
  // "Completaron" = entregaron el examen (status finalizado), no solo respondieron todo.
  const completaron = lista.filter((a) => respuestas[a.nie]?.status === 'finalizado').length;

  if (totalEstudiantes === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <i className="fas fa-user-slash text-3xl mb-3" />
        <p className="text-xs font-bold italic uppercase">
          No hay estudiantes activos en este momento.
        </p>
      </div>
    );
  }

  const estudiantesFiltrados = soloIncidentes
    ? lista.filter((a) => _eventosLista(a.eventos).some((e) => e.severidad === 'warning' || e.severidad === 'suspicion'))
    : lista;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <motion.span
            className="w-3 h-3 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          />
          <p className="text-[9px] font-black uppercase text-emerald-400 italic tracking-widest">
            EN VIVO · {totalEstudiantes} estudiantes · {completaron} completaron
          </p>
        </div>
        <button
          onClick={() => setSoloIncidentes((v) => !v)}
          className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase italic tracking-widest transition ${
            soloIncidentes
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
          }`}
        >
          <i className={`fas ${soloIncidentes ? 'fa-shield-halved' : 'fa-users'} mr-1`} />
          {soloIncidentes ? 'Solo con incidentes' : 'Todos los estudiantes'}
        </button>
      </div>

      {estudiantesFiltrados.length === 0 ? (
        <p className="text-center text-slate-400 text-[10px] font-bold italic uppercase py-8">
          Ningún estudiante con incidentes.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {estudiantesFiltrados.map((alumno, idx) => (
            <TarjetaEstudiante
              key={alumno.nie}
              alumno={alumno}
              respuestasEstudiante={respuestas[alumno.nie]}
              totalPreguntas={totalPreguntas}
              preguntasIds={preguntasIds}
              avatarColor={PALETA_AVATAR[idx % PALETA_AVATAR.length]}
              index={idx}
              seleccionada={detalleNIE === alumno.nie}
              onToggle={() => {
                const siguiente = detalleNIE === alumno.nie ? null : alumno.nie;
                setDetalleNIE(siguiente);
                onDetalle?.(siguiente ? alumno : null);
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {detalleNIE && (
          <motion.div
            key="detalle-vivo"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {(() => {
              const alumno = lista.find((a) => a.nie === detalleNIE);
              if (!alumno) return null;
              return <StudentActivityDetail alumno={alumno} respuestas={respuestas[alumno.nie]} preguntas={preguntas} grado={grado} examenId={examenId} claveAdmin={claveAdmin} />;
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {totalPreguntas > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">
              <i className="fas fa-signal mr-1 text-indigo-400" />
              Mapa de respuestas en vivo
            </p>
            <p className="text-[7px] font-bold uppercase italic text-slate-500">
              Estudiantes que ya respondieron cada pregunta
            </p>
          </div>

          <div className="space-y-3">
            {preguntas.map((p, idx) => {
              const respondieron = mapaPorPregunta[idx] || 0;
              const porcentaje = totalEstudiantes ? Math.round((respondieron / totalEstudiantes) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold italic text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="font-black text-indigo-400">P{idx + 1}:</span>
                      <RenderTextoConMath texto={p.enunciado || p.formula} />
                    </span>
                    <span className="text-slate-400 font-mono text-[8px] shrink-0 ml-2">
                      {respondieron}/{totalEstudiantes} ({porcentaje}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${porcentaje >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(porcentaje, respondieron > 0 ? 4 : 0)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}