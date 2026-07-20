import React, { useState, useEffect } from 'react';
import { llamarApi } from '../api';
import { escucharRuta, leerRuta } from '../firebase';
import { formatearFechaDDMMAAAA } from '../utils/fecha';
import { Spinner, AlertaError, TarjetaExito, CampoError } from '../components/EstadoPeticion';
import CampoClave from '../components/CampoClave';
import GeneradorOtp from '../components/GeneradorOtp';
import BotonGuardarAsistencia from '../components/BotonGuardarAsistencia';
import { useSecciones } from '../hooks/useSecciones';

const TABS = [
  { id: 'reportes', texto: 'Reportes' },
  { id: 'alumnos', texto: 'Alumnos' },
  { id: 'claves', texto: 'Claves' },
  { id: 'secciones', texto: 'Secciones' },
  { id: 'asistencia', texto: 'Pasar Lista' },
];

export default function ViewAdmin() {
  const [autenticado, setAutenticado] = useState(false);
  const [clave, setClave] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');
  const [pestaña, setPestaña] = useState('reportes');
  const { secciones } = useSecciones();

  async function entrar() {
    if (!clave.trim()) { setErrorLogin('Ingresa la clave de administrador.'); return; }
    setCargandoLogin(true);
    setErrorLogin('');
    const resultado = await llamarApi('validarClaveAdmin', { claveAdmin: clave });
    setCargandoLogin(false);
    if (resultado.ok) {
      setAutenticado(true);
    } else {
      setErrorLogin(resultado.error || 'Clave de administrador incorrecta.');
    }
  }

  if (!autenticado) {
    return (
      <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm text-center">
        <h3 className="text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-6">Panel Administrativo</h3>
        <CampoClave
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
          placeholder="Clave de administrador"
          className="text-center mb-4"
        />
        {cargandoLogin && <Spinner texto="Validando..." />}
        <AlertaError mensaje={errorLogin} />
        <button
          onClick={entrar}
          disabled={cargandoLogin}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition mt-4"
        >
          Entrar
        </button>
        <p className="text-[9px] text-slate-300 italic mt-4">
          La clave se valida contra el servidor antes de mostrar el panel.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-sm w-fit mx-auto flex-wrap justify-center">
        {TABS.map((t) => (
          <BotonPestaña key={t.id} activo={pestaña === t.id} onClick={() => setPestaña(t.id)} texto={t.texto} />
        ))}
      </div>

      {pestaña === 'reportes' && <PanelReportes claveAdmin={clave} secciones={secciones} />}
      {pestaña === 'alumnos' && <PanelAlumnos claveAdmin={clave} secciones={secciones} />}
      {pestaña === 'claves' && <PanelClaves claveAdmin={clave} secciones={secciones} />}
      {pestaña === 'secciones' && <PanelSecciones claveAdmin={clave} />}
      {pestaña === 'asistencia' && <PanelCorreccion claveAdmin={clave} secciones={secciones} />}
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

function PanelReportes({ claveAdmin, secciones }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [grado, setGrado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [reporte, setReporte] = useState(null);
  const [congelando, setCongelando] = useState(false);
  const [mensajeCongelar, setMensajeCongelar] = useState('');
  const [enviandoCorreos, setEnviandoCorreos] = useState(false);
  const [mensajeCorreos, setMensajeCorreos] = useState('');

  const fechaTexto = formatearFechaDDMMAAAA(fecha);

  async function consultar() {
    if (!grado) { setError('Selecciona un grado.'); return; }
    setCargando(true);
    setError('');
    setReporte(null);
    setMensajeCongelar('');
    setMensajeCorreos('');

    const [dataAlumnos, dataAsistencia] = await Promise.all([
      leerRuta(`estudiantes/${grado}`),
      leerRuta(`asistencia/${fecha}/${grado}`),
    ]);

    const alumnos = Object.values(dataAlumnos || {}).sort((a, b) => a.apellidos.localeCompare(b.apellidos));
    const asistencia = dataAsistencia || {};

    let presentes = 0, femenino = 0, masculino = 0, faltas = 0, permisos = 0;
    const listaFaltas = [], listaPermisos = [];

    alumnos.forEach((al) => {
      const r = asistencia[al.nie];
      if (r?.estado === 'P') { presentes++; al.sexo === 'F' ? femenino++ : masculino++; }
      else if (r?.estado === 'A') { faltas++; listaFaltas.push(al); }
      else if (r?.estado === 'M') { permisos++; listaPermisos.push({ ...al, motivo: r.motivo }); }
    });

    setReporte({ alumnos, asistencia, presentes, femenino, masculino, faltas, permisos, listaFaltas, listaPermisos });
    setCargando(false);
  }

  function descargarCsv() {
    if (!reporte) return;
    let csv = '\uFEFFNIE;Apellidos;Nombres;Estado;Hora;Motivo\n';
    reporte.alumnos.forEach((al) => {
      const r = reporte.asistencia[al.nie];
      let estadoLargo = 'SIN REGISTRO';
      if (r?.estado === 'P') estadoLargo = 'PRESENTE';
      if (r?.estado === 'A') estadoLargo = 'FALTA';
      if (r?.estado === 'M') estadoLargo = 'PERMISO';
      csv += `${al.nie};${al.apellidos};${al.nombres};${estadoLargo};${r?.hora || '-'};${r?.motivo || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${grado}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function textoWhatsapp() {
    if (!reporte) return '';
    let texto = `*ASISTENCIA - INSAL*\n*Grado:* ${grado}\n*Fecha:* ${fechaTexto}\n\n`;
    texto += `- Presentes: ${reporte.presentes} (F:${reporte.femenino}/M:${reporte.masculino})\n`;
    texto += `- Faltas: ${reporte.faltas}\n`;
    texto += `- Permisos: ${reporte.permisos}\n`;
    if (reporte.listaFaltas.length) {
      texto += `\n*AUSENTES:*\n` + reporte.listaFaltas.map((a) => `- ${a.apellidos} ${a.nombres}`).join('\n');
    }
    if (reporte.listaPermisos.length) {
      texto += `\n\n*PERMISOS:*\n` + reporte.listaPermisos.map((a) => `- ${a.apellidos} ${a.nombres} (${a.motivo || 'N/A'})`).join('\n');
    }
    return texto;
  }

  function compartirWhatsapp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsapp())}`, '_blank');
  }

  async function congelar() {
    setCongelando(true);
    setMensajeCongelar('');
    const resultado = await llamarApi('congelarReporte', { grado, claveAdmin, fecha });
    setCongelando(false);
    setMensajeCongelar(resultado.ok ? (resultado.mensaje || 'Reporte congelado.') : (resultado.error || 'Error al congelar.'));
  }

  async function enviarCorreos() {
    setEnviandoCorreos(true);
    setMensajeCorreos('');
    const resultado = await llamarApi('enviarCorreoEncargados', { grado, fecha, claveAdmin });
    setEnviandoCorreos(false);
    setMensajeCorreos(resultado.ok ? resultado.mensaje : resultado.error);
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm flex flex-wrap gap-4 items-end">
        <Campo texto="Fecha" tipo="date" value={fecha} onChange={setFecha} />
        <CampoSelect texto="Grado" value={grado} onChange={setGrado} opciones={secciones} />
        <button onClick={consultar} disabled={cargando}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition">
          Consultar
        </button>
      </div>

      {cargando && <Spinner texto="Consultando reporte..." />}
      <AlertaError mensaje={error} />

      {reporte && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-500 p-6 rounded-[2rem] text-white font-black italic uppercase text-center">
              Presentes: {reporte.presentes}
              <p className="text-[9px] font-bold mt-1">F: {reporte.femenino} · M: {reporte.masculino}</p>
            </div>
            <div className="bg-rose-500 p-6 rounded-[2rem] text-white font-black italic uppercase text-center flex items-center justify-center">
              Faltas: {reporte.faltas}
            </div>
            <div className="bg-amber-500 p-6 rounded-[2rem] text-white font-black italic uppercase text-center flex items-center justify-center">
              Permisos: {reporte.permisos}
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 font-bold italic">{grado} · {fechaTexto}</p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={descargarCsv} className="bg-slate-800 text-slate-100 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 transition">
              Descargar Excel (CSV)
            </button>
            <button onClick={compartirWhatsapp} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition">
              Compartir por WhatsApp
            </button>
            <button onClick={enviarCorreos} disabled={enviandoCorreos} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition">
              {enviandoCorreos ? 'Enviando...' : 'Enviar Asistencia a Encargados'}
            </button>
            <button onClick={congelar} disabled={congelando} className="bg-rose-500/20 text-rose-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/30 disabled:opacity-50 transition">
              {congelando ? 'Guardando...' : 'Guardar/Cerrar Asistencia de esta Fecha'}
            </button>
          </div>
          {mensajeCongelar && <p className="text-[10px] italic font-bold text-slate-500 text-center">{mensajeCongelar}</p>}
          {mensajeCorreos && <p className="text-[10px] italic font-bold text-slate-500 text-center">{mensajeCorreos}</p>}
        </>
      )}
    </div>
  );
}

function PanelAlumnos({ claveAdmin, secciones }) {
  const [grado, setGrado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [campos, setCampos] = useState(null);
  const [estado, setEstado] = useState('idle');
  const [mensajeError, setMensajeError] = useState('');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);

  function cargarGrado(g) {
    setGrado(g);
    setSeleccionado(null);
    if (!g) { setAlumnos([]); return; }
    escucharRuta(`estudiantes/${g}`, (data) => {
      setAlumnos(Object.values(data || {}).sort((a, b) => a.apellidos.localeCompare(b.apellidos)));
    });
  }

  const filtrados = alumnos.filter((al) =>
    !busqueda || al.nie.includes(busqueda) || al.apellidos.toLowerCase().includes(busqueda.toLowerCase())
  );

  function seleccionar(al) {
    setSeleccionado(al);
    setCampos({ ...al });
    setEstado('idle');
    setConfirmarBorrado(false);
  }

  async function guardarCambios() {
    setEstado('cargando');
    setMensajeError('');
    const resultado = await llamarApi('editarEstudiante', {
      nieOriginal: seleccionado.nie,
      gradoOriginal: seleccionado.grado,
      claveAdmin,
      data: campos,
    });
    if (resultado.ok) {
      setEstado('exito');
      setSeleccionado(resultado.data);
      setCampos(resultado.data);
    } else {
      setEstado('error');
      setMensajeError(resultado.error);
    }
  }

  async function eliminar() {
    setBorrando(true);
    setMensajeError('');
    const resultado = await llamarApi('eliminarEstudiante', {
      nie: seleccionado.nie,
      grado: seleccionado.grado,
      claveAdmin,
    });
    setBorrando(false);
    if (resultado.ok) {
      setSeleccionado(null);
      setCampos(null);
      setConfirmarBorrado(false);
    } else {
      setMensajeError(resultado.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm flex flex-wrap gap-4 items-end">
        <CampoSelect texto="Grado" value={grado} onChange={cargarGrado} opciones={secciones} />
        <div className="flex-1 min-w-[200px]">
          <Etiqueta texto="Buscar por NIE o apellido" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtrados.map((al) => (
          <button key={al.nie} onClick={() => seleccionar(al)}
            className={`text-left p-4 rounded-2xl border shadow-sm transition ${seleccionado?.nie === al.nie ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-800 bg-slate-900 hover:bg-slate-800'}`}>
            <p className="font-black text-xs uppercase italic text-slate-200">{al.apellidos}, {al.nombres}</p>
            <p className="text-[9px] text-slate-400 font-bold italic">NIE {al.nie} · {al.grado}</p>
          </button>
        ))}
        {grado && filtrados.length === 0 && (
          <p className="text-center text-slate-400 text-xs italic font-bold uppercase col-span-2 p-6">Sin alumnos que coincidan.</p>
        )}
      </div>

      {seleccionado && campos && (
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm max-w-md space-y-4">
          <h4 className="text-[10px] font-black uppercase text-indigo-400 italic tracking-widest text-center mb-2">
            Editar Alumno
          </h4>
          <input value={campos.apellidos} onChange={(e) => setCampos({ ...campos, apellidos: e.target.value })}
            className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Apellidos" />
          <input value={campos.nombres} onChange={(e) => setCampos({ ...campos, nombres: e.target.value })}
            className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nombres" />
          <input value={campos.emailEncargado} onChange={(e) => setCampos({ ...campos, emailEncargado: e.target.value })}
            className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Correo del encargado" />

          <div>
            <Etiqueta texto="Mover de sección (opcional)" />
            <select value={campos.grado} onChange={(e) => setCampos({ ...campos, grado: e.target.value })}
              className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500">
              {secciones.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>

          {estado === 'cargando' && <Spinner texto="Guardando cambios..." />}
          {estado === 'exito' && <TarjetaExito titulo="Actualizado" mensaje="Los cambios se guardaron correctamente." />}
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
                  ¿Seguro que deseas eliminar a {seleccionado.apellidos}, {seleccionado.nombres}? Esta acción no se puede deshacer.
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
      )}
    </div>
  );
}

function PanelClaves({ claveAdmin, secciones }) {
  const [grado, setGrado] = useState('');
  const [claveActual, setClaveActual] = useState(null);
  const [verClaveActual, setVerClaveActual] = useState(false);
  const [claveNueva, setClaveNueva] = useState('');
  const [errorClave, setErrorClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState('idle');
  const [mensaje, setMensaje] = useState('');

  function seleccionarGrado(g) {
    setGrado(g);
    setClaveActual(null);
    setVerClaveActual(false);
    setEstado('idle');
    if (!g) return;
    escucharRuta(`claves/${g}`, (valor) => setClaveActual(valor || ''));
  }

  async function asignar(e) {
    e.preventDefault();
    if (!grado) { setErrorClave('Selecciona un grado.'); return; }
    if (claveNueva.trim().length < 4) { setErrorClave('La clave debe tener al menos 4 caracteres.'); return; }
    setErrorClave('');

    setCargando(true);
    setEstado('idle');
    const resultado = await llamarApi('asignarClaveAsistente', { grado, claveNueva, claveAdmin });
    setCargando(false);

    if (resultado.ok) {
      setEstado('exito');
      setMensaje(resultado.mensaje);
      setClaveNueva('');
    } else {
      setEstado('error');
      setMensaje(resultado.error);
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm">
      <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-8">
        Clave del Asistente
      </h3>

      <div className="mb-6">
        <CampoSelect texto="Grado" value={grado} onChange={seleccionarGrado} opciones={secciones} />
      </div>

      {grado && (
        <div className="mb-6">
          <Etiqueta texto="Clave actual guardada" />
          {claveActual === null ? (
            <Spinner texto="Consultando..." />
          ) : claveActual === '' ? (
            <p className="text-[10px] font-bold italic text-amber-400 bg-amber-500/10 rounded-xl p-3">
              {grado} todavía no tiene clave asignada. El asistente no podrá ingresar hasta que le asignes una abajo.
            </p>
          ) : (
            <div className="flex items-center justify-between bg-slate-800 rounded-xl p-4">
              <span className="font-black italic tracking-widest text-slate-100">
                {verClaveActual ? claveActual : '•'.repeat(Math.max(claveActual.length, 4))}
              </span>
              <button
                type="button"
                onClick={() => setVerClaveActual((v) => !v)}
                className="text-slate-400 hover:text-slate-200 transition"
                aria-label={verClaveActual ? 'Ocultar clave' : 'Mostrar clave'}
              >
                <i className={`fas ${verClaveActual ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={asignar} className="space-y-5">
        <div>
          <Etiqueta texto={claveActual ? 'Cambiar por una nueva contraseña' : 'Nueva contraseña seccional'} />
          <CampoClave value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} />
          <CampoError mensaje={errorClave} />
        </div>

        {cargando && <Spinner texto="Guardando clave..." />}
        {estado === 'exito' && <TarjetaExito titulo="Clave actualizada" mensaje={mensaje} />}
        {estado === 'error' && <AlertaError mensaje={mensaje} />}

        <button type="submit" disabled={cargando}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition">
          Asignar Clave
        </button>
      </form>
    </div>
  );
}

function PanelCorreccion({ claveAdmin, secciones }) {
  const [grado, setGrado] = useState('');
  const [nombreValidador, setNombreValidador] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [motivoModal, setMotivoModal] = useState(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [error, setError] = useState('');
  const [reabriendo, setReabriendo] = useState(false);
  const [mensajeReabrir, setMensajeReabrir] = useState('');
  const fecha = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!grado) { setAlumnos([]); setAsistencia({}); return; }
    const cancelar1 = escucharRuta(`estudiantes/${grado}`, (data) => {
      setAlumnos(Object.values(data || {}).sort((a, b) => a.apellidos.localeCompare(b.apellidos)));
    });
    const cancelar2 = escucharRuta(`asistencia/${fecha}/${grado}`, (data) => setAsistencia(data || {}));
    return () => { cancelar1(); cancelar2(); };
  }, [grado, fecha]);

  const pendientes = alumnos
    .filter((al) => !['P', 'A', 'M'].includes(asistencia[al.nie]?.estado))
    .map((al) => `${al.apellidos}, ${al.nombres}`);

  async function marcar(nie, estado, motivo) {
    if (!nombreValidador.trim()) { setError('Escribe tu nombre antes de corregir un estado.'); return; }
    setError('');
    const anterior = asistencia[nie];

    setAsistencia((prev) => ({
      ...prev,
      [nie]: { estado, motivo, origen: 'manual', validadoPor: nombreValidador.trim(), hora: new Date().toISOString() },
    }));

    const resultado = await llamarApi('auditarManual', { nie, grado, estado, motivo, claveAdmin, validadoPor: nombreValidador.trim() });
    if (!resultado.ok) {
      setError(resultado.error);
      setAsistencia((prev) => ({ ...prev, [nie]: anterior }));
    }
  }

  async function reabrir() {
    setReabriendo(true);
    setMensajeReabrir('');
    const resultado = await llamarApi('reabrirAsistencia', { grado, fecha, claveAdmin });
    setReabriendo(false);
    setMensajeReabrir(resultado.ok ? resultado.mensaje : resultado.error);
  }

  function abrirMotivo(nie) {
    if (!nombreValidador.trim()) { setError('Escribe tu nombre antes de corregir un estado.'); return; }
    setMotivoModal(nie); setMotivoTexto('');
  }
  async function confirmarMotivo() {
    if (!motivoTexto.trim()) return;
    await marcar(motivoModal, 'M', motivoTexto.trim());
    setMotivoModal(null);
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm flex flex-wrap gap-6 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
        <CampoSelect texto="Grado" value={grado} onChange={setGrado} opciones={secciones} />
          <div>
            <Etiqueta texto="Tu nombre (quien corrige hoy)" />
            <input
              value={nombreValidador}
              onChange={(e) => setNombreValidador(e.target.value)}
              placeholder="Ej. Prof. Echeverría"
              className="p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-[9px] text-slate-400 font-bold italic">Pasando lista de hoy ({formatearFechaDDMMAAAA(fecha)}) — marca o corrige a quien llegó tarde</p>
        </div>
        {grado && (
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <GeneradorOtp grado={grado} auth={{ claveAdmin, generadoPor: nombreValidador || 'Administrador' }} />
            <BotonGuardarAsistencia grado={grado} auth={{ claveAdmin, cerradoPor: nombreValidador || 'Administrador' }} pendientes={pendientes} />
            <div className="text-center">
              <button
                onClick={reabrir}
                disabled={reabriendo}
                className="text-[9px] font-black uppercase text-amber-400 tracking-widest hover:text-amber-300 transition disabled:opacity-50 underline decoration-dotted"
              >
                {reabriendo ? 'Reabriendo...' : '¿Se cerró por error? Reabrir asistencia de hoy'}
              </button>
              {mensajeReabrir && <p className="text-[9px] font-bold italic text-slate-400 mt-1 max-w-[200px]">{mensajeReabrir}</p>}
            </div>
          </div>
        )}
      </div>

      <AlertaError mensaje={error} />

      {grado && (
        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm overflow-hidden">
          {alumnos.length === 0 ? (
            <p className="p-10 text-center text-slate-400 text-xs italic font-bold uppercase">No hay alumnos en este grado.</p>
          ) : (
            <table className="w-full text-left">
              <tbody>
                {alumnos.map((al) => {
                  const r = asistencia[al.nie];
                  return (
                    <tr key={al.nie} className="border-b border-slate-800 italic font-bold">
                      <td className="p-4 text-xs text-slate-200 uppercase">
                        {al.apellidos}, {al.nombres}
                        {r?.motivo && <span className="block text-[8px] text-amber-400 font-medium normal-case">Motivo: {r.motivo}</span>}
                        {r?.origen === 'manual' && r?.validadoPor && (
                          <span className="block text-[8px] text-slate-500 font-medium normal-case">Validado por: {r.validadoPor}</span>
                        )}
                      </td>
                      <td className="p-4 flex gap-2 justify-end">
                        <button onClick={() => marcar(al.nie, 'P')}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition ${r?.estado === 'P' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400'}`}>P</button>
                        <button onClick={() => marcar(al.nie, 'A')}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition ${r?.estado === 'A' ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400'}`}>A</button>
                        <button onClick={() => abrirMotivo(al.nie)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition ${r?.estado === 'M' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-400'}`}>M</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {motivoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full">
            <h3 className="font-black text-amber-400 uppercase text-xs mb-6 text-center italic tracking-widest">Motivo del Permiso</h3>
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              placeholder="Ej. Cita médica"
              className="w-full p-4 bg-slate-800 rounded-xl font-bold italic uppercase outline-none focus:ring-2 focus:ring-amber-400 text-slate-100 mb-6"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={() => setMotivoModal(null)} className="flex-1 p-3 text-xs font-bold text-slate-400 uppercase">Cancelar</button>
              <button onClick={confirmarMotivo} disabled={!motivoTexto.trim()}
                className="flex-1 p-3 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg uppercase disabled:opacity-50">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelSecciones({ claveAdmin }) {
  const [secciones, setSecciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [nuevaId, setNuevaId] = useState('');
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('idle');
  const [mensaje, setMensaje] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  useEffect(() => {
    const cancelar = escucharRuta('config/secciones', (data) => {
      setSecciones(data || {});
      setCargando(false);
    });
    return cancelar;
  }, []);

  async function crear() {
    const idLimpio = nuevaId.trim().toUpperCase();
    const labelLimpio = nuevoLabel.trim().toUpperCase();
    if (!idLimpio) { setError('El ID es requerido.'); return; }
    if (!labelLimpio) { setError('El nombre es requerido.'); return; }
    if (idLimpio.length > 10) { setError('El ID no debe tener más de 10 caracteres.'); return; }
    if (!/^[A-Za-z0-9]+$/.test(idLimpio)) { setError('El ID solo puede contener letras y números.'); return; }
    if (secciones[idLimpio]) { setError('Ya existe una sección con ese ID.'); return; }

    setError('');
    setEstado('cargando');
    const resultado = await llamarApi('crearSeccion', { id: idLimpio, label: labelLimpio, claveAdmin });
    setEstado('idle');
    if (resultado.ok) {
      setMensaje(resultado.mensaje);
      setNuevaId('');
      setNuevoLabel('');
    } else {
      setError(resultado.error);
    }
  }

  async function eliminar(id) {
    setEstado('cargando');
    const resultado = await llamarApi('eliminarSeccion', { id, claveAdmin });
    setEstado('idle');
    setConfirmarEliminar(null);
    if (resultado.ok) {
      setMensaje(resultado.mensaje);
    } else {
      setError(resultado.error);
    }
  }

  const lista = Object.entries(secciones).map(([id, label]) => ({ id, label }));

  return (
    <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm space-y-6">
      <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest">
        Gestionar Secciones
      </h3>

      <div>
        <Etiqueta texto="Secciones actuales" />
        {cargando ? (
          <Spinner texto="Cargando..." />
        ) : lista.length === 0 ? (
          <p className="text-[10px] font-bold italic text-amber-400 bg-amber-500/10 rounded-xl p-3">
            No hay secciones. Crea la primera arriba.
          </p>
        ) : (
          <div className="space-y-2">
            {lista.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
                <div>
                  <span className="font-black italic text-sm text-slate-100">{s.id}</span>
                  <span className="text-[9px] text-slate-400 font-bold italic ml-2">{s.label}</span>
                </div>
                {confirmarEliminar === s.id ? (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmarEliminar(null)} className="text-[9px] font-bold text-slate-400 uppercase">No</button>
                    <button onClick={() => eliminar(s.id)} disabled={estado === 'cargando'}
                      className="text-[9px] font-bold text-rose-400 uppercase disabled:opacity-50">
                      {estado === 'cargando' ? '...' : 'Sí, eliminar'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmarEliminar(s.id)}
                    className="text-[9px] font-black uppercase text-rose-400 tracking-widest hover:text-rose-300 transition">
                    <i className="fas fa-trash" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4">
        <Etiqueta texto="Crear nueva sección" />
        <input value={nuevaId} onChange={(e) => setNuevaId(e.target.value)}
          placeholder="ID (ej. 4GB)" maxLength={10}
          className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500 mb-2" />
        <input value={nuevoLabel} onChange={(e) => setNuevoLabel(e.target.value)}
          placeholder="Nombre (ej. 4 GENERAL B)"
          className="w-full p-3 bg-slate-800 rounded-xl border-none font-bold italic uppercase outline-none focus:ring-2 focus:ring-indigo-500 mb-2" />
        <button onClick={crear} disabled={estado === 'cargando'}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition">
          {estado === 'cargando' ? 'Creando...' : 'Crear Sección'}
        </button>
      </div>

      {error && <AlertaError mensaje={error} />}
      {mensaje && <p className="text-[10px] italic font-bold text-emerald-400 text-center">{mensaje}</p>}
    </div>
  );
}

function Etiqueta({ texto }) {
  return <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1 ml-1">{texto}</label>;
}

function Campo({ texto, value, onChange, tipo = 'text' }) {
  return (
    <div>
      <Etiqueta texto={texto} />
      <input type={tipo} value={value} onChange={(e) => onChange(e.target.value)}
        className="p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  );
}

function CampoSelect({ texto, value, onChange, opciones }) {
  return (
    <div>
      <Etiqueta texto={texto} />
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="p-3 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="">Seleccione...</option>
        {opciones.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}
