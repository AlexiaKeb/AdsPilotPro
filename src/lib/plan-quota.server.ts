import type { SupabaseClient } from "@supabase/supabase-js";

export interface QuotaResult {
  allowed: boolean;
  reason?: string;
  plan?: string;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  required_plan?: string;
}

/**
 * Consomme un crédit d'analyse IA pour l'utilisateur courant.
 * La logique de quota vit dans la fonction SQL `consume_ai_credit`
 * (atomique, SECURITY DEFINER) : impossible à contourner côté client.
 */
export type AiCreditKind =
  | "andromeda"
  | "oracle"
  | "mercury"
  | "atlas"
  | "simulateur"
  | "creative";

export async function consumeAiCredit(
  supabase: SupabaseClient,
  kind: AiCreditKind,
): Promise<void> {
  const { data, error } = await supabase.rpc("consume_ai_credit", { _kind: kind });
  if (error) throw new Error("Vérification de votre plan impossible. Réessayez.");

  const result = (data ?? {}) as QuotaResult;
  if (result.allowed) return;

  if (result.reason === "plan_required") {
    throw new Error(
      "L'analyse créative est réservée au plan PRO. Passez au plan PRO pour l'utiliser.",
    );
  }
  if (result.reason === "quota_exceeded") {
    throw new Error(
      `Quota atteint : ${result.limit} diagnostics IA ce mois-ci sur le plan ${(result.plan ?? "free").toUpperCase()}. Passez à un plan supérieur pour continuer.`,
    );
  }
  throw new Error("Accès au diagnostic IA refusé.");
}
