import { Link } from "@tanstack/react-router";
import { Zap, Lock, Check } from "lucide-react";
import { PLAN_LABEL, type PlanId } from "@/hooks/usePlan";

export function PlanChip({ plan }: { plan: PlanId }) {
  const isPro = plan === "pro";
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-widest"
      style={
        isPro
          ? { background: "var(--grad-primary)", color: "var(--color-primary-foreground)" }
          : { border: "1px solid var(--color-border-strong)", color: "var(--color-muted-foreground)" }
      }
    >
      {PLAN_LABEL[plan]}
    </span>
  );
}

/**
 * Compteur de crédits IA + incitation à l'upgrade.
 * Objectif UX : l'utilisateur sait toujours où il en est et ce qu'il gagne en passant au plan supérieur.
 */
export function PlanBanner({
  plan,
  used,
  limit,
  remaining,
}: {
  plan: PlanId;
  used: number;
  limit: number | null;
  remaining: number | null;
}) {
  const unlimited = limit === null;
  const exhausted = !unlimited && (remaining ?? 0) <= 0;
  const pct = unlimited ? 100 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  return (
    <div
      className="card-cockpit p-5 md:p-6"
      style={exhausted ? { borderColor: "var(--color-primary)" } : undefined}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">
              Plan {PLAN_LABEL[plan]}
            </div>
            <PlanChip plan={plan} />
          </div>
        </div>

        <div className="sm:w-[280px]">
          <div className="flex items-baseline justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <span>Diagnostics IA ce mois</span>
            <span className="text-foreground font-bold">
              {unlimited ? "Illimités" : `${used} / ${limit}`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-2 border border-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: exhausted ? "var(--color-danger)" : "var(--grad-primary)",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {unlimited
              ? "Analysez autant de campagnes que vous voulez, sans limite."
              : exhausted
                ? "Quota atteint — passez au plan supérieur pour relancer vos diagnostics dès maintenant."
                : `Il vous reste ${remaining} diagnostic${(remaining ?? 0) > 1 ? "s" : ""} IA ce mois-ci.`}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Écran de teasing affiché à la place d'un module verrouillé. */
export function ModuleLocked({
  moduleLabel,
  requiredPlan,
  benefits,
}: {
  moduleLabel: string;
  requiredPlan: PlanId;
  benefits: string[];
}) {
  return (
    <div className="card-cockpit p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-xl grid place-items-center bg-primary/10 border border-primary/30">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-4 font-display font-bold uppercase tracking-widest text-base">
        {moduleLabel} — inclus dans le plan {PLAN_LABEL[requiredPlan]}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
        Ce module va plus loin que le diagnostic de base : il transforme vos chiffres en plan
        d&apos;action chiffré, prêt à appliquer sur vos campagnes.
      </p>
      <ul className="mt-5 inline-flex flex-col gap-2 text-left">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span className="text-muted-foreground">{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          style={{ background: "var(--grad-primary)" }}
        >
          Débloquer {moduleLabel} →
        </Link>
        <div className="mt-2 text-[11px] text-muted-foreground font-mono uppercase tracking-widest">
          Sans engagement · Annulable à tout moment
        </div>
      </div>
    </div>
  );
}
