import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leerRuta, escucharRuta } from '../firebase';
import { llamarApi } from '../api';
import { Spinner } from '../components/EstadoPeticion';
import { ExamTaking } from '../modules/evaluaciones/components';
import RubricasEstudiante from '../modules/rubricas/RubricasEstudiante';

function hoyISO() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

// La identidad del estudiante en el dispositivo expira por seguridad:
// dura el día escolar y no cruza medianoche (así nadie hereda la sesión
// de otro en una máquina compartida).
const IDENTIDAD_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function leerIdentidadGuardada() {
  try {
    const raw = localStorage.getItem('evaluacion_identidad');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.nie || !parsed?.grado) return null;
    if (!parsed.expiraEn || parsed.expiraEn < Date.now()) {
      localStorage.removeItem('evaluacion_identidad');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function ViewEvaluaciones() {
  const [identidad, setIdentidad] = useState(() => leerIdentidadGuardada());

  const [vista, setVista] = useState(() => (identidad ? 'examenes' : 'inicio'));
  const [seccion, setSeccion] = useState('examenes');
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);

  useEffect(() => {
    if (!identidad) {
      localStorage.removeItem('evaluacion_identidad');
      setVista('inicio');
    } else {
      if (vista === 'inicio') setVista('examenes');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identidad]);

  const renderizarContenido = () => {
    switch (vista) {
      case 'inicio':
        return <IdentificarEstudiante onIdentificado={setIdentidad} />;

      case 'examenes':
        return identidad ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setSeccion('examenes')}
                className={`flex items-center gap-4 text-left p-5 rounded-[2rem] border transition group ${
                  seccion === 'examenes'
                    ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-900 border-slate-800 hover:border-indigo-500/40'
                }`}
              >
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 transition ${
                  seccion === 'examenes' ? 'bg-indigo-600 text-white' : 'bg-indigo-600/20 text-indigo-400 group-hover:scale-110'
                }`}>
                  <i className="fas fa-clipboard-list" />
                </span>
                <span>
                  <span className="block font-black uppercase italic text-slate-100 text-sm">Exámenes</span>
                  <span className="block text-[9px] font-bold italic text-slate-400 mt-0.5">
                    Resuelve tus pruebas en línea y consulta tus notas.
                  </span>
                </span>
                <i className="fas fa-chevron-right ml-auto text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setSeccion('rubricas')}
                className={`flex items-center gap-4 text-left p-5 rounded-[2rem] border transition group ${
                  seccion === 'rubricas'
                    ? 'bg-emerald-600/20 border-emerald-500/60 shadow-lg shadow-emerald-600/10'
                    : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 transition ${
                  seccion === 'rubricas' ? 'bg-emerald-600 text-white' : 'bg-emerald-600/20 text-emerald-400 group-hover:scale-110'
                }`}>
                  <i className="fas fa-chalkboard-user" />
                </span>
                <span>
                  <span className="block font-black uppercase italic text-slate-100 text-sm">Exposiciones</span>
                  <span className="block text-[9px] font-bold italic text-slate-400 mt-0.5">
                    Forma tu grupo y consulta tus notas de exposición.
                  </span>
                </span>
                <i className="fas fa-chevron-right ml-auto text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {seccion === 'examenes' ? (
              <ListaExamenes
                grado={identidad.grado}
                nie={identidad.nie}
                estudiante={identidad}
                setVista={setVista}
                setExamenSeleccionado={setExamenSeleccionado}
              />
            ) : (
              <RubricasEstudiante
                grado={identidad.grado}
                nie={identidad.nie}
                estudiante={identidad}
              />
            )}
          </div>
        ) : (
          <IdentificarEstudiante onIdentificado={setIdentidad} />
        );

      case 'tomar':
        return examenSeleccionado ? (
          <ExamTaking
            examen={examenSeleccionado}
            grado={identidad?.grado}
            estudiante={identidad}
            onFinalizar={() => setVista('resultado')}
            onSalir={() => setVista('examenes')}
          />
        ) : (
          <div className="text-center py-12 text-slate-400">
            <i className="fas fa-exclamation-circle text-2xl mb-3" />
            <p className="font-bold">Selecciona un examen para comenzar.</p>
          </div>
        );

      case 'resultado':
        return <ResultadoExamen examen={examenSeleccionado} onVolver={() => setVista('examenes')} />;

      default:
        return <IdentificarEstudiante onIdentificado={setIdentidad} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-black italic uppercase text-slate-100 mb-2">
            Evaluaciones
          </h1>
          <p className="text-sm font-bold italic text-slate-400">
            Resuelve tus exámenes en línea.
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={vista}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderizarContenido()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function IdentificarEstudiante({ onIdentificado }) {
  const [nie, setNie] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function buscar(e) {
    e.preventDefault();
    if (!nie.trim()) {
      setError('Ingresa tu NIE.');
      return;
    }
    setCargando(true);
    setError('');
    const resultado = await llamarApi('verificarNie', { nie: nie.trim() });
    setCargando(false);
    if (resultado.ok) {
      const data = resultado.data;
      if (!data.grado) {
        setError('Tu registro no tiene una sección asignada.');
        return;
      }
      const identidad = {
        nie: data.nie || nie.trim(),
        grado: data.grado,
        nombres: data.nombres || '',
        apellidos: data.apellidos || '',
        fotoUrl: data.fotoUrl || '',
      };
      try {
        localStorage.setItem('evaluacion_identidad', JSON.stringify({
          ...identidad,
          expiraEn: Date.now() + IDENTIDAD_TTL_MS,
        }));
      } catch {}
      onIdentificado(identidad);
    } else {
      setError(resultado.error || 'NIE no encontrado. Regístrate primero.');
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
          <i className="fas fa-fingerprint text-indigo-400 text-xl" />
        </div>
        <h2 className="font-black uppercase italic text-slate-100 mb-1">
          Identifícate para continuar
        </h2>
        <p className="text-[10px] font-bold italic text-slate-500 mb-4">
          Solo verás los exámenes de tu propia sección. Escribe tu NIE.
        </p>

        <form onSubmit={buscar} className="space-y-3">
          <input
            value={nie}
            onChange={(e) => setNie(e.target.value)}
            placeholder="Ej: 12345678"
            className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && (
            <p className="text-[10px] font-bold italic text-rose-400 flex items-center gap-2">
              <i className="fas fa-exclamation-circle" /> {error}
            </p>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {cargando ? <Spinner texto="Verificando..." /> : <><i className="fas fa-arrow-right" /> Ver mis exámenes</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function ListaExamenes({ grado, nie, estudiante, setVista, setExamenSeleccionado }) {
  const [examenes, setExamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [verificandoId, setVerificandoId] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!grado) return;

    const cancelar = escucharRuta(`evaluaciones/${grado}/examenes`, (data) => {
      if (!data) {
        setExamenes([]);
        setCargando(false);
        return;
      }
      const lista = Object.values(data)
        .filter((e) => !e.eliminado && e.estado === 'activo')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setExamenes(lista);
      setCargando(false);
    });

    return cancelar;
  }, [grado]);

  const handleSeleccionar = async (examen) => {
    const hoy = hoyISO();

    if (!nie) {
      alert('No se pudo identificar tu NIE. Vuelve a identificarte.');
      return;
    }

    setVerificandoId(examen.id);

    try {
      const asistencia = await leerRuta(`asistencia/${hoy}/${grado}`);
      let asistio = false;

      if (asistencia) {
        // 1. Por materia exacta del examen
        if (examen.materia && asistencia[examen.materia]?.[nie]) {
          const est = String(asistencia[examen.materia][nie]?.estado || '').toUpperCase();
          if (est === 'P' || est === 'M') asistio = true;
        }
        // 2. Estructura plana (sin materia)
        if (!asistio && asistencia[nie]) {
          const est = String(asistencia[nie]?.estado || '').toUpperCase();
          if (est === 'P' || est === 'M') asistio = true;
        }
        // 3. Búsqueda profunda: cualquier materia, P o M
        if (!asistio) {
          asistio = Object.values(asistencia).some((m) => {
            if (typeof m !== 'object' || !m) return false;
            const reg = m[nie];
            if (!reg) return false;
            const est = String(reg.estado || '').toUpperCase();
            return est === 'P' || est === 'M';
          });
        }
        // 4. Búsqueda por NIE como clave anidada (materia → nie → registro)
        if (!asistio) {
          for (const materiaKey of Object.keys(asistencia)) {
            const materiaData = asistencia[materiaKey];
            if (materiaData && typeof materiaData === 'object' && materiaData[nie]) {
              const est = String(materiaData[nie].estado || '').toUpperCase();
              if (est === 'P' || est === 'M') { asistio = true; break; }
            }
          }
        }
      }

      if (!asistio) {
        alert('Debes tener asistencia registrada del día de hoy (P o M) para poder acceder al examen.');
        setVerificandoId(null);
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al verificar tu asistencia. Inténtalo nuevamente.');
      setVerificandoId(null);
      return;
    }

    setVerificandoId(null);
    setExamenSeleccionado(examen);
    setVista('tomar');
  };

  const examenesFiltrados = examenes.filter((e) =>
    e.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const nombreEstudiante = estudiante?.nombres
    ? `${estudiante.nombres} ${estudiante.apellidos || ''}`.trim()
    : nie;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-100">Exámenes Disponibles</h2>
          <p className="text-[9px] font-bold uppercase text-indigo-400 italic tracking-widest">
            <i className="fas fa-user mr-1" />
            {nombreEstudiante} · Sección {grado}
          </p>
        </div>
        <button
          onClick={() => {
            try {
              localStorage.removeItem('evaluacion_identidad');
            } catch {}
            setVista('inicio');
          }}
          className="flex items-center gap-2 bg-slate-800 text-slate-200 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
        >
          <i className="fas fa-arrow-left" /> Cambiar de estudiante
        </button>
      </div>

      <div className="flex gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar examen..."
          className="flex-1 p-3 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {cargando && <Spinner texto="Cargando exámenes..." />}

      {!cargando && examenesFiltrados.length === 0 && (
        <div className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800">
          <i className="fas fa-clipboard-list text-4xl text-slate-600 mb-4" />
          <p className="text-slate-400 text-sm font-bold italic uppercase">
            No hay exámenes disponibles en tu sección.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examenesFiltrados.map((examen) => (
          <ExamCard
            key={examen.id}
            examen={examen}
            verificando={verificandoId === examen.id}
            onSelect={() => handleSeleccionar(examen)}
          />
        ))}
      </div>
    </div>
  );
}

function ExamCard({ examen, onSelect, verificando }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-6 cursor-pointer hover:border-indigo-500/50 transition-all group ${
        verificando ? 'opacity-50 pointer-events-none' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-sm text-slate-100 uppercase italic">
          {examen.titulo || 'Sin título'}
        </h3>
        <span className="text-[8px] font-black uppercase text-emerald-400">
          {verificando ? 'Verificando...' : 'Activo'}
        </span>
      </div>

      <p className="text-[10px] text-slate-400 font-bold italic mb-3 line-clamp-2">
        {examen.descripcion || 'Sin descripción.'}
      </p>

      <div className="flex gap-4 text-[9px] font-black uppercase text-slate-500 italic">
        <span>
          <i className="fas fa-question-circle mr-1" />
          {(examen.preguntas || []).length} preguntas
        </span>
        <span>
          <i className="fas fa-clock mr-1" />
          {examen.configuracion?.duracionMinutos} min
        </span>
        <span>
          <i className="fas fa-star mr-1" />
          {examen.configuracion?.puntajeTotal || 0} pts
        </span>
      </div>
    </motion.div>
  );
}

function ResultadoExamen({ examen, onVolver }) {
  if (!examen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <i className="fas fa-trophy text-4xl text-amber-400" />
        </div>

        <h2 className="text-3xl font-black italic uppercase text-slate-100 mb-4">
          ¡Examen completado!
        </h2>

        <p className="text-lg font-bold italic text-slate-300 mb-8">
          Has finalizado el examen <span className="text-indigo-400">"{examen.titulo}"</span>.
          Tus respuestas han sido guardadas y enviadas para calificación.
        </p>

        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={onVolver}
            className="flex items-center gap-2 bg-slate-800 text-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
          >
            <i className="fas fa-book" /> Ver mis exámenes
          </button>
        </div>

        <motion.div
          className="bg-slate-800/30 rounded-2xl p-4 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-[9px] font-black uppercase text-slate-500 italic tracking-widest mb-3">
            Información del examen
          </p>
          <div className="grid grid-cols-2 gap-4 text-[9px]">
            <div>
              <span className="text-slate-500">Título:</span>
              <span className="text-slate-200 ml-2">{examen.titulo}</span>
            </div>
            <div>
              <span className="text-slate-500">Preguntas:</span>
              <span className="text-slate-200 ml-2">{(examen.preguntas || []).length}</span>
            </div>
            <div>
              <span className="text-slate-500">Puntaje total:</span>
              <span className="text-slate-200 ml-2">{examen.configuracion?.puntajeTotal || 0} pts</span>
            </div>
          </div>
          <p className="text-[8px] text-slate-500 italic mt-2">
            Las calificaciones de preguntas de desarrollo se publican en los reportes del profesor.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}