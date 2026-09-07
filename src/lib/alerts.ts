// Moteur d'alertes proactives : compare la semaine en cours à la précédente
// et détecte les signaux de dégradation d'un compte Meta Ads.

export type AlertSeverity = "critical" | "warning" | "info" | "good";

export interface PerfAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  action: string;
}

export interface AlertMetricsSnapshot {
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpm: number;
  frequency: number;
  purchases: number;
  leads: number;
  costPerLead: number;
  isLeadGen: boolean;
  hookRate: number;
  abandonRate: number;
  impressions: number;
}

const pct = (curr: number, prev: number) => (prev > 0 ? ((curr - prev) / prev) * 100 : 0);
const fr = (n: number, s = "") =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)}${s}`;

export function buildAlerts(
  current: AlertMetricsSnapshot,
  previous: AlertMetricsSnapshot,
): PerfAlert[] {
  const alerts: PerfAlert[] = [];
  const c = current;
  const p = previous;

  if (c.spend <= 0 && p.spend <= 0) {
    return [
      {
        id: "inactive",
        severity: "info",
        title: "Aucune diffusion sur les 14 derniers jours",
        detail: "Aucune dépense publicitaire détectée sur votre compte.",
        action:
          "Relancez une campagne ou utilisez le simulateur pour définir un budget de départ avant de rediffuser.",
      },
    ];
  }

  if (c.spend <= 0 && p.spend > 0) {
    alerts.push({
      id: "stopped",
      severity: "warning",
      title: "Diffusion arrêtée cette semaine",
      detail: `Vous aviez dépensé ${fr(p.spend, " €")} la semaine précédente, 0 € cette semaine.`,
      action: "Vérifiez le statut de vos campagnes (budget épuisé, rejet, ou mise en pause).",
    });
    return alerts;
  }

  const spendDelta = pct(c.spend, p.spend);
  const costLabel = c.isLeadGen ? "coût par lead" : "CPA";
  const cost = c.isLeadGen ? c.costPerLead : c.cpa;
  const prevCost = p.isLeadGen ? p.costPerLead : p.cpa;

  // Rentabilité e-commerce
  if (!c.isLeadGen && c.spend > 0) {
    if (c.roas > 0 && c.roas < 1) {
      alerts.push({
        id: "roas-under-1",
        severity: "critical",
        title: "Vous perdez de l'argent",
        detail: `ROAS de ${fr(c.roas, "×")} : ${fr(c.spend, " €")} dépensés pour ${fr(c.revenue, " €")} générés.`,
        action:
          "Coupez les audiences/créas sous 1×, puis lancez un diagnostic Andromeda pour identifier le maillon faible.",
      });
    } else if (p.roas > 0 && pct(c.roas, p.roas) <= -20) {
      alerts.push({
        id: "roas-drop",
        severity: "warning",
        title: `ROAS en baisse de ${fr(Math.abs(pct(c.roas, p.roas)), " %")}`,
        detail: `${fr(p.roas, "×")} la semaine passée → ${fr(c.roas, "×")} cette semaine.`,
        action: "Comparez vos créas actives : la baisse vient souvent d'une créa gagnante saturée.",
      });
    } else if (c.roas >= 2 && pct(c.roas, p.roas) >= 15) {
      alerts.push({
        id: "roas-up",
        severity: "good",
        title: `ROAS en hausse de ${fr(pct(c.roas, p.roas), " %")}`,
        detail: `${fr(c.roas, "×")} cette semaine contre ${fr(p.roas, "×")} la précédente.`,
        action: "Moment idéal pour augmenter le budget de 20 % max par palier de 48 h.",
      });
    }
  }

  // Coût d'acquisition
  if (cost > 0 && prevCost > 0 && pct(cost, prevCost) >= 20) {
    alerts.push({
      id: "cost-up",
      severity: "warning",
      title: `${costLabel} en hausse de ${fr(pct(cost, prevCost), " %")}`,
      detail: `${fr(prevCost, " €")} → ${fr(cost, " €")}.`,
      action: "Vérifiez la fréquence et le CPM : une audience saturée fait monter le coût mécaniquement.",
    });
  }

  // Fatigue publicitaire
  if (c.frequency >= 4) {
    alerts.push({
      id: "frequency-critical",
      severity: "critical",
      title: "Audience saturée",
      detail: `Fréquence de ${fr(c.frequency)} expositions par personne sur 7 jours.`,
      action: "Renouvelez vos créas et élargissez l'audience — au-delà de 4, le coût grimpe sans volume en plus.",
    });
  } else if (c.frequency >= 3) {
    alerts.push({
      id: "frequency-warning",
      severity: "warning",
      title: "Fatigue publicitaire proche",
      detail: `Fréquence de ${fr(c.frequency)} sur 7 jours.`,
      action: "Préparez 2 à 3 nouvelles créas pour éviter la chute de performance de la semaine prochaine.",
    });
  }

  // Attention / créa
  if (c.impressions > 1000 && c.ctr > 0 && c.ctr < 1) {
    alerts.push({
      id: "ctr-low",
      severity: "warning",
      title: "CTR sous le seuil sain",
      detail: `${fr(c.ctr, " %")} de clics (repère : 1 % et plus).`,
      action: "Le problème est en amont : accroche visuelle et première seconde de la vidéo.",
    });
  }
  if (c.impressions > 1000 && c.hookRate > 0 && c.hookRate < 20) {
    alerts.push({
      id: "hook-low",
      severity: "info",
      title: "Accroche vidéo faible",
      detail: `Hook rate de ${fr(c.hookRate, " %")} : peu de personnes dépassent les 3 premières secondes.`,
      action: "Testez une ouverture différente (problème client dès la 1ʳᵉ seconde, texte incrusté fort).",
    });
  }

  // Coût média
  if (p.cpm > 0 && pct(c.cpm, p.cpm) >= 25) {
    alerts.push({
      id: "cpm-up",
      severity: "info",
      title: `CPM en hausse de ${fr(pct(c.cpm, p.cpm), " %")}`,
      detail: `${fr(p.cpm, " €")} → ${fr(c.cpm, " €")} pour mille impressions.`,
      action: "Enchères plus chères : vérifiez la période (soldes, fêtes) et n'augmentez pas le budget brutalement.",
    });
  }

  // Tunnel e-commerce
  if (!c.isLeadGen && c.abandonRate >= 80 && c.purchases > 0) {
    alerts.push({
      id: "abandon-high",
      severity: "warning",
      title: "Trop d'abandons de panier",
      detail: `${fr(c.abandonRate, " %")} des paniers ne se transforment pas en achat.`,
      action: "Le blocage est sur la page produit ou le checkout, pas sur la pub : testez frais de port et réassurance.",
    });
  }

  // Scaling trop rapide
  if (spendDelta >= 50 && (c.isLeadGen ? c.leads <= p.leads : c.purchases <= p.purchases)) {
    alerts.push({
      id: "scale-inefficient",
      severity: "warning",
      title: "Budget augmenté sans résultat supplémentaire",
      detail: `Dépense +${fr(spendDelta, " %")} pour ${c.isLeadGen ? `${fr(c.leads)} leads` : `${fr(c.purchases)} achats`} (contre ${
        c.isLeadGen ? fr(p.leads) : fr(p.purchases)
      } avant).`,
      action: "Revenez au budget précédent pendant 3 jours, puis remontez par paliers de 20 %.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "stable",
      severity: "good",
      title: "Compte stable cette semaine",
      detail: "Aucun signal de dégradation détecté sur vos indicateurs clés.",
      action: "Bon moment pour tester une nouvelle créa ou une nouvelle audience sans risque.",
    });
  }

  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, good: 3 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
