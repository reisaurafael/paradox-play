/* =========================================================================
   help.js, THE TAB KEY: the player's own reference, on demand, never a pop-up
   -------------------------------------------------------------------------
   HOLD Tab : the table explains itself while the key is down. Every module of
              the machine says what it does, laid out like the machine right
              above it; the four phases of the Hour with the current one marked;
              the Merchant's rule (WHEN, WHY, HOW, WHERE) near him on the chart;
              and HELA's notes, the remarks she keeps instead of talking over
              the game. Let go and it is gone. Nothing it shows covers the thing
              it explains: each panel is placed where it overlaps the least of
              what matters (the machine, the pieces, the Merchant, the phases).
   TAP Tab  : "Tips and questions", the answers a new player looks for. Tab or
              Esc closes it.
   The TAB key sits in the top-left corner the whole match (#pdx-tabkey) and
   counts HELA's unread notes. The first overload of a match is explained by
   HELA and waits for the player (overload), later ones get a shorter line.
   Text is in rem, so the Settings text size carries it; the accessible
   interface makes it bolder. Tab is taken over only in a match, never in a
   text field or while Settings is open.
   window.__pdxHelp = { isHeld, onHold, hold, isOpen, onOpen, open, close,
     toggle, note, overload } (the tutorial teaches Tab through it).
   ========================================================================= */
import { FUNCTIONS } from "./util.js?202609270852";

const HOLD_MS = 250;        // a press held this long is a hold; shorter is a tap
const NOTES_MAX = 6;        // HELA's notes shown on the hold view, newest first

// what each module does, by its glyph (a relabelled module keeps its behaviour)
const MOD = {
  energy: "Gain energy equal to the die.",
  gold: "Gain gold equal to the die.",
  both: "Gain energy and gold, each equal to the die.",
  future: "Every traveler in a later century loses energy equal to the die.",
  paradox: "Every other traveler in your century loses energy equal to the die.",
  past: "Every traveler in an earlier century loses energy equal to the die.",
  booms: "Adds heat equal to the die. At 12 the motor explodes: -2 energy, and you sit out the rest of that Hour.",
  travel: "Sail up to the die in centuries, to the future or the past.",
  travel2: "Sail up to twice the die. The future is free; the past costs 1 energy a century, 2 below X.",
};
const FN_NOTE = { recharge: "", paradox: "never hurts you", travel: "" };

const PHASES = [
  ["delivery", "DELIVERY", "Whoever stands on a relic's own century may file it in its drawer: the timeline mends and they earn a contract point."],
  ["market", "MARKET", "Travelers at the Merchant's port (and at XI once the Secret Market opens) may buy, renew his shelf or declare. Then he sails."],
  ["main", "GENERATORS", "Everyone places four dice on their machine in secret. Modules 1 to 9 then resolve for everyone at once, and each traveler picks where to sail."],
  ["activation", "ACTIVATION", "Whoever holds a ready item may fire it at a target in reach."],
];

const TIPS = [
  ["Why did I move?", "Only your Travel modules move you: module 8 up to the die, module 9 up to twice it, to the century you pick on the chart. A few relics move you too; your log (L) says which."],
  ["Why did I lose energy?", "A rival's paradox (it hits everyone ahead of, beside or behind its maker), sailing to the past, a motor explosion at 12 heat (-2), the escape valve while a function is shut, or a weapon in the Activation phase."],
  ["What does overload do?", "Three dice in one function overload it: that function is shut for the whole next Hour and takes no dice."],
  ["What is the escape valve?", "A slot for one spare die. While one of your functions is shut it drains energy, your life, equal to that die; otherwise it charges, and every 10 points buys a permanent +1 on a module."],
  ["When does the Merchant move?", "At the end of every Market phase: he rolls 1 to 3 dice and sails toward the richest traveler who is not in his century. Hold TAB to see his rule and where he can stop."],
  ["How do I buy?", "Stand on the Merchant's century during the Market phase, or on XI once the Secret Market opens, and pay the relic's price in gold."],
  ["How do I deliver?", "Stand on the century printed on your relic during a Delivery phase and file it in its drawer: the timeline mends and you earn a contract point."],
  ["Why can't my item fire?", "An item needs someone or something in reach. A card marked NO TARGET has nothing to aim at right now, for example nobody in your century."],
  ["How does the game end?", "When someone reaches Year Zero, when someone has delivered into all three periods, when the Merchant runs out of relics, or when only one traveler has never been terminated. Most contract points wins."],
];

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const game = () => window.__game || null;
const inMatch = () => {
  const sg = document.getElementById("screen-game");
  return document.body.classList.contains("cabin-on") && !!(sg && sg.classList.contains("is-active"));
};
const typing = (t) => !!(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "") || t.isContentEditable));
const settingsOpen = () => { const s = document.getElementById("settings-backdrop"); return !!(s && !s.hidden); };
const rectOf = (sel) => {
  const out = [];
  document.querySelectorAll(sel).forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.width > 2 && r.height > 2 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight) out.push(r);
  });
  return out;
};
const scene = () => { const g = game(); return (g && g.camera && g.camera.scene) || "main"; };

/* ── PLACEMENT: a panel goes where it covers the least of what matters ── */
function obstacles(extra) {
  const ob = [];
  const add = (sel, w) => rectOf(sel).forEach((r) => ob.push({ r, w }));
  if (scene() === "main") {
    add("#hull-console .matrix-wrap", 100); add("#mano-screen", 100); add("#mano-vent", 100); add("#mano-boomg", 60);
    add("#hull-console .dice-pool", 60); add("#vz-holo", 40);
  }
  add("#vz-phases", 60); add("#hull-hour-label", 40); add("#btn-settings", 40); add("#pdx-tabkey", 40);
  add("#timeline-rail .pc-merch-live", 60); add("#timeline-rail .pc-piece-g", 25);
  if (held) add("#timeline-rail .pc-mhud-key circle", 60);   // where his roll can stop him (shown while held)
  add(".he-window", 30); add("#hela-eye", 10);
  add("#market-zone .market-row", 12); add("#market-zone .market-meta", 12);
  return ob.concat(extra || []);
}
function place(el, ob, prefer) {
  const w = el.offsetWidth, h = el.offsetHeight, W = innerWidth, H = innerHeight;
  const top0 = 50, x1 = Math.max(8, W - w - 8), y1 = Math.max(top0, H - h - 8);
  let best = null, bestC = Infinity;
  for (let y = top0; y <= y1; y += 14) for (let x = 8; x <= x1; x += 14) {
    let c = 0;
    for (const o of ob) {
      const ix = Math.min(x + w, o.r.right) - Math.max(x, o.r.left), iy = Math.min(y + h, o.r.bottom) - Math.max(y, o.r.top);
      if (ix > 0 && iy > 0) c += ix * iy * o.w;
    }
    if (prefer) c += Math.hypot(x + w / 2 - prefer.x, y + h / 2 - prefer.y) * 18;
    if (c < bestC) { bestC = c; best = [x, y]; }
  }
  if (!best) best = [8, top0];
  el.style.left = best[0] + "px"; el.style.top = best[1] + "px";
  return { left: best[0], top: best[1], right: best[0] + w, bottom: best[1] + h };
}
const centre = (r) => r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;

/* ── HELA'S NOTES: her commentary waits here instead of talking over the game ── */
const notes = [];
let unread = 0;
function note(html, opt) {
  opt = opt || {};
  const text = html && html.nodeType === 1 ? html.innerHTML : String(html || "");
  if (!text) return;
  const key = opt.key || text;
  const i = notes.findIndex((n) => n.key === key);
  if (i >= 0) notes.splice(i, 1);
  const g = game();
  notes.unshift({ key, html: text, hour: g && g.view ? g.view.hour : null });
  notes.length = Math.min(notes.length, 40);
  if (!held) unread++;
  paintKey();
}

/* ── THE TAB KEY in the corner, and its unread count ── */
let keyEl = null;
function paintKey() {
  const on = inMatch();
  if (!keyEl && on) {
    keyEl = document.createElement("button");
    keyEl.id = "pdx-tabkey"; keyEl.type = "button";
    keyEl.setAttribute("aria-label", "Tab: tips and questions; hold Tab for the table's reference");
    keyEl.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    document.body.appendChild(keyEl);
  }
  if (!keyEl) return;
  keyEl.hidden = !on;
  const html = `<kbd>TAB</kbd><span>tips</span>${unread ? `<i class="pk-notes">${unread} ${unread === 1 ? "note" : "notes"}</i>` : ""}`;
  if (keyEl._h !== html) { keyEl._h = html; keyEl.innerHTML = html; }
}
new MutationObserver(() => paintKey()).observe(document.body, { attributes: true, attributeFilter: ["class"] });

/* ── HOLD: the reference view ── */
let held = false, holdEl = null;
const holdSubs = new Set(), openSubs = new Set();
function modulesPanel(g) {
  const mw = document.querySelector("#hull-console .matrix-wrap");
  if (scene() !== "main" || !mw) return null;
  const r = mw.getBoundingClientRect();
  if (!(r.width > 20) || r.top > innerHeight) return null;
  const shut = g && g.shutRows ? g.shutRows() : { rows: new Set(), next: false };
  const me = g && g._self ? g._self() : null;
  const cols = Math.max(...FUNCTIONS.map((fn, row) => mw.querySelectorAll(`.cell[data-r="${row}"]`).length), 1);
  let rows = "";
  FUNCTIONS.forEach((fn, row) => {
    const cells = [...mw.querySelectorAll(`.cell[data-r="${row}"]`)];
    if (!cells.length) return;
    const isShut = shut.rows.has(row);
    rows += `<div class="ph-fn fn-${fn.key}${isShut ? " ph-shut" : ""}"><b>${fn.name.toUpperCase()}</b>`
      + (isShut ? `<i>SHUT ${shut.next ? "NEXT" : "THIS"} HOUR</i>` : FN_NOTE[fn.key] ? `<i>${FN_NOTE[fn.key]}</i>` : "") + `</div>`;
    cells.forEach((cell) => {
      const c = +cell.dataset.c;
      const sw = g && g._modSwap && g._modSwap[row + "," + c];
      const [glyph, caption] = sw || fn.mods[c] || ["", ""];
      rows += `<div class="ph-mod${isShut ? " ph-shut" : ""}"><span class="ph-num">${row * 3 + c + 1}</span>`
        + `<b>${esc(caption).toUpperCase()}</b><span>${MOD[glyph] || ""}</span></div>`;
    });
  });
  const charge = me && me.valve_charge != null ? ` Charge now: ${me.valve_charge} of 10.` : "";
  const el = document.createElement("section");
  el.className = "ph-panel ph-mods";
  el.style.setProperty("--ph-cols", cols);
  el.innerHTML = `<header><span class="ph-tag">THE TIME MACHINE</span><span class="ph-sub">laid out like the screen below</span></header>`
    + `<div class="ph-grid">${rows}</div>`
    + `<p class="ph-rule">One die value per function, filled left to right. Three dice in one function <b>overload</b> it: shut for the next Hour. Modules resolve 1 to 9, for everyone at once.</p>`
    + `<p class="ph-valve"><b>ESCAPE VALVE</b> Takes one spare die. While a function is shut it <b>drains energy, your life</b>, equal to that die; otherwise it charges, and every 10 points buy a permanent +1 on a module.${charge}</p>`;
  return { el, mw: r };
}
function phasesPanel() {
  const cur = document.body.dataset.phase;
  const el = document.createElement("section");
  el.className = "ph-panel ph-phases";
  el.innerHTML = `<header><span class="ph-tag">THE HOUR</span><span class="ph-sub">four phases, in this order</span></header>`
    + PHASES.map(([k, name, what], i) => `<p class="ph-phase${k === cur ? " ph-now" : ""}"><b>${i + 1}. ${name}</b>${k === cur ? `<i>NOW</i>` : ""}<span>${what}</span></p>`).join("");
  return el;
}
function merchantPanel(g) {
  const v = g && g.view;
  const rule = v && window.__pdxMerchantRule ? window.__pdxMerchantRule(v) : null;
  if (!rule) return null;
  const el = document.createElement("section");
  el.className = "ph-panel ph-merch";
  el.innerHTML = `<header><span class="ph-tag">THE MERCHANT</span><span class="ph-sub">${esc(rule.short)}</span></header>`
    + `<dl><dt>WHEN</dt><dd>${esc(rule.when)}</dd><dt>WHY</dt><dd>${esc(rule.why)}</dd>`
    + `<dt>HOW</dt><dd>${esc(rule.how)}</dd><dt>WHERE</dt><dd>${esc(rule.where)}${rule.last ? " " + esc(rule.last) : ""}</dd></dl>`;
  return el;
}
function notesPanel() {
  const el = document.createElement("section");
  el.className = "ph-panel ph-notes";
  const list = notes.slice(0, NOTES_MAX);
  el.innerHTML = `<header><span class="ph-tag">HELA'S NOTES</span><span class="ph-sub">${list.length ? "newest first" : "nothing to add yet"}</span></header>`
    + list.map((n) => `<p class="ph-note">${n.hour != null ? `<i>HOUR ${n.hour}</i>` : ""}<span>${n.html}</span></p>`).join("");
  return el;
}
function buildHold() {
  const g = game();
  const root = document.createElement("div");
  root.id = "pdx-help"; root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);
  const placed = [];
  // the machine's legend sits right above the machine, laid out like it
  const mods = modulesPanel(g);
  if (mods) {
    root.appendChild(mods.el);
    const w = mods.el.offsetWidth, h = mods.el.offsetHeight;
    const vent = rectOf("#mano-vent")[0], screen = rectOf("#mano-screen")[0];
    const bottom = Math.min(mods.mw.top, screen ? screen.top : mods.mw.top, vent ? vent.top : mods.mw.top) - 14;
    const left = Math.max(8, Math.min(innerWidth - w - 8, mods.mw.left + mods.mw.width / 2 - w / 2));
    const top = Math.max(50, bottom - h);
    mods.el.style.left = left + "px"; mods.el.style.top = top + "px";
    placed.push({ r: { left, top, right: left + w, bottom: top + h }, w: 100 });
    // the legend's pointer: a bracket down onto the screen it explains
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "ph-lines");
    const cx = mods.mw.left + mods.mw.width / 2, y0 = top + h, y1 = mods.mw.top - 3;
    let d = `M ${cx} ${y0} L ${cx} ${y1} M ${mods.mw.left} ${y1} L ${mods.mw.right} ${y1}`;
    const vr = mods.el.querySelector(".ph-valve").getBoundingClientRect();
    if (vent) d += ` M ${vr.left + 14} ${vr.bottom} L ${vent.left + vent.width / 2} ${vent.top + 2}`;
    svg.innerHTML = `<path d="${d}"/>`;
    root.appendChild(svg);
  }
  const merch = merchantPanel(g), phases = phasesPanel(), notesEl = notesPanel();
  const onChart = centre(rectOf("#timeline-rail .pc-merch-live")[0]);
  const stall = centre(rectOf("#market-zone .market-meta")[0]);
  for (const [el, prefer] of [[phases, centre(rectOf("#vz-phases")[0])], [merch, onChart || stall], [notesEl, null]]) {
    if (!el) continue;
    root.appendChild(el);
    const r = place(el, obstacles(placed), prefer);
    placed.push({ r, w: 100 });
  }
  requestAnimationFrame(() => root.classList.add("on"));
  return root;
}
function hold(on) {
  on = !!on;
  if (on === held) return;
  if (on && !inMatch()) return;
  held = on;
  document.body.classList.toggle("pdx-help-hold", on);
  if (on) {
    if (tipsEl) close();
    if (holdEl) holdEl.remove();
    holdEl = buildHold();
    unread = 0; paintKey();
  } else if (holdEl) {
    const el = holdEl; holdEl = null;
    el.classList.remove("on");
    setTimeout(() => el.remove(), 160);
  }
  holdSubs.forEach((cb) => { try { cb(on); } catch (e) {} });
}

/* ── TAP: Tips and questions ── */
let tipsEl = null;
function open() {
  if (tipsEl || !inMatch()) return;
  if (held) hold(false);
  tipsEl = document.createElement("section");
  tipsEl.id = "pdx-tips"; tipsEl.className = "ph-panel";
  tipsEl.setAttribute("role", "dialog"); tipsEl.setAttribute("aria-label", "Tips and questions");
  tipsEl.innerHTML = `<header><span class="ph-tag">TIPS AND QUESTIONS</span><span class="ph-sub">HELA answers</span></header>`
    + TIPS.map(([q, a]) => `<p class="pt-qa"><b>${q}</b><span>${a}</span></p>`).join("")
    + `<p class="pt-foot"><kbd>TAB</kbd> or <kbd>ESC</kbd> closes this. <b>Hold</b> <kbd>TAB</kbd> to see every module, the phases, the Merchant's rule and HELA's notes.</p>`;
  document.body.appendChild(tipsEl);
  const chart = rectOf("#timeline-rail")[0];
  place(tipsEl, obstacles(), chart && scene() === "main" ? centre(chart) : { x: innerWidth / 2, y: innerHeight / 2 });
  document.body.classList.add("pdx-tips-on");
  requestAnimationFrame(() => tipsEl && tipsEl.classList.add("on"));
  openSubs.forEach((cb) => { try { cb(true); } catch (e) {} });
}
function close() {
  if (!tipsEl) return;
  const el = tipsEl; tipsEl = null;
  el.classList.remove("on");
  document.body.classList.remove("pdx-tips-on");
  setTimeout(() => el.remove(), 160);
  openSubs.forEach((cb) => { try { cb(false); } catch (e) {} });
}
function toggle() { if (tipsEl) close(); else open(); }

/* ── THE KEY ── */
let downAt = 0, holdT = 0, acking = false;
window.addEventListener("keydown", (e) => {
  if (acking) return;
  if (e.key === "Escape" && tipsEl) { e.preventDefault(); e.stopPropagation(); close(); return; }
  if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
  if (!inMatch() || typing(e.target) || settingsOpen()) return;
  e.preventDefault();                       // no focus cycling in a match
  if (e.repeat || downAt) return;
  downAt = performance.now();
  holdT = setTimeout(() => { holdT = 0; if (downAt) hold(true); }, HOLD_MS);
}, true);
window.addEventListener("keyup", (e) => {
  if (e.key !== "Tab" || !downAt) return;
  e.preventDefault();
  downAt = 0;
  if (holdT) { clearTimeout(holdT); holdT = 0; toggle(); }   // a tap
  else hold(false);
}, true);
window.addEventListener("blur", () => { if (!downAt) return; downAt = 0; clearTimeout(holdT); holdT = 0; hold(false); });
window.addEventListener("pdx:access", () => { if (held) { hold(false); hold(true); } });

/* ── THE OVERLOAD MOMENT: HELA says it through her eye, the function gets the yellow
   box, and it stays until the player clicks or presses a key (never a timer). The
   first of the match says everything; later ones are short. Silent while the tutorial
   mutes her, unless it asks (opt.force). ── */
function overload(rows, opt) {
  opt = opt || {};
  const E = window.__helaEye;
  rows = (rows || []).filter((r) => FUNCTIONS[r]);
  if (!E || !rows.length || (window.__helaMute && !opt.force)) return Promise.resolve();
  const name = rows.map((r) => FUNCTIONS[r].name.toUpperCase()).join(" and ");
  const node = document.createElement("div");
  node.className = "pdx-ovl";
  node.innerHTML = opt.first
    ? `<p><b>${name}</b> overloaded: you set three dice in it, so it is <b>shut for the next Hour</b>. No die can go there until that Hour is over.</p>`
      + `<p>A die with nowhere else to go can take the <b>escape valve</b>, but while a function is shut the valve <b>drains your energy, your life</b>: as much as that die, 1 to 3.</p>`
    : `<p><b>${name}</b> overloaded: <b>shut for the next Hour</b>. The escape valve can take a spare die, and it drains that die in energy.</p>`;
  node.innerHTML += `<p class="pdx-ack">Click anywhere or press any key</p>`;
  // the subject: the function's row on the machine, when the machine is in view
  const cells = rows.flatMap((r) => rectOf(`#hull-console .matrix-wrap .cell[data-r="${r}"], #hull-console .matrix-wrap .matrix-fnlabel.${FUNCTIONS[r].cls}`));
  let box = null;
  if (cells.length) {
    const l = Math.min(...cells.map((c) => c.left)), t = Math.min(...cells.map((c) => c.top));
    const rr = Math.max(...cells.map((c) => c.right)), b = Math.max(...cells.map((c) => c.bottom));
    box = { left: l, top: t, right: rr, bottom: b, width: rr - l, height: b - t };
  }
  const screen = rectOf("#mano-screen")[0];
  const x = box ? Math.max(250, Math.min(innerWidth - 250, box.left + box.width / 2 + 60)) : innerWidth / 2;
  const win = E.manifest({ x, y: innerHeight * .4, node, cls: "he-ovl" });
  if (win && win.el && win.pane) {
    const h = win.pane.offsetHeight || 200, above = (screen ? Math.min(screen.top, box ? box.top : screen.top) : innerHeight * .6) - 18;
    win.el.style.top = Math.max(h / 2 + 12, above - h / 2) + "px";
  }
  if (box && E.highlight) E.highlight(box, 864e5);
  return new Promise((resolve) => {
    let armed = false;
    const done = (e) => {
      if (!armed) return;
      if (e.type === "keydown" && /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === "pointerdown") window.addEventListener("click", (c) => { c.preventDefault(); c.stopPropagation(); }, { capture: true, once: true });
      window.removeEventListener("pointerdown", done, true);
      window.removeEventListener("keydown", done, true);
      acking = false;
      if (E.highlight) E.highlight(null);
      if (win) win.close();
      resolve();
    };
    acking = true;
    window.addEventListener("pointerdown", done, true);
    window.addEventListener("keydown", done, true);
    setTimeout(() => { armed = true; }, 700);   // a click already on its way never dismisses it
  });
}

window.__pdxHelp = {
  isHeld: () => held,
  onHold(cb) { holdSubs.add(cb); return () => holdSubs.delete(cb); },
  hold,
  isOpen: () => !!tipsEl,
  onOpen(cb) { openSubs.add(cb); return () => openSubs.delete(cb); },
  open, close, toggle, note, overload,
};
