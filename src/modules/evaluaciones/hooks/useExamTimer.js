import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG_TIEMPO } from '../constants';

/**
 * Temporizador de examen anclado a fecha absoluta (Date.now):
 * - No se ralentiza con la pestaña en segundo plano (sin deriva).
 * - Acepta `segundosIniciales` para reanudar desde el startTime guardado
 *   en la base de datos: refrescar la página NO regala tiempo extra.
 * - onComplete se dispara UNA sola vez al llegar a cero.
 */
export function useExamTimer({
  duracionMinutos = 60,
  preguntas = [],
  onComplete,
  onTick,
  segundosIniciales,
}) {
  const totalPorDefecto = duracionMinutos * 60;
  const [tiempoRestante, setTiempoRestante] = useState(totalPorDefecto);
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState(CONFIG_TIEMPO.segundosPorPregunta);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [activoTiempoPregunta, setActivoTiempoPregunta] = useState(false);
  const intervaloPreguntaRef = useRef(null);
  const finalizadoRef = useRef(false);
  const ancladoRef = useRef(false);
  const deadlineRef = useRef(Date.now() + totalPorDefecto * 1000);

  // Referencias estables a los callbacks
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  // Anclaje único cuando llega el tiempo restante real (reanudación desde DB).
  useEffect(() => {
    if (ancladoRef.current || !Number.isFinite(segundosIniciales)) return;
    ancladoRef.current = true;
    const s = Math.max(0, Math.floor(segundosIniciales));
    deadlineRef.current = Date.now() + s * 1000;
    setTiempoRestante(s);
  }, [segundosIniciales]);

  useEffect(() => {
    const id = setInterval(() => {
      const restante = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTiempoRestante((prev) => (prev === restante ? prev : restante));
      onTickRef.current?.(restante);
      if (restante <= 0 && !finalizadoRef.current) {
        finalizadoRef.current = true;
        onCompleteRef.current?.();
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const irAPregunta = useCallback((idx) => {
    if (idx < 0 || idx >= preguntas.length) return;
    setPreguntaActual(idx);
    if (activoTiempoPregunta) {
      setTiempoPorPregunta(CONFIG_TIEMPO.segundosPorPregunta);
    }
  }, [preguntas.length, activoTiempoPregunta]);

  const siguiente = useCallback(() => {
    if (preguntaActual < preguntas.length - 1) {
      irAPregunta(preguntaActual + 1);
    }
  }, [preguntaActual, preguntas.length, irAPregunta]);

  const anterior = useCallback(() => {
    if (preguntaActual > 0) {
      irAPregunta(preguntaActual - 1);
    }
  }, [preguntaActual, irAPregunta]);

  const preguntaActualRef = useRef(0);
  preguntaActualRef.current = preguntaActual;

  const preguntasLenRef = useRef(preguntas.length);
  preguntasLenRef.current = preguntas.length;

  useEffect(() => {
    if (!activoTiempoPregunta) return;

    intervaloPreguntaRef.current = setInterval(() => {
      setTiempoPorPregunta((prev) => {
        if (prev <= 1) {
          // Auto-advance: if not last question, advance; otherwise just reset
          const actual = preguntaActualRef.current;
          const total = preguntasLenRef.current;
          if (actual < total - 1) {
            setPreguntaActual(actual + 1);
          }
          return CONFIG_TIEMPO.segundosPorPregunta;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervaloPreguntaRef.current);
  }, [activoTiempoPregunta]);

  const formatearTiempo = (segundos) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const porcentajeTranscurrido =
    ((duracionMinutos * 60 - tiempoRestante) / (duracionMinutos * 60)) * 100;

  const detener = useCallback(() => {
    finalizadoRef.current = true;
    if (intervaloPreguntaRef.current) clearInterval(intervaloPreguntaRef.current);
  }, []);

  return {
    tiempoRestante,
    tiempoFormateado: formatearTiempo(tiempoRestante),
    tiempoPorPregunta,
    tiempoPreguntaFormateado: formatearTiempo(tiempoPorPregunta),
    preguntaActual,
    irAPregunta,
    siguiente,
    anterior,
    activoTiempoPregunta,
    setActivoTiempoPregunta,
    porcentajeTranscurrido,
    detener,
  };
}
