import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from './assets/logo.png';
import { useTema } from './ThemeContext';
import { useAuth } from './context/AuthContext';

import ViewLanding from './views/ViewLanding';
import ViewEstudiantesHome from './views/ViewEstudiantesHome';
import ViewRegistroAlumno from './views/ViewRegistroAlumno';
import ViewMarcacion from './views/ViewMarcacion';
import ViewAsistente from './views/ViewAsistente';
import ViewAdmin from './views/ViewAdmin';
import ViewDocente from './views/ViewDocente';
import ViewLoginDocente from './views/ViewLoginDocente';
import ViewLoginAdmin from './views/ViewLoginAdmin';
import ViewPerfilAlumno from './views/ViewPerfilAlumno';
import ViewEvaluaciones from './views/ViewEvaluaciones';
import AvatarDocente from './components/AvatarDocente';
import { useToast } from './context/ToastContext';
import { obtenerInformacionDispositivo } from './utils/dispositivo';

const AREAS = [
  { id: 'landing', icono: 'fa-house', titulo: 'Inicio' },
  { id: 'estudiante', icono: 'fa-user-graduate', titulo: 'Estudiantes' },
  { id: 'docente', icono: 'fa-chalkboard-user', titulo: 'Docentes' },
  { id: 'admin', icono: 'fa-shield-halved', titulo: 'Admin' },
];

const SUBNAV_ESTUDIANTE = [
  { id: 'inicio', icono: 'fa-house', titulo: 'Inicio' },
  { id: 'registro', icono: 'fa-user-plus', titulo: 'Registro' },
  { id: 'marcacion', icono: 'fa-clipboard-check', titulo: 'Marcación' },
  { id: 'asistente', icono: 'fa-user-shield', titulo: 'Asistente de Sección' },
  { id: 'evaluaciones', icono: 'fa-clipboard-list', titulo: 'Evaluaciones' },
  { id: 'perfil', icono: 'fa-user', titulo: 'Mi Perfil' },
];

export default function App() {
  const [area, setArea] = useState('landing');
  const [subvista, setSubvista] = useState('inicio');
  const [reloj, setReloj] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const infoDispositivo = useMemo(() => obtenerInformacionDispositivo(), []);
  const { docenteUser, cargandoDocente, adminActivo } = useAuth();
  const { toastWarning, toastInfo } = useToast();

  // Avisos del cierre de sesión automático por inactividad (disparados desde AuthContext)
  useEffect(() => {
    const aviso = () =>
      toastWarning('Tu sesión se cerrará por inactividad en menos de 2 minutos. Toca la pantalla para continuar.');
    const cerro = () => toastInfo('Sesión cerrada automáticamente por inactividad.');
    window.addEventListener('sesion-por-expirar', aviso);
    window.addEventListener('sesion-cerrada-inactividad', cerro);
    return () => {
      window.removeEventListener('sesion-por-expirar', aviso);
      window.removeEventListener('sesion-cerrada-inactividad', cerro);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const hoy = new Date();
      setReloj(
        hoy.toLocaleTimeString('es-SV', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manejo de historial para el botón Atrás del navegador
  useEffect(() => {
    try {
      window.history.replaceState({ area: 'landing', subvista: 'inicio' }, '');
    } catch (e) {
      console.warn('History API no disponible:', e);
    }

    const onPopState = (e) => {
      const st = e.state;
      const areaValida = AREAS.some((a) => a.id === st?.area);
      const subvistaValida =
        SUBNAV_ESTUDIANTE.some((s) => s.id === st?.subvista) || st?.subvista === 'inicio';
      setArea(areaValida ? st.area : 'landing');
      setSubvista(subvistaValida ? st.subvista : 'inicio');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navegar(nuevaArea, nuevaSubvista) {
    const a = nuevaArea ?? area;
    const s = nuevaSubvista ?? subvista;
    // Sin cambios reales: no apilar entradas duplicadas en el historial
    if (a === area && s === subvista) return;
    setArea(a);
    setSubvista(s);
    try {
      window.history.pushState({ area: a, subvista: s }, '');
    } catch {}
  }

  function irAArea(idArea) {
    navegar(idArea, idArea === 'estudiante' ? 'inicio' : subvista);
  }

  function tituloHeader() {
    if (area === 'landing') return 'Portal General';
    if (area === 'estudiante') return `Estudiantes • ${subvista.toUpperCase()}`;
    if (area === 'docente') return docenteUser ? `Docente • ${docenteUser.displayName}` : 'Área Docente';
    if (area === 'admin') return adminActivo ? 'Panel Admin • Acceso Total' : 'Área Admin';
    return '';
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-['Plus_Jakarta_Sans'] selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 lg:min-h-screen lg:fixed lg:h-full flex lg:flex-col justify-between z-40 overflow-y-auto">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative group cursor-pointer" onClick={() => irAArea('landing')}>
              <img
                src={logo}
                alt="INSAL"
                className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-slate-100 uppercase leading-tight tracking-wider italic">
                INSAL
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 italic">
                Asistencias y Evaluaciones
              </p>
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {AREAS.map((a) => {
              const sesionActiva =
                (a.id === 'docente' && docenteUser) ||
                (a.id === 'admin' && adminActivo);

              return (
                <button
                  key={a.id}
                  id={`nav-${a.id}`}
                  onClick={() => irAArea(a.id)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all ${
                    area === a.id
                      ? a.id === 'admin'
                        ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-600/30'
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <i className={`fas ${a.icono} text-xs`} />
                  <span>{a.titulo}</span>
                  {sesionActiva && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sub-nav Estudiante */}
          {area === 'estudiante' && (
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 px-3 italic">
                Módulos Alumno
              </p>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {SUBNAV_ESTUDIANTE.map((s) => (
                  <button
                    key={s.id}
                    id={`subnav-${s.id}`}
                    onClick={() => navegar('estudiante', s.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase italic whitespace-nowrap transition-all ${
                      subvista === s.id
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <i className={`fas ${s.icono}`} />
                    <span>{s.titulo}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Chip de sesión Docente activa */}
          {docenteUser && area !== 'docente' && (
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => irAArea('docente')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition group"
              >
                <AvatarDocente
                  user={docenteUser}
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <div className="text-left overflow-hidden">
                  <p className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">
                    Sesión Activa
                  </p>
                  <p className="text-[9px] font-bold text-slate-300 truncate">
                    {docenteUser.displayName}
                  </p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Chip de sesión Admin activa */}
          {adminActivo && area !== 'admin' && (
            <div className={docenteUser ? 'mt-2' : 'mt-4 pt-4 border-t border-slate-800/80'}>
              <button
                onClick={() => irAArea('admin')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-shield-halved text-[9px] text-violet-400" />
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-black uppercase text-violet-400 tracking-wider">
                    Admin Activo
                  </p>
                  <p className="text-[9px] font-bold text-slate-300">Panel completo</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse ml-auto flex-shrink-0" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
          <ThemeToggle />
          <div className="hidden lg:block bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-[9px] text-slate-400">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-300 italic">Dispositivo</span>
              <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono">
                {infoDispositivo.navegador}
              </span>
            </div>
            <p className="text-[8px] text-slate-500 truncate">
              {infoDispositivo.os} • {infoDispositivo.tipoDispositivo}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header Superior */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
              {tituloHeader()}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-black italic">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                {isOnline ? 'Servidor Conectado' : 'Modo Fuera de Línea'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-slate-300 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 font-mono">
              <i className="far fa-clock text-indigo-400" />
              <span>{reloj || '00:00:00'}</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Router */}
        <div className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            {area === 'landing' && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ViewLanding onNavegar={irAArea} />
              </motion.div>
            )}

            {area === 'estudiante' && (
              <motion.div
                key={`estudiante-${subvista}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {subvista === 'inicio' && (
                  <ViewEstudiantesHome onNavegar={(s) => navegar('estudiante', s)} />
                )}
                {subvista === 'registro' && <ViewRegistroAlumno />}
                {subvista === 'marcacion' && (
                  <ViewMarcacion onIrAPerfil={() => navegar('estudiante', 'perfil')} />
                )}
                {subvista === 'asistente' && <ViewAsistente />}
                {subvista === 'evaluaciones' && <ViewEvaluaciones />}
                {subvista === 'perfil' && <ViewPerfilAlumno />}
              </motion.div>
            )}

            {area === 'docente' && (
              <motion.div
                key="docente-area"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {cargandoDocente ? (
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                        Verificando sesión…
                      </p>
                    </div>
                  </div>
                ) : docenteUser ? (
                  <ViewDocente />
                ) : (
                  <ViewLoginDocente />
                )}
              </motion.div>
            )}

            {area === 'admin' && (
              <motion.div
                key="admin-area"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {adminActivo ? <ViewAdmin /> : <ViewLoginAdmin />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ThemeToggle() {
  const { tema, toggleTema } = useTema();
  const esOscuro = tema === 'oscuro';
  return (
    <button
      onClick={toggleTema}
      title={esOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      className={`group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all border ${
        esOscuro
          ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-indigo-500/40 hover:text-slate-200 hover:bg-indigo-500/5'
          : 'bg-amber-50 border-amber-200/80 text-amber-700 hover:border-amber-400 hover:bg-amber-100'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Toggle pill */}
        <div className={`relative w-9 h-5 rounded-full border transition-all flex-shrink-0 ${
          esOscuro
            ? 'bg-indigo-600/30 border-indigo-500/40'
            : 'bg-amber-400 border-amber-500'
        }`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-[7px] ${
            esOscuro
              ? 'left-0.5 bg-slate-700 text-indigo-300'
              : 'left-4 bg-white text-amber-500'
          }`}>
            <i className={`fas ${esOscuro ? 'fa-moon' : 'fa-sun'}`} />
          </div>
        </div>
        <span className="tracking-widest">
          {esOscuro ? 'Modo Oscuro' : 'Modo Claro'}
        </span>
      </div>
      <span className={`text-[8px] opacity-60 uppercase font-mono ${esOscuro ? 'text-slate-500' : 'text-amber-600'}`}>
        {esOscuro ? 'dark' : 'light'}
      </span>
    </button>
  );
}