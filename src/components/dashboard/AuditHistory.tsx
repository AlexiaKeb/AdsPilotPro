import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  ClipboardList,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { onAudit } from "./auditHistoryBus";
import { AUDIT_TAGS, TAG_COLORS, type AuditTag } from "./AuditsTab";

type Sector = "ecommerce" | "infoproduit" | "service";
type Tone = "success" | "warning" | "danger";

type AuditRow = {
  id: string;
  name: string | null;
  sector: string;
  tags: string[] | null;
  created_at: string;
  results: Record<string, unknown> | null;
};

type ScoreFilter = "all" | "low" | "mid" | "high";
type SortKey = "newest" | "oldest" | "best" | "worst";

export function AuditHistory({ onView: _onView }: { onView?: () => void }) {
  // _onView kept for backward compat (the parent passes a tab-switch callback);
  // the new UI navigates to /audit/$id instead, so we don't call it.
  void _onView;

  const [history, setHistory] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<"all" | Sector>("all");
  const [tagFilter, setTagFilter] = useState<"all" | AuditTag>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<AuditRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("audits")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, name, sector, tags, created_at, results" as any)
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setHistory(data as unknown as AuditRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const off = onAudit("audit:saved", () => load());
    return off;
  }, []);

  const decorated = useMemo(() => {
    return history.map((h) => {
      const r = (h.results ?? {}) as Record<string, number>;
      const scores = [
        r.andromedaScore,
        r.oracleScore,
        r.mercuryScore,
        r.atlasScore,
        r.visionScore,
      ].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      return { ...h, avg };
    });
  }, [history]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = decorated.filter((h) => {
      if (sectorFilter !== "all" && h.sector !== sectorFilter) return false;
      if (tagFilter !== "all" && !(h.tags ?? []).includes(tagFilter)) return false;
      if (scoreFilter === "low" && !(h.avg < 50)) return false;
      if (scoreFilter === "mid" && !(h.avg >= 50 && h.avg <= 75)) return false;
      if (scoreFilter === "high" && !(h.avg > 75)) return false;
      if (q && !(h.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sort === "newest")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "best") return b.avg - a.avg;
      return a.avg - b.avg;
    });
    return list;
  }, [decorated, query, sectorFilter, tagFilter, scoreFilter, sort]);

  const startRename = (h: AuditRow) => {
    setRenameId(h.id);
    setRenameValue(h.name ?? "");
  };

  const commitRename = async (id: string) => {
    const v = renameValue.trim();
    setBusyId(id);
    const { error } = await supabase
      .from("audits")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ name: v || null } as any)
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setHistory((prev) => prev.map((x) => (x.id === id ? { ...x, name: v || null } : x)));
    setRenameId(null);
    toast.success("Audit renommé");
  };

  const onDelete = async (h: AuditRow) => {
    setBusyId(h.id);
    const { error } = await supabase.from("audits").delete().eq("id", h.id);
    setBusyId(null);
    setConfirmDel(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setHistory((prev) => prev.filter((x) => x.id !== h.id));
    toast.success("Audit supprimé");
  };

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="card-cockpit p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-display font-bold uppercase tracking-widest text-sm">
                Historique
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} / {history.length} audits sauvegardés
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input/40">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom d'audit…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <FilterSelect
            value={sectorFilter}
            onChange={(v) => setSectorFilter(v as "all" | Sector)}
            options={[
              { v: "all", label: "Tous secteurs" },
              { v: "ecommerce", label: "E-commerce" },
              { v: "infoproduit", label: "Infoproduit" },
              { v: "service", label: "Service" },
            ]}
          />
          <FilterSelect
            value={tagFilter}
            onChange={(v) => setTagFilter(v as "all" | AuditTag)}
            options={[
              { v: "all", label: "Tous tags" },
              ...AUDIT_TAGS.map((t) => ({ v: t, label: t })),
            ]}
          />
          <FilterSelect
            value={scoreFilter}
            onChange={(v) => setScoreFilter(v as ScoreFilter)}
            options={[
              { v: "all", label: "Tous scores" },
              { v: "low", label: "Critique <50" },
              { v: "mid", label: "Moyen 50-75" },
              { v: "high", label: "Bon >75" },
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Trier par
          </span>
          {(
            [
              ["newest", "Plus récent"],
              ["oldest", "Plus ancien"],
              ["best", "Meilleur score"],
              ["worst", "Moins bon score"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-widest transition border"
              style={{
                background:
                  sort === k ? "var(--color-primary)" : "transparent",
                color: sort === k ? "#fff" : "var(--color-muted-foreground)",
                borderColor:
                  sort === k ? "var(--color-primary)" : "var(--color-border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="mt-8 py-10 grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 py-10 text-center rounded-xl border border-dashed border-border bg-surface/50">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/30 grid place-items-center mb-4">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {history.length === 0
                ? "Vous n'avez pas encore d'audit sauvegardé."
                : "Aucun audit ne correspond aux filtres."}
            </p>
            {history.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto">
                Remplissez vos premières métriques ci-dessus et cliquez sur "Générer mon diagnostic IA" pour créer votre premier audit.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {filtered.map((h) => {
              const tone: Tone =
                h.avg >= 70 ? "success" : h.avg >= 45 ? "warning" : "danger";
              const isRenaming = renameId === h.id;
              return (
                <div
                  key={h.id}
                  className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  {/* Left: name + meta + tags */}
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(h.id);
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-md border border-primary bg-input/40 text-sm outline-none"
                        />
                        <button
                          onClick={() => commitRename(h.id)}
                          disabled={busyId === h.id}
                          className="p-1.5 rounded-md border border-success text-success hover:bg-success/10"
                        >
                          {busyId === h.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setRenameId(null)}
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:bg-surface"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="font-display font-bold text-sm truncate">
                        {h.name || (
                          <span className="text-muted-foreground italic font-normal">
                            Audit sans nom
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="chip-tag">{sectorLabel(h.sector as Sector)}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(h.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      {(h.tags ?? []).map((t) => {
                        const color = TAG_COLORS[t as AuditTag] ?? "var(--color-muted-foreground)";
                        return (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-widest"
                            style={{
                              color: "#fff",
                              background: color,
                            }}
                          >
                            {t}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: score + actions */}
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                        Score global
                      </div>
                      <div
                        className="font-mono-data text-sm font-bold"
                        style={{ color: `var(--color-${tone})` }}
                      >
                        {h.avg}/100
                      </div>
                    </div>

                    <Link
                      to="/audit/$id"
                      params={{ id: h.id }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
                    >
                      <Eye className="h-3.5 w-3.5" /> Voir
                    </Link>
                    <button
                      onClick={() => startRename(h)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Renommer
                    </button>
                    <button
                      onClick={() => setConfirmDel(h)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger text-danger px-3 py-1.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-danger/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setConfirmDel(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-cockpit max-w-sm w-full p-6"
            style={{ borderColor: "var(--color-danger)" }}
          >
            <AlertTriangle className="h-8 w-8 mb-3 text-danger" />
            <div className="font-display font-bold uppercase tracking-widest text-sm mb-1">
              Supprimer cet audit définitivement ?
            </div>
            <div className="text-xs text-muted-foreground mb-5">
              {confirmDel.name || "Audit sans nom"} — cette action est irréversible.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-md text-xs font-display font-bold uppercase tracking-widest border border-border text-muted-foreground hover:bg-surface"
              >
                Annuler
              </button>
              <button
                onClick={() => onDelete(confirmDel)}
                disabled={busyId === confirmDel.id}
                className="flex-1 py-2.5 rounded-md text-xs font-display font-bold uppercase tracking-widest text-white"
                style={{ background: "var(--color-danger)" }}
              >
                {busyId === confirmDel.id ? (
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-input/40 text-sm outline-none focus:border-primary transition"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function sectorLabel(s: Sector | string) {
  if (s === "ecommerce") return "E-commerce";
  if (s === "infoproduit") return "Infoproduit";
  return "Service";
}
