import React, { useState, useEffect } from 'react';
import { escucharRuta } from '../../firebase';
import { Spinner, AlertaError } from '../../components/EstadoPeticion';
import { useToast } from '../../context/ToastContext';
import { crearGrupo, calcularPromedioColaborativo } from './rubricaService';

export default function RubricasEstudiante({ grado, nie, estudiante }) {
  const [rubricas, setRubricas] = useState([]);
  const [gruposPorRubrica, setGruposPorRubrica] = useState({});
  const [califPorRubrica, setCalifPorRubrica] = useState({});
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [creandoRubrica, setCreandoRubrica] = useState(null);
  const { toastSuccess, toastError } = useToast();

  useEffect(() => {
    const c1 = escucharRuta(`evaluaciones/${grado}/rubricas`, (data) => {
      setRubricas(
        Object.values(data || {})
          .filter((r) => r.publicado)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      );
      setCargando(false);
    });
    const c2 = escucharRuta(`evaluaciones/${grado}/grupos`, (data) => setGruposPorRubrica(data || {}));
    const c3 = escucharRuta(`evaluaciones/${grado}/calificaciones`, (data) => setCalifPorRubrica(data || {}));
    const c4 = escucharRuta(`estudiantes/${grado}`, (data) =>
      setEstudiantes(
        Object.values(data || {}).sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''))
      )
    );
    return () => { c1(); c2(); c3(); c4(); };
  }, [grado]);

  const nombreEstudiante = `${estudiante?.nombres || ''} ${estudiante?.apellidos || ''}`.trim();

  const miGrupoEn = (rubricaId) => {
    const grupos = gruposPorRubrica[rubricaId] || {};
    return Object.values(grupos).find((g) => g.integrantes?.[nie]) || null;
  };

  const miCalif = (rubricaId) => {
    const g = miGrupoEn(rubricaId);
    if (!g) return null;
    const califsRubrica = califPorRubrica[rubricaId] || {};

    const clavesColab = Object.keys(califsRubrica).filter(
      (key) => key === `${g.id}` || key.startsWith(`${g.id}_`)
    );

    if (clavesColab.length > 1) {
      const promedio = calcularPromedioColaborativo(califsRubrica, g.id);
      if (promedio) {
        return {
          totalGrupo: promedio.totalGrupo,
          integrantes: promedio.integrantes,
          esPromedio: true,
          numEvaluadores: promedio.numEvaluadores,
        };
      }
    }

    return califsRubrica[g.id] || null;
  };

  const misNotas = [];
  for (const r of rubricas) {
    const g = miGrupoEn(r.id);
    const c = miCalif(r.id);
    if (g && c) {
      misNotas.push({ rubrica: r, grupo: g, calif: c, nota: c.integrantes?.[nie] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-100">Rúbricas y Grupos</h2>
          <p className="text-[9px] font-bold uppercase text-indigo-400 italic tracking-widest">
            <i className="fas fa-user mr-1" />
            {nombreEstudiante || nie} · Sección {grado}
          </p>
        </div>
      </div>

      {cargando && <Spinner texto="Cargando rúbricas..." />}

      {!cargando && rubricas.length === 0 && (
        <div className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800">
          <i className="fas fa-table-list text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            Tu docente aún no ha publicado rúbricas en tu sección.
          </p>
        </div>
      )}

      {!cargando && rubricas.length > 0 && (
        <>
          {misNotas.length > 0 && (
            <div className="bg-slate-900 rounded-[2rem] border border-emerald-500/30 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <i className="fas fa-medal text-emerald-400" />
                </span>
                <div>
                  <h3 className="font-black uppercase italic text-emerald-300 text-xs tracking-widest">Mis Notas de Exposiciones</h3>
                  <p className="text-[9px] font-bold italic text-slate-500">
                    Nota final = promedio entre tu nota individual y los puntos del grupo.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                      <th className="p-2">Rúbrica</th>
                      <th className="p-2">Grupo</th>
                      <th className="p-2">Pts. Grupo</th>
                      <th className="p-2">Nota Individual</th>
                      <th className="p-2">Nota Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {misNotas.map(({ rubrica, grupo, calif, nota }) => (
                      <tr key={`${rubrica.id}-${grupo.id}`} className="border-t border-slate-800/60">
                        <td className="p-2 text-slate-200 font-bold italic">{rubrica.titulo}</td>
                        <td className="p-2 text-slate-300">{grupo.nombre}</td>
                        <td className="p-2 text-slate-300"><CalifInfo calif={calif} campo="totalGrupo" /></td>
                        <td className="p-2 text-slate-300"><CalifInfo calif={nota} campo="notaIndividual" /></td>
                        <td className="p-2">
                          <span className="text-base font-black italic text-emerald-400">
                            <CalifInfo calif={nota} campo="notaFinal" />
                          </span>
                          {calif?.esPromedio && (
                            <span className="ml-1 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-violet-600/10 text-violet-300 border border-violet-500/30">
                              prom.
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rubricas.map((r) => {
              const grupo = miGrupoEn(r.id);
              const calif = miCalif(r.id);
              const notasIntegrantes = Object.keys(grupo?.integrantes || {}).map((n) => grupo.integrantes[n]);
              const totalMax = r.criterios.reduce((s, c) => s + Number(c.maxPuntos || 0), 0);

              return (
                <div key={r.id} className="bg-slate-900 rounded-[2rem] border border-slate-800 p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Publicada
                      </span>
                      <h3 className="font-black italic text-slate-100 text-sm uppercase mt-2">{r.titulo}</h3>
                      <p className="text-[9px] font-bold italic text-slate-500 mt-1">
                        {r.criterios.length} criterios · {totalMax.toFixed(2)} pts. máx.
                      </p>
                    </div>
                    {calif && (
                      <span className="text-3xl font-black italic text-emerald-400">
                        {calif.totalGrupo?.toFixed(2) ?? '0.00'}
                        <span className="text-xs text-slate-500"> / {totalMax.toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed line-clamp-2">
                    {r.descripcion || 'Sin descripción.'}
                  </p>

                  {grupo ? (
                    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black italic text-indigo-300 text-xs uppercase">
                          <i className="fas fa-people-group mr-1" /> {grupo.nombre}
                        </p>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-300 border border-indigo-500/30">
                          {Object.keys(grupo.integrantes || {}).length} integrantes
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {notasIntegrantes.map((i, idx) => (
                          <span key={idx} className="text-[8px] font-bold italic bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-slate-300">
                            {i.nombres || ''} {i.apellidos || ''}{i.nombres === estudiante?.nombres && i.apellidos === estudiante?.apellidos ? ' (Tú)' : ''}
                          </span>
                        ))}
                      </div>
                      {calif ? (
                        <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-500">Pts. Grupo</p>
                            <p className="font-black italic text-slate-100">{calif.totalGrupo?.toFixed(2) ?? '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-500">Nota Individual</p>
                            <p className="font-black italic text-slate-100">{calif.integrantes?.[nie]?.notaIndividual?.toFixed(2) ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-500">Nota Final</p>
                            <p className="font-black italic text-emerald-400">{calif.integrantes?.[nie]?.notaFinal?.toFixed(2) ?? '—'}</p>
                          </div>
                          {calif.esPromedio && (
                            <div className="col-span-3">
                              <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-600/10 text-violet-300 border border-violet-500/30">
                                Promedio de {calif.numEvaluadores} evaluadores
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[9px] font-bold italic text-amber-400/80">
                          Tu docente aún no ha calificado esta exposición.
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreandoRubrica(r)}
                      className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition"
                    >
                      <i className="fas fa-plus" /> Crear mi grupo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {creandoRubrica && (
        <ModalCrearGrupo
          rubrica={creandoRubrica}
          grado={grado}
          nie={nie}
          nombreEstudiante={nombreEstudiante}
          estudiantes={estudiantes}
          yaTieneGrupo={!!miGrupoEn(creandoRubrica.id)}
          onCerrar={() => setCreandoRubrica(null)}
          onCreado={() => { setCreandoRubrica(null); toastSuccess('Grupo creado correctamente.'); }}
          onError={(msg) => toastError(msg)}
        />
      )}
    </div>
  );
}

function CalifInfo({ calif, campo }) {
  if (!calif || calif[campo] === undefined || calif[campo] === null) return '—';
  const v = Number(calif[campo]);
  return isNaN(v) ? '—' : v.toFixed(2);
}

// ─── Modal para crear grupo ───────────────────────────────────────────────────

function ModalCrearGrupo({ rubrica, grado, nie, nombreEstudiante, estudiantes, yaTieneGrupo, onCerrar, onCreado, onError }) {
  const [nombre, setNombre] = useState('');
  const [seleccion, setSeleccion] = useState([nie]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const filtrados = estudiantes.filter((e) => {
    const texto = `${e.nombres || ''} ${e.apellidos || ''} ${e.nie || ''}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  function toggle(n) {
    setSeleccion((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function enviar() {
    setError('');
    if (!nombre.trim()) { setError('Ponle un nombre a tu grupo.'); return; }
    if (seleccion.length < 2) { setError('El grupo debe tener al menos 2 integrantes (tú y un compañero).'); return; }
    if (yaTieneGrupo) {
      setError('Ya tienes un grupo creado para esta exposición.');
      onCerrar();
      return;
    }
    setCargando(true);

    const mapa = Object.fromEntries(estudiantes.map((e) => [e.nie, e]));
    const res = await crearGrupo(grado, rubrica.id, {
      nombre: nombre.trim(),
      rubricaId: rubrica.id,
      rubricaTitulo: rubrica.titulo,
      integrantes: Object.fromEntries(
        seleccion.map((n) => [
          n,
          { nombres: mapa[n]?.nombres || '', apellidos: mapa[n]?.apellidos || '' },
        ])
      ),
      creadoPor: nie,
      creadoPorNombre: nombreEstudiante,
    });
    setCargando(false);

    if (res.ok) {
      onCreado();
    } else {
      onError('No se pudo crear el grupo.');
      setError('No se pudo crear el grupo.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black uppercase italic text-slate-100 text-sm">Crear grupo</h3>
            <p className="text-[9px] font-bold italic text-slate-500">
              Rúbrica: {rubrica.titulo} · Sección {grado}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-200 text-lg">
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div>
          <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
            Nombre del grupo
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Los Talentosos"
            className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-black italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
            Integrantes de tu sección
          </label>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar compañero por nombre o NIE..."
            className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 font-bold italic text-xs text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
          />
          <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 p-2 bg-slate-950/60">
            {filtrados.length === 0 && (
              <p className="text-[10px] font-bold italic text-slate-500 text-center py-4">Sin compañeros para mostrar.</p>
            )}
            {filtrados.map((e) => {
              const esYo = e.nie === nie;
              const activo = seleccion.includes(e.nie);
              return (
                <label
                  key={e.nie}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition ${
                    activo ? 'bg-indigo-600/20 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  } ${esYo ? 'opacity-90' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    disabled={esYo}
                    onChange={() => toggle(e.nie)}
                    className="accent-indigo-500"
                  />
                  <span className={`text-[10px] font-bold italic ${esYo ? 'text-indigo-300' : 'text-slate-200'}`}>
                    {e.nombres} {e.apellidos} {esYo && '(Tú)'}
                  </span>
                  <span className="ml-auto text-[8px] font-mono text-slate-500">{e.nie}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[8px] font-bold italic text-slate-500 mt-1">
            Seleccionados: {seleccion.length} integrante(s)
          </p>
        </div>

        <AlertaError mensaje={error} />

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCerrar}
            className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={cargando}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {cargando ? <Spinner texto="Creando..." /> : <><i className="fas fa-people-group" /> Crear grupo</>}
          </button>
        </div>
      </div>
    </div>
  );
}