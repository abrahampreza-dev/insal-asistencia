import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const agregarToast = useCallback((mensaje, tipo = 'info', duracion = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duracion);
  }, []);

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastSuccess = useCallback((msg) => agregarToast(msg, 'exito'), [agregarToast]);
  const toastError = useCallback((msg) => agregarToast(msg, 'error'), [agregarToast]);
  const toastWarning = useCallback((msg) => agregarToast(msg, 'advertencia'), [agregarToast]);
  const toastInfo = useCallback((msg) => agregarToast(msg, 'info'), [agregarToast]);

  return (
    <ToastContext.Provider value={{ agregarToast, toastSuccess, toastError, toastWarning, toastInfo }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removerToast(t.id)}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all transform animate-bounce-short cursor-pointer ${
              t.tipo === 'exito'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-900/30'
                : t.tipo === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-900/30'
                : t.tipo === 'advertencia'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-amber-900/30'
                : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-100 shadow-indigo-900/30'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black ${
                t.tipo === 'exito'
                  ? 'bg-emerald-500 text-slate-950'
                  : t.tipo === 'error'
                  ? 'bg-rose-500 text-white'
                  : t.tipo === 'advertencia'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-indigo-500 text-white'
              }`}
            >
              {t.tipo === 'exito' ? '✓' : t.tipo === 'error' ? '✕' : t.tipo === 'advertencia' ? '!' : 'i'}
            </div>
            <div className="flex-1 text-[11px] font-bold leading-relaxed">{t.mensaje}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      agregarToast: () => {},
      toastSuccess: () => {},
      toastError: () => {},
      toastWarning: () => {},
      toastInfo: () => {},
    };
  }
  return ctx;
}
