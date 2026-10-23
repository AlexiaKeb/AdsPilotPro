# Navimizer

Optimisation d'itinéraires multi-arrêts (jusqu'à 100 points) — React 18, Vite, TypeScript, Tailwind, Zustand, Leaflet, Supabase.

## Architecture

```
navigateur ──(JWT)──> fonction Supabase `optimize` ──> serveurs OSRM (table + route)
     │                      └─ solveur d'ordre (exact ≤ 12 arrêts, heuristique au-delà)
     └─ adresses : Base Adresse Nationale (api-adresse.data.gouv.fr)
```

- `supabase/functions/_shared/` : solveur et orchestration, partagés par la fonction serveur et le navigateur.
- `supabase/functions/optimize/` : fonction serveur. **Repli automatique** : si elle n'est pas déployée, le navigateur
  calcule directement avec les serveurs publics (utile en développement, déconseillé en production).
- `infra/osrm/` : héberger ses propres serveurs de routage.

## Démarrage

```bash
cp .env.example .env        # URL + clé anon Supabase
npm install
npm run dev
npm test                    # solveur, orchestration (faux serveur OSRM), géocodage
```

Base de données : appliquer `supabase/migrations/001_routes.sql`. Désactiver la confirmation par email (Auth).

## Déploiement

- Front (Netlify ou Render Static Site) : `npm install && npm run build`, dossier `dist`, réécriture `/*` → `/index.html`.
- Fonction : `supabase functions deploy optimize` (+ secrets `OSRM_URL_CAR|BIKE|FOOT` pour des serveurs dédiés).

## Avant la mise en production

Pages légales, vrais témoignages, serveurs de routage dédiés.
