/* =========================================================================
   tutorial-drive.js, Learn to Play.

   HELA's story, told over a REAL match. The server runs the same engine and one
   rival, Varr (room mode "tutorial", see server/tutorial.py). For the opening
   Hours the server gives the traveller's time machine training wheels (two
   generators, two functions, two modules each; then Paradox; then the whole
   machine), deals the dice so every Hour fits its beat, and attaches a hint to
   his decisions (the allocation, the century the lesson is walking to, the relic
   to buy). The chart is cut to the only era he can see until he keeps his first
   promise. Every answer goes to the server and is checked like any other.

   This file is the teller. It holds HELA's lines (my own, verbatim,
   except where a line stated a rule the engine does not play: those are marked
   FIXED and changed as little as possible), shows ONE message at a time in the
   scene, away from what the traveller must look at, rings the real control, keeps
   the current objective and its route on the chart, and gets out of the way when
   the story ends. The match then plays on to its real end.
   ========================================================================= */

import { api, Connection } from "./net.js?202609261656";
import { Game } from "./game.js?202609261656";
import { icon } from "./icons.js?202609261656";
import { roman } from "./util.js?202609261656";
import { profile } from "./profile.js?202609261656";

const R = (v) => roman(v);
const FIRST_ERA_LOW = 24;          // the only era the cut chart shows: XXIV to XXX

// ---- HELA, source lines by beat (my words) ----
const L = {
  wake: [
    "Wake up, traveller. Still warm, still breathing. How rare, at my table.",
    "That tech on your arm is a time machine. I am the one who will guide you through it.",
    "I will teach you to wear it, one piece at a time. Watch, and do as I say.",
  ],
  t1prompt: "Two dice, two functions. Drag a die onto a module to program it. One value per function, and fill it left to right.",
  prompt: "New dice. Place both in the machine.",
  oneValue: "One value to a function, traveller. Those two do not match, so that die comes back to you.",
  // FIXED: an overload takes three generators in one function, not two.
  overload: "You filled all three modules of one function. That OVERLOADS it, so it seals shut for the next hour.",
  vitals: "That green line is your life, traveller. It runs low, and low is where you sit. The recharge is what feeds it.",
  energyGot: "See it climb. The recharge module fed your life, by the value of the die you set into it.",
  goldCase: "Your case. The gold you mint settles in here, by the value of the die, and it buys you gear later.",
  bothGot: "The third module of a function is the greedy one. That one paid you in life AND in coin, both equal to the die. The machine rewards a traveller who fills it.",
  boomGot: "Heat. That module climbs the red on your motor, by the die. Let it reach the crown and you come apart.",
  travelAsk: "Your travel die is worth {n}. Cross up to {n} centuries, either way along the chart, or hold where you are. Going back costs you a life for every century. Choose.",
  travelAgain: "Up to {n}, either way.",
  travelPaid: "You crossed by your own hand, and it cost you {c} energy. The years are never free. Go too far with too little life and you will not arrive at all.",
  travelHeld: "You held your ground. Standing still is a move too, and it costs you nothing.",
  travelDone: "You crossed the years by your own hand. That is how a traveller moves.",
  valve: "Look at that generator in your hand. One function is sealed and the other cannot take a second value, so there is no lawful module left for it anywhere on the machine.",
  valveWhere: "It does not go in the bin, traveller. It goes into the ESCAPE VALVE, the slot burning red beside the machine. Drop it in there and the hour can close.",
  rival: "That is your rival, sharing the table with you.",
  rivalFile: "Their first coin. And coin means there is more to know about them than a name and a heartbeat, so the rest of their file unfolds: what they carry, what they have delivered, where they stand, how close they are to beating you.",
  reveal: "You both chose in secret. The dice reveal together now, and their move lights up on their file.",
  // FIXED: two functions stay open after one is sealed.
  sealed: "That function is sealed this hour, from the overload. Use the others.",
  tabHelp: "One more thing, and then I stop holding your hand. This is what T gives you: every module on the machine, and what each one does. Press T whenever you forget. It waits, patient as I am not.",
  mod3: "Your machine grows again. A third module on every function, and a fourth generator to feed them. That is the whole machine, traveller. Everything a real rival brings to a table, you are now holding.",
  paradoxHit: "That was a PARADOX. Your rival reached across the centuries and tore into you from where they stand, and there was nothing on your machine to answer with.",
  // FIXED: the second paradox module strikes your own century (the engine's module 5).
  paradox: "So I am giving you the function. PARADOX reaches across the years and tears into another traveller. Ahead of you with the first module, in your own century with the second. A third function earns a third generator too, and yours read as high as III from here on. I want you armed when you answer.",
  paradoxGift: "PARADOX reaches across the years and tears into another traveller. Ahead of you with the first module, in your own century with the second. A third function earns a third generator too, and yours read as high as III from here on.",
  // FIXED: the third module is the PAST (module 6), the second the present.
  paradoxAim: "Your paradox has its third module now, and that one is the PAST: it strikes whoever is standing behind you. First ahead of you, second right on top of you, third behind you. Three modules, three directions. Pick the one they are standing in.",
  paradoxDone: "Your paradox landed. They felt that across the years.",
  // FIXED: the century is wherever the real wagon rolls in.
  merchantArrives: "Something new on your chart, traveller. A wagon has rolled into {c}, inside the only era you can see.",
  merchantWho: "The MERCHANT. He carries relics and he trades with one man only: whoever is standing in his own year. That wagon crawls the centuries on its own business, never on yours, so do not sit there waiting on it. If you want what he has, you cross the years and you stand in front of him.",
  merchantSign: "That sign over his booth answers one question and only one: whether HE will trade with YOU today. It reads CLOSED from everywhere except his century.",
  marketScene: "This is his wagon, up close. The shelf is what he is willing to sell this hour.",
  // FIXED: the real shelf always shows four cards; one of them is the relic he can afford.
  marketCard: "One relic on it you can afford. {g} gold, which you have. Look at the century stamped on its face.",
  marketPromise: "That number is a PROMISE. Buy the relic, carry it to that century, hand it over there, and the C.R.O.N.O.S. pays you in the only currency that decides this game.",
  merchantGo: "He is in {c}. {n} of road between you and him{cost}. Plan the crossing.",
  bought: "It is yours. Gear rides in your case from now on, and this one is promised to {c}. Carry it there and someone will pay you for the trouble.",
  carry: "The relic is promised to {c}, and promises are the only currency I respect. Take it there.",
  receptor: "The cabinet under your desk, traveller. The TEMPORAL RECEPTOR. Every relic you hand over is filed in the era it belonged to, and those drawers are the only record that you were ever worth anything.",
  deliverAsk: "You are standing where it was promised. The cabinet under your desk is open. Take the relic out of your case and file it in the drawer yourself, then turn the lock. I do not do your paperwork.",
  delivered: "Delivered. That is a CONTRACT POINT, traveller, and points are how this ends: the one with the most when the last hour burns is the one who mattered. The rest of you I simply collect.",
  chartOpen: "Look up. You kept a promise, so the roll comes off the chart and you get the rest of the years. Thirty centuries, all of them yours to cross, and the last thing down there at the end is YEAR ZERO.",
  // FIXED: the engine ends a match four ways (the Merchant running out of relics too).
  ending: "So here is how it ends, since you have earned the question. Four ways. Fill your receptor with a relic from all three periods. Or walk all the way down to Year Zero, and I promise you nobody arrives there cheaply. Or be the only traveller still breathing. Or empty the Merchant's wagon. Whichever comes first stops the clock, and then we count points. Only points.",
  shelfPassive: "That word under the name is what the card IS. PASSIVE. It asks you for nothing: it sits in your case and it simply keeps happening, whether you remember it or not. Rest your hand on the card if you want the whole line.",
  killed: "And there it is. Energy nothing, and you are terminated. They take a point for the killing and the mark of WANTED for the manner of it.",
  rewardIntro: "A point earns you more than a number. The C.R.O.N.O.S. owes you a favour, and you get to say what KIND of favour. Three contracts, and you sign one.",
  rewardPick: "Chaos hurts people. Time bends the rules of the hour. Resource pays. Open the contracts drawer and choose.",
  rewardRolled: "{cat}, and the generator came up {roll}. {text}",
  voucherGot: "That is a TICKET, and it lives in your case with the rest of your things. Spend it when the hour suits you.",
  nextHour: "The hour passes. The dice roll again.",
  // FIXED: this match has no blade and no death in it before the lesson ends.
  gradEnd: "So I have nothing left to teach you, which means the only thing left is to see how long you last. Play the hours out, traveller. I will be watching, and I am patient. I always get my table back.",

  // ---- lines the story needed and did not have, written to sit beside his ----
  // the goal, in my words (from the "delivered" and "marketPromise" beats), said at the start
  goal: "Hear what you are here for. Relics, carried home to the century printed on them, and the C.R.O.N.O.S. pays you a CONTRACT POINT for each. Points are how this ends: the one with the most when the last hour burns is the one who mattered.",
  you: "Look at the chart. That piece in your colour, at {c}, is you. Where it stands is where you are in time. The rest of the years stay rolled up until you have earned them.",
  reduced: "For now your machine has four cells. It grows.",
  files: "One last habit. Their file is paper, and paper moves. Pick it up and put it wherever it serves you on the table.",
  filesDone: "Wherever you like. It stays where you leave it.",
  wrongWay: "Not where I pointed, traveller. No matter: from {c}, {goal} is {n} away now, and that is the road.",
  relicGone: "The relic is gone from your case. The promise goes with it, so we begin a new one: back to the Merchant.",
  lowLife: "Your life runs low. The recharge first; the road will still be there.",
  endsAimed: "The chart shows you the long way now. Year Zero is {n} from you, and it would cost you about {e} energy.",
};

// what a contract does, by category and roll (my table, the engine's §23.3)
const REWARDS = {
  Chaos: ["Every other traveller loses three energy.", "Destroy a card, from the Market or off a rival.", "Move the Merchant to any century you like."],
  Time: ["A solo generators phase, all to yourself.", "A market ticket: trade wherever you stand.", "An item ticket: one more activation window."],
  Resource: ["Three energy and three gold.", "Steal a revealed Merchant card.", "A permanent point of power on one module."],
};

// the lesson strip: his beats, in the order the story reaches them
const LESSONS = [
  ["machine", "The machine"], ["travel", "Travel"], ["rival", "Rival"], ["paradox", "Paradox"],
  ["merchant", "Merchant"], ["overload", "Overload"], ["relic", "Relic"], ["deliver", "Delivery"],
  ["contract", "Contract"], ["ending", "The end"],
];

// the energy a trip into the past costs: 1 per century above X, 2 per century from X down
function tripCost(from, to) {
  if (to >= from) return 0;
  const normal = Math.max(0, Math.min(from, 30) - Math.max(to, 10));
  const deep = Math.max(0, Math.min(from, 10) - to);
  return normal + 2 * deep;
}
const cardName = (c) => (c && (c.display_name || c.name)) || "the relic";
const say$ = (s) => String(s).replace(/<[^>]+>/g, "");
function visible(n) {
  if (!n || !n.getBoundingClientRect) return false;
  const r = n.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const cs = getComputedStyle(n);
  return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05;
}
function onScreen(r) { return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// What the traveller must be able to see: a line never sits on these.
const KEY_AREAS = [
  "#hull-console .matrix-wrap", "#hull-console", "#dice-body .dice-pool", "#dice-body .dice-actions", ".cx-preview",
  "#dice-body .escape-slot", "#vz-holo", "#players-zone .pcard", "#market-zone .market-row",
  "#market-sign", "#timeline-rail .cplot-sing .pc-star", "#timeline-rail .cplot .pc-world",
  "#timeline-rail .cplot-ori .pc-chart", "#rucksack-zone", "#drawer-zone .cab2-cell",
  ".ctd-doc", "#mano-help .mh-card",
];

/* ─────────────────────────────── the stage ───────────────────────────────
   One callout (HELA's sigil and her line), rings on the controls she names, a
   bouncing pointer over the one to press, and the lesson strip that stands in
   for the phase track while the story runs. A line waiting for the traveller
   advances with a click anywhere or Enter; that click is swallowed, so it never
   presses anything on the board. There is no Continue button. */
class Stage {
  constructor() {
    this.rings = [];
    this.ringNodes = [];
    this.anchor = null;
    this.avoid = [];
    this._build();
    this._tick = setInterval(() => this.layout(), 120);
  }

  _build() {
    const c = document.createElement("div");
    c.id = "tut-callout";
    // HER BALLOON: the eye is HELA, and every line comes out of it (the tail points
    // at the eye, which stands beside the balloon wherever the balloon goes)
    c.innerHTML = `<div class="tc-text"></div><div class="tc-sub"></div><div class="tc-hint">click anywhere &#9656;</div>`;
    document.body.appendChild(c);
    this.callout = c;

    const tr = document.createElement("div");
    tr.id = "tut-track";
    tr.innerHTML = `<div class="tt-row"><span class="tt-title">LEARN TO PLAY</span>`
      + `<span class="tt-phase"></span>`
      + LESSONS.map(([k, l]) => `<span class="tt-chip" data-k="${k}"><i></i>${l}</span>`).join("")
      + `<button class="tt-leave" type="button">Leave</button></div>`
      + `<div class="tt-goal"><b>GOAL</b><span class="tt-goal-text"></span></div>`;
    document.body.appendChild(tr);
    tr.querySelector(".tt-leave").addEventListener("click", () => location.reload());
    this.track = tr;

    const pt = document.createElement("div");
    pt.id = "tut-point";
    pt.innerHTML = `<svg viewBox="0 0 24 30"><path d="M12 29 L2 15 H8 V1 H16 V15 H22 Z"/></svg>`;
    document.body.appendChild(pt);
    this.point = pt;
  }

  mark(done, current) {
    this.track.querySelectorAll(".tt-chip").forEach((n) => {
      const k = n.dataset.k;
      n.classList.toggle("done", done.has(k));
      n.classList.toggle("now", k === current && !done.has(k));
    });
  }
  setPhase(txt) { const n = this.track.querySelector(".tt-phase"); if (n.textContent !== txt) n.textContent = txt; this.place(); }
  // the strip takes the phase track's own place at the top of the visor
  place() {
    const ph = document.getElementById("vz-phases") || document.getElementById("phase-track");
    const host = ph && ph.parentElement;
    const r = host && host.getBoundingClientRect();
    if (r && r.width) this.track.style.left = Math.round(r.left + r.width / 2) + "px";
  }
  setGoal(html) {
    const n = this.track.querySelector(".tt-goal-text");
    if (n.innerHTML !== html) { n.innerHTML = html; this.track.classList.toggle("has-goal", !!html); }
  }
  trackOff() { this.track.classList.add("gone"); }

  show(at, text, opts = {}) {
    const c = this.callout;
    c.querySelector(".tc-text").innerHTML = text;
    const sub = c.querySelector(".tc-sub");
    sub.innerHTML = opts.sub || "";
    sub.style.display = opts.sub ? "" : "none";
    c.classList.toggle("waits", !!opts.waits);
    c.classList.remove("nudge");
    this.anchor = at || null;
    this.avoid = opts.avoid || [];
    this.pointing = !opts.waits && !opts.ms;
    this.setRings(opts.rings || (at && opts.ring !== false ? [at] : []));
    c.classList.add("on");
    document.body.classList.add("tut-speaking");
    this.layout(true);
    if (this._toastT) { clearTimeout(this._toastT); this._toastT = null; }
    if (opts.ms) this._toastT = setTimeout(() => this.hide(), opts.ms);
  }
  hide() {
    this.releaseEye();
    this.pointing = false;
    this.point.classList.remove("on");
    this.callout.classList.remove("on", "waits");
    document.body.classList.remove("tut-speaking");
    this.anchor = null;
    this.setRings([]);
  }
  nudge() { const c = this.callout; c.classList.remove("nudge"); void c.offsetWidth; c.classList.add("nudge"); }

  setRings(list) {
    this.rings = list || [];
    this.ringNodes.forEach((n) => n.remove());
    this.ringNodes = this.rings.map(() => {
      const n = document.createElement("div");
      n.className = "tut-ring";
      document.body.appendChild(n);
      return n;
    });
  }

  resolve(at) {
    try {
      if (!at) return null;
      if (typeof at === "function") return at() || null;
      if (typeof at === "string") {
        for (const n of document.querySelectorAll(at)) if (visible(n)) return n;
        return null;
      }
      return at.isConnected ? at : null;
    } catch (e) { return null; }
  }
  rects(list) {
    const out = [];
    (list || []).forEach((a) => {
      try {
        const nodes = typeof a === "string" ? [...document.querySelectorAll(a)] : [this.resolve(a)];
        nodes.forEach((n) => { if (n && visible(n)) { const q = n.getBoundingClientRect(); if (onScreen(q)) out.push(q); } });
      } catch (e) {}
    });
    return out;
  }

  layout(force) {
    if (!force && !this.callout.classList.contains("on") && !this.rings.length) return;
    this.rings.forEach((at, i) => {
      const n = this.ringNodes[i]; if (!n) return;
      const el = this.resolve(at);
      const r = el && el.getBoundingClientRect();
      if (!r || !r.width || !onScreen(r)) { n.style.display = "none"; return; }
      const pad = 6;
      n.style.display = "";
      n.style.left = (r.left - pad) + "px"; n.style.top = (r.top - pad) + "px";
      n.style.width = (r.width + pad * 2) + "px"; n.style.height = (r.height + pad * 2) + "px";
    });
    const first = this.pointing && this.rings.length ? this.resolve(this.rings[0]) : null;
    const fr = first && first.getBoundingClientRect();
    if (fr && fr.width && onScreen(fr)) {
      const up = fr.top < 90;
      this.point.classList.add("on");
      this.point.classList.toggle("up", up);
      this.point.style.left = Math.round(fr.left + fr.width / 2 - 13) + "px";
      this.point.style.top = Math.round(up ? fr.bottom + 8 : fr.top - 44) + "px";
    } else this.point.classList.remove("on");

    // The callout goes where it covers the least of what matters: never the
    // target, never the rings, and as little as possible of the machine, the dice,
    // the chart, the files, the shelf and the case. Near the target when it can.
    const c = this.callout;
    if (!c.classList.contains("on")) return;
    const cw = c.offsetWidth || 380, ch = c.offsetHeight || 120;
    const W = innerWidth, H = innerHeight, M = 12;
    const top0 = this.track && !this.track.classList.contains("gone") ? this.track.getBoundingClientRect().bottom + 8 : 50;
    const el = this.resolve(this.anchor);
    const r = el && el.getBoundingClientRect();
    const hard = this.rects(this.rings).concat(r && r.width ? [r] : []).concat(this.rects(this.avoid));
    const soft = this.rects(KEY_AREAS);
    const cand = [];
    const cx0 = r && r.width ? r.left + r.width / 2 : W / 2, cy0 = r && r.width ? r.top + r.height / 2 : H * 0.4;
    if (r && r.width && onScreen(r)) {
      cand.push([cx0 - cw / 2, r.top - ch - 20], [cx0 - cw / 2, r.bottom + 20],
        [r.right + 20, cy0 - ch / 2], [r.left - cw - 20, cy0 - ch / 2]);
    }
    for (let gx = 0; gx <= 4; gx++) for (let gy = 0; gy <= 4; gy++)
      cand.push([M + (W - cw - 2 * M) * gx / 4, top0 + (H - ch - M - top0) * gy / 4]);
    let best = null;
    cand.forEach(([px, py], i) => {
      px = Math.max(M, Math.min(W - cw - M, px));
      py = Math.max(top0, Math.min(H - ch - M, py));
      const ov = (list) => list.reduce((a, q) => a + Math.max(0, Math.min(px + cw, q.right) - Math.max(px, q.left))
        * Math.max(0, Math.min(py + ch, q.bottom) - Math.max(py, q.top)), 0);
      const d = Math.hypot(px + cw / 2 - cx0, py + ch / 2 - cy0);
      const score = ov(hard) * 80 + ov(soft) * 50 + d * 30 + (i < 4 ? 0 : 3000);
      if (!best || score < best.s) best = { x: px, y: py, s: score };
    });
    c.style.left = Math.round(best.x) + "px";
    c.style.top = Math.round(best.y) + "px";
    this.postEye(best.x, best.y, cw, ch);
  }
  // the eye stands at the balloon's side, level with its first line
  postEye(x, y, cw) {
    const E = window.__helaEye;
    if (!E || !E.setPost) return;
    const left = x > 90;
    const ex = left ? x - 36 : x + cw + 36, ey = y + 30;
    this.callout.dataset.eye = left ? "left" : "right";
    if (this._eyeAt && Math.hypot(this._eyeAt[0] - ex, this._eyeAt[1] - ey) < 10) return;
    this._eyeAt = [ex, ey];
    try { E.setPost(ex, ey, { glide: true }); } catch (e) {}
  }
  releaseEye() {
    this._eyeAt = null;
    try { window.__helaEye && window.__helaEye.clearPost && window.__helaEye.clearPost(); } catch (e) {}
  }
}

/* ─────────────────────────────── the chart ───────────────────────────────
   His cut: the chart is clipped just below the first era (XXIV to XXX) with the
   game's own rolled-chart asset sitting on the cut, measured live, and re-applied
   through every redraw. It comes off after the first delivery. On top of it the
   current objective's ROUTE: a line along the drift from his piece to the target,
   the target ringed, with the distance and the energy it costs. */
class Chart {
  constructor(coach) {
    this.coach = coach;
    this.open = false;
    this.route = null;         // { from, to, label }
    this._t = setInterval(() => { this.limit(); this.drawRoute(); }, 600);
  }
  svg() {
    const rail = document.getElementById("timeline-rail");
    return rail && rail.querySelector(".cplot-sing svg.pc-star");
  }
  star(c) {
    const svg = this.svg();
    if (!svg) return null;
    for (const n of svg.querySelectorAll(`.cc-glow[data-c="${c}"]`)) if (visible(n)) return n;
    return svg.querySelector(`.cc-world[data-c="${c}"]`) || (c === 0 ? svg.querySelector(".cc-sun") : null);
  }
  ship(seat) {
    const n = document.querySelector(`#timeline-rail .cplot-sing .cc-shipg[data-seat="${CSS.escape(seat)}"]`);
    return n && visible(n) ? n : null;
  }
  pos(svg, c) {
    const n = svg.querySelector(`.cc-world[data-c="${c}"]`) || (c === 0 ? svg.querySelector(".cc-sun") : null);
    if (!n) return null;
    const m = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/.exec(n.getAttribute("transform") || "");
    if (m) return [+m[1], +m[2]];
    const hit = n.querySelector("[cx]");
    return hit ? [+hit.getAttribute("cx"), +hit.getAttribute("cy")] : null;
  }

  // the cut, measured and re-applied (my limitMap)
  limit() {
    if (this.open) return;
    const rail = document.getElementById("timeline-rail");
    if (!rail) return;
    const cplot = rail.querySelector(".cplot-sing") || rail.querySelector(".cplot") || rail.querySelector(".cplot-ori");
    if (!cplot) return;
    const cRect = cplot.getBoundingClientRect();
    if (!cRect.height) return;
    let cut = 0;
    rail.querySelectorAll("[data-c]").forEach((n) => {
      const c = parseInt(n.getAttribute("data-c"), 10);
      if (isNaN(c)) return;
      if (c < FIRST_ERA_LOW) { n.classList.add("tut-era-hidden"); return; }
      const b = n.getBoundingClientRect().bottom - cRect.top;
      if (b > cut) cut = b;
    });
    if (cut <= 0) return;
    cut += 16;
    const pct = Math.max(0, Math.min(96, (1 - cut / cRect.height) * 100));
    rail.querySelectorAll(".cplot, .cplot-sing, .cplot-ori").forEach((cp) =>
      cp.style.setProperty("clip-path", `inset(0 0 ${pct.toFixed(1)}% 0)`, "important"));
    const roll = document.getElementById("chart-roll");
    if (roll) {
      roll.style.setProperty("display", "block", "important");
      roll.style.setProperty("opacity", "1", "important");
      const ratio = cut / cRect.height;
      const rollH = roll.offsetHeight || 20;
      roll.style.setProperty("top", (cplot.offsetTop + cplot.offsetHeight * ratio - rollH / 2) + "px", "important");
    }
  }
  // the roll comes off: every era out from behind it at once (my openMap)
  unroll() {
    if (this.open) return;
    this.open = true;
    const rail = document.getElementById("timeline-rail");
    if (rail) {
      rail.querySelectorAll(".tut-era-hidden").forEach((n) => n.classList.remove("tut-era-hidden"));
      rail.querySelectorAll(".cplot, .cplot-sing, .cplot-ori").forEach((cp) => cp.style.removeProperty("clip-path"));
    }
    const roll = document.getElementById("chart-roll");
    if (roll) {
      roll.style.setProperty("transition", "opacity .9s ease, top .9s ease", "important");
      roll.style.setProperty("opacity", "0", "important");
      setTimeout(() => { roll.style.removeProperty("display"); roll.style.removeProperty("opacity");
        roll.style.removeProperty("top"); roll.style.removeProperty("transition"); }, 1000);
    }
  }

  setRoute(from, to, label) {
    this.route = (from == null || to == null || from === to) ? (to == null ? null : { from: to, to, label }) : { from, to, label };
    this.drawRoute(true);
  }
  drawRoute(force) {
    const svg = this.svg();
    if (!svg) return;
    let g = svg.querySelector("g.tut-route");
    if (!this.route) { if (g) g.remove(); return; }
    const key = JSON.stringify(this.route);
    if (g && g.dataset.k === key && !force) return;
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "tut-route");
      g.setAttribute("pointer-events", "none");
      svg.insertBefore(g, svg.querySelector("g.cc-live") || null);
    }
    g.dataset.k = key;
    const { from, to, label } = this.route;
    const step = from > to ? -1 : 1;
    const pts = [];
    for (let c = from; step > 0 ? c <= to : c >= to; c += step) { const q = this.pos(svg, c); if (q) pts.push(q); }
    const end = this.pos(svg, to);
    if (!end) { g.innerHTML = ""; return; }
    let h = "";
    if (pts.length > 1) {
      const d = "M" + pts.map((q) => q[0].toFixed(0) + " " + q[1].toFixed(0)).join(" L");
      h += `<path class="tr-glow" d="${d}"/><path class="tr-line" d="${d}"/>`;
    }
    h += `<circle class="tr-target" cx="${end[0]}" cy="${end[1]}" r="40"/>`;
    if (label) {
      const lx = end[0], ly = end[1] + 64;
      h += `<g class="tr-label" transform="translate(${lx.toFixed(0)} ${ly.toFixed(0)})"><rect x="-120" y="-17" width="240" height="30" rx="6"/>`
        + `<text y="4">${label}</text></g>`;
    }
    g.innerHTML = h;
  }
  stop() {
    clearInterval(this._t);
    this.route = null;
    document.querySelectorAll("#timeline-rail g.tut-route").forEach((n) => n.remove());
    this.unroll();
  }
}

/* ─────────────────────────────── the coach ─────────────────────────────── */
class Coach {
  constructor() {
    this.done = new Set();
    this.said = new Set();
    this.story = true;             // the guided part; off once the story ends
    this.plan = null;
    this.stageNo = 0;              // the machine: 1 = four cells, 2 = Paradox, 3 = whole
    this._did = {};                // the hour he lived each phase in, for the recap at the end
    this.log = [];
    window.__tutLog = this.log;
  }
  trace(s) { this.log.push(`${Math.round(performance.now())} ${s}`); if (this.log.length > 800) this.log.shift(); }
  me() { const v = this.game && this.game.view; return v ? v.travelers.find((t) => t.is_self) : null; }
  rival() { const v = this.game && this.game.view; return v ? v.travelers.find((t) => !t.is_self) : null; }
  hour() { const v = this.game && this.game.view; return v ? v.hour : 0; }
  learn(k) { if (!this.done.has(k)) { this.done.add(k); this.trace("learned " + k); } this.markTrack(); }
  markTrack(current) {
    if (!this.stage) return;
    const cur = current || (LESSONS.find(([k]) => !this.done.has(k)) || [""])[0];
    this.stage.mark(this.done, cur);
  }
  once(k) { if (this.said.has(k)) return false; this.said.add(k); return true; }

  /* ── talking: one message at a time ── */
  // Wait until the table is still: no hour seal, no resolution theatre, no pan.
  async calm() {
    for (let i = 0; i < 40; i++) {
      const b = document.body.classList;
      const cam = document.querySelector(".cam-world.is-panning");
      if (!b.contains("hh-sealing") && !b.contains("rt-stage") && !b.contains("game-intro") && !cam) return;
      await wait(100);
    }
  }
  // A line the traveller reads and dismisses: click anywhere or Enter. The game's
  // event queue waits behind it; the click is swallowed and presses nothing.
  async say(at, text, opts = {}) {
    await this.calm();
    this.trace("say " + say$(text).slice(0, 70));
    this.stage.show(at, text, { ...opts, waits: true });
    await this.anyClick();
    this.stage.hide();
  }
  anyClick() {
    return new Promise((resolve) => {
      let armed = false, done = false;
      const eat = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
      const off = () => {
        window.removeEventListener("pointerdown", down, true);
        window.removeEventListener("keydown", key, true);
        setTimeout(() => { window.removeEventListener("pointerup", eat, true); window.removeEventListener("click", eat, true); }, 300);
      };
      const finish = () => { if (done) return; done = true; off(); resolve(); };
      const down = (e) => { if (!armed) return; eat(e); finish(); };
      const key = (e) => {
        const k = e.key || "";
        if (k === "Enter" || k === " " || k === "Escape") { eat(e); finish(); }
      };
      setTimeout(() => {
        armed = true;
        window.addEventListener("pointerdown", down, true);
        window.addEventListener("pointerup", eat, true);
        window.addEventListener("click", eat, true);
        window.addEventListener("keydown", key, true);
      }, 280);
    });
  }
  // A standing line while he acts: it stays until he does, or another replaces it.
  guide(at, text, opts = {}) {
    this.trace("guide " + say$(text).slice(0, 70));
    this.stage.show(at, text, opts);
  }
  clear() { this.stage.hide(); }

  /* ───────────── boot: a real room, the real game ───────────── */
  async start() {
    const inp = document.getElementById("inp-name");
    const prof = (() => { try { return profile.get(); } catch (e) { return {}; } })();
    let name = ((inp && inp.value) || prof.name || "Traveller").trim().slice(0, 24) || "Traveller";
    if (/^varr$/i.test(name)) name = "Traveller";
    const r = await api.createRoom(name, 2, "tutorial", prof.colour != null ? prof.colour : null);
    const seat = r.seat;
    const conn = new Connection(r.code, seat);
    const game = new Game(conn, seat);
    this.conn = conn; this.game = game; this.seat = seat;
    window.__game = game;
    window.__tut = this;
    try { game.learnSeatColours(r.room); } catch (e) {}
    // the story plays SLOW: every consequence finishes before the next thing is asked
    game.setSpeed("slow");
    document.querySelectorAll("#speed-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x.dataset.speed === "slow"));
    window.__helaMute = true;               // her ambient remarks wait; the story speaks
    document.body.classList.add("tut", "tut-story", "tut-2x2");
    this.stage = new Stage();
    this.chart = new Chart(this);
    this.markTrack("machine");
    this.hook();
    this.wakeStart();

    let begun = false, startSent = false;
    const showGame = () => {
      ["screen-landing", "screen-lobby", "screen-game"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("is-active", id === "screen-game");
      });
      if (window.pdxRefit) window.pdxRefit(1500);
    };
    conn.on("lobby", (m) => {
      try { game.learnSeatColours(m.room); } catch (e) {}
      if (m.room.status === "playing") {
        if (!begun) { begun = true; showGame(); game.begin(m.room); game._introShown = true; }
      } else if (!startSent) { startSent = true; conn.start(); }
    });
    conn.on("state", (m) => { if (!begun) { begun = true; showGame(); game._introShown = true; } game.onMessage("state", m); this.onState(); });
    conn.on("event", (m) => game.onMessage("event", m));
    conn.on("decision_request", (m) => game.onMessage("decision", m));
    conn.on("error", (m) => console.warn("server error:", m.detail));
    conn.connect();
    this._stateT = setInterval(() => this.onState(), 900);
  }

  /* ── the wake (his): black, the camera pushed into the desk, vision blurred ── */
  wakeStart() {
    document.body.classList.add("tut-waking");
    const cam = document.getElementById("cam");
    if (cam) { cam.style.setProperty("--cam-dur", "0s"); cam.style.setProperty("--cam-s", "2.2"); cam.style.setProperty("--cam-ty", "-120px"); }
    let v = document.getElementById("tut-black");
    if (!v) {
      v = document.createElement("div"); v.id = "tut-black";
      v.innerHTML = `<div class="tb-line"></div><div class="tb-hint">click anywhere &#9656;</div>`;
      document.body.appendChild(v);
    }
  }
  wakeRise() {
    const cam = document.getElementById("cam");
    if (cam) {
      cam.style.setProperty("--cam-dur", "3.2s");
      cam.style.removeProperty("--cam-s"); cam.style.removeProperty("--cam-ty");
      setTimeout(() => cam.style.removeProperty("--cam-dur"), 3400);
    }
    document.body.classList.remove("tut-waking");
    const v = document.getElementById("tut-black");
    if (v) { v.classList.add("gone"); setTimeout(() => v.remove(), 1500); }
  }
  async wake() {
    const v = document.getElementById("tut-black");
    if (v) v.querySelector(".tb-line").textContent = L.wake[0];
    // the eye opens first, over the dark, and the words come out of it
    try { window.__helaEye && window.__helaEye.setPost(innerWidth / 2, innerHeight / 2 - 90, { glide: true }); } catch (e) {}
    this.trace("say " + L.wake[0]);
    await this.anyClick();
    this.stage.releaseEye();
    this.wakeRise();
    await wait(1200);
    await this.say("#hull-console", L.wake[1], { ring: false });
    await this.say(null, L.wake[2]);
    await this.say(".vital-chip.vc-cp", L.goal, { rings: [".vital-chip.vc-cp"] });
    const me = this.me();
    const c = me ? me.century : 30;
    await this.say(() => this.chart.ship(this.seat) || this.chart.star(c), L.you.replace("{c}", R(c)),
      { rings: [() => this.chart.ship(this.seat) || this.chart.star(c)] });
  }

  /* ───────────── hooks into the real game ───────────── */
  hook() {
    const g = this.game;
    const play = g.playEvent.bind(g);
    g.playEvent = async (msg) => {
      try { await this.before(msg); } catch (e) { console.error("[tutorial] before", e); }
      const out = await play(msg);
      try { await this.after(msg); } catch (e) { console.error("[tutorial] after", e); }
      return out;
    };
    // a decision is shown only after its beat has been told
    const decide = g.onDecision.bind(g);
    g.onDecision = (req) => {
      const go = () => { const out = decide(req); try { this.onDecision(req); } catch (e) { console.error("[tutorial] decision", e); } return out; };
      if (!this.story) return go();
      const pre = this.beforeDecision(req);
      if (pre && pre.then) { pre.then(go, (e) => { console.error("[tutorial] pre-decision", e); go(); }); return; }
      return go();
    };
    const respond = g.respond.bind(g);
    g.respond = (data) => {
      const req = g.pendingReq;
      const out = respond(data);
      try { this.onRespond(req, data); } catch (e) { console.error("[tutorial] respond", e); }
      return out;
    };
    // the training wheels, and the guided hand: only the ringed die, into the ringed module
    const canPlace = g.canPlace.bind(g);
    g.canPlace = (r, c, v, drag) => {
      const ok = canPlace(r, c, v, drag);
      if (!ok || !g.alloc) return ok;
      if (this.machine && (!this.machine.functions.includes(r) || c >= this.machine.modules)) return false;
      if (!this.plan || !this.story) return ok;
      if (drag && drag.source === "cell" && +drag.r === r && +drag.c === c) return true;
      const s = this.guidedStep();
      return !s || (s.r === r && s.c === c && s.v === +v);
    };
    const after = g.afterPlace.bind(g);
    g.afterPlace = () => {
      const js = g._justSocketed;            // what was just set, before the game clears it
      after();
      g._tutJust = js || null;
      try { this.afterPlace(); } catch (e) { console.error("[tutorial] place", e); }
    };
    const reject = g.rejectDrop.bind(g);
    g.rejectDrop = (r, c, v, drag) => {
      reject(r, c, v, drag);
      if (!this.story) return;
      const why = g.refusalReason(r, c, v, drag) || "";
      if (/ONE VALUE/.test(why) && this.once("one-value")) {
        this.guide("#hull-console .matrix-wrap", L.oneValue, { rings: this.stepRings(), avoid: ["#hull-console"] });
        setTimeout(() => this.stepGuide(), 5200);
      } else if (this.plan && this.story && canPlace(r, c, v, drag)) {
        const chip = document.getElementById("refuse-why");
        if (chip) chip.textContent = "FOLLOW THE GLOW";
        this.stage.nudge();
      }
    };
    const act = g.marketAct.bind(g);
    g.marketAct = (data) => {
      if (this.blockPass && data && data.action === "pass") { this.stage.nudge(); return; }
      return act(data);
    };
    // while the story runs the lines point the way; the game's own arrow would point twice
    const beacon = g.updateBeacon.bind(g);
    g.updateBeacon = () => (this.story ? g.hideBeacon() : beacon());
    this._sceneT = setInterval(() => this.watchScene(), 250);
    // the first Herald notice filed in HELA's memory: she stops the story and he uses it
    const hookBrain = () => {
      const f = window.__helaBrainFile;
      if (!f || f.__tut) return false;
      const wrapped = (item) => { f(item); if (!this._heraldSeen) { this._heraldSeen = true; this._brainDue = true; } };
      wrapped.__tut = true;
      window.__helaBrainFile = wrapped;
      return true;
    };
    if (!hookBrain()) { const iv = setInterval(() => { if (hookBrain()) clearInterval(iv); }, 500); }
  }

  // HER MEMORY, used the first time a Herald notice lands in it (anchored to the
  // memory's own ids, so the lesson follows it through its redesign)
  async brainLesson() {
    if (!this._brainDue || this._brainDone) return;
    const B = window.__helaBrain;
    const root = () => document.getElementById("hela-brain-full") || document.getElementById("hela-brain-dock");
    if (!B || !root()) return;
    this._brainDue = false; this._brainDone = true;
    await this.calm();
    const toggle = () => { const r = root(); return r && (r.querySelector(".hbk-toggle") || r); };
    const until = (fn, ms = 180000) => new Promise((res) => { const t0 = Date.now(); const iv = setInterval(() => { if (fn() || Date.now() - t0 > ms) { clearInterval(iv); res(); } }, 200); });
    const hint = "My memory lies on the desk. <kbd>L</kbd> opens it too.";
    const openIt = () => this.guide(toggle, "The Herald has printed something, and I keep it. Open my memory.", { rings: [toggle], sub: hint });
    if (!visible(toggle())) this.atScene("drawer", openIt, "Press <kbd>A</kbd>: my memory lies on the paperwork desk.");
    else openIt();
    await until(() => B.isOpen && B.isOpen());
    this._waitScene = null;
    const clip = () => { const r = root(); const cs = r ? [...r.querySelectorAll(".hbk-clip")] : []; return cs[cs.length - 1] || null; };
    if (clip()) {
      this.guide(clip, "There it is, clipped to this hour. Every page is an hour, and everything that happened in it.", { rings: [clip], sub: "Click the clipping to read the edition." });
      await until(() => !clip() || document.querySelector(".he-window.he-news") || this._clipped, 60000);
      document.body.classList.add("tut-brain-read");
      await wait(1500);
    }
    const prev = () => { const r = root(); return r && r.querySelector(".hbk-prev"); };
    const page = () => { const r = root(); const on = r && r.querySelector(".hbk-hours .on"); return on ? on.textContent : ""; };
    const was = page();
    this.guide(prev, "Now turn back an hour. Read what your rival did while you were busy.", { rings: [prev, () => { const r = root(); return r && r.querySelector(".hbk-hours"); }] });
    await until(() => page() !== was || !(B.isOpen && B.isOpen()), 90000);
    document.body.classList.remove("tut-brain-read");
    if (B.isOpen && B.isOpen()) {
      this.guide(toggle, "Close it. It keeps everything, and it waits.", { rings: [toggle], sub: "<kbd>L</kbd> or the same tab." });
      await until(() => !(B.isOpen && B.isOpen()), 90000);
    }
    this.clear();
  }

  /* ───────────── state: the objective and its route, every Hour ───────────── */
  objective() {
    const me = this.me(), v = this.game.view;
    if (!me || !v) return null;
    const card = (me.hand || []).find((c) => c.delivery_century != null);
    if (this.done.has("ending") || !this.story) return null;
    if ((me.receptor_cards || []).length || (me.temporal_receptor || []).length) {
      return { kind: "contract", text: "Sign the contract your point earned" };
    }
    if (card) {
      const to = card.delivery_century;
      if (me.century === to) return { kind: "deliver", to, text: `Deliver ${cardName(card)} here, at ${R(to)}` };
      return { kind: "carry", to, text: `Carry ${cardName(card)} to ${R(to)}` };
    }
    const mc = v.merchant_century;
    if (!this.done.has("merchant") || mc == null || mc < FIRST_ERA_LOW) {
      return { kind: "learn", text: this.stageNo < 3 ? "Learn your machine" : "Mint gold; the Merchant is coming" };
    }
    if (me.energy <= 3) return { kind: "recover", text: "Recharge your life first" };
    if (me.century === mc) return { kind: "buy", to: mc, text: `Buy the relic from the Merchant, here at ${R(mc)}` };
    return { kind: "merchant", to: mc, text: `Reach the Merchant at ${R(mc)}` };
  }
  onState() {
    if (!this.game || !this.game.view || !this.stage) return;
    const v = this.game.view, me = this.me();
    this.stage.setPhase(`HOUR ${v.hour}`);
    if (!this.story) return;
    const o = this.objective();
    if (!o) { this.stage.setGoal(""); this.chart.setRoute(null, null); return; }
    let html = o.text;
    if (o.to != null && me) {
      const n = Math.abs(o.to - me.century), e = tripCost(me.century, o.to);
      if (n) html += ` <span class="tt-way">${n} ${n === 1 ? "century" : "centuries"} ${o.to < me.century ? "back" : "forward"} · ${e ? e + " energy" : "free"}</span>`;
      this.chart.setRoute(me.century, o.to, n ? `${R(o.to)} · ${n} away · ${e ? e + " energy" : "free"}` : `${R(o.to)} · here`);
    } else this.chart.setRoute(null, null);
    this.stage.setGoal(html);
    // adaptive: a promise that vanished from the case starts over, said once
    const hadRelic = this._hadRelic;
    this._hadRelic = !!(me && (me.hand || []).length);
    if (hadRelic && !this._hadRelic && !this.done.has("deliver") && !(me.receptor_cards || []).length) {
      this.queueLine(L.relicGone);
    }
  }
  queueLine(text) { this._queued = text; }
  async flushQueued() {
    if (!this._queued) return;
    const t = this._queued; this._queued = null;
    await this.say(null, t);
  }

  /* ───────────── events ───────────── */
  async before(msg) {
    const k = msg.kind, p = msg.payload || {};
    if (!this.story) {
      if (k === "game_over") this.gameOver(p);
      if (k === "hour_started") await this.brainLesson();
      return;
    }
    if (k === "hour_started") {
      this.hourNo = p.hour;
      if (p.hour === 1 && this.once("wake")) await this.wake();
      if (p.hour === 2 && this.once("next-hour")) await this.say(null, L.nextHour);
      await this.brainLesson();
      await this.flushQueued();
      if (p.hour >= 11 && !this.done.has("ending")) await this.theEnd();
    }
    if (k === "phase_started" || k === "phase_skipped") {
      const ph = p.phase, skipped = k === "phase_skipped";
      this.phaseNow = ph; this.phaseSkipped = skipped ? (p.reason || "nobody can act") : "";
      this.onState();
      void skipped;
      if (ph === "main" && this._did.main == null) this._did.main = this.hourNo;
    }
    if (k === "merchant_moved" && this.done.has("merchant") && this.once("predict")) await this.predictMerchant(p);
    if (k === "allocations_revealed" && this.hourNo === 1 && this.once("rival")) {
      this.learn("rival");
      await this.say("#players-zone .pcard", L.rival, { rings: ["#players-zone .pcard"] });
      await this.say("#players-zone .pcard", L.reveal, { rings: ["#players-zone .pcard"] });
    }
    const mineR = k === "recharged" && (p.effects || []).find((e) => e.seat === this.seat && e.energy > 0);
    if (mineR && this.once("vitals")) {
      await this.say("#vz-holo", L.vitals, { rings: ["#vz-holo"] });
    }
  }

  async after(msg) {
    const k = msg.kind, p = msg.payload || {};
    const self = this.seat;
    if (!this.story) {
      if (k === "terminated" && p.seat === self && this.once("dead")) this.stage.show(".vital-ekg", L.killed, { ms: 9000 });
      return;
    }
    if (k === "allocations_revealed") this._myMatrix = (((p.allocations || {})[self]) || {}).matrix || null;
    if (k === "allocations_revealed" && this.hourNo >= 3) {
      const mine = ((p.allocations || {})[self]) || {};
      await this.explainDice(mine.matrix, mine.escape_valve);
    }
    const effs = k === "recharged" ? (p.effects || []) : [];
    const mine = effs.find((e) => e.seat === self), theirs = effs.find((e) => e.seat !== self);
    if (mine) {
      if (mine.energy > 0 && this.once("energy-got")) await this.say("#vz-holo", L.energyGot, { rings: ["#vz-holo"] });
      if ((mine.gold || 0) > 0 && this.once("gold")) await this.say("#rucksack-zone", L.goldCase, { rings: ["#rucksack-zone"] });
      if (p.module === 3 && this.once("both")) await this.say("#vz-holo", L.bothGot, { rings: ["#vz-holo", "#rucksack-zone"] });
    }
    if (theirs && (theirs.gold || 0) > 0 && this.hourNo >= 2 && this.once("rival-file")) {
      document.body.classList.add("tut-show-rivalfull");
      await wait(200);
      await this.say("#players-zone .pcard", L.rivalFile, { rings: ["#players-zone .pcard"] });
    }
    if (k === "heated" && p.seat === self && this.once("boom")) {
      await this.say("#mano-boomg", L.boomGot, { rings: ["#mano-boomg"] });
    }
    if (k === "overloaded" && p.seat === self && this.once("overloaded")) {
      this.learn("overload");
      await this.say("#hull-console .matrix-wrap", L.overload, { rings: [`#machine-body .matrix-fnlabel`] });
    }
    if (k === "paradox_resolved" && typeof p.module === "number") {
      const hits = p.hits || [];
      if (hits.some((h) => h.seat === self) && this.stageNo < 2 && this.once("hit")) {
        await this.say("#players-zone .pcard", L.paradoxHit, { rings: ["#players-zone .pcard", "#vz-holo"] });
      } else if (hits.some((h) => h.seat !== self) && (this._myMatrix || [[0], [0, 0, 0]])[1][p.module - 4] && this.once("hit-out")) {
        this.learn("paradox");
        await this.say("#players-zone .pcard", L.paradoxDone, { rings: ["#players-zone .pcard"] });
      }
    }
    if (k === "merchant_moved") await this.afterMerchant(p);
    if (k === "traveled" && p.seat === self) {
      const aimed = this._aimedLand;
      this._aimedLand = null;
      if (aimed != null && p.to !== aimed && this._aimGoal != null && this.once("wrong-way-" + this.hourNo)) {
        const n = Math.abs(this._aimGoal - p.to);
        if (n) await this.say(() => this.chart.star(p.to), L.wrongWay.replace("{c}", R(p.to)).replace("{goal}", R(this._aimGoal)).replace("{n}", `${n} ${n === 1 ? "century" : "centuries"}`));
      }
    }
    if (k === "delivered" && p.seat === self && this.once("delivered")) {
      this.learn("deliver");
      document.body.classList.add("tut-drawer-" + this.periodKey(p.century || 27).toLowerCase());
      await this.say("#drawer-zone", L.receptor, { rings: [`#drawer-zone .cab2-cell[data-drawer="${this.periodKey(p.century || 27)}"]`] });
      this.home();
      await wait(700);
      await this.say(".vital-chip.vc-cp", L.delivered, { rings: [".vital-chip.vc-cp"] });
      await this.say("#drawer-zone", L.rewardIntro, {});
    }
    if (k === "reward_resolved" && p.seat === self && this.once("rolled")) {
      this.learn("contract");
      const text = (REWARDS[p.category] || [])[(p.roll || 1) - 1] || "";
      await this.say(null, L.rewardRolled.replace("{cat}", p.category).replace("{roll}", R(p.roll || 1)).replace("{text}", text));
      if (p.category === "Time") await this.say("#rucksack-zone", L.voucherGot, { rings: ["#rucksack-zone"] });
      await this.theEnd();
    }
  }

  // who the wagon is after, by the rule he keeps (§17.7): the richest traveller not in his year
  merchantTarget() {
    const v = this.game.view;
    if (!v) return null;
    const away = v.travelers.filter((t) => t.century !== v.merchant_century && !t.awaiting_respawn);
    if (!away.length) return null;
    return away.slice().sort((a, b) => (b.gold - a.gold) || (b.century - a.century) || (b.energy - a.energy))[0];
  }
  // He rolls into view: who he is (his lines), and what just made him move, with the real numbers.
  async afterMerchant(p) {
    const me = this.me(), v = this.game.view;
    if (!this.story || !me || !v) return;
    const mc = v.merchant_century;
    const at = () => document.querySelector("#timeline-rail .cplot-sing .cc-hauler") || this.chart.star(mc);
    const who = (name) => name === this.seat ? "YOU" : name;
    const dice = p.dice || (p.rolls || []).length || 1;
    const rolled = (p.rolls && p.rolls.length ? p.rolls.join(" + ") : p.roll) || "";
    if (!this.done.has("merchant") && mc >= FIRST_ERA_LOW) {
      this.learn("merchant");
      await this.say(at, L.merchantArrives.replace("{c}", R(mc)), { rings: [at] });
      await this.say(at, L.merchantWho, { rings: [at] });
      if (p.target) await this.say(at, `He moved because the Market phase ended: he always does. He rolled ${dice === 1 ? "one die" : dice + " dice"} (${rolled}) and came up to that far toward ${who(p.target)}, the richest traveller not standing in his year${p.target_gold != null ? ", " + p.target_gold + " gold" : ""}.`,
        { rings: [at, () => this.chart.ship(p.target)], sub: "Make yourself the richest and he comes to you. Spend, and he turns away." });
      const n = Math.abs(mc - me.century);
      if (n) {
        const e = tripCost(me.century, mc);
        await this.say(at, L.merchantGo.replace("{c}", R(mc)).replace("{n}", `${n} ${n === 1 ? "century" : "centuries"}`)
          .replace("{cost}", e ? `, and every one of them costs` : `, and the way forward costs nothing`), { rings: [at] });
      }
      this.onState();
      return;
    }
    if (this._predicted != null && this.once("predicted")) {
      const hit = this._predicted === p.to;
      this._predicted = null;
      await this.say(at, `${hit ? "Just so." : "Not quite."} He rolled ${rolled} and came from ${R(p.from)} to ${R(p.to)}, toward ${who(p.target)}${p.to === p.target_century ? ", and stopped there: he stops when he reaches who he is after" : ""}.`, { rings: [at] });
      return;
    }
    if (this.done.has("relic") && p.target && p.target !== this.seat && this.once("merchant-leaves")) {
      await this.say(at, `You spent your gold, so you are not the one he wants any more. He turns toward ${who(p.target)} now.`, { rings: [at, () => this.chart.ship(p.target)] });
    }
  }
  // Before a move he can watch: who is he after now, and where will he stop? He guesses.
  async predictMerchant(p) {
    const v = this.game.view, me = this.me();
    if (!this.story || !v || !me) return;
    const t = this.merchantTarget();
    if (!t || v.merchant_century < FIRST_ERA_LOW) return;
    const from = v.merchant_century, dir = t.century > from ? 1 : -1, dice = v.merchant_movement_dice || 1;
    const cands = [];
    for (let k = 1; k <= 3 * dice; k++) { const c = from + dir * k; if (c < FIRST_ERA_LOW || c > 30) break; cands.push(c); if (c === t.century) break; }
    if (!cands.length) return;
    const rings = cands.map((c) => () => this.chart.star(c));
    this.stage.show(() => this.chart.star(cands[0]),
      `The Market phase is over, so the wagon moves. He is after ${t.name === this.seat ? "YOU" : t.name}, the richest away from him, ${t.gold} gold. He rolls ${dice === 1 ? "one die" : dice + " dice"}, 1 to 3 each. Where does he stop?`,
      { rings, sub: "Click the century you think, or Enter to just watch." });
    this._predicted = await new Promise((resolve) => {
      const done = (c) => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); resolve(c); };
      const down = (e) => {
        let best = null, bd = 1e9;
        cands.forEach((c) => { const n = this.chart.star(c); const r = n && n.getBoundingClientRect(); if (!r) return;
          const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); if (d < bd) { bd = d; best = c; } });
        if (best != null && bd < 70) { e.preventDefault(); e.stopImmediatePropagation(); done(best); }
      };
      const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopImmediatePropagation(); done(-1); } };
      window.addEventListener("pointerdown", down, true);
      window.addEventListener("keydown", key, true);
    });
    if (this._predicted === -1) this._predicted = null;
    this.stage.hide();
    void p;
  }

  periodKey(c) { return c >= 21 ? "Singularity" : c >= 11 ? "Ascension" : "Origins"; }

  /* ───────────── decisions ───────────── */
  // The beat that belongs BEFORE a decision is shown: the machine growing, the
  // Merchant arriving, the wagon up close. Returns a promise, or nothing.
  beforeDecision(req) {
    const o = req.options || {}, h = o.tutorial || {};
    if (this._brainDue) return this.brainLesson().then(() => this.beforeDecision2(req));
    return this.beforeDecision2(req);
  }
  beforeDecision2(req) {
    const o = req.options || {}, h = o.tutorial || {};
    if (req.kind === "allocate") return this.grow(h.machine);
    if (req.kind === "market" && !this.done.has("relic") && h.pick) return this.wagon(req);
    if (req.kind === "deliver" && !this.done.has("deliver")) return this.toDrawer(req);
    if (req.kind === "reward_category" && !this.done.has("contract")) return this.toContracts();
    return null;
  }

  onDecision(req) {
    const k = req.kind, o = req.options || {}, hint = o.tutorial || null;
    this.req = req;
    this.trace("decision " + k);
    if (!this.story) return this.freeTip(req);
    if (k === "allocate") return this.allocate(req, hint);
    if (k === "travel") return this.travel(req, hint);
    if (k === "market") return this.market(req, hint);
    if (k === "deliver") return this.deliver(req);
    if (k === "reward_category") return this.reward(req);
    if (k === "activation") return this.guide("#rucksack-zone .card.act-ready", "Pull it now by clicking it, or turn the lock to let the window pass.", { rings: ["#rucksack-zone .card.act-ready", "#mala-lock"] });
    if (k === "steal_target" || k === "destroy_target") return this.pickCard(req, k === "steal_target" ? "steal" : "destroy");
    if (k === "merchant_century") return this.atScene("main", () => this.guide(() => this.chart.star((this.me() || {}).century), "Click the century you want the wagon to roll to.", {}));
    if (k === "matrix_buff") return this.atScene("main", () => this.guide("#hull-console .matrix-wrap", "Choose the module that reads one higher, for good.", { avoid: ["#hull-console"] }));
    return null;
  }

  onRespond(req, data) {
    if (!req) return;
    this.trace("answered " + req.kind);
    this._waitScene = null;
    this.req = null;
    if (req.kind === "market" && data && data.action === "buy") this._did.market = this.hourNo;
    if (req.kind === "deliver") this._did.delivery = this.hourNo;
    if (req.kind === "allocate") this.plan = null;
    this.clear();
    const leaving = (req.kind === "market" && !(data && data.action === "buy"))
      || req.kind === "reward_category" || /_target$|merchant_century/.test(req.kind);
    if (this.story && leaving) setTimeout(() => this.home(), 700);
  }
  home() {
    const cam = this.game.camera;
    const next = this.game.pendingReq || this.game.pendingDecision;
    if (!cam || cam.scene === "main" || (next && !/allocate|travel|activation/.test(next.kind))) return;
    cam._engage(); cam.setScene("main");
  }

  /* ── the machine grows (his growParadox / growModule3 / unreduceMachine) ── */
  async grow(m) {
    if (!m) { this.machine = null; return; }
    const stageNo = m.modules >= 3 ? 3 : m.functions.includes(1) ? 2 : 1;
    this.machine = m;
    if (stageNo === this.stageNo) return;
    const from = this.stageNo;
    this.stageNo = stageNo;
    if (stageNo === 1) { document.body.classList.add("tut-2x2"); return; }
    await this.calm();
    if (stageNo >= 2 && from < 2) {
      document.body.classList.add("tut-show-paradox");
      this.born('#machine-body .cell[data-r="1"], #machine-body .matrix-fnlabel.fn-paradox');
      await wait(500);
      await this.say("#hull-console .matrix-wrap", this.said.has("hit") ? L.paradox : L.paradoxGift,
        { rings: ["#machine-body .matrix-fnlabel.fn-paradox"], avoid: ["#hull-console"] });
    }
    if (stageNo === 3) {
      document.body.classList.add("tut-mod3");
      document.body.classList.remove("tut-2x2");
      this.born('#machine-body .cell[data-c="2"]');
      await wait(500);
      await this.say("#hull-console .matrix-wrap", L.mod3, { rings: ['#machine-body .cell[data-c="2"]'], avoid: ["#hull-console"] });
      await this.say("#hull-console .matrix-wrap", L.paradoxAim, { rings: ['#machine-body .cell[data-r="1"][data-c="2"]'], avoid: ["#hull-console"] });
      await this.tLesson();
    }
  }
  born(sel) {
    document.querySelectorAll(sel).forEach((n) => { n.classList.add("tut-new"); setTimeout(() => n.classList.remove("tut-new"), 1600); });
  }
  // "Press T whenever you forget": he opens the reference himself, reads, closes it.
  async tLesson() {
    if (!this.once("tab")) return;
    this.stage.show(null, L.tabHelp, { sub: "Press <kbd>T</kbd> now." });
    await new Promise((resolve) => {
      const k = (e) => { if ((e.key || "").toLowerCase() === "t") { window.removeEventListener("keydown", k, true); resolve(); } };
      window.addEventListener("keydown", k, true);
      this._tFallback = setTimeout(() => { window.removeEventListener("keydown", k, true); resolve(); }, 60000);
    });
    clearTimeout(this._tFallback);
    this.stage.hide();
    await wait(300);
    if (!this.game._manoHelpOn) { this.game._manoHelpToggle(true); const cc = document.getElementById("mano-help"); if (cc) cc.classList.add("on"); }
    await new Promise((resolve) => {
      const done = () => { window.removeEventListener("keydown", k, true); window.removeEventListener("pointerdown", p, true); resolve(); };
      const k = (e) => { const kk = (e.key || "").toLowerCase(); if (kk === "t" || kk === "escape" || kk === "enter") { e.preventDefault(); e.stopImmediatePropagation(); done(); } };
      const p = (e) => { e.preventDefault(); e.stopImmediatePropagation(); done(); };
      setTimeout(() => { window.addEventListener("keydown", k, true); window.addEventListener("pointerdown", p, true); }, 400);
    });
    this.game._manoHelpToggle(false);
    const cc = document.getElementById("mano-help"); if (cc) cc.classList.remove("on");
    await wait(300);
  }

  /* ── Generators ──
     The FIRST die of each function is guided: ringed, and only that module takes it.
     Everything after that is his own choice, inside the training wheels and the
     real rules; HELA says what each module he just fed will do, the game's
     IF YOU CONFIRM box shows the sum, and after the reveal she walks him through
     what his dice did, module by module. */
  allocate(req, hint) {
    this.markTrack(this.stageNo < 2 ? "machine" : this.stageNo < 3 ? "paradox" : "overload");
    this.plan = null;
    if (!this.story) return;
    const h = hint || {};
    this.plan = { matrix: h.matrix || null, valve: h.escape_valve || 0, lesson: h.lesson || "", goal: h.goal };
    const me = this.me();
    this._quiz = null;
    if (h.lesson === "travel" && h.goal != null && me && me.century !== h.goal) {
      this._quiz = { goal: h.goal, need: Math.abs(h.goal - me.century), from: me.century };
    }
    const sealed = (this.game.alloc && [...this.game.alloc.unavailable]) || [];
    this._head = this.hourNo === 1 ? L.t1prompt
      : sealed.length && this.once("sealed") ? L.sealed
      : this._quiz ? `Reach <b>${R(this._quiz.goal)}</b> this hour: ${this._quiz.need} ${this._quiz.need === 1 ? "century" : "centuries"} away. You choose where the dice go.`
      : this.stageNo === 1 ? L.prompt : "Place your dice. You choose.";
    this._lastPlaced = null;
    this.atScene("main", () => this.stepGuide());
  }
  // the one guided placement left this hour, or null when the dice are his
  guidedStep() {
    const a = this.game.alloc, P = this.plan && this.plan.matrix;
    if (!a || !P) return null;
    this.taught = this.taught || {};
    for (const r of [0, 2, 1]) {
      if (this.taught["row" + r] || !P[r][0]) continue;
      if (a.matrix[r][0] === P[r][0]) { this.taught["row" + r] = true; continue; }
      if (a.matrix[r][0]) continue;                     // his own die already sits there
      return { r, c: 0, v: P[r][0] };
    }
    if (!this.taught.col2) {
      for (let r = 0; r < 3; r++) {
        if (!P[r][2]) continue;
        if (a.matrix[r][2]) { this.taught.col2 = true; break; }
        if (a.matrix[r][0] === P[r][0] && a.matrix[r][1] === P[r][1]) return { r, c: 2, v: P[r][2] };
      }
    }
    return null;
  }
  afterPlace() {
    const a = this.game.alloc;
    if (!this.story || !a) return;
    this.stepGuide();
  }
  dieSel(v) {
    return () => {
      const held = document.querySelector("#dice-body .dice-pool .die.selected");
      if (held && +held.dataset.v === v) return held;
      for (const n of document.querySelectorAll(`#dice-body .dice-pool .die[data-v="${v}"]`)) if (visible(n)) return n;
      return null;
    };
  }
  stepRings() {
    const s = this.guidedStep();
    return s ? [`#machine-body .cell[data-r="${s.r}"][data-c="${s.c}"]`, this.dieSel(s.v)] : [];
  }
  // what one module does with one die, in words (the machine's own table, §29)
  moduleLine(r, c, v, full) {
    const cent = (n) => `${n} ${n === 1 ? "century" : "centuries"}`;
    const T = [
      [`Recharge 1 feeds your life: +${v} energy.`, `Recharge 2 mints coin: +${v} gold.`, `Recharge 3, the greedy one: +${v} energy AND +${v} gold.`],
      [`Paradox 1 strikes everyone AHEAD of you, on a higher century: they lose ${v}.`, `Paradox 2 strikes everyone in YOUR century: they lose ${v}.`, `Paradox 3 strikes everyone BEHIND you: they lose ${v}.`],
      [`Travel 1 only heats the motor: +${v} heat, and it moves you nothing.`, `Travel 2 moves you: up to ${cent(v)}, either way.`, `Travel 3 moves you again, double: up to ${cent(2 * v)} more.`],
    ];
    return T[r][c];
  }
  stranded() {
    const g = this.game, a = g.alloc;
    if (!a || !a.pool.length) return false;
    for (const v of a.pool) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      if (g.canPlace(r, c, v, { value: v, source: "pool", idx: 0 })) return false;
    return true;
  }
  stepGuide() {
    if (!this.req || this.req.kind !== "allocate" || !this.game.alloc) return;
    const a = this.game.alloc;
    const opt = { avoid: ["#hull-console", ".cx-preview"] };
    const js = this.game._tutJust;
    this.game._tutJust = null;
    const said = js ? this.moduleLine(js.r, js.c, js.value) : "";
    const s = this.guidedStep();
    if (s) {
      const where = `${R(s.v)} → ${["Recharge", "Paradox", "Travel"][s.r]} ${s.c + 1}`;
      const lead = !js && this._head ? this._head : said || this._head;
      const keys = this.hourNo === 1 && this.once("keys") ? " Keys <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> pick up a die of that value." : "";
      this.guide(`#machine-body .cell[data-r="${s.r}"][data-c="${s.c}"]`, lead,
        { ...opt, rings: this.stepRings(), sub: (this.hourNo === 1 && !js ? L.reduced + " " : "") + `Drag the ringed die: <b>${where}</b>.` + keys });
      return;
    }
    if (this.stranded()) {
      document.body.classList.add("tut-show-valve", "tut-valve-need");
      const v = a.pool[0];
      this.guide("#dice-body .escape-drop", this.once("valve") ? L.valve : L.valveWhere,
        { ...opt, rings: ["#dice-body .escape-drop", this.dieSel(v)], sub: this.said.has("valve-where") ? "" : (this.said.add("valve-where"), L.valveWhere) });
      return;
    }
    document.body.classList.remove("tut-valve-need");
    if (!a.pool.length) {
      this.guide("#confirm-alloc", (said ? said + " " : "") + "The machine is set. Confirm it.", { ...opt, rings: ["#confirm-alloc"] });
      return;
    }
    const left = a.pool.length;
    this.guide("#hull-console .matrix-wrap", said || this._head,
      { ...opt, rings: [], sub: `${left} ${left === 1 ? "die" : "dice"} left: put ${left === 1 ? "it" : "them"} where you choose.` });
  }

  // after the reveal: what HIS dice did, module by module, pointing at each
  async explainDice(matrix, escape) {
    if (!matrix) return;
    const lines = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const v = matrix[r][c];
      if (!v) continue;
      lines.push({ r, c, text: this.moduleLine(r, c, v) });
    }
    if (escape) lines.push({ valve: true, text: `The escape valve took your ${R(escape)}.` });
    const q = this._quiz;
    this._quiz = null;
    if (q) {
      const reach = (matrix[2][1] || 0) + 2 * (matrix[2][2] || 0);
      if (reach >= q.need) lines.push({ text: `Enough road: you can reach ${R(q.goal)}, ${q.need} away.`, good: true });
      else lines.push({ text: `Not enough road for ${R(q.goal)}: it is ${q.need} away and these dice move you ${reach}. Moving takes the second travel module; the first only heats.`, miss: true });
    }
    for (const ln of lines) {
      const at = ln.valve ? "#dice-body .escape-drop" : ln.r != null ? `#machine-body .cell[data-r="${ln.r}"][data-c="${ln.c}"]` : null;
      await this.say(at, ln.text, { rings: at ? [at] : [], avoid: ["#hull-console"] });
    }
  }

  /* ── Travel ── */
  travel(req, hint) {
    this.markTrack("travel");
    const o = req.options || {};
    const from = o.century, max = o.max || 0;
    const goal = hint && hint.goal != null ? hint.goal : null;
    this._aimGoal = goal;
    if (goal == null) {
      this._aimedLand = null;
      this.atScene("main", () => this.guide("#timeline-rail .cc-anchor", L.travelAsk.replace(/\{n\}/g, max), {}));
      return;
    }
    const dir = goal > from ? 1 : -1;
    const dist = Math.min(max, Math.abs(goal - from));
    const land = from + dir * dist;
    this._aimedLand = land;
    const first = this.once("travel-ask");
    const me = this.me();
    const carrying = me && (me.hand || []).length;
    const text = first ? L.travelAsk.replace(/\{n\}/g, max)
      : carrying ? L.carry.replace("{c}", R(goal)) : L.travelAgain.replace(/\{n\}/g, max);
    const sub = dist === 0 ? "Hold where you are." : `Click <b>${R(land)}</b>${land === goal ? "" : `, on the way to ${R(goal)}`}.`;
    this.atScene("main", () => {
      if (dist === 0) this.guide("#timeline-rail .cc-anchor", text, { sub });
      else this.guide(() => this.chart.star(land), text, { sub, rings: [() => this.chart.star(land)] });
    });
    this._travelFrom = from;
  }

  /* ── the Merchant, the wagon, the relic ── */
  async wagon(req) {
    const o = req.options || {}, h = o.tutorial || {};
    const card = (o.buyable || []).find((c) => c.name === h.pick);
    if (!card) return;
    this.game.__tutWagon = true;
    const cam = this.game.camera;
    cam._engage(); cam.setScene("market");
    await wait(1000);
    await this.say("#market-zone .market-row", L.marketScene, { rings: ["#market-zone .market-row"] });
    await this.say("#market-sign", L.merchantSign, { rings: ["#market-sign"] });
  }
  market(req, hint) {
    const o = req.options || {};
    const me = this.me() || {};
    const pick = hint && hint.pick;
    const card = (o.buyable || []).find((c) => c.name === pick);
    const passSel = () => [...document.querySelectorAll("#market-zone .side-sign, .market-side-signs .side-sign")]
      .find((n) => /pass/i.test(n.textContent || "") && visible(n)) || null;
    if (this.done.has("relic") || !card || (me.hand || []).length) {
      this.blockPass = false;
      this.atScene("market", () => this.guide(passSel, (me.hand || []).length && !this.said.has("bought-pass")
        ? (this.said.add("bought-pass"), "The wagon has what it has. Pass, and he moves on.") : "Pass, and the wagon moves on.",
        { rings: [passSel], avoid: ["#market-zone .market-row"] }), "Press <kbd>W</kbd> to face the wagon.");
      return;
    }
    this.markTrack("relic");
    this.blockPass = true;
    const sel = `#market-zone .card.can-buy[data-name="${CSS.escape(card.name)}"]`;
    const run = async () => {
      if (this.once("market-card")) {
        await this.say(sel, L.marketCard.replace("{g}", card.gold_cost), { rings: [sel], avoid: ["#market-zone .market-row"] });
        await this.say(`${sel} .card-deliver`, L.marketPromise, { rings: [`${sel} .card-deliver`], avoid: ["#market-zone .market-row"] });
        if ((card.ability_type || "").includes("passive")) await this.say(`${sel} .card-type`, L.shelfPassive, { rings: [`${sel} .card-type`], avoid: ["#market-zone .market-row"] });
      }
      if (this.req !== req) return;
      this.guide(sel, `Buy it: drag <b>${cardName(card)}</b> into your case.`, { rings: [sel, "#rucksack-zone"], avoid: ["#market-zone .market-row"] });
    };
    this.atScene("market", () => { run(); }, "Press <kbd>W</kbd> to face the wagon.");
  }

  /* ── Delivery (his deliveryPhase): the cabinet opens before the question ── */
  async toDrawer(req) {
    const o = req.options || {};
    document.body.classList.add("tut-drawer-" + this.periodKey(o.century || 27).toLowerCase());
    const cam = this.game.camera;
    cam._engage(); cam.setScene("drawer");
    await wait(1000);
  }
  deliver(req) {
    const o = req.options || {};
    const card = (o.deliverable || [])[0];
    this.markTrack("deliver");
    const cardSel = card ? `#rucksack-zone .card[data-name="${CSS.escape(card.name)}"]` : "#rucksack-zone .card";
    const step = (first) => {
      if (!this.req || this.req !== req) return;
      const front = document.querySelector("#drawer-zone .cab2-cell.hg-cell:not(.open) .cab2-front");
      const st = this.game._deliverState;
      if (st && st.chosen && st.chosen.size) {
        this.guide("#mala-lock", "Now turn the lock.", { rings: ["#mala-lock"] });
      } else if (front && visible(front)) {
        this.guide(front, first ? L.deliverAsk : "Open the drawer.", { rings: [front, cardSel] });
      } else {
        this.guide(cardSel, first ? L.deliverAsk : "File the relic in the open drawer.", { rings: [cardSel, "#drawer-zone .drw-folder.here"] });
      }
      setTimeout(() => step(false), first ? 4500 : 500);
    };
    this.atScene("drawer", () => step(true), "Press <kbd>A</kbd> to open the cabinet.");
  }

  /* ── the contract ── */
  async toContracts() {
    document.body.classList.add("tut-drawer-contracts");
    const cam = this.game.camera;
    cam._engage(); cam.setScene("drawer");
    await wait(900);
  }
  reward(req) {
    this.markTrack("contract");
    const step = (first) => {
      if (!this.req || this.req !== req) return;
      const stamp = document.querySelector(".ctd-stampbtn");
      const front = document.querySelector('#drawer-zone .cab2-cell[data-drawer="CONTRACTS"]:not(.open) .cab2-front');
      if (stamp && visible(stamp)) this.guide(".ctd-stampbtn", "Stamp it, and it is signed.", { rings: [".ctd-stampbtn"], avoid: [".ctd-doc"] });
      else if (front && visible(front)) this.guide(front, first ? L.rewardPick : "Open the contracts drawer.", { rings: [front] });
      else this.guide("#drawer-zone .ct-paper.ct-choose", first ? L.rewardPick : "Choose one: read it, then stamp it.",
        { rings: ["#drawer-zone .ct-paper.ct-choose"] });
      setTimeout(() => step(false), first ? 4500 : 500);
    };
    this.atScene("drawer", () => step(true), "Press <kbd>A</kbd> to open the cabinet.");
  }
  pickCard(req, mode) {
    const cands = (req.options || {}).candidates || [];
    const inMarket = cands.some((c) => c.zone === "market");
    const cls = mode === "steal" ? ".can-steal" : ".can-destroy";
    const picker = "#active-prompt .card.is-actionable";
    const inPlace = `#market-zone .card${cls}, #players-zone .card${cls}`;
    const line = mode === "steal" ? "Take one: click the card you want." : "Pick the card to destroy.";
    setTimeout(() => {
      if (this.req !== req) return;
      if (document.querySelector(picker)) this.guide(picker, line, { rings: [picker] });
      else if (inMarket) this.atScene("market", () => this.guide(inPlace, line, { rings: [inPlace], avoid: ["#market-zone .market-row"] }), "Press <kbd>W</kbd> to face the wagon.");
      else this.guide(inPlace, line, { rings: [inPlace] });
    }, 500);
  }

  /* ── scenes ── */
  atScene(scene, fn, line) {
    const cam = this.game.camera;
    if (!cam || cam.scene === scene) { this._waitScene = null; fn(); return; }
    const key = { main: { market: "S", drawer: "D" }, market: { main: "W", drawer: "W" }, drawer: { main: "A", market: "A" } }[scene][cam.scene] || "S";
    const where = { main: "your desk", market: "the wagon", drawer: "the cabinet" }[scene];
    this.guide(null, line || `Press <kbd>${key}</kbd> to turn back to ${where}.`, {});
    this._waitScene = { scene, fn };
  }
  watchScene() {
    const w = this._waitScene;
    if (!w || !this.game || !this.game.camera) return;
    if (this.game.camera.scene === w.scene) {
      this._waitScene = null;
      setTimeout(() => { try { w.fn(); } catch (e) { console.error(e); } }, 650);
    }
  }

  /* ── the end of the story (his chartOpen and ending, then the files, then his farewell) ── */
  async theEnd() {
    if (this.done.has("ending") || this._ending) return;
    this._ending = true;
    this.markTrack("ending");
    this.home();
    await wait(800);
    this.chart.unroll();
    await wait(1000);
    await this.say("#timeline-rail", L.chartOpen, { ring: false });
    const me = this.me();
    const toZero = me ? me.century : 30;
    this.chart.setRoute(toZero, 0, `YEAR ZERO · ${toZero} away · ~${tripCost(toZero, 0)} energy`);
    this.stage.setGoal(`The ways it ends: <span class="tt-way">three periods in the receptor · Year Zero · last one breathing · the wagon emptied</span> then most points wins`);
    await this.say(() => this.chart.star(0), L.ending, { rings: [() => this.chart.star(0), ".vital-chip.vc-cp"] });
    await this.say(() => this.chart.star(0), L.endsAimed.replace("{n}", `${toZero} ${toZero === 1 ? "century" : "centuries"}`).replace("{e}", tripCost(toZero, 0)),
      { rings: [() => this.chart.star(0)] });
    await this.filesLesson();
    await this.phasesRecap();
    await this.say(null, L.gradEnd);
    this.learn("ending");
    this.endStory();
  }
  // THE HOUR, NAMED LAST: he has lived every phase several times by now, so the
  // recap names what he did, and the learning bar gives its place to the phase track.
  async phasesRecap() {
    if (!this.once("phases")) return;
    const chip = (label) => () => [...document.querySelectorAll("#vz-phases .vz-ph")]
      .find((n) => (n.textContent || "").trim().toLowerCase() === label && visible(n)) || null;
    // the classic hour has four phases; the Auction chip belongs to the Test Room
    document.querySelectorAll("#vz-phases .vz-ph").forEach((n) => {
      if (/auction/i.test(n.textContent || "")) { n.style.display = "none"; const sp = n.nextElementSibling; if (sp && sp.classList.contains("vz-sep")) sp.style.display = "none"; }
    });
    this.stage.trackOff();
    document.body.classList.add("tut-phases");
    await wait(900);
    const d = this._did, h = (x) => (x != null ? `in hour ${x}` : "");
    await this.say(chip("delivery"), `That moment you filed the relic in the drawer${d.delivery ? " " + h(d.delivery) : ""}: that was DELIVERY. Every hour opens with it: whoever stands on a relic's own century hands it in.`, { rings: [chip("delivery")] });
    await this.say(chip("market"), `Standing in the wagon's year and buying the relic${d.market ? " " + h(d.market) : ""}: the MARKET. It comes second, and when it ends, the wagon moves.`, { rings: [chip("market")] });
    await this.say(chip("generators"), "Every time you set your dice: the GENERATORS. Both of you place in secret, then the machines reveal and resolve, module 1 to 9.", { rings: [chip("generators")] });
    await this.say(chip("activation"), "Last, ACTIVATION: the items you carry that have a trigger fire here. That is the whole hour, in that order, every hour.", { rings: [chip("activation")] });
  }

  // his loose paperwork: a file can be slid anywhere on the wood
  async filesLesson() {
    if (!this.once("files")) return;
    const file = "#players-zone .pcard.cfolio";
    this.guide(file, L.files, { rings: [file] });
    document.body.classList.add("tut-drag-file");
    await new Promise((resolve) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const held = document.querySelector(".pcard.cfolio.dk-held");
        if (held) this._held = true;
        if ((this._held && !held) || Date.now() - t0 > 90000) { clearInterval(iv); resolve(); }
      }, 150);
    });
    document.body.classList.remove("tut-drag-file");
    this.clear();
    if (this._held) await this.say(file, L.filesDone, { rings: [file] });
  }
  endStory() {
    this.story = false;
    this.plan = null;
    this.machine = null;
    this.blockPass = false;
    window.__helaMute = false;
    document.body.classList.remove("tut-story", "tut-2x2", "tut-valve-need");
    document.body.classList.add("tut-mod3", "tut-show-paradox", "tut-show-valve", "tut-show-rivalfull");
    this.chart.stop();
    this.stage.trackOff();
    this.stage.hide();
    try { this.game.updateBeacon(); } catch (e) {}
  }

  freeTip() { return null; }

  gameOver(p) {
    const won = p && p.winner === this.seat;
    setTimeout(() => this.stage.show(null, won ? "The clock stops, and the points are yours. Monarch of Time." : `The clock stops. ${(p && p.winner) || "Someone"} counted more points this time.`,
      { ms: 9000 }), 5200);
  }
}

export function launchTutorial() {
  const coach = new Coach();
  coach.start().catch((e) => {
    console.error("[tutorial] could not start", e);
    const err = document.getElementById("landing-error");
    if (err) err.textContent = "Could not start the tutorial: " + (e.message || e);
    document.body.classList.remove("tut", "tut-story");
  });
  return coach;
}
