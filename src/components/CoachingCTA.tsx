import { ArrowRight, Calendar } from "lucide-react";

const CALENDLY_URL = "#";

export function CoachingCTA() {
  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{
                background: "color-mix(in oklab, var(--color-success) 12%, transparent)",
                color: "var(--color-success)",
              }}
            >
              <Calendar className="h-3 w-3" /> Accompagnement
            </span>
          </div>
          <h3 className="font-display font-bold text-lg tracking-tight">
            Vous voulez aller plus vite ?
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Travaillez avec un expert Meta Ads. Audit de compte, stratégie scaling ou suivi mensuel.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            {[
              "Audit de compte 1-to-1",
              "Stratégie Meta Ads sur-mesure",
              "Suivi mensuel",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-display font-bold uppercase tracking-widest text-success-foreground transition hover:opacity-90"
          style={{ background: "var(--color-success)" }}
        >
          Réserver une session <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
