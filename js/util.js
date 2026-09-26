/* =========================================================================
   util.js, shared constants & helpers (identity colours, timeline, modules)
   ========================================================================= */

// Distinct operative colours, all drawn from the Paradoxo palette so tokens,
// panels, and swatches stay cohesive. Assigned by seat order.
export const PALETTE = [
  "#f2a93b", // amber
  "#2fa3a3", // teal
  "#8f6fd6", // violet
  "#6fae6a", // green
  "#c2693f", // copper
  "#5b8fd6", // steel blue
];

export const CENTURY_MAX = 30;     // XXX
export const YEAR_ZERO = 0;
export const MILESTONES = [10, 20]; // X, XX
export const SECRET_MARKET = 11;    // XI

// Era bands (start, end, label, colour), §13.3
export const ERAS = [
  [1, 5, "Antiquity", "#8a6a3c"],
  [5, 10, "High M.A.", "#6f7a3c"],
  [11, 15, "Low M.A.", "#3c7a64"],
  [15, 19, "Modern", "#3c5f7a"],
  [19, 23, "Contemp.", "#5b4c8a"],
  [23, 30, "Timeless", "#7a3c63"],
];

// Matrix model (§29). row 0 Recharge / 1 Paradox / 2 Travel.
// Each module: [icon, short caption]. Icons are the SAME glyphs used everywhere
// else in the UI (energy / gold / booms) so players learn one visual language.
// Module numbers run 1..9 across the grid (row*3 + col + 1).
export const FUNCTIONS = [
  { key: "recharge", name: "Recharge", cls: "fn-recharge",
    mods: [["energy", "Energy"], ["gold", "Gold"], ["both", "Energy + Gold"]] },
  { key: "paradox", name: "Paradox", cls: "fn-paradox",
    mods: [["future", "Future"], ["paradox", "Present"], ["past", "Past"]] },
  { key: "travel", name: "Travel", cls: "fn-travel",
    mods: [["booms", "Heat"], ["travel", "Move 1×"], ["travel2", "Move 2×"]] },
];

// Roman numerals for centuries (1..30), institutional flavour.
const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX",
];
export const roman = (n) => (n === 0 ? "0" : ROMAN[n] || String(n));

// Map a century (0..30) to a horizontal percentage along the timeline rail.
export function centuryToPct(c) {
  // Year Zero sits just below I; spread 0..30 across 4%..96%.
  return 4 + (c / CENTURY_MAX) * 92;
}

export const seatColor = (index) => PALETTE[index % PALETTE.length];

// Era colour for a delivery century, used as the card border, matching the
// physical game where each return era has its own colour (colour = iconography).
export function eraColor(century) {
  for (const [a, b, , color] of ERAS) {
    if (century >= a && century <= b) return color;
  }
  return "#8a7740";
}
export function eraName(century) {
  for (const [a, b, label] of ERAS) {
    if (century >= a && century <= b) return label;
  }
  return "--";
}

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---- Escape any server-sent or player-typed text before it enters innerHTML ---- */
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/* ---- HELA COLOUR: HELA wears the colour of MY piece on the board ----------------
   One seat colour in, a family of tokens out, set on :root so every HELA surface
   (visor, phase strip, readouts, eye, captions) reads them through --vz*:
     --hela       the identity colour, lifted to glow on the dark glass
     --hela-dim   the same hue, dark, for rules and quiet labels
     --hela-hot   a pale tint of the hue for text (keeps contrast for every palette colour)
     --hela-text  a softer text tint for long italic lines
     --hela-rgb / --hela-hot-rgb  "r g b" triples for rgb(var(--x) / alpha)
   Only writes when the colour actually changes (a :root write restyles the page). */
function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  const n = m ? parseInt(m[1], 16) : 0x66f0c8;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}
export function helaTokens(hex) {
  const [h, s0] = hexToHsl(hex);
  const s = Math.max(0.55, Math.min(0.9, s0 + 0.12));
  const main = hslRgb(h, s, 0.64), dim = hslRgb(h, s * 0.8, 0.36);
  const hot = hslRgb(h, Math.min(1, s + 0.1), 0.91), text = hslRgb(h, s * 0.6, 0.84);
  const css = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
  return { hela: css(main), dim: css(dim), hot: css(hot), text: css(text),
    rgb: main.join(" "), hotRgb: hot.join(" ") };
}
let _helaHex = null;
export function setHelaColour(hex) {
  if (!hex || hex === _helaHex || typeof document === "undefined") return;
  _helaHex = hex;
  const t = helaTokens(hex), st = document.documentElement.style;
  st.setProperty("--hela-seat", hex);
  st.setProperty("--hela", t.hela);
  st.setProperty("--hela-dim", t.dim);
  st.setProperty("--hela-hot", t.hot);
  st.setProperty("--hela-text", t.text);
  st.setProperty("--hela-rgb", t.rgb);
  st.setProperty("--hela-hot-rgb", t.hotRgb);
}
