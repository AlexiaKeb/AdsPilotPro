import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  component: LegalPage,
  head: () => ({
    meta: [
      { title: "Mentions légales — AdsPilot Pro" },
      {
        name: "description",
        content:
          "Mentions légales d'AdsPilot Pro : éditeur, hébergement, propriété intellectuelle et contact.",
      },
      { property: "og:title", content: "Mentions légales — AdsPilot Pro" },
      {
        property: "og:description",
        content: "Informations légales sur l'éditeur et l'hébergeur d'AdsPilot Pro.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://adspilotpro.lovable.app/mentions-legales" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://adspilotpro.lovable.app/mentions-legales" }],
  }),
});

function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 space-y-8">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="font-display text-3xl font-bold uppercase tracking-widest">Mentions légales</h1>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-display text-base font-bold uppercase tracking-widest text-foreground">Éditeur</h2>
        <p>
          AdsPilot Pro — service d&apos;audit publicitaire en ligne. Contact :{" "}
          <a href="mailto:contact@adspilotpro.com" className="underline">contact@adspilotpro.com</a>.
        </p>
        <p className="text-xs">
          À compléter par l&apos;éditeur : raison sociale, forme juridique, capital social, siège social,
          numéro SIREN/SIRET, numéro de TVA intracommunautaire et directeur de la publication.
        </p>
      </section>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-display text-base font-bold uppercase tracking-widest text-foreground">Hébergement</h2>
        <p>
          L&apos;application est hébergée sur une infrastructure cloud européenne opérée par Lovable et ses
          sous-traitants techniques (Cloudflare, Supabase).
        </p>
      </section>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-display text-base font-bold uppercase tracking-widest text-foreground">
          Propriété intellectuelle
        </h2>
        <p>
          L&apos;ensemble des contenus, méthodologies d&apos;audit, scores et interfaces d&apos;AdsPilot Pro
          sont protégés. Toute reproduction ou réutilisation sans autorisation écrite est interdite.
        </p>
      </section>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="font-display text-base font-bold uppercase tracking-widest text-foreground">
          Responsabilité
        </h2>
        <p>
          Les diagnostics fournis reposent sur les données saisies ou importées par l&apos;utilisateur et sur
          une analyse automatisée. Ils constituent une aide à la décision et n&apos;engagent pas la
          responsabilité de l&apos;éditeur quant aux résultats publicitaires obtenus.
        </p>
      </section>

      <p className="text-sm">
        <Link to="/confidentialite" className="underline">Politique de confidentialité →</Link>
      </p>
    </main>
  );
}
