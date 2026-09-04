import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { escucharProctoring, listarExamenes, escucharRespuestasExamen } from '../../services/examService';
import LiveMetricsPanel from './LiveMetricsPanel';
import LiveGameView from './LiveGameView';

export default function TeacherDashboard({ grado, claveAdmin, onNavegar }) {
  const [examenes, setExamenes] = useState([]);
  const [examenActivo, setExamenActivo] = useState(null);
  const [estudiantesActivos, setEstudiantesActivos] = useState({});
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarExamenes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grado]);

  const cargarExamenes = useCallback(async () => {
    if (!grado) return;
    setCargando(true);
    setError('');
    try {
      // Sin segundo argumento: el parámetro de listarExamenes es "estado",
      // pasar claveAdmin filtraba todo y la lista quedaba vacía.
      const lista = await listarExamenes(grado);
      const activos = lista.filter((e) => !e.eliminado);
      setExamenes(activos);
    } catch (err) {
      setError(err.message || 'Error cargando exámenes.');
    } finally {
      setCargando(false);
    }
  }, [grado, claveAdmin]);

  // Suscripciones en tiempo real propias del ciclo de vida del examen activo:
  // se crean al monitorear y se cancelan al cambiar/detener/desmontar.
  const examenActivoId = examenActivo?.id;
  useEffect(() => {
    if (!grado || !examenActivoId) return undefined;
    setEstudiantesActivos({});
    setRespuestas({});
    const unsubProctoring = escucharProctoring(grado, examenActivoId, (data) => {
      setEstudiantesActivos(data || {});
    });
    const unsubRespuestas = escucharRespuestasExamen(grado, examenActivoId, (data) => {
      setRespuestas(data || {});
    });
    return () => {
      unsubProctoring?.();
      unsubRespuestas?.();
    };
  }, [grado, examenActivoId]);

  const activarMonitoreo = useCallback((examenId) => {
    const examen = examenes.find((e) => e.id === examenId);
    if (!examen) return;
    setExamenActivo(examen);
  }, [examenes]);

  const detenerMonitoreo = useCallback(() => {
    setExamenActivo(null);
    setEstudiantesActivos({});
    setRespuestas({});
  }, []);

  const handleEditarExamen = (e, examen) => {
    e.stopPropagation();
    if (typeof onNavegar === 'function') {
      // Redirige al ExamBuilder pasando la referencia del examen
      onNavegar('crear', examen);
    }
  };

  const getCountByStatus = (status) => {
    return Object.values(estudiantesActivos).filter((s) => s.status === status).length;
  };

  // "Activos" = conectados al examen y que aún no finalizan.
  const totalActivos = Object.values(estudiantesActivos).filter(
    (s) => s.status !== 'finalizado'
  ).length;
  const totalWarnings = getCountByStatus('warning');
  const totalSuspect = getCountByStatus('suspicion');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100">
            <span className="text-indigo-400">Panel de Control</span> — Supervisión en Vivo
          </h2>
          <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">
            Sección: {grado}
          </p>
        </div>
        {onNavegar && (
          <button
            onClick={() => onNavegar('lista')}
            className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-300 transition"
          >
            <i className="fas fa-arrow-left mr-2" /> Volver a Lista
          </button>
        )}
      </div>

      {/* Métrica de Estudiantes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-4xl font-black text-emerald-400 mb-2">{totalActivos}</div>
          <p className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">
            Estudiantes activos
          </p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-4xl font-black text-amber-400 mb-2">{totalWarnings}</div>
          <p className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">
            Advertencias
          </p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-4xl font-black text-rose-400 mb-2">{totalSuspect}</div>
          <p className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">
            Sospecha de fraude
          </p>
        </motion.div>
      </div>

      {/* Exámenes Disponibles */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6">
        <h3 className="text-xs font-black uppercase text-slate-400 italic tracking-widest mb-4">
          Exámenes disponibles para monitorear
        </h3>

        {cargando && (
          <div className="flex items-center justify-center gap-3 text-indigo-400 py-8">
            <i className="fas fa-spinner fa-pulse" />
            <span className="text-[10px] font-black uppercase">Cargando exámenes...</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 flex items-center gap-3">
            <i className="fas fa-exclamation-circle" />
            <span className="text-[10px] font-bold italic">{error}</span>
          </div>
        )}

        {!cargando && examenes.length === 0 && (
          <p className="text-center text-slate-400 text-xs italic font-bold uppercase py-8">
            No hay exámenes disponibles en esta sección.
          </p>
        )}

        <div className="space-y-3">
          {examenes.map((examen) => (
            <ExamCard
              key={examen.id}
              examen={examen}
              activo={examenActivo?.id === examen.id}
              onClick={() => activarMonitoreo(examen.id)}
              onEditar={(e) => handleEditarExamen(e, examen)}
            />
          ))}
        </div>
      </div>

      {/* Panel en Vivo / Matriz de Supervisión */}
      <AnimatePresence>
        {examenActivo && (
          <motion.div
            key="matriz-vivo"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase text-indigo-400 italic tracking-widest">
                  Matriz de Supervisión — {examenActivo.titulo}
                </h3>
                <p className="text-[8px] text-slate-500 font-bold">
                  Actualización en tiempo real
                </p>
              </div>
              <button
                onClick={detenerMonitoreo}
                className="text-[9px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-400 transition"
              >
                <i className="fas fa-stop mr-1" /> Detener
              </button>
            </div>

            <LiveMetricsPanel estudiantes={estudiantesActivos} respuestas={respuestas} preguntas={examenActivo.preguntas} />
            <LiveGameView
              estudiantes={estudiantesActivos}
              respuestas={respuestas}
              preguntas={examenActivo.preguntas}
              grado={grado}
              examenId={examenActivoId}
              claveAdmin={claveAdmin}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExamCard({ examen, activo, onClick, onEditar }) {
  const estadoColor = {
    borrador: 'text-slate-400',
    activo: 'text-emerald-400',
    en_curso: 'text-indigo-400',
    finalizado: 'text-amber-400',
    calificado: 'text-slate-300',
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`border rounded-2xl p-4 cursor-pointer transition-all ${
        activo
          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg'
          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-black text-sm text-slate-100 italic uppercase">
            {examen.titulo || 'Sin título'}
          </p>
          <div className="flex gap-4 mt-1 text-[8px] font-bold uppercase text-slate-500 italic">
            <span>
              <i className="fas fa-question mr-1" />
              {(examen.preguntas || []).length} preguntas
            </span>
            <span>
              <i className="fas fa-clock mr-1" />
              {examen.configuracion?.duracionMinutos || 60} min
            </span>
            <span>
              <i className="fas fa-star mr-1" />
              {Number(examen.configuracion?.puntajeTotal || 0).toFixed(2)} pts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[8px] font-black uppercase ${estadoColor[examen.estado] || 'text-slate-400'}`}>
            {examen.estado || 'borrador'}
          </span>

          <button
            onClick={onEditar}
            title="Editar evaluación"
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg text-[9px] font-bold transition flex items-center gap-1"
          >
            <i className="fas fa-pen text-[9px]" />
            <span>Editar</span>
          </button>

          {activo ? (
            <i className="fas fa-eye text-indigo-400 text-sm ml-1" />
          ) : (
            <i className="fas fa-chevron-right text-slate-500 text-sm ml-1" />
          )}
        </div>
      </div>
    </motion.div>
  );
}