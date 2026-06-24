import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Activity, Eye, Rocket, BarChart3, Sparkles, Brain, AlertTriangle, Target, Calendar, Zap, FileDown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analyzeAudit, type AuditDiagnostic } from "@/lib/audit-ai.functions";
import { downloadAuditPdf, type AuditPdfData, type AuditPdfMetric } from "@/lib/audit-pdf";
import { VisionCreativeTab } from "./VisionCreativeTab";
import { emitAudit, onAudit } from "./auditHistoryBus";

export type Sector = "ecommerce" | "infoproduit" | "service";
export type ModuleId = "andromeda" | "oracle" | "mercury" | "atlas" | "vision_creative";

export interface AuditInputs {
  sector: Sector;
  // Andromeda
  roas_actual: number;
  cpa_actual: number;
  daily_budget: number;
  // Oracle (LTV)
  avg_cart: number;
  purchase_freq: number;
  retention: number;
  // Mercury (CRO)
  add_to_cart_rate: number;
  abandon_rate: number;
  page_speed: number;
  // Atlas (Scaling)
  stock_coverage_days: number;
  supplier_count: number;
  // Vision (Créatif)
  hook_rate: number;
  hold_rate: number;
  creative_count: number;
  ctr: number;
}

const DEFAULTS: Record<Sector, AuditInputs> = {
  ecommerce: {
    sector: "ecommerce",
    roas_actual: 2.5, cpa_actual: 28, daily_budget: 200,
    avg_cart: 65, purchase_freq: 1.8, retention: 35,
    add_to_cart_rate: 6, abandon_rate: 70, page_speed: 2.4,
    stock_coverage_days: 30, supplier_count: 1,
    hook_rate: 28, hold_rate: 14, creative_count: 8, ctr: 1.6,
  },
  infoproduit: {
    sector: "infoproduit",
    roas_actual: 3.2, cpa_actual: 45, daily_budget: 300,
    avg_cart: 120, purchase_freq: 1.2, retention: 22,
    add_to_cart_rate: 4, abandon_rate: 60, page_speed: 1.8,
    stock_coverage_days: 365, supplier_count: 1,
    hook_rate: 32, hold_rate: 18, creative_count: 6, ctr: 2.1,
  },
  service: {
    sector: "service",
    roas_actual: 4.0, cpa_actual: 60, daily_budget: 500,
    avg_cart: 350, purchase_freq: 1.4, retention: 55,
    add_to_cart_rate: 8, abandon_rate: 50, page_speed: 2.0,
    stock_coverage_days: 365, supplier_count: 1,
    hook_rate: 24, hold_rate: 12, creative_count: 4, ctr: 1.4,
  },
};

const MODULES: { id: ModuleId; label: string; icon: typeof Activity }[] = [
  { id: "andromeda", label: "Andromeda", icon: Activity },
  { id: "oracle", label: "Oracle LTV", icon: Eye },
  { id: "mercury", label: "Mercury CRO", icon: Rocket },
  { id: "atlas", label: "Atlas Scaling", icon: BarChart3 },
  { id: "vision_creative", label: "Vision Créative", icon: Sparkles },
];




type ScoredModuleId = Exclude<ModuleId, "vision_creative">;
const SCORED_MODULES: ScoredModuleId[] = ["andromeda", "oracle", "mercury", "atlas"];
type AiMap<T> = Partial<Record<ScoredModuleId, T>>;

export function AuditsTab() {
  const [inputs, setInputs] = useState<AuditInputs>(DEFAULTS.ecommerce);
  const [active, setActive] = useState<ModuleId>("andromeda");
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState<string>("");
  const [aiByModule, setAiByModule] = useState<AiMap<AuditDiagnostic>>({});
  const [loadingByModule, setLoadingByModule] = useState<AiMap<boolean>>({});
  const reqIdRef = useRef<Record<ScoredModuleId, number>>({
    andromeda: 0, oracle: 0, mercury: 0, atlas: 0,
  });
  const analyze = useServerFn(analyzeAudit);

  // Load client name once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, email")
        .eq("id", uid)
        .maybeSingle();
      if (!mounted || !data) return;
      const name =
        data.full_name ||
        [data.first_name, data.last_name].filter(Boolean).join(" ") ||
        data.email ||
        "";
      setClientName(name);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute results in real time
  const results = useMemo(() => {
    const i = inputs;
    // Andromeda
    const roasThreshold = 1 / (1 - 0.35); // simplifié : marge cible 35%
    const andromedaScore = clamp01(i.roas_actual / (roasThreshold * 1.5)) * 100;

    // Oracle LTV
    const ltv12 = i.avg_cart * i.purchase_freq * (1 + i.retention / 100);
    const latentCashFlow = ltv12 - i.avg_cart;
    const oracleScore = clamp01(i.retention / 60) * 100;

    // Mercury CRO
    const conversionEfficiency = i.add_to_cart_rate * (1 - i.abandon_rate / 100);
    const speedScore = clamp01((3 - Math.min(i.page_speed, 3)) / 3) * 100;
    const mercuryScore = (clamp01(conversionEfficiency / 4) * 70 + speedScore * 0.3);

    // Atlas Scaling
    const stockScore = clamp01(i.stock_coverage_days / 60) * 100;
    const supplierScore = clamp01(i.supplier_count / 3) * 100;
    const atlasScore = stockScore * 0.7 + supplierScore * 0.3;

    // Vision Créatif
    const hookScore = clamp01(i.hook_rate / 35) * 100;
    const holdScore = clamp01(i.hold_rate / 20) * 100;
    const ctrScore = clamp01(i.ctr / 3) * 100;
    const visionScore = hookScore * 0.5 + holdScore * 0.3 + ctrScore * 0.2;
    const desirabilityScore = (hookScore + holdScore) / 2;

    return {
      // Andromeda
      roasThreshold,
      andromedaScore,
      // Oracle
      ltv12,
      latentCashFlow,
      oracleScore,
      // Mercury
      conversionEfficiency,
      speedScore,
      mercuryScore,
      // Atlas
      stockScore,
      supplierScore,
      atlasScore,
      // Vision
      hookScore,
      holdScore,
      ctrScore,
      visionScore,
      desirabilityScore,
    };
  }, [inputs]);

  const onSave = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Session expirée");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("audits").insert({
      user_id: u.user.id,
      sector: inputs.sector,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputs: inputs as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results: { ...results, ai_recommendations: aiByModule } as any,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Audit sauvegardé");
      emitAudit("audit:saved");
    }
    setSaving(false);
  };

  // Reopen a saved audit when user clicks "VOIR" in the history section
  useEffect(() => {
    return onAudit("audit:open", (rec) => {
      if (!rec) return;
      const merged = { ...DEFAULTS[(rec.sector as Sector) ?? "ecommerce"], ...(rec.inputs ?? {}) } as AuditInputs;
      setInputs(merged);
      const ai = (rec.results?.ai_recommendations ?? {}) as AiMap<AuditDiagnostic>;
      setAiByModule(ai);
      setActive("andromeda");
    });
  }, []);

  const activeScored = SCORED_MODULES.includes(active as ScoredModuleId) ? (active as ScoredModuleId) : null;

  // Explicit trigger — only fires on button click
  const runDiagnostic = (mod: ScoredModuleId) => {
    const reqId = ++reqIdRef.current[mod];
    setLoadingByModule((prev) => ({ ...prev, [mod]: true }));
    const moduleScore = Math.round(
      mod === "andromeda" ? results.andromedaScore
        : mod === "oracle" ? results.oracleScore
        : mod === "mercury" ? results.mercuryScore
        : results.atlasScore,
    );
    analyze({
      data: {
        sector: sectorLabel(inputs.sector),
        roas: inputs.roas_actual,
        roas_threshold: results.roasThreshold,
        cpa: inputs.cpa_actual,
        max_cpa: inputs.avg_cart * 0.35,
        budget: inputs.daily_budget,
        score: moduleScore,
      },
    })
      .then((diag) => {
        if (reqId !== reqIdRef.current[mod]) return;
        setAiByModule((prev) => ({ ...prev, [mod]: diag }));
      })
      .catch((err: Error) => {
        if (reqId !== reqIdRef.current[mod]) return;
        toast.error(`Analyse IA: ${err.message}`);
      })
      .finally(() => {
        if (reqId !== reqIdRef.current[mod]) return;
        setLoadingByModule((prev) => ({ ...prev, [mod]: false }));
      });
  };

  const moduleReady: Record<ScoredModuleId, boolean> = {
    andromeda: inputs.roas_actual > 0 && inputs.cpa_actual > 0 && inputs.daily_budget > 0,
    oracle: inputs.avg_cart > 0 && inputs.purchase_freq > 0 && inputs.retention > 0,
    mercury: inputs.add_to_cart_rate > 0 && inputs.abandon_rate > 0 && inputs.page_speed > 0,
    atlas: inputs.stock_coverage_days > 0 && inputs.supplier_count > 0,
  };






  const setSector = (s: Sector) => setInputs({ ...DEFAULTS[s] });
  const upd = <K extends keyof AuditInputs>(k: K, v: AuditInputs[K]) =>
    setInputs((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      {/* Sector selection */}
      <div className="card-cockpit p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">Moteur de diagnostics</div>
            <div className="text-xs text-muted-foreground mt-0.5">Adaptation par secteur</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ecommerce", "infoproduit", "service"] as Sector[]).map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-display font-bold transition ${
                  inputs.sector === s ? "btn-hero" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {sectorLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Module tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MODULES.map((m) => {
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest font-display font-bold transition whitespace-nowrap ${
                isActive
                  ? "btn-hero"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Active module panel */}
      {active === "vision_creative" ? (
        <motion.div
          key="vision_creative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <VisionCreativeTab />
        </motion.div>
      ) : (
        <>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            <div className="lg:col-span-2 card-cockpit p-6 space-y-5">
              <SectionTitle title={MODULES.find((m) => m.id === active)!.label} subtitle="Paramètres" />
              {active === "andromeda" && (
                <>
                  <NumField label="ROAS actuel" value={inputs.roas_actual} unit="×" step={0.1} decimals={2} onChange={(v) => upd("roas_actual", v)} />
                  <NumField label="CPA actuel" value={inputs.cpa_actual} unit="€" step={1} onChange={(v) => upd("cpa_actual", v)} />
                  <NumField label="Budget journalier" value={inputs.daily_budget} unit="€" step={10} onChange={(v) => upd("daily_budget", v)} />
                </>
              )}
              {active === "oracle" && (
                <>
                  <NumField label="Panier moyen" value={inputs.avg_cart} unit="€" step={1} onChange={(v) => upd("avg_cart", v)} />
                  <NumField label="Fréquence achat / an" value={inputs.purchase_freq} unit="×" step={0.1} decimals={1} onChange={(v) => upd("purchase_freq", v)} />
                  <NumField label="Taux de rétention" value={inputs.retention} unit="%" step={1} onChange={(v) => upd("retention", v)} />
                </>
              )}
              {active === "mercury" && (
                <>
                  <NumField label="Taux ajout panier" value={inputs.add_to_cart_rate} unit="%" step={0.1} decimals={1} onChange={(v) => upd("add_to_cart_rate", v)} />
                  <NumField label="Taux d'abandon" value={inputs.abandon_rate} unit="%" step={1} onChange={(v) => upd("abandon_rate", v)} />
                  <NumField label="Vitesse de chargement" value={inputs.page_speed} unit="s" step={0.1} decimals={1} onChange={(v) => upd("page_speed", v)} />
                </>
              )}
              {active === "atlas" && (
                <>
                  <NumField label="Couverture stock" value={inputs.stock_coverage_days} unit="j" step={1} onChange={(v) => upd("stock_coverage_days", v)} />
                  <NumField label="Nombre fournisseurs" value={inputs.supplier_count} unit="" step={1} onChange={(v) => upd("supplier_count", v)} />
                </>
              )}
              {activeScored && (
                <button
                  onClick={() => runDiagnostic(activeScored)}
                  disabled={!moduleReady[activeScored] || !!loadingByModule[activeScored]}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-display font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
                  style={{ background: "var(--grad-primary)" }}
                >
                  {loadingByModule[activeScored] ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours par Claude…
                    </>
                  ) : (
                    <>⚡ Générer mon diagnostic IA</>
                  )}
                </button>
              )}
            </div>


            <div className="lg:col-span-3 space-y-5">
              {active === "andromeda" && <AndromedaPanel inputs={inputs} r={results} />}
              {active === "oracle" && <OraclePanel r={results} />}
              {active === "mercury" && <MercuryPanel inputs={inputs} r={results} />}
              {active === "atlas" && <AtlasPanel inputs={inputs} r={results} />}
              {activeScored && (
                <AiRecommendations
                  loading={!!loadingByModule[activeScored]}
                  diagnostic={aiByModule[activeScored] ?? null}
                  onDownloadPdf={() =>
                    buildAndDownloadPdf({
                      clientName,
                      sector: inputs.sector,
                      inputs,
                      results,
                      aiByModule,
                      activeModuleId: activeScored,
                    })
                  }
                />
              )}
            </div>
          </motion.div>

          {/* Save bar */}
          <div className="card-cockpit p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              Score global · <span className="text-foreground font-bold">
                {Math.round((results.andromedaScore + results.oracleScore + results.mercuryScore + results.atlasScore + results.visionScore) / 5)}/100
              </span>
            </div>
            <button
              onClick={onSave}
              disabled={saving}
              className="btn-hero inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder l'audit
            </button>
          </div>

        </>
      )}


      {/* Standalone simulator CTA */}
      <div className="card-cockpit p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">Simulateur P&amp;L</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Projetez budget, marge, ROAS de sécurité et LTV en temps réel.
            </div>
          </div>
        </div>
        <Link
          to="/simulateur"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-white transition hover:opacity-90"
          style={{ background: "var(--grad-primary)" }}
        >
          Ouvrir le simulateur →
        </Link>
      </div>
    </div>
  );
}

/* ============ Module panels ============ */
function AndromedaPanel({ inputs, r }: { inputs: AuditInputs; r: ReturnType<typeof useMemo> & Record<string, number> }) {
  return (
    <>
      <ScoreCard label="Score Andromeda" score={r.andromedaScore} />
      <MetricBar label="ROAS vs seuil rentabilité" value={inputs.roas_actual} target={r.roasThreshold * 1.3} unit="×" decimals={2} />
      <MetricBar label="CPA front-end" value={inputs.cpa_actual} target={inputs.cpa_actual * 0.8} unit="€" inverse />
      <Reco
        items={[
          r.andromedaScore < 50 && "ROAS sous le seuil critique. Coupez les sets non rentables avant scaling.",
          r.andromedaScore >= 70 && "Provision LTV solide. Vous pouvez débloquer 20-30 % de budget supplémentaire.",
        ]}
      />
    </>
  );
}

function OraclePanel({ r }: { r: Record<string, number> }) {
  return (
    <>
      <ScoreCard label="Score Oracle LTV" score={r.oracleScore} />
      <div className="grid grid-cols-2 gap-4">
        <MiniStat label="LTV 12 mois" value={`${r.ltv12.toFixed(0)} €`} tone="success" />
        <MiniStat label="Trésorerie latente" value={`${r.latentCashFlow.toFixed(0)} €`} tone="primary" />
      </div>
      <MetricBar label="Rétention 12 mois" value={r.oracleScore} target={70} unit="/100" />
      <Reco items={[r.oracleScore < 50 && "Activez un programme de relance email pour exploiter la trésorerie latente."]} />
    </>
  );
}

function MercuryPanel({ inputs, r }: { inputs: AuditInputs; r: Record<string, number> }) {
  return (
    <>
      <ScoreCard label="Score Mercury CRO" score={r.mercuryScore} />
      <MetricBar label="Efficacité conversion" value={r.conversionEfficiency} target={3.5} unit="" decimals={2} />
      <MetricBar label="Taux d'abandon" value={inputs.abandon_rate} target={50} unit="%" inverse />
      <MetricBar label="Vitesse de chargement" value={inputs.page_speed} target={1.5} unit="s" inverse decimals={1} />
      <Reco
        items={[
          inputs.page_speed > 2.5 && "Vitesse > 2.5 s : perte significative de conversion attendue.",
          inputs.abandon_rate > 70 && "Abandon panier critique. Revoyez frais de livraison et options de paiement.",
        ]}
      />
    </>
  );
}

function AtlasPanel({ inputs, r }: { inputs: AuditInputs; r: Record<string, number> }) {
  return (
    <>
      <ScoreCard label="Score Atlas Scaling" score={r.atlasScore} />
      <MetricBar label="Couverture stock" value={inputs.stock_coverage_days} target={45} unit="j" />
      <MetricBar label="Diversification fournisseurs" value={inputs.supplier_count} target={3} unit="" />
      <Reco
        items={[
          inputs.stock_coverage_days < 15 && "Risque de rupture imminente. Bloquez le scaling tant que stock < 30 j.",
          inputs.supplier_count < 2 && "Dépendance fournisseur unique. Sécurisez un backup.",
        ]}
      />
    </>
  );
}

function VisionPanel({ inputs, r }: { inputs: AuditInputs; r: Record<string, number> }) {
  return (
    <>
      <ScoreCard label="Score Vision Créa" score={r.visionScore} />
      <MetricBar label="Hook Rate" value={inputs.hook_rate} target={30} unit="%" />
      <MetricBar label="Hold Rate" value={inputs.hold_rate} target={15} unit="%" />
      <MetricBar label="CTR" value={inputs.ctr} target={2.5} unit="%" decimals={1} />
      <div className="grid grid-cols-2 gap-4">
        <MiniStat label="Desirability score" value={`${Math.round(r.desirabilityScore)}/100`} tone={scoreTone(r.desirabilityScore)} />
        <MiniStat label="Mix créatif actif" value={`${inputs.creative_count}`} tone={inputs.creative_count >= 6 ? "success" : "warning"} />
      </div>
      <Reco
        items={[
          inputs.hook_rate < 25 && "Hook Rate faible : retravaillez les 3 premières secondes (visuel + texte).",
          inputs.creative_count < 5 && "Renouvelez le mix créatif : visez 6 créas actives minimum.",
        ]}
      />
    </>
  );
}

/* ============ AI Recommendations ============ */
function AiRecommendations({
  loading,
  diagnostic,
  onDownloadPdf,
}: {
  loading: boolean;
  diagnostic: AuditDiagnostic | null;
  onDownloadPdf?: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  if (!loading && !diagnostic) return null;

  const handleDownload = async () => {
    if (!onDownloadPdf || generating) return;
    setGenerating(true);
    try {
      // Defer so the spinner can paint before the synchronous PDF build runs.
      await new Promise((r) => setTimeout(r, 30));
      onDownloadPdf();
    } catch (e) {
      toast.error((e as Error).message || "Erreur de génération PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card-cockpit p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-display font-bold uppercase tracking-widest text-sm">Recommandations IA</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Analyse en cours par Claude Sonnet 4…" : "Diagnostic généré par Claude Sonnet 4"}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-mono uppercase tracking-widest">Génération du diagnostic…</span>
        </div>
      )}

      {diagnostic && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiagCard
              icon={<Brain className="h-4 w-4" />}
              title="Diagnostic principal"
              body={diagnostic.diagnostic_principal}
              tone="primary"
              wide
            />
            <DiagCard
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Problème critique"
              body={diagnostic.probleme_critique}
              tone="danger"
            />
            <DiagCard
              icon={<Zap className="h-4 w-4" />}
              title="Action immédiate · cette semaine"
              body={diagnostic.action_immediate}
              tone="warning"
            />
            <DiagCard
              icon={<Target className="h-4 w-4" />}
              title="Objectif 30 jours"
              body={diagnostic.action_30_jours}
              tone="success"
            />
            <DiagCard
              icon={<Calendar className="h-4 w-4" />}
              title="Alerte si statu quo"
              body={diagnostic.alerte}
              tone="danger"
            />
          </div>
          {onDownloadPdf && (
            <button
              onClick={handleDownload}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-display font-bold uppercase tracking-widest text-white disabled:opacity-60 transition hover:opacity-90"
              style={{ background: "var(--grad-primary)" }}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération du rapport…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Télécharger le rapport PDF
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DiagCard({
  icon, title, body, tone, wide = false,
}: { icon: ReactNode; title: string; body: string; tone: Tone; wide?: boolean }) {
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



/* ============ Atoms ============ */
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="font-display font-bold uppercase tracking-widest text-sm">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="card-cockpit p-6">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-end justify-between">
        <div className="font-mono-data text-5xl font-bold" style={{ color: toneColor(tone) }}>
          {Math.round(score)}
          <span className="text-base text-muted-foreground ml-1">/100</span>
        </div>
        <div className="chip-tag" style={{ color: toneColor(tone), borderColor: toneColor(tone) }}>
          {toneLabel(tone)}
        </div>
      </div>
      <ProgressBar value={score} max={100} tone={tone} />
    </div>
  );
}

function MetricBar({
  label, value, target, unit, decimals = 0, inverse = false,
}: { label: string; value: number; target: number; unit: string; decimals?: number; inverse?: boolean }) {
  // inverse = lower is better
  const ratio = inverse ? target / Math.max(value, 0.01) : value / Math.max(target, 0.01);
  const pct = clamp01(ratio) * 100;
  const tone = scoreTone(pct);
  return (
    <div className="card-cockpit p-5">
      <div className="flex items-end justify-between mb-2">
        <div className="text-xs uppercase tracking-widest font-mono text-muted-foreground">{label}</div>
        <div className="font-mono-data text-sm font-bold">
          {value.toFixed(decimals)}{unit}
          <span className="text-muted-foreground"> / cible {target.toFixed(decimals)}{unit}</span>
        </div>
      </div>
      <ProgressBar value={pct} max={100} tone={tone} />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-xl p-4 border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-mono-data text-xl font-bold" style={{ color: toneColor(tone) }}>{value}</div>
    </div>
  );
}

function ProgressBar({ value, max, tone }: { value: number; max: number; tone: Tone }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 rounded-full overflow-hidden bg-input">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: toneColor(tone) }}
      />
    </div>
  );
}

function NumField({
  label, value, unit, step, decimals = 0, onChange,
}: { label: string; value: number; unit: string; step: number; decimals?: number; onChange: (v: number) => void }) {
  const [text, setText] = useState<string>(() => (Number.isFinite(value) ? String(value) : "0"));
  // Sync from parent when value changes externally (sector reset, etc.)
  useEffect(() => {
    const parsed = parseFloat(text.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed !== value) {
      setText(Number.isFinite(value) ? String(value) : "0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border bg-input/40 focus-within:border-primary transition">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const parsed = parseFloat(raw.replace(",", "."));
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          className="w-full bg-transparent outline-none text-sm font-mono-data"
        />
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      <div className="sr-only">{decimals} step={step}</div>
    </label>
  );
}

function Reco({ items }: { items: (string | false | null | undefined)[] }) {
  const valid = items.filter(Boolean) as string[];
  if (valid.length === 0) {
    return (
      <div className="card-cockpit p-5">
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">Recommandations</div>
        <div className="text-sm text-success">✓ Tous les signaux sont nominaux sur ce module.</div>
      </div>
    );
  }
  return (
    <div className="card-cockpit p-5">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-3">Recommandations</div>
      <ul className="space-y-2">
        {valid.map((t, i) => (
          <li key={i} className="text-sm text-foreground/90 flex gap-2">
            <span className="text-warning">→</span> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ Helpers ============ */
type Tone = "success" | "warning" | "danger" | "primary";

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function scoreTone(score: number): Tone {
  if (score >= 70) return "success";
  if (score >= 45) return "warning";
  return "danger";
}
function toneColor(t: Tone) { return `var(--color-${t})`; }
function toneLabel(t: Tone) { return t === "success" ? "NOMINAL" : t === "warning" ? "VIGILANCE" : "CRITIQUE"; }
function sectorLabel(s: Sector | string) {
  if (s === "ecommerce") return "E-commerce";
  if (s === "infoproduit") return "Infoproduit";
  return "Service";
}

/* ============ PDF builder ============ */
function metricBar(value: number, target: number, inverse = false): { pct: number; tone: "green" | "orange" | "red" } {
  const ratio = inverse ? target / Math.max(value, 0.01) : value / Math.max(target, 0.01);
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const tone = pct >= 70 ? "green" : pct >= 45 ? "orange" : "red";
  return { pct, tone };
}

export function buildAndDownloadPdf(args: {
  clientName: string;
  sector: Sector;
  inputs: AuditInputs;
  results: Record<string, number>;
  aiByModule: AiMap<AuditDiagnostic>;
  activeModuleId: ScoredModuleId;
}) {
  const { clientName, sector, inputs, results, aiByModule, activeModuleId } = args;

  const moduleScores: Record<ScoredModuleId, number> = {
    andromeda: results.andromedaScore,
    oracle: results.oracleScore,
    mercury: results.mercuryScore,
    atlas: results.atlasScore,
  };
  const moduleLabels: Record<ScoredModuleId, string> = {
    andromeda: "Andromeda",
    oracle: "Oracle LTV",
    mercury: "Mercury CRO",
    atlas: "Atlas Scaling",
  };

  const modules = SCORED_MODULES.map((id) => ({
    id,
    label: moduleLabels[id],
    score: moduleScores[id],
    diagnostic: aiByModule[id] ?? null,
  }));

  const currentModule = modules.find((m) => m.id === activeModuleId)!;

  const globalScore = Math.round(
    (results.andromedaScore + results.oracleScore + results.mercuryScore + results.atlasScore + results.visionScore) / 5,
  );

  const metrics: AuditPdfMetric[] = [
    { label: "ROAS actuel", value: `${inputs.roas_actual.toFixed(2)}×`, bar: metricBar(inputs.roas_actual, results.roasThreshold * 1.3) },
    { label: "CPA actuel", value: `${inputs.cpa_actual.toFixed(0)} €`, bar: metricBar(inputs.cpa_actual, inputs.avg_cart * 0.35, true) },
    { label: "Budget journalier", value: `${inputs.daily_budget.toFixed(0)} €` },
    { label: "Panier moyen", value: `${inputs.avg_cart.toFixed(0)} €` },
    { label: "Rétention", value: `${inputs.retention.toFixed(0)} %`, bar: metricBar(inputs.retention, 60) },
    { label: "LTV 12 mois", value: `${results.ltv12.toFixed(0)} €` },
    { label: "Taux ajout panier", value: `${inputs.add_to_cart_rate.toFixed(1)} %`, bar: metricBar(inputs.add_to_cart_rate, 8) },
    { label: "Taux d'abandon", value: `${inputs.abandon_rate.toFixed(0)} %`, bar: metricBar(inputs.abandon_rate, 40, true) },
    { label: "Vitesse page", value: `${inputs.page_speed.toFixed(1)} s`, bar: metricBar(inputs.page_speed, 2, true) },
    { label: "Hook Rate", value: `${inputs.hook_rate.toFixed(0)} %`, bar: metricBar(inputs.hook_rate, 35) },
    { label: "CTR", value: `${inputs.ctr.toFixed(2)} %`, bar: metricBar(inputs.ctr, 2.5) },
  ];

  const data: AuditPdfData = {
    clientName: clientName || "Client AdsPilot",
    sectorLabel: sectorLabel(sector),
    globalScore,
    metrics,
    modules,
    currentModule,
  };

  downloadAuditPdf(data);
}
