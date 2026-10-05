// Lancer : node --experimental-strip-types --test src/lib/profit-engine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakevenRoas,
  breakevenCpa,
  ltv12,
  netProfit,
  profitabilityScore,
  ltvScore,
  roasVerdict,
} from "./profit-engine.ts";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("ROAS de rentabilité = 1 / marge", () => {
  close(breakevenRoas(40), 2.5);
  close(breakevenRoas(85), 1 / 0.85);
  close(breakevenRoas(100), 1);
  assert.equal(breakevenRoas(0), Number.POSITIVE_INFINITY);
});

test("le seuil dépend de la marge (plus de 35 % codé en dur)", () => {
  assert.notEqual(breakevenRoas(40), breakevenRoas(85));
});

test("CPA point mort = panier × marge", () => {
  close(breakevenCpa(100, 40), 40);
  close(breakevenCpa(-5, 40), 0);
});

test("LTV 12 mois : CA et marge par client", () => {
  const r = ltv12(60, 2, 50);
  close(r.revenue, 120);
  close(r.margin, 60);
  // fréquence < 1 ramenée à 1 (un client a au moins passé 1 commande)
  close(ltv12(60, 0.2, 50).revenue, 60);
});

test("profit net", () => {
  // 1000 € de CA à 40 % de marge = 400 € ; 300 € de pub => +100 €
  close(netProfit(300, 1000, 40), 100);
  close(netProfit(500, 1000, 40), -100);
});

test("score de rentabilité : ~67 au point mort, 100 à 1,5× le point mort", () => {
  close(profitabilityScore(2.5, 40), (1 / 1.5) * 100);
  close(profitabilityScore(2.5 * 1.5, 40), 100);
  close(profitabilityScore(0, 40), 0);
  close(profitabilityScore(10, 40), 100);
});

test("score LTV : ratio 3:1 = 100", () => {
  close(ltvScore(90, 30), 100);
  close(ltvScore(45, 30), 50);
  assert.equal(ltvScore(90, 0), 0);
});

test("verdict ROAS", () => {
  assert.equal(roasVerdict(1.5, 40), "loss");
  assert.equal(roasVerdict(2.5, 40), "breakeven");
  assert.equal(roasVerdict(3.0, 40), "profitable");
  assert.equal(roasVerdict(4.0, 40), "strong");
  assert.equal(roasVerdict(0, 40), "loss");
});
