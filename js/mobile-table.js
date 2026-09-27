/* =========================================================================
   mobile-table.js, THE WORKSTATION ON A PHONE (phase 2)
   -------------------------------------------------------------------------
   Runs only on touch (js/touch.js: html.pdx-touch; phones and tablets, the
   tablet with a wider column and more of the desk round each view) while the
   table is on screen (body.cabin-on). A desktop never gets past start().

   NOTHING IS REDRAWN. The phone looks at the same table through a closer
   camera: the real plane (the desk, the chart, the wagon, the records) and
   the real pip-boy (#hull) are framed by ONE transform, screen = O + S * p,
   so the device lies on the desk and every view is a region of the same
   workstation. Changing view is the camera turning over that one plane (an
   eased pan, transform only), never a cut:

        MERCHANT (the wagon, above the desk)
     RECORDS  <-  MACHINE (the pip-boy on the desk, the police files and
                  the cat at its right)  ->  CHART (the desk's right half)

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

// the views, in the workstation's own geography (swipes follow it)
// (the plane: the paperwork desk with the records cabinet and HELA's core at the left,
//  the briefcase at the top of the main desk, the pip-boy below it, the chart at the right,
//  the Merchant's wagon above them all)
const VIEWS = {
  machine:  { scene: "main",   label: "Machine",  rail: true, left: "brain", right: "chart", up: "case" },
  chart:    { scene: "main",   label: "Chart",    rail: true, left: "machine", up: "merchant" },
  merchant: { scene: "market", label: "Merchant", rail: true, down: "case" },
  case:     { scene: "main",   label: "Case",     rail: true, down: "machine", left: "records", right: "chart", up: "merchant" },
  records:  { scene: "drawer", label: "Records",  rail: true, right: "case", down: "brain", up: "merchant" },
  brain:    { scene: "drawer", label: "HELA",     rail: false, up: "records", right: "machine" },
};
// where each view looks, on the plane (the hull's plane is the same 2133x1200 box)
const DEVICE = { x: 132, y: 792, w: 520, h: 408 };     // the pip-boy with the sleeve's handwheel
// the rivals' files lie in a row on the desk above the glove (the hand rests on their lower
// halves, as on a real desk); the frame's right edge is the row's right edge
const PILE = { x0: 590, x1: 872, y: 764, k: 0.62 };
const CASE = { x: -30, y: -12, w: 990, h: 612 };       // the open briefcase, the cat beside it
const CAT_AT = { x: 862, y: 452, size: 14 };          // she curls on the desk at the case's right (her only place on a phone)

const on = () => D.classList.contains("pdx-m-on");
const game = () => window.__game || null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let view = "machine";
let col = null, rail = null, stage = { x: 0, y: 0, w: 0, h: 0 };
let S = 1, O = { x: 0, y: 0 };
let zoom = 1, zc = null;                // the chart's own pinch zoom and its centre (plane px)
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
  case: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="10" width="26" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M11 10V7h10v3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 17h26" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="15" width="5" height="4" rx="1" fill="currentColor"/></svg>`,
  records: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="4" width="22" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 12h22M5 20h22" stroke="currentColor" stroke-width="2"/><rect x="13" y="7" width="6" height="2.4" rx="1" fill="currentColor"/><rect x="13" y="15" width="6" height="2.4" rx="1" fill="currentColor"/><rect x="13" y="23" width="6" height="2.4" rx="1" fill="currentColor"/></svg>`,
};

function build() {
  col = document.createElement("aside");
  col.id = "pdx-mcol";
  col.setAttribute("aria-label", "HELA and the log");
  col.innerHTML = `
    <header class="mc-head">
      <span class="mc-eye">${EYE}</span>
      <span class="mc-id"><b>HELA</b><span class="mc-hour"></span></span>
      <span class="mc-phases" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span class="mc-life" title="Your life (energy)">LIFE <b>-</b></span>
      <span class="mc-tools">
        <button type="button" class="mc-btn pdx-helpkey" aria-label="Tips; press and hold for the table's reference"><b>?</b></button>
        <button type="button" class="mc-btn mc-fs" aria-label="Play full screen">${ICON.fs}</button>
        <button type="button" class="mc-btn mc-gear" aria-label="Settings">${ICON.gear}</button>
      </span>
    </header>
    <div class="mc-says" aria-live="polite"></div>
    <div class="mc-log"><p class="mc-log-h">LOG</p><ol class="mc-log-l"></ol></div>`;
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
    const b = e.target.closest && e.target.closest("button[data-view]");
    if (!b) return;
    e.stopPropagation();
    manualAt = performance.now();
    go(b.dataset.view);
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
  stage = { x: colW, y: ins.t, w: W - colW - railW, h: H - ins.t - ins.b };
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
    const r = planeRectOf(rail0);
    return r ? { x: r.x + 4, y: r.y + 60, w: Math.min(r.w, PLANE_W - r.x) - 8, h: Math.min(r.h, PLANE_H - r.y) - 64 } : { x: 1066, y: 60, w: 1060, h: 1130 };
  }
  if (v === "merchant") {
    // the shelf, its wooden signs and the Secret Market's curtain, framed close: the cards
    // are read here (the wagon's arch around them is cropped at the edges)
    const u = unionRect(["#market-zone .market-row", "#market-zone .market-side-signs", "#market-zone .secret-stage", "#market-sign"], 36);
    return u || planeRectOf(document.getElementById("market-zone")) || { x: 300, y: -560, w: 1100, h: 560 };
  }
  if (v === "records") return planeRectOf(document.getElementById("drawer-zone")) || { x: -1066, y: 0, w: 1066, h: 1200 };
  return { x: 0, y: 0, w: PLANE_W, h: PLANE_H };
}
function paceMs() {
  const g = game();
  let k = 1;
  try { k = g && g._scale ? g._scale() : 1; } catch (e) {}
  return Math.round(430 * Math.max(0.6, Math.min(1.6, k)));
}
const calm = () => !!(window.__pdxCalm || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
function frame(v, animate) {
  const f = frameRect(v);
  const base = Math.min(stage.w / f.w, stage.h / f.h);
  if (v === "chart" && zoom > 1.001) {
    // the chart, pinched closer: the centre stays inside the sheet
    S = base * zoom;
    const hw = stage.w / 2 / S, hh = stage.h / 2 / S;
    const c = zc || { x: f.x + f.w / 2, y: f.y + f.h / 2 };
    c.x = Math.max(f.x + Math.min(hw, f.w / 2), Math.min(f.x + f.w - Math.min(hw, f.w / 2), c.x));
    c.y = Math.max(f.y + Math.min(hh, f.h / 2), Math.min(f.y + f.h - Math.min(hh, f.h / 2), c.y));
    zc = c;
    O.x = stage.x + stage.w / 2 - c.x * S;
    O.y = stage.y + stage.h / 2 - c.y * S;
  } else {
  S = base;
  O.x = stage.x + (stage.w - f.w * S) / 2 - f.x * S;
  O.y = f.bottom ? stage.y + stage.h - (f.y + f.h) * S : stage.y + (stage.h - f.h * S) / 2 - f.y * S;
  }
  D.classList.toggle("pdx-zoomed", v === "chart" && zoom > 1.001);
  D.style.setProperty("--pdx-dur", animate && !calm() ? paceMs() + "ms" : "0ms");
  D.style.setProperty("--pdx-s", S.toFixed(5));
  D.style.setProperty("--pdx-ox", O.x.toFixed(2) + "px");
  D.style.setProperty("--pdx-oy", O.y.toFixed(2) + "px");
  D.dataset.pdxView = v;
}

/* ── turning the head: the view changes, the real camera follows its scene ── */
function go(v, animate = true) {
  if (!VIEWS[v]) return;
  if (v !== view) prevView = view;
  view = v;
  if (v !== "chart") { zoom = 1; zc = null; }
  closeSheet();
  const g = game(), cam = g && g.camera;
  const want = VIEWS[v].scene;
  if (cam && cam.scene !== want) {
    try {
      cam._engage && cam._engage();
      cam.setScene(want);
      cam._manualUntil = (cam._now ? cam._now() : performance.now()) + 6000;
      g.updateBeacon && g.updateBeacon();
      g._onSceneArrive && g._onSceneArrive(want);
    } catch (e) {}
  }
  closeFiles();
  frame(v, animate);
  paintRail();
  requestAnimationFrame(pile);
}
// the camera turned without the rail (HELA's arrow, a key, the tutorial): follow it
function followCamera() {
  const g = game(), sc = g && g.camera ? g.camera.scene : "main";
  if (VIEWS[view].scene === sc || (SCENE_VIEWS[sc] || []).includes(view)) return;
  go(sc === "market" ? "merchant" : sc === "drawer" ? "records" : "machine");
}
// a scene of the real camera holds more than one phone view
const SCENE_VIEWS = { main: ["machine", "chart", "case"], market: ["merchant"], drawer: ["records", "brain"] };

/* ── the rivals' police files, a pile on the desk at the device's right ── */
function files() {
  return [...document.querySelectorAll("#players-zone .pcard.cfolio")];
}
let outFile = null;
function pile() {
  if (!on()) return;
  const zone = document.getElementById("players-zone");
  const zr = planeRectOf(zone);
  if (!zr) return;
  const list = files().filter((f) => f !== outFile);
  if (!list.length) return;
  const w0 = list[0].offsetWidth || 250;
  const k = PILE.k, w = w0 * k, n = list.length, room = PILE.x1 - PILE.x0 - w;
  const step = n > 1 ? Math.min(w * 0.86, room / (n - 1)) : 0;
  const x0 = n > 1 ? PILE.x0 : PILE.x0 + room / 2;
  list.forEach((f, i) => {
    f.classList.add("pdx-piled");
    f.style.setProperty("--pdx-fx", (x0 + i * step - zr.x).toFixed(1) + "px");
    f.style.setProperty("--pdx-fy", (PILE.y + (i % 2) * 12 - zr.y).toFixed(1) + "px");
    f.style.setProperty("--pdx-fk", k.toFixed(3));
    f.style.setProperty("--pdx-fz", String(20 + i));
  });
}
// a tap slides the dossier out of the pile, readable, over the stage; another tap puts it back
function openFile(f) {
  const zone = document.getElementById("players-zone");
  const zr = planeRectOf(zone);
  if (!zr) return;
  closeFiles();
  outFile = f;
  const w0 = f.offsetWidth || 250, h0 = f.offsetHeight || 330;
  // as large as the stage allows, never past 1.25 screen px per plane px
  const k = Math.min(stage.h * 0.94 / (h0 * S), stage.w * 0.8 / (w0 * S), 1.25 / S);
  const cx = (stage.x + stage.w / 2 - O.x) / S, cy = (stage.y + stage.h / 2 - O.y) / S;
  f.classList.add("pdx-out");
  f.style.setProperty("--pdx-fx", (cx - w0 * k / 2 - zr.x).toFixed(1) + "px");
  f.style.setProperty("--pdx-fy", (cy - h0 * k / 2 - zr.y).toFixed(1) + "px");
  f.style.setProperty("--pdx-fk", k.toFixed(3));
  f.style.setProperty("--pdx-fz", "60");
  D.classList.add("pdx-file-out");
  pile();
}
function closeFiles() {
  if (!outFile) return;
  outFile.classList.remove("pdx-out");
  outFile = null;
  D.classList.remove("pdx-file-out");
  pile();
}
function wireFiles() {
  document.addEventListener("click", (e) => {
    if (!on()) return;
    const f = e.target && e.target.closest && e.target.closest("#players-zone .pcard.cfolio");
    if (f) {
      e.preventDefault(); e.stopPropagation();
      if (f === outFile) closeFiles(); else openFile(f);
      return;
    }
    if (outFile && !(e.target.closest && e.target.closest("#pdx-mcol, #pdx-mrail"))) closeFiles();
  }, true);
}

/* ── the cat keeps a small place on this desk, at the pile's foot ── */
function catHome(mount) {
  const c = window.__pdxCat;
  if (!c || !c.setPlaces) return;
  if (mount) {
    if (!catSaved) catSaved = { places: c.places, size: c.sizeUnits };
    c.setPlaces({ table: { x: CAT_AT.x / (PLANE_W / 100), y: CAT_AT.y / (PLANE_H / 100), lie: true, sit: true } }, "table");
    c.setSize(CAT_AT.size);
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
function paintCol() {
  if (!col) return;
  const hh = document.getElementById("hud-hour");
  col.querySelector(".mc-hour").textContent = hh ? "Hour " + hh.textContent.trim() : "";
  const ph = [...document.querySelectorAll("#vz-phases .vz-ph")];
  const dots = col.querySelectorAll(".mc-phases i");
  dots.forEach((d0, i) => {
    const p = ph[i];
    d0.className = p ? (p.classList.contains("on") ? "on" : p.classList.contains("done") ? "done" : "") : "";
    d0.title = p ? p.textContent : "";
  });
  const T = window.__pdxTouch;
  col.querySelector(".mc-fs").hidden = !T || T.isFs() || T.standalone();
  // her line: the turn first, then the event, then the chapter of the Hour
  const caps = document.querySelector("#hela-eye .he-caps");
  let says = "";
  if (caps) {
    const order = [".cx-slot-turn", ".cx-slot-event", ".cx-slot-chapter"];
    for (const sel of order) {
      const c = caps.querySelector(sel + ".on");
      if (c) says += capHTML(c);
    }
  }
  if (says !== lastSays) { lastSays = says; col.querySelector(".mc-says").innerHTML = says; }
  // (the phase dividers, "- main -", are the desktop log's rulers, not events)
  const items = [...document.querySelectorAll("#log-list > li")]
    .filter((li) => !/^\s*-\s.*\s-\s*$/.test((li.querySelectorAll(":scope > span")[1] || li).textContent))
    .slice(-7).reverse();
  const log = items.map((li, i) => {
    const sp = li.querySelectorAll(":scope > span");
    const time = sp[0] ? sp[0].textContent : "";
    const body = sp[1] ? sp[1].innerHTML : li.innerHTML;
    return `<li class="${i ? "" : "mc-new"}"><b>${esc(time)}</b><span>${body}</span></li>`;
  }).join("");
  if (log !== lastLog) { lastLog = log; col.querySelector(".mc-log-l").innerHTML = log; }
}
function paintRail() {
  if (!rail) return;
  const g = game();
  const eye = document.getElementById("hela-eye");
  const want = g && g._beaconTarget && eye && eye.classList.contains("he-directs") ? g._beaconTarget : null;
  let wantView = want === "market" ? "merchant" : want === "drawer" ? "records" : want === "timeline" ? "chart" : want === "main" ? "machine" : null;
  // the automatic camera off (or the tutorial steering): the key of the needed view pulses
  if (!wantView && (!autoOn() || document.body.classList.contains("tut"))) wantView = wantedView();
  rail.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("is-on", b.dataset.view === view);
    b.classList.toggle("beckon", !!wantView && b.dataset.view === wantView && wantView !== view);
  });
}

/* ── swipes turn the head the matching way (never over a die, a file or a card) ── */
function wireSwipes() {
  let s0 = null;
  document.addEventListener("pointerdown", (e) => {
    if (!on() || e.pointerType !== "touch") { s0 = null; return; }
    if (e.clientX < stage.x || e.clientX > stage.x + stage.w) { s0 = null; return; }
    if (e.target.closest && e.target.closest(".die, .cell, .pcard, .card, button, input, .escape-drop, #hela-brain-full, .pdx-sheet")) { s0 = null; return; }
    if (view === "chart" && zoom > 1.001) { s0 = null; return; }
    s0 = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  }, true);
  document.addEventListener("pointerup", (e) => {
    if (!s0 || e.pointerId !== s0.id) return;
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y, dt = performance.now() - s0.t;
    s0 = null;
    if (dt > 500) return;
    const V = VIEWS[view];
    let to = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) * 0.6) to = dx < 0 ? V.right : V.left;
    else if (Math.abs(dy) > 70 && Math.abs(dx) < Math.abs(dy) * 0.6) to = dy > 0 ? V.up : V.down;
    if (to) { manualAt = performance.now(); go(to); }
  }, true);
}

/* ── THE CHART IN THE HAND: two fingers pinch it closer, one finger pans it once closer;
      a tap is still a tap on a century (the chart's own click) ── */
const touches = new Map();
let pinch = null, pan = null, eatClick = 0;
function stagePt(x, y) { return { x: (x - O.x) / S, y: (y - O.y) / S }; }
function wireChart() {
  document.addEventListener("pointerdown", (e) => {
    if (!on() || view !== "chart" || e.pointerType !== "touch") return;
    if (e.clientX < stage.x || e.clientX > stage.x + stage.w) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom, p: stagePt(mx, my) };
      pan = null;
    } else if (touches.size === 1 && zoom > 1.001) {
      pan = { x: e.clientX, y: e.clientY, c: zc ? { ...zc } : null, moved: false };
    }
  }, true);
  document.addEventListener("pointermove", (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size >= 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoom = Math.max(1, Math.min(3.2, pinch.z * d / pinch.d));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const f = frameRect("chart"), base = Math.min(stage.w / f.w, stage.h / f.h), S2 = base * zoom;
      // the point under the fingers stays under the fingers
      zc = { x: pinch.p.x - (mx - (stage.x + stage.w / 2)) / S2, y: pinch.p.y - (my - (stage.y + stage.h / 2)) / S2 };
      frame("chart", false); eatClick = performance.now() + 400;
      e.preventDefault();
    } else if (pan && zc) {
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 10) return;
      pan.moved = true;
      zc = { x: pan.c.x - dx / S, y: pan.c.y - dy / S };
      frame("chart", false); eatClick = performance.now() + 400;
      e.preventDefault();
    }
  }, { capture: true, passive: false });
  const up = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (!touches.size) pan = null;
  };
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", up, true);
  document.addEventListener("click", (e) => {
    if (performance.now() < eatClick) { eatClick = 0; e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
}

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
  if (c.contains("can-buy")) { const d = cardData(node.dataset.name); return "Buy" + (d && d.gold_cost != null ? ` · ${d.gold_cost} gold` : ""); }
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
  }
}
window.__pdxLifeAnchor = () => (on() && life && life._end ? { x: life._end.x, y: life._end.y } : null);

/* ── THE AUTOMATIC CAMERA (touch, on by default, Settings > Automatic camera): the head
      turns to where the decision of the moment lives. Never under a finger, never within
      1.5 s of his own turn, never while the tutorial steers; off, the key only pulses. ── */
const AUTO_KEY = "pdx-autocam";
const autoOn = () => { try { return localStorage.getItem(AUTO_KEY) !== "off"; } catch (e) { return true; } };
let lastReq = null, fingers = 0;
function wantedView() {
  const g = game(), req = g && g.pendingReq;
  if (!req) return null;
  const k = req.kind, o = req.options || {};
  if (k === "allocate" || k === "matrix_buff") return "machine";
  if (k === "travel" || k === "merchant_century") return "chart";
  if (k === "market" || k === "steal_target" || k === "destroy_target" || k === "secret_deal") return "merchant";
  if (k === "deliver" || k === "reward_category" || k === "recycle" || k === "capacity" || k === "activation") return "case";
  if (k === "target") {
    if (o.target_type === "century") return "chart";
    if (o.target_type === "traveler") return "machine";      // the rivals' files lie there
    const z = (o.candidates || []).map((c) => c && c.zone);
    if (z.includes("market") || z.includes("secret")) return "merchant";
    return "case";
  }
  return null;
}
let pendingAuto = null;
function autoCamera() {
  const g = game(), req = g && g.pendingReq;
  const key = req ? req : null;
  if (key !== lastReq) {                       // a fresh decision: turn once, when allowed
    lastReq = key;
    pendingAuto = wantedView();
  }
  if (!pendingAuto) return;
  if (!autoOn() || document.body.classList.contains("tut")) { pendingAuto = null; return; }
  if (fingers > 0 || performance.now() - manualAt < 1500 || sheet || outFile) return;   // wait
  const v = pendingAuto; pendingAuto = null;
  if (v !== view) go(v);
}
function wireAuto() {
  document.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") fingers++; }, true);
  const lift = (e) => { if (e.pointerType === "touch") fingers = Math.max(0, fingers - 1); };
  document.addEventListener("pointerup", lift, true);
  document.addEventListener("pointercancel", lift, true);
  // the relic in hand for a delivery: turn to the cabinet, where its drawer is lit
  new MutationObserver(() => {
    if (!on()) return;
    if (document.body.classList.contains("carrying-card") && game() && game()._deliverState && view !== "records") go("records");
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  // the Settings switch (touch only; index.html #set-touch)
  const box = document.getElementById("chk-autocam");
  if (box) {
    box.checked = autoOn();
    box.addEventListener("change", () => { try { localStorage.setItem(AUTO_KEY, box.checked ? "on" : "off"); } catch (e) {} });
  }
}

/* ── the tutorial steers: whatever HELA rings must be in view (her lessons were written
      for the whole desk; on a phone the view holding the ring comes to it) ── */
function followRings() {
  if (!document.body.classList.contains("tut")) return;
  const rings = [...document.querySelectorAll(".tut-ring")].filter((r) => r.getBoundingClientRect().width > 4);
  for (const r0 of rings) {
    const r = r0.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const inside = cx > stage.x + 4 && cx < stage.x + stage.w - 4 && cy > 2 && cy < stage.h - 2;
    if (inside) continue;
    const p = stagePt(cx, cy);
    // the view whose frame holds that point, the closest-framed first
    const order = ["machine", "case", "chart", "records", "brain", "merchant"];
    for (const v of order) {
      const f = frameRect(v);
      if (p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h) { if (v !== view) go(v); return; }
    }
  }
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
    catHome(true);
    paintCol();
  } else if (!w && mounted) {
    mounted = false;
    D.classList.remove("pdx-m-on", "pdx-file-out");
    closeFiles();
    files().forEach((f) => f.classList.remove("pdx-piled"));
    catHome(false);
  }
}
function followScene() {
  const g = game(), sc = g && g.camera ? g.camera.scene : "main";
  return sc === "market" ? "merchant" : sc === "drawer" ? "records" : "machine";
}

function start() {
  if (!D.classList.contains("pdx-touch")) return;   // a desktop: nothing
  wireFiles();
  wireSwipes();
  wireChart();
  wireSheet();
  wireAuto();
  const obs = new MutationObserver(sync);
  obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  const sg = document.getElementById("screen-game");
  if (sg) obs.observe(sg, { attributes: true, attributeFilter: ["class"] });
  const cam = document.getElementById("cam");
  if (cam) new MutationObserver(() => { if (on()) { followCamera(); paintRail(); } }).observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
  addEventListener("resize", () => { if (on()) { layout(); frame(view, false); pile(); } });
  // the column reads the game's own readouts; light, and only while the table is on
  let raf = 0;
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (on()) { paintCol(); paintRail(); paintAction(); paintLife(); autoCamera(); followRings(); } }); };
  setInterval(() => { if (on()) { soon(); if (!outFile) pile(); } else if (life) life.style.display = "none"; }, 400);
  sync();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

window.__pdxMobile = { go, view: () => view, frame: (v) => frame(v || view, false), files: pile };
