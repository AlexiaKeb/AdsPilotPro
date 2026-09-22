import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { getSharedReport } from "@/lib/share.functions";
import { SharedReportView } from "@/components/report/SharedReportView";

export const Route = createFileRoute("/r/$token")({
  loader: async ({ params }) => {
    try {
      return await getSharedReport({ data: { token: params.token } });
    } catch {
      return { status: "not_found" as const, report: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Rapport d'audit publicitaire — AdsPilot Pro" },
      {
        name: "description",
        content:
          "Rapport d'audit publicitaire en lecture seule : scores par module, métriques et recommandations IA.",
      },
      { property: "og:title", content: "Rapport d'audit publicitaire — AdsPilot Pro" },
      {
        property: "og:description",
        content:
          "Rapport d'audit publicitaire en lecture seule : scores par module, métriques et recommandations IA.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedReportPage,
  errorComponent: () => <Unavailable status="not_found" />,
  notFoundComponent: () => <Unavailable status="not_found" />,
});

function SharedReportPage() {
  const data = Route.useLoaderData();

  if (data.status !== "ok" || !data.report) {
    return <Unavailable status={data.status} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-display font-bold tracking-widest uppercase text-sm">
            AdsPilot<span className="text-primary"> Pro</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> Lecture seule
          </div>
        </div>
      </header>

      <SharedReportView report={data.report} />

      <footer className="border-t border-border mt-8">
        <div className="mx-auto max-w-5xl px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Ce rapport a été généré avec AdsPilot Pro.
          </p>
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-display font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 transition"
            style={{ background: "var(--grad-primary)" }}
          >
            Auditer mes campagnes
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Unavailable({ status }: { status: "not_found" | "expired" | "revoked" }) {
  const message =
    status === "expired"
      ? "Ce lien de partage a expiré. Demandez-en un nouveau à son auteur."
      : status === "revoked"
        ? "Ce lien de partage a été désactivé par son auteur."
        : "Ce lien de partage n'existe pas ou n'est plus valide.";
  return (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
        <h1 className="font-display font-bold uppercase tracking-widest text-lg mb-2">
          Rapport indisponible
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{message}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border-strong px-4 py-2.5 text-xs uppercase tracking-widest font-display font-bold hover:bg-surface transition"
        >
          Découvrir AdsPilot Pro
        </Link>
      </div>
    </div>
  );
}
