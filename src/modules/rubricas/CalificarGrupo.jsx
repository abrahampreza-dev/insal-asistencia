import React, { useState, useEffect, useMemo } from 'react';
import { escucharRuta } from '../../firebase';
import { Spinner, AlertaError } from '../../components/EstadoPeticion';
import { useToast } from '../../context/ToastContext';
import { guardarCalificacion, guardarCalificacionEvaluador } from './rubricaService';
import ResumenColaborativo from './ResumenColaborativo';

export default function CalificarGrupo({ grado, docenteUser, rubrica, onVolver, esCoEvaluador, evaluatorUid }) {
  const { toastSuccess, toastError } = useToast();

  const [grupos, setGrupos] = useState([]);
  const [calificaciones, setCalificaciones] = useState({});
  const [grupoId, setGrupoId] = useState('');
  const [criteriosValores, setCriteriosValores] = useState({});
  const [observaciones, setObservaciones] = useState({});
  const [integrantesValores, setIntegrantesValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [evaluadores, setEvaluadores] = useState([]);

  useEffect(() => {
    const c1 = escucharRuta(`evaluaciones/${grado}/grupos/${rubrica.id}`, (data) => {
      setGrupos(
        Object.values(data || {}).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
      );
    });
    const c2 = escucharRuta(`evaluaciones/${grado}/calificaciones/${rubrica.id}`, (data) =>
      setCalificaciones(data || {})
    );
    const c3 = escucharRuta(`evaluaciones/${grado}/evaluadores/${rubrica.id}`, (data) => {
      const lista = Object.entries(data || {}).map(([uid, v]) => ({ uid, ...v }));
      setEvaluadores(lista);
    });
    return () => { c1(); c2(); c3(); };
  }, [grado, rubrica.id]);

  const grupo = grupos.find((g) => g.id === grupoId) || null;

  const maxTotal = useMemo(
    () => rubrica.criterios.reduce((s, c) => s + Number(c.maxPuntos || 0), 0),
    [rubrica]
  );

  function seleccionarGrupo(id) {
    setGrupoId(id);
    setError('');
    const clave = esCoEvaluador ? `${id}_${evaluatorUid}` : id;
    const calif = calificaciones[clave];
    if (calif) {
      setCriteriosValores(calif.criterios || {});
      setObservaciones(calif.observaciones || {});
      const ints = {};
      for (const nie of Object.keys(calif.integrantes || {})) {
        ints[nie] = calif.integrantes[nie].notaIndividual ?? '';
      }
      setIntegrantesValores(ints);
    } else {
      setCriteriosValores({});
      setObservaciones({});
      const ints = {};
      const grp = grupos.find((g) => g.id === id);
      for (const nie of Object.keys(grp?.integrantes || {})) ints[nie] = '';
      setIntegrantesValores(ints);
    }
  }

  const totalGrupo = useMemo(() => {
    let t = 0;
    for (const c of rubrica.criterios) {
      const max = Number(c.maxPuntos || 0);
      const v = Number(criteriosValores[c.id]);
      t += Math.min(Math.max(isNaN(v) ? 0 : v, 0), max);
    }
    return Math.round(t * 100) / 100;
  }, [criteriosValores, rubrica]);

  function setCriterio(id, puntos) {
    const v = Number(puntos);
    setCriteriosValores((prev) => ({ ...prev, [id]: isNaN(v) ? '' : v }));
  }

  function notaFinal(nie) {
    const ni = Number(integrantesValores[nie]);
    if (isNaN(ni)) return '';
    return Math.round(((ni + totalGrupo) / 2) * 100) / 100;
  }

  async function guardar() {
    setError('');
    if (!grupo) return;

    const nies = Object.keys(grupo.integrantes || {});
    if (nies.length === 0) { setError('El grupo no tiene integrantes.'); return; }

    const integrantes = {};
    for (const nie of nies) {
      const ni = Number(integrantesValores[nie]);
      if (isNaN(ni) || ni < 0 || ni > 10) {
        setError(`Ingresa una nota individual válida (0 a 10) para el NIE ${nie}.`);
        return;
      }
      integrantes[nie] = {
        notaIndividual: Math.round(ni * 100) / 100,
        notaFinal: notaFinal(nie),
      };
    }

    setGuardando(true);
    const datosCalif = {
      rubricaId: rubrica.id,
      rubricaTitulo: rubrica.titulo,
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      criterios: criteriosValores,
      observaciones,
      totalGrupo,
      integrantes,
      calificadoPor: docenteUser?.displayName || '',
      calificadoPorEmail: docenteUser?.email || '',
      calificadoPorUid: docenteUser?.uid || '',
      esCoEvaluador: !!esCoEvaluador,
    };
    const res = esCoEvaluador
      ? await guardarCalificacionEvaluador(grado, rubrica.id, grupo.id, evaluatorUid, datosCalif)
      : await guardarCalificacion(grado, rubrica.id, grupo.id, datosCalif);
    setGuardando(false);

    if (res.ok) {
      toastSuccess(`Calificación guardada para "${grupo.nombre}" (grupo: ${totalGrupo} pts).`);
    } else {
      toastError('No se pudo guardar la calificación.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-100">{rubrica.titulo}</h2>
          <p className="text-[9px] font-bold italic text-slate-400">
            Sección {grado} · {rubrica.criterios.length} criterios · Puntaje máximo: {maxTotal.toFixed(2)}
          </p>
        </div>
        <button
          onClick={onVolver}
          className="flex items-center gap-2 bg-slate-800 text-slate-200 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
        >
          <i className="fas fa-arrow-left" /> Volver
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Lista de grupos */}
        <div className="md:col-span-1 bg-slate-900 rounded-[2rem] border border-slate-800 p-4 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 italic px-1">
            Grupos formados
          </p>
          {grupos.length === 0 && (
            <p className="text-[10px] font-bold italic text-slate-500 px-1 py-6 text-center">
              Aún no hay grupos. Los estudiantes los crean desde su área de evaluaciones.
            </p>
          )}
          {grupos.map((g) => {
            const claveCalif = esCoEvaluador ? `${g.id}_${evaluatorUid}` : g.id;
            const calif = calificaciones[claveCalif] || calificaciones[g.id];
            const n = Object.keys(g.integrantes || {}).length;
            return (
              <button
                key={g.id}
                onClick={() => seleccionarGrupo(g.id)}
                className={`w-full text-left p-3 rounded-2xl border transition ${
                  grupoId === g.id
                    ? 'bg-indigo-600/20 border-indigo-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black italic text-slate-100 text-xs truncate">{g.nombre}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    calif ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {calif ? `${Number(calif.totalGrupo).toFixed(2)} pts` : 'Pendiente'}
                  </span>
                </div>
                <p className="text-[8px] font-bold italic text-slate-500 mt-1">
                  {n} integrantes · {calif ? `Nota final: ${Number(Object.values(calif.integrantes || {})[0]?.notaFinal ?? 0).toFixed(2)}` : 'Sin calificar'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Tabla de calificación */}
        <div className="md:col-span-2 space-y-4">
          {!grupo && (
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-10 text-center">
              <i className="fas fa-people-group text-4xl text-slate-600 mb-4" />
              <p className="text-slate-400 text-sm font-bold italic uppercase">
                Selecciona un grupo para calificarlo con la rúbrica.
              </p>
            </div>
          )}

          {grupo && (
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 p-5 border-b border-slate-800 bg-slate-950/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black italic text-slate-100 text-sm uppercase">{grupo.nombre}</h3>
                    {esCoEvaluador && (
                      <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                        Modo evaluador
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-bold italic text-slate-500">
                    {Object.keys(grupo.integrantes || {}).length} integrantes · Rubrica: {rubrica.titulo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 italic">Puntos del grupo</p>
                  <p className={`text-3xl font-black italic ${totalGrupo > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {totalGrupo.toFixed(2)}
                    <span className="text-sm text-slate-500"> / {maxTotal.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-3 overflow-x-auto">
                <AlertaError mensaje={error} />
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                      <th className="p-2">#</th>
                      <th className="p-2">Criterio</th>
                      <th className="p-2">Máx.</th>
                      <th className="p-2">Niveles</th>
                      <th className="p-2 w-24">Pts.</th>
                      <th className="p-2">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubrica.criterios.map((c, i) => (
                      <tr key={c.id} className="border-t border-slate-800/60 align-top">
                        <td className="p-2 text-slate-500 font-black">{i + 1}</td>
                        <td className="p-2 text-slate-200 font-bold italic">{c.nombre}</td>
                        <td className="p-2 text-slate-500">{Number(c.maxPuntos).toFixed(2)}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {c.niveles.map((n, j) => {
                              const activo = Number(criteriosValores[c.id]) === Number(n.puntos);
                              return (
                                <button
                                  key={j}
                                  onClick={() => setCriterio(c.id, n.puntos)}
                                  className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition ${
                                    activo
                                      ? 'bg-indigo-600 text-white border-indigo-500'
                                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-indigo-500/50'
                                  }`}
                                >
                                  {n.etiqueta} ({Number(n.puntos).toFixed(1)})
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={Number(c.maxPuntos)}
                            value={criteriosValores[c.id] ?? ''}
                            onChange={(e) => setCriterio(c.id, e.target.value)}
                            readOnly={esCoEvaluador}
                            className={`w-full p-2 rounded-lg border font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 ${esCoEvaluador ? 'bg-slate-800 border-slate-600 cursor-not-allowed' : 'bg-slate-950 border-slate-700'}`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={observaciones[c.id] || ''}
                            onChange={(e) => setObservaciones((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            placeholder="Observación"
                            className="w-full p-2 bg-slate-950 rounded-lg border border-slate-700 font-bold italic text-xs text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 italic mb-2">
                    Notas individuales (nota final = promedio entre nota individual y puntos del grupo)
                  </p>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                        <th className="p-2">Integrante</th>
                        <th className="p-2 w-32">Nota individual (0-10)</th>
                        <th className="p-2 w-28">Nota final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(grupo.integrantes || {}).map((nie) => (
                        <tr key={nie} className="border-t border-slate-800/60">
                          <td className="p-2">
                            <p className="font-bold italic text-slate-100">{grupo.integrantes[nie].nombres || ''} {grupo.integrantes[nie].apellidos || ''}</p>
                            <p className="text-[8px] font-mono text-slate-500">NIE: {nie}</p>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={integrantesValores[nie] ?? ''}
                              onChange={(e) => setIntegrantesValores((prev) => ({ ...prev, [nie]: e.target.value }))}
                              className="w-full p-2 bg-slate-950 rounded-lg border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-2">
                            <span className="text-base font-black italic text-emerald-400">
                              {notaFinal(nie) === '' ? '—' : notaFinal(nie).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={guardar}
                    disabled={guardando}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                  >
                    {guardando ? <Spinner texto="Guardando..." /> : <><i className="fas fa-save" /> Guardar calificación</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!esCoEvaluador && evaluadores.length > 0 && (
        <ResumenColaborativo
          grado={grado}
          rubricaId={rubrica.id}
          grupos={grupos}
          evaluadores={evaluadores}
        />
      )}
    </div>
  );
}