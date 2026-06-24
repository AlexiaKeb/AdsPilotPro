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
          "Free ou Pro à 47€/mois. Un investissement qui se rembourse en 48h. Sans engagement, annulable à tout moment.",
      },
      { property: "og:title", content: "Tarifs AdsPilot Pro — Free & Pro" },
      {
        property: "og:description",
        content:
          "Comparez nos plans : audits illimités, IA Claude, modules Atlas/Oracle/Mercury/Vision.",
      },
    ],
  }),
  component: PricingPage,
});

const faq = [
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, sans engagement. Vous pouvez résilier votre abonnement en un clic depuis votre profil.",
  },
  {
    q: "Mes données publicitaires sont-elles sécurisées ?",
    a: "Oui, vos données sont chiffrées et ne sont jamais partagées avec des tiers. Vous restez seul propriétaire de vos métriques.",
  },
  {
    q: "La Masterclass est-elle incluse dans le Pro ?",
    a: "Oui, accès complet immédiat à toute la Masterclass dès l'activation de votre plan Pro.",
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
              <Rocket className="relative h-4 w-4 text-white" />
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
            Un investissement qui se rembourse{" "}
            <span className="text-gradient-primary">en 48h.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Votre budget Meta Ads tourne à perte en ce moment. AdsPilot Pro l'identifie et le
            corrige.
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
