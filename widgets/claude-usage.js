// claude-usage.js
// Claude rate-limit widget for Scriptable
// Reads from claude-usage-bridge over Tailscale

const BRIDGE = "http://100.118.247.69:9753/usage";

const C = {
  bg:    new Color("#1A1610"),
  text:  new Color("#D4B896"),
  dim:   new Color("#6B5540"),
  green: new Color("#7A9E7A"),
  amber: new Color("#C8A040"),
  red:   new Color("#9E5A5A"),
  plan:  new Color("#2C2416"),
};

function barColor(frac) {
  if (frac >= 0.9) return C.red;
  if (frac >= 0.7) return C.amber;
  return C.green;
}

function drawBar(parent, label, frac) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const LEN = 14;
  const filled = frac >= 0 ? Math.round(frac * LEN) : 0;
  const barStr = "█".repeat(filled) + "░".repeat(LEN - filled);
  const barTxt = row.addText(barStr);
  barTxt.font = Font.monospacedSystemFont(9);
  barTxt.textColor = frac >= 0 ? barColor(frac) : C.dim;

  row.addSpacer(6);

  const pctStr = frac >= 0 ? `${Math.round(frac * 100)}%` : "—";
  const pct = row.addText(pctStr.padStart(4));
  pct.font = Font.monospacedSystemFont(9);
  pct.textColor = frac >= 0 ? barColor(frac) : C.dim;

  row.addSpacer(6);

  const lbl = row.addText(label);
  lbl.font = Font.boldSystemFont(8);
  lbl.textColor = C.dim;
}

function fmtTokens(n) {
  if (!n || n < 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tokens`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k tokens`;
  return `${n} tokens`;
}

function fmtPlan(s) {
  if (!s) return null;
  const n = s.toLowerCase().replace(/^claude_/, "");
  if (n.startsWith("max")) return "MAX";
  if (n === "pro") return "PRO";
  return n.toUpperCase();
}

// Fetch
let data = null;
try {
  const req = new Request(BRIDGE);
  req.timeoutInterval = 5;
  data = await req.loadJSON();
} catch (_) {}

const w = new ListWidget();
w.backgroundColor = C.bg;
w.setPadding(14, 16, 12, 16);

// Header
const header = w.addStack();
header.layoutHorizontally();
header.centerAlignContent();
const title = header.addText("CLAUDE");
title.font = Font.boldSystemFont(11);
title.textColor = C.dim;
header.addSpacer();
const plan = data && !data.error ? fmtPlan(data.plan_type) : null;
if (plan) {
  const badge = header.addStack();
  badge.backgroundColor = C.plan;
  badge.cornerRadius = 4;
  badge.setPadding(2, 7, 2, 7);
  const planTxt = badge.addText(plan);
  planTxt.font = Font.boldSystemFont(9);
  planTxt.textColor = C.dim;
}

w.addSpacer(10);

if (!data || data.error) {
  const msg = w.addText(data?.error ?? "Desktop unreachable");
  msg.font = Font.systemFont(11);
  msg.textColor = C.dim;
  w.addSpacer();
} else {
  drawBar(w, "5 HR", data.pct_5h ?? -1);
  w.addSpacer(7);
  drawBar(w, "7 DAY", data.pct_7d ?? -1);

  const tok = fmtTokens(data.tokens_today);
  if (tok) {
    w.addSpacer(9);
    const tokRow = w.addStack();
    tokRow.layoutHorizontally();
    tokRow.addSpacer();
    const tokTxt = tokRow.addText(`${tok} today`);
    tokTxt.font = Font.systemFont(10);
    tokTxt.textColor = C.dim;
    tokRow.addSpacer();
  }

  w.addSpacer();
}

Script.setWidget(w);
Script.complete();
w.presentMedium();
