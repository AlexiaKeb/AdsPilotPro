import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { consumeAiCredit } from "./plan-quota.server";

const InputSchema = z.object({
  sector: z.string(),
  roas: z.number(),
  roas_threshold: z.number(),
  cpa: z.number(),
  max_cpa: z.number(),
  budget: z.number(),
  score: z.number(),
  meta: z
    .object({
      accountName: z.string().optional(),
      periodDays: z.number(),
      spend: z.number(),
      revenue: z.number(),
      purchases: z.number(),
      impressions: z.number(),
      clicks: z.number(),
      ctr: z.number(),
      cpm: z.number(),
      frequency: z.number(),
      avgCart: z.number(),
      addToCartRate: z.number(),
      abandonRate: z.number(),
      hookRate: z.number(),
      holdRate: z.number(),
      leads: z.number().optional(),
      costPerLead: z.number().optional(),
      leadRate: z.number().optional(),
      isLeadGen: z.boolean().optional(),

    })
    .optional(),
});

export type AuditDiagnostic = {
  diagnostic_principal: string;
  probleme_critique: string;
  action_immediate: string;
  action_30_jours: string;
  alerte: string;
};

const SYSTEM_PROMPT = `Tu es un consultant expert Meta Ads avec 10 ans d'expérience en e-commerce francophone. Tu analyses des données publicitaires réelles et fournis des diagnostics précis, actionnables et personnalisés. Tu parles comme un expert qui a géré des budgets de 500€ à 50 000€/jour. Tu ne donnes jamais de conseils génériques. Chaque recommandation cite les chiffres exacts fournis et explique pourquoi c'est un problème ET comment le corriger concrètement cette semaine.`;

export const analyzeAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<AuditDiagnostic> => {
    await consumeAiCredit(context.supabase, "audit");
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");

    const userPrompt = `Secteur: ${data.sector}

ROAS actuel: ${data.roas} / Seuil rentabilité: ${data.roas_threshold.toFixed(2)}
CPA actuel: ${data.cpa}€ / CPA max acceptable: ${data.max_cpa.toFixed(0)}€
Budget journalier: ${data.budget}€
Score global: ${data.score}/100
${
      data.meta
        ? `
DONNÉES RÉELLES importées depuis Meta Ads${data.meta.accountName ? ` (compte « ${data.meta.accountName} »)` : ""} sur ${data.meta.periodDays} jours :
- Dépense: ${data.meta.spend}€ / Revenu: ${data.meta.revenue}€ / Achats: ${data.meta.purchases}
- Panier moyen réel: ${data.meta.avgCart}€
- Impressions: ${data.meta.impressions} / Clics: ${data.meta.clicks} / CTR: ${data.meta.ctr}% / CPM: ${data.meta.cpm}€ / Fréquence: ${data.meta.frequency}
- Taux ajout panier: ${data.meta.addToCartRate}% / Taux d'abandon: ${data.meta.abandonRate}%
- Hook rate (vues 3s): ${data.meta.hookRate}% / Hold rate (75%): ${data.meta.holdRate}%
${
  data.meta.leads
    ? `- Leads générés: ${data.meta.leads} / Coût par lead: ${data.meta.costPerLead}€ / Taux de lead (leads/clics): ${data.meta.leadRate}%
${data.meta.isLeadGen ? "Ce compte fait de la GÉNÉRATION DE LEADS (aucun achat e-commerce tracké) : raisonne en coût par lead, volume de leads et qualité du tunnel lead, pas en ROAS/panier moyen." : ""}`
    : ""
}
Appuie-toi en priorité sur ces chiffres réels plutôt que sur des moyennes de marché.

`
        : ""
    }

Génère un diagnostic structuré en JSON avec exactement ces champs:
{
  "diagnostic_principal": "2-3 phrases sur la situation globale avec les chiffres",
  "probleme_critique": "Le problème #1 avec explication chiffrée",
  "action_immediate": "Ce que faire CETTE SEMAINE, étape par étape",
  "action_30_jours": "L'objectif à 30 jours avec métriques cibles",
  "alerte": "Ce qui va empirer si rien n'est fait"
}

Réponds UNIQUEMENT avec le JSON, sans markdown ni texte autour.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 300)}`);
    }

    const payload = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((c) => c.type === "text")?.text ?? "";

    // Strip potential markdown fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: AuditDiagnostic;
    try {
      parsed = JSON.parse(cleaned) as AuditDiagnostic;
    } catch {
      // Try to extract first JSON block
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse IA non parsable");
      parsed = JSON.parse(match[0]) as AuditDiagnostic;
    }
    return parsed;
  });
