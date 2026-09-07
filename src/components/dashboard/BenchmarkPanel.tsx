import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gauge, Loader2, RefreshCw } from "lucide-react";
import { getMetaBenchmarkData } from "@/lib/meta.functions";
import {
  compareToSector,
  formatBench,
  overallPositioning,
  type BenchKey,
  type BenchResult,
  type BenchSector,
} from "@/lib/benchmarks";

const SECTORS: { value: BenchSector; label: string }[] = [
  { value: "ecommerce", label: "E-commerce" },
  { value: "infoproduit", label: "Infoproduit" },
  { value: "service", label: "Service" },
];

const PERIODS: { value: 7 | 30 | 90; label: string }[] = [
  { value: 7, label: "7 j" },
  { value: 30, label: "30 j" },
  { value: 90, label: "90 j" },
];

const VERDICT: Record<BenchResult["verdict"], { color: string; label: string }> = {
  top: { color: "var(--color-success)", label: "Top secteur" },
  above: { color: "var(--color-success)", label: "Au-dessus" },
  average: { color: "var(--color-primary)", label: "Dans la moyenne" },
  below: { color: "var(--color-warning)", label: "En dessous" },
  critical: { color: "var(--color-danger)", label: "Critique" },
};

export function BenchmarkPanel() {
  const fetchBench = useServerFn(getMetaBenchmarkData);
  const [sector, setSector] = useState<BenchSector>("ecommerce");
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [metrics, setMetrics] = useState<Partial<Record<BenchKey, number>> | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const load = async (days: 7 | 30 | 90) => {
    setLoading(true);
    try {
      const res = await fetchBench({ data: { periodDays: days } });
      if (!res) {
        setAvailable(false);
        return;
      }
      setAvailable(true);
      setAccount(res.accountName ?? null);
      if (res.sector === "ecommerce" || res.sector === "infoproduit" || res.sector === "service") {
        setSector(res.sector);
      }
      const m = res.metrics;
      setMetrics({
        roas: m.roas,
        cpa: m.cpa,
        ctr: m.ctr,
        cpm: m.cpm,
        frequency: m.frequency,
        hookRate: m.hookRate,
        costPerLead: m.costPerLead,
      });
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(
    () => (metrics ? compareToSector(sector, metrics) : []),
    [metrics, sector],
  );
  const overall = overallPositioning(results);

  if (!available && !loading) return null;

  return (
    <div className="card-cockpit p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">
              Benchmarks secteur
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vos chiffres Meta comparés aux moyennes du secteur{account ? ` · ${account}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPeriod(p.value);
                  void load(p.value);
                }}
                className={`px-3 py-2 text-xs font-display font-bold uppercase tracking-widest transition ${
                  period === p.value ? "bg-primary text-primary-foreground" : "hover:bg-surface text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load(period)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs font-display font-bold uppercase tracking-widest hover:bg-surface transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualiser
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">Secteur</span>
        {SECTORS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSector(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition ${
              sector === s.value
                ? "btn-hero"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && !metrics ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Comparaison de vos métriques au secteur…
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pas assez de données sur cette période pour comparer. Choisissez une période plus longue.
        </p>
      ) : (
        <>
          {overall !== null && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Positionnement global
              </div>
              <div className="font-display text-2xl font-bold mt-1">
                Top {Math.max(2, 100 - overall)} % du secteur
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Vous faites mieux qu'environ {overall} % des comptes {SECTORS.find((s) => s.value === sector)?.label.toLowerCase()} comparables.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((r) => {
              const tone = VERDICT[r.verdict];
              return (
                <div key={r.key} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm">{r.label}</span>
                      <span
                        className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border"
                        style={{ color: tone.color, borderColor: tone.color }}
                      >
                        {tone.label}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-display font-bold">{formatBench(r.value, r.unit)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · médiane {formatBench(r.median, r.unit)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-border relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${r.percentile}%`, backgroundColor: tone.color }}
                    />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    <span>p0</span>
                    <span>médiane</span>
                    <span>p100</span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">{r.message}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">{r.hint}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
