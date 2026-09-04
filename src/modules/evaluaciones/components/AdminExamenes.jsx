import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSecciones } from '../../../hooks/useSecciones';
import { escucharRuta } from '../../../firebase';
import { cambiarEstadoExamen, eliminarExamen, duplicarExamen } from '../services/examService';
import { imprimirHojaExamen } from '../utils/hojaExamen';
import { Spinner } from '../../../components/EstadoPeticion';
import ExamBuilder from './ExamBuilder/ExamBuilder';
import TeacherDashboard from './TeacherDashboard/TeacherDashboard';
import AnalyticsDashboard from './Reports/AnalyticsDashboard';
import { useToast } from '../../../context/ToastContext';

/**
 * Módulo de administración de exámenes.
 * @param {{ docenteUser: object|null, claveAdmin?: string, seccionesPermitidas?: array|null, seccion?: string, materia?: string }} props
 */
export default function AdminExamenes({ docenteUser, claveAdmin = '', seccionesPermitidas = null, seccion, materia }) {
  const { secciones } = useSecciones();
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [vista, setVista] = useState('lista');
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [examenAEditar, setExamenAEditar] = useState(null);

  // En el área Admin (sin seccionesPermitidas) se puede ver todo globalmente;
  // en el área Docente se limita a sus secciones asignadas.
  const modoSuperAdmin = !!claveAdmin;
  const seccionesVisibles = seccionesPermitidas == null
    ? secciones
    : secciones.filter((s) => seccionesPermitidas.includes(s.id));

  function handleCrearNuevo() {
    setExamenAEditar(null);
    setVista('crear');
  }

  function handleEditarExamen(examen) {
    setExamenAEditar(examen);
    setVista('crear');
  }

  return (
    <div className="space-y-6">
      {/* Section Filter Toolbar */}
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
              Seleccionar Sección Institucional
            </label>
            <div className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-black italic text-sm text-slate-100">
              {seccion ? seccionesVisibles.find(s => s.id === seccion)?.label || seccion : '—'}
            </div>
          </div>

          {seccion && (
            <p className="text-[9px] text-slate-400 font-bold italic mb-2">
              Materia: {materia || '—'}
            </p>
          )}

          {seccion && (
            <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
              {[
                { id: 'lista', label: 'Exámenes' },
                { id: 'crear', label: examenAEditar ? 'Editar examen' : 'Crear examen' },
                { id: 'dashboard', label: 'Panel docente' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    if (v.id === 'crear' && !examenAEditar) handleCrearNuevo();
                    else setVista(v.id);
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
                    vista === v.id
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!seccion && (
        <div className="text-center py-16 wayground-card bg-slate-900 rounded-[2.5rem] border border-slate-800">
          <i className="fas fa-chalkboard text-4xl text-indigo-500/50 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            Selecciona una sección en el selector superior para gestionar o calificar sus exámenes.
          </p>
        </div>
      )}

      {seccion && vista === 'lista' && (
        <ListaExamenesAdmin
          grado={seccion}
          claveAdmin={claveAdmin}
          docenteActivo={docenteUser}
          modoSuperAdmin={modoSuperAdmin}
          setVista={setVista}
          setExamenSeleccionado={setExamenSeleccionado}
          onEditarExamen={handleEditarExamen}
          onCrearExamen={handleCrearNuevo}
        />
      )}

      {seccion && vista === 'crear' && (
        <ExamBuilder
          grado={seccion}
          claveAdmin={claveAdmin}
          docente={docenteUser}
          examenAEditar={examenAEditar}
          onExamenGuardado={() => {
            setExamenAEditar(null);
            setVista('lista');
          }}
          onCancel={() => {
            setExamenAEditar(null);
            setVista('lista');
          }}
        />
      )}

      {seccion && vista === 'dashboard' && (
        <TeacherDashboard
          grado={seccion}
          claveAdmin={claveAdmin}
          onNavegar={(v, examen) => {
            if (v === 'crear' && examen) {
              handleEditarExamen(examen);
            } else {
              setVista(v);
            }
          }}
        />
      )}

      {seccion && vista === 'analytics' && examenSeleccionado && (
        <AnalyticsDashboard
          grado={seccion}
          examenId={examenSeleccionado.id}
          claveAdmin={claveAdmin}
          onVolver={() => setVista('lista')}
        />
      )}
    </div>
  );
}

// ─── Lista de Exámenes ────────────────────────────────────────────────────────

function ListaExamenesAdmin({
  grado,
  claveAdmin,
  docenteActivo,
  modoSuperAdmin,
  setVista,
  setExamenSeleccionado,
  onEditarExamen,
  onCrearExamen,
}) {
  const { toastSuccess, toastError, toastInfo } = useToast();
  const { secciones } = useSecciones();
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalDuplicar, setModalDuplicar] = useState(null);
  const [duplicando, setDuplicando] = useState(false);

  useEffect(() => {
    if (!grado) return;

    const cancelar = escucharRuta(`evaluaciones/${grado}/examenes`, (data) => {
      if (!data) {
        setExamenes([]);
        setCargando(false);
        return;
      }
      let lista = Object.entries(data)
        .map(([id, e]) => ({ ...e, id: e.id || id }))
        .filter((e) => !e.eliminado)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Si no es super admin, filtrar solo exámenes del docente actual
      if (!modoSuperAdmin && docenteActivo) {
        lista = lista.filter(
          (e) =>
            e.creadoPorUid === docenteActivo.uid ||
            e.creadoPorEmail === docenteActivo.email ||
            !e.creadoPorUid
        );
      }

      setExamenes(lista);
      setCargando(false);
    });

    return cancelar;
  }, [grado, modoSuperAdmin, docenteActivo]);

  const examenesFiltrados = examenes.filter((e) =>
    (e.titulo || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirExamen(examen) {
    setExamenSeleccionado(examen);
    setVista('analytics');
  }

  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  async function alternarEstado(e, examen) {
    e.stopPropagation();
    if (!examen.id || cambiandoEstadoId) {
      return;
    }
    setCambiandoEstadoId(examen.id);
    const nuevo = examen.estado === 'activo' ? 'borrador' : 'activo';
    try {
      const res = await cambiarEstadoExamen(grado, examen.id, nuevo, claveAdmin);
      if (res.ok) {
        if (nuevo === 'activo') {
          localStorage.removeItem(`evaluacion_constructor_${grado}`);
          toastSuccess(`Examen "${examen.titulo}" ACTIVADO para estudiantes.`);
        } else {
          toastInfo(`Examen "${examen.titulo}" DESACTIVADO (Pausado).`);
        }
      } else {
        toastError('No se pudo cambiar el estado del examen.');
      }
    } catch (err) {
      console.error('[Examen] Error al cambiar estado:', err);
      toastError('Ocurrió un error al cambiar el estado del examen.');
    } finally {
      setCambiandoEstadoId(null);
    }
  }

  async function handleEliminar(e, examen) {
    e.stopPropagation();
    if (
      window.confirm(
        `¿Estás seguro de eliminar definitivamente el examen "${examen.titulo}"? Esta acción no se puede deshacer.`
      )
    ) {
      try {
        const res = await eliminarExamen(grado, examen.id, claveAdmin, docenteActivo?.uid, docenteActivo?.email);
        if (res.ok) {
          toastSuccess(`Examen "${examen.titulo}" eliminado con éxito.`);
        } else {
          toastError('No se pudo eliminar el examen.');
        }
      } catch (err) {
        console.error('[Examen] Error al eliminar:', err);
        toastError('Ocurrió un error al eliminar el examen.');
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-100">
            {modoSuperAdmin
              ? 'Todos los Exámenes (Acceso Admin Global)'
              : docenteActivo
              ? `Exámenes de ${docenteActivo.displayName}`
              : 'Lista de Exámenes Seccionales'}
          </h2>
          <p className="text-[9px] text-slate-400 font-bold italic">
            {modoSuperAdmin
              ? 'Vista global de la institución con control total'
              : 'Espacio de trabajo docente aislado'}
          </p>
        </div>

        <button
          onClick={onCrearExamen}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition"
        >
          <i className="fas fa-plus" /> Crear nuevo examen
        </button>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar examen por título..."
        className="w-full p-3.5 bg-slate-900 rounded-xl border border-slate-800 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {cargando && <Spinner texto="Cargando exámenes..." />}

      {!cargando && examenesFiltrados.length === 0 && (
        <div className="text-center py-12 wayground-card bg-slate-900 rounded-[2.5rem] border border-slate-800">
          <i className="fas fa-clipboard-list text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            No se encontraron exámenes para esta cuenta en la sección seleccionada.
          </p>
          <button
            onClick={onCrearExamen}
            className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
          >
            <i className="fas fa-plus mr-2" /> Crear mi primer examen
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examenesFiltrados.map((examen) => (
          <motion.div
            key={examen.id}
            whileHover={{ scale: 1.01 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => abrirExamen(examen)}
            className="wayground-card bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-lg p-6 cursor-pointer hover:border-indigo-500/50 transition-all group relative"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-slate-100 uppercase italic pr-2">
                {examen.titulo || 'Sin título'}
              </h3>
              <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border ${estadoBadge(examen.estado)}`}>
                {estadoLabel(examen.estado)}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-bold italic mb-3 line-clamp-2">
              {examen.descripcion || 'Sin descripción especificada.'}
            </p>

            <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-500 italic mb-4">
              <div className="flex gap-3">
                <span><i className="fas fa-question-circle mr-1" />{(examen.preguntas || []).length} preguntas</span>
                <span><i className="fas fa-clock mr-1" />{examen.configuracion?.duracionMinutos || 60} min</span>
                <span><i className="fas fa-star mr-1 text-amber-400" />{Number(examen.configuracion?.puntajeTotal || 10).toFixed(2)} pts</span>
              </div>
              <span className="text-[8px] bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800 truncate max-w-[120px]">
                {examen.creadoPor || 'Docente INSAL'}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-5 gap-1.5">
              <button
                onClick={(e) => alternarEstado(e, examen)}
                disabled={cambiandoEstadoId === examen.id}
                title={examen.estado === 'activo' ? 'Pausar examen' : 'Publicar examen'}
                className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition disabled:opacity-50 ${
                  examen.estado === 'activo'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {cambiandoEstadoId === examen.id
                  ? '⏳ Procesando...'
                  : examen.estado === 'activo'
                  ? '✓ Activo'
                  : '⏸ Activar'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditarExamen(examen);
                }}
                className="bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-600 hover:text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition"
              >
                ✏️ Editar
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!Array.isArray(examen.preguntas) || examen.preguntas.length === 0) {
                    toastError('Este examen no tiene preguntas para imprimir.');
                    return;
                  }
                  imprimirHojaExamen(examen, grado);
                }}
                title="Imprimir hoja para aplicar en papel"
                className="bg-slate-700/40 text-slate-200 border border-slate-600/50 hover:bg-slate-600 hover:text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition"
              >
                🖨 Imprimir
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); abrirExamen(examen); }}
                className="bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition"
              >
                📊 Notas
              </button>

              <button
                onClick={(e) => handleEliminar(e, examen)}
                className="bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition"
              >
                🗑 Eliminar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setModalDuplicar(examen); }}
                className="bg-violet-500/10 text-violet-400 border border-violet-500/30 hover:bg-violet-600 hover:text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition"
              >
                📋 Duplicar
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {modalDuplicar && (
        <ModalDuplicarExamen
          examen={modalDuplicar}
          secciones={secciones.filter((s) => s.id !== grado)}
          onCerrar={() => setModalDuplicar(null)}
          claveAdminExistente={claveAdmin}
          onDuplicar={async (gradoDestino, claveUtilizar) => {
            setDuplicando(true);
            try {
              const docente = docenteActivo
                ? { uid: docenteActivo.uid, email: docenteActivo.email, displayName: docenteActivo.displayName || docenteActivo.email }
                : null;
              await duplicarExamen(grado, modalDuplicar.id, gradoDestino, claveUtilizar, docente);
              toastSuccess(`Examen duplicado a sección ${gradoDestino}.`);
              setModalDuplicar(null);
            } catch (err) {
              toastError(err.message || 'Error al duplicar.');
            } finally {
              setDuplicando(false);
            }
          }}
          duplicando={duplicando}
        />
      )}
    </div>
  );
}

function estadoLabel(estado) {
  const map = { borrador: 'Inactivo', activo: 'Publicado', en_curso: 'En curso', finalizado: 'Finalizado' };
  return map[estado] || 'Inactivo';
}

function estadoBadge(estado) {
  if (estado === 'activo') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

function ModalDuplicarExamen({ examen, secciones, onCerrar, onDuplicar, duplicando, claveAdminExistente }) {
  const [destino, setDestino] = useState('');
  const [clave, setClave] = useState('');

  const claveFinal = claveAdminExistente || clave;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative bg-slate-900 rounded-[2rem] border border-slate-700 shadow-2xl w-full max-w-md p-6 space-y-5">
        <div>
          <h3 className="text-sm font-black italic uppercase text-slate-100">
            <i className="fas fa-copy mr-2 text-violet-400" />
            Duplicar Examen
          </h3>
          <p className="text-[9px] font-bold italic text-slate-500 mt-1">
            {examen.titulo} — Se duplicará como borrador a otra sección.
          </p>
        </div>

        <div>
          <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
            Sección destino
          </label>
          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Selecciona sección...</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {!claveAdminExistente && (
          <div>
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
              Clave de administrador
            </label>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Ingresa la clave admin..."
              className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onDuplicar(destino, claveFinal)}
            disabled={!destino || !claveFinal || duplicando}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
          >
            {duplicando ? 'Duplicando...' : 'Duplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}