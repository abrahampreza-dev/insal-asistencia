
// Formulario controlado de registro de alumnos. Valida en tiempo real cada
// campo mientras el usuario escribe, comprime la foto vía Canvas antes de
// enviarla, y maneja estados de carga/éxito/error en la petición a la API.

import React, { useState, useRef } from 'react';
import { llamarApi } from '../api';
import { comprimirFoto } from '../utils/comprimirFoto';
import { validarNie, validarTexto, validarEmail, validarFecha, validarSeleccion } from '../utils/validators';
import { Spinner, TarjetaExito, AlertaError, CampoError } from '../components/EstadoPeticion';
import ModalCamara from '../components/ModalCamara';
import logo from '../assets/logo.png';

const GRADOS = ['1° GENERAL "B" ', '2° GENERAL "C" ', '2° GENERAL "D" ', '1° DISEÑO GRÁFICO "A" ', '3° LOGISTICA Y ADUANAS "A" '];

const CAMPOS_INICIALES = {
  nie: '', apellidos: '', nombres: '', grado: '', sexo: '',
  fechaNacimiento: '', emailEncargado: '',
};

/**
 * @param {string} [nieInicial] - precarga el NIE (p.ej. viniendo del flujo de marcación)
 * @param {string} [gradoInicial] - precarga el grado
 * @param {(alumno: object) => void} [onExito] - si se pasa, se llama en vez de
 *   mostrar la pantalla de "registrar otro"; útil para regresar al flujo que
 *   trajo al alumno hasta aquí (p.ej. continuar a marcar asistencia).
 */
export default function ViewRegistroAlumno({ nieInicial = '', gradoInicial = '', onExito = null }) {
  const [campos, setCampos] = useState({ ...CAMPOS_INICIALES, nie: nieInicial, grado: gradoInicial });
  const [errores, setErrores] = useState({});
  const [tocado, setTocado] = useState({});
  const [foto, setFoto] = useState(null);
  const [errorFoto, setErrorFoto] = useState('');
  const [estado, setEstado] = useState('idle'); // idle | cargando | exito | error
  const [mensajeError, setMensajeError] = useState('');
  const [alumnoRegistrado, setAlumnoRegistrado] = useState(null);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const inputGaleriaRef = useRef(null);

  const VALIDADORES = {
    nie: validarNie,
    apellidos: (v) => validarTexto(v, 'Los apellidos'),
    nombres: (v) => validarTexto(v, 'Los nombres'),
    grado: (v) => validarSeleccion(v, 'un grado'),
    sexo: (v) => validarSeleccion(v, 'el sexo'),
    fechaNacimiento: validarFecha,
    emailEncargado: validarEmail,
  };

  function actualizarCampo(nombre, valor) {
    setCampos((prev) => ({ ...prev, [nombre]: valor }));
    setTocado((prev) => ({ ...prev, [nombre]: true }));
    setErrores((prev) => ({ ...prev, [nombre]: VALIDADORES[nombre](valor) }));
  }

  async function manejarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setErrorFoto('');
    try {
      const dataUrl = await comprimirFoto(archivo);
      setFoto(dataUrl);
    } catch (err) {
      setErrorFoto(err.message);
      setFoto(null);
    }
  }

  function manejarCaptura(dataUrl) {
    setErrorFoto('');
    setFoto(dataUrl);
    setMostrarCamara(false);
  }

  function formularioValido() {
    const nuevosErrores = {};
    let valido = true;
    for (const campo in VALIDADORES) {
      const err = VALIDADORES[campo](campos[campo]);
      nuevosErrores[campo] = err;
      if (err) valido = false;
    }
    setErrores(nuevosErrores);
    setTocado(Object.fromEntries(Object.keys(VALIDADORES).map((k) => [k, true])));
    return valido && !!foto;
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    if (!formularioValido()) {
      if (!foto) setErrorFoto('Debes tomar o cargar una foto del alumno.');
      return;
    }

    setEstado('cargando');
    setMensajeError('');
    const resultado = await llamarApi('registrarEstudiante', {
      data: { ...campos, fotoUrl: foto },
    });

    if (resultado.ok) {
      setEstado('exito');
      setAlumnoRegistrado(resultado.data);
    } else {
      setEstado('error');
      setMensajeError(resultado.error || 'No se pudo registrar al alumno.');
    }
  }

  function registrarOtro() {
    setCampos(CAMPOS_INICIALES);
    setErrores({});
    setTocado({});
    setFoto(null);
    setErrorFoto('');
    setEstado('idle');
    setMensajeError('');
  }

  if (estado === 'exito') {
    return (
      <div className="max-w-lg mx-auto">
        <TarjetaExito titulo="Alumno registrado" mensaje={`${campos.nombres} ${campos.apellidos} fue guardado en ${campos.grado}.`}>
          {onExito && (
            <button
              onClick={() => onExito(alumnoRegistrado)}
              className="mt-4 w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition"
            >
              Continuar a marcar asistencia
            </button>
          )}
          <button
            onClick={registrarOtro}
            className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition"
          >
            Registrar otro alumno
          </button>
        </TarjetaExito>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm">
      <img src={logo} alt="INSAL" className="w-16 h-16 object-contain mx-auto mb-4" />
      <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-8">
        Registro de Alumno
      </h3>

      <form onSubmit={manejarSubmit} className="space-y-5" noValidate>
        <div className="flex flex-col items-center mb-2">
          <div className="w-28 h-28 rounded-3xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden mb-3">
            {foto ? (
              <img src={foto} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] uppercase font-black text-slate-400 text-center px-2 italic">
                Foto del alumno
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMostrarCamara(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
            >
              <i className="fas fa-camera" /> Tomar foto
            </button>
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              className="flex items-center gap-2 bg-slate-800 text-slate-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 transition"
            >
              <i className="fas fa-image" /> Subir foto
            </button>
          </div>

          {/* Galería / archivos, sin forzar la cámara */}
          <input ref={inputGaleriaRef} type="file" accept="image/*" onChange={manejarFoto} className="hidden" />

          <CampoError mensaje={errorFoto} />
        </div>

        {mostrarCamara && (
          <ModalCamara onCerrar={() => setMostrarCamara(false)} onCapturar={manejarCaptura} />
        )}
        <Campo label="NIE" value={campos.nie} onChange={(v) => actualizarCampo('nie', v)}
          error={tocado.nie && errores.nie} placeholder="Ej. 20231045" inputMode="numeric" maxLength={9} />

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Apellidos" value={campos.apellidos} onChange={(v) => actualizarCampo('apellidos', v)}
            error={tocado.apellidos && errores.apellidos} mayusculas />
          <Campo label="Nombres" value={campos.nombres} onChange={(v) => actualizarCampo('nombres', v)}
            error={tocado.nombres && errores.nombres} mayusculas />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Etiqueta texto="Grado" />
            <select
              value={campos.grado}
              onChange={(e) => actualizarCampo('grado', e.target.value)}
              className={campoClase(tocado.grado && errores.grado)}
            >
              <option value="">Seleccione...</option>
              {GRADOS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <CampoError mensaje={tocado.grado && errores.grado} />
          </div>
          <div>
            <Etiqueta texto="Sexo" />
            <select
              value={campos.sexo}
              onChange={(e) => actualizarCampo('sexo', e.target.value)}
              className={campoClase(tocado.sexo && errores.sexo)}
            >
              <option value="">Seleccione...</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
            <CampoError mensaje={tocado.sexo && errores.sexo} />
          </div>
        </div>

        <Campo label="Fecha de nacimiento" type="date" value={campos.fechaNacimiento}
          onChange={(v) => actualizarCampo('fechaNacimiento', v)} error={tocado.fechaNacimiento && errores.fechaNacimiento} />

        <Campo label="Correo del encargado" type="email" value={campos.emailEncargado}
          onChange={(v) => actualizarCampo('emailEncargado', v)} error={tocado.emailEncargado && errores.emailEncargado}
          placeholder="encargado@correo.com" />

        {estado === 'cargando' && <Spinner texto="Guardando alumno..." />}
        <AlertaError mensaje={mensajeError} />

        <button
          type="submit"
          disabled={estado === 'cargando'}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          Registrar Alumno
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes de campo reutilizables
// ---------------------------------------------------------------------------
function campoClase(tieneError) {
  return `w-full p-4 bg-slate-800 rounded-xl border font-bold italic text-sm outline-none transition focus:ring-2 ${
    tieneError ? 'border-rose-300 focus:ring-rose-400' : 'border-transparent focus:ring-indigo-500'
  }`;
}

function Etiqueta({ texto }) {
  return <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1 ml-1">{texto}</label>;
}

function Campo({ label, value, onChange, error, type = 'text', placeholder, inputMode, maxLength, mayusculas = false }) {
  return (
    <div>
      <Etiqueta texto={label} />
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={campoClase(error) + (mayusculas ? ' uppercase' : '')}
      />
      <CampoError mensaje={error} />
    </div>
  );
}
