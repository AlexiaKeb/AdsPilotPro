import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { onAudit } from "./auditHistoryBus";

type Row = {
  id: string;
  created_at: string;
  sector: string;
  results: Record<string, number> | null;
};

const MODULES: { key: string; label: string }[] = [
  { key: "andromedaScore", label: "Andromeda" },
  { key: "oracleScore", label: "Oracle LTV" },
  { key: "mercuryScore", label: "Mercury" },
  { key: "visionScore", label: "Vision" },
  { key: "atlasScore", label: "Atlas" },
];

function globalScore(r: Record<string, number> | null): number | null {
  const vals = MODULES.map((m) => r?.[m.key]).filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function ProgressPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("audits")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, created_at, sector, results" as any)
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    return onAudit("audit:saved", () => load());
  }, []);

  const series = useMemo(
    () =>
      rows
        .map((r) => ({
          date: new Date(r.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          }),
          score: globalScore(r.results),
          raw: r,
        }))
        .filter((p) => p.score !== null) as {
        date: string;
        score: number;
        raw: Row;
      }[],
    [rows],
  );

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const delta = last && prev ? last.score - prev.score : null;

  const moduleDeltas = useMemo(() => {
    if (!last || !prev) return [];
    return MODULES.map((m) => {
      const a = last.raw.results?.[m.key];
      const b = prev.raw.results?.[m.key];
      if (typeof a !== "number" || typeof b !== "number") return null;
      return { label: m.label, now: Math.round(a), diff: Math.round(a - b) };
    }).filter(Boolean) as { label: string; now: number; diff: number }[];
  }, [last, prev]);

  if (loading) {
    return (
      <div className="card-cockpit p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre progression…
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="card-cockpit p-6">
        <div className="flex items-center gap-2 font-display font-bold uppercase tracking-widest text-sm">
          <Activity className="h-4 w-4 text-primary" /> Ma progression
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Enregistrez votre premier audit pour suivre l&apos;évolution de votre score dans le temps.
        </p>
      </div>
    );
  }

  return (
    <div className="card-cockpit p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-display font-bold uppercase tracking-widest text-sm">
            <Activity className="h-4 w-4 text-primary" /> Ma progression
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {series.length} audit{series.length > 1 ? "s" : ""} enregistré{series.length > 1 ? "s" : ""}
            {series.length > 1 ? " · évolution de votre score global" : ""}
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Score actuel</div>
            <div className="font-display text-3xl font-bold leading-none">{last.score}</div>
          </div>
          {delta !== null && <DeltaBadge diff={delta} />}
        </div>
      </div>

      {series.length > 1 && (
        <div className="mt-6 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}/100`, "Score global"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {moduleDeltas.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          {moduleDeltas.map((m) => (
            <div key={m.label} className="rounded-lg border border-border p-3">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{m.label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold">{m.now}</span>
                <DeltaText diff={m.diff} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ diff }: { diff: number }) {
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone =
    diff > 0
      ? "text-success border-success/40 bg-success/10"
      : diff < 0
        ? "text-destructive border-destructive/40 bg-destructive/10"
        : "text-muted-foreground border-border bg-surface";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-display font-bold uppercase tracking-widest ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {diff > 0 ? "+" : ""}
      {diff} pts
    </span>
  );
}

function DeltaText({ diff }: { diff: number }) {
  if (diff === 0) return <span className="text-xs text-muted-foreground">=</span>;
  return (
    <span className={`text-xs font-semibold ${diff > 0 ? "text-success" : "text-destructive"}`}>
      {diff > 0 ? "+" : ""}
      {diff}
    </span>
  );
}
