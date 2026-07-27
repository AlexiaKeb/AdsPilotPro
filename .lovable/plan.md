Plan d'action pour rendre AdsPilot Pro "nickel" avant le lancement
=================================================================

Objectifs prioritaires (d'après les réponses utilisateur)
-----------------------------------------------------------
- Priorité #1 : **améliorer la conversion** (landing, pricing, onboarding, friction).
- Cible : **solopreneur / media buyer** seul dans E-commerce, Infoproduit ou Service.
- Fonctionnalité manquante la plus critique : **connexion automatique Meta Ads** pour ne plus saisir les métriques à la main.
- Paiement : reporté après validation produit.

Contexte technique important
-----------------------------
Aucun connecteur natif "Meta Ads" / "Facebook Ads" n'est disponible dans Lovable. La connexion Meta doit donc être construite manuellement via OAuth Facebook + Marketing API. C'est un levier de conversion majeur mais un chantier technique conséquent.

Phases du plan
---------------

### Phase 1 — Gains rapides de conversion (1 à 2 semaines)

Objectif : augmenter le taux d'inscription et l'activation sans gros chantier.

1. Landing page
   - Hero plus précis : cibler "media buyer solopreneur" + résultat chiffré (ex: "audit Meta Ads en 2 min").
   - Ajouter une preuve sociale : compteur d'audits générés, témoignages, ou logos (même fictifs au début).
   - Section "Comment ça marche" en 3 étapes visuelles.
   - CTA primaire unique et répété : "Faire mon audit gratuit".

2. Pricing
   - Clarifier la différence entre FREE et STARTER/PRO en termes de résultats, pas de fonctionnalités brutes.
   - Ajouter une FAQ tarifaire.
   - Mettre en avant le plan le plus populaire (PRO) avec un badge visuel.

3. Onboarding
   - Réduire la friction : étape 1 = email + secteur, étapes suivantes optionnelles.
   - Montrer la valeur immédiatement : arriver sur le dashboard avec un audit vide ou un exemple déjà rempli.
   - Ajouter un petit guide tooltips au premier audit.

4. Dashboard / UX
   - S'assurer que le bouton "Générer mon diagnostic IA" est visible sans scroll (CTA sticky si besoin).
   - Améliorer la lisibilité des scores (couleurs déjà éclaircies — continuer sur cette voie).
   - Ajouter un état vide engageant quand aucun audit n'existe encore.

### Phase 2 — Connexion Meta Ads (levier conversion majeur, 2 à 4 semaines)

Objectif : l'utilisateur connecte son compte Meta, les métriques remplissent automatiquement les audits.

1. Création d'une application Facebook
   - Créer une app dans Meta for Developers.
   - Demander les scopes : ads_read, business_management (lecture seule).
   - Configurer l'OAuth redirect URI.

2. OAuth par utilisateur
   - Bouton "Connecter mon compte Meta Ads" dans le profil / dashboard.
   - Flux OAuth classique : autorisation → token d'accès → stockage sécurisé du token côté serveur (pas dans le navigateur).
   - Gestion du refresh token.

3. Récupération des données
   - Endpoint Marketing API : /act_<ad_account_id>/insights (date_preset, fields, level).
   - Mapper les métriques récupérées (spend, impressions, clicks, cpc, ctr, cpm, purchases, roas, cost_per_action_type, etc.) vers les champs des modules d'audit.
   - Permettre à l'utilisateur de choisir le compte publicitaire et la période.

4. Intégration dans les modules
   - Pré-remplissage des inputs depuis les données Meta.
   - Bouton "Rafraîchir depuis Meta".
   - Fallback manuel si aucune donnée n'est disponible.

5. Sécurité et conformité
   - Stocker les tokens chiffrés côté serveur (Supabase).
   - RGPD : consentement explicite, possibilité de déconnecter.
   - Logs d'accès minimaux.

### Phase 3 — Monétisation et fonctionnalités de rétention (après validation)

Objectif : transformer les utilisateurs gratuits en payants et les garder.

1. Limites freemium claires
   - Nombre d'audits gratuits par mois.
   - Accès ou non à l'IA diagnostic.
   - Rapport PDF payant ou limité.

2. Rapports partageables
   - Lien public unique par audit (token hash) pour partager à un client / coach.
   - Version PDF enrichie déjà existante : ajouter une page de synthèse client.

3. Suivi de progression
   - Graphique dans le profil : évolution du score global au fil des audits.
   - Alertes automatiques quand un score baisse d'un mois sur l'autre.

4. Benchmarks sectoriels
   - Données de référence par secteur (ROAS moyen, CPA, budget) pour contextualiser les scores.
   - Affichage : "Votre ROAS est dans le top 20% du secteur Infoproduit".

5. Paiement
   - Activer Stripe ou Lovable Payments quand le produit est validé.
   - Limiter l'activation à la fin, une fois le taux d'activation/conversion satisfaisant.

Ordre de priorité recommandé
-----------------------------
Phase 1 d'abord (conversion rapide sans dépendance externe). Puis Phase 2 (connexion Meta) parce que c'est le plus gros levier de conversion. Phase 3 seulement après avoir mesuré l'activation des utilisateurs.

Prochaine étape immédiate
--------------------------
Lancer la Phase 1 : refactor de la landing page, pricing et onboarding. Si tu veux, je commence par cette phase maintenant.