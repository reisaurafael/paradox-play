/* =========================================================================
   comic.js, THE COMIC LAYER: HELA's voice, narration, impact panels, clarity
   -------------------------------------------------------------------------
   Three comic traditions mixed on purpose (the game is a paradox):
     Franco-Belgian clear line : square NARRATOR boxes (the chapter, my move,
                                 the phase line, footnotes).
     American Silver Age       : ONOMATOPOEIA (BOOM!, KRAK!) on a halftone
                                 starburst with an ink outline and a hard shadow.
     Arcane / anime ink        : SPEED LINES around the biggest beats.
   THE RULE OVER EVERYTHING (the owner's): nothing appears and vanishes fast;
   everything is explained slowly, one thing at a time.
     - HELA speaks one line at a time from her eye (cabin.js say queue). Every
       line, caption and note stays at least max(4 s, 75 ms per character),
       twice that on Slow; Fast never shortens it. Only F (skip) cuts it short.
     - The game never waits for her: the table keeps playing and a line too old
       to be news is dropped from her queue.
     - An impact hits on the event's own beat, with its sound, then holds like a
       printed panel and fades slowly. One on screen at a time.
     - While the tutorial runs (window.__helaMute) it owns every message: this
       layer stays silent and only marks the table.
   Also here: the MEANWHILE reveal grid, emanata on the case files, the phase
   line under the phase track, the consequence preview before Confirm, NEXT
   HOUR, rare rival balloons, keyboard shortcuts. The Merchant's when, why, how
   and where are read on TAB (help.js); HELA points at them, never repeats them.
   Her lines are spoken only when they are ESSENTIAL (something happened to me);
   the rest is filed in HELA's notes, read while TAB is held (cabin.js say).
   Costs: no loops and no intervals; small DOM nodes animated on transform and
   opacity, each removed when it ends. Server-sent text only via textContent.
   game.js calls: init, onEvent, onDecision, onRespond, emanata, preview.
   ========================================================================= */
import { roman } from "./util.js?202609280800";
import { mend } from "./mend.js?202609280800";

const NOTES_KEY = "pdx-cx-notes";                 // Settings: HELA's footnotes on/off
const SLOW = { slow: 2, normal: 1, brisk: 1, fast: 1 };   // Brisk and Fast never shorten a reading time
// the reading time of any message: at least 4 s, and 75 ms per character
const readMs = (n) => Math.max(4000, 75 * n);

// what each of my decisions asks, in plain words (the caption names the decision)
const MOVE = {
  allocate: ["Place your dice on the machine", "then Confirm", "Enter"],
  market: ["The Merchant is open", "buy, renew or pass", "P = pass"],
  deliver: ["Return a relic to its century", "carry it to its drawer, and the timeline mends", ""],
  reward_category: ["Claim your reward", "pick one contract", ""],
  activation: ["Fire an item", "or pass", "P = pass"],
  travel: ["Plot your voyage", "click a port on the chart", ""],
  merchant_century: ["Send the Merchant", "click a century on the chart", ""],
  target: ["Choose a target", "", ""],
  destroy_target: ["Choose a card to destroy", "", ""],
  steal_target: ["Choose a card to steal", "", ""],
  matrix_buff: ["Choose a module to buff", "+1 forever, click the module", ""],
  recycle: ["Recycle for energy", "or skip", ""],
  capacity: ["No room in the pack", "keep or recycle", ""],
  secret_deal: ["A secret deal", "take it or pass", "P = pass"],
};

// what each phase is, in plain words: the chapter caption and the phase line
const PHASE = {
  leilao: ["AUCTION", "Bid for the lots on the floor."],
  delivery: ["DELIVERY", "A traveler standing on a relic's own century may return it there, and the timeline mends."],
  market: ["MARKET", "Travelers at the Merchant's port may buy his relics, renew his stock or declare."],
  main: ["GENERATORS", "Everyone places four dice on their machine, in secret, at the same time."],
  activation: ["ACTIVATION", "Items with an active power may fire, once each."],
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
    this.hitEl = null;
    this.prevEl = null;
    this.ghostEl = null;
    this.gridEl = null;
    this.phaseEl = null;
    this._t = {};
    this._q = {};
    this._until = {};
  }

  init(game) {
    this.game = game;
    if (this.root || typeof document === "undefined") return;
    const r = document.createElement("div");
    r.id = "cx-root";
    r.setAttribute("aria-live", "polite");
    // narrator boxes (square, no tail): the chapter, my move, and HELA's line as plain
    // narration when her eye is not on screen (her footnotes are in her notes, help.js)
    for (const k of ["chapter", "turn", "event"]) {
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
    mend.init(game, this);                          // the last timeline: gauge, marks, mends
    window.addEventListener("keydown", (e) => this._key(e));
    document.addEventListener("contextmenu", (e) => this._quickPlace(e));
    // the camera turning to another desk hides or restores the move preview
    try {
      const cam = document.getElementById("cam");
      if (cam) new MutationObserver(() => { if (this.prevEl || (this.game && this.game.alloc)) this.preview(); })
        .observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
    } catch (e) {}
    const chk = document.getElementById("chk-cx-notes");
    if (chk) {
      chk.checked = this._notesOn();
      chk.addEventListener("change", () => {
        try { localStorage.setItem(NOTES_KEY, chk.checked ? "on" : "off"); } catch (e) {}
      });
    }
  }

  /* ---- environment ---- */
  _gfx() {
    const b = document.body.classList;
    return b.contains("gfx-low") ? "low" : b.contains("gfx-medium") ? "medium" : "high";
  }
  _reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  _slow() { return SLOW[(this.game && this.game.speed) || "normal"] || 1; }
  _hidden() { return typeof document !== "undefined" && document.hidden; }
  _muted() { return !!window.__helaMute; }             // the tutorial owns every message
  _quiet() { return this._hidden() || this._muted() || !!(this.game && this.game._skip); }
  _me() { return this.game && this.game.seat; }
  _col(name) { try { return this.game.colorOf(name); } catch (e) { return "#c9a45c"; } }
  _card(n) { try { return this.game.nameEn(n); } catch (e) { return n; } }
  _eye() { const E = window.__helaEye; return E && E.live && E.live() ? E : null; }
  _backlog() { const E = window.__helaEye; return E && E.backlog ? E.backlog() : 0; }
  _len(parts) {
    let n = 0;
    for (const p of parts) n += typeof p === "string" ? p.length : String((p && (p.b ?? p.key ?? p.name)) || "").length;
    return n;
  }

  /* ---- message parts: strings, { name } (a seat chip in its colour, "You" for me),
     { b } bold, { key } a keycap. Text only. ---- */
  _parts(body, parts) {
    for (const p of parts) {
      if (p == null || p === "") continue;
      if (typeof p === "string") { body.appendChild(document.createTextNode(p)); continue; }
      const e = document.createElement(p.name != null ? "span" : p.key != null ? "kbd" : "b");
      if (p.name != null) {
        e.className = "cx-name";
        e.textContent = p.name === this._me() ? "You" : String(p.name);
        e.style.setProperty("--seat", this._col(p.name));
      } else e.textContent = String(p.key != null ? p.key : p.b);
      body.appendChild(e);
    }
  }

  /* ---- NARRATOR BOXES: a slot swaps its content in place (a slow fade, never a
     jump) and the line on show keeps its reading time: a newer line waits in line
     (three at most) and follows. sticky keeps a line until it is hidden. ---- */
  // every HELA message rides the eye: her boxes live in the eye's caps (above her,
  // opening away from the cursor); only on a table without her eye do they sit in
  // the corner. The order keeps YOUR MOVE nearest to her.
  _home() {
    const E = this._eye(), caps = E && E.caps && E.caps();
    const host = caps || this.root;
    if (!host) return;
    for (const k of ["chapter", "event", "turn"]) {
      const s = this.slots[k];
      if (s && s.parentNode !== host) host.appendChild(s);
    }
  }
  caption(slot, parts, opts = {}) {
    const s = this.slots[slot];
    if (!s || this._hidden() || (this._muted() && !opts.force)) return;
    this._home();
    const skip = this.game && this.game._skip;
    if (!skip && !opts.sticky && !opts.now && (this._until[slot] || 0) > performance.now() && s.classList.contains("on")) {
      const q = this._q[slot] = this._q[slot] || [];
      if (opts.fresh) q.length = 0;              // a newer chapter makes waiting ones stale
      q.push([parts, opts]);
      if (q.length > 3) q.splice(0, q.length - 3);
      return;                                    // the line on show calls the next when it is done
    }
    clearTimeout(this._t[slot]); clearTimeout(this._t[slot + "x"]);
    const fill = () => {
      clearTimeout(this._t[slot + "o"]);
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
      try { window.__helaEye && window.__helaEye.relayout && window.__helaEye.relayout(); } catch (e) {}   // her boxes changed size
    };
    if (s.classList.contains("on") && !s.classList.contains("cx-out")) { s.classList.add("cx-out"); this._t[slot + "x"] = setTimeout(() => { s.classList.remove("cx-out"); fill(); }, 380); }
    else { s.classList.remove("cx-out"); fill(); }
    const ms = Math.max(opts.ms || 0, readMs(this._len(parts) + (opts.tag ? opts.tag.length : 0))) * this._slow() + 380;
    this._until[slot] = opts.sticky ? 0 : performance.now() + ms;
    if (!opts.sticky) this._t[slot] = setTimeout(() => { if (!this._nextCaption(slot)) this.hide(slot); }, ms);
  }
  _nextCaption(slot) {
    const q = this._q[slot];
    if (!q || !q.length) return false;
    const [parts, opts] = q.shift();
    this._until[slot] = 0;
    this.caption(slot, parts, opts);
    return true;
  }
  hide(slot) {
    const s = this.slots[slot];
    clearTimeout(this._t[slot]); clearTimeout(this._t[slot + "x"]);
    this._until[slot] = 0;
    if (!s || !s.classList.contains("on")) return;
    // it fades first (nothing vanishes at once), then gives its room back
    s.classList.add("cx-out");
    clearTimeout(this._t[slot + "o"]);
    this._t[slot + "o"] = setTimeout(() => { s.classList.remove("on", "cx-out");
      try { window.__helaEye && window.__helaEye.relayout && window.__helaEye.relayout(); } catch (e) {} }, 520);
  }

  /* ---- HELA SPEAKS FROM HER EYE ------------------------------------------------
     Her line is a balloon on the eye (cabin.js .he-chip): her colour, her eye as
     the speaker mark, the tail on the eye, on the side away from the cursor. It
     joins her one-line-at-a-time queue. The eye always follows the cursor; the
     subject of a line gets the little yellow box while she speaks, and her balloon
     opens clear of it. opts: tone, prio (0 droppable, 1 normal, 2 major), at (the
     subject: a rect or a function giving one), impact ([kind, rect or rect
     function, options], landed on the event's beat), onShow. */
  say(parts, opts = {}) {
    if (this._quiet()) return;
    // the impact lands NOW, on the event's own beat (its sound plays now too)
    if (opts.impact) { const [k, rf, o] = opts.impact; this.impact(k, typeof rf === "function" ? rf() : rf, o || {}); }
    const run = (ms) => {
      if (opts.at) this._highlight(typeof opts.at === "function" ? opts.at() : opts.at, ms);
      if (opts.onShow) { try { opts.onShow(ms); } catch (e) {} }
    };
    const E = this._eye();
    if (!E) { this.caption("event", parts, opts); run(readMs(this._len(parts)) * this._slow()); return; }
    const n = document.createElement("span");
    n.className = "cx-say" + (opts.tone ? " cx-" + opts.tone : "");
    this._parts(n, parts);
    const prio = opts.prio == null ? 1 : opts.prio;
    E.say(n, { prio, essential: !!opts.essential, ttl: prio >= 2 ? 9000 : prio === 1 ? 6500 : 4000,   // a line too old to be news is dropped
      ms: Math.round(Math.max(opts.ms || 0, readMs(this._len(parts))) * this._slow()),
      onShow: (ms) => run(ms) });
  }

  // the subject of her line: the little yellow box, for as long as she speaks (a point
  // becomes a small box around it). Never while skipping or during the tutorial,
  // whose own rings do this.
  _highlight(at, ms) {
    const E = window.__helaEye;
    if (!at || !E || !E.highlight || this._quiet()) return;
    const r = at.width != null ? at : { left: at.x - 28, top: at.y - 28, right: at.x + 28, bottom: at.y + 28, width: 56, height: 56 };
    E.highlight(r, ms);
  }

  /* ---- anchors: where things are on screen right now (null when off screen) ---- */
  _onScreen(el) {
    if (!el) return null;
    return this._onScreenRect(el.getBoundingClientRect());
  }
  _onScreenRect(r) {
    if (!r || r.width < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    return r;
  }
  _seatRect(seat) {
    if (seat === this._me()) {
      // mine lands just ABOVE the lifethread, so the number it hits stays readable
      const r = this._onScreen(document.getElementById("vz-holo") || document.getElementById("machine-zone"));
      return r ? { x: r.left + r.width / 2, y: r.top - 70 } : null;
    }
    const sel = `.pcard[data-seat="${CSS.escape(String(seat))}"]`;
    return this._onScreen(document.querySelector(sel + " .badge") || document.querySelector(sel));
  }
  // the subject box for a seat: my lifethread, or a rival's case file
  _at(seat) {
    if (seat === this._me()) return this._onScreen(document.getElementById("vz-holo"));
    return this._seatRect(seat);
  }
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
    return el ? this._onScreen(el) : null;
  }
  _cardAt(name) {
    try { const r = this.game.marketCardRect(name); return r ? this._onScreenRect(r) : null; } catch (e) { return null; }
  }
  // a mark ON the chart rides the chart when the camera pans: it lives inside the
  // chart's own box, placed in the chart's unscaled coordinates
  _pinToChart(node, r) {
    const ch = this._chart(), host = ch && ch.host;
    if (!host || !r) return false;
    if (node.parentNode !== host) host.appendChild(node);
    const op = node.offsetParent || host;
    const orr = op.getBoundingClientRect(), k = op.offsetWidth ? orr.width / op.offsetWidth : 1;
    if (!(k > 0)) return false;
    node.style.left = ((r.left + r.width / 2 - orr.left) / k) + "px";
    node.style.top = ((r.top + r.height / 2 - orr.top) / k) + "px";
    return true;
  }

  /* ---- IMPACT PANELS: the lettering on a halftone starburst, speed lines on the
     big ones. It arrives with HELA's line, holds still like a printed panel and
     fades slowly. One on screen at a time. Low graphics: lettering and a flat star. */
  impact(kind, at, opts = {}) {
    // FX: the tutorial may let the effects in (window.__fx.tutorial); its words stay its own
    const fxTut = this._muted() && !this._hidden() && !(this.game && this.game._skip) && !!(window.__fx && window.__fx.tutorial);
    if ((this._quiet() && !fxTut) || !this.root) return;
    // FX (js/fx.js): the Comic effects setting, the pace and one big panel at a time.
    // It may queue this panel, turn it into a stamp (Light) or drop it (Off).
    try { if (window.__fx && window.__fx.route(kind, at, opts)) return; } catch (e) {}
    if (opts._at) at = opts._at;   // FX: a panel re-anchored beside its subject (Year Zero's well)
    const K = {
      paradox: { word: "ZZAP!", c: "#b98cff", ink: "#1a0f2e" },
      boom: { word: "BOOM!", c: "#ff7a2a", ink: "#2a0d02" },
      terminated: { word: "KRAK!", c: "#ff4a36", ink: "#260604" },
      deliver: { word: "KA-CHUNK!", c: "#f7c65a", ink: "#2a1a02" },
      wanted: { word: "WANTED!", c: "#ff8a2a", ink: "#2a1002" },
      steal: { word: "SWIPE!", c: "#ff5a44", ink: "#2a0804" },
      contract: { word: "KA-CHING!", c: "#f7c65a", ink: "#2a1a02" },
      yearzero: { word: "YEAR ZERO!", c: "#fff1c2", ink: "#1a1204" },
      vault: { word: "KLANK!", c: "#b98cff", ink: "#1a0f2e" },          // FX: the Secret Market opens
      settle: { word: "THE END", c: "#fff1c2", ink: "#1a1204" },       // FX: the match ends
    }[kind] || { word: "POW!", c: "#fff1c2", ink: "#15100a" };
    const gfx = this._gfx(), reduced = this._reduced();
    let x = innerWidth / 2, y = innerHeight * 0.42;
    const mx = opts._mx || (opts.big ? 240 : 150), my = opts._my || (opts.big ? 140 : 110);   // the whole word stays on screen (FX: a phone fits it itself)
    if (at && at.width != null) { const q = this._beside(at, mx, my); x = q.x; y = q.y; }
    else if (at && at.x != null) { x = at.x; y = at.y; }
    x = Math.max(mx, Math.min(innerWidth - mx, x));
    y = Math.max(my, Math.min(innerHeight - my, y));
    if (this.hitEl) { this.hitEl.remove(); this.hitEl = null; }
    const big = !!opts.big;
    const h = document.createElement("div");
    h.className = "cx-hit" + (big ? " cx-hit-big" : "") + " cx-g-" + gfx + (opts.c ? " cx-seat" : "");   // FX: cx-seat wears the causer's colour
    h.style.left = x + "px"; h.style.top = y + "px";
    h.style.setProperty("--cx-c", opts.c || K.c); h.style.setProperty("--cx-ink", K.ink);
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
    this.hitEl = h;
    // a printed panel: in over about 0.4 s, held still, out over about 0.9 s
    const dur = opts._dur || Math.round((big ? 3400 : 2800) * this._slow());   // FX: the pace sets _dur
    const rot = (Math.random() * 8 - 4).toFixed(1);
    const fin = { duration: dur, easing: "linear", fill: "both" };
    const pop = Math.min(0.12, 150 / dur);         // it hits on the beat (with its sound), then holds
    if (reduced) {
      h.animate([{ opacity: 0 }, { opacity: 1, offset: pop }, { opacity: 1, offset: 0.72 }, { opacity: 0 }], fin);
    } else {
      word.animate([
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1.5)`, opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: pop },
        { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1.02)`, opacity: 1, offset: 0.72 },
        { transform: `translate(-50%,-54%) rotate(${rot}deg) scale(1.04)`, opacity: 0 },
      ], fin);
      burst.animate([
        { transform: "translate(-50%,-50%) scale(.4) rotate(0deg)", opacity: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
        { transform: "translate(-50%,-50%) scale(1) rotate(6deg)", opacity: 1, offset: pop },
        { transform: "translate(-50%,-50%) scale(1) rotate(7deg)", opacity: 1, offset: 0.72 },
        { transform: "translate(-50%,-50%) scale(1.05) rotate(8deg)", opacity: 0 },
      ], fin);
      if (lines) lines.animate([
        { transform: "translate(-50%,-50%) scale(.85)", opacity: 0 },
        { transform: "translate(-50%,-50%) scale(1)", opacity: 0.8, offset: pop },
        { transform: "translate(-50%,-50%) scale(1.04)", opacity: 0.7, offset: 0.7 },
        { transform: "translate(-50%,-50%) scale(1.1)", opacity: 0 },
      ], fin);
    }
    setTimeout(() => { h.remove(); if (this.hitEl === h) this.hitEl = null; }, dur + 80);
  }

  /* the panel lands BESIDE its subject (the side toward open table first), never over
     a case file's numbers, the machine, the dice, Confirm or her words: the first
     clear spot wins, else the one that covers least. hx, hy: the panel's half size. */
  _beside(r, hx, hy) {
    const Z = [];
    for (const el of document.querySelectorAll(".pcard.cfolio, #hull-console, .dice-pool, #confirm-alloc, #hela-eye.he-says .he-chip")) {
      const b = el.getBoundingClientRect();
      if (b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < innerHeight) Z.push([b.left, b.top, b.right, b.bottom, 1]);
    }
    Z.push([r.left, r.top, r.left + r.width, r.top + r.height, 4]);   // its subject most of all
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, g = 14;
    const toC = cx < innerWidth / 2 ? 1 : -1, toM = cy < innerHeight / 2 ? 1 : -1;
    const side = (s) => [cx + s * (r.width / 2 + g + hx), cy];
    const vert = (s) => [cx, cy + s * (r.height / 2 + g + hy)];
    const diag = (s, t) => [cx + s * (r.width / 2 + g + hx * .6), cy + t * (r.height / 2 + g + hy * .6)];
    const C = [side(toC), diag(toC, toM), vert(toM), diag(toC, -toM), side(-toC), vert(-toM), diag(-toC, toM), diag(-toC, -toM)];
    let best = null, bs = 1e18;
    for (let [x, y] of C) {
      x = Math.max(hx, Math.min(innerWidth - hx, x)); y = Math.max(hy, Math.min(innerHeight - hy, y));
      const b = [x - hx * .8, y - hy * .8, x + hx * .8, y + hy * .8];   // the burst's body, not its speed lines
      let sc = 0;
      for (const z of Z) { const w = Math.min(b[2], z[2]) - Math.max(b[0], z[0]), h = Math.min(b[3], z[3]) - Math.max(b[1], z[1]);
        if (w > 0 && h > 0) sc += w * h * z[4]; }
      if (sc === 0) return { x, y };
      if (sc < bs) { bs = sc; best = { x, y }; }
    }
    return best || { x: cx, y: cy };
  }

  /* ---- MEANWHILE...: the simultaneous reveal as a comic grid. One panel per
     traveler, in their colour, their revealed machine as a 3x3 of dice (public the
     moment allocations are revealed). The panels arrive one by one and the page
     stays long enough to read, beside the table that keeps playing. F skips it. ---- */
  revealGrid(allocs) {
    this._killGrid();
    const g = this.game;
    const seats = Object.keys(allocs || {});
    if (!seats.length || !this.root || this._quiet()) return;
    const order = (g && g.priority && g.priority.length ? g.priority.filter((n) => seats.includes(n)) : []);
    seats.forEach((n) => { if (!order.includes(n)) order.push(n); });
    const w = document.createElement("div");
    // it lies on free wood: beside the briefcase on the main desk, mid-desk elsewhere
    const scene = (g && g.camera && g.camera.scene) || "main";
    w.className = "cx-grid cx-g-" + this._gfx() + (scene === "main" ? "" : " cx-grid-mid");
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
    const key = document.createElement("div");
    key.className = "cx-grid-key";
    key.textContent = "Rows: green recharge, violet paradox, blue travel.";
    w.appendChild(row);
    w.appendChild(key);
    this.root.appendChild(w);
    this.gridEl = w;
    // the panels land one every 0.45 s; then the page is read (at least 4 s more)
    const dur = (Math.min(order.length, 6) * 450 + 4200) * this._slow();
    this._gridT = setTimeout(() => {
      if (this.gridEl !== w) return;
      w.classList.add("out");
      this._gridT = setTimeout(() => this._killGrid(), 900);
    }, dur);
  }
  _killGrid() {
    clearTimeout(this._gridT);
    if (this.gridEl) { this.gridEl.remove(); this.gridEl = null; }
  }

  /* ---- EMANATA: the comic marks around a head, from public state only.
       !  Wanted   sweat drops  energy at or below 6   stars  the Hour a motor exploded
       z z Z  terminated, awaiting respawn
     On the rivals' case files and on my lifethread. Static; a new mark pops once.
     Called after every players render; it refreshes the phase line too. ---- */
  emanata(view) {
    if (!view || !view.travelers || !this.root) return;
    const me = this._me(), prev = this._em || {}, next = {};
    const GLYPH = { bang: "!", sweat: "", dizzy: "★ ✦ ★", zzz: "z z Z" };
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
      } else {
        const card = document.querySelector(`.pcard[data-seat="${CSS.escape(String(t.name))}"]`);
        if (!card) continue;
        host = card.querySelector(":scope > .cx-em");
        if (!host) { host = document.createElement("span"); host.className = "cx-em"; card.appendChild(host); }
      }
      host.textContent = "";
      const had = new Set(prev[t.name] || []);
      for (const k of set) {
        const e = document.createElement("i");
        e.className = "cx-e-" + k + (had.has(k) ? "" : " cx-new");
        e.textContent = GLYPH[k];
        host.appendChild(e);
      }
    }
    this._em = next;
    this.phaseLine();
    try { mend.sync(); } catch (e) {}
  }

  /* ---- THE PHASE LINE: under the phase track, in plain words, what the current
     phase is for and who may act in it (public positions only). Rebuilt only when
     its words change. The tutorial has its own strip; the line steps aside then. ---- */
  phaseLine() {
    const g = this.game, v = g && g.view;
    const rail = document.querySelector("#hull .vz-rail") || document.getElementById("topbar");
    if (!rail || !v) return;
    let el = this.phaseEl;
    if (!el || !el.isConnected) {
      el = document.createElement("div");
      el.id = "cx-phaseline";
      rail.appendChild(el);
      this.phaseEl = el;
    } else if (el.parentNode !== rail) rail.appendChild(el);   // the helmet mounted after us: move in
    const ph = g.currentPhase, P = PHASE[ph];
    const hide = this._muted() || !P;
    el.classList.toggle("on", !hide);
    if (hide) return;
    const act = (v.travelers || []).filter((t) => !(t.statuses || []).includes("awaiting_respawn"));
    let who = null, none = "";
    if (ph === "delivery") {
      who = act.filter((t) => (t.equipment || t.hand || []).some((c) => c.delivery_century === t.century));
      none = "nobody stands on a relic's century";
    } else if (ph === "market") {
      const at = v.merchant_century;
      who = act.filter((t) => t.century === at || (v.secret_market_open && t.century === 11));
      none = "nobody is at a market";
    } else if (ph === "activation") {
      who = act.filter((t) => (t.equipment || t.hand || []).some((c) => /active/.test(c.ability_type || "") && !/passive/.test(c.ability_type || "")));
      none = "nobody holds an item that can fire";
    }
    const parts = [{ b: P[0] + ": " }, P[1]];
    if (ph === "market" && v.merchant_century != null) parts[1] = `Travelers at the Merchant's port (${roman(v.merchant_century)}) may buy his relics, renew his stock or declare.`;
    if (who) {
      parts.push("  Can act: ");
      if (who.length) who.forEach((t, i) => parts.push(i ? ", " : "", { name: t.name }));
      else parts.push(none + ".");
    }
    this._phaseParts = parts;
    // the words also sit on the phase track itself, on hover (plain text)
    const txt = parts.map((q) => typeof q === "string" ? q : (q.name != null ? (q.name === this._me() ? "You" : q.name) : (q.b ?? ""))).join("");
    const on = document.querySelector("#hull .vz-ph.on, #phase-track .phase-chip.active");
    if (on && on.title !== txt) on.title = txt;
    const key = JSON.stringify(parts);
    if (el._k === key) return;
    el._k = key;
    el.textContent = "";
    this._parts(el, parts);
  }

  /* ---- EDITOR'S NOTES: the rule behind what just happened, once per match. They no
     longer pop over the game: they are filed in HELA's notes, read while TAB is held
     (help.js), and can be switched off in Settings. ---- */
  _notesOn() { try { return localStorage.getItem(NOTES_KEY) !== "off"; } catch (e) { return true; } }
  note(key, text) {
    if (!this._notesOn() || this._quiet() || !window.__pdxHelp) return;
    this._noted = this._noted || new Set();
    if (this._noted.has(key)) return;
    this._noted.add(key);
    window.__pdxHelp.note(text, { key: "rule:" + key });
  }
  _notesFor(kind, p) {
    const me = this._me();
    if (kind === "phase_started" && p.phase === "market" && !p.solo)
      this.note("merchant", "The Merchant moves at the end of every Market, toward the richest traveler he is not beside. The chart shows whom he chases; hold TAB for his whole rule.");
    else if (kind === "traveled" && p.to < p.from)
      this.note("past", "Sailing to the past costs 1 energy per century, 2 per century below X. The future is free.");
    else if (kind === "paradox_resolved" && (p.hits || []).length)
      this.note("paradox", "A paradox never hurts its maker. Future hits everyone ahead of you, Present everyone beside you, Past everyone behind you for double: it is the third die, an overload.");
    else if (kind === "wanted")
      this.note("wanted", "A Wanted traveler carries a 4 gold bounty. Paying 4 gold at a Market (Declare) clears it.");
    else if (kind === "card_bought" && p.seat === me && !p.stolen)
      this.note("deliver", "A relic torn from its century unravels the last timeline. Return it while you stand on that century, in the Delivery phase: the timeline mends and you earn a contract point.");
    else if (kind === "heated" && p.seat === me && (p.booms || 0) >= 9)
      this.note("heat", "At 12 heat the motor explodes: -2 energy and no actions for the rest of that Hour.");
    else if (kind === "respawned" && p.seat === me)
      this.note("immune", "Back in the Timeless centuries (XXIV to XXX) you cannot lose energy until you first reach XXIII.");
    else if (kind === "secret_market_opened" || (kind === "phase_started" && p.phase === "delivery" && (this.game && this.game.view && this.game.view.hour) >= 3))
      this.note("memory", "Everything that happened is kept in my memory, the comic book on your paperwork desk. Press L to read it.");
  }

  /* ---- CONSEQUENCE PREVIEW: while I place dice, what the machine WILL do, from
     public positions only: who my paradox dice hit and for how much, the recharge,
     the heat after module 7, how far the travel dice reach and what sailing all the
     way back costs (a ghost of my piece on the chart), and a warning when the plan
     can leave me critical. Rebuilt only when a die moves. Cards are not counted. ---- */
  // the rows, from public positions only (no DOM): [{ row (the function it belongs to), tone, parts }], plus where the
  // travel dice could take me back to (the chart's ghost). null when nothing is placed.
  previewRows() {
    const g = this.game;
    if (!g || !g.alloc || g.awaitingReveal || !g.view) return null;
    const me = g._self(); if (!me) return null;
    const m = g.alloc.matrix, rows = [];
    const others = (g.view.travelers || []).filter((t) => t.name !== me.name && !(t.statuses || []).includes("awaiting_respawn"));
    const PX = [["FUTURE", (t) => t.century > me.century], ["PRESENT", (t) => t.century === me.century], ["PAST", (t) => t.century < me.century]];
    for (let c = 0; c < 3; c++) {
      const v = m[1][c]; if (!v) continue;
      const hit = others.filter(PX[c][1]);
      const parts = [{ b: "PARADOX " + PX[c][0] + ": " }];
      if (!hit.length) parts.push("no one in reach");
      // the Past (module 6) takes a die only when the row is overloaded, and it hits for DOUBLE
      else { hit.forEach((t, i) => parts.push(i ? ", " : "", { name: t.name })); parts.push(c === 2 ? ` lose ${v * 2} (double: the third die)` : ` lose ${v}`); }
      rows.push({ row: 1, parts });
    }
    const gain = (m[0][0] || 0) + (m[0][2] || 0);
    if (gain) rows.push({ row: 0, parts: [{ b: "RECHARGE: " }, `+${gain} energy`] });
    const heat = m[2][0] || 0, dist = (m[2][1] || 0) + 2 * (m[2][2] || 0);
    let after = (me.energy || 0) + gain, exploded = false, back = null;
    if (heat) {
      const nb = (me.booms || 0) + heat;
      exploded = nb >= 12;
      rows.push({ row: 2, tone: exploded ? "danger" : "", parts: [{ b: "HEAT: " }, exploded ? `${nb}/12, the motor EXPLODES: -2 energy, no travel this Hour` : `${nb}/12`] });
      if (exploded) after -= 2;
    }
    if (dist && !exploded) {
      back = Math.max(0, me.century - dist);
      const cost = travelCost(me.century, back);
      rows.push({ row: 2, parts: [{ b: "TRAVEL: " }, `up to ${dist} centuries. Back to ${back === 0 ? "YEAR ZERO" : roman(back)} costs ${cost} energy; forward is free.`] });
      after -= cost;
    }
    // three dice in one function: say it BEFORE Confirm, not after
    m.forEach((row, r) => { if (row.length && row.every((v) => v)) rows.push({ row: r, tone: "danger",
      parts: [{ b: "OVERLOAD: " }, `${["Recharge", "Paradox", "Travel"][r]} gets three dice, so it will be shut for the next Hour.${r === 1 ? " Its Past die hits for double first." : ""}`] }); });
    if (dist || heat || gain) {
      if (after <= 0) rows.push({ row: 2, tone: "danger", parts: [{ b: "! " }, "The full trip back costs more energy than you have: you would stop short."] });
      else if (after <= 6) rows.push({ row: 2, tone: "danger", parts: [{ b: "! " }, `This plan can leave you at ${after} energy: critical.`] });
    }
    return rows.length ? { rows, back, me } : null;
  }
  // the preview lives ONLY in HELA's extended view (hold Tab, help.js; the owner, 27/09):
  // the table shows nothing of it. While Tab is held it keeps the chart's ghost of the
  // trip back in step with the dice and tells the extended view to redraw its rows.
  preview() {
    const g = this.game;
    const held = !!(window.__pdxHelp && window.__pdxHelp.isHeld && window.__pdxHelp.isHeld());
    const onDesk = !(g && g.camera && g.camera.scene && g.camera.scene !== "main");
    const pv = held && onDesk ? this.previewRows() : null;
    if (this.prevEl) { this.prevEl.remove(); this.prevEl = null; }
    if (!pv) { if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; } }
    else this._ghost(pv.back, pv.me);
    try { window.dispatchEvent(new Event("pdx-preview")); } catch (e) {}
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
  clearPreview() {
    if (this.prevEl) { this.prevEl.remove(); this.prevEl = null; }
    if (this.ghostEl) { this.ghostEl.remove(); this.ghostEl = null; }
  }

  /* ---- NEXT HOUR: one cliffhanger line as the Hour closes ---- */
  _cliffhanger() {
    const g = this.game, v = g && g.view; if (!v || !v.travelers || this._quiet()) return;
    const act = v.travelers.filter((t) => !(t.statuses || []).includes("awaiting_respawn"));
    const me = this._me();
    let parts = null;
    const near = act.slice().sort((a, b) => a.century - b.century)[0];
    const crit = act.filter((t) => (t.energy || 0) <= 6).sort((a, b) => a.energy - b.energy)[0];
    const plan = v.merchant_plan;   // the map's own readout of the Merchant's next move
    if (near && near.century <= 9)
      parts = [{ name: near.name }, near.name === me ? " stand" : " stands", ` ${near.century} ${near.century === 1 ? "century" : "centuries"} from Year Zero.`];
    else if (crit)
      parts = [{ name: crit.name }, crit.name === me ? " are" : " is", ` down to ${crit.energy} energy.`];
    else if (plan && plan.target_seat)
      parts = ["The Merchant has his eye on ", { name: plan.target_seat }, " (see the chart)."];
    if (!parts || !window.__pdxHelp) return;
    // commentary: it waits in HELA's notes (hold TAB), the latest one only
    const n = document.createElement("span");
    this._parts(n, [{ b: "Next Hour: " }, ...parts]);
    window.__pdxHelp.note(n, { key: "next-hour" });
  }

  /* ---- RIVAL VOICES: a bot now and then says one short line in its own colour, at
     a few moments only, at most once every three Hours each, after HELA has finished
     speaking, and never about anything it could not know. ---- */
  rivalSay(seat, key) {
    const g = this.game;
    if (!g || !g._bots || !g._bots.has(seat) || seat === this._me() || this._quiet()) return;
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
    this._rivalAt[seat] = hour;
    const text = LINES[(Math.random() * LINES.length) | 0], t0 = performance.now();
    const show = () => {
      if (this._quiet() || performance.now() - t0 > 20000) return;
      if (this._backlog() > 1) { setTimeout(show, 600); return; }
      const r = this._seatRect(seat); if (!r) return;
      const b = document.createElement("div");
      b.className = "cx-rival";
      b.style.setProperty("--seat", this._col(seat));
      b.textContent = text;
      // it speaks from the right edge of its own case file, clear of HELA
      const x = r.width != null ? r.right : r.x, y = r.width != null ? r.top + 22 : r.y;
      b.style.left = Math.min(innerWidth - 240, x + 12) + "px"; b.style.top = y + "px";
      this.root.appendChild(b);
      const ms = readMs(text.length) * this._slow();
      setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 700); }, ms);
    };
    setTimeout(show, 900);
  }

  /* ---- HOOKS -------------------------------------------------------------------- */
  // Events are narrated on the next frame, all of that frame's events together: the
  // anchors are measured once, after the game has drawn.
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
    if (kind === "phase_started" || kind === "phase_skipped") this.phaseLine();
    try { this._notesFor(kind, p); } catch (e) {}
    // the Hour's last phase is Activation: its chapter first, then the cliffhanger
    if (p.phase === "activation" && (kind === "phase_skipped" || (kind === "phase_started" && !p.solo))) {
      clearTimeout(this._cliffT);
      this._cliffT = setTimeout(() => this._cliffhanger(), 600);
    }
    if (kind === "terminated") { if (p.by && p.seat === me) this.rivalSay(p.by, "terminated_you"); else this.rivalSay(p.seat, "terminated"); }
    if (kind === "card_stolen" && p.from === me) this.rivalSay(p.seat, "stole_you");
    if (kind === "traveled" && p.to === 0) this.rivalSay(p.seat, "year_zero");
    switch (kind) {
      case "phase_started": {
        if (p.invalid_allocation) return;
        const ph = PHASE[p.phase]; if (!ph) return;
        const hour = this.game && this.game.view ? this.game.view.hour : "";
        // HELA says what the phase is for and who may act, from her eye (no fixed line)
        this.phaseLine();
        // the chapter names the phase and who can act; what the phase is FOR is a reminder,
        // read in HELA's extended view (hold Tab, help.js "THE HOUR"), not on the table
        const rest = (this._phaseParts || []).slice(2).map((x) => (x === "  Can act: " ? "Can act: " : x));
        const pp = [{ b: ph[0] + (p.solo ? " (SOLO)" : "") }].concat(rest.length ? [". "].concat(rest) : []);
        this.caption("chapter", pp, { tag: "HOUR " + hour, now: true });
        return;
      }
      case "phase_skipped": {
        const ph = PHASE[p.phase]; if (!ph) return;
        this.caption("chapter", [{ b: ph[0] + " SKIPPED" }, p.reason ? `: ${p.reason}.` : "."],
          { tag: "HOUR " + (this.game && this.game.view ? this.game.view.hour : ""), now: true });
        return;
      }
      case "allocations_revealed":
        if (this.slots.turn.classList.contains("cx-wait")) this.hide("turn");
        this.revealGrid(p.allocations || {});
        return;
      case "paradox_resolved": {
        const hits = (p.hits || []).filter((h) => h.damage);
        if (!hits.length) return;
        const parts = [{ b: "A paradox tears at the timeline. " }];
        hits.forEach((h, i) => { parts.push(i ? ", " : "", N(h.seat)); });
        try {
          // a tear runs only from a traveler whose die REACHED that victim (game._paradoxPairs,
          // by position), never from everyone who fed the pool
          const tv = (s2) => ((this.game.view && this.game.view.travelers) || []).find((t) => t.name === s2);
          const pairs = (this.game._paradoxPairs && this.game._paradoxPairs(p)) || [];
          const by = new Map();
          for (const q of pairs) if (q.causer) { if (!by.has(q.causer)) by.set(q.causer, []); by.get(q.causer).push(q.victim); }
          for (const [c, victims] of [...by].slice(0, 3)) {
            const ct = tv(c); if (!ct) continue;
            const tgt = victims.map(tv).filter(Boolean).map((t) => t.century);
            if (tgt.length) mend.tear(ct.century, tgt, this._col(c));
          }
        } catch (e) {}
        const d = hits[0].damage, same = hits.every((h) => h.damage === d);
        parts.push(hits.length === 1 && hits[0].seat !== me ? (same ? ` loses ${d} energy.` : " loses energy.") : (same ? ` lose ${d} energy.` : " lose energy."));
        const mine = hits.find((h) => h.seat === me), rival = hits.find((h) => h.seat !== me) || hits[0];
        const star = mine || rival;
        this.say(parts, { tone: "danger", prio: 2, essential: !!mine, at: () => this._at(rival.seat),
          impact: ["paradox", () => this._seatRect(star.seat), { big: !!mine, sub: `-${star.damage}` }] });
        return;
      }
      case "exploded":
        this.say(p.seat === me ? [{ b: "BOOM! " }, "Your machine fails to hold the years: 12 heat. -2 energy, and you sit out the rest of this Hour."]
          : [{ b: "BOOM! " }, N(p.seat), "'s machine fails to hold the years: 12 heat. -2 energy, out for the rest of this Hour."],
          { tone: "danger", prio: 2, essential: p.seat === me, at: () => this._at(p.seat), impact: ["boom", () => this._seatRect(p.seat), { big: true }] });
        return;
      case "terminated":
        this.say([N(p.seat), v(p.seat, " is", " are") + " TERMINATED", p.by ? " by " : "", p.by ? N(p.by) : "",
          v(p.seat, ". The C.R.O.N.O.S. pulls them back to the far future, XXX. Their gear is recycled.", ". The C.R.O.N.O.S. pulls you back to the far future, XXX. Your gear is recycled.")],
          { tone: "danger", prio: 2, essential: p.seat === me, at: () => this._at(p.seat), impact: ["terminated", () => this._seatRect(p.seat), { big: true, sub: "TERMINATED" }] });
        return;
      case "respawned":
        return this.say([N(p.seat), v(p.seat, " returns", " return") + ` at XXX with ${p.energy} energy.`], { prio: 0, at: () => this._at(p.seat) });
      case "delivered":
        // the mend itself (the ring closing, the notch, KA-CHUNK) lands with the relic,
        // on the beat of its sound: game.js onLand calls mend.js
        this.say([{ b: "The timeline mends at " + roman(p.century) + ". " }, N(p.seat), v(p.seat, " returns ", " return "), { b: this._card(p.card) }, " to its own century."],
          { tone: "good", prio: 2, at: () => this._islandAt(p.century) || this._at(p.seat) });
        return;
      case "traveled": {
        const up = p.to < p.from;
        return this.say([N(p.seat), v(p.seat, " sails", " sail") + ` ${roman(p.from)} → ${roman(p.to)}`, up ? " (toward Year Zero)." : "."],
          { prio: p.seat === me || p.to <= 9 ? 1 : 0, at: () => this._islandAt(p.to),
            impact: p.to === 0 ? ["yearzero", null, { big: true, sub: "THE MATCH ENDS" }] : null });
      }
      case "merchant_moved": {
        if (p.teleport || !p.roll) return this.say(["The Merchant makes port at ", { b: roman(p.to) }, p.teleport ? " (a temporal leap)." : "."],
          { prio: 1, at: () => this._islandAt(p.to) });
        // one line: the roll, the distance, the target (the chart tells the voyage itself)
        const rolls = (p.rolls && p.rolls.length > 1) ? `${p.rolls.join(" + ")} = ${p.roll}` : String(p.roll);
        const dist = Math.abs(p.to - p.from), early = dist < p.roll;
        const route = `${dist} ${dist === 1 ? "century" : "centuries"} (${roman(p.from)} to ${roman(p.to)})`;
        const aim = p.target ? [N(p.target), ", the richest traveller not in his century"]
          : [p.why === "future" ? "XXX, since everyone is with him at the Secret Market" : "the Secret Market at XI, since everyone is with him"];
        return this.say(["The Merchant rolls ", { b: rolls }, ` and sails ${route}`,
          early ? ": he stops on reaching " : ", chasing ", ...aim, "."],
          { prio: 1, at: () => this._islandAt(p.from) });
      }
      case "card_bought":
        if (p.stolen) {
          this.say([N(p.seat), v(p.seat, " STEALS ", " STEAL "), { b: this._card(p.card) }, v(p.seat, " from the Merchant, and is now Wanted.", " from the Merchant, and are now Wanted.")],
            { tone: "danger", prio: 2, at: () => this._cardAt(p.card) || this._seatRect(p.seat), impact: ["steal", () => this._seatRect(p.seat), {}] });
        } else {
          this.say([N(p.seat), v(p.seat, " buys ", " buy "), { b: this._card(p.card) }, p.cost ? ` for ${p.cost} gold.` : "."],
            { prio: 1, at: () => this._cardAt(p.card) || this._at(p.seat) });
        }
        return;
      case "card_renewed":
        return this.say([N(p.seat), v(p.seat, " renews", " renew") + " the Merchant's stock."], { prio: 0 });
      case "declared":
        return this.say([N(p.seat), v(p.seat, " declares their goods.", " declare your goods.") + " Wanted is cleared."], { prio: 1, at: () => this._at(p.seat) });
      case "wanted":
        return this.say(["The C.R.O.N.O.S. brands ", N(p.seat), v(p.seat, " a thief: WANTED. The Temporal Herald posts the bounty, 4 gold to whoever terminates them.", " a thief: WANTED. The Temporal Herald posts the bounty, 4 gold to whoever terminates you.")],
          { tone: "danger", prio: 2, at: () => this._seatRect(p.seat), impact: ["wanted", () => this._seatRect(p.seat), { sub: "BOUNTY 4 GOLD" }] });
      case "milestone":
        return this.say([N(p.seat), v(p.seat, " reaches", " reach") + ` century ${roman(p.century)}: a milestone, +1 contract point.`], { tone: "good", prio: 1, at: () => this._islandAt(p.century) });
      case "reward_resolved":
        return this.say([N(p.seat), v(p.seat, " signs", " sign") + ` a ${p.category} contract.`],
          { tone: "good", prio: 1, at: () => this._seatRect(p.seat), impact: ["contract", () => this._seatRect(p.seat), { big: p.seat === me }] });
      case "activated":
        return this.say([N(p.seat), v(p.seat, " activates ", " activate "), { b: this._card(p.card) }, "."], { prio: 0, at: () => this._at(p.seat) });
      case "recycled":
        return this.say([N(p.seat), v(p.seat, " recycles ", " recycle "), { b: this._card(p.card) }, p.energy ? ` for +${p.energy} energy.` : "."], { prio: 0, at: () => this._at(p.seat) });
      case "card_destroyed":
        if (!p.zone) return;
        return this.say([{ b: this._card(p.card) }, " is destroyed."], { tone: "danger", prio: 1, essential: p.owner === me, at: () => (p.owner ? this._at(p.owner) : this._cardAt(p.card)) });
      case "card_stolen":
        return this.say([N(p.seat), v(p.seat, " snatches ", " snatch "), { b: this._card(p.card) }, p.from ? " from " : "", p.from ? N(p.from) : "", "."], { tone: "danger", prio: 1, essential: p.from === me, at: () => this._at(p.seat) });
      case "secret_market_opened":
        return this.say(["The sealed vault at century XI opens: relics the Incursion buried, for sale one at a time."], { tone: "good", prio: 1, at: () => this._islandAt(11) });
      case "briefcase_acquired":
        return this.say([N(p.seat), v(p.seat, " gains", " gain") + " a Temporal Briefcase: +1 slot."], { prio: 0, at: () => this._at(p.seat) });
      case "game_over":
        this.hide("turn");
        return this.caption("chapter", [{ b: "Time settles. " }, N(p.winner), v(p.winner, " wins", " win") + "."], { tone: "good", sticky: true, now: true });
      default: return;
    }
  }

  // a decision for ME: name it in the turn box (it stays until I answer) and mark
  // the table as "your move"
  onDecision(req) {
    if (!req || !this.root) return;
    const m = MOVE[req.kind];
    if (!m) return;
    document.body.classList.add("cx-your-move");
    document.body.dataset.cxMove = req.kind;
    this._lastKind = req.kind;
    let head = m[0];
    // the voyage's reach is part of the instruction (the machine's screen shows only the
    // legend of the chart: what is free, what costs, where he holds; cabin.js mirrorCommand)
    if (req.kind === "travel" && req.options && req.options.max)
      head = `Plot your voyage: up to ${req.options.max} ${req.options.max === 1 ? "century" : "centuries"}`;
    if (req.kind === "allocate") {
      const n = ((req.private && req.private.dice) || (req.options && req.options.dice) || []).length;
      if (n) head = `Place your ${n} dice on the machine`;
    }
    // a target's own words from the server (e.g. who the item can reach) say the how;
    // the docket at the place only names the item, so the instruction is said once
    let how = m[1];
    const o = req.options || {};
    if (/target$/.test(req.kind) && typeof o.prompt === "string" && o.prompt) how = o.prompt;
    const parts = [{ b: head }];
    if (how) parts.push(", " + how);
    if (m[2]) parts.push("  ", { key: m[2] });
    // not in view? say where it is and which key takes me there, unless HELA's eye
    // already points there with its arrow and key (game.showBeacon): one instruction
    try {
      const g = this.game, cam = g.camera;
      const target = cam && cam.sceneForDecision(req.kind, req.options || req);
      const eyeDirects = document.body.classList.contains("cabin-on") && cam && cam._engaged
        && !!(window.__helaEye && window.__helaEye.direct);
      if (target && target !== cam.scene && !eyeDirects) {
        const where = { market: "the Merchant", drawer: "your records", main: "the desk", timeline: "the chart" }[target];
        const key = g._keyToward(cam.scene, target);
        if (where) parts.push("  ", key ? { key: key + ": " + where } : "(" + where + ")");
      }
    } catch (e) {}
    // the game draws the decision right after this call: if it opened HELA's own decision
    // window, that window is the instruction and the box never appears (yieldTurn)
    setTimeout(() => {
      const g = this.game;
      if (!g || g.pendingReq !== req || document.getElementById("active-prompt")) return;
      this.caption("turn", parts, { tag: "YOUR MOVE", tone: "you", sticky: true, now: true });
    }, 0);
  }
  // a decision window of HELA's own (game.showPrompt) is the instruction: the YOUR MOVE box
  // would repeat it, so it steps aside until the next decision
  yieldTurn() {
    const s = this.slots.turn;
    if (s && s.classList.contains("cx-you")) this.hide("turn");
  }
  onRespond() {
    this.clearPreview();
    document.body.classList.remove("cx-your-move");
    delete document.body.dataset.cxMove;
    const s = this.slots.turn;
    if (s && s.classList.contains("cx-you")) this.hide("turn");
    // sealed dice: say plainly that the table now waits for the others
    if (this._lastKind === "allocate")
      this.caption("turn", [{ b: "Your dice are sealed." }, " Waiting for the other travelers to seal theirs."],
        { tag: "WAITING", tone: "wait", sticky: true, now: true });
    this._lastKind = null;
  }

  /* ---- KEYBOARD: Enter confirms, P passes, Z undoes a die, F skips the replay.
     (L, HELA's memory, lives with the memory book in cabin.js.) Only while the game
     screen is up and nothing is being typed; each key does exactly what the
     on-screen control would. ---- */
  _key(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const sg = document.getElementById("screen-game");
    if (!sg || !sg.classList.contains("is-active")) return;
    const t = e.target || {};
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName || "") || t.isContentEditable) return;
    const g = this.game, req = g && g.pendingReq;
    const key = (e.key || "").toLowerCase();
    // F: skip the replay, the queued events race to the present (never past a decision)
    if (key === "f" && g && !req && (g.busy || g.queue.length)) {
      e.preventDefault();
      g._skip = true; document.body.classList.add("cx-skipping");
      try { window.__heraldSkip && window.__heraldSkip(); } catch (err) {}
      this._killGrid();
      if (this.hitEl) { this.hitEl.remove(); this.hitEl = null; }
      this.caption("chapter", [{ b: "SKIPPING" }, " to the present..."], { tag: "F", now: true });
      return;
    }
    if (!req) return;
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
}

export const comic = new Comic();
