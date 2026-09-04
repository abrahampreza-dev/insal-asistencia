import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WARNING_MESSAGES = {
  warning: {
    titulo: 'Advertencia de Conducta',
    icono: 'fa-exclamation-triangle',
    color: 'amber',
    mensajes: [
      'Se detectó un cambio de ventana o pestaña. Por favor, mantén el enfoque en el examen.',
      'Se bloquearon acciones de copiar/pegar. Usa tu conocimiento propio.',
      'Se detectó salida de pantalla completa. Vuelve a activar el modo pantalla completa.',
      'No se permite el uso del menú contextual durante el examen.',
    ],
  },
  suspicion: {
    titulo: 'Alerta de Integridad Académica',
    icono: 'fa-shield-halved',
    color: 'rose',
    mensajes: [
      'SE DETECTÓ POSIBLE FRAUDE. Se han registrado múltiples infracciones.',
      'Tu respuesta será revisada por el docente. Cualquier evidencia de copia será sancionada.',
      'Continuar con este comportamiento podrá resultar en la anulación del examen.',
    ],
  },
};

export default function BehavioralWarning({
  incidentes,
  nivel,
  onCerrar,
  onClose,
  generarAdvertenciaIA,
}) {
  const [abierto, setAbierto] = useState(false);
  const [mensajePersonalizado, setMensajePersonalizado] = useState(null);
  const [cargandoIA, setCargandoIA] = useState(false);

  const config = WARNING_MESSAGES[nivel] || WARNING_MESSAGES.warning;

  useEffect(() => {
    if (Array.isArray(incidentes) && incidentes.length > 0) {
      setAbierto(true);
      generarMensajeAdecuado();
    }
  }, [incidentes, nivel, generarMensajeAdecuado]);

  const generarMensajeAdecuado = useCallback(async () => {
    if (generarAdvertenciaIA) {
      setCargandoIA(true);
      try {
        const mensaje = await generarAdvertenciaIA({
          incidentes: incidentes.slice(-5),
          nivel,
        });
        setMensajePersonalizado(mensaje);
      } catch (err) {
        console.error('Error generando advertencia IA:', err);
      } finally {
        setCargandoIA(false);
      }
    }
  }, [incidentes, nivel, generarAdvertenciaIA]);

  const handleClose = () => {
    setAbierto(false);
    onClose?.();
    onCerrar?.();
  };

  // El mensaje siempre se muestra desde el primer instante: local first,
  // IA como mejora opcional que puede llegar después. Botón SIEMPRE habilitado.
  const mensajeBase = mensajePersonalizado?.mensaje
    || config.mensajes[Math.floor(Math.random() * config.mensajes.length)];  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="warning-overlay"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            key="warning-card"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            className={`max-w-lg w-full bg-slate-900 border rounded-[2rem] shadow-2xl overflow-hidden ${
              config.color === 'amber'
                ? 'border-amber-500/30'
                : 'border-rose-500/30'
            }`}
          >
            <div className={`p-6 flex items-center gap-4 ${
              config.color === 'amber'
                ? 'bg-amber-500/10'
                : 'bg-rose-500/10'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                config.color === 'amber'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                <i className={`fas ${config.icono} text-xl`} />
              </div>
              <div>
                <h3 className={`font-black uppercase text-lg ${
                  config.color === 'amber' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {mensajePersonalizado?.titulo || config.titulo}
                </h3>
                <p className="text-[9px] font-black uppercase text-slate-500 italic tracking-widest">
                  Incidente #{incidentes.length}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-bold italic text-slate-300 leading-relaxed">
                {mensajeBase}
              </p>

              {incidentes.slice(-3).map((inc, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-slate-800/50 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase text-slate-500 italic">
                      {inc.tipo || 'Incidente'}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${
                      inc.severidad === 'warning'
                        ? 'bg-amber-500/10 text-amber-400'
                        : inc.severidad === 'suspicion'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      {inc.severidad || 'normal'}
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-400 font-bold italic">
                    {new Date(inc.timestamp || Date.now()).toLocaleTimeString('es-SV')}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleClose}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
                  config.color === 'amber'
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                }`}
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
