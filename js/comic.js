/* =========================================================================
   comic.js, THE COMIC LAYER: narration captions, impact moments, "your move"
   -------------------------------------------------------------------------
   Three comic traditions mixed on purpose (the game is a paradox):
     Franco-Belgian clear line : CAPTION boxes that narrate plainly what just
                                 happened and whose move it is.
     American Silver Age       : ONOMATOPOEIA (BOOM!, KRAK!) on a halftone
                                 starburst with an ink outline and a hard shadow.
     Arcane / anime ink        : SPEED LINES and a brief IMPACT FRAME on the
                                 biggest beats.
   Rules this file keeps:
     - Nothing blocks input (pointer-events: none everywhere) and nothing jumps:
       the two caption slots sit at FIXED positions and swap their text in place.
     - Nothing runs while idle: no loops, no intervals. Every effect is a few
       small DOM nodes animated with transform/opacity (WAAPI), removed when it
       ends (plus a safety timer), so the DOM never grows with the match.
     - Graphics presets: Low keeps only the lettering and the captions (no
       halftone, speed lines or impact frame); Medium drops the impact frame.
     - Presentation speed (Slow/Normal/Fast) scales every duration.
     - Player names and card names are server-sent text: they only ever enter
       the DOM through textContent.
   game.js calls three hooks: onEvent (every played event), onDecision (a
   decision for me), onRespond (I answered). Everything else lives here.
   ========================================================================= */
import { roman } from "./util.js?202609261550";

const MAX_HITS = 3;
const MIN_HOLD = 1100;
const NOTES_KEY = "pdx-cx-notes";                   // ms a HELA line stays readable before the next replaces it
const STRIP_MAX = 24, STRIP_SHOW = 12;   // the story kept, the panels shown               // concurrent impact bursts, oldest dropped first
const SPEED = { slow: 1.5, normal: 1, fast: 0.6 };

// what each of my decisions asks, in plain words (the caption names the decision)
const MOVE = {
  allocate: ["Place your dice on the machine", "then Confirm", "Enter"],
  market: ["The Merchant is open", "buy, renew or pass", "P = pass"],
  deliver: ["Deliver a relic", "carry it to its century's drawer", ""],
  reward_category: ["Claim your reward", "pick one contract", ""],
  activation: ["Fire an item", "or pass", "P = pass"],
  travel: ["Plot your voyage", "click a port on the chart", ""],
  merchant_century: ["Send the Merchant", "click a century on the chart", ""],
  target: ["Choose a target", "", ""],
  destroy_target: ["Choose a card to destroy", "", ""],
  steal_target: ["Choose a card to steal", "", ""],
  matrix_buff: ["Choose a module to buff", "", ""],
  recycle: ["Recycle for energy", "or skip", ""],
  capacity: ["No room in the pack", "keep or recycle", ""],
  secret_deal: ["A secret deal", "take it or pass", "P = pass"],
};

// what each phase means, one line (the chapter caption at a phase start)
const PHASE = {
  leilao: ["AUCTION", "Bid for the lots on the floor."],
  delivery: ["DELIVERY", "Relics go home to their centuries."],
  market: ["MARKET", "Travelers at the Merchant's port may trade."],
  main: ["GENERATORS", "Everyone places dice in secret."],
  activation: ["ACTIVATION", "Items may fire, once each."],
};

// the energy cost of sailing back (engine resolve.py travel cost): 1 per century
// above X, 2 per century below it; the future is free. Cards that change it are not counted.
function travelCost(from, to) {
  if (to >= from) return 0;
  const normal = Math.max(0, Math.min(from, 30) - Math.max(to, 10));
  const over = Math.max(0, Math.min(from, 10) - to);
  return normal + 2 * over;
}

class Comic {
  constructor() {
    this.game = null;
    this.root = null;
    this.slots = {};
    this.hits = [];
    this.frameEl = null;
    this.stripEl = null;
    this.prevEl = null;
    this.ghostEl = null;
    this.gridEl = null;
    this.story = [];
    this._t = {};
  }

  init(game) {
    this.game = game;
    if (this.root || typeof document === "undefined") return;
    const r = document.createElement("div");
    r.id = "cx-root";
    r.setAttribute("aria-live", "polite");
    // narrator boxes (square, no tail): the chapter, my move, and the fallback for
    // HELA's lines when her eye is not on screen. Her own voice is the eye's balloon.
    for (const k of ["chapter", "turn", "event", "note"]) {
      const s = document.createElement("div");
      s.className = "cx-cap cx-slot-" + k;
      s.setAttribute("aria-hidden", "true");
      r.appendChild(s);
      this.slots[k] = s;
    }
    document.body.appendChild(r);
    this.root = r;
    document.body.classList.add("cx-on");
    try { window.__comic = this; } catch (e) {}   // for the tutorial and for testing
    window.addEventListener("keydown", (e) => this._key(e));
    // Settings: HELA's footnotes can be switched off (the choice stays on this machine)
    const chk = document.getElementById("chk-cx-notes");
    if (chk) {
      chk.checked = this._notesOn();
      chk.addEventListener("change", () => { try { localStorage.setItem(NOTES_KEY, chk.checked ? "on" : "off"); } catch (e) {} if (!chk.checked) this.hide("note"); });
    }
    document.addEventListener("contextmenu", (e) => this._quickPlace(e));
  }

  /* ---- environment ---- */
  _gfx() {
    const b = document.body.classList;
    return b.contains("gfx-low") ? "low" : b.contains("gfx-medium") ? "medium" : "high";
  }
  _reduced() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  _k() { return SPEED[(this.game && this.game.speed) || "normal"] || 1; }
  _hidden() { return typeof document !== "undefined" && document.hidden; }
  _me() { return this.game && this.game.seat; }
  _col(name) { try { return this.game.colorOf(name); } catch (e) { return "#c9a45c"; } }
  _card(n) { try { return this.game.nameEn(n); } catch (e) { return n; } }

  /* ---- CAPTIONS -------------------------------------------------------------
     parts: strings, or { name } (a seat, drawn as a chip in its colour), or
     { b: text } (bold), or { key: text } (a keycap). opts: { tag, tone, ms }.
     A slot swaps its content in place; it never moves and never stacks. */
  caption(slot, parts, opts = {}, remembered) {
    const s = this.slots[slot];
    if (!s) return;
    if (slot === "event" && !remembered) this._remember(parts, opts.tone);   // the strip keeps it even unseen
    if (this._hidden()) return;
    clearTimeout(this._t[slot]); clearTimeout(this._t[slot + "x"]);
    const fill = () => {
      s.textContent = "";
      s.className = "cx-cap cx-slot-" + slot + (opts.tone ? " cx-" + opts.tone : "") + (opts.big ? " cx-big" : "");
      if (opts.tag) {
        const t = document.createElement("span");
        t.className = "cx-tag"; t.textContent = opts.tag;
        s.appendChild(t);
      }
      const body = document.createElement("span");
      body.className = "cx-txt";
      this._parts(body, parts);
      s.appendChild(body);
      s.classList.add("on");
    };
    // swap: a quick fade of the old text, then the new one (no motion in space)
    if (s.classList.contains("on")) {
      s.classList.remove("on");
      this._t[slot + "x"] = setTimeout(fill, 120);
    } else fill();
    const ms = (opts.ms || 3200) * this._k() + 120;
    if (!opts.sticky) this._t[slot] = setTimeout(() => this.hide(slot), ms);
  }
  // the last STRIP_MAX narrated events, plain data (never DOM), for the strip
  _remember(parts, tone) {
    const hour = this.game && this.game.view ? this.game.view.hour : 0;
    this.story.push({ hour, tone: tone || "", parts: parts.filter((p) => p != null && p !== "") });
    if (this.story.length > STRIP_MAX) this.story.splice(0, this.story.length - STRIP_MAX);
    if (this.stripEl) this._fillStrip();
  }

  /* ---- THE STRIP (L): the story so far as comic panels, newest first. Built when
     opened, removed when closed, so it costs nothing while it is shut. ---- */
  toggleStrip(force) {
    const on = typeof force === "boolean" ? force : !this.stripEl;
    if (!on) { if (this.stripEl) { this.stripEl.remove(); this.stripEl = null; } return; }
    if (this.stripEl) return;
    const w = document.createElement("div");
    w.className = "cx-strip";
    w.addEventListener("click", () => this.toggleStrip(false));
    document.body.appendChild(w);
    this.stripEl = w;
    this._fillStrip();
  }
  _fillStrip() {
    const w = this.stripEl; if (!w) return;
    w.textContent = "";
    const head = document.createElement("div");
    head.className = "cx-strip-head";
    head.textContent = "THE STORY SO FAR  \u00b7  L or Esc to close";
    w.appendChild(head);
    const grid = document.createElement("div");
    grid.className = "cx-strip-grid";
    const items = this.story.slice(-STRIP_SHOW).reverse();
    if (!items.length) {
      const e = document.createElement("div"); e.className = "cx-panel"; e.textContent = "Nothing has happened yet.";
      grid.appendChild(e);
    }
    for (const it of items) {
      const pnl = document.createElement("div");
      pnl.className = "cx-panel" + (it.tone ? " cx-" + it.tone : "");
      const tag = document.createElement("span"); tag.className = "cx-tag"; tag.textContent = "HOUR " + it.hour;
      const txt = document.createElement("span"); txt.className = "cx-txt";
      this._parts(txt, it.parts);
      pnl.appendChild(tag); pnl.appendChild(txt);
      grid.appendChild(pnl);
    }
    w.appendChild(grid);
  }
  _parts(body, parts) {
    for (const p of parts) {
      if (p == null || p === "") continue;
      if (typeof p === "string") { body.appendChild(document.createTextNode(p)); continue; }
      if (p.sig != null) {   // a footnote's signature
        const g = document.createElement("span"); g.className = "cx-sig"; g.textContent = String(p.sig);
        body.appendChild(g); continue;
      }
      const e = document.createElement(p.name != null ? "span" : p.key != null ? "kbd" : "b");
      if (p.name != null) {
        e.className = "cx-name";
        e.textContent = p.name === this._me() ? "You" : String(p.name);
        e.style.setProperty("--seat", this._col(p.name));
      } else e.textContent = String(p.key != null ? p.key : p.b);
      body.appendChild(e);
    }
  }

  /* ---- HELA SPEAKS FROM HER EYE ------------------------------------------------
     Every narrated event is HER line: a balloon in her colour, her eye as the speaker
     mark, its tail on the eye (cabin.js .he-chip, placed on the side away from the
     cursor). One line at a time: a new line replaces the old one in place, but each
     line is readable for at least MIN_HOLD first; lines that arrive sooner collapse
     into the newest. opts.at: a rect or point she flies to and speaks from. */
  say(parts, opts = {}) {
    this._remember(parts, opts.tone);
    if (this._hidden()) return;
    const E = window.__helaEye;
    if (!E || !E.live || !E.live() || window.__helaMute) return this.caption("event", parts, opts, true);
    const k = this._k();
    const line = { parts, opts, ms: Math.round((opts.ms || 3000) * k) };
    const wait = (this._sayAt || 0) + MIN_HOLD * k - performance.now();
    clearTimeout(this._sayT);
    if (wait > 0 && !(this.game && this.game._skip)) {
      this._sayNext = line;
      this._sayT = setTimeout(() => { const l = this._sayNext; this._sayNext = null; if (l) this._speak(l); }, wait);
      return;
    }
    this._sayNext = null;
    this._speak(line);
  }
  _speak(line) {
    const E = window.__helaEye; if (!E) return;
    this._sayAt = performance.now();
    const n = document.createElement("span");
    n.className = "cx-say" + (line.opts.tone ? " cx-" + line.opts.tone : "");
    this._parts(n, line.parts);
    E.say(n, { jump: true, ms: line.ms, minMs: 900 });
    this._goTo(line.opts.at, line.ms);
  }
  // she crosses to what she talks about, but never while a decision of mine is open
  // (HELA's guide owns her then) and never while skipping
  _goTo(at, ms) {
    const E = window.__helaEye, g = this.game;
    if (!at || !E || !E.setPost || this._reduced() || (g && (g.pendingReq || g._skip))) return;
    const b = document.body.classList;
    if (b.contains("hg-hunt") || b.contains("hg-bless") || document.querySelector("#hela-eye .he-dchip.on")) return;
    // stand just above the thing; no room above (near the top edge, where the helmet
    // readouts live) and she stands beside it instead, level with its middle
    let x = at.width != null ? at.left + at.width / 2 : at.x;
    let y = (at.width != null ? at.top : at.y) - 40;
    let side = "";   // beside the thing, her balloon opens AWAY from it
    if (y < 110) {
      if (at.width != null) {
        y = at.top + at.height / 2;
        if (at.left > 440) { x = at.left - 34; side = "l"; } else { x = at.right + 34; side = "r"; }
      } else y = at.y + 60;
    }
    if (!(x >= 0 && y > -200)) return;
    E.setPost(x, y, { glide: true, side });
    this._posted = true;
    clearTimeout(this._postT);
    this._postT = setTimeout(() => {
      if (this._posted && !(this.game && this.game.pendingReq) && !document.querySelector("#hela-eye .he-dchip.on")) E.clearPost();
      this._posted = false;
    }, ms + 300);
  }
  _at(seat) { return this._seatRect(seat); }
  // the chart skin on show: the sea (.cplot), the stars (.cplot-sing) or the origins
  // (.cplot-ori). The others stay laid out but invisible, so ask the live one only.
  _chart() {
    const rail = document.getElementById("timeline-rail"); if (!rail) return null;
    const sk = rail.classList.contains("skin-sing") ? ["cplot-sing", "cc-hit"]
      : rail.classList.contains("skin-ori") ? ["cplot-ori", "cm-hit"] : ["cplot", "sea-isle"];
    const host = rail.querySelector(":scope > ." + sk[0]);
    return host ? { host, mark: sk[1] } : null;
  }
  _islandAt(c) {
    const ch = this._chart(); if (!ch) return null;
    const el = ch.host.querySelector(`.${ch.mark}[data-c="${c}"]`);
    const r = el ? el.getBoundingClientRect() : null;
    return r && r.width > 2 ? this._onScreenRect(r) : null;
  }
  _cardAt(name) {
    try { const r = this.game.marketCardRect(name); return r ? this._onScreenRect(r) : null; } catch (e) { return null; }
  }

  hide(slot) {
    const s = this.slots[slot];
    clearTimeout(this._t[slot]); clearTimeout(this._t[slot + "x"]);
    if (s) s.classList.remove("on");
  }

  /* ---- IMPACT MOMENTS ---------------------------------------------------------
     kind picks the lettering and colour; at: a DOMRect or {x, y}; big adds the
     speed lines and (High only) the impact frame. */
  impact(kind, at, opts = {}) {
    if (this._hidden() || !this.root || (this.game && this.game._skip)) return;
    const K = {
      paradox: { word: "ZZAP!", c: "#b98cff", ink: "#1a0f2e" },
      boom: { word: "BOOM!", c: "#ff7a2a", ink: "#2a0d02" },
      terminated: { word: "KRAK!", c: "#ff4a36", ink: "#260604" },
      deliver: { word: "KA-CHUNK!", c: "#f7c65a", ink: "#2a1a02" },
      wanted: { word: "WANTED!", c: "#ff8a2a", ink: "#2a1002" },
      steal: { word: "SWIPE!", c: "#ff5a44", ink: "#2a0804" },
      contract: { word: "KA-CHING!", c: "#f7c65a", ink: "#2a1a02" },
      yearzero: { word: "YEAR ZERO!", c: "#fff1c2", ink: "#1a1204" },
    }[kind] || { word: "POW!", c: "#fff1c2", ink: "#15100a" };
    const gfx = this._gfx(), reduced = this._reduced(), k = this._k();
    let x = innerWidth / 2, y = innerHeight * 0.42;
    if (at && at.width != null) { x = at.left + at.width / 2; y = at.top + at.height / 2; }
    else if (at && at.x != null) { x = at.x; y = at.y; }
    x = Math.max(120, Math.min(innerWidth - 120, x));
    y = Math.max(90, Math.min(innerHeight - 90, y));
    const big = !!opts.big;
    const h = document.createElement("div");
    h.className = "cx-hit" + (big ? " cx-hit-big" : "") + " cx-g-" + gfx;
    h.style.left = x + "px"; h.style.top = y + "px";
    h.style.setProperty("--cx-c", K.c); h.style.setProperty("--cx-ink", K.ink);
    const lines = (!reduced && gfx !== "low" && big) ? document.createElement("i") : null;
    if (lines) { lines.className = "cx-lines"; h.appendChild(lines); }
    const burst = document.createElement("i"); burst.className = "cx-burst"; h.appendChild(burst);
    const word = document.createElement("b"); word.className = "cx-word";
    word.textContent = opts.word || K.word; h.appendChild(word);
    if (opts.sub) {
      const sub = document.createElement("span"); sub.className = "cx-sub";
      sub.textContent = opts.sub; h.appendChild(sub);
    }
    this.root.appendChild(h);
    this.hits.push(h);
    while (this.hits.length > MAX_HITS) { const o = this.hits.shift(); o.remove(); }
    const dur = Math.round((big ? 1250 : 950) * k);
    const done = () => { h.remove(); const i = this.hits.indexOf(h); if (i >= 0) this.hits.splice(i, 1); };
    const rot = (Math.random() * 10 - 5).toFixed(1);
    if (reduced) {
      h.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }],
        { duration: dur, easing: "linear" });
    } else {
      word.animate([
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(2.1)`, opacity: 0 },
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(.92)`, opacity: 1, offset: 0.14 },
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.24 },
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1.04)`, opacity: 1, offset: 0.78 },
        { transform: `translate(-50%,-56%) rotate(${rot}deg) scale(1.08)`, opacity: 0 },
      ], { duration: dur, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" });
      burst.animate([
        { transform: "translate(-50%,-50%) scale(.2) rotate(0deg)", opacity: 0.95 },
        { transform: "translate(-50%,-50%) scale(1.06) rotate(8deg)", opacity: 1, offset: 0.18 },
        { transform: "translate(-50%,-50%) scale(1) rotate(10deg)", opacity: 1, offset: 0.7 },
        { transform: "translate(-50%,-50%) scale(1.12) rotate(12deg)", opacity: 0 },
      ], { duration: dur, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" });
      if (lines) lines.animate([
        { transform: "translate(-50%,-50%) scale(.7)", opacity: 0 },
        { transform: "translate(-50%,-50%) scale(1)", opacity: 0.9, offset: 0.12 },
        { transform: "translate(-50%,-50%) scale(1.35)", opacity: 0 },
      ], { duration: Math.round(dur * 0.7), easing: "cubic-bezier(.1,.7,.3,1)", fill: "both" });
      if (big && gfx === "high") this._frame(x, y, K.ink);
    }
    setTimeout(done, dur + 80);
  }

  // THE IMPACT FRAME: two or three frames of ink-and-light around the hit, the anime
  // cut. One full-screen node, reused, painted only while it flashes.
  _frame(x, y, ink) {
    if (!this.frameEl) {
      const f = document.createElement("div");
      f.className = "cx-frame";
      this.root.appendChild(f);
      this.frameEl = f;
    }
    const f = this.frameEl;
    f.style.setProperty("--fx", x + "px"); f.style.setProperty("--fy", y + "px");
    f.style.setProperty("--cx-ink", ink);
    f.classList.add("on");
    const a = f.animate([{ opacity: 0 }, { opacity: 0.72, offset: 0.2 }, { opacity: 0.5, offset: 0.55 }, { opacity: 0 }],
      { duration: 190, easing: "linear" });
    a.onfinish = a.oncancel = () => f.classList.remove("on");
  }

  /* ---- MEANWHILE...: the simultaneous reveal as a comic grid ---------------------
     One small panel per traveler, in their colour, their revealed machine drawn as
     a 3x3 of dice (public the moment the allocations are revealed). It plays beside
     the deal on the table, then leaves; F kills it. */
  revealGrid(allocs) {
    this._killGrid();
    const g = this.game;
    const seats = Object.keys(allocs || {});
    if (!seats.length || !this.root || this._hidden() || (g && g._skip)) return;
    const order = (g && g.priority && g.priority.length ? g.priority.filter((n) => seats.includes(n)) : []);
    seats.forEach((n) => { if (!order.includes(n)) order.push(n); });
    const w = document.createElement("div");
    w.className = "cx-grid cx-g-" + this._gfx();
    const tag = document.createElement("div");
    tag.className = "cx-grid-tag";
    tag.textContent = "MEANWHILE, EVERY MACHINE AT ONCE...";
    w.appendChild(tag);
    const row = document.createElement("div");
    row.className = "cx-grid-row";
    const ROWS = ["cx-r", "cx-p", "cx-t"];
    order.slice(0, 6).forEach((seat, i) => {
      const a = allocs[seat] || {}, m = a.matrix || [];
      const pnl = document.createElement("div");
      pnl.className = "cx-gp";
      pnl.style.setProperty("--seat", this._col(seat));
      pnl.style.setProperty("--i", i);
      const nm = document.createElement("span");
      nm.className = "cx-name";
      nm.textContent = seat === this._me() ? "You" : String(seat);
      nm.style.setProperty("--seat", this._col(seat));
      pnl.appendChild(nm);
      const mx = document.createElement("div");
      mx.className = "cx-gm";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const v = (m[r] && m[r][c]) || 0;
        const cell = document.createElement("i");
        cell.className = ROWS[r] + (v ? " on" : "");
        if (v) cell.textContent = roman(v);
        mx.appendChild(cell);
      }
      pnl.appendChild(mx);
      if (a.escape_valve) {
        const vt = document.createElement("span");
        vt.className = "cx-gv"; vt.textContent = "VENT " + roman(a.escape_valve);
        pnl.appendChild(vt);
      }
      row.appendChild(pnl);
    });
    w.appendChild(row);
    this.root.appendChild(w);
    this.gridEl = w;
    const sp = (g && g.speed) || "normal";
    const dur = sp === "fast" ? 1300 : Math.max(1900, order.length * 560) * (sp === "slow" ? 1.6 : 1);
    this._gridT = setTimeout(() => {
      if (this.gridEl !== w) return;
      w.classList.add("out");
      this._gridT = setTimeout(() => this._killGrid(), 260);
    }, dur);
  }
  _killGrid() {
    clearTimeout(this._gridT);
    if (this.gridEl) { this.gridEl.remove(); this.gridEl = null; }
  }

  /* ---- EMANATA: the little marks comics draw around a head, from public state only.
       !    Wanted            sweat drops   energy at or below 6 (critical)
       stars  the Hour a motor exploded     zzz   terminated, awaiting respawn
     Drawn on the rivals' case files and on my own lifethread. Static marks; only a
     mark that has just appeared pops once. Called after every players render. ---- */
  emanata(view) {
    if (!view || !view.travelers || !this.root) return;
    const me = this._me(), prev = this._em || {}, next = {};
    const GLYPH = { bang: "!", sweat: "", dizzy: "\u2605 \u2726 \u2605", zzz: "z z Z" };
    for (const t of view.travelers) {
      const st = t.statuses || [], set = [];
      if (st.includes("awaiting_respawn")) set.push("zzz");
      else {
        if (t.is_wanted || st.includes("wanted")) set.push("bang");
        if ((t.energy || 0) <= 6) set.push("sweat");
        if (st.includes("exploded")) set.push("dizzy");
      }
      next[t.name] = set;
      let host;
      if (t.name === me) {
        const holo = document.getElementById("vz-holo");
        if (!holo) continue;
        host = holo.querySelector(":scope > .cx-em");
        if (!host) { host = document.createElement("span"); holo.appendChild(host); }
        host.className = "cx-em cx-em-me";
        host.textContent = "";
      } else {
        const card = document.querySelector(`.pcard[data-seat="${CSS.escape(String(t.name))}"]`);
        if (!card) continue;
        host = card.querySelector(":scope > .cx-em");
        if (!host) { host = document.createElement("span"); host.className = "cx-em"; card.appendChild(host); }
        host.textContent = "";
      }
      const had = new Set(prev[t.name] || []);
      for (const k of set) {
        const e = document.createElement("i");
        e.className = "cx-e-" + k + (had.has(k) ? "" : " cx-new");
        e.textContent = GLYPH[k];
        host.appendChild(e);
      }
    }
    this._em = next;
  }

  /* ---- EDITOR'S NOTES: a comic footnote, "*" and signed HELA, that teaches one rule
     at the moment it matters. Each note at most once per match, never two within
     20s, and they can be switched off in Settings. ---- */
  _notesOn() { try { return localStorage.getItem(NOTES_KEY) !== "off"; } catch (e) { return true; } }
  note(key, text) {
    if (!this._notesOn() || this._hidden() || (this.game && this.game._skip)) return;
    this._noted = this._noted || new Set();
    if (this._noted.has(key)) return;
    const now = performance.now();
    if (now - (this._noteAt || -1e9) < 20000) return;
    this._noted.add(key); this._noteAt = now;
    this.caption("note", ["*" + text + "  ", { sig: "HELA" }], { ms: 7000 });
  }
  _notesFor(kind, p) {
    const me = this._me();
    if (kind === "phase_started" && p.phase === "market")
      this.note("merchant", "The Merchant sails toward the richest traveler it is not already beside.");
    else if (kind === "traveled" && p.to < p.from)
      this.note("past", "Sailing to the past costs 1 energy per century, 2 per century below X. The future is free.");
    else if (kind === "paradox_resolved" && (p.hits || []).length)
      this.note("paradox", "A paradox never hurts its maker. Future hits everyone ahead of you, Present everyone beside you, Past everyone behind.");
    else if (kind === "wanted")
      this.note("wanted", "A Wanted traveler carries a 4 gold bounty. Paying 4 gold at a Market (Declare) clears it.");
    else if (kind === "overloaded" && p.seat === me)
      this.note("overload", "Three dice in one function overload it: that function is shut for the next Hour.");
    else if (kind === "card_bought" && p.seat === me && !p.stolen)
      this.note("deliver", "Deliver a card while you stand on its own century, in the Delivery phase, for a contract point.");
    else if (kind === "heated" && p.seat === me && (p.booms || 0) >= 9)
      this.note("heat", "At 12 heat the motor explodes: -2 energy and no actions for the rest of that Hour.");
    else if (kind === "respawned" && p.seat === me)
      this.note("immune", "Back in the Timeless centuries (XXIV to XXX) you cannot lose energy until you first reach XXIII.");
  }

  /* ---- CONSEQUENCE PREVIEW: while I place dice, what the machine WILL do, from
     public positions only: who my paradox dice hit and for how much, how far the
     travel dice reach and what sailing all the way back costs (a ghost of my piece
     on the chart), the heat after module 7, and a warning when the plan leaves me
     at critical energy. Rebuilt only when a die moves. Cards that bend these
     numbers are not counted, so the box says "about" nothing it cannot know. ---- */
  preview() {
    const g = this.game;
    if (!this.root || !g || !g.alloc || g.awaitingReveal || !g.view) return this.clearPreview();
    const me = g._self(); if (!me) return this.clearPreview();
    const m = g.alloc.matrix, rows = [];
    const others = (g.view.travelers || []).filter((t) => t.name !== me.name && !(t.statuses || []).includes("awaiting_respawn"));
    const PX = [["FUTURE", (t) => t.century > me.century], ["PRESENT", (t) => t.century === me.century], ["PAST", (t) => t.century < me.century]];
    for (let c = 0; c < 3; c++) {
      const v = m[1][c]; if (!v) continue;
      const hit = others.filter(PX[c][1]);
      const parts = [{ b: "PARADOX " + PX[c][0] + ": " }];
      if (!hit.length) parts.push("no one in reach");
      else { hit.forEach((t, i) => parts.push(i ? ", " : "", { name: t.name })); parts.push(` lose ${v}`); }
      rows.push({ parts });
    }
    const gain = (m[0][0] || 0) + (m[0][2] || 0);
    if (gain) rows.push({ parts: [{ b: "RECHARGE: " }, `+${gain} energy`] });
    const heat = m[2][0] || 0, dist = (m[2][1] || 0) + 2 * (m[2][2] || 0);
    let after = (me.energy || 0) + gain, exploded = false, back = null;
    if (heat) {
      const nb = (me.booms || 0) + heat;
      exploded = nb >= 12;
      rows.push({ tone: exploded ? "danger" : "", parts: [{ b: "HEAT: " }, exploded ? `${nb}/12, the motor EXPLODES: -2 energy, no travel this Hour` : `${nb}/12`] });
      if (exploded) after -= 2;
    }
    if (dist && !exploded) {
      back = Math.max(0, me.century - dist);
      const cost = travelCost(me.century, back);
      rows.push({ parts: [{ b: "TRAVEL: " }, `up to ${dist} centuries. Back to ${back === 0 ? "YEAR ZERO" : roman(back)} costs ${cost} energy; forward is free.`] });
      after -= cost;
    }
    if (dist || heat || gain) {
      if (after <= 0) rows.push({ tone: "danger", parts: [{ b: "! " }, "The full trip back costs more energy than you have: you would stop short."] });
      else if (after <= 6) rows.push({ tone: "danger", parts: [{ b: "! " }, `This plan can leave you at ${after} energy: critical.`] });
    }
    if (!rows.length) return this.clearPreview();
    let box = this.prevEl;
    if (!box) {
      box = document.createElement("div");
      box.className = "cx-preview";
      this.root.appendChild(box);
      this.prevEl = box;
    }
    box.textContent = "";
    const head = document.createElement("span"); head.className = "cx-tag"; head.textContent = "IF YOU CONFIRM";
    box.appendChild(head);
    for (const r of rows) {
      const line = document.createElement("div");
      line.className = "cx-pl" + (r.tone ? " cx-" + r.tone : "");
      this._parts(line, r.parts);
      box.appendChild(line);
    }
    // it sits just above the machine's screen, where the eyes already are
    const mw = this._onScreen(document.querySelector("#hull-console .matrix-wrap") || document.getElementById("machine-zone"));
    if (mw) { box.style.left = Math.max(8, mw.left) + "px"; box.style.top = ""; box.style.bottom = (innerHeight - mw.top + 14) + "px"; }
    this._ghost(back, me);
    if (m.some((r) => r.every((v) => v))) this.note("overload", "Three dice in one function overload it: that function is shut for the next Hour.");
  }
  _ghost(back, me) {
    const r = back != null && back !== me.century ? this._islandAt(back) : null;
    if (!r) { if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; } return; }
    let gh = this.ghostEl;
    if (!gh) { gh = document.createElement("div"); gh.className = "cx-ghost"; this.ghostEl = gh; }
    if (!this._pinToChart(gh, r)) { gh.remove(); this.ghostEl = null; return; }
    gh.style.setProperty("--seat", this._col(me.name));
    gh.textContent = "-" + travelCost(me.century, back);
  }
  // a mark ON the chart rides the chart when the camera pans: it lives inside the
  // chart's own box (#timeline-rail), placed in the chart's unscaled coordinates
  _pinToChart(node, r) {
    const rail = document.getElementById("timeline-rail");
    if (!rail || !r) return false;
    // the chart that is showing (sea, stars or origins); the rail hides anything else
    const ch = this._chart(), host = ch && ch.host;
    if (!host) return false;
    if (node.parentNode !== host) host.appendChild(node);
    const op = node.offsetParent || host;
    const orr = op.getBoundingClientRect(), k = op.offsetWidth ? orr.width / op.offsetWidth : 1;
    if (!(k > 0)) return false;
    node.style.left = ((r.left + r.width / 2 - orr.left) / k) + "px";
    node.style.top = ((r.top + r.height / 2 - orr.top) / k) + "px";
    return true;
  }
  clearPreview() {
    if (this.prevEl) { this.prevEl.remove(); this.prevEl = null; }
    if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; }
  }

  /* ---- THE MERCHANT'S NEXT MOVE (§17.7 to §17.12): who he chases and how far he
     can sail, from public gold and positions, shown as the Market opens. ---- */
  merchantPlan() {
    const v = this.game && this.game.view; if (!v || v.merchant_century == null) return null;
    const at = v.merchant_century;
    const act = (v.travelers || []).filter((t) => !(t.statuses || []).includes("awaiting_respawn"));
    const away = act.filter((t) => t.century !== at);
    let target, who = null;
    if (away.length) {
      who = away.slice().sort((a, b) => (b.gold - a.gold) || (b.century - a.century) || (b.energy - a.energy))[0];
      target = who.century;
    } else target = at !== 11 ? 11 : 30;
    const n = v.merchant_movement_dice || 1, dir = target > at ? 1 : -1;
    const clamp = (c) => Math.max(1, Math.min(30, c));
    const lo = clamp(at + dir * Math.min(n, Math.abs(target - at))), hi = clamp(at + dir * Math.min(3 * n, Math.abs(target - at)));
    return { at, target, who, n, lo, hi };
  }
  _merchantPreview() {
    const pl = this.merchantPlan(); if (!pl || pl.target === pl.at) return;
    const range = pl.lo === pl.hi ? roman(pl.lo) : roman(pl.lo) + " to " + roman(pl.hi);
    this.say(pl.who
      ? ["Right now the Merchant chases ", { name: pl.who.name }, ` (${pl.who.gold} gold): after the Market he sails ${pl.n}d3 toward ${roman(pl.target)}, landing ${range}.`]
      : [`With everyone beside him, the Merchant heads for ${roman(pl.target)}: he will land ${range}.`],
      { ms: 4200, at: this._islandAt(pl.at) });
    // the landing range, marked on the chart for a moment
    const marks = [];
    for (let c = Math.min(pl.lo, pl.hi); c <= Math.max(pl.lo, pl.hi); c++) {
      const r = this._islandAt(c); if (!r) continue;
      const mk = document.createElement("i");
      mk.className = "cx-mmark";
      if (this._pinToChart(mk, r)) marks.push(mk);
    }
    if (marks.length) setTimeout(() => marks.forEach((x) => x.remove()), Math.round(4200 * this._k()));
  }

  /* ---- NEXT HOUR: one cliffhanger line as the Hour closes ---- */
  _cliffhanger() {
    const g = this.game, v = g && g.view; if (!v || !v.travelers) return;
    const act = v.travelers.filter((t) => !(t.statuses || []).includes("awaiting_respawn"));
    const me = this._me();
    let parts = null;
    const near = act.slice().sort((a, b) => a.century - b.century)[0];
    const crit = act.filter((t) => (t.energy || 0) <= 6).sort((a, b) => a.energy - b.energy)[0];
    const pl = this.merchantPlan();
    if (near && near.century <= 9)
      parts = [{ name: near.name }, near.name === me ? " stand" : " stands", ` ${near.century} ${near.century === 1 ? "century" : "centuries"} from Year Zero.`];
    else if (crit)
      parts = [{ name: crit.name }, crit.name === me ? " are" : " is", ` down to ${crit.energy} energy.`];
    else if (pl && pl.who)
      parts = ["The Merchant has his eye on ", { name: pl.who.name }, "."];
    if (!parts) return;
    this.caption("chapter", parts, { tag: "NEXT HOUR", ms: 2800 });
  }

  /* ---- RIVAL VOICES: a bot now and then says one short line in its own colour, at
     a few moments only, never more than once every three Hours each, and never
     about anything it could not know. ---- */
  rivalSay(seat, key) {
    const g = this.game;
    if (!g || !g._bots || !g._bots.has(seat) || seat === this._me() || this._hidden() || g._skip) return;
    const hour = (g.view && g.view.hour) || 0;
    this._rivalAt = this._rivalAt || {};
    if (this._rivalAt[seat] != null && hour - this._rivalAt[seat] < 3) return;
    const LINES = {
      stole_you: ["Finders keepers.", "You were not using it.", "Mine now."],
      terminated_you: ["Nothing personal.", "See you at XXX.", "The sea was hungry."],
      terminated: ["I will be back.", "Not like this...", "Tell the Bureau I tried."],
      year_zero: ["Year Zero. Done.", "History ends with me."],
    }[key];
    if (!LINES) return;
    const r = this._seatRect(seat); if (!r) return;
    this._rivalAt[seat] = hour;
    const b = document.createElement("div");
    b.className = "cx-rival";
    b.style.setProperty("--seat", this._col(seat));
    b.textContent = LINES[(Math.random() * LINES.length) | 0];
    // it speaks from the right edge of its own case file, clear of HELA (who stands left)
    const x = r.width != null ? r.right : r.x, y = r.width != null ? r.top + 22 : r.y;
    b.style.left = Math.min(innerWidth - 240, x + 12) + "px"; b.style.top = y + "px";
    this.root.appendChild(b);
    setTimeout(() => b.remove(), Math.round(2600 * this._k()));
  }

  /* ---- anchors: where a seat is on screen right now (null if off screen) ---- */
  _seatRect(seat) {
    let el = null;
    if (seat === this._me()) {
      // mine lands just ABOVE the lifethread, so the number it hits stays readable
      const r = this._onScreen(document.getElementById("vz-holo") || document.getElementById("machine-zone"));
      return r ? { x: r.left + r.width / 2, y: r.top - 70 } : null;
    }
    el = document.querySelector(`.pcard[data-seat="${CSS.escape(String(seat))}"] .badge`)
      || document.querySelector(`.pcard[data-seat="${CSS.escape(String(seat))}"]`);
    return this._onScreen(el);
  }
  _onScreen(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    return r;
  }

  /* ---- HOOKS -------------------------------------------------------------------- */
  // Events are narrated on the next frame, all of that frame's events together: the
  // anchors (case files, chart marks) are measured once, after the game has drawn,
  // instead of forcing a layout in the middle of each event.
  onEvent(kind, p) {
    if (!p || !this.root) return;
    (this._evq = this._evq || []).push([kind, p]);
    if (this._evq.length > 40) this._evq.splice(0, this._evq.length - 40);
    if (this._evRaf) return;
    this._evRaf = requestAnimationFrame(() => {
      this._evRaf = 0;
      const q = this._evq.splice(0);
      for (const [k, pl] of q) { try { this._onEvent(k, pl); } catch (e) {} }
    });
  }
  _onEvent(kind, p) {
    const N = (s) => ({ name: s });
    const me = this._me();
    // verbs agree with "You" when the subject is me: v(p.seat, "delivers", "deliver")
    const v = (seat, third, second) => (seat === me ? second : third);
    try { this._notesFor(kind, p); } catch (e) {}
    if (kind === "phase_started" && p.phase === "market" && !p.solo) setTimeout(() => this._merchantPreview(), Math.round(1400 * this._k()));
    // the Hour's last phase is Activation: once its chapter has been read, the cliffhanger
    if (p.phase === "activation" && (kind === "phase_skipped" || (kind === "phase_started" && !p.solo))) {
      clearTimeout(this._cliffT);
      this._cliffT = setTimeout(() => this._cliffhanger(), kind === "phase_skipped" ? 300 : Math.round(2700 * this._k()));
    }
    if (kind === "terminated") { if (p.by && p.seat === me) this.rivalSay(p.by, "terminated_you"); else this.rivalSay(p.seat, "terminated"); }
    if (kind === "card_stolen" && p.from === me) this.rivalSay(p.seat, "stole_you");
    if (kind === "card_destroyed" && p.owner === me && p.by) this.rivalSay(p.by, "stole_you");
    if (kind === "traveled" && p.to === 0) this.rivalSay(p.seat, "year_zero");
    switch (kind) {
      case "phase_started": {
        if (p.invalid_allocation) return;
        const ph = PHASE[p.phase]; if (!ph) return;
        const hour = this.game && this.game.view ? this.game.view.hour : "";
        this.caption("chapter", [{ b: ph[0] + (p.solo ? " (SOLO)" : "") }, "  " + ph[1]],
          { tag: "HOUR " + hour, ms: p.solo ? 1800 : 2600 });
        return;
      }
      case "allocations_revealed":
        this.revealGrid(p.allocations || {});
        return;
      case "paradox_resolved": {
        const hits = (p.hits || []).filter((h) => h.damage);
        if (!hits.length) return;
        const parts = [{ b: "PARADOX! " }];
        hits.forEach((h, i) => { parts.push(i ? ", " : "", N(h.seat)); });
        const d = hits[0].damage, same = hits.every((h) => h.damage === d);
        parts.push(hits.length === 1 && hits[0].seat !== me ? (same ? ` loses ${d} energy.` : " loses energy.") : (same ? ` lose ${d} energy.` : " lose energy."));
        const rival = hits.find((h) => h.seat !== me) || hits[0];
        this.say(parts, { tone: "danger", ms: 3400, at: this._at(rival.seat) });
        hits.slice(0, 3).forEach((h, i) => {
          const r = this._seatRect(h.seat);
          if (r || h.seat === me) setTimeout(() => this.impact("paradox", r, { big: h.seat === me, sub: `-${h.damage}` }), i * 260);
        });
        return;
      }
      case "exploded":
        this.say(p.seat === me ? [{ b: "BOOM! " }, "Your motor hit 12 heat: -2 energy, and you sit out the rest of this Hour."]
          : [{ b: "BOOM! " }, N(p.seat), "'s motor hit 12 heat: -2 energy, out for the rest of this Hour."],
          { tone: "danger", ms: 3400, at: this._at(p.seat) });
        this.impact("boom", this._seatRect(p.seat), { big: true });
        return;
      case "terminated":
        this.say([N(p.seat), v(p.seat, " is", " are") + " TERMINATED", p.by ? " by " : "", p.by ? N(p.by) : "", v(p.seat, ". Their gear is recycled; they restart at XXX.", ". Your gear is recycled; you restart at XXX.")],
          { tone: "danger", ms: 3800, at: this._at(p.seat) });
        this.impact("terminated", this._seatRect(p.seat), { big: p.seat === me || !!this._seatRect(p.seat), sub: "TERMINATED" });
        return;
      case "respawned":
        return this.say([N(p.seat), v(p.seat, " returns", " return") + ` at XXX with ${p.energy} energy.`], { ms: 2800, at: this._at(p.seat) });
      case "delivered": {
        const r = this._islandAt(p.century);
        this.say([N(p.seat), v(p.seat, " delivers ", " deliver "), { b: this._card(p.card) }, ` to century ${roman(p.century)}.`],
          { tone: "good", ms: 3400, at: r || this._at(p.seat) });
        setTimeout(() => this.impact("deliver", r || this._seatRect(p.seat), { big: p.seat === me }), Math.round(700 * this._k()));
        return;
      }
      case "traveled": {
        const up = p.to < p.from;
        if (p.to === 0) this.impact("yearzero", null, { big: true, sub: "THE MATCH ENDS" });
        return this.say([N(p.seat), v(p.seat, " sails", " sail") + ` ${roman(p.from)} → ${roman(p.to)}`, up ? " (toward Year Zero)." : "."],
          { ms: 2400, at: this._islandAt(p.to) });
      }
      case "merchant_moved":
        return this.say(["The Merchant makes port at ", { b: roman(p.to) }, p.teleport ? " (a temporal leap)." : "."], { ms: 2600, at: this._islandAt(p.to) });
      case "card_bought":
        if (p.stolen) {
          const r = this._seatRect(p.seat);
          if (r) this.impact("steal", r, {});
          this.say([N(p.seat), v(p.seat, " STEALS ", " STEAL "), { b: this._card(p.card) }, v(p.seat, " from the Merchant, and is now Wanted.", " from the Merchant, and are now Wanted.")],
            { tone: "danger", ms: 3400, at: this._cardAt(p.card) || r });
        } else {
          this.say([N(p.seat), v(p.seat, " buys ", " buy "), { b: this._card(p.card) }, p.cost ? ` for ${p.cost} gold.` : "."],
            { ms: 2600, at: this._cardAt(p.card) || this._at(p.seat) });
        }
        return;
      case "card_renewed":
        return this.say([N(p.seat), v(p.seat, " renews", " renew") + " the Merchant's stock."], { ms: 2200 });
      case "declared":
        return this.say([N(p.seat), v(p.seat, " declares their goods.", " declare your goods.") + " Wanted is cleared."], { ms: 2600, at: this._at(p.seat) });
      case "wanted": {
        const r = this._seatRect(p.seat);
        if (r) this.impact("wanted", r, { sub: "BOUNTY 4 GOLD" });
        return this.say([N(p.seat), v(p.seat, " is WANTED. 4 gold to whoever terminates them.", " are WANTED. 4 gold to whoever terminates you.")], { tone: "danger", ms: 3600, at: r });
      }
      case "milestone":
        return this.say([N(p.seat), v(p.seat, " reaches", " reach") + ` century ${roman(p.century)}: a milestone, +1 contract point.`], { tone: "good", ms: 3000, at: this._islandAt(p.century) });
      case "reward_resolved": {
        const r = this._seatRect(p.seat);
        if (r) this.impact("contract", r, { big: p.seat === me });
        return this.say([N(p.seat), v(p.seat, " signs", " sign") + ` a ${p.category} contract.`], { tone: "good", ms: 2600, at: r });
      }
      case "activated":
        return this.say([N(p.seat), v(p.seat, " activates ", " activate "), { b: this._card(p.card) }, "."], { ms: 2400, at: this._at(p.seat) });
      case "recycled":
        return this.say([N(p.seat), v(p.seat, " recycles ", " recycle "), { b: this._card(p.card) }, p.energy ? ` for +${p.energy} energy.` : "."], { ms: 2400, at: this._at(p.seat) });
      case "card_destroyed":
        if (!p.zone) return;
        return this.say([{ b: this._card(p.card) }, " is destroyed."], { tone: "danger", ms: 2600, at: p.owner ? this._at(p.owner) : this._cardAt(p.card) });
      case "card_stolen":
        return this.say([N(p.seat), v(p.seat, " snatches ", " snatch "), { b: this._card(p.card) }, p.from ? " from " : "", p.from ? N(p.from) : "", "."], { tone: "danger", ms: 2800, at: this._at(p.seat) });
      case "secret_market_opened":
        return this.say(["The Secret Market opens at century XI."], { tone: "good", ms: 3000, at: this._islandAt(11) });
      case "briefcase_acquired":
        return this.say([N(p.seat), v(p.seat, " gains", " gain") + " a Temporal Briefcase: +1 slot."], { ms: 2600, at: this._at(p.seat) });
      case "game_over":
        this.hide("turn");
        return this.caption("chapter", [N(p.winner), v(p.winner, " wins", " win") + " the match."], { tone: "good", sticky: true });
      default: return;
    }
  }
  _onScreenRect(r) {
    if (!r || r.width < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    return r;
  }

  // a decision for ME: name it in the turn slot and mark the table as "your move"
  onDecision(req) {
    if (!req || !this.root) return;
    const m = MOVE[req.kind];
    if (!m) return;
    document.body.classList.add("cx-your-move");
    document.body.dataset.cxMove = req.kind;
    let head = m[0];
    if (req.kind === "allocate") {
      const n = ((req.private && req.private.dice) || (req.options && req.options.dice) || []).length;
      if (n) head = `Place your ${n} dice on the machine`;
    }
    const parts = [{ b: head }];
    if (m[1]) parts.push(", " + m[1]);
    if (m[2]) parts.push("  ", { key: m[2] });
    // not in view? say where it is and which key takes me there
    try {
      const g = this.game, cam = g.camera;
      const target = cam && cam.sceneForDecision(req.kind, req.options || req);
      if (target && target !== cam.scene) {
        const where = { market: "the Merchant", drawer: "your records", main: "the desk", timeline: "the chart" }[target];
        const key = g._keyToward(cam.scene, target);
        if (where) parts.push("  ", key ? { key: key + ": " + where } : "(" + where + ")");
      }
    } catch (e) {}
    this.caption("turn", parts, { tag: "YOUR MOVE", tone: "you", sticky: true });   // stays until I answer
  }
  /* ---- KEYBOARD: Enter confirms, P passes, for the decision in front of me ----
     Only while the game screen is up, nothing is being typed, and a decision of
     mine is open. Each key does exactly what the on-screen control would. */
  _key(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const sg = document.getElementById("screen-game");
    if (!sg || !sg.classList.contains("is-active")) return;
    const t = e.target || {};
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName || "") || t.isContentEditable) return;
    const g = this.game, req = g && g.pendingReq;
    const key = (e.key || "").toLowerCase();
    // L: the comic strip of the story so far (any time); Esc closes it
    if (key === "l") { e.preventDefault(); this.toggleStrip(); return; }
    if (key === "escape" && this.stripEl) { e.preventDefault(); this.toggleStrip(false); return; }
    // F: skip the replay, the queued events race to the present (never past a decision)
    if (key === "f" && g && !req && (g.busy || g.queue.length)) {
      e.preventDefault();
      g._skip = true; document.body.classList.add("cx-skipping");
      this.hits.splice(0).forEach((h) => h.remove());
      this._killGrid();
      this.caption("chapter", [{ b: "SKIPPING" }, " to the present..."], { tag: "F", ms: 1400 });
      return;
    }
    if (!req) return;
    // Z or Backspace: undo the last move on the machine, before Confirm
    if ((key === "z" || key === "backspace") && req.kind === "allocate" && g.alloc) {
      e.preventDefault(); g.undoAllocation(); return;
    }
    if (key === "enter") {
      if (req.kind === "allocate") {
        const b = document.getElementById("confirm-alloc");
        if (b && !b.disabled && g.alloc && !g.alloc.pool.length) { e.preventDefault(); g.confirmAllocation(); }
        return;
      }
      if (req.kind === "activation" && document.body.classList.contains("activating-items")) {
        e.preventDefault(); g._passActivation(); return;
      }
      const prim = document.querySelector("#active-prompt .prompt-actions .btn-primary:not(:disabled)");
      if (prim) { e.preventDefault(); prim.click(); }
      return;
    }
    if (key === "p") {
      if (req.kind === "market") { e.preventDefault(); g.marketAct({ action: "pass" }); return; }
      if (req.kind === "activation") {
        e.preventDefault();
        if (document.body.classList.contains("activating-items")) g._endActivationUI();
        g.respond({ activations: [] }); return;
      }
      if (req.kind === "secret_deal") {
        const sd = document.querySelector(".sd-pass"); if (sd) { e.preventDefault(); sd.click(); }
        return;
      }
      const btn = [...document.querySelectorAll("#active-prompt .prompt-actions .btn")]
        .find((b) => !b.disabled && /^(pass|skip|decline)\b/i.test((b.textContent || "").trim()));
      if (btn) { e.preventDefault(); btn.click(); }
    }
  }

  /* ---- QUICK PLACE: right-click a die in the tray and it sockets itself, one click
     instead of two. It continues a row that already holds that value; otherwise it
     takes the first open socket (Recharge, then Paradox, then Travel). ---- */
  _quickPlace(e) {
    const d = e.target && e.target.closest ? e.target.closest('.die[data-source="pool"]') : null;
    const g = this.game;
    if (!d || !g || !g.alloc || g.awaitingReveal || !g.pendingReq || g.pendingReq.kind !== "allocate") return;
    e.preventDefault();
    const v = +d.dataset.value, idx = +d.dataset.idx;
    if (!(v > 0) || g.alloc.pool[idx] !== v) return;
    const sel = { value: v, source: "pool", idx };
    let spot = null;
    for (let r = 0; r < 3 && !spot; r++)
      if (g.alloc.matrix[r].some((x) => x === v))
        for (let c = 0; c < 3 && !spot; c++) if (g.canPlace(r, c, v, sel)) spot = [r, c];
    for (let r = 0; r < 3 && !spot; r++)
      for (let c = 0; c < 3 && !spot; c++) if (g.canPlace(r, c, v, sel)) spot = [r, c];
    if (!spot) { try { g.rejectDrop(0, 0, v, sel); } catch (err) {} return; }
    if (g._carry || g.selected) g._endCarry(true);
    g.selected = sel;
    g.onCellClick(spot[0], spot[1]);
  }

  onRespond() {
    this.clearPreview();
    document.body.classList.remove("cx-your-move");
    delete document.body.dataset.cxMove;
    const s = this.slots.turn;
    if (s && s.classList.contains("cx-you")) this.hide("turn");
  }
}

export const comic = new Comic();
