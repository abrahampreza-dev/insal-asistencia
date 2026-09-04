import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  auth,
  onAuthStateChanged,
  loginConGoogleDocente,
  cerrarSesionGoogle,
  verificarDominioDocente,
  registrarAccesoBitacora,
} from '../firebase';
import { llamarApi } from '../api';

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

const ADMIN_SESSION_KEY = 'adminSesion';
const ADMIN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad
// Cierre automático del docente tras este tiempo sin actividad en la máquina.
// Protege contra sesiones olvidadas en equipos compartidos.
const DOCENTE_INACTIVIDAD_MS = 15 * 60 * 1000; // 15 minutos

function hoyLocalISO() {
  // Fecha local (no UTC) en formato YYYY-MM-DD
  return new Date().toLocaleDateString('sv-SE');
}

function leerSesionAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.fecha === hoyLocalISO() && s.expiraEn > Date.now()) return s;
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {}
  return null;
}

function renovarSesionAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    s.expiraEn = Date.now() + ADMIN_TIMEOUT_MS;
    s.fecha = hoyLocalISO(); // evita que la sesión muera al cruzar medianoche en uso activo
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Hook interno: rastrea la última actividad real del usuario (mouse, teclado,
 * touch). Devuelve un ref con el timestamp de la última interacción.
 */
function useUltimaActividad() {
  const ultimaRef = useRef(Date.now());
  useEffect(() => {
    function marcar() {
      ultimaRef.current = Date.now();
    }
    const eventos = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    eventos.forEach((ev) => window.addEventListener(ev, marcar, { passive: true }));
    return () => eventos.forEach((ev) => window.removeEventListener(ev, marcar));
  }, []);
  return ultimaRef;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // ── Docente (Firebase Google Auth) ──
  const [docenteUser, setDocenteUser] = useState(null);
  const [cargandoDocente, setCargandoDocente] = useState(true);
  const [errorDocente, setErrorDocente] = useState('');

  // ── Admin (clave local) ──
  const [adminSesion, setAdminSesion] = useState(() => leerSesionAdmin());

  // Rastreo global de actividad para los cierres automáticos de sesión
  const ultimaActividad = useUltimaActividad();
  const avisoInactividadMostrado = useRef(false);

  // Escuchar cambios de autenticación de Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && verificarDominioDocente(firebaseUser.email)) {
        setDocenteUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setDocenteUser(null);
      }
      setCargandoDocente(false);
    });
    return unsub;
  }, []);

  // ── Cierre automático de sesión docente por inactividad ──
  // Si el equipo queda abandonado con la sesión abierta, se cierra sola.
  useEffect(() => {
    if (!docenteUser) {
      avisoInactividadMostrado.current = false;
      return undefined;
    }
    const intervalo = setInterval(() => {
      const inactivoMs = Date.now() - ultimaActividad.current;
      // Aviso 2 minutos antes del cierre
      if (!avisoInactividadMostrado.current && inactivoMs > DOCENTE_INACTIVIDAD_MS - 120_000) {
        avisoInactividadMostrado.current = true;
        window.dispatchEvent(new CustomEvent('sesion-por-expirar'));
      }
      // Si el usuario volvió a actividad tras el aviso, re-armar para la próxima vez
      if (avisoInactividadMostrado.current && inactivoMs < DOCENTE_INACTIVIDAD_MS - 120_000) {
        avisoInactividadMostrado.current = false;
      }
      if (inactivoMs > DOCENTE_INACTIVIDAD_MS) {
        avisoInactividadMostrado.current = false;
        logoutDocente();
        window.dispatchEvent(new CustomEvent('sesion-cerrada-inactividad'));
      }
    }, 15_000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docenteUser]);

  // Auto-expiración de sesión admin (renovación con throttle: máx 1 escritura/30s)
  useEffect(() => {
    if (!adminSesion) return;

    let ultimaRenovacion = 0;
    function renovar() {
      const ahora = Date.now();
      if (ahora - ultimaRenovacion < 30_000) return;
      ultimaRenovacion = ahora;
      renovarSesionAdmin();
    }
    window.addEventListener('mousedown', renovar);
    window.addEventListener('keydown', renovar);
    window.addEventListener('touchstart', renovar);

    const intervalo = setInterval(() => {
      const s = leerSesionAdmin();
      if (!s) setAdminSesion(null);
    }, 15_000);

    return () => {
      window.removeEventListener('mousedown', renovar);
      window.removeEventListener('keydown', renovar);
      window.removeEventListener('touchstart', renovar);
      clearInterval(intervalo);
    };
  }, [adminSesion]);

  // ── Acciones Docente ──

  const loginDocente = useCallback(async () => {
    setErrorDocente('');
    const res = await loginConGoogleDocente();

    if (res.ok && res.user) {
      setDocenteUser(res.user);
      await registrarAccesoBitacora(res.user, 'login');
    } else if (res.error) {
      setErrorDocente(res.error);
    }

    return res;
  }, []);

  const logoutDocente = useCallback(async () => {
    if (docenteUser) {
      await registrarAccesoBitacora(docenteUser, 'logout');
    }
    await cerrarSesionGoogle();
    setDocenteUser(null);
    setErrorDocente('');
  }, [docenteUser]);

  const limpiarErrorDocente = useCallback(() => setErrorDocente(''), []);

  // ── Acciones Admin ──

  const loginAdmin = useCallback(async (clave) => {
    const resultado = await llamarApi('validarClaveAdmin', { claveAdmin: clave });
    if (resultado.ok) {
      const sesion = {
        autenticado: true,
        clave,
        fecha: hoyLocalISO(), // local, no UTC: con UTC-6 un ISO de noche escribía "mañana" y la sesión moría al instante
        expiraEn: Date.now() + ADMIN_TIMEOUT_MS,
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sesion));
      setAdminSesion(sesion);
      return { ok: true };
    }
    return { ok: false, error: resultado.error || 'Clave de administrador incorrecta.' };
  }, []);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminSesion(null);
  }, []);

  const value = {
    // Docente
    docenteUser,
    cargandoDocente,
    errorDocente,
    loginDocente,
    logoutDocente,
    limpiarErrorDocente,

    // Admin
    adminActivo: !!adminSesion,
    adminClave: adminSesion?.clave || '',
    loginAdmin,
    logoutAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
