import React, { useState, useEffect, useCallback } from 'react';
import { llamarApi } from '../api';
import { escucharRuta } from '../firebase';
import { validarSeleccion } from '../utils/validators';
import { Spinner, AlertaError, CampoError } from '../components/EstadoPeticion';
import CampoClave from '../components/CampoClave';
import GeneradorOtp from '../components/GeneradorOtp';
import BotonGuardarAsistencia from '../components/BotonGuardarAsistencia';
import { useSecciones } from '../hooks/useSecciones';

function hoyISO() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export default function ViewAsistente() {
  const [sesion, setSesion] = useState(null);
  const { secciones } = useSecciones();

  if (!sesion) return <AccesoSeccional onIngresar={setSesion} secciones={secciones} />;
  return <PanelVivo grado={sesion.grado} clave={sesion.clave} nombre={sesion.nombre} onSalir={() => setSesion(null)} />;
}

function AccesoSeccional({ onIngresar, secciones }) {
  const [grado, setGrado] = useState('');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [errorGrado, setErrorGrado] = useState('');
  const [errorNombre, setErrorNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorPeticion, setErrorPeticion] = useState('');

  async function manejarSubmit(e) {
    e.preventDefault();
    const errG = validarSeleccion(grado, 'un grado');
    setErrorGrado(errG);
    const errN = nombre.trim() ? '' : 'Escribe tu nombre — como sea que dos alumnos comparten la clave, así sabemos quién validó los datos hoy.';
    setErrorNombre(errN);
    if (errG || errN || !clave) {
      if (!clave) setErrorPeticion('La contraseña seccional es requerida.');
      return;
    }

    setCargando(true);
    setErrorPeticion('');
    const resultado = await llamarApi('loginAsistente', { grado, clave });
    setCargando(false);

    if (resultado.ok) {
      onIngresar({ grado, clave, nombre: nombre.trim() });
    } else {
      setErrorPeticion(resultado.error || 'No se pudo validar el acceso.');
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm">
      <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-8">
        Acceso de Asistente
      </h3>
      <form onSubmit={manejarSubmit} className="space-y-5">
        <div>
          <Etiqueta texto="Grado" />
          <select
            value={grado}
            onChange={(e) => { setGrado(e.target.value); setErrorGrado(validarSeleccion(e.target.value, 'un grado')); }}
            className={campoClase(errorGrado)}
          >
            <option value="">Seleccione...</option>
            {secciones.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <CampoError mensaje={errorGrado} />
        </div>
        <div>
          <Etiqueta texto="Tu nombre (quien va a validar hoy)" />
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); if (errorNombre) setErrorNombre(''); }}
            placeholder="Ej. Ana Martínez"
            className={campoClase(errorNombre) + ' uppercase'}
          />
          <CampoError mensaje={errorNombre} />
        </div>
        <div>
          <Etiqueta texto="Contraseña seccional" />
          <CampoClave value={clave} onChange={(e) => setClave(e.target.value)} />
        </div>

        {cargando && <Spinner texto="Validando acceso..." />}
        <AlertaError mensaje={errorPeticion} />

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black disabled:opacity-50 transition"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}

function PanelVivo({ grado, clave, nombre, onSalir }) {
  const [alumnos, setAlumnos] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [motivoModal, setMotivoModal] = useState(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [errorAuditoria, setErrorAuditoria] = useState('');

  const fecha = hoyISO();

  useEffect(() => {
    const cancelar = escucharRuta(`asistencia/${fecha}/${grado}`, (data) => setAsistencia(data || {}));
    return cancelar;
  }, [fecha, grado]);

  useEffect(() => {
    const cancelar = escucharRuta(`estudiantes/${grado}`, (data) => {
      const lista = Object.values(data || {}).sort((a, b) => a.apellidos.localeCompare(b.apellidos));
      setAlumnos(lista);
    });
    return cancelar;
  }, [grado]);

  const pendientes = alumnos
    .filter((al) => !['P', 'A', 'M'].includes(asistencia[al.nie]?.estado))
    .map((al) => `${al.apellidos}, ${al.nombres}`);

  const marcar = useCallback(async (nie, estado, motivo) => {
    setErrorAuditoria('');
    const anterior = asistencia[nie];

    setAsistencia((prev) => ({
      ...prev,
      [nie]: { estado, motivo, origen: 'manual', validadoPor: nombre, hora: new Date().toISOString() },
    }));

    const resultado = await llamarApi('auditarManual', { nie, grado, estado, motivo, clave, validadoPor: nombre });
    if (!resultado.ok) {
      setErrorAuditoria(resultado.error || 'No se pudo actualizar el estado.');
      setAsistencia((prev) => ({ ...prev, [nie]: anterior }));
    }
  }, [grado, clave, nombre, asistencia]);

  function abrirMotivo(nie) {
    setMotivoModal(nie);
    setMotivoTexto('');
  }

  async function confirmarMotivo() {
    if (!motivoTexto.trim()) return;
    await marcar(motivoModal, 'M', motivoTexto.trim());
    setMotivoModal(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
        <div>
          <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">Sección</p>
          <p className="text-lg font-black italic text-slate-100">{grado}</p>
          <p className="text-[9px] font-bold italic text-emerald-400">Validando: {nombre}</p>
        </div>
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <GeneradorOtp grado={grado} auth={{ clave, generadoPor: nombre }} />
          <BotonGuardarAsistencia grado={grado} auth={{ clave, cerradoPor: nombre }} pendientes={pendientes} />
        </div>
        <button onClick={onSalir} className="text-[9px] font-black uppercase text-rose-400 tracking-widest">Salir</button>
      </div>

      <AlertaError mensaje={errorAuditoria} />

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
                        className={`status-chip px-3 py-2 rounded-xl text-[10px] font-black transition ${r?.estado === 'P' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        P
                      </button>
                      <button onClick={() => marcar(al.nie, 'A')}
                        className={`status-chip px-3 py-2 rounded-xl text-[10px] font-black transition ${r?.estado === 'A' ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400'}`}>
                        A
                      </button>
                      <button onClick={() => abrirMotivo(al.nie)}
                        className={`status-chip px-3 py-2 rounded-xl text-[10px] font-black transition ${r?.estado === 'M' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-400'}`}>
                        M
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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

function campoClase(tieneError) {
  return `w-full p-4 bg-slate-800 rounded-xl border font-bold italic text-sm outline-none transition focus:ring-2 ${
    tieneError ? 'border-rose-300 focus:ring-rose-400' : 'border-transparent focus:ring-indigo-500'
  }`;
}

function Etiqueta({ texto }) {
  return <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1 ml-1">{texto}</label>;
}
