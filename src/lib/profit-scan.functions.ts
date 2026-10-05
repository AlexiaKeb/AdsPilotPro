import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ScanResult } from "./leak-scan";

const InputSchema = z.object({
  periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  /** Marge brute avant pub (%). Mémorisée dans le profil. */
  marginPct: z.number().gt(0).lte(100),
});

/** Nombre de lignes visibles par plan (le serveur est la source de vérité). */
const FREE_VISIBLE_ROWS = 3;

export interface ProfitScanResponse {
  scan: ScanResult;
  plan: "free" | "starter" | "pro";
  accountName: string | null;
  /** Lignes masquées par le plan (campagnes + pubs + actions). */
  hiddenRows: number;
}

/**
 * Profit Leak Scan : récupère les insights Meta par campagne et par pub, calcule
 * le profit net réel et les verdicts. Aucun appel IA : gratuit et illimité,
 * le plan Free voit les 3 lignes les plus coûteuses.
 */
export const runProfitLeakScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ProfitScanResponse> => {
    const { getLiveConnection, fetchEntityInsights } = await import("./meta.server");
    const { runLeakScan } = await import("./leak-scan");

    const conn = await getLiveConnection(context.userId);
    if (!conn) throw new Error("Compte Meta non connecté.");
    if (conn.expired) throw new Error("Session Meta expirée — reconnectez votre compte.");
    if (!conn.ad_account_id) throw new Error("Aucun compte publicitaire sélectionné.");

    const [campaigns, ads, profileRes] = await Promise.all([
      fetchEntityInsights(conn.access_token, conn.ad_account_id, "campaign", data.periodDays),
      fetchEntityInsights(conn.access_token, conn.ad_account_id, "ad", data.periodDays),
      context.supabase.from("profiles").select("plan").eq("id", context.userId).maybeSingle(),
    ]);
    const plan = ((profileRes.data?.plan as string | undefined) ?? "free") as ProfitScanResponse["plan"];

    const toEntity = (level: "campaign" | "ad") => (r: (typeof campaigns)[number]) => ({
      ...r,
      level,
    });
    const scan = runLeakScan({
      campaigns: campaigns.map(toEntity("campaign")),
      ads: ads.map(toEntity("ad")),
      marginPct: data.marginPct,
      periodDays: data.periodDays,
    });

    // Mémorisation (RLS : le client authentifié n'écrit que ses propres lignes).
    await context.supabase.from("profiles").update({ gross_margin_pct: data.marginPct }).eq("id", context.userId);
    await context.supabase.from("leak_scans").insert({
      user_id: context.userId,
      period_days: data.periodDays,
      margin_pct: data.marginPct,
      total_spend: scan.totals.spend,
      net_profit: scan.totals.profit,
      leak_total: scan.totals.leak,
      summary: { counts: scan.counts, leakMonthly: scan.totals.leakMonthly, mode: scan.mode },
    });

    // Limitation par plan, appliquée ICI (jamais côté client).
    let hiddenRows = 0;
    let visible = scan;
    if (plan === "free") {
      const total = scan.campaigns.length + scan.ads.length + scan.actions.length;
      visible = {
        ...scan,
        campaigns: scan.campaigns.slice(0, FREE_VISIBLE_ROWS),
        ads: [],
        actions: scan.actions.slice(0, FREE_VISIBLE_ROWS),
      };
      hiddenRows = Math.max(
        0,
        total - visible.campaigns.length - visible.actions.length,
      );
    }

    return { scan: visible, plan, accountName: conn.ad_account_name, hiddenRows };
  });

/** Dernière marge brute mémorisée + dernier scan (pour pré-remplir l'écran). */
export const getScanDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: last }] = await Promise.all([
      context.supabase.from("profiles").select("gross_margin_pct, sector").eq("id", context.userId).maybeSingle(),
      context.supabase
        .from("leak_scans")
        .select("created_at, leak_total, net_profit, total_spend, period_days")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      marginPct: (profile?.gross_margin_pct as number | null) ?? null,
      sector: (profile?.sector as string | null) ?? null,
      lastScan: last
        ? {
            createdAt: last.created_at as string,
            leakTotal: Number(last.leak_total),
            netProfit: Number(last.net_profit),
            totalSpend: Number(last.total_spend),
            periodDays: last.period_days as number,
          }
        : null,
    };
  });
