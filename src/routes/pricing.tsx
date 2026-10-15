import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PricingSection } from "@/components/landing/PricingSection";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Tarifs — AdsPilot Pro" },
      {
        name: "description",
        content:
          "Free (3 diagnostics IA/mois), Starter 47€ ou Pro 97€. Sans engagement.",
      },
      { property: "og:title", content: "Tarifs AdsPilot Pro — Free, Starter & Pro" },
      {
        property: "og:description",
        content:
          "Comparez nos plans : diagnostics IA, modules Andromeda, Oracle, Mercury, Atlas et Vision Créative.",
      },
    ],
  }),
  component: PricingPage,
});

const faq = [
  {
    q: "Puis-je vraiment commencer gratuitement ?",
    a: "Oui. Le plan Free vous donne 3 diagnostics IA par mois sur le module Andromeda (rentabilité), la connexion Meta Ads, le simulateur, l'historique et l'export PDF. Aucune carte bancaire n'est demandée.",
  },
  {
    q: "En quoi AdsPilot Pro est différent d'un tableau Excel ?",
    a: "L'application intègre des benchmarks sectoriels, un moteur IA (Claude) qui interprète vos chiffres et un PDF de synthèse prêt à partager. Vous gagnez du temps et vous obtenez un diagnostic, pas juste des formules.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, sans engagement. Le paiement en ligne ouvre prochainement ; les abonnements seront résiliables en un clic depuis votre profil.",
  },
  {
    q: "Mes données publicitaires sont-elles sécurisées ?",
    a: "La connexion Meta est en lecture seule, votre jeton d'accès reste côté serveur (jamais exposé dans le navigateur) et vos données ne sont pas revendues. Vous pouvez tout supprimer, y compris la connexion Meta, depuis votre profil.",
  },
  {
    q: "Puis-je travailler avec un expert Meta Ads ?",
    a: "Oui — l'accompagnement personnalisé 1-to-1 avec notre expert Meta Ads est disponible en option depuis votre dashboard, quel que soit votre plan.",
  },
  {
    q: "Quand est-ce que je vais voir un retour sur investissement ?",
    a: "À titre d'illustration : avec 2 000€/mois de dépense et 10% de gaspillage identifié, soit 200€/mois, un abonnement Pro à 97€ serait rentabilisé. Le gain réel dépend de votre compte et n'est pas garanti.",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="relative h-8 w-8 rounded-md grid place-items-center"
              style={{ background: "var(--grad-primary)" }}
            >
              <Rocket className="relative h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold tracking-wider">ADSPILOT</span>
            <span className="chip-tag !py-0.5">PRO</span>
          </Link>
          <Link
            to="/auth"
            className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold font-display uppercase tracking-wider"
          >
            Accéder <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="chip-tag mb-6">TARIFS · 2026</span>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl leading-[1] tracking-tight">
            Un investissement pensé pour{" "}
            <span className="text-gradient-primary">se rembourser.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Savez-vous à partir de quel ROAS votre budget Meta Ads devient réellement rentable ?
            AdsPilot Pro le calcule sur votre marge et vous dit où agir.
          </p>
        </div>
      </section>

      <PricingSection showHeader={false} />

      {/* FAQ */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-10">
            <span className="chip-tag mb-4">QUESTIONS FRÉQUENTES</span>
            <h2 className="font-display font-bold uppercase text-3xl md:text-4xl">
              On vous répond.
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="font-display uppercase tracking-wide text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="font-mono uppercase tracking-widest">
            © 2026 ADSPILOT PRO — Tous droits réservés
          </div>
          <Link to="/" className="hover:text-foreground transition">
            ← Retour à l'accueil
          </Link>
        </div>
      </footer>
    </div>
  );
}
