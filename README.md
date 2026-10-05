# AdsPilot Pro Command Center

# PROMPT LOVABLE — ADSPILOT PRO

## IDENTITÉ DU PROJET

Construis une application SaaS full-stack appelée **AdsPilot Pro** — un cockpit de pilotage stratégique Meta Ads pour e-commerçants et infopreneurs francophones. L'app permet de simuler la rentabilité publicitaire, d'auditer les campagnes Meta, et d'accéder à une Masterclass verrouillée.

---

## STACK TECHNIQUE (ne pas dévier)

- **Frontend** : React 18 + TypeScript + Vite

- **Styling** : Tailwind CSS

- **Animations** : Framer Motion (motion/react)

- **Backend / Auth / DB** : Supabase (PostgreSQL)

- **Temps réel** : Supabase Broadcast + Postgres Changes

- **Cache session** : localStorage via AuthService

---

## PALETTE & DESIGN

**Couleurs :**

- Background principal : `#0A0B14` (noir profond)

- Surface cards : `#12142A` (navy sombre)

- Accent primaire : `#6C63FF` (violet électrique)

- Accent succès : `#00E5A0` (vert menthe)

- Accent alerte : `#FF9500` (orange)

- Alerte danger : `#FF3B5C` (rouge)

- Texte principal : `#FFFFFF`

- Texte secondaire : `#8B8FA8`

**Typographie :**

- Display / titres : **Space Grotesk** (bold, uppercase, letter-spacing large)

- Corps : **Inter** (regular 14-16px)

- Données / KPIs : **JetBrains Mono** (chiffres, métriques)

**Ambiance visuelle :**

- Dark premium, UI de cockpit militaire / trading platform

- Cards avec bordures subtiles `rgba(108, 99, 255, 0.2)`

- Barres de progression colorées (vert / orange / rouge selon seuil)

- Micro-animations sur les sliders et les KPIs

- Logo : icône graphique + "ADSPILOT" bold + badge "PRO"

---

## ARCHITECTURE DES PAGES

### 1. LANDING PAGE (public)

**Hero :**

- Headline : "L'ARSENAL DÉCISIONNEL." (grand, impact)

- Sous-titre : "Six piliers technologiques conçus pour réconcilier vos données, valider vos actifs et simuler votre scale avec une précision chirurgicale."

- CTA : "ACCÉDER AU COCKPIT →"

- Animation : compteurs qui montent (ROAS, profit, CTR)

**Section Arsenal (6 modules en cards) :**

| Module | Catégorie | Description |

|--------|-----------|-------------|

| ATLAS (P&L) | FINANCE | Le Titan Financier. Ne vous fiez plus au ROAS menteur. Maîtrisez votre profit net réel après chaque dépense logistique et fiscale. |

| ORACLE (VISION) | KPI | L'Audit Créatif IA. Détectez instantanément pourquoi vos publicités ne convertissent pas avant même de dépenser votre budget. |

| MERCURY (SCALE) | SIMULATION | Le Simulateur de Profit. Prédisez vos revenus à 30 jours et simulez vos hausses de budget sans jamais casser votre algorithme. |

| ANDROMEDA | KPI | Benchmark industriel. Comparez vos signaux Meta aux leaders du top 1% et identifiez vos goulots d'étranglement. |

| AUDIT STRATÉGIQUE | EXPERTISE | Le scanner 360° de votre tunnel. Identifiez les frictions qui tuent votre conversion et optimisez chaque étape du parcours client. |

| PILOTAGE D'EMPIRE | SYSTÈME | Déployez l'infrastructure globale qui soutient le scaling massif du top 1% annonceurs. |

**Section "Rapports de Bataille" (social proof) :**

- 3 cas clients fictifs stylisés :

  - LE TITAN ATLAS (P&L) : fuite -4 150€ détectée → marge +18%

  - L'EXPLOSION ORACLE (VISION) : CTR 0.80% → 3.20% après correction Hook Rate

  - L'ACCÉLÉRATEUR MERCURY : ROI prédit 4.5 → ROI réel 4.48 (précision 98%)

**CTA final :**

- Block sombre : "DÉPLOYER VOTRE COMMAND CENTER." + bouton "ACCÉDER AU COCKPIT →"

---

### 2. AUTHENTIFICATION

- Page `/login` : email + mot de passe via Supabase Auth

- Page `/register` : inscription avec capture email (lead magnet)

- Redirection post-login vers `/dashboard`

- Gestion des rôles : `user` ou `admin` dans la table `profiles`

---

### 3. DASHBOARD UTILISATEUR (`/dashboard`)

Navigation par onglets :

1. **Cockpit** (simulateur temps réel)

2. **Audits** (historique + nouveau)

3. **Académie** (Masterclass)

#### Onglet COCKPIT — Simulateur P&L temps réel

Sliders interactifs (calculs via `useMemo`, 60fps) :

- Budget publicitaire / jour (slider logarithmique : 10€ → 10 000€)

- Prix de vente moyen

- COGS (coût produit %)

- CTR publicitaire

- Taux de conversion landing

- Taux de rétention (LTV)

KPIs calculés en temps réel :

- **Bénéfice net mensuel** (€)

- **ROAS de sécurité** (point mort)

- **CPA maximum acceptable**

- **LTV 12 mois estimée**

Affichage : 2 grandes cards côte à côte "ROI PRÉDIT" vs "ROI RÉEL" (style trading platform)

#### Onglet AUDITS — Moteur de Diagnostics

Formulaire `CalculatorForm` adaptatif selon secteur sélectionné :

- E-commerce / Infoproduits / Services

**5 modules d'audit (tabs internes) :**

**ANDROMEDA** — ROAS seuil, CPA max front-end, provision LTV

**ORACLE (LTV)** — LTV 12 mois, trésorerie latente détectée

**MERCURY (CRO)** — Taux ajout panier, abandon, vitesse chargement

**ATLAS (Scaling)** — Solidité logistique, risques rupture stock

**VISION (Créatif)** — Performance créas Meta, mix créatif, Hook Rate, Desirability score

Chaque module affiche :

- Métriques avec barres de progression colorées (VERT/ORANGE/ROUGE)

- Score global du module

- Recommandations actionnables

Bouton "SAUVEGARDER L'AUDIT" → enregistrement Supabase

#### Onglet ACADÉMIE — Masterclass

Structure en modules vidéo verrouillés/déverrouillés.

Logique d'accès :

- `has_andromeda_access = false` → modules avancés verrouillés avec CTA upgrade

- `has_andromeda_access = true` → accès complet déverrouillé en temps réel (Supabase subscription)

---

### 4. ADMIN DASHBOARD (`/admin`)

Accessible uniquement si `role = 'admin'` dans `profiles`.

Sections :

- **KPIs globaux** : nb users, nb audits créés, taux conversion accès Masterclass

- **Pipeline prospects** : table avec nom, email, date inscription, statut lead

- **Gestion accès** : toggle `has_andromeda_access` par utilisateur (mise à jour temps réel)

- **Listing audits** : tous les audits créés avec filtres

---

## BASE DE DONNÉES SUPABASE

### Table `profiles`

```sql

id uuid (FK auth.users)

email text

full_name text

role text DEFAULT 'user' -- 'user' | 'admin'

has_andromeda_access boolean DEFAULT false

created_at timestamp

```

### Table `audits`

```sql

id uuid PRIMARY KEY

user_id uuid FK profiles

sector text -- 'ecommerce' | 'infoproduit' | 'service'

inputs jsonb -- toutes les métriques saisies

results jsonb -- tous les scores calculés

created_at timestamp

```

### Table `simulation_history`

```sql

id uuid PRIMARY KEY

user_id uuid FK profiles

inputs jsonb

results jsonb

created_at timestamp

```

---

## TEMPS RÉEL (SUPABASE)

Dans `UserDashboard`, abonnement actif :

```js

supabase

  .channel('profile-changes')

  .on('postgres_changes', {

    event: 'UPDATE',

    schema: 'public',

    table: 'profiles',

    filter: `id=eq.${userId}`

  }, (payload) => {

    // Update React state → déverrouille Masterclass sans F5

  })

  .subscribe()

```

---

## LOGIQUE DE CALCUL (CÔTÉ FRONT)

### ROAS de sécurité (point mort)

```

ROAS_seuil = Prix_vente / (Prix_vente - COGS - Frais_fixes_unitaires)

```

### CPA maximum

```

CPA_max = (Prix_vente - COGS) / (1 + marge_cible)

```

### LTV 12 mois

```

LTV = Panier_moyen × Fréquence_achat_annuelle × Taux_rétention

```

### Bénéfice net mensuel

```

Revenus = Budget_jour × 30 × ROAS

Coût_produits = Revenus × (COGS / 100)

Bénéfice_net = Revenus - Budget_total - Coût_produits - Frais_fixes

```

---

## TYPES TYPESCRIPT CLÉS

```typescript

interface UserProfile {

  id: string

  email: string

  full_name: string

  role: 'user' | 'admin'

  has_andromeda_access: boolean

  created_at: string

}

interface CalculatorInputs {

  sector: 'ecommerce' | 'infoproduit' | 'service'

  daily_budget: number

  avg_price: number

  cogs_percent: number

  ctr: number

  conversion_rate: number

  retention_rate: number

  avg_cart: number

  purchase_frequency: number

}

interface CalculationResults {

  roas_threshold: number

  max_cpa: number

  ltv_12m: number

  net_profit_monthly: number

  hook_rate_score: number

  desirability_score: number

  atlas_score: number

  oracle_score: number

}

interface AuditRecord {

  id: string

  user_id: string

  sector: string

  inputs: CalculatorInputs

  results: CalculationResults

  created_at: string

}

```

---

## INSTRUCTIONS FINALES

1. Commence par la Landing Page complète avec navigation vers `/login`

2. Implémente l'auth Supabase complète avec gestion des rôles

3. Construis le Dashboard avec les 3 onglets

4. Ajoute le temps réel Supabase pour la Masterclass

5. Construis l'Admin Dashboard en dernier

6. Toutes les données sensibles (clés Supabase) via variables d'environnement `.env`

7. Design mobile-first, responsive

**Ne génère pas de données fictives hardcodées dans la DB — utilise uniquement des calculs front-end et des données utilisateur réelles.**

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://adspilotpro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4a2749be-e484-491d-819b-e16bdb66df99).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
