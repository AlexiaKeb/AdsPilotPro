import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { connectMeta } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/meta-callback")({
  component: MetaCallback,
  head: () => ({
    meta: [
      { title: "Connexion Meta Ads — AdsPilot" },
      { name: "description", content: "Finalisation de la connexion de votre compte publicitaire Meta Ads à AdsPilot." },
      { property: "og:title", content: "Connexion Meta Ads — AdsPilot" },
      { property: "og:description", content: "Finalisation de la connexion de votre compte publicitaire Meta Ads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MetaCallback() {
  const navigate = useNavigate();
  const run = useServerFn(connectMeta);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const denied = params.get("error");
    const expected = sessionStorage.getItem("meta_oauth_state");
    sessionStorage.removeItem("meta_oauth_state");

    if (denied) {
      setError("Connexion refusée sur Meta.");
      return;
    }
    if (!code) {
      setError("Code d'autorisation manquant.");
      return;
    }
    if (!state || state !== expected) {
      setError("Vérification de sécurité échouée. Relancez la connexion depuis le tableau de bord.");
      return;
    }

    run({ data: { code, redirectUri: `${window.location.origin}/meta-callback` } })
      .then(() => navigate({ to: "/dashboard", replace: true }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Connexion Meta impossible."));
  }, [navigate, run]);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
      {error ? (
        <div className="card-cockpit p-8 max-w-md text-center space-y-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-[var(--color-danger)]" />
          <h1 className="font-display font-bold uppercase tracking-widest text-sm">Connexion Meta échouée</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate({ to: "/dashboard", replace: true })}
            className="btn-hero px-5 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-widest"
          >
            Retour au tableau de bord
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Connexion de votre compte Meta Ads…
        </div>
      )}
    </div>
  );
}
