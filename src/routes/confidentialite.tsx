import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — AdsPilot Pro" },
      {
        name: "description",
        content:
          "Données collectées par AdsPilot Pro, usage des données Meta Ads, durée de conservation et droits RGPD.",
      },
      { property: "og:title", content: "Politique de confidentialité — AdsPilot Pro" },
      {
        property: "og:description",
        content: "Comment AdsPilot Pro collecte, utilise et protège vos données publicitaires.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://adspilotpro.lovable.app/confidentialite" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://adspilotpro.lovable.app/confidentialite" }],
  }),
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      <h2 className="font-display text-base font-bold uppercase tracking-widest text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 space-y-8">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="font-display text-3xl font-bold uppercase tracking-widest">
        Politique de confidentialité
      </h1>

      <Section title="Données collectées">
        <ul className="list-disc pl-5 space-y-1">
          <li>Compte : email, nom, secteur d&apos;activité, plan d&apos;abonnement.</li>
          <li>Audits : métriques saisies, scores calculés et diagnostics générés.</li>
          <li>
            Meta Ads (si vous connectez un compte) : jeton d&apos;accès, identifiant et nom du compte
            publicitaire, statistiques agrégées (dépense, impressions, clics, conversions, leads).
          </li>
        </ul>
      </Section>

      <Section title="Usage des données Meta">
        <p>
          Les données Meta sont lues en accès seule lecture (<code>ads_read</code>) dans un seul but :
          pré-remplir vos audits et générer votre diagnostic. Elles ne sont ni revendues, ni partagées avec
          des tiers publicitaires, ni utilisées pour du ciblage. Aucune donnée personnelle de vos clients
          finaux n&apos;est récupérée.
        </p>
      </Section>

      <Section title="Sous-traitants">
        <p>
          Hébergement et base de données : Supabase et Cloudflare. Analyse par intelligence artificielle :
          Anthropic (Claude). Seules les métriques agrégées nécessaires au diagnostic sont transmises à ce
          service ; elles ne servent pas à entraîner de modèles.
        </p>
      </Section>

      <Section title="Conservation">
        <p>
          Vos audits sont conservés tant que votre compte est actif. Le jeton Meta est supprimé dès que vous
          cliquez sur « Déconnecter » et expire automatiquement au bout de 60 jours.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez consulter, modifier ou supprimer vos données depuis la page « Mon profil ». La
          suppression du compte efface définitivement vos audits et votre connexion Meta. Pour toute demande
          RGPD : <a href="mailto:contact@adspilotpro.com" className="underline">contact@adspilotpro.com</a>.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Seuls des cookies techniques de session sont utilisés pour vous maintenir connecté. Aucun cookie
          publicitaire ou de traçage tiers n&apos;est déposé.
        </p>
      </Section>

      <p className="text-sm">
        <Link to="/mentions-legales" className="underline">Mentions légales →</Link>
      </p>
    </main>
  );
}
