import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Info, Loader2, Siren, RefreshCw } from "lucide-react";
import { getMetaAlerts } from "@/lib/meta.functions";
import { buildAlerts, type PerfAlert, type AlertSeverity } from "@/lib/alerts";

const TONE: Record<AlertSeverity, { color: string; label: string; Icon: React.ElementType }> = {
  critical: { color: "var(--color-danger)", label: "Critique", Icon: Siren },
  warning: { color: "var(--color-warning)", label: "À surveiller", Icon: AlertTriangle },
  info: { color: "var(--color-primary)", label: "Info", Icon: Info },
  good: { color: "var(--color-success)", label: "Bon signal", Icon: CheckCircle2 },
};

export function AlertsPanel() {
  const fetchAlerts = useServerFn(getMetaAlerts);
  const [alerts, setAlerts] = useState<PerfAlert[] | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts({});
      if (!res) {
        setAvailable(false);
        return;
      }
      setAvailable(true);
      setAccount(res.accountName ?? null);
      setAlerts(buildAlerts(res.current, res.previous));
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!available && !loading) return null;

  return (
    <div className="card-cockpit p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
            <Siren className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">
              Alertes performance
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              7 derniers jours comparés aux 7 précédents{account ? ` · ${account}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs font-display font-bold uppercase tracking-widest hover:bg-surface transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Actualiser
        </button>
      </div>

      {loading && !alerts ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyse de vos 14 derniers jours…
        </div>
      ) : (
        <div className="space-y-2.5">
          {(alerts ?? []).map((a) => {
            const tone = TONE[a.severity];
            return (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-surface p-4"
                style={{ borderLeft: `3px solid ${tone.color}` }}
              >
                <div className="flex items-start gap-3">
                  <tone.Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: tone.color }} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-sm">{a.title}</span>
                      <span
                        className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border"
                        style={{ color: tone.color, borderColor: tone.color }}
                      >
                        {tone.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.detail}</p>
                    <p className="text-sm mt-1.5">
                      <span className="text-muted-foreground">Action : </span>
                      {a.action}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
