import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  GraduationCap,
  ClipboardList,
  Search,
  Lock,
  Unlock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  has_andromeda_access: boolean;
  created_at: string;
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Verify admin role on mount (the _authenticated gate already validated the session)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) {
        // Session not yet hydrated — don't redirect, just wait for onAuthStateChange
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (!mounted) return;
      if (error) {
        console.error("[admin] has_role error", error);
        toast.error("Vérification du rôle impossible");
        return;
      }
      if (!data) {
        toast.error("Accès refusé — réservé aux administrateurs");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setIsAdmin(true);
      setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Load profiles + audits
  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: profs, error: pErr }, { data: audits, error: aErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, has_andromeda_access, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("audits").select("user_id"),
      ]);
      if (!mounted) return;
      if (pErr) toast.error("Erreur chargement utilisateurs");
      if (aErr) toast.error("Erreur chargement audits");
      const counts: Record<string, number> = {};
      (audits ?? []).forEach((a: { user_id: string }) => {
        counts[a.user_id] = (counts[a.user_id] ?? 0) + 1;
      });
      setAuditCounts(counts);
      setProfiles((profs as ProfileRow[]) ?? []);
      setLoading(false);
    })();

    // Realtime profile updates
    const channel = supabase
      .channel("admin-profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const next = payload.new as ProfileRow;
          setProfiles((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.email.toLowerCase().includes(q) ||
        (p.full_name ?? "").toLowerCase().includes(q)
    );
  }, [profiles, query]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const unlocked = profiles.filter((p) => p.has_andromeda_access).length;
    const totalAudits = Object.values(auditCounts).reduce((s, n) => s + n, 0);
    return { total, unlocked, totalAudits };
  }, [profiles, auditCounts]);

  const toggleAccess = async (p: ProfileRow) => {
    setBusyId(p.id);
    const next = !p.has_andromeda_access;
    const { error } = await supabase
      .from("profiles")
      .update({ has_andromeda_access: next })
      .eq("id", p.id);
    if (error) {
      toast.error("Mise à jour impossible");
    } else {
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, has_andromeda_access: next } : x)));
      toast.success(next ? "Académie débloquée" : "Accès révoqué");
    }
    setBusyId(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" /> Cockpit
            </Link>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md grid place-items-center" style={{ background: "var(--grad-primary)" }}>
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div className="font-display font-bold tracking-wider">ADMIN</div>
            </div>
          </div>
          <span className="chip-tag !py-0.5">CONSOLE</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard icon={Users} label="Utilisateurs" value={stats.total} />
          <KpiCard icon={GraduationCap} label="Académie débloquée" value={stats.unlocked} />
          <KpiCard icon={ClipboardList} label="Audits réalisés" value={stats.totalAudits} />
        </div>

        {/* Search */}
        <div className="card-cockpit p-4 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par email ou nom…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {filtered.length} / {profiles.length}
          </span>
        </div>

        {/* Table */}
        <div className="card-cockpit overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border">
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Inscription</th>
                  <th className="px-4 py-3 text-center">Audits</th>
                  <th className="px-4 py-3 text-center">Académie</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Chargement…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Aucun utilisateur
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((p) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border/60 hover:bg-surface/40 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{auditCounts[p.id] ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        {p.has_andromeda_access ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.78_0.18_150)]">
                            <Unlock className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <Lock className="h-3.5 w-3.5" /> Verrouillée
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleAccess(p)}
                          disabled={busyId === p.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold hover:bg-surface transition disabled:opacity-50"
                        >
                          {busyId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : p.has_andromeda_access ? (
                            <>
                              <Lock className="h-3 w-3" /> Révoquer
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" /> Débloquer
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="card-cockpit p-5 flex items-center gap-4">
      <div
        className="h-12 w-12 rounded-xl grid place-items-center"
        style={{ background: "var(--grad-primary)" }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="font-display text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
}
