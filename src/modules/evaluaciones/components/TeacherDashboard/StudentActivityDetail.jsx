import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { reiniciarTiempoExamen } from '../../services/examService';

/** Firebase guarda eventos como objeto con claves push: convertir a arreglo. */
function _eventosLista(eventos) {
  if (Array.isArray(eventos)) return eventos;
  if (eventos && typeof eventos === 'object') return Object.values(eventos);
  return [];
}

const ETIQUETA_EVENTO = {
  blur_window: 'Minimizó o cambió de ventana',
  visibility_change: 'La pestaña quedó oculta',
  exit_fullscreen: 'Salió de pantalla completa',
  tab_switch: 'Cambió de pestaña (Tab)',
  paste_bloqueado: 'Intento de pegar',
  copy_bloqueado: 'Intento de copiar',
  cut_bloqueado: 'Intento de cortar',
  context_menu_bloqueado: 'Clic derecho bloqueado',
  tecla_bloqueada: 'Combinación de teclas bloqueada',
  paste_rapido: 'Pegado rápido detectado',
  insercion_masiva: 'Inserción masiva de texto',
  insercion_masiva_input: 'Escritura masiva en un campo',
  escritura_rapida: 'Escritura muy rápida',
};

const ICONO_EVENTO = {
  blur_window: 'fa-window-minimize',
  visibility_change: 'fa-eye-slash',
  exit_fullscreen: 'fa-compress',
  tab_switch: 'fa-table-columns',
  paste_bloqueado: 'fa-clipboard',
  copy_bloqueado: 'fa-copy',
  cut_bloqueado: 'fa-scissors',
  context_menu_bloqueado: 'fa-bars',
  tecla_bloqueada: 'fa-keyboard',
  paste_rapido: 'fa-bolt',
  insercion_masiva: 'fa-text-height',
  insercion_masiva_input: 'fa-message',
  escritura_rapida: 'fa-gauge-high',
};

// Helper para parsear y renderizar KaTeX dinámicamente
function RenderTextoConMath({ texto }) {
  if (!texto) return null;
  const partes = String(texto).split(/(\$\$.*?\$\$|\$.*?\$)/g);

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

function _formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

function _formatDuracion(ms) {
  if (ms == null || ms < 0 || isNaN(ms)) return '—';
  const totalSeg = Math.floor(ms / 1000);
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Convierte la respuesta cruda del estudiante a texto legible para el docente:
 * letras de opción → su texto, ids de emparejamiento → textos del par, etc.
 */
function _textoRespuesta(pregunta, valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  switch (pregunta.tipo) {
    case 'opcion_multiple': {
      const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
      const textoDe = (id) => {
        const op = opciones.find((x) => (typeof x === 'string' ? x : x?.id) === id);
        if (op == null) return String(id);
        return typeof op === 'string' ? op : op.texto || String(id);
      };
      const arr = Array.isArray(valor) ? valor : [valor];
      return arr.map(textoDe).join(' · ');
    }

    case 'verdadero_falso':
      return valor === true ? 'Verdadero' : valor === false ? 'Falso' : String(valor);

    case 'ordenar': {
      if (!Array.isArray(valor)) return String(valor);
      // La respuesta puede ser el arreglo de textos ya ordenados, o índices
      if (valor.every((v) => typeof v === 'string')) return valor.join(' → ');
      return valor.map((idx) => pregunta.items?.[idx] ?? `#${idx}`).join(' → ');
    }

    case 'emparejar': {
      if (!valor || typeof valor !== 'object') return String(valor);
      const pares = Array.isArray(pregunta.pares) ? pregunta.pares : [];
      return Object.entries(valor)
        .map(([k, v]) => {
          const izq = pares.find((p) => String(p.id) === String(k))?.izquierda;
          const der = pares.find((p) => String(p.id) === String(v))?.derecha;
          return `${izq ?? k} → ${der ?? v}`;
        })
        .join(' · ');
    }

    default:
      return String(valor);
  }
}

export default function StudentActivityDetail({ alumno, respuestas, preguntas, grado, examenId, claveAdmin }) {
  const [soloIncidentes, setSoloIncidentes] = useState(false);
  const [reiniciandoTiempo, setReiniciandoTiempo] = useState(false);
  const [msgReinicio, setMsgReinicio] = useState(null);

  const handleReiniciarTiempo = async () => {
    if (!grado || !examenId || !alumno.nie) return;
    if (!window.confirm(`¿Reiniciar el tiempo del examen para ${alumno.nombre || alumno.nie}? El estudiante deberá recargar la página.`)) return;
    setReiniciandoTiempo(true);
    setMsgReinicio(null);
    try {
      await reiniciarTiempoExamen(grado, examenId, alumno.nie);
      setMsgReinicio({ tipo: 'ok', texto: 'Tiempo reiniciado. El estudiante debe recargar la página.' });
    } catch (err) {
      setMsgReinicio({ tipo: 'error', texto: err.message || 'Error al reiniciar.' });
    } finally {
      setReiniciandoTiempo(false);
    }
  };

  const eventos = _eventosLista(alumno.eventos);
  const visibles = soloIncidentes
    ? eventos.filter((e) => e.severidad === 'warning' || e.severidad === 'suspicion')
    : eventos;

  const infoNavegador = alumno.navegador || alumno.infoNavegador || null;
  const respuestasObj = respuestas?.respuestas || respuestas || {};
  const finalizado = respuestas?.status === 'finalizado' || alumno.status === 'finalizado';
  const enAdvertencia = alumno.status === 'warning';
  const enSospecha = alumno.status === 'suspicion';

  const listaRespuestas = (preguntas || []).map((p) => {
    const resp = respuestasObj[p.id];
    const valor = resp && typeof resp === 'object' && 'valor' in resp ? resp.valor : resp;
    const ts = resp && typeof resp === 'object' ? resp.timestamp : null;
    return { pregunta: p, valor, timestamp: ts };
  });

  const total = listaRespuestas.length;
  const respondidas = listaRespuestas.filter(
    (r) => r.valor !== undefined && r.valor !== null && r.valor !== ''
  ).length;
  const porcentajeProgreso = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  // Última pregunta tocada según el timestamp más reciente
  let preguntaActualIdx = 0;
  let ultimaTs = 0;
  listaRespuestas.forEach(({ pregunta, timestamp }, idx) => {
    if (!timestamp) return;
    const t = new Date(timestamp).getTime() || 0;
    if (t > ultimaTs) {
      ultimaTs = t;
      preguntaActualIdx = idx;
    }
  });

  // Reloj en vivo mientras el estudiante sigue activo
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (finalizado) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finalizado]);

  const inicioTs = respuestas?.startTime ? new Date(respuestas.startTime).getTime() : null;
  const finTs = respuestas?.endTime ? new Date(respuestas.endTime).getTime() : null;
  const msTranscurridos =
    inicioTs != null ? (finTs ?? ahora) - inicioTs : null;

  const incidentesGraves = eventos.filter(
    (e) => e.severidad === 'warning' || e.severidad === 'suspicion'
  ).length;

  const estadoChip = finalizado
    ? { texto: 'Finalizado', clase: 'bg-sky-500/15 text-sky-300 border-sky-500/40', icono: 'fa-flag-checkered' }
    : enSospecha
    ? { texto: 'Sospecha de fraude', clase: 'bg-rose-500/15 text-rose-300 border-rose-500/40', icono: 'fa-shield-halved' }
    : enAdvertencia
    ? { texto: 'Con advertencias', clase: 'bg-amber-500/15 text-amber-300 border-amber-500/40', icono: 'fa-triangle-exclamation' }
    : { texto: 'En desarrollo', clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icono: 'fa-circle-play' };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Encabezado con identidad y estado */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-800 bg-slate-900">
        {alumno.fotoUrl ? (
          <img
            src={alumno.fotoUrl}
            alt={alumno.nombre || alumno.nie}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/50"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black italic">
            {(alumno.nombre || alumno.nie || '?').slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-[160px]">
          <p className="text-xs font-black uppercase italic text-slate-100 leading-tight">
            {alumno.nombre || 'Estudiante'}
          </p>
          <p className="text-[9px] text-slate-400 font-bold font-mono">NIE {alumno.nie}</p>
        </div>

        <span className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase italic tracking-widest ${estadoChip.clase}`}>
          <i className={`fas ${estadoChip.icono} mr-1`} />
          {estadoChip.texto}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {infoNavegador && (
            <>
              <span className="px-2 py-1 rounded-lg bg-slate-800 text-[8px] font-black uppercase text-indigo-300 italic">
                <i className="fas fa-globe mr-1" /> {infoNavegador.nombre}
              </span>
              <span className="hidden sm:inline px-2 py-1 rounded-lg bg-slate-800 text-[8px] font-black uppercase text-slate-400 italic">
                <i className="fas fa-desktop mr-1" /> {infoNavegador.dispositivo}
              </span>
            </>
          )}
          {!finalizado && grado && examenId && (
            <button
              onClick={handleReiniciarTiempo}
              disabled={reiniciandoTiempo}
              className="px-2 py-1 rounded-lg bg-amber-500/15 text-[8px] font-black uppercase text-amber-300 italic hover:bg-amber-500/25 transition disabled:opacity-50"
            >
              <i className={`fas ${reiniciandoTiempo ? 'fa-spinner fa-spin' : 'fa-rotate-left'} mr-1`} />
              {reiniciandoTiempo ? 'Reiniciando...' : 'Reiniciar tiempo'}
            </button>
          )}
          <button
            onClick={() => setSoloIncidentes((v) => !v)}
            className="text-[8px] font-black uppercase text-slate-400 italic tracking-widest hover:text-indigo-300 transition"
          >
            {soloIncidentes ? 'Toda la actividad' : 'Solo incidentes'}
          </button>
        </div>
      </div>

      {msgReinicio && (
        <div className={`px-4 py-2 text-[9px] font-bold italic ${msgReinicio.tipo === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {msgReinicio.texto}
        </div>
      )}

      {/* Métricas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800 border-b border-slate-800 bg-slate-900/60">
        <div className="p-3 text-center">
          <p className="text-lg font-black text-indigo-400 leading-none">{porcentajeProgreso}%</p>
          <p className="text-[7px] font-black uppercase text-slate-500 italic tracking-widest mt-1">Progreso</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-black text-emerald-400 leading-none">{respondidas}<span className="text-slate-500 text-xs">/{total}</span></p>
          <p className="text-[7px] font-black uppercase text-slate-500 italic tracking-widest mt-1">Respondidas</p>
        </div>
        <div className="p-3 text-center">
          <p className={`text-lg font-black leading-none ${incidentesGraves > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{incidentesGraves}</p>
          <p className="text-[7px] font-black uppercase text-slate-500 italic tracking-widest mt-1">Incidentes</p>
        </div>
        <div className="p-3 text-center">
          <p className={`text-lg font-black leading-none ${finalizado ? 'text-sky-400' : 'text-amber-400'}`}>
            {_formatDuracion(msTranscurridos)}
          </p>
          <p className="text-[7px] font-black uppercase text-slate-500 italic tracking-widest mt-1">
            {finalizado ? 'Tiempo usado' : 'Transcurrido'}
          </p>
        </div>
      </div>

      {/* Barra de posición por pregunta */}
      {!finalizado && total > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800 bg-slate-900/40 flex-wrap">
          <span className="text-[8px] font-black uppercase text-slate-500 italic tracking-widest mr-1.5">
            Va en:
          </span>
          {listaRespuestas.map(({ pregunta, valor }, idx) => {
            const respondida = valor !== undefined && valor !== null && valor !== '';
            const esActual = idx === preguntaActualIdx;
            return (
              <span
                key={pregunta.id}
                title={respondida ? 'Respondida' : 'Pendiente'}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black transition ${
                  esActual
                    ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50 scale-110'
                    : respondida
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {idx + 1}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Respuestas con hora exacta */}
        <div>
          <p className="text-[8px] font-black uppercase text-slate-500 italic tracking-widest mb-2">
            Respuestas en vivo ({respondidas}/{total})
          </p>
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {listaRespuestas.map(({ pregunta, valor, timestamp }, idx) => {
              const respondida = valor !== undefined && valor !== null && valor !== '';
              const textoFormateado = _textoRespuesta(pregunta, valor) ?? 'Sin responder';

              return (
                <div
                  key={pregunta.id}
                  className={`rounded-xl px-3 py-2 border ${
                    respondida
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-slate-800/40 border-slate-700'
                  }`}
                >
                  <div className="uppercase text-[8px] mb-0.5 text-slate-300 flex items-start justify-between gap-2">
                    <span className="font-black text-indigo-400">
                      P{idx + 1} — <RenderTextoConMath texto={pregunta.enunciado || pregunta.formula} />
                    </span>
                    <span className="text-[7px] text-slate-500 font-mono normal-case shrink-0 mt-0.5">
                      {respondida ? _formatTime(timestamp) : ''}
                    </span>
                  </div>
                  <div
                    className={`text-[9px] font-bold italic ${respondida ? 'text-emerald-300' : 'text-slate-600'}`}
                    title={respondida ? textoFormateado : undefined}
                  >
                    {respondida ? <i className="fas fa-check-circle mr-1" /> : <i className="far fa-circle mr-1" />}
                    <RenderTextoConMath texto={textoFormateado} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bitácora de supervisión */}
        <div>
          <p className="text-[8px] font-black uppercase text-slate-500 italic tracking-widest mb-2">
            Actividad y supervisión ({visibles.length})
          </p>
          <div className="mb-2 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700 text-[8px] font-bold italic text-slate-400 space-y-0.5">
            <p><i className="fas fa-play text-emerald-400 mr-1.5" /> Inicio: {_formatTime(respuestas?.startTime)}</p>
            {respuestas?.endTime && (
              <p><i className="fas fa-flag-checkered text-sky-400 mr-1.5" /> Entrega: {_formatTime(respuestas.endTime)}</p>
            )}
          </div>
          {visibles.length === 0 ? (
            <p className="text-[9px] text-slate-500 italic font-bold px-1">
              {soloIncidentes ? 'Sin incidentes detectados. Todo en orden.' : 'Sin actividad registrada todavía.'}
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {visibles
                .slice()
                .reverse()
                .map((e) => (
                  <div
                    key={e.id || `${e.tipo}-${e.timestamp}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 border text-[9px] font-bold italic ${
                      e.severidad === 'suspicion'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        : e.severidad === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <i className={`fas ${ICONO_EVENTO[e.tipo] || 'fa-circle-exclamation'} text-[10px]`} />
                    <span className="flex-1">{ETIQUETA_EVENTO[e.tipo] || e.tipo}</span>
                    <span className="text-[8px] text-slate-500 font-mono">{_formatTime(e.timestamp)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
