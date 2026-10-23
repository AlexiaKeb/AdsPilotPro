import { useState } from 'react';
import { ArrowUpDown, Bike, Car, Footprints, Loader2, Plus, RotateCcw, Save, Star, Trash2, Zap, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouteStore } from '../store/routeStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { formatDistance, formatDuration } from '../lib/format';
import { MAX_WAYPOINTS, type Mode, type Optimization } from '../types';
import { AddressInput } from './AddressInput';
import { CsvImport } from './CsvImport';
import { FavoritesModal } from './FavoritesModal';

const MODES: { id: Mode; label: string; Icon: typeof Car }[] = [
  { id: 'car', label: 'Voiture', Icon: Car },
  { id: 'bike', label: 'Vélo', Icon: Bike },
  { id: 'walk', label: 'À pied', Icon: Footprints },
];

const OPTIMS: { id: Optimization; label: string; hint: string; Icon: typeof Zap }[] = [
  { id: 'time', label: 'Temps le plus court', hint: 'Privilégie les routes rapides', Icon: Zap },
  { id: 'distance', label: 'Distance la plus courte', hint: 'Privilégie le chemin le plus direct', Icon: Ruler },
];

export function RoutePanel() {
  const s = useRouteStore();
  const user = useAuthStore((a) => a.user);
  const [favFor, setFavFor] = useState<'origin' | 'destination' | null>(null);
  const [saving, setSaving] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const star = (target: 'origin' | 'destination') => (
    <button type="button" onClick={() => setFavFor(target)} aria-label="Adresses favorites" className="text-yellow-500 hover:text-yellow-600">
      <Star className="h-4 w-4" />
    </button>
  );

  const save = async () => {
    if (!user) return toast.error('Vous devez être connecté pour sauvegarder un itinéraire');
    if (!s.result) return toast.error('Aucun itinéraire à sauvegarder');
    if (!routeName.trim()) return toast.error('Veuillez donner un nom à votre itinéraire');
    setSaving(true);
    const { stops } = s.result;
    const { error } = await supabase.from('routes').insert({
      user_id: user.id,
      name: routeName.trim(),
      origin: stops[0].label,
      destination: stops[stops.length - 1].label,
      waypoints: stops.slice(1, -1).map((p) => p.label),
      mode: s.mode,
      distance: Math.round(s.result.distance),
      duration: Math.round(s.result.duration),
    });
    setSaving(false);
    if (error) return toast.error("Impossible de sauvegarder l'itinéraire");
    toast.success('Itinéraire sauvegardé');
    setRouteName('');
    setShowSave(false);
  };

  return (
    <div className="space-y-5 p-4">
      <section className="space-y-2">
        <AddressInput
          value={s.origin}
          onChange={s.setOrigin}
          placeholder="Point de départ"
          leading={<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">D</span>}
          trailing={star('origin')}
        />
        {s.waypoints.map((w, i) => (
          <AddressInput
            key={w.id}
            value={w}
            onChange={(p) => s.updateWaypoint(w.id, p)}
            placeholder={`Point intermédiaire ${i + 1}`}
            leading={<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white">{i + 1}</span>}
            trailing={<button type="button" onClick={() => s.removeWaypoint(w.id)} aria-label="Supprimer ce point" className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
          />
        ))}
        <AddressInput
          value={s.destination}
          onChange={s.setDestination}
          placeholder="Destination"
          leading={<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">A</span>}
          trailing={star('destination')}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => s.addWaypoint()} disabled={s.waypoints.length >= MAX_WAYPOINTS}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Ajouter un point ({s.waypoints.length}/{MAX_WAYPOINTS})
          </button>
          <button type="button" onClick={s.swap} aria-label="Inverser départ et arrivée"
            className="rounded-lg border border-gray-300 px-3 text-gray-700 hover:bg-gray-50"><ArrowUpDown className="h-4 w-4" /></button>
        </div>
        <CsvImport />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Mode de transport</h3>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => s.setMode(id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium ${s.mode === id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="h-5 w-5" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Optimisation</h3>
        <div className="space-y-2">
          {OPTIMS.map(({ id, label, hint, Icon }) => (
            <button key={id} onClick={() => s.setOptimization(id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${s.optimization === id ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
              <Icon className={`h-5 w-5 ${s.optimization === id ? 'text-blue-600' : 'text-gray-500'}`} />
              <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-gray-500">{hint}</span></span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={() => void s.compute()} disabled={s.loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {s.loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {s.loading ? 'Optimisation en cours...' : "Optimiser l'itinéraire"}
        </button>
        <button onClick={s.reset} disabled={s.loading} aria-label="Réinitialiser"
          className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50 disabled:opacity-50"><RotateCcw className="h-4 w-4" /></button>
      </div>

      {s.result && (
        <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-xs text-gray-500">Distance</div><div className="font-semibold">{formatDistance(s.result.distance)}</div></div>
            <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-xs text-gray-500">Durée</div><div className="font-semibold">{formatDuration(s.result.duration)}</div></div>
          </div>
          <ol className="space-y-2">
            {s.result.stops.map((stop, i) => {
              const leg = i > 0 ? s.result!.legs[i - 1] : null;
              const tone = stop.kind === 'start' ? 'bg-green-50 border-green-200' : stop.kind === 'end' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200';
              const badge = stop.kind === 'start' ? 'bg-green-600' : stop.kind === 'end' ? 'bg-blue-600' : 'bg-slate-600';
              return (
                <li key={i} className={`flex gap-2 rounded-lg border p-2 ${tone}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${badge}`}>
                    {stop.kind === 'start' ? 'D' : stop.kind === 'end' ? 'A' : i}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm leading-snug">{stop.label}</div>
                    {leg && <div className="mt-0.5 text-xs text-gray-500">{formatDistance(leg.distance)} · {formatDuration(leg.duration)}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
          {user && (showSave ? (
            <div className="flex gap-2">
              <input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Ex : Tournée du lundi matin"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600" />
              <button onClick={() => void save()} disabled={saving} className="flex items-center gap-2 rounded-lg bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</> : 'OK'}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSave(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50">
              <Save className="h-4 w-4" /> Sauvegarder
            </button>
          ))}
        </section>
      )}

      {favFor && (
        <FavoritesModal
          onClose={() => setFavFor(null)}
          onSelect={(address) => (favFor === 'origin' ? s.setOrigin({ label: address }) : s.setDestination({ label: address }))}
        />
      )}
    </div>
  );
}
