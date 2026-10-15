import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  BarChart3,
  Eye,
  Rocket,
  Activity,
  Search,
  Globe2,
  TrendingUp,
  Zap,
  Target,
  Sparkles,
  ClipboardList,
  Brain,
  PlayCircle,
} from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { CoachingCTA } from "@/components/CoachingCTA";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AdsPilot Pro — L'arsenal décisionnel Meta Ads" },
      {
        name: "description",
        content:
          "Six piliers technologiques pour réconcilier vos données, valider vos actifs et simuler votre scale Meta Ads avec précision.",
      },
      { property: "og:title", content: "AdsPilot Pro — Cockpit Meta Ads" },
      {
        property: "og:description",
        content:
          "Simulez votre rentabilité, auditez vos campagnes et scalez sans casser votre algorithme.",
      },
    ],
  }),
  component: Landing,
});

/* ============ Animated counter ============ */
function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, prefix, suffix, decimals, mv]);

  return <span ref={ref}>{`${prefix}0${suffix}`}</span>;
}

/* ============ Arsenal data ============ */
const arsenal = [
  {
    code: "ANDROMEDA",
    sub: "(RENTABILITÉ)",
    cat: "FINANCE",
    icon: BarChart3,
    title: "Votre vrai seuil de rentabilité",
    desc:
      "ROAS de rentabilité et CPA maximum calculés sur VOTRE marge (produit, livraison, frais), pas sur une moyenne. Vous savez enfin à partir de quand vous perdez de l'argent.",
    accent: "var(--color-success)",
  },
  {
    code: "ORACLE",
    sub: "(LTV)",
    cat: "ACQUISITION",
    icon: Eye,
    title: "Ce que vaut un client",
    desc:
      "Marge générée par client sur 12 mois et ratio LTV/CPA : le budget d'acquisition que vous pouvez réellement vous permettre.",
    accent: "var(--color-primary)",
  },
  {
    code: "MERCURY",
    sub: "(CRO)",
    cat: "CONVERSION",
    icon: Rocket,
    title: "Les fuites entre le clic et l'achat",
    desc:
      "Ajout panier, abandon, vitesse de page : repérez où vos visiteurs décrochent avant de dépenser plus en publicité.",
    accent: "var(--color-warning)",
  },
  {
    code: "ATLAS",
    sub: "(SCALING)",
    cat: "OPÉRATIONS",
    icon: Activity,
    title: "Scaler sans rupture",
    desc:
      "Couverture de stock et dépendance fournisseur : vérifiez que votre logistique tient avant d'augmenter le budget (e-commerce).",
    accent: "var(--color-primary)",
  },
  {
    code: "VISION CRÉATIVE",
    sub: "(PRO)",
    cat: "IA",
    icon: Sparkles,
    title: "Notation créative IA",
    desc:
      "Envoyez une image : l'IA la note sur 5 axes (hook, lisibilité, offre, format mobile, appel à l'action) et propose une correction concrète.",
    accent: "var(--color-warning)",
  },
  {
    code: "COCKPIT META",
    sub: "",
    cat: "DONNÉES",
    icon: Search,
    title: "Vos chiffres Meta, sans ressaisie",
    desc:
      "Connexion en lecture seule, import automatique, alertes de dégradation semaine après semaine et positionnement par rapport à des repères sectoriels.",
    accent: "var(--color-success)",
  },
];

const battleReports = [
  {
    code: "SEUIL DE RENTABILITÉ",
    tag: "EXEMPLE",
    icon: TrendingUp,
    title: "Marge 40 % → ROAS de rentabilité 2,5×",
    metric: "2,5×",
    metricLabel: "à dépasser pour gagner",
    desc: "Avec un ROAS de 2,0 vous perdez de l'argent malgré un « bon » résultat apparent. C'est la formule utilisée dans l'app.",
  },
  {
    code: "CPA MAXIMUM",
    tag: "EXEMPLE",
    icon: Zap,
    title: "Panier 65 € à 40 % de marge",
    metric: "26 €",
    metricLabel: "CPA maximum rentable",
    desc: "Au-delà de 26 € par client acquis, la première commande est déficitaire : seule la LTV peut compenser.",
  },
  {
    code: "RATIO LTV / CPA",
    tag: "EXEMPLE",
    icon: Target,
    title: "78 € de marge/client (3 commandes/an) pour 26 € de CPA",
    metric: "3:1",
    metricLabel: "ratio de référence sain",
    desc: "Un ratio de 3 pour 1 laisse de la marge de manœuvre pour scaler sans mettre la trésorerie en danger.",
  },
];

/* ============ Page ============ */
function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <Hero />
      <SocialProof />
      <WhoIsItFor />
      <Arsenal />
      <HowItWorks />
      <BattleReports />
      <PricingSection />
      <section className="py-20 md:py-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-6">
          <CoachingCTA />
        </div>
      </section>
      <FinalCta />
      <Footer />
    </div>
  );
}


function NavBar() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#arsenal" className="hover:text-foreground transition">Arsenal</a>
          <a href="#how" className="hover:text-foreground transition">Comment ça marche</a>
          <Link to="/pricing" className="hover:text-foreground transition">Tarifs</Link>
        </nav>
        <Link
          to={signedIn ? "/dashboard" : "/auth"}
          className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold font-display uppercase tracking-wider"
        >
          {signedIn ? "Mon cockpit" : "Accéder"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}


function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-md grid place-items-center" style={{ background: "var(--grad-primary)" }}>
        <div className="absolute inset-0 rounded-md opacity-50 blur-md" style={{ background: "var(--grad-primary)" }} />
        <Rocket className="relative h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display font-bold tracking-wider text-foreground">ADSPILOT</span>
        <span className="chip-tag !py-0.5">PRO</span>
      </div>
    </Link>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <span className="chip-tag mb-6">AUDIT META ADS POUR SOLopreneurs & MEDIA BUYERS</span>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
            Trouvez pourquoi vos campagnes Meta{" "}
            <span className="text-gradient-primary">perdent de l'argent.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            AdsPilot Pro analyse vos chiffres en 2 minutes, détecte vos fuites de budget et vous
            donne un plan d'action prioritaire — sans vous noyer dans des tableaux Excel.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="btn-hero inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold font-display uppercase tracking-widest"
            >
              Faire mon audit gratuit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold font-display uppercase tracking-widest text-foreground hover:text-primary transition"
            >
              Voir les tarifs →
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Aucune carte bancaire requise · 3 diagnostics IA gratuits par mois</p>
        </motion.div>

        {/* 3 hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Ticker label="Temps pour obtenir un diagnostic" value="< 3 MIN" accent="var(--color-success)" />
          <Ticker label="Du seuil de rentabilité à la créa" value="4 DIAGNOSTICS + CRÉA" accent="var(--color-primary)" />
          <Ticker label="Diagnostic actionnable par l'IA" value="CLAUDE" accent="var(--color-warning)" />
        </motion.div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="py-12 border-b border-border">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            ["Lecture seule", "Meta Ads : nous ne pouvons ni modifier vos campagnes ni dépenser votre budget."],
            ["Vos données restent à vous", "Suppression du compte et révocation de l'accès Meta en un clic."],
            ["Rapports partageables", "Liens en lecture seule avec date d'expiration, révocables à tout moment."],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="font-display font-bold uppercase tracking-widest text-sm">{t}</div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoIsItFor() {
  const items = [
    {
      icon: Target,
      title: "Solopreneurs E-commerce",
      desc: "Vous gérez vos propres campagnes Meta et vous ne savez pas si votre ROAS est vraiment rentable.",
    },
    {
      icon: Rocket,
      title: "Créateurs d'Infoproduits",
      desc: "Vous lancez des offres et vous voulez scaler sans casser votre marge nette.",
    },
    {
      icon: Activity,
      title: "Media Buyers indépendants",
      desc: "Vous auditez des comptes clients et vous avez besoin d'un diagnostic rapide et crédible.",
    },
  ];
  return (
    <section className="py-24 md:py-32 border-b border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="chip-tag mb-4">POUR QUI ?</span>
          <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
            Fait pour les <span className="text-gradient-primary">profils exigeants.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card-cockpit p-7"
            >
              <div
                className="h-11 w-11 rounded-lg grid place-items-center mb-5"
                style={{ background: "color-mix(in oklab, var(--color-primary) 18%, transparent)", color: "var(--color-primary)" }}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div className="font-display font-bold uppercase text-lg tracking-wide">{item.title}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Entrez vos métriques",
    desc: "Connectez Meta en lecture seule ou saisissez vos chiffres, avec votre marge réelle.",
  },
  {
    n: "02",
    icon: Brain,
    title: "L'IA analyse",
    desc: "Vos seuils de rentabilité sont calculés, puis l'IA interprète vos chiffres et repère vos fuites.",
  },
  {
    n: "03",
    icon: PlayCircle,
    title: "Agissez",
    desc: "Plan d'action précis, chiffré, applicable cette semaine.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="chip-tag mb-4">PROCESSUS</span>
          <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
            3 étapes. <span className="text-gradient-primary">Un diagnostic complet.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card-cockpit p-7 relative"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono-data text-4xl font-bold text-gradient-primary">{s.n}</span>
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="font-display font-bold uppercase text-xl tracking-wide">{s.title}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/50" />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/auth"
            className="btn-hero inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold font-display uppercase tracking-widest"
          >
            Obtenir mon diagnostic gratuit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Ticker({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <div className="card-cockpit p-5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono-data text-3xl font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}


function Arsenal() {
  return (
    <section id="arsenal" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <span className="chip-tag mb-4">LES MODULES</span>
          <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
            Six modules. <span className="text-gradient-primary">Une discipline.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Chaque module répond à une question précise : est-ce que je gagne de l'argent, où est-ce que je perds, et que faire cette semaine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {arsenal.map((m, i) => (
            <motion.div
              key={m.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card-cockpit p-6 relative group hover:border-border-strong transition"
            >
              <div className="flex items-start justify-between mb-6">
                <div
                  className="h-11 w-11 rounded-lg grid place-items-center"
                  style={{ background: `color-mix(in oklab, ${m.accent} 18%, transparent)`, color: m.accent }}
                >
                  <m.icon className="h-5 w-5" />
                </div>
                <span className="chip-tag">{m.cat}</span>
              </div>
              <div className="font-display font-bold uppercase text-xl tracking-wide">
                {m.code} <span className="text-muted-foreground font-normal text-base">{m.sub}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground/90">{m.title}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BattleReports() {
  return (
    <section id="rapports" className="py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <span className="chip-tag mb-4">EXEMPLES ILLUSTRATIFS</span>
          <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
            Des chiffres qui <span className="text-gradient-primary">changent vos décisions.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {battleReports.map((r, i) => (
            <motion.div
              key={r.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="card-cockpit p-7"
            >
              <div className="flex items-center gap-2 mb-5">
                <r.icon className="h-4 w-4 text-primary" />
                <span className="chip-tag">{r.tag}</span>
              </div>
              <div className="font-display font-bold uppercase text-sm tracking-widest text-muted-foreground">
                {r.code}
              </div>
              <div className="mt-2 text-xl font-display font-bold">{r.title}</div>
              <div className="mt-6 flex items-baseline gap-2">
                <div className="font-mono-data text-4xl font-bold text-gradient-primary">{r.metric}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.metricLabel}</div>
              </div>
              <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="cockpit" className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div
          className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, var(--color-surface) 0%, color-mix(in oklab, var(--color-primary) 10%, var(--color-background)) 100%)",
            border: "1px solid var(--color-border-strong)",
          }}
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[40rem] rounded-full blur-3xl opacity-40" style={{ background: "var(--grad-primary)" }} />
          <div className="relative">
            <span className="chip-tag mb-6">DÉPLOIEMENT</span>
            <h2 className="font-display font-bold uppercase text-4xl md:text-6xl leading-tight">
              Déployez votre
              <br />
              <span className="text-gradient-primary">Command Center.</span>
            </h2>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
              Activation immédiate. Aucun engagement. Vos données restent les vôtres.
            </p>
            <Link
              to="/auth"
              className="btn-hero mt-10 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold font-display uppercase tracking-widest"
            >
              Obtenir mon diagnostic gratuit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <Logo />
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              © 2026 AdsPilot Pro<br />Tous droits réservés.
            </p>
            <a
              href="mailto:contact@adspilotpro.com"
              className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground transition"
            >
              contact@adspilotpro.com
            </a>
          </div>
          <div>
            <div className="font-display font-bold uppercase text-xs tracking-widest text-foreground mb-4">
              Produit
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#arsenal" className="hover:text-foreground transition">Fonctionnalités</a></li>
              <li><Link to="/pricing" className="hover:text-foreground transition">Tarifs</Link></li>
              <li><a href="#how" className="hover:text-foreground transition">Comment ça marche</a></li>
              <li><Link to="/auth" className="hover:text-foreground transition">Se connecter</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold uppercase text-xs tracking-widest text-foreground mb-4">
              Ressources
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><span className="opacity-60">Accompagnement</span></li>
              <li><span className="opacity-60">Blog</span></li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold uppercase text-xs tracking-widest text-foreground mb-4">
              Légal
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/mentions-legales" className="hover:text-foreground transition">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="hover:text-foreground transition">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>

          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center font-mono uppercase tracking-widest text-[10px] text-muted-foreground">
          ALL SYSTEMS NOMINAL
        </div>
      </div>
    </footer>
  );
}

