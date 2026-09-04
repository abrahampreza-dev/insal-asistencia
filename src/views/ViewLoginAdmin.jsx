import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function ViewLoginAdmin() {
  const { loginAdmin } = useAuth();
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [shake, setShake] = useState(false);

  const timeoutRef = useRef(null);

  const triggerShake = () => {
    setShake(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShake(false), 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    if (!clave.trim()) { 
      setError('Ingresa la clave de administrador.'); 
      return; 
    }
    if (cargando) return;

    setCargando(true);
    setError('');

    try {
      const res = await loginAdmin(clave);
      if (!res?.ok) {
        setError(res?.error || 'Clave incorrecta. Verifica tus credenciales.');
        setIntentos((p) => p + 1);
        setClave('');
        triggerShake();
      }
    } catch (err) {
      setError('Error de conexión con el servidor. Intenta nuevamente.');
      triggerShake();
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          x: shake ? [-10, 10, -8, 8, -4, 4, 0] : 0 
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Card */}
        <motion.div
          className="relative overflow-hidden rounded-[2.5rem] border border-slate-700/50 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1a0a2e 50%, #0f172a 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Glow decorativo */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
          />

          <div className="relative z-10 p-9">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-5">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                  <i className="fas fa-shield-halved text-2xl text-violet-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-violet-600 border-2 border-slate-900 flex items-center justify-center">
                  <i className="fas fa-lock text-[7px] text-white" />
                </div>
              </div>

              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-400 mb-1">
                Acceso Restringido
              </p>
              <h1 className="text-2xl font-black italic uppercase text-slate-100 tracking-tight">
                Panel <span className="text-violet-400">Admin</span>
              </h1>
              <p className="text-xs text-slate-400 font-bold italic mt-2">
                Solo personal autorizado del sistema
              </p>
            </div>

            {/* Intentos fallidos */}
            <AnimatePresence mode="wait">
              {intentos >= 2 && (
                <motion.div
                  className="mb-5 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <i className="fas fa-triangle-exclamation text-amber-400 text-sm flex-shrink-0" />
                  <p className="text-[10px] font-black text-amber-300">
                    {intentos} {intentos === 1 ? 'intento fallido' : 'intentos fallidos'}. Verifica tu clave.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <i className="fas fa-key text-violet-400 text-xs" />
                </div>
                <input
                  id="input-clave-admin"
                  type={verClave ? 'text' : 'password'}
                  value={clave}
                  onChange={(e) => { setClave(e.target.value); setError(''); }}
                  placeholder="Clave de administrador"
                  autoComplete="current-password"
                  disabled={cargando}
                  className="w-full bg-slate-800/60 border border-slate-600/50 text-slate-100 placeholder-slate-500 text-sm font-bold rounded-2xl pl-10 pr-12 py-3.5 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition text-center tracking-widest disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                  aria-label={verClave ? 'Ocultar clave' : 'Ver clave'}
                >
                  <i className={`fas ${verClave ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                </button>
              </div>

              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <i className="fas fa-circle-xmark text-rose-400 text-sm mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-bold italic text-rose-200">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                id="btn-entrar-admin"
                type="submit"
                disabled={cargando || !clave.trim()}
                className="group w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: cargando
                    ? 'rgba(124,58,237,0.3)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: cargando ? 'none' : '0 8px 32px rgba(124,58,237,0.35)',
                  color: 'white',
                }}
              >
                {cargando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verificando…
                  </>
                ) : (
                  <>
                    <i className="fas fa-right-to-bracket text-sm" />
                    Ingresar
                  </>
                )}
              </button>
            </form>

            {/* Warning */}
            <div className="mt-7 pt-5 border-t border-slate-700/50">
              <div className="flex items-start gap-2.5 text-slate-500">
                <i className="fas fa-eye text-[10px] mt-0.5 flex-shrink-0" />
                <p className="text-[9px] font-bold italic leading-relaxed">
                  Todos los accesos son registrados en la bitácora del sistema.
                  El uso no autorizado está prohibido.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-[9px] font-bold text-slate-600 italic mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          Asistencias y Evaluaciones INSAL • Desarrollado por{' '}
          <span className="text-violet-500">AE Preza Group</span>
        </motion.p>
      </motion.div>
    </div>
  );
}