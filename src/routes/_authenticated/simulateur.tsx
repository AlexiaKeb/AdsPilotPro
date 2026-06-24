import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Activity } from "lucide-react";
import { SimulateurPanel } from "@/components/dashboard/SimulateurPanel";

export const Route = createFileRoute("/_authenticated/simulateur")({
  component: SimulateurPage,
});

function SimulateurPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: "var(--grad-primary)" }}>
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="font-display font-bold tracking-wider uppercase">Simulateur</div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-surface transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux audits
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <SimulateurPanel />
      </main>
    </div>
  );
}
