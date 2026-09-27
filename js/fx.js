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
import { audio } from "./audio.js?202609270104";
import { roman } from "./util.js?202609270104";

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
    } catch (e) {}
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
  storedLevel() { const v = lsGet(LEVEL_KEY); return LEVELS[v] ? v : "full"; }
  setLevel(v) { if (LEVELS[v]) lsSet(LEVEL_KEY, v); }
  // what plays now: Low graphics caps it at Light
  level() {
    const v = this.storedLevel();
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
  _chartLive() { try { return !!(this.comic && this.comic._chart()); } catch (e) { return false; } }
  _view() { return this.game && this.game.view; }
  _tv(seat) { const v = this._view(); return v && v.travelers ? v.travelers.find((t) => t.name === seat) : null; }

  /* ---- ANCHORS: where the rule acted, on screen right now (null when off screen) ---- */
  _rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    return r;
  }
  _pcard(seat) { return document.querySelector(`.pcard[data-seat="${CSS.escape(String(seat))}"]`); }
  // part: life, gold, heat, travel, paradox, recharge, file, or { card }
  // returns { r, box, above }: r the subject, box the case file to stand beside
  _seat(seat, part) {
    if (seat == null) return null;
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
    return { r, box, above: false };
  }
  _isle(c) {
    try { const r = this.comic && this.comic._islandAt(c); return r ? { r, box: r, above: false } : null; } catch (e) { return null; }
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
      const a = typeof anchor === "function" ? anchor() : anchor;
      if (!a) return;
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
      const a = typeof anchor === "function" ? anchor() : anchor;
      if (!a) return;
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
    n.className = `fx-${kind} fx-${tone || "plain"}`;
    n.style.left = Math.round(p.x) + "px"; n.style.top = Math.round(p.y) + "px";
    n.style.setProperty("--fx-c", TONE[tone] || TONE.plain);
    const b = document.createElement("b"); b.textContent = word; n.appendChild(b);
    if (opts.sub) { const s = document.createElement("span"); s.textContent = opts.sub; n.appendChild(s); }
    this.root.appendChild(n);
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
    // a contract names its category and its result
    if (kind === "contract" && this._reward && !opts.word) {
      const f = REWARD[this._reward.category];
      if (f) { opts.word = f[0]; opts.sub = f[1][(this._reward.roll || 1) - 1] || opts.sub; }
    }
    if (lv === "light") {
      const face = BIG_FACE[kind] || ["POW!", "plain"];
      const a = at && at.width != null ? { r: at, box: at, above: false }
        : at && at.x != null ? { r: { left: at.x, top: at.y, right: at.x, bottom: at.y, width: 0, height: 0 }, box: null, above: true } : null;
      if (a) this.stamp(opts.word || face[0], face[1], a, { sound: false });
      return true;
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
    if (window.__helaMute && this.tutorial) this._tutorBig(kind, p);
    switch (kind) {
      case "hour_started": this._trips = {}; return;
      case "module_resolved":                   // the escape valve dumps an overloaded die for energy
        if (p.kind === "escape_valve") for (const e of p.effects || []) if (e.energy > 0) this.pop("VENT!", "valve", () => this._seat(e.seat, "life"));
        return;
      case "valve_fed":                         // a calm valve charges the reactor
        if (p.fed > 0) this.pop("PSSSH!", "valve", () => this._seat(p.seat, "heat"));
        return;
      case "valve_reward":
        return this.stamp("FULL CHARGE!", "valve", () => this._seat(p.seat, "file"));
      case "overloaded":
        if ((p.functions || []).length) this.stamp("OVERLOAD!", "danger", () => this._seat(p.seat, "file"));
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
        const a = this._isle(11) || this._el("#market-zone") || this._el("#tl-gauge");
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

  // In the tutorial HELA's own lines are silent, and her big panels ride those lines
  // (comic.js say). With the tutorial's leave (this.tutorial), the same panels land here.
  _tutorBig(kind, p) {
    const me = this._me();
    const at = (seat) => { try { return this.comic._seatRect(seat); } catch (e) { return null; } };
    if (kind === "paradox_resolved") {
      const hits = (p.hits || []).filter((h) => h.damage); if (!hits.length) return;
      const star = hits.find((h) => h.seat === me) || hits[0];
      return this.big("paradox", at(star.seat), { big: star.seat === me, sub: `-${star.damage}` });
    }
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
      case "paradox_cast":                       // modules 4 to 6: who fed the pool
        for (const c of p.causers || []) this.pop("ZAP!", "paradox", () => this._seat(c, "paradox"));
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
