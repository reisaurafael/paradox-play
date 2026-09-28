/* =========================================================================
   tutorial-drive.js, Learn to Play.

   The tutorial is a REAL match: the server runs the same engine and the same
   bots (room mode "tutorial", see server/tutorial.py). For the first Hours the
   server deals the dice so every Hour fits its lesson, and it attaches a hint to
   the player's decisions (the allocation it dealt for, where the lesson is
   heading, the card it would buy). This file is only the coach on top of the
   real game: it points at the real controls, says one plain sentence per step,
   holds the event queue for a line only when a line matters, and fogs the parts
   of the map the player has not reached yet. Everything else is the game.

   Nothing here decides a rule. Every answer goes to the server, which checks it
   exactly as in any other match. When the scripted Hours end the coach steps
   back and the match plays on to its real end.
   ========================================================================= */

import { api, Connection } from "./net.js?202609281449";
import { Game } from "./game.js?202609281449";
import { icon } from "./icons.js?202609281449";
import { roman } from "./util.js?202609281449";
import { profile } from "./profile.js?202609281449";

const R = (v) => roman(v);
// ON A PHONE OR A TABLET her lines name what a finger touches, not keys (js/touch.js
// defines window.__pdxWords there; the desktop has none and her words stay as written)
const pdxWords = (t) => (t && window.__pdxWords ? window.__pdxWords(t) : t);
const FN = ["Recharge", "Paradox", "Travel"];

// The three periods of the map, revealed one at a time as the player reaches them.
const PERIODS = [
  { key: "Singularity", lo: 20, hi: 30, name: "SINGULARITY" },
  { key: "Ascension", lo: 11, hi: 19, name: "ASCENSION" },
  { key: "Origins", lo: 0, hi: 10, name: "ORIGINS" },
];
const periodOf = (c) => (c >= 20 ? 0 : c >= 11 ? 1 : 2);

// The lesson strip at the top of the screen, in the order the Hour teaches them.
const LESSONS = [
  ["hour", "The Hour"], ["machine", "Generators"], ["travel", "Travel"],
  ["overload", "Overload"], ["market", "Market"], ["paradox", "Paradox"],
  ["deliver", "Delivery"], ["contract", "Contracts"], ["win", "Winning"],
];

// What a reward does, by category and roll (the engine's table, §23.3).
const REWARD_TEXT = {
  Chaos: ["every other traveller loses 3 energy", "you destroy one card", "you move the Merchant anywhere"],
  Time: ["a solo Generators phase ticket", "a Market ticket: trade from anywhere", "an item ticket: an extra activation"],
  Resource: ["+3 energy and +3 gold", "you steal one of the Merchant's cards (you become Wanted)", "+1 forever on one module"],
};

// ---- HELA's lines from the owner's story (git HEAD tutorial-drive.js), verbatim ----
const L = {
  wake: [
    "Wake up, traveller. Still warm, still breathing. How rare, at my table.",
    "That tech on your arm is a time machine. I am the one who will guide you through it.",
    "I will teach you to wear it, one piece at a time. Watch, and do as I say.",
  ],
  // the goal of the game, approved by the owner verbatim (Paradox: The Last Timeline)
  goal: "The Incursion broke time. This is the last timeline left, and it is falling apart. Carry each relic back to the century it was torn from, and the timeline mends. Every relic you return is a contract point. When time settles, whoever mended the most wins.",
  // FIXED: two rivals at this table
  rival: "Those are your rivals, sharing the table with you.",
  files: "Their files are paper, and paper moves. Drag one anywhere on the table.",
  filesDone: "Arrange your desk as you like. It stays where you leave it.",
  paradoxHit: "That was a PARADOX. Your rival reached across the centuries and tore into you from where they stand, and there was nothing on your machine to answer with.",
  herald: "The Temporal Herald: the paper of the last timeline, printed by the C.R.O.N.O.S. It reports crimes across the centuries, and the clipping stays on the offender's file.",
  relics: "Those on his shelf are the relics: things torn out of their centuries by the Incursion. Every one of them has to go home.",
  mended: "The timeline mends at {c}. One relic home, one tear closed.",
  // FIXED: the engine ends a match four ways (the Merchant running out of relics too)
  ending: "So here is how it ends, since you have earned the question. Four ways. Fill your receptor with a relic from all three periods. Or walk all the way down to Year Zero, and I promise you nobody arrives there cheaply. Or be the only traveller still breathing. Or empty the Merchant's wagon. Whichever comes first stops the clock, and then we count points. Only points.",
  // FIXED: this match has no blade and no death in it before the lesson ends
  gradEnd: "So I have nothing left to teach you, which means the only thing left is to see how long you last. Play the hours out, traveller. I will be watching, and I am patient. I always get my table back.",
  you: "Look at the chart. That piece in your colour, at {c}, is you. Where it stands is where you are in time.",
  reduced: "For now your machine has four cells. It grows.",
  t1prompt: "Two dice, two functions. Drag a die onto a module to program it. One value per function, and fill it left to right.",
  prompt: "New dice. Place both in the machine.",
  // FIXED: the second paradox module strikes your own century (the engine's module 5)
  paradox: "So I am giving you the function. PARADOX reaches across the years and tears into another traveller. Ahead of you with the first module, in your own century with the second. A third function earns a third generator too, and yours read as high as III from here on. I want you armed when you answer.",
  mod3: "Your machine grows again. A third module on every function, and a fourth generator to feed them. That is the whole machine, traveller. Everything a real rival brings to a table, you are now holding.",
  // FIXED: the third module is the PAST (module 6), the second the present
  paradoxAim: "Your paradox has its third module now, and that one is the PAST: it strikes whoever is standing behind you, for DOUBLE the die. First ahead of you, second right on top of you, third behind you. A die only reaches the third after the first two, and three dice overload the function, so the Past hits twice as hard to pay for the shut Hour. Pick the module they are standing in.",
  // FIXED: the century is wherever the real wagon rolls in
  merchantArrives: "Something new on your chart, traveller. A wagon has rolled into {c}, at the far end of the only era you can see.",
  merchantWho: "The MERCHANT. He carries relics and he trades with one man only: whoever is standing in his own year. That wagon crawls the centuries on its own business, never on yours, so do not sit there waiting on it. If you want what he has, you cross the years and you stand in front of him.",
  // FIXED (minimally): "wooden", so it is not taken for his marker on the chart
  merchantSign: "That wooden sign over his booth answers one question and only one: whether HE will trade with YOU today. It reads CLOSED from everywhere except his century.",
  marketScene: "This is his wagon, up close. The shelf is what he is willing to sell this hour.",
  // FIXED: the real shelf always shows four cards
  marketCard: "One relic on it you can afford. {g} gold, which you have. Look at the century stamped on its face.",
  marketPromise: "That number is a PROMISE. Buy the relic, carry it to that century, hand it over there, and the C.R.O.N.O.S. pays you in the only currency that decides this game.",
  chartOpen: "Look up. You kept a promise, so the roll comes off the chart and you get the rest of the years. Thirty centuries, all of them yours to cross, and the last thing down there at the end is YEAR ZERO.",
};
// RECONNECT MID-LESSON: the match itself comes back by replay (server/replay.py); the
// lesson's own state is kept here, beside the match record, at every stable point.
export const LESSON_KEY = "pdx.resume.lesson.v1";
const LESSON_V = 1;
const FIRST_ERA_LOW = 24;        // his cut: only XXIV to XXX until the Merchant arrives
const MERCHANT_ERA_LOW = 20;     // the chart grows to the whole Singularity when he does

const cardName = (c) => (c && (c.display_name || c.name)) || "the card";

// what a tap may press without moving her waiting line on: every control, and the whole screen
// while Settings is open; only the table's free area (or her line itself) takes her "tap anywhere"
// (the owner: changing scenes and opening or closing the rivals' files are free, even between lines)
const HOLD_LINE = "#settings-backdrop, #btn-settings, #tut-track, #pdx-mrail, #pdx-scenes, #pdx-swap, #pdx-mcol .mc-tools, #pdx-mcol .mc-eye, #pdx-mcol .mc-log,"
  + " #pdx-tabkey, .pdx-helpkey, .pdx-sheet, .panel-detail, .do-attach, .do-contract, #pdx-help, #pdx-hx, .menu-sheet,"
  + " #players-zone .pcard, button, input, select, textarea, a[href], [role=button], label";
function holdsLine(t) {
  const sb = document.getElementById("settings-backdrop");
  if (sb && !sb.hidden) return true;
  // while a file, a card sheet or a page turn is open, the tap only closes it (or lands in it)
  if (document.querySelector(".panel-detail, .pdx-sheet.on, #pdx-swap.on")) return true;
  if (!t || !t.closest || t.closest("#tut-callout")) return false;
  return !!t.closest(HOLD_LINE);
}

/* ─────────────────────────────── the stage ───────────────────────────────
   Three things drawn over the real game, all pointer-transparent except the
   callout itself: a callout (HELA's sigil, one line, an optional Next), rings
   around the controls it names, and the lesson strip. They follow their targets
   through camera pans and re-renders by re-resolving them on a slow timer. */
class Stage {
  constructor(coach) {
    this.coach = coach;
    this.rings = [];
    this.ringNodes = [];
    this.anchor = null;
    this._next = null;
    this._build();
    this._tick = setInterval(() => this.layout(), 110);
  }

  _build() {
    const c = document.createElement("div");
    c.id = "tut-callout";
    // HELA'S BALLOON. The eye IS HELA: every line hangs from the eye, whose post is
    // beside the balloon, and the tail points at her. A line that waits for him
    // advances with a click anywhere or Enter; that click is swallowed, so it never
    // presses anything on the board. No Next button.
    c.innerHTML = `<div class="tc-text"></div><div class="tc-sub"></div>`
      + `<div class="tc-foot"><span class="tc-hint">click anywhere &#9656;</span></div>`;
    document.body.appendChild(c);
    this.callout = c;
    this._key = (e) => {
      if (!this._next || !this._armed) return;
      if (e.key === "Enter" || e.key === " ") {
        const t = e.target || {};
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "") || holdsLine(t)) return;
        e.preventDefault(); e.stopImmediatePropagation(); this._fireNext();
      }
    };
    window.addEventListener("keydown", this._key, true);
    const eat = (e) => { if (this._eating) { e.preventDefault(); e.stopImmediatePropagation(); } };
    this._down = (e) => {
      if (!this._next || !this._armed) return;
      // a control never moves her line on (the owner, 28/09: players lost lines adjusting the sound):
      // Settings and anything while it is open, her keys, the lesson bar, sheets and files, the rail
      if (holdsLine(e.target)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      this._eating = true; setTimeout(() => { this._eating = false; }, 350);
      this._fireNext();
    };
    window.addEventListener("pointerdown", this._down, true);
    window.addEventListener("pointerup", eat, true);
    window.addEventListener("click", eat, true);

    const tr = document.createElement("div");
    tr.id = "tut-track";
    tr.innerHTML = `<span class="tt-title">LEARN TO PLAY</span><span class="tt-count"></span>`
      + LESSONS.map(([k, l]) => `<span class="tt-chip" data-k="${k}"><i></i>${l}</span>`).join("")
      + `<button class="tt-leave" type="button" title="Leave the tutorial">Leave</button>`;
    document.body.appendChild(tr);
    // the bouncing pointer over the one thing to click now
    const pt = document.createElement("div");
    pt.id = "tut-point";
    pt.innerHTML = `<svg viewBox="0 0 24 30"><path d="M12 29 L2 15 H8 V1 H16 V15 H22 Z"/></svg>`;
    document.body.appendChild(pt);
    this.point = pt;
    tr.querySelector(".tt-leave").addEventListener("click", () => location.reload());
    this.track = tr;
  }

  // Mark lessons: done ones get a tick, the current one glows.
  mark(done, current) {
    this.track.querySelectorAll(".tt-chip").forEach((n) => {
      const k = n.dataset.k;
      n.classList.toggle("done", done.has(k));
      n.classList.toggle("now", k === current && !done.has(k));
    });
    const c = this.track.querySelector(".tt-count");
    if (c) c.textContent = `${LESSONS.filter(([k]) => done.has(k)).length}/${LESSONS.length}`;
  }
  trackOff() { this.track.classList.add("gone"); }

  // The classic Hour has four phases; the Auction label belongs to the Test Room.
  _fixPhases() {
    const ph = [...document.querySelectorAll("#vz-phases .vz-ph")];
    const a = ph.find((n) => /auction/i.test(n.textContent || ""));
    if (!ph.length) return;
    this._phasesFixed = true;
    if (!a) return;
    a.classList.add("tut-nophase");
    const sep = a.nextElementSibling;
    if (sep && sep.classList.contains("vz-sep")) sep.classList.add("tut-nophase");
  }

  _fireNext() {
    const f = this._next; this._next = null;
    this.callout.classList.remove("has-next");
    if (f) f();
  }

  // Show a line. `at` is a selector, an element, a function returning one, or null.
  // With next:true it returns a promise resolved when the player clicks Next.
  show(at, text, opts = {}) {
    const c = this.callout;
    c.querySelector(".tc-text").innerHTML = pdxWords(text);
    const sub = c.querySelector(".tc-sub");
    sub.innerHTML = pdxWords(opts.sub || "");
    sub.style.display = opts.sub ? "" : "none";
    c.classList.toggle("tone-warn", opts.tone === "warn");
    c.classList.remove("nudge");
    this._armed = false;
    this.anchor = at || null;
    this.place = opts.place || "auto";
    this.avoid = opts.avoid || [];
    this.setRings(opts.rings || (at && opts.ring !== false ? [at] : []));
    c.classList.add("on");
    this.pointing = !opts.next && !opts.ms && (opts.rings || (at && opts.ring !== false ? [at] : [])).length > 0;
    // EVERY LINE RIDES THE EYE: she keeps following his cursor and the balloon travels
    // with her. What a line is about is marked with the yellow rings, never by moving her.
    this.releaseEye();
    c.classList.remove("pending");
    this.startRide();
    if (opts.next) {
      c.classList.add("has-next");
      // armed a beat later, so the click that caused the line does not dismiss it
      setTimeout(() => { this._armed = true; }, 450);
      return new Promise((resolve) => { this._next = resolve; });
    }
    c.classList.remove("has-next");
    this._next = null;
    return Promise.resolve();
  }
  // The balloon riding the eye, every frame, on the side of her with the most room
  // and the least of the board under it; clamped to the screen.
  startRide() {
    if (this._rideRaf) return;
    const step = () => {
      this._rideRaf = requestAnimationFrame(step);
      const c = this.callout, E = window.__helaEye;
      if (!c.classList.contains("on") || !E) return;
      let q; try { q = E.pos(); } catch (e) { return; }
      const cw = c.offsetWidth || 360, ch = c.offsetHeight || 110, W = innerWidth, H = innerHeight, M = 12;
      // around the eye: close first, then a little farther, so the words never sit on
      // the machine, the dice, the chart, the files or the shelf (the tail keeps pointing at her)
      const cands = {};
      [0, 80, 160, 260].forEach((d, i) => {
        cands["right" + i] = [q.x + 36 + d, q.y - 26, "left", d];
        cands["left" + i] = [q.x - 36 - cw - d, q.y - 26, "right", d];
        cands["below" + i] = [q.x - cw / 2, q.y + 40 + d, "", d];
        cands["above" + i] = [q.x - cw / 2, q.y - 40 - ch - d, "", d];
      });
      const now = performance.now();
      if (!this._rideSide || !cands[this._rideSide] || now - (this._rideT || 0) > 300) {
        this._rideT = now;
        const soft = [];
        KEY_AREAS.forEach((sel) => { try { document.querySelectorAll(sel).forEach((n) => { const b = n.getBoundingClientRect(); if (b.width && onScreen(b) && visible(n)) soft.push(b); }); } catch (e) {} });
        // what the line is about weighs three times as much: the words never sit on it
        this.rings.forEach((a) => { const n = this.resolve(a); const b = n && n.getBoundingClientRect(); if (b && b.width) soft.push(b, b, b); });
        let best = null;
        for (const k of Object.keys(cands)) {
          const [px, py, , d] = cands[k];
          const cx = Math.max(M, Math.min(W - cw - M, px)), cy = Math.max(M + 50, Math.min(H - ch - M, py));
          let cover = 0;
          soft.forEach((b) => { cover += Math.max(0, Math.min(cx + cw, b.right) - Math.max(cx, b.left)) * Math.max(0, Math.min(cy + ch, b.bottom) - Math.max(cy, b.top)); });
          const score = cover * 3 + d * 90 + (Math.abs(cx - px) + Math.abs(cy - py)) * 60 + (k === this._rideSide ? -4000 : 0);
          if (!best || score < best.s) best = { k, s: score };
        }
        this._rideSide = best.k;
      }
      const [px, py, tail] = cands[this._rideSide];
      c.style.left = Math.round(Math.max(M, Math.min(W - cw - M, px))) + "px";
      c.style.top = Math.round(Math.max(M + 50, Math.min(H - ch - M, py))) + "px";
      c.dataset.eye = tail === "left" ? "left" : tail === "right" ? "right" : "";
    };
    this._rideRaf = requestAnimationFrame(step);
  }
  stopRide() { if (this._rideRaf) cancelAnimationFrame(this._rideRaf); this._rideRaf = 0; }

  hide() {
    document.querySelectorAll(".tut-hl").forEach((n) => n.classList.remove("tut-hl"));
    this.stopRide();
    this.releaseEye();
    this.pointing = false;
    this.point.classList.remove("on");
    this.callout.classList.remove("on", "has-next");
    this._next = null;
    this.anchor = null;
    this.setRings([]);
  }
  nudge() {
    const c = this.callout;
    c.classList.remove("nudge"); void c.offsetWidth; c.classList.add("nudge");
  }

  setRings(list) {
    this.rings = list || [];
    document.querySelectorAll(".tut-hl").forEach((n) => n.classList.remove("tut-hl"));
    this.ringNodes.forEach((n) => n.remove());
    this.ringNodes = this.rings.map(() => {
      const n = document.createElement("div");
      n.className = "tut-ring";
      document.body.appendChild(n);
      return n;
    });
    this.layout(true);
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

  layout(force) {
    if (!this._phasesFixed) this._fixPhases();
    // the bar stays at the top centre, in every scene: it never moves
    if (!force && !this.callout.classList.contains("on") && !this.rings.length) return;
    // rings
    this.rings.forEach((at, i) => {
      const n = this.ringNodes[i]; if (!n) return;
      const el = this.resolve(at);
      const r = el && el.getBoundingClientRect();
      if (!r || !r.width || !onScreen(r)) { n.style.display = "none"; return; }
      // inside the wrist machine (scaled, tilted, moving) the element wears the highlight
      // itself, so it keeps its exact shape; the loose box is for everything else
      if (el.closest && el.closest("#hull")) {
        if (!el.classList.contains("tut-hl")) {
          document.querySelectorAll(".tut-hl").forEach((x) => { if (!this.rings.some((a) => this.resolve(a) === x)) x.classList.remove("tut-hl"); });
          el.classList.add("tut-hl");
        }
        n.style.display = "none";
        return;
      }
      const pad = 8;                          // a frame around the control, never across its label
      n.style.display = "";
      n.style.left = (r.left - pad) + "px"; n.style.top = (r.top - pad) + "px";
      n.style.width = (r.width + pad * 2) + "px"; n.style.height = (r.height + pad * 2) + "px";
    });
    // the pointer sits over the first ring (under it when there is no room above)
    const first = this.pointing && this.rings.length ? this.resolve(this.rings[0]) : null;
    const fr = first && first.getBoundingClientRect();
    if (fr && fr.width && onScreen(fr)) {
      const up = fr.top < 70;
      this.point.classList.add("on");
      this.point.classList.toggle("up", up);
      this.point.style.left = Math.round(fr.left + fr.width / 2 - 13) + "px";
      this.point.style.top = Math.round(up ? fr.bottom + 14 : fr.top - 52) + "px";
    } else this.point.classList.remove("on");
    // the callout: every line rides the eye (startRide places it, every frame)
  }

  // The eye stands on the balloon's side that faces what she is talking about,
  // level with the first line; the balloon's tail points at her.
  postEye(x, y, cw, target) {
    const E = window.__helaEye;
    if (!E || !E.setPost) return;
    const tx = target ? target.left + target.width / 2 : innerWidth / 2;
    let left = tx < x + cw / 2;
    if (left && x < 80) left = false;
    if (!left && x + cw > innerWidth - 80) left = true;
    const ex = left ? x - 34 : x + cw + 34, ey = y + 28;
    this.callout.dataset.eye = left ? "left" : "right";
    let far = true;
    try { const q = E.pos(); far = Math.hypot(q.x - ex, q.y - ey) > 20; } catch (e) {}
    if (!far) return;
    if (this._eyeAt && Math.hypot(this._eyeAt[0] - ex, this._eyeAt[1] - ey) < 8 && performance.now() - (this._eyeT || 0) < 800) return;
    this._eyeAt = [ex, ey]; this._eyeT = performance.now();
    try { E.setPost(ex, ey, { glide: true }); } catch (e) {}
  }
  releaseEye() {
    this._eyeAt = null;
    try { window.__helaEye && window.__helaEye.clearPost && window.__helaEye.clearPost(); } catch (e) {}
  }
}

function visible(n) {
  const r = n.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const cs = getComputedStyle(n);
  return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05;
}
function onScreen(r) { return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; }

/* ─────────────────────────────── the map fog ───────────────────────────────
   The map already changes skin with the period the player stands in (the star
   chart of the Singularity, the sea of the Ascension, the old world of the
   Origins), and every skin draws all thirty centuries. So the periods the player
   has not reached yet sit under a fog, drawn inside whichever chart is showing,
   between the centuries and the travellers (ships and the Merchant still show on
   top), with the period's name and the century that opens it. Reaching a period
   lifts its fog, with a line from HELA. */
const SKINS = {
  sing: { svg: ".cplot-sing svg.pc-star", live: "g.cc-live", node: ".cc-world", glow: ".cc-glow", anchor: ".cc-anchor", cmd: ".cc-cmd" },
  ori: { svg: ".cplot-ori svg.pc-chart", live: "g.cm-live", node: ".cm-world", glow: ".cm-glow", anchor: ".cm-anchor", cmd: ".cm-cmd" },
  sea: { svg: ".cplot svg.pc-world", live: "g.sea-live", node: ".sea-isle", glow: ".sea-glow", anchor: ".sea-anchor", cmd: ".sea-cmd" },
};
const ANY_GLOW = "#timeline-rail .cc-glow, #timeline-rail .sea-glow, #timeline-rail .cm-glow";
const ANY_ANCHOR = "#timeline-rail .cc-anchor, #timeline-rail .sea-anchor, #timeline-rail .cm-anchor";
const ANY_CMD = "#timeline-rail .cc-cmd, #timeline-rail .sea-cmd, #timeline-rail .cm-cmd";

class MapFog {
  constructor() {
    this.open = new Set(["Singularity"]);
    this._t = setInterval(() => this.apply(), 700);
  }
  skin() {
    const rail = document.getElementById("timeline-rail");
    if (!rail) return null;
    const k = rail.classList.contains("skin-sing") ? "sing" : rail.classList.contains("skin-ori") ? "ori" : "sea";
    return { key: k, ...SKINS[k], rail };
  }
  svg() {
    const sk = this.skin();
    return sk ? sk.rail.querySelector(sk.svg) : null;
  }
  starPos(svg, c) {
    const sk = this.skin();
    const n = svg.querySelector(`${sk.node}[data-c="${c}"]`);
    const m = n && /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/.exec(n.getAttribute("transform") || "");
    if (m) return [+m[1], +m[2]];
    const hit = svg.querySelector(`circle[data-c="${c}"][cx]`);
    if (hit) return [+hit.getAttribute("cx"), +hit.getAttribute("cy")];
    return null;
  }
  apply() {
    if (this.disabled) return;
    const sk = this.skin();
    const svg = sk && sk.rail.querySelector(sk.svg);
    if (!svg) return;
    // a skin swap leaves the old chart's fog behind: drop fog from charts not showing
    sk.rail.querySelectorAll("svg g.tut-fog").forEach((g) => { if (g.ownerSVGElement !== svg) g.remove(); });
    let g = svg.querySelector("g.tut-fog");
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "tut-fog");
      g.setAttribute("pointer-events", "none");
      svg.insertBefore(g, svg.querySelector(sk.live) || null);
      g.dataset.drawn = "";
    }
    g.setAttribute("class", "tut-fog skin-" + sk.key);
    const key = sk.key + ":" + [...this.open].sort().join(",");
    if (g.dataset.drawn === key && g.childNodes.length) { this._dim(svg, sk); return; }
    g.dataset.drawn = key;
    // the fog takes the chart's own colour: night mist on the star chart, sea mist on the parchment
    const fc = sk.key === "sea" ? "#e6dbc2" : "#07060d";
    let body = `<defs><radialGradient id="tutFogGrad"><stop offset="0" stop-color="${fc}" stop-opacity=".96"/>`
      + `<stop offset=".62" stop-color="${fc}" stop-opacity=".86"/><stop offset="1" stop-color="${fc}" stop-opacity="0"/></radialGradient>`
      + `<filter id="tutFogBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>`;
    PERIODS.forEach((p) => {
      if (this.open.has(p.key)) return;
      const pts = [];
      for (let c = p.lo; c <= p.hi; c++) { const q = this.starPos(svg, c); if (q) pts.push(q); }
      if (!pts.length) return;
      let blobs = "";
      pts.forEach(([x, y]) => { blobs += `<circle cx="${x}" cy="${y}" r="74" fill="url(#tutFogGrad)"/>`; });
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
      const cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      const gate = p.key === "Ascension" ? "XIX" : "X";
      body += `<g class="tf-period" data-period="${p.key}"><g filter="url(#tutFogBlur)">${blobs}</g>`
        + `<g class="tf-label" transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)})">`
        + `<rect x="-96" y="-26" width="192" height="50" rx="7"/>`
        + `<text class="tf-name" y="-5">${p.name}</text>`
        + `<text class="tf-sub" y="13">uncharted \u00b7 reach ${gate}</text></g></g>`;
    });
    g.innerHTML = body;
    this._dim(svg, sk);
  }
  _dim(svg, sk) {
    svg.querySelectorAll(`${sk.node}[data-c]`).forEach((n) => {
      const c = +n.dataset.c;
      n.classList.toggle("tut-fogged", !this.open.has(PERIODS[periodOf(c)].key));
    });
  }
  // Lift a period's fog, with the fade the CSS gives it.
  lift(key) {
    if (this.open.has(key)) return false;
    const svg = this.svg();
    const g = svg && svg.querySelector(`g.tut-fog .tf-period[data-period="${key}"]`);
    this.open.add(key);
    const redraw = () => { const s2 = this.svg(); const f = s2 && s2.querySelector("g.tut-fog"); if (f) f.dataset.drawn = ""; this.apply(); };
    if (g) { g.classList.add("lifting"); setTimeout(redraw, 1300); } else redraw();
    return true;
  }
  labelOf(key) {
    const svg = this.svg();
    return svg && svg.querySelector(`g.tut-fog .tf-period[data-period="${key}"] .tf-label`);
  }
  // A century on the chart showing: its lit ring while a choice is armed, else its node.
  starOf(c) {
    const sk = this.skin();
    const svg = sk && sk.rail.querySelector(sk.svg);
    if (!svg) return null;
    for (const n of svg.querySelectorAll(`${sk.glow}[data-c="${c}"]`)) if (visible(n)) return n;
    return svg.querySelector(`${sk.node}[data-c="${c}"]`) || (c === 0 ? svg.querySelector('[data-c="0"]') : null);
  }
  stop() {
    clearInterval(this._t);
    document.querySelectorAll("#timeline-rail g.tut-fog").forEach((n) => n.remove());
    document.querySelectorAll("#timeline-rail .tut-fogged").forEach((n) => n.classList.remove("tut-fogged"));
  }
}

/* ─────────────────────────────── the coach ─────────────────────────────── */
class Coach {
  constructor() {
    this.done = new Set();
    this.said = new Set();         // one-time lines already spoken
    this.scripted = true;          // the guided opening; off once "win" is taught
    this.plan = null;              // the allocation the server dealt this hand for
    this.log = [];                 // a trace for automated runs
    window.__tutLog = this.log;
  }

  trace(s) { this.log.push(`${Math.round(performance.now())} ${s}`); if (this.log.length > 600) this.log.shift(); }

  me() { const v = this.game && this.game.view; return v ? v.travelers.find((t) => t.is_self) : null; }
  hour() { const v = this.game && this.game.view; return v ? v.hour : 0; }
  learn(k) {
    if (!this.done.has(k)) { this.done.add(k); this.trace("learned " + k); if (!this._beat) this.persist(); }
    this.markTrack();
  }
  markTrack(current) {
    if (!this.stage) return;
    const cur = current || (LESSONS.find(([k]) => !this.done.has(k)) || [""])[0];
    this.stage.mark(this.done, cur);
  }
  once(k) { if (this.said.has(k)) return false; this.said.add(k); return true; }

  // A line the player must acknowledge. The game's event queue waits behind it.
  async say(at, text, opts = {}) {
    if (this.quiet) return this.note(text, opts);
    this.trace("say " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    await this.stage.show(at, text, { ...opts, next: true });
    this.stage.hide();
  }
  // A standing instruction: it stays until the player acts or another line replaces it.
  guide(at, text, opts = {}) {
    if (this.quiet) return this.note(text, opts);
    this.trace("guide " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    return this.stage.show(at, text, opts);
  }
  // a line that does not stop the game: it stays until he acts or the next line comes
  toast(at, text, opts = {}) {
    if (this.quiet) return this.note(text, opts);
    this.trace("toast " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    const { ms, ...rest } = opts; void ms;
    return this.stage.show(at, text, rest);
  }

  // After Learn to Play she keeps quiet: what she would have said waits in her notes,
  // under Tab (help.js), and nothing pops on its own.
  note(text, opts = {}) {
    this.trace("note " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    try { const H = window.__pdxHelp; if (H && H.note) H.note(opts.sub ? `${text} ${opts.sub}` : text); } catch (e) {}
    return Promise.resolve();
  }

  /* ── the wake (his): black, the camera pushed into the desk, the eye opens first ── */
  wakeStart() {
    document.body.classList.add("tut-waking");
    const cam = document.getElementById("cam");
    if (cam) { cam.style.setProperty("--cam-dur", "0s"); cam.style.setProperty("--cam-s", "2.2"); cam.style.setProperty("--cam-ty", "-120px"); }
    if (!document.getElementById("tut-black")) {
      const v = document.createElement("div"); v.id = "tut-black";
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
  // any click or Enter, swallowed
  anyClick() {
    return new Promise((resolve) => {
      const eat = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
      const done = () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true);
        setTimeout(() => { window.removeEventListener("pointerup", eat, true); window.removeEventListener("click", eat, true); }, 350); resolve(); };
      const down = (e) => { eat(e); done(); };
      const key = (e) => { if (e.key === "Enter" || e.key === " ") { eat(e); done(); } };
      setTimeout(() => {
        window.addEventListener("pointerdown", down, true); window.addEventListener("keydown", key, true);
        window.addEventListener("pointerup", eat, true); window.addEventListener("click", eat, true);
      }, 300);
    });
  }
  // His opening: he wakes, the eye speaks, the goal of the game at once, and which piece is his.
  async wake() {
    // her first line rides the eye over the dark: the eye follows him, and speaks
    const v = document.getElementById("tut-black");
    if (v) { const t = v.querySelector(".tb-line"); if (t) t.textContent = ""; const h = v.querySelector(".tb-hint"); if (h) h.style.display = "none"; }
    await this.say(null, L.wake[0]);
    this.wakeRise();
    await new Promise((r) => setTimeout(r, 1400));
    await this.say(null, L.wake[1]);
    await this.say(null, L.wake[2]);
    await this.say(".vital-chip.vc-cp", L.goal, { rings: [".vital-chip.vc-cp"] });
    const me = this.me(), c = me ? me.century : 30;
    const ship = () => document.querySelector(`#timeline-rail .cc-shipg[data-seat="${CSS.escape(this.seat)}"]`) || this.fog.starOf(c);
    await this.say(ship, L.you.replace("{c}", R(c)), { rings: [ship] });
  }
  clear() { this.stage.hide(); }

  /* ───────────── boot: a real room, the real game ───────────── */
  async start(opts = {}) {
    // a Reconnect hands over the rebuilt room (resume.js); otherwise a new one
    let r = opts.resume || null;
    if (!r) {
      const inp = document.getElementById("inp-name");
      const prof = (() => { try { return profile.get(); } catch (e) { return {}; } })();
      let name = ((inp && inp.value) || prof.name || "Traveller").trim().slice(0, 24) || "Traveller";
      if (/^(varr|oda)$/i.test(name)) name = "Traveller";
      r = await api.createRoom(name, 3, "tutorial", prof.colour != null ? prof.colour : null);
    }
    const seat = r.seat;
    const conn = new Connection(r.code, seat);
    const game = new Game(conn, seat);
    this.conn = conn; this.game = game; this.seat = seat;
    window.__game = game;
    window.__tut = this;
    try { game.learnSeatColours(r.room); } catch (e) {}
    game.setSpeed("slow");
    window.__helaMute = true;               // her ambient remarks wait; the lessons speak
    document.body.classList.add("tut", "tut-story");
    if (!opts.resume) this.wakeStart();
    // the comic effects play in the story too, paced with the lines (fx.js)
    try { window.__fx = window.__fx || {}; window.__fx.tutorial = true; } catch (e) {}
    // the Merchant is not on the chart before his beat (the map's own gate)
    try { window.__pdxMerchantReveal && window.__pdxMerchantReveal(false); } catch (e) {}
    this.stage = new Stage(this);
    this.fog = new MapFog();
    this.fog.disabled = true;           // his cut, not the fog: one era, then the whole chart
    this.cut = FIRST_ERA_LOW;
    this._cutT = setInterval(() => this.limitMap(), 600);
    this.markTrack("hour");
    // back after a reload: the lesson stands where it was before the first table arrives
    if (opts.resume) this.restore(opts.snap || null);
    this.hook();

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
        if (!begun) { begun = true; showGame(); game.begin(m.room); }
      } else if (!startSent) { startSent = true; conn.start(); }
    });
    conn.on("state", (m) => { if (!begun) { begun = true; showGame(); } game.onMessage("state", m); });
    conn.on("event", (m) => game.onMessage("event", m));
    conn.on("decision_request", (m) => game.onMessage("decision", m));
    conn.on("error", (m) => console.warn("server error:", m.detail));
    conn.connect();
  }

  /* ───────────── hooks into the real game ───────────── */
  hook() {
    const g = this.game;
    // Events: a line can hold the queue before or after the game plays an event.
    const play = g.playEvent.bind(g);
    g.playEvent = async (msg) => {
      try { await this.before(msg); } catch (e) { console.error("[tutorial] before", e); }
      let why = null;
      try { why = this.cause(msg); } catch (e) { console.error("[tutorial] cause", e); }
      const out = await play(msg);
      try { if (why) await this.causeDone(why); } catch (e) { console.error("[tutorial] cause done", e); }
      try { await this.after(msg); } catch (e) { console.error("[tutorial] after", e); }
      return out;
    };
    // Decisions: guidance is laid over the control the game has just drawn.
    const decide = g.onDecision.bind(g);
    g.onDecision = (req) => {
      const go = () => {
        const out = decide(req);
        try { this.onDecision(req); } catch (e) { console.error("[tutorial] decision", e); }
        this.persist();                        // a stable point: the lesson as he sees it now
        return out;
      };
      let pre = null;
      try { pre = this.scripted ? this.beforeDecision(req) : null; } catch (e) { console.error("[tutorial] pre", e); }
      if (pre && pre.then) { pre.then(go, (e) => { console.error("[tutorial] pre", e); go(); }); return; }
      return go();
    };
    const respond = g.respond.bind(g);
    g.respond = (data) => {
      const req = g.pendingReq;
      const out = respond(data);
      try { this.onRespond(req, data); } catch (e) { console.error("[tutorial] respond", e); }
      return out;
    };
    // The guided hand: only the next die of the plan may be set, into its cell.
    const canPlace = g.canPlace.bind(g);
    this._realCanPlace = canPlace;
    g.canPlace = (r, c, v, drag) => {
      const ok0 = canPlace(r, c, v, drag);
      // the training wheels: only the modules his machine has yet
      const ok = ok0 && !(this.machine && (!this.machine.functions.includes(r) || c >= this.machine.modules));
      if (!ok || !this.plan || !g.alloc) return ok;
      if (drag && drag.source === "cell" && +drag.r === r && +drag.c === c) return true;
      const s = this.nextStep();
      return !!s && s.kind === "cell" && s.r === r && s.c === c && s.v === +v;
    };
    const after = g.afterPlace.bind(g);
    g.afterPlace = () => {
      after();
      try { this.afterPlace(); } catch (e) { console.error("[tutorial] place", e); }
    };
    const reject = g.rejectDrop.bind(g);
    g.rejectDrop = (r, c, v, drag) => {
      reject(r, c, v, drag);
      if (this.plan && canPlace(r, c, v, drag)) {
        const chip = document.getElementById("refuse-why");
        if (chip) chip.textContent = "FOLLOW THE GLOW";
        this.stage.nudge();
      }
    };
    // The Market's Pass waits until the lesson's card is bought.
    const act = g.marketAct.bind(g);
    g.marketAct = (data) => {
      if (this.blockPass && data && data.action === "pass") {
        this.stage.nudge();
        try { window.__audio && window.__audio.play("whiff"); } catch (e) {}
        return;
      }
      return act(data);
    };
    // While the opening is guided, the lines do the pointing; the game's own
    // arrow to other scenes would point twice.
    const beacon = g.updateBeacon.bind(g);
    g.updateBeacon = () => (this.scripted && this.pointing ? g.hideBeacon() : beacon());
    // follow camera pans so a "look at the Merchant" step advances by itself
    this._sceneT = setInterval(() => this.watchScene(), 250);
    const hookBrain = () => {
      const f = window.__helaBrainFile;
      if (!f || f.__tut) return !!(f && f.__tut);
      const w = (item) => { f(item); if (!this._heraldDone) this._heraldDue = true; };
      w.__tut = true;
      window.__helaBrainFile = w;
      return true;
    };
    if (!hookBrain()) { const iv = setInterval(() => { if (hookBrain()) clearInterval(iv); }, 500); }
  }

  /* ───────────── events ───────────── */
  /* ── WHY IT HAPPENED: while his own machine resolves (the first five Hours), the
     die that causes the effect glows on the machine for as long as the effect plays,
     and HELA says which module did it. The first time each module fires she waits
     for him to read it; after that the line rides along and the next replaces it. ── */
  causeCell(r, c) { return document.querySelector(`#machine-body .cell[data-r="${r}"][data-c="${c}"]`); }
  // a rival's die, on the dice strip of their case file
  rivalCell(seat, r, c) {
    const card = document.querySelector(`#players-zone .pcard[data-seat="${CSS.escape(seat)}"]`);
    const grp = card && card.querySelectorAll(".bd-alloc .ba-fn")[r];
    return grp ? grp.querySelectorAll("b")[c] || null : null;
  }
  cause(msg) {
    const k = msg.kind, p = msg.payload || {}, self = this.seat;
    if (k === "allocations_revealed") { this._allocs = p.allocations || {}; return null; }
    if (this.hour() > 5 && !this.scripted) return null;
    const m = this.game.myLastMatrix, allocs = this._allocs || {};
    const theirs = (seat) => (allocs[seat] && allocs[seat].matrix) || null;
    const cells = [];                        // every die causing this, his and the rivals'
    let text = "", key = "";
    const mine = (r, c) => { if (m && m[r] && m[r][c]) { const n = this.causeCell(r, c); if (n) cells.push(n); return true; } return false; };
    const rival = (seat, r, c) => { const mm = theirs(seat); if (mm && mm[r] && mm[r][c]) { const n = this.rivalCell(seat, r, c); if (n) cells.push(n); return true; } return false; };
    if (k === "recharged") {
      const c = (p.module || 1) - 1;
      (p.effects || []).forEach((e) => { if (e.seat === self) mine(0, c); else rival(e.seat, 0, c); });
      const e = (p.effects || []).find((x) => x.seat === self);
      if (e) {
        text = [`+${e.energy} energy: your <b>Recharge 1</b> die fed your energy.`,
          `+${e.gold} gold: your <b>Recharge 2</b> die minted it.`,
          `+${e.energy} energy and +${e.gold} gold: your <b>Recharge 3</b> die.`][c];
        key = "r" + c;
      }
    } else if (k === "heated") {
      if (p.seat === self) { mine(2, 0); text = `Heat ${p.booms}/12: your <b>first Travel die</b> only heats the motor. It moves you nothing.`; key = "heat"; }
      else rival(p.seat, 2, 0);
    } else if (k === "paradox_resolved" && typeof p.module === "number" && p.module >= 4 && p.module <= 6) {
      // WHOSE PARADOX: a die reaches only where its module points from its owner's century
      // (ahead, the same century, behind), so every hit is billed to the dice that could
      // make it. He hears "your paradox" only when his own die reached someone.
      const col = p.module - 4;
      const hits = (p.hits || []).filter((h) => h.damage);
      const causers = Object.keys(allocs).filter((seat) => { const mm = theirs(seat); return mm && mm[1] && mm[1][col]; });
      const reach = (from, to) => this.paradoxReaches(from, to, col);
      const onMe = hits.find((h) => h.seat === self);
      const mineHit = causers.includes(self) ? hits.filter((h) => h.seat !== self && reach(self, h.seat)) : [];
      const byMe = onMe ? causers.filter((x) => x !== self && reach(x, self)) : [];
      const reachers = causers.filter((x) => hits.some((h) => h.seat !== x && reach(x, h.seat)));
      reachers.forEach((seat) => { if (seat === self) mine(1, col); else rival(seat, 1, col); });
      const nm = `<b>Paradox ${col + 1}</b>`;
      const parts = [];
      if (onMe) {
        const dir = ["ahead of", "in the same century as", "behind"][col];
        const holds = (n, card) => { const t = ((this.game.view || {}).travelers || []).find((x) => x.name === n) || {};
          return (t.hand || t.equipment || []).some((c) => c && c.name === card); };
        const sword = mineHit.map((h) => h.seat).find((n) => holds(n, "Laser Sword"));
        if (byMe.length) parts.push(`-${onMe.damage} energy for you: ${byMe.join(" and ")}'s ${nm} ${byMe.length > 1 ? "dice" : "die"} hit you${col === 2 ? " for double" : ""}. You stood ${dir} them.`);
        else if (sword) parts.push(`-${onMe.damage} energy for you: ${sword}'s Laser Sword threw your paradox back at you.`);
        else parts.push(`-${onMe.damage} energy for you from this paradox.`);
        key = "hit";
      }
      if (mineHit.length) {
        const pos = this._posAtAlloc || {}, mc = pos[self];
        const names = mineHit.map((h) => h.seat).join(" and ");
        const where = col === 1 ? (mc ? `in ${R(mc)}, your own century` : "in your own century")
          : col === 0 ? "ahead of you, in a later century" : "behind you, in an earlier century";
        parts.unshift(`Your paradox landed: ${names} stood ${where}, so your ${nm} die hit them${col === 2 ? " for double" : ""}.`);
        key = "p" + col;
      }
      if (!parts.length && hits.length && this.scripted && this.once("rival-paradox")) {
        // the rivals' own paradoxes, once, so the zaps on the table are never read as his
        const names = reachers.filter((x) => x !== self);
        const mineIdle = causers.includes(self);
        parts.push(`${names.length ? names.join(" and ") + "'s" : "A rival's"} ${nm} hit ${hits.map((h) => h.seat).join(" and ")}. Not yours: `
          + (mineIdle ? `your ${nm} die reached no one.` : this.machine && !this.machine.functions.includes(1) ? "you have no Paradox yet." : "you had no die there."));
        key = "rivals";
      }
      text = parts.join(" ");
      // a line about an earlier paradox never lingers over one that is not about him
      if (!text && this._causeText && this.stage && this.stage.callout.classList.contains("on") && !this.stage._next
        && this.stage.callout.querySelector(".tc-text").innerHTML === pdxWords(this._causeText)) this.stage.hide();
    } else if (k === "traveled") {
      if (p.seat === self && p.from !== p.to) {
        const col = this._travelCol || 1;
        mine(2, col);
        const back = p.to < p.from, n = Math.abs(p.to - p.from);
        const cost = back ? Math.max(0, Math.min(p.from, 30) - Math.max(p.to, 10)) + 2 * Math.max(0, Math.min(p.from, 10) - p.to) : 0;
        text = `Moved ${n}: your <b>${col === 1 ? "second" : "third"} Travel die</b> carried you.` + (back ? ` The past cost ${cost} energy.` : " The future is free.");
        key = "move";
      } else if (p.seat !== self) { rival(p.seat, 2, 1) || rival(p.seat, 2, 2); }
    }
    if (!cells.length && !text) return null;
    cells.forEach((n) => n.classList.add("tut-cause"));
    if (text) { this.toast(null, text); this._causeText = text; }
    return { cells, text, key };
  }
  // whether `from`'s paradox die in this column reaches `to` (positions as the dice were
  // set: paradoxes resolve before anyone travels), with the cards that bend it
  paradoxReaches(from, to, col) {
    const v = this.game.view || {}, pos = this._posAtAlloc || {};
    const tv = (n) => (v.travelers || []).find((t) => t.name === n) || {};
    const at = (n) => (pos[n] != null ? pos[n] : tv(n).century);
    const a = at(from), b = at(to);
    if (a == null || b == null || from === to) return false;
    const holds = (n, card) => (tv(n).hand || tv(n).equipment || []).some((c) => c && c.name === card);
    if (col === 0) return b > a || (holds(from, "Spear of Destiny") && b < a);
    if (col === 1) return b === a || holds(from, "Window of Time");
    return b < a;
  }
  async causeDone(w) {
    if (w.key === "hit" && this.once("why-hit")) await this.say(null, L.paradoxHit, { sub: w.text });
    else if (w.text && this.once("why-" + w.key)) await this.say(null, w.text);
    if (/^p\d$/.test(w.key || "")) this.learn("paradox");
    w.cells.forEach((n) => n.classList.remove("tut-cause"));
    document.querySelectorAll(".tut-cause").forEach((n) => { if (!n.closest || !n.closest("#machine-body") || !this.req) n.classList.remove("tut-cause"); });
  }

  async before(msg) {
    const k = msg.kind, p = msg.payload || {};
    if (k === "allocations_revealed" && this.scripted && this.once("rivals")) await this.rivalsLesson();
    if (k === "hour_started") {
      this.hourNo = p.hour;
      if (p.hour === 1 && this.once("intro")) await this.wake();
      await this.heraldBeat();
      if (p.hour >= 2 && this.scripted) await this.merchantIntro();
      if (this.scripted && !this.done.has("win") && ((this._valveHour && p.hour > this._valveHour) || p.hour >= 12)) await this.wrapUp();
    }
    if ((k === "phase_started" || k === "phase_skipped") && this.hourNo === 1 && p.phase === "main") this.markTrack("machine");
    if ((k === "phase_started" || k === "phase_skipped") && p.phase === "market") {
      const v = this.game.view;
      await this.shelfOffer(k === "phase_started" && !!(v && v.market_access));
    }
    if (k === "game_over") this.gameOver(p);
  }

  async after(msg) {
    const k = msg.kind, p = msg.payload || {};
    const self = this.seat;
    if (k === "merchant_moved" && this.done.has("merchant") && this.once("merchant-first-move")) {
      await this.say(merchantOnMap, `He moved because the Market phase ended: he always does, toward the richest traveller he is not with. Now he is at ${R(p.to)}.`);
    }
    if (k === "allocations_revealed" && this.once("reveal")) {
      this.toast(null, "Everyone's dice are revealed at once, then the modules resolve from 1 to 9.", { ms: 4200 });
    }
    if (k === "overloaded" && p.seat === self && this.once("overloaded")) {
      this.learn("overload");
      const fn = (p.functions || [p.function])[0];
      // the moment speaks alone: an earlier line (the heat, a recharge) never stays beside it
      if (!this.stage._next) this.stage.hide();
      // the game's own explained overload moment (help.js), the same one every match shows
      const H = window.__pdxHelp;
      let shown = false;
      if (H && H.overload) {
        try {
          const moment = H.overload((p.functions || [p.function]).filter((x) => x != null), { force: true, first: true });
          await new Promise((r) => setTimeout(r, 150));
          shown = !!document.querySelector(".pdx-ovl");
          await moment;
        } catch (e) {}
      }
      // he must see it: when the game's own moment did not show, her line does
      if (!shown) await this.say(machineCell(fn, 0),
        `<b>${FN[fn] || "That function"} overloaded:</b> three dice in one function. It stays shut for the whole next Hour.`,
        { rings: [`#machine-body .matrix-fnlabel`] });
    }

    if (k === "exploded" && p.seat === self && this.once("exploded")) {
      await this.say("#mano-boomg", "<b>Your motor exploded</b> at 12 heat: you lost 2 energy and sit out the rest of this Hour.");
    }
    if (k === "terminated") {
      if (p.seat === self && this.once("dead")) {
        await this.say(".vital-ekg", "<b>You were terminated</b> at 0 energy. Next Hour you return at XXX with 12 energy plus your items' recycle value.");
      } else if (p.by === self && this.once("killer")) {
        await this.say("#players-zone .pcard", `<b>You terminated ${p.seat}.</b> +1 contract point, and you are now Wanted: a 4 gold bounty on you. Pay 4 gold with Declare at a Market to clear it.`);
      }
    }
    if (k === "milestone" && p.seat === self && this.once("milestone-" + p.century)) {
      this.toast(".vital-chip.vc-cp", `<b>+1 point:</b> the first time you end an Hour on ${R(p.century)}.`);
    }
    if (k === "delivered" && p.seat === self && this.once("delivered")) {
      this.learn("deliver");
      await this.say(".vital-chip.vc-cp",
        "<b>Delivered: +1 contract point.</b> Points decide the winner, and every point also earns you a contract.");
      // the timeline mends where the relic went home (the shared hook draws it)
      try { window.__pdxTimelineMend && window.__pdxTimelineMend(p.century, 1); } catch (e) {}
      await this.say(".vital-chip.vc-cp", L.mended.replace("{c}", R(p.century || this.me().century)), { rings: [".vital-chip.vc-cp"] });
      // he kept a promise: the roll comes off the chart (his chartOpen)
      // the whole chart comes off its roll when Learn to Play ends (wrapUp)
    }
    if (k === "reward_resolved" && p.seat === self) {
      const txt = (REWARD_TEXT[p.category] || [])[(p.roll || 1) - 1];
      const followed = this.explained && this.explained === this.lastReward;
      this.explained = null;
      if (!followed && this.once("reward-" + this.hour() + "-" + p.category)) {
        this.learn("contract");
        await this.say(null, `<b>${p.category}, rolled ${R(p.roll || 1)}:</b> ${txt || "done"}.`
          + (p.category === "Time" ? " The ticket waits in your case: drag it onto the machine's slot when you want it." : ""));
      }
      // the story goes on: an overload and the escape valve come next, then the end
    }
    if (k === "card_bought" && p.seat === self) this.learn("market");
    if (k === "secret_market_opened" && this.once("secret")) {
      this.toast(null, "<b>The Secret Market at XI is open.</b> It sells one card at a time to whoever stands there.");
    }
  }

  // The map opens a period at a time, the first time the player stands in it.
  async checkPeriod(c) {
    if (c == null) return;
    const i = periodOf(c);
    for (let j = 1; j <= i; j++) {
      const p = PERIODS[j];
      if (this.fog.open.has(p.key)) continue;
      this.fog.lift(p.key);
      if (p.key === "Ascension") {
        await this.say(() => this.fog.starOf(15),
          "<b>Ascension, centuries XI to XIX.</b> The Secret Market waits at XI and opens once someone ends an Hour there.");
      } else {
        await this.say(() => this.fog.starOf(6),
          "<b>Origins, centuries I to X.</b> Down here every century into the past costs 2 energy, and Year Zero, past century I, ends the game.");
      }
    }
  }

  /* ───────────── decisions ───────────── */
  /* ── the beat that belongs BEFORE a decision is shown ── */
  beforeDecision(req) {
    if (this._resumed) { this._resumed = false; return this.catchUp(req).then(() => (this.scripted ? this.beforeDecision(req) : null)); }
    if (this._heraldDue) return this.heraldBeat().then(() => this.beforeDecision(req));
    const h = (req.options || {}).tutorial || {};
    if (req.kind === "allocate") return this.grow(h.machine).then(() => this.shutReminder(req, h));
    return null;
  }
  // his machine grows: four cells, then Paradox, then the third module
  async grow(m) {
    const stage = !m ? 3 : m.modules >= 3 ? 3 : m.functions.includes(1) ? 2 : 1;
    const b = document.body.classList;
    if (stage === 1) { b.add("tut-2x2"); this.stageNo = 1; return; }
    if (this.stageNo === stage || this._growing) return;
    const from = this.stageNo || 0;
    this.stageNo = stage;
    if (from === 0) { this.applyStage(stage); return; }
    this._growing = true;
    try {
      if (stage >= 2 && from < 2) {
        b.add("tut-show-paradox");
        this.born('#machine-body .cell[data-r="1"], #machine-body .matrix-fnlabel.fn-paradox');
        await new Promise((r) => setTimeout(r, 600));
        await this.say("#machine-body .matrix-wrap", L.paradox, { rings: ["#machine-body .matrix-fnlabel.fn-paradox"], avoid: MACHINE });
        const reach = this.reach();
        if (!reach.inReach) {
          await this.say("#machine-body .matrix-wrap", `Right now it would hit no one: ${reach.behind} ${reach.many ? "are" : "is"} behind you. Travel first. From where you land, you strike next Hour.`,
            { rings: ["#players-zone .pcard"], avoid: MACHINE });
        }
      }
      if (stage === 3) {
        b.add("tut-mod3"); b.remove("tut-2x2");
        this.born('#machine-body .cell[data-c="2"]');
        await new Promise((r) => setTimeout(r, 600));
        await this.say("#machine-body .matrix-wrap", L.mod3, { rings: ['#machine-body .cell[data-c="2"]'], avoid: MACHINE });
        await this.say("#machine-body .matrix-wrap", L.paradoxAim, { rings: ['#machine-body .cell[data-r="1"][data-c="2"]'], avoid: MACHINE });
      }
    } finally { this._growing = false; }
  }
  // who his first two Paradox modules reach from where he stands now
  reach() {
    const v = this.game.view, me = this.me();
    const others = ((v && v.travelers) || []).filter((t) => !t.is_self && t.name !== this.seat);
    if (!me) return { inReach: true, behind: "", many: false };
    const ahead = others.filter((t) => t.century > me.century), here = others.filter((t) => t.century === me.century);
    const back = others.filter((t) => t.century < me.century);
    return { inReach: !!(ahead.length || here.length), ahead, here, behind: back.map((t) => t.name).join(" and ") || "they", many: back.length > 1 };
  }
  // an Hour with a shut function: before he places a die, why that row takes none
  async shutReminder(req, h) {
    const me = this.me();
    const shut = (me && me.overloaded_functions) || [];
    if (!this.scripted || !shut.length || !this.once("shut-" + this.hour())) return;
    const fn = shut[0], name = FN[fn] || "That function";
    const row = [`#machine-body .matrix-fnlabel.fn-sealed`, machineCell(fn, 0), machineCell(fn, 1), machineCell(fn, 2)];
    await this.say(machineCell(fn, 0), `<b>${name} is shut this Hour.</b> It overloaded last Hour: three dice in one function. No die can go there until this Hour is over.`,
      { rings: row, avoid: MACHINE });
    if (h && h.lesson === "valve" && h.matrix && h.matrix[2] && h.matrix[2][0] === 3 && h.matrix[2][1] === 3) {
      const r = this.reach(), ahead = r.ahead.map((t) => t.name).join(" and ");
      await this.say(machineCell(2, 0), ahead
        ? `${ahead} ${r.ahead.length > 1 ? "stand" : "stands"} ahead of you: a <b>II</b> in Paradox 1 reaches them this Hour. Your pair of <b>III</b> goes to <b>Travel</b>, toward them.`
        : "No rival stands ahead of you or in your century, so Paradox would hit no one. Your pair of <b>III</b> goes to <b>Travel</b>.",
        { rings: [machineCell(2, 0), machineCell(2, 1)], avoid: MACHINE });
    }
  }
  born(sel) {
    document.querySelectorAll(sel).forEach((n) => { n.classList.add("tut-new"); setTimeout(() => n.classList.remove("tut-new"), 1600); });
  }

  // His cut: the chart clipped just below the era he may see, the game's own rolled
  // chart sitting on the cut; the desk shows below it. Re-applied through redraws.
  limitMap() {
    if (this._mapOpen) return;
    const me = this.me && this.me();
    if (me && me.century < this.cut) { this.unrollMap(); return; }   // he is past the roll: open it all
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
      if (c < this.cut) { n.classList.add("tut-era-hidden"); return; }
      n.classList.remove("tut-era-hidden");
      const bb = n.getBoundingClientRect();
      if (bb.height && bb.bottom - cRect.top > cut) cut = bb.bottom - cRect.top;
    });
    if (cut <= 0) return;
    cut += 18;
    const pct = Math.max(0, Math.min(96, (1 - cut / cRect.height) * 100));
    rail.style.setProperty("--tut-cut", pct.toFixed(1) + "%");
    rail.querySelectorAll(".cplot, .cplot-sing, .cplot-ori").forEach((cp) =>
      cp.style.setProperty("clip-path", `inset(0 0 ${pct.toFixed(1)}% 0)`, "important"));
    const roll = document.getElementById("chart-roll");
    if (roll) {
      roll.style.setProperty("display", "block", "important");
      roll.style.setProperty("opacity", "1", "important");
      const rollH = roll.offsetHeight || 20;
      roll.style.setProperty("top", (cplot.offsetTop + cplot.offsetHeight * (cut / cRect.height) - rollH / 2) + "px", "important");
    }
  }
  // the roll comes off: every era out from behind it (his openMap)
  unrollMap() {
    if (this._mapOpen) return;
    this._mapOpen = true;
    const rail = document.getElementById("timeline-rail");
    if (rail) {
      rail.querySelectorAll(".tut-era-hidden").forEach((n) => n.classList.remove("tut-era-hidden"));
      rail.querySelectorAll(".cplot, .cplot-sing, .cplot-ori").forEach((cp) => cp.style.removeProperty("clip-path"));
    }
    document.body.classList.add("tut-map-open");
    const roll = document.getElementById("chart-roll");
    if (roll) {
      roll.style.setProperty("transition", "opacity .9s ease", "important");
      roll.style.setProperty("opacity", "0", "important");
      setTimeout(() => { ["display", "opacity", "top", "transition"].forEach((k) => roll.style.removeProperty(k)); }, 1000);
    }
  }

  // THE MERCHANT, met at the far end of the era he can see: the chart grows to show
  // him, the eye goes to him and says who he is, the wagon up close, his shelf and
  // the promise on a relic. Only then does he move where the traveller can watch.
  async merchantIntro() {
    if (this.done.has("merchant") || this._introMerchant) return;
    this._introMerchant = true;
    this._beat = (this._beat || 0) + 1;
    try { await this._merchantIntro(); } finally { this._beat--; this.persist(); }
  }
  async _merchantIntro() {
    this.cut = MERCHANT_ERA_LOW;            // the chart grows, on the wooden table
    document.body.classList.add("tut-merchant", "tut-map-grow");
    try { window.__pdxMerchantReveal && window.__pdxMerchantReveal(true); } catch (e) {}
    this.limitMap();
    await new Promise((r) => setTimeout(r, 1300));
    const v = this.game.view, me = this.me();
    const mc = v ? v.merchant_century : 20;
    const at = merchantOnMap;
    await this.say(at, L.merchantArrives.replace("{c}", R(mc)), { rings: [at] });
    await this.say(at, L.merchantWho, { rings: [at] });
    this.learn("merchant");
    const cam = this.game.camera;
    cam._engage(); cam.setScene("market");
    await new Promise((r) => setTimeout(r, 1200));
    await this.say("#market-sign", L.merchantSign, { rings: ["#market-sign"], avoid: SHELF });
    await this.say("#market-zone .market-row", L.marketScene, { rings: ["#market-zone .market-row"], avoid: SHELF });
    await this.say("#market-zone .market-row", L.relics, { rings: ["#market-zone .market-row"], avoid: SHELF });
    cam.setScene("main");
    await new Promise((r) => setTimeout(r, 900));
    this.onState && this.onState();
  }

  // THE RELIC HE CAN AFFORD, said only when it is true: at a Market phase, once the
  // view shows the gold for the lesson relic. Before that, where the gold comes from.
  async shelfOffer(phaseOpen) {
    if (!this.scripted || !this.done.has("merchant") || this.done.has("shelf-offer")) return;
    const v = this.game.view, me = this.me();
    if (!v || !me || (me.hand || []).length) return;
    const shelf = v.market_revealed || [];
    const relic = shelf.find((c) => c.name === "Super Motor")
      || shelf.slice().sort((a, b) => a.gold_cost - b.gold_cost || Math.abs(a.delivery_century - me.century) - Math.abs(b.delivery_century - me.century))[0];
    if (!relic) return;
    const cam = this.game.camera;
    const face = async () => { if (cam.scene !== "market") { cam._engage(); cam.setScene("market"); await new Promise((r) => setTimeout(r, 1200)); } };
    const cardOnShelf = () => [...document.querySelectorAll("#market-zone .market-row .card")].find((n) => n.dataset.name === relic.name && visible(n)) || null;
    if (me.gold < relic.gold_cost) {
      if (this.once("shelf-gold")) {
        // the relic he cannot afford yet, boxed on the shelf while she names it
        await face();
        await this.say(cardOnShelf, `${cardName(relic)} costs ${relic.gold_cost} gold. You have ${me.gold}. Recharge's second module pays gold: fill it and the Merchant is in reach.`, { rings: [cardOnShelf], avoid: SHELF });
        if (!phaseOpen) { cam.setScene("main"); await new Promise((r) => setTimeout(r, 900)); }
      }
      return;
    }
    this.learn("shelf-offer");
    await face();
    const card = cardOnShelf();
    if (card) {
      await this.say(card, L.marketCard.replace("{g}", relic.gold_cost), { rings: [card], avoid: SHELF });
      const stamp = card.querySelector(".card-deliver") || card;
      await this.say(stamp, L.marketPromise, { rings: [stamp], avoid: SHELF });
    }
    // no Market for him this phase: back to the desk; otherwise his decision takes it from here
    if (!phaseOpen) { cam.setScene("main"); await new Promise((r) => setTimeout(r, 900)); }
  }

  onDecision(req) {
    const k = req.kind, o = req.options || {}, hint = o.tutorial || null;
    this.req = req;
    this.pointing = false;
    this.trace("decision " + k);
    if (k === "allocate") {
      try { this._posAtAlloc = Object.fromEntries((this.game.view.travelers || []).map((t) => [t.name, t.century])); } catch (e) {}
      return this.allocate(req, hint);
    }
    if (k === "travel") return this.travel(req, hint);
    if (k === "market") return this.market(req, hint);
    if (k === "deliver") return this.deliver(req);
    if (k === "reward_category") return this.reward(req);
    if (k === "activation") return this.activation(req);
    if (k === "steal_target") return this.pickCard(req, "steal");
    if (k === "destroy_target") return this.pickCard(req, "destroy");
    if (k === "merchant_century" && this.once("d-merch")) {
      this.explained = this.lastReward;
      const mine = () => { const me = this.me(); return (me && this.fog.starOf(me.century)) || document.querySelector(ANY_GLOW); };
      return this.atScene("main", () => this.guide(mine, "<b>Move the Merchant:</b> click any lit century to send him there."));
    }
    if (k === "matrix_buff" && this.once("d-buff")) {
      this.explained = this.lastReward;
      return this.atScene("main", () => this.guide("#machine-body .matrix-wrap", "<b>Pick a module</b> on your machine: from now on it reads one higher.",
        { avoid: MACHINE }));
    }
    if (k === "capacity" && this.once("d-cap")) return this.guide(null, "Your case holds two items. Recycle one for energy to take the new one, or let the new one go.");
    if (k === "target" && this.once("d-target")) {
      const tt = o.target_type;
      if (tt === "traveler") return this.guide("#players-zone .pcard", `<b>${o.card_display || "Your item"}:</b> click the rival's file to target them.`,
        { rings: ["#players-zone .pcard"] });
      if (tt === "century") return this.atScene("main", () => this.guide(ANY_GLOW, `<b>${o.card_display || "Your item"}:</b> click a lit century.`));
      return this.guide(null, `<b>${o.card_display || "Your item"}:</b> click the card you want to target.`);
    }
    if (k === "secret_deal" && this.once("d-secret")) return this.guide(null, "The Secret Market offers its card: take it or pass.");
    return null;
  }

  // A card to steal or destroy. The game offers it in place on the shelf when the
  // shelf is in view, or in its own card picker when it is not: ring whichever is live.
  pickCard(req, mode) {
    if (!this.once("d-" + mode)) return;
    this.explained = this.lastReward;
    const cands = (req.options || {}).candidates || [];
    const inMarket = cands.some((c) => c.zone === "market");
    const cls = mode === "steal" ? ".can-steal" : ".can-destroy";
    const line = mode === "steal" ? "<b>Steal a card:</b> click the one you want, it goes into your case."
      + (inMarket ? " Taking one from the Merchant makes you Wanted." : "")
      : "<b>Destroy a card:</b> click the one you want gone.";
    const picker = "#active-prompt .card.is-actionable";
    const inPlace = `#market-zone .card${cls}, #players-zone .card${cls}`;
    setTimeout(() => {
      if (!this.req || this.req !== req) return;
      if (document.querySelector(picker)) {
        this.guide(picker, line, { rings: [picker] });
      } else if (inMarket) {
        this.atScene("market", () => this.guide(inPlace, line, { rings: [inPlace] }),
          "Press <kbd>W</kbd> to face the Merchant's shelf.");
      } else this.guide(inPlace, line, { rings: [inPlace] });
    }, 500);
  }

  onRespond(req, data) {
    if (!req) return;
    this.trace("answered " + req.kind);
    if (req.kind === "travel") document.querySelectorAll("#machine-body .cell.tut-cause").forEach((n) => n.classList.remove("tut-cause"));
    this._did = this._did || {};
    if (req.kind === "market" && data && data.action === "buy" && this._did.market == null) this._did.market = this.hour();
    if (req.kind === "deliver" && this._did.delivery == null) this._did.delivery = this.hour();
    if (req.kind === "allocate" && this._did.main == null) this._did.main = this.hour();
    this._waitScene = null;
    // A guided visit to the wagon or the records ends back at the desk, where the
    // next thing always happens. (A buy keeps him at the wagon: the shelf refills.)
    const leaving = (req.kind === "market" && !(data && data.action === "buy"))
      || req.kind === "reward_category" || /_target$|merchant_century|matrix_buff/.test(req.kind);
    if (this.scripted && leaving) {
      setTimeout(() => {
        const cam = this.game.camera;
        const next = this.game.pendingReq || this.game.pendingDecision;
        if (!cam || cam.scene === "main" || (next && !/allocate|travel|activation/.test(next.kind))) return;
        cam._engage(); cam.setScene("main");
      }, 900);
    }
    if (req.kind === "allocate") { this.plan = null; this.clear(); }
    else if (req.kind === "travel" || req.kind === "deliver" || req.kind === "reward_category"
      || req.kind === "activation" || req.kind === "market") this.clear();
    else this.clear();
    this.pointing = false;
    this.req = null;
  }

  /* ── Generators ── */
  allocate(req, hint) {
    this.markTrack("machine");
    const g = this.game;
    this.machine = (hint && hint.machine) || null;
    if (hint && hint.lesson === "valve" && hint.matrix) this._valveHour = this.hour() || (hint.hour);
    if (hint && hint.matrix && this.scripted) {
      this.plan = { matrix: hint.matrix, valve: hint.escape_valve || 0, lesson: hint.lesson };
      this.pointing = true;
      this.atScene("main", () => this.stepGuide());
      return;
    }
    this.plan = null;
    if (this.once("free-alloc")) {
      this.toast("#machine-body .matrix-wrap", "Your dice are yours now. Place all four, then Confirm.", { ms: 7000 });
    }
    void g;
  }

  nextStep() {
    const a = this.game.alloc, P = this.plan && this.plan.matrix;
    if (!a || !P) return null;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      if (P[r][c] && a.matrix[r][c] !== P[r][c]) return { kind: "cell", r, c, v: P[r][c] };
    if (this.plan.valve && a.escape !== this.plan.valve) return { kind: "valve", v: this.plan.valve };
    return { kind: "confirm" };
  }

  // After every placement: anything off the plan goes back to the tray.
  afterPlace() {
    const g = this.game, a = g.alloc;
    if (!this.plan || !a) return;
    const P = this.plan.matrix;
    let bounced = false;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (a.matrix[r][c] && a.matrix[r][c] !== P[r][c]) { a.pool.push(a.matrix[r][c]); a.matrix[r][c] = 0; bounced = true; }
    }
    if (a.escape && a.escape !== this.plan.valve) { a.pool.push(a.escape); a.escape = 0; bounced = true; }
    if (bounced) {
      g.normalizeAllocation();
      g.renderMachineAlloc(); g.renderDiceCockpit();
      this.stage.nudge();
    }
    this.stepGuide();
  }

  stepGuide() {
    const s = this.nextStep();
    if (!s) return;
    const h = this.hour(), first = h === 1, lesson = this.plan.lesson;
    const P = this.plan.matrix;
    const die = (v) => () => {
      const held = document.querySelector("#dice-body .dice-pool .die.selected");
      if (held && +held.dataset.v === v) return held;
      for (const n of document.querySelectorAll(`#dice-body .dice-pool .die[data-v="${v}"]`)) if (visible(n)) return n;
      return null;
    };
    if (s.kind === "cell") {
      const cell = `#machine-body .cell[data-r="${s.r}"][data-c="${s.c}"]`;
      const v = s.v, n = s.c + 1, fn = FN[s.r];
      let text, sub = "";
      if (s.r === 0) {
        text = [`Drag a ${R(v)} onto <b>Recharge 1</b>: +${v} energy.`,
          `Drag a ${R(v)} onto <b>Recharge 2</b>: +${v} gold.`,
          `Drag a ${R(v)} onto <b>Recharge 3</b>: +${v} energy and gold.`][s.c];
        if (s.c === 0 && first) sub = "At 0 energy you are terminated.";
        if (s.c === 1) sub = "Gold buys the Merchant's cards.";
        if (s.c === 2) { sub = "A third die in one function OVERLOADS it: it pays now, and shuts for the next Hour."; this.markTrack("overload"); }
      } else if (s.r === 1) {
        text = [`Drag a ${R(v)} onto <b>Paradox 1</b>: everyone ahead of you loses ${v} energy.`,
          `Drag a ${R(v)} onto <b>Paradox 2</b>: everyone in your own century loses ${v}.`,
          `Drag a ${R(v)} onto <b>Paradox 3</b>: everyone behind you loses ${v * 2}, double.`][s.c];
        if (s.c === 0) sub = "Ahead means a higher century.";
        if (s.c === 0 && lesson === "valve" && !this.reach().ahead.length) sub = `No one stands ahead of you, so it hits no one: it goes here because ${FN[((this.me() || {}).overloaded_functions || [0])[0]] || "Recharge"} is shut and Travel holds the pair.`;
        if (lesson === "strike" && s.c < 2) {
          // only the ones this module really reaches: ahead for the first, beside him for the second
          const r = this.reach(), who = s.c === 1 ? r.here : r.ahead;
          if (who && who.length) sub = `${who.map((t) => t.name).join(" and ")} ${who.length > 1 ? "stand" : "stands"} in ${R(who[0].century)}${s.c === 1 ? ", with you" : ""}. It lands this Hour, before anyone travels.`;
          else if (s.c === 0 && P[1][1]) sub = "No one stands ahead of you, so this die hits no one. It opens the way to the second module: they fill left to right.";
        }
        if (s.c === 2) { sub = "A third die OVERLOADS Paradox: the Past hits for double now, and the function shuts for the next Hour."; this.markTrack("overload"); }
        this.markTrack("paradox");
      } else {
        text = [`Drag a ${R(v)} onto <b>Travel 1</b>: +${v} heat.`,
          `Drag a ${R(v)} onto <b>Travel 2</b>: move up to ${v} ${v === 1 ? "century" : "centuries"}.`,
          `Drag a ${R(v)} onto <b>Travel 3</b>: move up to ${v * 2} more.`][s.c];
        if (s.c === 0) sub = first ? "Travel must heat before it moves." : "12 heat makes your motor explode.";
        if (s.c === 2) { sub = "A third die in one function OVERLOADS it: it pays now, and shuts for the next Hour."; this.markTrack("overload"); }
        if (s.c === 1 && !first && P[2][2]) sub = "";
      }
      if (lesson === "travel" && s.r === 2 && s.c === 0 && this.plan.goal != null) {
        sub = `This Hour's dice are for the trip to ${R(this.plan.goal)}.` + (sub ? " " + sub : "");
      }
      // one line at one size: the step, then why it matters
      text = sub ? `${text} ${sub}` : text;
      sub = "";
      // his words open the small machine's hours; the step follows at the same size
      const placed = this.game.alloc ? this.game.alloc.matrix.flat().filter((x) => x).length : 0;
      if (placed === 0 && (h === 1 || h === 2)) {
        sub = (h === 1 ? L.reduced + " " : "") + text;
        text = h === 1 ? L.t1prompt : L.prompt;
      }
      void fn; void n;
      this.guide(cell, text, { sub, rings: [cell, die(v)], avoid: MACHINE });
      return;
    }
    if (s.kind === "valve") {
      const sealed = (this.game.alloc && [...this.game.alloc.unavailable]) || [];
      const what = sealed.length ? FN[sealed[0]] : "A function";
      this.guide("#dice-body .escape-drop",
        `${what} is shut this Hour, so this ${R(s.v)} fits nowhere. Drop it in the <b>escape valve</b>. While a function is shut, the valve drains energy: this die costs you ${s.v} energy.`,
        { rings: ["#dice-body .escape-drop", die(s.v)], avoid: MACHINE });
      return;
    }
    this.guide("#confirm-alloc", "All your dice are placed. Click <b>Confirm</b>." + (first ? " Everyone chooses in secret, then the machines resolve." : ""),
      { avoid: MACHINE });
  }

  /* ── Travel ── */
  travel(req, hint) {
    this.markTrack("travel");
    const o = req.options || {};
    const from = o.century, max = o.max || 0;
    const goal = hint && hint.goal != null ? hint.goal : null;
    // the move comes from a die: it glows on the machine while he plots
    const col = o.module === 9 ? 2 : 1;
    this._travelCol = col;
    // never plot into centuries he cannot see: if his reach goes past the roll, it comes off
    if (!this._mapOpen && from - max < this.cut) this.unrollMap();
    if (this.hour() <= 5 || this.scripted) { const cell = this.causeCell(2, col); if (cell) cell.classList.add("tut-cause"); }
    if (!this.scripted || goal == null) {
      if (this.once("free-travel")) {
        this.toast(ANY_CMD, `Click a lit century to travel up to ${max}, or HOLD to stay. Into the past costs energy; into the future is free.`);
      }
      return;
    }
    const dir = goal > from ? 1 : -1;
    const dist = Math.min(max, Math.abs(goal - from));
    const land = from + dir * dist;
    const me = this.me() || {};
    const toMerchant = !(me.hand || []).length;
    // the valve Hour's trip walks toward a rival, so his paradox reaches them next Hour
    const rivals = this._valveHour && this._valveHour === this.hour()
      ? ((this.game.view && this.game.view.travelers) || []).filter((t) => !t.is_self && t.century === goal).map((t) => t.name) : [];
    const why = rivals.length
      ? `${land === goal ? "to stand with" : "toward"} ${rivals.join(" and ")}, so your paradox reaches them next Hour`
      : land === goal
        ? (toMerchant ? "to reach the Merchant" : "to reach the century where your card is delivered")
        : (toMerchant ? "toward the Merchant" : `toward ${R(goal)}, where your card is delivered`);
    let sub = "";
    if (this.once("travel-cost")) sub = " Going into the past costs 1 energy per century. Going into the future is free.";
    else if (dir > 0 && this.once("travel-free")) sub = " Forward in time is free.";
    this.pointing = true;
    this.atScene("main", () => this.travelGuide(from, dist, land, why, sub));
    this.learn("travel");
  }
  travelGuide(from, dist, land, why, sub) {
    if (!this.req || this.req.kind !== "travel") return;
    if (dist === 0) {
      this.guide(ANY_ANCHOR, `You are where you need to be. Click <b>HOLD</b> to stay.${sub}`);
    } else {
      this.guide(() => this.fog.starOf(land), `Click <b>${R(land)}</b> to move ${dist} ${dist === 1 ? "century" : "centuries"} ${why}.${sub}`,
        { place: "auto" });
    }
  }

  /* ── Market ── */
  market(req, hint) {
    const o = req.options || {};
    const me = this.me() || {};
    const pick = hint && hint.pick;
    const bought = (me.hand || []).length > 0;
    const lesson = this.scripted && !this.done.has("market") && !bought;
    this.markTrack("market");
    if (!lesson) {
      this.blockPass = false;
      if (bought && this.scripted && this.once("m-pass")) {
        this.pointing = true;
        this.guide(passSign, "<b>His shelf refilled:</b> the Merchant always shows four cards. Buy again, or click <b>Pass</b> to leave the Market.",
          { avoid: SHELF });
      } else if (this.once("m-free")) {
        this.toast(null, "The Market is open. Press <kbd>W</kbd> to face the Merchant: buy, renew his shelf, or pass.");
      }
      return;
    }
    const card = (o.buyable || []).find((c) => c.name === pick) || (o.buyable || [])[0];
    this.blockPass = !!card;
    this.pointing = true;
    const buyStep = () => {
      if (!card) {
        this.guide(passSign, "Nothing here you can afford yet. Click <b>Pass</b>.", { rings: [passSign] });
        return;
      }
      const sel = `#market-zone .card.can-buy[data-name="${cssq(card.name)}"]`;
      this.guide(sel, `Buy <b>${cardName(card)}</b> for ${card.gold_cost} gold: drag it into your case, or click it. Deliver it at ${R(card.delivery_century)} for 1 contract point.`,
        { avoid: SHELF });
    };
    this.atScene("market", buyStep, "You stand with the Merchant. Press <kbd>W</kbd> to face his wagon.");
  }

  /* ── Delivery ── */
  deliver(req) {
    const o = req.options || {};
    const card = (o.deliverable || [])[0];
    this.markTrack("deliver");
    if (!this.scripted && !this.once("dl-free")) return;
    this.pointing = true;
    const inDrawer = () => {
      const open = () => {
        const cell = document.querySelector("#drawer-zone .cab2-cell.hg-cell:not(.open) .cab2-front");
        return cell && visible(cell) ? cell : null;
      };
      const step = () => {
        if (!this.req || this.req.kind !== "deliver") return;
        if (open()) {
          this.guide(open, "Click the glowing drawer to open it.");
          setTimeout(step, 400);
          return;
        }
        const st = this.game._deliverState;
        if (st && st.chosen && st.chosen.size) {
          this.guide("#mala-lock", "Now click the <b>lock</b> on your case to file it.", { place: "auto" });
          return;
        }
        const cardSel = card ? `#rucksack-zone .card[data-name="${cssq(card.name)}"]` : "#rucksack-zone .card";
        this.guide(cardSel, `Drag <b>${cardName(card)}</b> from your case into the open drawer.`,
          { rings: [cardSel, "#drawer-zone .drw-folder.here"] });
        setTimeout(step, 400);
      };
      step();
    };
    this.atScene("drawer", inDrawer,
      `You stand on ${R(o.century)}, the century printed on ${cardName(card)}. Press <kbd>A</kbd> to open your records.`);
  }

  /* ── Contracts ── */
  reward(req) {
    this.lastReward = "rw" + this.hour() + ":" + (this.rewardN = (this.rewardN || 0) + 1);
    this.markTrack("contract");
    if (!this.scripted && !this.once("rw-free")) return;
    this.pointing = true;
    const inDrawer = () => {
      const step = () => {
        if (!this.req || this.req.kind !== "reward_category") return;
        const stamp = document.querySelector(".ctd-stampbtn");
        if (stamp && visible(stamp)) {
          this.guide(".ctd-stampbtn", "Stamp it to sign this contract.", { place: "auto" });
          setTimeout(step, 400);
          return;
        }
        const front = document.querySelector('#drawer-zone .cab2-cell[data-drawer="CONTRACTS"]:not(.open) .cab2-front');
        if (front && visible(front)) {
          this.guide(front, "Each point earns a contract. Click the <b>Contracts</b> drawer.", {});
          setTimeout(step, 400);
          return;
        }
        // his first real choice: no ring, pointer or aim on any one paper
        this.guide(null, "Three kinds of contract. <b>Chaos</b> hurts rivals, <b>Time</b> gives you extra turns, <b>Resource</b> pays you. Your choice. A die then picks one of its three results, and never the same kind twice in a row.",
          { rings: [] });
        setTimeout(step, 400);
      };
      step();
    };
    this.atScene("drawer", inDrawer, "Your point earned a contract. Press <kbd>A</kbd> to open your records.");
  }

  /* ── Activation ── */
  // Each item is taught for what it can reach NOW (the server's target_kind, targets
  // and no_target): the rule, then who is in reach, or plainly why nobody is.
  activation(req) {
    const actives = (req.options || {}).actives || [];
    if (!actives.length) return;
    const key = "act-" + actives.map((a) => a.name + ":" + (a.no_target ? 0 : 1)).join("|");
    if (!this.once(key)) return;
    const me = this.me() || {};
    const RULE = {
      traveler_synchronic: "hits a traveller in your own century", traveler_same_era: "hits a traveller in your own era",
      century_same_era: "works on a century in your era", receptor_active: "fires an active relic in your receptor",
      market_revealed: "works on a card on the Merchant's shelf", recycled_card: "takes a recycled card",
      equipped_other: "takes a rival's equipped item", fishing_rod: "steals a shelf card that costs no more than its roll",
    };
    const lines = [], rings = [];
    actives.forEach((a) => {
      const nm = `<b>${cardName(a)}</b>`, rule = RULE[a.target_kind];
      const el = `#rucksack-zone .card.act-ready[data-name="${cssq(a.name)}"]`;
      if (a.no_target) {
        const why = a.target_kind === "traveler_synchronic" ? `No one is in ${R(me.century)} with you, so it has no target this Hour. Travel to a rival's century first.`
          : a.target_kind === "traveler_same_era" ? "No one is in your era, so it has no target this Hour. Travel closer to a rival first."
          : "There is nothing for it to work on this Hour.";
        lines.push(`Your ${nm} ${rule || "needs a target"}. ${why}`);
      } else if (a.targets && a.targets.length) {
        const where = a.target_kind === "traveler_synchronic" ? "your century" : "your era";
        lines.push(`${a.targets.join(" and ")} ${a.targets.length > 1 ? "are" : "is"} in ${where}: click ${nm}, then ${a.targets[0]}.`);
        rings.push(el);
      } else {
        lines.push(`Click ${nm} to use it now${rule ? `: it ${rule}` : ""}.`);
        rings.push(el);
      }
    });
    const none = !rings.length;
    this.guide(none ? "#mala-lock" : rings[0], `<b>Activation.</b> ${lines.join(" ")} ${none ? "Pass with the <b>lock</b> on your case." : "Or click the lock to pass."}`,
      { rings: none ? ["#mala-lock"] : rings.concat(["#mala-lock"]) });
  }

  /* ── scene waits ── */
  // Run fn once the camera faces `scene`; until then, say which key gets there.
  atScene(scene, fn, line) {
    const cam = this.game.camera;
    if (!cam || cam.scene === scene) { this._waitScene = null; fn(); return; }
    const key = { main: { market: "S", drawer: "D" }, market: { main: "W", drawer: "W" }, drawer: { main: "A", market: "A" } }[scene][cam.scene] || "S";
    const where = { main: "your desk", market: "the Merchant's wagon", drawer: "your records" }[scene];
    this.guide(null, line || `Press <kbd>${key}</kbd> to go back to ${where}.`, {});
    this.whenScene(scene, fn);
  }
  whenScene(scene, fn) { this._waitScene = { scene, fn }; this.watchScene(); }
  watchScene() {
    const w = this._waitScene;
    if (!w || !this.game || !this.game.camera) return;
    if (this.game.camera.scene === w.scene) {
      this._waitScene = null;
      setTimeout(() => { try { w.fn(); } catch (e) { console.error(e); } }, 650);   // let the pan land
    }
  }

  /* ── the end of the guided opening ── */
  async wrapUp() {
    if (this.done.has("win") || this._wrapping) return;
    this._beat = (this._beat || 0) + 1;
    try { await this._wrapUp(); } finally { this._beat--; this.persist(); }
  }
  async _wrapUp() {
    this._wrapping = true;
    this.markTrack("win");
    // Learn to Play ends: the roll comes off the chart, thirty centuries and Year Zero
    const cam0 = this.game.camera;
    if (cam0 && cam0.scene !== "main") { cam0._engage(); cam0.setScene("main"); await new Promise((r) => setTimeout(r, 900)); }
    this.unrollMap();
    try { window.__fx && window.__fx.chartReveal && window.__fx.chartReveal(); } catch (e) {}
    await new Promise((r) => setTimeout(r, 1100));
    await this.say("#timeline-rail", L.chartOpen, { ring: false });
    await this.say(null, L.ending, { sub: "At 0 energy you are terminated and come back at XXX. At 12 heat your motor explodes." });
    await this.say(".vital-chip.vc-cp", "<b>How to win:</b> the most contract points when time settles.",
      { sub: "+1 per relic returned, +1 per termination, +1 the first time you end an Hour on XX and on X, +1 for being alive at the end.", rings: [".vital-chip.vc-cp"] });
    await this.phasesRecap();
    await this.tabLesson();
    await this.say(null, L.gradEnd);
    this.learn("win");
    this.quiet = true;
    this.scripted = false;
    document.body.classList.remove("tut-story");
    try { window.__pdxMerchantReveal && window.__pdxMerchantReveal(null); } catch (e) {}
    this.blockPass = false;
    this.pointing = false;
    window.__helaMute = false;
    this.stage.trackOff();
    this._wrapping = false;
    const cam = this.game.camera;
    if (cam && cam.scene !== "main" && !(this.game.pendingReq && /market|deliver|reward|_target/.test(this.game.pendingReq.kind))) {
      cam._engage(); cam.setScene("main");
    }
    try { this.game.updateBeacon(); } catch (e) {}
  }

  // TAB, the last lesson, by doing: a tap opens her tips and his questions, a hold shows
  // what every module does, the Merchant's rules, the phases and her notes.
  async tabLesson() {
    const H = window.__pdxHelp;
    if (!H || !H.isOpen || !H.isHeld) return;
    const key = "#pdx-tabkey";
    const until = (fn, ms) => new Promise((resolve) => { const t0 = Date.now(); const iv = setInterval(() => { if (fn() || Date.now() - t0 > ms) { clearInterval(iv); resolve(fn()); } }, 120); });
    this.guide(key, "Tap <kbd>Tab</kbd>: my tips, and the answers to your questions.", { rings: [key] });
    if (await until(() => H.isOpen(), 40000)) {
      this.guide(null, "Tap <kbd>Tab</kbd> again to close it.", {});
      await until(() => !H.isOpen(), 40000);
    }
    this.guide(key, "Now hold <kbd>Tab</kbd>: my notes on everything in view. What your dice will do, the Hour, the Merchant, and my notes.", { rings: [key] });
    if (await until(() => H.isHeld(), 40000)) {
      this.guide(null, "Let go, and it all hides again.", {});
      await until(() => !H.isHeld(), 40000);
    }
    this.clear();
    await this.say(null, "From now on I speak only when you must act. Everything else waits under <kbd>Tab</kbd>.");
  }

  // his rivals at the table, and their files are his to arrange: a guided drag, then free
  async rivalsLesson() {
    const file = "#players-zone .pcard.cfolio";
    await this.say(file, L.rival, { rings: [file] });
    this.guide(file, L.files, { rings: [file] });
    const moved = await new Promise((resolve) => {
      const t0 = Date.now(); let held = false;
      const iv = setInterval(() => {
        const h = document.querySelector(".pcard.cfolio.dk-held");
        if (h) held = true;
        if ((held && !h) || Date.now() - t0 > 60000) { clearInterval(iv); resolve(held); }
      }, 150);
    });
    if (moved) await this.say(null, L.filesDone);
    this.clear();
  }

  /* ── THE FIRST HERALD, then HER MEMORY, used by doing (anchored to the memory's
     own classes, so the lesson follows its redesign) ── */
  async heraldBeat() {
    if (!this._heraldDue || this._heraldDone) return;
    this._heraldDue = false; this._heraldDone = true;
    this._beat = (this._beat || 0) + 1;
    try { await this._heraldBeat(); this._heraldTaught = true; } finally { this._beat--; this.persist(); }
  }
  async _heraldBeat() {
    await this.say(".he-window.he-news, .hb-newsread", L.herald, {});
    // read, then put away: the edition lies over her memory, which is shown next
    try { window.__heraldSkip && window.__heraldSkip(); } catch (e) {}
    await new Promise((r) => setTimeout(r, 600));
    await this.brainLesson();
  }
  async brainLesson() {
    const B = window.__helaBrain;
    const root = () => document.getElementById("hela-brain-full") || document.getElementById("hela-brain-dock");
    if (!B || !root()) return;
    // a part he can actually click: visible, and nothing (the cat, a paper) sitting on it
    const clickable = (n) => { const b = n.getBoundingClientRect(); const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return !!h && (h === n || n.contains(h) || h.closest("#tut-callout, .tut-ring, #tut-point, #cursor-plane") != null); };
    const q = (sel) => () => { const r = root(); if (!r) return null; const all = [...r.querySelectorAll(sel)].filter(visible);
      return all.filter(clickable).pop() || all.pop() || null; };
    const clickOn = (sel, ms = 60000) => new Promise((resolve) => {
      const h = (e) => { if (e.target.closest && e.target.closest(sel)) { done(); } };
      const done = () => { window.removeEventListener("click", h, true); clearTimeout(t); setTimeout(resolve, 500); };
      const t = setTimeout(done, ms);
      window.addEventListener("click", h, true);
    });
    const until = (fn, ms = 60000) => new Promise((resolve) => { const t0 = Date.now(); const iv = setInterval(() => { if (fn() || Date.now() - t0 > ms) { clearInterval(iv); resolve(); } }, 200); });
    const node = q(".hb-node");
    if (node()) {
      this.guide(node, "This is my memory: every mark is an Hour. Click one to open its page.", { rings: [node] });
      await until(() => B.isOpen && B.isOpen(), 30000);
    }
    // the newest Hour is open, so only the arrow back has anywhere to go
    const arrow = () => { const r = root(); if (!r) return null;
      const all = [...r.querySelectorAll(".hbp-arrow")].filter((n) => !n.disabled && visible(n));
      return all[0] || null; };
    if (B.isOpen && B.isOpen() && arrow()) {
      const r = root(), a = arrow();
      const h = parseInt(String(((r && r.querySelector(".hbp-head b")) || {}).textContent || "").replace(/\D+/g, ""), 10) || this.hour() || 1;
      const isBack = a === (r && r.querySelector(".hbp-head .hbp-arrow"));
      const back = Array.from({ length: Math.max(0, Math.min(4, h - 1)) }, (_, i) => h - 1 - i).join(", ");
      this.guide(arrow, isBack ? `Flip back through the Hours with this arrow${back ? `: Hour ${back}` : ""}.` : "Flip through the Hours with this arrow.", { rings: [arrow] });
      await clickOn(".hbp-arrow:not(:disabled)", 25000);
    }
    const clip = q(".hbp-clip");
    if (B.isOpen && B.isOpen() && clip()) {
      this.guide(clip, "The Herald's clipping: click it to read the edition.", { rings: [clip] });
      await clickOn(".hbp-clip", 25000);
    }
    if (B.isOpen && B.isOpen()) {
      this.guide(null, "Close it with <kbd>Esc</kbd>. <kbd>L</kbd> opens it again. It keeps everything.", {});
      await until(() => !(B.isOpen && B.isOpen()), 30000);
    }
    this.clear();
  }

  // THE HOUR, NAMED LAST: he has lived every phase several times by now, so the recap
  // names what he did in each, and the learning bar gives its place to the phase track.
  async phasesRecap() {
    if (!this.once("phases")) return;
    document.querySelectorAll("#vz-phases .vz-ph").forEach((n) => {
      if (/auction/i.test(n.textContent || "")) { n.style.display = "none"; const sp = n.nextElementSibling; if (sp && sp.classList.contains("vz-sep")) sp.style.display = "none"; }
    });
    this.stage.trackOff();
    document.body.classList.add("tut-phases");
    await new Promise((r) => setTimeout(r, 900));
    const chip = (label) => () => [...document.querySelectorAll("#vz-phases .vz-ph")]
      .find((n) => (n.textContent || "").trim().toLowerCase() === label && visible(n)) || null;
    const d = this._did || {}, h = (x) => (x != null ? ` in hour ${x}` : "");
    await this.say(chip("delivery"), `That moment you filed the relic in the drawer${h(d.delivery)}: that was DELIVERY. Every hour opens with it: whoever stands on a relic's own century hands it in.`, { rings: [chip("delivery")] });
    await this.say(chip("market"), `Standing in the wagon's year and buying the relic${h(d.market)}: the MARKET. It comes second, and when it ends, the wagon moves.`, { rings: [chip("market")] });
    await this.say(chip("generators"), "Every time you set your dice: the GENERATORS. Everyone places in secret, then the machines reveal and resolve, module 1 to 9.", { rings: [chip("generators")] });
    await this.say(chip("activation"), "Last, ACTIVATION: the items you carry that have a trigger fire here. That is the whole hour, in that order, every hour.", { rings: [chip("activation")] });
    this.learn("hour");
  }

  /* ── RECONNECT MID-LESSON ──
     The lesson's state, small and plain: what was taught, the one-time lines said,
     the machine's size, the map's roll, the scripted Hours, HELA's voice. Saved at
     every stable point (a decision on screen, a lesson learned, a beat finished),
     never in the middle of a beat, so a reload during one says it again. */
  snapshot() {
    const b = document.body.classList;
    return {
      done: [...this.done], said: [...this.said],
      scripted: !!this.scripted, quiet: !!this.quiet,
      stage: this.stageNo || 0, cut: this.cut, mapOpen: !!this._mapOpen,
      valveHour: this._valveHour || null, did: this._did || {}, rewardN: this.rewardN || 0,
      herald: !!this._heraldTaught, track: !!(this.stage && this.stage.track.classList.contains("gone")),
      phases: b.contains("tut-phases"), story: b.contains("tut-story"), mute: !!window.__helaMute,
    };
  }
  persist() {
    if (!this.conn || this._over || window.__pdxResumeBlocked) return;
    try {
      localStorage.setItem(LESSON_KEY, JSON.stringify({ v: LESSON_V, room: this.conn.code,
        hour: this.hour(), saved_at: Date.now(), snap: this.snapshot() }));
    } catch (e) { /* storage full or off: Reconnect then rebuilds the lesson from the table */ }
  }
  // the machine's size on the page, for a stage reached without its lines
  applyStage(n) {
    const b = document.body.classList;
    b.toggle("tut-2x2", n === 1 || n === 2);
    b.toggle("tut-show-paradox", n >= 2);
    b.toggle("tut-mod3", n >= 3);
    this.stageNo = n;
  }
  // the lesson as it stood (a snapshot), before the rebuilt table arrives; without one
  // (storage off), the table's own facts rebuild it at the first decision (reconcile)
  restore(snap) {
    this._resumed = true;
    this._snapped = !!(snap && typeof snap === "object");
    const s = this._snapped ? snap : {};
    const b = document.body.classList;
    (Array.isArray(s.done) ? s.done : []).forEach((k) => this.done.add(String(k)));
    (Array.isArray(s.said) ? s.said : []).forEach((k) => this.said.add(String(k)));
    this.said.add("intro");                        // he woke already: never the black again
    if (s.scripted === false) this.scripted = false;
    this.quiet = !!s.quiet;
    if (s.stage) this.applyStage(Math.max(1, Math.min(3, +s.stage || 1)));
    if (typeof s.cut === "number") this.cut = s.cut;
    this._valveHour = s.valveHour || null;
    this._did = s.did && typeof s.did === "object" ? s.did : {};
    this.rewardN = +s.rewardN || 0;
    this._heraldTaught = !!s.herald;
    this._heraldDone = !!s.herald;
    if (this.done.has("merchant")) {
      this._introMerchant = true;
      b.add("tut-merchant", "tut-map-grow");
      try { window.__pdxMerchantReveal && window.__pdxMerchantReveal(this.done.has("win") ? null : true); } catch (e) {}
    }
    if (s.mapOpen) this.unrollMap();
    if (s.phases) b.add("tut-phases");
    if (s.track) this.stage.trackOff();
    if (s.story === false) b.remove("tut-story");
    window.__helaMute = s.mute !== false;
    this.markTrack();
    this.trace("resumed " + (this._snapped ? "with the lesson" : "from the table"));
  }
  // facts of the table that make a lesson done, whatever the page saw before the reload
  reconcile() {
    const me = this.me(), v = this.game.view;
    if (!me || !v) return;
    this.hourNo = v.hour;
    const bought = (me.hand || []).length || (me.temporal_receptor || []).length;
    if (bought) {
      ["merchant", "shelf-offer", "market"].forEach((k) => this.done.add(k));
      this.said.add("shelf-gold");
      this._introMerchant = true;
      document.body.classList.add("tut-merchant", "tut-map-grow");
      try { window.__pdxMerchantReveal && window.__pdxMerchantReveal(this.done.has("win") ? null : true); } catch (e) {}
      if (this.cut > MERCHANT_ERA_LOW) this.cut = MERCHANT_ERA_LOW;
    }
    if ((me.temporal_receptor || []).length) {
      this.done.add("deliver");
      if (!this._heraldDone) this._heraldDue = true;   // the first Herald came with it
    }
    if ((me.overloaded_functions || []).length) this.done.add("overload");
    if (me.century !== 30) this.done.add("travel");        // he starts at XXX: he has moved
    this.markTrack();
  }
  // the first decision after a Reconnect: the lesson he was in the middle of, again
  async catchUp(req) {
    const h = (req.options || {}).tutorial || {};
    this.reconcile();
    if (!this._snapped && h.scripted === false) { this.finishQuietly(); return; }
    if (req.kind === "allocate" && h.lesson === "valve" && h.hour) this._valveHour = h.hour;
    const hour = this.hour();
    if (hour >= 2 && !this.done.has("merchant")) await this.merchantIntro();
    if (!this.done.has("win") && ((this._valveHour && hour > this._valveHour) || hour >= 12)) await this.wrapUp();
    this.persist();
  }
  // no lesson kept and the lessons are over: the quiet coach, with no words
  finishQuietly() {
    LESSONS.forEach(([k]) => this.done.add(k));
    this.quiet = true; this.scripted = false;
    document.body.classList.remove("tut-story");
    try { window.__pdxMerchantReveal && window.__pdxMerchantReveal(null); } catch (e) {}
    window.__helaMute = false;
    this.unrollMap();
    this.applyStage(3);
    this.stage.trackOff();
    this.markTrack();
    this.persist();
  }

  gameOver(p) {
    try { localStorage.removeItem(LESSON_KEY); } catch (e) {}   // the match is over: nothing to come back to
    this._over = true;
    this.quiet = false;
    this.scripted = false;
    this.blockPass = false;
    const won = p && p.winner === this.seat;
    setTimeout(() => this.toast(null, won ? "<b>You won.</b> Monarch of Time." : `<b>${(p && p.winner) || "Someone"} won this time.</b> You know the whole game now.`,
      { ms: 9000 }), 5200);
  }
}

// Anchors that must be looked up each time (the game re-renders them).
function phaseChip(label) {
  return () => [...document.querySelectorAll("#vz-phases .vz-ph")]
    .find((n) => (n.textContent || "").trim().toLowerCase() === label.toLowerCase() && visible(n)) || null;
}
function merchantOnMap() {
  const n = document.querySelector("#timeline-rail .cplot-sing .cc-hauler");
  if (n && visible(n)) return n;
  const v = window.__game && window.__game.view, T = window.__tut;
  return v && T && T.fog ? T.fog.starOf(v.merchant_century) : null;
}
// The Merchant's shelf: lines about it never sit on it.
const SHELF = ["#market-zone .market-row", "#market-zone .card"];
// The whole wrist machine: the callout never sits on it while dice are placed.
const MACHINE = ["#hull-console .matrix-wrap", "#dice-body .dice-pool", "#dice-body .dice-actions", "#dice-body .escape-slot", ".cx-preview"];
// What the traveller must be able to see: a line never sits on these if it can help it.
const KEY_AREAS = [
  "#hull-console .matrix-wrap", "#dice-body .dice-pool", "#dice-body .dice-actions", ".cx-preview",
  "#dice-body .escape-slot", "#vz-holo", "#players-zone .pcard", "#market-zone .market-row",
  "#market-sign", "#timeline-rail .cplot-sing .pc-star", "#timeline-rail .cplot .pc-world",
  "#timeline-rail .cplot-ori .pc-chart", "#rucksack-zone", "#drawer-zone .cab2-cell",
  ".ctd-doc", "#mano-help .mh-card",
];
function machineCell(r, c) { return `#machine-body .cell[data-r="${r}"][data-c="${c}"]`; }
function passSign() {
  return [...document.querySelectorAll("#market-zone .side-sign, .market-side-signs .side-sign")]
    .find((n) => /pass/i.test(n.textContent || "") && visible(n)) || null;
}
function cssq(s) { return String(s).replace(/["\\]/g, "\\$&"); }

/** The kept lesson of a saved Learn to Play match (room: the record's room code). */
export function readLesson(room) {
  try {
    const o = JSON.parse(localStorage.getItem(LESSON_KEY) || "null");
    if (!o || o.v !== LESSON_V || !o.snap || typeof o.snap !== "object") return null;
    return room && o.room !== room ? null : o;
  } catch (e) { return null; }
}
export function dropLesson() { try { localStorage.removeItem(LESSON_KEY); } catch (e) {} }

/** RECONNECT to Learn to Play: the rebuilt room ({ code, seat, room }) and the lesson
    kept for it (readLesson), or null: the coach rebuilds it from the table. */
export function resumeTutorial(entry, lesson) {
  const coach = new Coach();
  coach.start({ resume: entry, snap: lesson && lesson.snap }).catch((e) => {
    console.error("[tutorial] could not resume", e);
    document.body.classList.remove("tut");
  });
  return coach;
}

export function launchTutorial() {
  const coach = new Coach();
  coach.start().catch((e) => {
    console.error("[tutorial] could not start", e);
    const err = document.getElementById("landing-error");
    if (err) err.textContent = "Could not start the tutorial: " + (e.message || e);
    document.body.classList.remove("tut");
  });
  return coach;
}
