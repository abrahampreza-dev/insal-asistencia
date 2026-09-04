import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { obtenerRespuestasExamen, calcularCalificacionesExamen, obtenerExamen } from '../../services/examService';
import { ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';

export default function AnalyticsDashboard({ grado, examenId, claveAdmin, onVolver }) {
  const [examen, setExamen] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestanaActiva, setPestanaActiva] = useState('items');

  useEffect(() => {
    cargarDatos();
  }, [grado, examenId]);

  const cargarDatos = async () => {
    if (!grado || !examenId) return;
    setCargando(true);
    setError('');
    try {
      const [examenData, respuestasData] = await Promise.all([
        obtenerExamen(grado, examenId),
        obtenerRespuestasExamen(grado, examenId),
      ]);
      setExamen(examenData);
      setRespuestas(respuestasData);

      const califs = await calcularCalificacionesExamen(grado, examenId);
      setCalificaciones(califs);
    } catch (err) {
      setError(err.message || 'Error cargando datos analíticos.');
    } finally {
      setCargando(false);
    }
  };

  const analisisItems = useMemo(() => {
    if (!examen || calificaciones.length === 0) return [];

    return (examen.preguntas || []).map((pregunta) => {
      const respuestasPregunta = calificaciones
        .filter((c) => c.detallePreguntas?.some((d) => d.preguntaId === pregunta.id))
        .map((c) => {
          const detalle = c.detallePreguntas.find((d) => d.preguntaId === pregunta.id);
          return detalle;
        });

      const total = respuestasPregunta.length;
      const acertadas = respuestasPregunta.filter((d) => d.correcta).length;
      const indiceExito = total > 0 ? (acertadas / total) * 100 : 0;
      const promedio = total > 0
        ? respuestasPregunta.reduce((sum, d) => sum + (d.puntajeObtenido || 0), 0) / total
        : 0;

      const tiempos = respuestasPregunta
        .map((d) => d.tiempoRespuesta || 0)
        .filter((t) => t > 0);
      const tiempoPromedio = tiempos.length > 0
        ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        : 0;

      return {
        id: pregunta.id,
        enunciado: pregunta.enunciado,
        tipo: pregunta.tipo,
        indiceExito,
        acertadas,
        total,
        promedio: Math.round(promedio * 100) / 100,
        tiempoPromedio: Math.round(tiempoPromedio),
        puntajeMaximo: pregunta.puntaje,
        indiceError: total > 0 ? ((total - acertadas) / total) * 100 : 0,
      };
    });
  }, [examen, calificaciones]);

  const itemsMasError = useMemo(() => {
    return [...analisisItems].sort((a, b) => b.indiceError - a.indiceError);
  }, [analisisItems]);

  const estadisticasGenerales = useMemo(() => {
    if (calificaciones.length === 0) return null;

    const puntajes = calificaciones.map((c) => c.porcentaje);
    const promedio = puntajes.reduce((a, b) => a + b, 0) / puntajes.length;
    const min = Math.min(...puntajes);
    const max = Math.max(...puntajes);

    const aprobados = calificaciones.filter((c) => c.porcentaje >= 60).length;
    const aprobadosPorcentaje = (aprobados / calificaciones.length) * 100;

    const suma = puntajes.reduce((a, b) => a + b, 0);
    const desviacionEstandar = Math.sqrt(
      puntajes.reduce((sq, n) => sq + Math.pow(n - promedio, 2), 0) / puntajes.length
    );

    return {
      totalEstudiantes: calificaciones.length,
      promedio: Math.round(promedio),
      min,
      max,
      desviacionEstandar: Math.round(desviacionEstandar),
      aprobados,
      aprobadosPorcentaje: Math.round(aprobadosPorcentaje),
      reprobados: calificaciones.length - aprobados,
    };
  }, [calificaciones]);

  const PESTANAS = [
    { id: 'items', texto: 'Análisis del Ítem', icono: 'fa-chart-bar' },
    { id: 'tiempos', texto: 'Tiempos', icono: 'fa-clock' },
    { id: 'integridad', texto: 'Matriz de Integridad', icono: 'fa-shield-halved' },
    { id: 'general', texto: 'Estadísticas Generales', icono: 'fa-chart-pie' },
  ];

  if (cargando) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-spinner fa-pulse text-2xl text-indigo-400 mb-3" />
        <p className="text-slate-400 font-bold">Cargando análisis...</p>
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

  const descargarNotasCsv = () => {
    if (!calificaciones || calificaciones.length === 0) return;
    let csv = '\uFEFFNIE;Apellidos;Nombres;PuntajeObtenido;PuntajeTotal;Porcentaje;Estado;Calificacion;FechaHora\n';
    calificaciones.forEach((c) => {
      const estado = c.porcentaje >= 60 ? 'APROBADO' : 'REPROBADO';
      const partesNombre = String(c.nombre || '').trim().split(/\s+/);
      const apellidos = partesNombre.slice(0, Math.max(1, Math.floor(partesNombre.length / 2))).join(' ');
      const nombres = partesNombre.slice(Math.max(1, Math.floor(partesNombre.length / 2))).join(' ');
      csv += `${c.nie || '-'};${apellidos};${nombres};${Number(c.puntajeObtenido ?? 0).toFixed(2)};${c.puntajeTotal ?? 10};${c.porcentaje ?? 0}%;${estado};${c.calificacion || '-'};${c.endTime || '-'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Notas_${grado}_${examen?.titulo || 'Evaluacion'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimirReporteNotasPdf = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100">
            <span className="text-indigo-400">Análisis y Reporte de Calificaciones</span>
          </h2>
          {examen && (
            <p className="text-xs text-slate-400 font-bold uppercase italic">
              {examen.titulo} · {grado}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={imprimirReporteNotasPdf}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition"
          >
            <i className="fas fa-file-pdf" /> Imprimir Reporte PDF
          </button>
          <button
            onClick={descargarNotasCsv}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
          >
            <i className="fas fa-file-excel" /> Exportar Notas (CSV)
          </button>
          {onVolver && (
            <button
              onClick={onVolver}
              className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-300 transition ml-2"
            >
              <i className="fas fa-arrow-left mr-2" /> Volver
            </button>
          )}
        </div>
      </div>

      {estadisticasGenerales && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <MetricaCard titulo="Promedio" valor={`${estadisticasGenerales.promedio}%`} icono="fa-chart-pie" color="indigo" />
          <MetricaCard titulo="Aprobados" valor={estadisticasGenerales.aprobados} icono="fa-user-check" color="emerald" />
          <MetricaCard titulo="Reprobados" valor={estadisticasGenerales.reprobados} icono="fa-user-xmark" color="rose" />
          <MetricaCard titulo="Desviación" valor={`±${estadisticasGenerales.desviacionEstandar}%`} icono="fa-chart-line" color="amber" />
        </motion.div>
      )}

      <div className="flex gap-2 flex-wrap bg-slate-900 p-2 rounded-2xl border border-slate-800 no-print">
        {PESTANAS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPestanaActiva(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all ${
              pestanaActiva === tab.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className={`fas ${tab.icono}`} />
            {tab.texto}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-6 min-h-[400px] no-print">
        {pestanaActiva === 'items' && <ItemAnalysis analisis={itemsMasError} />}
        {pestanaActiva === 'tiempos' && <TimeAnalysis analisis={analisisItems} />}
        {pestanaActiva === 'integridad' && <IntegridadMatrix calificaciones={calificaciones} examen={examen} />}
        {pestanaActiva === 'general' && <GeneralStats stats={estadisticasGenerales} calificaciones={calificaciones} />}
      </div>

      {/* Printable PDF Report Sheet Container */}
      <div className="wayground-card bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-6 text-center">
          <h2 className="text-xl font-black uppercase italic text-slate-100 tracking-tight">
            INSTITUTO NACIONAL SAN LUIS
          </h2>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">
            Consolidado Oficial de Calificaciones y Auditoría de Integridad
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Evaluación: {examen?.titulo || 'Examen'} • Sección: {grado}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs italic font-bold">
            <thead>
              <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-400 tracking-widest">
                <th className="p-3">#</th>
                <th className="p-3">Estudiante</th>
                <th className="p-3">NIE</th>
                <th className="p-3">Puntaje</th>
                <th className="p-3">Porcentaje</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Dispositivo Auditado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {calificaciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 uppercase">
                    Sin entregas registradas para este examen.
                  </td>
                </tr>
              ) : (
                calificaciones.map((c, idx) => (
                  <tr key={c.nie || idx} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 uppercase text-slate-200">{c.nombre || 'Estudiante Registrado'}</td>
                    <td className="p-3 font-mono text-slate-400 text-[10px]">{c.nie || '-'}</td>
                    <td className="p-3 font-mono text-slate-100">{Number(c.puntajeObtenido ?? 0).toFixed(2)} / {c.puntajeTotal ?? 10}</td>
                    <td className="p-3 font-mono text-indigo-400">{c.porcentaje ?? 0}%</td>
                    <td className="p-3">
                      {(c.porcentaje ?? 0) >= 60 ? (
                        <span className="text-emerald-400 font-black">✓ APROBADO</span>
                      ) : (
                        <span className="text-rose-400 font-black">✕ REPROBADO</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[9px] text-slate-400">{c.calificacion || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-10 grid grid-cols-2 gap-12 text-center text-[10px] font-black uppercase italic text-slate-400">
          <div className="border-t border-slate-700 pt-2">
            Firma Docente Evaluador
          </div>
          <div className="border-t border-slate-700 pt-2">
            Sello Secretaría / Dirección INSAL
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricaCard({ titulo, valor, icono, color }) {
  const c = _c(color);
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 text-center"
    >
      <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${c.fondo} flex items-center justify-center`}>
        <i className={`fas ${icono} ${c.texto} text-lg`} />
      </div>
      <motion.span
        key={valor}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className={`text-3xl font-black ${c.texto} block mb-1`}
      >
        {valor}
      </motion.span>
      <p className="text-[8px] font-black uppercase text-slate-400 italic">
        {titulo}
      </p>
    </motion.div>
  );
}

function ItemAnalysis({ analisis }) {
  const itemsOrdenados = [...analisis].sort((a, b) => b.indiceError - a.indiceError);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase text-amber-400 italic tracking-widest">
        Ítems con mayor índice de error
      </h3>

      <div className="space-y-2">
        {itemsOrdenados.map((item, idx) => (
          <ItemRow key={item.id} item={item} idx={idx} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, idx }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-black uppercase text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
          #{idx + 1}
        </span>
        <span className="text-[9px] font-black uppercase text-slate-400 italic">
          {ETIQUETAS_TIPOS_PREGUNTA[item.tipo] || item.tipo}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] font-black uppercase text-slate-500">
            {item.acertadas}/{item.total} acertadas
          </span>
          <span className={`text-xs font-black ${item.indiceError > 50 ? 'text-rose-400' : item.indiceError > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {Math.round(item.indiceError)}% error
          </span>
        </div>
      </div>

      <p className="text-sm font-bold italic text-slate-200 mb-2 line-clamp-2">
        {item.enunciado}
      </p>

      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            item.indiceExito >= 70
              ? 'bg-emerald-500'
              : item.indiceExito >= 40
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${item.indiceExito}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-slate-500 mt-1">
        <span>{Math.round(item.indiceExito)}% éxito</span>
        <span>Promedio: {item.promedio}/{item.puntajeMaximo} pts</span>
      </div>
    </motion.div>
  );
}

function TimeAnalysis({ analisis }) {
  const itemsConTiempo = analisis.filter((a) => a.tiempoPromedio > 0);
  const itemsMasLentos = [...itemsConTiempo].sort((a, b) => b.tiempoPromedio - a.tiempoPromedio);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase text-indigo-400 italic tracking-widest">
        Promedio de tiempo por pregunta
      </h3>
      <div className="space-y-2">
        {itemsMasLentos.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 bg-slate-800/50 rounded-xl p-3"
          >
            <span className="text-xs font-black uppercase text-slate-500 w-6">#{idx + 1}</span>
            <div className="flex-1">
              <p className="text-xs font-bold italic text-slate-200 truncate">
                {item.enunciado || 'Pregunta ' + (idx + 1)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min((item.tiempoPromedio / 120) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-black uppercase text-slate-400 w-16 text-right">
                {item.tiempoPromedio}s
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function IntegridadMatrix({ calificaciones, examen }) {
  const puntosTotales = examen?.configuracion?.puntajeTotal || 0;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase text-rose-400 italic tracking-widest">
        Matriz de Integridad Académica
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left border border-slate-700 rounded-xl">
          <thead>
            <tr className="bg-slate-800">
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">Estudiante</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">Puntaje</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">%</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">AI Flag</th>
              <th className="p-3 text-[9px] font-black uppercase text-slate-400 italic">Incidentes</th>
            </tr>
          </thead>
          <tbody>
            {calificaciones.map((c) => {
              const aiFlags = c.detallePreguntas?.filter((d) => d.ai_detection_flag > 0.5) || [];
              return (
                <tr key={c.nie} className="border-t border-slate-800">
                  <td className="p-3 text-xs font-bold italic text-slate-200 uppercase">
                    {c.nombre || c.nie}
                  </td>
                  <td className="p-3 text-xs text-slate-300">
                    {Number(c.puntajeObtenido).toFixed(2)}/{puntosTotales}
                  </td>
                  <td className="p-3">
                    <span className={`font-black ${
                      c.porcentaje >= 60 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {c.porcentaje}%
                    </span>
                  </td>
                  <td className="p-3">
                    {aiFlags.length > 0 ? (
                      <span className="text-xs font-black uppercase text-rose-400">
                        {aiFlags.length} flag(s)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Sin flags</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-slate-500">
                      {c.detallePreguntas?.filter((d) => d.ai_detection_flag > 0.3).length || 0} alerta(s)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeneralStats({ stats, calificaciones }) {
  if (!stats) return <p className="text-slate-400">Sin datos suficientes.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard titulo="Promedio" valor={`${stats.promedio}%`} color="indigo" />
        <StatCard titulo="Mínima" valor={`${stats.min}%`} color="rose" />
        <StatCard titulo="Máxima" valor={`${stats.max}%`} color="emerald" />
        <StatCard titulo="Desviación" valor={`±${stats.desviacionEstandar}%`} color="amber" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest mb-3">
            Distribución de calificaciones
          </h4>
          <div className="space-y-2">
            {[
              { rango: '90-100 (Excelente)', count: calificaciones.filter((c) => c.porcentaje >= 90).length, color: 'emerald' },
              { rango: '80-89 (Bueno)', count: calificaciones.filter((c) => c.porcentaje >= 80 && c.porcentaje < 90).length, color: 'sky' },
              { rango: '70-79 (Satisfactorio)', count: calificaciones.filter((c) => c.porcentaje >= 70 && c.porcentaje < 80).length, color: 'amber' },
              { rango: '60-69 (Aceptable)', count: calificaciones.filter((c) => c.porcentaje >= 60 && c.porcentaje < 70).length, color: 'orange' },
              { rango: '0-59 (Insuficiente)', count: calificaciones.filter((c) => c.porcentaje < 60).length, color: 'rose' },
            ].map((r) => (
              <div key={r.rango} className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase text-slate-500 w-36">{r.rango}</span>
                <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                  <motion.div
                    className={`h-full ${_c(r.color).barra} rounded-full flex items-center justify-end pr-2`}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.totalEstudiantes > 0 ? (r.count / stats.totalEstudiantes) * 100 : 0}%` }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className={`text-[7px] font-black text-white ${r.count > 0 ? 'opacity-100' : 'opacity-0'}`}>
                      {r.count}
                    </span>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest mb-3">
            Tasa de asistencia vs rendimiento
          </h4>
          {stats.correlationAsistenciaPuntaje == null ? (
            <div className="text-[10px] text-slate-500 italic font-bold bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
              <i className="fas fa-chart-line mr-1.5 opacity-60" />
              Datos de asistencia no disponibles para correlacionar con el
              rendimiento de este examen.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <CorrelationMetric
                label="Correlación asistencia-puntaje"
                valor={stats.correlationAsistenciaPuntaje}
              />
              <CorrelationMetric
                label="Estudiantes con asistencia 100%"
                valor={stats.porcentajeAsistenciaPerfecta || 0}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const COLORES_ESTATICOS = {
  indigo: { fondo: 'bg-indigo-500/10', borde: 'border-indigo-500/20', texto: 'text-indigo-400', barra: 'bg-indigo-500' },
  emerald: { fondo: 'bg-emerald-500/10', borde: 'border-emerald-500/20', texto: 'text-emerald-400', barra: 'bg-emerald-500' },
  amber: { fondo: 'bg-amber-500/10', borde: 'border-amber-500/20', texto: 'text-amber-400', barra: 'bg-amber-500' },
  rose: { fondo: 'bg-rose-500/10', borde: 'border-rose-500/20', texto: 'text-rose-400', barra: 'bg-rose-500' },
  sky: { fondo: 'bg-sky-500/10', borde: 'border-sky-500/20', texto: 'text-sky-400', barra: 'bg-sky-500' },
  violet: { fondo: 'bg-violet-500/10', borde: 'border-violet-500/20', texto: 'text-violet-400', barra: 'bg-violet-500' },
  orange: { fondo: 'bg-orange-500/10', borde: 'border-orange-500/20', texto: 'text-orange-400', barra: 'bg-orange-500' },
};

function _c(color) {
  return COLORES_ESTATICOS[color] || COLORES_ESTATICOS.indigo;
}

function StatCard({ titulo, valor, color }) {
  const c = _c(color);
  return (
    <motion.div
      className={`${c.fondo} border ${c.borde} rounded-2xl p-5 text-center`}
    >
      <p className="text-[8px] font-black uppercase text-slate-400 italic mb-1">
        {titulo}
      </p>
      <p className={`text-2xl font-black ${c.texto}`}>
        {valor}
      </p>
    </motion.div>
  );
}

function CorrelationMetric({ label, valor }) {
  const porcentaje = Math.round(valor * 100);
  const colorBarra = valor >= 0.7 ? 'emerald' : valor >= 0.4 ? 'amber' : 'rose';

  return (
    <div>
      <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
        <span>{label}</span>
        <span>{porcentaje}%</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${_c(colorBarra).barra} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${porcentaje}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
