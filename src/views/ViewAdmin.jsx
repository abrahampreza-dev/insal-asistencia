import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { llamarApi } from '../api';
import { escucharRuta, leerRuta } from '../firebase';
import { formatearFechaDDMMAAAA, hoyLocalISO } from '../utils/fecha';
import { Spinner, AlertaError, TarjetaExito, CampoError } from '../components/EstadoPeticion';
import CampoClave from '../components/CampoClave';
import GeneradorOtp from '../components/GeneradorOtp';
import BotonGuardarAsistencia from '../components/BotonGuardarAsistencia';
import { useSecciones } from '../hooks/useSecciones';
import { useMaterias } from '../hooks/useMaterias';
import AdminExamenes from '../modules/evaluaciones/components/AdminExamenes';
import ModuloRubricas from '../modules/rubricas/ModuloRubricas';
import { useAuth } from '../context/AuthContext';
import SelectorUniversalSeccionMateria from '../components/SelectorUniversalSeccionMateria';

const TABS = [
  { id: 'reportes', texto: 'Reportes' },
  { id: 'alumnos', texto: 'Alumnos' },
  { id: 'claves', texto: 'Claves' },
  { id: 'secciones', texto: 'Secciones' },
  { id: 'materias', texto: 'Materias' },
  { id: 'asistencia', texto: 'Pasar Lista' },
  { id: 'bitacora', texto: 'Bitácora' },
];

const MODULOS = [
  { id: 'examenes', texto: 'Exámenes', icono: 'fa-clipboard-list' },
  { id: 'rubricas', texto: 'Rúbricas', icono: 'fa-table-list' },
  { id: 'administracion', texto: 'Administración', icono: 'fa-users-gear' },
];

function hoyISO() {
  return hoyLocalISO();
}

function Etiqueta({ texto }) {
  return <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{texto}</label>;
}

function Campo({ texto, tipo = 'text', value, onChange, placeholder = '' }) {
  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <Etiqueta texto={texto} />
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition"
      />
    </div>
  );
}

export default function ViewAdmin() {
  const { adminActivo, adminClave, logoutAdmin } = useAuth();
  const [pestaña, setPestaña] = useState('reportes');
  const [modulo, setModulo] = useState('examenes');
  const [grado, setGrado] = useState('');
  const [materia, setMateria] = useState('');
  const { secciones } = useSecciones();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Admin */}
      <div
        className="relative overflow-hidden flex items-center justify-between flex-wrap gap-4 p-5 rounded-[2rem] border border-violet-800/40"
        style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0f172a 100%)' }}
      >
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <i className="fas fa-shield-halved text-violet-400 text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-violet-400">Administrador</span>
              <span className="text-[8px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono">
                Acceso Total
              </span>
            </div>
            <h2 className="text-sm font-black italic uppercase text-slate-100">Panel de Administración</h2>
            <p className="text-[9px] font-mono text-slate-400">Sesión segura activa • Expiración en 30 min de inactividad</p>
          </div>
        </div>
        <button
          onClick={logoutAdmin}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/50 px-4 py-2 rounded-xl transition"
        >
          <i className="fas fa-right-from-bracket text-xs" />
          Cerrar Sesión
        </button>
      </div>

      {/* Selector de módulo */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm w-fit flex-wrap">
          {MODULOS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModulo(m.id)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
                modulo === m.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${m.icono} mr-2`} /> {m.texto}
            </button>
          ))}
        </div>
      </div>

      {/* Selector Universal de Sección y Materia */}
      <SelectorUniversalSeccionMateria
        secciones={secciones}
        seccion={grado}
        setSeccion={setGrado}
        materia={materia}
        setMateria={setMateria}
        seccionLabel="Grado/Sección"
        isAdmin={true}
      />

      {/* Módulo Exámenes */}
      <AnimatePresence mode="wait">
        {modulo === 'examenes' && (
          <motion.div
            key="examenes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AdminExamenes docenteUser={null} claveAdmin={adminClave} seccion={grado} materia={materia} />
          </motion.div>
        )}

        {/* Módulo Administración */}
        {modulo === 'administracion' && (
          <motion.div
            key="administracion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex gap-2 flex-wrap bg-slate-900 p-2 rounded-2xl border border-slate-800 mb-6">
              {TABS.map((t) => (
                <BotonPestaña
                  key={t.id}
                  activo={pestaña === t.id}
                  onClick={() => setPestaña(t.id)}
                  texto={t.texto}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              {pestaña === 'reportes' && (
                <motion.div
                  key="reportes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelReportes claveAdmin={adminClave} secciones={secciones} grado={grado} setGrado={setGrado} materia={materia} setMateria={setMateria} />
                </motion.div>
              )}
              {pestaña === 'alumnos' && (
                <motion.div
                  key="alumnos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelAlumnos claveAdmin={adminClave} secciones={secciones} grado={grado} setGrado={setGrado} />
                </motion.div>
              )}
              {pestaña === 'claves' && (
                <motion.div
                  key="claves"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelClaves claveAdmin={adminClave} secciones={secciones} grado={grado} setGrado={setGrado} />
                </motion.div>
              )}
              {pestaña === 'secciones' && (
                <motion.div
                  key="secciones"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelSecciones claveAdmin={adminClave} />
                </motion.div>
              )}
              {pestaña === 'materias' && (
                <motion.div
                  key="materias"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelMaterias claveAdmin={adminClave} />
                </motion.div>
              )}
              {pestaña === 'asistencia' && (
                <motion.div
                  key="asistencia"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelCorreccion claveAdmin={adminClave} secciones={secciones} grado={grado} setGrado={setGrado} materia={materia} setMateria={setMateria} />
                </motion.div>
              )}
              {pestaña === 'bitacora' && (
                <motion.div
                  key="bitacora"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <PanelBitacora />
                </motion.div>
              )}
            </AnimatePresence>
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
            <ModuloRubricas docenteUser={null} seccionesPermitidas={secciones.map((s) => s.id)} seccion={grado} materia={materia} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BotonPestaña({ activo, onClick, texto }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition ${
        activo ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {texto}
    </button>
  );
}

function PanelReportes({ claveAdmin, secciones, grado, setGrado, materia, setMateria }) {
  const { materias } = useMaterias();
  const [fecha, setFecha] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [reporte, setReporte] = useState(null);
  const [congelando, setCongelando] = useState(false);
  const [mensajeCongelar, setMensajeCongelar] = useState('');
  const [enviandoCorreos, setEnviandoCorreos] = useState(false);
  const [mensajeCorreos, setMensajeCorreos] = useState('');
  const [materiasSec, setMateriasSec] = useState([]);

  const fechaTexto = formatearFechaDDMMAAAA(fecha);

  useEffect(() => {
    if (!grado) { setMateriasSec([]); setMateria(''); return; }
    const cancelar = escucharRuta(`config/docentes/${grado}`, (data) => {
      const materiasSet = new Set();
      for (const _emailKey in data || {}) {
        const reg = data[_emailKey];
        if (reg?.materias) {
          (Array.isArray(reg.materias) ? reg.materias : []).forEach((m) => materiasSet.add(m));
        }
      }
      setMateriasSec([...materiasSet].sort());
      setMateria('');
    });
    return cancelar;
  }, [grado]);

  async function consultar() {
    if (!grado) { setError('Selecciona un grado.'); return; }
    if (!materia) { setError('Selecciona la materia.'); return; }
    setCargando(true);
    setError('');
    setReporte(null);
    setMensajeCongelar('');
    setMensajeCorreos('');

    try {
      const [dataAlumnos, dataAsistencia] = await Promise.all([
        leerRuta(`estudiantes/${grado}`),
        leerRuta(`asistencia/${fecha}/${grado}/${materia}`),
      ]);

      const alumnos = Object.values(dataAlumnos || {}).sort((a, b) => (a.apellidos||'').localeCompare(b.apellidos||''));
      const asistencia = dataAsistencia || {};

      let presentes = 0, femenino = 0, masculino = 0, faltas = 0, permisos = 0;
      const listaFaltas = [], listaPermisos = [];

      alumnos.forEach((al) => {
        const r = asistencia[al.nie];
        if (r?.estado === 'P') { presentes++; al.sexo === 'F' ? femenino++ : masculino++; }
        else if (r?.estado === 'A' || !r) { faltas++; listaFaltas.push(al); }
        else if (r?.estado === 'M') { permisos++; listaPermisos.push({ ...al, motivo: r.motivo }); }
      });

      setReporte({ alumnos, asistencia, presentes, femenino, masculino, faltas, permisos, listaFaltas, listaPermisos });
    } catch (err) {
      setError('Error al cargar el reporte: ' + (err.message || 'Error desconocido'));
    } finally {
      setCargando(false);
    }
  }

  function descargarCsv() {
    if (!reporte) return;
    let csv = '\uFEFFNIE;Apellidos;Nombres;Estado;Hora;Dispositivo;Motivo\n';
    reporte.alumnos.forEach((al) => {
      const r = reporte.asistencia[al.nie];
      let estadoLargo = 'AUSENTE';
      if (r?.estado === 'P') estadoLargo = 'PRESENTE';
      if (r?.estado === 'A') estadoLargo = 'FALTA';
      if (r?.estado === 'M') estadoLargo = 'PERMISO';
      csv += `${al.nie};${al.apellidos};${al.nombres};${estadoLargo};${r?.hora || '-'};${r?.dispositivo || r?.navegador || 'N/A'};${r?.motivo || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Asistencia_${grado}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function imprimirReportePdf() {
    window.print();
  }

  function textoWhatsapp() {
    if (!reporte) return '';
    let texto = `*REPORTE DE ASISTENCIA - INSAL*\n*Grado:* ${grado}\n*Fecha:* ${fechaTexto}\n\n`;
    texto += `- Presentes: ${reporte.presentes} (F:${reporte.femenino}/M:${reporte.masculino})\n`;
    texto += `- Ausentes del día: ${reporte.faltas}\n`;
    texto += `- Permisos autorizados: ${reporte.permisos}\n`;
    if (reporte.listaFaltas.length) {
      texto += `\n*ALUMNOS AUSENTES HOY:*\n` + reporte.listaFaltas.map((a, i) => `${i + 1}. ${a.apellidos} ${a.nombres} (NIE: ${a.nie})`).join('\n');
    }
    if (reporte.listaPermisos.length) {
      texto += `\n\n*PERMISOS:*\n` + reporte.listaPermisos.map((a) => `- ${a.apellidos} ${a.nombres} (${a.motivo || 'Sin detalle'})`).join('\n');
    }
    return texto;
  }

  function compartirWhatsapp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsapp())}`, '_blank');
  }

  async function congelar() {
    setCongelando(true);
    setMensajeCongelar('');
    const resultado = await llamarApi('congelarReporte', { grado, materia, claveAdmin, fecha });
    setCongelando(false);
    setMensajeCongelar(resultado.ok ? (resultado.mensaje || 'Reporte oficial cerrado y registrado.') : (resultado.error || 'Error al guardar.'));
  }

  async function enviarCorreos() {
    setEnviandoCorreos(true);
    setMensajeCorreos('');
    const resultado = await llamarApi('enviarCorreoEncargados', { grado, materia, fecha, claveAdmin });
    setEnviandoCorreos(false);
    setMensajeCorreos(resultado.ok ? resultado.mensaje : resultado.error);
  }

  return (
    <div className="space-y-6">
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-wrap gap-4 items-end no-print">
        <Campo texto="Fecha del Registro" tipo="date" value={fecha} onChange={setFecha} />
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sección / Grado</label>
          <div className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5">
            {secciones.find((s) => s.id === grado)?.label || '—'}
          </div>
        </div>
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Materia</label>
          <div className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5">
            {materias.find((m) => m.id === materia)?.label || '—'}
          </div>
        </div>
        <button
          onClick={consultar}
          disabled={cargando || !grado || !materia}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 transition"
        >
          Generar Reporte
        </button>
      </div>

      {cargando && <Spinner texto="Procesando datos y auditoría de navegación..." />}
      <AlertaError mensaje={error} />

      {reporte && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[2rem] text-white font-black italic uppercase shadow-lg shadow-emerald-900/30">
              <span className="text-[9px] tracking-widest opacity-80 block mb-1">Presentes en Aula</span>
              <div className="text-3xl">{reporte.presentes} Alumnos</div>
              <p className="text-[9px] font-bold mt-2 bg-black/20 px-3 py-1 rounded-full w-fit">
                Mujeres: {reporte.femenino} · Hombres: {reporte.masculino}
              </p>
            </div>

            <div className="bg-gradient-to-br from-rose-600 to-red-700 p-6 rounded-[2rem] text-white font-black italic uppercase shadow-lg shadow-rose-900/30">
              <span className="text-[9px] tracking-widest opacity-80 block mb-1">Ausentes del Día</span>
              <div className="text-3xl">{reporte.faltas} Alumnos</div>
              <p className="text-[9px] font-bold mt-2 bg-black/20 px-3 py-1 rounded-full w-fit">
                Tasa de Inasistencia: {((reporte.faltas / (reporte.alumnos.length || 1)) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white font-black italic uppercase shadow-lg shadow-amber-900/30">
              <span className="text-[9px] tracking-widest opacity-80 block mb-1">Permisos Justificados</span>
              <div className="text-3xl">{reporte.permisos} Alumnos</div>
              <p className="text-[9px] font-bold mt-2 bg-black/20 px-3 py-1 rounded-full w-fit">
                Con comprobante oficial
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center no-print">
            <button
              onClick={imprimirReportePdf}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <i className="fas fa-file-pdf" /> Imprimir Reporte PDF Oficial
            </button>
            <button
              onClick={descargarCsv}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2"
            >
              <i className="fas fa-file-excel" /> Descargar Excel (CSV)
            </button>
            <button
              onClick={compartirWhatsapp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
            >
              <i className="fab fa-whatsapp text-sm" /> Enviar por WhatsApp
            </button>
            <button
              onClick={enviarCorreos}
              disabled={enviandoCorreos}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition"
            >
              {enviandoCorreos ? 'Enviando...' : 'Notificar a Encargados'}
            </button>
            <button
              onClick={congelar}
              disabled={congelando}
              className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition"
            >
              {congelando ? 'Guardando...' : 'Cerrar Registro del Día'}
            </button>
          </div>

          {mensajeCongelar && <p className="text-[10px] italic font-bold text-slate-400 text-center">{mensajeCongelar}</p>}
          {mensajeCorreos && <p className="text-[10px] italic font-bold text-slate-400 text-center">{mensajeCorreos}</p>}

          <div className="wayground-card bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-6 text-center">
              <h2 className="text-xl font-black uppercase italic text-slate-100 tracking-tight">
                INSTITUTO NACIONAL SAN LUIS
              </h2>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">
                Reporte Consolidado de Asistencia y Auditoría Digital
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Sección: {grado} • Fecha: {fechaTexto}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs italic font-bold">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-400 tracking-widest">
                    <th className="p-3">#</th>
                    <th className="p-3">Estudiante</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Hora Marcación</th>
                    <th className="p-3">Dispositivo / Navegador Auditado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reporte.alumnos.map((al, idx) => {
                    const r = reporte.asistencia[al.nie];
                    const estado = r?.estado || 'A';
                    const disp = r?.dispositivo || r?.navegador || 'Sin registro';

                    return (
                      <tr key={al.nie} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3 uppercase text-slate-200">
                          {al.apellidos}, {al.nombres}
                          <span className="block text-[8px] text-slate-500 font-mono">NIE {al.nie}</span>
                        </td>
                        <td className="p-3">
                          {estado === 'P' && <span className="text-emerald-400 font-black">✓ PRESENTE</span>}
                          {estado === 'A' && <span className="text-rose-400 font-black">✕ AUSENTE</span>}
                          {estado === 'M' && <span className="text-amber-400 font-black">! PERMISO ({r?.motivo})</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[10px]">
                          {(r?.hora && !isNaN(new Date(r.hora).getTime()) ? new Date(r.hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : '—')}
                        </td>
                        <td className="p-3 font-mono text-[9px] text-indigo-300">{disp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-12 grid grid-cols-2 gap-12 text-center text-[10px] font-black uppercase italic text-slate-400">
              <div className="border-t border-slate-700 pt-2">
                Firma Docente / Asistente de Sección
              </div>
              <div className="border-t border-slate-700 pt-2">
                Sello Dirección INSAL
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalEditarAlumno({ alumno, secciones, claveAdmin, onCerrar }) {
  const [campos, setCampos] = useState({ ...alumno });
  const [estado, setEstado] = useState('idle');
  const [mensajeError, setMensajeError] = useState('');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);

  async function guardarCambios() {
    setEstado('cargando');
    setMensajeError('');
    const resultado = await llamarApi('editarEstudiante', {
      nieOriginal: alumno.nie,
      gradoOriginal: alumno.grado,
      claveAdmin,
      data: campos,
    });
    if (resultado.ok) {
      setEstado('exito');
      let timer = setTimeout(() => { onCerrar(); clearTimeout(timer); }, 1500);
    } else {
      setEstado('error');
      setMensajeError(resultado.error);
    }
  }

  async function eliminar() {
    setBorrando(true);
    setMensajeError('');
    const resultado = await llamarApi('eliminarEstudiante', {
      nie: alumno.nie,
      grado: alumno.grado,
      claveAdmin,
    });
    setBorrando(false);
    if (resultado.ok) {
      onCerrar();
    } else {
      setMensajeError(resultado.error);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase text-indigo-400 italic tracking-widest">Editar Alumno</h4>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white transition">
            <i className="fas fa-times" />
          </button>
        </div>

        {alumno.fotoUrl ? (
          <div className="flex justify-center">
            <img
              src={alumno.fotoUrl}
              alt={alumno.nombres || ''}
              className="w-16 h-16 rounded-2xl object-cover bg-slate-800"
              onError={e => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombres + ' ' + alumno.apellidos || 'estudiante')}&background=6366f1&color=fff&size=32`;
              }}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombres + ' ' + alumno.apellidos || 'estudiante')}&background=6366f1&color=fff&size=32`}
              alt={alumno.nombres || 'estudiante'}
              className="w-16 h-16 rounded-2xl object-cover bg-slate-800"
              onError={e => {
                e.target.onerror = null;
                e.target.src = 'https://ui-avatars.com/api/?name=sin-foto&background=6366f1&color=fff&size=32';
              }}
            />
          </div>
        )}

        <input value={campos.apellidos || ''} onChange={(e) => setCampos({ ...campos, apellidos: e.target.value })}
          className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100" placeholder="Apellidos" />
        <input value={campos.nombres || ''} onChange={(e) => setCampos({ ...campos, nombres: e.target.value })}
          className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100" placeholder="Nombres" />
        <input value={campos.emailEncargado || ''} onChange={(e) => setCampos({ ...campos, emailEncargado: e.target.value })}
          className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100" placeholder="Correo del encargado" />
        <textarea value={campos.descripcion || ''} onChange={(e) => setCampos({ ...campos, descripcion: e.target.value })}
          className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100" placeholder="Descripción" rows={2} />

        <div>
          <Etiqueta texto="Mover de sección (opcional)" />
          <select value={campos.grado || ''} onChange={(e) => setCampos({ ...campos, grado: e.target.value })}
            className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100">
            {secciones.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>

        {estado === 'cargando' && <Spinner texto="Guardando cambios..." />}
        {estado === 'exito' && <TarjetaExito titulo="Actualizado" mensaje="Cambios guardados." />}
        <AlertaError mensaje={mensajeError} />

        <button onClick={guardarCambios} disabled={estado === 'cargando'}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition">
          Guardar Cambios
        </button>

        <div className="border-t border-slate-800 pt-4">
          {!confirmarBorrado ? (
            <button onClick={() => setConfirmarBorrado(true)}
              className="w-full text-rose-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition">
              Eliminar de la sección
            </button>
          ) : (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-bold italic text-rose-400 text-center">
                ¿Seguro que deseas eliminar a {alumno.apellidos}, {alumno.nombres}? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmarBorrado(false)} className="flex-1 p-2 text-[10px] font-bold text-slate-400 uppercase">Cancelar</button>
                <button onClick={eliminar} disabled={borrando}
                  className="flex-1 p-2 bg-rose-500 text-white rounded-xl text-[10px] font-black shadow-lg uppercase disabled:opacity-50">
                  {borrando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelAlumnos({ claveAdmin, secciones, grado }) {
  const [busqueda, setBusqueda] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const cancelarRef = useRef(null);

  useEffect(() => {
    if (cancelarRef.current) { cancelarRef.current(); cancelarRef.current = null; }
    setSeleccionado(null);
    if (!grado) { setAlumnos([]); return; }
    cancelarRef.current = escucharRuta(`estudiantes/${grado}`, (data) => {
      setAlumnos(Object.values(data || {}).sort((a, b) => (a.apellidos||'').localeCompare(b.apellidos||'')));
    });
    return () => { if (cancelarRef.current) cancelarRef.current(); };
  }, [grado]);

  const filtrados = alumnos.filter((al) =>
    !busqueda ||
    String(al.nie || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    String(al.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    String(al.apellidos || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-sm font-black italic uppercase text-slate-100">Gestión de Alumnos</h3>
            <p className="text-[10px] text-slate-400">Total registrados: {alumnos.length}</p>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por NIE, Nombre o Apellido..."
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 w-full sm:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs italic font-bold">
            <thead>
              <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-400 tracking-widest">
                <th className="p-3">NIE</th>
                <th className="p-3">Estudiante</th>
                <th className="p-3">Encargado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtrados.map((al) => (
                <tr key={al.nie} className="hover:bg-slate-800/30">
                  <td className="p-3 font-mono text-indigo-400">{al.nie}</td>
                  <td className="p-3 uppercase text-slate-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={al.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((al.nombres || '') + ' ' + (al.apellidos || ''))}&background=6366f1&color=fff&size=64`}
                        alt=""
                        className="w-8 h-8 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0 shadow-sm"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((al.nombres || '') + ' ' + (al.apellidos || ''))}&background=6366f1&color=fff&size=64`;
                        }}
                      />
                      <span>{al.apellidos}, {al.nombres}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 text-[10px]">{al.emailEncargado || '—'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSeleccionado(al)}
                      className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500 text-xs font-normal">
                    No se encontraron alumnos en este grado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {seleccionado && (
        <ModalEditarAlumno
          alumno={seleccionado}
          secciones={secciones}
          claveAdmin={claveAdmin}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
    </div>
  );
}

function PanelClaves({ claveAdmin, secciones, grado }) {
  const [claveDocente, setClaveDocente] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function actualizarClaveDocente() {
    if (!grado || !claveDocente) return;
    setCargando(true);
    setMensaje('');
    const res = await llamarApi('actualizarClaveDocente', { grado, claveDocente, claveAdmin });
    setCargando(false);
    setMensaje(res.ok ? 'Clave de docente actualizada con éxito.' : res.error);
  }

  return (
    <div className="space-y-6">
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4 max-w-md">
        <h3 className="text-sm font-black italic uppercase text-slate-100">Seguridad y Claves de Sección</h3>
        <CampoClave
          label="Nueva Clave Docente"
          value={claveDocente}
          onChange={setClaveDocente}
          placeholder="Asignar contraseña"
        />
        <button
          onClick={actualizarClaveDocente}
          disabled={cargando || !grado || !claveDocente}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {cargando ? 'Actualizando...' : 'Actualizar Clave'}
        </button>
        {mensaje && <p className="text-[10px] font-bold italic text-slate-400 text-center">{mensaje}</p>}
      </div>
      <GeneradorOtp claveAdmin={claveAdmin} />
    </div>
  );
}

function PanelSecciones({ claveAdmin }) {
  const { secciones } = useSecciones();
  const [nuevaSeccion, setNuevaSeccion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function crearSeccion() {
    if (!nuevaSeccion) return;
    setCargando(true);
    setMensaje('');
    const res = await llamarApi('crearSeccion', { nombre: nuevaSeccion, claveAdmin });
    setCargando(false);
    if (res.ok) {
      setNuevaSeccion('');
      setMensaje('Sección creada exitosamente.');
    } else {
      setMensaje(res.error);
    }
  }

  return (
    <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
      <h3 className="text-sm font-black italic uppercase text-slate-100">Gestión de Secciones</h3>
      <div className="flex gap-3 flex-wrap items-end">
        <Campo texto="Nombre de la nueva sección" value={nuevaSeccion} onChange={setNuevaSeccion} placeholder="Ej: 1° Año A" />
        <button
          onClick={crearSeccion}
          disabled={cargando || !nuevaSeccion}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {cargando ? 'Creando...' : 'Crear Sección'}
        </button>
      </div>
      {mensaje && <p className="text-[10px] font-bold italic text-slate-400">{mensaje}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        {secciones.map((sec) => (
          <div key={sec.id} className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl text-center">
            <span className="text-xs font-bold text-slate-200 uppercase">{sec.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelMaterias({ claveAdmin }) {
  const { materias } = useMaterias();
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function crearMateria() {
    if (!nuevaMateria) return;
    setCargando(true);
    setMensaje('');
    const res = await llamarApi('crearMateria', { nombre: nuevaMateria, claveAdmin });
    setCargando(false);
    if (res.ok) {
      setNuevaMateria('');
      setMensaje('Materia creada exitosamente.');
    } else {
      setMensaje(res.error);
    }
  }

  return (
    <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
      <h3 className="text-sm font-black italic uppercase text-slate-100">Gestión de Materias</h3>
      <div className="flex gap-3 flex-wrap items-end">
        <Campo texto="Nombre de la nueva materia" value={nuevaMateria} onChange={setNuevaMateria} placeholder="Ej: Ciencias Naturales" />
        <button
          onClick={crearMateria}
          disabled={cargando || !nuevaMateria}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {cargando ? 'Creando...' : 'Crear Materia'}
        </button>
      </div>
      {mensaje && <p className="text-[10px] font-bold italic text-slate-400">{mensaje}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        {materias.map((mat) => (
          <div key={mat.id} className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl text-center">
            <span className="text-xs font-bold text-slate-200 uppercase">{mat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelCorreccion({ claveAdmin, secciones, grado, setGrado, materia, setMateria }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [asistencia, setAsistencia] = useState({});
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!grado || !materia || !fecha) return;
    setCargando(true);
    Promise.all([
      leerRuta(`estudiantes/${grado}`),
      leerRuta(`asistencia/${fecha}/${grado}/${materia}`)
    ]).then(([dataAlumnos, dataAsist]) => {
      const list = Object.values(dataAlumnos || {}).sort((a, b) => (a.apellidos||'').localeCompare(b.apellidos||''));
      setAlumnos(list);
      setAsistencia(dataAsist || {});
    }).finally(() => setCargando(false));
  }, [grado, materia, fecha]);

  function cambiarEstado(nie, estado) {
    setAsistencia((prev) => ({
      ...prev,
      [nie]: { ...(prev[nie] || {}), estado, hora: new Date().toISOString() }
    }));
  }

  return (
    <div className="space-y-6">
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <Campo texto="Fecha" tipo="date" value={fecha} onChange={setFecha} />
        </div>

        {cargando ? (
          <Spinner texto="Cargando lista..." />
        ) : (
          <div className="space-y-3 pt-4">
            {alumnos.map((al) => {
              const reg = asistencia[al.nie] || {};
              const estado = reg.estado || 'A';
              return (
                <div key={al.nie} className="flex items-center justify-between bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
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
                      <p className="text-xs font-bold text-slate-200 uppercase">{al.apellidos}, {al.nombres}</p>
                      <p className="text-[9px] font-mono text-slate-400">NIE: {al.nie}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => cambiarEstado(al.nie, 'P')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${estado === 'P' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      P
                    </button>
                    <button
                      onClick={() => cambiarEstado(al.nie, 'A')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${estado === 'A' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      A
                    </button>
                    <button
                      onClick={() => cambiarEstado(al.nie, 'M')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${estado === 'M' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      M
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {alumnos.length > 0 && (
          <div className="pt-4">
            <BotonGuardarAsistencia
              grado={grado}
              materia={materia}
              fecha={fecha}
              asistencia={asistencia}
              claveAdmin={claveAdmin}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PanelBitacora() {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    leerRuta('bitacora').then((data) => {
      if (data) {
        const lista = Object.values(data).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
        setLogs(lista);
      }
    }).finally(() => setCargando(false));
  }, []);

  return (
    <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
      <h3 className="text-sm font-black italic uppercase text-slate-100">Bitácora del Sistema</h3>
      {cargando ? (
        <Spinner texto="Cargando bitácora..." />
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {logs.map((log, idx) => (
            <div key={idx} className="bg-slate-800/30 border border-slate-800 p-3 rounded-xl text-xs font-mono">
              <span className="text-indigo-400 font-bold">[{log.fecha ? new Date(log.fecha).toLocaleString() : '—'}]</span>{' '}
              <span className="text-slate-200">{log.accion || JSON.stringify(log)}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-slate-500 text-xs italic">No hay registros de bitácora disponibles.</p>}
        </div>
      )}
    </div>
  );
}