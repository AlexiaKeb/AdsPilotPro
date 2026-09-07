/**
 * Benchmarks Meta Ads par secteur.
 * Valeurs de référence (distribution p10 → p90) issues d'agrégats marché
 * Meta Ads 2024-2025 pour comptes PME/solopreneurs francophones.
 * Utilisées pour positionner l'utilisateur en percentile, pas comme vérité absolue.
 */

export type BenchSector = "ecommerce" | "infoproduit" | "service";

export type BenchKey =
  | "roas"
  | "cpa"
  | "ctr"
  | "cpm"
  | "frequency"
  | "hookRate"
  | "costPerLead";

export interface BenchDef {
  key: BenchKey;
  label: string;
  unit: "x" | "%" | "€" | "";
  /** true = plus c'est bas, mieux c'est (CPA, CPM, CPL) */
  lowerIsBetter: boolean;
  /** quantiles croissants p10,p25,p50,p75,p90 */
  q: [number, number, number, number, number];
  hint: string;
}

const DEFS: Record<BenchSector, BenchDef[]> = {
  ecommerce: [
    { key: "roas", label: "ROAS", unit: "x", lowerIsBetter: false, q: [0.7, 1.3, 2.1, 3.2, 4.8], hint: "Retour publicitaire moyen e-commerce : 2,1x" },
    { key: "cpa", label: "CPA", unit: "€", lowerIsBetter: true, q: [12, 19, 30, 48, 78], hint: "Coût d'acquisition médian : 30 €" },
    { key: "ctr", label: "CTR", unit: "%", lowerIsBetter: false, q: [0.6, 0.9, 1.3, 1.9, 2.8], hint: "CTR médian : 1,3 %" },
    { key: "cpm", label: "CPM", unit: "€", lowerIsBetter: true, q: [5, 8, 12, 18, 27], hint: "CPM médian : 12 €" },
    { key: "frequency", label: "Fréquence", unit: "", lowerIsBetter: true, q: [1.1, 1.3, 1.7, 2.3, 3.2], hint: "Au-delà de 2,5 la fatigue créative s'installe" },
    { key: "hookRate", label: "Hook rate", unit: "%", lowerIsBetter: false, q: [12, 18, 25, 33, 44], hint: "3 s de vue / impressions" },
  ],
  infoproduit: [
    { key: "roas", label: "ROAS", unit: "x", lowerIsBetter: false, q: [0.8, 1.4, 2.4, 3.8, 6.0], hint: "Marges élevées : viser 2,4x minimum" },
    { key: "cpa", label: "CPA", unit: "€", lowerIsBetter: true, q: [18, 32, 55, 90, 150], hint: "Panier plus élevé, CPA médian : 55 €" },
    { key: "ctr", label: "CTR", unit: "%", lowerIsBetter: false, q: [0.7, 1.1, 1.6, 2.4, 3.5], hint: "CTR médian : 1,6 %" },
    { key: "cpm", label: "CPM", unit: "€", lowerIsBetter: true, q: [4, 7, 10, 15, 23], hint: "CPM médian : 10 €" },
    { key: "frequency", label: "Fréquence", unit: "", lowerIsBetter: true, q: [1.1, 1.4, 1.9, 2.6, 3.6], hint: "Audiences souvent plus étroites" },
    { key: "hookRate", label: "Hook rate", unit: "%", lowerIsBetter: false, q: [14, 20, 28, 37, 48], hint: "Le contenu vidéo porte l'infoproduit" },
    { key: "costPerLead", label: "Coût par lead", unit: "€", lowerIsBetter: true, q: [1.2, 2.5, 4.5, 8, 14], hint: "CPL médian : 4,50 €" },
  ],
  service: [
    { key: "roas", label: "ROAS", unit: "x", lowerIsBetter: false, q: [0.6, 1.2, 2.0, 3.4, 5.5], hint: "Souvent estimé via la valeur client" },
    { key: "cpa", label: "CPA", unit: "€", lowerIsBetter: true, q: [20, 38, 70, 120, 200], hint: "Cycle de vente plus long" },
    { key: "ctr", label: "CTR", unit: "%", lowerIsBetter: false, q: [0.5, 0.8, 1.2, 1.8, 2.6], hint: "CTR médian : 1,2 %" },
    { key: "cpm", label: "CPM", unit: "€", lowerIsBetter: true, q: [6, 9, 14, 21, 32], hint: "CPM médian : 14 €" },
    { key: "frequency", label: "Fréquence", unit: "", lowerIsBetter: true, q: [1.1, 1.4, 1.8, 2.5, 3.4], hint: "Zones géographiques restreintes" },
    { key: "costPerLead", label: "Coût par lead", unit: "€", lowerIsBetter: true, q: [3, 6, 12, 22, 40], hint: "CPL médian : 12 €" },
  ],
};

const PCTS = [10, 25, 50, 75, 90];

/** Percentile de la valeur dans la distribution du secteur (0-100, 100 = meilleur). */
function rawPercentile(value: number, q: BenchDef["q"]): number {
  if (value <= q[0]) return Math.max(2, (value / (q[0] || 1)) * 10);
  if (value >= q[4]) return 96;
  for (let i = 0; i < q.length - 1; i++) {
    const lo = q[i]!;
    const hi = q[i + 1]!;
    if (value <= hi) {
      const ratio = hi === lo ? 0 : (value - lo) / (hi - lo);
      return PCTS[i]! + ratio * (PCTS[i + 1]! - PCTS[i]!);
    }
  }
  return 50;
}

export interface BenchResult {
  key: BenchKey;
  label: string;
  unit: BenchDef["unit"];
  value: number;
  median: number;
  /** 0-100, 100 = mieux que tout le secteur */
  percentile: number;
  verdict: "top" | "above" | "average" | "below" | "critical";
  message: string;
  hint: string;
}

export function sectorBenchmarks(sector: BenchSector) {
  return DEFS[sector] ?? DEFS.ecommerce;
}

function fmt(value: number, unit: BenchDef["unit"]): string {
  if (unit === "€") return `${value.toFixed(value < 10 ? 2 : 0)} €`;
  if (unit === "%") return `${value.toFixed(1)} %`;
  if (unit === "x") return `${value.toFixed(2)}x`;
  return value.toFixed(2);
}

export function formatBench(value: number, unit: BenchDef["unit"]) {
  return fmt(value, unit);
}

export function compareToSector(
  sector: BenchSector,
  metrics: Partial<Record<BenchKey, number>>,
): BenchResult[] {
  const out: BenchResult[] = [];
  for (const def of sectorBenchmarks(sector)) {
    const value = metrics[def.key];
    if (value === undefined || !Number.isFinite(value) || value <= 0) continue;

    const raw = rawPercentile(value, def.q);
    const percentile = def.lowerIsBetter ? 100 - raw : raw;
    const median = def.q[2];

    const verdict: BenchResult["verdict"] =
      percentile >= 80 ? "top"
        : percentile >= 60 ? "above"
          : percentile >= 40 ? "average"
            : percentile >= 20 ? "below" : "critical";

    const delta = median === 0 ? 0 : ((value - median) / median) * 100;
    const dir = delta >= 0 ? "au-dessus" : "en dessous";
    const good = def.lowerIsBetter ? delta < 0 : delta > 0;

    const message =
      `${fmt(value, def.unit)} · ${Math.abs(delta).toFixed(0)} % ${dir} de la médiane secteur (${fmt(median, def.unit)}) — ` +
      (good ? "avantage pour vous." : "marge de progression.");

    out.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      value,
      median,
      percentile: Math.round(Math.min(98, Math.max(2, percentile))),
      verdict,
      message,
      hint: def.hint,
    });
  }
  return out;
}

export function overallPositioning(results: BenchResult[]): number | null {
  if (!results.length) return null;
  return Math.round(results.reduce((s, r) => s + r.percentile, 0) / results.length);
}
