# AdsPilot Pro

Copilote de rentabilité Meta Ads pour les annonceurs francophones (e-commerce, infoproduits, services).

**App en ligne** : https://adspilotpro.lovable.app · **Éditeur Lovable** : https://lovable.dev/projects/4a2749be-e484-491d-819b-e16bdb66df99

## Stack réelle

TanStack Start (React 19, Vite) · Tailwind 4 · Supabase (Auth, Postgres + RLS, Storage) · API Meta Marketing (lecture seule, `ads_read`) · Claude (Anthropic) pour les diagnostics.

## Structure

| Dossier | Rôle |
| --- | --- |
| `src/routes` | Pages (file-based routing) : landing, `/pricing`, `/auth`, `/dashboard`, `/simulateur`, `/profil`, `/audit/$id`, `/r/$token` (rapport partagé), `/admin-command` |
| `src/lib/profit-engine.ts` | **Source de vérité des formules** (ROAS de rentabilité, CPA max, LTV, profit net). Testée dans `profit-engine.test.ts` |
| `src/lib/*.functions.ts` | Server functions (IA, Meta, partage, admin, compte) |
| `src/lib/*.server.ts` | Code serveur uniquement (quotas IA, Meta, config IA) |
| `supabase/migrations` | Schéma et règles d'accès (RLS) |

## Développement

```sh
bun install          # le projet utilise bun.lock
bun run dev
npm test             # tests unitaires du moteur de calcul (node:test, sans dépendance)
```

## Variables d'environnement (serveur)

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `META_APP_ID`, `META_APP_SECRET`.
Optionnelles : `ANTHROPIC_MODEL` (défaut `claude-sonnet-4-5`), `VITE_BOOKING_URL` (lien de prise de rendez-vous du coaching).

## Règles de sécurité à connaître

- `profiles.plan` et les compteurs d'usage ne sont **pas** modifiables côté client (GRANT par colonnes). Ils ne changent que via le service role.
- Les crédits IA sont décomptés par la fonction SQL `consume_ai_credit` et rendus par `refund_ai_credit` (service role uniquement) si l'appel IA échoue.
- Ne jamais réécrire l'historique git publié : le projet est synchronisé avec Lovable (voir `AGENTS.md`).
