import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Activity, CreditCard, Shield, Save, Camera, Loader2,
  LogOut, Eye, KeyRound, Trash2, CheckCircle2, XCircle,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { deleteAccount } from "@/lib/account.functions";
import { emitAudit } from "@/components/dashboard/auditHistoryBus";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — AdsPilot Pro" },
      { name: "description", content: "Gérez votre identité, votre abonnement, l'historique de vos audits et la sécurité de votre compte." },
      { property: "og:title", content: "Mon profil — AdsPilot Pro" },
      { property: "og:description", content: "Gérez votre identité, votre abonnement, l'historique de vos audits et la sécurité de votre compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  sector: string | null;
  country: string | null;
  timezone: string | null;
  avatar_url: string | null;
  has_andromeda_access: boolean;
  created_at: string;
};

type AuditRow = {
  id: string;
  sector: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any;
};

const SECTORS = [
  { value: "ecommerce", label: "E-commerce" },
  { value: "infoproduit", label: "Infoproduit" },
  { value: "service", label: "Service" },
];

const TIMEZONES = [
  "Europe/Paris", "Europe/London", "Europe/Madrid", "Europe/Berlin",
  "America/New_York", "America/Los_Angeles", "America/Toronto",
  "Africa/Casablanca", "Africa/Abidjan", "Asia/Dubai", "Asia/Tokyo",
];

function makeFallbackProfile(user: { id: string; email?: string | null }): ProfileRow {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    first_name: null,
    last_name: null,
    sector: null,
    country: null,
    timezone: null,
    avatar_url: null,
    has_andromeda_access: false,
    created_at: new Date().toISOString(),
  };
}

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      setLoading(true);
      setFetchError(null);

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const fallback = makeFallbackProfile(u.user);

      // 5s timeout — show page with fallback values rather than spin forever
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        setProfile((prev) => prev ?? fallback);
        setLoading(false);
      }, 5000);

      try {
        const [pRes, aRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
          supabase
            .from("audits")
            .select("id, sector, created_at, inputs, results")
            .eq("user_id", u.user.id)
            .order("created_at", { ascending: true })
            .limit(500),
        ]);
        if (!mounted) return;
        if (timeoutId) clearTimeout(timeoutId);

        if (pRes.error && !pRes.data) {
          setFetchError(pRes.error.message);
          setLoading(false);
          return;
        }
        setProfile((pRes.data as unknown as ProfileRow | null) ?? fallback);
        setAudits((aRes.data as unknown as AuditRow[] | null) ?? []);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        if (timeoutId) clearTimeout(timeoutId);
        setFetchError(e instanceof Error ? e.message : "Erreur inconnue");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, reloadKey]);

  // Sign URL for avatar (private bucket)
  useEffect(() => {
    let cancelled = false;
    if (!profile?.avatar_url) { setAvatarSignedUrl(null); return; }
    supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 3600).then(({ data }) => {
      if (!cancelled) setAvatarSignedUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
        <div className="card-cockpit p-6 max-w-md w-full text-center space-y-4">
          <div className="font-display font-bold uppercase tracking-widest text-sm">
            Impossible de charger le profil. Réessayez.
          </div>
          {fetchError && (
            <div className="text-xs text-muted-foreground break-words">{fetchError}</div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-bold uppercase tracking-widest"
            >
              Réessayer
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-surface transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: "var(--grad-primary)" }}>
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="font-display font-bold tracking-wider uppercase">Mon profil</div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-surface transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <IdentitySection profile={profile} avatarUrl={avatarSignedUrl} onProfileChange={setProfile} />
        <ActivitySection profile={profile} audits={audits} navigate={navigate} />
        <SubscriptionSection profile={profile} />
        <SecuritySection />
      </main>
    </div>
  );
}

/* ============ IDENTITÉ ============ */
function IdentitySection({
  profile, avatarUrl, onProfileChange,
}: { profile: ProfileRow; avatarUrl: string | null; onProfileChange: (p: ProfileRow) => void }) {
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [sector, setSector] = useState(profile.sector ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const f = (firstName || profile.email || "?").trim()[0] ?? "?";
    const l = (lastName || "").trim()[0] ?? "";
    return (f + l).toUpperCase();
  }, [firstName, lastName, profile.email]);

  const onSave = async () => {
    setSaving(true);
    const full_name = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name,
        sector: sector || null,
        country: country.trim() || null,
        timezone: timezone || null,
      })
      .eq("id", profile.id)
      .select("*")
      .maybeSingle();
    if (error) toast.error(error.message);
    else {
      toast.success("Profil mis à jour");
      if (data) onProfileChange(data as unknown as ProfileRow);
    }
    setSaving(false);
  };

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image trop lourde (max 3 Mo)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      toast.error(up.error.message);
      setUploading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", profile.id)
      .select("*")
      .maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      toast.success("Avatar mis à jour");
      onProfileChange(data as unknown as ProfileRow);
    }
    setUploading(false);
  };

  return (
    <Section icon={<User className="h-5 w-5 text-primary" />} title="Identité" subtitle="Vos informations personnelles">
      <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 items-start">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-24 w-24 rounded-full grid place-items-center overflow-hidden border border-border-strong"
            style={{ background: "var(--grad-primary)" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display font-bold text-2xl text-primary-foreground">{initials}</span>
            )}
          </div>
          <button
            onClick={onPickAvatar}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-1.5 text-[10px] uppercase tracking-widest font-display font-bold hover:bg-surface transition disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploading ? "Envoi…" : "Changer la photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Prénom">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" />
          </Field>
          <Field label="Nom">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" />
          </Field>
          <Field label="Email" hint="Non modifiable">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Secteur principal">
            <Select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">— Choisir —</option>
              {SECTORS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Pays">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" />
          </Field>
          <Field label="Fuseau horaire">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="">— Choisir —</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-hero inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder les modifications
        </button>
      </div>
    </Section>
  );
}

/* ============ ACTIVITÉ ============ */
function ActivitySection({
  profile, audits, navigate,
}: { profile: ProfileRow; audits: AuditRow[]; navigate: ReturnType<typeof useNavigate> }) {
  const auditsDesc = useMemo(() => [...audits].reverse(), [audits]);
  const stats = useMemo(() => {
    const series = audits.map((a) => {
      const r = (a.results ?? {}) as Record<string, number>;
      const scores = [r.andromedaScore, r.oracleScore, r.mercuryScore, r.atlasScore, r.visionScore]
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
      const avg = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0;
      return {
        date: new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        score: avg,
        full: a,
      };
    });
    const avgScore = series.length
      ? Math.round(series.reduce((s, p) => s + p.score, 0) / series.length)
      : 0;
    return { series, avgScore, total: audits.length, last: auditsDesc[0] };
  }, [audits, auditsDesc]);

  const onReview = (rec: AuditRow) => {
    emitAudit("audit:open", rec);
    navigate({ to: "/dashboard" });
  };

  return (
    <Section icon={<Activity className="h-5 w-5 text-primary" />} title="Mon activité" subtitle="Statistiques et progression">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Inscription" value={new Date(profile.created_at).toLocaleDateString("fr-FR")} />
        <Stat label="Audits réalisés" value={String(stats.total)} />
        <Stat label="Score moyen" value={`${stats.avgScore}/100`} tone={scoreTone(stats.avgScore)} />
        <Stat
          label="Dernier audit"
          value={stats.last ? new Date(stats.last.created_at).toLocaleDateString("fr-FR") : "—"}
        />
      </div>

      {stats.last && (
        <div className="mt-5 card-cockpit p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Dernier audit</div>
            <div className="mt-1 text-sm">
              {new Date(stats.last.created_at).toLocaleString("fr-FR")} ·{" "}
              <span className="font-bold" style={{ color: `var(--color-${scoreTone(stats.series.at(-1)?.score ?? 0)})` }}>
                {stats.series.at(-1)?.score ?? 0}/100
              </span>
            </div>
          </div>
          <button
            onClick={() => onReview(stats.last!)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
            style={{ background: "var(--grad-primary)" }}
          >
            <Eye className="h-3.5 w-3.5" /> Revoir
          </button>
        </div>
      )}

      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
          Progression des scores
        </div>
        {stats.series.length < 2 ? (
          <div className="card-cockpit p-6 text-sm text-muted-foreground">
            Pas encore assez de données. Réalisez au moins 2 audits pour visualiser l'évolution.
          </div>
        ) : (
          <div className="card-cockpit p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ============ ABONNEMENT ============ */
function SubscriptionSection({ profile }: { profile: ProfileRow }) {
  const pro = profile.has_andromeda_access;
  return (
    <Section icon={<CreditCard className="h-5 w-5 text-primary" />} title="Mon abonnement" subtitle="Plan et accès">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-cockpit p-5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Plan actuel</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="font-display font-bold text-xl">{pro ? "Pro" : "Free"}</div>
            {pro && <span className="chip-tag" style={{ color: "var(--color-success)", borderColor: "var(--color-success)" }}>ACTIF</span>}
          </div>
        </div>
        <div className="card-cockpit p-5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Accompagnement</div>
          <div className="mt-2 flex items-center gap-2">
            {pro ? (
              <><CheckCircle2 className="h-4 w-4 text-success" /> <span className="font-display font-bold">Prioritaire</span></>
            ) : (
              <><XCircle className="h-4 w-4 text-muted-foreground" /> <span className="font-display font-bold text-muted-foreground">Non inclus</span></>
            )}
          </div>
        </div>
        <div className="card-cockpit p-5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Renouvellement</div>
          <div className="mt-2 font-display font-bold text-sm text-muted-foreground">
            {pro ? "Géré par votre admin" : "—"}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============ SÉCURITÉ ============ */
function SecuritySection() {
  const navigate = useNavigate();
  const removeAccount = useServerFn(deleteAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const onChangePassword = async () => {
    if (pwd.length < 8) { toast.error("Mot de passe ≥ 8 caractères"); return; }
    if (pwd !== pwd2) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      setPwd(""); setPwd2(""); setShowPassword(false);
    }
    setPwdSaving(false);
  };

  const onDelete = async () => {
    if (deleteConfirm !== "SUPPRIMER") { toast.error('Tapez "SUPPRIMER" pour confirmer'); return; }
    setDeleting(true);
    try {
      await removeAccount({ data: undefined });
      await supabase.auth.signOut();
      toast.success("Compte supprimé");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Section icon={<Shield className="h-5 w-5 text-primary" />} title="Sécurité" subtitle="Mot de passe et compte">
      <div className="space-y-4">
        {!showPassword ? (
          <button
            onClick={() => setShowPassword(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
          >
            <KeyRound className="h-3.5 w-3.5" /> Changer mon mot de passe
          </button>
        ) : (
          <div className="card-cockpit p-5 space-y-3">
            <div className="font-display font-bold uppercase tracking-widest text-sm">Nouveau mot de passe</div>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Nouveau mot de passe" />
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Confirmer" />
            <div className="flex gap-2">
              <button
                onClick={onChangePassword}
                disabled={pwdSaving}
                className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Mettre à jour
              </button>
              <button
                onClick={() => { setShowPassword(false); setPwd(""); setPwd2(""); }}
                className="inline-flex items-center rounded-lg border border-border-strong px-4 py-2 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }}
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
        >
          <LogOut className="h-3.5 w-3.5" /> Me déconnecter
        </button>

        <div className="border-t border-border pt-4">
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs uppercase tracking-widest font-display font-bold transition hover:bg-danger/10"
              style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer mon compte
            </button>
          ) : (
            <div className="card-cockpit p-5 space-y-3" style={{ borderColor: "var(--color-danger)" }}>
              <div className="font-display font-bold uppercase tracking-widest text-sm text-danger">
                Suppression définitive
              </div>
              <p className="text-sm text-muted-foreground">
                Cette action supprime votre compte, vos audits et votre profil. Elle est irréversible.
                Pour confirmer, tapez <span className="font-mono font-bold text-foreground">SUPPRIMER</span> ci-dessous.
              </p>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" />
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  disabled={deleting || deleteConfirm !== "SUPPRIMER"}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--color-danger)" }}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Supprimer définitivement
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}
                  className="inline-flex items-center rounded-lg border border-border-strong px-4 py-2 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ============ Atoms ============ */
function Section({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card-cockpit p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">{icon}</div>
        <div>
          <div className="font-display font-bold uppercase tracking-widest text-sm">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">
        {label}{hint && <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">· {hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input/40 focus:border-primary outline-none text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input/40 focus:border-primary outline-none text-sm transition"
    />
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="card-cockpit p-4">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{label}</div>
      <div
        className="mt-2 font-mono-data font-bold text-lg"
        style={tone ? { color: `var(--color-${tone})` } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function scoreTone(s: number): "success" | "warning" | "danger" {
  if (s >= 70) return "success";
  if (s >= 45) return "warning";
  return "danger";
}
