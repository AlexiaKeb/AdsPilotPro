// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { runLeakScan, scoreEntity, significantSpend, type EntityInsight } from "./leak-scan.ts";

const ent = (o: Partial<EntityInsight> & { id: string }): EntityInsight => ({
  name: o.id,
  level: "campaign",
  spend: 0,
  impressions: 10000,
  clicks: 200,
  purchases: 0,
  revenue: 0,
  frequency: 1.5,
  ctr: 1.5,
  ...o,
});

// marge 40 % => ROAS de rentabilité 2,5
const MARGIN = 40;

test("dépense insuffisante => watch", () => {
  const r = scoreEntity(ent({ id: "a", spend: 10 }), MARGIN, 50);
  assert.equal(r.verdict, "watch");
  assert.equal(r.leak, 0);
});

test("dépense significative sans vente => kill, perte = dépense", () => {
  const r = scoreEntity(ent({ id: "a", spend: 120 }), MARGIN, 50);
  assert.equal(r.verdict, "kill");
  assert.equal(r.leak, 120);
});

test("ROAS 1,2 avec seuil 2,5 => kill, perte = dépense − marge", () => {
  // 1000 € dépensés, 1200 € de CA, marge 40 % => 480 € de marge => −520 €
  const r = scoreEntity(ent({ id: "a", spend: 1000, revenue: 1200, purchases: 20 }), MARGIN, 50);
  assert.equal(r.verdict, "kill");
  assert.equal(r.leak, 520);
});

test("ROAS 2,2 (entre 0,7 et 0,95 du seuil) => fix", () => {
  const r = scoreEntity(ent({ id: "a", spend: 1000, revenue: 2200, purchases: 30 }), MARGIN, 50);
  assert.equal(r.verdict, "fix");
  assert.equal(r.leak, 120); // 880 − 1000
});

test("ROAS 2,6 => keep (juste au-dessus du seuil)", () => {
  const r = scoreEntity(ent({ id: "a", spend: 1000, revenue: 2600, purchases: 30 }), MARGIN, 50);
  assert.equal(r.verdict, "keep");
  assert.equal(r.leak, 0);
});

test("ROAS 4 avec volume et fréquence saine => scale", () => {
  const r = scoreEntity(ent({ id: "a", spend: 1000, revenue: 4000, purchases: 40, frequency: 1.8 }), MARGIN, 50);
  assert.equal(r.verdict, "scale");
});

test("ROAS 4 mais fréquence 3 => keep (renouveler les créas)", () => {
  const r = scoreEntity(ent({ id: "a", spend: 1000, revenue: 4000, purchases: 40, frequency: 3 }), MARGIN, 50);
  assert.equal(r.verdict, "keep");
});

test("ROAS 4 mais < 5 ventes => pas de scale (échantillon trop faible)", () => {
  const r = scoreEntity(ent({ id: "a", spend: 100, revenue: 400, purchases: 3 }), MARGIN, 50);
  assert.equal(r.verdict, "keep");
});

test("dépense significative = 2× CPA max, plancher 25 €", () => {
  assert.equal(significantSpend(100, 40), 80);
  assert.equal(significantSpend(20, 40), 25);
  assert.equal(significantSpend(0, 40), 40);
});

test("scan complet : totaux, perte mensualisée, actions triées par impact", () => {
  const res = runLeakScan({
    marginPct: MARGIN,
    periodDays: 30,
    campaigns: [
      ent({ id: "c1", name: "Prospection", spend: 1000, revenue: 1200, purchases: 20 }), // perte 520
      ent({ id: "c2", name: "Retargeting", spend: 500, revenue: 2500, purchases: 40, frequency: 1.6 }), // scale
      ent({ id: "c3", name: "Test", spend: 200, revenue: 0, purchases: 0 }), // perte 200
    ],
    ads: [],
  });
  assert.equal(res.mode, "ok");
  assert.equal(res.totals.spend, 1700);
  assert.equal(res.totals.revenue, 3700);
  // profit = 3700 × 0,4 − 1700 = −220
  assert.equal(res.totals.profit, -220);
  assert.equal(res.totals.leak, 720);
  assert.equal(res.totals.leakMonthly, 720);
  assert.equal(res.counts.kill, 2);
  assert.equal(res.counts.scale, 1);
  assert.equal(res.actions[0]?.entityId, "c1");
});

test("la perte est mensualisée sur 7 jours", () => {
  const res = runLeakScan({
    marginPct: MARGIN,
    periodDays: 7,
    campaigns: [ent({ id: "c1", spend: 700, revenue: 840, purchases: 14 })], // perte 364 sur 7 j
    ads: [],
  });
  assert.equal(res.totals.leak, 364);
  assert.equal(res.totals.leakMonthly, Math.round(364 * (30 / 7) * 100) / 100);
});

test("aucun revenu suivi => mode no_revenue, aucune action", () => {
  const res = runLeakScan({
    marginPct: MARGIN,
    periodDays: 30,
    campaigns: [ent({ id: "c1", spend: 500 })],
    ads: [],
  });
  assert.equal(res.mode, "no_revenue");
  assert.equal(res.actions.length, 0);
});

test("pas de dépense => mode no_spend", () => {
  const res = runLeakScan({ marginPct: MARGIN, periodDays: 30, campaigns: [], ads: [] });
  assert.equal(res.mode, "no_spend");
});

test("une pub d'une campagne déjà à couper ne double pas l'économie", () => {
  const res = runLeakScan({
    marginPct: MARGIN,
    periodDays: 30,
    campaigns: [ent({ id: "c1", name: "Mauvaise", spend: 1000, revenue: 1200, purchases: 20 })],
    ads: [ent({ id: "a1", name: "Pub 1", level: "ad", campaignName: "Mauvaise", spend: 600, revenue: 600, purchases: 8 })],
  });
  assert.equal(res.actions.length, 1);
  assert.equal(res.actions[0]?.level, "campaign");
});
