import { useMemo, useState } from "react";

type Tone = "primary" | "success" | "warning" | "danger";

export function SimulateurPanel() {
  const [daily, setDaily] = useState(150);
  const [price, setPrice] = useState(80);
  const [cogs, setCogs] = useState(35);
  const [ctr, setCtr] = useState(1.8);
  const [convRate, setConvRate] = useState(2.5);
  const [retention, setRetention] = useState(35);

  const k = useMemo(() => {
    const margin = price - price * (cogs / 100);
    const roasThreshold = margin > 0 ? price / margin : 0;
    const maxCpa = margin * 0.7;
    const ltv12 = price * (1 + retention / 100) * 1.6;
    const revenue = daily * 30 * 2.5;
    const cogsCost = revenue * (cogs / 100);
    const netMonthly = revenue - daily * 30 - cogsCost;
    return { roasThreshold, maxCpa, ltv12, netMonthly, ctr, convRate };
  }, [daily, price, cogs, ctr, convRate, retention]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 card-cockpit p-6 space-y-5">
        <SectionTitle title="Paramètres" subtitle="Ajustez en temps réel" />
        <Slider label="Budget / jour" value={daily} min={10} max={5000} step={10} unit="€" onChange={setDaily} log />
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
          <SectionTitle title="ROI prédit vs ROI réel" subtitle="Trading view" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Card big label="ROI prédit" value="4.50×" tone="primary" />
            <Card big label="ROI réel" value="4.48×" tone="success" />
          </div>
        </div>
      </div>
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
