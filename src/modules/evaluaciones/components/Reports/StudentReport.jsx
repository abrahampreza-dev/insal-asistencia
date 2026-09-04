import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { obtenerExamen, calcularCalificacionesExamen } from '../../services/examService';
import { leerRuta } from '../../../../firebase';
import { ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';
import PDFCertificate from './PDFCertificate';

export default function StudentReport({ nie, grado, examenId, onVolver }) {
  const [examen, setExamen] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Candado: evita lanzar la calificación IA dos veces (cada corrida cuesta
  // y tarda; los clics repetidos en "reintentar" encolaban procesos).
  const procesandoRef = useRef(false);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nie, grado, examenId]);

  const cargarDatos = async () => {
    if (!grado || !examenId) return;
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setCargando(true);
    try {
      const [examenData, dataEstudiantes] = await Promise.all([
        obtenerExamen(grado, examenId),
        leerRuta(`estudiantes/${grado}`),
      ]);
      setExamen(examenData);
      setEstudiante(dataEstudiantes?.[nie] || { nie, nombres: 'Estudiante', apellidos: 'Registrado' });

      const califs = await calcularCalificacionesExamen(grado, examenId);
      const resultadoAlumno = califs.find((c) => c.nie === nie);
      if (!resultadoAlumno) {
        setError('No se encontraron resultados para este estudiante.');
      } else {
        setResultado(resultadoAlumno);
      }
    } catch (err) {
      setError(err.message || 'Error cargando datos del estudiante.');
    } finally {
      setCargando(false);
      procesandoRef.current = false;
    }
  };

  if (cargando) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-spinner fa-pulse text-2xl text-indigo-400 mb-3" />
        <p className="text-slate-400 font-bold">Generando el informe…</p>
        <p className="text-[10px] text-slate-500 font-bold italic mt-2 max-w-sm mx-auto leading-relaxed">
          Si el examen tiene preguntas de desarrollo, la calificación con IA
          puede tardar 1–2 minutos. No cierres ni recargues esta pantalla.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-6 text-center">
        <i className="fas fa-exclamation-circle text-xl mb-2" />
        <p className="font-bold">{error}</p>
      </div>
    );
  }

  if (!resultado || !examen) return null;

  const puntajeTotal = examen.configuracion?.puntajeTotal || 0;
  const porcentaje = resultado.porcentaje;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black italic uppercase text-slate-100">
          <span className="text-indigo-400">Reporte Individual</span>
        </h2>
        {onVolver && (
          <button
            onClick={onVolver}
            className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-300 transition"
          >
            <i className="fas fa-arrow-left mr-2" /> Volver
          </button>
        )}
      </div>

      <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-8 text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-black italic uppercase text-slate-100 mb-2">
            {examen.titulo}
          </h1>
          <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">
            {grado} · Sección
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <p className="text-[8px] font-black uppercase text-slate-500 italic mb-1">
              Puntaje obtenido
            </p>
            <p className="text-4xl font-black text-indigo-400">
              {Number(resultado.puntajeObtenido).toFixed(2)}/{puntajeTotal}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <p className="text-[8px] font-black uppercase text-slate-500 italic mb-1">
              Porcentaje
            </p>
            <p className={`text-4xl font-black ${
              porcentaje >= 90 ? 'text-emerald-400' :
              porcentaje >= 70 ? 'text-indigo-400' :
              porcentaje >= 60 ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {porcentaje}%
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <p className="text-[8px] font-black uppercase text-slate-500 italic mb-1">
              Calificación
            </p>
            <p className={`text-4xl font-black ${
              porcentaje >= 90 ? 'text-emerald-400' :
              porcentaje >= 80 ? 'text-sky-400' :
              porcentaje >= 70 ? 'text-indigo-400' :
              porcentaje >= 60 ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {resultado.calificacion?.split(' ')[0] || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-4 h-4 rounded-full ${
            porcentaje >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />
          <span className="text-sm font-black uppercase text-slate-200">
            {porcentaje >= 60 ? 'APROBADO' : 'REPROBADO'}
          </span>
        </div>

        <div className="flex justify-center gap-4 pt-2">
          <PDFCertificate
            resultado={resultado}
            examen={examen}
            estudiante={estudiante}
            tipo="reporte"
          />
          <PDFCertificate
            resultado={resultado}
            examen={examen}
            estudiante={estudiante}
            tipo="certificado"
          />
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6">
        <h3 className="text-xs font-black uppercase text-slate-400 italic tracking-widest mb-4">
          Detalle por pregunta
        </h3>

        <div className="space-y-3">
          {(examen.preguntas || []).map((pregunta, idx) => {
            const detalle = resultado.detallePreguntas?.find(
              (d) => d.preguntaId === pregunta.id
            );
            const acertada = detalle?.correcta;

            return (
              <motion.div
                key={pregunta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (idx + 1) * 0.05 }}
                className={`border rounded-2xl p-4 ${
                  acertada === true
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : acertada === false
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-slate-700 bg-slate-800/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded-lg flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold italic text-sm text-slate-200 mb-2">
                      {pregunta.enunciado}
                    </p>
                    <p className="text-[8px] font-black uppercase text-slate-400 italic mb-1">
                      {ETIQUETAS_TIPOS_PREGUNTA[pregunta.tipo] || pregunta.tipo} · {pregunta.puntaje} pts
                    </p>

                    {detalle && (
                      <div className="mt-2 text-[9px]">
                        {detalle.correcta === true && (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <i className="fas fa-check" /> Respuesta correcta
                          </span>
                        )}
                        {detalle.correcta === false && (
                          <span className="flex items-center gap-1 text-rose-400 font-bold">
                            <i className="fas fa-xmark" /> Respuesta incorrecta
                          </span>
                        )}
                        {typeof detalle.correcta === 'undefined' && detalle.score !== undefined && (
                          <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <i className="fas fa-star" /> Calificado: {Number(detalle.score).toFixed(2)}/{pregunta.puntaje}
                          </span>
                        )}
                        {detalle.feedback && (
                          <p className="mt-2 text-slate-300 italic bg-slate-800/50 p-2 rounded-xl">
                            {detalle.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
