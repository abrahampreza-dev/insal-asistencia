import React, { useState, useEffect } from 'react';
import { llamarApi } from '../api';
import { validarNie, validarSeleccion, validarOtp } from '../utils/validators';
import { Spinner, AlertaError, CampoError } from '../components/EstadoPeticion';
import ViewRegistroAlumno from './ViewRegistroAlumno';
import { useSecciones } from '../hooks/useSecciones';
import { obtenerInformacionDispositivo } from '../utils/dispositivo';
import { useToast } from '../context/ToastContext';

export default function ViewMarcacion({ onIrAPerfil }) {
  const { secciones } = useSecciones();
  const { toastSuccess, toastError } = useToast();
  const infoDispositivo = obtenerInformacionDispositivo();

  const [turno, setTurno] = useState(() => (new Date().getHours() < 12 ? 'matutino' : 'vespertino'));
  const [paso, setPaso] = useState('nie');
  const [grado, setGrado] = useState(() => localStorage.getItem('insal_ultimo_grado') || '');
  const [nie, setNie] = useState(() => localStorage.getItem('insal_ultimo_nie') || '');
  const [otp, setOtp] = useState('');
  const [errorGrado, setErrorGrado] = useState('');
  const [errorNie, setErrorNie] = useState('');
  const [errorOtp, setErrorOtp] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [cargandoNie, setCargandoNie] = useState(false);
  const [cargandoOtp, setCargandoOtp] = useState(false);
  const [errorPeticion, setErrorPeticion] = useState('');
  const [primeros, setPrimeros] = useState(null);
  const [comprobante, setComprobante] = useState(null);

  useEffect(() => {
    if (paso === 'exito' && alumno?.grado) {
      llamarApi('primerosMarcajes', { grado: alumno.grado, nie: alumno.nie }).then((r) => {
        // El backend devuelve data:[] cuando nadie ha marcado; normalizamos
        // a la forma {primeros, propios} que consume la UI.
        if (r.ok) {
          setPrimeros(Array.isArray(r.data) ? { primeros: [], propios: null } : r.data || { primeros: [], propios: null });
        }
      });
    }
  }, [paso, alumno]);

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
      localStorage.setItem('insal_ultimo_nie', nie);
      localStorage.setItem('insal_ultimo_grado', grado);
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

    const payload = {
      nie,
      grado,
      otp,
      turno,
      dispositivo: infoDispositivo.descripcion,
      navegador: infoDispositivo.navegador,
      os: infoDispositivo.os,
      tipoDispositivo: infoDispositivo.tipoDispositivo,
      horaConexion: infoDispositivo.horaConexion,
    };

    const resultado = await llamarApi('marcarAlumno', payload);
    setCargandoOtp(false);

    if (resultado.ok) {
      const datosComprobante = {
        codigoTicket: `INSAL-${Math.floor(100000 + Math.random() * 900000)}`,
        fecha: new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        hora: new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }),
        turnoLabel: turno === 'matutino' ? 'Turno Matutino (Mañana)' : turno === 'vespertino' ? 'Turno Vespertino (Tarde)' : 'Jornada Completa',
        dispositivo: infoDispositivo.descripcion,
      };
      setComprobante(datosComprobante);
      toastSuccess(`¡Asistencia registrada (${datosComprobante.turnoLabel})!`);
      setPaso('exito');
    } else {
      const msg = resultado.error || 'No se pudo registrar la asistencia.';
      setErrorPeticion(msg);
      toastError(msg);
    }
  }

  function reiniciar() {
    setPaso('nie');
    setOtp('');
    setErrorGrado('');
    setErrorNie('');
    setErrorOtp('');
    setAlumno(null);
    setErrorPeticion('');
    setComprobante(null);
  }

  function continuarTrasRegistro(alumnoRegistrado) {
    setAlumno(alumnoRegistrado);
    setPaso('confirmar-otp');
  }

  if (paso === 'exito') {
    return (
      <div className="max-w-md mx-auto space-y-5">
        {/* Ticket Comprobante Digital */}
        <div className="wayground-card bg-slate-900 border border-emerald-500/40 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500" />

          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/20">
            ✓
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest italic mb-2">
            Asistencia Confirmada
          </span>

          <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-100 mb-1">
            ¡Estás Presente!
          </h2>

          <p className="text-xs font-bold italic text-slate-400 mb-6">
            {alumno?.nombres} {alumno?.apellidos}
          </p>

          {/* Detalles de Auditoria del Ticket */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-[10px] mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-500 font-bold italic">Código Ticket</span>
              <span className="font-mono text-emerald-400 font-bold">{comprobante?.codigoTicket}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-500 font-bold italic">Fecha & Hora</span>
              <span className="text-slate-200 font-bold">{comprobante?.hora}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold italic">Navegador Auditado</span>
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[8px] font-mono">
                {infoDispositivo.navegador}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                localStorage.setItem('perfilAutoLogin', JSON.stringify({ nie: alumno.nie, grado: alumno.grado }));
                onIrAPerfil();
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition"
            >
              Ver mi perfil
            </button>
            <button
              onClick={reiniciar}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
            >
              Marcar otro alumno
            </button>
          </div>
        </div>

        {/* Tren de la Asistencia */}
        {primeros && primeros.primeros?.length > 0 && (
          <div className="wayground-card bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
            <h4 className="text-center text-[10px] font-black uppercase text-amber-400 italic tracking-widest mb-4">
              🚂 Tren de la Asistencia de Hoy
            </h4>
            <div className="space-y-3">
              {primeros.primeros.map((p, i) => (
                <div key={p.nie} className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-100 uppercase truncate">
                      {p.apellidos}, {p.nombres}
                      {p.nie === alumno?.nie && <span className="text-emerald-400 ml-1">(Tú)</span>}
                    </p>
                    <p className="text-[8px] text-slate-500 font-bold italic">
                      {new Date(p.hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (paso === 'no-encontrado') {
    return (
      <div className="max-w-sm mx-auto wayground-card bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-center">
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
    <div className="max-w-md mx-auto wayground-card bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-xs font-black uppercase text-indigo-400 italic tracking-widest">
            Marcación de Asistencia
          </h3>
          <p className="text-[9px] text-slate-400 italic font-bold">Instituto Nacional San Luis</p>
        </div>
        <span className="text-[8px] bg-slate-950 px-2 py-1 rounded-md text-emerald-400 border border-slate-800 font-mono">
          {infoDispositivo.navegador}
        </span>
      </div>

      {paso === 'nie' && (
        <form onSubmit={buscarNie} className="space-y-5">
          <div>
            <Etiqueta texto="Turno de Asistencia" />
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTurno('matutino')}
                className={`py-2.5 px-2 rounded-xl text-[9px] font-black uppercase italic border transition ${
                  turno === 'matutino'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                ☀️ Matutino
              </button>
              <button
                type="button"
                onClick={() => setTurno('vespertino')}
                className={`py-2.5 px-2 rounded-xl text-[9px] font-black uppercase italic border transition ${
                  turno === 'vespertino'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                🌙 Vespertino
              </button>
              <button
                type="button"
                onClick={() => setTurno('ambos')}
                className={`py-2.5 px-2 rounded-xl text-[9px] font-black uppercase italic border transition ${
                  turno === 'ambos'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                ⚡ Completo
              </button>
            </div>
          </div>

          <div>
            <Etiqueta texto="Grado y Sección" />
            <select
              value={grado}
              onChange={(e) => {
                setGrado(e.target.value);
                setErrorGrado(validarSeleccion(e.target.value, 'un grado'));
              }}
              className={campoClase(errorGrado)}
            >
              <option value="">Seleccione su sección...</option>
              {secciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <CampoError mensaje={errorGrado} />
          </div>

          <div>
            <Etiqueta texto="Tu Número de NIE" />
            <input
              value={nie}
              inputMode="numeric"
              maxLength={9}
              placeholder="Ej. 20231045"
              onChange={(e) => {
                setNie(e.target.value);
                setErrorNie(validarNie(e.target.value));
              }}
              className={campoClase(errorNie)}
            />
            <CampoError mensaje={errorNie} />
          </div>

          {cargandoNie && <Spinner texto="Verificando en servidor..." />}
          <AlertaError mensaje={errorPeticion} />

          <button
            type="submit"
            disabled={cargandoNie}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-600 transition"
          >
            Continuar a Validación
          </button>
        </form>
      )}

      {paso === 'confirmar-otp' && alumno && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <img
              src={alumno.fotoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(alumno.nombres) + '&background=6366f1&color=fff'}
              alt={alumno.nombres}
              className="w-14 h-14 rounded-2xl object-cover border border-indigo-500/40"
            />
            <div>
              <p className="font-black text-sm text-slate-100 italic uppercase">
                {alumno.nombres} {alumno.apellidos}
              </p>
              <p className="text-[9px] text-emerald-400 uppercase font-bold italic">
                {alumno.grado} · NIE {alumno.nie}
              </p>
            </div>
          </div>

          <form onSubmit={enviarOtp} className="space-y-5">
            <div>
              <Etiqueta texto="Código OTP del Día (5 dígitos)" />
              <input
                value={otp}
                inputMode="numeric"
                maxLength={5}
                placeholder="00000"
                onChange={(e) => {
                  setOtp(e.target.value);
                  setErrorOtp(validarOtp(e.target.value));
                }}
                className={campoClase(errorOtp) + ' text-center tracking-[0.4em] text-xl font-mono text-indigo-300'}
              />
              <CampoError mensaje={errorOtp} />
            </div>

            {cargandoOtp && <Spinner texto="Auditando dispositivo y registrando..." />}
            <AlertaError mensaje={errorPeticion} />

            <button
              type="submit"
              disabled={cargandoOtp}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition"
            >
              Confirmar Mi Asistencia
            </button>
            <button type="button" onClick={reiniciar} className="w-full text-[9px] font-black uppercase text-slate-500 tracking-widest">
              Cambiar NIE / Grado
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function campoClase(tieneError) {
  return `w-full p-4 bg-slate-950 rounded-xl border font-bold italic text-sm outline-none transition focus:ring-2 ${
    tieneError ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:ring-indigo-500 focus:border-indigo-500/50'
  }`;
}

function Etiqueta({ texto }) {
  return <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">{texto}</label>;
}
