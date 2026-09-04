import React, { useState, useEffect } from 'react';
import { escucharRuta } from '../../firebase';
import { Spinner } from '../../components/EstadoPeticion';
import CalificarGrupo from './CalificarGrupo';

export default function ModuloEvaluaciones({ docenteUser, seccion, materia }) {
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [rubricaSel, setRubricaSel] = useState(null);

  useEffect(() => {
    if (!docenteUser?.email) { setCargando(false); return; }
    const cancelables = [];
    let pendientes = 0;
    let primeraCarga = true;

    function buscarEnSecciones(data) {
      if (!data) return;
      for (const seccion of Object.keys(data)) {
        pendientes++;
        const c = escucharRuta(`evaluaciones/${seccion}/evaluadores`, (evData) => {
          for (const rubricaId in evData || {}) {
            for (const uid in evData[rubricaId] || {}) {
              const ev = evData[rubricaId][uid];
              if (ev?.email === docenteUser.email && ev?.estado === 'activo') {
                setInvitaciones((prev) => {
                  const key = `${seccion}_${rubricaId}`;
                  if (prev.some((inv) => inv.key === key)) return prev;
                  return [...prev, { key, seccion, rubricaId, nombre: ev.invitadoPorNombre || ev.invitadoPor }];
                });
              }
            }
          }
          pendientes--;
          if (pendientes <= 0 && primeraCarga) { setCargando(false); primeraCarga = false; }
        });
      cancelables.push(c);
    }
    }

    const cSecciones = escucharRuta('evaluaciones', (data) => {
      setInvitaciones([]);
      buscarEnSecciones(data);
      if (!data || Object.keys(data).length === 0) { setCargando(false); primeraCarga = false; }
    });
    cancelables.push(cSecciones);

    return () => cancelables.forEach((c) => c());
  }, [docenteUser?.email]);

  const [rubsMap, setRubsMap] = useState({});

  useEffect(() => {
    const cancelables = [];
    for (const inv of invitaciones) {
      const c = escucharRuta(`evaluaciones/${inv.grado}/rubricas/${inv.rubricaId}`, (data) => {
        if (data) setRubsMap((prev) => ({ ...prev, [inv.key]: data }));
      });
      cancelables.push(c);
    }
    return () => cancelables.forEach((c) => c());
  }, [invitaciones]);

  if (cargando) return <Spinner texto="Buscando rúbricas como evaluador..." />;

  if (rubricaSel) {
    return (
      <CalificarGrupo
        grado={seccion}
        docenteUser={docenteUser}
        rubrica={rubricaSel}
        onVolver={() => { setRubricaSel(null); }}
        esCoEvaluador={true}
        evaluatorUid={docenteUser.uid || docenteUser.email}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black italic uppercase text-slate-100">
          <i className="fas fa-user-tie mr-2 text-violet-400" />
          Rúbricas como evaluador
        </h2>
        <p className="text-[9px] font-bold italic text-slate-400">
          Rúbricas donde has sido invitado a evaluar.
        </p>
      </div>

      {invitaciones.length === 0 && (
        <div className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800">
          <i className="fas fa-user-group text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            No has sido invitado a evaluar ninguna rúbrica todavía.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invitaciones.map((inv) => {
          const rub = rubsMap[inv.key];
          if (!rub) return null;
          return (
            <div key={inv.key} className="bg-slate-900 rounded-[2rem] border border-slate-800 p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-600/10 text-violet-300 border border-violet-500/30">
                    Invitado por {inv.nombre}
                  </span>
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Sección {inv.seccion}
                  </span>
                </div>
                <h3 className="font-black italic text-slate-100 text-sm uppercase">{rub.titulo}</h3>
                <p className="text-[9px] font-bold italic text-slate-500 mt-1">
                  {rub.criterios?.length || 0} criterios · {rub.criterios?.reduce((s, c) => s + Number(c.maxPuntos || 0), 0).toFixed(2)} pts. máx.
                </p>
              </div>
              <button
                onClick={() => { setRubricaSel(rub); }}
                className="bg-violet-600/30 text-violet-200 border border-violet-500/40 hover:bg-violet-600 hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition"
              >
                <i className="fas fa-pen-to-square mr-1" /> Evaluar grupos
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
