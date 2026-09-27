/* =========================================================================
   game.js, the live board: rendering, decisions, and animations
   -------------------------------------------------------------------------
   Consumes the server protocol (state / event / decision_request) and renders
   the BGA-style table: a slim Timeline strip up top, Market (left), Operations
   Log (centre), the Time Machine matrix (lower-left corner) with a dedicated
   Causality-Generators cockpit beside it, and player panels (right).

   Allocation is SIMULTANEOUS (Paradoxo §12.2): every player places their four
   generators at the same time, confirms inline in the cockpit, then waits for
   the others before all matrices reveal together. Dice support both drag-drop
   and click-to-place. Visual identity per styles/app.css.
   ========================================================================= */
import { icon } from "./icons.js?202609271103";
import { audio } from "./audio.js?202609271103";
if (typeof window !== "undefined") window.__audio = audio;
import { juice } from "./juice.js?202609271103";
import { comic } from "./comic.js?202609271103";
import { fx } from "./fx.js?202609271103";
import { CatEngine } from "./cat.js?202609271103";
import { tutorials } from "./tutorial.js?202609271103";
import { profile } from "./profile.js?202609271103";
import { Camera } from "./camera.js?202609271103";
import {
  PALETTE, ERAS, FUNCTIONS, CENTURY_MAX, MILESTONES, SECRET_MARKET,
  roman, centuryToPct, seatColor, initials, el, eraColor, eraName, esc, setHelaColour,
} from "./util.js?202609271103";

// The Auction is phase 1 of the normal turn, not a separate mode: a dimensional
// window that comes before Delivery the way Delivery comes before Market. So it
// leads the list, on the same track HELA lights at the top of the screen.
// why an item has nothing to aim at, by its targeting kind (server/driver.py ACTIVE_TARGET)
const NO_TARGET = {
  traveler_synchronic: "no one in your century",
  traveler_same_era: "no one in your era",
  century_same_era: "no century in reach",
  receptor_active: "no active relic in your receptor",
  fishing_rod: "no Merchant relic costs 3 gold or less",
  market_revealed: "the Merchant shows no relics",
  recycled_card: "no recycled relic to take",
  equipped_other: "no other traveler holds an item",
};

const PHASES = [
  ["leilao", "Auction"], ["delivery", "Delivery"], ["market", "Market"],
  ["main", "Generators"], ["activation", "Activation"],
];

// The three delivery periods (§11.1b), deliver into all three to stabilise time.
// Each spans two eras; colour drawn from the period's earlier era band.
const RECEPTOR_PERIODS = [
  { key: "Origins", color: "#8a6a3c", eras: "Antiquity · High M.A." },
  { key: "Ascension", color: "#3c7a64", eras: "Low M.A. · Modern" },
  { key: "Singularity", color: "#5b4c8a", eras: "Contemporary · Timeless" },
];

// The 3 reward-contract categories (§23.1). Mirrors promptReward's INFO so the
// drawer can show them as readable, always-open contract folders (COMPOSITION §5).
const REWARD_CONTRACTS = [
  { key: "Chaos", color: "#7a3c63", outcomes: [
    ["I", "Paradox, every other traveler loses 3 energy."],
    ["II", "Destroy a card, Market or a rival's equipment."],
    ["III", "Relocate the Merchant to any century except Year Zero."]] },
  { key: "Time", color: "#3c5f7a", outcomes: [
    ["I", "Solo-phase voucher, an extra solo Generators phase."],
    ["II", "Market voucher, act in the Market regardless of synchrony."],
    ["III", "Item voucher, an extra item-activation window."]] },
  { key: "Resource", color: "#6f7a3c", outcomes: [
    ["I", "+3 energy and +3 gold."],
    ["II", "Steal a revealed Merchant card."],
    ["III", "Permanent +1 buff to one Time Machine module."]] },
];

// Signature FX: flagship cards get a visual tell when they activate
// (flare / glint / ripple, see juice.signature).
const CARD_FX = {
  // art and treasure, golden flares
  "Mona Lisa":                   { kind: "flare",  hue: 45,  count: 14, size: 8 },
  "Excalibur":                   { kind: "flare",  hue: 50,  count: 16, size: 9 },
  "Prince Dracula's Chalice":    { kind: "flare",  hue: 355, count: 12, size: 8 },
  "Porcelain":                   { kind: "flare",  hue: 200, count: 10, size: 6 },
  // weapons, red glints
  "Attila's Sword":              { kind: "glint",  hue: 8,   count: 14, size: 9 },
  "Fire Lance":                  { kind: "glint",  hue: 22,  count: 16, size: 9 },
  "Queen Anne's Revenge Cannon": { kind: "glint",  hue: 4,   count: 18, size: 10 },
  "Laser Sword":                 { kind: "glint",  hue: 120, count: 14, size: 9 },
  // instruments and navigation, teal ripples
  "Alan Turing's Machine":       { kind: "ripple", hue: 172 },
  "Astrolabe":                   { kind: "ripple", hue: 190 },
  "Navigation Compass":          { kind: "ripple", hue: 165 },
  "Window of Time":              { kind: "ripple", hue: 178 },
  // tech, violet glints
  "Thomas Edison's Lamp":        { kind: "glint",  hue: 52,  count: 16, size: 9 },
  "Quantum Computer":            { kind: "glint",  hue: 265, count: 16, size: 8 },
  "Tesla's AC Motor":            { kind: "glint",  hue: 275, count: 18, size: 8 },
  "Harald's Bluetooth":          { kind: "ripple", hue: 210 },
};

// Card-pick zones that live visibly on the board (the Wagon, the Secret bay, the
// player panels). Candidates from anywhere else (recycled, receptor) use the popup.
const INLINE_ZONES = new Set(["market", "secret", "equipment"]);

// How long each event lingers (ms) before the next, so the turn is legible.
// Scaled by the presentation-speed setting.
const PACE = {
  state: 90, hour_started: 250, phase_started: 750, phase_skipped: 120,
  priority_order: 120, dice_rolled: 420, allocations_revealed: 700,
  module_resolved: 320, recharged: 520, paradox_resolved: 3000, heated: 360,
  exploded: 950, traveled: 1000, overloaded: 360, cp_earned: 600, milestone: 700,
  delivered: 850, card_bought: 520, card_renewed: 480, declared: 400,
  clean_up: 620,
  merchant_moved: 1300, terminated: 1100, respawned: 500, wanted: 2400,
  reward_resolved: 700, secret_market_opened: 1000, activated: 520,
  recycled: 520, game_over: 0,
};
// Default "normal" is deliberately unhurried so first-time players can follow
// each step; Slow stretches further, Fast is for veterans who know the flow.
// Deliberately unhurried so events are easy to follow; Slow is a big stretch for
// first-timers, Fast stays snappy for veterans.
const SPEED_FACTOR = { slow: 3.2, normal: 1.9, brisk: 1.2, fast: 0.7 };   // Brisk: the theater a third quicker (fx.js PACES)

export class Game {
  constructor(conn, seat) {
    this.conn = conn;
    this.seat = seat;
    this.view = null;
    this.seatIndex = {};
    this.currentPhase = null;
    this.priority = [];
    this.activeSeat = null;
    this.myDice = null;
    this.myLastMatrix = null;
    this.alloc = null;        // interactive allocation state during an allocate decision
    this.selected = null;     // click-to-place: {value, source, r, c, idx}
    this.dragging = null;
    this.awaitingReveal = false;
    this.pendingReq = null;
    this.dom = {
      hour: document.getElementById("hud-hour"),
      phaseTrack: document.getElementById("phase-track"),
      priority: document.getElementById("priority-strip"),
      timeline: document.getElementById("timeline-rail"),
      players: document.getElementById("players-zone"),
      market: document.getElementById("market-body"),
      marketSign: document.getElementById("market-sign"),
      marketMeta: document.getElementById("market-meta"),
      machine: document.getElementById("machine-body"),
      dice: document.getElementById("dice-body"),
      diceMeta: document.getElementById("dice-meta"),
      ruck: document.getElementById("ruck-body"),
      ruckMeta: document.getElementById("ruck-meta"),
      log: document.getElementById("log-list"),
      overlay: document.getElementById("overlay-root"),
    };
    this.cardPop = null;
    this.panelDetail = null;
    this.nameMap = {};       // raw card name -> English display name (for the log)
    this.rolls = [];         // recent non-main causality rolls, for the Ledger panel
    this._contractLog = [];  // signed reward contracts (self, for the drawer)
    this._rewardLog = {};    // per-seat resolved rewards {hour,category,roll} (colors + defers CP)
    this._cpBaseline = {};   // per-seat contract_points at first sight (reload-safe baseline)
    this._drawerOpen = { Origins: false, Ascension: false, Singularity: false, CONTRACTS: false };
    // Paced event queue, events/states play one at a time; a decision waits for
    // its lead-up events to finish before prompting (Paradoxo readability).
    this.queue = [];
    this.busy = false;
    this.pendingDecision = null;
    this.speed = "normal";
    this.renderPhaseTrack();
    this.renderDiceIdle();
    // Camera-scene system (COMPOSITION.md): one fixed board, the camera pans between scenes.
    document.body.classList.add("cam-on");
    this.camera = new Camera(document.getElementById("cam"), this);
    juice.init();
    comic.init(this);   // the comic layer: captions, impact moments, your-move marks
    fx.init(this, comic);   // the comic effects for every rules action, and the pace (fx.js)
    this._initCat();
    (function () {
      var grid = document.querySelector(".game-grid");
      var sg = document.getElementById("screen-game");
      if (grid) {
        ["market-zone", "timeline-rail", "players-zone", "log-zone", "machine-zone", "dice-zone", "rucksack-zone"].forEach(function (id) {
          var q = document.getElementById(id); if (q) grid.appendChild(q);
        });
        if (!document.getElementById("drawer-zone")) {
          var dz = document.createElement("section");
          dz.id = "drawer-zone"; dz.className = "zone drawer-zone panel bracketed";
          dz.innerHTML = '<h3 class="zone-title">Temporal Receptor<span class="zone-title-meta" id="drawer-meta"></span></h3><div class="drawer-body" id="drawer-body"></div>';
          grid.appendChild(dz);
        }
      }
      var tb = document.getElementById("topbar");
      if (tb && sg) sg.appendChild(tb);
    })();
    const _sg = typeof document !== "undefined" ? document.getElementById("screen-game") : null;
    if (_sg) _sg.addEventListener("pointerdown", () => this.camera._engage(), { once: true });
    if (typeof window !== "undefined") window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!_sg || !_sg.classList.contains("is-active")) return;
      const t = e.target || {};
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "") || t.isContentEditable) return;
      // 1/2/3 lift a generator of that value straight into the hand (§ feel)
      if (this.alloc && document.body.classList.contains("allocating")
          && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const v = +e.key;
        if (this.selected && this.selected.source === "pool" && this.selected.value === v) {
          this._endCarry(true);                  // same number again = put it back
          return;
        }
        const idx = this.alloc.pool.findIndex((x) => +x === v);
        if (idx < 0) { audio.play("whiff"); return; }
        this._startCarry(v, "pool", { idx }, null);
        return;
      }
      const cab = document.body.classList.contains("cabin-on");
      const nav = cab
        ? { main: { w: "market", a: "drawer" }, market: { s: "main", a: "drawer" }, drawer: { d: "main", w: "market" } }
        : { main: { w: "market", a: "drawer", d: "timeline" }, market: { s: "main", a: "drawer", d: "timeline" }, drawer: { d: "main", w: "market" }, timeline: { a: "main", w: "market" } };
      const to = (nav[this.camera.scene] || {})[(e.key || "").toLowerCase()];
      if (!to) return;
      this.camera._engage();
      this.camera.setScene(to);
      this.camera._manualUntil = this.camera._now() + 6000;
      this.updateBeacon();   // arrived somewhere, re-point or clear the beacon
      this._onSceneArrive(to);
    });
    // TAB = the deepest info rung (Bazaar's click-to-inspect): the manopla legend,
    // on demand, dimming the world. ESC closes it. Only in the cabin.
    if (typeof window !== "undefined") window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!_sg || !_sg.classList.contains("is-active")) return;
      if (!document.body.classList.contains("cabin-on")) return;
      const t = e.target || {};
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "") || t.isContentEditable) return;
      if ((e.key || "").toLowerCase() === "t") { e.preventDefault(); this._manoHelpToggle(); return; }
      if (e.key === "Escape" && this._manoHelpOn) { e.preventDefault(); this._manoHelpToggle(false); }
    });
    // If the tab was backgrounded (timers throttled), catch up the moment it returns.
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", () => this._drain());
  }

  // Map a century to a musical era, far future (high) is tense/technological,
  // travelling back fades to primordial (Year Zero end).
  eraKeyForCentury(c) {
    if (c >= 24) return "future";
    if (c >= 19) return "contemporary";
    if (c >= 14) return "modern";
    if (c >= 8) return "medieval";
    if (c >= 3) return "ancient";
    return "primordial";
  }


  setSpeed(s) { if (SPEED_FACTOR[s]) { this.speed = s; try { fx.applyPace(); } catch (e) {} } }
  // Pacing is purely cosmetic: it must NEVER delay a decision or stall a player.
  // It collapses to zero when a decision is waiting, the tab is backgrounded
  // (browsers throttle setTimeout there, this stranded non-host players), or the
  // queue has backed up. Zero-delay sleeps resolve on a microtask, which is not
  // throttled in background tabs, so a hidden client always catches up instantly.
  _ms(kind) {
    if (this.pendingDecision || this._skip) return 0;
    if (typeof document !== "undefined" && document.hidden) return 0;
    if (this.queue.length > 6) return 0;
    return (PACE[kind] ?? 200) * SPEED_FACTOR[this.speed];
  }
  _sleep(ms) {
    if (this._skip) ms = Math.min(ms, 20);   // SKIP (F): the replay races to the present
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
  }
  // Speed multiplier for direct (non-queue) animations like the Merchant journey
  // and the dice roll, so they honour the Slow/Normal/Fast setting too.
  _scale() { return SPEED_FACTOR[this.speed] || 1; }
  // Motion multiplier for the card-flight engine, honours Slow/Normal/Fast but
  // stays snappier than event lingers (a flying card should feel light, not slow).
  _motion() { return ({ slow: 1.5, normal: 1.0, brisk: 0.85, fast: 0.7 })[this.speed] || 1; }
  // one step of the resolution theater at this pace (Normal's length in; Slow about
  // twice it, Brisk about a third quicker; Fast skips the theater itself)
  _beat(ms) { return Math.round(ms * (({ slow: 2, normal: 1, brisk: 0.7, fast: 0.6 })[this.speed] || 1)); }

  /* ---- message intake: route everything through the paced queue ---- */
  onMessage(kind, msg) {
    if (kind === "decision") { this.pendingDecision = msg; this._drain(); return; }
    this.queue.push({ kind, msg });
    this._drain();
  }

  async _drain() {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.queue.length) {
        const { kind, msg } = this.queue.shift();
        // A single bad frame must never freeze the whole queue (which would
        // strand the next decision and lock a player out, the non-host bug).
        try {
          if (kind === "event") {
            // a Temporal Herald edition that opened by itself stays until clicked, and
            // the replay waits behind it (not while skipping); it resumes on the click
            if (!this._skip && window.__heraldWait) { const w = window.__heraldWait(); if (w) await w; }
            await this.playEvent(msg);
          } else {                   // state
            this.applyState(msg.view);
            try { fx.heatSync(); } catch (e) {}   // the motor's heat marks follow the state (fx.js)
            await this._sleep(this._ms("state"));
          }
        } catch (err) {
          console.error("Paradoxo: error processing", kind, msg, err);
        }
      }
    } finally {
      this.busy = false;
      if (this._skip) { this._skip = false; document.body.classList.remove("cx-skipping"); }
    }
    // Hold the curtain: if the sea chart is mid-presentation (voyage scrawls,
    // monster strikes), let it finish before a decision pulls the camera.
    // Hard-capped so a stuck flag can never lock the game.
    for (let w = 0; w < 80 && window.__seaPresenting && window.__seaPresenting(); w++)
      await this._sleep(150);
    // Lead-up finished, now prompt for any waiting decision.
    if (this.pendingDecision) {
      const d = this.pendingDecision; this.pendingDecision = null;
      try { this.onDecision(d); } catch (err) {
        console.error("Paradoxo: decision error", d, err);
        // A throw here used to leave the request with no control at all: the match
        // stood still forever. Draw the plain fallback so it can still be answered.
        try { this._rescueDecision(d); } catch (err2) { console.error("Paradoxo: rescue failed", d, err2); }
      }
    }
  }

  // LAST RESORT when the normal path for a decision threw: a plain popup with one
  // button per legal answer, built only from the request's own options.
  _rescueDecision(req) {
    if (!req || req.kind === "allocate" || req.kind.startsWith("leilao_")) return;
    this.pendingReq = req; this.activeSeat = req.seat;
    this.selectReq = null; this.secretDeal = null; this.marketReq = null;
    const o = req.options || {}, k = req.kind, acts = [];
    const add = (label, data) => acts.push({ label, onClick: () => this.respond(data) });
    const nm = (c) => (c && (c.display_name || c.name)) || "?";
    const pick = (key, c) => (c.owner ? { [key]: c.name, owner: c.owner } : { [key]: c.name });
    if (k === "market") add("Pass", { action: "pass" });
    else if (k === "activation") add("Pass", { activations: [] });
    else if (k === "deliver") add("Skip", { deliver: [] });
    else if (k === "reward_category") (o.categories || []).forEach((c) => add(c, { category: c }));
    else if (k === "destroy_target" || k === "steal_target")
      (o.candidates || []).forEach((c) => add(nm(c), pick("card", c)));
    else if (k === "target")
      (o.candidates || []).forEach((c) => (c.century != null
        ? add(roman(c.century), { choice: c.century }) : add(nm(c), pick("choice", c))));
    else if (k === "merchant_century") (o.centuries || []).forEach((c) => add(roman(c), { century: c }));
    else if (k === "matrix_buff") (o.modules || []).forEach((m) => add(`Module ${m + 1}`, { module: m }));
    else if (k === "capacity") {
      if (o.room) { add("Take", { take: true }); add("Decline", { take: false }); }
      else { (o.recycle_choices || []).forEach((c) => add(`Recycle ${nm(c)}`, { recycle: c.name }));
        add("Decline", { recycle: null }); }
    } else if (k === "secret_deal") { if (o.affordable !== false) add("Take", { take: true }); add("Pass", { take: false }); }
    else if (k === "travel") add("Stay", { direction: 1, distance: 0 });
    else if (k === "recycle") add("Skip", { recycle: [] });
    else { this.respond({}); return; }
    this.showPrompt({ title: "Choose", sub: req.prompt || "", actions: acts });
  }

  begin(room) {
    room.seats.forEach((s, i) => { this.seatIndex[s.name] = i; });
  }

  colorOf(name) {
    // The colour is the player's own pick. The lobby carries the colour each player
    // chose in the profile (the server settles clashes), so the whole table sees the
    // same person in the same colour. With no pick, it falls back to seat order.
    if (name === this.seat && window.__pdxThemeColour) { const tc = window.__pdxThemeColour(); if (tc) return tc; }   // MY colour theme (theme.js), on my screen
    const picked = this._seatColours && this._seatColours[name];
    if (picked != null) return seatColor(picked);
    if (!(name in this.seatIndex)) this.seatIndex[name] = Object.keys(this.seatIndex).length;
    return seatColor(this.seatIndex[name]);
  }

  /** Guarda as cores escolhidas no lobby (chamado quando a sala chega). */
  learnSeatColours(room) {
    if (!room || !room.seats) return;
    this._seatColours = this._seatColours || {};
    room.seats.forEach((s) => {
      if (s && s.name && Number.isInteger(s.colour)) this._seatColours[s.name] = s.colour;
    });
    // which seats are bots (the comic layer lets only bots speak up, comic.js rivalSay)
    this._bots = new Set(room.seats.filter((s) => s && s.kind === "bot" && s.name).map((s) => s.name));
  }

  /* ====================== STATE -> FULL RENDER ======================== */
  applyState(view) {
    // UNIVERSAL RESOLUTION LAW: every life change from ANY source reads
    // per-unit. The theater ticks its own chapters and leaves a note of where it
    // landed; anything else that moved arrives here and gets its slow count too.
    try {
      const prevTr = this.view && this.view.travelers;
      if (prevTr && view && view.travelers && document.body.classList.contains("cabin-on") && this.speed !== "fast") {
        const pending = [];
        for (const nt of view.travelers) {
          const ot = prevTr.find((x) => x.name === nt.name);
          if (!ot || nt.energy === ot.energy) continue;
          const expected = this._tickedTo && this._tickedTo[nt.name];
          if (expected === nt.energy) { delete this._tickedTo[nt.name]; continue; }   // the theater already sang this
          pending.push({ seat: nt.name, from: ot.energy, delta: nt.energy - ot.energy });
        }
        // the re-render inside this call REPLACES the badge nodes, start the count
        // AFTER it, rolling the fresh numeral back to where it came from
        if (pending.length) setTimeout(() => {
          for (const p2 of pending)
            this._tickLife(p2.seat, p2.delta, p2.delta > 0 ? "energy" : "danger", { from: p2.from });
        }, 40);
      }
    } catch (e) {}
    // every state re-render rebuilds the badges, repaint the registry after
    setTimeout(() => { try { this._paintBadgeAllocs(); this._markBornCards(); } catch (e) {} }, 0);

    // ═══ ONE COLOUR PER SEAT, EVERYWHERE ══════════════════════════════════════════
    // The status colour did not match the badge colour, which made rivals easy to lose
    // track of. It was real: there were FOUR
    // palettes and TWO independent index assignments:
    //     the badge     PALETTE = [amber, teal, violet, green, ...]  indexed by seatIndex
    //     the charts    FIXCOL  = {r0: blue, r1: purple, r2: orange, ...} indexed by
    //                             rivalKeys, a SEPARATE first-seen counter, per board
    // Different hues AND a different order. The badge and the map could never agree, and
    // no amount of squinting was going to fix that. Colour is a LABEL, never decoration:
    // a label that disagrees with itself is worse than no label.
    // The game owns the seat colour now; every chart asks.
    if (!window.__seatColor) window.__seatColor = (n) => this.colorOf(n);
    // YOUR dice wear YOUR colour, the var the dice CSS drinks from
    try { if (this.seat) document.documentElement.style.setProperty("--self-col", this.colorOf(this.seat)); } catch (e) {}
    // HELA wears MY colour, the same one my piece wears on the map (util.js setHelaColour)
    try { if (this.seat) setHelaColour(this.colorOf(this.seat)); } catch (e) {}
    try { window.__helaLogHead && window.__helaLogHead(); } catch (e) {}
    this.view = view;
    if (view.mode === "leilao" && !this.dom.phaseTrack.querySelector('[data-phase="leilao"]')) this.renderPhaseTrack();
    view.travelers.forEach((t, i) => { if (!(t.name in this.seatIndex)) this.seatIndex[t.name] = i; });
    view.travelers.forEach((t) => { if (this._cpBaseline[t.name] === undefined) this._cpBaseline[t.name] = t.contract_points || 0; });
    if (!this._skinSet) {
      const meSkin = view.travelers.find((t) => t.name === this.seat);
      const rail = this.dom.timeline;
      if (meSkin && rail) {
        this._skinSet = true;
        rail.classList.add("skin-ready");   // skin decided -> the Sea may reveal (kills the boot flash)
        const sk = this._skinForCentury(meSkin.century);
        if (sk) rail.classList.add(sk);     // "" = Ascension -> the default Sea shows
      }
    }
    if (!this._introShown) {
      this._introShown = true;
      requestAnimationFrame(() => {
        document.body.classList.add("game-intro");
        if (!this._reducedMotion()) { try { audio.play("pan"); } catch (e) {} }
        setTimeout(() => document.body.classList.remove("game-intro"), 2100);
      });
    }
    // Keep a name->English map current for log lines referencing cards by name.
    (view.market_revealed || []).forEach((c) => { if (c.display_name) this.nameMap[c.name] = c.display_name; });
    view.travelers.forEach((t) => (t.equipment || t.hand || []).forEach((c) => {
      if (c.display_name) this.nameMap[c.name] = c.display_name;
    }));
    this.dom.hour.textContent = view.hour;
    // Shift the music to match the era the player's own traveler stands in.
    const me = view.travelers.find((t) => t.name === this.seat);
    if (me && me.century !== this._musicCentury) {
      this._musicCentury = me.century;
      audio.setEra(this.eraKeyForCentury(me.century));
    }
    this.updateMusicMood(view);
    this._syncAtmosphere(view, me);
    this._syncGeneratorState(me);
    if (window.__room && window.__room.updateTimeline && this.view)
      window.__room.updateTimeline({
        travelers: (this.view.travelers || []).map((t) => ({
          name: t.name, century: t.century, color: this.colorOf(t.name) })),
        merchant: this.view.merchant_century,
      });
    this.renderPlayers();
    // THE MARKET AND THE DRAWER ARE REBUILT ONLY WHEN WHAT THEY SHOW CHANGED. Every state
    // message rebuilt both from scratch, and the rebuilt regions then had to be restyled,
    // repainted and re-rastered, most of the time into exactly the picture they had.
    // Direct calls elsewhere still always render (renderMarket clears the memo itself).
    const mSig = this._marketSig();
    if (mSig !== this._mktSig) { this.renderMarket(); this._mktSig = mSig; }
    this.renderRucksack();
    if (!this.alloc) { this.renderMachineIdle(); this.renderDiceIdle(); }
    this.renderPriority();
    const dSig = this._drawerSig();
    this._drawerRebuilt = dSig !== this._drwSig;
    if (this._drawerRebuilt) { this.renderDrawer(); this._drwSig = dSig; }
    this._rearmDecisionSurface();
  }

  // The renders above rebuild the drawer, the player sheets and the idle matrix
  // from scratch, which dropped the marks and click handlers a pending decision had
  // put on them. A state that lands while the decision waits (the player dropped a
  // voucher in the slot or recycled a card) left the reward contracts, the traveler
  // sheets or the buff cells with nothing to click, and the match stood still.
  // Put the live decision's surface back on the fresh nodes.
  // A stable number per decision request: every memoised surface below keys on it, so a
  // new or answered decision always rebuilds what it had marked.
  _reqKey() {
    const r = this.pendingReq;
    if (!r) return 0;
    this._reqIds = this._reqIds || new WeakMap();
    if (!this._reqIds.has(r)) this._reqIds.set(r, (this._reqSeq = (this._reqSeq || 0) + 1));
    return this._reqIds.get(r);
  }
  _selSig() {
    const s = this.selectReq;
    return s ? s.mode + ":" + JSON.stringify(s.byName || {}) : "";
  }
  _marketSig() {
    const v = this.view || {};
    const pick = (o) => (o === undefined ? null : o);
    try {
      return JSON.stringify([v.market_revealed, v.market_access, v.merchant_century, v.merchant_movement_dice,
        v.merchant_last_move, v.merchant_card_count, v.secret_market_open, pick(v.secret_market_current),
        v.secret_market_card_count, this._self() || null, this._reqKey(), this.marketMode || null,
        this._selSig(), pick(this.secretDeal), !!this._secretOpening, !!this._secretRevealing,
        pick(this._signState), !!this._pendingSignDrop, !!this._signAnimating, (this.rolls || []).length,
        !!this.marketReq]);
    } catch (e) { return Math.random(); }
  }
  _drawerSig() {
    try {
      return JSON.stringify([this._self() || null, this._reqKey(), this._drawerOpen || null,
        this._horrorFloor || null, this.camera && this.camera.scene]);
    } catch (e) { return Math.random(); }
  }

  _rearmDecisionSurface() {
    const req = this.pendingReq;
    if (!req) return;
    try {
      const o = req.options || {};
      if (req.kind === "reward_category") { if (this._drawerRebuilt !== false) this._rewardInDrawer(req); }
      else if (req.kind === "matrix_buff") this._buffOnMatrix(req, true);
      else if (req.kind === "target" && o.target_type === "traveler"
               && this._sheetsReq === req) this._travelerOnSheets(req);
    } catch (err) {
      console.error("Paradoxo: could not re-arm the decision surface", req, err);
    }
  }

  // ---- The Delivery Drawer (temporal receptor made physical) ------------
  // COMPOSITION §2.5: a physical archival drawer. Century folders are grouped by
  // the 3 receptor PERIODS (Origins / Ascension / Singularity); a folder "fills"
  // when the local traveler has delivered an item at that century, and a period
  // stabilises when it is covered (delivered_periods). Plus the 3 reward-contract
  // folders, readable anytime (§5). Presentation only, reads the self traveler
  // from the view; no ingest change, and the host only exists under body.cam-on.
  renderDrawer() {
    this._drwSig = undefined;   // a direct call always renders; applyState re-keys it
    const body = document.getElementById("drawer-body");
    if (!body) return;
    const me = this._self() || {};
    const delivered = me.delivered_periods || [];
    const rcards = me.receptor_cards || [];
    const here = me.century;
    const byCentury = {};
    rcards.forEach((c) => { (byCentury[c.delivery_century] = byCentury[c.delivery_century] || []).push(c); });
    const eraIdx = (c) => { for (let i = 0; i < ERAS.length; i++) { const a = ERAS[i][0], b = ERAS[i][1]; if (c >= a && c <= b) return i; } return -1; };
    const periodIdx = (c) => { const i = eraIdx(c); return i < 0 ? -1 : Math.floor(i / 2); };

    const cells = RECEPTOR_PERIODS.map((p, pi) => {
      const done = delivered.includes(p.key);
      let folders = "", filledCount = 0;
      for (let c = 1; c <= CENTURY_MAX; c++) {
        if (periodIdx(c) !== pi) continue;
        const cards = byCentury[c] || [];
        const filled = cards.length > 0;
        if (filled) filledCount++;
        const names = cards.map((x) => this.dn(x)).join(", ");
        const tip = filled ? roman(c) + ", " + names: roman(c) + " · " + eraName(c) + ", empty";
        folders +=
          '<span class="drw-folder' + (filled ? " filled" : "") + (c === here ? " here" : "") +
          '" style="--era:' + eraColor(c) + '" title="' + tip + '" role="listitem" tabindex="0" aria-label="' + tip + '">' +
          '<i class="fold-body"></i>' +
          (filled ? '<i class="fold-doc"></i>' : "") +
          '<b class="fold-tab">' + roman(c) + "</b></span>";
      }
      const open = !!this._drawerOpen[p.key];
      return '<section class="cab2-cell' + (open ? " open" : "") + (done ? " done" : "") + '" data-drawer="' + p.key + '" style="--era:' + p.color + '">' +
        '<div class="cab2-inner"><div class="cab2-files" role="list">' + folders + "</div></div>" +
        '<button type="button" class="cab2-front" aria-expanded="' + open + '">' +
        '<span class="cab2-plate"><b>' + p.key + "</b><i>" + p.eras + "</i></span>" +
        '<span class="cab2-knob"></span>' +
        '<span class="cab2-count">' + filledCount + "/" + (pi === 2 ? 11 : pi === 1 ? 9 : 10) + (done ? " ✓" : "") + "</span>" +
        "</button></section>";
    }).join("");

    const signed = this._contractLog || [];
    const subs = { Chaos: "MANDATE", Time: "WRIT", Resource: "DEED" };
    const papers = REWARD_CONTRACTS.map((rc) => {
      const n = signed.filter((r) => r.category === rc.key).length;
      return '<button type="button" class="ct-paper ct-' + rc.key.toLowerCase() + '" data-cat="' + rc.key +
        '" title="' + rc.key + ' contract, click to read">' +
        '<b class="ctp-title">' + rc.key.toUpperCase() + "</b>" +
        '<i class="ctp-seal"></i>' +
        '<span class="ctp-sub">' + (subs[rc.key] || "CONTRACT") + "</span>" +
        (n ? '<span class="ctp-n">×' + n + "</span>" : "") + "</button>";
    }).join("");
    const openC = !!this._drawerOpen.CONTRACTS;
    const contractsCell =
      '<section class="cab2-cell cab2-contracts' + (openC ? " open" : "") + '" data-drawer="CONTRACTS">' +
      '<div class="cab2-inner"><div class="cab2-files ct-files">' + papers + "</div></div>" +
      '<button type="button" class="cab2-front" aria-expanded="' + openC + '">' +
      '<span class="cab2-plate"><b>CONTRACTS</b><i>C.R.O.N.O.S. REWARDS</i></span>' +
      '<span class="cab2-knob"></span>' +
      '<span class="cab2-count">' + signed.length + "</span>" +
      "</button></section>";

    body.innerHTML = '<div class="cab2">' + cells + contractsCell + "</div>";

    body.querySelectorAll(".cab2-front").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cell = btn.closest(".cab2-cell");
        const key = cell.getAttribute("data-drawer");
        const open = !cell.classList.contains("open");
        this._drawerOpen[key] = open;
        cell.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open);
        audio.play(open ? "confirm" : "click");
      });
    });
    body.querySelectorAll(".ct-paper").forEach((pp) => {
      pp.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!pp.classList.contains("ct-choose")) this._openContract(pp.getAttribute("data-cat"));
      });
    });
    // close the drawer by pushing its wood (front lip OR empty tray), not a folder/paper
    const closeCell = (cell) => {
      if (!cell || !cell.classList.contains("open")) return;
      const key = cell.getAttribute("data-drawer");
      if (key) this._drawerOpen[key] = false;
      cell.classList.remove("open");
      const f = cell.querySelector(".cab2-front"); if (f) f.setAttribute("aria-expanded", "false");
      audio.play("click");
    };
    body.querySelectorAll(".cab2-inner").forEach((inner) => {
      inner.addEventListener("click", (e) => {
        if (e.target.closest(".drw-folder") || e.target.closest(".ct-paper") || e.target.closest(".ct2-read")) return;
        closeCell(inner.closest(".cab2-cell"));
      });
    });

    const meta = document.getElementById("drawer-meta");
    if (meta) meta.textContent = delivered.length + "/3 stabilised · " + rcards.length + " archived";
    // Hela's held line tracks the receptor live while you stand in the records
    if (this.camera && this.camera.scene === "drawer") this._helaReceptor();
  }

  // The Causality Generators + Time Machine take on the local traveler's condition:
  // Terminated ⇒ black housing, red numerals + red "Matrix" churn; Wanted ⇒ an
  // Old-West identity. CSS keys off these classes (.state-terminated/.state-wanted).
  _syncGeneratorState(me) {
    const cls = me && me.is_terminated ? "state-terminated"
      : me && me.is_wanted ? "state-wanted" : "";
    ["gauntlet", "rucksack-zone", "machine-zone", "dice-zone"].forEach((id) => {
      const z = document.getElementById(id);
      if (!z) return;
      z.classList.remove("state-terminated", "state-wanted");
      if (cls) z.classList.add(cls);
    });
    document.documentElement.classList.toggle("gen-terminated", cls === "state-terminated");
  }

  // Dynamic soundtrack state machine (§music). Derived from live game state:
  //   • the opening era bed plays only at the very start;
  //   • a WANTED traveler ⇒ Old-West "western" mood;
  //   • the FIRST time anyone reaches 3 VP the "horror" floor latches ON, from
  //     then the soundtrack never returns to the default bed, alternating only
  //     between western (someone Wanted) and horror (otherwise).
  updateMusicMood(view) {
    const tv = view.travelers || [];
    if (tv.some((t) => (t.contract_points || 0) >= 3)) this._horrorFloor = true;
    const wanted = tv.some((t) => t.is_wanted || (t.statuses || []).includes("wanted"));
    const mood = wanted ? "western" : (this._horrorFloor ? "horror" : null);
    audio.setMood(mood);
  }

  // Drive the living WORLD from game state: the era backdrop (the world reflects the
  // era your traveler stands in, like the music) and DREAD, the horror that grows in
  // the silence as Heat/booms accumulate and travelers are terminated. Both are read
  // by CSS (body[data-era], :root --dread, .dread-high) to swap the backdrop and let
  // the cathedral slowly darken and warp toward the Paradix.
  _syncAtmosphere(view, me) {
    const tv = view.travelers || [];
    const self = me || tv.find((t) => t.name === this.seat) || tv[0];
    if (self) document.body.dataset.era = this.eraKeyForCentury(self.century);
    const n = Math.max(1, tv.length);
    const booms = tv.reduce((s, t) => s + (t.booms || 0), 0);
    const term = tv.filter((t) => t.is_terminated || (t.statuses || []).includes("terminated")).length;
    const dread = Math.min(1, (booms / (12 * n)) * 0.8 + (term / n) * 0.7 + (this._horrorFloor ? 0.14 : 0));
    document.documentElement.style.setProperty("--dread", dread.toFixed(3));
    document.documentElement.classList.toggle("dread-high", dread > 0.55);
    this._syncCatMood(dread, this._horrorFloor);
  }

  /* ============================ THE CAT ============================
     A procedural, physics-animated orange cat (web/js/cat.js) on the
     operations papers: breathes, blinks, tail flows, fears the dread and
     comes to comfort you. Presentation only, no engine state. */
  _initCat() {
    if (this._cat) return;
    this._cat = new CatEngine(null);   // she mounts herself into the camera plane
    this._cat.onMeow = () => audio.play("meow");
    this._cat.start();
    document.addEventListener("click", (e) => {
      // a click meant for something you can use (HELA's Hours, a paper, a button) is never the cat's
      const t = e.target;
      if (t && t.closest && !t.closest("#cat") && t.closest("#hela-brain-full, #hela-eye, .he-window, button, a, input, select, [role=button], .card, .pcard, .ctd-doc, .doc-inplace")) return;
      if (this._cat && this._cat.hitTest && this._cat.hitTest(e.clientX, e.clientY)) this.petCat();
    });
  }
  _rewardText(cat, roll) {
    const rc = REWARD_CONTRACTS.find((r) => r.key === cat);
    if (!rc || !roll) return "";
    const o = rc.outcomes[roll - 1];
    return o ? o[1] : "";
  }
  // open a document that EMERGES from the clicked paper (rect), in place, UNDER the
  // hull so the hand cursor stays on top, never a centered pop-up.
  _openDocInPlace(rect, html, opts) {
    opts = opts || {};
    document.querySelectorAll(".doc-inplace").forEach((n) => n.remove());
    const panel = el("div", "doc-inplace" + (opts.cls ? " " + opts.cls : ""));
    panel.innerHTML = html;
    (document.getElementById("screen-game") || document.body).appendChild(panel);
    if (opts.stampLabel) {
      const btn = el("button", "ctd-stampbtn", opts.stampLabel);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.add("stamped-now");
        audio.play("confirm");
        setTimeout(() => { panel.remove(); opts.onStamp && opts.onStamp(); }, 240);
      });
      (panel.querySelector(".ctd") || panel.querySelector(".ct-doc") || panel).appendChild(btn);
    }
    const dw = panel.offsetWidth, dh = panel.offsetHeight;
    const cx = (rect.left || 0) + (rect.width || 0) / 2;
    const cy = (rect.top || 0) + (rect.height || 0) / 2;
    const left = Math.max(10, Math.min(window.innerWidth - dw - 10, cx - dw / 2));
    const top = Math.max(66, Math.min(window.innerHeight - dh - 10, cy - dh / 2));
    panel.style.left = left + "px"; panel.style.top = top + "px";
    panel.style.transformOrigin = (cx - left).toFixed(0) + "px " + (cy - top).toFixed(0) + "px";
    requestAnimationFrame(() => panel.classList.add("in"));
    if (!opts.auto) panel.addEventListener("click", () => panel.remove());
    audio.play("click");
    return panel;
  }
  _contractDoc(cat, rec) {
    const rc = REWARD_CONTRACTS.find((r) => r.key === cat); if (!rc) return "";
    const subtitle = { Chaos: "MANDATE OF UNMAKING", Time: "WRIT OF BORROWED HOURS", Resource: "DEED OF PROVISION" }[cat] || "";
    const tier = rec ? ["", "I", "II", "III"][rec.roll] : null;
    const rows = rc.outcomes.map((o) =>
      '<div class="ctd-row' + (tier === o[0] ? " hit" : "") + '"><b>' + o[0] + "</b><span>" + o[1] + "</span></div>").join("");
    return '<div class="ctd ctd-' + cat.toLowerCase() + '">' +
      '<div class="ctd-crest">C.R.O.N.O.S. · TEMPORAL LOBBY</div>' +
      '<h4 class="ctd-title">' + cat.toUpperCase() + " CONTRACT</h4>" +
      '<div class="ctd-sub">' + subtitle + "</div>" +
      '<div class="ctd-body">' + rows + "</div>" +
      '<div class="ctd-signs">' +
      '<div class="ctd-sig"><label>RECEIVED · HOUR</label><span class="ctd-line">' + (rec ? "H" + rec.hour : "") + "</span></div>" +
      '<div class="ctd-sig"><label>REWARD GRANTED</label><span class="ctd-line">' + (rec && tier ? tier : "") + "</span></div>" +
      "</div>" +
      '<i class="ctd-wax' + (rec ? " stamped" : "") + '"></i></div>';
  }
  _openContract(cat, rec, opts) {
    const paper = document.querySelector('#drawer-zone .ct-paper[data-cat="' + cat + '"]');
    const rect = paper ? paper.getBoundingClientRect()
      : { left: window.innerWidth * 0.3, top: window.innerHeight * 0.32, width: 0, height: 0 };
    this._openDocInPlace(rect, this._contractDoc(cat, rec || null), {
      cls: "ctd-wrap",
      stampLabel: opts && opts.stamp ? "STAMP · ACCEPT " + cat.toUpperCase() : null,
      onStamp: opts && opts.onStamp,
    });
  }
  _resolvedCP(seat, cp) {
    // CP that has actually been REWARDED (delivery CP only counts once its reward
    // is chosen); reload-safe via the per-seat baseline.
    if (this._cpBaseline[seat] === undefined) return cp;
    const rewarded = (this._rewardLog[seat] || []).length;
    return Math.min(cp, this._cpBaseline[seat] + rewarded);
  }
  _signContract(p) {
    if (!p || !p.seat) return;
    const rec = { hour: this.view ? this.view.hour : "?", category: p.category, roll: p.roll };
    (this._rewardLog[p.seat] = this._rewardLog[p.seat] || []).push(rec);   // ALL seats
    const me = this._self();
    if (!me || me.name !== p.seat) return;   // rivals recorded; ceremony is self-only
    this._contractLog.push(rec);
    this._drawerOpen.CONTRACTS = true;
    const paper = document.querySelector('#drawer-zone .ct-paper[data-cat="' + p.category + '"]');
    const rect = paper ? paper.getBoundingClientRect()
      : { left: window.innerWidth * 0.34, top: window.innerHeight * 0.3, width: 0, height: 0 };
    const panel = this._openDocInPlace(rect, this._contractDoc(p.category, rec), { cls: "ctd-wrap ct2-sign", auto: true });
    audio.play("confirm");
    setTimeout(() => panel.classList.add("fly"), 1700);
    setTimeout(() => panel.remove(), 2450);
  }
    petCat() {
    if (this._cat) this._cat.pet();
    audio.play("purr");
    this._catHearts();
    document.documentElement.classList.add("cat-comfort");
    clearTimeout(this._comfortTimer);
    this._comfortTimer = setTimeout(() => document.documentElement.classList.remove("cat-comfort"), 4200);
  }
  _catHearts() {
    const corner = document.getElementById("cat");
    if (!corner || this._reducedMotion()) return;
    const cw = corner.offsetWidth || 300;
    for (let i = 0; i < 3; i++) {
      const h = el("div", "cat-heart");
      h.style.left = (cw * 0.32 + Math.random() * cw * 0.3) + "px";
      h.style.top = (corner.offsetHeight * 0.18 + Math.random() * 24) + "px";
      corner.appendChild(h);
      h.animate([
        { transform: "translateY(0) scale(.5)", opacity: 0 },
        { transform: "translateY(-8px) scale(1)", opacity: 1, offset: 0.3 },
        { transform: "translateY(-46px) scale(.7)", opacity: 0 },
      ], { duration: 1300 + i * 160, easing: "cubic-bezier(.4,0,.3,1)", delay: i * 170, fill: "forwards" })
        .onfinish = () => h.remove();
    }
  }
  catStartle() { if (this._cat) this._cat.startle(); }
  _syncCatMood(dread, horror) { if (this._cat) this._cat.setMood((horror || dread > 0.5) ? "afraid" : "calm"); }

  /* ---------------------------- Topbar ------------------------------ */
  renderPhaseTrack() {
    this.dom.phaseTrack.innerHTML = "";
    // The Auction chip belongs to the Test Room only; the classic Hour starts at Delivery.
    const leilao = !!(this.view && this.view.mode === "leilao");
    PHASES.forEach(([key, label]) => {
      if (key === "leilao" && !leilao) return;
      const chip = el("span", "phase-chip", label);
      chip.dataset.phase = key;
      this.dom.phaseTrack.appendChild(chip);
    });
  }
  setPhase(key) {
    this.currentPhase = key;
    // a fresh Generators phase un-does the clean-up: the screen may light again
    if (key === "main") document.body.classList.remove("gen-cleaned");
    // Phase focus: the active surface becomes the lit stage, the rest recede (CSS
    // keys off body[data-phase]). This is what gives the board its "alive" pulse.
    document.body.dataset.phase = key;
    const order = PHASES.map((p) => p[0]);
    const idx = order.indexOf(key);
    this.dom.phaseTrack.querySelectorAll(".phase-chip").forEach((chip) => {
      const i = order.indexOf(chip.dataset.phase);
      chip.classList.toggle("active", chip.dataset.phase === key);
      chip.classList.toggle("done", i >= 0 && idx >= 0 && i < idx);
    });
    // No ambient yank to the desk on phase flips (it kills the map theater),
    // decisions pull the camera themselves, AFTER the event queue has drained.
    this.camera && this.camera.suggestScene({ delivery: "drawer", market: "market" }[key]);
  }
  renderPriority() {
    const order = this.priority.length ? this.priority
      : (this.view ? this.view.travelers.map((t) => t.name) : []);
    this.dom.priority.innerHTML = "";
    order.forEach((name) => {
      const tok = el("div", "prio-token", initials(name));
      tok.style.background = this.colorOf(name);
      tok.style.setProperty("--seat", this.colorOf(name));
      tok.title = `${name} · priority`;
      this.dom.priority.appendChild(tok);
    });
  }

  /* --------------------------- Timeline ----------------------------- */
  // The Timeline is a big elliptical arch framing the whole stage: Year Zero at
  // the bottom-left (angle π), the future XXX at the bottom-right (angle 0), the
  // apex at top-centre. Centuries are spaced evenly along the curve; the Market
  // nests inside the belly. Shared with the travel animation.
  _archGeom() {
    const rail = this.dom.timeline;
    const W = rail.clientWidth || 900, H = rail.clientHeight || 600;
    // The arch baseline rests just above the bottom toolbar (≈188px) so its
    // endpoints, Year Zero (left) and the future XXX (right), stay visible
    // rather than hiding behind it. Must track the .stage-toolbar height in CSS.
    const padX = 28, topPad = 16, botPad = 44;
    const cx = W / 2, baseY = H - botPad;
    // Shrink the radius a touch (centralize the arch) so the end pieces, Year Zero
    // (left) and XXX (right), get more breathing room and read clearly. Zones are
    // NOT resized; only the drawn arc is a little smaller and better centred.
    const rx = Math.max(60, (W - 2 * padX) / 2) * 0.92;
    const ry = Math.max(80, H - topPad - botPad) * 0.95;
    return { W, H, cx, baseY, rx, ry };
  }
  _archAngle(c) {
    const t = Math.max(0, Math.min(1, c / CENTURY_MAX));
    return Math.PI * (1 - t);   // c=0 -> π (left, Year Zero); c=MAX -> 0 (right, future)
  }
  _archLocal(c, g = this._archGeom()) {
    const a = this._archAngle(c);
    return { x: g.cx + g.rx * Math.cos(a), y: g.baseY - g.ry * Math.sin(a) };
  }
  // Unit outward normal of the ellipse at century c (points away from the belly).
  _archNormal(c, g = this._archGeom()) {
    const a = this._archAngle(c);
    let nx = Math.cos(a) / g.rx, ny = -Math.sin(a) / g.ry;
    const len = Math.hypot(nx, ny) || 1;
    return { nx: nx / len, ny: ny / len };
  }

  _skinForCentury(c) {
    let ei = -1; for (let i = 0; i < ERAS.length; i++) { if (c >= ERAS[i][0] && c <= ERAS[i][1]) { ei = i; break; } }
    const pi = ei < 0 ? 2 : Math.floor(ei / 2);   // 0 Origins · 1 Ascension(Sea) · 2 Singularity
    return pi === 0 ? "skin-ori" : pi === 2 ? "skin-sing" : "";
  }
  renderPlayers() {
    // A CASE FILE IS REBUILT ONLY WHEN ITS SUBJECT CHANGED. Every state message used to
    // rebuild every file; now each keeps its node (and so its paint and raster) while its
    // traveller, their place relative to me, the turn, the targeting and the pending
    // decision are unchanged. Anything that marks a file keys into that signature.
    const oldCards = new Map();
    this.dom.players.querySelectorAll(".cb-grid > .pcard[data-seat]").forEach((c) => oldCards.set(c.dataset.seat, c));
    const reqKey = this._reqKey(), selSig = this._selSig();
    this.dom.players.innerHTML = "";
    // THE CASE BOARD v2, per rival: a hanging BADGE (credential summary) with
    // the FULL CASE FILE clipped beneath it, always open. Columns grow when
    // there are fewer rivals; everything drawn, nothing to squint at.
    const board = el("div", "caseboard");
    board.innerHTML = `<div class="cb-plate"><span class="cb-agency">C.R.O.N.O.S.</span>`
      + `<span class="cb-title">ACTIVE SUBJECTS &middot; TEMPORAL ENFORCEMENT DIVISION</span>`
      + `<span class="cb-eyes">EYES&nbsp;ONLY</span></div>`;
    const rack = el("div", "cb-grid");
    board.appendChild(rack);
    this.dom.players.appendChild(board);
    const prevAll = this._prevStats || {};
    this.view.travelers.filter((t) => !(t.is_self || t.name === this.seat)).forEach((t) => {
      const col = this.colorOf(t.name);
      const meS = this._self();
      const relS = !meS ? "" : t.century < meS.century ? "pc-past" : t.century > meS.century ? "pc-future" : "";
      const sig = JSON.stringify(t) + "|" + relS + "|" + (t.name === this.activeSeat) + "|" + selSig + "|" + reqKey + "|" + col;
      const keep = oldCards.get(t.name);
      if (keep && keep.__pdxSig === sig) { rack.appendChild(keep); return; }
      const card = el("div", "pcard cfolio");
      card.__pdxSig = sig;
      card.dataset.seat = t.name;
      if (t.name === this.activeSeat) card.classList.add("active-turn");
      const sel = this.selectReq;
      if (sel && Object.values(sel.byName).some(
            (m) => m.zone === "equipment" && m.owner === t.name)) {
        card.classList.add("targetable", "tgt-" + sel.mode);
      }
      const isTerminated = (t.statuses || []).includes("terminated") || t.is_terminated;
      const isWanted = (t.statuses || []).includes("wanted") || t.is_wanted;
      if (isTerminated) card.classList.add("terminated");
      // WHERE they stand relative to YOU: past ages the paper, future cools it.
      // The morph only ANIMATES when a voyage changed the relation (cheap, recurring).
      {
        const meT = this._self();
        const rel = !meT || t.name === this.seat ? "" :
          t.century < meT.century ? "pc-past" : t.century > meT.century ? "pc-future" : "";
        this._ageCache = this._ageCache || {};
        if (this._ageCache[t.name] !== rel && this._ageCache[t.name] !== undefined) {
          card.classList.add("pc-morph");                          // transition arms
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (rel) card.classList.add(rel);
            setTimeout(() => card.classList.remove("pc-morph"), 1200);
          }));
        } else if (rel) card.classList.add(rel);
        this._ageCache[t.name] = rel;
      }
      if (isWanted) card.classList.add("is-wanted");
      const pv = prevAll[t.name];
      const tick = (key, val) =>
        (pv && pv[key] !== undefined && pv[key] !== val) ? (val > pv[key] ? "up" : "down") : "";
      const items = t.equipment || t.hand || [];
      const cap = t.equipment_capacity ?? 2;
      const caseNo = "TX-" + String(Math.abs([...t.name].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7)) % 9000 + 1000);
      let fuse = "";
      for (let i = 0; i < 12; i++)
        fuse += `<i class="${i < t.booms ? "lit" : ""}${i >= 9 ? " hot" : ""}"></i>`;
      let dots = "";
      for (let i = 0; i < cap; i++) {
        const c = items[i];
        dots += c ? `<i class="on" style="--era:${eraColor(c.delivery_century)}" title="${this.dn(c)}"></i>`
                  : `<i title="empty slot"></i>`;
      }
      // didactic LIFE bar (energy) + the ALLOCATION strip (3-colour matrix seals)
      let energyBar = "";
      for (let i = 0; i < 12; i++) energyBar += `<i class="${i < Math.min(12, t.energy) ? "on" : ""}"></i>`;
      const ALLOC_FN = [["ba-r", "#5fd08a"], ["ba-p", "#9a86c8"], ["ba-t", "#6fb4c8"]];
      let allocSlots = "";
      for (const [cls, c] of ALLOC_FN)
        allocSlots += `<span class="ba-fn ${cls}" style="--c:${c}"><b></b><b></b><b></b></span>`;
      // ── the BADGE (restored laminated credential) ──
      // ═══ THE CREDENTIAL, STRIPPED ═════════════════════════════════════════════════
      // The game had too much text, and too much tiny text.
      // The designer is right, but the fix is not "delete words", it is knowing which
      // words were never words to begin with. The rule:
      //
      //     text you read ONCE is fiction.  text you read a HUNDRED times is an
      //     INSTRUMENT, and an instrument is not read, it is RECOGNISED.
      //
      // The contracts and the case files are fiction: dense, typed, immersive, and they
      // stay exactly as they are. The badge is an instrument, it is consulted every
      // single turn, so anything on it that still had to be READ was costing the player
      // a glance they should have been spending on the game.
      //
      // Four things were squatting here that do not belong to a credential (my own
      // list): the equipment count, the gold, the boom track, the contract points. They
      // are gone, and they went somewhere REAL:
      //     equipment count  -> deleted outright. The case file directly below already
      //                         says "EQUIPMENT · 1/2" and draws the cards. Pure duplicate.
      //     gold             -> COINS, resting on the case file. You do not read "6"; you
      //                         see a man with a pile.
      //     booms            -> a vertical FUSE RAIL clipped to the badge's edge. A rising
      //                         column of heat you can read from across the desk.
      //     contract points  -> WAX SEALS stamped on the file. A contract fulfilled is a
      //                         contract SEALED. Three seals IS three points; nobody counts.
      //
      // What remains is what a credential is FOR, who, where, and are they alive:
      // the name, the century, and the life. All three, twice the size they were.
      const badge = el("div", "badge");
      badge.innerHTML =
        `<div class="bd-clip"></div>`
        + `<div class="bd-band" style="--seat:${col}"></div>`
        // THE FUSE RAIL, booms, clamped to the badge's spine like a pressure gauge on a
        // boiler. It fills from the bottom and goes hot at the top; at 12 the motor blows.
        + `<div class="bd-fuserail ${t.booms >= 9 ? "hot": ""}" title="Boom track ${t.booms}/12, at 12 the motor detonates">`
        + `<span class="bf-clamp"></span><span class="bf-col">${fuse}</span>`
        + `<span class="bf-n">${t.booms}</span></div>`
        // ONE info line: name · century · EKG · the life numeral (the two
        // big lines were waste, the lower floor belongs to the GENERATOR REGISTRY)
        + `<div class="bd-main">`
        + `<div class="bd-photo" style="--seat:${col}"><span>${initials(t.name)}</span></div>`
        + `<div class="bd-id">`
        +   `<div class="bd-line1"><span class="bd-name" title="${esc(t.name)}">${esc(t.name)}</span></div>`
        +   `<div class="bd-line2"><span class="bd-life ${tick("energy", t.energy) ? "vg-" + tick("energy", t.energy) : ""}${t.energy <= 6 ? " crit" : t.energy <= 9 ? " warn" : ""}" title="Energy ${t.energy}. At 0 the traveler is terminated; 6 or less is critical.">`
        +     `<span class="bd-ekg"><svg class="ekg-svg" viewBox="0 0 64 18" preserveAspectRatio="none" fill="none"><polyline class="ekg-line" points="0,9 13,9 17,9 20,3 23,15 26,9 39,9 43,9 46,4 49,14 52,9 64,9" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg></span>`
        +     `<b class="bd-life-n">${t.energy}</b></span></div>`
        + `</div>`
        + `<div class="bd-flags">`
        + (t.has_briefcase ? `<span class="cf-chip" title="Temporal Briefcase, +1 slot">${icon("briefcase")}</span>`: "")
        + (isWanted ? `<span class="cf-stamp cf-wanted" title="Wanted: whoever terminates this traveler collects 4 gold. They clear it by paying 4 gold (Declare) at a Market.">WANTED</span>` : "")
        + (isTerminated ? `<span class="cf-stamp cf-archived" title="Terminated: their gear was recycled and they restarted at XXX. They can still deliver, earn points and win.">ARCHIVED</span>` : "")
        + `</div></div>`
        // THE GENERATOR REGISTRY, the whole lower floor, big and legible. It was
        // decorative for months (the cells were never populated); now it REGISTERS.
        + `<div class="bd-alloc" title="Revealed dice allocation, recharge · paradox · travel"><span class="ba-slots">${allocSlots}</span></div>`;
      card.appendChild(badge);
      if (t.energy <= 3 && !isTerminated) card.classList.add("low-energy");
      if (t.gold >= 6) card.classList.add("rich");
      if (t.booms >= 10 && !isTerminated) card.classList.add("critical");
      // the CLASSIFIED file, clipped beneath the badge
      const sheet = el("div", "csheet");
      const isTgtCard = (c) => {
        const m = sel && sel.byName[c.name];
        return !!(m && m.zone === "equipment" && m.owner === t.name);
      };
      const miniCards = items.length ? items.map((c) => `
        <div class="mc${isTgtCard(c) ? " targetable " + this._selClass(sel.mode) : ""}" data-card="${c.name}" style="--era:${eraColor(c.delivery_century)}">
          <div class="mc-band"></div>
          <div class="mc-body"><div class="mc-name">${this.dn(c)}</div>
          <div class="mc-kind">${c.kind_label || c.ability_type || ""}</div>
          <div class="mc-meta">${icon("gold")}${c.gold_cost} &middot; ${icon("clock")}${roman(c.delivery_century)}</div></div>
        </div>`).join("") : `<div class="mc-empty">&mdash; no equipment on record &mdash;</div>`;
      const delivered = t.delivered_periods || [];
      const seals = RECEPTOR_PERIODS.map((pd) => {
        const done = delivered.includes(pd.key);
        return `<span class="seal${done ? " done": ""}" style="--era:${pd.color}" title="${pd.key}, ${done ? "delivered": "still needed"}">${pd.key.slice(0, 3).toUpperCase()}</span>`;
      }).join("");
      // ── GOLD, as COINS on the paperwork. The gold counter is coins
      //    laid on top of the files. You do not read a six; you see a man with a
      //    pile. The numeral stays, small and struck into the front coin, for the moment
      //    you actually need the exact figure, glance, then hover, then inspect.
      const gold = t.gold || 0;
      let coins = "";
      for (let i = 0; i < Math.min(gold, 7); i++) coins += `<i style="--i:${i}"></i>`;
      const goldPile = gold
        ? `<div class="cs-gold${gold >= 6 ? " rich" : ""}" title="Gold ${gold}">${coins}<b>${gold}</b></div>` : "";
      // ── CONTRACT POINTS, as WAX SEALS. A contract fulfilled is a contract SEALED. Three
      //    seals IS three points, nobody counts, they SEE.
      const cp = t.contract_points || 0;
      let wax = "";
      for (let i = 0; i < cp; i++) wax += `<i style="--i:${i}"></i>`;
      const cpSeals = cp
        ? `<div class="cs-wax" title="Contract points, ${cp}">${wax}</div>`: "";
      sheet.innerHTML =
        `<div class="cs-clip"></div>`
        + goldPile + cpSeals
        + `<div class="cs-head"><span class="cs-no">CASE ${caseNo}</span><span class="cs-cls">CLASSIFIED</span></div>`
        + `<div class="cs-sec cs-where">LAST KNOWN &middot; <b>CENTVRY ${roman(t.century)}</b> &middot; ${eraName(t.century)}</div>`
        + `<div class="cs-redact"></div>`
        + `<div class="cs-sec">EQUIPMENT &middot; ${t.slots_used ?? items.length}/${cap}</div>`
        + `<div class="cs-cards">${miniCards}</div>`
        + `<div class="cs-sec">TEMPORAL RECEPTOR &middot; ${delivered.length}/3</div>`
        + `<div class="cs-seals">${seals}</div>`;
      card.appendChild(sheet);
      card.addEventListener("click", (e) => {
        const mcT = e.target.closest(".mc.targetable");
        if (mcT) { this.respondSelect(mcT.dataset.card); return; }
        if (card.classList.contains("pcard-choose")) return;        // targeting owns this click (DP-4)
        // the BADGE is a selector, never a folder, only the stapled mini-file opens the dossier
        if (!e.target.closest(".csheet")) {
          if (this.panelDetail) this.hidePanelDetail();
          return;
        }
        if (this.panelDetail) { this.hidePanelDetail(); return; }   // a click always closes an open file
        this.showPanelDetail(t, card);
        e.stopPropagation();
      });
      rack.appendChild(card);
    });
    const nm = {};
    this.view.travelers.forEach((t) =>
      (nm[t.name] = { energy: t.energy, gold: t.gold, cp: t.contract_points, booms: t.booms }));
    this._prevStats = nm;
    try { comic.emanata(this.view); } catch (e) {}   // the comic marks on the fresh case files
  }

  _hidePaper() { if (this._paperEl) { this._paperEl.remove(); this._paperEl = null; } }
  _showEdition(cl) {
    if (window.__helaOpenArchive) return window.__helaOpenArchive();   // one reader: HELA's eye-archive
    const kindMap = { "CENTVRY X": "milestone", "CENTVRY XX": "milestone", "WANTED": "wanted" };
    const kind = kindMap[cl.tag] || "delivered";
    const stories = {
      delivered: "Word reaches the Bureau that the artefact has been sealed into its Temporal Receptor. Chronologers confirm the era holds, for now.",
      milestone: "A lighthouse keeper signals the crossing. The Merchant, ever opportunist, is said to have let out another sail.",
      wanted: "A bounty is posted along every quay. Rivals sharpen their intentions; the marked traveller is advised to declare, or run.",
    };
    const wrap = el("div", "bn-read");
    wrap.innerHTML = this._editionHtml(cl.head, cl.sub, kind, stories[kind]);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("on"));
    audio.play("chart_stamp");
    setTimeout(() => document.addEventListener("click", () => {
      wrap.classList.remove("on"); setTimeout(() => wrap.remove(), 300);
    }, { once: true }), 0);
  }
  showPanelDetail(t, anchor) {
    // Same seat already open? keep it.
    if (this.panelDetail && this.panelDetail.dataset.seat === t.name) return;
    this.hidePanelDetail();
    const own = !!t.is_self;
    if (own) tutorials.show("recycle");
    const items = t.equipment || t.hand || [];
    const receptor = t.temporal_receptor || [];
    const fly = el("div", "panel-detail panel case-sheet dossier");
    fly.dataset.seat = t.name;
    const caseNo = "TX-" + String(Math.abs([...t.name].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7)) % 9000 + 1000);
    const isWanted2 = (t.statuses || []).includes("wanted") || t.is_wanted;
    const isTerm2 = (t.statuses || []).includes("terminated") || t.is_terminated;
    if (isWanted2 && !isTerm2) fly.classList.add("wanted");   // Old-West bounty perimeter
    const col2 = this.colorOf(t.name);
    // energy cells (12 drawn cells + numeral), CP seals, the fuse, all DRAWN
    let ecells = ""; for (let i = 0; i < 12; i++) ecells += `<i class="${i < Math.min(12, t.energy) ? "on" : ""}"></i>`;
    let fuse2 = ""; for (let i = 0; i < 12; i++) fuse2 += `<i class="${i < t.booms ? "lit" : ""}${i >= 9 ? " hot" : ""}"></i>`;
    let cpseals = ""; const cpn = this._resolvedCP(t.name, t.contract_points || 0);
    for (let i = 0; i < Math.max(6, cpn); i++) cpseals += `<i class="${i < cpn ? "on" : ""}"></i>`;
    let coins = ""; for (let i = 0; i < Math.min(10, t.gold); i++) coins += `<i style="--k:${i}"></i>`;
    // typed field remarks, the agency's own observations
    const remarks = [];
    if (t.energy <= 3) remarks.push("subject running on fumes, " + t.energy + " energy remaining");
    if (t.gold >= 6) remarks.push("subject carrying significant gold (" + t.gold + "), expect market activity");
    if (t.booms >= 10) remarks.push("boiler at " + t.booms + "/12, DETONATION IMMINENT");
    else if (t.booms >= 6) remarks.push("boiler stress rising (" + t.booms + "/12)");
    if (isWanted2) remarks.push("WANTED by the Division, bounty 4 gold on capture");
    if (isTerm2) remarks.push("subject terminated, timeline recompiling");
    if ((t.statuses || []).includes("exploded")) remarks.push("boiler burst, grounded this hour");
    if (!remarks.length) remarks.push("no irregularities on record");
    const clippings = [];
    if (t.scored_century_x) clippings.push({ head: "MILLENNIUM MARK CLAIMED", sub: `${esc(t.name)} holds Centvry X as the Hour turns, the Division awards one contract point`, tag: "CENTVRY X" });
    if (t.scored_century_xx) clippings.push({ head: "THE SECOND MILLENNIUM FALLS", sub: `${esc(t.name)} plants the mark at Centvry XX, historians dispute the ink`, tag: "CENTVRY XX" });
    (t.delivered_periods || []).forEach((pk) => clippings.push({ head: `THE ${pk.toUpperCase()} STABILISED`, sub: `a relic received in its own age, the ${pk} period sealed under ${esc(t.name)}'s name`, tag: pk.toUpperCase() }));
    if (isWanted2) clippings.push({ head: "BOUNTY DECLARED", sub: `the Division marks ${esc(t.name)}, four gold, dead or alive`, tag: "WANTED" });
    this._dossierClips = clippings;
    this._dossierCP = cpn;
    let html = `<div class="do-head"><div class="do-agency">C.R.O.N.O.S. &middot; TEMPORAL ENFORCEMENT DIVISION</div>`
      + `<div class="do-title">SUBJECT DOSSIER</div>`
      + `<div class="do-caseno">CASE ${caseNo} &middot; HOUR ${this.view ? this.view.hour : "?"}</div>`
      + `<div class="do-topsecret">TOP SECRET</div></div>`
      + `<div class="do-ident"><div class="do-photo" style="--seat:${col2}"><span>${initials(t.name)}</span><em>SUBJ.</em></div>`
      + `<div class="do-fields">`
      + `<div class="do-field"><label>SUBJECT</label><b>${esc(t.name)}</b></div>`
      + `<div class="do-field"><label>LAST KNOWN POSITION</label><b>CENTVRY ${roman(t.century)}</b> <span>&middot; ${eraName(t.century)}</span></div>`
      + `<div class="do-field"><label>STATUS</label>${isTerm2 ? `<span class="cs-stamp cs-archived">ARCHIVED</span>` : isWanted2 ? `<span class="cs-stamp cs-wanted">WANTED</span>` : "<b>AT LARGE</b>"}</div>`
      + `</div></div>`
      + `<div class="do-sec">VITALS</div>`
      + `<div class="do-vitals">`
      + `<div class="do-gauge"><label>${icon("energy")} ENERGY</label><span class="do-cells">${ecells}</span><b>${t.energy}</b></div>`
      + `<div class="do-gauge"><label>${icon("gold")} GOLD</label><span class="do-coins">${coins}</span><b>${t.gold}</b></div>`
      + `<div class="do-gauge"><label>${icon("booms")} BOOM TRACK</label><span class="do-fuse">${fuse2}</span><b>${t.booms}/12</b></div>`
      + `</div>`
      + `<div class="do-sec">FIELD REMARKS</div>`
      + `<div class="do-remarks">${remarks.map((r2) => `<div>&raquo; ${r2}</div>`).join("")}</div>`;
    html += `<div class="do-sec">EQUIPMENT MANIFEST &middot; ${t.slots_used ?? items.length}/${t.equipment_capacity ?? 2}${t.has_briefcase ? " (briefcase)" : ""}</div>`;
    const sel = this.selectReq;
    const isTgt = (c) => {
      const m = sel && sel.byName[c.name];
      return !!(m && m.zone === "equipment" && m.owner === t.name);
    };
    if (items.length) {
      html += items.map((c, i) => `
        <div class="pd-card${isTgt(c) ? " targetable " + this._selClass(sel.mode) : ""}" data-card="${c.name}" style="--era:${eraColor(c.delivery_century)}">
          <div class="pd-card-head"><span class="pd-name">${this.dn(c)}</span>
            <span class="pd-kind">${c.kind_label || c.ability_type}</span></div>
          <div class="pd-desc">${c.description || "--"}</div>
          <div class="pd-meta">
            <span title="Gold cost">${icon("gold")} ${c.gold_cost}</span>
            <span title="Return century">${icon("clock")} ${roman(c.delivery_century)}</span>
            <span title="Recycle value (energy)">${icon("recycle")} ${c.recycle_value}</span>
            ${own ? `<button class="pd-recycle" data-card="${c.name}" title="Recycle for ${c.recycle_value} energy">Recycle +${c.recycle_value}${this.svgInline("energy")}</button>` : ""}
          </div>
        </div>`).join("");
    } else { html += `<div class="pd-empty">No items equipped.</div>`; }
    // Temporal Receptor: missing-period tracker (need all 3 to stabilise, §11.1b)
    // then each delivered card in full (era-bordered, hover-readable text).
    const delivered = t.delivered_periods || [];
    html += `<div class="pd-label">Temporal Receptor · ${delivered.length}/3 periods</div>`;
    html += `<div class="pd-periods">` + RECEPTOR_PERIODS.map((p) => {
      const done = delivered.includes(p.key);
      return `<span class="pd-period ${done ? "done" : "missing"}" style="--era:${p.color}"
        title="${done ? "Delivered": "Still needed"}, ${p.eras}">
        ${done ? "✓" : "○"} ${p.key}</span>`;
    }).join("") + `</div>`;
    const rcards = t.receptor_cards || [];
    if (rcards.length) {
      html += rcards.map((c) => `
        <div class="pd-card delivered" style="--era:${eraColor(c.delivery_century)}">
          <div class="pd-card-head"><span class="pd-name">${this.dn(c)}</span>
            <span class="pd-kind">${c.kind_label || c.ability_type}</span></div>
          <div class="pd-desc">${c.description || "--"}</div>
          <div class="pd-meta">
            <span title="Delivered at">${icon("clock")} ${roman(c.delivery_century)}</span>
            <span title="Era">${eraName(c.delivery_century)}</span>
          </div>
        </div>`).join("");
    } else if (receptor.length) {
      html += `<div class="pd-chips">${receptor.map((n) => `<span class="chip receptor">${this.nameEn(n)}</span>`).join("")}</div>`;
    } else {
      html += `<div class="pd-empty">Nothing delivered yet.</div>`;
    }
    fly.innerHTML = html;
    // On the body, not inside #screen-game: a z-index only counts inside its own
    // stacking context, so 52 inside #screen-game loses to anything in #hull. On the
    // body only the cursor plane (z 60000) sits above it, which is right.
    document.body.appendChild(fly);
    this.panelDetail = fly;
    // Interactive: let the cursor travel onto the flyout to read / recycle.
    // click lifecycle: while the file is open, ANY next click closes it
    // (element handlers inside, recycle, targeting, attachments, fire first).
    setTimeout(() => {
      this._docCloser = () => this.hidePanelDetail();
      document.addEventListener("click", this._docCloser, { once: true });
    }, 0);
    fly.querySelectorAll(".pd-recycle").forEach((b) =>
      b.addEventListener("click", () => this.recycleCard(b.dataset.card)));
    // Click a targetable rival card to answer the pending selection (destroy, etc.).
    if (sel) fly.querySelectorAll(".pd-card.targetable").forEach((c) =>
      c.addEventListener("click", () => this.respondSelect(c.dataset.card)));
    // The file expands IN PLACE: anchored to the badge, occupying the clipped
    // file's spot beneath it, one object unfolding, not two different things.
    const badgeEl = anchor.querySelector ? anchor.querySelector(".badge") : null;
    const r = (badgeEl || anchor).getBoundingClientRect();
    let w = 286;
    if (fly.classList.contains("dossier")) {
      w = Math.max(340, Math.min(520, r.width));
      fly.style.width = w + "px";
      if (anchor.classList && anchor.classList.contains("cfolio")) {
        anchor.classList.add("file-open");
        this._openCard = anchor;
      }
    }
    let left = Math.min(r.left, window.innerWidth - w - 8);
    fly.style.left = Math.max(8, left) + "px";
    // THE FILE PULLS UP out of its own record, covering the file, the badge and
    // overlapping the maleta a bit, but NEVER reaching down over the manopla
    // (it opens over its own file, the badge, and the briefcase, overlapping slightly).
    const cardR = anchor.getBoundingClientRect();
    // keep the dossier's bottom clear of the manopla at the desk's foot
    const bottomY = Math.min(cardR.bottom, window.innerHeight - 300);
    fly.style.bottom = Math.max(8, window.innerHeight - bottomY - 4) + "px";
    fly.style.top = "auto";
    fly.style.maxHeight = Math.max(260, bottomY - 16) + "px";
    fly.style.transformOrigin = "left bottom";
    if (fly.animate) fly.animate(
      [{ clipPath: "inset(100% 0 0 0)", opacity: .5 },
       { clipPath: "inset(0 0 0 0)", opacity: 1 }],
      { duration: 260, easing: "cubic-bezier(.2,.8,.3,1)" });
    audio.play("chart_creak");
    // Newspaper ATTACHMENTS: every edition the subject earned rides paperclipped
    // to the file, pulling the file open fans the headlines out at its side.
    // Click one to read the full Temporal Herald edition.
    // a dossier with stapled contracts needs its left margin, nudge it right
    if (fly.classList.contains("dossier") && (this._dossierCP || 0) > 0) {
      const curL = parseFloat(fly.style.left) || 0;
      if (curL < 132) fly.style.left = "132px";
    }
    this._attachEls = [];
    const clips = this._dossierClips || [];
    if (fly.classList.contains("dossier") && clips.length) {
      const aw = 172;
      const flyL = parseFloat(fly.style.left);
      const _fr = fly.getBoundingClientRect();
      const flyT = isNaN(parseFloat(fly.style.top)) ? _fr.top : parseFloat(fly.style.top);
      const rightSide = flyL + w + aw - 18 <= window.innerWidth - 8;
      const ax = rightSide ? flyL + w - 18 : Math.max(8, flyL - aw + 18);
      clips.slice(0, 4).forEach((cl, i) => {
        const tilt = (i % 2 ? 1 : -1) * (1.4 + i * 0.5);
        const at = el("div", "do-attach" + (rightSide ? "" : " on-left"));
        at.style.left = ax + "px";
        at.style.top = Math.min(flyT + 26 + i * 98, window.innerHeight - 160) + "px";
        at.style.transform = `rotate(${tilt}deg)`;
        at.innerHTML = `<i class="da-clip"></i>`
          + `<div class="da-mast">THE TEMPORAL HERALD</div>`
          + `<div class="da-head">${cl.head}</div>`
          + `<div class="da-sub">${cl.sub}</div>`
          + `<div class="da-tag">${cl.tag}</div>`;
        at.addEventListener("click", (e) => {
          e.stopPropagation(); this.hidePanelDetail(); this._showEdition(cl);
        });
        document.body.appendChild(at);
        if (at.animate) at.animate(
          [{ transform: `translateX(${rightSide ? -30 : 30}px) rotate(0deg)`, opacity: 0 },
           { transform: `translateX(0) rotate(${tilt}deg)`, opacity: 1 }],
          { duration: 300, delay: 130 + i * 80, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
        this._attachEls.push(at);
      });
    }
    // CONTRACT PAPERS: every contract the subject earned is STAPLED to the
    // file's left edge, the same stamped slips that live in the briefcase.
    // They replace the old CP seal track: count is read by eye.
    if (fly.classList.contains("dossier")) {
      const cpN2 = this._dossierCP || 0;
      if (cpN2 > 0) {
        if (!this._attachEls) this._attachEls = [];
        const flyL2 = parseFloat(fly.style.left) || fly.getBoundingClientRect().left;
        const _fr2 = fly.getBoundingClientRect();
        const flyT2 = isNaN(parseFloat(fly.style.top)) ? _fr2.top : parseFloat(fly.style.top);
        const shown = Math.min(cpN2, 5);
        const rlog2 = this._rewardLog[t.name] || [];
        for (let i = 0; i < shown; i++) {
          const rr = rlog2[rlog2.length - 1 - i];
          const ct = el("div", "do-contract" + (rr && rr.category ? " dc-" + rr.category.toLowerCase() : ""));
          ct.style.left = Math.max(4, flyL2 - 86 - i * 9) + "px";
          ct.style.top = Math.min(flyT2 + 34 + i * 30, window.innerHeight - 170) + "px";
          ct.style.zIndex = String(53 - i);
          ct.style.transform = `rotate(${-(3 + i * 2.4)}deg)`;
          ct.innerHTML = `<i class="dc-staple"></i><i class="dc-staple s2"></i>`
            + `<div class="dc-head">C.R.O.N.O.S.</div>`
            + `<div class="dc-title">TEMPORAL SERVICE CONTRACT</div>`
            + `<div class="dc-lines"><i></i><i></i><i></i></div>`
            + `<div class="dc-serial">N&ordm; ${String(i + 1).padStart(2, "0")}</div>`
            + `<i class="dc-seal"></i>`
            + (i === 0 && cpN2 > shown ? `<b class="dc-more">&times;${cpN2}</b>` : "");
          (document.getElementById("screen-game") || document.body).appendChild(ct);
          if (ct.animate) ct.animate(
            [{ transform: "translateX(46px) rotate(0deg)", opacity: 0 },
             { transform: `translateX(0) rotate(${-(3 + i * 2.4)}deg)`, opacity: 1 }],
            { duration: 300, delay: 200 + i * 70, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
          this._attachEls.push(ct);
        }
      }
    }
  }
  hidePanelDetail() {
    this._hidePaper();
    if (this._attachEls) { this._attachEls.forEach((a) => a.remove()); this._attachEls = null; }
    if (this._openCard) { this._openCard.classList.remove("file-open"); this._openCard = null; }
    if (this._docCloser) { document.removeEventListener("click", this._docCloser); this._docCloser = null; }
    if (this.panelDetail) { this.panelDetail.remove(); this.panelDetail = null; }
  }
  svgInline(name) { return `<span class="ico-sm">${icon(name)}</span>`; }

  // Recycle an equipped card for energy, an immediate action available any time
  // (§21), sent out-of-band so it never interrupts a resolving event.
  // Recycling by dragging a hand card onto the MARKET works ANYTIME (out-of-band,
  // §21), even when the market is closed. Bound once at the document level and
  // gated by the market zone's GEOMETRY (not the drop target), so children with
  // pointer-events:none can't swallow the drop.
  _bindRecycleDrop() {
    if (this._recycleDropBound) return;
    this._recycleDropBound = true;
    const overMarket = (ev) => {
      const mz = document.getElementById("market-zone");
      if (!mz) return null;
      const r = mz.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      return inside ? mz : null;
    };
    document.addEventListener("dragover", (ev) => {
      if (!this._dragHand) return;
      const mz = overMarket(ev);
      const cur = document.getElementById("market-zone");
      if (mz) { ev.preventDefault();
        try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}   // no snap-back to the case
        mz.classList.add("recycle-armed"); }
      else if (cur) cur.classList.remove("recycle-armed");
    });
    document.addEventListener("drop", (ev) => {
      const mz = overMarket(ev);
      const cur = document.getElementById("market-zone");
      if (cur) cur.classList.remove("recycle-armed");
      if (!mz) return;
      let name = ""; try { name = ev.dataTransfer.getData("text/handcard"); } catch (err) {}
      if (!name) return;
      ev.preventDefault();
      this.recycleCard(name);
    });
  }
  recycleCard(name) {
    // Present immediately (the juice law): the relic burns WHERE IT SITS. The old
    // path waited for the server, so the card snapped home to the case and only
    // then vanished on the re-render.
    const node = document.querySelector(
      `#rucksack-zone .ruck-card[data-name="${CSS.escape(name)}"]`);
    if (node) {
      const r = node.getBoundingClientRect();
      node.style.visibility = "hidden";
      try { this._dissolveCard(name, r, "recycle"); } catch (e) {}
    }
    this.conn.send({ type: "recycle_now", card: name });
    audio.play("energy");
  }
  // Roll a <b> element's number from `from` to `to` so a resolution READS
  // (the showdown breathes) instead of teleporting. Shared by self + rivals.
  _rollNum(node, from, to, dur) {
    if (!node || this._reducedMotion() || typeof from !== "number" || from === to) {
      if (node) node.textContent = to; return;
    }
    const t0 = performance.now(), D = dur || Math.min(1100, 420 + Math.abs(to - from) * 90);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / D);
      node.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 2)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  stat(kind, label, val, tickDir, from) {
    const s = el("div", "stat" + (tickDir ? " tick-" + tickDir : ""));
    s.innerHTML = `<span class="stat-ico ${kind}">${icon(kind)}</span>`
      + `<div><div class="stat-val">${val}</div><div class="stat-lbl">${label}</div></div>`;
    // The showdown breathes: a changed number ROLLS instead of teleporting.
    if (typeof from === "number" && typeof val === "number" && from !== val)
      this._rollNum(s.querySelector(".stat-val"), from, val);
    return s;
  }
  pip(status) {
    const labels = { wanted: "Wanted", terminated: "Terminated", exploded: "Exploded",
      overloaded: "Overload", awaiting_respawn: "Respawning" };
    const cls = status === "awaiting_respawn" ? "respawn" : status;
    const p = el("span", `pip ${cls}`);
    p.innerHTML = `${icon(status === "awaiting_respawn" ? "respawn" : status) || ""}<span>${labels[status] || status}</span>`;
    return p;
  }

  /* ----------------------------- Market ----------------------------- */
  _mountLedger() {
    if (document.getElementById("ledger-list")) return;
    const host = document.getElementById("log-zone");
    if (!host) return;
    const ledger = el("div", "ledger");
    ledger.innerHTML = `<div class="market-merchant-label">${icon("machine")} Chronometric Ledger</div><div id="ledger-list" class="ledger-list"></div>`;
    host.appendChild(ledger);
  }
  renderMarket() {
    this._mktSig = undefined;   // a direct call always renders; applyState re-keys it
    this._mountLedger();
    const m = this.dom.market;
    const v = this.view;
    m.innerHTML = "";

    // OPEN / CLOSED wooden sign, reflects THIS traveler's Merchant access.
    const access = !!v.market_access;
    this._updateMarketSign(access);

    if (this.dom.marketMeta) {
      const dice = v.merchant_movement_dice;
      const lm = v.merchant_last_move || 0;
      const dir = lm < 0 ? "◀ Year Zero": lm > 0 ? "XXX ▶": "--";
      this.dom.marketMeta.innerHTML =
        `<span class="mm-cell"><span class="mm-k">Century</span><span class="mm-v">${roman(v.merchant_century)}</span></span>` +
        `<span class="mm-cell"><span class="mm-k">Speed</span><span class="mm-v">${dice} ${dice === 1 ? "die" : "dice"}</span></span>` +
        `<span class="mm-cell" title="Relics the Merchant still carries, salvaged from the Incursion. When none are left to save, the match ends."><span class="mm-k">Relics</span><span class="mm-v">${v.merchant_card_count}</span></span>` +
        `<span class="mm-cell"><span class="mm-k">Heading</span><span class="mm-v">${dir}${lm ? ` (${Math.abs(lm)})` : ""}</span></span>`;
      // (WHEN, WHY, HOW and WHERE he moves are read on TAB, js/help.js)
    }

    // ---- Shopping mode: this seat is taking its Market turn, in-panel (no popup) ----
    const req = this.marketReq;
    const shopping = !!req;
    const renewMode = shopping && this.marketMode === "renew";
    // In-place card selection (steal / destroy / swap-copy) that targets Market cards.
    const sel = this.selectReq;
    const selCls = sel ? this._selClass(sel.mode) : "";
    const zone = document.getElementById("market-zone");
    if (zone) {
      zone.classList.toggle("shopping", shopping);
      zone.classList.toggle("closed", !access);
      zone.classList.toggle("selecting", !!sel);
      zone.classList.toggle("sel-steal", !!sel && sel.mode === "steal");
      zone.classList.toggle("sel-destroy", !!sel && sel.mode === "destroy");
    }
    const buyableNames = new Set(
      shopping ? (req.options.buyable || []).filter((c) => !c.secret).map((c) => c.name) : []);
    const renewableNames = new Set(
      shopping ? (req.options.renewable || []).map((c) => c.name) : []);

    // Merchant stock, the revealed cards (left, fills the space)
    const main = el("div", "market-main");
    main.appendChild(el("div", "market-merchant-label", "Relics salvaged from the Incursion"));
    const row = el("div", "market-row");
    (v.market_revealed || []).forEach((c) => {
      const card = this.cardEl(c);
      const selMeta = sel && sel.byName[c.name];
      if (shopping && !renewMode && buyableNames.has(c.name)) {
        // Buy is the hero drag: haul the card down into your Rucksack. Click stays
        // as a fallback (bots/accessibility); both fire the SAME commit.
        card.classList.add("is-actionable", "can-buy", "can-drag");
        const buy = () => this.marketAct({ action: "buy", card: c.name });
        card.addEventListener("click", () => { if (this._dragJustEnded) return; buy(); });
        this._wireCardDrag(card, c, buy, "buy");
      } else if (renewMode && renewableNames.has(c.name)) {
        card.classList.add("is-actionable", "can-renew");
        card.addEventListener("click", () => this.marketAct({ action: "renew", card: c.name }));
      } else if (selMeta && selMeta.zone === "market") {
        card.classList.add("is-actionable", selCls);
        const pick = () => this.respondSelect(c.name);
        card.addEventListener("click", () => { if (this._dragJustEnded) return; pick(); });
        // Stealing a Market card is a drag too (into your Rucksack -> you become Wanted).
        if (sel.mode === "steal") { card.classList.add("can-drag"); this._wireCardDrag(card, c, pick, "steal"); }
      }
      row.appendChild(card);
    });
    if (shopping) {
      // NOT the same case: trading in the Cove is not being ATEMPORAL. Only a
      // traveler with no market window at all is atemporal, and Hela says that,
      // because it is a fact about YOU, not a label on the wagon.
      const inCove = !!this.secretDeal;
      if (renewMode) {
      } else if (access) {

      } else if (inCove) {
      } else {
        this.helaSay("You are <b>atemporal</b>, the Merchant cannot see you.", 4200);
        this._helaAtemporal = true;
      }
    } else if (sel) {
    }
    main.appendChild(row);
    m.appendChild(main);

    // Action controls hang as wooden signs OFF the wagon's sides (rendered on the
    // zone so they can overhang; only while it's your Market turn).
    if (zone) {
      zone.querySelectorAll(".market-side-signs").forEach((e) => e.remove());
      if (shopping) this._renderSideSigns(zone, req, renewMode, access);
      this._bindRecycleDrop();
    }

    // Side column, Secret Market bay on top, the Chronometric Ledger below.
    const side = el("div", "market-side");
    side.appendChild(this._renderSecret(shopping, req));

    // the Chronometric Ledger lives by the Operations Log now (see _mountLedger)

    m.appendChild(side);
    this.renderLedger();
  }

  _sideSign(label, variant, onClick) {
    const s = el("button", "side-sign" + (variant ? " " + variant : ""), label);
    s.addEventListener("click", (e) => { audio.play("click"); onClick(e); });
    return s;
  }

  // The action controls hang as wooden ARROW signs stacked down the LEFT edge of the
  // wagon, attached to its border and overlapping it slightly for depth. (The
  // Briefcase is NOT here, it lives beside the Secret Market; see _renderSecret.)
  _renderSideSigns(zone, req, renewMode, access) {
    const o = req.options;
    const left = el("div", "market-side-signs left");
    if (renewMode) {
      left.appendChild(this._sideSign("Cancel", "", () => { this.marketMode = "buy"; this.renderMarket(); }));
    } else {
      if (o.renewable && o.renewable.length)
        left.appendChild(this._sideSign(`Renew (${o.renew_cost}g)`, "", () => { this.marketMode = "renew"; this.renderMarket(); }));
      if (o.can_declare)
        left.appendChild(this._sideSign("Declare (4g)", "", () => this.marketAct({ action: "declare" })));
      // PASS ends the phase, also when only the Secret Market is yours; it keeps the
      // wagon's wood like every other sign in the market (no violet variant).
      left.appendChild(this._sideSign("Pass", "", () => this.marketAct({ action: "pass" })));
    }
    if (left.children.length) zone.appendChild(left);
  }

  // The Secret Market bay, HIDDEN / DISCOVERED, buyable in-place, prison bars if Wanted.
  _renderSecret(shopping, req) {
    const v = this.view;
    const open = !!v.secret_market_open;        // DISCOVERED
    const current = v.secret_market_current;
    const me = (v.travelers || []).find((t) => t.is_self) || {};
    const sec = el("div", "market-secret");
    // (No caption over the window: the curtain itself says sealed or open, and the
    // purple "The sealed vault" line was noise the owner asked to remove.)
    // The Secret Market lives behind a velvet curtain: it stays CLOSED while the market
    // is Hidden (and while the discovery is still calculating), then draws OPEN and
    // stays open once it's Discovered. The bay/card is built into a "stage" the
    // curtain covers.
    const stage = el("div", "secret-stage");
    // Edison's Lamp resolves its peek / buy / steal HERE in the bay (§24), not in a
    // popup, even while the market is Hidden (a private peek only the acting seat sees).
    const deal = this.secretDeal;
    // The curtain is OPEN whenever the market is Discovered; while it's still being
    // discovered we play the one-shot "opening" sweep first, then the card materializes.
    stage.classList.add(open || deal ? "open" : "closed");
    if (open && this._secretOpening) stage.classList.add("opening");
    if (deal) {
      const o = deal.options;
      const steal = o.action === "steal";
      const wrap = el("div", "secret-card-wrap");
      const card = this.cardEl(o.card);
      card.classList.add("is-secret", "is-actionable", steal ? "can-steal" : "can-select");
      const take = () => { this.secretDeal = null; this.respond({ take: true }); this.renderMarket(); };
      if (o.affordable !== false) card.addEventListener("click", take);
      wrap.appendChild(card);
      const ctl = el("div", "secret-deal-ctl");
      const takeBtn = el("button", "sd-take " + (steal ? "steal" : "buy"),
        steal ? "Steal (Wanted)" : `Buy ${o.cost}g`);
      if (o.affordable === false) takeBtn.disabled = true;
      takeBtn.addEventListener("click", take);
      const passBtn = el("button", "sd-pass", "Pass");
      passBtn.addEventListener("click", () => {
        this.secretDeal = null; this.respond({ take: false }); this.renderMarket(); });
      ctl.appendChild(takeBtn); ctl.appendChild(passBtn);
      wrap.appendChild(ctl);
      stage.appendChild(wrap);
    } else if (open && this._secretRevealing) {
      // the reveal FX tells this moment; the window stays quiet while the card forms
      const bay = el("div", "secret-bay open materializing");
      stage.appendChild(bay);
    } else if (open && current) {
      const wrap = el("div", "secret-card-wrap");
      const card = this.cardEl(current); card.classList.add("is-secret");
      const secretBuyable = shopping
        && (req.options.buyable || []).some((c) => c.secret && c.name === current.name);
      const selMeta = this.selectReq && this.selectReq.byName[current.name];
      if (secretBuyable) {
        card.classList.add("is-actionable", "can-buy");
        card.addEventListener("click", () => this.marketAct({ action: "buy", card: current.name, secret: true }));
      } else if (selMeta && selMeta.zone === "secret") {
        card.classList.add("is-actionable", this._selClass(this.selectReq.mode));
        card.addEventListener("click", () => this.respondSelect(current.name));
      }
      wrap.appendChild(card);
      // Wanted -> Old-West prison bars over the Secret Market for that traveler. They
      // persist while Wanted regardless of synchrony; they clear only when the
      // Wanted condition is paid off (Declare) or the traveler is Terminated (§24.5).
      if (me.is_wanted) {
        const bars = el("div", "secret-bars");
        bars.title = "WANTED: barred from the Secret Market";
        bars.innerHTML = `<i></i><i></i><i></i><i></i><i></i>`;
        wrap.appendChild(bars);
      }
      stage.appendChild(wrap);
    } else {
      const bay = el("div", "secret-bay" + (open ? " open" : ""));
      // Hidden: the curtain covers it, nothing to write. Discovered and sold out:
      // one chalk line on the sill, because an empty window alone could read as a bug.
      if (open) bay.innerHTML = `<div class="bay-text">Sold out</div>`;
      stage.appendChild(bay);
    }
    // The curtain overlay: a gilded rod, two velvet panels, and a lock crest shown while
    // it's drawn shut.
    // THE CURTAIN IS A REAL ROOM OBJECT: it hangs on the WALL over the whole
    // dimensional window (not inside it), a zone-level singleton that mirrors
    // the stage's open/closed state.
    const zone2 = document.getElementById("market-zone");
    if (zone2) {
      let curt = zone2.querySelector(":scope > .secret-curtain");
      if (!curt) {
        curt = el("div", "secret-curtain");
        // HELA'S SEAL, the Cove's padlock, drawn in her language (aqua thin-line,
        // her rotating ring + pulsing core as the keyhole), projected on the curtain.
        curt.innerHTML = `<span class="sc-panel sc-l"></span><span class="sc-panel sc-r"></span>`
          + `<span class="sc-rod"></span><span class="sc-crest">${icon("helalock")}</span>`;
        zone2.appendChild(curt);
      }
      curt.classList.toggle("open", !!(open || deal));
      curt.classList.toggle("closed", !(open || deal));
      curt.classList.toggle("opening", !!(open && this._secretOpening));
    }
    sec.appendChild(stage);
    // The Temporal Briefcase upgrade is a Secret-Market perk: a wooden arrow plank in
    // the SAME wood as the wagon's action signs (Renew, Declare, Pass), hung under the
    // Secret Market's counter. Shown only while you have Secret Market access (§24).
    // Layers instead of CSS filters: a cast shadow, the dark routed edge, the lit face.
    if (shopping && req && req.options.briefcase) {
      sec.classList.add("has-brief");
      const bc = el("button", "secret-brief-sign");
      bc.setAttribute("aria-pressed", "false");
      bc.innerHTML = `<span class="bs-shadow" aria-hidden="true"></span><span class="bs-plank" aria-hidden="true"></span>`
        + `<span class="bs-label">${icon("briefcase")}<span>Briefcase ${req.options.briefcase.cost}g</span></span>`;
      bc.title = "Temporal Briefcase, buy a permanent +1 equipment slot (once per traveler)";
      bc.addEventListener("click", (e) => { audio.play("click"); this.marketAct({ action: "briefcase" }); });
      sec.appendChild(bc);
    }
    return sec;
  }

  // Flip the OPEN/CLOSED sign when this seat's access changes; ring the bell + play
  // the "market opens" moment ONLY when access is newly GAINED (§ Cat-3 feedback).
  _updateMarketSign(access) {
    const sgn = this.dom.marketSign;
    if (!sgn) return;
    // While a swap animation is playing it OWNS the sign, later re-renders must not
    // stamp the new state early (that bug made it always look like OPEN was broken).
    if (this._signAnimating) return;
    const want = access ? "open" : "closed";
    const changed = this._signState != null && this._signState !== want;
    this._signState = want;
    if (!changed) {   // first render, set instantly, no animation
      sgn.classList.remove("open", "closed"); sgn.classList.add(want);
      sgn.innerHTML = `<span>${access ? "OPEN" : "CLOSED"}</span>`;
      return;
    }
    // OFF-SCENE: no theater plays to an empty house. Snap silently and OWE the
    // drop, it plays the moment the player actually looks at the market.
    if (this.camera && this.camera.scene !== "market") {
      this._pendingSignDrop = true;
      sgn.classList.remove("open", "closed"); sgn.classList.add(want);
      sgn.innerHTML = `<span>${access ? "OPEN" : "CLOSED"}</span>`;
      return;
    }
    this._signAnimating = true;
    this.merchantSignSwap(sgn, access);   // the sign simply drops and swaps
    if (access) this.marketOpenMoment();
  }

  merchantSignSwap(sgn, access) {
    // THE BASIC DROP (the shattering screen and merchant fingers were retired):
    // the old sign falls off its nail; the new one drops in with a small settle.
    const r = sgn.getBoundingClientRect();
    if (!r.width) {
      sgn.classList.remove("open", "closed"); sgn.classList.add(access ? "open" : "closed");
      sgn.innerHTML = `<span>${access ? "OPEN" : "CLOSED"}</span>`;
      this._signAnimating = false; return;
    }
    const sc = this._scale();
    const fall = sgn.animate([
      { transform: "rotate(0deg) translateY(0)", opacity: 1 },
      { transform: "rotate(9deg) translateY(6px)", opacity: 1, offset: .3 },
      { transform: "rotate(22deg) translateY(90px)", opacity: 0 },
    ], { duration: 420 * sc, easing: "cubic-bezier(.5,0,.8,.4)" });
    fall.onfinish = () => {
      sgn.classList.remove("open", "closed"); sgn.classList.add(access ? "open" : "closed");
      sgn.innerHTML = `<span>${access ? "OPEN" : "CLOSED"}</span>`;
      audio.play("place");
      sgn.animate([
        { transform: "translateY(-46px)", opacity: 0 },
        { transform: "translateY(3px)", opacity: 1, offset: .72 },
        { transform: "translateY(0)", opacity: 1 },
      ], { duration: 380 * sc, easing: "cubic-bezier(.2,.8,.3,1.1)" }).onfinish = () => {
        this._signAnimating = false;
      };
    };
  }

  marketAct(data) {
    if (data && data.action === "buy" && window.__handPlunge) window.__handPlunge();
    this.marketReq = null;
    this.marketMode = "buy";
    this.respond(data);
    this.renderMarket();
  }

  dn(card) {
    if (card && card.display_name) this.nameMap[card.name] = card.display_name;
    return (card && (card.display_name || card.name)) || "";
  }
  nameEn(name) { return (this.nameMap && this.nameMap[name]) || name; }

  cardEl(card, opts = {}) {
    const c = el("div", "card" + (opts.mini ? " mini" : ""));
    c.dataset.name = card.name;
    c.style.setProperty("--era", eraColor(card.delivery_century));  // era-coloured border
    c.innerHTML = `
      <div class="card-cost" title="Gold cost">${card.gold_cost}</div>
      ${card.is_large_item ? `<div class="card-large-tag">Large</div>` : ""}
      <div class="card-name">${this.dn(card)}</div>
      <div class="card-type">${(card.ability_type || "").replace(/_/g, " ")}</div>
      <div class="card-foot">
        <span class="card-deliver" title="Delivery century"><span class="cd-ico">${icon("delivery")}</span><span class="cd-cent">${roman(card.delivery_century)}</span></span>
        <span class="card-recycle" title="Recycle value (energy gained)"><span class="rec-ico">${icon("recycle")}</span>${card.recycle_value}</span>
      </div>`;
    this.attachCardHover(c, card);
    this.attachCardTilt(c);
    return c;
  }

  /* ---------------- Card detail popover (hover) --------------------- */
  attachCardHover(node, card) {
    node.addEventListener("mouseenter", () => this.showCardPop(card, node));
    node.addEventListener("mousemove", (e) => this.positionCardPop(e));
    node.addEventListener("mouseleave", () => this.hideCardPop());
  }

  // Weight & touch (Wave 2): the card tilts in 3D toward the cursor with a glare
  // that tracks the pointer, then springs back flat on leave. The CSS reads the
  // --rx/--ry (tilt) and --mx/--my (glare origin) vars; the transform lives on
  // `.card.tilt` so it never fights the actionable hover rules. Skipped when the
  // user prefers reduced motion.
  attachCardTilt(node) {
    if (this._reducedMotion()) return;
    node.classList.add("tilt");
    node.addEventListener("mousemove", (e) => {
      const r = node.getBoundingClientRect();
      if (!r.width) return;
      const px = (e.clientX - r.left) / r.width;    // 0..1 across
      const py = (e.clientY - r.top) / r.height;    // 0..1 down
      node.style.setProperty("--rx", ((0.5 - py) * 9).toFixed(2) + "deg");
      node.style.setProperty("--ry", ((px - 0.5) * 11).toFixed(2) + "deg");
      node.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      node.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    });
    node.addEventListener("mouseleave", () => {
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
    });
  }
  showCardPop(card, node) {
    this.hideCardPop();
    this._popNode = node;
    // THE STICKY-POPUP BUG: mouseleave is bound to the CARD NODE, so when a
    // re-render REMOVES that node while it is hovered, the event never fires and
    // the popup is orphaned on screen. Guard it at the document level instead:
    // a frame watchdog (node detached?) + a pointer guard (cursor really left?).
    if (!this._popGuard) {
      this._popGuard = (e) => {
        if (!this.cardPop) return;
        const n = this._popNode;
        if (!n || !n.isConnected) return this.hideCardPop();
        const r = n.getBoundingClientRect();
        if (e.clientX < r.left - 2 || e.clientX > r.right + 2 ||
            e.clientY < r.top - 2 || e.clientY > r.bottom + 2) this.hideCardPop();
      };
      document.addEventListener("mousemove", this._popGuard, true);
    }
    const watch = () => {
      if (!this.cardPop) { this._popRaf = 0; return; }
      if (!this._popNode || !this._popNode.isConnected) { this.hideCardPop(); return; }
      this._popRaf = requestAnimationFrame(watch);
    };
    if (!this._popRaf) this._popRaf = requestAnimationFrame(watch);
    const p = el("div", "card-pop");
    p.style.setProperty("--era", eraColor(card.delivery_century));
    p.innerHTML = `
      <div class="cp-name">${this.dn(card)}</div>
      <div class="cp-kind">${card.kind_label || (card.ability_type || "").replace(/_/g, " ")} · ${eraName(card.delivery_century)}</div>
      <div class="cp-desc">${card.description || "--"}</div>
      <div class="cp-stats">
        <span class="cp-stat gold">${icon("gold")} ${card.gold_cost}g</span>
        <span class="cp-stat clock">${icon("clock")} Deliver ${roman(card.delivery_century)}</span>
        <span class="cp-stat energy">${icon("energy")} Recycle ${card.recycle_value}</span>
      </div>`;
    this.dom.overlay.appendChild(p);
    this.cardPop = p;
    const r = node.getBoundingClientRect();
    this._popAnchor = { x: r.left + r.width / 2, y: r.top };
    this.positionCardPop();
  }
  positionCardPop(e) {
    if (!this.cardPop) return;
    const a = this._popAnchor || { x: (e ? e.clientX : 0), y: (e ? e.clientY : 0) };
    const w = 264, h = this.cardPop.offsetHeight || 150;
    let x = a.x - w / 2;
    x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
    let y = a.y - h - 12;
    if (y < 8) y = a.y + 24;          // flip below if no room above
    this.cardPop.style.left = x + "px";
    this.cardPop.style.top = y + "px";
  }
  hideCardPop() {
    if (this.cardPop) { this.cardPop.remove(); this.cardPop = null; }
    this._popNode = null;
    if (this._popRaf) { cancelAnimationFrame(this._popRaf); this._popRaf = 0; }
  }

  /* ------------------------- Time Machine --------------------------- */
  // CLEAN-UP, the last step of the Generators phase (after the last travel). Every
  // traveller's machine is emptied and the overload markers land, which is when the
  // passives that watch for an overload fire. The screen goes dark HERE, at the tail of
  // the phase, not whenever the phase happens to end: the dice must never linger into
  // what comes next, and a screen still lit after the travelling is over reads as if
  // the hand were still in play.
  // Seal the overloaded functions ON the machine while the screen is still lit, so the
  // overload is SEEN landing at clean-up instead of being a fact you discover next Hour.
  showOverload(rows) {
    this._ovlShow = new Set(rows || []);
    this.renderMachineIdle();
    if (window.__cabinPulse) window.__cabinPulse();
  }

  cleanUpGenerators() {
    this._ovlShow = null;
    this._ovlCleanHour = this.view ? this.view.hour : null;   // this Hour's seals have done their work
    this.myLastMatrix = null;
    this._lastAlloc = null;
    this._dealtSeats = null;
    try { this._paintBadgeAllocs(); } catch (e) {}
    this.renderMachineIdle();
    this.renderDiceIdle();
    document.body.classList.add("gen-cleaned");
    if (window.__cabinPulse) window.__cabinPulse();
  }

  // THE SHUT FUNCTIONS, for the marks on the machine: while allocating, the rows sealed
  // this Hour; after a clean-up, the ones that just overloaded (shut NEXT Hour); until
  // this Hour's clean-up, the ones shut now. { rows: Set of function indices, next }
  shutRows() {
    if (this.alloc) return { rows: this.alloc.unavailable, next: false };
    const me = this._self();
    const next = new Set([...(this._ovlShow || []), ...((me && me.overloaded_next) || [])]);
    if (next.size) return { rows: next, next: true };
    const hourDone = this.view && this._ovlCleanHour === this.view.hour;
    return { rows: new Set(me && !hourDone ? me.overloaded_functions || [] : []), next: false };
  }
  // the readable mark across a shut row of the machine (not a flash: it stays while shut)
  _shutMark(wrap, r, on, next) {
    let m = wrap.querySelector(`.fn-shut[data-r="${r}"]`);
    if (!on) { if (m) m.remove(); return; }
    if (!m) { m = el("div", "fn-shut"); m.dataset.r = r; m.style.setProperty("--r", r); wrap.appendChild(m); }
    const t = `SHUT ${next ? "NEXT" : "THIS"} HOUR`;
    if (m.textContent !== t) m.textContent = t;
  }

  renderMachineIdle() {
    // The Test Room's machine is LIVE (rows installed at auction): its own
    // renderer owns the slot. Classic games never take this branch.
    if (this.view && this.view.mode === "leilao" && window.__leilaoMachine)
      return window.__leilaoMachine.idle(this);
    const body = this.dom.machine;
    body.innerHTML = "";
    body.appendChild(this.matrixEl(this.myLastMatrix || null, { interactive: false }));
    const shut = this.shutRows();
    if (shut.rows.size) body.appendChild(el("div", "shut-idle", [...shut.rows].sort()
      .map((r) => `<b>${FUNCTIONS[r].name.toUpperCase()}<br>SHUT ${shut.next ? "NEXT" : "THIS"} HOUR</b>`).join("")));
  }

  matrixEl(matrix, { interactive }) {
    const wrap = el("div", "matrix-wrap");
    // whether these cells carry their click/drag wiring, so a later patch knows if it may
    // reuse them: patching an idle matrix would leave a machine that ignores every click
    if (interactive) wrap.dataset.live = "1";
    const selfT = this.view && this.view.travelers && this.view.travelers.find((x) => x.is_self);
    const buffs = {};
    (selfT && selfT.matrix_buffs || []).forEach(([m, b]) => { buffs[m] = b; });
    const shut = this.shutRows();
    FUNCTIONS.forEach((fn, r) => {
      const lab = el("div", "matrix-fnlabel");
      lab.classList.add(fn.cls);              // fn-recharge/paradox/travel
      lab.title = fn.name;                    // gauntlet: shown as a brass ball, name on hover
      // sealed while allocating (the row is condemned this Hour), or sealed right now at
      // clean-up, where the overload is shown landing before the screen goes dark
      const rowSealed = shut.rows.has(r);
      if (rowSealed) lab.classList.add("fn-sealed");   // OVERLOAD: the row is condemned
      this._shutMark(wrap, r, rowSealed, shut.next);
      lab.innerHTML = `<span class="fn ${fn.cls}">${fn.name}</span>`;
      wrap.appendChild(lab);
      fn.mods.forEach((mod, c) => {
        // A module may be RELABELLED for a reduced machine (the tutorial does this: while the
        // matrix is two columns wide, the second paradox module is the Past, not the Present,
        // so a shortened function still reaches both ways along the years). The icon and the
        // caption move together with the behaviour, or the cell would lie about what it does.
        const sw = this._modSwap && this._modSwap[r + "," + c];
        const [glyph, caption] = sw || mod;
        const cell = el("div", "cell");
        cell.dataset.r = r; cell.dataset.c = c;
        const modNum = r * 3 + c + 1;
        const buff = buffs[r * 3 + c];
        if (buff) cell.classList.add("buffed");
        const unavailable = rowSealed;
        if (unavailable) cell.classList.add("locked");
        // no native title tooltips: the red hatched seal (locked) + fn-sealed label
        // carry OVERLOAD visually, and TAB is the reference. Zero yellow bubbles.
        const val = matrix ? matrix[r][c] : (this.alloc ? this.alloc.matrix[r][c] : 0);
        cell.dataset.val = val;                 // what this cell holds, so a re-render can diff
        cell.innerHTML = `<span class="mod-num">${modNum}</span>`
          + (buff ? `<span class="mod-buff" title="Permanent module buff (+${buff})">+${buff}</span>` : "");
        if (val) {
          cell.classList.add("filled");
          cell.appendChild(this.dieEl(val, { placed: true, r, c }));
        } else {
          cell.innerHTML += `<span class="mod-ico">${icon(glyph)}</span><span class="mod-cap">${caption}</span>`;
        }
        if (interactive) {
          this.wireCell(cell, r, c);
          cell.addEventListener("click", () => this.onCellClick(r, c));
        }
        wrap.appendChild(cell);
      });
    });
    return wrap;
  }

  dieEl(value, opts = {}) {
    const d = el("div", "die" + (opts.placed ? " placed" : "") + (opts.static ? " static" : ""));
    d.dataset.v = String(value);      // the generator is coloured BY VALUE: I green · II yellow · III red
    d.innerHTML = `<span class="pips-face">${roman(value)}</span>`;  // Roman numeral face
    d.dataset.value = value;
    if (opts.static) { d.draggable = false; return d; }
    if (this.alloc && !this.awaitingReveal) {
      const source = opts.placed ? "cell" : (opts.escape ? "escape" : "pool");
      d.dataset.source = source;
      if (opts.placed) { d.dataset.r = opts.r; d.dataset.c = opts.c; }
      if (source === "pool") d.dataset.idx = opts.idx;
      d.draggable = true;
      d.addEventListener("dragstart", (e) => this.onDragStart(e, d, value));
      d.addEventListener("dragend", () => this.onDragEnd());
      d.addEventListener("click", (e) => { e.stopPropagation(); this.onDieClick(value, source, opts, e); });
      const sel = this.selected;
      if (sel && sel.source === source && sel.value === value &&
          (source !== "pool" || sel.idx === opts.idx) &&
          (source !== "cell" || (sel.r === opts.r && sel.c === opts.c))) d.classList.add("selected");
    } else if (opts.placed) {
      d.classList.add("static");
    }
    return d;
  }

  // Quantum-computer dice materialisation: each generator scrambles through
  // green binary/glitch glyphs before its Roman-numeral result snaps into being.
  _animateRoll(pool) {
    const dice = [...pool.querySelectorAll(".die")];
    if (!dice.length) return;
    const GLYPHS = "01010110100101101001";
    dice.forEach((d, i) => {
      const face = d.querySelector(".pips-face");
      if (!face) return;
      const finalTxt = face.textContent;
      d.classList.add("rolling");
      const start = performance.now();
      const dur = (520 + i * 110) * this._scale();   // staggered, honours Slow/Fast
      const tick = (now) => {
        if (now - start >= dur) {
          face.textContent = finalTxt;
          d.classList.remove("rolling");
          d.classList.add("rolled");
          audio.play("dice_lock");
          setTimeout(() => d.classList.remove("rolled"), 360);
          return;
        }
        // show a short run of binary digits, churning fast
        let s = "";
        for (let k = 0; k < 2; k++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        face.textContent = s;
        setTimeout(() => requestAnimationFrame(tick), 45);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------------- Allocation decision (interactive) --------------- */
  startAllocation(req) {
    this._endCarry(false);
    const dice = (req.private && req.private.dice) || (req.options && req.options.dice) || [];
    this.alloc = {
      matrix: [[0,0,0],[0,0,0],[0,0,0]],
      escape: 0,
      pool: dice.slice(),
      total: dice.length,
      unavailable: new Set(req.options.unavailable_functions || []),
    };
    this._allocHist = [];
    this.selected = null;
    this.awaitingReveal = false;
    this.clearPrompt();
    this.renderMachineAlloc();
    this.renderDiceCockpit();
    if (window.__cabinPulse) window.__cabinPulse();   // wake the cockpit NOW, not on the next tick
    // in the cabin, allocation stays clean, no auto teaching card; TAB is the help.
    if (!document.body.classList.contains("cabin-on")) tutorials.show("allocate");
  }

  // The TIME MACHINE quick reference, a diegetic phosphor card (rung-3 inspect).
  // Built once; reuses the SAME module icons drawn on the screen so one visual
  // language teaches everything. my full tutorial will supersede this.
  _buildManoHelp() {
    if (this._manoHelpEl) return this._manoHelpEl;
    const rows = FUNCTIONS.map((fn) => {
      const mods = fn.mods.map(([g, cap]) =>
        `<span class="mh-mod"><span class="mh-ico">${icon(g)}</span><b>${cap}</b></span>`).join("");
      return `<div class="mh-row ${fn.cls}"><span class="mh-fn">${fn.name}</span>`
        + `<div class="mh-mods">${mods}</div></div>`;
    }).join("");
    const wrap = el("div", "mano-help"); wrap.id = "mano-help";
    wrap.innerHTML = `<div class="mh-veil"></div>`
      + `<div class="mh-card" role="dialog" aria-label="Time Machine reference">`
      + `<div class="mh-head">THE TIME MACHINE</div>`
      + `<div class="mh-sub">place this hour's dice,  each module programs a different outcome</div>`
      + `<div class="mh-matrix">${rows}</div>`
      + `<div class="mh-parts">`
      + `<div class="mh-part"><i class="mh-k k-boom"></i><span><b>BOOM</b> pressure 0-12 \u00b7 the red zone risks detonation</span></div>`
      + `<div class="mh-part"><i class="mh-k k-vent"></i><span><b>ESCAPE VALVE</b> takes one spare die: while a function is shut it drains that die in energy, otherwise it charges a +1 module upgrade</span></div>`
      + `<div class="mh-part"><i class="mh-k k-tray"></i><span><b>GENERATORS</b> your dice this hour,  drag one into a module</span></div>`
      + `<div class="mh-part"><i class="mh-k k-keys"></i><span><b>CLEAR / CONFIRM</b> reset, or seal the allocation</span></div>`
      + `</div>`
      + `<div class="mh-foot">T or ESC to close</div>`
      + `</div>`;
    document.body.appendChild(wrap);
    wrap.querySelector(".mh-veil").addEventListener("click", () => this._manoHelpToggle(false));
    this._manoHelpEl = wrap;
    return wrap;
  }
  _manoHelpToggle(force) {
    const on = (typeof force === "boolean") ? force : !this._manoHelpOn;
    if (on && !document.body.classList.contains("cabin-on")) return;
    const wrap = this._buildManoHelp();
    this._manoHelpOn = on;
    document.body.classList.toggle("mano-help-on", on);
    requestAnimationFrame(() => wrap.classList.toggle("on", on));
    try { audio.play(on ? "click" : "whiff"); } catch (e) {}
  }

  // PATCH THE MACHINE, DO NOT REBUILD IT. This used to wipe the matrix and build all twelve
  // elements again for a change to ONE cell, which threw away the very cell the player had
  // just touched. A destroyed node cannot finish a transition, so the machine answered every
  // placement with a flicker instead of a movement, and it re-parsed twelve chunks of HTML
  // and re-attached forty listeners each time. The matrix is built once; after that only the
  // cells whose contents actually changed are touched, so the socket animation on the die he
  // just set survives and the rest of the machine is left alone.
  renderMachineAlloc() {
    if (this.view && this.view.mode === "leilao" && window.__leilaoMachine)
      return window.__leilaoMachine.idle(this);
    const body = this.dom.machine;
    const wrap = body.querySelector('.matrix-wrap[data-live="1"]');
    if (!wrap || !this.alloc) {
      body.innerHTML = "";
      body.appendChild(this.matrixEl(null, { interactive: true }));
      return;
    }
    FUNCTIONS.forEach((fn, r) => {
      const rowSealed = this.alloc.unavailable.has(r);
      const lab = wrap.querySelector(`.matrix-fnlabel.${fn.cls}`);
      if (lab) lab.classList.toggle("fn-sealed", rowSealed);
      this._shutMark(wrap, r, rowSealed, false);
      fn.mods.forEach((mod, c) => {
        const sw = this._modSwap && this._modSwap[r + "," + c];
        const [glyph, caption] = sw || mod;
        const cell = wrap.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;
        cell.classList.toggle("locked", rowSealed);
        const val = this.alloc.matrix[r][c];
        if (+(cell.dataset.val || 0) === val) return;   // unchanged: hands off
        cell.dataset.val = val;
        const modNum = r * 3 + c + 1;
        const buff = cell.classList.contains("buffed")
          ? (cell.querySelector(".mod-buff") || {}).outerHTML || "" : "";
        cell.classList.toggle("filled", !!val);
        cell.innerHTML = `<span class="mod-num">${modNum}</span>` + buff;
        if (val) cell.appendChild(this.dieEl(val, { placed: true, r, c }));
        else cell.innerHTML += `<span class="mod-ico">${icon(glyph)}</span>`
          + `<span class="mod-cap">${caption}</span>`;
      });
    });
  }

  // The cockpit toolbar is a horizontal strip: Generators · Escape valve ·
  // Equipped cards · Consumables/Vouchers (matching the bottom-of-stage labels).
  renderDiceCockpit() {
    const body = this.dom.dice;
    body.innerHTML = "";
    const placed = this.alloc.total - this.alloc.pool.length;
    if (this.dom.diceMeta) this.dom.diceMeta.textContent = `${placed}/${this.alloc.total} placed`;

    const cols = el("div", "dice-cols");

    // Generators column, the pool + Clear/Confirm actions.
    const genCol = el("div", "dice-col gen-col");
    genCol.appendChild(el("div", "dice-pool-label", "Generators"));
    const pool = el("div", "dice-pool" + (this.alloc.pool.length ? "" : " empty"));
    pool.dataset.drop = "pool";
    this.alloc.pool.forEach((v, i) => pool.appendChild(this.dieEl(v, { idx: i })));
    // an empty tray says nothing: the lit CONFIRM key (and the tutorial's arrow) is
    // the one instruction; a second one written in the tray read as clutter
    this.wirePool(pool);
    genCol.appendChild(pool);
    if (this._rollFx) { this._rollFx = false; this._animateRoll(pool); }
    const actions = el("div", "dice-actions");
    const clear = el("button", "btn btn-ghost btn-sm", "Clear");
    clear.addEventListener("click", () => this.clearAllocation());
    const confirm = el("button", "btn btn-primary btn-sm", "Confirm");
    confirm.id = "confirm-alloc";
    confirm.disabled = this.alloc.pool.length !== 0;
    confirm.addEventListener("click", () => this.confirmAllocation());
    actions.appendChild(clear); actions.appendChild(confirm);
    genCol.appendChild(actions);
    cols.appendChild(genCol);

    // Escape valve column (only usable when a function is overloaded, §29.8).
    cols.appendChild(this._escapeColEl(true));
    cols.appendChild(this._vitalsColEl());

    body.appendChild(cols);
  }

  renderDiceIdle() {
    if (this.view && this.view.mode === "leilao" && window.__leilaoMachine)
      return window.__leilaoMachine.dice(this);
    const body = this.dom.dice;
    if (!body) return;
    body.innerHTML = "";
    if (this.dom.diceMeta) this.dom.diceMeta.textContent = "";

    const cols = el("div", "dice-cols");
    const genCol = el("div", "dice-col gen-col");
    if (this.awaitingReveal) {
      genCol.appendChild(el("div", "dice-pool-label", "Generators"));
      genCol.appendChild(el("div", "dice-idle", "Allocation locked, awaiting the other operatives..."));
    } else if (this.myDice && this.myDice.length) {
      genCol.appendChild(el("div", "dice-pool-label", "Generators this Hour"));
      const pool = el("div", "dice-pool");
      this.myDice.forEach((v) => pool.appendChild(this.dieEl(v, { static: true })));
      genCol.appendChild(pool);
    } else {
      genCol.appendChild(el("div", "dice-pool-label", "Generators"));
      genCol.appendChild(el("div", "dice-idle", "Roll at the start of each Generators phase."));
    }
    cols.appendChild(genCol);

    // Escape valve (idle, not usable outside allocation, but the Heat gauge lives here).
    cols.appendChild(this._escapeColEl(false));
    cols.appendChild(this._vitalsColEl());

    body.appendChild(cols);
  }

  // The Escape Valve column, a paradox-venom pressure valve whose combusting
  // gears worsen as your Heat (booms) rises, ringed by a Heat gauge (booms/12).
  // Shared by the idle view and the interactive allocation cockpit.
  _escapeColEl(interactive) {
    const me = this._self();
    const booms = me ? (me.booms || 0) : 0;
    const heat = Math.max(0, Math.min(1, booms / 12));
    const overloaded = !!(this.alloc && this.alloc.unavailable.size > 0);
    const usable = interactive && !!this.alloc;   // valve ALWAYS usable now (§11.2 ext): overloaded dumps, calm feeds the reactor
    const col = el("div", "dice-col escape-col");
    col.appendChild(el("div", "dice-pool-label", "Escape valve"));
    const esc = el("div", "escape-slot venom" + (usable ? "" : " disabled"));
    esc.style.setProperty("--heat", heat.toFixed(3));
    esc.innerHTML = `<span class="ev-gear ev-gear-a"></span>`
      + `<span class="ev-gear ev-gear-b"></span><span class="ev-venom"></span>`;
    // Heat gauge ring wrapping the vent socket.
    const ring = el("div", "heat-ring");
    ring.style.setProperty("--heat", heat.toFixed(3));
    if (!document.body.classList.contains("cabin-on")) ring.title = `Heat, ${booms}/12 booms`;
    const drop = el("div", "escape-drop");
    drop.dataset.drop = "escape";
    if (interactive && this.alloc && this.alloc.escape)
      drop.appendChild(this.dieEl(this.alloc.escape, { escape: true }));
    if (usable) { this.wireEscape(drop); drop.addEventListener("click", () => this.onEscapeClick()); }
    ring.appendChild(drop);
    ring.appendChild(el("span", "heat-num", String(booms)));
    esc.appendChild(ring);
    const escText = el("div", "esc-text");
    escText.appendChild(el("div", "small",
      interactive ? (overloaded ? "Dump a die (loses energy)"
                                 : `Feed the reactor \u00b7 ${(me && me.valve_charge) || 0}/10`)
                  : "Used during allocation"));
    esc.appendChild(escText);
    col.appendChild(esc);
    return col;
  }

  // Living personal VITALS mounted on the gauntlet's forearm (Wave 3b): Energy as
  // a phosphor EKG (flatlines when Terminated), Gold as a C.R.O.N.O.S. coin, and
  // Contract Points as an APPROVED-stamped contract. Heat/booms live at the valve.
  _vitalsColEl() {
    const me = this._self();
    const col = el("div", "dice-col vitals-col");
    col.appendChild(el("div", "dice-pool-label", "Vitals"));
    if (!me) return col;
    const terminated = (me.statuses || []).includes("terminated") || me.is_terminated;
    const wrap = el("div", "vitals-wrap");
    const pv = this._prevSelfVitals || {};
    const ekg = el("div", "vital-ekg" + (terminated ? " flatline" : ""));
    ekg.title = `Energy, ${me.energy}`;
    ekg.innerHTML =
      `<svg class="ekg-svg" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">`
      + `<polyline points="0,15 20,15 26,15 32,3 38,27 44,15 66,15 72,7 78,23 84,15 120,15"/></svg>`
      + `<span class="ekg-read">${icon("energy")}<b>${me.energy}</b></span>`;
    wrap.appendChild(ekg);
    const row = el("div", "vitals-row");
    const gold = el("div", "vital-chip vc-gold"); gold.title = `Gold, ${me.gold}`;
    gold.innerHTML = `<span class="vc-ico coin">${icon("gold")}</span><b>${me.gold}</b>`;
    const cp = el("div", "vital-chip vc-cp"); cp.title = `Contract Points, ${me.contract_points}`;
    cp.innerHTML = `<span class="vc-ico stamp">${icon("cp")}</span><b>${me.contract_points}</b>`;
    row.appendChild(gold); row.appendChild(cp);
    wrap.appendChild(row);
    col.appendChild(wrap);
    // the operative's own vitals ROLL like the rivals' panels
    this._rollNum(ekg.querySelector("b"), pv.energy, me.energy);
    this._rollNum(gold.querySelector("b"), pv.gold, me.gold);
    this._rollNum(cp.querySelector("b"), pv.cp, me.contract_points);
    if (pv.energy !== undefined && pv.energy !== me.energy)
      ekg.classList.add(me.energy > pv.energy ? "vital-up" : "vital-down");
    this._prevSelfVitals = { energy: me.energy, gold: me.gold, cp: me.contract_points };
    return col;
  }

  // The traveler controlled by this seat (full self-view), or null.
  _self() {
    if (!this.view) return null;
    return this.view.travelers.find((t) => t.is_self || t.name === this.seat) || null;
  }

  /* =========================== THE RUCKSACK ============================
     The operative's own worn travelling bag, a distinct third personal zone.
     Equipped objects are real mini-cards tucked into the bag's mouth at slight,
     uneven angles (messy on purpose); consumable vouchers ride in a side pocket.
     Capacity reads as strap-loops in the header (filled loop = a tucked card). */
  renderRucksack() {
    const host = this.dom.ruck;
    if (!host) return;
    host.innerHTML = "";
    const me = this._self();
    const items = me ? (me.hand || me.equipment || []) : [];
    const cap = me ? (me.equipment_capacity ?? 2) : 2;

    // Capacity as strap-loops in the header meta (instant legibility, no text).
    if (this.dom.ruckMeta) {
      this.dom.ruckMeta.innerHTML = "";
      const loops = el("div", "ruck-loops");
      loops.title = `${items.length}/${cap} objects carried`;
      for (let i = 0; i < cap; i++)
        loops.appendChild(el("span", "ruck-loop" + (i < items.length ? " filled" : "")));
      this.dom.ruckMeta.appendChild(loops);
    }

    // The bag's mouth: objects tucked in at slight, uneven angles, fanned so the
    // pack looks stuffed. Deterministic per-slot tuck keeps it stable on re-render.
    const pocket = el("div", "ruck-pocket");
    if (items.length) {
      const TUCK = [-5, 4, -3, 6, -6, 3];
      items.forEach((c, i) => {
        const slot = el("div", "ruck-slot");
        slot.style.setProperty("--tuck", TUCK[i % TUCK.length] + "deg");
        const card = this.cardEl(c);
        card.classList.add("ruck-card");
        card.dataset.name = c.name;
        card.setAttribute("draggable", "true");
        card.addEventListener("dragstart", (ev) => {
          try { ev.dataTransfer.setData("text/handcard", c.name); ev.dataTransfer.effectAllowed = "move"; } catch (e) {}
          this._dragHand = c.name;
          document.body.classList.add("handcard-drag");
        });
        card.addEventListener("dragend", () => { this._dragHand = null; document.body.classList.remove("handcard-drag"); });
        card.addEventListener("click", (e) => { e.stopPropagation(); this._pickUpCard(c.name, card); });
        // Quick out-of-band recycle, revealed on hover over the tucked card.
        const rec = el("button", "ruck-recycle",
          `${icon("recycle")}<span>+${c.recycle_value}</span>`);
        rec.title = `Recycle for ${c.recycle_value} energy`;
        rec.addEventListener("click", (e) => { e.stopPropagation(); this.recycleCard(c.name); });
        card.appendChild(rec);
        slot.appendChild(card);
        pocket.appendChild(slot);
      });
    } else {
      pocket.appendChild(el("div", "ruck-empty", "- the case is empty -"));
    }
    host.appendChild(pocket);
    host.appendChild(this._ruckVouchers(me));
    if (document.body.classList.contains("activating-items")) this._markActivationCards();
    if (this._deliverState) this._markDeliverCards();
  }

  // Consumable Time-reward vouchers as worn tokens in a side pocket, activatable
  // at will (§23.3): a count, a short label, click to Use (out-of-band, fires at
  // the end of the current phase).
  // Vouchers are THEATER TICKETS racked in the lid: only owned ones show, and
  // each is played by DRAGGING it into the pip-boy's ticket slot (§23 Time).
  _ruckVouchers(me) {
    const wrap = el("div", "ruck-vouchers");
    const mk = (kind, n, name, sub) => {
      if (n <= 0) return null;
      const v = el("div", `ruck-voucher tkt tkt-${kind}${n > 0 ? " has" : ""}`);
      v.draggable = true;
      v.dataset.voucher = kind;
      v.innerHTML = `<span class="tkt-stub"><b>${n > 1 ? "\u00d7" + n : "1"}</b></span>`
        + `<span class="tkt-body"><span class="tkt-head">C.R.O.N.O.S. \u00b7 ADMIT ONE</span>`
        + `<span class="tkt-name">${name}</span><span class="tkt-sub">${sub}</span></span>`;
      v.addEventListener("dragstart", (e) => {
        try { e.dataTransfer.setData("text/voucher", kind); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
        this._cleanDragImage(e, v);
        this._dragVoucher = kind;
        document.body.classList.add("voucher-drag");
      });
      v.addEventListener("dragend", () => {
        this._dragVoucher = null;
        document.body.classList.remove("voucher-drag");
      });
      // A click picks it up, like a card. Dragging still works: dragstart only
      // fires once the pointer moves, so the two gestures live together.
      v.addEventListener("click", (e) => {
        e.stopPropagation();
        this._pickUpVoucher(kind, v);
      });
      return v;
    };
    const tickets = [
      mk("solo",   me ? (me.solo_voucher || 0) : 0,   "SOLO PHASE",    "extra generators hour"),
      mk("market", me ? (me.market_voucher || 0) : 0, "MARKET WINDOW", "atemporal merchant access"),
      mk("item",   me ? (me.item_voucher || 0) : 0,   "ITEM WINDOW",   "extra activation window"),
    ].filter(Boolean);
    // The Auction's lot tickets rack in the same pocket. Nothing is stored here:
    // every time this draws the rack it ASKS for the lot tickets
    // (`window.__lfLotTickets`), so the rack never shows a stale ticket after a
    // re-render.
    try {
      const lots = window.__lfLotTickets ? window.__lfLotTickets(me): [];
      lots.forEach((lt) => {
        const v = el("div", "ruck-voucher tkt has lf-lotticket");
        v.style.setProperty("--tk", lt.tk || "#5a4426");
        v.draggable = true;
        v.dataset.voucher = "lot:" + lt.id;
        if (lt.title) v.title = lt.title;
        v.innerHTML = `<span class="tkt-stub"><b>${lt.stub}</b></span>`
          + `<span class="tkt-body">${lt.face}</span>`
          // from the fifth ticket on the pocket stops stacking paper and counts,
          // like the contracts next to it
          + (lt.sobra ? `<span class="rv-more">+${lt.sobra}</span>` : "");
        v.addEventListener("dragstart", (e) => {
          try {
            e.dataTransfer.setData("text/voucher", "lot:" + lt.id);
            e.dataTransfer.effectAllowed = "move";
          } catch (err) {}
          this._cleanDragImage(e, v);
          this._dragVoucher = "lot:" + lt.id;
          document.body.classList.add("voucher-drag");
        });
        v.addEventListener("dragend", () => {
          this._dragVoucher = null;
          document.body.classList.remove("voucher-drag");
        });
        v.addEventListener("click", (e) => {
          e.stopPropagation();
          this._pickUpVoucher("lot:" + lt.id, v);
        });
        tickets.push(v);
      });
    } catch (e) {}
    tickets.forEach((t) => wrap.appendChild(t));
    return wrap;
  }

  /* ══ PICK UP A TICKET THE WAY YOU PICK UP A CARD ══════════════════════
     A card is clicked: it follows the cursor and the next click decides where it
     goes. Vouchers work the same way, the classic ones and the Auction's lot
     tickets alike. Dragging still works too, since `dragstart` only fires once the
     pointer really moves. Dropping anywhere but the machine's mouth puts the ticket
     back in the bag, just like a card. */

  /* The drag image. Chromium photographs the dragged element, and a ticket that is
     clipped (clip-path) and rotated comes out as a black block. A clean clone, with
     no clip and no rotation, poses for the original off screen and is gone the
     next frame. */
  _cleanDragImage(e, v) {
    try {
      const gp = v.cloneNode(true);
      // on the BODY, never inside the bag: an ancestor with overflow clipping the
      // clone leaves the image empty. The drag-ghost-tkt class dresses it in paper.
      gp.classList.add("drag-ghost-tkt");
      const w = v.offsetWidth || 190;
      gp.style.cssText = "position:fixed;left:-9999px;top:0;margin:0;"
        + "transform:none;clip-path:none;width:" + w + "px;height:"
        + Math.round(w / 3.9) + "px;";
      document.body.appendChild(gp);
      e.dataTransfer.setDragImage(gp, Math.round(v.offsetWidth / 2), 16);
      setTimeout(() => gp.remove(), 0);
    } catch (err) {}
  }
  _pickUpVoucher(kind, srcEl) {
    if (this._vcarry) { this._dropVoucher(false); return; }   // a second click puts it back
    if (this._carry) return;                 // already holding a card
    const fly = el("div", "voucher-carry");
    const ghost = srcEl.cloneNode(true);
    ghost.classList.add("vc-held");
    ghost.removeAttribute("draggable");
    fly.appendChild(ghost);
    // On the body, not inside #screen-game: a z-index only counts inside its own
    // stacking context, so 52 inside #screen-game loses to anything in #hull. On the
    // body only the cursor plane (z 60000) sits above it, which is right.
    document.body.appendChild(fly);
    this._vcarry = { kind, fly, srcEl };
    document.body.classList.add("carrying-voucher");
    srcEl.classList.add("voucher-lifted");
    const r = srcEl.getBoundingClientRect();
    fly.style.width = r.width + "px";
    fly.style.left = (r.left + r.width / 2) + "px";
    fly.style.top = (r.top + r.height / 2) + "px";
    const move = (e) => {
      fly.style.left = e.clientX + "px";
      fly.style.top = e.clientY + "px";
      // the machine's mouth lights up while the ticket is over it
      const td = document.getElementById("ticket-drop");
      if (td) {
        const b = td.getBoundingClientRect();
        td.classList.toggle("hot",
          e.clientX >= b.left && e.clientX <= b.right
          && e.clientY >= b.top && e.clientY <= b.bottom);
      }
    };
    window.addEventListener("mousemove", move);
    this._vcarryMove = move;
    try { audio.play("lift"); } catch (e) {}
    // the NEXT click decides (one tick later, so the click that picked the ticket
    // up is not the one that drops it)
    setTimeout(() => {
      const onClick = (e) => {
        if (!this._vcarry) return;
        if (e.target.closest(".voucher-carry")) return;
        const k = this._vcarry.kind;
        // Test the drop point against the target's RECTANGLE, not the element under
        // the point: elementFromPoint returns the cursor plane, which covers the whole
        // screen, so `closest` came back empty and a ticket dropped right on the mouth
        // was refused.
        const inside = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const b = el.getBoundingClientRect();
          if (b.width < 2 || b.height < 2) return false;
          const slack = 10;         // the mouth forgives a slightly crooked hand
          return e.clientX >= b.left - slack && e.clientX <= b.right + slack
            && e.clientY >= b.top - slack && e.clientY <= b.bottom + slack;
        };
        // Dropping a lot ticket back on the Auction room returns the lot to the
        // Bureau, the same gesture that recycles a card at the Market: for when the
        // bag is full and you would rather free room than carry paper you won't use.
        const onAuction = inside(".lf-house") || inside(".lf-turntable");
        const mouth = inside("#ticket-drop") || inside("#hull-console")
          || (e.target.closest
              && e.target.closest("#ticket-drop, #hull-console, .hull-manopla"));
        if (!mouth && onAuction && k && k.indexOf("lot:") === 0){
          const id = k.slice(4);
          let burned = false;
          try { burned = !!(window.__lfBurnTicket && window.__lfBurnTicket(id)); }
          catch (err) {}
          this._dropVoucher(burned);
          return;
        }
        if (!mouth) { this._dropVoucher(false); return; }
        // The ticket only leaves the hand if the machine really takes it: the
        // mouth's answer decides, so a refusal sends it back to the bag.
        const swallowed = this.useVoucher(k);
        this._dropVoucher(swallowed !== false);
      };
      document.addEventListener("click", onClick, true);
      this._vcarryClick = onClick;
    }, 0);
  }
  _dropVoucher(consumed) {
    const vc = this._vcarry; if (!vc) return;
    this._vcarry = null;
    if (this._vcarryMove) window.removeEventListener("mousemove", this._vcarryMove);
    if (this._vcarryClick) document.removeEventListener("click", this._vcarryClick, true);
    this._vcarryMove = this._vcarryClick = null;
    document.body.classList.remove("carrying-voucher");
    const td = document.getElementById("ticket-drop");
    if (td) td.classList.remove("hot");
    /* A refusal has to look like one. Vanishing is what the ticket does when it
       IS accepted, so a refused ticket flies back to the pocket it came from: the
       eye follows the paper and sees it was not swallowed. */
    if (!consumed && vc.fly && vc.srcEl && vc.srcEl.isConnected && vc.fly.animate) {
      const a = vc.fly.getBoundingClientRect();
      const b = vc.srcEl.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      const back = vc.fly.animate(
        [{ transform: "translate(-50%,-50%) rotate(-3deg)", opacity: 1 },
         { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + "
           + dy + "px)) rotate(4deg) scale(.86)", opacity: .1 }],
        { duration: 240, easing: "cubic-bezier(.4,0,.7,1)" });
      const fly = vc.fly, src = vc.srcEl;
      back.onfinish = () => { fly.remove(); src.classList.remove("voucher-lifted"); };
      try { audio.play("whiff"); } catch (e) {}
      return;
    }
    if (vc.srcEl) vc.srcEl.classList.remove("voucher-lifted");
    if (vc.fly) vc.fly.remove();
    if (!consumed) { try { audio.play("whiff"); } catch (e) {} }
  }
  /* One way to use a ticket, whatever it is. The Auction uses a `kind` prefixed
     "lot:" and the classic game the voucher's name; this method knows what to do
     with each, so the places that drop it don't have to. */
  useVoucher(kind) {
    if (kind && kind.indexOf("lot:") === 0) {
      // return the mouth's answer, so the caller knows whether the ticket was
      // swallowed or refused
      try { return !!(window.__lfUseTicket && window.__lfUseTicket(kind.slice(4))); }
      catch (e) { return false; }
    }
    this.activateVoucher(kind);
    return true;
  }

  // Activate a held voucher, an out-of-band action (like recycling): it stays
  // pending until the end of the current phase, then inserts its bonus phase.
  activateVoucher(kind) {
    this.conn.send({ type: "activate_voucher", kind });
    audio.play("confirm");
  }

  /* ---- placement engine (shared by drag + click) ---- */
  // Why this module will not take this generator. A refusal that says nothing reads as a
  // broken game: three testers each lost over a minute to a cell that simply ignored them.
  refusalReason(r, c, v, drag) {
    if (!this.alloc) return "";
    if (this.alloc.unavailable.has(r)) return "SEALED THIS HOUR";
    if (this.alloc.matrix[r][c] !== 0) return "THAT MODULE IS TAKEN";
    if (c > 0) {
      const prev = this.alloc.matrix[r][c - 1];
      const movingOut = drag && drag.source === "cell" && +drag.r === r && +drag.c === c - 1;
      if (prev === 0 || movingOut) return "FILLS LEFT TO RIGHT";
    }
    const existing = this.alloc.matrix[r].filter((x, i) =>
      x !== 0 && !(drag && drag.source === "cell" && +drag.r === r && i === +drag.c));
    if (existing.length && existing[0] !== v)
      return `ONE VALUE PER FUNCTION: THIS ROW HOLDS ${roman(existing[0])}`;
    return "NOT HERE";
  }

  // The refusal is SEEN and HEARD: the cell kicks red, the tray bounces the die back, and
  // the reason sits under the machine long enough to read.
  rejectDrop(r, c, v, drag) {
    const cell = this.dom.machine
      && this.dom.machine.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) {
      cell.classList.remove("refused"); void cell.offsetWidth; cell.classList.add("refused");
      setTimeout(() => cell.classList.remove("refused"), 420);
    }
    this.flashPool();
    try { audio.play("whiff"); } catch (e) {}
    const why = this.refusalReason(r, c, v, drag);
    const host = this.dom.machine || document.body;
    let chip = document.getElementById("refuse-why");
    if (!chip) { chip = el("div", "refuse-why"); chip.id = "refuse-why"; host.appendChild(chip); }
    chip.textContent = why;
    chip.classList.remove("on"); void chip.offsetWidth; chip.classList.add("on");
    clearTimeout(this._refuseT);
    this._refuseT = setTimeout(() => chip.classList.remove("on"), 2600);
  }

  canPlace(r, c, v, drag) {
    if (this.alloc.unavailable.has(r)) return false;
    if (drag && drag.source === "cell" && +drag.r === r && +drag.c === c) return true;
    if (this.alloc.matrix[r][c] !== 0) return false;
    const existing = this.alloc.matrix[r].filter((x, i) =>
      x !== 0 && !(drag && drag.source === "cell" && +drag.r === r && i === +drag.c));
    if (existing.length && existing[0] !== v) return false;
    if (c > 0) {
      const prev = this.alloc.matrix[r][c - 1];
      const prevIsMovingOut = drag && drag.source === "cell" && +drag.r === r && +drag.c === c - 1;
      if (prev === 0 || prevIsMovingOut) return false;
    }
    return true;
  }
  // UNDO (Z / Backspace): a snapshot of the machine before each move, last 20 kept
  _allocSnap() {
    if (!this.alloc) return;
    this._allocHist = this._allocHist || [];
    this._allocHist.push({ m: this.alloc.matrix.map((r) => r.slice()), e: this.alloc.escape, p: this.alloc.pool.slice() });
    if (this._allocHist.length > 20) this._allocHist.shift();
  }
  undoAllocation() {
    const h = this._allocHist && this._allocHist.pop();
    if (!h || !this.alloc) return false;
    if (this._carry || this.selected) this._endCarry(true);
    this.alloc.matrix = h.m; this.alloc.escape = h.e; this.alloc.pool = h.p;
    this.selected = null; this._justSocketed = null;
    this.afterPlace();
    return true;
  }
  removeFromSource(d) {
    this._allocSnap();
    if (d.source === "pool") this.alloc.pool.splice(+d.idx, 1);
    else if (d.source === "cell") this.alloc.matrix[+d.r][+d.c] = 0;
    else if (d.source === "escape") this.alloc.escape = 0;
  }
  placeInCell(d, r, c) {
    this.removeFromSource(d);
    this.alloc.matrix[r][c] = d.value;
    // The Thanos moment: remember what was just socketed so afterPlace() can fire
    // the socket FX on the freshly-rendered cell.
    this._justSocketed = { r, c, value: d.value };
  }

  // Setting a causality die into a gauntlet socket, a metallic clink, a small
  // camera kick, and a burst of glints that grows with the die's power.
  _socketFx(r, c, value) {
    const born = this.dom.machine.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .die`);
    if (born) { born.classList.add("just-born"); setTimeout(() => born.classList.remove("just-born"), 420); }
    const pow = Math.max(0, Math.min(1, (value - 1) / 5));   // I -> 0 ... VI -> 1
    audio.play("socket", { power: pow });
    if (window.__room) window.__room.beat("socket");
    this.shake("sm");
    const cell = this.dom.machine
      && this.dom.machine.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (!cell || this._reducedMotion()) return;
    cell.classList.remove("socketed"); void cell.offsetWidth; cell.classList.add("socketed");
    setTimeout(() => cell.classList.remove("socketed"), 640);
    const rect = cell.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const n = 4 + Math.round(pow * 8);                        // stronger die ⇒ more glints
    for (let i = 0; i < n; i++) {
      const g = el("div", "socket-glint");
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const d = 12 + Math.random() * (16 + pow * 28);
      const sz = 3 + pow * 4 + Math.random() * 2;
      g.style.left = cx + "px"; g.style.top = cy + "px";
      g.style.width = g.style.height = sz + "px";
      g.style.setProperty("--gx", (Math.cos(ang) * d).toFixed(1) + "px");
      g.style.setProperty("--gy", (Math.sin(ang) * d).toFixed(1) + "px");
      g.style.animationDelay = (Math.random() * 60) + "ms";
      document.body.appendChild(g);
      setTimeout(() => g.remove(), 720);
    }
  }

  /* ---- drag-and-drop ---- */
  onDragStart(e, node, value) {
    if (!this._dragBlank) {
      this._dragBlank = new Image();
      this._dragBlank.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    }
    try { e.dataTransfer.setDragImage(this._dragBlank, 0, 0); } catch (err) {}
    this._trackSwarmMouse();
    this._swarmStart(+value, e.clientX, e.clientY);
    this.selected = null;
    this._endCarry(false);            // a native press-drag supersedes a click-carry
    this.dragging = { value: +value, source: node.dataset.source,
      idx: node.dataset.idx, r: node.dataset.r, c: node.dataset.c };
    node.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    this.highlightLegal(+value, this.dragging);
  }
  onDragEnd() {
    setTimeout(() => { if (!this._justSocketed) this._swarmEnd(); }, 40);
    this.dragging = null;
    this.clearHighlights();
  }
  wireCell(cell, r, c) {
    cell.addEventListener("dragover", (e) => {
      if (!this.dragging) return;
      if (this.canPlace(r, c, this.dragging.value, this.dragging)) { e.preventDefault(); cell.classList.add("dragover"); }
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("dragover"));
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!this.dragging) return;
      if (!this.canPlace(r, c, this.dragging.value, this.dragging)) {
        this.rejectDrop(r, c, this.dragging.value, this.dragging); return;
      }
      this.placeInCell(this.dragging, r, c);
      this.afterPlace();
    });
  }
  wirePool(pool) {
    pool.addEventListener("dragover", (e) => { if (this.dragging) { e.preventDefault(); pool.classList.add("dragover"); } });
    pool.addEventListener("dragleave", () => pool.classList.remove("dragover"));
    pool.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!this.dragging || this.dragging.source === "pool") return;
      this.removeFromSource(this.dragging);
      this.alloc.pool.push(this.dragging.value);
      this.afterPlace();
    });
  }
  wireEscape(drop) {
    drop.addEventListener("dragover", (e) => {
      if (this.dragging && this.alloc.escape === 0) { e.preventDefault(); drop.classList.add("dragover", "legal"); }
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("dragover", "legal"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!this.dragging || this.alloc.escape !== 0) return;
      this.removeFromSource(this.dragging);
      this.alloc.escape = this.dragging.value;
      this.afterPlace();
    });
  }

  /* ---- click-to-carry-and-place ---- */
  // Clicking a die PICKS IT UP: a ghost follows the cursor (like holding it).
  // Click a legal socket to set it; click the die again, or anywhere empty, to
  // drop it back. (Native press-drag still works too.)
  onDieClick(value, source, opts, e) {
    const sel = this.selected;
    const same = sel && sel.source === source && sel.value === +value &&
      (source !== "pool" || sel.idx === opts.idx) &&
      (source !== "cell" || (sel.r === opts.r && sel.c === opts.c));
    if (same && this._carry) { this._endCarry(true); return; }   // click the held die again -> put it back
    this._startCarry(value, source, opts, e);
  }
  onCellClick(r, c) {
    if (!this.selected) return;
    if (!this.canPlace(r, c, this.selected.value, this.selected)) {
      this.rejectDrop(r, c, this.selected.value, this.selected); return;
    }
    this.placeInCell(this.selected, r, c);
    this.selected = null;
    this._endCarry(false);      // consume the carry (the socket keeps the stone)
    this.afterPlace();
  }
  onEscapeClick() {
    if (!this.selected || this.alloc.escape !== 0) return;
    this.removeFromSource(this.selected);
    this.alloc.escape = this.selected.value;
    this.selected = null;
    this._endCarry(false);
    this.afterPlace();
  }
  refreshSelectionUI() {
    // re-render dice so the selected die shows its ring. A carry can outlive its
    // allocation (a click lands after Confirm), and then there is no tray to redraw.
    if (this.alloc) this.renderDiceCockpit();
  }

  // Pick up a die: float a ghost that tracks the cursor and hide the source die,
  // so it reads as physically held (Hearthstone/Bazaar feel) instead of teleporting.
  /* ── THE BIT SWARM: a picked generator decompiles into 0/1 bits orbiting the
     cursor; it only re-materializes as a die when it sockets into the machine.
     One engine serves click-carry AND native drag (Matrix · R&M). ── */
  _swarmStart(value, x, y) {
    this._swarmEnd();
    if (this._reducedMotion()) return;
    const wrap = el("div", "bit-swarm");
    const n = 6 + (+value) * 3;                  // heavier dice = denser cloud
    const bits = [];
    for (let i = 0; i < n; i++) {
      const b = el("i", "bit");
      b.textContent = Math.random() < .5 ? "0" : "1";
      if (Math.random() < .25) b.classList.add("big");
      wrap.appendChild(b);
      // ORBIT HELA'S RIM, NOT HER HEART. The swarm was written for the old cursor, when
      // the pointer was a bare hand and the space around it was empty: bits circled at a
      // radius of 13-30px, right on top of the click point. Then the reticle arrived and
      // took exactly that spot, so the bits piled into the crosshair's core and the hand
      // buried the rest, and the whole thing read as a smear of loose digits on the CRT.
      // This looks like a bug but is not broken code; it is locked design (bits
      // -> semi-real die -> absorbed) whose geometry the new cursor invalidated.
      // They now orbit just inside Hela's dashed ring (~52px). Her core stays CLEAR, you
      // can see the cell you are aiming at, which is the entire point of a reticle, and
      // the die reads as what it is: dematerialised, held in her field, waiting to land.
      // ...and the ring has to HOLD. Every bit used to get a random angle and a random
      // signed speed, so within a second they all piled onto one side and it was a smear
      // again, just a bigger one. They are spaced EVENLY and orbit the SAME WAY at nearly
      // the same rate: the ring keeps its shape while it turns. The wobble is what keeps
      // it alive, not the chaos.
      bits.push({ el: b, a: (i / n) * Math.PI * 2 + Math.random() * .22,
        r: 34 + Math.random() * 13,
        wob: 2 + Math.random() * 5, ph: Math.random() * Math.PI * 2,
        x, y, k: .2 + Math.random() * .18 });
    }
    document.body.appendChild(wrap);
    // ONE angular velocity for the whole ring. Per-bit speeds, even a 10% spread, pull
    // the ring apart within seconds and you are back to a smear (measured: the widest gap
    // opened to 107 degrees in three seconds, against an ideal 40). The ring turns as a
    // BODY; every bit still breathes in and out on its own radius, and that is the life.
    const S = this._swarm = { wrap, bits, tx: x, ty: y, cx: x, cy: y, raf: 0, w: .95,
      t0: performance.now(), flip: 0 };
    const tick = (now) => {
      if (this._swarm !== S) return;
      const t = (now - S.t0) / 1000;
      S.cx += (S.tx - S.cx) * .32; S.cy += (S.ty - S.cy) * .32;
      for (const b of S.bits) {
        const ang = b.a + t * S.w;
        const rr = b.r + Math.sin(t * b.wob + b.ph) * 4;
        const gx = S.cx + Math.cos(ang) * rr, gy = S.cy + Math.sin(ang) * rr * .82;
        b.x += (gx - b.x) * (b.k + .2); b.y += (gy - b.y) * (b.k + .2);
        b.el.style.transform = `translate3d(${b.x}px,${b.y}px,0)`;
      }
      if (((S.flip++) & 15) === 0) {             // idle digit flicker
        const b = S.bits[(Math.random() * S.bits.length) | 0];
        b.el.textContent = b.el.textContent === "0" ? "1" : "0";
      }
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  _swarmEnd(convergeTo) {
    const S = this._swarm; if (!S) return;
    this._swarm = null;
    cancelAnimationFrame(S.raf);
    if (convergeTo && !this._reducedMotion()) {
      for (const b of S.bits) {
        const d = 110 + Math.random() * 150;
        if (b.el.animate) b.el.animate([
          { transform: `translate3d(${b.x}px,${b.y}px,0)`, opacity: 1 },
          { transform: `translate3d(${convergeTo.x}px,${convergeTo.y}px,0) scale(.35)`, opacity: 0 }
        ], { duration: d, easing: "cubic-bezier(.5,.1,.8,1)", fill: "forwards" });
      }
      setTimeout(() => S.wrap.remove(), 290);
    } else S.wrap.remove();
  }
  _trackSwarmMouse() {
    if (this._swarmMove) return;
    this._swarmMove = (ev) => {
      this._lastMouse = { x: ev.clientX, y: ev.clientY };
      if (this._swarm) { this._swarm.tx = ev.clientX; this._swarm.ty = ev.clientY; }
    };
    window.addEventListener("mousemove", this._swarmMove, { passive: true });
    window.addEventListener("dragover", this._swarmMove, { passive: true });
  }

  _startCarry(value, source, opts, e) {
    this._endCarry(true);                       // clear any prior carry
    this.selected = { value: +value, source, idx: opts.idx, r: opts.r, c: opts.c };
    audio.play("lift");
    this.clearHighlights();
    this.highlightLegal(+value, this.selected);
    this.refreshSelectionUI();                  // re-renders the pool (fresh source nodes)
    if (this._reducedMotion()) return;          // no swarm; click-to-place still works
    const srcNode = this._selectedDieNode(this.selected);
    if (srcNode) srcNode.classList.add("carry-hidden");
    this._trackSwarmMouse();
    const px = e ? e.clientX : (this._lastMouse ? this._lastMouse.x : window.innerWidth / 2);
    const py = e ? e.clientY : (this._lastMouse ? this._lastMouse.y : window.innerHeight * 0.7);
    this._swarmStart(+value, px, py);
    this._carry = { srcNode, onDoc: null };
    // A click that misses every die/socket drops the held die back to its source.
    // Deferred a tick so the click that STARTED the carry doesn't cancel it.
    setTimeout(() => {
      if (!this._carry) return;
      const onDoc = (ev) => {
        // The ESCAPE VALVE is a legal destination too. This handler runs in the CAPTURE
        // phase, so if the valve is not excluded here it cancels the carry (selected =
        // null) BEFORE the valve's own click handler runs, and the valve then refuses a
        // die you picked up with the keyboard. Dragging worked only because it is a
        // different path entirely.
        if (ev.target.closest(".cell") || ev.target.closest(".die")) return;   // cell/die handle it
        if (ev.target.closest(".escape-drop, .escape-slot, [data-drop='escape']")) return;
        this._endCarry(true);
      };
      this._carry.onDoc = onDoc;
      window.addEventListener("click", onDoc, true);
    }, 0);
  }
  _endCarry(returnToSource) {
    const c = this._carry;
    let home = null;
    if (c && c.srcNode && c.srcNode.isConnected) {
      const r = c.srcNode.getBoundingClientRect();
      home = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    if (c) {
      if (c.onDoc) window.removeEventListener("click", c.onDoc, true);
      if (c.srcNode) c.srcNode.classList.remove("carry-hidden");
      this._carry = null;
    }
    if (returnToSource) {
      this._swarmEnd(home);                      // the bits fly back to the die
      this.selected = null; this.clearHighlights(); this.refreshSelectionUI();
    }
    // on placement the swarm survives until afterPlace converges it into the cell
  }
  _selectedDieNode(sel) {
    if (!sel) return null;
    if (sel.source === "pool") return this.dom.dice.querySelector(`.dice-pool .die[data-idx="${sel.idx}"]`);
    if (sel.source === "cell") return this.dom.machine.querySelector(`.cell[data-r="${sel.r}"][data-c="${sel.c}"] .die`);
    if (sel.source === "escape") return this.dom.dice.querySelector(`.escape-drop .die`);
    return null;
  }

  highlightLegal(value, ref) {
    this.dom.machine.querySelectorAll(".cell").forEach((cell) => {
      const r = +cell.dataset.r, c = +cell.dataset.c;
      if (cell.classList.contains("locked")) return;
      const legal = this.canPlace(r, c, value, ref);
      cell.classList.add(legal ? "legal" : "illegal");
    });
  }
  clearHighlights() {
    this.dom.machine.querySelectorAll(".cell").forEach((cell) =>
      cell.classList.remove("legal", "illegal", "dragover", "target"));
  }

  /**
   * Keep the matrix legal after every operation: a module is only valid if the
   * previous module in its row is filled (§29 linear progression). If removing a
   * die leaves later modules in the same row orphaned (a gap), pull those dice
   * back to the pool so the Time Machine never sits in an illegal state, and the
   * player can never confirm an illegal allocation.
   */
  normalizeAllocation() {
    let returned = 0;
    for (let r = 0; r < 3; r++) {
      let gap = false;
      for (let c = 0; c < 3; c++) {
        if (this.alloc.matrix[r][c] === 0) { gap = true; continue; }
        if (gap) {                       // orphaned die after a gap -> back to pool
          this.alloc.pool.push(this.alloc.matrix[r][c]);
          this.alloc.matrix[r][c] = 0;
          returned++;
        }
      }
    }
    return returned;
  }

  afterPlace() {
    this.dragging = null;
    setTimeout(() => { try { comic.preview(); } catch (e) {} }, 0);   // what this machine will do
    const bounced = this.normalizeAllocation();
    this.clearHighlights();
    this.renderMachineAlloc();
    this.renderDiceCockpit();
    if (window.__cabinPulse) window.__cabinPulse();
    if (this._swarm) {
      // the bits pour into their socket and the numeral MATERIALIZES
      let pt = null;
      if (this._justSocketed) {
        const cellN = this.dom.machine.querySelector(
          `.cell[data-r="${this._justSocketed.r}"][data-c="${this._justSocketed.c}"]`);
        if (cellN) { const r2 = cellN.getBoundingClientRect();
          pt = { x: r2.x + r2.width / 2, y: r2.y + r2.height / 2 }; }
      } else if (this.alloc && this.alloc.escape) {
        const ev2 = document.querySelector("#hull-console .escape-drop") ||
                    document.getElementById("mano-vent");
        if (ev2) { const r3 = ev2.getBoundingClientRect();
          pt = { x: r3.x + r3.width / 2, y: r3.y + r3.height / 2 }; }
      }
      this._swarmEnd(pt);
    }
    if (bounced) this.flashPool();
    // Fire the socket FX on the freshly-rendered cell (the die just set into it).
    if (this._justSocketed) {
      const s = this._justSocketed; this._justSocketed = null;
      this._socketFx(s.r, s.c, s.value);
    } else {
      audio.play("place");
    }
    // keep selection highlight if a die is still selected
    if (this.selected) this.highlightLegal(this.selected.value, this.selected);
  }

  flashPool() {
    const pool = this.dom.dice.querySelector(".dice-pool");
    if (!pool) return;
    pool.classList.remove("bounce");
    void pool.offsetWidth;           // restart animation
    pool.classList.add("bounce");
  }

  clearAllocation() {
    if (!this.alloc) return;
    this._allocSnap();
    const back = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (this.alloc.matrix[r][c]) { back.push(this.alloc.matrix[r][c]); this.alloc.matrix[r][c] = 0; }
    }
    if (this.alloc.escape) { back.push(this.alloc.escape); this.alloc.escape = 0; }
    this.alloc.pool.push(...back);
    this.selected = null;
    this.afterPlace();
  }

  confirmAllocation() {
    if (!this.alloc || this.alloc.pool.length !== 0) return;
    const data = { matrix: this.alloc.matrix.map((r) => r.slice()), escape_valve: this.alloc.escape };
    this.myLastMatrix = data.matrix;
    this.respond(data);
    this.alloc = null;
    this.selected = null;
    this.awaitingReveal = true;
    audio.play("confirm");
    this.renderMachineIdle();
    this.renderDiceIdle();
    this.showWaiting("Allocation locked, awaiting other operatives...");
  }

  /* ======================== DECISIONS ============================== */
  onDecision(req) {
    this.pendingReq = req;
    try { comic.onDecision(req); } catch (e) {}
    this.activeSeat = req.seat;
    const k = req.kind;
    this.updateBeacon();   // no forced camera, an arrow beckons toward the decision
    // In-place Market/selection state is per-decision. A fresh decision supersedes any
    // stale shopping/steal/secret-deal cue so the wagon & panels don't keep showing it.
    const hadInline = this.marketReq || this.selectReq || this.secretDeal;
    if (k !== "market") { this.marketReq = null; this.marketMode = "buy"; }
    this.selectReq = null; this.secretDeal = null;
    if (hadInline) this.renderMarket();
    this.renderPlayers();
    if (k === "allocate") return this.startAllocation(req);
    if (k === "travel") {
      // Voyages are plotted ON THE CHART: the sea arms click-to-travel and the anchor.
      return;
    }
    if (k === "market") return this.promptMarket(req);
    if (k === "deliver") return this.promptDeliver(req);
    if (k === "reward_category") return this.promptReward(req);
    if (k === "activation") return this.promptActivation(req);
    // Card picks that live in the Market resolve IN PLACE (wagon / player panels);
    // recycled & receptor picks have no home there, so they keep the popup.
    if (k === "destroy_target") return this.routeCardSelect(req, "card", "Destroy a card");
    if (k === "steal_target") return this.routeCardSelect(req, "card", "Steal a card");
    if (k === "merchant_century") return;
    if (k === "matrix_buff") return this.promptMatrixBuff(req);
    if (k === "target") {
      const o = req.options;
      if (o.target_type === "card" && this._hasInlineCandidates(o.candidates))
        return this.routeCardSelect(req, "choice", `${o.card_display || o.card}, Target`);
      if (o.target_type === "century") return;   // the Paradox Sea owns century picks
      return this.promptTarget(req);
    }
    if (k === "recycle") return this.promptRecycle(req);
    if (k === "capacity") return this.promptCapacity(req);
    if (k === "secret_deal") return this.beginSecretDeal(req);
    // Auction-phase decisions (the Test Room) are surfaced by leilao_fase.js;
    // never auto-answer them. Classic games never receive these kinds.
    if (k.startsWith("leilao_")) return;
    this.respond({});
  }

  // A card candidate that lives somewhere visible on the board (Market stock, the
  // Secret bay, or a player's equipment) can be picked in place instead of in a popup.
  _hasInlineCandidates(candidates) {
    return (candidates || []).some((c) => this._INLINE_ZONES.has(c.zone));
  }
  // The zones that have a home on the board. This set was referenced but never
  // defined, so every steal / destroy / card-target decision threw inside
  // onDecision, nothing was drawn, and the match waited forever.
  get _INLINE_ZONES() { return INLINE_ZONES; }

  // ── THE BEACON: a pulsing arrow at the screen edge that BECKONS toward the
  //    quadrant a decision waits in. The player walks there themselves. ──
  _sceneDir(from, to) {
    const A = { main: [0, 0], market: [0, -1], drawer: [-1, 0], timeline: [1, 0] };
    const a = A[from] || [0, 0], b = A[to] || [0, 0];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "down" : "up";
  }
  _keyToward(from, to) {
    const cab = document.body.classList.contains("cabin-on");
    const nav = cab
      ? { main: { w: "market", a: "drawer" }, market: { s: "main", a: "drawer" }, drawer: { d: "main", w: "market" } }
      : { main: { w: "market", a: "drawer", d: "timeline" }, market: { s: "main", a: "drawer" },
          drawer: { d: "main", w: "market" }, timeline: { a: "main", w: "market" } };
    const m = nav[from] || {};
    for (const k in m) if (m[k] === to) return k.toUpperCase();
    for (const k in m) if (m[k] === "main") return k.toUpperCase();   // hop via the desk
    return null;
  }
  updateBeacon() {
    const req = this.pendingReq;
    const target = req && this.camera ? this.camera.sceneForDecision(req.kind, req.options || req) : null;
    if (!target || !this.camera._engaged || target === this.camera.scene) return this.hideBeacon();
    this.showBeacon(target, req.kind);
  }
  showBeacon(target, kind) {
    const dir = this._sceneDir(this.camera.scene, target);
    const key = this._keyToward(this.camera.scene, target);
    const where = { timeline: "the Paradox Sea", market: "the Merchant's wares",
      drawer: "your records", main: "the Time Machine" }[target] || "elsewhere";
    const verb = { travel: "A voyage to plot", merchant_century: "Send the Merchant on",
      deliver: "A relic to deliver", reward_category: "Claim your reward",
      market: "The market is open", activation: "An ability to fire",
      target: "Choose a target", capacity: "Make room" }[kind] || "You are needed";
    // CABIN: no widget, the EYE ITSELF blinks to the edge and opens as the message.
    // The arrow points where the place ACTUALLY IS, diagonals included (from the
    // paperwork desk, the market is up-and-right; an "up" arrow was a lie).
    if (document.body.classList.contains("cabin-on") && window.__helaEye && window.__helaEye.direct) {
      this._beaconTarget = target;
      const A2 = { main: [0, 0], market: [0, -1], drawer: [-1, 0], timeline: [1, 0] };
      const va = A2[this.camera.scene] || [0, 0], vb = A2[target] || [0, 0];
      const dx = Math.sign(vb[0] - va[0]), dy = Math.sign(vb[1] - va[1]);
      const vecDir = (dy < 0 ? "up" : dy > 0 ? "down" : "") + (dx < 0 ? "left" : dx > 0 ? "right" : "") || dir;
      window.__helaEye.direct({ dir: vecDir, verb, key, onClick: () => {
        const t = this._beaconTarget; if (!t) return;
        this.camera._engage(); this.camera.setScene(t); this.updateBeacon(); this._onSceneArrive(t);
      } });
      return;
    }
    let b = document.getElementById("decision-beacon");
    if (!b) {
      b = el("div", "decision-beacon"); b.id = "decision-beacon";
      b.innerHTML = `<svg class="bc-arrow" viewBox="0 0 40 40"><path d="M6 20 H30 M22 11 L31 20 L22 29" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="vz-sigil bc-sigil">${icon("hela")}</span><div class="bc-text"><span class="vz-name">HELA</span><b class="bc-verb"></b><span class="bc-where"></span></div>`;
      b.addEventListener("click", () => { if (this._beaconTarget) { const t = this._beaconTarget; this.camera._engage(); this.camera.setScene(t); this.updateBeacon(); this._onSceneArrive(t); } });
      this.dom.overlay.appendChild(b);
    }
    this._beaconTarget = target;
    b.className = "decision-beacon on dir-" + dir;
    b.querySelector(".bc-verb").textContent = verb;
    b.querySelector(".bc-where").innerHTML = `look to ${where}${key ? ` &middot; press <kbd>${key}</kbd>` : ""}`;
  }
  hideBeacon() {
    const b = document.getElementById("decision-beacon");
    if (b) b.classList.remove("on");
    if (window.__helaEye && window.__helaEye.direct) window.__helaEye.direct(null);
    this._beaconTarget = null;
  }
  respond(data) {
    if (!this.pendingReq) return;
    this.conn.respond(this.pendingReq.request_id, data);
    this.pendingReq = null;
    try { comic.onRespond(); } catch (e) {}
    this.activeSeat = null;
    if (this.camera) this.camera._decisionLocked = false;
    this.hideBeacon();
    this.clearPrompt();
  }

  /* ---- prompt scaffolding ---- */
  showPrompt({ title, sub, body, actions, compact }) {
    this.clearPrompt();
    this.clearWaiting();
    const p = el("div", "prompt" + (compact ? " compact" : ""));
    p.id = "active-prompt";
    p.innerHTML = `<div class="prompt-title"><span class="vz-sigil pr-sigil">${icon("hela")}</span><span class="vz-name">HELA</span> ${title}</div>`
      + (sub ? `<div class="prompt-sub">${sub}</div>` : "");
    if (body) p.appendChild(body);
    const row = el("div", "prompt-actions");
    (actions || []).forEach((a) => {
      const b = el("button", `btn ${a.primary ? "btn-primary" : a.ghost ? "btn-ghost" : "choice"} btn-sm`, a.label);
      if (a.id) b.id = a.id;
      if (a.disabled) b.disabled = true;
      b.addEventListener("click", (e) => { audio.play("click"); a.onClick(e); });
      row.appendChild(b);
    });
    p.appendChild(row);
    // HELA's decision window says the move itself: her YOUR MOVE box steps aside (one instruction)
    try { comic.yieldTurn(); } catch (e) {}
    // CABIN: the prompt is not a widget, the EYE manifests it. It unfolds from her
    // and folds back into her when the decision resolves (clearPrompt).
    if (document.body.classList.contains("cabin-on") && window.__helaEye && window.__helaEye.manifest) {
      const anchor = this.rucksackRect ? this.rucksackRect() : null;
      this._promptWin = window.__helaEye.manifest({
        node: p, cls: "he-prompt",
        x: window.innerWidth * .5, y: window.innerHeight * .64 });
      return p;
    }
    this.dom.overlay.appendChild(p);
    return p;
  }
  // ── PICK UP A CARD: it lifts, follows the cursor, the hand closes around it (2.5D).
  //    Click a folder to deliver it, the market to recycle it, or anywhere else to put it back.
  _pickUpCard(name, srcEl) {
    if (this._carry) { this._dropCard(false); return; }      // click again = put it back
    const me = this._self(); if (!me) return;
    const c = (me.hand || []).find((x) => x.name === name); if (!c) return;
    const fly = el("div", "card-carry-2");
    const card = this.cardEl(c); card.classList.add("cc-held");
    fly.appendChild(card); (document.getElementById("screen-game") || document.body).appendChild(fly);
    this._carry = { name, fly, srcEl };
    document.body.classList.add("carrying-card");
    if (srcEl) { srcEl.classList.add("card-lifted");
      const r = srcEl.getBoundingClientRect();
      fly.style.left = (r.left + r.width / 2) + "px"; fly.style.top = (r.top + r.height / 2) + "px"; }
    const move = (e) => {
      // over the OPEN drawer during a delivery, the card slips UNDER the century
      // folders (reparented into the cell), the folders must stay readable
      const dz = document.getElementById("drawer-zone");
      const cell = dz && dz.classList.contains("deliver-live") ? dz.querySelector(".cab2-cell.open .cab2-inner") : null;
      if (cell) {
        const cr = cell.getBoundingClientRect();
        const over = e.clientX >= cr.left && e.clientX <= cr.right && e.clientY >= cr.top && e.clientY <= cr.bottom;
        if (over) {
          if (fly.parentElement !== cell) { fly.classList.add("cc-under"); cell.insertBefore(fly, cell.firstChild); }
          const fit = window.__pdxFit || 1;
          fly.style.left = ((e.clientX - cr.left) / fit) + "px";
          fly.style.top = ((e.clientY - cr.top) / fit) + "px";
        } else if (fly.parentElement === cell) {
          fly.classList.remove("cc-under");
          document.body.appendChild(fly);
          fly.style.left = e.clientX + "px"; fly.style.top = e.clientY + "px";
        } else { fly.style.left = e.clientX + "px"; fly.style.top = e.clientY + "px"; }
      } else { fly.style.left = e.clientX + "px"; fly.style.top = e.clientY + "px"; }
      // the market lights up as a recycle mouth while you carry a card over it
      const mz = document.getElementById("market-zone");
      if (mz) { const r = mz.getBoundingClientRect();
        const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        mz.classList.toggle("recycle-armed", over); } };
    window.addEventListener("mousemove", move); this._carryMove = move;
    try { window.__handPlunge && document.body.classList.contains("hand-cursor-on") && audio.play("whiff"); } catch (e) {}
    // place/cancel on the NEXT click (added a tick later so the pickup click doesn't fire it)
    setTimeout(() => {
      const onClick = (e) => {
        if (!this._carry) return;
        if (e.target.closest(".card-carry-2")) return;
        const nm = this._carry.name;
        const folder = e.target.closest("#drawer-zone .drw-folder.here, #drawer-zone .drawer-body, #drawer-zone .cab2-inner");
        const market = e.target.closest("#market-zone");
        const st = this._deliverState;
        if (folder && st && st.names.has(nm)) { this._dropCard(true); this._fileDeliver(nm); }
        else if (market) { this._dropCard(true); this.recycleCard(nm); }
        else { this._dropCard(false); }
      };
      document.addEventListener("click", onClick, true);
      this._carryClick = onClick;
    }, 0);
  }
  _dropCard(consumed) {
    const cc = this._carry; if (!cc) return;
    this._carry = null;
    if (this._carryMove) window.removeEventListener("mousemove", this._carryMove);
    if (this._carryClick) document.removeEventListener("click", this._carryClick, true);
    this._carryMove = this._carryClick = null;
    document.body.classList.remove("carrying-card");
    const mzz = document.getElementById("market-zone");
    if (mzz) mzz.classList.remove("recycle-armed");
    if (cc.srcEl) cc.srcEl.classList.remove("card-lifted");
    cc.fly.remove();
    if (!consumed) audio.play("click");
  }
  _fileDeliver(name) {
    if (window.__malaLock && window.__malaLock.setFace) window.__malaLock.setFace("FILE");
    const st = this._deliverState;
    if (!st || !st.names.has(name) || st.chosen.has(name)) return;
    st.chosen.add(name);
    const f = document.querySelector("#drawer-zone .drw-folder.here"); if (f) f.classList.add("filled");
    audio.play("confirm");
    this._markDeliverCards();
    if (st.chosen.size >= st.names.size) this._finishDeliver();   // all filed -> complete
  }
  _markDeliverCards() {
    const st = this._deliverState;
    document.querySelectorAll("#rucksack-zone .ruck-card").forEach((card) => {
      const nm = card.dataset.name;
      card.classList.toggle("deliver-ready", !!st && st.names.has(nm) && !st.chosen.has(nm));
    });
  }
  _finishDeliver() {
    const st = this._deliverState; if (!st) return;
    this._deliverState = null;
    document.querySelectorAll("#rucksack-zone .ruck-card.deliver-ready").forEach((c) => c.classList.remove("deliver-ready"));
    if (window.__malaLock && window.__malaLock.deliver) window.__malaLock.deliver(false);
    audio.play("confirm");
    this.respond({ deliver: [...st.chosen] });
  }
  clearPrompt() {
    if (this._promptWin) { const w = this._promptWin; this._promptWin = null; w.close(); }
    if (this._helaAtemporal) { this._helaAtemporal = false; this.helaRelease(); }
    if (document.body.classList.contains("activating-items")) this._endActivationUI();
    if (this._deliverState) {
      this._deliverState = null;
      document.querySelectorAll("#rucksack-zone .ruck-card.deliver-ready").forEach((c) => c.classList.remove("deliver-ready"));
      if (window.__malaLock && window.__malaLock.deliver) window.__malaLock.deliver(false);
    }
    const p = document.getElementById("active-prompt"); if (p) p.remove();
    document.querySelectorAll(".drw-deliver").forEach((n) => n.remove());
    document.querySelectorAll(".mch-travel").forEach((n) => n.remove());
    document.querySelectorAll(".rck-activate").forEach((n) => n.remove());
    document.querySelectorAll(".tl-target, .tl-docket, .ply-target").forEach((n) => n.remove());
    document.querySelectorAll(".pcard-choose").forEach((n) => {
      n.classList.remove("pcard-choose"); n.removeAttribute("role"); n.removeAttribute("tabindex");
    });
    ["players-zone", "timeline-rail"].forEach((id) => {
      const z = document.getElementById(id); if (z) z.classList.remove("target-live");
    });
    const rz = document.getElementById("rucksack-zone");
    if (rz) rz.classList.remove("activation-live");
    const mz = document.getElementById("machine-zone");
    if (mz) mz.classList.remove("travel-live");
    document.body.classList.remove("buffing");
    document.querySelectorAll(".cell-choose").forEach((n) => {
      n.classList.remove("cell-choose"); n.removeAttribute("role"); n.removeAttribute("tabindex");
    });
    document.querySelectorAll(".drw-contract.drw-choose").forEach((n) => {
      n.classList.remove("drw-choose"); n.removeAttribute("role"); n.removeAttribute("tabindex");
    });
    const dz = document.getElementById("drawer-zone");
    if (dz) dz.classList.remove("deliver-live");
    document.querySelectorAll(".cab2-cell.hg-cell").forEach((n) => n.classList.remove("hg-cell"));
  }

  showWaiting(text) {
    this.clearWaiting();
    const w = el("div", "waiting-chip");
    w.id = "waiting-chip";
    w.innerHTML = `<span class="vz-sigil wc-sigil">${icon("hela")}</span><span class="vz-name">HELA</span><span class="wc-text">${text}</span><span class="wc-dots"><b></b><b></b><b></b></span>`;
    this.dom.overlay.appendChild(w);
  }
  clearWaiting() { const w = document.getElementById("waiting-chip"); if (w) w.remove(); }

  // ── HELA SPEAKS ── The sacred rule: if it is not printed on a real object, it
  // is not a floating legend, it is HER voice. A transient line in the visor.
  // essential: something happened to the player that he must hear now; everything else
  // is filed in HELA's notes, read while TAB is held (cabin.js say, help.js)
  helaSay(html, ms = 5000, tone = "", essential = false) {
    if (document.body.classList.contains("cabin-on") && window.__helaSay) return window.__helaSay(html, { ms, essential });
    const old = document.getElementById("hela-msg"); if (old) old.remove();
    const m = el("div", "hela-msg" + (tone ? " hela-" + tone : "")); m.id = "hela-msg";
    m.innerHTML = `<span class="vz-sigil">${icon("hela")}</span>`
      + `<div class="hm-body"><span class="vz-name">HELA</span><span class="hm-line">${html}</span></div>`;
    this.dom.overlay.appendChild(m);
    requestAnimationFrame(() => m.classList.add("on"));
    clearTimeout(this._helaT);
    this._helaT = setTimeout(() => {
      m.classList.remove("on");
      setTimeout(() => { if (m.parentNode) m.remove(); }, 420);
    }, ms);
  }

  helaRelease() {
    const m = document.getElementById("hela-hold");
    if (!m) return;
    m.classList.remove("on");
    setTimeout(() => { if (m.parentNode) m.remove(); }, 420);
  }

  // Arriving at a scene: Hela reports what you are looking at (replaces the old
  // anonymous "Temporal Receptor 0/3" legend, it was text with no object).
  _onSceneArrive(scene) {
    if (scene === "drawer") this._helaReceptor();
    else if (!this._helaAtemporal) this.helaRelease();
    if (scene === "market") {
      if (this._pendingSignDrop) { this._pendingSignDrop = false;
        const sgn = this.dom.marketSign;
        if (sgn) { this._signAnimating = true; this.merchantSignSwap(sgn, this._signState === "open"); } }
      if (this._pendingOpenMoment) { this._pendingOpenMoment = false; this.marketOpenMoment(); }
    }
  }
  _helaReceptor() {
    const me = this._self(); if (!me) return;
    const d = (me.delivered_periods || []).length;
    // one terse breath, not a held wall, the drawers themselves show the rest
    this.helaSay(`Receptor: <b>${d} of 3</b> periods stand.`, 3400);
  }

  promptMarket(req) {
    this.marketReq = req;
    this.marketMode = "buy";
    tutorials.show("market");
    this.renderMarket();
    const zone = document.getElementById("market-zone");
    if (zone) { zone.classList.remove("turn-cue"); void zone.offsetWidth; zone.classList.add("turn-cue"); }
  }

  promptDeliver(req) {
    if (this._deliverInDrawer(req)) return;          // diegetic path (DP-1)
    const o = req.options;
    const chosen = new Set(o.deliverable.map((c) => c.name));
    const body = el("div", "choice-grid");
    o.deliverable.forEach((c) => {
      const card = this.cardEl(c); card.classList.add("selectable", "selected");
      card.addEventListener("click", () => {
        if (chosen.has(c.name)) { chosen.delete(c.name); card.classList.remove("selected"); }
        else { chosen.add(c.name); card.classList.add("selected"); }
      });
      body.appendChild(card);
    });
    this.showPrompt({
      title: "Delivery", sub: `Deliver objects at ${roman(o.century)} to your Temporal Receptor (+1 CP each).`,
      body, actions: [{ label: "Deliver Selected", primary: true,
        onClick: () => this.respond({ deliver: [...chosen] }) }],
    });
  }

  /* DP-1, deliver WITHOUT a popup: a delivery docket inside the drawer.
     The camera has already turned to the drawer scene (kind->scene map). The
     deliverable objects ride a manila strip pinned in the drawer; the current
     century's folder pulses as the destination; confirm files them. Click +
     keyboard parity (cards toggle on Enter/Space; confirm is a real button).
     Returns false when the drawer host is missing -> caller falls back to the
     popup, so nothing can strand a decision. */
  _deliverInDrawer(req) {
    const zone = document.getElementById("drawer-zone");
    if (!zone || !document.getElementById("drawer-body")) return false;
    zone.querySelectorAll(".drw-deliver").forEach((n) => n.remove());
    const o = req.options;
    // NO docket: the relic is dragged from the maleta into the century folder.
    this._deliverState = { century: o.century, names: new Set(o.deliverable.map((c) => c.name)), chosen: new Set() };
    zone.classList.add("deliver-live");
    tutorials.show("delivery");
    // No strip, no wall of words. Her MARK stains the right drawer and the world
    // blurs around it, the traveler opens the drawer HIMSELF. Depth over text.
    const folder = zone.querySelector(".drw-folder.here");
    if (folder) {
      const cell = folder.closest(".cab2-cell");
      if (cell) cell.classList.add("hg-cell");   // hers until it opens
      folder.addEventListener("dragover", (ev) => { if (this._deliverState) { ev.preventDefault(); folder.classList.add("fold-drop"); } });
      folder.addEventListener("dragleave", () => folder.classList.remove("fold-drop"));
      folder.addEventListener("drop", (ev) => {
        folder.classList.remove("fold-drop");
        let name = ""; try { name = ev.dataTransfer.getData("text/handcard"); } catch (err) {}
        if (name) { ev.preventDefault(); this._fileDeliver(name); }
      });
    }
    // forgiving: dropping anywhere in the OPEN cabinet files the relic (bound once)
    const dbody = document.getElementById("drawer-body");
    if (dbody && !dbody._deliverBound) {
      dbody._deliverBound = true;
      dbody.addEventListener("dragover", (ev) => { if (this._deliverState) { ev.preventDefault(); dbody.classList.add("deliver-hot"); } });
      dbody.addEventListener("dragleave", (ev) => { if (!dbody.contains(ev.relatedTarget)) dbody.classList.remove("deliver-hot"); });
      dbody.addEventListener("drop", (ev) => {
        dbody.classList.remove("deliver-hot");
        let name = ""; try { name = ev.dataTransfer.getData("text/handcard"); } catch (err) {}
        if (name) { ev.preventDefault(); this._fileDeliver(name); }
      });
    }
    // the combination lock becomes FILE / SKIP for the delivery
    if (window.__malaLock && window.__malaLock.deliver) window.__malaLock.deliver(true, () => this._finishDeliver());
    this._markDeliverCards();
    return true;
  }

  /* DP-3, travel WITHOUT a popup: the same direction/distance controls dock
     onto the Time Machine plane (the manopla operates ALL travel, per the
     composition). Click + keyboard live in the same buttons; GO confirms.
     Returns false when the machine host is missing -> popup fallback. */

  /* DP-5, item activation WITHOUT a popup: your case is where decisions
     about YOUR cards are taken. A docket rides the maleta: the activatable
     items rack up (toggle by click or Enter/Space), ACTIVATE or PASS stamps
     confirm. Popup only as fallback when the case host is missing. */
  /* CABIN PATH: activation happens ON the objects themselves. Ready cards
     tremble gold; a click STAGES that ability (the chain drops over the card);
     the briefcase combination lock is the PASS control, clicking it seals the
     window and sends every staged ability in priority order (§2.3). Cards not
     offered by the driver (e.g. acquired this same phase) wear the chain from
     the start. */
  _activationInMala(req) {
    if (!document.body.classList.contains("cabin-on")) return false;
    const zone = document.getElementById("rucksack-zone");
    if (!zone) return false;
    // an item with nothing in reach is not READY: it gets the NO TARGET mark instead of
    // the glow, and firing it would only fizzle (driver._target_preview)
    const acts = req.options.actives || [];
    this._actReady = new Set(acts.filter((c) => !c.no_target).map((c) => c.name));
    this._actNoTarget = new Map(acts.filter((c) => c.no_target).map((c) => [c.name, NO_TARGET[c.target_kind] || "nothing in reach"]));
    this._actStaged = [];
    this._actStagedSet = new Set();
    document.body.classList.add("activating-items");
    this._markActivationCards();
    if (!this._actClick) {
      this._actClick = (e) => {
        const card = e.target.closest && e.target.closest("#rucksack-zone .ruck-pocket .card.act-ready");
        if (!card) return;
        e.stopPropagation(); e.preventDefault();
        this._stageActivation(card.dataset.name, card);
      };
      document.addEventListener("click", this._actClick, true);
    }
    if (window.__malaLock) window.__malaLock.arm(() => this._passActivation());
    audio.play("chart_creak");
    return true;
  }
  _markActivationCards() {
    const on = document.body.classList.contains("activating-items");
    const me = this._self();
    const mine = me ? (me.hand || me.equipment || []) : [];
    document.querySelectorAll("#rucksack-zone .ruck-pocket .card").forEach((card) => {
      card.classList.remove("act-ready", "act-used", "act-notarget");
      const tag = card.querySelector(".act-nt"); if (tag) tag.remove();
      if (!on) return;
      const name = card.dataset.name;
      const meta = mine.find((c) => c.name === name);
      const hasActive = !!(meta && /active/.test(meta.ability_type || ""));
      if (this._actStagedSet && this._actStagedSet.has(name)) card.classList.add("act-used");
      else if (this._actReady && this._actReady.has(name)) card.classList.add("act-ready");
      else if (this._actNoTarget && this._actNoTarget.has(name)) {
        card.classList.add("act-notarget");
        const t = el("div", "act-nt");
        t.innerHTML = `<b>NO TARGET</b><span>${this._actNoTarget.get(name)}</span>`;
        card.appendChild(t);
      }
      else if (hasActive) card.classList.add("act-used");   // fresh this phase, chained
    });
  }
  _stageActivation(name, cardEl2) {
    if (!this._actStagedSet || this._actStagedSet.has(name)) return;
    this._actStaged.push({ card: name, context: null });
    this._actStagedSet.add(name);
    this._actReady.delete(name);
    if (window.__malaLock && window.__malaLock.setFace)
      window.__malaLock.setFace("FIRE", `SEAL ${this._actStaged.length} ACT${this._actStaged.length > 1 ? "S" : ""} · CLICK`);
    cardEl2.classList.remove("act-ready"); cardEl2.classList.add("act-used");
    if (cardEl2.animate) cardEl2.animate(
      [{ boxShadow: "0 0 0 3px #e2c078, 0 0 26px rgba(226,192,120,.95)", transform: "scale(1.1)" },
       { boxShadow: "0 0 0 1px rgba(226,192,120,.3)", transform: "scale(1)" }],
      { duration: 560, easing: "cubic-bezier(.2,.8,.3,1)" });
    audio.play("confirm");
  }
  _passActivation() {
    const staged = this._actStaged || [];
    this._endActivationUI();
    this.respond({ activations: staged });
  }
  _endActivationUI() {
    document.body.classList.remove("activating-items");
    if (this._actClick) { document.removeEventListener("click", this._actClick, true); this._actClick = null; }
    this._actReady = null; this._actNoTarget = null; this._actStaged = null; this._actStagedSet = null;
    this._markActivationCards();
    if (window.__malaLock) window.__malaLock.disarm();
  }

  _activationInCase(req) {
    const zone = document.getElementById("rucksack-zone");
    if (!zone) return false;
    zone.querySelectorAll(".rck-activate").forEach((n) => n.remove());
    const actives = req.options.actives || [];
    const chosen = new Set();
    const dock = el("div", "drw-deliver rck-activate");
    dock.appendChild(el("div", "dd-head",
      `<span class="vz-sigil dd-sigil">${icon("hela")}</span><span class="dd-title">${actives.length ? "ITEM ACTIVATION" : "NO ITEM CAN ACT"}</span>`));   // the how is HELA's YOUR MOVE box
    if (actives.length) {
      const rack = el("div", "dd-rack");
      actives.forEach((c) => {
        const card = this.cardEl(c);
        card.classList.add("selectable");
        card.setAttribute("role", "button"); card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `${this.dn(c)}, toggle activation`);
        const toggle = () => {
          if (chosen.has(c.name)) { chosen.delete(c.name); card.classList.remove("selected"); }
          else { chosen.add(c.name); card.classList.add("selected"); }
          act.textContent = `ACTIVATE ${chosen.size}`;
          audio.play("click");
        };
        card.addEventListener("click", toggle);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        });
        rack.appendChild(card);
      });
      dock.appendChild(rack);
    }
    const act = el("button", "dd-confirm", "ACTIVATE 0");
    act.addEventListener("click", () => { audio.play("confirm");
      this.respond({ activations: [...chosen].map((name) => ({ card: name, context: null })) }); });
    const skip = el("button", "dd-confirm dd-skip", "PASS");
    skip.addEventListener("click", () => { audio.play("click"); this.respond({ activations: [] }); });
    if (actives.length) dock.appendChild(act);
    dock.appendChild(skip);
    zone.appendChild(dock);
    zone.classList.add("activation-live");
    return true;
  }

  /* DP-4, traveler targets die on the PROFILE SHEETS: each candidate's
     paper pulses and becomes the button itself. A docket on the profiles
     quadrant names the act. Popup fallback when a panel is missing. */
  _travelerOnSheets(req) {
    const zone = document.getElementById("players-zone");
    if (!zone) return false;
    const o = req.options;
    if (!o.candidates || !o.candidates.length) return false;   // nothing to mark, the popup path handles it
    const marks = [];
    for (const c of o.candidates) {
      const panel = zone.querySelector(`.pcard[data-seat="${CSS.escape(c.name)}"]`);
      if (!panel) return false;
      marks.push([panel, c.name]);
    }
    if (!marks.length) return false;
    zone.querySelectorAll(".drw-deliver").forEach((n) => n.remove());
    const strip = el("div", "drw-deliver ply-target");
    strip.appendChild(el("div", "dd-head",
      `<span class="vz-sigil dd-sigil">${icon("hela")}</span><span class="dd-title">${(o.card_display || o.card || "TARGET").toUpperCase()}</span>`));   // the how rides YOUR MOVE (comic.js)
    zone.appendChild(strip);
    zone.classList.add("target-live");
    this._sheetsReq = req;   // the sheets own this decision (re-armed after a render)
    for (const [panel, name] of marks) {
      if (panel.classList.contains("pcard-choose")) continue;   // a kept file is still armed
      panel.classList.add("pcard-choose");
      panel.setAttribute("role", "button"); panel.setAttribute("tabindex", "0");
      panel.setAttribute("aria-label", `Target ${name}`);
      const pick = () => { audio.play("confirm"); this.respond({ choice: name }); };
      panel.addEventListener("click", pick);
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
    }
    return true;
  }

  /* DP-6, century targets die on the TIMELINE: target dots pinned on the
     arch (click path) + century stamps on a rail docket (keyboard path). */
  _centuryOnTimeline(req, respondFn, title, sub) {
    const rail = this.dom.timeline;
    const svg = rail && rail.querySelector(".tl-svg");
    if (!rail || !svg) return false;
    const cands = req.options.candidates
      .map((c) => (typeof c === "number" ? c : c.century)).filter((c) => c != null);
    if (!cands.length) return false;
    rail.querySelectorAll(".tl-target, .drw-deliver").forEach((n) => n.remove());
    const g = this._archGeom(), NS = "http://www.w3.org/2000/svg";
    for (const c of cands) {
      const pt = this._archLocal(c, g);
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("class", "tl-target");
      dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y); dot.setAttribute("r", 13);
      dot.addEventListener("click", () => { audio.play("confirm"); respondFn(c); });
      svg.appendChild(dot);
    }
    const strip = el("div", "drw-deliver tl-docket");
    strip.appendChild(el("div", "dd-head",
      `<span class="vz-sigil dd-sigil">${icon("hela")}</span><span class="dd-title">${title.toUpperCase()}</span><span class="dd-sub">${sub}</span>`));
    const rack = el("div", "dd-rack tl-rack");
    cands.forEach((c) => {
      const b = el("button", "dd-confirm tl-cbtn", roman(c));
      b.addEventListener("click", () => { audio.play("confirm"); respondFn(c); });
      rack.appendChild(b);
    });
    strip.appendChild(rack);
    rail.appendChild(strip);
    rail.classList.add("target-live");
    return true;
  }

  /* DP-7, the matrix buff dies on the manopla: the buffable cells pulse
     gold and become the buttons (click / Enter/Space). Docket names the act.
     Popup fallback when the matrix isn't rendered. */
  _buffOnMatrix(req, rearm) {
    const zone = document.getElementById("machine-zone");
    if (!zone) return false;
    const marks = [];
    for (const m of req.options.modules) {
      const cell = zone.querySelector(`.cell[data-r="${Math.floor(m / 3)}"][data-c="${m % 3}"]`);
      if (!cell) return false;
      marks.push([cell, m]);
    }
    zone.querySelectorAll(".mch-travel").forEach((n) => n.remove());
    const dock = el("div", "mch-travel mch-buff");
    dock.appendChild(el("div", "dd-head",
      `<span class="vz-sigil dd-sigil">${icon("hela")}</span><span class="dd-title">MATRIX BUFF</span>`));   // the how rides YOUR MOVE (comic.js)
    zone.appendChild(dock);
    zone.classList.add("travel-live");
    document.body.classList.add("buffing");          // the pip-boy wakes for the choice
    for (const [cell, m] of marks) {
      cell.classList.add("cell-choose");
      cell.setAttribute("role", "button"); cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `Buff module ${m + 1}`);
      const pick = () => {
        audio.play("confirm");
        // the pip-boy ACCEPTS: the chosen module flashes gold and stamps its +1
        if (cell.animate) cell.animate(
          [{ boxShadow: "inset 0 0 0 3px #e2c078, 0 0 18px rgba(226,192,120,.9)", transform: "scale(1.18)" },
           { boxShadow: "inset 0 0 0 1px rgba(226,192,120,.4)", transform: "scale(1)" }],
          { duration: 620, easing: "cubic-bezier(.2,.8,.3,1)" });
        setTimeout(() => this.respond({ module: m }), 300);
      };
      cell.addEventListener("click", pick);
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
    }
    // The manopla IS the click surface for this decision, so pull focus to the desk
    // (law #5: a decision with an on-scene surface may, once armed). Without this the
    // buff could arrive while the camera sat on the reward drawer, where the console is
    // hidden (opacity:0) and unclickable = the hard deadlock.
    // (a re-arm after a state render keeps the camera where the player put it)
    if (!rearm) try { if (this.camera && this.camera.scene !== "main") this.camera.setScene("main"); } catch (e) {}
    return true;
  }

  promptReward(req) {
    if (this._rewardInDrawer(req)) return;           // diegetic path (DP-2)
    // Category is chosen first; a generator (I/II/III) is then rolled (§23.1).
    const INFO = {
      Chaos: [
        ["I", "Paradox, every other traveler loses 3 energy."],
        ["II", "Destroy a card, from the Market or a rival's equipment."],
        ["III", "Relocate the Merchant to any century except Year Zero."],
      ],
      Time: [
        ["I", "Solo-phase voucher, held; activate for an extra solo Generators phase."],
        ["II", "Market voucher, held; activate to act in the Market regardless of synchrony."],
        ["III", "Item voucher, held; activate for an extra item-activation window."],
      ],
      Resource: [
        ["I", "+3 energy and +3 gold."],
        ["II", "Steal a revealed Merchant card."],
        ["III", "Permanent +1 buff to one Time Machine module."],
      ],
    };
    const body = el("div");
    const grid = el("div", "choice-grid");
    const info = el("div", "reward-info");
    const showInfo = (cat) => {
      info.innerHTML = `<div class="ri-cat cat-${cat}">${cat}</div>`
        + INFO[cat].map(([n, d]) => `<div class="ri-row"><span class="ri-tier">${n}</span>${d}</div>`).join("");
    };
    req.options.categories.forEach((cat, i) => {
      const b = el("button", `choice cat-${cat}`, cat);
      b.addEventListener("mouseenter", () => showInfo(cat));
      b.addEventListener("focus", () => showInfo(cat));
      b.addEventListener("click", () => this.respond({ category: cat }));
      grid.appendChild(b);
      if (i === 0) showInfo(cat);
    });
    body.appendChild(grid);
    body.appendChild(info);
    this.showPrompt({
      title: "Contract Reward",
      sub: "Choose a category, a generator (I / II / III) then sets the effect.",
      body, actions: [],
    });
  }

  /* DP-2, contract reward WITHOUT a popup: the three contract folders that
     already live in the drawer become the choice itself. Click or Enter/Space
     a folder to choose its category; a docket strip explains the moment.
     Fallback to the popup when the drawer/contract hosts are missing. */
  _rewardInDrawer(req) {
    const zone = document.getElementById("drawer-zone");
    if (!zone) return false;
    const cell = zone.querySelector('.cab2-cell[data-drawer="CONTRACTS"]');
    if (!cell) return false;
    const cats = req.options.categories;
    const papers = [...cell.querySelectorAll(".ct-paper")];
    const byPaper = new Map();
    for (const cat of cats) {
      const pp = papers.find((x) => x.getAttribute("data-cat") === cat);
      if (!pp) return false;
      byPaper.set(pp, cat);
    }
    cell.classList.add("hg-cell");   // she stains the CONTRACTS drawer; the hand opens it
    zone.querySelectorAll(".drw-deliver").forEach((n) => n.remove());
    zone.classList.add("deliver-live");
    papers.forEach((pp) => { if (!byPaper.has(pp)) pp.classList.add("ct-dim"); });
    for (const [pp, cat] of byPaper) {
      pp.classList.add("ct-choose");
      pp.setAttribute("aria-label", `Read and stamp the ${cat} contract`);
      pp.addEventListener("click", () => {
        this._openContract(cat, null, { stamp: true, onStamp: () => this.respond({ category: cat }) });
      });
    }
    return true;
  }

  promptActivation(req) {
    if (this._activationInMala(req)) return;
    if (this._activationInCase(req)) return;         // diegetic path (DP-5)
    const actives = req.options.actives || [];
    const chosen = new Set();
    const body = el("div", "choice-grid");
    actives.forEach((c) => {
      const card = this.cardEl(c); card.classList.add("selectable");
      card.addEventListener("click", () => {
        if (chosen.has(c.name)) { chosen.delete(c.name); card.classList.remove("selected"); }
        else { chosen.add(c.name); card.classList.add("selected"); }
      });
      body.appendChild(card);
    });
    this.showPrompt({
      title: "Item Activation",
      sub: "Pick items to fire, each once this phase. Confirm, or skip.",
      body: actives.length ? body : el("div", "muted small", "No activatable items."),
      actions: [
        { label: "Activate Selected", primary: true, onClick: () =>
          this.respond({ activations: [...chosen].map((name) => ({ card: name, context: null })) }) },
        { label: "Skip", onClick: () => this.respond({ activations: [] }) },
      ],
    });
  }

  promptPickCard(req, title, key) {
    const body = el("div", "choice-grid");
    req.options.candidates.forEach((c) => {
      const card = this.cardEl(c); card.classList.add("is-actionable");
      card.addEventListener("click", () => this.respond({ [key]: c.name }));
      body.appendChild(card);
    });
    this.showPrompt({ title, sub: "Select a target card.", body, actions: [] });
  }

  _selClass(mode) {
    return mode === "steal" ? "can-steal" : mode === "destroy" ? "can-destroy" : "can-select";
  }

  // Begin an in-place card selection: highlight each candidate where it lives (Market
  // cards in the wagon, the Secret card in its bay, rival gear in player panels) and
  // click to answer, no floating popup over the Causality Generators.
  routeCardSelect(req, respondKey, title) {
    const cands = req.options.candidates || [];
    if (!this._hasInlineCandidates(cands)) {
      // recycled / receptor (no Market home) -> keep the popup, the allowed exception.
      return respondKey === "choice" ? this.promptTarget(req)
                                     : this.promptPickCard(req, title, "card");
    }
    const byName = {};
    cands.forEach((c) => { byName[c.name] = { zone: c.zone, owner: c.owner || null }; });
    this.selectReq = { respondKey, title, mode: req.options.select_mode || "select", byName };
    this.clearPrompt();          // selection happens in place; no overlay
    /* The safety net is set up AFTER the drawing, so an error while drawing used to
       take the net with it: `selectReq` stayed stuck, no popup appeared, and the
       match waited forever for an answer nobody could give. Drawing is optional,
       being able to answer is not: if any of the three paints throws, fall back
       to the popup, whose buttons always work. */
    let paintError = null;
    try {
      this.renderMarket();
      this.renderPlayers();
      this._paintBadgeAllocs();
    } catch (err) {
      paintError = err;
      console.error("[target] the in-place selection failed to draw, the popup takes over", err);
    }
    if (paintError) {
      this.selectReq = null;
      if (respondKey === "choice") this.promptTarget(req);
      else this.promptPickCard(req, title, "card");
      return;
    }
    // THE GAME MUST NEVER DIE QUIET: if the in-place render produced nothing the
    // hand can actually click, fall back to the popup (its buttons always work).
    setTimeout(() => {
      if (!this.selectReq || this.pendingReq !== req) return;
      /* Being drawn is not being clickable. A card can be rendered and still out
         of reach: off screen, faded by a parent, behind another panel, or in a view
         the camera is not showing. So ask the browser what sits at the centre of
         each card; if it is not the card itself, that card does not count, and if
         none counts the popup comes in. */
      const targets = [...document.querySelectorAll(
        ".card.can-steal, .card.can-destroy, .mc.targetable, .pcard-choose,"
        + " .prompt .card.is-actionable, .secret-card-wrap .card.can-select")];
      const reachable = targets.some((el) => {
        const b = el.getBoundingClientRect();
        if (b.width < 6 || b.height < 6) return false;
        if (b.right < 0 || b.bottom < 0
            || b.left > innerWidth || b.top > innerHeight) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || +cs.opacity < 0.05) return false;
        const hit = document.elementFromPoint(
          Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
        return !!(hit && (hit === el || el.contains(hit) || hit.contains(el)));
      });
      if (!reachable) {
        console.error("[target] no card of the selection is reachable on screen ("
          + targets.length + " drawn), falling back to the popup");
        this.selectReq = null;
        // the in-place marks were drawn for a selection that no longer listens:
        // repaint without them, or the shelf keeps offering cards that do nothing
        try { this.renderMarket(); this.renderPlayers(); } catch (e) {}
        if (respondKey === "choice") this.promptTarget(req);
        else this.promptPickCard(req, title, "card");
      }
    }, 350);
  }

  respondSelect(name) {
    const sel = this.selectReq;
    if (!sel) return;
    const meta = sel.byName[name] || {};
    const data = { [sel.respondKey]: name };
    if (meta.owner) data.owner = meta.owner;   // disambiguate Market vs identically-named gear
    this.selectReq = null;
    this.respond(data);
    this.renderMarket();
    this.renderPlayers();
  }

  // Thomas Edison's Lamp, resolve the Secret-Market peek / buy / steal IN the Secret
  // bay (part of the wagon) instead of a floating popup. Read by _renderSecret.
  beginSecretDeal(req) {
    this.secretDeal = req;
    this.clearPrompt();
    this.renderMarket();
  }

  // Generic target picker for an active card's ability (§2.3).
  promptTarget(req) {
    const o = req.options;
    const tt = o.target_type;
    const cardName = o.card_display || o.card;
    if (tt === "traveler" && this._travelerOnSheets(req)) return;   // DP-4
    if (tt === "century" && this._centuryOnTimeline(req,
        (c) => this.respond({ choice: c }), `${cardName}, Target`,
        o.prompt || "Choose a century on the timeline.")) return;   // DP-6
    const body = el("div");
    if (tt === "traveler") {
      const grid = el("div", "choice-grid");
      o.candidates.forEach((c) => {
        const t = (this.view && this.view.travelers.find((x) => x.name === c.name)) || {};
        const b = el("button", "choice target-traveler");
        b.innerHTML = `<span class="tt-swatch" style="background:${this.colorOf(c.name)}"></span>`
          + `<span>${c.name}</span>`
          + `<span class="tt-meta">${t.century != null ? roman(t.century) : ""}${t.energy != null ? " · " + t.energy + this.svgInline("energy") : ""}</span>`;
        b.addEventListener("click", () => this.respond({ choice: c.name }));
        grid.appendChild(b);
      });
      body.appendChild(grid);
    } else if (tt === "century") {
      const grid = el("div", "choice-grid");
      o.candidates.forEach((c) => {
        const b = el("button", "choice", roman(c.century));
        b.addEventListener("click", () => this.respond({ choice: c.century }));
        grid.appendChild(b);
      });
      const scroll = el("div"); scroll.style.maxHeight = "130px"; scroll.style.overflowY = "auto";
      scroll.appendChild(grid); body.appendChild(scroll);
    } else { // card
      const grid = el("div", "choice-grid");
      o.candidates.forEach((c) => {
        const card = this.cardEl(c); card.classList.add("is-actionable");
        card.addEventListener("click", () => this.respond({ choice: c.name }));
        grid.appendChild(card);
      });
      body.appendChild(grid);
    }
    // HELA's YOUR MOVE box already says the how (comic.js), unless the tutorial muted it
    this.showPrompt({ title: `${cardName}, Target`, sub: window.__helaMute ? (o.prompt || "Choose a target.") : "", body, actions: [] });
  }

  promptRecycle(req) {
    const o = req.options;
    const chosen = new Set();
    const body = el("div", "choice-grid");
    o.recyclable.forEach((c) => {
      const card = this.cardEl(c); card.classList.add("selectable");
      const tag = el("div", "recycle-gain", `+${c.recycle_value}`+this.svgInline("energy"));
      card.appendChild(tag);
      card.addEventListener("click", () => {
        if (chosen.has(c.name)) { chosen.delete(c.name); card.classList.remove("selected"); }
        else { chosen.add(c.name); card.classList.add("selected"); }
      });
      body.appendChild(card);
    });
    this.showPrompt({
      title: "Recycle Items", sub: "Recycle items for energy, or skip.",
      body,
      actions: [
        { label: "Recycle Selected", primary: true, onClick: () => this.respond({ recycle: [...chosen] }) },
        { label: "Skip", onClick: () => this.respond({ recycle: [] }) },
      ],
    });
  }

  // Shared 'limbo' interaction (§12.2 / §21 Agnes's Cauldron): an incoming card has
  // no free home. With a free slot it is a take/decline steal; with a full inventory,
  // recycle one held item to make room, or decline, and the card is destroyed / lost.
  promptCapacity(req) {
    const o = req.options;
    const incoming = o.incoming || {};
    const inName = incoming.display_name || this.nameEn(incoming.name) || incoming.name;
    const destroys = o.destroy_on_decline !== false; // active steals destroy on decline
    const body = el("div", "capacity-body");
    const inWrap = el("div", "capacity-incoming");
    inWrap.appendChild(el("div", "capacity-label", `Incoming, ${inName}`));
    const inCard = this.cardEl(incoming); inCard.classList.add("incoming-card");
    inWrap.appendChild(inCard);
    body.appendChild(inWrap);

    if (o.room) {
      // Free equipment slot, a straight take/decline choice (honours "you may steal").
      this.showPrompt({
        title: "Steal a Card?",
        sub: req.prompt || `Steal ${inName} into a free slot, or decline.`,
        body,
        actions: [
          { label: "Take the card", primary: true, onClick: () => this.respond({ take: true }) },
          { label: "Decline", ghost: true, onClick: () => this.respond({ take: false }) },
        ],
      });
      return;
    }

    body.appendChild(el("div", "capacity-label", "Recycle one to make room:"));
    const grid = el("div", "choice-grid");
    (o.recycle_choices || []).forEach((c) => {
      const card = this.cardEl(c); card.classList.add("is-actionable");
      card.appendChild(el("div", "recycle-gain", `+${c.recycle_value}`+this.svgInline("energy")));
      card.addEventListener("click", () => this.respond({ recycle: c.name }));
      grid.appendChild(card);
    });
    body.appendChild(grid);
    this.showPrompt({
      title: "Equipment Full",
      sub: req.prompt || `Recycle one item to make room for ${inName}, or `
        + `${destroys ? "it is destroyed forever" : "decline the new item"}.`,
      body,
      actions: [
        { label: destroys ? "Destroy incoming card" : "Decline the new item",
          ghost: true, onClick: () => this.respond({ recycle: null }) },
      ],
    });
  }

  promptMatrixBuff(req) {
    if (this._buffOnMatrix(req)) return;             // diegetic path (DP-7)
    const body = el("div", "choice-grid");
    req.options.modules.forEach((m) => {
      const b = el("button", "choice", `Module ${m + 1}`);
      b.addEventListener("click", () => this.respond({ module: m }));
      body.appendChild(b);
    });
    this.showPrompt({ title: "Matrix Buff", sub: "Add +1 to one module, permanent.", body, actions: [] });
  }

  /* ========================= EVENTS / FX =========================== */
  // Play one event: log it, animate it, cue sound, then resolve after its pace
  // so the next event doesn't stomp on it. Awaited by the queue pump.
  /* ── THE OPENING: she deals the hour, every badge pops once, engines shown ── */
  async _paradeOpening(allocs) {
    const cab = document.body.classList.contains("cabin-on");
    const seats = Object.keys(allocs || {});
    this._dealtSeats = new Set();
    if (!cab || this.speed === "fast" || seats.length === 0) {
      seats.forEach((s2) => this._dealtSeats.add(s2));
      this._paintBadgeAllocs();
      return;
    }
    // THE TABLE'S MOMENT: every hand confirmed, now each is DEALT, one at a time.
    this._paintBadgeAllocs();                     // darkness first: no hand shows before its deal
    const beat = this._beat(460);
    this.helaSay("The hour is dealt, engines on the table.", 4200, "note");
    this._railShow("open", 0);
    document.body.classList.add("rt-stage");
    try {
      for (const seat of seats) {
        this._dealtSeats.add(seat);
        if (seat === this.seat) {   // your own hand flashes on the pip-boy
          const mz = document.querySelector("#hull-console .matrix-wrap");
          if (mz) { mz.classList.add("rt-dealt"); setTimeout(() => mz.classList.remove("rt-dealt"), beat); }
          try { audio.play("dice"); } catch (e) {}
          await this._sleep(Math.round(beat * .8));
          continue;
        }
        const pcard = document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"]`);
        if (!pcard) continue;
        pcard.classList.add("rt-lift");
        const src = pcard.querySelector(".bd-alloc");
        if (src) src.classList.add("rt-src");
        this._paintBadgeAllocs(seat);              // the DEAL lands as its dice appear
        try { audio.play("dice"); } catch (e) {}
        await this._sleep(beat);
        pcard.classList.remove("rt-lift");
        if (src) src.classList.remove("rt-src");
      }
    } finally {
      Object.keys(allocs || {}).forEach((s2) => this._dealtSeats.add(s2));
      this._paintBadgeAllocs();                   // whatever the loop missed, land it
      document.body.classList.remove("rt-stage");
      this._railHide();
    }
  }
  /* ── THE MODULE RAIL: names what is firing; wears HER state colours (--vz) ── */
  _railShow(family, module) {
    let rail = document.getElementById("rt-rail");
    const eye = document.getElementById("hela-eye");
    if (!rail) { rail = el("div", ""); rail.id = "rt-rail"; (eye || document.body).appendChild(rail); }
    else if (eye && rail.parentElement !== eye) eye.appendChild(rail);
    clearTimeout(this._railT);
    const label = family === "open" ? "THE HOUR IS DEALT"
      : family === "recharge" ? `RECHARGE · MODULE ${roman(module || 1)}`
      : family === "paradox" ? `PARADOX · ${["THE FUTURE POOL", "THE PRESENT POOL", "THE PAST POOL"][(module || 4) - 4] || "THE POOL"}`
      : family === "heat" ? "THE BOILER" : family === "travel" ? "TRAVEL" : "";
    rail.innerHTML = `<span class="rr-glyph">${icon(family === "paradox" ? "paradox" : family === "heat" ? "booms" : family === "travel" ? "travel" : family === "open" ? "machine" : "energy")}</span><b>${label}</b>`;
    rail.classList.add("on");
    if (!document.body.classList.contains("cabin-on")) rail.classList.remove("on");
  }
  _railHide() { clearTimeout(this._railT);
    this._railT = setTimeout(() => { const r = document.getElementById("rt-rail"); if (r) r.classList.remove("on"); }, 420); }
  /* ── a coloured causality chip between two elements (causer -> victim) ── */
  /* ── A CARD ARRIVING ON A RIVAL'S FILE MATERIALISES, any path: buy, steal,
        delivery return. Detection by birth: compare each render against memory. ── */
  _markBornCards() {
    if (!document.body.classList.contains("cabin-on")) return;
    this._mcSeen = this._mcSeen || {};
    document.querySelectorAll(".pcard[data-seat]").forEach((pcard) => {
      const seat = pcard.dataset.seat;
      const names = [...pcard.querySelectorAll(".mc[data-card]")].map((n) => n.dataset.card);
      const seen = this._mcSeen[seat];
      this._mcSeen[seat] = names;
      if (!seen) return;                          // first sighting of this file, no theater
      for (const nm of names) {
        if (seen.includes(nm)) continue;
        const el2 = pcard.querySelector(`.mc[data-card="${CSS.escape(nm)}"]`);
        if (!el2 || this.speed === "fast") continue;
        el2.classList.add("mc-born");             // it MATERIALISES
        setTimeout(() => el2.classList.remove("mc-born"), fx.ms(2600));
        try { audio.play("place"); } catch (e) {}
      }
    });
  }
  /* ── the GENERATOR REGISTRY on every badge: paint the revealed dice ── */
  _paintBadgeAllocs(onlySeat) {
    const allocs = this._lastAlloc;
    document.querySelectorAll(".pcard[data-seat]").forEach((pcard) => {
      const seat = pcard.dataset.seat;
      if (onlySeat && seat !== onlySeat) return;
      const box = pcard.querySelector(".bd-alloc");
      if (!box) return;
      // during the DEAL, a hand is only shown once its player has been presented
      const a = (allocs && allocs[seat]
        && (!this._dealtSeats || this._dealtSeats.has(seat))) ? allocs[seat] : null;
      box.classList.toggle("revealed", !!a);
      // OVERLOAD, read straight off the rival's registry: which of their functions is
      // sealed, and which one. `overloaded_next` is the one that just blew at clean-up
      // (locked from the coming Hour); `overloaded_functions` is the one locked right now.
      const tv = (this.view && this.view.travelers)
        ? this.view.travelers.find((x) => x.name === seat) : null;
      const ovlNow = new Set(tv && tv.overloaded_functions || []);
      const ovlNext = new Set(tv && tv.overloaded_next || []);
      const FN_NAME = ["Recharge", "Paradox", "Travel"];
      const groups = box.querySelectorAll(".ba-fn");
      groups.forEach((grp, r) => {
        const isNow = ovlNow.has(r), isNext = ovlNext.has(r);
        grp.classList.toggle("ba-ovl", isNow || isNext);
        grp.classList.toggle("ba-ovl-next", !isNow && isNext);
        if (isNow || isNext) {
          grp.setAttribute("title", `${FN_NAME[r]} OVERLOADED${isNow ? ", sealed this Hour": ", seals next Hour"}`);
        } else grp.removeAttribute("title");
        const cells = grp.querySelectorAll("b");
        cells.forEach((cell, c2) => {
          cell.className = "";
          const v = a && a.matrix && a.matrix[r] ? (a.matrix[r][c2] || 0) : 0;
          cell.textContent = v >= 1 && v <= 3 ? String(v) : "";
          if (v >= 1 && v <= 3) cell.classList.add("v" + v);
        });
      });
    });
  }
  /* ── PER-UNIT LIFE TICKER, every life change reads 1 by 1, always ── */
  _tickLife(seat, delta, tone, opt) {
    // returns the total duration; drives the DISPLAYED numeral old -> new stepwise.
    const step = this._beat(380);   // the RESOLUTION must breathe (+120%)
    const n = Math.abs(delta || 0);
    if (!n) return 0;
    const self = seat === this.seat;
    const numEl = self ? document.getElementById("vz-energy-n")
      : document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"] .bd-life-n`);
    const badge = self ? null : document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"]`);
    const ekg = badge && badge.querySelector(".bd-ekg");
    if (badge) badge.classList.add(delta > 0 ? "rt-gain" : "rt-hurt");
    if (ekg) ekg.classList.add(delta > 0 ? "ekg-gold" : "ekg-viol");
    if (self) { window.__vzTickHold = true;
      const holo = document.getElementById("vz-holo");
      if (holo) holo.classList.add(delta > 0 ? "rt-gain" : "rt-hurt"); }
    let start = numEl ? parseInt(numEl.textContent, 10) : NaN;
    if (opt && opt.from != null) { start = opt.from; if (numEl) numEl.textContent = String(start); }
    if (!isNaN(start)) (this._tickedTo = this._tickedTo || {})[seat] = start + delta;
    for (let i = 1; i <= n; i++) {
      setTimeout(() => {
        if (numEl && !isNaN(start)) {
          numEl.textContent = String(start + (delta > 0 ? i : -i));
          try { numEl.animate([{ transform: "scale(1.35)" }, { transform: "scale(1)" }],
            { duration: Math.min(step * .9, 260), easing: "cubic-bezier(.2,.8,.3,1)" }); } catch (e) {}
        }
        try { if (window.__pdxTone) window.__pdxTone(delta > 0 ? 430 + i * 45 : 260 - i * 22, .13, .045);
          else audio.play(delta > 0 ? "energy" : "heat", { power: .35 }); } catch (e) {}
      }, i * step);
    }
    const total = n * step + 320;
    setTimeout(() => {
      if (badge) badge.classList.remove("rt-gain", "rt-hurt");
      if (ekg) ekg.classList.remove("ekg-gold", "ekg-viol");
      if (self) { window.__vzTickHold = false;
        const holo = document.getElementById("vz-holo");
        if (holo) holo.classList.remove("rt-gain", "rt-hurt"); }
    }, total);
    return total;
  }
  /* ── THE COIN MATERIALISES on the file, that is where gold lives ── */
  _tickGold(seat, delta) {
    const step = this._beat(380);
    const n = Math.abs(delta || 0);
    if (!n || delta < 0) return 0;
    const self = seat === this.seat;
    let anchor2 = null;
    if (self) { const m = document.getElementById("mala-extra");
      anchor2 = m || document.getElementById("rucksack-zone"); }
    else anchor2 = document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"] .cs-gold`)
      || document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"] .csheet`)
      || document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"]`);
    if (!anchor2) return 0;
    const r = anchor2.getBoundingClientRect();
    if (!r.width) return 0;
    const isPile = anchor2.classList && anchor2.classList.contains("cs-gold");
    const px = self ? r.left + r.width * .18 : (isPile ? r.left + r.width * .5 : r.left + r.width * .78);
    const py = self ? r.top + r.height * .82 : (isPile ? r.top + r.height * .5 : r.bottom - 16);
    const wrap = el("div", "rt-coinwrap");
    wrap.style.left = px + "px"; wrap.style.top = py + "px";
    wrap.innerHTML = `<span class="rt-coin"></span><b class="rt-coin-n"></b>`;
    document.body.appendChild(wrap);
    const nEl = wrap.querySelector(".rt-coin-n");
    for (let i = 1; i <= n; i++) {
      setTimeout(() => {
        nEl.textContent = "×" + i;
        const c = el("span", "rt-coin rt-coin-drop");
        c.style.setProperty("--k", String(i % 3));
        wrap.appendChild(c);
        try { audio.play("coin", { power: .4 }); } catch (e) {}
      }, i * step);
    }
    const total = n * step + 700;
    setTimeout(() => { wrap.classList.add("out"); setTimeout(() => wrap.remove(), 420); }, total - 380);
    return total;
  }

  /* ── seat anchors: rivals anchor on their dossiers; YOU anchor on the helmet
        (pip-boy row = source, LIFETHREAD = where your life lives) ── */
  _seatAnchor(seat, role, family) {
    if (seat !== this.seat) {
      const pcard = document.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"]`);
      if (!pcard) return null;
      if (role === "life") return pcard.querySelector(".bd-life-n") || pcard;
      const famSel = family === "recharge" ? ".ba-fn.ba-r" : family === "paradox" ? ".ba-fn.ba-p"
        : family === "travel" ? ".ba-fn.ba-t" : ".bd-fuserail";
      return pcard.querySelector(famSel) || pcard.querySelector(".bd-alloc") || pcard;
    }
    if (role === "life") return document.getElementById("vz-holo") || document.getElementById("vz-thread");
    const row = family === "recharge" ? 0 : family === "paradox" ? 1 : 2;
    return document.querySelector(`#hull-console .matrix-wrap .cell[data-r="${row}"]`)
      || document.getElementById("vz-holo");
  }
  /* ── who fed dice into a paradox pool (matrix row 1 = paradox, col = pool) ── */
  _paradoxCausers(module) {
    const idx = (module || 4) - 4;
    const out = [];
    for (const [seat, a] of Object.entries(this._lastAlloc || {})) {
      const m = a && a.matrix;
      if (m && m[1] && m[1][idx] > 0) out.push(seat);
    }
    return out;
  }

  // WHO REALLY HIT WHOM in one paradox module: the pairs fx.js rebuilds from position (the
  // traveler fed that module AND his die could reach the victim: ahead, same century or
  // behind when the dice were set; Window of Time and Spear of Destiny counted). Feeding
  // the pool is not enough: a die that reached no one blamed no one. Nearest pair first;
  // a hit no pair explains has causer null.
  _paradoxPairs(p) {
    try { return (fx._paradoxPairs(p) || []).flat(); } catch (e) { return []; }
  }
  // the traveler whose die reached this victim (the nearest one), or null
  _paradoxCauserOf(pairs, victim) {
    const q = pairs.find((x) => x.victim === victim && x.causer);
    return q ? q.causer : null;
  }

  async playEvent(msg) {
    const { kind, payload } = msg;
    this.logEvent(kind, payload);
    try { comic.onEvent(kind, payload); } catch (e) {}
    try { fx.event(kind, payload); } catch (e) {}   // the comic effect of this rules action
    try { window.__pdxChronicle && window.__pdxChronicle.event(kind, payload, this); } catch (e) {}   // records, daily missions, quests (chronicle.js)
    // the auction phase watches its own events so the hall can play out the
    // resolution (who took what) before the window tunes back
    if (kind.startsWith("leilao_") || kind.startsWith("piece_")) {
      try { window.__lfEvent && window.__lfEvent(kind, payload); } catch (e) {}
      // HELA announces the Auction as a phase, on the same track as Delivery and
      // Market. `leilao_started` is the one event the Auction always sends when it
      // opens, so it gets the same banner and sound `phase_started` gives the rest.
      if (kind === "leilao_started" && this.currentPhase !== "leilao") {
        this.setPhase("leilao");
        this.banner("leilao");
        audio.play("phase");
      }
    }
    switch (kind) {
      case "hour_started":
        this._lastAlloc = null; this._dealtSeats = null; this._paintBadgeAllocs(); break;
      case "priority_order": this.priority = payload.order; this.renderPriority(); break;
      case "phase_started":
        this.setPhase(payload.phase);
        if (!payload.solo && !payload.invalid_allocation) { this.banner(payload.phase); audio.play("phase"); }
        if (payload.phase === "market") tutorials.show("market");
        if (payload.phase === "activation") tutorials.show("activation");
        break;
      case "dice_rolled":
        if (payload.seat === this.seat) {
          this.myDice = payload.dice;
          this._rollFx = true;   // play the quantum materialisation on next pool render
          if (!this.alloc) this.renderDiceIdle();
          audio.play("dice_roll");
        }
        break;
      case "allocations_revealed":
        if (payload.allocations[this.seat]) this.myLastMatrix = payload.allocations[this.seat].matrix;
        this._lastAlloc = payload.allocations || null;   // the parade reads WHO caused WHAT
        // (no instant paint, THE DEAL owns the reveal, one hand at a time)
        this.myDice = null; this.awaitingReveal = false;
        this._endCarry(false);
        this.clearWaiting();
        this.renderDiceIdle();
        this.renderMachineIdle();
        await this._paradeOpening(payload.allocations || {});
        break;
      case "recharged": {
        const effs = payload.effects || [];
        const cab2 = document.body.classList.contains("cabin-on");
        if (!cab2 || this.speed === "fast" || !effs.length) {
          effs.forEach((e) => {
            if (e.energy) this.resourceFloat(e.seat, `${e.energy > 0 ? "+" : ""}${e.energy}`, "energy");
            if (e.gold) this.resourceFloat(e.seat, `${e.gold > 0 ? "+" : ""}${e.gold}`, "gold");
            this.flashPanel(e.seat, "fx-pulse");
            fx.beat("recharge", e);   // WHIRR / CLINK beside the number (fx.js staggers them)
          });
          if (effs.length) audio.play(effs.some((e) => e.gold) ? "coin" : "energy");
          await this._sleep(this._ms("recharged"));
          break;
        }
        this._railShow("recharge", payload.module);
        document.body.classList.add("rt-stage");
        try {
          // ACT I, present each traveler's dice for this module (who fed it)
          const present = this._beat(340);
          for (const e of effs) {
            const src = this._seatAnchor(e.seat, "src", "recharge");
            const pc = e.seat !== this.seat ? document.querySelector(`.pcard[data-seat="${CSS.escape(e.seat)}"]`) : null;
            if (pc) pc.classList.add("rt-lift");
            if (src) src.classList.add("rt-src");
            fx.beat("recharge", e);   // WHIRR / CLINK as this traveler's dice are shown
            await this._sleep(present);
            if (pc) pc.classList.remove("rt-lift");
            if (src) src.classList.remove("rt-src");
          }
          // ACT II, EVERYONE counts at once, one unit at a time (longer gain = longer song)
          let maxT = 0;
          for (const e of effs) {
            if (e.energy) maxT = Math.max(maxT, this._tickLife(e.seat, e.energy, "energy"));
            if (e.gold) maxT = Math.max(maxT, this._tickGold(e.seat, e.gold));
          }
          await this._sleep(maxT);
        } finally {
          document.body.classList.remove("rt-stage");
          document.querySelectorAll(".pcard.rt-lift").forEach((n2) => n2.classList.remove("rt-lift"));
          document.querySelectorAll(".rt-src").forEach((n2) => n2.classList.remove("rt-src"));
          this._railHide();
        }
        break;
      }
      case "paradox_resolved": {
        const hits = payload.hits || [];
        // the STRIKE announces once (your own pain kicks the helmet), then the
        // victims fall ONE BY ONE, the same sea, billing each traveler in turn
        if (hits.some((h) => h.seat === this.seat)) {
          this.paradoxWarning(hits);
          this.shake("md");
          juice.flash("paradox", { intensity: 0.5 }); juice.hitPause(150); this.catStartle();
          tutorials.show("paradox");
        }
        if (hits.length) audio.play("paradox");
        // by POSITION: only a traveler whose die reached someone caused this paradox
        const pairs = this._paradoxPairs(payload);
        const causers = [...new Set(pairs.map((q) => q.causer).filter(Boolean))];
        if (hits.some((h) => h.damage)) fx.beat("paradox_cast", { causers });   // ZAP at whoever really cast it
        const cab3 = document.body.classList.contains("cabin-on");
        if (!cab3 || this.speed === "fast" || !hits.length) {
          hits.forEach((h) => {
            if (h.damage) this.resourceFloat(h.seat, `−${h.damage}`, "danger");
            this.flashPanel(h.seat, "fx-hit");
          });
          await this._sleep(this._ms("paradox_resolved"));
          break;
        }
        this._railShow("paradox", payload.module);
        document.body.classList.add("rt-stage");
        try {
          for (const h of hits) {   // IN ORDER, each victim is a little pip-boy strike
            const causer = this._paradoxCauserOf(pairs, h.seat);
            const col = causer ? this.colorOf(causer) : "#b48ce8";
            if (h.seat === this.seat) {
              // his own Paradox cell lights only when HIS die reached someone in this pool
              // (never in a rival's colour: that read as "your die did this")
              if (causers.includes(this.seat)) {
                const idx = (payload.module || 4) - 4;
                const cell = document.querySelector(`#hull-console .matrix-wrap .cell[data-r="1"][data-c="${idx}"]`);
                if (cell) { cell.classList.add("rt-causer"); cell.style.setProperty("--causer", this.colorOf(this.seat));
                  setTimeout(() => { cell.classList.remove("rt-causer"); cell.style.removeProperty("--causer"); }, 2600); }
              }
              juice.hitPause(80);
            } else {
              const pc = document.querySelector(`.pcard[data-seat="${CSS.escape(h.seat)}"]`);
              const photo = pc && pc.querySelector(".bd-photo");
              if (pc) pc.classList.add("rt-lift");
              if (photo) {   // the SIGIL, in the causer's colour, on the badge face
                const sg = el("span", "rt-sigil");
                sg.innerHTML = icon("paradox");
                sg.style.color = col;
                photo.appendChild(sg);
                setTimeout(() => { sg.classList.add("out"); setTimeout(() => sg.remove(), 300); }, this._beat(2200));
              }
            }
            if (h.damage) this.resourceFloat(h.seat, `−${h.damage}`, "danger");
            const t = this._tickLife(h.seat, -(h.damage || 0), "danger");
            await this._sleep(Math.max(t, this._beat(1000)));
            const pc2 = h.seat !== this.seat ? document.querySelector(`.pcard[data-seat="${CSS.escape(h.seat)}"]`) : null;
            if (pc2) pc2.classList.remove("rt-lift");
          }
        } finally {
          document.body.classList.remove("rt-stage");
          document.querySelectorAll(".pcard.rt-lift").forEach((n2) => n2.classList.remove("rt-lift"));
          this._railHide();
        }
        break;
      }
      case "heated": {
        if (document.body.classList.contains("cabin-on") && this.speed !== "fast") {
          this._railShow("heat", 7);
          const pc = document.querySelector(`.pcard[data-seat="${CSS.escape(payload.seat)}"]`);
          const fuse = pc && pc.querySelector(".bd-fuserail");
          const bn = fuse && fuse.querySelector(".bf-n");
          if (pc) pc.classList.add("rt-lift");
          if (fuse) fuse.classList.add("rt-src");
          await this._sleep(this._beat(250));
          if (bn && payload.booms != null) {                 // ONE beat, booms weigh less than life
            bn.textContent = String(payload.booms);
            fx.beat("heat", payload);   // HSSS beside the boiler, on the count
            if (fuse){ fuse.classList.add("bf-hot"); setTimeout(() => fuse.classList.remove("bf-hot"), 900); }
            try { if (window.__pdxTone) window.__pdxTone(170 + payload.booms * 12, .18, .055); } catch (e) {}
            await this._sleep(this._beat(450));
          }
          if (pc) pc.classList.remove("rt-lift");
          if (fuse) fuse.classList.remove("rt-src");
          this._railHide();
        } else fx.beat("heat", payload);
        this.resourceFloat(payload.seat, "heat", "danger"); this.flashPanel(payload.seat, "fx-pulse");
        audio.play("heat"); break;
      }
      case "exploded": if (window.__room) window.__room.beat("danger");
        // (HELA says it from her eye now, comic.js; the old toast would repeat her)
        if (payload.seat === this.seat) this.shake("lg");
        juice.flash("danger", { intensity: 0.55 }); juice.hitPause(120); this.catStartle();
        this.flashPanel(payload.seat, "fx-hit"); audio.play("explode"); break;
      case "traveled": if (window.__room) window.__room.beat("travel");
        if (document.body.classList.contains("cabin-on") && this.speed !== "fast") {
          // CHAPTER: badge lifts -> travel dice read -> the sea carries him ->
          // the CENTURY on his file pops to the new port
          this._railShow("travel", 8);
          const tp = payload.seat !== this.seat ? document.querySelector(`.pcard[data-seat="${CSS.escape(payload.seat)}"]`) : null;
          const tsrc = tp && tp.querySelector(".ba-fn.ba-t");
          if (tp) tp.classList.add("rt-lift");
          if (tsrc) tsrc.classList.add("rt-src");
          await this._sleep(this._beat(380));      // the dice read
          fx.beat("depart", payload);                // WHOOSH (or DOUBLE JUMP) as he sets sail
          await this._sleep(this._beat(500));      // the sea carries him
          if (tp) {
            const cw = tp.querySelector(".cs-where b");
            if (cw) { cw.textContent = `CENTVRY ${roman(payload.to)}`;
              cw.classList.remove("cw-pop"); void cw.offsetWidth; cw.classList.add("cw-pop");
              try { audio.play("place"); } catch (e) {} }
          }
          await this._sleep(this._beat(260));
          if (tp) tp.classList.remove("rt-lift");
          if (tsrc) tsrc.classList.remove("rt-src");
          this._railHide();
        } else fx.beat("depart", payload);
        // an ARMED rival making port in YOUR century narrows her eye, no words
        try {
          const meT = this._self();
          if (meT && payload.seat !== this.seat && payload.to === meT.century) {
            const rv = this.view.travelers.find((x) => x.name === payload.seat);
            if (rv && (rv.equipment || rv.hand || []).length) {
              const ey = document.getElementById("hela-eye");
              if (ey) { ey.classList.add("he-wary"); setTimeout(() => ey.classList.remove("he-wary"), 2600); }
            }
          }
        } catch (e) {}
        // The Sea presents voyages (stroke + whoosh in its fx theater); the ghost
        break;
      case "clean_up":
        await this._sleep(this._ms("clean_up"));   // let the seals be read on the lit screen
        this.cleanUpGenerators();
        break;
      case "overloaded":
        this.flashPanel(payload.seat, "fx-pulse");
        // on your own machine the seal is DRAWN, so you watch the function close, and
        // HELA says what happened; the replay waits until you have read it (help.js)
        if (payload.seat === this.seat) {
          this.showOverload([...(this._ovlShow || []), ...(payload.functions || [])]);
          // the comic OVERLOAD! and SHUT stamp land first (fx.js), then HELA explains
          if (!this._skip && !document.hidden) { try { await fx.overload(payload); } catch (e) {} }
          const told = window.__pdxHelp && window.__pdxHelp.overload(payload.functions, { first: !this._ovlTold });
          if (told && !window.__helaMute) this._ovlTold = true;
          if (told && !this._skip && !document.hidden) await told;
        }
        break;
      case "generator_rolled": this.pushRoll(payload); audio.play("dice"); break;
      case "merchant_moved": if (window.__room) window.__room.beat("travel");
        // Movement = the wagon packs up and rolls along the Timeline, then teleports
        // through time. The whole soundscape (pack -> roll -> teleport) is sequenced
        // inside merchantMove so it tracks the visual journey.
        this.merchantMove(payload.from, payload.to); break;
      case "card_bought": { if (window.__room) window.__room.beat("market");
        if (payload.seat === this.seat && !payload.stolen) {
          const meSelf = this._self();
          const meta = meSelf ? ((meSelf.hand || meSelf.equipment || []).find((c) => c.name === payload.card) || null) : null;
          setTimeout(() => { try { window.__helaShopLook && window.__helaShopLook(meta); } catch (e) {} }, 700);
        }
        // Dual destination: YOUR own acquired card thunks into your Rucksack;
        // everyone else's flies to their status panel (observers have no bag of
        // yours). Green for a purchase, red for a theft (§ Cat-3).
        this.marketCardFx(payload.card);
        const tone = payload.stolen ? "steal" : "buy";
        const mine = payload.seat === this.seat;
        // If our own drag already carried this card into the bag, skip the
        // duplicate server-driven flight (the ghost was the movement).
        const skip = mine && this._skipBuyFlightFor === payload.card;
        if (skip) this._skipBuyFlightFor = null;
        if (!skip) {
          const dest = mine ? this.rucksackRect() : this.panelRect(payload.seat);
          this.flyCard(payload.card, this.marketCardRect(payload.card), dest,
            { tone, spin: "flip", duration: payload.stolen ? 660 : 560,
              onLand: () => {
                if (mine) this._rucksackReceive(tone);
                this.flashPanel(payload.seat, payload.stolen ? "fx-hit" : "fx-pulse");
                fx.bought(payload);   // SOLD! beside the buyer as it lands
              } });
        } else {
          this.flashPanel(payload.seat, payload.stolen ? "fx-hit" : "fx-pulse");
          fx.bought(payload);
        }
        if (payload.stolen) { this.marketOverlay("steal", payload.card); audio.play("wanted"); }
        else { this.marketOverlay("buy", payload.card); audio.play("coin"); }
        break;
      }
      case "card_renewed":
        // Fresh stock rides in from the merchant deck into the wagon.
        // its sound is the card SETTLING in the wagon (onLand), not the event's arrival
        this.flyCard(payload.card, this._deckRect(), this._marketRowRect(),
          { tone: "place", spin: "flip", endScale: 0.9, duration: 600, onLand: () => audio.play("place") });
        this.marketCardFx(payload.card); break;
      case "declared": this.flashPanel(payload.seat, "fx-pulse"); audio.play("coin"); break;
      case "delivered": if (window.__room) window.__room.beat("deliver");
        // Reverent: the artifact arcs from the owner's panel back to its home
        // century on the Timeline and seals into the Temporal Receptor with a
        // golden halo, the "rethink the sacred" beat.
        this.flyCard(payload.card, this.panelRect(payload.seat),
          (window.__seaIslandRect && window.__seaIslandRect(payload.century))
            || this.archPointRect(payload.century) || this._marketRowRect(),
          { tone: "deliver", spin: "flip", endScale: 0.32, duration: 780,
            onLand: () => { audio.play("deliver");   // the seal lands with its sound, not before it
              // and the last timeline mends there, on the same beat (mend.js)
              try { window.__pdxTimelineMend && window.__pdxTimelineMend(payload.century, null, { seat: payload.seat, sound: false }); } catch (e) {}
              this._deliverSeal(payload.century); juice.flash("gold", { intensity: 0.34 }); juice.hitPause(70); this.flashPanel(payload.seat, "fx-pulse");
              fx.delivered(payload); } });   // FILED / RETURNED, after the KA-CHUNK (fx.js)
        this.breakingNews(`RELIC RESTORED AT CENTURY ${roman(payload.century)}`,
          `${payload.seat} lands the ${this.nameEn(payload.card)}, ${this._eraName(payload.century)} takes back its own`,
          { kind: "delivered", name: payload.seat, century: payload.century,
            whole: (() => { try { const st = window.__pdxTimelineState(); return st.mended.length + (st.mended.includes(payload.century) ? 0 : 1); } catch (e) { return null; } })() });
        break;
      case "activation_fizzled": {
        if (payload.seat === this.seat)
          this.helaSay(`The <b>${this.nameEn(payload.card)}</b> found no one within reach, the act dies in the chamber.`, 5200, "note", true);
        break;
      }
      case "activated": {
        if (document.body.classList.contains("cabin-on") && this.speed !== "fast") {
          document.body.classList.add("rt-stage");
          let cardEl3 = null;
          if (payload.seat === this.seat && payload.card)
            cardEl3 = document.querySelector(`#rucksack-zone .card[data-name="${CSS.escape(payload.card)}"]`);
          if (!cardEl3 && payload.seat) cardEl3 = document.querySelector(`.pcard[data-seat="${CSS.escape(payload.seat)}"]`);
          if (cardEl3) cardEl3.classList.add("rt-resolving");
          const holdMs = this._beat(1100);
          setTimeout(() => { document.body.classList.remove("rt-stage");
            if (cardEl3) cardEl3.classList.remove("rt-resolving"); }, holdMs);
          await this._sleep(Math.round(holdMs * .7));
        }
        // A soft confirmation ring blooms over the activator's panel, and
        // flagship cards add their SIGNATURE accent (4c vocabulary).
        // rivals anchor to their sheet; YOUR activation anchors to the case
        const ar = this.panelRect(payload.seat) ||
                   (payload.seat === this.seat ? this.rucksackRect() : null);
        if (ar) this._landRing(ar, "neutral");
        const sig = CARD_FX[payload.card];
        if (sig && ar) juice.signature(ar, sig);
        this.flashPanel(payload.seat, "fx-pulse"); audio.play("confirm"); break;
      }
      case "recycled": {
        if (payload.energy) this.resourceFloat(payload.seat, `+${payload.energy}`, "energy");
        // Sacrilege ON THE FILE: the listed card itself burns red and dissolves
        // where it lives, nobody misses a rival stripping gear again.
        const cab4 = document.body.classList.contains("cabin-on") && this.speed !== "fast";
        const mcEl = document.querySelector(
          `.pcard[data-seat="${CSS.escape(payload.seat)}"] .mc[data-card="${CSS.escape(payload.card)}"]`);
        const rr = mcEl ? mcEl.getBoundingClientRect() : this.panelRect(payload.seat);
        if (cab4 && mcEl) {
          mcEl.classList.add("mc-dissolve");
          const eIco = this.dom.players.querySelector(
            `.pcard[data-seat="${CSS.escape(payload.seat)}"] .bd-life-n`);
          if (rr) this._moteStream(rr, eIco ? eIco.getBoundingClientRect() : rr, "recycle");
        } else if (rr) {
          this._dissolveCard(payload.card, rr, "recycle");
          this._moteStream(rr, rr, "recycle");
        }
        this.flashPanel(payload.seat, "fx-pulse"); audio.play("energy");
        if (cab4) await this._sleep(this._beat(800));   // the loss takes its time
        break;
      }
      case "card_stolen":
        // Agnes's Cauldron snatches a card another traveler recycled (§21): it
        // flies from the victim's panel into the Cauldron-holder's.
        this.flyCard(payload.card, this.panelRect(payload.from) || this.panelRect(payload.seat),
          this.panelRect(payload.seat), { tone: "steal", spin: "flip",
            onLand: () => this.flashPanel(payload.seat, "fx-pulse") });
        if (payload.from) this.flashPanel(payload.from, "fx-hit");
        audio.play("wanted"); break;
      case "card_destroyed": {
        // Chaos II carries a zone; the limbo 'destroyed' variants carry none (no fx).
        if (payload.zone) { juice.flash("danger", { intensity: 0.4 }); juice.hitPause(90); }
        if (payload.zone === "market" || payload.zone === "secret") {
          const mr = this.marketCardRect(payload.card);
          if (mr) this._dissolveCard(payload.card, mr, "destroy");
          this.marketOverlay("destroy", payload.card); audio.play("wanted");
        } else if (payload.zone === "equipment" && payload.owner) {
          const er = this.panelRect(payload.owner);
          if (er) this._dissolveCard(payload.card, er, "destroy");
          this.flashPanel(payload.owner, "fx-hit"); audio.play("terminate");
        }
        break;
      }
      case "cp_earned":
        this.cpToast(payload.seat); this.resourceFloat(payload.seat, "+1 CP", "cp");
        juice.flash("cp", { intensity: 0.3 }); juice.hitPause(60);
        this.flashPanel(payload.seat, "fx-pulse"); audio.play("cp"); break;
      case "milestone": this.flashPanel(payload.seat, "fx-pulse");
        this.breakingNews(`${payload.seat.toUpperCase()} BREACHES CENTURY ${roman(payload.century)}`,
          "a milestone claim (+1 CP), the Merchant raises another sail",
          { kind: "milestone", name: payload.seat, century: payload.century });
        break;
      case "reward_resolved":
        if (document.body.classList.contains("cabin-on") && this.speed !== "fast") {
          document.body.classList.add("rt-stage");
          setTimeout(() => document.body.classList.remove("rt-stage"), this._beat(1200));
        }
        this._signContract(payload);
        this.flashPanel(payload.seat, "fx-pulse");
        if (window.__room) window.__room.beat("reward");
        audio.play("socket", { power: 0.7 });
        break;
      case "wanted":
        // (Soundtrack mood is derived from game state in updateMusicMood.)
        this.wantedPoster(payload.seat); tutorials.show("wanted"); audio.play("wanted");
        if (payload.seat !== this.seat && window.__helaVoice)
          this.helaSay(window.__helaVoice("wanted_other"), 5600);
        this.breakingNews("WARRANT ISSUED",
          `${payload.seat} is declared WANTED: a bounty rides in their wake`,
          { kind: "wanted", name: payload.seat });
        break;
      case "terminated": if (window.__room) window.__room.beat("danger");
        if (payload.seat !== this.seat) { try { window.__helaRite && window.__helaRite(payload.seat); } catch (e) {} }
        if (payload.seat === this.seat) this.shake("md");
        juice.flash("danger", { intensity: 0.5 }); juice.hitPause(140); this.catStartle();
        this.flashPanel(payload.seat, "fx-hit"); audio.play("terminate");
        {
          const tv = this.view && this.view.travelers.find((x) => x.name === payload.seat);
          this.breakingNews("TRAVELER LOST AT SEA",
            `${payload.seat} wrecked${tv ? ` near century ${roman(tv.century)}`: ""}${payload.by ? `, sunk by ${payload.by}`: ""} · the sea keeps the cargo`,
            { kind: "terminated", name: payload.seat, century: tv ? tv.century : null });
        }
        break;
      case "respawned": this.flashPanel(payload.seat, "fx-pulse"); break;
      case "secret_market_opened": {
        // Sequence: the velvet curtain SWEEPS OPEN first; once it's fully open, the card
        // materializes with the purple "calculating" panel.
        this._secretOpening = true; this._secretRevealing = true; this.renderMarket();
        if (window.__room) window.__room.beat("secret");
        juice.flash("paradox", { intensity: 0.42 }); juice.hitPause(110);
        audio.play("phase");
        this.breakingNews("SMUGGLERS' COVE STANDS OPEN",
          `${payload.by ? payload.by + " finds": "found:"} a hidden market at century XI, open to all who reach it`,
          { kind: "secret_market_opened", name: payload.by || "", century: 11 });
        setTimeout(() => { this._secretOpening = false; this.secretRevealFx(); }, 900);
        break;
      }
      case "secret_market_hidden": this.toast("The Secret Market vanishes", "note"); audio.play("place"); break;
      case "briefcase_acquired":
        this.briefcaseFx(payload.seat);
        this.resourceFloat(payload.seat, "+1 slot", "cp");
        this.flashPanel(payload.seat, "fx-pulse"); audio.play("confirm"); break;
      case "game_over": this.gameOver(payload); juice.flash("gold", { intensity: 0.6, dur: 700 }); audio.play("victory"); break;
      case "valve_fed": {
        if (payload && payload.seat) this.resourceFloat(payload.seat, `reactor ${payload.charge}/10`, "energy");
        try { audio.play("place"); } catch (e) {}
        break;
      }
      case "valve_reward": {
        if (payload && payload.seat) this.resourceFloat(payload.seat, "REACTOR FULL", "gold");
        try { audio.play("energy"); } catch (e) {}
        break;
      }
      default: break;
    }
    await this._sleep(this._ms(kind));
  }

  /* ---- animation helpers ---- */
  panelRect(seat) {
    const p = this.dom.players.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"]`);
    return p ? p.getBoundingClientRect() : null;
  }
  flashPanel(seat, cls = "fx-pulse") {
    const p = this.dom.players.querySelector(`.pcard[data-seat="${CSS.escape(seat)}"]`);
    if (!p) return;
    p.classList.remove("fx-pulse", "fx-hit"); void p.offsetWidth; p.classList.add(cls);
  }
  resourceFloat(seat, text, kind) {
    const r = this.panelRect(seat);
    if (!r) return;
    const colors = { energy: "#6fae6a", gold: "#e8b24a", cp: "#f7c168", danger: "#e35949" };
    const f = el("div", "delta-float", text);
    f.style.color = colors[kind] || "#e9e2d2";
    f.style.left = (r.left + r.width / 2 - 16) + "px";
    f.style.top = (r.top + 18) + "px";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), fx.ms(1300));   // its CSS animation stretches with the pace too
  }
  // Temporal Briefcase acquisition, a brief case materialises over the owner's
  // panel and snaps shut (a permanent +1 equipment slot, §24).
  briefcaseFx(seat) {
    const r = this.panelRect(seat);
    if (!r) return;
    const fx = el("div", "briefcase-fx");
    fx.innerHTML = icon("briefcase");
    fx.style.left = (r.left + r.width / 2 - 22) + "px";
    fx.style.top = (r.top + 8) + "px";
    document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 1400 * (({ slow: 1.6, brisk: .8, fast: .6 })[this.speed] || 1));
  }
  // Record a causality roll for the Ledger panel and re-render it.
  pushRoll(payload) {
    this.rolls.unshift({
      label: payload.label || payload.source || "Roll",
      value: payload.value, seat: payload.seat,
      hour: this.view ? this.view.hour : "?",
    });
    if (this.rolls.length > 8) this.rolls.length = 8;
    this.renderLedger();
  }
  renderLedger() {
    const host = document.getElementById("ledger-list");
    if (!host) return;
    host.innerHTML = "";
    if (!this.rolls.length) {
      host.appendChild(el("div", "ledger-empty", "No readings yet."));
      return;
    }
    this.rolls.forEach((r) => {
      const row = el("div", "ledger-row");
      row.innerHTML = `<span class="ldg-h">H${r.hour}</span>`
        + `<span class="ldg-label">${r.label}${r.seat ? ` · ${r.seat}` : ""}</span>`
        + `<span class="ldg-val">${r.value}</span>`;
      host.appendChild(row);
    });
  }
  // The Merchant caravan rides the arch century-by-century, like a traveler,
  // slow enough for everyone to follow, glowing while in motion, a soft bell at
  // each space. Moves the real token so every client sees the same journey.
  merchantMove(from, to) {
    if (from == null || to == null || from === to) return;
    const tok = this.dom.timeline && this.dom.timeline.querySelector(".tl-merchant");
    if (!tok) return;
    const g = this._archGeom();
    const dir = to > from ? 1 : -1;
    const steps = [];
    for (let c = from + dir; dir > 0 ? c <= to : c >= to; c += dir) steps.push(c);
    const STEP_MS = 460 * this._scale();   // one century at a time, honouring Slow/Fast
    // (1) The Merchant HURRIEDLY packs up, crates, coin bags, wares, a strap cinch.
    audio.play("merchant_pack");
    // (2) The laden wagon rolls off, a rumbling cart bed re-triggered so it carries
    //     across long journeys, plus a wheel roll on every century it crosses.
    audio.play("cart");
    const rollMs = steps.length * STEP_MS;
    for (let re = 1800; re < rollMs; re += 1800) setTimeout(() => audio.play("cart"), re);
    // Match the per-step transition to the cadence so each hop reads distinctly.
    tok.style.transition = `left ${STEP_MS}ms cubic-bezier(.45,.05,.35,1), top ${STEP_MS}ms cubic-bezier(.45,.05,.35,1), transform .3s, box-shadow .3s`;
    tok.classList.add("moving");
    steps.forEach((c, i) => {
      setTimeout(() => {
        const p = this._archLocal(c, g);
        tok.style.left = p.x + "px"; tok.style.top = p.y + "px";
        audio.play("merchant_step");   // laden wheel roll per space
      }, i * STEP_MS);
    });
    setTimeout(() => {
      tok.classList.remove("moving");
      tok.style.transition = "";       // restore the default transition
      audio.play("merchant_teleport"); // (3) the temporal teleport on arrival
    }, rollMs + 350);
  }

  // The "market opens" moment, anchored OVER the Market wagon (not screen-centre),
  // played ONLY when THIS traveler gains Merchant access (§ Cat-3 feedback). Two
  // wooden doors sweep open over the wagon with a golden glow; bell + creak/wood.
  marketOpenMoment() {
    if (this.camera && this.camera.scene !== "market") { this._pendingOpenMoment = true; return; }
    const zone = document.getElementById("market-zone");
    if (!zone) return;
    const r = zone.getBoundingClientRect();
    if (!r.width) return;
    const fx = el("div", "market-open-fx");
    fx.style.left = r.left + "px"; fx.style.top = r.top + "px";
    fx.style.width = r.width + "px"; fx.style.height = r.height + "px";
    fx.innerHTML = `<div class="mof-door l"></div><div class="mof-door r"></div><div class="mof-glow"></div>`;
    document.body.appendChild(fx);
    audio.play("creak");
    setTimeout(() => audio.play("wood"), 420);
    setTimeout(() => fx.classList.add("fade"), 1500);
    setTimeout(() => fx.remove(), 2000);
  }

  // A buy/steal indicator anchored over the Market: green for a purchase, red with a
  // warning for a theft (§ Cat-3 feedback).
  marketOverlay(kind, cardName) {
    const zone = document.getElementById("market-zone");
    if (!zone) return;
    const r = zone.getBoundingClientRect();
    if (!r.width) return;
    const o = el("div", "market-overlay " + kind);
    o.style.left = r.left + "px"; o.style.top = r.top + "px";
    o.style.width = r.width + "px"; o.style.height = r.height + "px";
    o.innerHTML = kind === "steal"
      ? `<div class="mo-badge steal">${icon("warn")} <span>STOLEN</span></div>`
      : kind === "destroy"
      ? `<div class="mo-badge destroy">${icon("warn")} <span>DESTROYED</span></div>`
      : `<div class="mo-badge buy">${icon("gold")} <span>PURCHASED</span></div>`;
    document.body.appendChild(o);
    setTimeout(() => o.classList.add("fade"), 850);
    setTimeout(() => o.remove(), 1250);
  }

  // Secret Market discovery, unstable quantum/glitch reveal anchored over the
  // Secret Market bay until reality stabilises (§ Cat-3 feedback).
  secretRevealFx() {
    const bay = this.dom.market && this.dom.market.querySelector(".market-secret");
    const zone = document.getElementById("market-zone");
    const host = bay || zone;
    if (!host) return;
    const r = host.getBoundingClientRect();
    if (!r.width) return;
    const fx = el("div", "secret-reveal-fx");
    fx.style.left = r.left + "px"; fx.style.top = r.top + "px";
    fx.style.width = r.width + "px"; fx.style.height = r.height + "px";
    // HELA breaks the seal: her lock UNLOCKS, dissolves, and becomes the green grid
    // that materialises the Cove. (It used to be an anonymous purple glitch.)
    fx.innerHTML = `<div class="srf-grid"></div>`
      + `<div class="srf-lock">${icon("helalock")}</div>`
      + `<div class="srf-core"><span class="srf-calc">HELA &middot; BREAKING THE SEAL</span>`
      + `<span class="srf-word">COVE OPEN</span></div>`;
    document.body.appendChild(fx);
    audio.play("paradox");
    requestAnimationFrame(() => fx.classList.add("armed"));      // the seal is engaged
    setTimeout(() => fx.classList.add("unlocked"), 900);          // the shackle lifts
    setTimeout(() => fx.classList.add("meshing"), 1500);          // the lock becomes the grid
    // ~3s of unstable "calculating" before reality stabilises and it materialises.
    setTimeout(() => audio.play("dice"), 1100);
    setTimeout(() => audio.play("dice"), 2100);
    setTimeout(() => {
      fx.classList.add("settle"); audio.play("phase");
      // The card materializes exactly as the reveal stabilises (no early overlap).
      this._secretRevealing = false; this.renderMarket();
    }, 3000);
    setTimeout(() => fx.classList.add("fade"), 4200);
    setTimeout(() => fx.remove(), 4700);
  }

  // A glowing ghost token glides along the arch from one century to another.
  paradoxWarning(hits) {
    const flash = el("div", "danger-flash");
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 3000);
    const total = hits.reduce((s, h) => s + (h.damage || 0), 0);
    const mine = hits.find((h) => h.seat === this.seat);
    const dmg = (mine && mine.damage) || total;
    const w = el("div", "paradox-warn");
    w.innerHTML = `<span class="pw-sym">${icon("warn")}</span>`
      + `<span class="pw-label">Paradox</span>`
      + `<span class="pw-sub">−${dmg} energy</span>`;
    // The device's own console owns the alarm: the CRT goes red and reports it.
    const con = document.getElementById("hull-console");
    if (con && document.body.classList.contains("cabin-on")) {
      w.classList.add("pw-crt");
      con.appendChild(w);
      document.body.classList.add("paradox-crt");
      setTimeout(() => document.body.classList.remove("paradox-crt"), 3400);
    } else {
      this.dom.overlay.appendChild(w);   // pre-cabin fallback
    }
    setTimeout(() => w.remove(), 3400);
  }
  // A card glides from the Market toward the receiving traveler's panel.
  marketCardFx(cardName) {
    const card = this.dom.market.querySelector(`.card[data-name="${CSS.escape(cardName)}"]`);
    if (!card) return;
    card.classList.add("fx-bought");
    setTimeout(() => card.classList.remove("fx-bought"), 650);
  }

  /* ===================== CARD-FLIGHT ENGINE (Wave 1) =====================
     One system for every card that moves between zones. A real card face is
     cloned body-level (position:fixed, so it survives a zone re-render mid-
     flight) and flown from a source rect to a destination rect with an arc, a
     3D spin flourish and a spring-y settle, its glow tinted by the movement's
     tone (buy / steal / recycle / deliver / ...). Everything that used to
     teleport a card now flows through here. */

  _reducedMotion() {
    return typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // ---- source / destination rects ----
  marketCardRect(name) {
    const c = this.dom.market.querySelector(`.card[data-name="${CSS.escape(name)}"]`);
    return c ? c.getBoundingClientRect() : null;
  }
  _marketRowRect() {
    const row = this.dom.market && this.dom.market.querySelector(".market-row");
    return row ? row.getBoundingClientRect() : this._deckRect();
  }
  // A neutral origin over the merchant wagon (fresh stock / unknown source).
  _deckRect() {
    const zone = document.getElementById("market-zone");
    const r = zone && zone.getBoundingClientRect();
    if (!r || !r.width) return null;
    return { left: r.left + r.width - 66, top: r.top + 16, width: 52, height: 70,
             right: r.left + r.width - 14, bottom: r.top + 86 };
  }
  // Screen rect of a century on the Timeline arch (delivery destinations).
  archPointRect(century) {
    const rail = this.dom.timeline, r = rail && rail.getBoundingClientRect();
    if (!r || !r.width) return null;
    const p = this._archLocal(century, this._archGeom());
    const f = window.__pdxFit || 1;   // p is plane-local px (from clientWidth geom); scale into the viewport rect
    const px = p.x * f, py = p.y * f;
    return { left: r.left + px - 16, top: r.top + py - 22, width: 32, height: 44,
             right: r.left + px + 16, bottom: r.top + py + 22 };
  }
  // The Rucksack zone rect, drop target for drag-to-acquire and the tactile
  // landing spot for your own bought/stolen cards.
  rucksackRect() {
    const z = document.getElementById("rucksack-zone");
    return z ? z.getBoundingClientRect() : null;
  }

  // Look up a card's full data in the current view so a flight can show its real
  // face even when the event carries only the card's name.
  _findCard(name) {
    const v = this.view;
    if (!v || !name) return null;
    const pools = [v.market_revealed || []];
    (v.travelers || []).forEach((t) => pools.push(t.equipment || t.hand || [], t.receptor_cards || []));
    for (const pool of pools) { const f = pool.find((c) => c && c.name === name); if (f) return f; }
    return null;
  }
  _cardFace(card) {
    const data = (card && typeof card === "object" && "gold_cost" in card)
      ? card : this._findCard(typeof card === "string" ? card : (card && card.name));
    if (data) {
      const c = this.cardEl(data);
      // A flying clone is inert: drop interactive + tilt so it never re-tilts or
      // captures hover mid-flight (the wrapper owns the transform).
      c.classList.remove("is-actionable", "can-buy", "can-renew", "can-steal", "can-destroy", "can-select", "tilt");
      return c;
    }
    const name = typeof card === "string" ? card : (card && card.name);
    const face = el("div", "card mini");
    face.innerHTML = `<div class="card-name">${this.nameEn(name) || name || "Card"}</div>`;
    return face;
  }

  // Fly a card from one rect to another. Returns a Promise resolved on landing.
  flyCard(card, from, to, opts = {}) {
    // A missing rect must never swallow the CONSEQUENCE. If a panel is mid-re-key, or a
    // traveller was terminated and their .pcard is gone, panelRect() returns null, and
    // this used to return without ever calling onLand, silently eating the delivery seal
    // and the rucksack receive. The flight is decoration; onLand is the game.
    if (!from || !to) { if (opts.onLand) opts.onLand(); return Promise.resolve(); }
    const tone = opts.tone || "neutral";
    if (this._reducedMotion()) { this._landRing(to, tone); if (opts.onLand) opts.onLand(); return Promise.resolve(); }
    const wrap = el("div", "card-fly tone-" + tone);
    wrap.appendChild(this._cardFace(card));
    wrap.appendChild(el("div", "cf-trail"));
    document.body.appendChild(wrap);
    const w = from.width || 132, h = from.height || 96;
    wrap.style.width = w + "px"; wrap.style.height = h + "px";
    wrap.style.left = from.left + "px"; wrap.style.top = from.top + "px";
    // Deltas from the source's centre to the destination's centre (scale is about
    // the element centre, so the centre lands exactly on target).
    const dx = (to.left + (to.width || 0) / 2) - (from.left + w / 2);
    const dy = (to.top + (to.height || 0) / 2) - (from.top + h / 2);
    const loft = Math.min(130, 42 + Math.hypot(dx, dy) * 0.16) * (opts.arc == null ? 1 : opts.arc);
    const endScale = opts.endScale != null ? opts.endScale : 0.58;
    const flip = opts.spin === "flip";
    const fadeEnd = opts.fade === false ? 1 : 0.05;
    const P = "perspective(760px)";
    const ry = (deg) => flip ? ` rotateY(${deg}deg)` : "";
    const anim = wrap.animate([
      { transform: `${P} translate(0px,0px) scale(1)${ry(0)}`, opacity: 1, offset: 0 },
      { transform: `${P} translate(${dx * 0.5}px,${dy * 0.5 - loft}px) scale(${(1 + endScale) / 2})${ry(180)}`, opacity: 1, offset: 0.55 },
      { transform: `${P} translate(${dx * 0.98}px,${dy * 0.98}px) scale(${endScale * 1.08})${ry(330)}`, opacity: 1, offset: 0.86 },
      { transform: `${P} translate(${dx}px,${dy}px) scale(${endScale})${ry(360)}`, opacity: fadeEnd, offset: 1 },
    ], { duration: (opts.duration || 600) * this._motion(), easing: "cubic-bezier(.33,0,.2,1)", fill: "forwards" });
    return new Promise((resolve) => {
      anim.onfinish = () => {
        this._landRing(to, tone);
        if (opts.onLand) opts.onLand();
        wrap.remove(); resolve();
      };
    });
  }

  // Rise-and-shatter for cards that leave play in place (recycle / destroy).
  _dissolveCard(card, from, tone) {
    const cx = from.left + (from.width || 132) / 2, cy = from.top + (from.height || 96) / 2;
    if (this._reducedMotion()) { this._landRing(from, tone); this._sparkBurst(cx, cy, tone); return; }
    const wrap = el("div", "card-fly tone-" + tone);
    wrap.appendChild(this._cardFace(card));
    document.body.appendChild(wrap);
    const w = from.width || 132, h = from.height || 96;
    wrap.style.width = w + "px"; wrap.style.height = h + "px";
    wrap.style.left = from.left + "px"; wrap.style.top = from.top + "px";
    const anim = wrap.animate([
      { transform: "translateY(0) scale(1) rotateZ(0deg)", opacity: 1, offset: 0 },
      { transform: "translateY(-16px) scale(1.06) rotateZ(-3deg)", opacity: 1, offset: 0.3 },
      { transform: "translateY(-52px) scale(.58) rotateZ(7deg)", opacity: 0, offset: 1 },
    ], { duration: 560 * this._motion(), easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    this._sparkBurst(cx, cy, tone);
    anim.onfinish = () => wrap.remove();
  }

  // A radial burst of embers/energy motes at a point (dissolves & landings).
  _sparkBurst(cx, cy, tone) {
    if (this._reducedMotion()) return;
    const palette = tone === "destroy" ? ["#e35949", "#f2a93b", "#8a1c12"]
      : tone === "recycle" ? ["#6fae6a", "#a9e0a0", "#e0972b"]
      : ["#f7c168", "#e8b24a"];
    const N = 11;
    for (let i = 0; i < N; i++) {
      const s = el("div", "card-spark");
      const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5;
      const d = 26 + Math.random() * 36;
      const col = palette[i % palette.length];
      s.style.left = cx + "px"; s.style.top = cy + "px";
      s.style.background = col; s.style.boxShadow = "0 0 8px " + col;
      document.body.appendChild(s);
      s.animate([
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(.2)`, opacity: 0 },
      ], { duration: (420 + Math.random() * 260) * this._motion(), easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" })
        .onfinish = () => s.remove();
    }
  }

  // An expanding ring pulse at a flight's destination, the "it landed" beat.
  _landRing(rect, tone) {
    if (!rect) return;
    const ring = el("div", "card-land tone-" + (tone || "neutral"));
    ring.style.left = (rect.left + (rect.width || 0) / 2) + "px";
    ring.style.top = (rect.top + (rect.height || 0) / 2) + "px";
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 660);
  }

  // Reverent delivery: a golden halo + sunburst seals over the century on the
  // arch as the artifact returns to its home time (the "sacred" beat).
  _deliverSeal(century) {
    const rect = this.archPointRect(century);
    if (!rect || this._reducedMotion()) return;
    const seal = el("div", "deliver-seal");
    seal.style.left = (rect.left + rect.width / 2) + "px";
    seal.style.top = (rect.top + rect.height / 2) + "px";
    seal.innerHTML = `<span class="ds-halo"></span><span class="ds-ring"></span>`
      + `<span class="ds-glyph">${icon("clock")}</span>`;
    document.body.appendChild(seal);
    setTimeout(() => seal.remove(), 1600);
  }

  // A directed stream of motes from a rect to a target rect, recycling streams
  // the card's essence into your energy (burning history for fuel: sacrilege).
  _moteStream(from, to, tone) {
    if (this._reducedMotion() || !from || !to) return;
    const fx = from.left + (from.width || 0) / 2, fy = from.top + (from.height || 0) / 2;
    const tx = to.left + (to.width || 0) / 2, ty = to.top + (to.height || 0) / 2;
    const col = tone === "recycle" ? "#a9e0a0" : "#f7c168";
    for (let i = 0; i < 8; i++) {
      const s = el("div", "card-spark");
      const jx = (Math.random() - 0.5) * 30;
      s.style.left = fx + "px"; s.style.top = fy + "px";
      s.style.background = col; s.style.boxShadow = "0 0 8px " + col;
      document.body.appendChild(s);
      s.animate([
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate(calc(-50% + ${jx}px), calc(-50% - 22px)) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${tx - fx}px), calc(-50% + ${ty - fy}px)) scale(.2)`, opacity: 0, offset: 1 },
      ], { duration: (540 + Math.random() * 260) * this._motion(), easing: "cubic-bezier(.4,0,.5,1)",
           fill: "forwards", delay: i * 30 }).onfinish = () => s.remove();
    }
  }

  // Camera kick (Wave 2): a brief shake of the whole board on impact, reserved
  // for what happens to the LOCAL traveler (your own pain kicks your camera).
  // Body-level overlays (flights, floats) are unaffected. Honours reduced-motion.
  shake(level = "md") {
    if (this._reducedMotion()) return;
    // THE FREEZE, SOLVED: animating transform+rotate on .game-grid promoted and
    // re-rasterized the ENTIRE game as one giant layer (~900ms Commit on every die).
    // In the cabin your pain kicks the HELMET instead, small layers, POV-correct.
    const cab = document.body.classList.contains("cabin-on");
    const el2 = cab ? document.getElementById("hull") : document.querySelector(".game-grid");
    if (!el2) return;
    el2.classList.remove("shake-sm", "shake-md", "shake-lg");
    void el2.offsetWidth;                          // restart the animation
    el2.classList.add("shake-" + level);
    const dur = level === "lg" ? 540 : level === "sm" ? 260 : 380;
    setTimeout(() => el2.classList.remove("shake-" + level), dur);
  }

  /* ===================== DRAG-TO-ACQUIRE (Wave 1) =======================
     The hero interaction: pinch a Market card and haul it down into your
     Rucksack, buy (green) or steal (red). A body-level 3D clone follows the
     cursor with velocity-based inertia; the Rucksack lights up as the drop
     target; releasing elsewhere springs the card back. Click stays as a
     fallback (bots/accessibility), both fire the SAME commit. */
  _wireCardDrag(node, card, commit, tone) {
    node.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || this._reducedMotion()) return;   // left button; DnD is motion
      if (e.target.closest("button")) return;                // inner buttons win
      const start = { x: e.clientX, y: e.clientY };
      const srcRect = node.getBoundingClientRect();
      let dragging = false, ghost = null, lastX = start.x;
      const onMove = (ev) => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!dragging) {
          if (Math.hypot(dx, dy) < 7) return;                // threshold: tap vs drag
          dragging = true; this._dragActive = true;
          node.classList.add("drag-source");
          ghost = this._makeDragGhost(card, tone, srcRect);
          audio.play("lift");
          this._armDropTarget(tone);
          // room: the hand pulls the card OUT of the window and DOWN toward
          // the desk, the head follows, so the case arrives under the pointer.
          if (window.__room && node.closest("#market-zone") && this.camera)
            this.camera.setScene("main");
          try { node.setPointerCapture(ev.pointerId); } catch (_) {}
        }
        const vX = ev.clientX - lastX; lastX = ev.clientX;
        this._moveDragGhost(ghost, ev.clientX, ev.clientY, vX);
        this._hotDropTarget(ev.clientX, ev.clientY);
      };
      const onUp = (ev) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (!dragging) return;                                // a tap -> native click fires
        node.classList.remove("drag-source");
        this._dragActive = false;
        this._dragJustEnded = true;
        setTimeout(() => { this._dragJustEnded = false; }, 80);  // swallow the trailing click
        const overRuck = this._pointInRect(ev.clientX, ev.clientY, this.rucksackRect());
        this._disarmDropTargets();
        if (overRuck) {
          // The ghost itself carries the card into the bag; suppress the duplicate
          // server-driven flight for our own card so it never arrives twice.
          this._skipBuyFlightFor = card.name;
          setTimeout(() => { if (this._skipBuyFlightFor === card.name) this._skipBuyFlightFor = null; }, 1600);
          commit();
          audio.play("place"); juice.hitPause(55);
          this._dropGhostInto(ghost, tone);
        } else {
          audio.play("whiff");
          this._springGhostBack(ghost, srcRect);
          // the hand returns the card to the window; the head follows back up
          if (window.__room && node.closest("#market-zone") && this.camera)
            this.camera.setScene("market");
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  _makeDragGhost(card, tone, srcRect) {
    const wrap = el("div", "card-drag tone-" + tone);
    wrap.appendChild(this._cardFace(card));
    document.body.appendChild(wrap);
    const w = srcRect.width || 132, h = srcRect.height || 96;
    wrap.style.width = w + "px"; wrap.style.height = h + "px";
    const g = { el: wrap, w, h };
    this._moveDragGhost(g, srcRect.left + w / 2, srcRect.top + 20, 0);
    return g;
  }
  // The held card follows the cursor (pinched near its top) and leans into the
  // drag with velocity-based inertia, weight you can feel.
  _moveDragGhost(g, x, y, vX) {
    if (!g) return;
    const rot = Math.max(-15, Math.min(15, (vX || 0) * 0.7));
    g.el.style.left = (x - g.w / 2) + "px";
    g.el.style.top = (y - 20) + "px";
    g.el.style.transform = `perspective(760px) rotateZ(${rot}deg) rotateY(${rot * 0.5}deg) scale(1.06)`;
  }
  _armDropTarget(tone) {
    const z = document.getElementById("rucksack-zone");
    if (!z) return;
    z.classList.add("drop-target", "drop-" + tone);
    z.dataset.dropLabel = tone === "steal" ? "STEAL INTO PACK" : "DROP TO BUY";
  }
  _hotDropTarget(x, y) {
    const z = document.getElementById("rucksack-zone");
    if (z) z.classList.toggle("drop-hot", this._pointInRect(x, y, this.rucksackRect()));
  }
  _disarmDropTargets() {
    const z = document.getElementById("rucksack-zone");
    if (!z) return;
    z.classList.remove("drop-target", "drop-hot", "drop-buy", "drop-steal");
    delete z.dataset.dropLabel;
  }
  _pointInRect(x, y, r) {
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  // Release over the Rucksack -> the card dives into the bag mouth.
  _dropGhostInto(g, tone) {
    this._rucksackReceive(tone);
    if (!g) return;
    const r = this.rucksackRect();
    const gx = parseFloat(g.el.style.left), gy = parseFloat(g.el.style.top);
    const cx = r ? r.left + r.width / 2 : gx + g.w / 2;
    const cy = r ? r.top + r.height / 2 : gy + g.h / 2;
    const dx = cx - (gx + g.w / 2), dy = cy - (gy + g.h / 2);
    const anim = g.el.animate([
      { transform: "translate(0px,0px) scale(1.06)", opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: 0 },
    ], { duration: 240 * this._motion(), easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    anim.onfinish = () => g.el.remove();
  }
  // Release elsewhere -> the card springs back to its Market slot.
  _springGhostBack(g, srcRect) {
    if (!g) return;
    const dx = srcRect.left - parseFloat(g.el.style.left);
    const dy = srcRect.top - parseFloat(g.el.style.top);
    const anim = g.el.animate([
      { transform: "translate(0px,0px) scale(1.06)", opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(1)`, opacity: 0.85 },
    ], { duration: 300 * this._motion(), easing: "cubic-bezier(.34,1.2,.5,1)", fill: "forwards" });
    anim.onfinish = () => g.el.remove();
  }
  // The bag receives a card: a settling "thunk" (straps jiggle) + a dust puff.
  _rucksackReceive(tone) {
    const z = document.getElementById("rucksack-zone");
    if (!z) return;
    z.classList.remove("receive"); void z.offsetWidth; z.classList.add("receive");
    setTimeout(() => z.classList.remove("receive"), 520);
    if (this._reducedMotion()) return;
    const r = z.getBoundingClientRect();
    this._sparkBurst(r.left + r.width / 2, r.top + 26, tone === "steal" ? "destroy" : "neutral");
  }

  banner(phaseKey, customText) {
    // PHASE THEATER: fast hours used to stack banners into an illegible pile.
    // One at a time, always, a skipped phase still gets its beat, briefer.
    const names = { delivery: "Delivery", market: "Market", main: "Causality Generators",
      activation: "Item Activation", secret: "Secret Market", leilao: "Auction" };
    const text = customText || names[phaseKey] || phaseKey;
    this._bannerQ = this._bannerQ || [];
    this._bannerQ.push(text);
    if (this._bannerQ.length > 3) this._bannerQ.splice(0, this._bannerQ.length - 3);
    if (!this._bannerOn) this._nextBanner();
  }
  _nextBanner() {
    const text = this._bannerQ && this._bannerQ.shift();
    if (!text) { this._bannerOn = false; return; }
    this._bannerOn = true;
    const rush = this._bannerQ.length > 0;                     // more waiting? play this one brisker
    const b = el("div", "phase-banner", `${text}<span class="b-sub">Hour ${this.view ? this.view.hour : ""}</span>`);
    this.dom.overlay.appendChild(b);
    /* The phase banner is the only sign the turn has moved on. At 1.6s, fade
       included, it left barely a second of readable text and queued banners ran
       over each other. 2.3s is time to read one word in capitals and take in that
       it changed. */
    const hold = rush ? 1400 : 2300;
    setTimeout(() => { b.classList.add("pb-out"); }, hold - 240);
    setTimeout(() => { b.remove(); this._nextBanner(); }, hold);
  }
  // World events have no floating source either, HELA reports them, in her voice.
  toast(text, tone = "") { this.helaSay(text, 3600, tone); }
  cpToast(seat) {
    if (seat !== this.seat) return;            // rivals: the floating numeral is enough
    const me = this._self();
    const n = me ? me.contract_points : null;
    this.helaSay(`Contract point secured${n != null ? `, <b>${n}</b> on record`: ""}.`, 3600, "good");
  }
  // The Wanted poster is nailed up over the TIMELINE (its home), with a brief
  // Old-West sepia wash sweeping across the arch (§ Cat-3 feedback).
  _eraName(c) {
    const e = ERAS.find(([a, b]) => c >= a && c <= b);
    const full = { "Antiquity": "Antiquity", "High M.A.": "the High Middle Ages",
      "Low M.A.": "the Low Middle Ages", "Modern": "the Modern era",
      "Contemp.": "the Contemporary era", "Timeless": "the Timeless Reaches" };
    return e ? (full[e[2]] || e[2]) : "unknown waters";
  }
  // A front page for the moments that matter: slides in (never blocks input),
  // then lives on as a STARRED log line whose hover re-reads the edition.
  // A woodcut engraving for the edition, matched to the event.
  _woodcut(kind) {
    const F = `fill="#241c10"`, S = `stroke="#241c10"`;
    switch (kind) {
      case "delivered": return `<circle cx="30" cy="30" r="17" fill="none" ${S} stroke-width="1.6"/>
        <circle cx="30" cy="30" r="11" fill="none" ${S} stroke-width="1"/>
        <path d="M30 13 V30 L41 36" fill="none" ${S} stroke-width="2" stroke-linecap="round"/>
        <path d="M30 8 l3 5 h-6 z M30 52 l3 -5 h-6 z M8 30 l5 3 v-6 z M52 30 l-5 3 v-6 z" ${F}/>
        ${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<line x1="${30+Math.cos(a)*19}" y1="${30+Math.sin(a)*19}" x2="${30+Math.cos(a)*22}" y2="${30+Math.sin(a)*22}" ${S} stroke-width="1"/>`}).join("")}`;
      case "terminated": return `<path d="M12 40 Q30 48 48 40 L44 46 Q30 52 16 46 Z" ${F}/>
        <path d="M30 40 V16 M30 16 L44 22 L30 27" fill="none" ${S} stroke-width="2"/>
        <path d="M8 44 q6 3 11 1 M41 45 q6 2 11 -1" fill="none" ${S} stroke-width="1.4" opacity=".6"/>
        <path d="M20 12 l3 4 M40 12 l-3 4" ${S} stroke-width="1.5"/>`;
      case "milestone": return `<path d="M24 48 L27 20 H33 L36 48 Z" ${F}/>
        <rect x="26" y="12" width="8" height="7" rx="1" fill="none" ${S} stroke-width="1.6"/>
        <path d="M25 15 L10 10 M35 15 L50 10" ${S} stroke-width="1.6"/>
        <circle cx="30" cy="15.5" r="2" ${F}/><path d="M14 48 H46" ${S} stroke-width="1.5"/>`;
      case "wanted": return `<rect x="15" y="10" width="30" height="40" fill="none" ${S} stroke-width="1.6"/>
        <circle cx="30" cy="26" r="8" fill="none" ${S} stroke-width="1.4"/><path d="M22 44 Q30 36 38 44" fill="none" ${S} stroke-width="1.4"/>
        <path d="M18 14 H42 M18 47 H42" ${S} stroke-width="1"/>`;
      case "secret_market_opened": return `<path d="M16 44 L16 28 Q30 20 44 28 L44 44 Z" fill="none" ${S} stroke-width="1.6"/>
        <path d="M16 28 Q30 20 44 28" fill="none" ${S} stroke-width="1.4"/><path d="M30 22 V44" ${S} stroke-width="1"/>
        <circle cx="30" cy="12" r="4" fill="none" ${S} stroke-width="1.4"/><path d="M30 16 V20" ${S} stroke-width="1.4"/>`;
      default: return `<circle cx="30" cy="30" r="16" fill="none" ${S} stroke-width="1.6"/><path d="M30 14 V30 L40 38" fill="none" ${S} stroke-width="2"/>`;
    }
  }
  _editionHtml(headline, sub, kind, body) {
    // the WARRANT is still NEWS, the Herald reports it, and the bounty bill
    // itself arrives nailed over the paper's corner (journal + plate)
    if (kind === "wanted") return `<div class="bn-duo">${this._heraldEdition(headline, sub, kind, body)}${this._wantedEdition(headline, sub, body)}</div>`;
    return this._heraldEdition(headline, sub, kind, body);
  }
  _heraldEdition(headline, sub, kind, body) {
    const hour = this.view ? this.view.hour: "--";
    return `
      <div class="bn-paper">
        <div class="bn-extra">EXTRA</div>
        <div class="bn-nameplate">
          <span class="bn-ear">EST.<br>YEAR 0</span>
          <span class="bn-mast">The Temporal Herald</span>
          <span class="bn-ear bn-ear-r">FID.<br>BONDED</span>
        </div>
        <div class="bn-rule"></div>
        <div class="bn-submast"><span>C.R.O.N.O.S. BUREAU ORGAN</span><span>HOUR ${hour} · TUE 31 DEC 2999</span><span>PRICE: 2 BITS</span></div>
        <div class="bn-body">
          <div class="bn-cut"><svg viewBox="0 0 60 60">${this._woodcut(kind)}</svg><div class="bn-cutcap">WIREPHOTO</div></div>
          <div class="bn-col">
            <div class="bn-kick">BY CHRONOMETRIC WIRE &middot; FILED THIS HOUR</div>
            <div class="bn-head">${headline}</div>
            ${sub ? `<div class="bn-deck">${sub}</div>` : ""}
            <div class="bn-story"><span class="bn-drop">${body.charAt(0)}</span>${body.slice(1)}</div>
          </div>
        </div>
        <div class="bn-foot">✦ &nbsp; BY WIRE FROM THE OPERATIONS DESK &nbsp; ✦</div>
      </div>`;
  }
  // The WANTED dispatch is not a newspaper, it is a frontier bounty bill, nailed to
  // the board. Woodtype, kraft paper, DEAD OR ALIVE, a stamped Bureau seal.
  _wantedEdition(headline, sub, body) {
    return `
      <div class="bn-paper bn-wanted">
        <span class="bw-nail"></span>
        <div class="bw-agency">C.R.O.N.O.S. &middot; TEMPORAL ENFORCEMENT DIVISION</div>
        <div class="bw-word">WANTED</div>
        <div class="bw-doa">-&nbsp; DEAD OR ALIVE &nbsp;-</div>
        <div class="bw-mug"><svg viewBox="0 0 60 60">${this._woodcut("wanted")}</svg></div>
        <div class="bw-for">${sub || headline}</div>
        <div class="bw-charge">for crimes against the established timeline</div>
        <div class="bw-bounty"><span>REWARD</span><b>4&nbsp;GOLD</b></div>
        <div class="bw-notice">${body}</div>
        <div class="bw-seal">${icon("wanted")}</div>
      </div>`;
  }

  breakingNews(headline, sub, opts) {
    opts = opts || {};
    const kind = opts.kind || "";
    // THE PRESS BANK, the writers' merged cut. Two editions per kind; the print
    // room alternates them. {NAME}/{CENTURY} are set at press time.
    const PRESS = {
      delivered: [
        { head: "LOST RELIC COMES HOME AT LAST", sub: "Century {CENTURY} recovers what time misplaced; bells said to ring unprompted.",
          body: "The traveler {NAME} has delivered a relic to Century {CENTURY}, its rightful hour, after an absence no calendar could measure. Witnesses describe the object as 'warm, as though lately held.' The Bureau confirms the century now weighs what it ought. Historians wept; the customs officer merely stamped." },
        { head: "CENTURY {CENTURY} MADE WHOLE", sub: "A stolen hour restored by the steady hand of {NAME}.",
          body: "What the smugglers carried off, {NAME} has carried back, and the century breathes easier for it. Witnesses report the air itself sat straighter the moment the seal took. The mayor of the era has proposed a statue; the Bureau has proposed he mind his ledgers. Either way, the charts hold tonight." }],
      milestone: [
        { head: "MILESTONE OR MIRAGE? CENTURY {CENTURY} CLAIMED", sub: "Wager houses suspend all bets pending the Bureau's verdict.",
          body: "Word reaches this desk that {NAME} has planted a claim upon Century {CENTURY} itself. Half the academy calls it forgery; the other half calls it Tuesday. The Bureau has stamped the ledger, and the ledger, unlike historians, has never once changed its mind." },
        { head: "THE FAR CENTURY ANSWERS A KNOCK", sub: "Milestone claimed at Century {CENTURY}; the Academy demands a recount.",
          body: "Word arrives that {NAME} has breached Century {CENTURY} and lived to log it. Scholars dispute the hour, the heading, and in one case the existence of the traveler. Yet the lighthouse keeper signalled the crossing, and lighthouse keepers do not read for pleasure. One coin of standing has been paid out, grudgingly." }],
      wanted: [
        { head: "WANTED: {NAME}, DEAD OR ALIVE", sub: "Reward payable in any century. No questions asked in most.",
          body: "Be it known that {NAME} stands accused of crimes against the proper order of hours, last seen crossing between centuries with intent. The Bureau will pay handsomely for delivery in any condition, though it has expressed a quiet preference. Approach with caution: the accused has died before and did not care for it." },
        { head: "FOUR GOLD ON THE HEAD OF {NAME}", sub: "BY ORDER OF THE BUREAU: TAKE THEM OFF THE WATER",
          body: "This bill is posted on every quay from the first century to the last. The fugitive sails armed, desperate, and behind on paperwork. The bounty stands until the name is struck or the sea strikes it first. Collectors are advised the Bureau pays for results, not stories." }],
      terminated: [
        { head: "LOST UPON THE SEA OF TIME", sub: "{NAME}, traveler, of no fixed century, unmade, and accounted for.",
          body: "The Bureau regrets to report that {NAME} has been terminated and stricken from every hour. No grave will hold what no year remembers. Those who knew the traveler are advised that this feeling will pass, along with the knowing. The archive alone keeps what the sea returns." },
        { head: "OBITUARY: A THREAD CUT SHORT", sub: "The Bureau closes the file on {NAME}.",
          body: "In accordance with regulation, the life and voyages of {NAME} have been folded, stamped, and shelved. Those who knew the deceased describe a traveler of ambition; the ledger describes an outstanding balance. No service will be held, the sea having conducted its own. The file, we are assured, is in excellent hands." }],
      secret_market_opened: [
        { head: "SMUGGLERS' COVE OPENS ITS SHUTTERS", sub: "Contraband hours, unstamped relics, and no receipts asked nor given.",
          body: "By lantern and by rumor, the secret market trades again. Witnesses describe wares no century will admit to missing. Respectable citizens are warned to stay away, and were first in the queue. This paper condemns the cove entirely and will be there by eight." },
        { head: "THE MARKET THAT ISN'T THERE IS OPEN", sub: "A quiet cove, a quiet lamp, and prices best paid quietly.",
          body: "Officially, no such harbour exists; officially, this paper never said otherwise. Yet lantern-light was seen where the survey prints only water, and lantern-light does not lie for free. Those who found the way describe wares that should have stayed lost. The Bureau's only comment was to double the night patrol, elsewhere." }],
    };
    this._pressRun = this._pressRun || {};
    const run = PRESS[kind];
    const fill = (t) => String(t || "")
      .replace(/\{NAME\}/g, esc(opts.name || "the traveler"))
      .replace(/\{CENTURY\}/g, opts.century != null ? roman(opts.century): "--");
    let body = "The survey office issues a bulletin to all travellers upon the sea of time.";
    if (run){
      const i = (this._pressRun[kind] = ((this._pressRun[kind] || 0) + 1)) % run.length;
      const ed = run[i];
      body = fill(ed.body);
      headline = fill(ed.head);          // the print room writes better heads than the wire
      sub = fill(ed.sub);
      // the last timeline's count rides the headline (the rail gauge is retired, mend.js)
      if (kind === "delivered" && opts.whole) sub += ` The last timeline stands ${opts.whole} of 30 centuries whole.`;
    }
    // HELA does not hand you a paper, she RETRIEVES it and reads it onto your visor.
    // Her voice: Norse Hel in a Bureau uniform, dry and hungry for the dying.
    const HELA_LINES = {
      delivered: "Another relic nailed into its coffin of time. Tidy. The dead do love their paperwork.",
      terminated: "One name struck from the living ledger. I felt them go,  a small, warm snap. Carry on, traveller.",
      milestone: "The bell tolls and the Merchant scents coin. That is a fin circling, if you were wondering.",
      wanted: "A price on a skull,  my favourite arithmetic. Run or stand still; either amuses me.",
      secret_market_opened: "A lantern where the charts refuse to look. The desperate deal there. You will fit right in.",
    };
    const say = HELA_LINES[kind] || "The Bureau wired a bulletin. I pulled it before the ink was dry.";
    const hour = this.view ? this.view.hour: ", ";
    // the subject of the story, in their colour, over the page: who, and what they did
    const WHAT = { wanted: "branded a thief: 4 gold bounty", terminated: "terminated, pulled back to XXX",
      delivered: "returned a relic: the timeline mends", milestone: "reached a milestone",
      secret_market_opened: "opened the sealed vault" };
    const who = opts.name ? `<div class="bn-who" style="--seat:${this.colorOf(opts.name)}"><b>${esc(opts.name)}</b><span>${WHAT[kind] || ""}</span></div>` : "";
    const item = { hour, kind, headline, sub, say, html: who + this._editionHtml(headline, sub, kind, body) };
    try { window.__helaFileNews && window.__helaFileNews(item); } catch (e) {}
    audio.play("chart_stamp"); setTimeout(() => audio.play("chart_bell", { warm: true }), 160);
    if (this.shake) this.shake("sm");
    // the log entry is her filed cutting, click it to reopen the archive
    const row = this.dom.log.lastElementChild;
    if (row && !row.classList.contains("log-breaking")) {
      row.classList.add("log-breaking"); row.style.cursor = "pointer";
      const star = document.createElement("span");
      star.className = "log-star";
      star.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 .8 L7.5 4.2 L11.2 4.6 L8.4 7 L9.2 10.7 L6 8.8 L2.8 10.7 L3.6 7 L.8 4.6 L4.5 4.2 Z" fill="#c9a45c" stroke="#5a4526" stroke-width=".7"/></svg>`;
      row.insertBefore(star, row.firstChild);
      row.addEventListener("click", () => { try { window.__helaOpenArchive && window.__helaOpenArchive(); } catch (e) {} });
    }
  }
  wantedPoster(seat) {
    const tl = this.dom.timeline;
    const r = tl && tl.getBoundingClientRect();
    const p = el("div", "wanted-poster");
    p.innerHTML = `
      <div class="wp-top">C.R.O.N.O.S.</div>
      <div class="wp-word">WANTED</div>
      <div class="wp-name">${esc(seat)}</div>
      <div class="wp-bounty">BOUNTY · 4 GOLD</div>
      <div class="wanted-stamp">${icon("wanted")}</div>`;
    if (r && r.width) {
      p.classList.add("anchored");
      p.style.left = (r.left + r.width / 2) + "px";
      p.style.top = (r.top + r.height * 0.46) + "px";
      const wash = el("div", "wanted-wash");
      wash.style.left = r.left + "px"; wash.style.top = r.top + "px";
      wash.style.width = r.width + "px"; wash.style.height = r.height + "px";
      document.body.appendChild(wash);
      setTimeout(() => wash.remove(), 2800);
    }
    this.dom.overlay.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }

  gameOver(payload) {
    const cab = document.body.classList.contains("cabin-on");
    // The service record writes itself: the match is over, so it goes into this
    // machine's history (once only, even when HELA's ending ritual re-enters here).
    if (!this._recorded) {
      this._recorded = true;
      try {
        const me = this._self() || {};
        profile.record({
          won: payload && payload.winner === this.seat,
          winner: payload && payload.winner,
          players: (this.view && this.view.travelers || []).map((t) => t.name),
          hours: (this.view && this.view.hour) || 0,
          cp: me.contract_points || 0,
          reason: payload && payload.reason,
        });
      } catch (e) {}
    }
    if (window.__helaVoice && window.__helaSay) {
      const won = payload && payload.winner === this.seat;
      window.__helaSay(window.__helaVoice(won ? "game_win" : "game_loss"), { ms: 9000 });
    }
    if (cab && !payload.__delayed) {
      // HER RITE COMES FIRST: she ARCHIVES the whole match, the hours align as a
      // timeline, the winner is stamped, and only then does the bureau file it.
      try { window.__helaFinale && window.__helaFinale(payload.winner); } catch (e) {}
      setTimeout(() => this.gameOver({ ...payload, __delayed: true }), 4600);
      return;
    }
    const o = el("div", "gameover");
    const scores = Object.entries(payload.scores).sort((a, b) => b[1] - a[1]);
    const rows = scores.map(([n, s]) =>
      `<tr><td><span class="pcard-swatch" style="display:inline-block;background:${this.colorOf(n)}"></span> ${esc(n)}</td><td>${esc(s)}</td></tr>`).join("");
    const reasons = { year_zero: "A traveler reached Year Zero", full_receptor: "A traveler mended all three periods",
      last_traveler: "Last traveler standing", all_terminated: "All travelers terminated", merchant_empty: "No relics left to save" };
    o.innerHTML = `
      <div class="gameover-card panel bracketed">
        <p class="overline">Time settles</p>
        <div class="winner">${esc(payload.winner || "--")}</div>
        <p class="muted">${esc(reasons[payload.reason] || payload.reason)} · Monarch of Time</p>
        <table class="score-table"><thead><tr><th>Operative</th><th>CP</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="gameover-actions">
          <button class="btn btn-primary go-menu" type="button">Main menu</button>
          <button class="btn btn-ghost go-peek" type="button">Look at the table</button>
        </div>
      </div>
      <div class="gameover-dock panel">
        <span class="go-dock-txt">Match over. ${esc(payload.winner || "--")} wins.</span>
        <button class="btn btn-ghost btn-sm go-show" type="button">Results</button>
        <button class="btn btn-primary btn-sm go-menu" type="button">Main menu</button>
      </div>`;
    // back to the main menu (main.js), or step aside to look at the final table
    const toMenu = () => { if (window.__pdxLeaveMatch) window.__pdxLeaveMatch(); else location.href = location.pathname; };
    o.querySelectorAll(".go-menu").forEach((b) => b.addEventListener("click", toMenu));
    o.querySelector(".go-peek").addEventListener("click", () => o.classList.add("is-peek"));
    o.querySelector(".go-show").addEventListener("click", () => o.classList.remove("is-peek"));
    // the restored timeline, how much was mended and each traveler's share, before the points
    try {
      const tl = window.__pdxTimelineSummary && window.__pdxTimelineSummary();
      const tbl = o.querySelector(".score-table");
      if (tl && tbl) tbl.parentNode.insertBefore(tl, tbl);
    } catch (e) {}
    this.dom.overlay.appendChild(o);
  }

  /* ----------------------------- Log -------------------------------- */
  logEvent(kind, p) {
    const line = this.humanize(kind, p);
    if (!line) return;
    // every recorded line also lands in HELA's core, her memory IS the log
    try { window.__helaBrainLog && window.__helaBrainLog(this.view ? this.view.hour : 0, line.cls || "", line.text); } catch (e) {}
    const row = el("li", `log-line kind-${line.cls || ""}`);
    row.innerHTML = `<span class="log-time">H${this.view ? this.view.hour : "?"}</span><span>${line.text}</span>`;
    this.dom.log.appendChild(row);
    this.dom.log.scrollTop = this.dom.log.scrollHeight;
    while (this.dom.log.children.length > 200) this.dom.log.removeChild(this.dom.log.firstChild);
  }
  // auction pieces are catalog ids: show the name the player read on the card
  _lfName(id) {
    try {
      const lots = window.__leilaoLots;
      if (lots && lots[id]) return lots[id];
      const c = window.__leilaoCatalog;
      if (!c || !id) return id;
      const e = (c.funcoes && c.funcoes[id]) || (c.geradores && c.geradores[id])
        || (c.modulos && c.modulos[id]) || (c.valvulas && c.valvulas[id])
        || (c.suprimentos && c.suprimentos[id]);
      return (e && e.name) || id;
    } catch (e) { return id; }
  }
  humanize(kind, p0) {
    // Names and card names come from the server and from what players typed: every
    // one of them is escaped before it becomes part of the log line's HTML.
    const p = { ...(p0 || {}) };
    for (const k of ["seat", "by", "from", "winner", "player", "category", "currency", "reason", "phase"])
      if (typeof p[k] === "string") p[k] = esc(p[k]);
    if (Array.isArray(p.tied)) p.tied = p.tied.map(esc);
    const C = (n) => esc(this.nameEn(n));
    const L = (id) => esc(this._lfName(id));
    switch (kind) {
      case "phase_started": if (p.invalid_allocation) return null; return { text: `- ${p.phase}${p.solo ? " (solo)": ""} -` };
      case "phase_skipped": return { text: `${p.phase} skipped, ${p.reason}`, cls: "" };
      case "delivered": return { text: `${p.seat} delivered ${C(p.card)} at ${roman(p.century)}`, cls: "cp" };
      case "card_bought": return { text: `${p.seat} ${p.stolen ? "stole" : "bought"} ${C(p.card)}${p.cost ? ` (${p.cost}g)` : ""}`, cls: "market" };
      // THE AUCTION SPEAKS. The hall resolves in secret and the table has to
      // hear it: who took what, who tied, what went into a machine.
      case "leilao_offer_stored": return { text: `${p.seat} took ${L(p.lot)} for ${p.paid} ${p.currency}`, cls: "market" };
      case "leilao_event": {
        const t2 = p.type;
        if (t2 === "lot_won") return { text: `${p.player} won ${L(p.lot)} at ${p.paid}${p.contested ? ", contested" : ""}`, cls: "market" };
        if (t2 === "lot_tied") return { text: `${(p.tied || []).join(" and ")} tied at ${p.amount}, the lot returns to the floor`, cls: "market" };
        if (t2 === "secret_vanished") return { text: `the sealed lot vanished: ${(p.tied || []).join(" and ")} tied at ${p.amount}`, cls: "paradox" };
        if (t2 === "lot_free") return { text: `${p.player} took the last lot for nothing`, cls: "market" };
        return null;
      }
      case "piece_installed": return { text: `${p.seat} installed ${L(p.piece)}${p.row != null ? ` in row ${p.row + 1}` : ""}`, cls: "" };
      case "piece_replaced": return { text: `${p.seat} replaced ${L(p.old)} with ${L(p.new)}`, cls: "" };
      case "piece_discarded": return { text: `${p.seat} let ${L(p.piece)} go (${p.reason || "no room"})`, cls: "" };
      case "card_renewed": return { text: `${p.seat} renewed ${C(p.card)} (${p.cost}g)`, cls: "market" };
      case "declared": return { text: `${p.seat} declared, Wanted cleared`, cls: "market" };
      case "merchant_moved": {
        const barge = `<svg width="26" height="15" viewBox="0 0 26 15" style="vertical-align:-3px"><path d="M2 9 Q13 13 24 9 L22 12.5 Q13 15.5 4 12.5 Z" fill="#4a3620"/><path d="M4 5.5 Q13 2.5 22 5.5 L22 8 Q13 5 4 8 Z" fill="#8c3b2a"/><path d="M13 5 V 0 M13 0 L19 1.8 L13 3.6" stroke="#241708" stroke-width=".9" fill="#c9a45c"/></svg>`;
        const trip = p.roll && !p.teleport
          ? `, rolled ${p.rolls && p.rolls.length > 1 ? p.rolls.join("+") + "=" : ""}${p.roll}, sailed ${Math.abs(p.to - p.from)}${p.target ? `, chasing ${p.target}` : ""}` : "";
        return { text: `${barge} the Merchant made port at ${roman(p.to)}${p.teleport ? " (a temporal leap)" : ""}${trip}`, cls: "market" };
      }
      case "paradox_resolved": return { text: `Paradox · module ${p.module}`, cls: "paradox" };
      case "exploded": return { text: `${p.seat}'s motor exploded`, cls: "danger" };
      case "traveled": {
        // A voyage is drawn, not listed: two islands, the course, the captain's boat.
        const col = this.colorOf(p.seat);
        const up = p.to < p.from;   // toward the past = upstream (against the current)
        const chart = `<svg width="84" height="18" viewBox="0 0 84 18" style="vertical-align:-4px">
          <circle cx="7" cy="11" r="4.5" fill="#e9dcb8" stroke="#8a6a3a"/>
          <path d="M 13 11 C 30 ${up ? 4 : 17}, 52 ${up ? 4 : 17}, 70 11" fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="4 3"/>
          <circle cx="76" cy="11" r="4.5" fill="#e9dcb8" stroke="#8a6a3a"/>
          <g transform="translate(41 ${up ? 5 : 14})"><path d="M -5 1 Q 0 4 5 1 L 4 4 Q 0 6 -3.5 4 Z" fill="${col}"/><path d="M 0 -5 V 1" stroke="#2a2018" stroke-width="1"/><path d="M 0 -5 Q 3.5 -2.5 0 0" fill="#f2e8cd" stroke="#2a2018" stroke-width=".5"/></g>
        </svg>`;
        return { text: `${chart} ${p.seat} sailed ${roman(p.from)} -> ${roman(p.to)}${up ? " · upstream": " · with the current"}`, cls: "travel" };
      }
      case "activated": return { text: `${p.seat} activated ${C(p.card)}`, cls: "market" };
      case "recycled": return { text: `${p.seat} recycled ${C(p.card)} (+${p.energy} energy)`, cls: "" };
      case "card_stolen": return { text: `${p.seat} stole ${C(p.card)}${p.from ? ` from ${p.from}` : ""} (Cauldron)`, cls: "market" };
      case "card_destroyed": return { text: `${C(p.card)} was destroyed${p.reason === "limbo" ? " (no room kept)" : ""}`, cls: "danger" };
      case "overloaded": return { text: `${p.seat} overloaded a function`, cls: "" };
      case "milestone": return { text: `${p.seat} reached ${roman(p.century)}, milestone`, cls: "cp" };
      case "terminated": return { text: `${p.seat} terminated${p.by ? ` by ${p.by}` : ""}`, cls: "danger" };
      case "respawned": return { text: `${p.seat} returned to XXX (${p.energy} energy)` };
      case "wanted": return { text: `${p.seat} is now WANTED`, cls: "danger" };
      case "reward_resolved": return { text: `${p.seat}: ${p.category} ${["", "I", "II", "III"][p.roll]}`, cls: "cp" };
      case "secret_market_opened": return { text: p.by ? `${p.by} Discovered the Secret Market` : `Secret Market Discovered`, cls: "paradox" };
      case "secret_market_hidden": return { text: p.by ? `${p.by} Hid the Secret Market` : `Secret Market Hidden`, cls: "paradox" };
      case "briefcase_acquired": return { text: `${p.seat} acquired a Temporal Briefcase (+1 slot)`, cls: "cp" };
      case "game_over": return { text: `Game over, ${p.winner} wins`, cls: "cp" };
      default: return null;
    }
  }
}

try { window.__helaSigil = icon("hela"); } catch (e) {}
