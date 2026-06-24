import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  LogOut,
  Loader2,
  Users,
  ClipboardList,
  DollarSign,
  Layers,
  Search,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  adminListUsers,
  adminListAudits,
  adminUpdatePlan,
  adminDeleteUser,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin-command")({
  ssr: false,
  component: AdminCommandPage,
});

const ACCENT = "#FF3B5C";
const SURFACE = "#0A0A0A";
const BORDER = "rgba(255, 59, 92, 0.25)";

type Plan = "free" | "starter" | "pro";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  created_at: string;
  audits_count: number;
  last_sign_in_at: string | null;
};

type AuditRow = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  sector: string;
  score: number | null;
  created_at: string;
};

async function waitForAuthenticatedUser() {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.data.session?.user) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return data.user;
  }

  return new Promise<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>(
    (resolve) => {
      let settled = false;
      let unsubscribe: (() => void) | undefined;

      const finish = (
        user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]
      ) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        unsubscribe?.();
        resolve(user);
      };

      const timeoutId = window.setTimeout(async () => {
        const { data, error } = await supabase.auth.getUser();
        finish(error ? null : data.user);
      }, 2500);

      const listener = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          finish(session.user);
          return;
        }
        if (event === "INITIAL_SESSION") finish(null);
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    }
  );
}

function AdminCommandPage() {
  const navigate = useNavigate();
  const listUsers = useServerFn(adminListUsers);
  const listAudits = useServerFn(adminListAudits);
  const updatePlan = useServerFn(adminUpdatePlan);
  const deleteUser = useServerFn(adminDeleteUser);

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<UserRow | null>(null);

  // Auth + role gate. Wait for both checks before deciding to redirect.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        console.log("[admin-command] guard: waiting for auth session…");
        // 1. Wait for the browser auth session to be restored before deciding.
        const user = await waitForAuthenticatedUser();
        if (!active) return;
        console.log("[admin-command] guard: user =", user?.email ?? null, "id =", user?.id ?? null);
        if (!user) {
          console.warn("[admin-command] guard: no user → redirect /auth");
          navigate({ to: "/auth", replace: true });
          return;
        }

        // 2. Wait for the profile fetch, then verify the admin role server-side via RLS-safe RPC.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        console.log("[admin-command] guard: profile =", profile, "profileError =", profileError);
        if (profileError || !profile) {
          console.warn("[admin-command] guard: missing profile → redirect /dashboard");
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (!active) return;
        console.log("[admin-command] guard: has_role(admin) =", isAdmin, "roleError =", roleError);
        if (roleError || !isAdmin) {
          console.warn("[admin-command] guard: not admin → redirect /dashboard");
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        console.log("[admin-command] guard: ✅ access granted");
        setAuthorized(true);
      } catch (err) {
        console.error("[admin-command] guard: unexpected error → redirect /dashboard", err);
        if (active) navigate({ to: "/dashboard", replace: true });
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);


  // Load data once authorized
  useEffect(() => {
    if (!authorized) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [u, a] = await Promise.all([listUsers(), listAudits()]);
        if (!active) return;
        setUsers(u as UserRow[]);
        setAudits(a as AuditRow[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur chargement");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorized, listUsers, listAudits]);

  const stats = useMemo(() => {
    const total = users.length;
    const free = users.filter((u) => u.plan === "free").length;
    const starter = users.filter((u) => u.plan === "starter").length;
    const pro = users.filter((u) => u.plan === "pro").length;
    const revenue = starter * 47 + pro * 97;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const auditsThisMonth = audits.filter(
      (a) => new Date(a.created_at) >= monthStart
    ).length;
    return { total, free, starter, pro, revenue, auditsThisMonth };
  }, [users, audits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const onChangePlan = async (u: UserRow, plan: Plan) => {
    if (plan === u.plan) return;
    setBusyId(u.id);
    try {
      await updatePlan({ data: { userId: u.id, plan } });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, plan } : x)));
      toast.success(`Plan mis à jour → ${plan.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec mise à jour");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      await deleteUser({ data: { userId: u.id } });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setAudits((prev) => prev.filter((a) => a.user_id !== u.id));
      toast.success("Compte supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec suppression");
    } finally {
      setBusyId(null);
      setConfirmDel(null);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (checking || !authorized) {
    return (
      <div
        className="min-h-screen grid place-items-center"
        style={{ background: "#000000", color: "#999" }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#000000",
        color: "#fafafa",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          background: "rgba(0,0,0,0.85)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-md grid place-items-center"
              style={{ background: ACCENT }}
            >
              <ShieldAlert className="h-4 w-4 text-black" />
            </div>
            <div className="font-display font-bold tracking-wider text-sm md:text-base">
              TOUR DE CONTRÔLE — ADMIN
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{
                background: "rgba(255, 59, 92, 0.15)",
                color: ACCENT,
                border: `1px solid ${ACCENT}`,
              }}
            >
              <AlertTriangle className="h-3 w-3" /> Accès restreint
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs uppercase tracking-widest font-bold font-display transition hover:opacity-90"
            style={{ background: ACCENT, color: "#000" }}
          >
            <LogOut className="h-3.5 w-3.5" /> Déconnexion admin
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* KPI grid */}
        <section>
          <SectionTitle title="KPIs globaux" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Kpi icon={Users} label="Utilisateurs" value={stats.total} />
            <Kpi
              icon={ClipboardList}
              label="Audits ce mois"
              value={stats.auditsThisMonth}
            />
            <Kpi
              icon={Layers}
              label="Plans"
              value={
                <span className="text-sm font-mono">
                  <span style={{ color: "#888" }}>FREE</span> {stats.free} ·{" "}
                  <span style={{ color: "#FFC857" }}>STA</span> {stats.starter} ·{" "}
                  <span style={{ color: ACCENT }}>PRO</span> {stats.pro}
                </span>
              }
            />
            <Kpi
              icon={DollarSign}
              label="Revenus estimés / mois"
              value={`${stats.revenue.toLocaleString("fr-FR")} €`}
              accent
            />
          </div>
        </section>

        {/* Users */}
        <section>
          <SectionTitle title="Utilisateurs" subtitle={`${filtered.length} / ${users.length}`} />
          <div
            className="mt-4 rounded-xl p-3 flex items-center gap-3"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <Search className="h-4 w-4" style={{ color: ACCENT }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par email ou nom…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#666]"
            />
          </div>

          <div
            className="mt-4 rounded-xl overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-[10px] font-mono uppercase tracking-widest"
                    style={{ color: "#888", borderBottom: `1px solid ${BORDER}` }}
                  >
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Inscription</th>
                    <th className="px-4 py-3 text-center">Audits</th>
                    <th className="px-4 py-3">Dernière connexion</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center" style={{ color: "#888" }}>
                        <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                        Chargement…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center" style={{ color: "#888" }}>
                        Aucun utilisateur
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filtered.map((u) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ borderBottom: `1px solid rgba(255,59,92,0.10)` }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{u.full_name || "—"}</div>
                          <div className="text-xs" style={{ color: "#888" }}>{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.plan}
                            disabled={busyId === u.id}
                            onChange={(e) => onChangePlan(u, e.target.value as Plan)}
                            className="rounded-md px-2 py-1.5 text-xs font-mono uppercase tracking-widest bg-black"
                            style={{ border: `1px solid ${BORDER}`, color: "#fafafa" }}
                          >
                            <option value="free">FREE</option>
                            <option value="starter">STARTER</option>
                            <option value="pro">PRO</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: "#888" }}>
                          {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{u.audits_count}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: "#888" }}>
                          {u.last_sign_in_at
                            ? new Date(u.last_sign_in_at).toLocaleString("fr-FR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setConfirmDel(u)}
                            disabled={busyId === u.id}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-bold transition hover:opacity-80 disabled:opacity-40"
                            style={{
                              background: "rgba(255,59,92,0.12)",
                              color: ACCENT,
                              border: `1px solid ${ACCENT}`,
                            }}
                          >
                            {busyId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Supprimer
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Audits */}
        <section>
          <SectionTitle title="Tous les audits" subtitle={`${audits.length} entrées (max 500)`} />
          <div
            className="mt-4 rounded-xl overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-[10px] font-mono uppercase tracking-widest"
                    style={{ color: "#888", borderBottom: `1px solid ${BORDER}` }}
                  >
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Secteur</th>
                    <th className="px-4 py-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center" style={{ color: "#888" }}>
                        <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                        Chargement…
                      </td>
                    </tr>
                  )}
                  {!loading && audits.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center" style={{ color: "#888" }}>
                        Aucun audit
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    audits.map((a) => (
                      <tr
                        key={a.id}
                        style={{ borderBottom: `1px solid rgba(255,59,92,0.08)` }}
                      >
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: "#888" }}>
                          {new Date(a.created_at).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{a.user_name || "—"}</div>
                          <div className="text-xs" style={{ color: "#888" }}>{a.user_email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono uppercase">{a.sector}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {a.score !== null ? a.score : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Delete confirmation */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-6"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setConfirmDel(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl p-6"
            style={{ background: "#0A0A0A", border: `1px solid ${ACCENT}` }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" style={{ color: ACCENT }} />
              <h3 className="font-display font-bold uppercase tracking-wider text-lg">
                Suppression du compte
              </h3>
            </div>
            <p className="mt-3 text-sm" style={{ color: "#bbb" }}>
              Cette action supprime définitivement le compte de{" "}
              <span className="font-bold text-white">{confirmDel.email}</span> et toutes ses
              données. Irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDel(null)}
                className="px-4 py-2 rounded-md text-xs uppercase tracking-widest font-bold"
                style={{ color: "#bbb", border: "1px solid #333" }}
              >
                Annuler
              </button>
              <button
                onClick={() => onDelete(confirmDel)}
                disabled={busyId === confirmDel.id}
                className="px-4 py-2 rounded-md text-xs uppercase tracking-widest font-bold disabled:opacity-50"
                style={{ background: ACCENT, color: "#000" }}
              >
                {busyId === confirmDel.id ? (
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="inline h-3.5 w-3.5 mr-1.5" />
                )}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="font-display font-bold uppercase tracking-widest text-sm">
        {title}
      </div>
      {subtitle && (
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#666" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: SURFACE,
        border: `1px solid ${accent ? ACCENT : BORDER}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: ACCENT }} />
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#888" }}>
          {label}
        </div>
      </div>
      <div
        className="mt-3 font-display font-bold"
        style={{ fontSize: typeof value === "string" || typeof value === "number" ? "1.75rem" : "1rem", color: accent ? ACCENT : "#fafafa" }}
      >
        {value}
      </div>
    </div>
  );
}
