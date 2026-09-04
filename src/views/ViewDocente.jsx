import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AdminExamenes from '../modules/evaluaciones/components/AdminExamenes';
import { llamarApi } from '../api';
import { leerRuta, escucharRuta } from '../firebase';
import { formatearFechaDDMMAAAA, hoyLocalISO } from '../utils/fecha';
import { Spinner } from '../components/EstadoPeticion';
import AvatarDocente from '../components/AvatarDocente';
import GeneradorOtp from '../components/GeneradorOtp';
import BotonGuardarAsistencia from '../components/BotonGuardarAsistencia';
import { useSecciones } from '../hooks/useSecciones';
import { useMaterias } from '../hooks/useMaterias';
import ModuloRubricas from '../modules/rubricas/ModuloRubricas';
import ModuloEvaluaciones from '../modules/rubricas/ModuloEvaluaciones';
import SelectorUniversalSeccionMateria from '../components/SelectorUniversalSeccionMateria';

function _emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/\./g, '~');
}

function useDocenteSecciones(email) {
  const [secciones, setSecciones] = useState([]);

  useEffect(() => {
    if (!email) {
      setSecciones([]);
      return undefined;
    }
    const clave = _emailKey(email);
    const cancelar = escucharRuta('config/docentes', (data) => {
      const lista = [];
      for (const grado in data || {}) {
        const reg = data[grado] && data[grado][clave];
        if (reg) lista.push({ id: grado, materias: Array.isArray(reg.materias) ? reg.materias : [] });
      }
      setSecciones(lista);
    });
    return cancelar;
  }, [email]);

  return secciones;
}

const MODULOS_DOCENTE = [
  { id: 'examenes', texto: 'Exámenes', icono: 'fa-clipboard-list' },
  { id: 'rubricas', texto: 'Rúbricas', icono: 'fa-table-list' },
  { id: 'evaluador', texto: 'Como Evaluador', icono: 'fa-user-tie' },
  { id: 'asistencia', texto: 'Asistencia', icono: 'fa-users-rectangle' },
  { id: 'config', texto: 'Mis Secciones', icono: 'fa-chalkboard-user' },
];

const TABS_ASISTENCIA = [
  { id: 'reportes', texto: 'Reportes' },
  { id: 'lista', texto: 'Pasar Lista' },
];

function hoyISO() {
  return hoyLocalISO();
}

export default function ViewDocente() {
  const { docenteUser, logoutDocente } = useAuth();
  const { secciones } = useSecciones();
  const misSecciones = useDocenteSecciones(docenteUser?.email);
  const idsMis = misSecciones.map((s) => s.id);
  const seccionesDocente = secciones.filter((s) => idsMis.includes(s.id));
  const [modulo, setModulo] = useState('examenes');
  const [seccion, setSeccion] = useState('');
  const [materia, setMateria] = useState('');
  const [cargandoLogout, setCargandoLogout] = useState(false);

  async function handleLogout() {
    setCargandoLogout(true);
    await logoutDocente();
    setCargandoLogout(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header del docente */}
      <div
        className="relative overflow-hidden flex items-center justify-between flex-wrap gap-4 p-5 rounded-[2rem] border border-slate-700/60"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-15 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-4">
          <AvatarDocente
            user={docenteUser}
            className="w-12 h-12 rounded-2xl border-2 border-indigo-500/50 object-cover shadow-lg shadow-indigo-900/30"
            inicialesClassName="text-sm"
          />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">
                Docente Autenticado
              </span>
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                @clases.edu.sv
              </span>
            </div>
            <h2 className="text-sm font-black italic uppercase text-slate-100">
              {docenteUser?.displayName || 'Docente'}
            </h2>
            <p className="text-[9px] font-mono text-slate-400">{docenteUser?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={cargandoLogout}
          className="relative z-10 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/50 px-4 py-2 rounded-xl transition disabled:opacity-50"
        >
          <i className="fas fa-right-from-bracket text-xs" />
          {cargandoLogout ? 'Cerrando…' : 'Cerrar Sesión'}
        </button>
      </div>

      {/* Selector de módulo */}
      <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm w-fit flex-wrap">
        {MODULOS_DOCENTE.map((m) => (
          <button
            key={m.id}
            onClick={() => setModulo(m.id)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
              modulo === m.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fas ${m.icono} mr-1.5`} />
            {m.texto}
          </button>
        ))}
      </div>

      {/* Único Selector Universal de Sección y Materia */}
      <SelectorUniversalSeccionMateria
        secciones={seccionesDocente}
        seccion={seccion}
        setSeccion={setSeccion}
        materia={materia}
        setMateria={setMateria}
        misSecciones={misSecciones}
      />

      {/* Vistas dinámicas */}
      <AnimatePresence mode="wait">
        {modulo === 'examenes' && (
          <motion.div
            key="examenes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AdminExamenes docenteUser={docenteUser} seccionesPermitidas={idsMis} seccion={seccion} materia={materia} />
          </motion.div>
        )}

        {modulo === 'rubricas' && (
          <motion.div
            key="rubricas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ModuloRubricas docenteUser={docenteUser} seccionesPermitidas={idsMis} seccion={seccion} materia={materia} />
          </motion.div>
        )}

        {modulo === 'evaluador' && (
          <motion.div
            key="evaluador"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ModuloEvaluaciones docenteUser={docenteUser} seccion={seccion} materia={materia} />
          </motion.div>
        )}

        {modulo === 'asistencia' && (
          <motion.div
            key="asistencia"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <PanelAsistenciaDocente secciones={seccionesDocente} misSecciones={misSecciones} docenteUser={docenteUser} seccion={seccion} setSeccion={setSeccion} materia={materia} setMateria={setMateria} />
          </motion.div>
        )}

        {modulo === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <PanelConfiguracionDocente docenteUser={docenteUser} secciones={secciones} misSecciones={misSecciones} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Configuración de secciones y materias ───────────────────────────────────

function PanelConfiguracionDocente({ docenteUser, secciones, misSecciones }) {
  const { materias } = useMaterias();
  const email = docenteUser?.email || '';
  const [nuevaSeccion, setNuevaSeccion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const asignadas = new Set(misSecciones.map((s) => s.id));
  const disponibles = secciones.filter((s) => !asignadas.has(s.id));

  async function agregarSeccion() {
    if (!nuevaSeccion) { setError('Selecciona una sección.'); return; }
    setCargando(true); setError(''); setMensaje('');
    const resultado = await llamarApi('asignarDocenteSeccion', {
      email, nombre: docenteUser?.displayName || '', materias: [], grado: nuevaSeccion, docenteEmail: email,
    });
    setCargando(false);
    if (resultado.ok) {
      setMensaje(resultado.mensaje);
      setNuevaSeccion('');
    } else {
      setError(resultado.error);
    }
  }

  async function guardarMaterias(sec, materiasIds) {
    setError(''); setMensaje('');
    const resultado = await llamarApi('asignarDocenteSeccion', {
      email, nombre: docenteUser?.displayName || '', materias: materiasIds, grado: sec.id, docenteEmail: email,
    });
    if (resultado.ok) setMensaje(resultado.mensaje);
    else setError(resultado.error);
  }

  async function retirarSeccion(sec) {
    setError(''); setMensaje('');
    const resultado = await llamarApi('quitarDocenteSeccion', { email, grado: sec.id, docenteEmail: email });
    if (resultado.ok) setMensaje(resultado.mensaje);
    else setError(resultado.error);
  }

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic mb-1">
          Mis Secciones y Materias
        </h3>
        <p className="text-[9px] font-bold italic text-slate-500 mb-5">
          Selecciona las secciones donde impartes clases y marca las materias que enseñas en cada una.
        </p>

        {misSecciones.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-[10px] font-bold italic text-amber-300 mb-5">
            Aún no tienes secciones asignadas. Agrega tu primera sección para poder tomar asistencia y crear exámenes.
          </div>
        )}

        {misSecciones.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {misSecciones.map((sec) => {
              const secInfo = secciones.find((s) => s.id === sec.id);
              return (
                <div key={sec.id} className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-black italic text-slate-100 text-sm uppercase">{secInfo?.label || sec.id}</p>
                      <p className="text-[9px] font-mono text-slate-500">ID: {sec.id}</p>
                    </div>
                    <button
                      onClick={() => retirarSeccion(sec)}
                      disabled={cargando}
                      className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300 tracking-widest transition disabled:opacity-50"
                    >
                      Retirar
                    </button>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Materias que imparto
                    </p>
                    {materias.length === 0 ? (
                      <p className="text-[9px] italic text-slate-600">Cargando catálogo de materias...</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        {materias.map((m) => {
                          const activa = sec.materias.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${
                                activa ? 'bg-indigo-600/20 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span className={`text-[10px] font-bold italic ${activa ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {m.label}
                              </span>
                              <input
                                type="checkbox"
                                checked={activa}
                                disabled={cargando}
                                onChange={() => {
                                  const nuevas = activa
                                    ? sec.materias.filter((x) => x !== m.id)
                                    : [...sec.materias, m.id];
                                  guardarMaterias(sec, nuevas);
                                }}
                                className="accent-indigo-500"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {disponibles.length > 0 && (
          <div className="border-t border-slate-800 mt-5 pt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Agregar otra sección</label>
              <select
                value={nuevaSeccion}
                onChange={(e) => setNuevaSeccion(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">— Selecciona —</option>
                {disponibles.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
              </select>
            </div>
            <button
              onClick={agregarSeccion}
              disabled={cargando}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <i className="fas fa-plus mr-1.5" /> Agregar
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-[11px] text-rose-300 font-bold italic mt-4">
            <i className="fas fa-triangle-exclamation" /> {error}
          </div>
        )}
        {mensaje && <p className="text-[10px] italic font-bold text-emerald-400 mt-3">{mensaje}</p>}
      </div>
    </div>
  );
}

// ─── Panel Asistencia Docente ────────────────────────────────────────────────

function PanelAsistenciaDocente({ secciones, misSecciones, docenteUser, seccion, setSeccion, materia, setMateria }) {
  const [tab, setTab] = useState('reportes');

  if (secciones.length === 0) {
    return (
      <div className="text-center py-14 bg-slate-900 rounded-[2rem] border border-slate-800 space-y-3">
        <i className="fas fa-user-slash text-4xl text-slate-600" />
        <p className="text-sm font-bold italic text-slate-300">
          Aún no tienes secciones asignadas.
        </p>
        <p className="text-[10px] font-bold italic text-slate-500 max-w-md mx-auto">
          Ve al módulo <span className="text-indigo-400">"Mis Secciones"</span> y agrega las secciones donde impartes clases ({docenteUser?.email || 'tu correo'}).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm w-fit flex-wrap">
        {TABS_ASISTENCIA.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
              tab === t.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {t.texto}
          </button>
        ))}
      </div>

      {tab === 'reportes' && <PanelReportesDocente secciones={secciones} misSecciones={misSecciones} seccion={seccion} setSeccion={setSeccion} materia={materia} setMateria={setMateria} />}
      {tab === 'lista' && <PanelPasarListaDocente secciones={secciones} misSecciones={misSecciones} docenteUser={docenteUser} seccion={seccion} setSeccion={setSeccion} materia={materia} setMateria={setMateria} />}
    </div>
  );
}

// ─── Panel Reportes Docente ──────────────────────────────────────────────────

function PanelReportesDocente({ secciones, misSecciones, seccion, materia }) {
  const { materias } = useMaterias();
  const [fecha, setFecha] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [reporte, setReporte] = useState(null);

  const materiaLabel = materias.find((m) => m.id === materia)?.label || materia;
  const fechaTexto = formatearFechaDDMMAAAA(fecha);

  async function consultar() {
    if (!seccion) { setError('Selecciona un grado/sección.'); return; }
    if (!materia) { setError('Selecciona la materia.'); return; }
    setCargando(true);
    setError('');
    setReporte(null);

    try {
      const [dataAlumnos, dataAsistencia] = await Promise.all([
        leerRuta(`estudiantes/${seccion}`),
        leerRuta(`asistencia/${fecha}/${seccion}/${materia}`),
      ]);

      const alumnos = Object.values(dataAlumnos || {}).sort((a, b) =>
        (a.apellidos||'').localeCompare(b.apellidos||'')
      );
      const asistencia = dataAsistencia || {};

      let presentes = 0, femenino = 0, masculino = 0, faltas = 0, permisos = 0;

      alumnos.forEach((al) => {
        const r = asistencia[al.nie];
        if (r?.estado === 'P') { presentes++; al.sexo === 'F' ? femenino++ : masculino++; }
        else if (!r || r?.estado === 'A') faltas++;
        else if (r?.estado === 'M') permisos++;
      });

      setReporte({ alumnos, asistencia, presentes, femenino, masculino, faltas, permisos });
    } catch (err) {
      console.error('Error consultando asistencia:', err);
      setError('No se pudo cargar el reporte. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  function textoWhatsapp() {
    if (!reporte) return '';
    let texto = `*REPORTE DE ASISTENCIA - INSAL*\n*Grado:* ${seccion}\n*Materia:* ${materiaLabel}\n*Fecha:* ${fechaTexto}\n\n`;
    texto += `- Presentes: ${reporte.presentes} (F:${reporte.femenino}/M:${reporte.masculino})\n`;
    texto += `- Ausentes del día: ${reporte.faltas}\n`;
    texto += `- Permisos autorizados: ${reporte.permisos}\n`;
    const ausentes = reporte.alumnos.filter((al) => {
      const r = reporte.asistencia[al.nie];
      return !r || r?.estado === 'A';
    });
    if (ausentes.length) {
      texto += `\n*ALUMNOS AUSENTES HOY:*\n` + ausentes.map((a, i) => `${i + 1}. ${a.apellidos} ${a.nombres} (NIE: ${a.nie})`).join('\n');
    }
    const permisosLista = reporte.alumnos.filter((al) => reporte.asistencia[al.nie]?.estado === 'M');
    if (permisosLista.length) {
      texto += `\n\n*PERMISOS:*\n` + permisosLista.map((a) => `- ${a.apellidos} ${a.nombres}`).join('\n');
    }
    return texto;
  }

  function compartirWhatsapp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsapp())}`, '_blank');
  }

  function descargarCsv() {
    if (!reporte) return;
    let csv = '\uFEFFNIE;Apellidos;Nombres;Estado;Hora\n';
    reporte.alumnos.forEach((al) => {
      const r = reporte.asistencia[al.nie];
      const estado = r?.estado === 'P' ? 'PRESENTE' : r?.estado === 'M' ? 'PERMISO' : 'AUSENTE';
      csv += `${al.nie};${al.apellidos};${al.nombres};${estado};${r?.hora || '-'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${seccion}_${materia}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Controles de fecha y acción para reporte */}
      <div className="bg-slate-900 p-4 rounded-[2rem] border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha del Reporte</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <button
          onClick={consultar}
          disabled={cargando || !seccion || !materia}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-7 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 transition"
        >
          Ver Reporte
        </button>
      </div>

      {cargando && <Spinner texto="Cargando datos de asistencia..." />}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-[11px] text-rose-300 font-bold italic">
          <i className="fas fa-triangle-exclamation" /> {error}
        </div>
      )}

      {reporte && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Presentes', valor: reporte.presentes, sub: `F:${reporte.femenino} M:${reporte.masculino}`, color: 'from-emerald-600 to-teal-700', shadow: 'shadow-emerald-900/30' },
              { label: 'Ausentes', valor: reporte.faltas, sub: `${((reporte.faltas/(reporte.alumnos.length||1))*100).toFixed(1)}% inasistencia`, color: 'from-rose-600 to-red-700', shadow: 'shadow-rose-900/30' },
              { label: 'Permisos', valor: reporte.permisos, sub: 'con justificación', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-900/30' },
            ].map((w) => (
              <div key={w.label} className={`bg-gradient-to-br ${w.color} p-5 rounded-[1.5rem] text-white font-black italic uppercase shadow-lg ${w.shadow}`}>
                <span className="text-[9px] tracking-widest opacity-80 block mb-1">{w.label}</span>
                <div className="text-2xl">{w.valor} alumnos</div>
                <p className="text-[9px] font-bold mt-1 bg-black/20 px-2 py-0.5 rounded-full w-fit">{w.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => window.print()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <i className="fas fa-file-pdf" /> Imprimir PDF
            </button>
            <button
              onClick={descargarCsv}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2"
            >
              <i className="fas fa-file-excel" /> Descargar CSV
            </button>
            <button
              onClick={compartirWhatsapp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <i className="fab fa-whatsapp text-sm" /> Enviar por WhatsApp
            </button>
          </div>

          <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                Detalle — {seccion} · {materiaLabel} • {fechaTexto}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-bold italic">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-500 tracking-widest">
                    <th className="p-3">#</th>
                    <th className="p-3">Estudiante</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {reporte.alumnos.map((al, idx) => {
                    const r = reporte.asistencia[al.nie];
                    const estado = r?.estado || 'A';
                    return (
                      <tr key={al.nie} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-3 uppercase text-slate-200">
                          {al.apellidos}, {al.nombres}
                          <span className="block text-[8px] text-slate-500 font-mono">NIE {al.nie}</span>
                        </td>
                        <td className="p-3">
                          {estado === 'P' && <span className="text-emerald-400 font-black text-[10px]">✓ PRESENTE</span>}
                          {estado === 'A' && <span className="text-rose-400 font-black text-[10px]">✕ AUSENTE</span>}
                          {estado === 'M' && <span className="text-amber-400 font-black text-[10px]">! PERMISO</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[10px]">
                          {(r?.hora && !isNaN(new Date(r.hora).getTime()) ? new Date(r.hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pasar Lista (OTP y Edición Manual) ──────────────────────────────────────

function PanelPasarListaDocente({ docenteUser, seccion, materia }) {
  const [nombreValidador, setNombreValidador] = useState(docenteUser?.displayName || '');
  const [alumnos, setAlumnos] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [motivoModal, setMotivoModal] = useState(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [error, setError] = useState('');
  const fecha = hoyISO();

  // Cargar Lista de Alumnos por Sección
  useEffect(() => {
    if (!seccion) {
      setAlumnos([]);
      return undefined;
    }
    const cancelar = escucharRuta(`estudiantes/${seccion}`, (data) => {
      setAlumnos(Object.values(data || {}).sort((a, b) => (a.apellidos||'').localeCompare(b.apellidos||'')));
    });
    return cancelar;
  }, [seccion]);

  // Escuchar Asistencia en Tiempo Real por Fecha, Grado y Materia
  useEffect(() => {
    if (!seccion || !materia) {
      setAsistencia({});
      return undefined;
    }
    const cancelar = escucharRuta(`asistencia/${fecha}/${seccion}/${materia}`, (data) => {
      setAsistencia(data || {});
    });
    return cancelar;
  }, [seccion, materia, fecha]);

  const pendientes = materia
    ? alumnos.filter((al) => al?.nie && !(['P','A','M'].includes(String(asistencia[al.nie]?.estado || '').toUpperCase()))).map((al) => `${al.apellidos}, ${al.nombres}`)
    : [];

  const authDocente = docenteUser
    ? { docenteEmail: docenteUser.email, generadoPor: docenteUser.displayName }
    : {};

  const authGuardado = docenteUser
    ? { docenteEmail: docenteUser.email, cerradoPor: docenteUser.displayName }
    : {};

  async function marcar(nie, estado, motivo) {
    if (!docenteUser) return;
    if (!nombreValidador.trim()) { setError('Escribe tu nombre antes de corregir un estado.'); return; }
    setError('');
    const anterior = asistencia[nie];

    setAsistencia((prev) => ({
      ...prev,
      [nie]: { estado, motivo, origen: 'manual', validadoPor: nombreValidador.trim(), hora: new Date().toISOString() },
    }));

    const resultado = await llamarApi('auditarManual', { nie, seccion, materia, estado, motivo, docenteEmail: docenteUser.email, validadoPor: nombreValidador.trim() });
    if (!resultado.ok) {
      setError(resultado.error);
      setAsistencia((prev) => { if (anterior === undefined) { const copia = { ...prev }; delete copia[nie]; return copia; } return { ...prev, [nie]: anterior }; });
    }
  }

  function abrirMotivo(nie) {
    if (!nombreValidador.trim()) { setError('Escribe tu nombre antes de corregir un estado.'); return; }
    setMotivoModal(nie); setMotivoTexto('');
  }

  async function confirmarMotivo() {
    if (!motivoTexto.trim()) return;
    await marcar(motivoModal, 'M', motivoTexto.trim());
    setMotivoModal(null);
    setMotivoTexto('');
  }

  if (!seccion || !materia) {
    return (
      <div className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800">
        <p className="text-sm font-bold italic text-slate-400">
          Usa el selector superior para elegir Sección y Materia para pasar lista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 space-y-4">
        <GeneradorOtp seccion={seccion} materia={materia} authDocente={authDocente} />

        <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nombre del docente validador</label>
            <input
              type="text"
              value={nombreValidador}
              onChange={(e) => setNombreValidador(e.target.value)}
              placeholder="Ej: Lic. Juan Pérez"
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <BotonGuardarAsistencia
            seccion={seccion}
            materia={materia}
            pendientes={pendientes}
            auth={authGuardado}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-[11px] text-rose-300 font-bold italic">
            <i className="fas fa-triangle-exclamation" /> {error}
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
            Lista de Estudiantes — {seccion} • {alumnos.length} Alumnos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold italic">
            <thead>
              <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-500 tracking-widest">
                <th className="p-3">#</th>
                <th className="p-3">Estudiante</th>
                <th className="p-3">Estado Actual</th>
                <th className="p-3 text-center">Acciones Manuales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {alumnos.map((al, idx) => {
                const reg = asistencia[al.nie];
                const estado = reg?.estado || 'A';
                return (
                  <tr key={al.nie} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                    <td className="p-3 uppercase text-slate-200">
                      <div className="flex items-center gap-3">
                        <img
                          src={al.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((al.nombres || '') + ' ' + (al.apellidos || ''))}&background=6366f1&color=fff&size=64`}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0 shadow-sm"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((al.nombres || '') + ' ' + (al.apellidos || ''))}&background=6366f1&color=fff&size=64`;
                          }}
                        />
                        <div>
                          <span className="block font-black text-slate-100">{al.apellidos}, {al.nombres}</span>
                          <span className="block text-[8px] text-slate-400 font-mono tracking-wider">NIE {al.nie}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {estado === 'P' && <span className="text-emerald-400 font-black text-[10px]">✓ PRESENTE</span>}
                      {estado === 'A' && <span className="text-rose-400 font-black text-[10px]">✕ AUSENTE</span>}
                      {estado === 'M' && <span className="text-amber-400 font-black text-[10px]">! PERMISO</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => marcar(al.nie, 'P', '')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                            estado === 'P'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-emerald-600/20 hover:text-emerald-300'
                          }`}
                        >
                          Presente
                        </button>
                        <button
                          onClick={() => marcar(al.nie, 'A', '')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                            estado === 'A'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-rose-600/20 hover:text-rose-300'
                          }`}
                        >
                          Ausente
                        </button>
                        <button
                          onClick={() => abrirMotivo(al.nie)}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                            estado === 'M'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-amber-600/20 hover:text-amber-300'
                          }`}
                        >
                          Permiso
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {motivoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] max-w-md w-full space-y-4">
            <h4 className="text-sm font-black italic uppercase text-slate-100">Motivo del Permiso</h4>
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              placeholder="Escribe la razón o justificación del permiso..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl p-3 focus:outline-none focus:border-indigo-500 h-28 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMotivoModal(null)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMotivo}
                disabled={!motivoTexto.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase transition"
              >
                Guardar Permiso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}