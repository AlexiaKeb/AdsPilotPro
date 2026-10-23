import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Code2,
  Compass,
  Megaphone,
  Rocket,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/alexia")({
  head: () => ({
    meta: [
      { title: "Alexia Kebir — Experte Meta Ads & AI SaaS Founder" },
      {
        name: "description",
        content:
          "Je maîtrise la pub Meta depuis 2017 et je construis aujourd'hui des produits SaaS avec l'IA. Audit Meta Ads, vibe coding, build in public.",
      },
      { property: "og:title", content: "Alexia Kebir — Meta Ads × AI SaaS Founder" },
      {
        property: "og:description",
        content: "Publicité Meta, produits IA et business en ligne : je les construis, je les teste, je te montre comment.",
      },
    ],
  }),
  component: AlexiaSite,
});

/* ============ Contenu (à affiner ensemble) ============ */
const BOOKING_URL = "#contact"; // TODO: remplacer par ton lien Calendly / Cal.com

const pillars = [
  {
    icon: Megaphone,
    tag: "01 · Expertise",
    title: "Meta Ads",
    text: "Structure de compte, créas, tracking, scaling. Ce qui rapporte vraiment du cash, pas des métriques de vanité.",
  },
  {
    icon: Bot,
    tag: "02 · Nouveau terrain",
    title: "IA & automatisation",
    text: "Des agents et workflows IA qui analysent tes campagnes, produisent tes créas et te font gagner des heures chaque semaine.",
  },
  {
    icon: Code2,
    tag: "03 · Je construis",
    title: "SaaS & vibe coding",
    text: "De l'idée à l'app en ligne en quelques jours, sans équipe tech. Je construis en public, tu vois tout, y compris les ratés.",
  },
];

const offers = [
  {
    icon: Compass,
    name: "Mentoring",
    price: "Marketing digital · 1-to-1",
    text: "Un accompagnement personnalisé pour faire grandir ton entreprise : stratégie, pub, offre et systèmes, avec l'IA comme levier.",
    cta: "Candidater",
    featured: true,
  },
  {
    icon: Megaphone,
    name: "Formation Social Ads",
    price: "Facebook · Instagram · TikTok",
    text: "Apprends à créer des publicités rentables, étape par étape, même sans expérience, pour vendre produits et services.",
    cta: "Découvrir la formation",
  },
  {
    icon: Target,
    name: "Workshop en présentiel",
    price: "1 à 2 jours",
    text: "Une immersion pour poser ta stratégie publicitaire, lancer tes campagnes et repartir avec un plan d'action concret.",
    cta: "Voir les dates",
  },
  {
    icon: Wrench,
    name: "Sprint Vibe Coding",
    price: "Nouveau",
    text: "On lance ton premier outil ou micro-SaaS ensemble avec l'IA. Tu repars avec un produit en ligne, pas un PDF.",
    cta: "Réserver ma place",
  },
];

const steps = [
  { n: "01", t: "Clarifier", d: "Offre, cible, promesse. Un business qui tient sur une phrase." },
  { n: "02", t: "Construire", d: "Site, tunnel, outil. Avec l'IA, un prototype tient en jours." },
  { n: "03", t: "Acquérir", d: "Meta Ads pilotées par la data pour valider puis scaler." },
  { n: "04", t: "Automatiser", d: "Agents IA et workflows pour que ça tourne sans toi H24." },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

function AlexiaSite() {
  return (
    <div className="min-h-screen bg-[#0A0B14] text-white selection:bg-[#6C63FF]/40">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0B14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" className="font-display text-lg font-bold tracking-tight">
            Alexia<span className="text-[#6C63FF]">.</span>Kebir
          </a>
          <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#expertise" className="hover:text-white">Expertise</a>
            <a href="#produit" className="hover:text-white">Mon SaaS</a>
            <a href="#offres" className="hover:text-white">Offres</a>
            <a href="#methode" className="hover:text-white">Méthode</a>
          </nav>
          <a
            href={BOOKING_URL}
            className="rounded-full bg-[#6C63FF] px-4 py-2 text-sm font-medium transition hover:bg-[#5b52f0]"
          >
            Travaillons ensemble
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#6C63FF]/20 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 md:pt-32">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-white/70">
              <Sparkles className="h-3 w-3 text-[#00E5A0]" />
              Meta Ads × IA × Build in public
            </span>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              La pub Meta, c'est mon métier.{" "}
              <span className="bg-gradient-to-r from-[#6C63FF] to-[#00E5A0] bg-clip-text text-transparent">
                L'IA, mon nouvel avantage.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
              J'aide les entrepreneurs en ligne à maîtriser la publicité Facebook et Instagram depuis 2017.
              Aujourd'hui, je construis mes propres produits SaaS avec l'IA — et je t'apprends à faire
              pareil pour vendre plus, plus vite, avec moins de friction.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={BOOKING_URL}
                className="inline-flex items-center gap-2 rounded-full bg-[#6C63FF] px-6 py-3 font-medium transition hover:bg-[#5b52f0]"
              >
                Réserver un appel <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-medium text-white/85 transition hover:bg-white/5"
              >
                Voir AdsPilot Pro <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* Bandeau crédibilité — chiffres issus de l'ancien site (unités à confirmer) */}
          <motion.div
            {...fadeUp}
            className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4"
          >
            {[
              ["1 800", "Entrepreneurs suivis"],
              ["200 h", "De calls Zoom d'accompagnement"],
              ["+50 M", "De revenus générés par la pub"],
              ["+200 000", "Produits vendus dans mes boutiques"],
            ].map(([k, v]) => (
              <div key={v} className="bg-[#0A0B14] p-5">
                <div className="font-display text-2xl font-bold text-[#00E5A0] md:text-3xl">{k}</div>
                <div className="mt-1 text-xs text-white/50">{v}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Piliers */}
      <section id="expertise" className="mx-auto max-w-6xl px-5 py-20">
        <motion.div {...fadeUp}>
          <p className="font-mono text-xs uppercase tracking-widest text-[#6C63FF]">Ce que je fais</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold md:text-5xl">
            Trois terrains, une seule obsession : faire croître ton business en ligne.
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <motion.article
              key={p.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-[#12142A] p-7"
            >
              <p.icon className="h-6 w-6 text-[#6C63FF]" />
              <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-white/40">{p.tag}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{p.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Produit */}
      <section id="produit" className="mx-auto max-w-6xl px-5 py-20">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-[#6C63FF]/30 bg-gradient-to-br from-[#12142A] to-[#0A0B14] p-8 md:p-14"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#6C63FF]/25 blur-[90px]" />
          <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#00E5A0]">Mon SaaS</p>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">AdsPilot Pro</h2>
              <p className="mt-4 text-white/65 leading-relaxed">
                Le cockpit Meta Ads que j'aurais voulu avoir : simulateur de rentabilité, audit de
                campagnes assisté par IA et plan d'action. Construit par une pro de la pub, pour les
                e-commerçants et infopreneurs francophones.
              </p>
              <Link
                to="/"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#0A0B14] transition hover:bg-white/90"
              >
                Découvrir l'outil <Rocket className="h-4 w-4" />
              </Link>
            </div>
            <ul className="space-y-3 font-mono text-sm text-white/70">
              {[
                "Simulateur de rentabilité & scaling",
                "Audit de compte Meta assisté par IA",
                "Analyse de créas (vision)",
                "Plan d'action priorisé",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-[#00E5A0]">▸</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {/* Offres */}
      <section id="offres" className="mx-auto max-w-6xl px-5 py-20">
        <motion.div {...fadeUp}>
          <p className="font-mono text-xs uppercase tracking-widest text-[#6C63FF]">Travailler avec moi</p>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Choisis ton niveau d'accélération.</h2>
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {offers.map((o) => (
            <motion.div
              key={o.name}
              {...fadeUp}
              className={`flex flex-col rounded-2xl border p-7 ${
                o.featured ? "border-[#6C63FF] bg-[#6C63FF]/10" : "border-white/10 bg-[#12142A]"
              }`}
            >
              <o.icon className="h-6 w-6 text-[#00E5A0]" />
              <h3 className="mt-5 font-display text-xl font-bold">{o.name}</h3>
              <p className="mt-1 font-mono text-xs text-white/40">{o.price}</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-white/60">{o.text}</p>
              <a
                href={BOOKING_URL}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[#00E5A0]"
              >
                {o.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Méthode */}
      <section id="methode" className="mx-auto max-w-6xl px-5 py-20">
        <motion.div {...fadeUp}>
          <p className="font-mono text-xs uppercase tracking-widest text-[#6C63FF]">La méthode</p>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">De l'idée au business qui tourne.</h2>
        </motion.div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-[#0A0B14] p-7">
              <div className="font-mono text-sm text-[#00E5A0]">{s.n}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lead magnet (à brancher sur Systeme.io) */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <motion.div {...fadeUp} className="rounded-3xl border border-white/10 bg-[#12142A] p-8 md:p-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[#00E5A0]">Gratuit</p>
          <h2 className="mt-3 font-display text-2xl font-bold md:text-4xl">
            Obtiens des prospects de haute qualité avec une stratégie publicitaire simple.
          </h2>
          <form className="mt-7 flex flex-col gap-3 md:flex-row" onSubmit={(e) => e.preventDefault()}>
            <input
              placeholder="Prénom"
              className="flex-1 rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[#6C63FF]"
            />
            <input
              type="email"
              placeholder="Email"
              className="flex-1 rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm outline-none placeholder:text-white/35 focus:border-[#6C63FF]"
            />
            <button className="rounded-full bg-[#6C63FF] px-6 py-3 text-sm font-medium transition hover:bg-[#5b52f0]">
              Je le veux
            </button>
          </form>
        </motion.div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-4xl px-5 py-24 text-center">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-4xl font-bold md:text-6xl">
            Prêt(e) à lancer, scaler{" "}
            <span className="bg-gradient-to-r from-[#6C63FF] to-[#00E5A0] bg-clip-text text-transparent">
              et automatiser ?
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-white/60">
            Un appel pour faire le point sur ton projet et choisir la meilleure suite.
          </p>
          <a
            href="mailto:contact@alexiakebir.com"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#6C63FF] px-8 py-4 font-medium transition hover:bg-[#5b52f0]"
          >
            Me contacter <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 px-5 py-8 text-center text-xs text-white/35">
        © {new Date().getFullYear()} Alexia Kebir ·{" "}
        <Link to="/mentions-legales" className="hover:text-white/70">Mentions légales</Link> ·{" "}
        <Link to="/confidentialite" className="hover:text-white/70">Confidentialité</Link>
      </footer>
    </div>
  );
}
