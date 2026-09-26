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

import { api, Connection } from "./net.js?202609261536";
import { Game } from "./game.js?202609261536";
import { icon } from "./icons.js?202609261536";
import { roman } from "./util.js?202609261536";
import { profile } from "./profile.js?202609261536";

const R = (v) => roman(v);
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

const cardName = (c) => (c && (c.display_name || c.name)) || "the card";

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
    c.innerHTML = `<div class="tc-arrow"></div>`
      + `<div class="tc-head"><span class="tc-sigil">${icon("hela")}</span><span class="tc-name">HELA</span></div>`
      + `<div class="tc-text"></div><div class="tc-sub"></div>`
      + `<div class="tc-foot"><button class="tc-next" type="button">Next <kbd>Enter</kbd></button></div>`;
    document.body.appendChild(c);
    this.callout = c;
    c.querySelector(".tc-next").addEventListener("click", (e) => { e.stopPropagation(); this._fireNext(); });
    this._key = (e) => {
      if (!this._next) return;
      if (e.key === "Enter" || e.key === " ") {
        const t = e.target || {};
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "")) return;
        e.preventDefault(); e.stopPropagation(); this._fireNext();
      }
    };
    window.addEventListener("keydown", this._key, true);

    const tr = document.createElement("div");
    tr.id = "tut-track";
    tr.innerHTML = `<span class="tt-title">LEARN TO PLAY</span>`
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
    c.querySelector(".tc-text").innerHTML = text;
    const sub = c.querySelector(".tc-sub");
    sub.innerHTML = opts.sub || "";
    sub.style.display = opts.sub ? "" : "none";
    c.classList.toggle("tone-warn", opts.tone === "warn");
    c.classList.remove("nudge");
    this.anchor = at || null;
    this.place = opts.place || "auto";
    this.avoid = opts.avoid || [];
    this.setRings(opts.rings || (at && opts.ring !== false ? [at] : []));
    c.classList.add("on");
    this.pointing = !opts.next && !opts.ms && (opts.rings || (at && opts.ring !== false ? [at] : [])).length > 0;
    this.layout(true);
    if (this._toastT) { clearTimeout(this._toastT); this._toastT = null; }
    if (opts.next) {
      c.classList.add("has-next");
      return new Promise((resolve) => { this._next = resolve; });
    }
    c.classList.remove("has-next");
    this._next = null;
    if (opts.ms) this._toastT = setTimeout(() => this.hide(), opts.ms);
    return Promise.resolve();
  }
  hide() {
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
    if (!force && !this.callout.classList.contains("on") && !this.rings.length) return;
    // rings
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
    // the pointer sits over the first ring (under it when there is no room above)
    const first = this.pointing && this.rings.length ? this.resolve(this.rings[0]) : null;
    const fr = first && first.getBoundingClientRect();
    if (fr && fr.width && onScreen(fr)) {
      const up = fr.top < 70;
      this.point.classList.add("on");
      this.point.classList.toggle("up", up);
      this.point.style.left = Math.round(fr.left + fr.width / 2 - 13) + "px";
      this.point.style.top = Math.round(up ? fr.bottom + 8 : fr.top - 44) + "px";
    } else this.point.classList.remove("on");
    // callout
    const c = this.callout;
    if (!c.classList.contains("on")) return;
    const cw = c.offsetWidth || 360, ch = c.offsetHeight || 110;
    const W = innerWidth, H = innerHeight, M = 14;
    const el = this.resolve(this.anchor);
    const r = el && el.getBoundingClientRect();
    let x, y, side = "none";
    if (r && r.width && onScreen(r)) {
      // Try the four sides and keep the one that covers the least of what the
      // player has to see or click: the ringed controls and the avoid list.
      const avoid = [];
      this.rings.forEach((a) => { const n = this.resolve(a); const q = n && n.getBoundingClientRect(); if (q && q.width) avoid.push(q); });
      (this.avoid || []).forEach((a) => { const n = this.resolve(a); const q = n && n.getBoundingClientRect(); if (q && q.width) avoid.push(q); });
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const cand = {
        above: [cx - cw / 2, r.top - ch - 18, "below"], below: [cx - cw / 2, r.bottom + 18, "above"],
        right: [r.right + 18, cy - ch / 2, "left"], left: [r.left - cw - 18, cy - ch / 2, "right"],
      };
      const order = this.place && this.place !== "auto"
        ? [this.place, ...["above", "right", "below", "left"].filter((k) => k !== this.place)]
        : ["above", "right", "below", "left"];
      let best = null;
      order.forEach((k, i) => {
        let [px, py] = cand[k];
        px = Math.max(M, Math.min(W - cw - M, px));
        py = Math.max(M + 40, Math.min(H - ch - M, py));
        let cover = 0;
        avoid.forEach((q) => {
          const ox = Math.max(0, Math.min(px + cw, q.right) - Math.max(px, q.left));
          const oy = Math.max(0, Math.min(py + ch, q.bottom) - Math.max(py, q.top));
          cover += ox * oy;
        });
        // the target itself must never be covered; order breaks ties
        const score = cover + i * 40;
        if (!best || score < best.score) best = { k, px, py, score };
      });
      x = best.px; y = best.py; side = cand[best.k][2];
      const a = c.querySelector(".tc-arrow");
      if (side === "below" || side === "above") {
        a.style.left = Math.max(18, Math.min(cw - 18, cx - x)) + "px"; a.style.top = "";
      } else {
        a.style.top = Math.max(16, Math.min(ch - 16, cy - y)) + "px"; a.style.left = "";
      }
    } else {
      x = W / 2 - cw / 2; y = H * 0.36 - ch / 2;
    }
    c.dataset.side = side;
    c.style.left = Math.round(x) + "px";
    c.style.top = Math.round(y) + "px";
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
  learn(k) { if (!this.done.has(k)) { this.done.add(k); this.trace("learned " + k); } this.markTrack(); }
  markTrack(current) {
    if (!this.stage) return;
    const cur = current || (LESSONS.find(([k]) => !this.done.has(k)) || [""])[0];
    this.stage.mark(this.done, cur);
  }
  once(k) { if (this.said.has(k)) return false; this.said.add(k); return true; }

  // A line the player must acknowledge. The game's event queue waits behind it.
  async say(at, text, opts = {}) {
    this.trace("say " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    await this.stage.show(at, text, { ...opts, next: true });
    this.stage.hide();
  }
  // A standing instruction: it stays until the player acts or another line replaces it.
  guide(at, text, opts = {}) {
    this.trace("guide " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    return this.stage.show(at, text, opts);
  }
  toast(at, text, opts = {}) {
    this.trace("toast " + text.replace(/<[^>]+>/g, "").slice(0, 60));
    return this.stage.show(at, text, { ms: 6500, ...opts });
  }
  clear() { this.stage.hide(); }

  /* ───────────── boot: a real room, the real game ───────────── */
  async start() {
    const inp = document.getElementById("inp-name");
    const prof = (() => { try { return profile.get(); } catch (e) { return {}; } })();
    let name = ((inp && inp.value) || prof.name || "Traveller").trim().slice(0, 24) || "Traveller";
    if (/^(varr|oda)$/i.test(name)) name = "Traveller";
    const r = await api.createRoom(name, 3, "tutorial", prof.colour != null ? prof.colour : null);
    const seat = r.seat;
    const conn = new Connection(r.code, seat);
    const game = new Game(conn, seat);
    this.conn = conn; this.game = game; this.seat = seat;
    window.__game = game;
    window.__tut = this;
    try { game.learnSeatColours(r.room); } catch (e) {}
    game.setSpeed("fast");
    window.__helaMute = true;               // her ambient remarks wait; the lessons speak
    document.body.classList.add("tut");
    this.stage = new Stage(this);
    this.fog = new MapFog();
    this.markTrack("hour");
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
      const out = await play(msg);
      try { await this.after(msg); } catch (e) { console.error("[tutorial] after", e); }
      return out;
    };
    // Decisions: guidance is laid over the control the game has just drawn.
    const decide = g.onDecision.bind(g);
    g.onDecision = (req) => {
      const out = decide(req);
      try { this.onDecision(req); } catch (e) { console.error("[tutorial] decision", e); }
      return out;
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
      const ok = canPlace(r, c, v, drag);
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
  }

  /* ───────────── events ───────────── */
  async before(msg) {
    const k = msg.kind, p = msg.payload || {};
    if (k === "hour_started") {
      this.hourNo = p.hour;
      if (p.hour === 1 && this.once("intro")) {
        await this.say(null, "I am HELA. I will teach you one Hour at a time: I point, you click.",
          { sub: "Every Hour has four phases, always in the same order." });
      }
      if (this.scripted && p.hour >= 7 && !this.done.has("win")) await this.wrapUp();
    }
    if (k === "phase_started" || k === "phase_skipped") {
      if (this.hourNo === 1 && p.phase === "delivery" && this.once("ph-delivery")) {
        await this.say(phaseChip("Delivery"),
          "<b>1. Delivery.</b> Hand in an item when you stand on the century printed on it.",
          { sub: "You carry nothing yet, so this phase passes." });
      }
      if (this.hourNo === 1 && p.phase === "market" && this.once("ph-market")) {
        await this.say(merchantOnMap,
          "<b>2. Market.</b> You can buy from the Merchant only when you stand on his century.",
          { sub: `He is at ${R(this.game.view.merchant_century)}, the wagon on the map. You are at XXX.` });
      }
      if (this.hourNo === 1 && p.phase === "main" && this.once("ph-main")) {
        this.markTrack("machine");
      }
      if (this.hourNo === 1 && p.phase === "activation" && this.once("ph-activation")) {
        await this.say(phaseChip("Activation"),
          "<b>4. Activation.</b> Use the powers of the items you carry.",
          { sub: "You carry none yet. That was one full Hour." });
        this.learn("hour");
      }
    }
    if (k === "game_over") this.gameOver(p);
  }

  async after(msg) {
    const k = msg.kind, p = msg.payload || {};
    const self = this.seat;
    if (k === "merchant_moved" && this.hourNo === 1 && this.once("merchant-moved")) {
      await this.say(merchantOnMap,
        `He moves after every Market phase, toward the richest traveller he is not with.`,
        { sub: `Now he is at ${R(p.to)}. Make gold and he comes your way.` });
    }
    if (k === "allocations_revealed" && this.once("reveal")) {
      this.toast(null, "Everyone's dice are revealed at once, then the modules resolve from 1 to 9.", { ms: 4200 });
    }
    if (k === "overloaded" && p.seat === self && this.once("overloaded")) {
      this.learn("overload");
      await this.say(machineCell(p.function, 0),
        `<b>${FN[p.function] || "That function"} overloaded.</b> It stays shut for the whole next Hour.`);
    }
    if (k === "paradox_resolved") {
      if (p.target === self && this.once("hit")) {
        await this.say(".vital-ekg",
          `<b>Paradox.</b> ${p.causer} hit you for ${p.damage} energy from another century.`,
          { sub: "Paradox 1 hits travellers ahead of you, 2 your own century, 3 those behind you." });
      } else if (p.causer === self && this.once("hit-out")) {
        this.learn("paradox");
        await this.say(`#players-zone .pcard`,
          `<b>Your paradox hit ${p.target} for ${p.damage} energy.</b> Paradox 1 strikes everyone ahead of you.`);
      }
    }
    if (k === "traveled" && p.seat === self) await this.checkPeriod(p.to);
    if (k === "respawned" && p.seat === self) await this.checkPeriod(p.century);
    if (k === "exploded" && p.seat === self && this.once("exploded")) {
      await this.say("#mano-boomg", "<b>Your motor exploded</b> at 12 heat: you lost 2 energy and sit out the rest of this Hour.");
    }
    if (k === "terminated") {
      if (p.seat === self && this.once("dead")) {
        await this.say(".vital-ekg", "<b>You were terminated</b> at 0 energy. Next Hour you return at XXX with 12 energy plus your items' recycle value.",
          { sub: "You keep your gold and heat. Whoever did it scores a point and becomes Wanted." });
      } else if (p.by === self && this.once("killer")) {
        await this.say("#players-zone .pcard", `<b>You terminated ${p.seat}.</b> +1 contract point, and you are now Wanted: a 4 gold bounty on you.`,
          { sub: "Pay 4 gold with Declare at a Market to clear it." });
      }
    }
    if (k === "milestone" && p.seat === self && this.once("milestone-" + p.century)) {
      this.toast(".vital-chip.vc-cp", `<b>+1 point:</b> the first time you end an Hour on ${R(p.century)}.`);
    }
    if (k === "delivered" && p.seat === self && this.once("delivered")) {
      this.learn("deliver");
      await this.say(".vital-chip.vc-cp",
        "<b>Delivered: +1 contract point.</b> Points decide the winner, and every point also earns you a contract.");
    }
    if (k === "reward_resolved" && p.seat === self) {
      const txt = (REWARD_TEXT[p.category] || [])[(p.roll || 1) - 1];
      const followed = this.explained && this.explained === this.lastReward;
      this.explained = null;
      if (!followed && this.once("reward-" + this.hour() + "-" + p.category)) {
        this.learn("contract");
        await this.say(null, `<b>${p.category}, rolled ${R(p.roll || 1)}:</b> ${txt || "done"}.`,
          { sub: p.category === "Time" ? "Tickets wait in your case: drag one onto the machine's slot when you want it." : "" });
      }
      if (this.scripted && this.done.has("deliver")) await this.wrapUp();
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
          "<b>Ascension, centuries XI to XIX.</b> The Secret Market waits at XI.",
          { sub: "It opens once someone ends an Hour there." });
      } else {
        await this.say(() => this.fog.starOf(6),
          "<b>Origins, centuries I to X.</b> Down here every century into the past costs 2 energy.",
          { sub: "Year Zero, past century I, ends the game." });
      }
    }
  }

  /* ───────────── decisions ───────────── */
  onDecision(req) {
    const k = req.kind, o = req.options || {}, hint = o.tutorial || null;
    this.req = req;
    this.pointing = false;
    this.trace("decision " + k);
    if (k === "allocate") return this.allocate(req, hint);
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
      return this.atScene("main", () => this.guide(mine, "<b>Move the Merchant:</b> click any lit century to send him there.",
        { sub: "Bring him to you to shop, or away from a rival." }));
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
      : "<b>Destroy a card:</b> click the one you want gone.";
    const sub = mode === "steal" && inMarket ? "Taking from the Merchant makes you Wanted." : "";
    const picker = "#active-prompt .card.is-actionable";
    const inPlace = `#market-zone .card${cls}, #players-zone .card${cls}`;
    setTimeout(() => {
      if (!this.req || this.req !== req) return;
      if (document.querySelector(picker)) {
        this.guide(picker, line, { sub, rings: [picker] });
      } else if (inMarket) {
        this.atScene("market", () => this.guide(inPlace, line, { sub, rings: [inPlace] }),
          "Press <kbd>W</kbd> to face the Merchant's shelf.");
      } else this.guide(inPlace, line, { sub, rings: [inPlace] });
    }, 500);
  }

  onRespond(req, data) {
    if (!req) return;
    this.trace("answered " + req.kind);
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
    if (hint && hint.matrix && this.scripted) {
      this.plan = { matrix: hint.matrix, valve: hint.escape_valve || 0, lesson: hint.lesson };
      this.pointing = true;
      this.atScene("main", () => this.stepGuide());
      return;
    }
    this.plan = null;
    if (this.once("free-alloc")) {
      this.toast("#machine-body .matrix-wrap", "Your dice are yours now. Place all four, then Confirm.",
        { sub: "Press <kbd>T</kbd> for the machine reference at any time.", ms: 7000 });
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
        if (s.c === 0 && first) sub = "Energy is your life. Click a die, then a module, or drag it.";
        if (s.c === 1 && first) sub = "A function holds one value only, so both dice here are the same.";
        if (s.c === 1 && !first) sub = "Gold buys the Merchant's cards.";
      } else if (s.r === 1) {
        text = [`Drag a ${R(v)} onto <b>Paradox 1</b>: everyone ahead of you loses ${v} energy.`,
          `Drag a ${R(v)} onto <b>Paradox 2</b>: everyone in your own century loses ${v}.`,
          `Drag a ${R(v)} onto <b>Paradox 3</b>: everyone behind you loses ${v}.`][s.c];
        if (s.c === 0) sub = "Ahead means a higher century. Your paradox never hurts you.";
        this.markTrack("paradox");
      } else {
        text = [`Drag a ${R(v)} onto <b>Travel 1</b>: +${v} heat.`,
          `Drag a ${R(v)} onto <b>Travel 2</b>: move up to ${v} ${v === 1 ? "century" : "centuries"}.`,
          `Drag a ${R(v)} onto <b>Travel 3</b>: move up to ${v * 2} more.`][s.c];
        if (s.c === 0) sub = first ? "Modules fill left to right: Travel must heat before it moves." : "12 heat makes your motor explode.";
        if (s.c === 1 && first) sub = "All four dice must be placed before you can confirm.";
        if (s.c === 2) { sub = "Three dice in one function overload it: more power now, but it shuts next Hour."; this.markTrack("overload"); }
        if (s.c === 1 && !first && P[2][2]) sub = "";
      }
      if (lesson === "travel" && s.r === 2 && s.c === 0 && this.plan.goal != null) {
        sub = `This Hour's dice are for the trip to ${R(this.plan.goal)}.` + (sub ? " " + sub : "");
      }
      void fn; void n;
      this.guide(cell, text, { sub, rings: [cell, die(v)], avoid: MACHINE });
      return;
    }
    if (s.kind === "valve") {
      const sealed = (this.game.alloc && [...this.game.alloc.unavailable]) || [];
      const what = sealed.length ? FN[sealed[0]] : "A function";
      this.guide("#dice-body .escape-drop",
        `${what} is shut this Hour, so this ${R(s.v)} fits nowhere. Drop it in the <b>escape valve</b>.`,
        { sub: `A die in the valve while a function is shut costs its value in energy (${s.v}).`,
          rings: ["#dice-body .escape-drop", die(s.v)], avoid: MACHINE });
      return;
    }
    this.guide("#confirm-alloc", "All four dice placed. Click <b>Confirm</b>.",
      { sub: first ? "Everyone chose in secret. Now the machines resolve." : "", avoid: MACHINE });
  }

  /* ── Travel ── */
  travel(req, hint) {
    this.markTrack("travel");
    const o = req.options || {};
    const from = o.century, max = o.max || 0;
    const goal = hint && hint.goal != null ? hint.goal : null;
    if (!this.scripted || goal == null) {
      if (this.once("free-travel")) {
        this.toast(ANY_CMD, `Click a lit century to travel up to ${max}, or HOLD to stay.`,
          { sub: "Into the past costs energy; into the future is free." });
      }
      return;
    }
    const dir = goal > from ? 1 : -1;
    const dist = Math.min(max, Math.abs(goal - from));
    const land = from + dir * dist;
    const toMerchant = !(this.me() && (this.me().hand || []).length);
    const why = land === goal
      ? (toMerchant ? "to reach the Merchant" : "to reach the century where your card is delivered")
      : (toMerchant ? "toward the Merchant" : `toward ${R(goal)}, where your card is delivered`);
    let sub = "";
    if (this.once("travel-cost")) sub = "Going into the past costs 1 energy per century. Going into the future is free.";
    else if (dir > 0 && this.once("travel-free")) sub = "Forward in time is free.";
    this.pointing = true;
    this.atScene("main", () => this.travelGuide(from, dist, land, why, sub));
    this.learn("travel");
  }
  travelGuide(from, dist, land, why, sub) {
    if (!this.req || this.req.kind !== "travel") return;
    if (dist === 0) {
      this.guide(ANY_ANCHOR, `You are where you need to be. Click <b>HOLD</b> to stay.`, { sub });
    } else {
      this.guide(() => this.fog.starOf(land), `Click <b>${R(land)}</b> to move ${dist} ${dist === 1 ? "century" : "centuries"} ${why}.`,
        { sub, place: "auto" });
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
        this.guide(passSign, "<b>His shelf refilled:</b> the Merchant always shows four cards.",
          { sub: "Buy again, or click <b>Pass</b> to leave the Market.", avoid: SHELF });
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
      this.guide(sel, `Buy <b>${cardName(card)}</b>: drag it into your case, or click it.`,
        { sub: `${card.gold_cost} gold. Deliver it at ${R(card.delivery_century)} for 1 contract point.`, avoid: SHELF });
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
          this.guide(open, "Click the glowing drawer to open it.", { sub: `It holds your records for ${R(o.century)}.` });
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
          { sub: "Delivered items stay in your records until the end.", rings: [cardSel, "#drawer-zone .drw-folder.here"] });
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
        this.guide("#drawer-zone .ct-paper.ct-choose", "Pick one. <b>Chaos</b> hurts rivals, <b>Time</b> gives extra turns, <b>Resource</b> pays you.",
          { sub: "A die then decides which of its three results you get. Not the same kind twice in a row.",
            rings: ["#drawer-zone .ct-paper.ct-choose"] });
        setTimeout(step, 400);
      };
      step();
    };
    this.atScene("drawer", inDrawer, "Your point earned a contract. Press <kbd>A</kbd> to open your records.");
  }

  /* ── Activation ── */
  activation(req) {
    if (!this.once("act")) return;
    const names = ((req.options || {}).actives || []).map(cardName).join(", ");
    this.guide("#rucksack-zone .card.act-ready", `<b>Activation.</b> Click ${names || "your item"} to use it now, or click the lock to pass.`,
      { rings: ["#rucksack-zone .card.act-ready", "#mala-lock"] });
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
    this._wrapping = true;
    this.markTrack("win");
    await this.say(".vital-chip.vc-cp", "<b>How to win:</b> have the most contract points when the game ends.",
      { sub: "+1 per delivery, +1 per termination, +1 the first time you end an Hour on XX and on X, +1 for being alive at the end." });
    await this.say(null, "<b>The game ends</b> when someone reaches Year Zero, delivers in all three periods, is the last never terminated, or the Merchant runs out of cards.",
      { sub: "At 0 energy you are terminated and come back at XXX. At 12 heat your motor explodes." });
    await this.say(null, "That is everything. <b>The match is yours now</b>: play it to the end.",
      { sub: "Press <kbd>T</kbd> for the machine reference. The map keeps opening as you travel." });
    this.learn("win");
    this.scripted = false;
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

  gameOver(p) {
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
const MACHINE = ["#machine-zone", "#dice-zone", "#hull-console"];
function machineCell(r, c) { return `#machine-body .cell[data-r="${r}"][data-c="${c}"]`; }
function passSign() {
  return [...document.querySelectorAll("#market-zone .side-sign, .market-side-signs .side-sign")]
    .find((n) => /pass/i.test(n.textContent || "") && visible(n)) || null;
}
function cssq(s) { return String(s).replace(/["\\]/g, "\\$&"); }

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
