/* =========================================================================
   mobile-table.js, THE WORKSTATION ON A PHONE (phase 2)
   -------------------------------------------------------------------------
   Runs only when js/touch.js has marked a phone (html.pdx-phone) and the
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
const VIEWS = {
  machine:  { scene: "main",   label: "Machine",  key: "S", left: "records", right: "chart", up: "merchant" },
  chart:    { scene: "main",   label: "Chart",    key: "D", left: "machine", up: "merchant" },
  merchant: { scene: "market", label: "Merchant", key: "W", down: "machine" },
  records:  { scene: "drawer", label: "Records",  key: "A", right: "machine", up: "merchant" },
};
// where each view looks, on the plane (the hull's plane is the same 2133x1200 box)
const DEVICE = { x: 132, y: 792, w: 520, h: 408 };     // the pip-boy with the sleeve's handwheel
const PILE = { x: 668, w: 184, top: 800, bottom: 1110 }; // the rivals' files, on the desk at its right
const CAT_AT = { x: 772, y: 1188 };                     // the cat curls at the pile's foot

const on = () => D.classList.contains("pdx-m-on");
const game = () => window.__game || null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let view = "machine";
let col = null, rail = null, stage = { x: 0, y: 0, w: 0, h: 0 };
let S = 1, O = { x: 0, y: 0 };
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
  rail.innerHTML = Object.entries(VIEWS).map(([k, v]) =>
    `<button type="button" data-view="${k}">${ICON[k]}<span>${v.label}</span></button>`).join("");
  rail.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("button[data-view]");
    if (!b) return;
    e.stopPropagation();
    go(b.dataset.view);
  });
  document.body.appendChild(rail);
}

/* ── layout: the stage is what the column and the rail leave ── */
function layout() {
  const ins = insets();
  const W = innerWidth, H = innerHeight;
  const colW = Math.round(Math.max(138, Math.min(176, W * 0.18))) + ins.l;
  const railW = Math.round(Math.max(58, Math.min(70, W * 0.075))) + ins.r;
  D.style.setProperty("--pdx-colw", colW + "px");
  D.style.setProperty("--pdx-railw", railW + "px");
  stage = { x: colW, y: 0, w: W - colW - railW, h: H };
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
function frameRect(v) {
  if (v === "machine") return { x: DEVICE.x, y: DEVICE.y, w: PILE.x + PILE.w - DEVICE.x, h: DEVICE.h, bottom: true };
  if (v === "chart") {
    const rail0 = document.getElementById("timeline-rail");
    const r = planeRectOf(rail0);
    return r ? { x: r.x + 4, y: r.y + 60, w: Math.min(r.w, PLANE_W - r.x) - 8, h: Math.min(r.h, PLANE_H - r.y) - 64 } : { x: 1066, y: 60, w: 1060, h: 1130 };
  }
  if (v === "merchant") return planeRectOf(document.getElementById("market-zone")) || { x: 300, y: -560, w: 1100, h: 560 };
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
  S = Math.min(stage.w / f.w, stage.h / f.h);
  O.x = stage.x + (stage.w - f.w * S) / 2 - f.x * S;
  O.y = f.bottom ? stage.y + stage.h - (f.y + f.h) * S : stage.y + (stage.h - f.h * S) / 2 - f.y * S;
  D.style.setProperty("--pdx-dur", animate && !calm() ? paceMs() + "ms" : "0ms");
  D.style.setProperty("--pdx-s", S.toFixed(5));
  D.style.setProperty("--pdx-ox", O.x.toFixed(2) + "px");
  D.style.setProperty("--pdx-oy", O.y.toFixed(2) + "px");
  D.dataset.pdxView = v;
}

/* ── turning the head: the view changes, the real camera follows its scene ── */
function go(v, animate = true) {
  if (!VIEWS[v]) return;
  view = v;
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
  if (VIEWS[view].scene === sc) return;
  go(sc === "market" ? "merchant" : sc === "drawer" ? "records" : "machine");
}

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
  const w0 = list[0].offsetWidth || 250, h0 = list[0].offsetHeight || 330;
  const badge = list[0].querySelector(".badge");
  const bh = badge ? badge.offsetHeight : 110;
  const k = Math.min(0.66, PILE.w / w0);
  const n = list.length;
  const room = PILE.bottom - PILE.top - h0 * k;
  const step = n > 1 ? Math.max(24, Math.min(bh * k + 8, room / (n - 1))) : 0;
  list.forEach((f, i) => {
    f.classList.add("pdx-piled");
    f.style.setProperty("--pdx-fx", (PILE.x - zr.x).toFixed(1) + "px");
    f.style.setProperty("--pdx-fy", (PILE.top + i * step - zr.y).toFixed(1) + "px");
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
    c.setSize(8.5);
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
  const items = [...document.querySelectorAll("#log-list > li")].slice(-7).reverse();
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
  const wantView = want === "market" ? "merchant" : want === "drawer" ? "records" : want === "timeline" ? "chart" : want === "main" ? "machine" : null;
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
    if (e.target.closest && e.target.closest(".die, .cell, .pcard, .card, button, input, .escape-drop, #hela-brain-full")) { s0 = null; return; }
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
    if (to) go(to);
  }, true);
}

/* ── mount / unmount with the table ── */
let mounted = false;
function wanted() {
  const sg = document.getElementById("screen-game");
  return D.classList.contains("pdx-phone") && document.body.classList.contains("cabin-on")
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
  if (!D.classList.contains("pdx-touch") || !D.classList.contains("pdx-phone")) return;   // desktop, tablet: nothing
  wireFiles();
  wireSwipes();
  const obs = new MutationObserver(sync);
  obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  const sg = document.getElementById("screen-game");
  if (sg) obs.observe(sg, { attributes: true, attributeFilter: ["class"] });
  const cam = document.getElementById("cam");
  if (cam) new MutationObserver(() => { if (on()) { followCamera(); paintRail(); } }).observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
  addEventListener("resize", () => { if (on()) { layout(); frame(view, false); pile(); } });
  // the column reads the game's own readouts; light, and only while the table is on
  let raf = 0;
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (on()) { paintCol(); paintRail(); } }); };
  setInterval(() => { if (on()) { soon(); if (!outFile) pile(); } }, 400);
  sync();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

window.__pdxMobile = { go, view: () => view, frame: (v) => frame(v || view, false), files: pile };
