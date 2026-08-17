import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  image_base64: z.string().min(10),
  media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sector: z.string(),
  objectif: z.string(),
  hook_rate: z.number().optional().nullable(),
  ctr: z.number().optional().nullable(),
});

export type AxeScore = {
  score: number;
  label: string;
  analyse: string;
  correction: string;
};

export type CreativeDiagnostic = {
  verdict: "VERT" | "ORANGE" | "ROUGE";
  verdict_phrase: string;
  score_global: number;
  axes: {
    hook_visuel: AxeScore;
    lisibilite_message: AxeScore;
    clarte_offre: AxeScore;
    format_mobile: AxeScore;
    appel_action: AxeScore;
  };
  action_prioritaire: string;
  point_fort: string;
};

export const analyzeCreative = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<CreativeDiagnostic> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");

    const textPrompt = `Tu es un expert en créatives publicitaires Meta Ads avec 10 ans d'expérience. Tu audites des publicités dans toutes les langues et tous les marchés.

Contexte DÉCLARÉ par l'annonceur (fait établi, ne le remets jamais en question, ne le remplace pas par une supposition) :
- Secteur : ${data.sector}
- Objectif : ${data.objectif}
${data.hook_rate != null ? `- Hook Rate 3s déclaré : ${data.hook_rate}%` : ""}
${data.ctr != null ? `- CTR actuel : ${data.ctr}%` : ""}

RÈGLES D'ANALYSE STRICTES :
1. Le secteur est "${data.sector}" et l'objectif est "${data.objectif}". N'écris JAMAIS qu'il s'agit d'un autre secteur (ex : ne parle pas d'e-commerce si le secteur est Infoproduit ou Service). Adapte tes critères et ton vocabulaire à ce secteur précis.
2. LANGUE : la créative peut être dans n'importe quelle langue (français, anglais, espagnol, arabe…). La langue de la créative n'est PAS un défaut en soi. Ne recommande une traduction QUE si un élément du contexte indique une audience d'une autre langue. Sinon, considère que l'audience parle la langue de la créative.
3. Ne fais aucune supposition non vérifiable : pas d'hypothèse sur le pays, l'audience, le prix, la concurrence ou les performances si ce n'est pas visible dans l'image ou donné dans le contexte. Si une information manque, dis-le explicitement ("non visible sur la créative") plutôt que d'inventer.
4. Base chaque analyse sur des éléments réellement observables dans l'image (texte lisible, composition, contraste, hiérarchie, CTA visible, format/ratio). Cite l'élément concret que tu observes.
5. Reste factuel et nuancé : pas de conclusion hâtive, pas de score sévère sans justification observable.
6. Réponds toujours en français, même si la créative est dans une autre langue.

Analyse cette créative Meta Ads selon ces 5 axes. Pour chaque axe, donne un score de 0 à 10, identifie le problème précis si score < 7, et donne une correction concrète et actionnable, cohérente avec le secteur "${data.sector}" et l'objectif "${data.objectif}".

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, exactement dans ce format :

{
  "verdict": "VERT" ou "ORANGE" ou "ROUGE",
  "verdict_phrase": "Une phrase de verdict global percutante",
  "score_global": nombre entre 0 et 100,
  "axes": {
    "hook_visuel": { "score": nombre, "label": "HOOK VISUEL — STOP SCROLL", "analyse": "1-2 phrases", "correction": "Action concrète ou point fort à conserver" },
    "lisibilite_message": { "score": nombre, "label": "LISIBILITÉ DU MESSAGE", "analyse": "1-2 phrases", "correction": "Action concrète ou point fort" },
    "clarte_offre": { "score": nombre, "label": "CLARTÉ DE L'OFFRE", "analyse": "1-2 phrases", "correction": "Action concrète ou point fort" },
    "format_mobile": { "score": nombre, "label": "FORMAT MOBILE", "analyse": "1-2 phrases", "correction": "Action concrète ou point fort" },
    "appel_action": { "score": nombre, "label": "APPEL À L'ACTION", "analyse": "1-2 phrases", "correction": "Action concrète ou point fort" }
  },
  "action_prioritaire": "La UNE chose à corriger en premier cette semaine",
  "point_fort": "Le meilleur élément de cette créative à conserver absolument"
}`;

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: data.media_type,
                  data: data.image_base64,
                },
              },
              { type: "text", text: textPrompt },
            ],
          },
        ],
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
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned) as CreativeDiagnostic;
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse IA non parsable");
      return JSON.parse(match[0]) as CreativeDiagnostic;
    }
  });
