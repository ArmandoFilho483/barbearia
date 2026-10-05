import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, Database } from 'firebase/database';
import { AppData } from '@/types';
import { defaultData } from './constants';

export const firebaseConfig = {
  apiKey: "AIzaSyCvnQLxQhyB_2R3p6g3gkJcU1gRR8O0tjA",
  authDomain: "barbearia-6381c.firebaseapp.com",
  databaseURL: "https://barbearia-6381c-default-rtdb.firebaseio.com",
  projectId: "barbearia-6381c",
  storageBucket: "barbearia-6381c.firebasestorage.app",
  messagingSenderId: "1050785912776",
  appId: "1:1050785912776:web:53eabeb2bd8155d27ed2fd",
  measurementId: "G-R3DSBJ4L31"
};

let db: Database | null = null;

if (typeof window !== 'undefined') {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
  } catch (err) {
    console.warn('Não foi possível inicializar o Firebase. Usando fallback local.', err);
  }
}

export function subscribeToAppData(onUpdate: (data: AppData) => void) {
  if (!db) return () => {};

  const dbRef = ref(db, 'barbershop/v1');
  const unsubscribe = onValue(dbRef, snapshot => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      const merged: AppData = {
        settings: { ...defaultData.settings, ...(val.settings || {}) },
        services: { ...defaultData.services, ...(val.services || {}) },
        bookings: val.bookings || {},
        blocks: val.blocks || {}
      };
      onUpdate(merged);
    } else {
      // Inicializar com default se o nó estiver vazio
      saveRemoteAppData(defaultData);
      onUpdate(defaultData);
    }
  }, error => {
    console.warn('Erro ao escutar dados remotos do Firebase:', error);
  });

  return unsubscribe;
}

export async function saveRemoteAppData(data: AppData): Promise<void> {
  if (!db) return;
  try {
    const dbRef = ref(db, 'barbershop/v1');
    await set(dbRef, data);
  } catch (err) {
    console.error('Erro ao salvar dados no Firebase:', err);
  }
}
