// Configuration IA centralisée (serveur uniquement).
export const AI_MODEL = process.env["ANTHROPIC_MODEL"] || "claude-sonnet-4-5";
export const AI_TIMEOUT_MS = 60_000;
