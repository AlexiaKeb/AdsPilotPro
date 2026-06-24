import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Rocket,
  ShoppingBag,
  GraduationCap,
  Wrench,
  Building2,
  Loader2,
  ArrowRight,
  ClipboardList,
  Activity,
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analyzeAudit, type AuditDiagnostic } from "@/lib/audit-ai.functions";

type SectorChoice = "ecommerce" | "infoproduit" | "service" | "agency";
type BudgetChoice = "lt1k" | "1k_5k" | "5k_20k" | "gt20k";
type ChallengeChoice = "profitability" | "roas_drop" | "scaling_fear" | "creative_fatigue";
type GoalChoice = "understand" | "cpa" | "scale" | "creative";

interface OnboardingAnswers {
  sector?: SectorChoice;
  budget?: BudgetChoice;
  challenge?: ChallengeChoice;
  goal?: GoalChoice;
}

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

const SECTOR_TO_AUDIT: Record<SectorChoice, "ecommerce" | "infoproduit" | "service"> = {
  ecommerce: "ecommerce",
  infoproduit: "infoproduit",
  service: "service",
  agency: "service",
};

const SECTOR_LABEL: Record<SectorChoice, string> = {
  ecommerce: "E-commerce",
  infoproduit: "Infoproduit",
  service: "Service",
  agency: "Agence",
};

const LOADING_MESSAGES = [
  "Calibration de votre seuil de rentabilité…",
  "Analyse de votre CPA vs benchmark secteur…",
  "Génération de votre diagnostic personnalisé…",
];

export function OnboardingFlow({ userId, hasAndromedaAccess, onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeAudit);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [metrics, setMetrics] = useState({ roas: "", cpa: "", budget: "" });
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<AuditDiagnostic | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Rotating loading messages
  useEffect(() => {
    if (!analyzing) return;
    const t = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, [analyzing]);

  const persist = async (patch: {
    onboarding_completed?: boolean;
    onboarding_answers?: OnboardingAnswers;
    sector?: string;
  }) => {
    const { error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", userId);
    if (error) console.error("[onboarding] persist", error);
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    const sectorForAudit = answers.sector ? SECTOR_TO_AUDIT[answers.sector] : null;
    await persist({
      onboarding_completed: true,
      onboarding_answers: answers,
      ...(sectorForAudit ? { sector: sectorForAudit } : {}),
    });
    onComplete();
  };

  const skip = async () => {
    await persist({ onboarding_completed: true, onboarding_answers: answers });
    onComplete();
  };

  const runDiagnostic = async () => {
    const roas = parseFloat(metrics.roas.replace(",", "."));
    const cpa = parseFloat(metrics.cpa.replace(",", "."));
    const budget = parseFloat(metrics.budget.replace(",", "."));
    if (!Number.isFinite(roas) || !Number.isFinite(cpa) || !Number.isFinite(budget)) {
      toast.error("Renseignez les 3 métriques pour lancer l'analyse");
      return;
    }
    setAnalyzing(true);
    setDiagnostic(null);
    try {
      const sector = answers.sector ? SECTOR_LABEL[answers.sector] : "E-commerce";
      const roasThreshold = 1 / (1 - 0.35);
      const score = Math.round(Math.max(0, Math.min(1, roas / (roasThreshold * 1.5))) * 100);
      const diag = await analyze({
        data: {
          sector,
          roas,
          roas_threshold: roasThreshold,
          cpa,
          max_cpa: cpa * 0.8,
          budget,
          score,
        },
      });
      setDiagnostic(diag);
      setStep(4);
    } catch (e) {
      toast.error((e as Error).message || "Analyse impossible");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto">
      <Particles />
      <div className="relative w-full min-h-screen sm:min-h-0 sm:max-w-3xl sm:my-8 sm:rounded-2xl border-0 sm:border border-border bg-surface flex flex-col">
        {/* Progress bar */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Étape {step} sur 4
              </span>
              {step < 4 && (
                <button
                  onClick={skip}
                  className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
                >
                  Passer →
                </button>
              )}
            </div>
            <div className="h-1 bg-input rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--grad-primary)" }}
                initial={false}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <div className="relative flex-1 px-6 sm:px-10 py-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && <Step1 key="s1" onNext={() => setStep(2)} />}
            {step === 2 && (
              <Step2
                key="s2"
                answers={answers}
                setAnswers={setAnswers}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <Step3
                key="s3"
                metrics={metrics}
                setMetrics={setMetrics}
                analyzing={analyzing}
                loadingMessage={LOADING_MESSAGES[loadingMsgIdx]}
                onRun={runDiagnostic}
              />
            )}
            {step === 4 && (
              <Step4
                key="s4"
                diagnostic={diagnostic}
                hasAndromedaAccess={hasAndromedaAccess}
                finishing={finishing}
                onAudits={async () => {
                  await finish();
                }}
                onSimulator={async () => {
                  await finish();
                  navigate({ to: "/simulateur" });
                }}
                onAcademy={async () => {
                  await finish();
                }}
                onDashboard={finish}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ===================== Steps ===================== */

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <StepWrap>
      <div className="flex flex-col items-center text-center py-6 sm:py-10">
        <div
          className="h-16 w-16 rounded-2xl grid place-items-center mb-6"
          style={{ background: "var(--grad-primary)" }}
        >
          <Rocket className="h-8 w-8 text-white" />
        </div>
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-primary mb-3">
          AdsPilot Pro
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-tight leading-tight">
          Bienvenue dans votre
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--grad-primary)" }}
          >
            command center.
          </span>
        </h1>
        <p className="mt-5 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
          En 3 minutes, calibrez votre cockpit et obtenez votre premier diagnostic gratuit.
        </p>
        <button
          onClick={onNext}
          className="mt-10 inline-flex items-center gap-2 rounded-lg px-8 py-4 text-xs font-display font-bold uppercase tracking-widest text-white hover:opacity-90 transition"
          style={{ background: "var(--grad-primary)" }}
        >
          Commencer <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </StepWrap>
  );
}

function Step2({
  answers,
  setAnswers,
  onNext,
}: {
  answers: OnboardingAnswers;
  setAnswers: (a: OnboardingAnswers) => void;
  onNext: () => void;
}) {
  const canContinue = !!(answers.sector && answers.budget && answers.challenge && answers.goal);
  return (
    <StepWrap>
      <div className="space-y-7">
        <header>
          <h2 className="font-display font-bold text-2xl uppercase tracking-tight">
            Calibrons votre profil
          </h2>
          <p className="text-sm text-muted-foreground mt-1">4 questions rapides — 30 secondes.</p>
        </header>

        <Question label="Vous êtes dans quel secteur ?">
          <CardChoice
            options={[
              { value: "ecommerce", label: "E-commerce produits physiques", icon: ShoppingBag },
              { value: "infoproduit", label: "Infoproduits / Formation", icon: GraduationCap },
              { value: "service", label: "Services / Freelance", icon: Wrench },
              { value: "agency", label: "Agence / Consultant", icon: Building2 },
            ]}
            value={answers.sector}
            onChange={(v) => setAnswers({ ...answers, sector: v as SectorChoice })}
          />
        </Question>

        <Question label="Quel est votre budget Meta Ads mensuel ?">
          <CardChoice
            options={[
              { value: "lt1k", label: "Moins de 1 000€ / mois" },
              { value: "1k_5k", label: "1 000€ — 5 000€ / mois" },
              { value: "5k_20k", label: "5 000€ — 20 000€ / mois" },
              { value: "gt20k", label: "Plus de 20 000€ / mois" },
            ]}
            value={answers.budget}
            onChange={(v) => setAnswers({ ...answers, budget: v as BudgetChoice })}
          />
        </Question>

        <Question label="Quel est votre défi #1 en ce moment ?">
          <CardChoice
            options={[
              { value: "profitability", label: "Je ne sais pas si mes pubs sont rentables" },
              { value: "roas_drop", label: "Mon ROAS baisse et je ne sais pas pourquoi" },
              { value: "scaling_fear", label: "Je veux scaler mais j'ai peur de casser mon algo" },
              { value: "creative_fatigue", label: "Mes créatives ne performent plus" },
            ]}
            value={answers.challenge}
            onChange={(v) => setAnswers({ ...answers, challenge: v as ChallengeChoice })}
          />
        </Question>

        <Question label="Qu'espérez-vous obtenir avec AdsPilot Pro ?">
          <CardChoice
            options={[
              { value: "understand", label: "Comprendre mes chiffres enfin" },
              { value: "cpa", label: "Optimiser mon CPA" },
              { value: "scale", label: "Scaler en sécurité" },
              { value: "creative", label: "Auditer mes créatives" },
            ]}
            value={answers.goal}
            onChange={(v) => setAnswers({ ...answers, goal: v as GoalChoice })}
          />
        </Question>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-xs font-display font-bold uppercase tracking-widest text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
            style={{ background: "var(--grad-primary)" }}
          >
            Continuer <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </StepWrap>
  );
}

function Step3({
  metrics,
  setMetrics,
  analyzing,
  loadingMessage,
  onRun,
}: {
  metrics: { roas: string; cpa: string; budget: string };
  setMetrics: (m: { roas: string; cpa: string; budget: string }) => void;
  analyzing: boolean;
  loadingMessage: string;
  onRun: () => void;
}) {
  return (
    <StepWrap>
      <div className="space-y-6 max-w-xl mx-auto">
        <header>
          <h2 className="font-display font-bold text-2xl uppercase tracking-tight">
            Configurons votre premier diagnostic
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entrez vos métriques actuelles — pas besoin d'être précis, une estimation suffit.
          </p>
        </header>

        <div className="space-y-4">
          <MetricInput
            label="ROAS actuel"
            unit="×"
            placeholder="ex: 2.5"
            value={metrics.roas}
            onChange={(v) => setMetrics({ ...metrics, roas: v })}
            disabled={analyzing}
          />
          <MetricInput
            label="CPA actuel"
            unit="€"
            placeholder="ex: 28"
            value={metrics.cpa}
            onChange={(v) => setMetrics({ ...metrics, cpa: v })}
            disabled={analyzing}
          />
          <MetricInput
            label="Budget journalier"
            unit="€"
            placeholder="ex: 150"
            value={metrics.budget}
            onChange={(v) => setMetrics({ ...metrics, budget: v })}
            disabled={analyzing}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Ces données restent privées et ne sont jamais partagées.
        </p>

        {analyzing ? (
          <div className="rounded-xl border border-border bg-surface-2 p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <AnimatePresence mode="wait">
              <motion.span
                key={loadingMessage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-sm font-mono uppercase tracking-widest text-muted-foreground"
              >
                {loadingMessage}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={onRun}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-xs font-display font-bold uppercase tracking-widest text-white hover:opacity-90 transition"
              style={{ background: "var(--grad-primary)" }}
            >
              Analyser <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </StepWrap>
  );
}

function Step4({
  diagnostic,
  hasAndromedaAccess,
  finishing,
  onAudits,
  onSimulator,
  onAcademy,
  onDashboard,
}: {
  diagnostic: AuditDiagnostic | null;
  hasAndromedaAccess: boolean;
  finishing: boolean;
  onAudits: () => void;
  onSimulator: () => void;
  onAcademy: () => void;
  onDashboard: () => void;
}) {
  return (
    <StepWrap>
      <div className="space-y-6">
        <header className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl uppercase tracking-tight">
              Votre premier diagnostic
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Généré par Claude Sonnet. Voici l'essentiel.
            </p>
          </div>
        </header>

        {diagnostic && (
          <div className="grid grid-cols-1 gap-3">
            <DiagBlock
              tone="primary"
              title="Diagnostic principal"
              body={diagnostic.diagnostic_principal}
            />
            <DiagBlock
              tone="warning"
              title="Action immédiate · cette semaine"
              body={diagnostic.action_immediate}
            />
          </div>
        )}

        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Ce que vous pouvez faire maintenant
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ActionCard
              icon={ClipboardList}
              title="Audit complet"
              desc="Lancez un audit complet sur tous vos modules."
              cta="Démarrer l'audit"
              onClick={onAudits}
              disabled={finishing}
            />
            <ActionCard
              icon={Activity}
              title="Simulateur"
              desc="Simulez l'impact d'une hausse de budget."
              cta="Ouvrir le simulateur"
              onClick={onSimulator}
              disabled={finishing}
            />
            <ActionCard
              icon={Sparkles}
              title="Académie"
              desc="Accédez aux stratégies des top 1% annonceurs."
              cta="Découvrir l'académie"
              onClick={onAcademy}
              disabled={finishing}
              badge={!hasAndromedaAccess ? "🔒 Accès Pro" : undefined}
            />
          </div>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={onDashboard}
            disabled={finishing}
            className="inline-flex items-center gap-2 rounded-lg px-8 py-4 text-xs font-display font-bold uppercase tracking-widest text-white disabled:opacity-60 hover:opacity-90 transition"
            style={{ background: "var(--grad-primary)" }}
          >
            {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
            Accéder à mon dashboard <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </StepWrap>
  );
}

/* ===================== Atoms ===================== */

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2.5">
        {label}
      </div>
      {children}
    </div>
  );
}

interface ChoiceOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

function CardChoice({
  options,
  value,
  onChange,
}: {
  options: ChoiceOption[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
          >
            {opt.icon && (
              <opt.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
            )}
            <span className="leading-tight">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MetricInput({
  label,
  unit,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-2 px-3.5 py-3 rounded-lg border border-border bg-input/40 focus-within:border-primary transition">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent outline-none text-sm font-mono-data placeholder:text-muted-foreground/50"
        />
        <span className="text-xs text-muted-foreground font-mono">{unit}</span>
      </div>
    </label>
  );
}

function DiagBlock({
  tone,
  title,
  body,
}: {
  tone: "primary" | "warning";
  title: string;
  body: string;
}) {
  const color = tone === "primary" ? "var(--color-primary)" : "var(--color-warning)";
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ borderColor: color, background: "var(--color-surface-2)" }}
    >
      <div
        className="text-[10px] uppercase tracking-widest font-display font-bold mb-1.5"
        style={{ color }}
      >
        {title}
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{body}</div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  desc,
  cta,
  onClick,
  disabled,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div className="card-cockpit p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {badge && (
          <span className="chip-tag !py-0.5 !text-[9px]" style={{ borderColor: "var(--color-warning)", color: "var(--color-warning)" }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="font-display font-bold uppercase tracking-widest text-xs">{title}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-[10px] uppercase tracking-widest font-display font-bold hover:bg-surface transition disabled:opacity-50"
      >
        {cta} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ===================== Particles ===================== */

function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 8 + 8,
        delay: Math.random() * 4,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "var(--color-primary)",
            boxShadow: "0 0 8px var(--color-primary)",
            opacity: 0.4,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.15, 0.6, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
