import React, { useState, useEffect, useRef } from 'react';
import { llamarApi } from '../api';
import { comprimirFoto } from '../utils/comprimirFoto';
import { Spinner, TarjetaExito, AlertaError, CampoError } from '../components/EstadoPeticion';
import ModalCamara from '../components/ModalCamara';
import Confeti from '../components/Confeti';
import { useSecciones } from '../hooks/useSecciones';

const COLOR_LOGRO = {
  bronce: '#cd7f32',
  plata: '#a0aec0',
  oro: '#fbbf24',
  diamante: '#818cf8',
  perfecto: '#f472b6',
  fuego: '#fb923c',
};

const ICONO_LOGRO = {
  star: '★',
  gem: '♦',
  fire: '🔥',
  medal: '🏅',
  crown: '👑',
};

export default function ViewPerfilAlumno() {
  const { secciones } = useSecciones();
  const [grado, setGrado] = useState('');
  const [nie, setNie] = useState('');
  const [otp, setOtp] = useState('');
  const [buscando, setBuscando] = useState(true);
  const [error, setError] = useState('');
  const [errorOtp, setErrorOtp] = useState('');

  const [alumno, setAlumno] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState('idle');
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [racha, setRacha] = useState(null);
  const [logros, setLogros] = useState(null);
  const [topRacha, setTopRacha] = useState(null);
  const inputGaleriaRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem('perfilAutoLogin');
    if (raw) {
      localStorage.removeItem('perfilAutoLogin');
      try {
        const { nie: n, grado: g } = JSON.parse(raw);
        setNie(n);
        setGrado(g);
        autoBuscar(n, g);
      } catch {
        setBuscando(false);
      }
    } else {
      setBuscando(false);
    }
  }, []);

  async function autoBuscar(nieAlumno, gradoAlumno) {
    setError('');
    const resultado = await llamarApi('verificarNie', { nie: nieAlumno, grado: gradoAlumno });
    if (resultado.ok) {
      setAlumno(resultado.data);
      setDescripcion(resultado.data.descripcion || '');
      setFoto(resultado.data.fotoUrl || null);
      cargarRacha(resultado.data.nie, resultado.data.grado);
      setBuscando(false);
    } else {
      setError(resultado.error || 'No se encontró el alumno.');
      setBuscando(false);
    }
  }

  async function buscarAlumno(e) {
    e.preventDefault();
    if (!grado || !nie.trim()) {
      setError('Selecciona un grado e ingresa tu NIE.');
      return;
    }
    if (!otp.trim()) {
      setErrorOtp('El código de seguridad es obligatorio — pídelo a tu asistente de sección.');
      return;
    }
    setBuscando(true);
    setError('');
    setErrorOtp('');
    const resultado = await llamarApi('loginPerfil', { nie: nie.trim(), grado, otp: otp.trim() });
    setBuscando(false);
    if (resultado.ok) {
      setAlumno(resultado.data);
      setDescripcion(resultado.data.descripcion || '');
      setFoto(resultado.data.fotoUrl || null);
      cargarRacha(resultado.data.nie, resultado.data.grado);
    } else {
      setError(resultado.error || 'No se encontró el alumno.');
    }
  }

  async function cargarRacha(nieAlumno, gradoAlumno) {
    const [r1, r2, r3] = await Promise.all([
      llamarApi('calcularRacha', { nie: nieAlumno, grado: gradoAlumno, dias: 30 }),
      llamarApi('calcularLogros', { nie: nieAlumno, grado: gradoAlumno }),
      llamarApi('topRachas', { grado: gradoAlumno, nie: nieAlumno }),
    ]);
    if (r1.ok) setRacha(r1.data);
    if (r2.ok) setLogros(r2.data);
    if (r3.ok) setTopRacha(r3.data);
  }

  async function guardarPerfil() {
    setGuardando(true);
    setMensajeGuardado('');
    const resultado = await llamarApi('editarPerfilEstudiante', {
      nie: alumno.nie,
      grado: alumno.grado,
      fotoUrl: foto || '',
      descripcion,
    });
    setGuardando(false);
    if (resultado.ok) {
      setEstadoGuardado('exito');
      setMensajeGuardado('Perfil actualizado correctamente.');
      setAlumno(resultado.data);
    } else {
      setEstadoGuardado('error');
      setMensajeGuardado(resultado.error || 'No se pudo guardar.');
    }
  }

  async function manejarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      const dataUrl = await comprimirFoto(archivo);
      setFoto(dataUrl);
      setEstadoGuardado('idle');
    } catch (err) {
      setError(err.message);
    }
  }

  function manejarCaptura(dataUrl) {
    setFoto(dataUrl);
    setMostrarCamara(false);
    setEstadoGuardado('idle');
  }

  function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  if (!alumno) {
    return (
      <div className="max-w-sm mx-auto bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm">
        <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-8">
          Mi Perfil
        </h3>
        <form onSubmit={buscarAlumno} className="space-y-5">
          <div>
            <Etiqueta texto="Grado" />
            <select
              value={grado}
              onChange={(e) => setGrado(e.target.value)}
              className={campoClase(false)}
            >
              <option value="">Seleccione...</option>
              {secciones.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <Etiqueta texto="Tu NIE" />
            <input
              value={nie}
              onChange={(e) => setNie(e.target.value)}
              placeholder="Ej. 20231045"
              inputMode="numeric"
              maxLength={9}
              className={campoClase(false)}
            />
          </div>
          <div>
            <Etiqueta texto="Código de seguridad (OTP)" />
            <input
              value={otp}
              onChange={(e) => { setOtp(e.target.value); setErrorOtp(''); }}
              placeholder="5 dígitos — pídelo a tu asistente"
              inputMode="numeric"
              maxLength={5}
              className={campoClase(errorOtp) + ' text-center tracking-[0.3em]'}
            />
            <CampoError mensaje={errorOtp} />
          </div>
          {buscando && <Spinner texto="Verificando acceso..." />}
          <AlertaError mensaje={error} />
          <button type="submit" disabled={buscando}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            Ver Mi Perfil
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Carnet Digital INSAL Card */}
      <div className="wayground-card bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 rounded-[2.5rem] border border-indigo-500/40 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start pb-4 border-b border-indigo-500/20 mb-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 italic block">
              Carnet Digital Estudiantil
            </span>
            <h3 className="text-lg font-black italic uppercase text-slate-100">INSTITUTO NACIONAL SAN LUIS</h3>
          </div>
          <button
            onClick={() => window.print()}
            title="Imprimir Carnet"
            className="no-print bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition border border-indigo-500/30"
          >
            <i className="fas fa-print mr-1" /> Carnet
          </button>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
            {foto ? (
              <img src={foto} alt="Foto alumno" className="w-full h-full object-cover" />
            ) : (
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(alumno.nombres + ' ' + alumno.apellidos)}&background=6366f1&color=fff`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="font-black text-base text-slate-100 uppercase italic truncate">
              {alumno.nombres} {alumno.apellidos}
            </h4>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono">
                NIE: {alumno.nie}
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-md font-mono uppercase">
                {alumno.grado}
              </span>
            </div>
            <p className="text-[8px] text-slate-400 font-mono italic">Válido Ciclo Lectivo 2026</p>
          </div>
        </div>

        {/* Barcode Simulator Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-[9px] font-mono text-slate-500">
          <div className="flex items-center gap-1 font-black text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ESTADO ALUMNO ACTIVO
          </div>
          <div className="tracking-[0.3em] font-black text-indigo-400">
            |||| || | |||| || |||
          </div>
        </div>
      </div>

      <div className="wayground-card bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
        <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-6">
          Editar Datos de Mi Perfil
        </h3>

        <div className="flex flex-col items-center mb-6">
          <div className="w-28 h-28 rounded-3xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden mb-3">
            {foto ? (
              <img src={foto} alt="Mi foto" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] uppercase font-black text-slate-400 text-center px-2 italic">Sin foto</span>
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
          <input ref={inputGaleriaRef} type="file" accept="image/*" onChange={manejarFoto} className="hidden" />
        </div>

        {mostrarCamara && (
          <ModalCamara onCerrar={() => setMostrarCamara(false)} onCapturar={manejarCaptura} />
        )}

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">Nombre</p>
            <p className="font-black text-sm text-slate-100 italic uppercase">{alumno.nombres} {alumno.apellidos}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">NIE</p>
              <p className="font-black text-sm text-slate-100 italic">{alumno.nie}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">Grado</p>
              <p className="font-black text-sm text-slate-100 italic">{alumno.grado}</p>
            </div>
          </div>
          {alumno.fechaNacimiento && (
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">Edad</p>
              <p className="font-black text-sm text-slate-100 italic">{calcularEdad(alumno.fechaNacimiento)} años</p>
            </div>
          )}
          <div>
            <Etiqueta texto="Descripción (opcional)" />
            <textarea
              value={descripcion}
              onChange={(e) => { setDescripcion(e.target.value); setEstadoGuardado('idle'); }}
              placeholder="Ej. Me gusta dibujar, jugar fútbol..."
              rows={3}
              className="w-full p-4 bg-slate-800 rounded-xl font-bold italic text-sm outline-none focus:ring-2 focus:ring-indigo-500 border-none text-slate-100"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {guardando && <Spinner texto="Guardando..." />}
          {estadoGuardado === 'exito' && <TarjetaExito titulo="¡Guardado!" mensaje={mensajeGuardado} />}
          {estadoGuardado === 'error' && <AlertaError mensaje={mensajeGuardado} />}
          <button onClick={guardarPerfil} disabled={guardando}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition">
            Guardar Perfil
          </button>
        </div>
      </div>

      {racha && (
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
          <h4 className="text-center text-[10px] font-black uppercase text-amber-400 italic tracking-widest mb-4">
            Mi Racha de Asistencia
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-emerald-500/10 rounded-2xl p-4">
              <p className="text-3xl font-black text-emerald-400">{racha.rachaActual}</p>
              <p className="text-[9px] font-black uppercase text-emerald-400/70 italic mt-1">Racha Actual</p>
              <div className="flex justify-center gap-0.5 mt-2">
                {Array.from({ length: Math.min(racha.rachaActual, 5) }).map((_, i) => (
                  <i key={i} className="fas fa-fire text-amber-400 text-xs" />
                ))}
              </div>
            </div>
            <div className="bg-amber-500/10 rounded-2xl p-4">
              <p className="text-3xl font-black text-amber-400">{racha.mejorRacha}</p>
              <p className="text-[9px] font-black uppercase text-amber-400/70 italic mt-1">Mejor Racha</p>
              <div className="flex justify-center gap-0.5 mt-2">
                <i className="fas fa-trophy text-amber-400 text-sm" />
              </div>
            </div>
            <div className="bg-indigo-500/10 rounded-2xl p-4">
              <p className="text-3xl font-black text-indigo-400">{racha.asistenciasMes}</p>
              <p className="text-[9px] font-black uppercase text-indigo-400/70 italic mt-1">Este Mes</p>
              <div className="flex justify-center gap-0.5 mt-2">
                {Array.from({ length: Math.min(racha.asistenciasMes, 5) }).map((_, i) => (
                  <i key={i} className="fas fa-star text-indigo-400 text-xs" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {logros && (
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
          <h4 className="text-center text-[10px] font-black uppercase text-indigo-400 italic tracking-widest mb-4">
            Mis Logros
          </h4>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-slate-400 italic">Asistencia este mes</span>
              <span className="text-sm font-black italic text-slate-100">{logros.porcentaje}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: logros.porcentaje + '%',
                  background: logros.porcentaje === 100
                    ? 'linear-gradient(90deg, #34d399, #f472b6, #fbbf24)'
                    : 'linear-gradient(90deg, #6366f1, #818cf8)',
                }}
              />
            </div>
            <p className="text-[8px] text-slate-500 font-bold italic mt-1">
              {logros.asistenciasMes} de {logros.totalLaborales} días laborales
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {logros.logros.map((l) => (
              <div key={l.id} className="bg-slate-800 rounded-2xl p-3 flex items-center gap-3">
                <span
                  className="text-2xl flex-shrink-0"
                  style={{ color: COLOR_LOGRO[l.color] || '#6366f1' }}
                >
                  {ICONO_LOGRO[l.icono] || '★'}
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-100 italic uppercase">{l.nombre}</p>
                  <p className="text-[8px] text-slate-400 font-bold italic">{l.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Confeti activo={logros?.esMesPerfecto ?? false} />

      {topRacha && topRacha.top?.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
          <h4 className="text-center text-[10px] font-black uppercase text-amber-400 italic tracking-widest mb-4">
            🏆 Top Racha — {topRacha.grado || alumno.grado}
          </h4>
          {topRacha.top.length === 0 ? (
            <p className="text-center text-[9px] text-slate-400 font-bold italic">Aún no hay datos de racha en tu grado.</p>
          ) : (
            <div className="space-y-3">
              {topRacha.top.map((e, i) => (
                <div key={e.nie} className="flex items-center gap-3 bg-slate-800 rounded-2xl p-3"
                  style={e.nie === alumno?.nie ? { border: '2px solid #fbbf24' } : {}}>
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {e.fotoUrl ? (
                      <img src={e.fotoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span>#{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-100 italic uppercase truncate">
                      {e.apellidos}, {e.nombres}
                      {e.nie === alumno?.nie && <span className="text-amber-400 ml-1">(tú)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[9px] font-black text-emerald-400">{e.rachaActual}🔥</span>
                      <span className="text-[9px] text-slate-500 font-bold italic">Mejor: {e.mejorRacha}</span>
                      <span className="text-[9px] text-indigo-400 font-bold italic">{e.asistenciasMes} días</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                    <span className={`text-[10px] font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                      #{i + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {topRacha.posicion && (
            <p className="text-center text-[9px] text-slate-400 font-bold italic mt-4">
              Vas #{topRacha.posicion} de {topRacha.total} en tu grado
            </p>
          )}
        </div>
      )}

      <button onClick={() => { setAlumno(null); setRacha(null); setLogros(null); setTopRacha(null); setGrado(''); setNie(''); setOtp(''); setDescripcion(''); setFoto(null); setEstadoGuardado('idle'); setError(''); setErrorOtp(''); setBuscando(false); }}
        className="w-full text-[9px] font-black uppercase text-slate-400 tracking-widest text-center py-3">
        Buscar otro perfil
      </button>
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
