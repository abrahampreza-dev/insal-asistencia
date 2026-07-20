
// Inicialización del SDK Web de Firebase.
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

/**
 * Suscribe a cambios en tiempo real de un path de la base de datos.
 * @param {string} path - p.ej. `asistencia/2026-07-18/2GB`
 * @param {(data: any) => void} callback
 * @returns {() => void} función para cancelar la suscripción
 */
export function escucharRuta(path, callback) {
  const dbRef = ref(db, path);
  const unsubscribe = onValue(
    dbRef,
    (snapshot) => callback(snapshot.val()),
    (error) => console.error('Error de escucha en tiempo real:', error)
  );
  return () => off(dbRef, 'value', unsubscribe);
}

/**
 * Lee un path UNA sola vez (sin quedar suscrito). Ideal para consultas
 * puntuales como un reporte — más simple y rápido que abrir un listener en
 * vivo y cancelarlo de inmediato.
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function leerRuta(path) {
  const snapshot = await get(ref(db, path));
  return snapshot.val();
}
