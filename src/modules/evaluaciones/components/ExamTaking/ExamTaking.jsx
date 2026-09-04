import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularTimer from './CircularTimer';
import ProgressBar from './ProgressBar';
import QuestionRenderer from './QuestionRenderer';
import SecurityOverlay from './SecurityOverlay';
import { useProctoring, useExamTimer, useAutoSaveDraft, useTextInputAnalysis } from '../../hooks';
import { guardarRespuesta, guardarRespuestasBatch, finalizarExamen, registrarEventoProctoring, actualizarStatusProctoring, iniciarExamen } from '../../services/examService';
import { TIPOS_PREGUNTA, CONFIG_PROCTORING } from '../../constants';
import { sanearObjetoExamen } from '../../../../utils/sanearTexto';
import { useToast } from '../../../../context/ToastContext';

/**
 * ¿La pregunta quedó contestada? Regla unificada para todos los tipos:
 * strings con contenido, arreglos no vacíos (opción múltiple/ordenar),
 * objetos con claves (emparejar), booleanos (V/F) y números cuentan.
 * false en V/F ES respuesta válida; "" o [] o {} NO lo son.
 */
function _esRespondida(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

export default function ExamTaking({
  examen: examenProps,
  estudiante,
  grado,
  onFinalizar,
  onSalir,
  modoDemo = false,
}) {
  // Sanear y randomizar UNA sola vez (memoizado): rebarajar en cada render
  // hacía que las preguntas saltaran de posición con cada tick del temporizador.
  const examen = useMemo(() => sanearObjetoExamen(examenProps), [examenProps]);
  // Blindaje: exámenes antiguos/importados podrían venir sin configuración
  const _cfg = examen.configuracion || {};
  const { toastError, toastWarning } = useToast();
  // Móviles/tablets: la API de pantalla completa no existe o es limitada.
  // Exigirla bloqueaba a los estudiantes de celular sin salida posible.
  const pantallaCompletaSoportada =
    typeof document !== 'undefined' &&
    !!document.documentElement.requestFullscreen &&
    !/Mobi|Android|iPhone|iPad/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const [respuestas, setRespuestas] = useState({});
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState((_cfg.duracionMinutos || 60) * 60);
  const [statusExamen, setStatusExamen] = useState('inicio');
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  // Tiempo restante real según el startTime de la base de datos (reanudación):
  // null hasta que iniciarExamen responda; evita que refrescar regale tiempo.
  // DEBE declararse ANTES del useExamTimer que lo consume.
  const [segundosSeed, setSegundosSeed] = useState(null);

  const examenId = examen.id;
  const duracionTotal = (_cfg.duracionMinutos || 60) * 60;

  // Control interno de zoom para accesibilidad sin alterar el navegador ni salir de pantalla completa
  const NIVELES_ZOOM = [80, 90, 100, 115, 130];
  const [zoomNivel, setZoomNivel] = useState(100);

  const reducirZoom = () => {
    setZoomNivel((prev) => {
      const idx = NIVELES_ZOOM.indexOf(prev);
      return idx > 0 ? NIVELES_ZOOM[idx - 1] : prev;
    });
  };

  const aumentarZoom = () => {
    setZoomNivel((prev) => {
      const idx = NIVELES_ZOOM.indexOf(prev);
      return idx < NIVELES_ZOOM.length - 1 ? NIVELES_ZOOM[idx + 1] : prev;
    });
  };

  const resetZoom = () => setZoomNivel(100);

  const preguntas = useMemo(() => {
    const base = Array.isArray(examen.preguntas) ? examen.preguntas : [];
    if (!_cfg.randomizar) return base;
    const semilla = examen.id ? examen.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : Date.now();
    let s = semilla;
    const copia = [...base];
    for (let i = copia.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }, [examen]);
  const totalPreguntas = preguntas.length;

  const {
    status: statusProctoring,
    eventos: eventosProctoring,
    eventosRef: obtenerEventosProctoring,
    penalizacionActiva,
    tiempoPenalizacion,
    fullscreenDesbloqueado,
    solicitarFullscreen,
    salirFullscreen,
    resetearContador,
  } = useProctoring({
    nie: estudiante.nie,
    examenId,
    grado,
    onEventoDetectado: (evento) => {
      // Informe en segundo plano: escritura a la base sin frenar el examen
      registrarEventoProctoring(grado, examenId, estudiante.nie, evento).catch((err) =>
        console.warn('No se pudo registrar el evento:', err?.message)
      );
      actualizarStatusProctoring(grado, examenId, estudiante.nie, evento.severidad || 'warning').catch(() => {});
    },
    onStatusChange: (nuevoStatus) => {
      actualizarStatusProctoring(grado, examenId, estudiante.nie, nuevoStatus).catch(() => {});
    },
  });

  const {
    tiempoRestante: tiempoHook,
    tiempoFormateado,
    siguiente,
    anterior,
    detener,
  } = useExamTimer({
    duracionMinutos: _cfg.duracionMinutos,
    preguntas,
    onComplete: () => finalizar(),
    onTick: (t) => setTiempoRestante(t),
    segundosIniciales: segundosSeed,
  });

  const {
    guardando: guardandoDraft,
    hayBorrador,
    cargarBorrador,
    limpiarBorrador,
    guardarBorradorDebounced,
  } = useAutoSaveDraft({
    examenId,
    nie: estudiante.nie,
    respuestasIniciales: {},
  });

  const {
    anomalias,
    crearHandlers,
    tieneAnomalias,
    getCountBySeverity,
  } = useTextInputAnalysis({
    onAnomaliaDetectada: (evento) => {
      registrarEventoProctoring(grado, examenId, estudiante.nie, evento).catch(() => {});
    },
  });

  const handlersMemo = useMemo(
    () => (modoDemo ? undefined : crearHandlers()),
    [modoDemo, crearHandlers]
  );

  const textareaRefs = useRef({});
  const finalizandoRef = useRef(false);
  // Espejo de respuestas para efectos sin re-render
  const respuestasRef = useRef({});
  useEffect(() => { respuestasRef.current = respuestas; }, [respuestas]);
  const [bloqueadoPorRepetido, setBloqueadoPorRepetido] = useState(false);
  const [borradorRestaurado, setBorradorRestaurado] = useState(false);

  useEffect(() => {
    if (!modoDemo) {
      // Solo exigir fullscreen donde el navegador lo soporta (desktop)
      if (pantallaCompletaSoportada) solicitarFullscreen();
      iniciarExamen(grado, examenId, estudiante)
        .then((registro) => {
          // Reanudación: sincronizar el reloj con el startTime real del examen.
          if (registro?.startTime) {
            const inicio = new Date(registro.startTime).getTime();
            if (!isNaN(inicio)) {
              const transcurrido = Math.floor((Date.now() - inicio) / 1000);
              const restante = duracionTotal - transcurrido;
              setSegundosSeed(Math.max(0, restante));
            }
          }
          // Si no hay borrador local pero la DB tiene respuestas, adoptarlas.
          // Cubre: cambio de dispositivo, limpieza de navegador, otro dispositivo.
          if (registro?.respuestas && Object.keys(respuestasRef.current).length === 0) {
            const deDB = {};
            Object.entries(registro.respuestas).forEach(([pid, r]) => {
              deDB[pid] = r && typeof r === 'object' && 'valor' in r ? r.valor : r;
            });
            if (Object.keys(deDB).length > 0) {
              setRespuestas(deDB);
            }
          }
        })
        .catch((err) => {
          console.error('Error iniciando examen:', err);
          const msg = String(err?.message || '');
          if (msg.includes('Ya completaste')) {
            setBloqueadoPorRepetido(true);
            detener();
          } else if (msg.includes('no está activo')) {
            toastError('Este examen ya no está activo.');
            onSalir?.();
          } else if (msg.includes('no encontrado')) {
            toastError('Examen no encontrado.');
            onSalir?.();
          } else {
            // Error de conexión u otro: el examen continúa localmente.
            // Las respuestas se sincronizarán al reconectar (Firebase persistence).
            toastWarning('Sin conexión al servidor. Puedes seguir resolviendo; todo se sincronizará.');
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const draft = cargarBorrador();
    if (draft && Object.keys(draft).length > 0) {
      setRespuestas(draft);
      setBorradorRestaurado(true);
    }
  }, []);

  // Cleanup: cancelar timers pendientes de guardado remoto al desmontar.
  useEffect(() => {
    return () => {
      Object.values(remoteSaveTimers.current).forEach(clearTimeout);
      remoteSaveTimers.current = {};
    };
  }, []);

  // ── Advertencias de tiempo: avisar ANTES de cerrar, nunca expulsar en silencio ──
  const avisosTiempoRef = useRef({});
  useEffect(() => {
    if (statusExamen !== 'inicio' || modoDemo) return;
    const avisar = (clave, segundos, mensaje) => {
      if (!avisosTiempoRef.current[clave] && tiempoRestante <= segundos && tiempoRestante > 0) {
        avisosTiempoRef.current[clave] = true;
        toastWarning(mensaje);
      }
    };
    avisar('5min', 300, '⏰ Quedan 5 minutos de examen. Ve finalizando tus respuestas.');
    avisar('1min', 60, '⚠️ ÚLTIMO MINUTO. Al llegar a cero el examen se entrega automáticamente.');
  }, [tiempoRestante, statusExamen, modoDemo, toastWarning]);

  // Escritura remota con debounce: una petición a Firebase por cambio, no por
  // tecla (antes cada carácter de una pregunta abierta disparaba un write).
  // Offline-safe: si falla, se reintenta por la cola de examService.js.
  const remoteSaveTimers = useRef({});
  const guardarRemoto = useCallback(
    (preguntaId, valor) => {
      if (modoDemo) return;
      if (remoteSaveTimers.current[preguntaId]) clearTimeout(remoteSaveTimers.current[preguntaId]);
      remoteSaveTimers.current[preguntaId] = setTimeout(() => {
        guardarRespuesta(grado, examenId, estudiante.nie, preguntaId, valor).catch(() => {});
        delete remoteSaveTimers.current[preguntaId];
      }, 600);
    },
    [grado, examenId, estudiante.nie, modoDemo]
  );

  const handleRespuestaChange = useCallback(
    (preguntaId, valor) => {
      // Efectos FUERA del updater (impuro y se ejecuta doble en StrictMode)
      guardarBorradorDebounced({ ...respuestasRef.current, [preguntaId]: valor });
      guardarRemoto(preguntaId, valor);
      setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }));
    },
    [guardarBorradorDebounced, guardarRemoto]
  );

  const irAPregunta = (idx) => {
    if (idx < 0 || idx >= totalPreguntas) return;
    setPreguntaActual(idx);
  };

  const irASiguiente = () => {
    if (preguntaActual < totalPreguntas - 1) {
      setPreguntaActual(preguntaActual + 1);
    }
  };

  const irAAnterior = () => {
    if (preguntaActual > 0) {
      setPreguntaActual(preguntaActual - 1);
    }
  };

  const finalizar = async () => {
    // Guard: la finalización solo puede ejecutarse una vez (el temporizador,
    // el botón y los re-renders durante el proceso pueden invocarla varias veces).
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;
    detener();
    // Salir de pantalla completa SI sigue activa (la condición estaba invertida)
    if (document.fullscreenElement) {
      await salirFullscreen();
    }

    setStatusExamen('finalizando');

    if (!modoDemo) {
      let exito = false;
      try {
        // Batch save: enviar todas las respuestas de golpe antes de finalizar,
        // para que queden en la base aunque la conexión falle después.
        const todas = respuestasRef.current;
        if (todas && Object.keys(todas).length > 0) {
          await guardarRespuestasBatch(grado, examenId, estudiante.nie, todas);
        }
        await finalizarExamen(grado, examenId, estudiante.nie);
        exito = true;
      } catch (err) {
        console.error('Error finalizando examen:', err);
        // Si el batch save falló pero finalizarExamen sí pasó, aún marcamos éxito.
        // El batch se reintentará via cola offline la próxima vez que se escriba.
      }

      // Solo limpiar el borrador si la finalización fue exitosa.
      // Si falló, el borrador queda como respaldo local para reintentar.
      if (exito) limpiarBorrador();
    }

    setStatusExamen('completado');
    onFinalizar?.({ respuestas: respuestasRef.current, eventosProctoring: obtenerEventosProctoring(), resultadosParciales: null });
  };

  const handleSalir = () => {
    setShowConfirmExit(true);
  };

  const confirmarSalida = () => {
    setShowConfirmExit(false);
    onSalir?.();
  };

  const pregunta = preguntas[preguntaActual];
  const valorActual = respuestas[pregunta?.id] ?? null;
  const respondidasCount = preguntas.filter(
    (p) => _esRespondida(respuestas[p.id])
  ).length;
  const pendientesCount = totalPreguntas - respondidasCount;

  if (bloqueadoPorRepetido) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-10 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
            <i className="fas fa-circle-check text-2xl text-amber-400" />
          </div>
          <h2 className="text-lg font-black uppercase italic text-slate-100 mb-2">Examen ya realizado</h2>
          <p className="text-xs text-slate-400 font-bold italic leading-relaxed mb-6">
            Ya completaste este examen anteriormente. No es posible volver a realizarlo.
            Consulta tu resultado en la sección de notas.
          </p>
          <button
            onClick={() => onSalir?.()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition"
          >
            Volver a exámenes
          </button>
        </motion.div>
      </div>
    );
  }

  if (statusExamen === 'finalizando') {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <i className="fas fa-spinner fa-pulse text-3xl text-indigo-400" />
            <span className="text-lg font-black uppercase">
              Finalizando examen...
            </span>
          </div>
          <p className="text-sm font-bold italic text-slate-300">
            Guardando resultados...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 text-slate-200 overflow-y-auto overflow-x-hidden select-none"
      onCopy={(e) => CONFIG_PROCTORING.bloquearCopiar && e.preventDefault()}
      onPaste={(e) => CONFIG_PROCTORING.bloquearPegar && e.preventDefault()}
      onCut={(e) => CONFIG_PROCTORING.bloquearCortar && e.preventDefault()}
      onContextMenu={(e) => CONFIG_PROCTORING.bloquearContextMenu && e.preventDefault()}
    >
        <SecurityOverlay
          activo={pantallaCompletaSoportada && CONFIG_PROCTORING.fullscreen && !fullscreenDesbloqueado}
        tiempoPenalizacion={tiempoPenalizacion}
        status={statusProctoring}
        onFullscreenRequest={solicitarFullscreen}
        onRetryFullscreen={solicitarFullscreen}
      />

      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={estudiante.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(estudiante.nombres)}&background=6366f1&color=fff&size=48`}
                alt={estudiante.nombres}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-black text-xs uppercase italic text-slate-100 truncate">
                  {estudiante.apellidos}, {estudiante.nombres}
                </p>
                <p className="text-[8px] text-slate-500 uppercase font-bold italic">
                  {grado} · NIE {estudiante.nie}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase px-3 py-1.5 rounded-full bg-slate-950/70 border border-slate-800">
              <i className={`fas ${ICONO_STATUS[statusProctoring] || 'fa-circle-check'} ${COLOR_STATUS[statusProctoring] || 'text-emerald-400'}`} />
              <span className={COLOR_TEXTO_STATUS[statusProctoring] || 'text-emerald-400'}>
                Integridad: {LABEL_STATUS[statusProctoring] || 'Normal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Control de Zoom accesible e intuitivo */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-xl text-[9px] font-black uppercase text-slate-400">
              <span className="text-[8px] text-slate-500 mr-1 hidden md:inline"><i className="fas fa-magnifying-glass mr-1" />Zoom</span>
              <button
                type="button"
                onClick={reducirZoom}
                disabled={zoomNivel <= 80}
                title="Reducir tamaño del texto"
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs transition"
              >
                A-
              </button>
              <button
                type="button"
                onClick={resetZoom}
                title="Restablecer tamaño normal (100%)"
                className="px-1.5 py-0.5 rounded text-[9px] font-mono text-indigo-300 hover:text-white transition"
              >
                {zoomNivel}%
              </button>
              <button
                type="button"
                onClick={aumentarZoom}
                disabled={zoomNivel >= 130}
                title="Aumentar tamaño del texto"
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs transition"
              >
                A+
              </button>
            </div>

            {guardandoDraft && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[9px] font-black uppercase text-amber-400 italic hidden sm:inline"
              >
                <i className="fas fa-save animate-pulse mr-1" /> Auto-guardando...
              </motion.span>
            )}
            <CircularTimer tiempoRestante={tiempoRestante} tiempoTotal={duracionTotal} tamano={80} />

            <button
              onClick={handleSalir}
              className="text-[9px] font-black uppercase text-rose-400 tracking-widest hover:text-rose-300 transition border border-rose-500/20 py-2 px-3 rounded-xl hover:bg-rose-500/10"
            >
              <i className="fas fa-door-open mr-1" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-40" style={{ zoom: `${zoomNivel}%` }}>
        {/* Banner de estado offline: el estudiante ve que sus respuestas se guardan localmente */}
        <OfflineBanner />

        {/* Advertencia persistente de tiempo restante */}
        {statusExamen === 'inicio' && tiempoRestante <= 300 && tiempoRestante > 0 && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 border text-center font-black uppercase italic tracking-widest text-[10px] ${
              tiempoRestante <= 60
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 animate-pulse'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            }`}
          >
            <i className="far fa-clock mr-2" />
            {tiempoRestante <= 60
              ? `¡ÚLTIMOS ${Math.ceil(tiempoRestante)} SEGUNDOS! Se entregará automáticamente`
              : `Quedan ${Math.ceil(tiempoRestante / 60)} minuto(s) — el examen se entrega solo al agotarse el tiempo`}
          </div>
        )}

        {/* Aviso de reanudación: se descarta solo al avanzar de pregunta */}
        <AnimatePresence>
          {borradorRestaurado && (
            <motion.div
              key="borrador-restaurado"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-3 bg-sky-500/10 border border-sky-500/30 text-sky-200 rounded-2xl px-4 py-3"
            >
              <i className="fas fa-clock-rotate-left text-sm shrink-0" />
              <p className="flex-1 text-[10px] font-bold italic leading-relaxed">
                Recuperamos tus respuestas guardadas en este dispositivo.
                Continúa donde te quedaste.
              </p>
              <button
                onClick={() => setBorradorRestaurado(false)}
                className="text-slate-400 hover:text-white text-xs px-2"
                aria-label="Descartar aviso"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Encabezado del examen + avance general */}
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black italic uppercase text-slate-100 mb-1.5">
              {examen.titulo}
            </h1>
            <p className="text-[10px] font-bold uppercase text-slate-500 italic tracking-widest">
              Pregunta {preguntaActual + 1} de {totalPreguntas}
            </p>
          </div>

          <div className="flex-1 min-w-[180px] max-w-xs">
            <div className="flex items-center justify-between text-[8px] font-black uppercase italic text-slate-500 tracking-widest mb-1">
              <span>Avance</span>
              <span>{respondidasCount}/{totalPreguntas}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${totalPreguntas ? (respondidasCount / totalPreguntas) * 100 : 0}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Tarjeta de pregunta activa con transición animada */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pregunta?.id || preguntaActual}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {pregunta && (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[8px] font-black uppercase italic tracking-widest">
                    Pregunta {preguntaActual + 1}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[8px] font-black uppercase italic tracking-widest">
                    <i className="fas fa-star text-amber-400 mr-1" />
                    {pregunta.puntaje || 1} pts
                  </span>
                  {valorActual !== null && valorActual !== undefined && valorActual !== '' && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[8px] font-black uppercase italic tracking-widest"
                    >
                      <i className="fas fa-check mr-1" /> Respondida
                    </motion.span>
                  )}
                </div>
                <QuestionRenderer
                  key={pregunta.id}
                  pregunta={pregunta}
                  valor={valorActual}
                  onChange={(valor) => handleRespuestaChange(pregunta.id, valor)}
                  indice={preguntaActual + 1}
                  handlersTexto={handlersMemo}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navegación inferior fija (encima de la barra de progreso) */}
        <div className="fixed bottom-28 left-0 right-0 z-20 px-4 pointer-events-none">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl p-3 shadow-2xl shadow-black/50 pointer-events-auto">
            <button
              onClick={() => _cfg.permitirNavegacion && irAAnterior()}
              disabled={preguntaActual === 0 || !_cfg.permitirNavegacion}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
                preguntaActual === 0
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95'
              }`}
            >
              <i className="fas fa-chevron-left" /> Anterior
            </button>

            {preguntaActual < totalPreguntas - 1 ? (
              <button
                onClick={() => _cfg.permitirNavegacion && irASiguiente()}
                disabled={!_cfg.permitirNavegacion}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition"
              >
                Siguiente <i className="fas fa-chevron-right" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmFinish(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition"
              >
                <i className="fas fa-flag-checkered" /> Entregar
              </button>
            )}
          </div>
        </div>
      </main>

      <ProgressBar
        preguntaActual={preguntaActual}
        totalPreguntas={totalPreguntas}
        respuestas={respuestas}
        preguntas={preguntas}
        onNavegar={irAPregunta}
        permitirNavegacion={_cfg.permitirNavegacion}
      />

      <AnimatePresence>
        {showConfirmFinish && (
          <motion.div
            key="confirm-finish"
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="bg-slate-900 p-8 rounded-[2rem] border border-slate-700 shadow-2xl max-w-md w-full text-center"
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                pendientesCount > 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'
              }`}>
                <i className={`fas ${pendientesCount > 0 ? 'fa-triangle-exclamation text-amber-400' : 'fa-flag-checkered text-emerald-400'} text-2xl`} />
              </div>
              <h3 className="font-black uppercase text-lg text-slate-100 italic mb-2">
                {pendientesCount > 0 ? 'Tienes preguntas sin responder' : '¿Entregar examen?'}
              </h3>
              <p className="text-xs font-bold italic text-slate-400 mb-5">
                {respondidasCount} de {totalPreguntas} respondidas
                {pendientesCount > 0 && ` · ${pendientesCount} quedarán sin responder`}
                . Una vez entregado no podrás volver a entrar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmFinish(false)}
                  className="flex-1 bg-slate-800 text-slate-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 active:scale-95 transition"
                >
                  Seguir resolviendo
                </button>
                <button
                  onClick={() => {
                    setShowConfirmFinish(false);
                    finalizar();
                  }}
                  className={`flex-1 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition ${
                    pendientesCount > 0
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  Entregar ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmExit && (
          <motion.div
            key="confirm-exit"
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
                <i className="fas fa-question text-2xl text-rose-400" />
              </div>
              <h3 className="font-black uppercase text-xl text-slate-100 italic mb-4">
                ¿Guardar y salir?
              </h3>
              <p className="text-sm font-bold italic text-slate-300 mb-6">
                Tus respuestas se guardarán como borrador. Puedes retomar el examen más tarde.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmExit(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarSalida}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition"
                >
                  Guardar y salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hayBorrador && (
          <motion.div
            key="draft-indicator"
            className="fixed bottom-6 right-6 z-30"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-save" /> Borrador guardado
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ICONO_STATUS = {
  normal: 'fa-shield-halved',
  warning: 'fa-exclamation-triangle',
  suspicion: 'fa-shield-halved',
};

const COLOR_STATUS = {
  normal: 'text-emerald-400',
  warning: 'text-amber-400',
  suspicion: 'text-rose-400',
};

const COLOR_TEXTO_STATUS = {
  normal: 'text-emerald-400',
  warning: 'text-amber-400',
  suspicion: 'text-rose-400',
};

const LABEL_STATUS = {
  normal: 'Normal',
  warning: 'Advertencia',
  suspicion: 'Sospecha de fraude',
};

// ─── Banner de estado de conexión ─────────────────────────────────────────────
function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="mb-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/40 text-amber-200 rounded-2xl px-4 py-3 animate-pulse">
      <i className="fas fa-wifi-slash text-sm shrink-0" />
      <p className="flex-1 text-[10px] font-bold italic leading-relaxed">
        Sin conexión. Tus respuestas se guardan localmente y se sincronizarán al reconectar.
      </p>
    </div>
  );
}
