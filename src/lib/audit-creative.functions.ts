import { createServerFn } from "@tanstack/react-start";
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

    const textPrompt = `Tu es un expert en créatives publicitaires Meta Ads avec 10 ans d'expérience en e-commerce francophone. Tu as audité des milliers de publicités et tu sais exactement ce qui stoppe le scroll et ce qui convertit.

Contexte de cette publicité :
- Secteur : ${data.sector}
- Objectif : ${data.objectif}
${data.hook_rate != null ? `- Hook Rate 3s déclaré : ${data.hook_rate}%` : ""}
${data.ctr != null ? `- CTR actuel : ${data.ctr}%` : ""}

Analyse cette créative Meta Ads selon ces 5 axes. Pour chaque axe, donne un score de 0 à 10, identifie le problème précis si score < 7, et donne une correction concrète et actionnable.

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
