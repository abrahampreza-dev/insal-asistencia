import { useState, useRef, useCallback } from 'react';

const UMBRAL_PEGADO_RAPIDO_MS = 1500;
const UMBRAL_INSERCION_MASIVA_CARACTERES = 50;
const UMBRAL_INSERCION_MASIVA_MS = 100;

export function useTextInputAnalysis({ onAnomaliaDetectada }) {
  const [anomalias, setAnomalias] = useState([]);
  const ultimaEntradaRef = useRef(0);
  const bufferAnomaliasRef = useRef([]);
  // Throttle: evitar repetir el mismo tipo de evento en menos de 2 segundos
  const ultimoEventoTipoRef = useRef({});

  const registerEvento = useCallback((evento) => {
    const ahora = Date.now();
    const key = evento.tipo;
    if (ultimoEventoTipoRef.current[key] && ahora - ultimoEventoTipoRef.current[key] < 2000) {
      return;
    }
    ultimoEventoTipoRef.current[key] = ahora;

    bufferAnomaliasRef.current.push(evento);
    setAnomalias((prev) => [...prev, evento]);
    onAnomaliaDetectada?.(evento);
  }, [onAnomaliaDetectada]);

  const analizarPaste = useCallback((textoPegado, target) => {
    const ahora = Date.now();
    const desdeUltima = ahora - ultimaEntradaRef.current;
    ultimaEntradaRef.current = ahora;

    const eventos = [];

    if (desdeUltima < UMBRAL_PEGADO_RAPIDO_MS) {
      const evento = {
        tipo: 'paste_rapido',
        severidad: 'warning',
        detalles: {
          intervaloMs: desdeUltima,
          longitud: textoPegado?.length || 0,
        },
        timestamp: new Date().toISOString(),
      };
      eventos.push(evento);
      registerEvento(evento);
    }

    if (textoPegado && textoPegado.length > UMBRAL_INSERCION_MASIVA_CARACTERES) {
      const evento = {
        tipo: 'insercion_masiva',
        severidad: 'warning',
        detalles: {
          caracteres: textoPegado.length,
          fragmento: textoPegado.slice(0, 100),
        },
        timestamp: new Date().toISOString(),
      };
      eventos.push(evento);
      registerEvento(evento);
    }

    return eventos;
  }, [registerEvento]);

  const analizarInput = useCallback((e) => {
    const target = e.target;
    const texto = target.value || '';
    const longitudSeleccion = target.selectionStart !== undefined
      ? Math.abs((target.value.length) - target.selectionStart)
      : 0;

    if (longitudSeleccion > UMBRAL_INSERCION_MASIVA_CARACTERES) {
      const evento = {
        tipo: 'insercion_masiva_input',
        severidad: 'warning',
        detalles: {
          longitudSeleccion,
          longitudTexto: texto.length,
        },
        timestamp: new Date().toISOString(),
      };
      registerEvento(evento);
    }

    if (texto.length > 0 && texto.length % 10 === 0) {
      const ahora = Date.now();
      const desdeUltima = ahora - ultimaEntradaRef.current;
      if (desdeUltima < UMBRAL_INSERCION_MASIVA_MS) {
        const evento = {
          tipo: 'escritura_rapida',
          severidad: 'normal',
          detalles: {
            caracteres: texto.length,
            intervaloMs: desdeUltima,
          },
          timestamp: new Date().toISOString(),
        };
        registerEvento(evento);
      }
    }

    ultimaEntradaRef.current = Date.now();
  }, [registerEvento]);

  const crearHandlers = useCallback((textareaRef) => {
    return {
      onPaste: (e) => {
        e.preventDefault();
        const texto = e.clipboardData?.getData('text') || '';
        analizarPaste(texto, textareaRef);
        return false;
      },
      onInput: (e) => {
        analizarInput(e);
      },
      onChange: (e) => {
        analizarInput(e);
      },
    };
  }, [analizarPaste, analizarInput]);

  const limpiar = useCallback(() => {
    bufferAnomaliasRef.current = [];
    setAnomalias([]);
  }, []);

  const getCountBySeverity = useCallback((severidad) => {
    return bufferAnomaliasRef.current.filter((a) => a.severidad === severidad).length;
  }, []);

  return {
    anomalias,
    crearHandlers,
    limpiar,
    getCountBySeverity,
    tieneAnomalias: anomalias.length > 0,
  };
}
