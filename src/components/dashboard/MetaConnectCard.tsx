import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Link2, RefreshCw, Unlink, CheckCircle2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  getMetaAuthUrl,
  connectMeta,
  getMetaStatus,
  listMetaAdAccounts,
  selectMetaAdAccount,
  importMetaMetrics,
  disconnectMeta,
  type MetaStatus,
} from "@/lib/meta.functions";

export interface MetaImportedMetrics {
  roas: number;
  cpa: number;
  dailyBudget: number;
  ctr: number;
  spend: number;
  revenue: number;
  purchases: number;
  impressions: number;
  clicks: number;
  cpm: number;
  frequency: number;
  avgCart: number;
  addToCart: number;
  addToCartRate: number;
  abandonRate: number;
  hookRate: number;
  holdRate: number;
  periodDays: number;
  accountName?: string | null;
}

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

function fmt(n: number, suffix = "") {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)}${suffix}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display font-bold text-sm">{value}</div>
    </div>
  );
}

export function MetaConnectCard({ onImport }: { onImport: (m: MetaImportedMetrics) => void }) {
  const authUrl = useServerFn(getMetaAuthUrl);
  const connect = useServerFn(connectMeta);
  const status = useServerFn(getMetaStatus);
  const listAccounts = useServerFn(listMetaAdAccounts);
  const selectAccount = useServerFn(selectMetaAdAccount);
  const importMetrics = useServerFn(importMetaMetrics);
  const disconnect = useServerFn(disconnectMeta);

  const [state, setState] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "connect" | "sync" | "accounts" | "disconnect">(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string; currency: string }[]>([]);
  const [period, setPeriod] = useState<Period>(30);
  const [metrics, setMetrics] = useState<MetaImportedMetrics | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await status({}));
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onConnect = async () => {
    setBusy("connect");
    // Meta refuse d'être affiché en iframe : on ouvre une fenêtre popup pendant le clic.
    const popup = window.open("about:blank", "meta_oauth", "width=600,height=760");
    if (!popup) {
      setBusy(null);
      toast.error("Autorisez les fenêtres popup pour connecter Meta Ads.");
      return;
    }
    try {
      const nonce = crypto.randomUUID();
      const redirectUri = `${window.location.origin}/meta-callback`;
      sessionStorage.setItem("meta_oauth_state", nonce);
      const { url } = await authUrl({ data: { redirectUri, state: nonce } });
      popup.location.href = url;

      const code = await new Promise<string>((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          const payload = event.data as
            | { type?: string; code?: string; state?: string; error?: string }
            | null;
          if (!payload || payload.type !== "meta_oauth_result") return;
          cleanup();
          if (payload.error || !payload.code) {
            reject(new Error(payload.error || "Connexion refusée sur Meta."));
            return;
          }
          if (payload.state !== nonce) {
            reject(new Error("Vérification de sécurité échouée. Relancez la connexion."));
            return;
          }
          resolve(payload.code);
        };
        const timer = window.setInterval(() => {
          if (popup.closed) {
            cleanup();
            reject(new Error("Fenêtre Meta fermée avant la fin de la connexion."));
          }
        }, 600);
        function cleanup() {
          window.clearInterval(timer);
          window.removeEventListener("message", onMessage);
        }
        window.addEventListener("message", onMessage);
      });

      sessionStorage.removeItem("meta_oauth_state");
      await connect({ data: { code, redirectUri } });
      toast.success("Compte Meta connecté.");
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion Meta indisponible.");
    } finally {
      if (!popup.closed) popup.close();
      setBusy(null);
    }
  };

  const onSync = async (days: Period = period) => {
    setBusy("sync");
    setPeriod(days);
    try {
      const { metrics: m, adAccountName } = await importMetrics({ data: { periodDays: days } });
      const imported: MetaImportedMetrics = { ...m, accountName: adAccountName };
      setMetrics(imported);
      onImport(imported);
      toast.success(`Métriques Meta importées (${days} derniers jours).`);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(null);
    }
  };

  const onLoadAccounts = async () => {
    setBusy("accounts");
    try {
      setAccounts(await listAccounts({}));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Comptes indisponibles.");
    } finally {
      setBusy(null);
    }
  };

  const onSelect = async (id: string, name: string) => {
    await selectAccount({ data: { adAccountId: id, adAccountName: name } });
    setAccounts([]);
    toast.success(`Compte « ${name} » sélectionné.`);
    void refresh();
  };

  const onDisconnect = async () => {
    setBusy("disconnect");
    try {
      await disconnect({});
      setAccounts([]);
      toast.success("Compte Meta déconnecté.");
      void refresh();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="card-cockpit p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Vérification de la connexion Meta…
      </div>
    );
  }

  const connected = !!state?.connected && !state.expired;

  return (
    <div className="card-cockpit p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 shrink-0">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">Connexion Meta Ads</div>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              {connected
                ? `Compte lié : ${state?.adAccountName ?? "à sélectionner"}. Importez vos métriques réelles au lieu de les saisir à la main.`
                : "Liez votre compte publicitaire pour remplir automatiquement ROAS, CPA, budget et CTR."}
            </p>
            {connected && state?.lastSyncedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Dernière synchro : {new Date(state.lastSyncedAt).toLocaleString("fr-FR")}
              </p>
            )}
            {state?.expired && (
              <p className="mt-1 text-xs text-[var(--color-warning)]">Session Meta expirée — reconnectez votre compte.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <>
              <button
                onClick={() => onSync()}
                disabled={busy === "sync"}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-white disabled:opacity-50 transition hover:opacity-90"
                style={{ background: "var(--grad-primary)" }}
              >
                {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Importer mes métriques
              </button>
              <button
                onClick={onLoadAccounts}
                disabled={busy === "accounts"}
                className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2.5 text-xs font-display font-bold uppercase tracking-widest hover:bg-surface transition"
              >
                {busy === "accounts" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Changer de compte
              </button>
              <button
                onClick={onDisconnect}
                disabled={busy === "disconnect"}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
              >
                <Unlink className="h-3.5 w-3.5" /> Déconnecter
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={busy === "connect"}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-xs font-display font-bold uppercase tracking-widest text-white disabled:opacity-50 transition hover:opacity-90"
              style={{ background: "var(--grad-primary)" }}
            >
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Connecter Meta Ads
            </button>
          )}
        </div>
      </div>

      {connected && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Période</span>
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => void onSync(d)}
              disabled={busy === "sync"}
              className={`rounded-lg px-3 py-1.5 text-xs font-display font-bold uppercase tracking-widest transition disabled:opacity-50 ${
                period === d ? "bg-primary/15 border border-primary text-primary" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d} j
            </button>
          ))}
        </div>
      )}

      {connected && metrics && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Performance Meta — {metrics.periodDays} derniers jours
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Dépense" value={fmt(metrics.spend, " €")} />
            <Stat label="Revenu" value={fmt(metrics.revenue, " €")} />
            <Stat label="ROAS" value={fmt(metrics.roas, "×")} />
            <Stat label="CPA" value={fmt(metrics.cpa, " €")} />
            <Stat label="Achats" value={fmt(metrics.purchases)} />
            <Stat label="Panier moyen" value={fmt(metrics.avgCart, " €")} />
            <Stat label="CTR" value={fmt(metrics.ctr, " %")} />
            <Stat label="CPM" value={fmt(metrics.cpm, " €")} />
            <Stat label="Impressions" value={fmt(metrics.impressions)} />
            <Stat label="Fréquence" value={fmt(metrics.frequency)} />
            <Stat label="Hook rate" value={fmt(metrics.hookRate, " %")} />
            <Stat label="Hold rate" value={fmt(metrics.holdRate, " %")} />
          </div>
          <p className="text-xs text-muted-foreground">
            Ces chiffres remplissent automatiquement les modules Andromeda, Oracle, Mercury et Vision, et sont transmis à
            l&apos;IA lors du diagnostic.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {accounts.map((a) => {
            const isActive = a.id === state?.adAccountId;
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a.id, a.name)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-surface"
                }`}
              >
                <span className="truncate">
                  <span className="font-medium">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">{a.currency}</span>
                </span>
                {isActive && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
