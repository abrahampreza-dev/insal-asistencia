import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecurityOverlay({
  activo,
  tiempoPenalizacion,
  onFullscreenRequest,
  _status,
  onRetryFullscreen,
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [contadorRetry, setContadorRetry] = useState(0);

  useEffect(() => {
    if (activo) {
      const timer = setTimeout(() => setShowPrompt(true), 500);
      return () => clearTimeout(timer);
    }
    setShowPrompt(false);
    setContadorRetry(0);
  }, [activo]);

  const requestFullscreen = useCallback(async () => {
    const success = await onFullscreenRequest?.();
    if (success) {
      setShowPrompt(false);
    } else {
      setContadorRetry((prev) => prev + 1);
    }
  }, [onFullscreenRequest]);

  const retry = useCallback(async () => {
    const success = await onRetryFullscreen?.();
    if (success) {
      setShowPrompt(false);
      setContadorRetry(0);
    } else {
      setContadorRetry((prev) => prev + 1);
    }
  }, [onRetryFullscreen]);

  return (
    <AnimatePresence>
      {activo && (
        <motion.div
          key="security-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />

          <AnimatePresence>
            {showPrompt && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="relative bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl max-w-md w-full mx-4 text-center z-10"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <i className="fas fa-expand text-2xl text-indigo-400" />
                </div>

                <h3 className="text-xl font-black uppercase italic text-slate-100 mb-4">
                  Modo Pantalla Completa
                </h3>

                <p className="text-sm font-bold italic text-slate-300 mb-6">
                  Para garantizar la integridad del examen, debes activar el modo
                  pantalla completa. No podrás cambiar de ventana ni pestaña durante
                  la aplicación.
                </p>

                <button
                  onClick={requestFullscreen}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition mb-3 flex items-center justify-center gap-2"
                >
                  <i className="fas fa-expand" />
                  Activar pantalla completa
                </button>

                {contadorRetry > 0 && (
                  <button
                    onClick={retry}
                    className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-redo" />
                    Reintentar ({contadorRetry})
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {tiempoPenalizacion > 0 && (
            <motion.div
              key="countdown-penalty"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="fixed inset-0 bg-rose-950/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <div className="text-center text-white">
                <motion.span
                  key={tiempoPenalizacion}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="text-8xl font-black"
                >
                  {tiempoPenalizacion}
                </motion.span>
                <p className="text-sm font-bold uppercase mt-4">
                  Penalización por salir de pantalla completa
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
