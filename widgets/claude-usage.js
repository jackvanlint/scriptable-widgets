// claude-usage.js
// Claude rate-limit widget for Scriptable
// Reads from claude-usage-bridge over Tailscale

const BRIDGE = "http://100.118.247.69:9753/usage";

const C = {
  bg:     new Color("#1A1610"),
  dim:    new Color("#6B5540"),
  dimmer: new Color("#3A2E22"),
  green:  new Color("#7A9E7A"),
  amber:  new Color("#C8A040"),
  red:    new Color("#9E5A5A"),
  track:  new Color("#2C2416"),
};

function barColor(frac) {
  if (frac >= 0.9) return C.red;
  if (frac >= 0.7) return C.amber;
  return C.green;
}

function makeBar(frac, color) {
  const W = 190, H = 8, R = 3;
  const ctx = new DrawContext();
  ctx.size = new Size(W, H);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, W, H), R, R);
  ctx.addPath(track);
  ctx.setFillColor(C.track);
  ctx.fillPath();

  if (frac > 0) {
    const fillW = Math.max(R * 2, Math.round(W * frac));
    const fill = new Path();
    fill.addRoundedRect(new Rect(0, 0, fillW, H), R, R);
    ctx.addPath(fill);
    ctx.setFillColor(color);
    ctx.fillPath();
  }

  return ctx.getImage();
}

function fmtTokens(n) {
  if (!n || n < 0) return null;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(n);
}

function fmtPlan(s) {
  if (!s) return null;
  const n = s.toLowerCase().replace(/^claude_/, "");
  if (n.startsWith("max")) return "MAX";
  if (n === "pro") return "PRO";
  return n.toUpperCase();
}

function addBar(parent, label, frac) {
  const color = frac >= 0 ? barColor(frac) : C.dimmer;
  const pctStr = frac >= 0 ? Math.round(frac * 100) + "%" : "—";

  const lbl = parent.addText(label);
  lbl.font = Font.boldSystemFont(9);
  lbl.textColor = C.dim;

  parent.addSpacer(5);

  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const bar = row.addImage(makeBar(Math.max(0, frac), color));
  bar.resizable = false;

  row.addSpacer(8);

  const pct = row.addText(pctStr);
  pct.font = Font.boldSystemFont(14);
  pct.textColor = color;
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
w.setPadding(14, 16, 14, 16);

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
  const badgeTxt = header.addText(plan);
  badgeTxt.font = Font.boldSystemFont(9);
  badgeTxt.textColor = C.dim;
}

w.addSpacer(10);

if (!data || data.error) {
  const msg = w.addText(data && data.error ? data.error : "Desktop unreachable");
  msg.font = Font.systemFont(11);
  msg.textColor = C.dim;
  w.addSpacer();
} else {
  addBar(w, "5 HR", data.pct_5h != null ? data.pct_5h : -1);
  w.addSpacer(9);
  addBar(w, "7 DAY", data.pct_7d != null ? data.pct_7d : -1);

  const tok = fmtTokens(data.tokens_today);
  if (tok) {
    w.addSpacer(9);
    const tokRow = w.addStack();
    tokRow.layoutHorizontally();
    tokRow.addSpacer();
    const tokTxt = tokRow.addText(tok + " tokens today");
    tokTxt.font = Font.systemFont(10);
    tokTxt.textColor = C.dim;
    tokRow.addSpacer();
  }
}

w.addSpacer();
Script.setWidget(w);
Script.complete();
w.presentMedium();
