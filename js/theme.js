/* =========================================================================
   theme.js, THE COLOURS A PLAYER WEARS, and HELA's interface in each one

   A new player starts with two colours, green and blue. Every other colour is
   a reward of the Chronicle (js/chronicle.js unlocks them with quests):
     COMMON     the other palette colours (amber, teal, violet, rust)
     RARE       pairs of colours: HELA's eye and frame in the first colour, her
                balloons, highlights and the Tab panels inked in the second
     EPIC       the rainbow: a spectrum that turns slowly on her eye only
     LEGENDARY  Wanted (the bounty-poster look, a sheriff's star for an eye) and
                Terminated (the void look, a hollow eye with an ember iris)

   A seat always PLAYS one of the six palette colours, distinct across the table
   (the server settles it: server/lobby.py COLOUR_THEMES, clean_colour). A theme
   is how YOUR screen looks: your piece, HELA, her words. `base` is the palette
   colour it plays under (null: drawn among the free ones).

   Applying a theme: HELA's tokens (util.js setHelaColour) take the theme's first
   colour, body carries pdx-th-<kind> and pdx-th-<id>, and the second colour goes
   on body as --th-b (with --th-b-hot, a pale tint for text, and --th-b-rgb).
   All the looks live in styles/theme.css. No loops: the rainbow is one CSS
   animation on the 60 px eye, paused by the table's nap like every other.
   ========================================================================= */
import { setHelaColour, helaTokens } from "./util.js?202609280143";

export const THEMES = [
  // the palette colours: `base` is their own index (util.js PALETTE)
  { id: "amber",  kind: "single", tier: "common", base: 0, a: "#f2a93b", name: "Amber" },
  { id: "teal",   kind: "single", tier: "common", base: 1, a: "#2fa3a3", name: "Teal" },
  { id: "violet", kind: "single", tier: "common", base: 2, a: "#8f6fd6", name: "Violet" },
  { id: "green",  kind: "single", tier: "free",   base: 3, a: "#6fae6a", name: "Green" },
  { id: "rust",   kind: "single", tier: "common", base: 4, a: "#c2693f", name: "Rust" },
  { id: "blue",   kind: "single", tier: "free",   base: 5, a: "#5b8fd6", name: "Blue" },
  // pairs: the first colour is HELA's eye and frame, the second her ink
  { id: "teal_gold",      kind: "pair", tier: "rare", base: 1, a: "#2fa3a3", b: "#e8b24a", name: "Teal and Gold" },
  { id: "crimson_ivory",  kind: "pair", tier: "rare", base: 4, a: "#d0414a", b: "#efe4c8", name: "Crimson and Ivory" },
  { id: "violet_jade",    kind: "pair", tier: "rare", base: 2, a: "#8f6fd6", b: "#46c79a", name: "Violet and Jade" },
  { id: "amber_midnight", kind: "pair", tier: "rare", base: 0, a: "#f2a93b", b: "#6f86ec", name: "Amber and Midnight" },
  { id: "blue_rose",      kind: "pair", tier: "rare", base: 5, a: "#5b8fd6", b: "#ec86aa", name: "Blue and Rose" },
  { id: "green_copper",   kind: "pair", tier: "rare", base: 3, a: "#6fae6a", b: "#d9814b", name: "Green and Copper" },
  { id: "gold_violet",    kind: "pair", tier: "rare", base: 0, a: "#e8b24a", b: "#a283ec", name: "Gold and Violet" },
  // the spectrum
  { id: "rainbow", kind: "rainbow", tier: "epic", base: null, a: "#c98cff", b: "#7fe3ff", name: "Rainbow" },
  // the two legends
  { id: "wanted",     kind: "wanted",     tier: "legendary", base: 4, a: "#e0503a", b: "#ecd6a2", name: "Wanted" },
  { id: "terminated", kind: "terminated", tier: "legendary", base: 2, a: "#b9c9ce", b: "#ff6a3a", name: "Terminated" },
];
export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const SINGLE_BY_BASE = THEMES.filter((t) => t.kind === "single").sort((x, y) => x.base - y.base);
export const FREE_THEMES = THEMES.filter((t) => t.tier === "free").map((t) => t.id);
export const TIER_NAME = { free: "Starting colour", common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

let current = null;
/** The theme on screen now, or null before the first apply. */
export function currentTheme() { return current; }

/** Put a theme on: HELA's tokens, the body classes, the second colour. */
export function applyTheme(id) {
  const t = THEME_BY_ID[id] || THEME_BY_ID.green;
  current = t;
  const b = document.body;
  if (!b) return t;
  for (const c of [...b.classList]) if (c.startsWith("pdx-th-")) b.classList.remove(c);
  b.classList.add(`pdx-th-${t.kind}`, `pdx-th-${t.id}`);
  b.dataset.pdxTheme = t.id;
  try { setHelaColour(t.a); } catch (e) {}
  if (t.b) {
    const k = helaTokens(t.b);
    b.style.setProperty("--th-b", t.b);
    b.style.setProperty("--th-b-hot", k.hot);
    b.style.setProperty("--th-b-rgb", k.rgb);
  } else {
    ["--th-b", "--th-b-hot", "--th-b-rgb"].forEach((v) => b.style.removeProperty(v));
  }
  return t;
}

// game.js colorOf(my seat) asks here: a theme beyond the palette paints MY piece
// (on my screen) in its first colour; a palette colour leaves the seat colour alone.
window.__pdxThemeColour = () => (current && current.kind !== "single" ? current.a : null);
window.__pdxTheme = { apply: applyTheme, current: currentTheme, list: THEMES };
