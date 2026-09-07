import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Link2, RefreshCw, Unlink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MetaPerformancePanel } from "./MetaPerformancePanel";

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
  leads: number;
  costPerLead: number;
  leadRate: number;
  isLeadGen: boolean;
  periodDays: number;

  allTime: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  effectiveDays: number;
  accountName?: string | null;
}

const PERIODS = [7, 30, 90, 0] as const;
type Period = (typeof PERIODS)[number];
const periodLabel = (d: Period) => (d === 0 ? "Depuis toujours" : `${d} j`);

const CACHE_KEY = "meta_metrics_cache_v1";

function readCache(): { period: Period; metrics: MetaImportedMetrics } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as { period: Period; metrics: MetaImportedMetrics }) : null;
  } catch {
    return null;
  }
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
    const cached = readCache();
    if (cached) {
      setPeriod(cached.period);
      setMetrics(cached.metrics);
      onImport(cached.metrics);
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onSync = async (days: Period = period, silent = false) => {
    setBusy("sync");
    setPeriod(days);
    try {
      const { metrics: m, adAccountName } = await importMetrics({ data: { periodDays: days } });
      const imported: MetaImportedMetrics = { ...m, accountName: adAccountName };
      setMetrics(imported);
      onImport(imported);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ period: days, metrics: imported }));
      } catch {
        /* quota */
      }
      if (!silent) {
        toast.success(
          days === 0
            ? "Métriques Meta importées (historique complet)."
            : `Métriques Meta importées (${days} derniers jours).`,
        );
      }
      void refresh();
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(null);
    }
  };

  // Chargement auto des données à l'ouverture du dashboard (une seule fois).
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoRef.current) return;
    if (!state?.connected || state.expired || !state.adAccountId) return;
    autoRef.current = true;
    void onSync(readCache()?.period ?? period, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);


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
      setMetrics(null);
      try {
        window.localStorage.removeItem(CACHE_KEY);
      } catch {
        /* ignore */
      }
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
            {connected && state?.daysLeft !== null && state?.daysLeft !== undefined && (
              <p
                className={`mt-1 text-xs ${state.daysLeft <= 7 ? "text-[var(--color-warning)]" : "text-muted-foreground"}`}
              >
                {state.daysLeft <= 7
                  ? `Connexion à renouveler sous ${state.daysLeft} j — cliquez sur « Reconnecter » pour éviter toute coupure.`
                  : `Connexion active · renouvellement automatique (${state.daysLeft} j restants)`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <>
              <button
                onClick={() => onSync()}
                disabled={busy === "sync"}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50 transition hover:opacity-90"
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
              {state?.daysLeft !== null && state?.daysLeft !== undefined && state.daysLeft <= 7 && (
                <button
                  onClick={onConnect}
                  disabled={busy === "connect"}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-warning)] px-3 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-[var(--color-warning)] hover:bg-surface transition"
                >
                  {busy === "connect" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Reconnecter
                </button>
              )}
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
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50 transition hover:opacity-90"
              style={{ background: "var(--grad-primary)" }}
            >
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {state?.expired ? "Reconnecter Meta Ads" : "Connecter Meta Ads"}
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
              {periodLabel(d)}
            </button>
          ))}
        </div>
      )}

      {connected && metrics && <MetaPerformancePanel m={metrics} />}

      {connected && !metrics && busy !== "sync" && (
        <p className="text-sm text-muted-foreground">
          Aucune donnée chargée pour cette période. Cliquez sur « Importer mes métriques » ou choisissez « Depuis
          toujours » si vos campagnes sont à l&apos;arrêt.
        </p>
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
