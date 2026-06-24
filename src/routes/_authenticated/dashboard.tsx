import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, ClipboardList, Rocket, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuditsTab } from "@/components/dashboard/AuditsTab";
import { AuditHistory } from "@/components/dashboard/AuditHistory";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { CoachingCTA } from "@/components/CoachingCTA";

type TabId = "audits" | "admin";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("audits");
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
          .select("id, email, full_name, avatar_url, onboarding_completed")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle(),
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

  const onTabChange = (id: TabId) => {
    if (id === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    setTab(id);
  };

  const showOnboarding = !!profile && !profile.onboarding_completed;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashHeader profile={profile} onSignOut={onSignOut} />
      <TabBar tab={tab} setTab={onTabChange} isAdmin={isAdmin} />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {tab === "audits" && <AuditsTab />}
        <CoachingCTA />
      </main>
      <AuditHistory onView={() => setTab("audits")} />
      {showOnboarding && profile && (
        <OnboardingFlow
          userId={profile.id}
          onComplete={() =>
            setProfile((prev) => (prev ? { ...prev, onboarding_completed: true } : prev))
          }
        />
      )}
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
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <div className="text-sm font-medium">{profile?.full_name || profile?.email || "—"}</div>
          </div>
          <Link
            to="/profil"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-2 py-1.5 text-xs uppercase tracking-widest font-semibold hover:bg-surface transition"
            aria-label="Mon profil"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span
                className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-display font-bold text-white"
                style={{ background: "var(--grad-primary)" }}
              >
                {initialsOf(profile)}
              </span>
            )}
            <span className="hidden sm:inline">Mon profil</span>
          </Link>
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

function initialsOf(profile: Profile | null): string {
  const src = (profile?.full_name || profile?.email || "").trim();
  if (!src) return "•";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return ((a + b) || src[0]).toUpperCase();
}

function TabBar({ tab, setTab, isAdmin }: { tab: TabId; setTab: (t: TabId) => void; isAdmin: boolean }) {
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "audits", label: "Audits", icon: ClipboardList },
    ...(isAdmin ? [{ id: "admin" as const, label: "Admin", icon: ShieldCheck }] : []),
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
