import { AppData } from '@/types';
import { defaultData, STORAGE_KEY } from './constants';
import { saveRemoteAppData } from './firebase';

export function loadStoredData(): AppData {
  if (typeof window === 'undefined') return defaultData;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultData;
  try {
    const parsed = JSON.parse(saved);
    return {
      settings: { ...defaultData.settings, ...(parsed.settings || {}) },
      services: { ...defaultData.services, ...(parsed.services || {}) },
      bookings: parsed.bookings || {},
      blocks: parsed.blocks || {}
    };
  } catch {
    return defaultData;
  }
}

export function saveStoredData(data: AppData) {
  if (typeof window === 'undefined') return;
  // 1. Salva no cache local para resposta imediata
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // 2. Sincroniza em nuvem no Firebase para todos os aparelhos
  saveRemoteAppData(data);
}
