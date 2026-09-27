/* =========================================================================
   help.js, THE TAB KEY: the player's own reference, on demand, never a pop-up
   -------------------------------------------------------------------------
   HOLD Tab : HELA EXTENDED, her augmented overlay on the live table: small notes, each
              beside what it explains with a leader line in her colour (the machine's
              rows with what they will do if confirmed, the valve, the seals, the
              phases, the Merchant, the voyage, orders and notes by the TAB key). The
              table stays playable underneath. A phone layout places the notes itself
              (window.__pdxHelp.notePlacer = (list) => true, list = [{ k, el, anchor }]);
              by default the notes place themselves from the real rects on any screen.
   TAP Tab  : "Tips and questions", the answers a new player looks for. Tab or
              Esc closes it.
   The TAB key sits in the top-left corner the whole match (#pdx-tabkey) and
   counts HELA's unread notes. The first overload of a match is explained by
   HELA and waits for the player (overload), later ones get a shorter line.
   Text is in rem, so the Settings text size carries it; the accessible
   interface makes it bolder. Tab is taken over only in a match, never in a
   text field or while Settings is open.
   window.__pdxHelp = { isHeld, onHold, hold, isOpen, onOpen, open, close,
     toggle, note, overload, panel, placer } (the tutorial teaches Tab through it).
   ========================================================================= */
import { FUNCTIONS } from "./util.js?202609271951";

const HOLD_MS = 250;        // a press held this long is a hold; shorter is a tap
const NOTES_MAX = 3;        // HELA's notes shown on the hold view, newest first

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
  ["When does the Merchant move?", "At the end of every Market phase: he rolls 1 to 3 dice and sails toward the richest traveler who is not in his century. Hold TAB to see where he is headed and where he can stop."],
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
    add("#hull-console .matrix-wrap", 400); add("#mano-screen", 400); add("#mano-vent", 200); add("#mano-boomg", 60);
    add("#hull-console .dice-pool", 60); add("#vz-holo", 40);
  }
  add("#vz-phases", 60); add("#hull-hour-label", 40); add("#btn-settings", 40); add("#pdx-tabkey", 40);
  add("#timeline-rail .pc-merch-live", 60); add("#timeline-rail .pc-piece-g", 25);
  if (held) add("#timeline-rail .pc-mhud-key circle", 60);   // where his roll can stop him (shown while held)
  add(".he-window", 30); add("#hela-eye", 10);
  add("#market-zone .market-row", 60); add("#market-zone .market-meta", 30);
  // a choice on the chart: the lit ports (and their FREE / cost tags) stay in view
  add("#timeline-rail .can-go, #timeline-rail [class*='-go-']", 120);
  // on the side scenes the left arm IS the pointer (top layer, above any panel): keep clear of it
  add("#cursor-plane #hull-manopla", 150);
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
/* ── HELA EXTENDED (hold Tab): her AUGMENTED OVERLAY over the live table, an AR HUD in her
   style. Small annotations, each beside what it explains with a thin leader line in her
   colour: by each row of the machine what its modules do and, while dice are placed,
   what that row will do if confirmed; the escape valve and overload by the valve; the era
   seals by the seals; the four phases under the phase track; the Merchant's three lines by
   his ship (or his wagon); the voyage legend by the lit ports; today's orders and her
   notes as a small stack by the TAB key. Translucent, never a block: nothing it shows
   takes the pointer, so the table stays playable with Tab held, and it reflows as things
   move. Each note places itself from real element rects, clear of the cells, dice, lit
   ports, shelf cards and whatever can be clicked now, and clear of the other notes; a
   note whose subject is not on screen is not shown. ── */
const MOD_SHORT = {
  energy: "+energy", gold: "+gold", both: "+energy and gold",
  future: "hits everyone ahead", paradox: "hits your century", past: "hits everyone behind",
  booms: "+heat (12 explodes)", travel: "sail up to the die", travel2: "sail up to 2x the die",
};
const PHASE_SHORT = {
  delivery: "on a relic's own century, file it: the timeline mends, +1 point",
  market: "at the Merchant's port (or XI once it opens): buy, renew or pass; then he sails",
  main: "four dice in secret; modules 1 to 9 resolve for everyone, then you sail",
  activation: "a ready item may fire at a target in reach",
};
const partsHtml = (parts) => {
  const d = document.createElement("div");
  try { window.__comic._parts(d, parts); } catch (e) { d.textContent = parts.map((p) => typeof p === "string" ? p : (p.b || p.name || p.key || "")).join(""); }
  return d.innerHTML;
};
const visRect = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!(r.width > 2 && r.height > 2) || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return null;
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    const cs = getComputedStyle(x);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < .2) return null;
  }
  return r;
};
const union = (rs) => {
  rs = rs.filter(Boolean); if (!rs.length) return null;
  const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
  const rr = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom));
  return { left: l, top: t, right: rr, bottom: b, width: rr - l, height: b - t };
};
const allVis = (sel) => [...document.querySelectorAll(sel)].map(visRect).filter(Boolean);

// the notes: { k, sides (in order of preference), anchor() -> rect|null, html() -> string|"" }
function annotations(g) {
  const out = [];
  const matrix = () => visRect(document.querySelector("#hull-console .matrix-wrap"));
  // what the player is doing decides which notes matter: the dice, a voyage, the rest
  const req = g && g.pendingReq;
  const allocating = !!(g && g.alloc && req && req.kind === "allocate");
  const voyage = !!(req && req.kind === "travel");
  const onDesk = scene() === "main" && !document.querySelector("#cursor-plane #hull-manopla");
  const shut = g && g.shutRows ? g.shutRows() : { rows: new Set(), next: false };
  let pv = null;
  try { pv = window.__comic && window.__comic.previewRows && window.__comic.previewRows(); } catch (e) {}
  const legend = (fn, row) => {
    const mw = document.querySelector("#hull-console .matrix-wrap");
    const cols = mw ? [...mw.querySelectorAll(`.cell[data-r="${row}"]`)].map((c) => +c.dataset.c) : [0, 1, 2];
    return cols.map((c) => {
      const sw = g && g._modSwap && g._modSwap[row + "," + c];
      const [glyph] = sw || fn.mods[c] || [""];
      return `<span class="ha-mod"><b>${row * 3 + c + 1}</b> ${MOD_SHORT[glyph] || ""}</span>`;
    }).join("");
  };
  // by each row of the machine: what it does, and (dice placed) what it will do
  FUNCTIONS.forEach((fn, row) => {
    out.push({ k: "row" + row, pri: 1, sides: ["right", "left", "above"], cls: "ha-row fn-" + fn.key,
      anchor: () => allocating && matrix() && union(allVis(`#hull-console .matrix-wrap .cell[data-r="${row}"]`)),
      html: () => {
        const mine = pv ? pv.rows.filter((r) => (r.row == null ? 2 : r.row) === row) : [];
        return `<p><b class="ha-fn">${fn.name}</b>${legend(fn, row)}${shut.rows.has(row) ? ` <i class="ha-shut">SHUT ${shut.next ? "NEXT" : "THIS"} HOUR</i>` : ""}</p>`
          + mine.map((r, i) => `<p class="ha-if${r.tone ? " ha-" + r.tone : ""}">${i ? "" : `<i class="ha-t">IF YOU CONFIRM</i> `}${partsHtml(r.parts)}</p>`).join("");
      } });
  });
  // the machine at rest (no matrix on its screen): one short legend by the screen
  out.push({ k: "machine", pri: 5, sides: ["right", "above"], cls: "ha-machine",
    anchor: () => (allocating || voyage || !onDesk ? null : visRect(document.getElementById("mano-screen"))),
    html: () => `<p><i class="ha-t">THE MACHINE</i></p>` + FUNCTIONS.map((fn, row) => `<p><b class="ha-fn">${fn.name}</b>${legend(fn, row)}</p>`).join("") });
  out.push({ k: "valve", pri: 4, sides: ["above", "right", "left"], cls: "ha-valve",
    anchor: () => (allocating ? visRect(document.getElementById("mano-vent")) : null),
    html: () => {
      const me = g && g._self ? g._self() : null;
      const charge = me && me.valve_charge != null ? ` Charge ${me.valve_charge} of 10.` : "";
      return `<p><b>Escape valve:</b> one spare die. While a function is shut it drains that much energy; otherwise it charges, +1 on a module every 10.${charge}</p>`
        + `<p>Three dice in one function overload it: shut next Hour.</p>`;
    } });
  out.push({ k: "seals", pri: 6, sides: ["right", "above", "left", "below"], cls: "ha-seals",
    anchor: () => (voyage || !onDesk ? null : visRect(document.querySelector("#hull-manopla #mano-seals"))),
    html: () => {
      const done = [["Origins"], ["Ascension"], ["Singularity"]].filter(([k]) => { const el = document.querySelector(`#hull-manopla .mano-seal[data-period="${k}"]`); return el && el.classList.contains("mended"); });
      return `<p><b>Era seals</b> O, A, S fill as you mend Origins, Ascension, Singularity; all three ends the match. ${done.length ? "Mended: " + done.map(([k]) => k).join(", ") + "." : "None mended yet."}</p>`;
    } });
  out.push({ k: "hour", pri: 3, sides: ["below", "right", "left"], cls: "ha-hour",
    anchor: () => visRect(document.getElementById("vz-phases")),
    html: () => {
      const cur = document.body.dataset.phase;
      // the four in one line, the current one marked; what the current one is for below it
      const row = PHASES.map(([k, name], i) => k === cur ? `<i class="ha-t">${i + 1}. ${name} NOW</i>` : `<span class="ha-ph">${i + 1}. ${name[0] + name.slice(1).toLowerCase()}</span>`).join(" ");
      return `<p>${row}</p>` + (PHASE_SHORT[cur] ? `<p>${PHASE_SHORT[cur][0].toUpperCase() + PHASE_SHORT[cur].slice(1)}.</p>` : "");
    } });
  out.push({ k: "merchant", pri: 2, sides: ["left", "below", "above", "right"], cls: "ha-merch",
    // on the Market he is his wagon (the chart is rolled away); on the desk, his ship
    anchor: () => (scene() === "market"
      ? visRect(document.getElementById("market-meta")) || visRect(document.querySelector("#market-zone .market-row"))
      : visRect(document.querySelector("#timeline-rail .pc-merch-live"))),
    html: () => {
      const v = g && g.view, rule = v && window.__pdxMerchantRule ? window.__pdxMerchantRule(v) : null;
      if (!rule) return "";
      return `<p><i class="ha-t">THE MERCHANT</i> ${esc(rule.where)}</p><p>${esc(rule.why)}</p><p>He sails after every Market: ${rule.n} ${rule.n === 1 ? "die" : "dice"}, 1 to 3 each.</p>`;
    } });
  out.push({ k: "voyage", pri: 1, sides: ["below", "left", "above", "right"], cls: "ha-voyage",
    anchor: () => union(allVis("#timeline-rail .can-go")),
    html: () => {
      const rail = document.getElementById("timeline-rail");
      const sel = !rail ? null : rail.classList.contains("skin-sing") ? ".cc-cmd" : rail.classList.contains("skin-ori") ? ".cm-cmd" : ".sea-cmd";
      const c = sel && rail.querySelector(sel);
      if (!c || !c.textContent.trim()) return "";
      const tmp = document.createElement("div"); tmp.innerHTML = c.innerHTML;
      tmp.querySelectorAll(".vz-sigil,.vz-name").forEach((n) => n.remove());
      return `<p><i class="ha-t">YOUR VOYAGE</i></p>` + [...tmp.children].filter((n) => n.textContent.trim()).map((n) => `<p>${esc(n.textContent.trim())}</p>`).join("");
    } });
  out.push({ k: "desk", pri: 7, sides: ["below", "right"], cls: "ha-desk",
    anchor: () => visRect(document.getElementById("pdx-tabkey")),
    html: () => {
      let list = [];
      try { list = (window.__pdxChronicle && window.__pdxChronicle.missions && window.__pdxChronicle.missions()) || []; } catch (e) { list = []; }
      const orders = list.map((m) => {
        const prog = m.done ? `<i class="ha-stamp">DONE</i>` : m.failed ? `<i class="ha-stamp ha-miss">MISSED</i>` : `<i class="ha-prog">${esc(m.cur)}/${esc(m.target)}</i>`;
        return `<p class="ha-order${m.done ? " done" : ""}">${prog} <b>${esc(m.title)}</b> <span>${esc(m.text)}</span></p>`;
      }).join("");
      const nt = notes.slice(0, NOTES_MAX).map((n) => `<p class="ha-note">${n.hour != null ? `<b>Hour ${n.hour}:</b> ` : ""}${n.html}</p>`).join("");
      return (orders ? `<p><i class="ha-t">TODAY'S ORDERS</i></p>${orders}` : "") + (nt ? `<p><i class="ha-t">MY NOTES</i></p>${nt}` : "");
    } });
  return out;
}
// what a note must never cover: the play itself (weights: how bad covering it is)
function hardObstacles() {
  const ob = [];
  const add = (sel, w) => allVis(sel).forEach((r) => ob.push({ r, w }));
  add("#hull-console .matrix-wrap .cell", 900); add("#hull-console .dice-pool", 900); add("#hull-console .dice-actions", 900);
  add("#mano-confirm, #mano-clear, #tray-slot", 900); add("#mano-screen", 250);
  add("#timeline-rail .can-go", 900); add("#timeline-rail .pc-merch-live", 900); add("#timeline-rail .pc-piece-g", 900);
  add("#market-zone .card", 800); add("#market-zone .market-meta", 200);
  add(".he-window", 800); add("#hela-eye .he-caps", 250); add("#hela-eye .he-chip", 250); add("#hela-eye", 120);
  add("#rucksack-zone .card", 300); add("#mala-extra #mala-lock", 300); add(".pcard.cfolio", 150);
  add("#vz-phases", 600); add("#hull-hour-label", 300); add("#btn-settings", 300); add("#pdx-tabkey", 500); add("#vz-holo", 120);
  add("#cursor-plane #hull-manopla", 200);
  return ob;
}
const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
function placeNote(w, h, A, sides, ob, placed) {
  const G = 14, W = innerWidth, H = innerHeight, top0 = 44;
  let best = null, bestC = Infinity;
  sides.forEach((side, si) => {
    for (const d of [0, 16, -16, 36, -36, 60, -60, 90, -90, 130, -130, 180, -180, 240, -240, 320, -320, 420, -420]) {
      let x, y;
      if (side === "right") { x = A.right + G; y = A.top + A.height / 2 - h / 2 + d; }
      else if (side === "left") { x = A.left - G - w; y = A.top + A.height / 2 - h / 2 + d; }
      else if (side === "above") { x = A.left + A.width / 2 - w / 2 + d; y = A.top - G - h; }
      else { x = A.left + A.width / 2 - w / 2 + d; y = A.bottom + G; }
      x = Math.max(8, Math.min(W - w - 8, x)); y = Math.max(top0, Math.min(H - h - 8, y));
      const r = { left: x, top: y, right: x + w, bottom: y + h };
      let c = si * 400 + Math.abs(d) * 3;
      // the play itself (weight 800+: cells, dice, keys, lit ports, pieces, shelf cards,
      // decision windows) is never covered: such a spot is out, not just expensive
      for (const o of ob) { const a2 = ov(r, o.r); if (a2 > 16 && o.w >= 800) c += 1e9; c += a2 * o.w / 100; }
      for (const p of placed) c += ov(r, p) * 5000;
      c += ov(r, A) * 20;   // never over its own subject
      if (c < bestC) { bestC = c; best = r; r.cost = c; }
    }
  });
  return best;
}
// the leader: from the note's nearest edge to the subject's nearest point
function leader(r, A) {
  const cx = Math.max(A.left, Math.min(A.right, (r.left + r.right) / 2)), cy = Math.max(A.top, Math.min(A.bottom, (r.top + r.bottom) / 2));
  const px = Math.max(r.left, Math.min(r.right, cx)), py = Math.max(r.top, Math.min(r.bottom, cy));
  const ax = Math.max(A.left, Math.min(A.right, px)), ay = Math.max(A.top, Math.min(A.bottom, py));
  if (Math.hypot(ax - px, ay - py) < 6) return "";
  return `<path d="M ${px.toFixed(1)} ${py.toFixed(1)} L ${ax.toFixed(1)} ${ay.toFixed(1)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.2"/>`;
}
let holdAnns = null, holdLayoutT = 0;
function layoutHold() {
  if (!holdEl || !holdAnns) return;
  const ob = hardObstacles(), placed = [];
  // every subject counts as an obstacle for the other notes
  const subj = holdAnns.map((a) => { try { return a.anchor(); } catch (e) { return null; } });
  subj.forEach((A) => { if (A) ob.push({ r: A, w: 250 }); });
  let lines = "";
  const API = window.__pdxHelp;
  const list = [];
  holdAnns.forEach((a, i) => {
    const A = subj[i], el = a.el;
    if (!A || !a.hasBody) { el.classList.remove("on"); el.hidden = true; return; }
    el.hidden = false;
    list.push({ k: a.k, el, anchor: A });
  });
  let own = true;
  if (API && typeof API.notePlacer === "function") { try { own = !API.notePlacer(list); } catch (e) { own = true; } }
  if (own) {
    list.sort((a, b) => (holdAnns.find((x) => x.k === a.k).pri || 9) - (holdAnns.find((x) => x.k === b.k).pri || 9));
    for (const it of list.slice()) {
      const w = it.el.offsetWidth, h = it.el.offsetHeight;
      const r = placeNote(w, h, it.anchor, holdAnns.find((a) => a.k === it.k).sides, ob, placed);
      // never on another note: no free spot means this (lower-priority) note waits
      if (!r || r.cost >= 1e9 || placed.some((p) => ov(r, p) > 0)) { it.el.hidden = true; it.el.classList.remove("on"); list.splice(list.indexOf(it), 1); continue; }
      it.el.style.left = r.left + "px"; it.el.style.top = r.top + "px";
      placed.push({ left: r.left - 4, top: r.top - 4, right: r.right + 4, bottom: r.bottom + 4 });
    }
  }
  for (const it of list) {
    const b = it.el.getBoundingClientRect();
    lines += leader(b, it.anchor);
    it.el.classList.add("on");
  }
  const svg = holdEl.querySelector(".ha-lines");
  if (svg) svg.innerHTML = lines;
}
function fillHold(g) {
  if (!holdEl) return;
  holdAnns = annotations(g);
  const host = holdEl.querySelector(".ha-host");
  const keep = new Map([...host.children].map((n) => [n.dataset.k, n]));
  for (const a of holdAnns) {
    let el = keep.get(a.k);
    if (!el) { el = document.createElement("div"); el.className = "ha " + (a.cls || ""); el.dataset.k = a.k; host.appendChild(el); }
    let html = ""; try { html = a.anchor() ? a.html() : ""; } catch (e) { html = ""; }
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
    a.el = el; a.hasBody = !!html;
  }
}
function buildHold() {
  const root = document.createElement("div");
  root.id = "pdx-help"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<svg class="ha-lines" width="100%" height="100%"></svg><div class="ha-host"></div>`;
  document.body.appendChild(root);
  holdEl = root;
  fillHold(game()); layoutHold();
  requestAnimationFrame(() => root.classList.add("on"));
  // the table moves under her notes (a pan, a ship, a die): they follow, a few times a second
  clearInterval(holdLayoutT);
  holdLayoutT = setInterval(() => { if (held && holdEl) { fillHold(game()); layoutHold(); } }, 300);
  return root;
}
// the dice moved while Tab is held: the rows' IF YOU CONFIRM lines follow them at once
window.addEventListener("pdx-preview", () => { if (held && holdEl) { fillHold(game()); layoutHold(); } });
window.addEventListener("resize", () => { if (held && holdEl) layoutHold(); });
function hold(on) {
  on = !!on;
  if (on === held) return;
  if (on && !inMatch()) return;
  held = on;
  document.body.classList.toggle("pdx-help-hold", on);
  if (on) {
    if (tipsEl) close();
    if (holdEl) holdEl.remove();
    holdEl = null; buildHold();
    unread = 0; paintKey();
  } else if (holdEl) {
    clearInterval(holdLayoutT); holdAnns = null;
    const el = holdEl; holdEl = null;
    el.classList.remove("on");
    setTimeout(() => el.remove(), 160);
  }
  try { window.__comic && window.__comic.preview && window.__comic.preview(); } catch (e) {}   // the chart's ghost of the trip back
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
  tipsEl.innerHTML = `<header><span class="ph-tag">TIPS AND QUESTIONS</span></header>`
    + TIPS.map(([q, a]) => `<p class="pt-qa"><b>${q}</b><span>${a}</span></p>`).join("")
    + `<p class="pt-foot"><kbd>TAB</kbd> or <kbd>ESC</kbd> closes this. <b>Hold</b> <kbd>TAB</kbd> for my extended view: what your dice will do, the Hour, the Merchant, every module, today's orders and my notes.</p>`;
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
  panel: () => document.getElementById("pdx-help"),   // the overlay while held (.ha notes inside)
  placer: null,        // (retired: the old single panel's hook; the overlay ignores it)
  notePlacer: null,    // a phone layout may set (list) => true after placing each note itself: list = [{ k, el, anchor: rect }]
  relayout: () => { if (held && holdEl) { fillHold(game()); layoutHold(); } },
};
