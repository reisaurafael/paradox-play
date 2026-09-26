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
