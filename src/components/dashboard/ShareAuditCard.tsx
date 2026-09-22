import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Copy, Check, Loader2, Ban, ShieldCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  createAuditShare,
  listAuditShares,
  revokeAuditShare,
  type ShareLink,
} from "@/lib/share.functions";

const DURATIONS: { label: string; days: number | null }[] = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "Illimité", days: null },
];

export function ShareAuditCard({ auditId }: { auditId: string }) {
  const create = useServerFn(createAuditShare);
  const list = useServerFn(listAuditShares);
  const revoke = useServerFn(revokeAuditShare);

  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<number | null>(30);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await list({ data: { auditId } });
      setLinks(rows);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, [auditId, list]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const urlFor = (token: string) =>
    typeof window === "undefined" ? `/r/${token}` : `${window.location.origin}/r/${token}`;

  const onCreate = async () => {
    setBusy(true);
    try {
      const link = await create({ data: { auditId, expiresInDays: days } });
      setLinks((prev) => [link, ...prev]);
      try {
        await navigator.clipboard.writeText(urlFor(link.token));
        setCopied(link.id);
        toast.success("Lien créé et copié dans le presse-papiers");
      } catch {
        toast.success("Lien de partage créé");
      }
    } catch (e) {
      toast.error((e as Error).message || "Impossible de créer le lien");
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(urlFor(link.token));
      setCopied(link.id);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const onRevoke = async (link: ShareLink) => {
    try {
      await revoke({ data: { shareId: link.id } });
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, revoked: true } : l)));
      toast.success("Lien désactivé");
    } catch (e) {
      toast.error((e as Error).message || "Impossible de désactiver le lien");
    }
  };

  const statusOf = (l: ShareLink) => {
    if (l.revoked) return { label: "Désactivé", color: "var(--color-muted-foreground)" };
    if (l.expiresAt && new Date(l.expiresAt).getTime() < Date.now())
      return { label: "Expiré", color: "var(--color-warning)" };
    return { label: "Actif", color: "var(--color-success)" };
  };

  return (
    <section className="card-cockpit p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-display font-bold uppercase tracking-widest text-sm">
            Partager ce rapport
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Un lien secret, en lecture seule, que vous pouvez désactiver à tout moment
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => setDays(d.days)}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-display font-bold border transition ${
                days === d.days
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:bg-surface"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCreate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60 hover:opacity-90 transition"
          style={{ background: "var(--grad-primary)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Créer un lien de partage
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des liens…
        </div>
      ) : links.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucun lien pour l'instant. Le destinataire verra uniquement ce rapport, sans accès à
          votre compte.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((l) => {
            const st = statusOf(l);
            return (
              <div
                key={l.id}
                className="rounded-xl border border-border p-3 flex flex-wrap items-center gap-3"
                style={{ background: "var(--color-surface-2)" }}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: st.color }} />
                <code className="text-xs font-mono truncate min-w-0 flex-1">
                  {urlFor(l.token)}
                </code>
                <span
                  className="text-[10px] uppercase tracking-widest font-display font-bold"
                  style={{ color: st.color }}
                >
                  {st.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <Eye className="h-3 w-3" /> {l.viewCount}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {l.expiresAt
                    ? `Expire le ${new Date(l.expiresAt).toLocaleDateString("fr-FR")}`
                    : "Sans expiration"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onCopy(l)}
                    className="p-2 rounded-lg border border-border hover:bg-surface transition"
                    title="Copier le lien"
                  >
                    {copied === l.id ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {!l.revoked && (
                    <button
                      onClick={() => onRevoke(l)}
                      className="p-2 rounded-lg border border-border hover:bg-surface transition text-danger"
                      title="Désactiver le lien"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
