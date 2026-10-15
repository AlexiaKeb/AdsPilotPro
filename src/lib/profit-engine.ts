/**
 * Moteur de rentabilité — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Utilisé par les audits, le simulateur, l'onboarding et les prompts IA.
 * Fonctions pures, sans dépendance : testables avec `node --test` (voir
 * profit-engine.test.ts).
 *
 * Définition clé : la « marge brute » est la marge de contribution AVANT
 * publicité, en % du prix de vente TTC→HT : prix − coût produit − livraison −
 * frais de paiement − remboursements moyens. C'est elle (et non un 35 % codé en
 * dur) qui détermine le seuil de rentabilité.
 */

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Marge brute par défaut selon le secteur (point de départ, à confirmer par l'utilisateur). */
export const DEFAULT_MARGIN_PCT = {
  ecommerce: 40,
  infoproduit: 85,
  service: 60,
} as const;

/** Marge normalisée en fraction (0-1). Retourne 0 si invalide. */
export function marginFraction(marginPct: number): number {
  if (!Number.isFinite(marginPct)) return 0;
  return clamp(marginPct, 0, 100) / 100;
}

/**
 * ROAS de rentabilité (point mort) = 1 / marge.
 * Marge 40 % → 2,5× ; marge 85 % → 1,18×. Retourne Infinity si marge nulle.
 */
export function breakevenRoas(marginPct: number): number {
  const m = marginFraction(marginPct);
  return m > 0 ? 1 / m : Number.POSITIVE_INFINITY;
}

/** CPA maximum pour ne pas perdre d'argent sur la première commande = panier × marge. */
export function breakevenCpa(avgOrderValue: number, marginPct: number): number {
  return Math.max(0, avgOrderValue) * marginFraction(marginPct);
}

/**
 * Valeur vie client sur 12 mois.
 * @param ordersPerYear nombre moyen de commandes par client sur 12 mois (≥ 1)
 * @returns chiffre d'affaires et marge générés par client acquis
 */
export function ltv12(avgOrderValue: number, ordersPerYear: number, marginPct: number) {
  const orders = Math.max(1, Number.isFinite(ordersPerYear) ? ordersPerYear : 1);
  const revenue = Math.max(0, avgOrderValue) * orders;
  const margin = revenue * marginFraction(marginPct);
  return { revenue, margin };
}

/** Profit net = marge dégagée par les ventes − dépense publicitaire. */
export function netProfit(adSpend: number, revenue: number, marginPct: number): number {
  return revenue * marginFraction(marginPct) - adSpend;
}

/**
 * Score de rentabilité 0-100 : 0 à ROAS nul, ~67 au point mort, 100 à 1,5× le point mort.
 */
export function profitabilityScore(roas: number, marginPct: number): number {
  const be = breakevenRoas(marginPct);
  if (!Number.isFinite(be) || be <= 0) return 0;
  return clamp(roas / (be * 1.5), 0, 1) * 100;
}

/**
 * Score LTV 0-100 basé sur le ratio marge LTV / CPA (3:1 = référence saine).
 * Retourne 0 si le CPA est inconnu.
 */
export function ltvScore(ltvMargin: number, cpa: number): number {
  if (!(cpa > 0)) return 0;
  return clamp(ltvMargin / cpa / 3, 0, 1) * 100;
}

export type Verdict = "loss" | "breakeven" | "profitable" | "strong";

/** Lecture simple du ROAS par rapport au point mort. */
export function roasVerdict(roas: number, marginPct: number): Verdict {
  const be = breakevenRoas(marginPct);
  if (!(roas > 0)) return "loss";
  if (roas < be * 0.95) return "loss";
  if (roas < be * 1.15) return "breakeven";
  if (roas < be * 1.5) return "profitable";
  return "strong";
}
