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
import { roman } from "./util.js?202609261413";

const MAX_HITS = 3;
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

class Comic {
  constructor() {
    this.game = null;
    this.root = null;
    this.slots = {};
    this.hits = [];
    this.frameEl = null;
    this.stripEl = null;
    this.story = [];
    this._t = {};
  }

  init(game) {
    this.game = game;
    if (this.root || typeof document === "undefined") return;
    const r = document.createElement("div");
    r.id = "cx-root";
    r.setAttribute("aria-live", "polite");
    for (const k of ["turn", "event"]) {
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
  caption(slot, parts, opts = {}) {
    const s = this.slots[slot];
    if (!s) return;
    if (slot === "event") this._remember(parts, opts.tone);   // the strip keeps it even unseen
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
      const e = document.createElement(p.name != null ? "span" : p.key != null ? "kbd" : "b");
      if (p.name != null) {
        e.className = "cx-name";
        e.textContent = p.name === this._me() ? "You" : String(p.name);
        e.style.setProperty("--seat", this._col(p.name));
      } else e.textContent = String(p.key != null ? p.key : p.b);
      body.appendChild(e);
    }
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
  onEvent(kind, p) {
    if (!p || !this.root) return;
    const N = (s) => ({ name: s });
    const me = this._me();
    // verbs agree with "You" when the subject is me: v(p.seat, "delivers", "deliver")
    const v = (seat, third, second) => (seat === me ? second : third);
    switch (kind) {
      case "phase_started": {
        if (p.invalid_allocation) return;
        const ph = PHASE[p.phase]; if (!ph) return;
        const hour = this.game && this.game.view ? this.game.view.hour : "";
        this.caption("turn", [{ b: ph[0] + (p.solo ? " (SOLO)" : "") }, "  " + ph[1]],
          { tag: "HOUR " + hour, ms: p.solo ? 1800 : 2600, big: true });
        return;
      }
      case "allocations_revealed":
        return this.caption("event", ["The machines are revealed. Watch what each module does."], { ms: 2400 });
      case "paradox_resolved": {
        const hits = (p.hits || []).filter((h) => h.damage);
        if (!hits.length) return;
        const parts = [{ b: "PARADOX! " }];
        hits.forEach((h, i) => { parts.push(i ? ", " : "", N(h.seat)); });
        const d = hits[0].damage, same = hits.every((h) => h.damage === d);
        parts.push(same ? ` lose ${d} energy.` : " lose energy.");
        this.caption("event", parts, { tone: "danger", ms: 3400 });
        hits.slice(0, 3).forEach((h, i) => {
          const r = this._seatRect(h.seat);
          if (r || h.seat === me) setTimeout(() => this.impact("paradox", r, { big: h.seat === me, sub: `-${h.damage}` }), i * 260);
        });
        return;
      }
      case "exploded":
        this.caption("event", p.seat === me ? [{ b: "BOOM! " }, "Your motor hit 12 heat: -2 energy, and you sit out the rest of this Hour."]
          : [{ b: "BOOM! " }, N(p.seat), "'s motor hit 12 heat: -2 energy, out for the rest of this Hour."],
          { tone: "danger", ms: 3400 });
        this.impact("boom", this._seatRect(p.seat), { big: true });
        return;
      case "terminated":
        this.caption("event", [N(p.seat), v(p.seat, " is", " are") + " TERMINATED", p.by ? " by " : "", p.by ? N(p.by) : "", v(p.seat, ". Their gear is recycled; they restart at XXX.", ". Your gear is recycled; you restart at XXX.")],
          { tone: "danger", ms: 3800 });
        this.impact("terminated", this._seatRect(p.seat), { big: p.seat === me || !!this._seatRect(p.seat), sub: "TERMINATED" });
        return;
      case "respawned":
        return this.caption("event", [N(p.seat), v(p.seat, " returns", " return") + ` at XXX with ${p.energy} energy.`], { ms: 2800 });
      case "delivered": {
        this.caption("event", [N(p.seat), v(p.seat, " delivers ", " deliver "), { b: this._card(p.card) }, ` to century ${roman(p.century)}.`],
          { tone: "good", ms: 3400 });
        let r = null;
        try { r = window.__seaIslandRect && window.__seaIslandRect(p.century); } catch (e) {}
        if (r && r.width != null) r = this._onScreenRect(r);
        const k2 = this._k();
        setTimeout(() => this.impact("deliver", r || this._seatRect(p.seat), { big: p.seat === me }), Math.round(700 * k2));
        return;
      }
      case "traveled": {
        const up = p.to < p.from;
        if (p.to === 0) this.impact("yearzero", null, { big: true, sub: "THE MATCH ENDS" });
        return this.caption("event", [N(p.seat), v(p.seat, " sails", " sail") + ` ${roman(p.from)} → ${roman(p.to)}`, up ? " (toward Year Zero)." : "."], { ms: 2400 });
      }
      case "merchant_moved":
        return this.caption("event", ["The Merchant makes port at ", { b: roman(p.to) }, p.teleport ? " (a temporal leap)." : "."], { ms: 2600 });
      case "card_bought":
        if (p.stolen) {
          const r = this._seatRect(p.seat);
          if (r) this.impact("steal", r, {});
          this.caption("event", [N(p.seat), v(p.seat, " STEALS ", " STEAL "), { b: this._card(p.card) }, v(p.seat, " from the Merchant, and is now Wanted.", " from the Merchant, and are now Wanted.")], { tone: "danger", ms: 3400 });
        } else {
          this.caption("event", [N(p.seat), v(p.seat, " buys ", " buy "), { b: this._card(p.card) }, p.cost ? ` for ${p.cost} gold.` : "."], { ms: 2600 });
        }
        return;
      case "card_renewed":
        return this.caption("event", [N(p.seat), v(p.seat, " renews", " renew") + " the Merchant's stock."], { ms: 2200 });
      case "declared":
        return this.caption("event", [N(p.seat), v(p.seat, " declares their goods.", " declare your goods.") + " Wanted is cleared."], { ms: 2600 });
      case "wanted": {
        const r = this._seatRect(p.seat);
        if (r) this.impact("wanted", r, { sub: "BOUNTY 4 GOLD" });
        return this.caption("event", [N(p.seat), v(p.seat, " is WANTED. 4 gold to whoever terminates them.", " are WANTED. 4 gold to whoever terminates you.")], { tone: "danger", ms: 3600 });
      }
      case "milestone":
        return this.caption("event", [N(p.seat), v(p.seat, " reaches", " reach") + ` century ${roman(p.century)}: a milestone, +1 contract point.`], { tone: "good", ms: 3000 });
      case "reward_resolved": {
        const r = this._seatRect(p.seat);
        if (r) this.impact("contract", r, { big: p.seat === me });
        return this.caption("event", [N(p.seat), v(p.seat, " signs", " sign") + ` a ${p.category} contract.`], { tone: "good", ms: 2600 });
      }
      case "activated":
        return this.caption("event", [N(p.seat), v(p.seat, " activates ", " activate "), { b: this._card(p.card) }, "."], { ms: 2400 });
      case "recycled":
        return this.caption("event", [N(p.seat), v(p.seat, " recycles ", " recycle "), { b: this._card(p.card) }, p.energy ? ` for +${p.energy} energy.` : "."], { ms: 2400 });
      case "card_destroyed":
        if (!p.zone) return;
        return this.caption("event", [{ b: this._card(p.card) }, " is destroyed."], { tone: "danger", ms: 2600 });
      case "card_stolen":
        return this.caption("event", [N(p.seat), v(p.seat, " snatches ", " snatch "), { b: this._card(p.card) }, p.from ? " from " : "", p.from ? N(p.from) : "", "."], { tone: "danger", ms: 2800 });
      case "secret_market_opened":
        return this.caption("event", ["The Secret Market opens at century XI."], { tone: "good", ms: 3000 });
      case "briefcase_acquired":
        return this.caption("event", [N(p.seat), v(p.seat, " gains", " gain") + " a Temporal Briefcase: +1 slot."], { ms: 2600 });
      case "game_over":
        this.hide("turn");
        return this.caption("event", [N(p.winner), v(p.winner, " wins", " win") + " the match."], { tone: "good", sticky: true });
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
    this.caption("turn", parts, { tag: "YOUR MOVE", tone: "you", ms: 4200 });
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
      this.caption("turn", [{ b: "SKIPPING" }, " to the present..."], { tag: "F", ms: 1400 });
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
    document.body.classList.remove("cx-your-move");
    delete document.body.dataset.cxMove;
    const s = this.slots.turn;
    if (s && s.classList.contains("cx-you")) this.hide("turn");
  }
}

export const comic = new Comic();
