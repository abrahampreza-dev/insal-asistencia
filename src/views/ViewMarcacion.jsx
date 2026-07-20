import React, { useState } from 'react';
import { llamarApi } from '../api';
import { validarNie, validarSeleccion, validarOtp } from '../utils/validators';
import { Spinner, AlertaError, CampoError } from '../components/EstadoPeticion';
import ViewRegistroAlumno from './ViewRegistroAlumno';
import { useSecciones } from '../hooks/useSecciones';

export default function ViewMarcacion() {
  const { secciones } = useSecciones();
  const [paso, setPaso] = useState('nie');
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

  async function buscarNie(e) {
    e.preventDefault();
    const errG = validarSeleccion(grado, 'un grado');
    const errN = validarNie(nie);
    setErrorGrado(errG);
    setErrorNie(errN);
    if (errG || errN) return;

    setCargandoNie(true);
    setErrorPeticion('');
    const resultado = await llamarApi('verificarNie', { nie, grado });
    setCargandoNie(false);

    if (resultado.ok) {
      setAlumno(resultado.data);
      setPaso('confirmar-otp');
    } else {
      setPaso('no-encontrado');
    }
  }

  async function enviarOtp(e) {
    e.preventDefault();
    const errO = validarOtp(otp);
    setErrorOtp(errO);
    if (errO) return;

    setCargandoOtp(true);
    setErrorPeticion('');
    const resultado = await llamarApi('marcarAlumno', { nie, grado, otp });
    setCargandoOtp(false);

    if (resultado.ok) {
      setPaso('exito');
    } else {
      setErrorPeticion(resultado.error || 'No se pudo registrar la asistencia.');
    }
  }

  function reiniciar() {
    setPaso('nie'); setGrado(''); setNie(''); setOtp('');
    setErrorGrado(''); setErrorNie(''); setErrorOtp('');
    setAlumno(null); setErrorPeticion('');
  }

  function continuarTrasRegistro(alumnoRegistrado) {
    setAlumno(alumnoRegistrado);
    setPaso('confirmar-otp');
  }

  if (paso === 'exito') {
    return (
      <div className="max-w-sm mx-auto text-center bg-emerald-500 text-white p-12 rounded-[3rem] shadow-2xl">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center text-4xl">✓</div>
        <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">¡Estás en clase!</h2>
        <p className="text-sm font-bold italic opacity-90">
          {alumno?.nombres} {alumno?.apellidos}, tu asistencia quedó registrada.
        </p>
        <button
          onClick={reiniciar}
          className="mt-8 w-full bg-slate-900 text-emerald-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-500/10 transition"
        >
          Marcar a otro alumno
        </button>
      </div>
    );
  }

  if (paso === 'no-encontrado') {
    return (
      <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl">?</div>
        <h3 className="font-black uppercase text-sm italic text-slate-100 mb-2">No estás inscrito todavía</h3>
        <p className="text-[11px] text-slate-400 font-bold italic mb-6">
          No encontramos el NIE {nie} en {grado}. Regístrate primero para poder marcar tu asistencia.
        </p>
        <button
          onClick={() => setPaso('registro')}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition mb-3"
        >
          Registrarme ahora
        </button>
        <button onClick={reiniciar} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-widest">
          Intentar con otro NIE
        </button>
      </div>
    );
  }

  if (paso === 'registro') {
    return <ViewRegistroAlumno nieInicial={nie} gradoInicial={grado} onExito={continuarTrasRegistro} />;
  }

  return (
    <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm">
      <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-8">
        Marcar Asistencia
      </h3>

      {paso === 'nie' && (
        <form onSubmit={buscarNie} className="space-y-5">
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

          {cargandoNie && <Spinner texto="Verificando NIE..." />}
          <AlertaError mensaje={errorPeticion} />

          <button
            type="submit"
            disabled={cargandoNie}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black disabled:opacity-50 transition"
          >
            Continuar
          </button>
        </form>
      )}

      {paso === 'confirmar-otp' && alumno && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-800">
            <img
              src={alumno.fotoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(alumno.nombres)}
              alt={alumno.nombres}
              className="w-16 h-16 rounded-2xl object-cover bg-slate-900"
            />
            <div>
              <p className="font-black text-sm text-slate-100 italic uppercase">{alumno.nombres} {alumno.apellidos}</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold italic">{alumno.grado} · NIE {alumno.nie}</p>
            </div>
          </div>

          <form onSubmit={enviarOtp} className="space-y-5">
            <div>
              <Etiqueta texto="Código del día (OTP)" />
              <input
                value={otp}
                inputMode="numeric"
                maxLength={5}
                placeholder="5 dígitos"
                onChange={(e) => { setOtp(e.target.value); setErrorOtp(validarOtp(e.target.value)); }}
                className={campoClase(errorOtp) + ' text-center tracking-[0.4em] text-lg'}
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
            <button type="button" onClick={reiniciar} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-widest">
              Cambiar NIE
            </button>
          </form>
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
