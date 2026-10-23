import type { Leg, Mode, Optimization, RouteResult, Stop } from '../types';

const SERVERS: Record<Mode, string> = {
  car: 'https://router.project-osrm.org',
  bike: 'https://routing.openstreetmap.de/routed-bike',
  walk: 'https://routing.openstreetmap.de/routed-foot',
};

// Les serveurs openstreetmap.de ignorent le profil dans l'URL ; "driving" est le segment attendu partout.
const PROFILE = 'driving';

export class RoutingError extends Error {}

const coordPath = (stops: { lat: number; lon: number }[]) =>
  stops.map((s) => `${s.lon.toFixed(6)},${s.lat.toFixed(6)}`).join(';');

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch {
    throw new RoutingError('network');
  }
  if (!res.ok) throw new RoutingError(`http ${res.status}`);
  const json = (await res.json()) as T & { code?: string };
  if (json.code && json.code !== 'Ok') throw new RoutingError(json.code);
  return json;
}

type Input = Omit<Stop, 'kind'>;

interface OsrmLeg { distance: number; duration: number }
interface OsrmGeometry { coordinates: [number, number][] }

const toLatLon = (g: OsrmGeometry): [number, number][] => g.coordinates.map(([lon, lat]) => [lat, lon]);

/** Optimisation par temps : endpoint /trip (départ et arrivée fixes). */
async function tripByTime(points: Input[], mode: Mode, signal?: AbortSignal) {
  const url =
    `${SERVERS[mode]}/trip/v1/${PROFILE}/${coordPath(points)}` +
    `?source=first&destination=last&roundtrip=false&geometries=geojson&overview=full&steps=false`;
  const data = await getJson<{
    waypoints: { waypoint_index: number }[];
    trips: { distance: number; duration: number; legs: OsrmLeg[]; geometry: OsrmGeometry }[];
  }>(url, signal);
  const order = points
    .map((_, i) => ({ i, pos: data.waypoints[i].waypoint_index }))
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.i);
  const trip = data.trips[0];
  return { order, legs: trip.legs, distance: trip.distance, duration: trip.duration, geometry: toLatLon(trip.geometry) };
}

/** Résolution de l'ordre des points intermédiaires (premier et dernier fixes) sur une matrice de coûts. */
export function solveOrder(cost: number[][]): number[] {
  const n = cost.length;
  const middle = Array.from({ length: Math.max(0, n - 2) }, (_, i) => i + 1);
  const total = (p: number[]) => {
    let t = 0;
    let prev = 0;
    for (const x of p) { t += cost[prev][x]; prev = x; }
    return t + cost[prev][n - 1];
  };

  if (middle.length <= 8) {
    let best = middle;
    let bestCost = total(middle);
    const permute = (arr: number[], k: number) => {
      if (k === arr.length) {
        const c = total(arr);
        if (c < bestCost) { bestCost = c; best = [...arr]; }
        return;
      }
      for (let i = k; i < arr.length; i++) {
        [arr[k], arr[i]] = [arr[i], arr[k]];
        permute(arr, k + 1);
        [arr[k], arr[i]] = [arr[i], arr[k]];
      }
    };
    permute([...middle], 0);
    return [0, ...best, n - 1];
  }

  // Plus proche voisin + 2-opt
  const left = new Set(middle);
  let path: number[] = [];
  let cur = 0;
  while (left.size) {
    let next = -1;
    for (const c of left) if (next < 0 || cost[cur][c] < cost[cur][next]) next = c;
    path.push(next);
    left.delete(next);
    cur = next;
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < path.length - 1; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const cand = [...path.slice(0, i), ...path.slice(i, j + 1).reverse(), ...path.slice(j + 1)];
        if (total(cand) < total(path) - 1e-9) { path = cand; improved = true; }
      }
    }
  }
  return [0, ...path, n - 1];
}

/** Optimisation par distance : OSRM /trip n'optimise que le temps, on utilise /table + résolution locale. */
async function tripByDistance(points: Input[], mode: Mode, signal?: AbortSignal) {
  const table = await getJson<{ distances: number[][] }>(
    `${SERVERS[mode]}/table/v1/${PROFILE}/${coordPath(points)}?annotations=distance`,
    signal,
  );
  const order = solveOrder(table.distances);
  const ordered = order.map((i) => points[i]);
  const route = await getJson<{
    routes: { distance: number; duration: number; legs: OsrmLeg[]; geometry: OsrmGeometry }[];
  }>(`${SERVERS[mode]}/route/v1/${PROFILE}/${coordPath(ordered)}?overview=full&geometries=geojson&steps=false`, signal);
  const r = route.routes[0];
  return { order, legs: r.legs, distance: r.distance, duration: r.duration, geometry: toLatLon(r.geometry) };
}

export async function computeRoute(
  origin: Input,
  waypoints: Input[],
  destination: Input,
  mode: Mode,
  optimization: Optimization,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const points = [origin, ...waypoints, destination];
  let res;
  if (optimization === 'distance' && waypoints.length > 0) {
    try {
      res = await tripByDistance(points, mode, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      res = await tripByTime(points, mode, signal); // repli si /table indisponible
    }
  } else if (waypoints.length > 0) {
    res = await tripByTime(points, mode, signal);
  } else {
    // Sans point intermédiaire, il n'y a rien à ordonner : simple itinéraire.
    res = await tripByDistance(points, mode, signal).catch(() => tripByTime(points, mode, signal));
  }

  const stops: Stop[] = res.order.map((idx, pos) => ({
    ...points[idx],
    kind: pos === 0 ? 'start' : pos === points.length - 1 ? 'end' : 'via',
  }));
  const legs: Leg[] = res.legs.map((l) => ({ distance: l.distance, duration: l.duration }));
  return { stops, legs, distance: res.distance, duration: res.duration, geometry: res.geometry };
}
