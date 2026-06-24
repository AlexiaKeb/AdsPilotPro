import { ArrowRight, Calendar } from "lucide-react";

const CALENDLY_URL = "#";

export function CoachingCTA() {
  return (
    <section
      className="rounded-2xl p-8 md:p-10"
      style={{
        background: "rgba(0, 229, 160, 0.10)",
        border: "1px solid rgba(0, 229, 160, 0.45)",
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{
                background: "rgba(0, 229, 160, 0.18)",
                color: "rgb(0, 229, 160)",
              }}
            >
              <Calendar className="h-3 w-3" /> ACCOMPAGNEMENT PERSONNALISÉ
            </span>
          </div>
          <h3 className="font-display font-bold uppercase text-2xl md:text-3xl tracking-tight">
            Vous voulez aller plus vite ?
          </h3>
          <p className="mt-3 text-sm md:text-base text-foreground/80 leading-relaxed">
            Travaillez directement avec notre expert Meta Ads — plus de 10 ans
            d'expérience. Audit de compte, stratégie scaling, ou suivi mensuel.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {[
              "Audit de compte 1-to-1",
              "Stratégie Meta Ads sur-mesure",
              "Accompagnement mensuel",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span style={{ color: "rgb(0, 229, 160)" }}>✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0">
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-4 text-xs font-display font-bold uppercase tracking-widest text-background transition hover:opacity-90"
            style={{ background: "rgb(0, 229, 160)" }}
          >
            Réserver une session <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
