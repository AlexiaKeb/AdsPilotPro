import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, Loader2, Lock, ScanSearch, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getMetaStatus } from "@/lib/meta.functions";
import { getScanDefaults, runProfitLeakScan, type ProfitScanResponse } from "@/lib/profit-scan.functions";
import type { LeakVerdict, ScoredEntity } from "@/lib/leak-scan";
import { DEFAULT_MARGIN_PCT } from "@/lib/profit-engine";

type Period = 7 | 30 | 90;

const VERDICT: Record<LeakVerdict, { label: string; color: string }> = {
  kill: { label: "Couper", color: "var(--color-danger)" },
  fix: { label: "Corriger", color: "var(--color-warning)" },
  keep: { label: "Garder", color: "var(--color-muted-foreground)" },
  scale: { label: "Scaler", color: "var(--color-success)" },
  watch: { label: "À surveiller", color: "var(--color-muted-foreground)" },
};

const eur = (n: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n))} €`;

export function ProfitLeakScan() {
  const status = useServerFn(getMetaStatus);
  const defaults = useServerFn(getScanDefaults);
  const scan = useServerFn(runProfitLeakScan);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [margin, setMargin] = useState("");
  const [marginKnown, setMarginKnown] = useState(false);
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfitScanResponse | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [st, d] = await Promise.all([status({}), defaults({})]);
        if (!alive) return;
        setConnected(st.connected && !st.expired);
        if (d.marginPct) {
          setMargin(String(d.marginPct));
          setMarginKnown(true);
        } else {
          const sector = (d.sector ?? "ecommerce") as keyof typeof DEFAULT_MARGIN_PCT;
          setMargin(String(DEFAULT_MARGIN_PCT[sector] ?? DEFAULT_MARGIN_PCT.ecommerce));
        }
      } catch {
        if (alive) setConnected(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, defaults]);

  const run = useCallback(async () => {
    const m = parseFloat(margin.replace(",", "."));
    if (!Number.isFinite(m) || m <= 0 || m > 100) {
      toast.error("Indiquez votre marge brute entre 1 et 100 %.");
      return;
    }
    setLoading(true);
    try {
      const res = await scan({ data: { periodDays: period, marginPct: m } });
      setResult(res);
      setMarginKnown(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [margin, period, scan]);

  return (
    <section className="card-cockpit p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 shrink-0">
          <ScanSearch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-display font-bold uppercase tracking-widest text-sm">Profit Leak Scan</div>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Votre profit net réel, et combien d&apos;argent part dans des campagnes ou des pubs non rentables,
            calculé sur votre marge. Sans IA : gratuit et instantané.
          </p>
        </div>
      </div>

      {connected === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : !connected ? (
        <div className="rounded-xl border border-border bg-surface-2 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Connectez votre compte Meta Ads (lecture seule) pour lancer le scan.
          </p>
          <button
            onClick={() => document.getElementById("meta-connect")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-bold uppercase tracking-widest"
          >
            Connecter Meta <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Marge brute avant pub (%) {marginKnown ? "" : "· à confirmer"}
            </span>
            <input
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              className="block w-40 px-3.5 py-2.5 rounded-lg border border-border bg-input/40 text-sm font-mono-data outline-none focus:border-primary transition"
            />
          </label>
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Période</span>
            <div className="flex gap-2">
              {([7, 30, 90] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition ${
                    period === p ? "btn-hero" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p} j
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => void run()}
            disabled={loading}
            className="btn-hero inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {loading ? "Analyse en cours…" : result ? "Relancer le scan" : "Lancer le scan"}
          </button>
          <p className="basis-full text-[11px] text-muted-foreground leading-snug">
            Marge brute = prix de vente − coût produit − livraison − frais de paiement − remboursements moyens. Elle
            détermine votre seuil de rentabilité.
          </p>
        </div>
      )}

      {result && <ScanResultView res={result} />}
    </section>
  );
}

function ScanResultView({ res }: { res: ProfitScanResponse }) {
  const { scan } = res;
  const t = scan.totals;

  if (scan.mode === "no_spend") {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
        Aucune dépense publicitaire sur les {scan.periodDays} derniers jours.
      </div>
    );
  }
  if (scan.mode === "no_revenue") {
    return (
      <div className="rounded-xl border border-[var(--color-warning)]/40 bg-surface-2 p-4 text-sm flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "var(--color-warning)" }} />
        <p className="text-muted-foreground">
          {eur(t.spend)} dépensés mais <strong className="text-foreground">aucune vente suivie</strong> par Meta. Soit
          votre compte fait de la génération de leads, soit le Pixel / l&apos;API de conversions ne remonte pas les
          achats : le scan de rentabilité nécessite le suivi des achats.
        </p>
      </div>
    );
  }

  const losing = t.profit < 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label={`Profit net réel · ${scan.periodDays} j`}
          value={`${t.profit >= 0 ? "+" : "−"}${eur(Math.abs(t.profit))}`}
          sub={`${eur(t.spend)} dépensés · ROAS ${t.roas.toFixed(2)}× (seuil ${t.breakevenRoas.toFixed(2)}×)`}
          color={losing ? "var(--color-danger)" : "var(--color-success)"}
          icon={losing ? TrendingDown : TrendingUp}
        />
        <Stat
          label="Dépensé à perte"
          value={eur(t.leak)}
          sub={t.leak > 0 ? `≈ ${eur(t.leakMonthly)} / mois au rythme actuel` : "Aucune campagne à perte détectée"}
          color={t.leak > 0 ? "var(--color-danger)" : "var(--color-success)"}
          icon={AlertTriangle}
        />
        <Stat
          label="Verdicts (campagnes)"
          value={`${scan.counts.kill + scan.counts.fix} à traiter`}
          sub={`${scan.counts.scale} à scaler · ${scan.counts.keep} à garder · ${scan.counts.watch} trop récentes`}
          color="var(--color-primary)"
          icon={ScanSearch}
        />
      </div>

      {scan.actions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Actions classées par impact
          </div>
          {scan.actions.map((a) => (
            <div key={`${a.level}-${a.entityId}-${a.verdict}`} className="rounded-xl border border-border bg-surface-2 p-4 flex items-start gap-3">
              <span
                className="chip-tag shrink-0"
                style={{ color: VERDICT[a.verdict].color, borderColor: VERDICT[a.verdict].color }}
              >
                {VERDICT[a.verdict].label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono-data text-sm font-bold">
                  {a.verdict === "scale" ? "+" : "−"}
                  {eur(a.impactMonthly)}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ mois</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityTable title="Campagnes" rows={scan.campaigns} />
      {scan.ads.length > 0 && <EntityTable title="Pubs" rows={scan.ads} />}

      {res.plan === "free" && res.hiddenRows > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-primary" />
            <span>
              <strong>{res.hiddenRows}</strong> ligne{res.hiddenRows > 1 ? "s" : ""} supplémentaire
              {res.hiddenRows > 1 ? "s" : ""} (campagnes, pubs et actions) incluses dans les plans payants.
            </span>
          </div>
          <Link
            to="/pricing"
            className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-bold uppercase tracking-widest"
          >
            Voir les plans <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Données Meta sur {scan.periodDays} jours, revenus tels que déclarés par Meta (fenêtre d&apos;attribution du
        compte). Une ligne n&apos;est jugée qu&apos;après 2× le CPA maximum de dépense. Les gains de scaling sont des
        estimations.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mt-2 font-mono-data text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function EntityTable({ title, rows }: { title: string; rows: ScoredEntity[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{title}</div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-muted-foreground uppercase tracking-widest text-[10px]">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-right p-3">Dépense</th>
              <th className="text-right p-3">ROAS</th>
              <th className="text-right p-3">Ventes</th>
              <th className="text-right p-3">Profit</th>
              <th className="text-left p-3">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border" title={r.reason}>
                <td className="p-3 max-w-[260px] truncate">
                  {r.name}
                  {r.campaignName ? <span className="text-muted-foreground"> · {r.campaignName}</span> : null}
                </td>
                <td className="p-3 text-right font-mono-data">{eur(r.spend)}</td>
                <td className="p-3 text-right font-mono-data">{r.roas.toFixed(2)}×</td>
                <td className="p-3 text-right font-mono-data">{r.purchases}</td>
                <td
                  className="p-3 text-right font-mono-data"
                  style={{ color: r.profit < 0 ? "var(--color-danger)" : "var(--color-success)" }}
                >
                  {r.profit >= 0 ? "+" : "−"}
                  {eur(Math.abs(r.profit))}
                </td>
                <td className="p-3">
                  <span className="font-bold uppercase tracking-widest text-[10px]" style={{ color: VERDICT[r.verdict].color }}>
                    {VERDICT[r.verdict].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
