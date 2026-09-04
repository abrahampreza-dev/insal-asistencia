import React, { useState, useEffect, useCallback } from 'react';
import { llamarApi } from '../api';
import { escucharRuta } from '../firebase';
import { validarSeleccion } from '../utils/validators';
import { Spinner, AlertaError, CampoError } from '../components/EstadoPeticion';
import CampoClave from '../components/CampoClave';
import GeneradorOtp from '../components/GeneradorOtp';
import BotonGuardarAsistencia from '../components/BotonGuardarAsistencia';
import { useSecciones } from '../hooks/useSecciones';
import { useMaterias } from '../hooks/useMaterias';
import { useToast } from '../context/ToastContext';

function hoyISO() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

const SESION_TIMEOUT = 30 * 60 * 1000;

function renovarSesionLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const s = JSON.parse(raw);
      s.expiraEn = Date.now() + SESION_TIMEOUT;
      s.fecha = hoyISO(); // evita que la sesión muera al cruzar medianoche en uso activo
      localStorage.setItem(key, JSON.stringify(s));
    }
  } catch {}
}

export default function ViewAsistente() {
  const [sesion, setSesion] = useState(() => {
    const saved = localStorage.getItem('asistenteSesion');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.fecha === hoyISO() && s.expiraEn > Date.now()) return s.sesion;
      } catch {}
    }
    return null;
  });
  const { secciones } = useSecciones();

  function guardarSesion(s) {
    setSesion(s);
    try {
      localStorage.setItem(
        'asistenteSesion',
        JSON.stringify({ fecha: hoyISO(), expiraEn: Date.now() + SESION_TIMEOUT, sesion: s })
      );
    } catch {}
  }

  function cerrarSesion() {
    setSesion(null);
    localStorage.removeItem('asistenteSesion');
  }

  useEffect(() => {
    if (!sesion) return;
    function renovar() {
      renovarSesionLocal('asistenteSesion');
    }
    window.addEventListener('mousedown', renovar);
    window.addEventListener('keydown', renovar);
    window.addEventListener('touchstart', renovar);
    const id = setInterval(() => {
      const raw = localStorage.getItem('asistenteSesion');
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s.expiraEn <= Date.now()) cerrarSesion();
        } catch {}
      }
    }, 15_000);
    return () => {
      window.removeEventListener('mousedown', renovar);
      window.removeEventListener('keydown', renovar);
      window.removeEventListener('touchstart', renovar);
      clearInterval(id);
    };
  }, [sesion]);

  if (!sesion) return <AccesoSeccional onIngresar={guardarSesion} secciones={secciones} />;
  return <PanelVivo grado={sesion.grado} clave={sesion.clave} nombre={sesion.nombre} onSalir={cerrarSesion} />;
}

function AccesoSeccional({ onIngresar, secciones }) {
  const [modo, setModo] = useState('login');
  const [grado, setGrado] = useState('');
  const [clave, setClave] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirmar, setClaveConfirmar] = useState('');
  const [nombre, setNombre] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [infoClave, setInfoClave] = useState(null);
  const [errorGrado, setErrorGrado] = useState('');
  const [errorNombre, setErrorNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorPeticion, setErrorPeticion] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  function ir(modoNuevo) {
    setModo(modoNuevo);
    setErrorPeticion('');
    setMensajeExito('');
    setClave('');
    setClaveNueva('');
    setClaveConfirmar('');
    setPregunta('');
    setRespuesta('');
    setInfoClave(null);
  }

  // Al entrar en modo recuperar con un grado ya seleccionado, consultar el
  // estado de la clave: sin esto la vista quedaba en "Consultando clave..."
  // infinito hasta re-elegir el grado.
  useEffect(() => {
    if (modo !== 'recuperar' || !grado) return undefined;
    let vigente = true;
    llamarApi('estadoClave', { grado }).then((r) => {
      if (vigente) setInfoClave(r.ok && r.data ? r.data : null);
    });
    return () => { vigente = false; };
  }, [modo, grado]);

  function seleccionarGrado(g) {
    setGrado(g);
    setErrorGrado(validarSeleccion(g, 'un grado'));
    setInfoClave(null);
  }

  async function manejarLogin(e) {
    e.preventDefault();
    const errG = validarSeleccion(grado, 'un grado');
    setErrorGrado(errG);
    const errN = nombre.trim() ? '' : 'Escribe tu nombre de asistente seccional.';
    setErrorNombre(errN);
    if (errG || errN || !clave) {
      if (!clave) setErrorPeticion('La contraseña seccional es requerida.');
      return;
    }

    setCargando(true);
    setErrorPeticion('');
    setMensajeExito('');
    const resultado = await llamarApi('loginAsistente', { grado, clave });
    setCargando(false);

    if (resultado.ok) {
      onIngresar({ grado, clave, nombre: nombre.trim() });
    } else {
      setErrorPeticion(resultado.error || 'No se pudo validar el acceso.');
      if (resultado.sinClave) setTimeout(() => ir('crear'), 900);
    }
  }

  async function manejarCrear(e) {
    e.preventDefault();
    const errG = validarSeleccion(grado, 'un grado');
    setErrorGrado(errG);
    const errN = nombre.trim() ? '' : 'Escribe tu nombre de asistente seccional.';
    setErrorNombre(errN);
    if (errG || errN) return;
    if (claveNueva.length < 4) { setErrorPeticion('La contraseña debe tener al menos 4 caracteres.'); return; }
    if (claveNueva !== claveConfirmar) { setErrorPeticion('Las contraseñas no coinciden.'); return; }
    if (!pregunta.trim() || !respuesta.trim()) { setErrorPeticion('Configura la pregunta secreta y su respuesta para poder recuperarla.'); return; }

    setCargando(true);
    setErrorPeticion('');
    setMensajeExito('');
    const resultado = await llamarApi('crearClaveAsistente', { grado, claveNueva, creadoPor: nombre.trim(), pregunta: pregunta.trim(), respuesta: respuesta.trim() });
    setCargando(false);

    if (resultado.ok) {
      onIngresar({ grado, clave: claveNueva, nombre: nombre.trim() });
    } else {
      setErrorPeticion(resultado.error || 'No se pudo crear la clave.');
    }
  }

  async function manejarRecuperar(e) {
    e.preventDefault();
    const errG = validarSeleccion(grado, 'un grado');
    setErrorGrado(errG);
    if (errG) return;
    if (claveNueva.length < 4) { setErrorPeticion('La nueva contraseña debe tener al menos 4 caracteres.'); return; }
    if (claveNueva !== claveConfirmar) { setErrorPeticion('Las contraseñas no coinciden.'); return; }

    setCargando(true);
    setErrorPeticion('');
    setMensajeExito('');
    const resultado = await llamarApi('recuperarClaveAsistente', { grado, respuesta, claveNueva });
    setCargando(false);

    if (resultado.ok) {
      setMensajeExito(resultado.mensaje || 'Contraseña actualizada.');
      setClaveNueva('');
      setClaveConfirmar('');
      setRespuesta('');
      setTimeout(() => ir('login'), 1800);
    } else {
      setErrorPeticion(resultado.error || 'No se pudo recuperar la clave.');
    }
  }

  const titulo = modo === 'crear'
    ? 'Crear Clave de Sección'
    : modo === 'recuperar'
      ? '¿Olvidaste tu Contraseña?'
      : 'Acceso Asistente de Sección';

  return (
    <div className="max-w-sm mx-auto wayground-card bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
      <h3 className="text-center text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-6">
        {titulo}
      </h3>

      {modo === 'login' && (
        <form onSubmit={manejarLogin} className="space-y-5">
          <div>
            <Etiqueta texto="Grado y Sección" />
            <select
              value={grado}
              onChange={(e) => seleccionarGrado(e.target.value)}
              className={campoClase(errorGrado)}
            >
              <option value="">Seleccione...</option>
              {secciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <CampoError mensaje={errorGrado} />
          </div>

          <div>
            <Etiqueta texto="Tu Nombre (Responsable)" />
            <input
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (errorNombre) setErrorNombre('');
              }}
              placeholder="Ej. Ana Martínez"
              className={campoClase(errorNombre) + ' uppercase'}
            />
            <CampoError mensaje={errorNombre} />
          </div>

          <div>
            <Etiqueta texto="Contraseña Seccional" />
            <CampoClave value={clave} onChange={(e) => setClave(e.target.value)} />
          </div>

          {cargando && <Spinner texto="Validando acceso..." />}
          <AlertaError mensaje={errorPeticion} />

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-600 transition"
          >
            Ingresar al Panel
          </button>

          <div className="text-center space-y-1">
            <button type="button" onClick={() => ir('crear')} className="block mx-auto text-[10px] font-bold uppercase text-slate-400 hover:text-indigo-300 tracking-widest transition">
              ¿No tienes clave? Créala aquí
            </button>
            <button type="button" onClick={() => ir('recuperar')} className="block mx-auto text-[10px] font-bold uppercase text-slate-400 hover:text-amber-300 tracking-widest transition">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      )}

      {modo === 'crear' && (
        <form onSubmit={manejarCrear} className="space-y-5">
          <div>
            <Etiqueta texto="Grado y Sección" />
            <select
              value={grado}
              onChange={(e) => seleccionarGrado(e.target.value)}
              className={campoClase(errorGrado)}
            >
              <option value="">Seleccione...</option>
              {secciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <CampoError mensaje={errorGrado} />
          </div>

          <div>
            <Etiqueta texto="Tu Nombre (Responsable)" />
            <input
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (errorNombre) setErrorNombre('');
              }}
              placeholder="Ej. Ana Martínez"
              className={campoClase(errorNombre) + ' uppercase'}
            />
            <CampoError mensaje={errorNombre} />
          </div>

          <div>
            <Etiqueta texto="Nueva Contraseña" />
            <CampoClave value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} />
          </div>

          <div>
            <Etiqueta texto="Confirmar Contraseña" />
            <CampoClave value={claveConfirmar} onChange={(e) => setClaveConfirmar(e.target.value)} />
          </div>

          <div>
            <Etiqueta texto="Pregunta Secreta (para recuperar tu contraseña)" />
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Ej. ¿Nombre de mi primera mascota?"
              className={campoClase(false)}
            />
          </div>

          <div>
            <Etiqueta texto="Respuesta" />
            <input
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Ej. Rocky"
              className={campoClase(false)}
            />
          </div>

          {cargando && <Spinner texto="Creando clave..." />}
          <AlertaError mensaje={errorPeticion} />

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-emerald-600 transition"
          >
            Crear Clave e Ingresar
          </button>

          <button type="button" onClick={() => ir('login')} className="block mx-auto text-[10px] font-bold uppercase text-slate-400 hover:text-indigo-300 tracking-widest transition">
            ← Volver al ingreso
          </button>
        </form>
      )}

      {modo === 'recuperar' && (
        <form onSubmit={manejarRecuperar} className="space-y-5">
          <div>
            <Etiqueta texto="Grado y Sección" />
            <select
              value={grado}
              onChange={(e) => seleccionarGrado(e.target.value)}
              className={campoClase(errorGrado)}
            >
              <option value="">Seleccione...</option>
              {secciones.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <CampoError mensaje={errorGrado} />
          </div>

          {grado && !infoClave && <Spinner texto="Consultando clave..." />}
          {grado && infoClave && !infoClave.tienePregunta && (
            <p className="text-[10px] font-bold italic text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              Esta sección no tiene pregunta secreta configurada. Pídele al administrador que cambie la clave.
            </p>
          )}

          {infoClave && infoClave.tienePregunta && (
            <>
              <div>
                <Etiqueta texto="Pregunta secreta" />
                <p className="text-[10px] font-black italic text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  {infoClave.pregunta}
                </p>
              </div>

              <div>
                <Etiqueta texto="Tu Respuesta" />
                <input
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  className={campoClase(false)}
                />
              </div>

              <div>
                <Etiqueta texto="Nueva Contraseña" />
                <CampoClave value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} />
              </div>

              <div>
                <Etiqueta texto="Confirmar Contraseña" />
                <CampoClave value={claveConfirmar} onChange={(e) => setClaveConfirmar(e.target.value)} />
              </div>

              {cargando && <Spinner texto="Actualizando clave..." />}
              <AlertaError mensaje={errorPeticion} />
              {mensajeExito && (
                <p className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                  {mensajeExito}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/30 hover:from-amber-400 hover:to-amber-500 transition"
              >
                Restablecer Contraseña
              </button>
            </>
          )}

          <button type="button" onClick={() => ir('login')} className="block mx-auto text-[10px] font-bold uppercase text-slate-400 hover:text-indigo-300 tracking-widest transition">
            ← Volver al ingreso
          </button>
        </form>
      )}
    </div>
  );
}

function PanelVivo({ grado, clave, nombre, onSalir }) {
  const { toastSuccess, toastError, toastInfo } = useToast();
  const { materias } = useMaterias();
  const [materia, setMateria] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [motivoModal, setMotivoModal] = useState(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [guardandoMotivo, setGuardandoMotivo] = useState(false);
  const [errorAuditoria, setErrorAuditoria] = useState('');
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'presentes', 'ausentes'

  const fecha = hoyISO();

  useEffect(() => {
    if (!materia) {
      setAsistencia({});
      return undefined;
    }
    const cancelar = escucharRuta(`asistencia/${fecha}/${grado}/${materia}`, (data) => setAsistencia(data || {}));
    return cancelar;
  }, [fecha, grado, materia]);

  useEffect(() => {
    const cancelar = escucharRuta(`estudiantes/${grado}`, (data) => {
      // El NIE vive como CLAVE de Firebase; no exigir campo interno nie o se
      // vaciaría todo el roster (fotos y botones P/A/M desaparecerían).
      const lista = Object.values(data || {}).filter(Boolean).sort((a, b) => (a.apellidos||'').localeCompare(b.apellidos||''));
      setAlumnos(lista);
    });
    return cancelar;
  }, [grado]);

  // NOTA: no se llama a calcularRachas aquí — el backend hace decenas de
  // lecturas por estudiante y el panel en vivo no consume ese resultado.

  const ausentesLista = alumnos.filter((al) => asistencia[al.nie]?.estado === 'A' || !asistencia[al.nie]);
  const presentesLista = alumnos.filter((al) => asistencia[al.nie]?.estado === 'P');

  const pendientes = materia
    ? alumnos
        .filter((al) => al?.nie && !(['P','A','M'].includes(String(asistencia[al.nie]?.estado || '').toUpperCase())))
        .map((al) => `${al.apellidos}, ${al.nombres}`)
    : [];

  const marcar = useCallback(
    async (nie, estado, motivo) => {
      setErrorAuditoria('');
      const anterior = asistencia[nie];

      setAsistencia((prev) => ({
        ...prev,
        [nie]: { estado, motivo, origen: 'manual', validadoPor: nombre, hora: new Date().toISOString() },
      }));

      const resultado = await llamarApi('auditarManual', { nie, grado, estado, motivo, clave, validadoPor: nombre, materia });
      if (!resultado.ok) {
        setErrorAuditoria(resultado.error || 'No se pudo actualizar el estado.');
        setAsistencia((prev) => { if (anterior === undefined) { const copia = { ...prev }; delete copia[nie]; return copia; } return { ...prev, [nie]: anterior }; });
        toastError('Error al actualizar la asistencia.');
      } else {
        toastSuccess(`Asistencia actualizada para el NIE ${nie}`);
      }
    },
    [grado, clave, nombre, materia, asistencia, toastSuccess, toastError]
  );

  function abrirMotivo(nie) {
    setMotivoModal(nie);
    setMotivoTexto('');
  }

  async function confirmarMotivo() {
    if (!motivoTexto.trim() || guardandoMotivo) return;
    setGuardandoMotivo(true);
    await marcar(motivoModal, 'M', motivoTexto.trim());
    setGuardandoMotivo(false);
    setMotivoModal(null);
  }

  async function copiarListaAusentes() {
    const nombresAusentes = ausentesLista.map((a, i) => `${i + 1}. ${a.apellidos}, ${a.nombres} (NIE: ${a.nie})`).join('\n');
    const textoCompleto = `📌 LISTA DE ALUMNOS AUSENTES HOY - SECCIÓN ${grado} (${fecha}):\n\n${nombresAusentes || '¡Ninguno! Todos asistieron.'}`;
    try {
      await navigator.clipboard.writeText(textoCompleto);
      toastInfo('Lista de alumnos ausentes copiada al portapapeles.');
    } catch {
      toastError('No se pudo copiar. Tu navegador bloqueó el portapapeles.');
    }
  }

  const alumnosFiltrados = alumnos.filter((al) => {
    if (!materia) return true;
    const st = asistencia[al.nie]?.estado;
    if (filtro === 'presentes') return st === 'P';
    if (filtro === 'ausentes') return st === 'A' || !st;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[9px] uppercase font-black text-indigo-400 tracking-widest italic block">
            Asistente de Sección
          </span>
          <h2 className="text-2xl font-black italic text-slate-100 uppercase">{grado}</h2>
          <p className="text-[10px] font-bold italic text-emerald-400">Responsable: {nombre}</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          {materia ? (
            <>
              <GeneradorOtp grado={grado} materia={materia} auth={{ clave, generadoPor: nombre }} />
              <BotonGuardarAsistencia grado={grado} materia={materia} auth={{ clave, cerradoPor: nombre }} pendientes={pendientes} />
            </>
          ) : (
            <p className="text-[9px] font-bold italic text-amber-400">
              Selecciona una materia para generar el código y cerrar la lista.
            </p>
          )}
        </div>

        <button onClick={onSalir} className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 tracking-widest transition">
          Cerrar Sesión
        </button>
      </div>

      {/* Selector de materia */}
      <div className="wayground-card bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic block mb-2">
          Materia que estás tomando en {grado}
        </label>
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-black italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Selecciona la materia —</option>
          {materias.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
        </select>
        {!materia && (
          <p className="text-[10px] font-bold italic text-amber-400 mt-3">
            Los estudiantes ya están cargados. Selecciona la materia para marcar sus estados del día.
          </p>
        )}
      </div>

      {/* Control KPI Cards & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFiltro('todos')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            filtro === 'todos' ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-950/40' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Enrolados</div>
          <div className="text-2xl font-black text-slate-100">{alumnos.length} Alumnos</div>
        </div>

        <div
          onClick={() => materia && setFiltro('presentes')}
          className={`${materia ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} p-5 rounded-2xl border transition-all ${
            filtro === 'presentes' ? 'bg-emerald-950/80 border-emerald-500 shadow-lg shadow-emerald-950/40' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Presentes Hoy</div>
          <div className="text-2xl font-black text-emerald-300">{materia ? presentesLista.length : '—'}</div>
        </div>

        <div
          onClick={() => materia && setFiltro('ausentes')}
          className={`${materia ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} p-5 rounded-2xl border transition-all ${
            filtro === 'ausentes' ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-950/40' : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Ausentes del Día</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (materia) copiarListaAusentes();
              }}
              title="Copiar lista de ausentes"
              className="text-[9px] bg-rose-900/40 text-rose-300 px-2 py-0.5 rounded border border-rose-700/50 hover:bg-rose-800/60"
            >
              <i className="far fa-copy mr-1" /> Copiar
            </button>
          </div>
          <div className="text-2xl font-black text-rose-300">{materia ? ausentesLista.length : '—'}</div>
        </div>
      </div>

      <AlertaError mensaje={errorAuditoria} />

      {/* Main Roster Table with Device Audit */}
      <div className="wayground-card bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden">
        {alumnosFiltrados.length === 0 ? (
          <p className="p-12 text-center text-slate-400 text-xs italic font-bold uppercase">
            No hay alumnos en la categoría seleccionada ({filtro}).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                  <th className="p-4">Estudiante</th>
                  <th className="p-4">Estado Asistencia</th>
                  <th className="p-4">Dispositivo / Navegador Auditado</th>
                  <th className="p-4 text-right">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs italic font-bold">
                {alumnosFiltrados.map((al) => {
                  const r = asistencia[al.nie];
                  const estado = r?.estado || 'A';
                  const disp = r?.dispositivo || r?.navegador || 'No registrado aún';

                  return (
                    <tr key={al.nie} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 text-slate-100 uppercase">
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
                            <span className="block text-[9px] text-slate-400 font-mono tracking-wider">NIE {al.nie}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {!materia && (
                          <span className="px-3 py-1 bg-slate-800 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                            — Sin materia
                          </span>
                        )}
                        {materia && estado === 'P' && (
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                            ✓ Presente ({r?.hora && !isNaN(new Date(r.hora).getTime()) ? new Date(r.hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' }) : 'Hoy'})
                          </span>
                        )}
                        {materia && estado === 'A' && (
                          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                            ✕ Ausente
                          </span>
                        )}
                        {materia && estado === 'M' && (
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                            ! Permiso: {r?.motivo}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-[10px] text-slate-400 font-mono">
                        {disp !== 'No registrado aún' ? (
                          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-indigo-300">
                            <i className="fas fa-desktop text-[9px] mr-1.5 text-slate-500" />
                            {disp}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[9px]">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => marcar(al.nie, 'P', '')}
                            disabled={!materia}
                            title="Marcar Presente"
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              estado === 'P' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => marcar(al.nie, 'A', '')}
                            disabled={!materia}
                            title="Marcar Ausente"
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              estado === 'A' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            A
                          </button>
                          <button
                            onClick={() => abrirMotivo(al.nie)}
                            disabled={!materia}
                            title="Permiso / Justificación"
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              estado === 'M' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            M
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Motivo / Justificante */}
      {motivoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="wayground-card bg-slate-900 p-6 rounded-[2rem] border border-slate-800 max-w-sm w-full space-y-4">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-widest italic">Motivo de Permiso / Inasistencia</h4>
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              placeholder="Ej. Cita médica en FOSALUD / Permiso personal..."
              className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-100 text-xs italic outline-none focus:ring-2 focus:ring-amber-500 h-28"
            />
            <div className="flex gap-2">
              <button onClick={confirmarMotivo} className="flex-1 bg-amber-500 text-slate-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                Guardar Motivo
              </button>
              <button onClick={() => setMotivoModal(null)} className="px-4 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
  );
}

function campoClase(tieneError) {
  return `w-full p-4 bg-slate-950 rounded-xl border font-bold italic text-sm outline-none transition focus:ring-2 ${
    tieneError ? 'border-rose-500' : 'border-slate-800 focus:ring-indigo-500'
  }`;
}

function Etiqueta({ texto }) {
  return <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">{texto}</label>;
}
