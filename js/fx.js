/* =========================================================================
   fx.js, THE COMIC EFFECTS: one small vocabulary for every RULES action, and
   the presentation pace that every animation reads.
   -------------------------------------------------------------------------
   THREE TIERS, one look (Silver Age ink and halftone, clear-line boxes, anime
   speed lines, worn in HELA's interface colours):
     BIG    the halftone starburst with onomatopoeia and speed lines (comic.js
            impact). Only the beats that change a match. One on screen at a
            time: another waits its turn in line (route below).
     STAMP  a small inked box with one word, pressed BESIDE the piece, card or
            case file where the rule acted, like a rubber stamp on paperwork.
     POP    a few inked letters with two action ticks, beside the number or the
            piece that changed. The routine beats.
   Every effect names one rules action (never an interface click), carries one
   short word, sits beside the thing it names (never on the machine, the dice,
   a case file's numbers or a piece), and is not played when nothing happened.

   SETTINGS (index.html, main.js):
     Comic effects  Full: all three tiers. Light: the big beats become stamps and
                    the routine pops rest. Off: none (HELA's words stay).
                    Low graphics counts as Light.
     Pace           Slow / Normal / Brisk / Fast. One table (PACES) read by the
                    theater (game.js), the card flights, the voyages and the
                    Merchant's trip (the chart scripts, via window.__pdxPace),
                    the dice, the captions, the mend and these effects; the
                    stylesheets read the same factor as --pdx-pace.
   COSTS: no loops, no intervals, no listeners per effect. Each effect is one
   small node animated on transform and opacity, removed when it ends; at most
   3 pops and 2 stamps on screen; nothing while skipping (F), in a hidden tab,
   during the tutorial (it owns the table; __fx.tutorial = true lets it in) or
   for a beat too old to be news. Calm motion (reduced motion, the Accessible
   interface) keeps only a fade.
   game.js calls: init, event (every event), beat (the theater's own beats),
   bought; the chart scripts call landed; comic.js impact
   asks route before it draws.
   ========================================================================= */
import { audio } from "./audio.js?202609281046";
import { roman } from "./util.js?202609281046";

const PACE_KEY = "paradoxo.speed";   // the key main.js has always used
const LEVEL_KEY = "pdx-fx-level";

// THE PACE. anim: every animation and effect length. beat: the theater's steps
// (Fast skips the step-by-step theater). linger: the pause after each event (game.js
// SPEED_FACTOR). motion: card flights. read: reading time of a line (Fast never
// shortens it). impact: the length of a big panel.
export const PACES = {
  slow:   { anim: 1.6, beat: 2,   motion: 1.5,  read: 2, impact: 2,    label: "Slow",
    desc: "Everything at about twice the length, and every line stays twice as long. The tutorial plays at this pace." },
  normal: { anim: 1,   beat: 1,   motion: 1,    read: 1, impact: 1,    label: "Normal",
    desc: "The table as designed: each rule plays out step by step, one thing at a time." },
  brisk:  { anim: .8,  beat: .7,  motion: .85,  read: 1, impact: .85,  label: "Brisk",
    desc: "The same step-by-step presentation, about a third quicker. Lines keep their full reading time." },
  fast:   { anim: .6,  beat: .6,  motion: .7,   read: 1, impact: .75,  label: "Fast",
    desc: "No step-by-step theater: results land together with short pauses. For players who know the flow." },
};
export const LEVELS = {
  full:  { label: "Full",  desc: "Big moments get the full comic panel; routine rules get a small stamp or inked word." },
  light: { label: "Light", desc: "Only the moments that matter, as small stamps. Low graphics uses this." },
  off:   { label: "Off",   desc: "No comic effects. HELA's words and the table's own animations stay." },
};

const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

// the colours of the vocabulary (the ink is always the comic layer's ink)
const TONE = {
  energy: "#8fe07a", gold: "#f7c65a", heat: "#ff8a3a", danger: "#ff5a44", paradox: "#b98cff",
  travel: "#7cc8ff", valve: "#6fd3c9", market: "#f7c65a", good: "#f7c65a", shield: "#9fe8ff", plain: "#fff1c2",
};
// the words of comic.js's own big panels, for Light (they become stamps then)
const BIG_FACE = {
  paradox: ["ZZAP!", "paradox"], boom: ["BOOM!", "heat"], terminated: ["KRAK!", "danger"],
  deliver: ["KA-CHUNK!", "good"], wanted: ["WANTED!", "heat"], steal: ["SWIPE!", "danger"],
  contract: ["KA-CHING!", "good"], yearzero: ["YEAR ZERO!", "plain"], vault: ["KLANK!", "paradox"],
  settle: ["THE END", "plain"],
};
// a reward contract's face: the category's word and the result by its die
const REWARD = {
  Chaos: ["CHAOS!", ["PARADOX ON ALL", "A CARD DESTROYED", "THE MERCHANT MOVED"]],
  Time: ["TICK-TOCK!", ["SOLO HOUR VOUCHER", "MARKET VOUCHER", "ITEM VOUCHER"]],
  Resource: ["KA-CHING!", ["+3 ENERGY +3 GOLD", "A RELIC STOLEN", "+1 MODULE"]],
};

class Fx {
  constructor() {
    this.game = null;
    this.comic = null;
    this.root = null;
    this.tutorial = false;     // the tutorial may let the effects in (it owns the table)
    this._next = {};           // lane -> the earliest time its next effect may start
    this._on = { pop: 0, stamp: 0 };
    this._bigUntil = 0;
    this._bigQ = [];
    this._trips = {};          // seat -> voyages this Hour (the double travel)
    this._immune = {};         // seat -> immune when it set sail (the immunity spent)
    this._reward = null;
  }

  init(game, comic) {
    this.game = game;
    if (comic) this.comic = comic;
    this.applyPace();
    if (this.root || typeof document === "undefined") return;
    const r = document.createElement("div");
    r.id = "fx-root";
    r.setAttribute("aria-hidden", "true");
    document.body.appendChild(r);
    this.root = r;
    try {
      window.__fx = this;
      window.__pdxPace = (ms) => (+ms || 0) * this.pace().anim;          // the chart scripts' clock (unrounded)
      window.__fxLanded = (seat, to) => this.landed(seat, to);          // a voyage makes landfall
      window.__fxMerchantLanded = (p) => this.merchantLanded(p);        // the Merchant drops anchor
    } catch (e) {}
    this._markLevel();
    // MY CROSSING INTO ANOTHER PERIOD: the chart turns like a comic page (board_draft.js
    // __pdxChartTurn); the moment the new chart is fully in (detail.landMs), the new era's
    // page turns in with its name
    window.addEventListener("paradoxo:skinwarp", (e) => {
      const d = e && e.detail, ms = d && typeof d.landMs === "number" ? d.landMs : 560;
      setTimeout(() => this._eraPage(), Math.max(0, ms));
    });
  }

  /* ---- THE PACE ---- */
  speed() {
    const s = (this.game && this.game.speed) || lsGet(PACE_KEY) || "normal";
    return PACES[s] ? s : "normal";
  }
  pace() { return PACES[this.speed()]; }
  // an animation length at this pace
  ms(n) { return Math.round((+n || 0) * this.pace().anim); }
  // the stylesheets read the same factor (fx.css PACE block)
  applyPace() {
    try { document.documentElement.style.setProperty("--pdx-pace", String(this.pace().anim)); } catch (e) {}
  }

  /* ---- THE LEVEL ---- */
  storedLevel() {
    const v = lsGet(LEVEL_KEY);
    if (LEVELS[v]) return v;
    return document.documentElement.classList.contains("pdx-phone") ? "light" : "full";   // phones are weak: Light unless chosen
  }
  setLevel(v) { if (LEVELS[v]) lsSet(LEVEL_KEY, v); this._markLevel(); this.heatSync(); }
  _markLevel() { try { document.documentElement.dataset.fx = this.storedLevel(); } catch (e) {} }
  // what plays now: Low graphics caps it at Light
  level() {
    const v = this.storedLevel();
    if (document.documentElement.classList.contains("pdx-phone")) return v;   // a phone keeps its own choice (Light by default)
    if (v === "full" && document.body.classList.contains("gfx-low")) return "light";
    return v;
  }
  _calm() {
    return document.documentElement.classList.contains("pdx-a11y")
      || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  _quiet() {
    const g = this.game;
    return !this.root || document.hidden || !!(g && g._skip) || (!!window.__helaMute && !this.tutorial);
  }
  _me() { return this.game && this.game.seat; }
  _period(c) {
    try { if (window.__oriPeriodOf) return window.__oriPeriodOf(c); } catch (e) {}
    return c <= 10 ? "Origins" : c <= 19 ? "Ascension" : "Singularity";
  }
  _col(seat) { try { return this.game.colorOf(seat); } catch (e) { return null; } }
  _chartLive() { try { return !!(this.comic && this.comic._chart()); } catch (e) { return false; } }
  _view() { return this.game && this.game.view; }
  _tv(seat) { const v = this._view(); return v && v.travelers ? v.travelers.find((t) => t.name === seat) : null; }

  /* ---- ANCHORS: where the rule acted, on screen right now (null when off screen) ---- */
  _rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2) return null;
    if (this._phone()) {
      // on a phone only what lies on the STAGE counts (not under HELA's column or the thumb
      // rail); a subject in another view is remembered, so the effect can point toward it
      const s = this._stage(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < s.left || cx > s.right || cy < s.top || cy > s.bottom) { this._off = { r, t: performance.now() }; return null; }
      return r;
    }
    if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    return r;
  }

  /* ---- THE PHONE (html.pdx-m-on, js/mobile-table.js): one view of the workstation at a time
     on a stage between HELA's column (left) and the thumb rail (right). Effects land on the
     stage only, beside what the view shows (the police files on the desk, the big pip-boy,
     the case), never on the CRT's cells, the dice or the keys; a subject in another view
     gets a small inked edge marker pointing toward it; my own hits go to the life thread
     at the screen's edge. Sizes come down (fx.css html.pdx-m-on). The desktop never
     enters any of this. ---- */
  _phone() { return document.documentElement.classList.contains("pdx-m-on"); }
  _stage() {
    if (!this._phone()) return { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const cs = getComputedStyle(document.documentElement);
    const l = parseFloat(cs.getPropertyValue("--pdx-colw")) || 0, r = parseFloat(cs.getPropertyValue("--pdx-railw")) || 0;
    return { left: l, top: 0, right: innerWidth - r, bottom: innerHeight };
  }
  // where MY life shows on a phone: the life thread's own point when it offers one
  // (window.__pdxLifeAnchor, the MOBILE agent's), else the stage's top band, above the machine
  _life() {
    let pt = null;
    try { pt = window.__pdxLifeAnchor && window.__pdxLifeAnchor(); } catch (e) {}
    const s = this._stage();
    if (!pt) pt = { x: s.left + Math.min(200, (s.right - s.left) * .3), y: 34 };
    return { r: { left: pt.x, right: pt.x, top: pt.y, bottom: pt.y, width: 0, height: 0 }, box: null, at: true };
  }
  // beside the life thread's tick (its -N lands on _life itself)
  _lifeBeside() { const L = this._life(); const x = L.r.left + 104; return { r: { left: x, right: x, top: L.r.top + 4, bottom: L.r.top + 4, width: 0, height: 0 }, box: null, at: true }; }
  // what nothing may cover on a phone: the CRT with its cells, the dice tray and its keys
  _keepOut() {
    const out = [];
    for (const sel of ["#mano-screen", "#hull-console .dice-pool", "#hull-console .dice-actions"]) {
      const e = document.querySelector(sel); if (!e) continue;
      const r = e.getBoundingClientRect(); if (r.width > 2) out.push(r);
    }
    return out;
  }
  // move a box (left, top, w, h) inside the stage and off the keep-outs: returns its shift
  _fit(x, y, w, h) {
    const s = this._stage(), pad = 6;
    let dx = 0, dy = 0;
    if (x < s.left + pad) dx = s.left + pad - x; else if (x + w > s.right - pad) dx = s.right - pad - (x + w);
    if (y < s.top + pad) dy = s.top + pad - y; else if (y + h > s.bottom - pad) dy = s.bottom - pad - (y + h);
    x += dx; y += dy;
    for (const k of this._keepOut()) {
      if (x + w <= k.left || x >= k.right || y + h <= k.top || y >= k.bottom) continue;
      const up = k.top - 4 - (y + h), down = k.bottom + 4 - y;
      if (y + up >= s.top + pad) { y += up; dy += up; } else if (y + down + h <= s.bottom - pad) { y += down; dy += down; }
    }
    return { dx, dy };
  }
  // a small inked tab at the stage's edge, pointing toward a subject in another view
  _edge(word, tone, r, opts = {}) {
    if (!this.root || !r) return;
    const s = this._stage(), cx = (s.left + s.right) / 2, cy = (s.top + s.bottom) / 2;
    const tx = r.left + r.width / 2, ty = r.top + r.height / 2, dx = tx - cx, dy = ty - cy;
    const hw = (s.right - s.left) / 2 - 64, hh = (s.bottom - s.top) / 2 - 22;
    const k = Math.min(Math.abs(dx) > 1 ? hw / Math.abs(dx) : 1e9, Math.abs(dy) > 1 ? hh / Math.abs(dy) : 1e9);
    const x = cx + dx * k, y = cy + dy * k;
    const side = Math.abs(dx) * hh >= Math.abs(dy) * hw ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u");
    const n = document.createElement("div");
    n.className = "fx-edgemark fx-edge-" + side;
    n.style.left = Math.round(x) + "px"; n.style.top = Math.round(y) + "px";
    n.style.setProperty("--fx-c", opts.color || TONE[tone] || TONE.plain);
    n.textContent = (side === "l" ? "\u25C0 " : side === "u" ? "\u25B2 " : "") + word + (side === "r" ? " \u25B6" : side === "d" ? " \u25BC" : "");
    this.root.appendChild(n);
    const dur = Math.max(1900, this.ms(2400));
    const nudge = side === "l" ? "-4px,0" : side === "r" ? "4px,0" : side === "u" ? "0,-4px" : "0,4px";
    try { n.animate([
      { opacity: 0, transform: `translate(-50%,-50%) translate(${nudge})` },
      { opacity: 1, transform: "translate(-50%,-50%)", offset: .14 },
      { opacity: 1, transform: "translate(-50%,-50%)", offset: .8 },
      { opacity: 0, transform: "translate(-50%,-50%)" }], { duration: dur, easing: "linear", fill: "both" }); } catch (e) {}
    setTimeout(() => n.remove(), dur + 60);
  }
  // the phone's life thread takes its comic tick: -N red with a crackle, +N quietly green
  lifeTick(seat, delta) {
    if (!delta || seat !== this._me() || !this._phone() || this._quiet() || this.level() === "off") return;
    try { if (window.__pdxLifeHit) { window.__pdxLifeHit(delta); return; } } catch (e) {}   // the life thread draws its own
    const a = this._life(), x = a.r.left, y = a.r.top, dur = Math.max(1500, this.ms(1900));
    const n = document.createElement("div");
    n.className = "fx-lifetick " + (delta < 0 ? "fx-lt-loss" : "fx-lt-gain");
    n.style.left = Math.round(x) + "px"; n.style.top = Math.round(y) + "px";
    const b = document.createElement("b"); b.textContent = (delta > 0 ? "+" : "\u2212") + Math.abs(delta); n.appendChild(b);
    if (delta < 0) {                                  // the crackle along the border above it
      n.insertAdjacentHTML("afterbegin", '<svg class="fx-crackle" viewBox="0 0 120 12" width="120" height="12" aria-hidden="true">'
        + '<polyline class="ck-ink" points="0,6 12,2 22,9 34,3 46,10 58,2 70,9 82,3 94,10 106,4 120,7"/>'
        + '<polyline class="ck-col" points="0,6 12,2 22,9 34,3 46,10 58,2 70,9 82,3 94,10 106,4 120,7"/></svg>');
    }
    this.root.appendChild(n);
    try { n.animate(this._calm()
      ? [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .7 }, { opacity: 0 }]
      : [{ opacity: 0, transform: "translate(-50%,-50%) scale(1.4)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: .12 },
         { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: .7 }, { opacity: 0, transform: "translate(-50%,-62%) scale(1)" }],
      { duration: dur, easing: "linear", fill: "both" }); } catch (e) {}
    setTimeout(() => n.remove(), dur + 60);
  }
  _pcard(seat) { return document.querySelector(`.pcard[data-seat="${CSS.escape(String(seat))}"]`); }
  // part: life, gold, heat, travel, paradox, recharge, file, or { card }
  // returns { r, box, above }: r the subject, box the case file to stand beside
  _seat(seat, part) {
    if (seat == null) return null;
    if (seat === this._me() && this._phone()) {
      const row = { recharge: 0, paradox: 1, heat: 2, travel: 2 }[part];
      const scr = row != null && this._rect(document.getElementById("mano-screen"));
      return scr ? { r: scr, box: null, above: true } : this._life();
    }
    if (seat === this._me()) {
      const q = (s) => this._rect(document.querySelector(s));
      const row = { recharge: 0, paradox: 1, heat: 2, travel: 2 }[part];
      let r = null;
      if (part === "gold") r = q("#mala-extra") || q("#rucksack-zone");
      else if (row != null) r = q(`#hull-console .matrix-wrap .cell[data-r="${row}"]`) && q("#hull-console .matrix-wrap");
      if (!r) r = q("#vz-holo") || q("#machine-zone");
      // mine stand ABOVE the thing (the lifethread, the machine, the case), never on it
      return r ? { r, box: null, above: true } : null;
    }
    const pc = this._pcard(seat);
    const box = this._rect(pc);
    if (!box) return null;
    const sel = part && part.card ? `.mc[data-card="${CSS.escape(String(part.card))}"]`
      : { life: ".bd-life-n", gold: ".cs-gold", heat: ".bd-fuserail", travel: ".ba-fn.ba-t",
          paradox: ".ba-fn.ba-p", recharge: ".ba-fn.ba-r" }[part];
    const r = (sel && this._rect(pc.querySelector(sel))) || box;
    return { r, box, above: false, below: this._phone() };
  }
  _isle(c) {
    try {
      if (this._phone()) {                           // the island itself, so another view is remembered
        const ch = this.comic && this.comic._chart();
        const r = ch && this._rect(ch.host.querySelector(`.${ch.mark}[data-c="${c}"]`));
        return r ? { r, box: r, above: false } : null;
      }
      const r = this.comic && this.comic._islandAt(c); return r ? { r, box: r, above: false } : null;
    } catch (e) { return null; }
  }
  _card(name) {
    try { const r = this.game.marketCardRect(name); const v = r && this._rect({ getBoundingClientRect: () => r }); return v ? { r: v, box: v, above: false } : null; }
    catch (e) { return null; }
  }
  _rowOfMarket() {
    try { const r = this.game._marketRowRect(); const v = r && this._rect({ getBoundingClientRect: () => r }); return v ? { r: v, box: v, above: false } : null; }
    catch (e) { return null; }
  }
  _el(sel) { const r = this._rect(document.querySelector(sel)); return r ? { r, box: r, above: false } : null; }
  // beside the subject: out of the case file toward the middle of the screen, or above
  _place(a) {
    const r = a.r, box = a.box || r;
    if (a.at) return { x: r.left, y: r.top, tx: "-50%", ty: "-50%" };
    if (a.below) return { x: box.left + box.width / 2, y: box.bottom + 6, tx: "-50%", ty: "0%" };   // a phone's police file: under it
    if (a.above) return { x: r.left + r.width / 2, y: r.top - 10, tx: "-50%", ty: "-100%" };
    const toRight = box.left + box.width / 2 < innerWidth / 2;
    const y = Math.max(24, Math.min(innerHeight - 24, r.top + r.height / 2));
    return toRight ? { x: box.right + 8, y, tx: "0%", ty: "-50%" } : { x: box.left - 8, y, tx: "-100%", ty: "-50%" };
  }

  // a point clear of a subject, toward the middle of the screen (a big panel's centre)
  _beside(r, d, within) {
    const mid = within ? within.left + within.width / 2 : innerWidth / 2;
    const toRight = r.left + r.width / 2 < mid;
    return { x: toRight ? r.right + d : r.left - d, y: r.top + r.height / 2 };
  }

  /* ---- THE LANES: effects that arrive together read one after another ---- */
  _slot(lane, gap) {
    const now = performance.now();
    // a big panel on screen holds the small ones until it fades: one thing at a time
    const free = Math.max(now, this._bigUntil);
    const t = Math.max(free, this._next[lane] || 0);
    if (t - free > 2600) return -1;                // too old to be news by then: dropped
    this._next[lane] = t + gap;
    return t - now;
  }

  /* ---- POP: a few inked letters beside the number that changed (routine) ---- */
  pop(word, tone, anchor, opts = {}) {
    if (this._quiet() || this.level() !== "full" || !word) return;
    const wait = this._slot("pop", this.ms(260));
    if (wait < 0) return;
    let held = 0;
    const run = () => {
      if (this._quiet() || this._on.pop >= 3) return;
      if (this._hold(run, held++, "pop", this.ms(260))) return;
      this._off = null;
      const a = typeof anchor === "function" ? anchor() : anchor;
      if (!a) { if (this._phone() && this._off) this._edge(word, tone, this._off.r, opts); return; }
      this._draw("pop", word, tone, a, Math.max(1700, this.ms(2200)), opts);
    };
    wait > 16 ? setTimeout(run, wait) : run();
  }
  // a big panel took the stage meanwhile: wait for it to fade (twice at most, then drop)
  _hold(run, n, lane, gap) {
    const w = this._bigUntil - performance.now();
    if (w <= 0) return false;
    if (n < 2) { const t = this._slot(lane, gap); if (t >= 0) setTimeout(run, t + 40); }   // in line again, in order
    return true;
  }
  /* ---- STAMP: one word in an inked box, pressed beside the subject ---- */
  stamp(word, tone, anchor, opts = {}) {
    if (this._quiet() || this.level() === "off" || !word) return;
    const wait = this._slot("stamp", this.ms(520));
    if (wait < 0) return;
    let held = 0;
    const run = () => {
      if (this._quiet() || this._on.stamp >= 2) return;
      if (this._hold(run, held++, "stamp", this.ms(520))) return;
      this._off = null;
      const a = typeof anchor === "function" ? anchor() : anchor;
      if (!a) { if (this._phone() && this._off) this._edge(word, tone, this._off.r, opts); return; }
      this._draw("stamp", word, tone, a, Math.max(2300, this.ms(3000)), opts);
      if (opts.sound !== false) { try { audio.play("chart_stamp"); } catch (e) {} }   // pressed on its own beat
    };
    wait > 16 ? setTimeout(run, wait) : run();
  }
  _draw(kind, word, tone, a, dur, opts) {
    const p = this._place(a);
    // two effects never print on top of each other: a later one steps down a line
    const now = performance.now();
    this._live = (this._live || []).filter((q) => q.until > now);
    for (let i = 0; i < 4 && this._live.some((q) => Math.abs(q.x - p.x) < 90 && Math.abs(q.y - p.y) < 26); i++) p.y += 28;
    this._live.push({ x: p.x, y: p.y, until: now + dur });
    const n = document.createElement("div");
    n.className = `fx-${kind} fx-${tone || "plain"}` + (opts.big ? " fx-bigpop" : "");
    n.style.left = Math.round(p.x) + "px"; n.style.top = Math.round(p.y) + "px";
    n.style.setProperty("--fx-c", opts.color || TONE[tone] || TONE.plain);
    if (opts.color) n.classList.add("fx-seat");   // in the causer's colour
    const b = document.createElement("b"); b.textContent = word; n.appendChild(b);
    if (opts.sub) { const s = document.createElement("span"); s.textContent = opts.sub; n.appendChild(s); }
    this.root.appendChild(n);
    if (this._phone()) {                              // inside the stage, off the CRT, the dice and the keys
      const w = n.offsetWidth, h = n.offsetHeight;
      const f = this._fit(p.x + (parseFloat(p.tx) / 100) * w, p.y + (parseFloat(p.ty) / 100) * h, w, h);
      p.x += f.dx; p.y += f.dy;
      n.style.left = Math.round(p.x) + "px"; n.style.top = Math.round(p.y) + "px";
    }
    this._on[kind]++;
    const rot = kind === "stamp" ? (Math.random() * 6 - 5).toFixed(1) : (Math.random() * 8 - 4).toFixed(1);
    const T = (s, dy = 0) => `translate(${p.tx}, calc(${p.ty} + ${dy}px)) rotate(${rot}deg) scale(${s})`;
    const inAt = Math.min(.14, 220 / dur);
    const frames = this._calm()
      ? [{ opacity: 0, transform: T(1) }, { opacity: 1, transform: T(1), offset: inAt }, { opacity: 1, transform: T(1), offset: .74 }, { opacity: 0, transform: T(1) }]
      : kind === "stamp"
        // pressed: comes down a little large, lands, holds still, lifts away
        ? [{ opacity: 0, transform: T(1.35), easing: "cubic-bezier(.2,.8,.3,1)" }, { opacity: 1, transform: T(1), offset: inAt },
           { opacity: 1, transform: T(1), offset: .76 }, { opacity: 0, transform: T(1.04, -4) }]
        // inked: pops, settles, drifts up a few pixels as it fades
        : [{ opacity: 0, transform: T(.6, 4), easing: "cubic-bezier(.3,1.5,.5,1)" }, { opacity: 1, transform: T(1), offset: inAt },
           { opacity: 1, transform: T(1, -3), offset: .72 }, { opacity: 0, transform: T(1, -10) }];
    try { n.animate(frames, { duration: dur, easing: "linear", fill: "both" }); } catch (e) {}
    setTimeout(() => { n.remove(); this._on[kind] = Math.max(0, this._on[kind] - 1); }, dur + 40);
  }

  /* ---- BIG: comic.js impact asks here before it draws. True: taken over (queued,
     turned into a stamp, or dropped). False: draw now (opts._dur is set). ---- */
  route(kind, at, opts) {
    const lv = this.level();
    if (lv === "off") return true;
    // the pipeline (below) is presenting this paradox: comic's single panel stands down
    if (kind === "paradox" && !opts._pipe && performance.now() < (this._pdxOwn || 0)) return true;
    // a paradox wears the colour of the traveller who landed it on the hit it names
    if (kind === "paradox" && !opts.c && this._pdx) {
      const h = this._pdx, now = performance.now();
      if (now - h.t < 4000) opts.c = h.col;
    }
    // a contract names its category and its result
    if (kind === "contract" && this._reward && !opts.word) {
      const f = REWARD[this._reward.category];
      if (f) { opts.word = f[0]; opts.sub = f[1][(this._reward.roll || 1) - 1] || opts.sub; }
    }
    if (kind === "yearzero" && !at && this._phone()) {   // the well lies on the chart: point there, or the stage's top
      try {
        const ch = this.comic && this.comic._chart();
        const e = ch && ch.host.querySelector(`.sea-well, .${ch.mark}[data-c="0"]`);
        at = e ? e.getBoundingClientRect() : null;
      } catch (e) {}
      if (!at) { const st = this._stage(); at = { x: (st.left + st.right) / 2, y: 60 }; }
    }
    if (this._phone() && this._phoneBig(kind, at, opts, lv)) return true;
    if (lv === "light") {
      const face = BIG_FACE[kind] || ["POW!", "plain"];
      const a = at && at.width != null ? { r: at, box: at, above: false }
        : at && at.x != null ? { r: { left: at.x, top: at.y, right: at.x, bottom: at.y, width: 0, height: 0 }, box: null, above: true } : null;
      if (a) this.stamp(opts.word || face[0], face[1], a, { sound: false, color: opts.c });
      return true;
    }
    if (kind === "yearzero" && !at) {                // YEAR ZERO lands beside the well on the chart
      try {
        const ch = this.comic && this.comic._chart();
        const r = ch && this._rect(ch.host.querySelector(`.sea-well, .${ch.mark}[data-c="0"]`));
        if (r) at = this._beside(r, 200, this._rect(ch.host));
        if (at) opts._at = at;
      } catch (e) {}
    }
    const now = performance.now();
    const dur = Math.max(2100, Math.round((opts.big ? 3400 : 2800) * this.pace().impact));
    if (now < this._bigUntil) {
      // one at a time: this one waits its turn (three at most; stale ones are dropped)
      this._bigQ.push({ kind, at, opts, t: now });
      if (this._bigQ.length > 3) this._bigQ.shift();
      this._pumpSoon();
      return true;
    }
    opts._dur = dur;
    this._bigUntil = now + dur + 80;                // the next begins once this one has faded
    return false;
  }
  // a big panel on a phone: its subject if on the stage (smaller, fitted off the CRT and the
  // dice), the life thread for my own hits (comic's panels on me carry no subject there),
  // an edge marker when the subject is in another view. True: handled here.
  _phoneBig(kind, at, opts, lv) {
    const face = BIG_FACE[kind] || ["POW!", "plain"], word = opts.word || face[0];
    let r = at && at.width != null ? at : at && at.x != null ? { left: at.x, top: at.y, right: at.x, bottom: at.y, width: 0, height: 0 } : null;
    let cx, cy;
    if (!r) { const L = this._life(); cx = L.r.left; cy = L.r.top; }
    else {
      const st = this._stage(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      if (cx < st.left || cx > st.right || cy < st.top || cy > st.bottom) { this._edge(word, face[1], r, { color: opts.c }); return true; }
    }
    if (lv === "light") {
      this.stamp(word, face[1], { r: { left: cx, right: cx, top: cy, bottom: cy, width: 0, height: 0 }, box: null, at: true }, { sound: false, color: opts.c });
      return true;
    }
    const hw = opts.big ? 66 : 50, hh = opts.big ? 62 : 46;   // the panel at the phone's scale (fx.css)
    const f = this._fit(cx - hw, cy - hh, 2 * hw, 2 * hh);
    opts._at = { x: cx + f.dx, y: cy + f.dy }; opts._mx = 1; opts._my = 1;
    return false;
  }
  _pumpSoon() {
    if (this._bigT) return;
    this._bigT = setTimeout(() => {
      this._bigT = 0;
      const now = performance.now();
      if (now < this._bigUntil) { this._pumpSoon(); return; }
      while (this._bigQ.length && now - this._bigQ[0].t > 7000) this._bigQ.shift();
      const nx = this._bigQ.shift();
      if (!nx || !this.comic) return;
      this.comic.impact(nx.kind, nx.at, nx.opts);   // it asks route again and draws
      if (this._bigQ.length) this._pumpSoon();
    }, Math.max(60, this._bigUntil - performance.now()));
  }
  big(kind, at, opts = {}) {
    if (this._quiet() || !this.comic) return;
    try { this.comic.impact(kind, at, opts); } catch (e) {}
  }

  /* ---- THE CATALOGUE: every rules event, one effect (or none) ---- */
  event(kind, p) {
    if (!p) return;
    if (kind === "heated" || kind === "exploded" || kind === "hour_started" || kind === "respawned") setTimeout(() => this.heatSync(), 0);
    if (window.__helaMute && this.tutorial) this._tutorBig(kind, p);
    switch (kind) {
      case "hour_started": this._trips = {}; return;
      case "paradox_resolved": {                // the zaps follow the engine's own pipeline
        const st = this._pdxStar(p);
        this._pdx = st ? { col: st.col, t: performance.now() } : null;
        this._paradoxPipeline(p);
        return;
      }
      case "module_resolved":                   // §29.9: the valve drains energy while a function is shut
        if (p.kind === "escape_valve") for (const e of p.effects || []) if (e.energy < 0) this.valveDrain(e.seat, -e.energy);
        return;
      case "valve_fed":                         // a calm valve charges the reactor
        if (p.fed > 0) this.pop("PSSSH!", "valve", () => this._seat(p.seat, "heat"));
        return;
      case "valve_reward":
        return this.stamp("FULL CHARGE!", "valve", () => this._seat(p.seat, "file"));
      case "overloaded":                        // mine is the machine's own moment (overload, from game.js)
        if ((p.functions || []).length && p.seat !== this._me()) this.stamp("OVERLOAD!", "danger", () => this._seat(p.seat, "file"));
        return;
      case "milestone":
        return this.stamp(`CENTURY ${roman(p.century)}!`, "good", () => this._isle(p.century) || this._seat(p.seat, "file"));
      case "declared":
        return this.stamp("CLEARED", "good", () => this._seat(p.seat, "file"));
      case "card_renewed":
        return this.pop("FLIP!", "market", () => this._rowOfMarket());
      case "card_destroyed":
        if (!p.zone) return;
        return this.stamp("CRUNCH!", "danger", () => (p.zone === "equipment" && p.owner ? this._seat(p.owner, "file") : this._card(p.card) || this._el("#market-zone")));
      case "recycled":
        return this.pop("SCRAP!", "energy", () => this._seat(p.seat, { card: p.card }) || this._seat(p.seat, "life"));
      case "card_stolen":
        return this.pop("SNATCH!", "danger", () => this._seat(p.seat, "file"));
      case "activated":
        return this.pop("ZING!", "plain", () => this._seat(p.seat, { card: p.card }) || this._seat(p.seat, "file"));
      case "reward_resolved":
        this._reward = p;                         // comic's contract panel reads its face (route)
        clearTimeout(this._rewardT);
        this._rewardT = setTimeout(() => { this._reward = null; }, 8000);
        return;
      case "merchant_moved":
        if (p.teleport) this.stamp("VWORP!", "paradox", () => this._isle(p.to));
        return;
      case "secret_market_opened":
      {
        // on the vault's century, else the Merchant's stall, else under HELA's rail
        const a = this._isle(11) || this._el("#market-zone") || this._el("#hull .vz-rail");
        let chart = null;
        try { const ch = this.comic && this.comic._chart(); chart = ch && this._rect(ch.host); } catch (e) {}
        if (a) this.big("vault", this._beside(a.r, 170, chart), { big: true, sub: "THE VAULT OPENS" });
        return;
      }
      case "respawned":
        return this.stamp("IMMUNE", "shield", () => this._seat(p.seat, "file"));
      case "game_over":
        // the cabin's finale stamps the winner itself; elsewhere the end gets its panel
        if (!document.body.classList.contains("cabin-on") && p.winner)
          this.big("settle", (this._seat(p.winner, "file") || {}).r || null, { big: true, sub: "TIME SETTLES" });
        return;
      default: return;
    }
  }

  // the hit the big panel names (comic.js: mine first, else the first rival hit) and the
  // colour of the traveller whose die reached that victim (game.js bills it the same way)
  _pdxStar(p) {
    const me = this._me();
    const hits = (p.hits || []).filter((h) => h.damage); if (!hits.length) return null;
    const star = hits.find((h) => h.seat === me) || hits.find((h) => h.seat !== me) || hits[0];
    // the colour of the traveler whose die REACHED the star (by position), never merely a
    // traveler who fed the pool
    let by = null;
    try { const q = (this._paradoxPairs(p) || []).flat().find((x) => x.victim === star.seat && x.causer); by = q ? q.causer : null; } catch (e) {}
    return { star, col: by ? this._col(by) : null };
  }

  /* ---- THE PARADOX PIPELINE (engine/paradox.py resolve_paradox_pool, §18.3-18.4) ----
     One module's paradoxes form a pool of (causer, victim) pairs. The engine applies
     them from the smallest causer-to-victim distance to the largest, and pairs of
     EQUAL distance resolve together. The event only carries each victim's total, so
     the pairs are rebuilt from public facts: the revealed machines (who fed this pool)
     and the centuries (who is ahead, beside, behind). Then every victim on the table
     gets one ZZAP per pair in its causer's colour: pairs of one distance land TOGETHER,
     a little smaller (about 78%) and spread apart so no two overlap; the next distance
     lands after them. A hit the rebuild cannot explain (a reflection, a card) still
     gets its zap, in the last beat. */
  _paradoxPairs(p) {
    const col = (+p.module || 0) - 4;
    if (!(col >= 0 && col <= 2)) return null;
    const v = this._view(), g = this.game;
    if (!v || !v.travelers) return null;
    const hits = (p.hits || []).filter((h) => h.damage > 0);
    if (!hits.length) return null;
    const hit = new Map(hits.map((h) => [h.seat, h.damage]));
    const tv = new Map(v.travelers.map((t) => [t.name, t]));
    const live = v.travelers.filter((t) => !(t.statuses || []).includes("awaiting_respawn"));
    const holds = (t, name) => (t.hand || t.equipment || []).some((c) => c && c.name === name);
    const pairs = [];
    for (const [seat, a] of Object.entries((g && g._lastAlloc) || {})) {
      const c = tv.get(seat), m = a && a.matrix;
      if (!c || !m || !m[1]) continue;
      const add = (k, dmg) => {
        for (const t of live) {
          if (t.name === seat) continue;
          const ok = k === 0 ? t.century > c.century : k === 1 ? (holds(c, "Window of Time") || t.century === c.century) : t.century < c.century;
          if (ok && hit.has(t.name)) pairs.push({ causer: seat, victim: t.name, dist: Math.abs(t.century - c.century), dmg });
        }
      };
      const val = m[1][col] || 0;
      if (val > 0) add(col, col === 2 ? val * 2 : val);   // the Past (module 6, an overload) hits for double
      if (col === 0 && val > 0 && holds(c, "Spear of Destiny")) add(2, val);   // a future paradox also fires a past one
    }
    // a hit no pair explains still gets its zap, last
    const far = pairs.reduce((mx, q) => Math.max(mx, q.dist), 0);
    for (const h of hits) if (!pairs.some((q) => q.victim === h.seat)) pairs.push({ causer: null, victim: h.seat, dist: far + 1, dmg: h.damage });
    // the number under a zap: that pair's share when it is certain (one pair, or the shares add up)
    for (const h of hits) {
      const mine = pairs.filter((q) => q.victim === h.seat);
      const sum = mine.reduce((n, q) => n + (q.dmg || 0), 0);
      mine.forEach((q) => { q.sub = mine.length === 1 ? `-${h.damage}` : sum === h.damage ? `-${q.dmg}` : ""; });
    }
    // group by distance, smallest first: each group is one beat
    const beats = [];
    for (const q of pairs.sort((a, b) => a.dist - b.dist)) {
      const last = beats[beats.length - 1];
      if (last && last[0].dist === q.dist) last.push(q); else beats.push([q]);
    }
    return beats;
  }
  _paradoxPipeline(p) {
    if (this._quiet() || this.level() === "off") return;
    const beats = this._paradoxPairs(p);
    if (!beats || !beats.length) return;
    this._pdxOwn = performance.now() + 1500;         // comic's own single panel stands down for this event
    // the zaps belong beside the victims' case files and lifethread, which live on the desk:
    // while the camera looks at the wagon or the paperwork they wait for the desk (8 s at most)
    this._whenDesk(() => this._playBeats(beats), 8000);
  }
  _scene() { const c = document.getElementById("cam"); return (c && c.dataset.scene) || (this.game && this.game.camera && this.game.camera.scene) || "main"; }
  _whenDesk(fn, maxMs) {
    if (this._phone()) { fn(); return; }            // a phone points toward another view instead of waiting
    if (!document.body.classList.contains("cabin-on") || this._scene() === "main") { fn(); return; }
    const cam = document.getElementById("cam");
    if (!cam) { fn(); return; }
    let done = false;
    const mo = new MutationObserver(() => {
      if (done || this._scene() !== "main") return;
      done = true; mo.disconnect(); clearTimeout(t);
      setTimeout(fn, this.ms(450));                  // once the camera has settled on the desk
    });
    mo.observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
    const t = setTimeout(() => { if (!done) { done = true; mo.disconnect(); } }, maxMs);   // too old to be news: dropped
  }
  _playBeats(beats) {
    if (this._quiet() || this.level() === "off") return;
    const me = this._me();
    const one = Math.max(2100, Math.round(2800 * this.pace().impact));
    const beatMs = beats.length > 1 ? Math.max(1800, Math.round(one * .72)) : one;   // several beats read a little quicker
    const gap = Math.round(beatMs * .8);             // the next distance lands as this one fades
    const total = gap * (beats.length - 1) + beatMs;
    const start = Math.max(0, this._bigUntil - performance.now());   // one big moment at a time
    if (this.level() === "full") this._bigUntil = performance.now() + start + total + 80;   // Light's stamps hold nothing up
    beats.forEach((beat, i) => setTimeout(() => {
      if (this._quiet()) return;
      if (i) { try { audio.play("paradox", { power: .6 }); } catch (e) {} }   // each later distance on its own beat
      if (this.level() === "light") {                // Light: a stamp per zap, in the causer's colour
        beat.forEach((q) => this.stamp("ZZAP!", "paradox", () => (this._phone() && q.victim === me ? this._lifeBeside() : this._seat(q.victim, "life")), { sound: false, color: q.causer ? this._col(q.causer) : null }));
        return;
      }
      this._zaps(beat, beatMs, me);
    }, start + i * gap));
  }
  // one beat: every zap together, spread apart, smaller when more than one
  _zaps(beat, dur, me) {
    const k = beat.length > 1 ? .78 : 1;
    const phone = this._phone();
    const pts = beat.map((q) => {
      let r = null;
      if (phone) {
        if (q.victim === me) { const L = this._lifeBeside(); return { q, x: L.r.left, y: L.r.top }; }   // beside my life thread's tick
        this._off = null;
        r = this._rect(this._pcard(q.victim));
        if (!r) { if (this._off) this._edge("ZZAP!", "paradox", this._off.r, { color: q.causer ? this._col(q.causer) : null }); return null; }
        return { q, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      try { r = this.comic && this.comic._seatRect(q.victim); } catch (e) {}
      if (!r) return null;
      const x = r.width != null ? r.left + r.width / 2 : r.x, y = r.width != null ? r.top + r.height / 2 : r.y;
      // mine rides a little higher, so the lifethread's number stays in sight while it counts down
      return { q, x, y: q.victim === me ? y - 40 : y };
    }).filter(Boolean);
    if (!pts.length) return;
    // never at the exact same place: zaps closer than a burst apart are fanned out side by side
    const min = (beat.some((q) => q.victim === me) ? 235 : 185) * k * (phone ? .52 : 1);   // a big panel's word is wider
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
        const dx = pts[b].x - pts[a].x, dy = pts[b].y - pts[a].y, d = Math.hypot(dx, dy);
        if (d >= min) continue;
        const push = (min - d) / 2 + 1, ux = d > 1 ? dx / d : 1, uy = d > 1 ? dy / d : .25;
        pts[a].x -= ux * push; pts[a].y -= uy * push; pts[b].x += ux * push; pts[b].y += uy * push;
        moved = true;
      }
      if (!moved) break;
    }
    if (phone) for (const pt of pts) {                // on the stage, off the CRT, the dice and the keys
      const hw = (pt.q.victim === me ? 66 : 50) * k, hh = (pt.q.victim === me ? 62 : 46) * k;
      const f = this._fit(pt.x - hw, pt.y - hh, 2 * hw, 2 * hh); pt.x += f.dx; pt.y += f.dy;
    }
    for (const pt of pts) this._zap(pt, k, dur, pt.q.victim === me);
  }
  // one ZZAP panel, the comic layer's own look (app.css .cx-hit), drawn here so several can
  // stand at once; in the causer's colour (fx.css .cx-seat)
  _zap(pt, k, dur, big) {
    const q = pt.q, gfx = document.body.classList.contains("gfx-low") ? "low" : document.body.classList.contains("gfx-medium") ? "medium" : "high";
    const mx = (big ? 240 : 150) * k, my = (big ? 140 : 110) * k;   // the whole word stays on screen
    const ph = this._phone();                         // a phone's point is already fitted to its stage
    const x = ph ? pt.x : Math.max(mx, Math.min(innerWidth - mx, pt.x)), y = ph ? pt.y : Math.max(my, Math.min(innerHeight - my, pt.y));
    const h = document.createElement("div");
    const col = q.causer ? this._col(q.causer) : null;
    h.className = "cx-hit fx-zap" + (big ? " cx-hit-big" : "") + " cx-g-" + gfx + (col ? " cx-seat" : "");
    h.style.left = Math.round(x) + "px"; h.style.top = Math.round(y) + "px";
    if (k !== 1) h.style.transform = `scale(${k})`;
    h.style.setProperty("--cx-c", col || "#b98cff"); h.style.setProperty("--cx-ink", "#1a0f2e");
    const lines = (!this._calm() && gfx !== "low" && big) ? document.createElement("i") : null;
    if (lines) { lines.className = "cx-lines"; h.appendChild(lines); }
    const burst = document.createElement("i"); burst.className = "cx-burst"; h.appendChild(burst);
    const word = document.createElement("b"); word.className = "cx-word"; word.textContent = "ZZAP!"; h.appendChild(word);
    if (q.sub) { const sub = document.createElement("span"); sub.className = "cx-sub"; sub.textContent = q.sub; h.appendChild(sub); }
    this.root.appendChild(h);
    const rot = (Math.random() * 8 - 4).toFixed(1);
    const fin = { duration: dur, easing: "linear", fill: "both" };
    const pop = Math.min(.12, 150 / dur);
    try {
      if (this._calm()) h.animate([{ opacity: 0 }, { opacity: 1, offset: pop }, { opacity: 1, offset: .72 }, { opacity: 0 }], fin);
      else {
        word.animate([
          { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1.5)`, opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
          { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: pop },
          { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1.02)`, opacity: 1, offset: .72 },
          { transform: `translate(-50%,-54%) rotate(${rot}deg) scale(1.04)`, opacity: 0 }], fin);
        burst.animate([
          { transform: "translate(-50%,-50%) scale(.4) rotate(0deg)", opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
          { transform: "translate(-50%,-50%) scale(1) rotate(6deg)", opacity: 1, offset: pop },
          { transform: "translate(-50%,-50%) scale(1) rotate(7deg)", opacity: 1, offset: .72 },
          { transform: "translate(-50%,-50%) scale(1.05) rotate(8deg)", opacity: 0 }], fin);
        if (lines) lines.animate([
          { transform: "translate(-50%,-50%) scale(.85)", opacity: 0 },
          { transform: "translate(-50%,-50%) scale(1)", opacity: .8, offset: pop },
          { transform: "translate(-50%,-50%) scale(1.04)", opacity: .7, offset: .7 },
          { transform: "translate(-50%,-50%) scale(1.1)", opacity: 0 }], fin);
      }
    } catch (e) {}
    setTimeout(() => h.remove(), dur + 80);
  }

  /* ---- THE MOTOR HEATS: a quiet, constant comic mark on MY time machine while it has
     heat (engine: booms 0..12, the motor explodes at 12 and the booms are discarded).
     Inked heat-wobble lines rise off the casing above the boom gauge, and the gauge's
     edge is inked in the step's colour: warm 1..4 (amber, two lines), hot 5..8 (orange,
     three lines, a steam puff), danger 9..11 (red, four quicker lines, two puffs and a
     sweat drop). Nothing at 0. It lives INSIDE the wrist machine's SVG beside the gauge
     (cabin.js #mano-boomg, attached from outside), so it travels with the machine when
     the hand becomes the cursor. Only CSS transform/opacity loops on a handful of small
     nodes, paced by --pdx-pace, held still by the nap (body.pdx-nap), still under calm
     motion and in Light (a static inked mark), gone in Off. Synced on each game state. */
  heatSync() {
    try {
      const g = this.game, v = g && g.view;
      const me = v && v.travelers && v.travelers.find((t) => t.is_self || t.name === g.seat);
      const b = me ? Math.max(0, Math.min(12, +me.booms || 0)) : 0;
      const lv = this.storedLevel();
      const step = b <= 0 || lv === "off" || (me && (me.statuses || []).includes("awaiting_respawn")) ? 0 : b >= 9 ? 3 : b >= 5 ? 2 : 1;
      let back = document.getElementById("fx-heat"), front = document.getElementById("fx-heat-edge");
      const gauge = document.getElementById("mano-boomg");
      const svg = gauge && gauge.ownerSVGElement;
      if (!step || !svg) { if (back) back.remove(); if (front) front.remove(); return; }
      // the chassis: the top-level group of the device that holds the gauge. The smoke is
      // drawn BEFORE it (so the casing paints over the smoke's roots and it rises from
      // behind); the gauge's inked edge stays in front, right after the gauge.
      let chassis = gauge;
      while (chassis.parentNode && chassis.parentNode !== svg) chassis = chassis.parentNode;
      if (!back || back.ownerSVGElement !== svg || back.nextSibling !== chassis) {
        if (back) back.remove();
        back = back && back.ownerSVGElement === svg ? back : this._heatSmoke();
        svg.insertBefore(back, chassis);
      }
      if (!front || front.ownerSVGElement !== svg) {
        if (front) front.remove();
        front = this._heatEdge();
        gauge.parentNode.insertBefore(front, gauge.nextSibling);
      }
      // still in Light, and under Low graphics on a desktop (a phone's saved Full choice moves it)
      const still = lv === "light" || (document.body.classList.contains("gfx-low") && !document.documentElement.classList.contains("pdx-phone"));
      const cls = `fx-heat fh${step}` + (still ? " fx-still" : "");
      for (const el of [back, front]) if (el.getAttribute("class") !== cls) el.setAttribute("class", cls);
      back.setAttribute("data-booms", String(b));
    } catch (e) {}
  }
  // THE HEAT, shy: a few thin wavy wisps of heat shimmer and faint steam rising from the
  // heat mechanism itself (the boom gauge in the casing's right side, x 500..532 in the
  // machine's own SVG), emerging from behind the casing's top edge above it, curling up a
  // short way and fading. Warm two faint wisps, hot three a little taller, danger five with
  // a faint orange tint at their base and one tiny spark (fx.css). Never a cloud.
  _heatSmoke() {
    const NS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(NS, "g");
    g.id = "fx-heat";
    g.setAttribute("aria-hidden", "true");
    g.setAttribute("pointer-events", "none");
    const wisp = "M0 0 C -5 -7 5 -13 0 -20 C -5 -27 4 -32 0 -40";
    // [x, the first step that shows it, height scale]
    const W = [[512, 1, 1], [523, 1, .85], [503, 2, 1.1], [531, 3, 1], [517, 3, 1.25]];
    g.innerHTML =
      '<defs><radialGradient id="fxhBase"><stop offset="0" stop-color="#ff8a3a" stop-opacity=".55"/>'
      + '<stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient></defs>'
      + '<ellipse class="fxh-base" cx="517" cy="156" rx="26" ry="10" fill="url(#fxhBase)"/>'
      + W.map(([x, st, k], i) => `<g transform="translate(${x} 166) scale(${k})"><g class="fxh-wisp fxh-s${st} fxh-w${i + 1}">`
        + `<path class="fxh-steam" d="${wisp}"/><path class="fxh-shim" d="${wisp}"/></g></g>`).join("")
      + '<g transform="translate(520 158)"><circle class="fxh-spark" r="1.6"/></g>';
    return g;
  }
  // in front, small: the gauge's inked edge in the step's colour, and at danger a sweat drop
  // on the casing's right wall (never on the screen)
  _heatEdge() {
    const NS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(NS, "g");
    g.id = "fx-heat-edge";
    g.setAttribute("aria-hidden", "true");
    g.setAttribute("pointer-events", "none");
    g.innerHTML =
      '<rect class="fxh-glow" x="496" y="186" width="40" height="146" rx="8"/>' +
      '<rect class="fxh-edge" x="497.5" y="187.5" width="37" height="143" rx="7"/>' +
      '<g transform="translate(552 176) scale(1.4)"><path class="fxh-drop" d="M0 -9 C 3 -3 5 0 5 3 A 5 5 0 0 1 -5 3 C -5 0 -3 -3 0 -9 Z"/></g>';
    return g;
  }

  /* ---- OVERLOAD ON MY MACHINE (game.js awaits it, then HELA explains through help.js
     with the row's yellow box): a jagged OVERLOAD! burst with inked sparks at the end of
     the function's row, and a SHUT stamp slamming across the row, gone before her line.
     The row keeps its steady SHUT plate (game.js _shutMark), inked as a stamp by fx.css.
     Resolves when the moment is over; at once when there is nothing to show. ---- */
  overload(p) {
    const rows = (p && p.functions) || [];
    if (!rows.length || this._quiet() || this.level() === "off") return Promise.resolve();
    this._off = null;
    const rects = rows.map((r) => this._rowRect(r)).filter(Boolean);
    if (!rects.length) { if (this._phone() && this._off) this._edge("OVERLOAD!", "danger", this._off.r); return Promise.resolve(); }
    if (this.level() === "light") {
      const r = rects[0];
      this.stamp("OVERLOAD!", "danger", { r, box: r, above: true });
      return new Promise((res) => setTimeout(res, this.ms(700)));
    }
    const dur = Math.max(1600, this.ms(2000));
    return new Promise((res) => {
      const go = () => {
        this._bigUntil = performance.now() + dur + 80;
        rects.forEach((r, i) => setTimeout(() => this._overloadRow(r, dur - i * 120), i * 120));
        setTimeout(res, dur + 60);
      };
      const wait = this._bigUntil - performance.now();   // one big moment at a time
      wait > 0 ? setTimeout(go, wait + 40) : go();
    });
  }
  _rowRect(r) {
    const cells = [...document.querySelectorAll(`#hull-console .matrix-wrap .cell[data-r="${r}"]`)].map((c) => this._rect(c)).filter(Boolean);
    if (!cells.length) return null;
    const l = Math.min(...cells.map((c) => c.left)), t = Math.min(...cells.map((c) => c.top));
    const rr = Math.max(...cells.map((c) => c.right)), b = Math.max(...cells.map((c) => c.bottom));
    return { left: l, top: t, right: rr, bottom: b, width: rr - l, height: b - t };
  }
  _overloadRow(r, dur) {
    if (!this.root) return;
    const calm = this._calm();
    // the burst stands above the machine's screen, over the shut row: the SHUT stamp across
    // the row never covers its word, and it stays clear of the lifethread readout
    const scr = this._rect(document.getElementById("mano-screen"));
    let cx = r.left + r.width / 2, cy = (scr ? scr.top : r.top) - 40;
    if (this._phone()) {                              // the phone's burst is half size: just above the CRT, on the stage
      cy = (scr ? scr.top : r.top) - 26;
      const f = this._fit(cx - 60, cy - 22, 120, 44); cx += f.dx; cy += f.dy;
    }
    // the burst at the row's end
    const h = document.createElement("div");
    h.className = "cx-hit fx-zap fx-ovl cx-g-" + (document.body.classList.contains("gfx-low") ? "low" : "high");
    h.style.left = Math.round(cx) + "px"; h.style.top = Math.round(cy) + "px";
    h.style.transform = "scale(.72)";
    h.style.setProperty("--cx-c", "#ff6a2a"); h.style.setProperty("--cx-ink", "#260604");
    const burst = document.createElement("i"); burst.className = "cx-burst"; h.appendChild(burst);
    const word = document.createElement("b"); word.className = "cx-word"; word.textContent = "OVERLOAD!"; h.appendChild(word);
    // inked sparks flying off it
    const sparks = [];
    if (!calm) for (let i = 0; i < 6; i++) {
      const sp = document.createElement("i"); sp.className = "fx-spark";
      h.appendChild(sp); sparks.push(sp);
    }
    // the SHUT stamp across the row
    const st = document.createElement("div");
    st.className = "fx-shutslam";
    st.style.left = Math.round(r.left + r.width / 2) + "px"; st.style.top = Math.round(r.top + r.height / 2) + "px";
    st.style.width = Math.round(r.width + 8) + "px";
    st.textContent = "SHUT";
    this.root.append(h, st);
    const fin = { duration: dur, easing: "linear", fill: "both" }, pop = Math.min(.12, 160 / dur);
    try {
      if (calm) {
        h.animate([{ opacity: 0 }, { opacity: 1, offset: pop }, { opacity: 1, offset: .7 }, { opacity: 0 }], fin);
        st.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .75 }, { opacity: 0 }], fin);
      } else {
        word.animate([
          { transform: "translate(-50%,-50%) rotate(-4deg) scale(1.6)", opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
          { transform: "translate(-50%,-50%) rotate(-4deg) scale(1)", opacity: 1, offset: pop },
          { transform: "translate(-50%,-50%) rotate(-4deg) scale(1.02)", opacity: 1, offset: .7 },
          { transform: "translate(-50%,-56%) rotate(-4deg) scale(1.04)", opacity: 0 }], fin);
        burst.animate([
          { transform: "translate(-50%,-50%) scale(.3) rotate(0deg)", opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
          { transform: "translate(-50%,-50%) scale(1) rotate(8deg)", opacity: 1, offset: pop },
          { transform: "translate(-50%,-50%) scale(1) rotate(9deg)", opacity: 1, offset: .7 },
          { transform: "translate(-50%,-50%) scale(1.05) rotate(10deg)", opacity: 0 }], fin);
        sparks.forEach((sp, i) => { const a = i * 60 + 15; sp.animate([
          { transform: `rotate(${a}deg) translateX(40px) scaleX(.4)`, opacity: 0 },
          { transform: `rotate(${a}deg) translateX(70px) scaleX(1)`, opacity: 1, offset: .12 },
          { transform: `rotate(${a}deg) translateX(${110 + (i % 2) * 20}px) scaleX(.6)`, opacity: 0, offset: .45 },
          { transform: `rotate(${a}deg) translateX(120px) scaleX(.6)`, opacity: 0 }], fin); });
        st.animate([
          { transform: "translate(-50%,-50%) rotate(-3deg) scale(1.5)", opacity: 0, offset: 0 },
          { transform: "translate(-50%,-50%) rotate(-3deg) scale(1.5)", opacity: 0, offset: .1, easing: "cubic-bezier(.3,0,.6,1)" },
          { transform: "translate(-50%,-50%) rotate(-3deg) scale(1)", opacity: 1, offset: .2 },
          { transform: "translate(-50%,-50%) rotate(-3deg) scale(1)", opacity: 1, offset: .75 },
          { transform: "translate(-50%,-50%) rotate(-3deg) scale(1)", opacity: 0 }], fin);
      }
    } catch (e) {}
    setTimeout(() => { try { audio.play("chart_stamp"); } catch (e) {} }, Math.round(dur * .2));   // the SHUT lands with its sound
    setTimeout(() => { h.remove(); st.remove(); }, dur + 60);
  }

  /* ---- THE VALVE DRAINS LIFE (§29.9): a die sent to the escape valve while a function is
     shut costs its value in energy. Mine: steam hisses off the valve, a small VALVE! stamp
     beside it and a red -N beside my lifethread. A rival's: a stamp beside their file. ---- */
  valveDrain(seat, n) {
    if (!n || this._quiet() || this.level() === "off") return;
    if (seat !== this._me()) return this.stamp("VALVE -" + n, "danger", () => this._seat(seat, "life"));
    const vent = this._rect(document.getElementById("mano-vent"));
    try { audio.play("heat", { power: .5 }); } catch (e) {}   // the hiss
    if (vent && this.level() === "full" && !this._calm()) this._steam(vent);
    if (vent) this.stamp("VALVE!", "danger", { r: vent, box: vent, above: true }, { sound: false });
    if (!this._phone()) this.pop("-" + n, "danger", () => this._seat(seat, "life"), { big: true });
  }
  _steam(r) {
    const x = r.left + r.width / 2, y = r.top + r.height * .3, dur = Math.max(1100, this.ms(1500));
    for (let i = 0; i < 3; i++) {
      const pf = document.createElement("i"); pf.className = "fx-steam";
      pf.style.left = Math.round(x + (i - 1) * 9) + "px"; pf.style.top = Math.round(y) + "px";
      this.root.appendChild(pf);
      try { pf.animate([
        { transform: "translate(-50%,-50%) scale(.5)", opacity: 0 },
        { transform: "translate(-50%,-80%) scale(1)", opacity: .9, offset: .2 },
        { transform: `translate(${-50 + (i - 1) * 60}%,-260%) scale(1.6)`, opacity: 0 }],
        { duration: dur, delay: i * 110, easing: "ease-out", fill: "both" }); } catch (e) {}
      setTimeout(() => pf.remove(), dur + i * 110 + 60);
    }
  }

  /* ---- THE PAGE: a clear-line panel that turns in over the chart with a title, for
     the big story beats of the map (a new period, the whole chart unrolled). Big tier:
     it takes the stage like a panel, and the small effects wait for it. ---- */
  page(title, sub, opts = {}) {
    if ((this._quiet() && !opts.force) || this.level() === "off" || !this.root) return;
    // the chart's frame (the rail), whose top edge is the torn border the page lands on;
    // on a phone the page turns in at the top of whatever view is on the stage
    let host;
    if (this._phone()) {                              // over the pip-boy when it is in view, clear of the police files
      const st = this._stage(), sc = this._rect(document.getElementById("mano-screen"));
      const cx = sc ? sc.left + sc.width / 2 : (st.left + st.right) / 2;
      host = { left: cx - 1, top: -12, width: 2, height: st.bottom };
    }
    else host = this._rect(document.getElementById("timeline-rail"));
    if (!host) return;
    if (this.level() === "light") {                // Light: a stamp at the chart's top edge
      const a = { r: { left: host.left + host.width / 2, right: host.left + host.width / 2, top: host.top + 30, bottom: host.top + 30, width: 0, height: 0 }, box: null, above: false };
      return this.stamp(title, opts.tone || "plain", a, { sound: false });
    }
    const now = performance.now();
    if (now < this._bigUntil && !opts._late) {       // one big thing at a time
      setTimeout(() => this.page(title, sub, Object.assign({}, opts, { _late: true })), this._bigUntil - now + 60);
      return;
    }
    const dur = Math.max(2600, this.ms(3400));
    this._bigUntil = performance.now() + dur + 80;
    const n = document.createElement("div");
    n.className = "fx-page fx-" + (opts.tone || "plain");
    n.style.setProperty("--fx-c", TONE[opts.tone] || TONE.plain);
    // on the chart's top edge, where the torn border is: over sea, not over the pieces
    n.style.left = Math.round(host.left + host.width / 2) + "px";
    n.style.top = Math.round(this._phone() ? 8 : Math.max(56, host.top + 18)) + "px";
    const w = document.createElement("i"); w.className = "fx-wipe"; n.appendChild(w);
    const b = document.createElement("b"); b.textContent = title; n.appendChild(b);
    if (sub) { const sp = document.createElement("span"); sp.textContent = sub; n.appendChild(sp); }
    this.root.appendChild(n);
    const T = (ry, s = 1) => `translateX(-50%) perspective(900px) rotateY(${ry}deg) scale(${s})`;
    const inAt = Math.min(.16, 420 / dur);
    const frames = this._calm()
      ? [{ opacity: 0, transform: T(0) }, { opacity: 1, transform: T(0), offset: inAt }, { opacity: 1, transform: T(0), offset: .8 }, { opacity: 0, transform: T(0) }]
      // a page turning in from the left edge, held, turning away to the right
      : [{ opacity: 0, transform: T(-80, .96), easing: "cubic-bezier(.2,.8,.3,1)" }, { opacity: 1, transform: T(0), offset: inAt },
         { opacity: 1, transform: T(0), offset: .8, easing: "cubic-bezier(.6,0,.8,.4)" }, { opacity: 0, transform: T(70, .98) }];
    try { n.animate(frames, { duration: dur, easing: "linear", fill: "both" }); } catch (e) {}
    if (!this._calm()) try {                          // the ink wipe runs across as it lands
      w.animate([{ transform: "translateX(-110%)" }, { transform: "translateX(110%)" }],
        { duration: Math.max(420, this.ms(620)), delay: this.ms(180), easing: "cubic-bezier(.5,0,.3,1)", fill: "both" });
    } catch (e) {}
    try { audio.play("chart_stamp"); } catch (e) {}
    setTimeout(() => n.remove(), dur + 60);
  }
  _eraPage() {
    const rail = document.getElementById("timeline-rail"); if (!rail) return;
    const P = rail.classList.contains("skin-ori") ? ["THE ORIGINS", "centuries I to X", "valve"]
      : rail.classList.contains("skin-sing") ? ["THE SINGULARITY", "centuries XX to XXX", "paradox"]
      : ["THE ASCENSION", "centuries XI to XIX", "travel"];
    this.page(P[0], P[1], { tone: P[2] });
  }
  // the whole chart unrolled at the end of Learn to Play (tutorial-drive.js calls it)
  chartReveal() { this.page("THE LAST TIMELINE", "all thirty centuries, I to XXX", { tone: "good", force: true }); }
  // a relic landed home: after the KA-CHUNK, where it is filed (mine) or who returned it
  delivered(p) {
    if (!p) return;
    if (p.seat === this._me()) {
      const per = this._period(p.century);
      return this.stamp("FILED: " + per.toUpperCase(), "good",
        () => this._el(`#drawer-zone .cab2-cell[data-drawer="${per}"]`) || (this._phone() ? null : this._seat(p.seat, "file")));   // a phone points to the case
    }
    return this.stamp("RETURNED!", "good", () => this._seat(p.seat, "file"));
  }
  // the Merchant's told voyage hands over at his new port (board_draft.js): beside it
  merchantLanded(p) {
    if (!p || p.to == null || p.teleport) return;
    this.stamp("ANCHORS DOWN!", "gold", () => {
      const a = this._isle(p.to); if (!a) return null;
      let chart = null;
      try { const ch = this.comic && this.comic._chart(); chart = ch && this._rect(ch.host); } catch (e) {}
      const q = this._beside(a.r, 46, chart);
      return { r: { left: q.x, right: q.x, top: q.y - 22, bottom: q.y - 22, width: 0, height: 0 }, box: null, above: false };
    }, { sound: false });
  }

  // In the tutorial HELA's own lines are silent, and her big panels ride those lines
  // (comic.js say). With the tutorial's leave (this.tutorial), the same panels land here.
  _tutorBig(kind, p) {
    const me = this._me();
    const at = (seat) => { try { return this.comic._seatRect(seat); } catch (e) { return null; } };
    if (kind === "exploded") return this.big("boom", at(p.seat), { big: true });
    if (kind === "terminated") return this.big("terminated", at(p.seat), { big: true, sub: "TERMINATED" });
    if (kind === "wanted") return this.big("wanted", at(p.seat), { sub: "BOUNTY 4 GOLD" });
    if (kind === "card_bought" && p.stolen) return this.big("steal", at(p.seat), {});
    if (kind === "traveled" && p.to === 0) return this.big("yearzero", null, { big: true, sub: "THE MATCH ENDS" });
    if (kind === "reward_resolved") { this._reward = p; return this.big("contract", at(p.seat), { big: p.seat === me }); }
  }

  /* ---- THE THEATER'S OWN BEATS (game.js calls these on the step they belong to) ---- */
  beat(kind, p) {
    if (!p) return;
    switch (kind) {
      case "recharge": {                         // modules 1 to 3: energy, gold or both
        const en = p.energy > 0, au = p.gold > 0;
        if (!en && !au) return;
        const word = en && au ? "WHIRR-CLINK!" : en ? "WHIRR!" : "CLINK!";
        return this.pop(word, au && !en ? "gold" : "energy", () => this._seat(p.seat, au && !en ? "gold" : "life"));
      }
      case "paradox_cast":                       // retired: each zap now wears its causer's colour (pipeline)
        return;
      case "heat":                               // module 7
        return this.pop((p.booms || 0) >= 9 ? "HSSSSS!" : "HSSS!", (p.booms || 0) >= 9 ? "danger" : "heat", () => this._seat(p.seat, "heat"));
      case "depart": {                           // modules 8 and 9 (and the cards that sail)
        if (p.to === 0 || p.to === p.from) return;   // Year Zero has its own panel
        const n = this._trips[p.seat] = (this._trips[p.seat] || 0) + 1;
        const tv = this._tv(p.seat);
        this._immune[p.seat] = !!(tv && tv.atemporal_immune);
        // my own voyage was already inked when I plotted it: its landfall reads now
        if (p.seat === this._me() || !this._chartLive()) setTimeout(() => this.landed(p.seat, p.to), this.ms(900));
        // a rival crossing into another period: the stamp names the era (mine turns a page)
        const per = this._period(p.to);
        if (p.seat !== this._me() && p.from > 0 && per !== this._period(p.from))
          return this.stamp(per.toUpperCase() + "!", "travel", () => this._seat(p.seat, "travel"));
        if (n === 2) return this.stamp("DOUBLE JUMP!", "travel", () => this._seat(p.seat, "travel"));
        return this.pop("WHOOSH!", "travel", () => this._seat(p.seat, "travel"));
      }
      default: return;
    }
  }
  // a purchase lands in the buyer's hands (the flight's own landing)
  bought(p) {
    if (!p || p.stolen) return;                  // a theft is comic's SWIPE
    this.stamp("SOLD!", "market", () => this._seat(p.seat, "gold") || this._seat(p.seat, "file"), { sound: false });
  }
  // the chart's voyage makes landfall (board_*.js). The landing itself is the chart's
  // (the splash, the ripple, the port stamp) and the case file's CENTVRY; a word here
  // only when landing changed a rule: the respawn immunity is spent below XXIV.
  landed(seat, to) {
    if (to == null || to === 0) return;
    if (this._immune[seat] && to <= 23) {          // back below the Timeless centuries: shield spent
      this._immune[seat] = false;
      this.pop("SHIELD DOWN", "shield", () => this._seat(seat, "file"));
    }
  }
}

export const fx = new Fx();
