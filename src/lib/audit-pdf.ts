import { jsPDF } from "jspdf";
import type { AuditDiagnostic } from "@/lib/audit-ai.functions";

const PURPLE: [number, number, number] = [108, 99, 255];
const DARK: [number, number, number] = [20, 20, 30];
const GREY: [number, number, number] = [110, 110, 120];
const LIGHT: [number, number, number] = [235, 235, 245];
const GREEN: [number, number, number] = [40, 170, 90];
const ORANGE: [number, number, number] = [235, 150, 40];
const RED: [number, number, number] = [220, 60, 70];

export interface AuditPdfModule {
  id: string;
  label: string;
  score: number;
  diagnostic: AuditDiagnostic | null;
}

export interface AuditPdfMetric {
  label: string;
  value: string;
  bar?: { pct: number; tone: "green" | "orange" | "red" };
}

export interface AuditPdfData {
  clientName: string;
  sectorLabel: string;
  globalScore: number;
  metrics: AuditPdfMetric[];
  modules: AuditPdfModule[];
  currentModule: AuditPdfModule;
}

function badgeTone(score: number): { color: [number, number, number]; label: string } {
  if (score >= 70) return { color: GREEN, label: "NOMINAL" };
  if (score >= 45) return { color: ORANGE, label: "VIGILANCE" };
  return { color: RED, label: "CRITIQUE" };
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

function drawLogo(doc: jsPDF, x: number, y: number) {
  // Simple logo mark + wordmark
  setFill(doc, PURPLE);
  doc.roundedRect(x, y - 5, 7, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, [255, 255, 255]);
  doc.text("A", x + 3.5, y + 0.2, { align: "center", baseline: "middle" });
  setText(doc, DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ADSPILOT", x + 10, y - 1.5);
  setText(doc, PURPLE);
  doc.text("PRO", x + 10 + doc.getTextWidth("ADSPILOT "), y - 1.5);
}

function drawHeader(doc: jsPDF) {
  drawLogo(doc, 15, 12);
  setDraw(doc, LIGHT);
  doc.setLineWidth(0.3);
  doc.line(15, 18, 195, 18);
}

function drawFooter(doc: jsPDF, pageNum: number, total: number) {
  setText(doc, GREY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Généré par AdsPilot Pro — adspilotpro.com", 15, 287);
  doc.text(`${pageNum} / ${total}`, 195, 287, { align: "right" });
}

function wrap(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "—", maxWidth) as string[];
}

function drawCoverPage(doc: jsPDF, data: AuditPdfData) {
  drawHeader(doc);

  // Title
  setText(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, PURPLE);
  doc.text("RAPPORT D'AUDIT", 105, 50, { align: "center" });
  doc.setFontSize(28);
  setText(doc, DARK);
  doc.text("META ADS", 105, 62, { align: "center" });

  // Accent bar
  setFill(doc, PURPLE);
  doc.rect(85, 68, 40, 1.2, "F");

  // Client block
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setText(doc, GREY);
  doc.text("CLIENT", 105, 88, { align: "center" });
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setText(doc, DARK);
  doc.text(data.clientName || "—", 105, 96, { align: "center" });

  // Meta info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setText(doc, GREY);
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Date · ${dateStr}`, 105, 106, { align: "center" });
  doc.text(`Secteur · ${data.sectorLabel}`, 105, 112, { align: "center" });

  // Global score card
  const tone = badgeTone(data.globalScore);
  const cardX = 55;
  const cardY = 135;
  const cardW = 100;
  const cardH = 80;
  setFill(doc, [250, 250, 253]);
  setDraw(doc, LIGHT);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "FD");

  setText(doc, GREY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SCORE GLOBAL", 105, cardY + 12, { align: "center" });

  // Score number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(56);
  setText(doc, tone.color);
  doc.text(`${Math.round(data.globalScore)}`, 105, cardY + 50, { align: "center" });
  doc.setFontSize(16);
  setText(doc, GREY);
  doc.text("/100", 105, cardY + 60, { align: "center" });

  // Badge
  const badgeW = 50;
  const badgeX = 105 - badgeW / 2;
  const badgeY = cardY + cardH - 16;
  setFill(doc, tone.color);
  doc.roundedRect(badgeX, badgeY, badgeW, 9, 4.5, 4.5, "F");
  setText(doc, [255, 255, 255]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(tone.label, 105, badgeY + 6, { align: "center" });

  // Tagline
  setText(doc, GREY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Diagnostic IA propulsé par Claude Sonnet", 105, 235, { align: "center" });
}

function drawScoreBadge(doc: jsPDF, x: number, y: number, score: number) {
  const tone = badgeTone(score);
  setFill(doc, tone.color);
  doc.roundedRect(x, y - 4, 18, 6, 1.5, 1.5, "F");
  setText(doc, [255, 255, 255]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(score)}/100`, x + 9, y, { align: "center" });
}

function drawMetricsPage(doc: jsPDF, data: AuditPdfData) {
  drawHeader(doc);

  setText(doc, PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MÉTRIQUES & PERFORMANCE", 15, 32);

  // Metrics table
  let y = 44;
  setText(doc, GREY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("KPI", 17, y);
  doc.text("VALEUR", 110, y);
  doc.text("PERFORMANCE", 145, y);
  y += 3;
  setDraw(doc, LIGHT);
  doc.line(15, y, 195, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  for (const m of data.metrics) {
    setText(doc, DARK);
    doc.setFontSize(9);
    const lines = wrap(doc, m.label, 88);
    doc.text(lines[0], 17, y);
    doc.setFont("helvetica", "bold");
    doc.text(m.value, 110, y);
    doc.setFont("helvetica", "normal");
    if (m.bar) {
      const barX = 145;
      const barY = y - 3;
      const barW = 48;
      setFill(doc, LIGHT);
      doc.roundedRect(barX, barY, barW, 3, 1.5, 1.5, "F");
      const color =
        m.bar.tone === "green" ? GREEN : m.bar.tone === "orange" ? ORANGE : RED;
      setFill(doc, color);
      const w = Math.max(0.5, Math.min(barW, (barW * m.bar.pct) / 100));
      doc.roundedRect(barX, barY, w, 3, 1.5, 1.5, "F");
    }
    y += 8;
    if (y > 200) break;
  }

  // Score par module
  y = Math.max(y, 210);
  setText(doc, PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SCORE PAR MODULE", 15, y);
  y += 8;

  for (const mod of data.modules) {
    setText(doc, DARK);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(mod.label, 17, y);
    drawScoreBadge(doc, 175, y, mod.score);
    // bar
    const barY = y + 2;
    setFill(doc, LIGHT);
    doc.roundedRect(17, barY, 150, 2.5, 1, 1, "F");
    const tone = badgeTone(mod.score);
    setFill(doc, tone.color);
    const w = Math.max(0.5, (150 * Math.max(0, Math.min(100, mod.score))) / 100);
    doc.roundedRect(17, barY, w, 2.5, 1, 1, "F");
    y += 11;
  }
}

function drawDiagSection(
  doc: jsPDF,
  y: number,
  title: string,
  body: string,
  color: [number, number, number],
): number {
  const maxW = 175;
  const lines = wrap(doc, body, maxW - 8);
  const blockH = 10 + lines.length * 4.5 + 4;

  setFill(doc, [250, 250, 253]);
  setDraw(doc, color);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, maxW, blockH, 2, 2, "FD");
  // left accent
  setFill(doc, color);
  doc.rect(15, y, 1.5, blockH, "F");

  setText(doc, color);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, 21, y + 6);

  setText(doc, DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(lines, 21, y + 12);

  return y + blockH + 5;
}

function drawDiagnosticPage(doc: jsPDF, data: AuditPdfData) {
  drawHeader(doc);
  setText(doc, PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`DIAGNOSTIC IA — ${data.currentModule.label.toUpperCase()}`, 15, 32);

  const diag = data.currentModule.diagnostic;
  if (!diag) {
    setText(doc, GREY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Aucun diagnostic IA généré pour ce module.", 15, 50);
    return;
  }

  let y = 42;
  y = drawDiagSection(doc, y, "DIAGNOSTIC PRINCIPAL", diag.diagnostic_principal, PURPLE);
  y = drawDiagSection(doc, y, "PROBLÈME CRITIQUE", diag.probleme_critique, RED);
  y = drawDiagSection(doc, y, "ACTION IMMÉDIATE — CETTE SEMAINE", diag.action_immediate, ORANGE);
  y = drawDiagSection(doc, y, "OBJECTIF 30 JOURS", diag.action_30_jours, GREEN);
  y = drawDiagSection(doc, y, "ALERTE SI STATU QUO", diag.alerte, RED);
}

function drawRecommendationsPage(doc: jsPDF, data: AuditPdfData) {
  drawHeader(doc);
  setText(doc, PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RECOMMANDATIONS DÉTAILLÉES", 15, 32);

  setText(doc, GREY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Synthèse multi-modules — actions priorisées par Claude.", 15, 39);

  let y = 50;
  for (const mod of data.modules) {
    if (!mod.diagnostic) continue;
    if (y > 250) {
      doc.addPage();
      drawHeader(doc);
      y = 32;
    }
    setText(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(mod.label.toUpperCase(), 15, y);
    drawScoreBadge(doc, 175, y - 2, mod.score);
    y += 6;

    const blocks: { label: string; body: string; color: [number, number, number] }[] = [
      { label: "Action immédiate", body: mod.diagnostic.action_immediate, color: ORANGE },
      { label: "Objectif 30 jours", body: mod.diagnostic.action_30_jours, color: GREEN },
    ];
    for (const b of blocks) {
      const lines = wrap(doc, b.body, 167);
      setText(doc, b.color);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(b.label.toUpperCase(), 17, y);
      y += 4.5;
      setText(doc, DARK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(lines, 17, y);
      y += lines.length * 4.5 + 4;
      if (y > 265) {
        doc.addPage();
        drawHeader(doc);
        y = 32;
      }
    }
    setDraw(doc, LIGHT);
    doc.line(15, y, 195, y);
    y += 8;
  }
}

export function generateAuditPdf(data: AuditPdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawCoverPage(doc, data);
  doc.addPage();
  drawMetricsPage(doc, data);
  doc.addPage();
  drawDiagnosticPage(doc, data);
  doc.addPage();
  drawRecommendationsPage(doc, data);

  // Footers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  return doc;
}

export function downloadAuditPdf(data: AuditPdfData) {
  const doc = generateAuditPdf(data);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  doc.save(`audit-adspilot-${stamp}.pdf`);
}
