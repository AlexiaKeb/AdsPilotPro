import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import type { MetaImportedMetrics } from "./MetaConnectCard";

const nf = (n: number, suffix = "") =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)}${suffix}`;

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? "var(--color-success)" : tone === "bad" ? "var(--color-danger)" : undefined;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display font-bold text-sm" style={color ? { color } : undefined}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

export function MetaPerformancePanel({ m }: { m: MetaImportedMetrics }) {
  const periodText = m.allTime
    ? `depuis toujours${
        m.periodStart
          ? ` (${new Date(m.periodStart).toLocaleDateString("fr-FR")} → ${
              m.periodEnd ? new Date(m.periodEnd).toLocaleDateString("fr-FR") : "aujourd'hui"
            })`
          : ""
      }`
    : `${m.periodDays} derniers jours`;

  const profit = m.revenue - m.spend;
  const profitable = profit >= 0;

  const money = [
    { name: "Dépense", value: m.spend, color: "var(--color-danger)" },
    { name: "Revenu", value: m.revenue, color: "var(--color-success)" },
  ];

  const clickRate = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
  const atcRate = m.clicks > 0 ? (m.addToCart / m.clicks) * 100 : 0;
  const buyRate = m.addToCart > 0 ? (m.purchases / m.addToCart) * 100 : 0;

  const funnel = [
    { name: "Impressions", value: m.impressions, pct: 100 },
    { name: "Clics", value: m.clicks, pct: clickRate },
    { name: "Ajouts panier", value: m.addToCart, pct: atcRate },
    { name: "Achats", value: m.purchases, pct: buyRate },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        Performance Meta — {periodText}
        {m.accountName ? <span className="normal-case tracking-normal">· {m.accountName}</span> : null}
      </div>

      {/* Résultat business */}
      <div className="rounded-xl border border-border bg-surface-2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Résultat net sur la période
          </div>
          <div
            className="mt-1 font-mono-data text-3xl font-bold flex items-center gap-2"
            style={{ color: profitable ? "var(--color-success)" : "var(--color-danger)" }}
          >
            {profitable ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
            {nf(profit, " €")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {nf(m.revenue, " €")} de revenu pour {nf(m.spend, " €")} investis · ROAS {nf(m.roas, "×")}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-[220px]">
          <Stat label="Budget / jour" value={nf(m.dailyBudget, " €")} hint={`${m.effectiveDays} j`} />
          <Stat label="Achats" value={nf(m.purchases)} hint={`Panier ${nf(m.avgCart, " €")}`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Dépense vs revenu */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Dépense vs revenu
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={money} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={60} />
                <Tooltip
                  formatter={(v: number) => nf(v, " €")}
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {money.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tunnel */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Tunnel de conversion
          </div>
          <div className="space-y-2.5">
            {funnel.map((step, i) => {
              const width = m.impressions > 0 ? Math.max(2, (step.value / m.impressions) * 100) : 0;
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{step.name}</span>
                    <span className="font-mono-data font-bold">
                      {nf(step.value)}
                      {i > 0 && (
                        <span className="text-muted-foreground font-normal ml-2">
                          {nf(step.pct, " %")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.sqrt(width / 100) * 100)}%`,
                        background: "var(--grad-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="ROAS" value={nf(m.roas, "×")} tone={m.roas >= 2 ? "good" : "bad"} />
        <Stat label="CPA" value={nf(m.cpa, " €")} />
        <Stat label="CTR" value={nf(m.ctr, " %")} tone={m.ctr >= 1 ? "good" : "bad"} />
        <Stat label="CPM" value={nf(m.cpm, " €")} />
        <Stat label="Impressions" value={nf(m.impressions)} />
        <Stat label="Fréquence" value={nf(m.frequency)} tone={m.frequency <= 3 ? "good" : "bad"} />
        <Stat label="Hook rate" value={nf(m.hookRate, " %")} hint="Vues 3s" />
        <Stat label="Hold rate" value={nf(m.holdRate, " %")} hint="Vues 75%" />
        <Stat label="Taux ajout panier" value={nf(m.addToCartRate, " %")} />
        <Stat label="Taux d'abandon" value={nf(m.abandonRate, " %")} tone={m.abandonRate <= 70 ? "good" : "bad"} />
        <Stat label="Clics" value={nf(m.clicks)} />
        <Stat label="Panier moyen" value={nf(m.avgCart, " €")} />
      </div>

      <p className="text-xs text-muted-foreground">
        Ces chiffres remplissent automatiquement les modules Andromeda, Oracle, Mercury et Vision, et sont
        transmis à l&apos;IA lors du diagnostic.
      </p>
    </div>
  );
}
