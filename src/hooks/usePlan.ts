import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanId = "free" | "starter" | "pro";

export interface PlanState {
  plan: PlanId;
  used: number;
  limit: number | null; // null = illimité
  remaining: number | null;
  loading: boolean;
  refresh: () => void;
}

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
};

export const AI_LIMIT: Record<PlanId, number | null> = {
  free: 3,
  starter: 5,
  pro: null,
};

/** Modules accessibles par plan (le serveur reste la source de vérité pour l'IA). */
export function moduleAllowed(plan: PlanId, moduleId: string): boolean {
  if (plan === "pro") return true;
  if (plan === "starter") return moduleId !== "vision_creative";
  return moduleId === "andromeda";
}

/** Plan minimum requis pour un module. */
export function moduleRequiredPlan(moduleId: string): PlanId {
  if (moduleId === "vision_creative") return "pro";
  if (moduleId === "andromeda") return "free";
  return "starter";
}

const currentMonth = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<PlanId>("free");
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        if (mounted) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("plan, ai_calls_this_month, usage_period_start")
        .eq("id", uid)
        .maybeSingle();
      if (!mounted) return;
      const p = ((data?.plan as PlanId) ?? "free") as PlanId;
      const sameMonth = data?.usage_period_start === currentMonth();
      setPlan(["free", "starter", "pro"].includes(p) ? p : "free");
      setUsed(sameMonth ? (data?.ai_calls_this_month ?? 0) : 0);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [tick]);

  const limit = AI_LIMIT[plan];
  return {
    plan,
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    loading,
    refresh,
  };
}
