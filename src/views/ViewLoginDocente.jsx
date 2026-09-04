import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

export default function ViewLoginDocente() {
  const { loginDocente, cargandoDocente, errorDocente, limpiarErrorDocente } = useAuth();
  const [cargando, setCargando] = useState(false);

  async function handleLogin() {
    if (cargando || cargandoDocente) return;
    limpiarErrorDocente();
    setCargando(true);
    
    try {
      await loginDocente();
    } catch (error) {
      console.error("Error al autenticar con Google:", error);
    } finally {
      setCargando(false);
    }
  }

  const ocupado = cargando || cargandoDocente;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Card principal */}
        <motion.div
          className="relative overflow-hidden rounded-[2.5rem] border border-slate-700/60 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Glow decorativo */}
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)' }}
          />

          <div className="relative z-10 p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-5">
                <img
                  src={logo}
                  alt="INSAL"
                  className="w-16 h-16 object-contain drop-shadow-xl"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 border-2 border-slate-900 flex items-center justify-center">
                  <i className="fas fa-chalkboard text-[8px] text-white" />
                </div>
              </div>

              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-1">
                Instituto Nacional San Luis
              </p>
              <h1 className="text-2xl font-black italic uppercase text-slate-100 tracking-tight">
                Área <span className="text-indigo-400">Docente</span>
              </h1>
              <p className="text-xs text-slate-400 font-bold italic mt-2">
                Acceso exclusivo para personal académico
              </p>
            </div>

            {/* Dominio badge */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full">
                <i className="fas fa-shield-halved text-indigo-400 text-[10px]" />
                <span className="text-[10px] font-black text-indigo-300 tracking-wider">
                  Solo cuentas @clases.edu.sv
                </span>
              </div>
            </div>

            {/* Error con AnimatePresence */}
            <AnimatePresence mode="wait">
              {errorDocente && (
                <motion.div
                  className="mb-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <i className="fas fa-triangle-exclamation text-rose-400 text-sm mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-rose-300 tracking-wider mb-0.5">
                      Acceso denegado
                    </p>
                    <p className="text-[11px] text-rose-200 font-bold italic">{errorDocente}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón Google */}
            <motion.button
              id="btn-login-docente-google"
              onClick={handleLogin}
              disabled={ocupado}
              className="group w-full relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              style={{
                background: ocupado
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                color: ocupado ? '#94a3b8' : '#0f172a',
                boxShadow: ocupado ? 'none' : '0 8px 32px rgba(99,102,241,0.25)',
              }}
              whileHover={{ scale: ocupado ? 1 : 1.01 }}
              whileTap={{ scale: ocupado ? 1 : 0.98 }}
            >
              {!ocupado && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)' }}
                />
              )}

              <div className="relative z-10 flex items-center gap-3">
                {ocupado ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5 text-indigo-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-slate-400">Autenticando…</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continuar con Google</span>
                  </>
                )}
              </div>
            </motion.button>

            {/* Info footer */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icono: 'fa-lock', label: 'Sesión segura' },
                  { icono: 'fa-clock-rotate-left', label: 'Bitácora activa' },
                  { icono: 'fa-building-columns', label: 'Uso institucional' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
                      <i className={`fas ${item.icono} text-[10px] text-indigo-400`} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer externo */}
        <motion.p
          className="text-center text-[9px] font-bold text-slate-600 italic mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          Asistencias y Evaluaciones INSAL • Desarrollado por{' '}
          <span className="text-indigo-500">AE Preza Group</span>
        </motion.p>
      </motion.div>
    </div>
  );
}