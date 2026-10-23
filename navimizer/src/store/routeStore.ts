import { create } from 'zustand';
import toast from 'react-hot-toast';
import { MAX_WAYPOINTS, type Mode, type Optimization, type Place, type RouteResult, type Waypoint } from '../types';
import { ensureCoords, GeocodeError } from '../lib/geocode';
import { OptimizeError, requestRoute } from '../lib/routing';
import { clearForm, loadForm, saveForm } from '../lib/formStorage';

interface RouteState {
  mode: Mode;
  optimization: Optimization;
  origin: Place;
  destination: Place;
  waypoints: Waypoint[];
  result: RouteResult | null;
  loading: boolean;

  setMode: (m: Mode) => void;
  setOptimization: (o: Optimization) => void;
  setOrigin: (p: Place) => void;
  setDestination: (p: Place) => void;
  swap: () => void;
  addWaypoint: (p?: Place) => void;
  addWaypoints: (labels: string[]) => number;
  updateWaypoint: (id: string, p: Place) => void;
  removeWaypoint: (id: string) => void;
  reset: () => void;
  load: (r: { origin: string; destination: string; waypoints: string[]; mode: Mode }) => void;
  compute: () => Promise<void>;
}

const empty: Place = { label: '' };
const newWaypoint = (p: Place = empty): Waypoint => ({ ...p, id: crypto.randomUUID() });
const restored = loadForm();
let requestId = 0;

export const useRouteStore = create<RouteState>((set, get) => {
  const recomputeIfReady = () => {
    const { origin, destination } = get();
    if (origin.label.trim() && destination.label.trim()) void get().compute();
  };

  return {
    mode: restored?.mode ?? 'car',
    optimization: restored?.optimization ?? 'time',
    origin: restored?.origin ?? empty,
    destination: restored?.destination ?? empty,
    waypoints: restored?.waypoints ?? [],
    result: null,
    loading: false,

    setMode: (mode) => { set({ mode }); recomputeIfReady(); },
    setOptimization: (optimization) => { set({ optimization }); recomputeIfReady(); },
    setOrigin: (origin) => set({ origin }),
    setDestination: (destination) => set({ destination }),
    swap: () => {
      set((s) => ({ origin: s.destination, destination: s.origin }));
      recomputeIfReady();
    },
    addWaypoint: (p) => {
      if (get().waypoints.length >= MAX_WAYPOINTS) {
        toast.error(`Le nombre maximum de points intermédiaires est de ${MAX_WAYPOINTS}`);
        return;
      }
      set((s) => ({ waypoints: [...s.waypoints, newWaypoint(p)] }));
    },
    addWaypoints: (labels) => {
      const room = MAX_WAYPOINTS - get().waypoints.length;
      if (labels.length > room) {
        toast.error(`Le nombre maximum de points intermédiaires est de ${MAX_WAYPOINTS}`);
        return 0;
      }
      set((s) => ({ waypoints: [...s.waypoints, ...labels.map((label) => newWaypoint({ label }))] }));
      return labels.length;
    },
    updateWaypoint: (id, p) =>
      set((s) => ({ waypoints: s.waypoints.map((w) => (w.id === id ? { ...p, id } : w)) })),
    removeWaypoint: (id) => {
      set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id) }));
      recomputeIfReady();
    },
    reset: () => {
      requestId++;
      clearForm();
      set({ origin: empty, destination: empty, waypoints: [], result: null, loading: false, mode: 'car', optimization: 'time' });
    },
    load: ({ origin, destination, waypoints, mode }) => {
      set({
        origin: { label: origin },
        destination: { label: destination },
        waypoints: waypoints.map((label) => newWaypoint({ label })),
        mode,
      });
      void get().compute();
    },

    compute: async () => {
      const { origin, destination, waypoints, mode, optimization } = get();
      if (!origin.label.trim() || !destination.label.trim()) {
        toast.error('Veuillez saisir une origine et une destination');
        return;
      }
      const id = ++requestId;
      set({ loading: true });
      try {
        const filled = waypoints.filter((w) => w.label.trim());
        // Géocodage en parallèle (concurrence limitée dans geocode.ts)
        const [o, ...rest] = await Promise.all([origin, ...filled, destination].map(ensureCoords));
        const d = rest.pop()!;
        const toPoint = (p: Required<Place>) => ({ label: p.label, lat: p.lat, lon: p.lon });
        const result = await requestRoute({
          points: [o, ...rest, d].map(toPoint),
          mode,
          optimization,
        });
        if (id !== requestId) return;
        set({ result, loading: false });
        toast.success('Itinéraire optimisé');
      } catch (e) {
        if (id !== requestId) return;
        set({ loading: false });
        if (e instanceof GeocodeError) {
          toast.error(
            e.kind === 'notfound'
              ? `Adresse introuvable : « ${e.label} ». Vérifiez sa saisie.`
              : "La recherche d'adresses est temporairement indisponible. Réessayez dans quelques instants.",
          );
        } else if (e instanceof OptimizeError && e.code === 'no_route') {
          toast.error("Aucun itinéraire n'a été trouvé entre ces points.");
        } else {
          toast.error("Une erreur est survenue lors du calcul de l'itinéraire. Réessayez dans quelques instants.");
        }
      }
    },
  };
});

// Persistance locale du formulaire (24 h)
const persist = () => {
  const { mode, optimization, origin, destination, waypoints } = useRouteStore.getState();
  saveForm({ mode, optimization, origin, destination, waypoints });
};
useRouteStore.subscribe(persist);
window.addEventListener('pagehide', persist);
