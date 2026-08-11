import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Link2, RefreshCw, Unlink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getMetaAuthUrl,
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
}

export function MetaConnectCard({ onImport }: { onImport: (m: MetaImportedMetrics) => void }) {
  const authUrl = useServerFn(getMetaAuthUrl);
  const status = useServerFn(getMetaStatus);
  const listAccounts = useServerFn(listMetaAdAccounts);
  const selectAccount = useServerFn(selectMetaAdAccount);
  const importMetrics = useServerFn(importMetaMetrics);
  const disconnect = useServerFn(disconnectMeta);

  const [state, setState] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "connect" | "sync" | "accounts" | "disconnect">(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string; currency: string }[]>([]);

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
    try {
      const nonce = crypto.randomUUID();
      sessionStorage.setItem("meta_oauth_state", nonce);
      const { url } = await authUrl({
        data: { redirectUri: `${window.location.origin}/meta-callback`, state: nonce },
      });
      window.location.href = url;
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof Error ? e.message : "Connexion Meta indisponible.");
    }
  };

  const onSync = async () => {
    setBusy("sync");
    try {
      const { metrics } = await importMetrics({});
      onImport({ roas: metrics.roas, cpa: metrics.cpa, dailyBudget: metrics.dailyBudget, ctr: metrics.ctr });
      toast.success("Métriques Meta importées (30 derniers jours).");
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
                onClick={onSync}
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
