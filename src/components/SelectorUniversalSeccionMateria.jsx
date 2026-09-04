import React, { useEffect } from 'react';
import { useMaterias } from '../hooks/useMaterias';

export default function SelectorUniversalSeccionMateria({
  secciones,
  seccion,
  setSeccion,
  materia,
  setMateria,
  misSecciones = [],
  isAdmin = false,
  seccionLabel = 'Sección',
  materiaLabel = 'Materia',
  compact = false
}) {
  const { materias, cargando: cargandoMaterias } = useMaterias();

  // For docente: auto-select materia when only 1 assigned to selected section
  useEffect(() => {
    if (!isAdmin && seccion && misSecciones.length > 0) {
      const secInfo = misSecciones.find((s) => s.id === seccion);
      const assignedMaterias = secInfo?.materias || [];

      if (assignedMaterias.length === 1) {
        setMateria(assignedMaterias[0]);
      } else if (assignedMaterias.length === 0) {
        setMateria('');
      } else {
        if (!assignedMaterias.includes(materia)) {
          setMateria('');
        }
      }
    }
  }, [seccion, misSecciones, materia, setMateria, isAdmin]);

  // Get materias for the selected section based on role.
  // Docente: solo sus materias asignadas en esa sección (misSecciones).
  // Admin (acceso total): catálogo completo de materias, independiente de la sección.
  let materiasDeSec = [];
  if (isAdmin) {
    materiasDeSec = materias.map((m) => m.id);
  } else {
    const secInfo = misSecciones.find((s) => s.id === seccion);
    const assignedMaterias = secInfo?.materias || [];
    materiasDeSec = assignedMaterias;
  }

  function seleccionarSeccion(v) {
    setSeccion(v);
    if (!v) setMateria('');
  }

  if (secciones.length === 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-[10px] font-bold italic text-amber-300">
        <i className="fas fa-exclamation-triangle mr-1.5" />{' '}
        {isAdmin
          ? 'No hay secciones registradas en el sistema.'
          : 'No tienes secciones asignadas. Ve a Mis Secciones para agregarlas.'}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? 'bg-slate-800/50 p-3 rounded-xl border border-slate-700' : 'bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm'}`}>
      <div className="flex flex-col gap-1 min-w-[180px] flex-1">
        <label className={`text-[8px] font-black uppercase tracking-widest text-slate-400 ${compact ? 'hidden' : ''}`}>{seccionLabel}</label>
        <select
          value={seccion}
          onChange={(e) => seleccionarSeccion(e.target.value)}
          className={`bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition ${compact ? 'w-full' : 'min-w-[180px]'}`}
        >
          <option value="">— {seccionLabel} —</option>
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-[180px] flex-1">
        <label className={`text-[8px] font-black uppercase tracking-widest text-slate-400 ${compact ? 'hidden' : ''}`}>{materiaLabel}</label>
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          disabled={!seccion || materiasDeSec.length === 0}
          className={`bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50 cursor-pointer ${compact ? 'w-full' : 'min-w-[180px]'}`}
        >
          <option value="">— {materiaLabel} —</option>
          {materiasDeSec.map((mid) => {
            const info = materias.find((m) => m.id === mid);
            return <option key={mid} value={mid}>{info?.label || mid}</option>;
          })}
        </select>
        {!seccion && (
          <p className="text-[8px] text-slate-500 italic">Selecciona una sección primero</p>
        )}
        {seccion && materiasDeSec.length === 0 && (
          <p className="text-[8px] text-amber-400 italic">
            {cargandoMaterias
              ? 'Cargando catálogo de materias...'
              : isAdmin
                ? 'No hay materias registradas en el catálogo'
                : 'No tienes materias asignadas en esta sección'}
          </p>
        )}
      </div>

      {seccion && materia && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">
          <i className="fas fa-check-circle" /> Activa
        </div>
      )}
    </div>
  );
}