import { useEffect, useState } from "react";
import { Eye, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { emitAudit, onAudit, type AuditRecordFull } from "./auditHistoryBus";

type Sector = "ecommerce" | "infoproduit" | "service";
type Tone = "success" | "warning" | "danger" | "primary";

export function AuditHistory({ onView }: { onView: () => void }) {
  const [history, setHistory] = useState<AuditRecordFull[]>([]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("audits")
      .select("id, sector, created_at, inputs, results")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data as unknown as AuditRecordFull[]);
  };

  useEffect(() => {
    load();
    const off = onAudit("audit:saved", () => load());
    return off;
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="card-cockpit p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">Historique</div>
            <div className="text-xs text-muted-foreground mt-0.5">Vos 10 derniers audits sauvegardés</div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="mt-6 text-sm text-muted-foreground">
            Aucun audit sauvegardé pour l'instant.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {history.map((h) => {
              const r = (h.results ?? {}) as Record<string, number>;
              const scores = [
                r.andromedaScore, r.oracleScore, r.mercuryScore, r.atlasScore, r.visionScore,
              ].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
              const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
              const tone: Tone = avg >= 70 ? "success" : avg >= 45 ? "warning" : "danger";
              return (
                <div key={h.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="chip-tag">{sectorLabel(h.sector as Sector)}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {new Date(h.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                      Score global
                    </div>
                    <div className="font-mono-data text-sm font-bold" style={{ color: `var(--color-${tone})` }}>
                      {avg}/100
                    </div>
                    <button
                      onClick={() => {
                        emitAudit("audit:open", h);
                        onView();
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-1.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
                    >
                      <Eye className="h-3.5 w-3.5" /> Voir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function sectorLabel(s: Sector | string) {
  if (s === "ecommerce") return "E-commerce";
  if (s === "infoproduit") return "Infoproduit";
  return "Service";
}
