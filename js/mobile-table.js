/* =========================================================================
   mobile-table.js, THE WORKSTATION ON A PHONE (phase 2)
   -------------------------------------------------------------------------
   Runs only on touch (js/touch.js: html.pdx-touch; phones and tablets, the
   tablet with a wider column and more of the desk round each view) while the
   table is on screen (body.cabin-on). A desktop never gets past start().

   NOTHING IS REDRAWN, AND NOTHING MOVES. Each view (MACHINE, CHART, MERCHANT,
   CASE, RECORDS, HELA's memory) is a fixed page: the real table's region for it,
   shown at a fixed scale (one transform per view, screen = O + S * p, applied at
   once, never animated, on #cam and #hull alike). A view changes only by the
   rail's keys (or the automatic camera), under a comic-book PAGE SWAP: an inked
   page turns in over the stage, the page behind it is cut to the new view, the
   page turns away. The desktop camera never runs on touch (camera.js returns
   early under html.pdx-m-on). The screen never pans, scrolls or zooms under a
   finger, and there are no swipes.

   Fixed like the player's own body: HELA's column on the left (her eye, the
   Hour and its phases, her current line in her comic caption, the log in
   the pip-boy's phosphor) and the thumb rail on the right (the four views).

   Hooks it relies on (all public already): window.__game (camera,
   _beaconTarget, _scale), window.__pdxHelp, window.__pdxCat (setPlaces,
   setSize), window.__pdxTouch (full screen), #btn-settings, #log-list,
   #hud-hour, #vz-phases, #hela-eye .he-caps.
   ========================================================================= */

const D = document.documentElement;
const PLANE_W = 2133, PLANE_H = 1200;

// the views, and the desktop scene each belongs to (the game and the tutorial read the scene)
const VIEWS = {
  machine:  { scene: "main",   label: "Machine",  rail: true },
  chart:    { scene: "main",   label: "Chart",    rail: true },
  merchant: { scene: "market", label: "Merchant", rail: true },
  case:     { scene: "drawer", label: "Case",     rail: true },
  records:  { scene: "drawer", label: "Records",  rail: true },
  brain:    { scene: "drawer", label: "HELA",     rail: false },
};
// where each view looks, on the plane (the hull's plane is the same 2133x1200 box)
const DEVICE = { x: 112, y: 742, w: 520, h: 458 };     // the pip-boy with the sleeve's handwheel, table round it
// the rivals' files lie in a row on the desk above the glove (the hand rests on their lower
// halves, as on a real desk); the frame's right edge is the row's right edge
const PILE = { x0: 604, x1: 930, y: 752, k: 0.64 };
const CASE = { x: -30, y: -2, w: 1100, h: 592 };       // the open briefcase, the cat beside it
const CAT_AT = { x: 905, y: 560, size: 20 };          // she curls on the desk at the case's right (her only place on a phone)

const on = () => D.classList.contains("pdx-m-on");
const game = () => window.__game || null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let view = "machine";
let col = null, rail = null, stage = { x: 0, y: 0, w: 0, h: 0 };
let S = 1, O = { x: 0, y: 0 };
let manualAt = 0;                       // the last time HE turned the head
let prevView = "machine";
let catSaved = null;

/* ── the safe-area insets, read once per layout from a probe ── */
function insets() {
  const p = document.createElement("div");
  p.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;"
    + "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  document.body.appendChild(p);
  const cs = getComputedStyle(p);
  const r = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  p.remove();
  return r;
}

/* ── the fixed body: HELA's column and the thumb rail ── */
const EYE = `<svg viewBox="-60 -60 120 120" aria-hidden="true"><path class="mc-burst" d="M0 -56 L12 -30 L40 -44 L32 -16 L58 -8 L34 8 L48 34 L18 28 L8 56 L-6 30 L-34 48 L-28 18 L-58 10 L-34 -8 L-46 -36 L-16 -28 Z"/>`
  + `<path class="mc-lid" d="M -36 0 Q 0 -27 36 0 Q 0 27 -36 0 Z"/><circle class="mc-iris" r="13"/><circle class="mc-pupil" r="6"/><circle class="mc-glint" cx="-4" cy="-4" r="2.4"/></svg>`;
const ICON = {
  gear: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  fs: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  machine: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="4" width="22" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="9" y="8" width="14" height="10" rx="1.5" fill="currentColor" opacity=".35"/><rect x="9" y="21" width="4" height="4" rx="1" fill="currentColor"/><rect x="15" y="21" width="4" height="4" rx="1" fill="currentColor"/></svg>`,
  chart: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7l7-3 8 3 7-3v21l-7 3-8-3-7 3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="13" r="2" fill="currentColor"/><circle cx="20" cy="19" r="2" fill="currentColor"/><path d="M12 13l8 6" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/></svg>`,
  merchant: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 12l3-6h18l3 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 12q3 3 6 0q3 3 6 0q3 3 6 0q3 3 6 0" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 14v12h18V14" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="18" width="6" height="8" fill="currentColor" opacity=".4"/></svg>`,
  secret: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5h24" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 5v22c3 0 5-2 6-6 1 4 2 6 4 6s3-2 4-6c1 4 3 6 6 6V5" fill="currentColor" opacity=".3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 5v22" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="15" r="4.6" fill="#1a1024" stroke="currentColor" stroke-width="2"/><path d="M16 13.6v3.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  case: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="10" width="26" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M11 10V7h10v3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 17h26" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="15" width="5" height="4" rx="1" fill="currentColor"/></svg>`,
  records: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="4" width="22" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 12h22M5 20h22" stroke="currentColor" stroke-width="2"/><rect x="13" y="7" width="6" height="2.4" rx="1" fill="currentColor"/><rect x="13" y="15" width="6" height="2.4" rx="1" fill="currentColor"/><rect x="13" y="23" width="6" height="2.4" rx="1" fill="currentColor"/></svg>`,
};

function build() {
  col = document.createElement("aside");
  col.id = "pdx-mcol";
  col.setAttribute("aria-label", "HELA and the log");
  // HER COLUMN, calm (the owner, 28/09): one thing at a time, top to bottom:
  //   her eye (a tap opens her memory, the Hours) with the Hour and its phase;
  //   his LIFE, big, with its cells (the same number as the thread round the screen);
  //   ONE slot for her line (the turn, a direction, an event; the tutorial's lines dock here);
  //   the log folded to its last two lines (a tap unfolds it over the slot);
  //   the "?" and the gear, small, at the foot.
  col.innerHTML = `
    <header class="mc-head">
      <button type="button" class="mc-eye" aria-label="HELA's memory: every Hour">${EYE}<i class="mc-eye-lbl">HOURS</i></button>
      <span class="mc-id"><span class="mc-hour"></span><span class="mc-phase"></span>
        <span class="mc-phases" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span>
    </header>
    <div class="mc-life" aria-live="polite"><span class="mc-life-h">LIFE</span><b>-</b><span class="mc-cells"></span></div>
    <div class="mc-slot"><div class="mc-says" aria-live="polite"></div></div>
    <div class="mc-extra"></div>
    <div class="mc-log"><p class="mc-log-h">LOG <span>tap to open</span></p><ol class="mc-log-l"></ol></div>
    <div class="mc-tools">
      <button type="button" class="mc-btn pdx-helpkey mc-q" aria-label="Tips; press and hold for the table's reference"><b>?</b></button>
      <button type="button" class="mc-btn mc-fs" aria-label="Play full screen">${ICON.fs}</button>
      <button type="button" class="mc-btn mc-gear" aria-label="Settings">${ICON.gear}</button>
    </div>`;
  col.querySelector(".mc-log").addEventListener("click", (e) => {
    e.stopPropagation();
    col.classList.toggle("mc-log-open");
    lastLog = ""; paintCol();
  });
  document.body.appendChild(col);
  col.querySelector(".pdx-helpkey").addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.__pdxHelp) window.__pdxHelp.toggle();
  });
  col.querySelector(".mc-gear").addEventListener("click", (e) => {
    e.stopPropagation();
    const g = document.getElementById("btn-settings"); if (g) g.click();
  });
  col.querySelector(".mc-fs").addEventListener("click", (e) => {
    e.stopPropagation();
    const T = window.__pdxTouch; if (!T) return;
    if (T.canFs) T.fullscreen().then(paintCol); else T.guide();
  });

  rail = document.createElement("nav");
  rail.id = "pdx-mrail";
  rail.setAttribute("aria-label", "Look around the table");
  rail.innerHTML = Object.entries(VIEWS).filter(([, v]) => v.rail).map(([k, v]) =>
    `<button type="button" data-view="${k}">${ICON[k]}<span>${v.label}</span></button>`).join("")
    + `<button type="button" class="mr-act" hidden></button>`;
  rail.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest(".mr-act");
    if (a) { e.stopPropagation(); if (a._do) a._do(); return; }
    // (the view keys are handled at the window, before a carried relic can be dropped)
  });
  // her eye opens her core (the brain, her memory of every Hour) where it lives, on the
  // paperwork desk; the eye again, or any key, turns back
  col.querySelector(".mc-eye").addEventListener("click", (e) => {
    e.stopPropagation();
    manualAt = performance.now();
    go(view === "brain" ? (prevView !== "brain" ? prevView : "machine") : "brain");
  });
  document.body.appendChild(rail);
}

/* ── layout: the stage is what the column and the rail leave ── */
function layout() {
  const ins = insets();
  const W = innerWidth, H = innerHeight;
  const tab = D.classList.contains("pdx-tablet");
  const colW = Math.round(tab ? Math.max(190, Math.min(250, W * 0.2)) : Math.max(138, Math.min(176, W * 0.18))) + ins.l;
  const railW = Math.round(tab ? 84 : Math.max(58, Math.min(70, W * 0.075))) + ins.r;
  D.style.setProperty("--pdx-colw", colW + "px");
  D.style.setProperty("--pdx-railw", railW + "px");
  // the stage keeps clear of the notch and of the home bar (the table's art runs on under them)
  // the tutorial's lesson bar rides the stage's top edge: the views start under it
  const bar = document.body.classList.contains("tut") ? 40 : 0;
  stage = { x: colW, y: ins.t + bar, w: W - colW - railW, h: H - ins.t - ins.b - bar };
  D.classList.toggle("pdx-m-tut", !!bar);
  D.style.setProperty("--pdx-stage-y", stage.y + "px");
}

/* ── the camera: one transform for the plane and the pip-boy ── */
function planeRectOf(el) {
  const cam = document.getElementById("cam");
  if (!el || !cam) return null;
  const cr = cam.getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = cr.width / PLANE_W;
  if (!(k > 0) || !(r.width > 0)) return null;
  return { x: (r.left - cr.left) / k, y: (r.top - cr.top) / k, w: r.width / k, h: r.height / k };
}
function unionRect(sels, pad) {
  let u = null;
  for (const sel of sels) {
    document.querySelectorAll(sel).forEach((el) => {
      const r = planeRectOf(el);
      if (!r || r.w < 4 || r.h < 4) return;
      if (!u) u = { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
      else { u.x0 = Math.min(u.x0, r.x); u.y0 = Math.min(u.y0, r.y); u.x1 = Math.max(u.x1, r.x + r.w); u.y1 = Math.max(u.y1, r.y + r.h); }
    });
  }
  return u ? { x: u.x0 - pad, y: u.y0 - pad, w: u.x1 - u.x0 + 2 * pad, h: u.y1 - u.y0 + 2 * pad } : null;
}
function frameRect(v) {
  if (v === "machine") return { x: DEVICE.x, y: DEVICE.y, w: PILE.x1 - DEVICE.x, h: DEVICE.h, bottom: true };
  if (v === "case") return CASE;
  if (v === "brain") {
    const r = planeRectOf(document.getElementById("hela-brain-full"));
    return r ? { x: r.x - 40, y: r.y - 20, w: r.w + 80, h: r.h + 40 } : { x: -930, y: 560, w: 670, h: 630 };
  }
  if (v === "chart") {
    const rail0 = document.getElementById("timeline-rail");
    // the chart on show (three skins: the sea, the stars, the origins): its own drawing
    const sk = [...rail0 ? rail0.querySelectorAll(":scope > .cplot, :scope > .cplot-sing, :scope > .cplot-ori") : []]
      .find((n) => getComputedStyle(n).display !== "none" && n.getBoundingClientRect().width > 4);
    const rs = sk && planeRectOf(sk);
    if (rs && rs.w > 200) return { x: rs.x, y: rs.y, w: rs.w, h: rs.h };
    const r = planeRectOf(rail0);
    return r ? { x: r.x + 4, y: r.y + 60, w: Math.min(r.w, PLANE_W - r.x) - 8, h: Math.min(r.h, PLANE_H - r.y) - 64 } : { x: 1066, y: 60, w: 1060, h: 1130 };
  }
  if (v === "merchant") {
    // the shelf, its wooden signs and the Secret Market's curtain, framed close: the cards
    // are read here (the wagon's arch around them is cropped at the edges)
    // the SIMPLE market: his shelf, his signs, his sign-board; the Secret Market's page (the
    // second tap) is BOTH markets side by side (the owner, 28/09)
    const sels = ["#market-zone .market-row", "#market-zone .market-side-signs", "#market-sign"];
    if (secretOn) sels.push("#market-zone .secret-stage");
    // the simple market is a whole scene too: the wagon's arch and some wall around the shelf,
    // centred on his shelf; both markets get a little wall around them as well
    const u = unionRect(sels, secretOn ? 150 : 210);
    const row = !secretOn && (unionRect(["#market-zone > .portal-bg"], 0)
      || unionRect(["#market-zone .market-row"], 0));
    if (u && row) { const half = Math.max(row.x + row.w / 2 - u.x, u.x + u.w - (row.x + row.w / 2)); u.x = row.x + row.w / 2 - half; u.w = half * 2; }
    return u || planeRectOf(document.getElementById("market-zone")) || { x: 300, y: -560, w: 1100, h: 560 };
  }
  if (v === "records") return planeRectOf(document.getElementById("drawer-zone")) || { x: -1066, y: 0, w: 1066, h: 1200 };
  return { x: 0, y: 0, w: PLANE_W, h: PLANE_H };
}
// his own piece on the chart (the century he stands on), in plane px
function myPiece() {
  const g = game(), me = g && g._self ? g._self() : null;
  if (!me) return null;
  const nodes = [...document.querySelectorAll(`#timeline-rail [data-c="${me.century}"]`)].filter((n) => {
    const r = n.getBoundingClientRect(); return r.width > 1 && getComputedStyle(n).display !== "none" && !n.closest("[hidden]"); });
  for (const n of nodes) { const r = planeRectOf(n); if (r) return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  return null;
}
function paceMs() {
  const g = game();
  let k = 1;
  try { k = g && g._scale ? g._scale() : 1; } catch (e) {}
  return Math.round(430 * Math.max(0.6, Math.min(1.6, k)));
}
const calm = () => !!(window.__pdxCalm || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
function frame(v, animate) {
  // THE PAGE IS SHOWN BEFORE IT IS MEASURED: its own scene element is displayed (html
  // [data-pdx-view], mobile.css) before its box is read. Measured while still hidden, the chart
  // and the records fell back to guessed boxes and came up black or shifted until a second tap.
  D.dataset.pdxView = v;
  const f = frameRect(v);
  S = Math.min(stage.w / f.w, stage.h / f.h);
  O.x = stage.x + (stage.w - f.w * S) / 2 - f.x * S;
  // on a phone the machine sits on the bottom edge, under the thumbs; a tablet centres every page
  O.y = f.bottom && D.classList.contains("pdx-phone") ? stage.y + stage.h - (f.y + f.h) * S : stage.y + (stage.h - f.h * S) / 2 - f.y * S;
  // EVERY VIEW IS ITS OWN PAGE: nothing of the table round its frame shows (the stage's own
  // backdrop does); the frame is widened to the stage's shape so no strip is cut off inside it
  const vw = stage.w / S, vh = stage.h / S;
  const cx0 = (stage.x - O.x) / S, cy0 = (stage.y - O.y) / S;
  const top = Math.max(f.y, cy0), left = Math.max(f.x, cx0);
  const right = Math.min(f.x + f.w, cx0 + vw), bottom = Math.min(f.y + f.h, cy0 + vh);
  // only the chart is cut out of its sheet; every other page lies on its own backdrop (the
  // walnut or the wallpaper, one continuous surface drawn by the stage, mobile.css), so no edge
  // of the desk ever shows
  D.style.setProperty("--pdx-clip", v === "chart" ? `inset(${top.toFixed(1)}px ${(PLANE_W - right).toFixed(1)}px ${(PLANE_H - bottom).toFixed(1)}px ${left.toFixed(1)}px)` : "none");
  D.style.setProperty("--pdx-tile-s", S.toFixed(4));
  if (!D.style.getPropertyValue("--pdx-wood")) {
    const cam = document.getElementById("cam");
    const slab = cam && getComputedStyle(cam).getPropertyValue("--pdx-slab");
    if (slab && slab.trim()) D.style.setProperty("--pdx-wood", slab.trim());
  }
  D.classList.toggle("pdx-chart", v === "chart");
  D.classList.toggle("pdx-secret", v === "merchant" && secretOn);
  D.style.setProperty("--pdx-dur", animate && !calm() ? paceMs() + "ms" : "0ms");
  D.style.setProperty("--pdx-s", S.toFixed(5));
  D.style.setProperty("--pdx-ox", O.x.toFixed(2) + "px");
  D.style.setProperty("--pdx-oy", O.y.toFixed(2) + "px");
  frameSig = v + ":" + [f.x, f.y, f.w, f.h].map((n) => Math.round(n)).join(",");
}
// a page whose own drawing settles a beat later (fonts, the phone chart's relayout, a resize)
// is framed again as soon as it changes: checked for the first half second, then on resize
let frameSig = "", reframeT = 0;
function reframeSoon() {
  clearTimeout(reframeT);
  let n = 0;
  const tick = () => {
    if (!on()) return;
    const f = frameRect(view), sig = view + ":" + [f.x, f.y, f.w, f.h].map((x) => Math.round(x)).join(",");
    if (sig !== frameSig) { layout(); frame(view, false); }
    if (++n < 8) reframeT = setTimeout(tick, 60);
  };
  reframeT = setTimeout(tick, 0);
}

/* ── turning the head: the view changes, the real camera follows its scene ── */
function go(v, animate = true) {
  if (!VIEWS[v]) return;
  if (animate && on() && v !== view && !calm()) { swapTo(v); return; }
  land(v);
}
/* THE PAGE SWAP: an inked comic page turns in over the stage from its right edge, the view
   is cut behind it, and the page turns away to the left: 360 ms, transform and opacity
   only, the same every time. A new target during a swap waits for the page to land. */
let swapping = false, swapNext = null, swapEl = null;
const VIEW_TITLE = { machine: "THE MACHINE", chart: "THE CHART", merchant: "THE MERCHANT", case: "THE CASE", records: "THE RECORDS", brain: "HELA'S MEMORY" };
function swapTo(v) {
  if (swapping) { swapNext = v; return; }
  swapping = true;
  if (!swapEl) {
    swapEl = document.createElement("div");
    swapEl.id = "pdx-swap"; swapEl.setAttribute("aria-hidden", "true");
    swapEl.innerHTML = `<div class="ps-cast"></div><div class="ps-leaf"><div class="ps-face"><div class="ps-panel p1"><b class="ps-cap"></b></div>`
      + `<div class="ps-panel p2"></div><div class="ps-panel p3"></div><span class="ps-next"></span></div><div class="ps-back"></div><div class="ps-shade"></div></div>`;
    document.body.appendChild(swapEl);
  }
  const leaf = swapEl.querySelector(".ps-leaf"), shade = swapEl.querySelector(".ps-shade"), cast = swapEl.querySelector(".ps-cast");
  swapEl.querySelector(".ps-cap").textContent = VIEW_TITLE[view] || "";
  swapEl.querySelector(".ps-next").textContent = "NEXT PAGE: " + (VIEW_TITLE[v] || "");
  swapEl.style.left = stage.x + "px"; swapEl.style.width = stage.w + "px";
  swapEl.style.top = stage.y + "px"; swapEl.style.height = stage.h + "px"; swapEl.style.bottom = "auto";
  swapEl.classList.add("on");
  // the page he is on lies on the stage (a comic page with its caption); the next scene is set
  // under it at once, then the page turns over on its left edge and lies back off the stage
  const dur = 440, settle = 90;
  setTimeout(() => land(v), settle);                     // the cut, under the page once it lies there
  try {
    [leaf, shade, cast].forEach((n) => n.getAnimations().forEach((an) => an.cancel()));
    const ease = "cubic-bezier(.45,.05,.55,.95)";
    // it inks in over the scene (the scene becomes a page), lifts a little, and turns over
    leaf.animate([{ transform: "rotateY(0deg)", opacity: 0 }, { transform: "rotateY(0deg)", opacity: 1, offset: settle / dur },
      { transform: "rotateY(-22deg)", opacity: 1, offset: .4 }, { transform: "rotateY(-180deg)", opacity: 1 }], { duration: dur, easing: ease, fill: "both" });
    shade.animate([{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 0 }], { duration: dur, easing: ease, fill: "both" });
    cast.animate([{ opacity: 0, transform: "scaleX(1)" }, { opacity: 1, transform: "scaleX(.55)", offset: .5 }, { opacity: 0, transform: "scaleX(0)" }], { duration: dur, easing: ease, fill: "both" });
  } catch (e) {}
  setTimeout(() => {
    swapEl.classList.remove("on"); swapping = false;
    if (swapNext && swapNext !== view) { const n = swapNext; swapNext = null; swapTo(n); } else swapNext = null;
  }, dur + 30);
}
function land(v) {
  if (v !== view) prevView = view;
  view = v;
  closeSheet();
  const g = game(), cam = g && g.camera;
  const want = VIEWS[v].scene;
  if (cam && cam.scene !== want) {
    try {
      cam._engage && cam._engage();
      window.__pdxSceneByHand = true;
      try { cam.setScene(want); } finally { window.__pdxSceneByHand = false; }
      cam._manualUntil = (cam._now ? cam._now() : performance.now()) + 6000;
      g.updateBeacon && g.updateBeacon();
      g._onSceneArrive && g._onSceneArrive(want);
    } catch (e) {}
  }
  // the page is still when it lands: the chart's roll and the arm's slide settle at once
  document.body.classList.toggle("chart-rolled", want === "market");
  closeFiles();
  if (pingView === v) pingView = null;
  frame(v, false);
  reframeSoon();
  if (v === "machine") requestAnimationFrame(nudgeSeals);
  paintRail();
  requestAnimationFrame(pile);
}
// THE SEALS' LETTERS: SVG text laid out while its page was hidden (display none) is not
// painted again when the page comes back, so the O / A / S came up as empty rings. A tiny
// change of their size makes the browser lay them out and paint them on every landing.
let sealFlip = false;
function nudgeSeals() {
  sealFlip = !sealFlip;
  document.querySelectorAll("#hull .mano-seal .ms-glyph").forEach((t) => { t.style.fontSize = sealFlip ? "11px" : "11.02px"; });
}
// a scene of the real camera holds more than one phone view
// (the case is looked at with the records, as on the desktop's paperwork desk: a delivery
//  takes the relic from the case to its drawer without the camera leaving that scene)
const SCENE_VIEWS = { main: ["machine", "chart"], market: ["merchant"], drawer: ["records", "case", "brain"] };

/* ── the rivals' police files, a pile on the desk at the device's right ── */
function files() {
  return [...document.querySelectorAll("#players-zone .pcard.cfolio")];
}
let outFile = null;
const filePos = new Map();                       // seat -> plane point where he left the file
function pile() {
  if (!on()) return;
  const zone = document.getElementById("players-zone");
  const zr = planeRectOf(zone);
  if (!zr) return;
  const list = files();
  if (!list.length) return;
  const w0 = list[0].offsetWidth || 250;
  const k = PILE.k, w = w0 * k, n = list.length, room = PILE.x1 - PILE.x0 - w;
  const step = n > 1 ? Math.min(w * 0.86, room / (n - 1)) : 0;
  const x0 = n > 1 ? PILE.x0 : PILE.x0 + room / 2;
  list.forEach((f, i) => {
    f.classList.add("pdx-piled");
    // where he left it (dragged on the machine's table), or its place in the row
    const at = filePos.get(f.dataset.seat) || { x: x0 + i * step, y: PILE.y + (i % 2) * 12 };
    f.style.setProperty("--pdx-fx", (at.x - zr.x).toFixed(1) + "px");
    f.style.setProperty("--pdx-fy", (at.y - zr.y).toFixed(1) + "px");
    f.style.setProperty("--pdx-fk", k.toFixed(3));
    f.style.setProperty("--pdx-fz", String(20 + i));
  });
}
// a tap opens the COMPLETE file, the desktop's own dossier (game.showPanelDetail), drawn
// over everything on the stage (mobile.css); a tap outside puts it away (the game's own closer)
function openFile(f) {
  const g = game(); if (!g || !g.view || !g.showPanelDetail) return;
  const t = g.view.travelers.find((x) => x.name === f.dataset.seat);
  if (!t) return;
  outFile = f;
  g.showPanelDetail(t, f);
  // her paper lesson waits for a file to be lifted and let go: on a phone a tap is that
  f.classList.add("dk-held"); setTimeout(() => f.classList.remove("dk-held"), 320);
}
function closeFiles() {
  if (!outFile) return;
  outFile = null;
  const g = game(); if (g && g.hidePanelDetail) g.hidePanelDetail();
}
// THE FILES ON THE MACHINE'S TABLE: a finger drags one anywhere on that page (never off it);
// a tap opens the whole dossier. The desk's own drag (cabin.js deskLab) never hears the finger.
function wireFiles() {
  let dg = null, eatUntil = 0;
  window.addEventListener("pointerdown", (e) => {
    if (!on()) return;
    const f = e.target && e.target.closest && e.target.closest("#players-zone .pcard.cfolio");
    if (!f) return;
    if (f.classList.contains("pcard-choose")) return;      // a target to choose: the game's own tap
    if (e.target.closest(".targetable")) return;          // an item of his to pick (destroy, steal): the game's own tap
    e.stopPropagation();
    if (view !== "machine" || e.pointerType === "mouse" && e.button !== 0) return;
    const zr = planeRectOf(document.getElementById("players-zone"));
    const x = parseFloat(f.style.getPropertyValue("--pdx-fx")), y = parseFloat(f.style.getPropertyValue("--pdx-fy"));
    if (!zr || isNaN(x) || isNaN(y)) return;
    dg = { f, id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: x + zr.x, y0: y + zr.y, moved: false };
  }, true);
  window.addEventListener("pointermove", (e) => {
    if (!dg || e.pointerId !== dg.id) return;
    const dx = (e.clientX - dg.sx) / S, dy = (e.clientY - dg.sy) / S;
    if (!dg.moved && Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 10) return;
    if (!dg.moved) { dg.moved = true; dg.f.classList.add("pdx-dragging"); dg.f.style.setProperty("--pdx-fz", "45"); }
    e.preventDefault();
    // clamped to the WHOLE table he sees on the machine's page (its top band too), never
    // under the column or the rail: the stage's own box, in the table's units
    const k = PILE.k, fw = (dg.f.offsetWidth || 250) * k, fh = (dg.f.offsetHeight || 330) * k;
    const F = { x: (stage.x - O.x) / S, y: (stage.y - O.y) / S, w: stage.w / S, h: stage.h / S };
    const x = Math.max(F.x, Math.min(F.x + F.w - fw, dg.x0 + dx)), y = Math.max(F.y, Math.min(F.y + F.h - fh, dg.y0 + dy));
    const zr = planeRectOf(document.getElementById("players-zone"));
    if (!zr) return;
    dg.f.style.setProperty("--pdx-fx", (x - zr.x).toFixed(1) + "px");
    dg.f.style.setProperty("--pdx-fy", (y - zr.y).toFixed(1) + "px");
    dg.last = { x, y };
  }, { capture: true, passive: false });
  const drop = (e) => {
    if (!dg || e.pointerId !== dg.id) return;
    const d = dg; dg = null;
    d.f.classList.remove("pdx-dragging");
    if (!d.moved) return;
    if (d.last) filePos.set(d.f.dataset.seat, d.last);
    eatUntil = performance.now() + 450;                  // the lift is not a tap on the file
    // her paper lesson waits for a file lifted and let go
    d.f.classList.add("dk-held"); setTimeout(() => d.f.classList.remove("dk-held"), 320);
    pile();
  };
  window.addEventListener("pointerup", drop, true);
  window.addEventListener("pointercancel", drop, true);
  document.addEventListener("click", (e) => {
    if (!on()) return;
    const f = e.target && e.target.closest && e.target.closest("#players-zone .pcard.cfolio");
    if (f && (f.classList.contains("pcard-choose") || (e.target.closest && e.target.closest(".targetable")))) return;  // choosing a target: the game's own tap
    if (f) {
      e.preventDefault(); e.stopPropagation();
      if (performance.now() < eatUntil) return;
      const g = game();
      if (g && g.panelDetail && g.panelDetail.dataset.seat === f.dataset.seat) closeFiles(); else openFile(f);
      return;
    }
    if (outFile && !(e.target.closest && e.target.closest(".panel-detail, .do-attach"))) outFile = null;
  }, true);
}

/* ── the cat keeps a small place on this desk, at the pile's foot ── */
function catHome(mount) {
  const c = window.__pdxCat;
  if (!c || !c.setPlaces) return;
  if (mount) {
    if (!catSaved) catSaved = { places: c.places, size: c.sizeUnits };
    // her place beside the case is her "bed": the ART agent's basket shows there and she naps in it
    c.setPlaces({ bed: { x: CAT_AT.x / (PLANE_W / 100), y: CAT_AT.y / (PLANE_H / 100), lie: true, sit: true } }, "bed");
    c.setSize((c.sizes && c.sizes.phone) || CAT_AT.size);
  } else if (catSaved) {
    c.setPlaces(catSaved.places, "bed");
    c.setSize(catSaved.size);
    catSaved = null;
  }
}

/* ── HELA's column: her line, the Hour, the phases, the log ── */
function capHTML(cap) {
  const tag = cap.querySelector(".cx-tag"), txt = cap.querySelector(".cx-txt");
  if (!txt) return "";
  const t = txt.cloneNode(true);
  t.querySelectorAll("kbd").forEach((k) => k.remove());       // no keys on a phone
  const kind = cap.classList.contains("cx-you") ? " mc-you" : cap.classList.contains("cx-danger") ? " mc-danger" : cap.classList.contains("cx-good") ? " mc-good" : "";
  return `<div class="mc-cap${kind}">${tag ? `<span class="mc-tag">${esc(tag.textContent)}</span>` : ""}<span class="mc-txt">${t.innerHTML}</span></div>`;
}
let lastSays = "", lastLog = "";
// help.js's own TAB key moves into HELA's column (the tutorial rings THAT key, and touch.js
// makes a press held on it the held reference); it goes back to the body off the phone layout
function dockTabKey(inCol) {
  const k = document.getElementById("pdx-tabkey");
  if (!k || !col) return;
  const tools = col.querySelector(".mc-tools");
  if (inCol && k.parentElement !== tools) tools.insertBefore(k, tools.firstChild);
  else if (!inCol && k.parentElement === tools) document.body.appendChild(k);
}
function paintCol() {
  if (!col) return;
  dockTabKey(true);
  const hh = document.getElementById("hud-hour");
  col.querySelector(".mc-hour").textContent = hh ? "Hour " + hh.textContent.trim() : "";
  const ph = [...document.querySelectorAll("#vz-phases .vz-ph")];
  const dots = col.querySelectorAll(".mc-phases i");
  dots.forEach((d0, i) => {
    const p = ph[i];
    d0.className = p ? (p.classList.contains("on") ? "on" : p.classList.contains("done") ? "done" : "") : "";
    d0.title = p ? p.textContent : "";
  });
  // the Wanted mark (and the Wanted theme) puts her sheriff's star behind her eye, here
  const eyeEl = col.querySelector(".mc-eye");
  const wanted = document.body.classList.contains("vz-wanted") || document.body.classList.contains("pdx-th-wanted");
  if (wanted && !eyeEl.style.getPropertyValue("--mc-star")) {
    const he = document.getElementById("hela-eye");
    const bg = he && getComputedStyle(he, "::before").backgroundImage;
    if (bg && bg !== "none") eyeEl.style.setProperty("--mc-star", bg);
  }
  eyeEl.classList.toggle("mc-wanted", wanted && !!eyeEl.style.getPropertyValue("--mc-star"));
  const T = window.__pdxTouch;
  col.querySelector(".mc-fs").hidden = !T || T.isFs() || T.standalone();
  // the phase in words beside the Hour
  const onPh = ph.find((p) => p.classList.contains("on"));
  col.querySelector(".mc-phase").textContent = onPh ? onPh.textContent.trim() : "";
  // HER ONE LINE: a direction when he is needed elsewhere, else his move, else the last event.
  // The Hour's chapter is the header's own; nothing else stacks here.
  const caps = document.querySelector("#hela-eye .he-caps");
  const pick = (sel) => (caps ? caps.querySelector(sel + ".on") : null);
  const turn = pick(".cx-slot-turn"), ev = pick(".cx-slot-event");
  const want = D.dataset.pdxWant;
  let says = "";
  if (want && VIEWS[want]) {
    const t = turn ? capHTML(turn).replace(/<span class="mc-tag">[^<]*<\/span>/, "") : "";
    says = `<div class="mc-cap mc-you mc-goto"><span class="mc-tag mc-go">GO TO ${esc(VIEWS[want].label.toUpperCase())}</span>`
      + (t ? t.replace(/^<div class="mc-cap[^"]*">/, "").replace(/<\/div>$/, "") : "") + `</div>`;
  } else if (turn) says = capHTML(turn);
  else if (ev) says = capHTML(ev);
  if (says !== lastSays) {
    lastSays = says;
    const sayEl = col.querySelector(".mc-says");
    sayEl.innerHTML = says;
    // her line is never cut: it takes a size that fits the slot (down to a readable floor) and
    // the slot scrolls if even that is too long
    const slot = col.querySelector(".mc-slot");
    let fs = 0.86;
    sayEl.style.setProperty("--mc-fs", fs + "rem");
    while (sayEl.scrollHeight > slot.clientHeight + 1 && fs > 0.72) { fs = +(fs - 0.03).toFixed(2); sayEl.style.setProperty("--mc-fs", fs + "rem"); }
  }
  // the tutorial's line takes the slot itself (mobile.css docks it on the slot's box)
  const sr = col.querySelector(".mc-slot").getBoundingClientRect();
  D.style.setProperty("--mc-slot-top", Math.round(sr.top) + "px");
  D.style.setProperty("--mc-slot-h", Math.max(60, Math.round(sr.height)) + "px");
  col.style.setProperty("--mc-log-top", Math.round(sr.top) + "px");
  // the log: folded to the last two lines, or open over the slot
  const open = col.classList.contains("mc-log-open");
  const items = [...document.querySelectorAll("#log-list > li")]
    .filter((li) => !/^\s*-\s.*\s-\s*$/.test((li.querySelectorAll(":scope > span")[1] || li).textContent))
    .slice(open ? -40 : -2).reverse();
  const log = items.map((li, i) => {
    const sp = li.querySelectorAll(":scope > span");
    const time = sp[0] ? sp[0].textContent : "";
    const body = sp[1] ? sp[1].innerHTML : li.innerHTML;
    return `<li class="${i ? "" : "mc-new"}"><b>${esc(time)}</b><span>${body}</span></li>`;
  }).join("");
  if (log !== lastLog) { lastLog = log; col.querySelector(".mc-log-l").innerHTML = log; col.querySelector(".mc-log-h span").textContent = open ? "tap to fold" : "tap to open"; }
}
function paintRail() {
  if (!rail) return;
  const g = game(), req = g && g.pendingReq;
  // what waits where: his decision first, then what the game or the tutorial asked for
  const need = wantedView();
  const want = need && need !== view ? need : (pingView && pingView !== view ? pingView : null);
  const word = want && need === want && req ? (PING_WORD[req.kind] || "!") : "!";
  rail.querySelectorAll("button[data-view]").forEach((b) => {
    b.classList.toggle("is-on", b.dataset.view === view);
    const pinged = !!want && b.dataset.view === want;
    b.classList.toggle("beckon", pinged);
    let badge = b.querySelector(".mr-ping");
    if (pinged) {
      if (!badge) { badge = document.createElement("i"); badge.className = "mr-ping"; b.appendChild(badge); }
      if (badge.textContent !== word) badge.textContent = word;
    } else if (badge) badge.remove();
  });
  D.dataset.pdxWant = want || "";
  // a pick on the chart is open: HELA's windows (the Herald above all) wait off the chart page,
  // so they never lie over the centuries and swallow the tap (ENGINE's browser runs)
  const k = req && req.kind, o = (req && req.options) || {};
  const chartPick = view === "chart" && (k === "travel" || k === "merchant_century" || (k === "target" && o.target_type === "century"));
  D.classList.toggle("pdx-chart-pick", !!chartPick);
}

function stagePt(x, y) { return { x: (x - O.x) / S, y: (y - O.y) / S }; }

/* ── THE MERCHANT'S CARD SHEET: on a phone the first tap on a card SHOWS it (his whole
      text, price, delivery, recycle); the big key under it acts (BUY, STEAL, RENEW, TAKE,
      CHOOSE). The act is the card's own click, replayed, so the game's rules decide. ── */
let sheet = null, sheetFor = null, letThrough = false;
function cardData(name) {
  const g = game(), v = g && g.view;
  let hit = null;
  const walk = (o, depth) => {
    if (hit || !o || typeof o !== "object" || depth > 5) return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, depth + 1)); return; }
    if (o.name === name && ("description" in o || "gold_cost" in o)) { hit = o; return; }
    for (const k in o) walk(o[k], depth + 1);
  };
  walk(v, 0);
  if (!hit && g && g.pendingReq) walk(g.pendingReq.options, 0);
  return hit;
}
function roman(n) {
  const R = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX"];
  return n === 0 ? "0" : R[n] || String(n);
}
function actOf(node) {
  if (!node.classList.contains("is-actionable")) return null;
  const c = node.classList;
  if (c.contains("can-buy")) {
    const d = cardData(node.dataset.name), g = game(), me = g && g._self ? g._self() : null;
    return "Buy" + (d && d.gold_cost != null ? ` · ${d.gold_cost} gold` : "") + (me ? ` (you have ${me.gold})` : "");
  }
  if (c.contains("can-renew")) return "Renew this card";
  if (c.contains("can-steal") || document.querySelector("#market-zone.sel-steal")) return "Steal (Wanted)";
  if (document.querySelector("#market-zone.sel-destroy")) return "Destroy";
  if (c.contains("can-select")) return "Take";
  return "Choose";
}
function openSheet(node) {
  closeSheet();
  const name = node.dataset.name;
  const d = cardData(name) || {};
  sheetFor = { name, secret: !!node.closest(".secret-stage, .secret-card-wrap") };
  sheet = document.createElement("div");
  sheet.className = "pdx-sheet";
  const act = actOf(node);
  const kind = (d.kind_label || (d.ability_type || "").replace(/_/g, " ")).trim();
  sheet.innerHTML = `<div class="ps-card card-pop">
      <div class="cp-name">${esc(node.querySelector(".card-name") ? node.querySelector(".card-name").textContent : name)}</div>
      <div class="cp-kind">${esc(kind)}</div>
      <div class="cp-desc">${d.description || "--"}</div>
      <div class="cp-stats"><span class="cp-stat">${d.gold_cost != null ? d.gold_cost + " gold" : ""}</span>
        <span class="cp-stat">Deliver ${d.delivery_century != null ? roman(d.delivery_century) : "?"}</span>
        <span class="cp-stat">Recycle ${d.recycle_value != null ? d.recycle_value : "?"}</span></div>
    </div>
    <div class="ps-keys">${act ? `<button type="button" class="ps-act">${esc(act)}</button>` : `<p class="ps-note">Not yours to take now.</p>`}
      <button type="button" class="ps-close">Back</button></div>`;
  sheet.querySelector(".ps-close").addEventListener("click", (e) => { e.stopPropagation(); closeSheet(); });
  const a = sheet.querySelector(".ps-act");
  if (a) a.addEventListener("click", (e) => {
    e.stopPropagation();
    const live = [...document.querySelectorAll("#market-zone .card")].find((n) => n.dataset.name === sheetFor.name);
    closeSheet();
    if (!live) return;
    letThrough = true;
    try { live.click(); } finally { letThrough = false; }
  });
  document.body.appendChild(sheet);
  node.classList.add("pdx-looked");
  requestAnimationFrame(() => sheet && sheet.classList.add("on"));
}
function closeSheet() {
  if (!sheet) return;
  sheet.remove(); sheet = null; sheetFor = null;
  document.querySelectorAll(".pdx-looked").forEach((n) => n.classList.remove("pdx-looked"));
}
function wireSheet() {
  document.addEventListener("click", (e) => {
    if (!on() || letThrough) return;
    const card = e.target && e.target.closest && e.target.closest("#market-zone .card");
    if (card) { e.preventDefault(); e.stopImmediatePropagation(); openSheet(card); return; }
    if (sheet && !(e.target.closest && e.target.closest(".pdx-sheet, #pdx-mrail, #pdx-mcol"))) closeSheet();
  }, true);
}

/* ── the rail's action key: the one answer that has no big key of its own on a phone ── */
function paintAction() {
  if (!rail) return;
  const a = rail.querySelector(".mr-act");
  const g = game(), k = g && g.pendingReq ? g.pendingReq.kind : null;
  let label = null, fn = null;
  if (k === "market") {
    const sign = [...document.querySelectorAll("#market-zone .market-side-signs > *")].find((n) => /^\s*Pass\s*$/i.test(n.textContent));
    if (sign) { label = "Pass"; fn = () => sign.click(); }
  } else if (k === "deliver" && g._deliverState) {
    // the Delivery: done with what is filed (nothing filed: nothing delivered this Hour)
    const n = g._deliverState.chosen.size;
    label = n ? "Done" : "Skip"; fn = () => { try { g._finishDeliver(); } catch (e) {} };
  } else if (k === "activation" && g._actStaged) {
    // the Activation phase: the items tapped in the case are fired with this key (or none: pass)
    const n = g._actStaged.length;
    label = n ? `Fire ${n}` : "Pass"; fn = () => { try { g._passActivation(); } catch (e) {} };
  } else if (k === "travel" && view === "chart") {
    const anchor = document.querySelector("#timeline-rail .cc-anchor, #timeline-rail .sea-anchor, #timeline-rail .cm-anchor");
    if (anchor) { label = "Stay"; fn = () => anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); }
  }
  a.hidden = !label;
  if (label && a.textContent !== label) a.textContent = label;
  a._do = fn;
}

/* ── THE LIFETHREAD round the whole screen: its length is his life, in his colour; it
      dims and frays as it runs out and pulses red at 6 or less. fx.js draws the -N / +N
      tick at the thread's end (window.__pdxLifeAnchor). ── */
let life = null, lifeMax = 12, lifeNow = null;
function buildLife() {
  life = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  life.id = "pdx-life"; life.setAttribute("aria-hidden", "true");
  life.innerHTML = `<path class="lt-bed"/><path class="lt-thread"/><g class="lt-fray"><path/><path/><path/></g>`;
  document.body.appendChild(life);
}
function lifePath() {
  const ins = insets(), W = innerWidth, H = innerHeight, m = 2.5;
  const x0 = ins.l + m, y0 = ins.t + m, x1 = W - ins.r - m, y1 = H - ins.b - m;
  // from the top-left corner, round the screen clockwise
  return `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`;
}
function paintLife() {
  if (!life) buildLife();
  const g = game(), me = g && g._self ? g._self() : null;
  if (!me || me.energy == null) { life.style.display = "none"; return; }
  life.style.display = "";
  const e = Math.max(0, me.energy);
  lifeMax = Math.max(lifeMax, e, 12);
  const d = lifePath();
  const th = life.querySelector(".lt-thread"), bed = life.querySelector(".lt-bed");
  if (th.getAttribute("d") !== d) { th.setAttribute("d", d); bed.setAttribute("d", d); }
  const P = th.getTotalLength(), f = e / lifeMax, len = P * f;
  th.style.strokeDasharray = `${len.toFixed(1)} ${(P + 10).toFixed(1)}`;
  life.style.setProperty("--lt-glow", (0.45 + 0.55 * f).toFixed(2));
  life.classList.toggle("lt-critical", e <= 6);
  life.classList.toggle("lt-dead", e <= 0);
  // the frayed end: three loose fibres where the thread stops
  const end = len > 1 ? th.getPointAtLength(Math.max(0, len - 1)) : th.getPointAtLength(0);
  const fray = life.querySelectorAll(".lt-fray path");
  const fr = [[5, 6], [8, -3], [3, -8]];
  fray.forEach((p, i) => p.setAttribute("d", `M ${end.x} ${end.y} q ${fr[i][0]} ${fr[i][1] / 2} ${fr[i][0] * 1.4} ${fr[i][1]}`));
  life._end = end;
  if (lifeNow !== e) {
    lifeNow = e;
    const n = col && col.querySelector(".mc-life b");
    if (n) n.textContent = String(e);
    const cells = col && col.querySelector(".mc-cells");
    if (cells) { let h = ""; for (let i = 0; i < Math.max(12, e); i++) h += `<i class="${i < e ? "on" : ""}"></i>`; cells.innerHTML = h; }
    if (col) col.querySelector(".mc-life").classList.toggle("mc-low", e <= 6);
  }
}
window.__pdxLifeAnchor = () => (on() && life && life._end ? { x: life._end.x, y: life._end.y } : null);

/* ── THE DIRECTION PING (the owner, 27/09: no forced movement): nothing turns the view but
      his own key. When the game or the tutorial needs him elsewhere, the rail key of that
      scene pulses with an inked badge naming what waits there, and HELA's line names it. ── */
let pingView = null;
const SCENE_VIEW = { main: "machine", timeline: "chart", market: "merchant", drawer: "records" };
window.__pdxScenePing = (scene) => { const v = SCENE_VIEW[scene]; if (v && v !== view) { pingView = v; paintRail(); } };
const PING_WORD = { allocate: "DICE", matrix_buff: "+1", travel: "SAIL", merchant_century: "AIM", market: "TRADE", steal_target: "STEAL",
  destroy_target: "AIM", secret_deal: "DEAL", deliver: "FILE", reward_category: "SIGN", recycle: "PICK", capacity: "PICK", activation: "FIRE", target: "AIM" };
function wantedView() {
  const g = game(), req = g && g.pendingReq;
  if (!req) return null;
  const k = req.kind, o = req.options || {};
  if (k === "allocate" || k === "matrix_buff") return "machine";
  if (k === "travel" || k === "merchant_century") return "chart";
  if (k === "steal_target" || k === "destroy_target") {
    // the cards to pick lie where they are: on the Merchant's shelf, or on a rival's file (the table)
    const z = (o.candidates || []).map((c) => c && c.zone);
    return z.includes("market") || z.includes("secret") ? "merchant" : "machine";
  }
  if (k === "market" || k === "secret_deal") return "merchant";
  if (k === "reward_category") return "records";               // the contracts drawer holds the three kinds
  if (k === "deliver" || k === "recycle" || k === "capacity" || k === "activation") return "case";
  if (k === "target") {
    if (o.target_type === "century") return "chart";
    if (o.target_type === "traveler") return "machine";      // the rivals' files lie there
    const z = (o.candidates || []).map((c) => c && c.zone);
    if (z.includes("market") || z.includes("secret")) return "merchant";
    return "case";
  }
  return null;
}
function wireRailCapture() {
  window.addEventListener("click", (e) => {
    if (!on()) return;
    const b = e.target && e.target.closest && e.target.closest("#pdx-mrail button[data-view]");
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    manualAt = performance.now();
    // the SECOND tap on the Merchant's key, once his page is up, opens the Secret Market (and
    // back): decided here, in the one handler, from the page already on screen
    if (b.dataset.view === "merchant" && view === "merchant" && !swapping) { secretOn = !secretOn; if (calm()) land("merchant"); else swapTo("merchant"); return; }
    go(b.dataset.view);
  }, true);
}

/* the inked thread from her caption in the column to what she rings in the view */
let tutLink = null;
function paintTutLink() {
  const c = document.getElementById("tut-callout");
  const ring = [...document.querySelectorAll(".tut-ring")].map((r) => r.getBoundingClientRect())
    .find((r) => r.width > 4 && r.left + r.width / 2 > stage.x && r.left + r.width / 2 < stage.x + stage.w);
  const show = !!(on() && c && c.classList.contains("on") && ring && !swapping);
  if (!tutLink) {
    tutLink = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tutLink.id = "pdx-tutlink"; tutLink.setAttribute("aria-hidden", "true");
    tutLink.innerHTML = `<path class="tl-under"/><path class="tl-ink"/><circle r="4"/>`;
    document.body.appendChild(tutLink);
  }
  tutLink.classList.toggle("on", show);
  if (!show) return;
  const cr = c.getBoundingClientRect();
  const x0 = cr.right, y0 = cr.top + Math.min(cr.height / 2, 40);
  // to the ring's nearest side, curving a little like a pen line
  const x1 = ring.left < x0 ? ring.left + ring.width / 2 : ring.left, y1 = ring.top + ring.height / 2;
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 24;
  const d = `M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`;
  tutLink.querySelectorAll("path").forEach((p) => p.setAttribute("d", d));
  const dot = tutLink.querySelector("circle"); dot.setAttribute("cx", x1); dot.setAttribute("cy", y1);
}
/* ══ THE BIN (the owner's idea): bottom right of the CASE page. A card is picked up with a tap
   (or dragged by a finger) and put in the bin: it is recycled for energy. In a Delivery phase,
   while he holds a relic that can be filed here, the bin is a DRAWER: the same tap files it
   (no change of scene). Never by accident: a card must be picked up first. ══ */
let bin = null, binDragEat = 0;
function buildBin() {
  bin = document.createElement("button");
  bin.type = "button"; bin.id = "pdx-bin";
  bin.className = "mr-bin";
  bin.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 10h16l-1.6 17H9.6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M6 10h20M13 6h6v4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M13 14v9M16 14v9M19 14v9" stroke="currentColor" stroke-width="1.8"/></svg><span class="pb-word"></span><span class="pb-sub"></span>`;
  // it lives in the rail's action slot, where PASS sits (the owner): they share that slot,
  // stacked when both apply; nothing of it is ever over the case or the cat
  if (rail) rail.insertBefore(bin, rail.querySelector(".mr-act")); else document.body.appendChild(bin);
}
// ON A PHONE A CARD OF THE CASE IS PICKED, NOT CARRIED: a tap marks it (its own lift), and the
// bin (or the drawer) acts on it. The game's carry (a card following the pointer until the next
// click) was dropped by the next re-render of the case during a decision, so a picked card went
// back before the bin was reached.
let picked = null;
function pick(name) {
  picked = picked === name ? null : name;
  document.querySelectorAll("#rucksack-zone .ruck-card").forEach((n) => n.classList.toggle("pdx-picked", n.dataset.name === picked));
  paintBin();
}
function binState() {
  const g = game(); if (!g) return { mode: "idle" };
  const me0 = g._self && g._self();
  if (picked && !(me0 && (me0.hand || me0.equipment || []).some((x) => x.name === picked))) picked = null;
  const c = picked ? { name: picked } : null, st = g._deliverState;
  if (c && st && st.names && st.names.has(c.name)) return { mode: "file", name: c.name };
  if (c) {
    const me = g._self && g._self();
    const card = me && (me.hand || me.equipment || []).find((x) => x.name === c.name);
    return { mode: "recycle", name: c.name, gain: card ? card.recycle_value : null };
  }
  return { mode: st && st.names && st.names.size ? "drawer" : "idle" };
}
// HER COLUMN'S TOOLS (the owner: "features we lack space for could live there"): what the page
// on screen needs, under her line: the gold and the Secret Market's hint at the Merchant; the
// bin (or drawer) and the tickets in the case
let lastExtra = "";
function paintExtra() {
  if (!col) return;
  const ex = col.querySelector(".mc-extra");
  const g = game(), me = g && g._self ? g._self() : null;
  let sig = view, html = "";
  if (view === "merchant" && me) {
    html = `<div class="mx-gold"><i></i><span>YOUR GOLD</span><b>${me.gold}</b></div>`
      + `<p class="mx-hint">${secretOn ? "Tap <b>SHELF</b> on the right for his shelf alone." : "Tap <b>SECRET</b> on the right: his shelf and the Secret Market together."}</p>`;
    sig += me.gold + ":" + secretOn;
  } else if (view === "case") {
    const n = ownedTickets().reduce((a, t) => a + t.count, 0);
    html = n ? `<button type="button" class="mx-tickets">TICKETS <b>\u00d7${n}</b></button>` : "";
    sig += ":" + n;
  }
  if (sig !== lastExtra) {
    lastExtra = sig;
    ex.innerHTML = html;
    const tk = ex.querySelector(".mx-tickets");
    if (tk) tk.addEventListener("click", (e) => { e.stopPropagation(); ticketSheet(null); });
  }
  ex.hidden = !html;
}
function paintBin() {
  if (!bin) buildBin();
  document.querySelectorAll("#rucksack-zone .ruck-card").forEach((n) => n.classList.toggle("pdx-picked", n.dataset.name === picked));
  const g = game(), me = g && g._self ? g._self() : null;
  const has = !!(me && (me.hand || me.equipment || []).length);
  if (rail && bin.parentElement !== rail) rail.insertBefore(bin, rail.querySelector(".mr-act"));
  bin.hidden = !(on() && view === "case" && has);
  if (bin.hidden) return;
  const b = binState();
  bin.dataset.mode = b.mode;
  const word = { idle: "BIN", drawer: "DRAWER", file: "FILE IT", recycle: "RECYCLE" }[b.mode];
  const sub = b.mode === "recycle" ? (b.gain != null ? `+${b.gain} energy` : "") : b.mode === "file" ? "deliver here" : b.mode === "drawer" ? "tap a relic, then here" : "tap a card, then here";
  if (bin.querySelector(".pb-word").textContent !== word) bin.querySelector(".pb-word").textContent = word;
  if (bin.querySelector(".pb-sub").textContent !== sub) bin.querySelector(".pb-sub").textContent = sub;
}
function binAct() {
  const g = game(); if (!g) return false;
  const b = binState();
  if (b.mode === "file") { picked = null; g._fileDeliver(b.name); return true; }
  if (b.mode === "recycle") { picked = null; g.recycleCard(b.name); return true; }
  return false;
}
function overBin(x, y) {
  if (!bin || bin.hidden) return false;
  const r = bin.getBoundingClientRect();
  return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8;
}
function wireBin() {
  window.addEventListener("click", (e) => {
    if (!on() || view !== "case") return;
    const c = e.target.closest && e.target.closest("#rucksack-zone .ruck-card");
    if (!c || c.classList.contains("act-ready") || c.classList.contains("act-used")) return;
    if (e.target.closest(".ruck-recycle")) return;
    e.preventDefault(); e.stopPropagation();
    if (performance.now() < binDragEat) return;
    pick(c.dataset.name);
  }, true);
  // the bin's tap is taken before the game's own "a click anywhere drops the carried card"
  window.addEventListener("click", (e) => {
    if (!on() || !bin || bin.hidden) return;
    if (!(e.target.closest && e.target.closest("#pdx-bin"))) return;
    e.preventDefault(); e.stopPropagation();
    binAct(); paintBin();
  }, true);
  // a finger drags a card of the case onto the bin
  let dg = null;
  window.addEventListener("pointerdown", (e) => {
    if (!on() || view !== "case" || e.pointerType !== "touch") return;
    const c = e.target.closest && e.target.closest("#rucksack-zone .ruck-card");
    if (!c) return;
    dg = { c, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  }, true);
  window.addEventListener("pointermove", (e) => {
    if (!dg || e.pointerId !== dg.id) return;
    if (!dg.moved) {
      if (Math.hypot(e.clientX - dg.x, e.clientY - dg.y) < 10) return;
      dg.moved = true;
      const g = game();
      if (picked !== dg.c.dataset.name) pick(dg.c.dataset.name);   // picked, as a tap would
    }
    e.preventDefault();
    try { window.dispatchEvent(new MouseEvent("mousemove", { clientX: e.clientX, clientY: e.clientY, bubbles: true })); } catch (err) {}
    if (bin) bin.classList.toggle("pb-hot", overBin(e.clientX, e.clientY));
  }, { capture: true, passive: false });
  const up = (e) => {
    if (!dg || e.pointerId !== dg.id) return;
    const d = dg; dg = null;
    if (bin) bin.classList.remove("pb-hot");
    if (!d.moved) return;
    binDragEat = performance.now() + 400;
    if (overBin(e.clientX, e.clientY)) binAct();
    else pick(null);                                       // let go elsewhere: back in the case
    paintBin();
  };
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", up, true);
}

/* ══ DELIVERY IN THE RECORDS (the owner): during a Delivery, the Records page shows the relics
   he carries for this century as manila folders on the cabinet; a tap files one there, no
   carrying between scenes. The bin-as-drawer in the case does the same. ══ */
let rtray = null, lastTray = "";
function paintRecordsTray() {
  const g = game(), st = g && g._deliverState;
  const show = on() && view === "records" && !!st && st.names && st.names.size > 0;
  if (!rtray) {
    rtray = document.createElement("div"); rtray.id = "pdx-rtray";
    rtray.addEventListener("click", (e) => {
      const f = e.target.closest && e.target.closest(".rt-folder:not(.rt-done)");
      if (!f) return;
      e.stopPropagation(); e.preventDefault();
      const gg = game(); if (gg && gg._fileDeliver) gg._fileDeliver(f.dataset.name);
      lastTray = ""; paintRecordsTray();
    }, true);
    document.body.appendChild(rtray);
  }
  rtray.hidden = !show;
  if (!show) return;
  const me = g._self && g._self();
  const cards = me ? (me.hand || me.equipment || []) : [];
  const names = [...st.names];
  const sig = names.join("|") + "#" + [...st.chosen].join("|") + "#" + st.century;
  if (sig !== lastTray) {
    lastTray = sig;
    rtray.innerHTML = `<p class="rt-head">In your case, for century <b>${roman(st.century)}</b>: tap a folder to file it</p><div class="rt-row">`
      + names.map((n) => { const c = cards.find((x) => x.name === n) || { name: n }; const done = st.chosen.has(n);
        return `<button type="button" class="rt-folder${done ? " rt-done" : ""}" data-name="${esc(n)}"><i class="rt-tab">${roman(c.delivery_century != null ? c.delivery_century : st.century)}</i><b>${esc(c.name)}</b><span>${done ? "FILED" : "tap to file"}</span></button>`; }).join("")
      + `</div>`;
  }
  rtray.style.left = (stage.x + 10) + "px"; rtray.style.maxWidth = (stage.w - 20) + "px"; rtray.style.width = "auto";
  rtray.style.bottom = Math.max(10, innerHeight - (stage.y + stage.h) + 10) + "px";
}

/* ══ VOUCHERS on a phone: a ticket is used where it lies (the case) or from the pip-boy's
   ticket slot, never carried between scenes. A small inked sheet asks once. ══ */
const TICKETS = [["solo", "SOLO PHASE", "an extra generators hour"], ["market", "MARKET WINDOW", "the Merchant sees you, wherever you are"], ["item", "ITEM WINDOW", "an extra activation window"]];
function ownedTickets() {
  const g = game(), me = g && g._self ? g._self() : null;
  if (!me) return [];
  return TICKETS.map(([k, n, d]) => ({ k, n, d, count: me[k + "_voucher"] || 0 })).filter((t) => t.count > 0);
}
function ticketSheet(only) {
  closeSheet();
  const list = ownedTickets().filter((t) => !only || t.k === only);
  if (!list.length) return;
  sheet = document.createElement("div");
  sheet.className = "pdx-sheet pdx-tickets";
  sheet.innerHTML = `<div class="ps-card card-pop"><div class="cp-name">C.R.O.N.O.S. TICKETS</div><div class="cp-kind">ADMIT ONE, used at once, it takes effect at the end of this phase</div>`
    + list.map((t) => `<button type="button" class="pt-ticket" data-k="${t.k}"><b>${esc(t.n)}</b><span>${esc(t.d)}</span><i>×${t.count}</i></button>`).join("")
    + `</div><div class="ps-keys"><button type="button" class="ps-close">Back</button></div>`;
  sheet.querySelector(".ps-close").addEventListener("click", (e) => { e.stopPropagation(); closeSheet(); });
  sheet.querySelectorAll(".pt-ticket").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const g = game(); closeSheet();
    if (g && g.useVoucher) g.useVoucher(b.dataset.k);
  }));
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet && sheet.classList.add("on"));
}
function wireTickets() {
  window.addEventListener("click", (e) => {
    if (!on()) return;
    const v = e.target.closest && e.target.closest("#rucksack-zone .ruck-voucher[data-voucher]");
    const slot = e.target.closest && e.target.closest("#ticket-drop, #pdx-tslot");
    if (!v && !slot) return;
    const kind = v && v.dataset.voucher;
    if (kind && kind.indexOf("lot:") === 0) return;         // the Auction's lot tickets keep their own path
    e.preventDefault(); e.stopPropagation();
    ticketSheet(kind || null);
  }, true);
}
// the pip-boy's ticket slot, lit and tappable on a phone while he holds tickets
let tslot = null;
function paintTicketSlot() {
  const td = document.getElementById("ticket-drop");
  if (!td) return;
  const n = ownedTickets().reduce((a, t) => a + t.count, 0);
  td.classList.toggle("pdx-has-tickets", on() && n > 0);
  td.dataset.n = n ? String(n) : "";
}

/* ══ THE SECRET MARKET: in the Merchant's page his key turns into the Secret Market's; a tap
   frames the curtain (and its card), another tap the shelf again ══ */
let secretOn = false;
function wireSecretKey() {}   // (the Secret Market's key is decided in wireRailCapture)
function paintSecretKey() {
  if (!rail) return;
  const b = rail.querySelector('button[data-view="merchant"]');
  if (!b) return;
  const inM = view === "merchant";
  if (!inM) secretOn = false;
  // in the Merchant's page his key shows the SECRET MARKET's own icon (the curtain and its
  // lock): a second tap there opens it; inside it, the key shows the Merchant again (the shelf)
  const mode = !inM ? "merchant" : secretOn ? "shelf" : "secret";
  if (b.dataset.mode === mode) return;
  b.dataset.mode = mode;
  const icon = mode === "secret" ? ICON.secret : ICON.merchant;
  const label = { merchant: "Merchant", secret: "Secret", shelf: "Shelf" }[mode];
  const badge = b.querySelector(".mr-ping");
  b.innerHTML = icon + `<span>${label}</span>`;
  if (badge) b.appendChild(badge);
  b.classList.toggle("mr-secret", mode === "secret");
  b.setAttribute("aria-label", mode === "secret" ? "Open the Secret Market" : mode === "shelf" ? "Back to the Merchant's shelf" : "The Merchant");
}

/* ══ GOLD at the Merchant ══ */
let goldEl = null;
function paintGold() {
  if (!goldEl) {
    goldEl = document.createElement("div"); goldEl.id = "pdx-gold";
    goldEl.innerHTML = `<i></i><span class="pg-h">YOUR GOLD</span><b></b>`;
    document.body.appendChild(goldEl);
  }
  const g = game(), me = g && g._self ? g._self() : null;
  goldEl.hidden = !(on() && view === "merchant" && me);
  if (goldEl.hidden) return;
  const t = String(me.gold);
  if (goldEl.querySelector("b").textContent !== t) goldEl.querySelector("b").textContent = t;
  goldEl.style.left = (stage.x + 10) + "px"; goldEl.style.top = (stage.y + 10) + "px";
}

/* ══ HELA's notes (the held "?") on a phone: each note beside its subject, kept on the stage
   and off each other; the notes of subjects on another page wait ══ */
function placeNotes(list) {
  if (!on()) return false;
  const placed = [];
  const inStage = (A) => A.right > stage.x && A.left < stage.x + stage.w && A.bottom > stage.y && A.top < stage.y + stage.h;
  list.sort((a, b) => a.anchor.top - b.anchor.top);
  for (const it of list) {
    const A = it.anchor;
    if (!inStage(A)) { it.el.hidden = true; continue; }
    const w = Math.min(it.el.offsetWidth || 200, stage.w * 0.46), h = it.el.offsetHeight || 60;
    it.el.style.maxWidth = w + "px";
    const cands = [
      { x: A.right + 10, y: A.top }, { x: A.left - w - 10, y: A.top },
      { x: A.left, y: A.bottom + 8 }, { x: A.left, y: A.top - h - 8 },
    ];
    let best = null;
    for (const c of cands) {
      const x = Math.max(stage.x + 6, Math.min(stage.x + stage.w - w - 6, c.x));
      const y = Math.max(stage.y + 6, Math.min(stage.y + stage.h - h - 6, c.y));
      const r = { left: x, top: y, right: x + w, bottom: y + h };
      const hit = placed.some((p) => !(r.right < p.left || r.left > p.right || r.bottom < p.top || r.top > p.bottom));
      if (!hit) { best = r; break; }
    }
    if (!best) { it.el.hidden = true; continue; }
    it.el.style.left = best.left + "px"; it.el.style.top = best.top + "px";
    placed.push(best);
  }
  return true;
}
// a tap on "?" shows her notes (a tap again, or anywhere, puts them away); in the tutorial the
// tap keeps opening the tips her lesson expects
function wireNotesKey() {
  window.addEventListener("click", (e) => {
    if (!on() || document.body.classList.contains("tut")) return;
    const k = e.target.closest && e.target.closest("#pdx-tabkey, .pdx-helpkey");
    const H = window.__pdxHelp;
    if (!H || !H.hold) return;
    if (k) { e.preventDefault(); e.stopImmediatePropagation(); H.hold(!H.isHeld()); return; }
    if (H.isHeld() && !(e.target.closest && e.target.closest("#pdx-help"))) H.hold(false);
  }, true);
}

/* ── mount / unmount with the table ── */
let mounted = false;
function wanted() {
  const sg = document.getElementById("screen-game");
  return D.classList.contains("pdx-touch") && document.body.classList.contains("cabin-on")
    && !!(sg && sg.classList.contains("is-active"));
}
function sync() {
  const w = wanted();
  if (w && !mounted) {
    mounted = true;
    if (!col) build();
    D.classList.add("pdx-m-on");
    layout();
    view = "machine";
    go(followScene(), false);
    setTimeout(nudgeSeals, 400); setTimeout(nudgeSeals, 1500);
    catHome(true);
    if (window.__pdxHelp) window.__pdxHelp.notePlacer = placeNotes;
    paintCol();
  } else if (!w && mounted) {
    mounted = false;
    D.classList.remove("pdx-m-on", "pdx-file-out");
    dockTabKey(false);
    closeFiles();
    files().forEach((f) => f.classList.remove("pdx-piled"));
    catHome(false);
    if (window.__pdxHelp && window.__pdxHelp.notePlacer === placeNotes) window.__pdxHelp.notePlacer = null;
  }
}
function followScene() {
  const g = game(), sc = g && g.camera ? g.camera.scene : "main";
  return sc === "market" ? "merchant" : sc === "drawer" ? "records" : "machine";
}

function start() {
  if (!D.classList.contains("pdx-touch")) return;   // a desktop: nothing
  wireFiles();
  wireSheet();
  wireRailCapture();
  wireBin(); wireTickets(); wireSecretKey(); wireNotesKey();
  const obs = new MutationObserver(sync);
  obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  const sg = document.getElementById("screen-game");
  if (sg) obs.observe(sg, { attributes: true, attributeFilter: ["class"] });
  const cam = document.getElementById("cam");
  const onResize = () => { if (on()) { layout(); frame(view, false); pile(); reframeSoon(); } };
  addEventListener("resize", onResize);
  if (window.visualViewport) visualViewport.addEventListener("resize", onResize);
  addEventListener("orientationchange", () => setTimeout(onResize, 60));
  // the column reads the game's own readouts; light, and only while the table is on
  let raf = 0;
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (on()) { paintRail(); paintSecretKey(); paintCol(); paintAction(); paintLife(); paintTutLink(); paintExtra(); paintRecordsTray(); paintBin(); paintGold(); paintTicketSlot(); } }); };
  setInterval(() => {
    if (!on()) { if (life) life.style.display = "none"; return; }
    // the tutorial starting or ending moves the stage's top edge
    if (D.classList.contains("pdx-m-tut") !== document.body.classList.contains("tut")) { layout(); frame(view, true); }
    soon(); if (!outFile) pile();
  }, 400);
  sync();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

window.__pdxMobile = { go, view: () => view, frame: (v) => frame(v || view, false), files: pile };
