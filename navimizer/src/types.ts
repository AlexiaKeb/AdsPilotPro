export type Mode = 'car' | 'bike' | 'walk';
export type Optimization = 'time' | 'distance';

export interface Place {
  label: string;
  lat?: number;
  lon?: number;
}

export interface Waypoint extends Place {
  id: string;
}

export interface Stop {
  label: string;
  lat: number;
  lon: number;
  kind: 'start' | 'via' | 'end';
}

export interface Leg {
  distance: number; // m
  duration: number; // s
}

export interface RouteResult {
  stops: Stop[];
  legs: Leg[];
  distance: number;
  duration: number;
  geometry: [number, number][]; // [lat, lon]
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

export const MAX_WAYPOINTS = 23;
