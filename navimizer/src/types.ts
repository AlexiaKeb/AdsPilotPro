import { MAX_POINTS } from '../supabase/functions/_shared/types.ts';
import type { Mode } from '../supabase/functions/_shared/types.ts';

export type { Leg, Mode, OptimizeRequest, Optimization, Point, RouteResult, Stop } from '../supabase/functions/_shared/types.ts';

export interface Place {
  label: string;
  lat?: number;
  lon?: number;
}

export interface Waypoint extends Place {
  id: string;
}

export interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: string[];
  mode: Mode;
  distance: number;
  duration: number;
  created_at: string;
}

/** Points intermédiaires maximum : MAX_POINTS moins le départ et l'arrivée. */
export const MAX_WAYPOINTS = MAX_POINTS - 2;
