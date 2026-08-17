import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Lock, User, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — AdsPilot Pro" },
      { name: "description", content: "Accédez à votre cockpit AdsPilot Pro." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Minimum 6 caractères").max(128),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(1, "Nom requis").max(100),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [adminMode, setAdminMode] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ email: "", code: "" });

  useEffect(() => {
    // Une session peut arriver juste après le retour OAuth : on écoute aussi les changements.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Hidden admin trigger
  useEffect(() => {
    if (form.email.trim().toUpperCase() === "ADSPILOT-ADMIN") {
      setAdminMode(true);
    }
  }, [form.email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (adminMode) {
        const parsed = signInSchema.parse({
          email: adminCreds.email,
          password: adminCreds.code,
        });
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (error) throw error;
        navigate({ to: "/admin-command", replace: true });
        return;
      }
      if (mode === "signup") {
        const parsed = signUpSchema.parse(form);
        const { error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: parsed.full_name },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Bienvenue dans le cockpit.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const parsed = signInSchema.parse(form);
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message : err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        toast.error(res.error.message || "Connexion Google échouée");
        setLoading(false);
        return;
      }
      if (res.redirected) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Session Google introuvable. Réessayez.");
        setLoading(false);
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion Google échouée");
      setLoading(false);
    }
  };


  const exitAdminMode = () => {
    setAdminMode(false);
    setAdminCreds({ email: "", code: "" });
    setForm({ email: "", password: "", full_name: "" });
  };


  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-border">
        <div className="absolute inset-0 opacity-60" style={{ background: "var(--grad-cockpit)" }} />
        <Link to="/" className="relative font-display font-bold uppercase tracking-wider">
          ← ADSPILOT <span className="chip-tag !py-0.5">PRO</span>
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <h1 className="font-display font-bold uppercase text-5xl leading-tight">
            Votre cockpit.<br />
            <span className="text-gradient-primary">Vos décisions.</span>
          </h1>
          <p className="mt-6 text-muted-foreground max-w-md">
            Connectez-vous pour piloter vos campagnes Meta avec la précision du top 1%.
          </p>
        </motion.div>
        <div className="relative font-mono text-xs uppercase tracking-widest text-muted-foreground">
          ALL SYSTEMS NOMINAL · v.2026
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md card-cockpit p-8"
        >
          <Link to="/" className="lg:hidden font-display font-bold uppercase tracking-wider text-sm text-muted-foreground">
            ← ADSPILOT PRO
          </Link>
          <h2 className="mt-2 font-display font-bold uppercase text-2xl tracking-wide">
            {adminMode ? "Accès administrateur" : mode === "signin" ? "Connexion" : "Création de compte"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminMode
              ? "Authentification restreinte."
              : mode === "signin"
              ? "Accédez à votre cockpit."
              : "Déployez votre command center."}
          </p>

          {!adminMode && (
            <>
              <button
                type="button"
                onClick={onGoogle}
                disabled={loading}
                className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm font-semibold hover:bg-surface-2 transition disabled:opacity-60"
              >
                <GoogleIcon /> Continuer avec Google
              </button>

              <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                <div className="h-px flex-1 bg-border" /> OU <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {adminMode && (
            <div
              className="mt-6 mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-widest"
              style={{
                background: "rgba(255, 59, 92, 0.10)",
                color: "#FF3B5C",
                border: "1px solid rgba(255, 59, 92, 0.35)",
              }}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Mode admin détecté
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {adminMode ? (
              <>
                <Field icon={Mail} label="Email administrateur">
                  <input
                    type="email"
                    autoComplete="off"
                    value={adminCreds.email}
                    onChange={(e) => setAdminCreds({ ...adminCreds, email: e.target.value })}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    placeholder="admin@adspilot.com"
                    required
                  />
                </Field>
                <Field icon={Lock} label="Code administrateur">
                  <input
                    type="password"
                    autoComplete="off"
                    value={adminCreds.code}
                    onChange={(e) => setAdminCreds({ ...adminCreds, code: e.target.value })}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    placeholder="••••••••"
                    required
                  />
                </Field>
              </>
            ) : (
              <>
                {mode === "signup" && (
                  <Field icon={User} label="Nom complet">
                    <input
                      type="text"
                      autoComplete="name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                      placeholder="Jean Dupont"
                      required
                    />
                  </Field>
                )}
                <Field icon={Mail} label="Email">
                  <input
                    type="text"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    placeholder="vous@empire.com"
                    required
                  />
                </Field>
                <Field icon={Lock} label="Mot de passe">
                  <input
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    placeholder="••••••••"
                    required
                  />
                </Field>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-hero w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold font-display uppercase tracking-widest disabled:opacity-60"
              style={adminMode ? { background: "#FF3B5C", color: "#000" } : undefined}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                {adminMode ? "Accéder à la console" : mode === "signin" ? "Activer le cockpit" : "Déployer"}{" "}
                <ArrowRight className="h-4 w-4" />
              </>}
            </button>

            {adminMode && (
              <button
                type="button"
                onClick={exitAdminMode}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
              >
                ← Retour à la connexion standard
              </button>
            )}
          </form>


          {!adminMode && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>Pas encore de compte ?{" "}
                  <button onClick={() => setMode("signup")} className="text-foreground font-semibold hover:text-primary">
                    Créer un compte
                  </button>
                </>
              ) : (
                <>Déjà inscrit ?{" "}
                  <button onClick={() => setMode("signin")} className="text-foreground font-semibold hover:text-primary">
                    Se connecter
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border bg-input/40 focus-within:border-primary transition">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.3 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 5.3 29.5 3 24 3 16.3 3 9.7 7.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2 14-5.3l-6.5-5.3C29.4 35.9 26.8 37 24 37c-5.3 0-9.7-3.4-11.3-8L6 33.5C9.3 40.6 16.1 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.3C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
