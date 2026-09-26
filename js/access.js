/* =========================================================================
   access.js, TEXT SIZE and the ACCESSIBLE INTERFACE

   Two options, both kept in this machine's localStorage and applied before the
   first paint by the small script in index.html's <head>:

   - Text size (Normal, Large, Extra large): html[data-ts="1|2|3"]. The whole UI
     is sized in rem, so the root font size carries the menu, the table, the case
     files, the cards, HELA and the tutorial with it. The few pieces drawn in px
     read --tsf in styles/access.css.
   - Accessible interface: html.pdx-a11y. Larger text (at least Large), stronger
     contrast on labels and small print, thick focus outlines, calm motion, and a
     mark or a word wherever colour alone carried a state (styles/access.css).

   CALM MOTION. The game already honours the operating system's "reduce motion"
   in its own code (no shake, no flash, the short versions of its animations).
   The accessible interface turns that same path on from inside the game: the
   head script answers matchMedia("(prefers-reduced-motion: reduce)") with true,
   and here every @media (prefers-reduced-motion) rule in the stylesheets is
   switched on (and every no-preference rule off), including the ones the map
   modules add later.
   ========================================================================= */

const TS_KEY = "pdx-text-size";
const AX_KEY = "pdx-a11y";

const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

let ts = Math.max(1, Math.min(3, parseInt(lsGet(TS_KEY), 10) || 1));
let ax = lsGet(AX_KEY) === "on";

/* ---- calm motion: the stylesheets' own reduced-motion rules, switched on ---- */
const ORIGINAL = new WeakMap();   // CSSMediaRule -> its original media text
function flipRules(rules, calm) {
  for (const r of rules) {
    if (r.type !== 4 /* CSSRule.MEDIA_RULE */) continue;
    let orig = ORIGINAL.get(r);
    if (orig === undefined) { orig = r.media.mediaText; ORIGINAL.set(r, orig); }
    if (/prefers-reduced-motion/.test(orig)) {
      const want = !calm ? orig : (/no-preference/.test(orig) ? "not all" : "all");
      if (r.media.mediaText !== want) { try { r.media.mediaText = want; } catch (e) {} }
    }
    try { flipRules(r.cssRules, calm); } catch (e) {}
  }
}
function flipMotion(calm) {
  for (const sh of document.styleSheets) {
    let rules;
    try { rules = sh.cssRules; } catch (e) { continue; }   // a cross-origin sheet (fonts)
    flipRules(rules, calm);
  }
}
let _flipT = 0;
function flipSoon() { clearTimeout(_flipT); _flipT = setTimeout(() => flipMotion(ax), 60); }
try {
  new MutationObserver((muts) => {
    if (muts.some((m) => [...m.addedNodes].some((n) => n.nodeName === "STYLE" || n.nodeName === "LINK"))) flipSoon();
  }).observe(document.head, { childList: true });
} catch (e) {}
window.addEventListener("load", flipSoon);

/* ---- apply ---- */
function apply() {
  const d = document.documentElement;
  d.setAttribute("data-ts", String(ts));
  d.classList.toggle("pdx-a11y", ax);
  window.__pdxCalm = ax;
  flipMotion(ax);
  document.querySelectorAll("[data-ts-seg] .seg-btn").forEach((b) => {
    const on = parseInt(b.dataset.ts, 10) === ts;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const chk = document.getElementById("chk-a11y");
  if (chk) chk.checked = ax;
  // ambient loops rest in the accessible interface (main.js applyGfx reads it)
  try { window.__pdxApplyGfx && window.__pdxApplyGfx(); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent("pdx:access", { detail: { ts, ax } })); } catch (e) {}
}

export const access = {
  textSize: () => ts,
  a11y: () => ax,
  setTextSize(n) {
    ts = Math.max(1, Math.min(3, parseInt(n, 10) || 1));
    lsSet(TS_KEY, String(ts));
    apply();
  },
  setA11y(on) {
    ax = !!on;
    lsSet(AX_KEY, ax ? "on" : "off");
    apply();
  },
  sync: apply,
};

document.addEventListener("click", (e) => {
  const b = e.target && e.target.closest && e.target.closest("[data-ts-seg] .seg-btn");
  if (b) access.setTextSize(b.dataset.ts);
});
const _chk = document.getElementById("chk-a11y");
if (_chk) _chk.addEventListener("change", () => access.setA11y(_chk.checked));
apply();
