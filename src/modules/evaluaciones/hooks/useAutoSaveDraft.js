import { useState, useEffect, useCallback, useRef } from 'react';

const INTERVALO_AUTOGUARDADO = 5000;
const STORAGE_KEY_PREFIX = 'evaluacion_borrador_';
const MAX_EDAD_BORRADOR_MINUTOS = 60;

/**
 * Intenta limpiar borradores antiguos en localStorage si la memoria está llena.
 */
function limpiarBorradoresExpirados() {
  try {
    const ahora = Date.now();
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          const minutos = data.timestamp
            ? (ahora - new Date(data.timestamp).getTime()) / 60000
            : Infinity;
          if (minutos >= MAX_EDAD_BORRADOR_MINUTOS) {
            localStorage.removeItem(key);
          }
        }
      }
    });
  } catch (err) {
    console.error('Error al depurar memoria de borradores:', err);
  }
}

export function useAutoSaveDraft({ examenId, nie, respuestasIniciales, onDraftLoad, onDraftSave }) {
  const [guardando, setGuardando] = useState(false);
  const [ultimaGuardada, setUltimaGuardada] = useState(null);
  const [hayBorrador, setHayBorrador] = useState(false);

  const respuestasRef = useRef(respuestasIniciales || {});
  const debounceTimerRef = useRef(null);

  const onDraftSaveRef = useRef(onDraftSave);
  const onDraftLoadRef = useRef(onDraftLoad);

  useEffect(() => {
    onDraftSaveRef.current = onDraftSave;
    onDraftLoadRef.current = onDraftLoad;
  }, [onDraftSave, onDraftLoad]);

  const storageKey = `${STORAGE_KEY_PREFIX}${examenId}_${nie}`;

  const cargarBorrador = useCallback(() => {
    if (!examenId || !nie) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const borrador = JSON.parse(raw);
        setHayBorrador(true);
        setUltimaGuardada(borrador.timestamp);
        respuestasRef.current = borrador.respuestas || {};
        onDraftLoadRef.current?.(borrador.respuestas || {});
        return borrador.respuestas || {};
      }
    } catch (err) {
      console.error('Error cargando borrador:', err);
    }
    return {};
  }, [storageKey, examenId, nie]);

  const guardarBorrador = useCallback((respuestas) => {
    if (!respuestas || !examenId || !nie) return;

    respuestasRef.current = respuestas;
    setGuardando(true);

    const borrador = {
      examenId,
      nie,
      respuestas,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(borrador));
      setUltimaGuardada(borrador.timestamp);
      setHayBorrador(true);
      onDraftSaveRef.current?.(borrador);
    } catch (err) {
      // Manejo si el almacenamiento está lleno
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        console.warn('LocalStorage lleno. Depurando borradores antiguos...');
        limpiarBorradoresExpirados();
        try {
          localStorage.setItem(storageKey, JSON.stringify(borrador));
        } catch (retryErr) {
          console.error('No se pudo guardar el borrador tras depurar memoria:', retryErr);
        }
      } else {
        console.error('Error guardando borrador:', err);
      }
    } finally {
      setGuardando(false);
    }
  }, [examenId, nie, storageKey]);

  const guardarBorradorDebounced = useCallback((respuestas) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => guardarBorrador(respuestas), 1500);
  }, [guardarBorrador]);

  const limpiarBorrador = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHayBorrador(false);
      setUltimaGuardada(null);
      respuestasRef.current = {};
    } catch (err) {
      console.error('Error limpiando borrador:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!examenId || !nie) return;

    // Guardado automático periódico
    const intervalo = setInterval(() => {
      if (respuestasRef.current && Object.keys(respuestasRef.current).length > 0) {
        guardarBorrador(respuestasRef.current);
      }
    }, INTERVALO_AUTOGUARDADO);

    // Guardado inmediato al cerrar o recargar pestaña
    const handleBeforeUnload = () => {
      if (respuestasRef.current && Object.keys(respuestasRef.current).length > 0) {
        const borrador = {
          examenId,
          nie,
          respuestas: respuestasRef.current,
          timestamp: new Date().toISOString(),
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(borrador));
        } catch (err) {
          console.error('Error en autoguardado de salida:', err);
        }
      }
    };

    // En iOS y algunos navegadores, beforeunload no se dispara al cambiar de app.
    // pagehide + visibilitychange cubren esos casos.
    const handlePageHide = handleBeforeUnload;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleBeforeUnload();
    };

    // Sincronización si cambia en otra pestaña
    const handleStorageChange = (e) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          // Solo adoptar respuestas de otra pestaña si no tenemos borrador propio
          // (evita que pestaña B sobreescriba respuestas de pestaña A en progreso)
          if (!respuestasRef.current || Object.keys(respuestasRef.current).length === 0) {
            respuestasRef.current = data.respuestas || {};
          }
          setUltimaGuardada(data.timestamp);
          setHayBorrador(true);
        } catch (err) {
          console.error('Error sincronizando pestaña:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalo);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [examenId, nie, storageKey, guardarBorrador]);

  return {
    guardando,
    ultimaGuardada,
    hayBorrador,
    cargarBorrador,
    guardarBorrador,
    guardarBorradorDebounced,
    limpiarBorrador,
  };
}

export function useDraftRecovery(examenId, nie, onRecover) {
  const [borrador, setBorrador] = useState(null);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
  const onRecoverRef = useRef(onRecover);

  useEffect(() => {
    onRecoverRef.current = onRecover;
  }, [onRecover]);

  useEffect(() => {
    if (!examenId || !nie) return;
    const key = `${STORAGE_KEY_PREFIX}${examenId}_${nie}`;

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        const minutos = data.timestamp
          ? (Date.now() - new Date(data.timestamp).getTime()) / 60000
          : Infinity;

        if (minutos < MAX_EDAD_BORRADOR_MINUTOS) {
          setBorrador(data);
          setMostrarRecuperacion(true);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.error('Error recuperando borrador:', err);
    }
  }, [examenId, nie]);

  const recuperar = useCallback(() => {
    if (borrador && onRecoverRef.current) {
      onRecoverRef.current(borrador.respuestas || {});
    }
    setMostrarRecuperacion(false);
  }, [borrador]);

  const descartar = useCallback(() => {
    if (examenId && nie) {
      const key = `${STORAGE_KEY_PREFIX}${examenId}_${nie}`;
      localStorage.removeItem(key);
    }
    setMostrarRecuperacion(false);
    setBorrador(null);
  }, [examenId, nie]);

  return { borrador, mostrarRecuperacion, recuperar, descartar };
}