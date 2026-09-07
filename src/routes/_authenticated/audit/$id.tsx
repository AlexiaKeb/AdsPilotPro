import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  FileDown,
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
  Tag as TagIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AuditDiagnostic } from "@/lib/audit-ai.functions";
import {
  buildAndDownloadPdf,
  SCORED_MODULES,
  TAG_COLORS,
  type AuditInputs,
  type AuditTag,
  type Sector,
  type ScoredModuleId,
} from "@/components/dashboard/AuditsTab";

export const Route = createFileRoute("/_authenticated/audit/$id")({
  head: () => ({
    meta: [
      { title: "Détail de l'audit — AdsPilot Pro" },
      { name: "description", content: "Consultez le détail d'un audit enregistré : scores par module, diagnostic IA et export PDF." },
      { property: "og:title", content: "Détail de l'audit — AdsPilot Pro" },
      { property: "og:description", content: "Consultez le détail d'un audit enregistré : scores par module, diagnostic IA et export PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditDetailPage,
});

type AuditRecord = {
  id: string;
  name: string | null;
  sector: Sector;
  tags: string[] | null;
  created_at: string;
  inputs: AuditInputs;
  results: Record<string, number> & {
    ai_recommendations?: Partial<Record<ScoredModuleId, AuditDiagnostic>>;
  };
};

const MODULE_META: Record<ScoredModuleId, { label: string; icon: typeof Activity }> = {
  andromeda: { label: "Andromeda", icon: Activity },
  oracle: { label: "Oracle LTV", icon: Eye },
  mercury: { label: "Mercury CRO", icon: Rocket },
  atlas: { label: "Atlas Scaling", icon: BarChart3 },
};

function AuditDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const [auditRes, profileRes] = await Promise.all([
        supabase
          .from("audits")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select("id, name, sector, tags, created_at, inputs, results" as any)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, first_name, last_name, email")
          .eq("id", u.user.id)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      if (auditRes.error || !auditRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setAudit(auditRes.data as unknown as AuditRecord);
      const p = profileRes.data;
      if (p) {
        setClientName(
          p.full_name ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            p.email ||
            ""
        );
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  const moduleScores = useMemo(() => {
    if (!audit) return null;
    const r = audit.results;
    return {
      andromeda: Math.round(r.andromedaScore ?? 0),
      oracle: Math.round(r.oracleScore ?? 0),
      mercury: Math.round(r.mercuryScore ?? 0),
      atlas: Math.round(r.atlasScore ?? 0),
      vision: Math.round(r.visionScore ?? 0),
    };
  }, [audit]);

  const globalScore = useMemo(() => {
    if (!moduleScores) return 0;
    return Math.round(
      (moduleScores.andromeda +
        moduleScores.oracle +
        moduleScores.mercury +
        moduleScores.atlas +
        moduleScores.vision) /
        5
    );
  }, [moduleScores]);

  const onDownloadPdf = async () => {
    if (!audit || !moduleScores) return;
    setPdfBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const ai = audit.results.ai_recommendations ?? {};
      // Focus on the lowest-scored module (most actionable) in the PDF
      const best = SCORED_MODULES.reduce<ScoredModuleId>(
        (acc, m) =>
          (moduleScores[m as keyof typeof moduleScores] as number) <
          (moduleScores[acc as keyof typeof moduleScores] as number)
            ? m
            : acc,
        "andromeda"
      );
      buildAndDownloadPdf({
        clientName: clientName || "Client AdsPilot",
        sector: audit.sector,
        inputs: audit.inputs,
        results: audit.results,
        aiByModule: ai,
        activeModuleId: best,
      });
    } catch (e) {
      toast.error((e as Error).message || "Erreur de génération PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !audit || !moduleScores) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
        <h1 className="font-display font-bold uppercase tracking-widest text-lg mb-2">
          Audit introuvable
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Cet audit n'existe pas ou ne vous appartient pas.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'historique
        </Link>
      </div>
    );
  }

  const ai = audit.results.ai_recommendations ?? {};

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3.5 py-2 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'historique
        </Link>
        <button
          onClick={onDownloadPdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60 transition hover:opacity-90"
          style={{ background: "var(--grad-primary)" }}
        >
          {pdfBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Génération…
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" /> Télécharger le rapport PDF
            </>
          )}
        </button>
      </div>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card-cockpit p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Audit
            </div>
            <h1 className="font-display font-bold tracking-tight text-2xl md:text-3xl mt-1">
              {audit.name || (
                <span className="text-muted-foreground italic">Audit sans nom</span>
              )}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip-tag">{sectorLabel(audit.sector)}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(audit.created_at).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {(audit.tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {(audit.tags ?? []).map((t) => {
                  const color = TAG_COLORS[t as AuditTag] ?? "var(--color-muted-foreground)";
                  return (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-widest text-primary-foreground"
                      style={{ background: color }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            )}
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
      </motion.div>

      {/* Module scores */}
      <section className="card-cockpit p-6">
        <SectionTitle
          title="Scores par module"
          subtitle="Performance détaillée des 5 axes"
        />
        <div className="mt-5 space-y-4">
          {(["andromeda", "oracle", "mercury", "atlas"] as ScoredModuleId[]).map((id) => {
            const Icon = MODULE_META[id].icon;
            const score = moduleScores[id as keyof typeof moduleScores] as number;
            const tone = scoreTone(score);
            return (
              <div key={id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon
                      className="h-4 w-4"
                      style={{ color: toneColor(tone) }}
                    />
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
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: toneColor(tone) }}
                  />
                </div>
              </div>
            );
          })}
          {/* Vision */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles
                  className="h-4 w-4"
                  style={{ color: toneColor(scoreTone(moduleScores.vision)) }}
                />
                <span className="font-display font-bold uppercase tracking-widest text-xs">
                  Vision Créative
                </span>
              </div>
              <span
                className="font-mono-data text-sm font-bold"
                style={{ color: toneColor(scoreTone(moduleScores.vision)) }}
              >
                {moduleScores.vision}/100
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-input">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${moduleScores.vision}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: toneColor(scoreTone(moduleScores.vision)) }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="card-cockpit p-6">
        <SectionTitle title="Métriques saisies" subtitle="Données du diagnostic" />
        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Stat label="ROAS actuel" value={`${audit.inputs.roas_actual.toFixed(2)}×`} />
          <Stat label="CPA actuel" value={`${audit.inputs.cpa_actual.toFixed(0)} €`} />
          <Stat label="Budget /j" value={`${audit.inputs.daily_budget.toFixed(0)} €`} />
          <Stat label="Panier moyen" value={`${audit.inputs.avg_cart.toFixed(0)} €`} />
          <Stat label="Fréq. achat / an" value={`${audit.inputs.purchase_freq.toFixed(1)}×`} />
          <Stat label="Rétention" value={`${audit.inputs.retention.toFixed(0)} %`} />
          <Stat label="LTV 12 mois" value={`${(audit.results.ltv12 ?? 0).toFixed(0)} €`} />
          <Stat label="Add to cart" value={`${audit.inputs.add_to_cart_rate.toFixed(1)} %`} />
          <Stat label="Abandon" value={`${audit.inputs.abandon_rate.toFixed(0)} %`} />
          <Stat label="Vitesse page" value={`${audit.inputs.page_speed.toFixed(1)} s`} />
          <Stat label="Couverture stock" value={`${audit.inputs.stock_coverage_days} j`} />
          <Stat label="Fournisseurs" value={`${audit.inputs.supplier_count}`} />
          <Stat label="Hook Rate" value={`${audit.inputs.hook_rate.toFixed(0)} %`} />
          <Stat label="Hold Rate" value={`${audit.inputs.hold_rate.toFixed(0)} %`} />
          <Stat label="CTR" value={`${audit.inputs.ctr.toFixed(2)} %`} />
          <Stat label="Créatifs actifs" value={`${audit.inputs.creative_count}`} />
        </div>
      </section>

      {/* AI Diagnostic per module */}
      {SCORED_MODULES.map((mod) => {
        const diag = ai[mod];
        if (!diag) return null;
        return (
          <section key={mod} className="card-cockpit p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-display font-bold uppercase tracking-widest text-sm">
                  Diagnostic IA — {MODULE_META[mod].label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Recommandations générées par Claude Sonnet 4
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DiagCard
                icon={<Brain className="h-4 w-4" />}
                title="Diagnostic principal"
                body={diag.diagnostic_principal}
                tone="primary"
                wide
              />
              <DiagCard
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Problème critique"
                body={diag.probleme_critique}
                tone="danger"
              />
              <DiagCard
                icon={<Zap className="h-4 w-4" />}
                title="Action immédiate · cette semaine"
                body={diag.action_immediate}
                tone="warning"
              />
              <DiagCard
                icon={<Target className="h-4 w-4" />}
                title="Objectif 30 jours"
                body={diag.action_30_jours}
                tone="success"
              />
              <DiagCard
                icon={<Calendar className="h-4 w-4" />}
                title="Alerte si statu quo"
                body={diag.alerte}
                tone="danger"
              />
            </div>
          </section>
        );
      })}

      {Object.keys(ai).length === 0 && (
        <section className="card-cockpit p-6 text-sm text-muted-foreground">
          Aucun diagnostic IA n'a été généré au moment de la sauvegarde de cet audit.
        </section>
      )}

      <div className="flex justify-center pt-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-5 py-2.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'historique
        </Link>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
type Tone = "success" | "warning" | "danger" | "primary";
function scoreTone(s: number): Tone {
  if (s >= 70) return "success";
  if (s >= 45) return "warning";
  return "danger";
}
function toneColor(t: Tone) {
  return `var(--color-${t})`;
}
function sectorLabel(s: Sector | string) {
  if (s === "ecommerce") return "E-commerce";
  if (s === "infoproduit") return "Infoproduit";
  return "Service";
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="font-display font-bold uppercase tracking-widest text-sm">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-2)",
      }}
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
  body: string;
  tone: Tone;
  wide?: boolean;
}) {
  const color = toneColor(tone);
  return (
    <div
      className={`rounded-xl p-5 border ${wide ? "md:col-span-2" : ""}`}
      style={{ borderColor: color, background: "var(--color-surface-2)" }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <div className="text-[10px] uppercase tracking-widest font-display font-bold">
          {title}
        </div>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
        {body}
      </div>
    </div>
  );
}
