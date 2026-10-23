// Types partagés entre le navigateur et la fonction serveur `optimize` (aucune API spécifique à Deno ou au DOM).

export type Mode = 'car' | 'bike' | 'walk';
export type Optimization = 'time' | 'distance';

export interface Point {
  label: string;
  lat: number;
  lon: number;
}

export interface Stop extends Point {
  kind: 'start' | 'via' | 'end';
}

export interface Leg {
  distance: number; // m
  duration: number; // s
}

export interface RouteResult {
  stops: Stop[]; // dans l'ordre optimisé
  legs: Leg[];
  distance: number;
  duration: number;
  geometry: [number, number][]; // [lat, lon]
}

export interface OptimizeRequest {
  points: Point[]; // [départ, ...intermédiaires, arrivée]
  mode: Mode;
  optimization: Optimization;
}

/** Nombre maximal de points (départ + arrivée inclus) : limite des serveurs OSRM par défaut. */
export const MAX_POINTS = 100;
