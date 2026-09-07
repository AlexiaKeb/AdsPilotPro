import { useCallback, useEffect, useState } from "react";
import { AlarmClock, CheckCircle2, Circle, ListChecks, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { emitAudit, onAudit } from "./auditHistoryBus";

export interface ActionTask {
  id: string;
  module: string;
  title: string;
  detail: string | null;
  impact: string;
  horizon: string;
  done: boolean;
  created_at: string;
}

const HORIZON_DAYS: Record<string, number> = {
  "48h": 2,
  "7 jours": 7,
  "30 jours": 30,
};

/** Nombre de jours de retard d'une tâche (0 = dans les temps). */
export function overdueDays(task: ActionTask): number {
  if (task.done) return 0;
  const limit = HORIZON_DAYS[task.horizon] ?? 7;
  const created = new Date(task.created_at).getTime();
  if (Number.isNaN(created)) return 0;
  const elapsed = Math.floor((Date.now() - created) / 86_400_000);
  return Math.max(0, elapsed - limit);
}

const MODULE_LABEL: Record<string, string> = {
  andromeda: "Andromeda",
  oracle: "Oracle LTV",
  mercury: "Mercury",
  atlas: "Atlas",
  simulateur: "Simulateur",
  creative: "Vision Créative",
};

const IMPACT_COLOR: Record<string, string> = {
  fort: "var(--color-danger)",
  moyen: "var(--color-warning)",
  faible: "var(--color-muted-foreground)",
};

export function ActionPlanPanel() {
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("action_tasks")
      .select("id, module, title, detail, impact, horizon, done, created_at")
      .eq("user_id", uid)
      .order("done", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setTasks((data ?? []) as ActionTask[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    return onAudit("tasks:changed", () => load());
  }, [load]);

  const toggle = async (task: ActionTask) => {
    const next = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: next } : t)));
    const { error } = await supabase
      .from("action_tasks")
      .update({ done: next, done_at: next ? new Date().toISOString() : null })
      .eq("id", task.id);
    if (error) {
      toast.error(error.message);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !next } : t)));
      return;
    }
    if (next) toast.success("Action terminée 💪");
  };

  const remove = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("action_tasks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const open = tasks
    .filter((t) => !t.done)
    .sort((a, b) => overdueDays(b) - overdueDays(a));
  const done = tasks.filter((t) => t.done);
  const late = open.filter((t) => overdueDays(t) > 0);
  const total = tasks.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;
  const visible = showDone ? tasks : open;

  return (
    <section className="card-cockpit p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <ListChecks className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">Mon plan d&apos;action</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Les actions issues de vos diagnostics, à cocher au fur et à mesure
            </div>
          </div>
        </div>
        {total > 0 && (
          <button
            onClick={() => setShowDone((s) => !s)}
            className="text-[10px] uppercase tracking-widest font-mono rounded-md border border-border-strong px-3 py-1.5 hover:bg-surface transition"
          >
            {showDone ? "Masquer les terminées" : `Voir les terminées (${done.length})`}
          </button>
        )}
      </div>

      {late.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border p-3"
          style={{ borderColor: "var(--color-danger)", background: "color-mix(in oklab, var(--color-danger) 8%, transparent)" }}
        >
          <AlarmClock className="h-4 w-4 mt-0.5" style={{ color: "var(--color-danger)" }} />
          <div className="text-xs">
            <div className="font-bold uppercase tracking-widest font-mono" style={{ color: "var(--color-danger)" }}>
              {late.length} action{late.length > 1 ? "s" : ""} en retard
            </div>
            <p className="mt-1 text-muted-foreground">
              Le délai que vous vous étiez fixé est dépassé. Traitez-les en priorité : ce sont elles qui bloquent vos
              résultats.
            </p>
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>Progression</span>
            <span>
              {done.length}/{total} · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--grad-primary)" }} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-mono uppercase tracking-widest">Chargement…</span>
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Aucune action pour l&apos;instant. Générez un diagnostic IA dans un module d&apos;audit, puis cliquez sur
          « Ajouter au plan d&apos;action » pour transformer les recommandations en tâches concrètes.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className={`group flex items-start gap-3 rounded-lg border border-border p-3 transition ${
                t.done ? "opacity-60" : "hover:border-border-strong"
              }`}
              style={overdueDays(t) > 0 ? { borderColor: "var(--color-danger)" } : undefined}
            >
              <button onClick={() => toggle(t)} aria-label={t.done ? "Rouvrir l'action" : "Marquer comme terminée"} className="mt-0.5">
                {t.done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${t.done ? "line-through" : ""}`}>{t.title}</div>
                {t.detail && <p className="mt-1 text-xs text-muted-foreground">{t.detail}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
                  <span
                    className="rounded px-2 py-0.5 border"
                    style={{ color: IMPACT_COLOR[t.impact] ?? "var(--color-muted-foreground)", borderColor: "currentColor" }}
                  >
                    Impact {t.impact}
                  </span>
                  <span className="rounded px-2 py-0.5 border border-border text-muted-foreground">{t.horizon}</span>
                  <span className="text-muted-foreground">{MODULE_LABEL[t.module] ?? t.module}</span>
                  {overdueDays(t) > 0 && (
                    <span
                      className="rounded px-2 py-0.5 font-bold"
                      style={{ background: "var(--color-danger)", color: "var(--color-background)" }}
                    >
                      En retard · {overdueDays(t)} j
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Supprimer l'action"
                className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Insère des tâches issues d'un diagnostic IA. */
export async function addTasksFromDiagnostic(
  module: string,
  suggestions: { titre: string; detail: string; impact: string; delai: string }[],
): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Session expirée");
  const rows = suggestions.slice(0, 8).map((s) => ({
    user_id: uid,
    module,
    title: s.titre.slice(0, 200),
    detail: s.detail ?? null,
    impact: ["fort", "moyen", "faible"].includes(s.impact) ? s.impact : "moyen",
    horizon: s.delai || "7 jours",
  }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("action_tasks").insert(rows);
  if (error) throw new Error(error.message);
  emitAudit("tasks:changed");
  return rows.length;
}
