// src/views/ViewAutoMarcacion.jsx
// ---------------------------------------------------------------------------
// Flujo de auto-marcación del estudiante en 3 pasos, con renderizado
// condicional estricto en cada transición:
//   1) Captura y valida el NIE. Si no existe, ofrece registrarse (Rúbrica).
//   2) Si el NIE es válido, muestra tarjeta con foto + nombre y habilita OTP.
//   3) Envía el OTP; en éxito desmonta la vista y muestra confirmación verde.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import { llamarApi } from '../api';
import { validarNie, validarSeleccion, validarOtp } from '../utils/validators';
import { Spinner, AlertaError, CampoError } from '../components/EstadoPeticion';

// Ajustamos los nombres exactos para que coincidan con tu catálogo de base de datos
const GRADOS = ['1° GENERAL "B" ', '2° GENERAL "C" ', '2° GENERAL "D" ', '1° DISEÑO GRÁFICO "A" ', '3° LOGISTICA Y ADUANAS "A" '];

export default function ViewAutoMarcacion({ onNavegar }) {
  const [paso, setPaso] = useState(1); // 1: NIE | 2: confirmación + OTP | 3: éxito
  const [grado, setGrado] = useState('');
  const [nie, setNie] = useState('');
  const [otp, setOtp] = useState('');
  const [errorGrado, setErrorGrado] = useState('');
  const [errorNie, setErrorNie] = useState('');
  const [errorOtp, setErrorOtp] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [cargandoNie, setCargandoNie] = useState(false);
  const [cargandoOtp, setCargandoOtp] = useState(false);
  const [errorPeticion, setErrorPeticion] = useState('');
  const [noInscrito, setNoInscrito] = useState(false); // Estado condicional de la tarea

  async function manejarBuscarNie(e) {
    e.preventDefault();
    const errG = validarSeleccion(grado, 'un grado');
    const errN = validarNie(nie);
    setErrorGrado(errG);
    setErrorNie(errN);
    if (errG || errN) return;

    setCargandoNie(true);
    setErrorPeticion('');
    setNoInscrito(false);

    // Corregimos el payload para que viaje plano y sea compatible con verificarNie(body) de tu Apps Script
    const resultado = await llamarApi('verificarNie', { nie, grado });
    setCargandoNie(false);

    if (resultado.ok) {
      setAlumno(resultado.data);
      setPaso(2);
    } else {
      setErrorPeticion(resultado.error || 'No se pudo verificar el NIE.');
      // Si el servidor avisa que no se encontró el alumno, activamos la bandera de contingencia
      if (resultado.error && resultado.error.includes('No se encontró')) {
        setNoInscrito(true);
      }
    }
  }

  async function manejarEnviarOtp(e) {
    e.preventDefault();
    const errO = validarOtp(otp);
    setErrorOtp(errO);
    if (errO) return;

    setCargandoOtp(true);
    setErrorPeticion('');

    // Corregimos para que viaje el payload plano tal y como lo extrae el backend en marcarAlumno
    const resultado = await llamarApi('marcarAlumno', { nie, grado, otp });
    setCargandoOtp(false);

    if (resultado.ok) {
      setPaso(3);
    } else {
      setErrorPeticion(resultado.error || 'No se pudo registrar la asistencia.');
    }
  }

  function reiniciar() {
    setPaso(1); setGrado(''); setNie(''); setOtp('');
    setErrorGrado(''); setErrorNie(''); setErrorOtp('');
    setAlumno(null); setErrorPeticion(''); setNoInscrito(false);
  }

  // -------------------- PASO 3: confirmación absoluta --------------------
  if (paso === 3) {
    return (
      <div className="max-w-sm mx-auto text-center bg-emerald-500 text-white p-12 rounded-[3rem] shadow-2xl animate-fadeIn">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">✓</div>
        <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">¡Estás en clase!</h2>
        <p className="text-sm font-bold italic opacity-90">
          {alumno?.nombres} {alumno?.apellidos}, tu asistencia quedó registrada.
        </p>
        <button
          onClick={reiniciar}
          className="mt-8 w-full bg-white text-emerald-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-50 transition"
        >
          Marcar a otro alumno
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
      <h3 className="text-center text-xs font-black uppercase text-indigo-600 italic tracking-widest mb-8">
        Auto-Marcación
      </h3>

      {/* -------------------- PASO 1: NIE -------------------- */}
      {paso === 1 && (
        <form onSubmit={manejarBuscarNie} className="space-y-5">
          <div>
            <Etiqueta texto="Grado" />
            <select
              value={grado}
              onChange={(e) => { setGrado(e.target.value); setErrorGrado(validarSeleccion(e.target.value, 'un grado')); }}
              className={campoClase(errorGrado)}
            >
              <option value="">Seleccione...</option>
              {GRADOS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <CampoError mensaje={errorGrado} />
          </div>

          <div>
            <Etiqueta texto="Tu NIE" />
            <input
              value={nie}
              inputMode="numeric"
              maxLength={9}
              placeholder="Ej. 20231045"
              onChange={(e) => { setNie(e.target.value); setErrorNie(validarNie(e.target.value)); }}
              className={campoClase(errorNie)}
            />
            <CampoError mensaje={errorNie} />
          </div>

          {cargandoNie && <Spinner texto="Buscando alumno..." />}
          
          {/* Renderizado Condicional de la Rúbrica: Si no está inscrito, se le muestra la opción de ir al registro */}
          {noInscrito ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
              <p className="text-[11px] text-rose-600 font-bold italic mb-3">Tu NIE no aparece registrado en esta sección.</p>
              <button
                type="button"
                onClick={() => onNavegar('registro')}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition"
              >
                Ir a Formulario de Registro
              </button>
            </div>
          ) : (
            <AlertaError mensaje={errorPeticion} />
          )}

          <button
            type="submit"
            disabled={cargandoNie}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black disabled:opacity-50 transition"
          >
            Continuar
          </button>
        </form>
      )}

      {/* -------------------- PASO 2: confirmación + OTP -------------------- */}
      {paso === 2 && alumno && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <img
              src={alumno.fotoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(alumno.nombres)}
              alt={alumno.nombres}
              className="w-16 h-16 rounded-2xl object-cover bg-white shadow-inner"
            />
            <div>
              <p className="font-black text-sm text-slate-800 italic uppercase leading-tight">{alumno.nombres} {alumno.apellidos}</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold italic mt-1">{alumno.grado} · NIE {alumno.nie}</p>
            </div>
          </div>

          <form onSubmit={manejarEnviarOtp} className="space-y-5">
            <div>
              <Etiqueta texto="Código del día (OTP)" />
              <input
                value={otp}
                inputMode="numeric"
                maxLength={5}
                placeholder="5 dígitos"
                onChange={(e) => { setOtp(e.target.value); setErrorOtp(validarOtp(e.target.value)); }}
                className={campoClase(errorOtp) + ' text-center tracking-[0.4em] text-lg font-black'}
              />
              <CampoError mensaje={errorOtp} />
            </div>

            {cargandoOtp && <Spinner texto="Registrando asistencia..." />}
            <AlertaError mensaje={errorPeticion} />

            <button
              type="submit"
              disabled={cargandoOtp}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              ¡Estoy en clase!
            </button>
            <button type="button" onClick={reiniciar} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-widest mt-2 hover:text-slate-600 transition">
              Cambiar NIE
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function campoClase(tieneError) {
  return `w-full p-4 bg-slate-50 rounded-xl border font-bold italic text-sm outline-none transition focus:ring-2 ${
    tieneError ? 'border-rose-300 focus:ring-rose-400' : 'border-transparent focus:ring-indigo-500'
  }`;
}

function Etiqueta({ texto }) {
  return <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1 ml-1">{texto}</label>;
}