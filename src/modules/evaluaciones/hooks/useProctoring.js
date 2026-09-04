import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG_PROCTORING } from '../constants';

export const NIVEL_INFRACCION = {
  NORMAL: 'normal',
  ADVERTENCIA: 'warning',
  SOSPECHA: 'suspicion',
};

// Throttle: evitar que el mismo tipo de evento se registre múltiples veces
// en un corto período (evita incidentes fantasma por ráfagas de eventos).
const THROTTLE_MS = 1500;
const _ultimoEventoTipo = {};

function _registrarEvento(refEventos, tipo, detalles = {}) {
  if (!refEventos.current) return;

  // Throttle por tipo: ignorar si el mismo tipo se disparó hace menos de THROTTLE_MS
  const ahora = Date.now();
  if (_ultimoEventoTipo[tipo] && ahora - _ultimoEventoTipo[tipo] < THROTTLE_MS) {
    return null;
  }
  _ultimoEventoTipo[tipo] = ahora;

  const evento = {
    id: `${tipo}-${ahora}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    timestamp: new Date().toISOString(),
    detalles,
  };
  refEventos.current.push(evento);
  return evento;
}

/**
 * Supervisión anti-trampa JUSTA:
 * - blur_window solo cuenta cuando la VENTANA pierde el foco real
 *   (cambiar de app/ventana), nunca al navegar entre campos del examen.
 * - visibility_change solo cuenta al OCULTAR la pestaña, no al volver.
 * - Tab se registra pero no escala (es navegación accesible legítima).
 * Los callbacks van por refs: los listeners no se reconectan en cada render.
 */
export function useProctoring({ nie, examenId, grado, onEventoDetectado, onStatusChange }) {
  const [eventos, setEventos] = useState([]);
  const [status, setStatus] = useState(NIVEL_INFRACCION.NORMAL);
  const [penalizacionActiva, setPenalizacionActiva] = useState(false);
  const [tiempoPenalizacion, setTiempoPenalizacion] = useState(0);
  const [fullscreenDesbloqueado, setFullscreenDesbloqueado] = useState(false);
  const [salidasFullscreen, setSalidasFullscreen] = useState(0);

  const eventosRef = useRef([]);
  const contadorAdvertenciasRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const salidasRef = useRef(0);

  // Refs estables a callbacks: evita reconectar todos los listeners cada segundo.
  const onEventoRef = useRef(onEventoDetectado);
  const onStatusRef = useRef(onStatusChange);
  useEffect(() => {
    onEventoRef.current = onEventoDetectado;
    onStatusRef.current = onStatusChange;
  }, [onEventoDetectado, onStatusChange]);

  const emitir = useCallback((evento) => {
    if (!evento) return;
    setEventos((prev) => [...prev, evento]);
    onEventoRef.current?.(evento);
  }, []);

  const escalarPorInfraccion = useCallback(() => {
    contadorAdvertenciasRef.current += 1;
    const nuevo =
      contadorAdvertenciasRef.current >= 2 ? NIVEL_INFRACCION.SOSPECHA : NIVEL_INFRACCION.ADVERTENCIA;
    setStatus(nuevo);
    onStatusRef.current?.(nuevo);
    return nuevo;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleBlur = () => {
      if (document.hasFocus()) return;
      const evento = _registrarEvento(eventosRef, 'blur_window', {});
      if (evento) { emitir(evento); escalarPorInfraccion(); }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      const evento = _registrarEvento(eventosRef, 'visibility_change', {});
      if (evento) { emitir(evento); escalarPorInfraccion(); }
    };

    const handleKeyDown = (e) => {
      // Permitir zoom del navegador / sistema de forma transparente sin bloquear ni penalizar
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', '_'].includes(e.key)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const evento = _registrarEvento(eventosRef, 'tecla_bloqueada', {
          combinacion: `${e.ctrlKey || e.metaKey ? 'ctrl/cmd' : ''}+${e.key}`,
        });
        if (evento) emitir(evento);
        return;
      }
      if (e.key === 'Tab') {
        const evento = _registrarEvento(eventosRef, 'tab_switch', {});
        if (evento) emitir(evento);
      }
    };

    function handleCopy(e) {
      if (CONFIG_PROCTORING.bloquearCopiar) e.preventDefault();
      const evento = _registrarEvento(eventosRef, 'copy_bloqueado', {});
      if (evento) emitir(evento);
    }

    function handlePaste(e) {
      if (CONFIG_PROCTORING.bloquearPegar) e.preventDefault();
      const evento = _registrarEvento(eventosRef, 'paste_bloqueado', {});
      if (evento) { emitir(evento); escalarPorInfraccion(); }
    }

    function handleCut(e) {
      if (CONFIG_PROCTORING.bloquearCortar) e.preventDefault();
      const evento = _registrarEvento(eventosRef, 'cut_bloqueado', {});
      if (evento) emitir(evento);
    }

    function handleContextMenu(e) {
      if (CONFIG_PROCTORING.bloquearContextMenu) e.preventDefault();
      const evento = _registrarEvento(eventosRef, 'context_menu_bloqueado', {});
      if (evento) emitir(evento);
    }

    function handleFullscreenChange() {
      const soportado = !!document.documentElement.requestFullscreen;
      if (!soportado) {
        setFullscreenDesbloqueado(true);
        return;
      }
      const esFullscreen = !!document.fullscreenElement;
      if (!esFullscreen && CONFIG_PROCTORING.fullscreen) {
        salidasRef.current += 1;
        const nuevaSalida = salidasRef.current;
        setSalidasFullscreen(nuevaSalida);
        const evento = _registrarEvento(eventosRef, 'exit_fullscreen', { salidas: nuevaSalida });
        if (evento) {
          emitir(evento);
          const nuevoStatus = escalarPorInfraccion();
          if (
            nuevoStatus === NIVEL_INFRACCION.SOSPECHA ||
            nuevaSalida >= CONTADOR_FULLSCREEN_PENALIZACION
          ) {
            setPenalizacionActiva(true);
            setTiempoPenalizacion(CONFIG_PROCTORING.penalizacionTimeout);
          }
        }
      } else if (esFullscreen) {
        setFullscreenDesbloqueado(true);
      }
    }

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Limpiar throttle map para evitar memory leak entre sesiones
      Object.keys(_ultimoEventoTipo).forEach((k) => delete _ultimoEventoTipo[k]);
    };
  }, [emitir, escalarPorInfraccion]);

  useEffect(() => {
    if (!penalizacionActiva) return;

    timerIntervalRef.current = setInterval(() => {
      setTiempoPenalizacion((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setPenalizacionActiva(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [penalizacionActiva]);

  const solicitarFullscreen = useCallback(async () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        setFullscreenDesbloqueado(true);
        return true;
      } catch (err) {
        console.error('No se pudo activar fullscreen:', err);
        setFullscreenDesbloqueado(false);
        return false;
      }
    }
    return true;
  }, []);

  const salirFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('No se pudo salir de fullscreen:', err);
      }
    }
  }, []);

  const resetearContador = useCallback(() => {
    contadorAdvertenciasRef.current = 0;
    setStatus(NIVEL_INFRACCION.NORMAL);
    onStatusRef.current?.(NIVEL_INFRACCION.NORMAL);
    setPenalizacionActiva(false);
    setTiempoPenalizacion(0);
  }, []);

  const eventosAcumulados = useCallback(() => eventosRef.current, []);

  return {
    status,
    eventos,
    eventosRef: eventosAcumulados,
    penalizacionActiva,
    tiempoPenalizacion,
    fullscreenDesbloqueado,
    salidasFullscreen,
    contadorAdvertencias: contadorAdvertenciasRef.current,
    solicitarFullscreen,
    salirFullscreen,
    resetearContador,
    NIVEL_INFRACCION,
  };
}

const CONTADOR_FULLSCREEN_PENALIZACION = 3;
