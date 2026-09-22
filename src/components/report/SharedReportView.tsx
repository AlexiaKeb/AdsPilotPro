import {
  Activity,
  Eye,
  Rocket,
  BarChart3,
  Sparkles,
  Brain,
  AlertTriangle,
  Zap,
  Target,
  Calendar,
} from "lucide-react";
import type { SharedReport } from "@/lib/share.functions";

type ModuleId = "andromeda" | "oracle" | "mercury" | "atlas";

const MODULE_META: Record<ModuleId, { label: string; icon: typeof Activity }> = {
  andromeda: { label: "Andromeda", icon: Activity },
  oracle: { label: "Oracle LTV", icon: Eye },
  mercury: { label: "Mercury CRO", icon: Rocket },
  atlas: { label: "Atlas Scaling", icon: BarChart3 },
};

type Tone = "success" | "warning" | "danger" | "primary";
function scoreTone(s: number): Tone {
  if (s >= 70) return "success";
  if (s >= 45) return "warning";
  return "danger";
}
const toneColor = (t: Tone) => `var(--color-${t})`;
function sectorLabel(s: string) {
  if (s === "ecommerce") return "E-commerce";
  if (s === "infoproduit") return "Infoproduit";
  return "Service";
}
function num(v: unknown, digits = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function SharedReportView({ report }: { report: SharedReport }) {
  const r = (report.results ?? {}) as Record<string, number> & {
    ai_recommendations?: Record<string, Record<string, string>>;
  };
  const i = (report.inputs ?? {}) as Record<string, number>;

  const scores = {
    andromeda: Math.round(r.andromedaScore ?? 0),
    oracle: Math.round(r.oracleScore ?? 0),
    mercury: Math.round(r.mercuryScore ?? 0),
    atlas: Math.round(r.atlasScore ?? 0),
    vision: Math.round(r.visionScore ?? 0),
  };
  const globalScore = Math.round(
    (scores.andromeda + scores.oracle + scores.mercury + scores.atlas + scores.vision) / 5
  );
  const ai = r.ai_recommendations ?? {};

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 space-y-6">
      <div className="card-cockpit p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Rapport d'audit publicitaire
            </div>
            <h1 className="font-display font-bold tracking-tight text-2xl md:text-3xl mt-1">
              {report.auditName || "Audit AdsPilot Pro"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip-tag">{sectorLabel(report.sector)}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(report.createdAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}
              </span>
              {report.authorName && (
                <span className="text-xs text-muted-foreground">· par {report.authorName}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Score global
            </div>
            <div
              className="font-mono-data text-5xl font-bold mt-1"
              style={{ color: toneColor(scoreTone(globalScore)) }}
            >
              {globalScore}
              <span className="text-base text-muted-foreground ml-1">/100</span>
            </div>
          </div>
        </div>
      </div>

      <section className="card-cockpit p-6">
        <div className="font-display font-bold uppercase tracking-widest text-sm">
          Scores par module
        </div>
        <div className="mt-5 space-y-4">
          {(Object.keys(MODULE_META) as ModuleId[]).map((id) => {
            const Icon = MODULE_META[id].icon;
            const score = scores[id];
            const tone = scoreTone(score);
            return (
              <div key={id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: toneColor(tone) }} />
                    <span className="font-display font-bold uppercase tracking-widest text-xs">
                      {MODULE_META[id].label}
                    </span>
                  </div>
                  <span
                    className="font-mono-data text-sm font-bold"
                    style={{ color: toneColor(tone) }}
                  >
                    {score}/100
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-input">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, background: toneColor(tone) }}
                  />
                </div>
              </div>
            );
          })}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sparkles
                  className="h-4 w-4"
                  style={{ color: toneColor(scoreTone(scores.vision)) }}
                />
                <span className="font-display font-bold uppercase tracking-widest text-xs">
                  Vision Créative
                </span>
              </div>
              <span
                className="font-mono-data text-sm font-bold"
                style={{ color: toneColor(scoreTone(scores.vision)) }}
              >
                {scores.vision}/100
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-input">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${scores.vision}%`,
                  background: toneColor(scoreTone(scores.vision)),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card-cockpit p-6">
        <div className="font-display font-bold uppercase tracking-widest text-sm">
          Métriques analysées
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="ROAS actuel" value={`${num(i.roas_actual, 2)}×`} />
          <Stat label="CPA actuel" value={`${num(i.cpa_actual)} €`} />
          <Stat label="Budget /j" value={`${num(i.daily_budget)} €`} />
          <Stat label="Panier moyen" value={`${num(i.avg_cart)} €`} />
          <Stat label="Fréq. achat / an" value={`${num(i.purchase_freq, 1)}×`} />
          <Stat label="Rétention" value={`${num(i.retention)} %`} />
          <Stat label="LTV 12 mois" value={`${num(r.ltv12)} €`} />
          <Stat label="Add to cart" value={`${num(i.add_to_cart_rate, 1)} %`} />
          <Stat label="Abandon" value={`${num(i.abandon_rate)} %`} />
          <Stat label="Hook Rate" value={`${num(i.hook_rate)} %`} />
          <Stat label="Hold Rate" value={`${num(i.hold_rate)} %`} />
          <Stat label="CTR" value={`${num(i.ctr, 2)} %`} />
        </div>
      </section>

      {(Object.keys(MODULE_META) as ModuleId[]).map((mod) => {
        const diag = ai[mod];
        if (!diag) return null;
        return (
          <section key={mod} className="card-cockpit p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="font-display font-bold uppercase tracking-widest text-sm">
                Diagnostic IA — {MODULE_META[mod].label}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DiagCard
                icon={<Brain className="h-4 w-4" />}
                title="Diagnostic principal"
                body={diag['diagnostic_principal']}
                tone="primary"
                wide
              />
              <DiagCard
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Problème critique"
                body={diag['probleme_critique']}
                tone="danger"
              />
              <DiagCard
                icon={<Zap className="h-4 w-4" />}
                title="Action immédiate"
                body={diag['action_immediate']}
                tone="warning"
              />
              <DiagCard
                icon={<Target className="h-4 w-4" />}
                title="Objectif 30 jours"
                body={diag['action_30_jours']}
                tone="success"
              />
              <DiagCard
                icon={<Calendar className="h-4 w-4" />}
                title="Alerte si statu quo"
                body={diag['alerte']}
                tone="danger"
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3 border"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
    >
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono-data text-sm font-bold">{value}</div>
    </div>
  );
}

function DiagCard({
  icon,
  title,
  body,
  tone,
  wide = false,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  tone: Tone;
  wide?: boolean;
}) {
  if (!body) return null;
  const color = toneColor(tone);
  return (
    <div
      className={`rounded-xl p-5 border ${wide ? "md:col-span-2" : ""}`}
      style={{ borderColor: color, background: "var(--color-surface-2)" }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <div className="text-[10px] uppercase tracking-widest font-display font-bold">{title}</div>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{body}</div>
    </div>
  );
}
