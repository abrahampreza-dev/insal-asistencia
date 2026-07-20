import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

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
