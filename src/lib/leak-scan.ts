/**
 * Profit Leak Scan — verdicts par campagne / pub, déterministes (aucune IA).
 *
 * Entrée : insights Meta par entité + marge brute de l'annonceur.
 * Sortie : profit net réel, montant « dépensé à perte » et verdict
 * Couper / Corriger / Garder / Scaler pour chaque ligne.
 *
 * Module pur (sans dépendance) : testé dans leak-scan.test.ts.
 */
import { breakevenCpa, breakevenRoas, marginFraction, netProfit } from "./profit-engine.ts";

export interface EntityInsight {
  id: string;
  name: string;
  level: "campaign" | "ad";
  /** Nom de la campagne parente (niveau pub). */
  campaignName?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  frequency: number;
  ctr: number;
}

export type LeakVerdict = "kill" | "fix" | "keep" | "scale" | "watch";

export interface ScoredEntity extends EntityInsight {
  roas: number;
  cpa: number;
  /** Marge dégagée par les ventes − dépense (négatif = perte). */
  profit: number;
  /** Montant dépensé à perte sur la période (≥ 0). */
  leak: number;
  verdict: LeakVerdict;
  reason: string;
}

export interface ScanAction {
  entityId: string;
  entityName: string;
  level: "campaign" | "ad";
  verdict: Exclude<LeakVerdict, "keep" | "watch">;
  title: string;
  detail: string;
  /** Impact estimé en € / mois (économie pour kill/fix, gain indicatif pour scale). */
  impactMonthly: number;
}

export interface ScanResult {
  mode: "ok" | "no_revenue" | "no_spend";
  periodDays: number;
  marginPct: number;
  totals: {
    spend: number;
    revenue: number;
    purchases: number;
    roas: number;
    breakevenRoas: number;
    profit: number;
    /** Dépensé à perte sur la période (somme des campagnes à perte). */
    leak: number;
    leakMonthly: number;
    avgOrderValue: number;
  };
  campaigns: ScoredEntity[];
  ads: ScoredEntity[];
  actions: ScanAction[];
  counts: Record<LeakVerdict, number>;
}

const SCALE_STEP = 0.2; // +20 % de budget : palier prudent
const MIN_SPEND_FLOOR = 25;
const NO_AOV_SPEND = 40;

const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n))} €`;
const x = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)}×`;

/** Dépense minimale avant de juger une ligne : 2× le CPA maximum (au moins 25 €). */
export function significantSpend(avgOrderValue: number, marginPct: number): number {
  if (!(avgOrderValue > 0)) return NO_AOV_SPEND;
  return Math.max(MIN_SPEND_FLOOR, 2 * breakevenCpa(avgOrderValue, marginPct));
}

export function scoreEntity(e: EntityInsight, marginPct: number, minSpend: number): ScoredEntity {
  const be = breakevenRoas(marginPct);
  const roas = e.spend > 0 ? e.revenue / e.spend : 0;
  const cpa = e.purchases > 0 ? e.spend / e.purchases : 0;
  const profit = netProfit(e.spend, e.revenue, marginPct);
  const loss = profit < 0 ? -profit : 0;
  const base = { ...e, roas: round2(roas), cpa: round2(cpa), profit: round2(profit) };

  if (e.spend < minSpend) {
    return {
      ...base,
      leak: 0,
      verdict: "watch",
      reason: `Pas assez de dépense pour juger (${eur(e.spend)} sur ${eur(minSpend)} nécessaires).`,
    };
  }
  if (e.purchases === 0) {
    return {
      ...base,
      leak: round2(e.spend),
      verdict: "kill",
      reason: `${eur(e.spend)} dépensés sans aucune vente (au moins 2× le CPA maximum).`,
    };
  }
  if (roas < be * 0.7) {
    return {
      ...base,
      leak: round2(loss),
      verdict: "kill",
      reason: `ROAS ${x(roas)} très sous votre seuil de rentabilité (${x(be)}) : ${eur(loss)} perdus.`,
    };
  }
  if (roas < be * 0.95) {
    return {
      ...base,
      leak: round2(loss),
      verdict: "fix",
      reason: `ROAS ${x(roas)} sous le seuil de rentabilité (${x(be)}) : ${eur(loss)} perdus. À corriger avant de couper.`,
    };
  }
  if (roas >= be * 1.3 && e.purchases >= 5) {
    if (e.frequency >= 2.5) {
      return {
        ...base,
        leak: 0,
        verdict: "keep",
        reason: `Rentable (${x(roas)}) mais fréquence ${e.frequency.toFixed(1)} : renouvelez les créas avant de scaler.`,
      };
    }
    return {
      ...base,
      leak: 0,
      verdict: "scale",
      reason: `ROAS ${x(roas)} (seuil ${x(be)}), ${e.purchases} ventes, fréquence ${e.frequency.toFixed(1)} : marge de scaling.`,
    };
  }
  return {
    ...base,
    leak: 0,
    verdict: "keep",
    reason: `ROAS ${x(roas)} au-dessus du seuil (${x(be)}) : rentable, à surveiller.`,
  };
}

function emptyCounts(): Record<LeakVerdict, number> {
  return { kill: 0, fix: 0, keep: 0, scale: 0, watch: 0 };
}

export function runLeakScan(input: {
  campaigns: EntityInsight[];
  ads: EntityInsight[];
  marginPct: number;
  periodDays: number;
}): ScanResult {
  const { marginPct, periodDays } = input;
  const days = Math.max(1, periodDays);
  const monthly = 30 / days;
  const be = breakevenRoas(marginPct);

  const spend = input.campaigns.reduce((s, c) => s + c.spend, 0);
  const revenue = input.campaigns.reduce((s, c) => s + c.revenue, 0);
  const purchases = input.campaigns.reduce((s, c) => s + c.purchases, 0);
  const aov = purchases > 0 ? revenue / purchases : 0;
  const minSpend = significantSpend(aov, marginPct);

  const campaigns = input.campaigns
    .map((c) => scoreEntity(c, marginPct, minSpend))
    .sort((a, b) => b.leak - a.leak || b.spend - a.spend);
  const ads = input.ads
    .map((a) => scoreEntity(a, marginPct, minSpend))
    .sort((a, b) => b.leak - a.leak || b.spend - a.spend);

  const leak = campaigns.reduce((s, c) => s + c.leak, 0);
  const totals = {
    spend: round2(spend),
    revenue: round2(revenue),
    purchases,
    roas: round2(spend > 0 ? revenue / spend : 0),
    breakevenRoas: Number.isFinite(be) ? round2(be) : 0,
    profit: round2(netProfit(spend, revenue, marginPct)),
    leak: round2(leak),
    leakMonthly: round2(leak * monthly),
    avgOrderValue: round2(aov),
  };

  const counts = emptyCounts();
  for (const c of campaigns) counts[c.verdict] += 1;

  const mode: ScanResult["mode"] = spend <= 0 ? "no_spend" : revenue <= 0 ? "no_revenue" : "ok";

  // Actions : les pubs/campagnes à couper ou corriger d'abord (économie), puis les scalables (gain indicatif).
  const actions: ScanAction[] = [];
  if (mode === "ok") {
    for (const e of [...campaigns, ...ads]) {
      if (e.verdict === "kill" || e.verdict === "fix") {
        const verb = e.verdict === "kill" ? "Couper" : "Corriger";
        actions.push({
          entityId: e.id,
          entityName: e.name,
          level: e.level,
          verdict: e.verdict,
          title: `${verb} ${e.level === "ad" ? "la pub" : "la campagne"} « ${e.name} »`,
          detail: e.reason,
          impactMonthly: round2(e.leak * monthly),
        });
      } else if (e.verdict === "scale" && e.level === "campaign") {
        const gain = Math.max(0, e.profit) * monthly * SCALE_STEP;
        actions.push({
          entityId: e.id,
          entityName: e.name,
          level: e.level,
          verdict: "scale",
          title: `Scaler « ${e.name} » de +20 %`,
          detail: `${e.reason} Gain indicatif : ${eur(gain)}/mois si le ROAS tient (estimation).`,
          impactMonthly: round2(gain),
        });
      }
    }
    // Les pubs d'une campagne déjà à couper ne doivent pas doubler l'économie : on garde l'action campagne.
    const killedCampaigns = new Set(
      campaigns.filter((c) => c.verdict === "kill").map((c) => c.name),
    );
    const filtered = actions.filter(
      (a) => !(a.level === "ad" && killedCampaigns.has(ads.find((x2) => x2.id === a.entityId)?.campaignName ?? "")),
    );
    filtered.sort((a, b) => b.impactMonthly - a.impactMonthly);
    actions.length = 0;
    actions.push(...filtered);
  }

  return {
    mode,
    periodDays,
    marginPct: marginFraction(marginPct) * 100,
    totals,
    campaigns,
    ads,
    actions,
    counts,
  };
}
