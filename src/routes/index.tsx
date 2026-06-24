import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef } from "react";
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
    code: "ATLAS",
    sub: "(P&L)",
    cat: "FINANCE",
    icon: BarChart3,
    title: "Le Titan Financier",
    desc:
      "Ne vous fiez plus au ROAS menteur. Maîtrisez votre profit net réel après chaque dépense logistique et fiscale.",
    accent: "var(--color-success)",
  },
  {
    code: "ORACLE",
    sub: "(VISION)",
    cat: "KPI",
    icon: Eye,
    title: "L'Audit Créatif IA",
    desc:
      "Détectez instantanément pourquoi vos publicités ne convertissent pas avant même de dépenser votre budget.",
    accent: "var(--color-primary)",
  },
  {
    code: "MERCURY",
    sub: "(SCALE)",
    cat: "SIMULATION",
    icon: Rocket,
    title: "Le Simulateur de Profit",
    desc:
      "Prédisez vos revenus à 30 jours et simulez vos hausses de budget sans jamais casser votre algorithme.",
    accent: "var(--color-warning)",
  },
  {
    code: "ANDROMEDA",
    sub: "",
    cat: "KPI",
    icon: Activity,
    title: "Benchmark industriel",
    desc:
      "Comparez vos signaux Meta aux leaders du top 1% et identifiez vos goulots d'étranglement.",
    accent: "var(--color-primary)",
  },
  {
    code: "AUDIT STRATÉGIQUE",
    sub: "",
    cat: "EXPERTISE",
    icon: Search,
    title: "Scanner 360° du tunnel",
    desc:
      "Identifiez les frictions qui tuent votre conversion et optimisez chaque étape du parcours client.",
    accent: "var(--color-success)",
  },
  {
    code: "VISION CRÉATIVE",
    sub: "",
    cat: "IA",
    icon: Sparkles,
    title: "Notation créative IA en 30 secondes",
    desc:
      "Uploadez votre photo ou vidéo — l'IA la note instantanément et pointe les frictions qui tuent vos conversions.",
    accent: "var(--color-warning)",
  },

];

const battleReports = [
  {
    code: "LE TITAN ATLAS",
    tag: "P&L",
    icon: TrendingUp,
    title: "Fuite −4 150 € détectée",
    metric: "+18%",
    metricLabel: "marge nette",
    desc: "Reconstruction du P&L réel : identification des frais cachés et restauration de la marge.",
  },
  {
    code: "L'EXPLOSION ORACLE",
    tag: "VISION",
    icon: Zap,
    title: "CTR 0.80% → 3.20%",
    metric: "×4",
    metricLabel: "performance créa",
    desc: "Correction du Hook Rate diagnostiquée par l'audit IA en moins de 90 secondes.",
  },
  {
    code: "L'ACCÉLÉRATEUR MERCURY",
    tag: "SCALE",
    icon: Target,
    title: "ROI prédit 4.5 → réel 4.48",
    metric: "98%",
    metricLabel: "précision modèle",
    desc: "Scaling progressif validé par simulation avant exécution. Algorithme préservé.",
  },
];

/* ============ Page ============ */
function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <Hero />
      <Arsenal />
      <HowItWorks />
      <BattleReports />
      <PricingSection />
      <FinalCta />
      <Footer />
    </div>
  );
}


function NavBar() {
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
          to="/auth"
          className="btn-hero inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold font-display uppercase tracking-wider"
        >
          Accéder <ArrowRight className="h-4 w-4" />
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
        <Rocket className="relative h-4 w-4 text-white" />
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
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-32 md:pb-36">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <span className="chip-tag mb-6">COCKPIT META ADS · ÉDITION 2026</span>
          <h1 className="font-display font-bold uppercase text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
            L'ARSENAL
            <br />
            <span className="text-gradient-primary">DÉCISIONNEL.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Six piliers technologiques conçus pour réconcilier vos données, valider vos actifs et simuler votre scale avec une précision chirurgicale.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="btn-hero inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold font-display uppercase tracking-widest"
            >
              Accéder au cockpit <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#arsenal"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold font-display uppercase tracking-widest text-foreground border border-border-strong hover:bg-surface transition"
            >
              Voir l'arsenal
            </a>
          </div>
        </motion.div>

        {/* KPI tickers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Ticker label="ROAS moyen scalé" value={<Counter to={4.48} decimals={2} suffix="×" />} accent="var(--color-success)" />
          <Ticker label="Profit récupéré" value={<Counter to={4150} prefix="+" suffix=" €" />} accent="var(--color-warning)" />
          <Ticker label="CTR débloqué" value={<Counter to={3.2} decimals={2} suffix="%" />} accent="var(--color-primary)" />
          <Ticker label="Précision modèle" value={<Counter to={98} suffix="%" />} accent="var(--color-success)" />
        </motion.div>
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
          <span className="chip-tag mb-4">ARSENAL · SIX PILIERS</span>
          <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
            Six modules. <span className="text-gradient-primary">Une discipline.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Chaque module est un instrument de précision. Ensemble, ils forment l'infrastructure décisionnelle du top 1%.
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
          <span className="chip-tag mb-4">RAPPORTS DE BATAILLE</span>
          <h2 className="font-display font-bold uppercase text-4xl md:text-5xl">
            Données réelles. <span className="text-gradient-primary">Verdicts définitifs.</span>
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
              Accéder au cockpit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <Logo />
        <div className="font-mono uppercase tracking-widest">© 2026 ADSPILOT PRO — ALL SYSTEMS NOMINAL</div>
      </div>
    </footer>
  );
}
