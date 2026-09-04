import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLOR_ESTADO_EVALUACION } from '../../constants';

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

function _formatTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

const _META_KEYS = new Set(['nie', 'nombre', 'startTime', 'endTime', 'status', 'updatedAt']);

function _avance(respuestasObj, totalPreguntas) {
  if (!respuestasObj || typeof respuestasObj !== 'object') {
    return { respondidas: 0, total: totalPreguntas || 0, porcentaje: 0 };
  }

  const respondidas = Object.entries(respuestasObj).filter(
    ([k, v]) => !_META_KEYS.has(k) && v !== null && v !== undefined && v !== ''
  ).length;

  return {
    respondidas,
    total: totalPreguntas || 0,
    porcentaje: totalPreguntas ? Math.min(100, Math.round((respondidas / totalPreguntas) * 100)) : 0,
  };
}

export default function StudentMatrix({ estudiantes = {}, respuestas = {}, preguntas = [] }) {
  const [detalleNIE, setDetalleNIE] = useState(null);

  // Memoiza el ordenamiento por prioridad de sospecha para optimizar el rendimiento en tiempo real
  const listaOrdenada = useMemo(() => {
    const orden = { suspicion: 0, warning: 1, normal: 2 };
    return Object.entries(estudiantes)
      .map(([nie, data]) => ({ nie, ...data }))
      .sort((a, b) => (orden[a.status] ?? 3) - (orden[b.status] ?? 3));
  }, [estudiantes]);

  if (listaOrdenada.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <i className="fas fa-user-slash text-3xl mb-3" />
        <p className="text-xs font-bold italic uppercase">
          No hay estudiantes activos en este momento.
        </p>
      </div>
    );
  }

  const totalPreguntas = preguntas.length;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border border-slate-700 rounded-2xl overflow-hidden">
          <thead>
            <tr className="bg-slate-800">
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Estudiante</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Estado</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Avance</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Navegador</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Incidentes</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Última actividad</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic tracking-widest">Ver</th>
            </tr>
          </thead>
          <tbody>
            {listaOrdenada.map((alumno) => {
              const eventos = _eventosLista(alumno.eventos);
              const incidentes = eventos.filter(
                (e) => e.severidad === 'warning' || e.severidad === 'suspicion'
              ).length;
              const ultimoEvento = eventos[eventos.length - 1] || null;
              const navegador = alumno.navegador || alumno.infoNavegador || null;
              const avance = _avance(respuestas[alumno.nie]?.respuestas, totalPreguntas);
              const tieneDetalle = detalleNIE === alumno.nie;

              return (
                <React.Fragment key={alumno.nie}>
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border-t border-slate-800 italic font-bold cursor-pointer hover:bg-slate-800/40 select-none"
                    onClick={() => setDetalleNIE(tieneDetalle ? null : alumno.nie)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${COLOR_ESTADO_EVALUACION?.[alumno.status] || 'bg-slate-500'}`} />
                        <span className="text-xs text-slate-200 uppercase">
                          {alumno.nombre || alumno.nie}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase font-black">
                          {alumno.nie}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                        alumno.status === 'normal' || !alumno.status
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : alumno.status === 'warning'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {alumno.status === 'normal' || !alumno.status
                          ? 'Normal'
                          : alumno.status === 'warning'
                          ? 'Advertencia'
                          : 'Sospecha'}
                      </span>
                    </td>
                    <td className="p-3 min-w-[110px]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${avance.porcentaje >= 100 ? 'bg-emerald-500' : avance.porcentaje > 0 ? 'bg-indigo-500' : 'bg-slate-600'}`}
                            style={{ width: `${Math.max(avance.porcentaje, 4)}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-slate-400 font-black">
                          {avance.respondidas}/{avance.total || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {navegador ? (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-globe text-slate-400 text-[10px]" />
                          <span className="text-[9px] text-slate-300 font-bold">
                            {navegador.nombre}
                          </span>
                          <span className="text-[8px] text-slate-500 uppercase">
                            {navegador.dispositivo}{navegador.os ? ` · ${navegador.os}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[8px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {incidentes > 0 ? (
                        <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-rose-500/10 text-rose-400">
                          {incidentes} incidente(s)
                        </span>
                      ) : (
                        <span className="text-[8px] text-slate-500">Sin incidentes</span>
                      )}
                    </td>
                    <td className="p-3 text-[8px] text-slate-500 font-bold">
                      {ultimoEvento ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{ETIQUETA_EVENTO[ultimoEvento.tipo] || ultimoEvento.tipo}</span>
                          <span>{_formatTime(ultimoEvento.timestamp)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <i className={`fas ${tieneDetalle ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-500`} />
                    </td>
                  </motion.tr>

                  {tieneDetalle && (
                    <tr className="border-t border-slate-800 bg-slate-900/60">
                      <td colSpan={7} className="p-4">
                        <ActividadDetalle alumno={alumno} eventos={eventos} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[8px] text-slate-600 italic font-bold mt-2 ml-1">
        Haz clic en un estudiante para ver su actividad en tiempo real.
      </p>
    </div>
  );
}

function ActividadDetalle({ alumno, eventos = [] }) {
  const [soloIncidentes, setSoloIncidentes] = useState(true);

  const visibles = useMemo(() => {
    const listaEventos = soloIncidentes
      ? eventos.filter((e) => e.severidad === 'warning' || e.severidad === 'suspicion')
      : eventos;

    return listaEventos.slice().reverse();
  }, [eventos, soloIncidentes]);

  const infoNavegador = alumno.navegador || alumno.infoNavegador || null;

  return (
    <div>
      {infoNavegador && (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-[8px] font-black uppercase text-indigo-300 italic">
            <i className="fas fa-globe mr-1" /> {infoNavegador.nombre}
          </span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-[8px] font-black uppercase text-slate-400 italic">
            <i className="fas fa-desktop mr-1" /> {infoNavegador.dispositivo}
          </span>
          {infoNavegador.os && (
            <span className="px-2 py-1 rounded-lg bg-slate-800 text-[8px] font-black uppercase text-slate-400 italic">
              <i className="fas fa-server mr-1" /> {infoNavegador.os}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">
          Actividad del estudiante ({visibles.length})
        </p>
        <button
          onClick={() => setSoloIncidentes((v) => !v)}
          className="text-[8px] font-black uppercase text-indigo-400 italic tracking-widest hover:text-indigo-300 transition"
        >
          {soloIncidentes ? 'Mostrar toda la actividad' : 'Solo incidentes'}
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="text-[9px] text-slate-500 italic font-bold">
          {soloIncidentes ? 'Sin incidentes detectados. ¡Todo en orden!' : 'Sin actividad registrada todavía.'}
        </p>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {visibles.map((e, index) => (
            <div
              key={e.id || `${e.tipo}-${e.timestamp}-${index}`}
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
              <span className="text-[8px] text-slate-500">{_formatTime(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}