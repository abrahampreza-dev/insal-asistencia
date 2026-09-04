import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  push,
  update,
  remove,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt,
} from 'firebase/database';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Validación temprana: sin esto, initializeApp/getDatabase lanzan un error
// críptico a nivel de módulo → pantalla blanca sin mensaje ni boundary.
const CLAVES_FALTANTES = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (CLAVES_FALTANTES.length > 0) {
  throw new Error(
    `Configuración de Firebase incompleta. Faltan variables: ${CLAVES_FALTANTES.join(', ')}. ` +
      'Verifica el archivo .env y que las claves usen el prefijo VITE_.'
  );
}

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Configurar persistencia de sesión en localStorage
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.warn('[Auth] No se pudo configurar persistencia:', err.message)
);

// Proveedor Google con hint de dominio institucional
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'clases.edu.sv', // Sugiere cuentas del dominio institucional
  prompt: 'select_account',
});

// ─── Helpers de Auth ─────────────────────────────────────────────────────────

/** Verifica que el email sea del dominio institucional @clases.edu.sv */
export function verificarDominioDocente(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@clases.edu.sv');
}

/**
 * Inicia sesión con Google y verifica que sea cuenta @clases.edu.sv.
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
export async function loginConGoogleDocente() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const { uid, displayName, email, photoURL } = res.user;

    if (!verificarDominioDocente(email)) {
      // Cerrar la sesión de Firebase inmediatamente si el dominio no es válido
      await signOut(auth);
      return {
        ok: false,
        error: `Solo se permiten cuentas @clases.edu.sv. (Recibido: ${email})`,
      };
    }

    return {
      ok: true,
      user: { uid, displayName, email, photoURL },
    };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      return { ok: false, error: null }; // Cancelación silenciosa
    }
    return {
      ok: false,
      error: err.message || 'No se pudo completar el inicio de sesión con Google.',
    };
  }
}

/** Cierra sesión de Firebase Auth */
export async function cerrarSesionGoogle() {
  try {
    await signOut(auth);
  } catch {}
}

/** Escucha cambios en el estado de autenticación de Firebase */
export { onAuthStateChanged };

// ─── Bitácora de Accesos ─────────────────────────────────────────────────────

/**
 * Registra un evento de acceso en /bitacora-accesos.
 * @param {{ uid: string, displayName: string, email: string }} user
 * @param {'login' | 'logout'} accion
 */
export async function registrarAccesoBitacora(user, accion) {
  try {
    const entrada = {
      uid: user.uid,
      displayName: user.displayName || 'Desconocido',
      email: user.email || '',
      accion,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      area: 'docente',
    };
    await push(ref(db, 'bitacora-accesos'), entrada);
  } catch (err) {
    console.warn('[Bitácora] No se pudo registrar acceso:', err.message);
  }
}

// ─── Utilidades de Base de Datos ─────────────────────────────────────────────

export function escucharRuta(path, callback) {
  const dbRef = ref(db, path);
  const unsubscribe = onValue(
    dbRef,
    (snapshot) => callback(snapshot.val()),
    (error) => console.error('Error de escucha en tiempo real:', error)
  );
  return unsubscribe;
}

export async function leerRuta(path) {
  const snapshot = await get(ref(db, path));
  return snapshot.val();
}

export {
  ref,
  get,
  onValue,
  set,
  push,
  update,
  remove,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt,
};
