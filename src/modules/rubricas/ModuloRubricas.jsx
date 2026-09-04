import React, { useState, useEffect } from 'react';
import { useSecciones } from '../../hooks/useSecciones';
import { useMaterias } from '../../hooks/useMaterias';
import { escucharRuta, leerRuta } from '../../firebase';
import { Spinner } from '../../components/EstadoPeticion';
import { useToast } from '../../context/ToastContext';
import { alternarPublicacion, eliminarRubrica, generarCSV, descargarArchivo } from './rubricaService';
import EditorRubrica from './EditorRubrica';
import CalificarGrupo from './CalificarGrupo';
import ModalInvitarEvaluadores from './ModalInvitarEvaluadores';
export default function ModuloRubricas({ docenteUser, seccionesPermitidas, seccion, materia }) {
  const { secciones } = useSecciones();
  const seccionesVisibles = Array.isArray(seccionesPermitidas)
    ? secciones.filter((s) => seccionesPermitidas.includes(s.id))
    : secciones;

  const [vista, setVista] = useState('lista');
  const [rubricaSeleccionada, setRubricaSeleccionada] = useState(null);

  return (
    <div className="space-y-6">
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
              Seleccionar Sección
            </label>
            <div className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-black italic text-sm text-slate-100">
              {seccionesVisibles.find((s) => s.id === seccion)?.label || '—'}
            </div>
          </div>

          {seccion && (
            <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
              <button
                onClick={() => { setVista('lista'); setRubricaSeleccionada(null); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
                  vista === 'lista' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Mis rúbricas
              </button>
              <button
                onClick={() => { setVista('crear'); setRubricaSeleccionada(null); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
                  vista === 'crear' || vista === 'editar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Crear rúbrica
              </button>
              <button
                onClick={() => { setVista('calificar'); setRubricaSeleccionada(null); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
                  vista === 'calificar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Calificar
              </button>
            </div>
          )}
        </div>
      </div>

      {!seccion && (
        <div className="text-center py-16 wayground-card bg-slate-900 rounded-[2.5rem] border border-slate-800">
          <i className="fas fa-table-list text-4xl text-indigo-500/50 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            Selecciona una sección en el selector superior para crear y calificar rúbricas de exposición.
          </p>
        </div>
      )}

      {seccion && vista === 'lista' && (
        <ListaRubricas
          grado={seccion}
          docenteUser={docenteUser}
          onCrear={() => { setVista('crear'); setRubricaSeleccionada(null); }}
          onEditar={(r) => { setRubricaSeleccionada(r); setVista('editar'); }}
          onCalificar={(r) => { setRubricaSeleccionada(r); setVista('calificar'); }}
        />
      )}

      {seccion && (vista === 'crear') && (
        <EditorRubrica
          grado={seccion}
          docenteUser={docenteUser}
          onGuardado={() => setVista('lista')}
          onCancelar={() => setVista('lista')}
        />
      )}

      {seccion && vista === 'editar' && rubricaSeleccionada && (
        <EditorRubrica
          grado={seccion}
          docenteUser={docenteUser}
          rubrica={rubricaSeleccionada}
          onGuardado={() => setVista('lista')}
          onCancelar={() => setVista('lista')}
        />
      )}

      {seccion && vista === 'calificar' && !rubricaSeleccionada && (
        <SeleccionarRubricaCalificar
          grado={seccion}
          docenteUser={docenteUser}
          onElegir={(r) => setRubricaSeleccionada(r)}
        />
      )}

      {seccion && vista === 'calificar' && rubricaSeleccionada && (
        <CalificarGrupo
          grado={seccion}
          docenteUser={docenteUser}
          rubrica={rubricaSeleccionada}
          onVolver={() => { setRubricaSeleccionada(null); setVista('lista'); }}
        />
      )}
    </div>
  );
}

// ─── Selección de rúbrica para calificar ──────────────────────────────────────

function SeleccionarRubricaCalificar({ grado: seccion, docenteUser, onElegir }) {
  const { toastInfo } = useToast();
  const [rubricas, setRubricas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cancelar = escucharRuta(`evaluaciones/${seccion}/rubricas`, (data) => {
      const lista = Object.values(data || {})
        .filter((r) => !docenteUser || r.creadoPorEmail === docenteUser.email || r.creadoPorUid === docenteUser.uid)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setRubricas(lista);
      setCargando(false);
    });
    return cancelar;
  }, [seccion, docenteUser]);

  if (cargando) return <Spinner texto="Cargando rúbricas..." />;

  if (rubricas.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800">
        <i className="fas fa-table-list text-4xl text-slate-600 mb-4" />
        <p className="text-slate-400 text-sm font-bold italic uppercase">
          Aún no tienes rúbricas en esta sección. Créala primero para poder calificar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black italic uppercase text-slate-100">¿Qué rúbrica vas a calificar?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rubricas.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              toastInfo(`Selecciona un grupo de "${r.titulo}" para calificar.`);
              onElegir(r);
            }}
            className="text-left bg-slate-900 rounded-[2rem] border border-slate-800 hover:border-indigo-500/50 p-6 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black italic text-slate-100 text-sm uppercase">{r.titulo}</h3>
              <i className="fas fa-chevron-right text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[9px] font-bold italic text-slate-500">
              {r.criterios.length} criterios · {r.publicado ? 'Publicada' : 'Borrador'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Lista de rúbricas del docente ───────────────────────────────────────────

function ListaRubricas({ grado: seccion, docenteUser, onCrear, onEditar, onCalificar }) {
  const { toastSuccess, toastError } = useToast();
  const { materias } = useMaterias();
  const [rubricas, setRubricas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState('');
  const [modalEvaluadores, setModalEvaluadores] = useState(null);

  const mapaMaterias = Object.fromEntries(materias.map((m) => [m.id, m.label]));

  useEffect(() => {
    const cancelar = escucharRuta(`evaluaciones/${seccion}/rubricas`, (data) => {
      const lista = Object.values(data || {})
        .filter((r) => !docenteUser || r.creadoPorEmail === docenteUser.email || r.creadoPorUid === docenteUser.uid)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setRubricas(lista);
      setCargando(false);
    });
    return cancelar;
  }, [seccion, docenteUser]);

  async function alternar(r) {
    try {
      const res = await alternarPublicacion(seccion, r.id, !r.publicado);
      if (res.ok) {
        toastSuccess(r.publicado ? `"${r.titulo}" pasó a borrador.` : `"${r.titulo}" PUBLICADA. Los estudiantes ya pueden formar grupos.`);
      } else {
        toastError('No se pudo cambiar el estado.');
      }
    } catch (err) {
      console.error('[Rúbrica] Error al cambiar estado:', err);
      toastError('Ocurrió un error al cambiar el estado.');
    }
  }

  async function eliminar(r) {
    if (!window.confirm(`¿Eliminar definitivamente la rúbrica "${r.titulo}"? También se eliminarán sus grupos y calificaciones.`)) return;
    try {
      const res = await eliminarRubrica(seccion, r.id);
      if (res.ok) toastSuccess('Rúbrica eliminada.');
      else toastError('No se pudo eliminar.');
    } catch (err) {
      console.error('[Rúbrica] Error al eliminar:', err);
      toastError('Ocurrió un error al eliminar la rúbrica.');
    }
  }

  async function exportar(r) {
    setExportando(r.id);
    try {
      const [gruposRaw, califRaw, estudiantesRaw] = await Promise.all([
        leerRuta(`evaluaciones/${seccion}/grupos/${r.id}`),
        leerRuta(`evaluaciones/${seccion}/calificaciones/${r.id}`),
        leerRuta(`estudiantes/${seccion}`),
      ]);
      const grupos = Object.values(gruposRaw || {});
      const califs = califRaw || {};
      const estudiantes = estudiantesRaw || {};

      const nombreE = (nie) => {
        const e = estudiantes[nie];
        return e ? `${e.nombres || ''} ${e.apellidos || ''}`.trim() : nie;
      };

      const columnas = [
        'Rúbrica', 'Grupo', 'NIE', 'Integrante',
        ...r.criterios.map((c) => c.nombre),
        'Pts. Grupo', 'Nota Individual', 'Nota Final',
      ];
      const filas = [];
      for (const g of grupos) {
        const calif = califs[g.id];
        const totalGrupo = calif ? calif.totalGrupo : '';
        const nies = Object.keys(g.integrantes || {});
        for (const nie of nies) {
          const nota = calif?.integrantes?.[nie];
          const puntosCriterios = r.criterios.map((c) => calif?.criterios?.[c.id] ?? '');
          filas.push([
            r.titulo, g.nombre, nie, nombreE(nie),
            ...puntosCriterios,
            totalGrupo, nota?.notaIndividual ?? '', nota?.notaFinal ?? '',
          ]);
        }
      }
      const csv = generarCSV(columnas, filas);
      descargarArchivo(`Rubrica_${(r.titulo || 'exportacion').replace(/\s+/g, '_')}_${seccion}.csv`, csv);
      toastSuccess('Notas exportadas en CSV (compatible con Excel).');
    } catch (err) {
      console.error(err);
      toastError('No se pudo exportar las notas.');
    } finally {
      setExportando('');
    }
  }

  if (cargando) return <Spinner texto="Cargando rúbricas..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-100">Mis Rúbricas</h2>
          <p className="text-[9px] font-bold italic text-slate-400">
            Sección {seccion} · Solo se muestran las que creaste tú.
          </p>
        </div>
        <button
          onClick={onCrear}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition"
        >
          <i className="fas fa-plus" /> Nueva rúbrica
        </button>
      </div>

      {rubricas.length === 0 && (
        <div className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800">
          <i className="fas fa-table-list text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            No has creado rúbricas en esta sección todavía.
          </p>
          <button
            onClick={onCrear}
            className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
          >
            <i className="fas fa-plus mr-2" /> Crear mi primera rúbrica
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rubricas.map((r) => (
          <div key={r.id} className="bg-slate-900 rounded-[2rem] border border-slate-800 p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    r.publicado
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {r.publicado ? 'Publicada' : 'Borrador'}
                  </span>
                  {r.materia && mapaMaterias[r.materia] && (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-300 border border-indigo-500/30">
                      {mapaMaterias[r.materia]}
                    </span>
                  )}
                </div>
                <h3 className="font-black italic text-slate-100 text-sm uppercase">{r.titulo}</h3>
                <p className="text-[9px] font-bold italic text-slate-500 mt-1">
                  {r.criterios.length} criterios · {r.criterios.reduce((s, c) => s + Number(c.maxPuntos || 0), 0).toFixed(2)} pts. máx.
                </p>
              </div>
              <button
                onClick={() => eliminar(r)}
                className="text-rose-400 hover:text-rose-300 text-sm"
                title="Eliminar rúbrica"
              >
                <i className="fas fa-trash" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed line-clamp-2">
              {r.descripcion || 'Sin descripción.'}
            </p>

            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
              <button
                onClick={() => onCalificar(r)}
                className="bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition"
              >
                <i className="fas fa-pen-to-square mr-1" /> Calificar grupos
              </button>
              <button
                onClick={() => onEditar(r)}
                className="bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition"
              >
                <i className="fas fa-edit mr-1" /> Editar
              </button>
              <button
                onClick={() => alternar(r)}
                className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition ${
                  r.publicado
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {r.publicado ? '⏸ Quitar publicación' : '✓ Publicar'}
              </button>
              <button
                onClick={() => exportar(r)}
                disabled={exportando === r.id}
                className="bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition disabled:opacity-50"
              >
                {exportando === r.id ? 'Exportando...' : <><i className="fas fa-file-csv mr-1" /> Exportar notas</>}
              </button>
              <button
                onClick={() => setModalEvaluadores(r)}
                className="col-span-2 bg-violet-600/20 text-violet-300 border border-violet-500/40 hover:bg-violet-600/30 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition"
              >
                <i className="fas fa-user-group mr-1" /> Colaboradores
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalInvitarEvaluadores
        abierto={!!modalEvaluadores}
        onCerrar={() => setModalEvaluadores(null)}
        grado={seccion}
        rubrica={modalEvaluadores}
        docenteUser={docenteUser}
      />
    </div>
  );
}