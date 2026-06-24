import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Loader2,
  Users,
  ClipboardList,
  DollarSign,
  TrendingUp,
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Mail,
  Download,
  X,
  Filter,
  Menu,
  Rocket,
  Activity,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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

/* ────────────────────────────  TOKENS  ──────────────────────────── */
const ACCENT = "#FF3B5C";
const ACCENT_SOFT = "rgba(255,59,92,0.12)";
const ACCENT_BORDER = "rgba(255,59,92,0.25)";
const BG = "#000000";
const SURFACE = "#0D0D0D";
const SURFACE_2 = "#141414";
const TEXT_MUTED = "#888";
const TEXT_DIM = "#5a5a5a";

const PLAN_PRICE: Record<Plan, number> = { free: 0, starter: 47, pro: 97 };
const PLAN_COLORS: Record<Plan, string> = {
  free: "#666666",
  starter: "#FFC857",
  pro: ACCENT,
};

/* ────────────────────────────  TYPES  ──────────────────────────── */
type Plan = "free" | "starter" | "pro";
type AdminPage =
  | "overview"
  | "clients"
  | "payments"
  | "audits"
  | "analytics"
  | "settings";

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

/* ────────────────────────────  AUTH GATE  ──────────────────────────── */
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

/* ────────────────────────────  PAGE  ──────────────────────────── */
function AdminCommandPage() {
  const navigate = useNavigate();
  const listUsers = useServerFn(adminListUsers);
  const listAudits = useServerFn(adminListAudits);
  const updatePlan = useServerFn(adminUpdatePlan);
  const deleteUser = useServerFn(adminDeleteUser);

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);

  const [page, setPage] = useState<AdminPage>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ───── Guard ───── */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await waitForAuthenticatedUser();
        if (!active) return;
        if (!user) {
          navigate({ to: "/auth", replace: true });
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        if (!profile) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (!active) return;
        if (roleError || !isAdmin) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setAdminEmail(profile.email);
        setAuthorized(true);
      } catch {
        if (active) navigate({ to: "/dashboard", replace: true });
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  /* ───── Data ───── */
  const reloadData = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([listUsers(), listAudits()]);
      setUsers(u as UserRow[]);
      setAudits(a as AuditRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    (async () => {
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

  /* ───── Derived stats ───── */
  const stats = useMemo(() => {
    const total = users.length;
    const free = users.filter((u) => u.plan === "free").length;
    const starter = users.filter((u) => u.plan === "starter").length;
    const pro = users.filter((u) => u.plan === "pro").length;
    const mrr = starter * PLAN_PRICE.starter + pro * PLAN_PRICE.pro;
    const arr = mrr * 12;
    const paying = starter + pro;
    const conversion = total > 0 ? (paying / total) * 100 : 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const newThisWeek = users.filter((u) => new Date(u.created_at) >= weekAgo).length;
    const auditsThisMonth = audits.filter(
      (a) => new Date(a.created_at) >= monthStart
    ).length;
    const auditsPerUser = total > 0 ? audits.length / total : 0;

    return {
      total,
      free,
      starter,
      pro,
      mrr,
      arr,
      paying,
      conversion,
      newThisWeek,
      auditsThisMonth,
      auditsPerUser,
    };
  }, [users, audits]);

  /* ───── Actions ───── */
  const onChangePlan = async (u: UserRow, plan: Plan) => {
    if (plan === u.plan) return;
    try {
      await updatePlan({ data: { userId: u.id, plan } });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, plan } : x)));
      toast.success(`Plan → ${plan.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec mise à jour");
    }
  };

  const onDelete = async (u: UserRow) => {
    try {
      await deleteUser({ data: { userId: u.id } });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setAudits((prev) => prev.filter((a) => a.user_id !== u.id));
      toast.success("Compte supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec suppression");
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  /* ───── Loading guard ───── */
  if (checking || !authorized) {
    return (
      <div
        className="min-h-screen grid place-items-center"
        style={{ background: BG, color: TEXT_MUTED }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  /* ───── Render ───── */
  return (
    <div
      className="min-h-screen flex"
      style={{
        background: BG,
        color: "#fafafa",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        page={page}
        onPageChange={(p) => {
          setPage(p);
          setSidebarOpen(false);
        }}
        onSignOut={onSignOut}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <div className="flex-1 min-w-0 md:ml-[240px]">
        {/* Header */}
        <header
          className="sticky top-0 z-30 backdrop-blur-xl"
          style={{
            background: "rgba(0,0,0,0.85)",
            borderBottom: `1px solid ${ACCENT_BORDER}`,
          }}
        >
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-md"
                onClick={() => setSidebarOpen(true)}
                style={{ border: `1px solid ${ACCENT_BORDER}` }}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="font-display font-bold tracking-wider text-sm md:text-base">
                ADSPILOT PRO — TOUR DE CONTRÔLE
              </div>
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
                style={{
                  background: ACCENT_SOFT,
                  color: ACCENT,
                  border: `1px solid ${ACCENT}`,
                }}
              >
                <AlertTriangle className="h-3 w-3" /> Admin
              </span>
            </div>
            <div className="flex items-center gap-3">
              {adminEmail && (
                <span
                  className="hidden md:inline text-[11px] font-mono"
                  style={{ color: TEXT_DIM }}
                >
                  {adminEmail}
                </span>
              )}
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-2 rounded-lg px-3 md:px-4 py-2 text-[11px] uppercase tracking-widest font-bold font-display transition hover:opacity-90"
                style={{ background: ACCENT, color: "#000" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="px-6 py-8 max-w-[1400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {page === "overview" && (
                <OverviewPage stats={stats} users={users} audits={audits} loading={loading} />
              )}
              {page === "clients" && (
                <ClientsPage
                  users={users}
                  audits={audits}
                  loading={loading}
                  onChangePlan={onChangePlan}
                  onDelete={onDelete}
                />
              )}
              {page === "payments" && (
                <PaymentsPage
                  users={users}
                  stats={stats}
                  onChangePlan={onChangePlan}
                />
              )}
              {page === "audits" && <AuditsPage audits={audits} loading={loading} />}
              {page === "analytics" && (
                <AnalyticsPage users={users} audits={audits} stats={stats} />
              )}
              {page === "settings" && <SettingsPage onReload={reloadData} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ────────────────────────────  SIDEBAR  ──────────────────────────── */
const NAV: { id: AdminPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Vue Générale", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "audits", label: "Audits", icon: ClipboardList },
  { id: "analytics", label: "Analytiques", icon: BarChart3 },
  { id: "settings", label: "Paramètres", icon: SettingsIcon },
];

function Sidebar({
  page,
  onPageChange,
  onSignOut,
  open,
  onClose,
}: {
  page: AdminPage;
  onPageChange: (p: AdminPage) => void;
  onSignOut: () => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[240px] flex flex-col transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#050505",
          borderRight: `1px solid ${ACCENT_BORDER}`,
        }}
      >
        {/* Brand */}
        <div
          className="h-16 px-5 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${ACCENT_BORDER}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-md grid place-items-center"
              style={{ background: ACCENT }}
            >
              <Rocket className="h-4 w-4 text-black" />
            </div>
            <div className="font-display font-bold tracking-wider text-[13px]">
              ADSPILOT ADMIN
            </div>
          </div>
          <button onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" style={{ color: TEXT_MUTED }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
                style={{
                  background: active ? ACCENT_SOFT : "transparent",
                  color: active ? ACCENT : "#cfcfcf",
                  border: active ? `1px solid ${ACCENT_BORDER}` : "1px solid transparent",
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {active && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3" style={{ borderTop: `1px solid ${ACCENT_BORDER}` }}>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ color: TEXT_MUTED }}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

/* ────────────────────────────  OVERVIEW  ──────────────────────────── */
function OverviewPage({
  stats,
  users,
  audits,
  loading,
}: {
  stats: ReturnType<typeof useStatsT>;
  users: UserRow[];
  audits: AuditRow[];
  loading: boolean;
}) {
  /* Growth chart — last 30 days */
  const growth = useMemo(() => {
    const days: { date: string; signups: number; audits: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const next = new Date(d.getTime() + 86400000);
      const signups = users.filter((u) => {
        const t = new Date(u.created_at);
        return t >= d && t < next;
      }).length;
      const a = audits.filter((x) => {
        const t = new Date(x.created_at);
        return t >= d && t < next;
      }).length;
      days.push({
        date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        signups,
        audits: a,
      });
    }
    return days;
  }, [users, audits]);

  /* Activity feed: merge recent audits + recent signups */
  const activity = useMemo(() => {
    const items: { ts: number; kind: "signup" | "audit"; label: string }[] = [];
    users.forEach((u) =>
      items.push({
        ts: new Date(u.created_at).getTime(),
        kind: "signup",
        label: `Nouvelle inscription — ${u.email}`,
      })
    );
    audits.forEach((a) =>
      items.push({
        ts: new Date(a.created_at).getTime(),
        kind: "audit",
        label: `Audit généré — ${a.user_email} (${a.sector})`,
      })
    );
    return items.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [users, audits]);

  return (
    <div className="space-y-8">
      <PageTitle title="Vue Générale" subtitle="KPIs business en temps réel" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Users}
          label="Utilisateurs"
          value={stats.total}
          sub={`+${stats.newThisWeek} cette semaine`}
        />
        <Kpi
          icon={DollarSign}
          label="MRR estimé"
          value={`${stats.mrr.toLocaleString("fr-FR")} €`}
          sub={`${stats.paying} clients payants`}
          accent
        />
        <Kpi
          icon={ClipboardList}
          label="Audits ce mois"
          value={stats.auditsThisMonth}
          sub={`${stats.auditsPerUser.toFixed(1)} / user`}
        />
        <Kpi
          icon={TrendingUp}
          label="Taux conversion"
          value={`${stats.conversion.toFixed(1)} %`}
          sub="Free → Payant"
        />
      </div>

      <Card title="Croissance — 30 derniers jours">
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={growth}>
              <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={TEXT_DIM} fontSize={10} />
              <YAxis stroke={TEXT_DIM} fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="signups"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                name="Inscriptions"
              />
              <Line
                type="monotone"
                dataKey="audits"
                stroke="#FFC857"
                strokeWidth={2}
                dot={false}
                name="Audits"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Activité récente">
        {loading && (
          <div className="py-10 text-center text-sm" style={{ color: TEXT_MUTED }}>
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Chargement…
          </div>
        )}
        {!loading && activity.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: TEXT_MUTED }}>
            Aucune activité
          </div>
        )}
        {!loading && activity.length > 0 && (
          <ul className="divide-y" style={{ borderColor: ACCENT_BORDER }}>
            {activity.map((item, i) => (
              <li key={i} className="py-3 flex items-start gap-3">
                <span
                  className="mt-1 inline-flex h-6 w-6 rounded-md items-center justify-center"
                  style={{
                    background: item.kind === "signup" ? ACCENT_SOFT : "rgba(255,200,87,0.12)",
                    color: item.kind === "signup" ? ACCENT : "#FFC857",
                  }}
                >
                  {item.kind === "signup" ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <Activity className="h-3 w-3" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.label}</div>
                  <div className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>
                    {timeAgo(item.ts)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ────────────────────────────  CLIENTS  ──────────────────────────── */
function ClientsPage({
  users,
  audits,
  loading,
  onChangePlan,
  onDelete,
}: {
  users: UserRow[];
  audits: AuditRow[];
  loading: boolean;
  onChangePlan: (u: UserRow, p: Plan) => Promise<void>;
  onDelete: (u: UserRow) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | Plan>("all");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (planFilter !== "all" && u.plan !== planFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, planFilter]);

  const selectedAudits = useMemo(
    () => (selected ? audits.filter((a) => a.user_id === selected.id) : []),
    [audits, selected]
  );

  const exportCsv = () => {
    const header = ["email", "nom", "plan", "inscrit_le", "audits", "derniere_connexion"];
    const rows = filtered.map((u) => [
      u.email,
      u.full_name ?? "",
      u.plan,
      u.created_at,
      String(u.audits_count),
      u.last_sign_in_at ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Clients"
        subtitle={`${filtered.length} / ${users.length}`}
        right={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition hover:opacity-90"
            style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}` }}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div
        className="rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3"
        style={{ background: SURFACE, border: `1px solid ${ACCENT_BORDER}` }}
      >
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4" style={{ color: ACCENT }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par email ou nom…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#666]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: TEXT_MUTED }} />
          {(["all", "free", "starter", "pro"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest font-bold transition"
              style={{
                background: planFilter === p ? ACCENT : "transparent",
                color: planFilter === p ? "#000" : "#bbb",
                border: `1px solid ${planFilter === p ? ACCENT : ACCENT_BORDER}`,
              }}
            >
              {p === "all" ? "Tous" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: SURFACE, border: `1px solid ${ACCENT_BORDER}` }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-[10px] font-mono uppercase tracking-widest"
                style={{ color: TEXT_MUTED, borderBottom: `1px solid ${ACCENT_BORDER}` }}
              >
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3 text-center">Audits</th>
                <th className="px-4 py-3">Dernière connexion</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center" style={{ color: TEXT_MUTED }}>
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Chargement…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center" style={{ color: TEXT_MUTED }}>
                    Aucun utilisateur
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className="cursor-pointer hover:bg-white/[0.02] transition"
                    style={{ borderBottom: `1px solid rgba(255,59,92,0.08)` }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs" style={{ color: TEXT_MUTED }}>
                        {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        disabled={busyId === u.id}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          setBusyId(u.id);
                          await onChangePlan(u, e.target.value as Plan);
                          setBusyId(null);
                        }}
                        className="rounded-md px-2 py-1.5 text-xs font-mono uppercase tracking-widest bg-black"
                        style={{ border: `1px solid ${ACCENT_BORDER}`, color: "#fafafa" }}
                      >
                        <option value="free">FREE</option>
                        <option value="starter">STARTER</option>
                        <option value="pro">PRO</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: TEXT_MUTED }}>
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{u.audits_count}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: TEXT_MUTED }}>
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDel(u);
                        }}
                        disabled={busyId === u.id}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-widest font-bold transition hover:opacity-80 disabled:opacity-40"
                        style={{
                          background: ACCENT_SOFT,
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
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)" }}
            />
            <motion.aside
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[480px] flex flex-col"
              style={{ background: "#080808", borderLeft: `1px solid ${ACCENT_BORDER}` }}
            >
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${ACCENT_BORDER}` }}
              >
                <div className="font-display font-bold tracking-wider text-sm">
                  PROFIL CLIENT
                </div>
                <button onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" style={{ color: TEXT_MUTED }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <div className="text-lg font-bold">{selected.full_name || "—"}</div>
                  <div className="text-xs font-mono" style={{ color: TEXT_MUTED }}>
                    {selected.email}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Plan" value={selected.plan.toUpperCase()} />
                  <MiniStat label="Audits" value={String(selected.audits_count)} />
                  <MiniStat
                    label="Inscrit le"
                    value={new Date(selected.created_at).toLocaleDateString("fr-FR")}
                  />
                  <MiniStat
                    label="Dernière connexion"
                    value={
                      selected.last_sign_in_at
                        ? new Date(selected.last_sign_in_at).toLocaleDateString("fr-FR")
                        : "—"
                    }
                  />
                </div>

                <div>
                  <div
                    className="text-[10px] font-mono uppercase tracking-widest mb-2"
                    style={{ color: TEXT_MUTED }}
                  >
                    Changer le plan
                  </div>
                  <div className="flex gap-2">
                    {(["free", "starter", "pro"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={async () => {
                          await onChangePlan(selected, p);
                          setSelected({ ...selected, plan: p });
                        }}
                        className="flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition"
                        style={{
                          background: selected.plan === p ? ACCENT : "transparent",
                          color: selected.plan === p ? "#000" : "#bbb",
                          border: `1px solid ${
                            selected.plan === p ? ACCENT : ACCENT_BORDER
                          }`,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <a
                  href={`mailto:${selected.email}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition hover:opacity-90"
                  style={{ background: ACCENT, color: "#000" }}
                >
                  <Mail className="h-3.5 w-3.5" /> Envoyer un email →
                </a>

                <div>
                  <div
                    className="text-[10px] font-mono uppercase tracking-widest mb-2"
                    style={{ color: TEXT_MUTED }}
                  >
                    Historique des audits ({selectedAudits.length})
                  </div>
                  {selectedAudits.length === 0 ? (
                    <div className="text-xs py-4 text-center" style={{ color: TEXT_DIM }}>
                      Aucun audit
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {selectedAudits.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                          style={{ background: SURFACE_2 }}
                        >
                          <span style={{ color: TEXT_MUTED }}>
                            {new Date(a.created_at).toLocaleDateString("fr-FR")} · {a.sector}
                          </span>
                          <span className="font-mono font-bold" style={{ color: ACCENT }}>
                            {a.score ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <div
              className="w-full max-w-sm rounded-xl p-6"
              style={{ background: SURFACE, border: `1px solid ${ACCENT}` }}
            >
              <ShieldAlert className="h-8 w-8 mb-3" style={{ color: ACCENT }} />
              <div className="font-display font-bold tracking-wider mb-1">
                Supprimer ce compte ?
              </div>
              <div className="text-xs mb-5" style={{ color: TEXT_MUTED }}>
                {confirmDel.email} — action irréversible.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDel(null)}
                  className="flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest"
                  style={{ background: "transparent", color: "#bbb", border: `1px solid ${ACCENT_BORDER}` }}
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    const u = confirmDel;
                    setConfirmDel(null);
                    setBusyId(u.id);
                    await onDelete(u);
                    setBusyId(null);
                    if (selected?.id === u.id) setSelected(null);
                  }}
                  className="flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest"
                  style={{ background: ACCENT, color: "#000" }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────  PAYMENTS  ──────────────────────────── */
function PaymentsPage({
  users,
  stats,
  onChangePlan,
}: {
  users: UserRow[];
  stats: ReturnType<typeof useStatsT>;
  onChangePlan: (u: UserRow, p: Plan) => Promise<void>;
}) {
  const [manualUserId, setManualUserId] = useState("");
  const [manualPlan, setManualPlan] = useState<Plan>("starter");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [users, search]);

  const apply = async () => {
    const u = users.find((x) => x.id === manualUserId);
    if (!u) {
      toast.error("Sélectionne un utilisateur");
      return;
    }
    setBusy(true);
    await onChangePlan(u, manualPlan);
    setBusy(false);
    setManualUserId("");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Paiements" subtitle="Revenus & gestion manuelle" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={DollarSign}
          label="MRR actuel"
          value={`${stats.mrr.toLocaleString("fr-FR")} €`}
          accent
        />
        <Kpi
          icon={TrendingUp}
          label="ARR projeté"
          value={`${stats.arr.toLocaleString("fr-FR")} €`}
        />
        <Kpi
          icon={Users}
          label="Clients payants"
          value={stats.paying}
          sub={`${stats.starter} STA · ${stats.pro} PRO`}
        />
        <Kpi icon={CreditCard} label="Churn estimé" value="—" sub="Stripe non connecté" />
      </div>

      <Card
        title="Activation manuelle d'un plan"
        subtitle="Pour les clients sans paiement Stripe (beta, partenaires, offerts)"
      >
        <div className="space-y-3">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setManualUserId("");
              }}
              placeholder="Rechercher un utilisateur par email ou nom…"
              className="w-full px-3 py-2.5 rounded-md text-sm bg-black outline-none"
              style={{ border: `1px solid ${ACCENT_BORDER}` }}
            />
            {matches.length > 0 && !manualUserId && (
              <div
                className="absolute z-10 top-full mt-1 left-0 right-0 rounded-md max-h-60 overflow-auto"
                style={{ background: SURFACE_2, border: `1px solid ${ACCENT_BORDER}` }}
              >
                {matches.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setManualUserId(u.id);
                      setSearch(u.email);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/[0.04]"
                  >
                    <div>{u.email}</div>
                    <div className="text-[10px] font-mono" style={{ color: TEXT_DIM }}>
                      {u.plan.toUpperCase()} · {u.full_name ?? "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={manualPlan}
              onChange={(e) => setManualPlan(e.target.value as Plan)}
              className="px-3 py-2.5 rounded-md text-sm bg-black"
              style={{ border: `1px solid ${ACCENT_BORDER}`, color: "#fafafa" }}
            >
              <option value="free">FREE</option>
              <option value="starter">STARTER (47 €)</option>
              <option value="pro">PRO (97 €)</option>
            </select>
            <button
              onClick={apply}
              disabled={!manualUserId || busy}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition hover:opacity-90 disabled:opacity-40"
              style={{ background: ACCENT, color: "#000" }}
            >
              {busy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Activer le plan"}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Historique des paiements">
        <div
          className="py-10 text-center text-sm rounded-md"
          style={{ color: TEXT_MUTED, background: "#080808" }}
        >
          <CreditCard className="inline h-5 w-5 mb-2 opacity-50" />
          <div>Intégration Stripe non connectée.</div>
          <div className="text-[11px] mt-1" style={{ color: TEXT_DIM }}>
            Connecte Stripe pour voir l'historique des transactions.
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ────────────────────────────  AUDITS  ──────────────────────────── */
function AuditsPage({ audits, loading }: { audits: AuditRow[]; loading: boolean }) {
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "low" | "mid" | "high">("all");
  const [userFilter, setUserFilter] = useState("");

  const sectors = useMemo(
    () => Array.from(new Set(audits.map((a) => a.sector))).sort(),
    [audits]
  );

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      if (sectorFilter !== "all" && a.sector !== sectorFilter) return false;
      if (userFilter && !a.user_email.toLowerCase().includes(userFilter.toLowerCase()))
        return false;
      if (scoreFilter !== "all") {
        const s = a.score ?? -1;
        if (scoreFilter === "low" && !(s >= 0 && s < 50)) return false;
        if (scoreFilter === "mid" && !(s >= 50 && s <= 75)) return false;
        if (scoreFilter === "high" && !(s > 75)) return false;
      }
      return true;
    });
  }, [audits, sectorFilter, scoreFilter, userFilter]);

  const avgScore = useMemo(() => {
    const scored = audits.filter((a) => typeof a.score === "number");
    if (scored.length === 0) return 0;
    return scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length;
  }, [audits]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const auditsThisMonth = audits.filter(
    (a) => new Date(a.created_at) >= monthStart
  ).length;

  const topSector = useMemo(() => {
    const counts: Record<string, number> = {};
    audits.forEach((a) => (counts[a.sector] = (counts[a.sector] ?? 0) + 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "—";
  }, [audits]);

  return (
    <div className="space-y-6">
      <PageTitle title="Audits" subtitle={`${audits.length} audits récents`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={ClipboardList} label="Total audits" value={audits.length} />
        <Kpi icon={Activity} label="Ce mois" value={auditsThisMonth} accent />
        <Kpi icon={TrendingUp} label="Score moyen" value={avgScore.toFixed(1)} />
        <Kpi icon={Sparkles} label="Top secteur" value={topSector} />
      </div>

      <div
        className="rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3"
        style={{ background: SURFACE, border: `1px solid ${ACCENT_BORDER}` }}
      >
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Filtrer par email user…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#666] px-2"
        />
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="px-2 py-1.5 rounded-md text-xs font-mono bg-black"
          style={{ border: `1px solid ${ACCENT_BORDER}`, color: "#fafafa" }}
        >
          <option value="all">Tous secteurs</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex gap-1.5">
          {(
            [
              ["all", "Tous"],
              ["low", "<50"],
              ["mid", "50-75"],
              ["high", ">75"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScoreFilter(k)}
              className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest font-bold transition"
              style={{
                background: scoreFilter === k ? ACCENT : "transparent",
                color: scoreFilter === k ? "#000" : "#bbb",
                border: `1px solid ${scoreFilter === k ? ACCENT : ACCENT_BORDER}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: SURFACE, border: `1px solid ${ACCENT_BORDER}` }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-[10px] font-mono uppercase tracking-widest"
                style={{ color: TEXT_MUTED, borderBottom: `1px solid ${ACCENT_BORDER}` }}
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
                  <td colSpan={4} className="px-4 py-10 text-center" style={{ color: TEXT_MUTED }}>
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Chargement…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center" style={{ color: TEXT_MUTED }}>
                    Aucun audit
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: `1px solid rgba(255,59,92,0.08)` }}
                  >
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: TEXT_MUTED }}>
                      {new Date(a.created_at).toLocaleDateString("fr-FR", {
                        dateStyle: "short",
                      } as Intl.DateTimeFormatOptions)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{a.user_email}</div>
                      {a.user_name && (
                        <div className="text-[10px]" style={{ color: TEXT_DIM }}>
                          {a.user_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{a.sector}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold">
                      <span
                        style={{
                          color:
                            a.score == null
                              ? TEXT_DIM
                              : a.score < 50
                              ? "#FF6B6B"
                              : a.score <= 75
                              ? "#FFC857"
                              : "#3ECF8E",
                        }}
                      >
                        {a.score ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────  ANALYTICS  ──────────────────────────── */
function AnalyticsPage({
  users,
  audits,
  stats,
}: {
  users: UserRow[];
  audits: AuditRow[];
  stats: ReturnType<typeof useStatsT>;
}) {
  const planData = [
    { name: "FREE", value: stats.free, color: PLAN_COLORS.free },
    { name: "STARTER", value: stats.starter, color: PLAN_COLORS.starter },
    { name: "PRO", value: stats.pro, color: PLAN_COLORS.pro },
  ].filter((d) => d.value > 0);

  /* MRR sur 12 mois (basé sur date inscription des clients payants) */
  const mrrMonthly = useMemo(() => {
    const months: { month: string; mrr: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const active = users.filter((u) => {
        const t = new Date(u.created_at);
        return t < next && u.plan !== "free";
      });
      const mrr =
        active.filter((u) => u.plan === "starter").length * PLAN_PRICE.starter +
        active.filter((u) => u.plan === "pro").length * PLAN_PRICE.pro;
      months.push({
        month: d.toLocaleDateString("fr-FR", { month: "short" }),
        mrr,
      });
    }
    return months;
  }, [users]);

  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    audits.forEach((a) => (counts[a.sector] = (counts[a.sector] ?? 0) + 1));
    return Object.entries(counts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [audits]);

  const sectorScores = useMemo(() => {
    const map: Record<string, { sum: number; n: number }> = {};
    audits.forEach((a) => {
      if (typeof a.score !== "number") return;
      map[a.sector] = map[a.sector] || { sum: 0, n: 0 };
      map[a.sector].sum += a.score;
      map[a.sector].n += 1;
    });
    return Object.entries(map)
      .map(([sector, { sum, n }]) => ({ sector, score: +(sum / n).toFixed(1) }))
      .sort((a, b) => b.score - a.score);
  }, [audits]);

  /* Funnel */
  const userIds = new Set(users.map((u) => u.id));
  const usersWithAudit = new Set(audits.map((a) => a.user_id).filter((id) => userIds.has(id)));
  const funnel = [
    { step: "Inscrit", value: stats.total },
    { step: "Premier audit", value: usersWithAudit.size },
    { step: "Diagnostic IA", value: usersWithAudit.size },
    { step: "Export PDF", value: Math.round(usersWithAudit.size * 0.6) },
    { step: "Upgrade", value: stats.paying },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Analytiques" subtitle="Performance produit & business" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Répartition des plans">
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={planData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {planData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Croissance MRR — 12 mois">
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={mrrMonthly}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke={TEXT_DIM} fontSize={10} />
                <YAxis stroke={TEXT_DIM} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => `${v} €`}
                />
                <Bar dataKey="mrr" fill={ACCENT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Secteurs des utilisateurs">
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={sectorData} layout="vertical">
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis type="number" stroke={TEXT_DIM} fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="sector"
                  stroke={TEXT_DIM}
                  fontSize={10}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#FFC857" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Scores moyens par secteur">
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={sectorScores}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis dataKey="sector" stroke={TEXT_DIM} fontSize={10} />
                <YAxis stroke={TEXT_DIM} fontSize={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" fill="#3ECF8E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Funnel d'activation">
        <ul className="space-y-2">
          {funnel.map((f, i) => {
            const ratio = stats.total > 0 ? (f.value / stats.total) * 100 : 0;
            const prev = i > 0 ? funnel[i - 1].value : f.value;
            const stepRatio = prev > 0 ? (f.value / prev) * 100 : 0;
            return (
              <li key={f.step}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{f.step}</span>
                  <span className="font-mono" style={{ color: TEXT_MUTED }}>
                    {f.value} ·{" "}
                    <span style={{ color: ACCENT }}>{ratio.toFixed(1)}%</span>
                    {i > 0 && (
                      <span style={{ color: TEXT_DIM }}> · {stepRatio.toFixed(0)}% du précédent</span>
                    )}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: SURFACE_2 }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${ratio}%`,
                      background: `linear-gradient(90deg, ${ACCENT}, #FF6B6B)`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ────────────────────────────  SETTINGS  ──────────────────────────── */
type AdminSettings = {
  maintenance: boolean;
  maintenanceMessage: string;
  calendlyUrl: string;
  notificationEmail: string;
};

const DEFAULT_SETTINGS: AdminSettings = {
  maintenance: false,
  maintenanceMessage: "Application en maintenance. Retour rapide.",
  calendlyUrl: "",
  notificationEmail: "",
};

function SettingsPage({ onReload }: { onReload: () => void }) {
  const [s, setS] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [pwd, setPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("adspilot-admin-settings");
      if (raw) setS({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
  }, []);

  const save = () => {
    localStorage.setItem("adspilot-admin-settings", JSON.stringify(s));
    toast.success("Paramètres enregistrés");
  };

  const changePassword = async () => {
    if (pwd.length < 8) {
      toast.error("Mot de passe trop court (min 8)");
      return;
    }
    setPwdBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      setPwd("");
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Paramètres"
        subtitle="Gestion de l'app & du compte admin"
        right={
          <button
            onClick={onReload}
            className="text-[11px] font-mono uppercase tracking-widest hover:opacity-80"
            style={{ color: ACCENT }}
          >
            ↻ Recharger les données
          </button>
        }
      />

      <Card title="Mode maintenance">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Activer le mode maintenance</div>
            <div className="text-xs" style={{ color: TEXT_MUTED }}>
              Affiche un message aux clients (intégration côté app à brancher)
            </div>
          </div>
          <button
            onClick={() => setS({ ...s, maintenance: !s.maintenance })}
            className="relative w-12 h-6 rounded-full transition"
            style={{ background: s.maintenance ? ACCENT : "#333" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: s.maintenance ? 26 : 2 }}
            />
          </button>
        </div>
        <textarea
          value={s.maintenanceMessage}
          onChange={(e) => setS({ ...s, maintenanceMessage: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-md text-sm bg-black outline-none"
          style={{ border: `1px solid ${ACCENT_BORDER}` }}
        />
      </Card>

      <Card title="Accompagnement">
        <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>
          Lien Calendly
        </label>
        <input
          value={s.calendlyUrl}
          onChange={(e) => setS({ ...s, calendlyUrl: e.target.value })}
          placeholder="https://calendly.com/…"
          className="w-full px-3 py-2.5 rounded-md text-sm bg-black outline-none"
          style={{ border: `1px solid ${ACCENT_BORDER}` }}
        />
      </Card>

      <Card title="Notifications admin">
        <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>
          Email de notification (nouveaux signups)
        </label>
        <input
          value={s.notificationEmail}
          onChange={(e) => setS({ ...s, notificationEmail: e.target.value })}
          placeholder="admin@adspilot.com"
          type="email"
          className="w-full px-3 py-2.5 rounded-md text-sm bg-black outline-none"
          style={{ border: `1px solid ${ACCENT_BORDER}` }}
        />
        <p className="text-[11px] mt-2" style={{ color: TEXT_DIM }}>
          ⓘ Branchement webhook à configurer côté backend.
        </p>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition hover:opacity-90"
          style={{ background: ACCENT, color: "#000" }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Enregistrer les paramètres
        </button>
      </div>

      <Card title="Sécurité admin">
        <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: TEXT_MUTED }}>
          Changer le mot de passe admin
        </label>
        <div className="flex gap-2">
          <input
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            type="password"
            placeholder="Nouveau mot de passe (min 8)"
            className="flex-1 px-3 py-2.5 rounded-md text-sm bg-black outline-none"
            style={{ border: `1px solid ${ACCENT_BORDER}` }}
          />
          <button
            onClick={changePassword}
            disabled={pwdBusy}
            className="px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition hover:opacity-90 disabled:opacity-40"
            style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}` }}
          >
            {pwdBusy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Mettre à jour"}
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ────────────────────────────  UI PRIMITIVES  ──────────────────────────── */
function PageTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-display font-bold tracking-tight text-2xl md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs font-mono uppercase tracking-widest mt-1" style={{ color: TEXT_MUTED }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: SURFACE, border: `1px solid ${ACCENT_BORDER}` }}
    >
      {title && (
        <header className="mb-4">
          <h3 className="font-display font-bold tracking-wider text-sm">{title}</h3>
          {subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>
              {subtitle}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1.5"
      style={{
        background: accent ? "linear-gradient(180deg,#1a0b10 0%,#0D0D0D 100%)" : SURFACE,
        border: `1px solid ${accent ? ACCENT : ACCENT_BORDER}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: TEXT_MUTED }}
        >
          {label}
        </span>
        <Icon className="h-4 w-4" style={{ color: accent ? ACCENT : TEXT_MUTED }} />
      </div>
      <div className="text-xl md:text-2xl font-display font-bold tracking-tight">{value}</div>
      {sub && (
        <div className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md p-3" style={{ background: SURFACE_2 }}>
      <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
        {label}
      </div>
      <div className="text-sm font-bold mt-1">{value}</div>
    </div>
  );
}

/* ────────────────────────────  UTILS  ──────────────────────────── */
function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d} j`;
}

/* Helper type alias so child components can share the stats shape inferred above. */
function useStatsT(): {
  total: number;
  free: number;
  starter: number;
  pro: number;
  mrr: number;
  arr: number;
  paying: number;
  conversion: number;
  newThisWeek: number;
  auditsThisMonth: number;
  auditsPerUser: number;
} {
  throw new Error("type-only");
}
