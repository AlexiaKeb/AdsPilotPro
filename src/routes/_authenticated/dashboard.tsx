import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Activity, ClipboardList, GraduationCap, Lock, Rocket, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuditsTab } from "@/components/dashboard/AuditsTab";

type TabId = "cockpit" | "audits" | "academy";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  has_andromeda_access: boolean;
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("cockpit");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const [{ data, error }, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, has_andromeda_access")
          .eq("id", uid)
          .maybeSingle(),
        supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
      ]);
      if (!mounted) return;
      if (error) {
        console.error(error);
        return;
      }
      if (data) setProfile(data as Profile);
      if (roleRes.data) setIsAdmin(true);
    };
    load();

    // Realtime: unlock Académie without F5
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const next = payload.new as Profile;
          setProfile((prev) => (prev && prev.id === next.id ? { ...prev, ...next } : prev));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashHeader profile={profile} onSignOut={onSignOut} isAdmin={isAdmin} />
      <TabBar tab={tab} setTab={setTab} />
      <main className="mx-auto max-w-7xl px-6 py-10">
        {tab === "cockpit" && <CockpitTab />}
        {tab === "audits" && <AuditsTab />}
        {tab === "academy" && <AcademyTab unlocked={profile?.has_andromeda_access ?? false} />}
      </main>
    </div>
  );
}

function DashHeader({ profile, onSignOut }: { profile: Profile | null; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: "var(--grad-primary)" }}>
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <div className="font-display font-bold tracking-wider">ADSPILOT</div>
          <span className="chip-tag !py-0.5">PRO</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <div className="text-sm font-medium">{profile?.full_name || profile?.email || "—"}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {profile?.has_andromeda_access ? "ACADÉMIE · DÉBLOQUÉE" : "ACADÉMIE · VERROUILLÉE"}
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-surface transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sortie
          </button>
        </div>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "cockpit", label: "Cockpit", icon: Activity },
    { id: "audits", label: "Audits", icon: ClipboardList },
    { id: "academy", label: "Académie", icon: GraduationCap },
  ];
  return (
    <div className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-2 px-4 py-4 text-sm font-display uppercase tracking-widest transition ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {active && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute inset-x-2 -bottom-px h-0.5"
                  style={{ background: "var(--grad-primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============ COCKPIT (simulateur P&L) ============ */
function CockpitTab() {
  const [daily, setDaily] = useState(150);
  const [price, setPrice] = useState(80);
  const [cogs, setCogs] = useState(35);
  const [ctr, setCtr] = useState(1.8);
  const [convRate, setConvRate] = useState(2.5);
  const [retention, setRetention] = useState(35);

  const k = useMemo(() => {
    const margin = price - price * (cogs / 100);
    const roasThreshold = margin > 0 ? price / margin : 0;
    const maxCpa = margin * 0.7;
    const ltv12 = price * (1 + retention / 100) * 1.6;
    const revenue = daily * 30 * 2.5; // hypothèse ROAS cible
    const cogsCost = revenue * (cogs / 100);
    const netMonthly = revenue - daily * 30 - cogsCost;
    return {
      roasThreshold,
      maxCpa,
      ltv12,
      netMonthly,
      ctr,
      convRate,
    };
  }, [daily, price, cogs, ctr, convRate, retention]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 card-cockpit p-6 space-y-5">
        <SectionTitle title="Paramètres" subtitle="Ajustez en temps réel" />
        <Slider label="Budget / jour" value={daily} min={10} max={5000} step={10} unit="€" onChange={setDaily} log />
        <Slider label="Prix de vente moyen" value={price} min={10} max={500} step={1} unit="€" onChange={setPrice} />
        <Slider label="COGS" value={cogs} min={0} max={80} step={1} unit="%" onChange={setCogs} />
        <Slider label="CTR" value={ctr} min={0.1} max={6} step={0.1} unit="%" onChange={setCtr} decimals={1} />
        <Slider label="Taux de conversion" value={convRate} min={0.1} max={10} step={0.1} unit="%" onChange={setConvRate} decimals={1} />
        <Slider label="Rétention LTV" value={retention} min={0} max={120} step={1} unit="%" onChange={setRetention} />
      </div>

      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Kpi label="Bénéfice net mensuel" value={k.netMonthly} unit="€" tone={k.netMonthly >= 0 ? "success" : "danger"} hero />
        <Kpi label="ROAS de sécurité" value={k.roasThreshold} unit="×" decimals={2} tone="primary" hero />
        <Kpi label="CPA maximum" value={k.maxCpa} unit="€" tone="warning" />
        <Kpi label="LTV 12 mois" value={k.ltv12} unit="€" tone="success" />
        <div className="md:col-span-2 card-cockpit p-6">
          <SectionTitle title="ROI prédit vs ROI réel" subtitle="Trading view" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Card big label="ROI prédit" value="4.50×" tone="primary" />
            <Card big label="ROI réel" value="4.48×" tone="success" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="font-display font-bold uppercase tracking-widest text-sm">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  decimals = 0,
  log = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  decimals?: number;
  log?: boolean;
}) {
  // For log: map slider 0..1000 to log scale
  const toSlider = (v: number) => {
    if (!log) return v;
    const lmin = Math.log(min), lmax = Math.log(max);
    return ((Math.log(v) - lmin) / (lmax - lmin)) * 1000;
  };
  const fromSlider = (s: number) => {
    if (!log) return s;
    const lmin = Math.log(min), lmax = Math.log(max);
    return Math.round(Math.exp(lmin + (s / 1000) * (lmax - lmin)));
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
        <div className="font-mono-data text-base font-bold">
          {value.toFixed(decimals)}
          <span className="text-muted-foreground ml-0.5">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={log ? 0 : min}
        max={log ? 1000 : max}
        step={log ? 1 : step}
        value={toSlider(value)}
        onChange={(e) => onChange(fromSlider(parseFloat(e.target.value)))}
        className="w-full accent-[var(--color-primary)]"
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  tone,
  decimals = 0,
  hero = false,
}: {
  label: string;
  value: number;
  unit: string;
  tone: "primary" | "success" | "warning" | "danger";
  decimals?: number;
  hero?: boolean;
}) {
  const colorVar = `var(--color-${tone})`;
  return (
    <div className="card-cockpit p-6">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{label}</div>
      <div className={`mt-3 font-mono-data font-bold ${hero ? "text-4xl" : "text-2xl"}`} style={{ color: colorVar }}>
        {value.toLocaleString("fr-FR", { maximumFractionDigits: decimals })}
        <span className="text-muted-foreground ml-1 text-base">{unit}</span>
      </div>
    </div>
  );
}

function Card({ big, label, value, tone }: { big?: boolean; label: string; value: string; tone: string }) {
  const c = `var(--color-${tone})`;
  return (
    <div className="rounded-xl p-5 border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-mono-data ${big ? "text-3xl" : "text-xl"} font-bold`} style={{ color: c }}>
        {value}
      </div>
    </div>
  );
}

/* AuditsTab now imported from dedicated module */

/* ============ ACADÉMIE ============ */
function AcademyTab({ unlocked }: { unlocked: boolean }) {
  const modules = [
    { n: "01", title: "Fondations Meta Ads", locked: false },
    { n: "02", title: "Architecture des campagnes", locked: false },
    { n: "03", title: "Hook Rate Mastery", locked: !unlocked },
    { n: "04", title: "Scaling sans casser l'algo", locked: !unlocked },
    { n: "05", title: "P&L réel & marge nette", locked: !unlocked },
    { n: "06", title: "Empire Operating System", locked: !unlocked },
  ];
  return (
    <div className="space-y-6">
      <div className="card-cockpit p-6 flex items-center justify-between">
        <div>
          <SectionTitle title="Masterclass" subtitle="Programme cockpit AdsPilot" />
        </div>
        <div className={`chip-tag ${unlocked ? "" : ""}`}>
          {unlocked ? "ACCÈS COMPLET" : "ACCÈS LIMITÉ"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((m) => (
          <div key={m.n} className="card-cockpit p-6 relative">
            <div className="flex items-start justify-between">
              <div className="font-mono-data text-xs text-muted-foreground">MODULE {m.n}</div>
              {m.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="mt-3 font-display font-bold uppercase tracking-wide">{m.title}</div>
            <div className="mt-5">
              {m.locked ? (
                <button
                  onClick={() => toast.info("Cette section sera débloquée par votre admin.")}
                  className="text-xs uppercase tracking-widest font-display font-bold text-primary"
                >
                  Demander l'accès →
                </button>
              ) : (
                <button className="text-xs uppercase tracking-widest font-display font-bold text-success">
                  Lancer le module →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
