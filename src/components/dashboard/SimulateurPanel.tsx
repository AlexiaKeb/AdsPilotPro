import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Zap, Brain, AlertTriangle, Target, Calendar } from "lucide-react";
import { toast } from "sonner";
import { analyzeAudit, type AuditDiagnostic } from "@/lib/audit-ai.functions";

type Tone = "primary" | "success" | "warning" | "danger";

const SECTORS = [
  { id: "ecommerce", label: "E-commerce" },
  { id: "infoproduit", label: "Infoproduit" },
  { id: "service", label: "Service" },
] as const;

export function SimulateurPanel() {
  const [sector, setSector] = useState<string>("ecommerce");
  const [daily, setDaily] = useState(150);
  const [price, setPrice] = useState(80);
  const [cogs, setCogs] = useState(35);
  const [ctr, setCtr] = useState(1.8);
  const [convRate, setConvRate] = useState(2.5);
  const [retention, setRetention] = useState(35);
  const [roasActual, setRoasActual] = useState(2.5);
  const [cpaActual, setCpaActual] = useState(28);
  const [ai, setAi] = useState<AuditDiagnostic | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const analyze = useServerFn(analyzeAudit);

  const k = useMemo(() => {
    const margin = price - price * (cogs / 100);
    const roasThreshold = margin > 0 ? price / margin : 0;
    const maxCpa = margin * 0.7;
    const ltv12 = price * (1 + retention / 100) * 1.6;
    const revenue = daily * 30 * roasActual;
    const cogsCost = revenue * (cogs / 100);
    const netMonthly = revenue - daily * 30 - cogsCost;
    const roasScore = roasThreshold > 0 ? Math.min(1, roasActual / roasThreshold) : 0;
    const cpaScore = maxCpa > 0 ? Math.min(1, maxCpa / Math.max(cpaActual, 1)) : 0;
    const score = Math.round((roasScore * 0.6 + cpaScore * 0.4) * 100);
    return { roasThreshold, maxCpa, ltv12, netMonthly, score };
  }, [daily, price, cogs, retention, roasActual, cpaActual]);

  const onGenerate = async () => {
    setLoadingAi(true);
    try {
      const result = await analyze({
        data: {
          sector,
          roas: roasActual,
          roas_threshold: k.roasThreshold,
          cpa: cpaActual,
          max_cpa: k.maxCpa,
          budget: daily,
          score: k.score,
        },
      });
      setAi(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Diagnostic indisponible.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card-cockpit p-6 space-y-5">
          <SectionTitle title="Paramètres" subtitle="Ajustez en temps réel" />
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2">Secteur</div>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSector(s.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-display font-bold uppercase tracking-widest transition ${
                    sector === s.id
                      ? "bg-primary/15 border border-primary text-primary"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Budget / jour" value={daily} min={10} max={5000} step={10} unit="€" onChange={setDaily} log />
          <Slider label="ROAS actuel" value={roasActual} min={0.1} max={12} step={0.1} unit="×" onChange={setRoasActual} decimals={1} />
          <Slider label="CPA actuel" value={cpaActual} min={1} max={500} step={1} unit="€" onChange={setCpaActual} />
          <Slider label="Prix de vente moyen" value={price} min={10} max={500} step={1} unit="€" onChange={setPrice} />
          <Slider label="COGS" value={cogs} min={0} max={80} step={1} unit="%" onChange={setCogs} />
          <Slider label="CTR" value={ctr} min={0.1} max={6} step={0.1} unit="%" onChange={setCtr} decimals={1} />
          <Slider label="Taux de conversion" value={convRate} min={0.1} max={10} step={0.1} unit="%" onChange={setConvRate} decimals={1} />
          <Slider label="Rétention LTV" value={retention} min={0} max={120} step={1} unit="%" onChange={setRetention} />
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Kpi label="Bénéfice net mensuel" value={k.netMonthly} unit="€" tone={k.netMonthly >= 0 ? "success" : "danger"} hero />
          <Kpi label="ROAS de sécurité" value={k.roasThreshold} unit="×" decimals={2} tone="primary" hero />
          <Kpi label="CPA maximum" value={k.maxCpa} unit="€" tone="warning" />
          <Kpi label="LTV 12 mois" value={k.ltv12} unit="€" tone="success" />
          <div className="md:col-span-2 card-cockpit p-6">
            <SectionTitle title="Verdict de rentabilité" subtitle="Simulation instantanée" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Card big label="ROAS actuel" value={`${roasActual.toFixed(2)}×`} tone={roasActual >= k.roasThreshold ? "success" : "danger"} />
              <Card big label="Score global" value={`${k.score}/100`} tone={k.score >= 60 ? "success" : "warning"} />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => void onGenerate()}
        disabled={loadingAi}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-display font-bold uppercase tracking-widest text-white disabled:opacity-60 transition hover:opacity-90"
        style={{ background: "var(--grad-primary)" }}
      >
        {loadingAi ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours par Claude…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" /> Générer mon diagnostic IA
          </>
        )}
      </button>

      {ai && (
        <div className="grid gap-4 md:grid-cols-2">
          <AiBlock icon={Brain} title="Diagnostic principal" text={ai.diagnostic_principal} tone="primary" />
          <AiBlock icon={AlertTriangle} title="Problème critique" text={ai.probleme_critique} tone="danger" />
          <AiBlock icon={Target} title="Action immédiate" text={ai.action_immediate} tone="success" />
          <AiBlock icon={Calendar} title="Objectif 30 jours" text={ai.action_30_jours} tone="warning" />
          <div className="md:col-span-2">
            <AiBlock icon={AlertTriangle} title="Alerte" text={ai.alerte} tone="danger" />
          </div>
        </div>
      )}
    </div>
  );
}

function AiBlock({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: typeof Brain;
  title: string;
  text: string;
  tone: Tone;
}) {
  const c = `var(--color-${tone})`;
  return (
    <div className="card-cockpit p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-display font-bold" style={{ color: c }}>
        <Icon className="h-4 w-4" /> {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{text}</p>
    </div>
  );
}


function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="font-display font-bold uppercase tracking-widest text-sm">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

function Slider({
  label, value, min, max, step, unit, onChange, decimals = 0, log = false,
}: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; decimals?: number; log?: boolean }) {
  const toSlider = (v: number) => {
    if (!log) return v;
    const lmin = Math.log(min), lmax = Math.log(max);
    return ((Math.log(v) - lmin) / (lmax - lmin)) * 1000;
  };
  const fromSlider = (s: number) => {
    if (!log) return s;
    const lmin = Math.log(min), lmax = Math.log(max);
    return Math.round(Math.exp(lmin + (s / 1000) * (lmax - lmin)));
  };
  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
        <div className="font-mono-data text-base font-bold">
          {value.toFixed(decimals)}
          <span className="text-muted-foreground ml-0.5">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={log ? 0 : min}
        max={log ? 1000 : max}
        step={log ? 1 : step}
        value={toSlider(value)}
        onChange={(e) => onChange(fromSlider(parseFloat(e.target.value)))}
        className="w-full accent-[var(--color-primary)]"
      />
    </div>
  );
}

function Kpi({
  label, value, unit, tone, decimals = 0, hero = false,
}: { label: string; value: number; unit: string; tone: Tone; decimals?: number; hero?: boolean }) {
  const colorVar = `var(--color-${tone})`;
  return (
    <div className="card-cockpit p-6">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{label}</div>
      <div className={`mt-3 font-mono-data font-bold ${hero ? "text-4xl" : "text-2xl"}`} style={{ color: colorVar }}>
        {value.toLocaleString("fr-FR", { maximumFractionDigits: decimals })}
        <span className="text-muted-foreground ml-1 text-base">{unit}</span>
      </div>
    </div>
  );
}

function Card({ big, label, value, tone }: { big?: boolean; label: string; value: string; tone: string }) {
  const c = `var(--color-${tone})`;
  return (
    <div className="rounded-xl p-5 border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-mono-data ${big ? "text-3xl" : "text-xl"} font-bold`} style={{ color: c }}>
        {value}
      </div>
    </div>
  );
}
