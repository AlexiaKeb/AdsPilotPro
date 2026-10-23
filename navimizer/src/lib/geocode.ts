import type { Place } from '../types';

const BASE = 'https://nominatim.openstreetmap.org';

export class GeocodeError extends Error {
  constructor(public kind: 'notfound' | 'unavailable') {
    super(kind);
  }
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'fr',
    'accept-language': 'fr',
  });
  const res = await fetch(`${BASE}/search?${params}`, { signal });
  if (!res.ok) throw new GeocodeError('unavailable');
  const items = (await res.json()) as NominatimItem[];
  return items.map((i) => ({ label: i.display_name, lat: Number(i.lat), lon: Number(i.lon) }));
}

// Nominatim impose 1 requête/seconde : file d'attente + cache.
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Place>();

export function geocode(label: string): Promise<Required<Place>> {
  const key = label.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.lat !== undefined) return Promise.resolve(hit as Required<Place>);

  const task = queue.then(async () => {
    let results: Place[];
    try {
      results = await searchAddresses(label);
    } catch (e) {
      if (e instanceof GeocodeError) throw e;
      throw new GeocodeError('unavailable');
    } finally {
      await new Promise((r) => setTimeout(r, 1100));
    }
    if (results.length === 0) throw new GeocodeError('notfound');
    const found = { label, lat: results[0].lat!, lon: results[0].lon! };
    cache.set(key, found);
    return found as Required<Place>;
  });
  queue = task.catch(() => undefined);
  return task;
}

/** Complète les coordonnées manquantes (sans toucher aux lieux déjà localisés). */
export async function ensureCoords(place: Place): Promise<Required<Place>> {
  if (place.lat !== undefined && place.lon !== undefined) return place as Required<Place>;
  return geocode(place.label);
}
