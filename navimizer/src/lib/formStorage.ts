import type { Mode, Optimization, Place, Waypoint } from '../types';

const KEY = 'navimizer_form';
const TTL = 24 * 60 * 60 * 1000;

export interface FormData {
  mode: Mode;
  optimization: Optimization;
  origin: Place;
  destination: Place;
  waypoints: Waypoint[];
}

export function loadForm(): FormData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: FormData };
    if (Date.now() - savedAt > TTL) {
      localStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveForm(data: FormData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* stockage indisponible */
  }
}

export function clearForm() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
