import React, { useMemo } from 'react';
import { escucharRuta } from '../../firebase';
import { calcularPromedioColaborativo } from './rubricaService';

export default function ResumenColaborativo({ grado, rubricaId, grupos, evaluadores }) {
  const [calificaciones, setCalificaciones] = React.useState({});

  React.useEffect(() => {
    const cancelar = escucharRuta(`evaluaciones/${grado}/calificaciones/${rubricaId}`, (data) => {
      setCalificaciones(data || {});
    });
    return cancelar;
  }, [grado, rubricaId]);

  const datos = useMemo(() => {
    if (!grupos?.length) return [];

    return grupos.map((g) => {
      const evaluaciones = [];
      for (const [key, calif] of Object.entries(calificaciones)) {
        if (key === g.id || key.startsWith(`${g.id}_`)) {
          evaluaciones.push({
            uid: calif.evaluatorUid || 'principal',
            nombre: calif.calificadoPor || 'Docente',
            totalGrupo: calif.totalGrupo || 0,
            integrantes: calif.integrantes || {},
            esPrincipal: !calif.esCoEvaluador,
          });
        }
      }
      const promedio = calcularPromedioColaborativo(calificaciones, g.id);
      return { grupo: g, evaluaciones, promedio };
    });
  }, [calificaciones, grupos]);

  const gruposConColab = datos.filter((d) => d.evaluaciones.length > 1);
  if (gruposConColab.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <i className="fas fa-chart-bar text-violet-400" />
        <h3 className="text-sm font-black italic uppercase text-slate-100">Promedio Colaborativo</h3>
        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-600/10 text-violet-300 border border-violet-500/30">
          {evaluadores.length + 1} evaluadores
        </span>
      </div>

      {gruposConColab.map(({ grupo, evaluaciones, promedio }) => (
        <div key={grupo.id} className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
          <p className="font-black italic text-slate-100 text-xs">{grupo.nombre}</p>
          <div className="space-y-1">
            {evaluaciones.map((ev) => (
              <div key={ev.uid} className="flex items-center justify-between text-[9px]">
                <span className={ev.esPrincipal ? 'text-indigo-300 font-bold' : 'text-violet-300'}>
                  {ev.esPrincipal ? '★ ' : ''}{ev.nombre}
                </span>
                <span className="font-bold text-slate-200">{ev.totalGrupo.toFixed(2)} pts</span>
              </div>
            ))}
          </div>
          {promedio && (
            <div className="pt-2 border-t border-violet-500/20 flex items-center justify-between text-[9px]">
              <span className="font-black uppercase text-violet-400 italic">Promedio</span>
              <span className="font-black text-violet-300 text-sm">{promedio.totalGrupo.toFixed(2)} pts</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
