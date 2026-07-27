import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

export type PricingSectionProps = {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

const plans = [
  {
    name: "FREE",
    price: 0,
    label: "Pour découvrir",
    outcome: "Idéal pour tester un audit ponctuel",
    cta: "COMMENCER GRATUITEMENT",
    ctaLink: "/auth",
    highlighted: false,
    features: [
      { text: "3 audits gratuits par mois", included: true },
      { text: "Score global & module Andromeda", included: true },
      { text: "Diagnostic IA Claude", included: false },
      { text: "Modules Atlas, Oracle, Mercury, Vision Créative", included: false },
      { text: "Export PDF brandé", included: false },
      { text: "Historique étendu", included: false },
      { text: "Simulateur P&L illimité", included: false },
    ],
  },
  {
    name: "STARTER",
    price: 47,
    annualPrice: 470,
    label: "Pour démarrer sérieusement",
    outcome: "Identifiez vos fuites chaque semaine",
    cta: "CHOISIR STARTER",
    ctaLink: "/auth?plan=starter",
    highlighted: false,
    features: [
      { text: "Audits illimités", included: true },
      { text: "Modules Andromeda + Atlas + Oracle", included: true },
      { text: "Diagnostic IA Claude (5 / mois)", included: true },
      { text: "Historique 30 jours", included: true },
      { text: "Simulateur P&L", included: true },
      { text: "Module Vision Créative", included: false },
      { text: "Export PDF brandé", included: false },
      { text: "Accompagnement prioritaire", included: false },
    ],
  },
  {
    name: "PRO",
    price: 97,
    annualPrice: 970,
    label: "Pour performer sans limite",
    outcome: "Le cockpit complet pour scaler sereinement",
    badge: "LE PLUS COMPLET",
    cta: "DÉMARRER MON ESSAI GRATUIT",
    ctaSubtext: "7 jours gratuits — sans carte bancaire",
    ctaLink: "/auth?plan=pro",
    highlighted: true,
    features: [
      { text: "Tout le plan Starter inclus", included: true },
      { text: "Tous les modules : Vision Créative + Mercury", included: true },
      { text: "Diagnostic IA Claude illimité", included: true },
      { text: "Export PDF brandé illimité", included: true },
      { text: "Historique illimité + suivi de progression", included: true },
      { text: "Simulateur P&L illimité", included: true },
      { text: "Accompagnement prioritaire", included: true },
      { text: "Support prioritaire", included: true },
    ],
  },
];

export function PricingSection({
  title = "TRANSPARENT. SANS ENGAGEMENT.",
  subtitle = "Un investissement qui se rembourse en moins de 48h.",
  showHeader = true,
}: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        {showHeader && (
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="chip-tag mb-4">TARIFS</span>
            <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mt-4 text-muted-foreground">{subtitle}</p>
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`text-sm font-display uppercase tracking-widest transition ${!annual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setAnnual(!annual)}
            aria-label="Toggle billing period"
            className="relative h-7 w-12 rounded-full border border-border-strong bg-surface transition"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${annual ? "left-6 bg-primary" : "left-0.5 bg-muted-foreground"}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`text-sm font-display uppercase tracking-widest transition ${annual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Annuel
          </button>
          <span
            className="ml-2 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{
              background: "color-mix(in oklab, var(--color-success) 20%, transparent)",
              color: "var(--color-success)",
            }}
          >
            2 mois offerts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => {
            const isPro = plan.highlighted;
            const displayPrice = annual && plan.annualPrice
              ? Math.round(plan.annualPrice / 12)
              : plan.price;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  isPro ? "md:scale-[1.03]" : ""
                }`}
                style={{
                  background: isPro
                    ? "linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 10%, var(--color-surface)) 0%, var(--color-surface) 100%)"
                    : "#12142A",
                  border: isPro
                    ? "1.5px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  boxShadow: isPro
                    ? "0 0 50px -10px color-mix(in oklab, var(--color-primary) 60%, transparent)"
                    : "none",
                }}
              >
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5"
                    style={{ background: "var(--grad-primary)", color: "white" }}
                  >
                    <Sparkles className="h-3 w-3" /> {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="font-display font-bold uppercase text-2xl tracking-wider">
                    {plan.name}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                    {plan.label}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono-data text-5xl font-bold text-foreground">
                      {displayPrice}€
                    </span>
                    <span className="text-sm text-muted-foreground">/mois</span>
                  </div>
                  {annual && plan.annualPrice && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="line-through">{plan.price}€/mois</span>{" "}
                      · facturé {plan.annualPrice}€/an
                    </div>
                  )}
                  {!annual && plan.price === 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">Pour toujours</div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-3 text-sm">
                      {f.included ? (
                        <Check
                          className="h-4 w-4 shrink-0 mt-0.5"
                          style={{ color: "var(--color-success)" }}
                        />
                      ) : (
                        <X className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      )}
                      <span
                        className={
                          f.included ? "text-foreground/90" : "text-muted-foreground line-through"
                        }
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Link
                    to={plan.ctaLink}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs font-bold font-display uppercase tracking-widest transition ${
                      isPro ? "btn-hero" : "border border-border-strong text-foreground hover:bg-surface"
                    }`}
                  >
                    {plan.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                  {plan.ctaSubtext && (
                    <div className="mt-3 text-center text-xs text-muted-foreground">
                      {plan.ctaSubtext}
                    </div>
                  )}
                  {isPro && (
                    <div className="mt-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                      Paiement disponible prochainement
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ROI block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-14 rounded-2xl p-8 md:p-10 text-center"
          style={{
            background: "#0B0D1F",
            border: "1px solid var(--color-border-strong)",
          }}
        >
          <span className="chip-tag mb-4">RETOUR SUR INVESTISSEMENT</span>
          <p className="text-lg md:text-xl text-foreground/90 leading-relaxed max-w-3xl mx-auto">
            Si vous dépensez{" "}
            <span className="font-mono-data font-bold" style={{ color: "var(--color-success)" }}>
              2 000€/mois
            </span>{" "}
            en Meta Ads et qu'AdsPilot Pro identifie{" "}
            <span className="font-mono-data font-bold" style={{ color: "var(--color-success)" }}>
              10% de gaspillage
            </span>{" "}
            — vous économisez{" "}
            <span className="font-mono-data font-bold" style={{ color: "var(--color-success)" }}>
              200€/mois
            </span>
            .
          </p>
          <p className="mt-4 font-display font-bold uppercase tracking-wider text-2xl md:text-3xl">
            L'abonnement se rembourse{" "}
            <span style={{ color: "var(--color-success)" }}>4× chaque mois.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
