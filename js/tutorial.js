/* =========================================================================
   tutorial.js, contextual, once-only tutorial pop-ups
   -------------------------------------------------------------------------
   Small teaching cards that appear the first time a player meets a mechanic,
   with an "X" to dismiss. Each tip shows at most once (persisted), and the whole
   system can be turned off in Settings for experienced players.
   ========================================================================= */
import { icon } from "./icons.js?202609282213";

const LS_SEEN = "paradoxo.tutorials.seen";
const LS_ON = "paradoxo.tutorials.enabled";

// The teaching content, keyed by trigger: one plain line each, said once.
export const TUTORIALS = {
  allocate: {
    line: "Place all four dice, then Confirm. One value per function, filled left to right.",
    title: "The Time Machine",
    body: "Place all 4 causality generators on your Time Machine. <b>Drag</b> a die, or "
      + "<b>click</b> a die, then a glowing cell. Green = legal, dim = illegal. A function fills "
      + "left-to-right and holds one value. Confirm when all are placed.",
  },
  market: {
    line: "Buy when you stand on the Merchant's century. Deliver the card at its century for 1 point.",
    title: "The Market",
    body: "Buy items with gold while synchronic with the Merchant. Items deliver to your Temporal "
      + "Receptor at their return century for Contract Points. You can also Renew the stock or, if "
      + "Wanted, Declare to clear it.",
  },
  travel: {
    line: "Travel up to your die's value. The past costs 1 energy per century; the future is free.",
    title: "Time Travel",
    body: "Travel up to the value you generated. Moving toward the past (Year Zero) costs energy; "
      + "toward the future is free. Reaching Year Zero ends the game; the most points wins.",
  },
  paradox: {
    line: "Paradox 1 hits travellers ahead of you, 2 your century, 3 those behind. At 0 energy you are terminated.",
    title: "Paradoxes",
    body: "Paradoxes drain energy from travelers across time. A traveler reduced to 0 energy is "
      + "Terminated. Future paradoxes hit those ahead of you; past paradoxes hit those behind.",
  },
  activation: {
    line: "Click an item to use it, or the lock to pass. Each item works once per phase.",
    title: "Item Activation",
    body: "Activate your equipped items, each may be used once this phase. Weapons and effects ask "
      + "you to choose a target. Select any number, then confirm.",
  },
  recycle: {
    line: "Recycle any item for energy, almost any time.",
    title: "Recycling",
    body: "Hover your panel and press <b>Recycle</b> on any equipped item to convert it into energy "
      + "instantly, an action you can take almost any time, even between Market buys.",
  },
  wanted: {
    line: "Terminate a rival and you are Wanted, a 4-gold bounty. Declare in the Market to clear it.",
    title: "Wanted",
    body: "Terminating another traveler makes you Wanted and worth a 4-gold bounty. Pay it off by "
      + "Declaring in the Market, or lie low.",
  },
};

class TutorialManager {
  constructor() {
    this.enabled = (localStorage.getItem(LS_ON) ?? "1") === "1";
    this.seen = this._load();
    this.queue = [];
    this.active = false;
  }
  _load() { try { return JSON.parse(localStorage.getItem(LS_SEEN)) || {}; } catch { return {}; } }
  _save() { try { localStorage.setItem(LS_SEEN, JSON.stringify(this.seen)); } catch {} }

  setEnabled(on) { this.enabled = on; localStorage.setItem(LS_ON, on ? "1" : "0"); }
  resetAll() { this.seen = {}; this._save(); }

  // Show a tip once. Safe to call repeatedly; subsequent calls are no-ops.
  show(key) {
    if (!this.enabled) return;
    const tip = TUTORIALS[key];
    if (!tip || this.seen[key]) return;
    this.seen[key] = 1; this._save();
    this.queue.push({ key, tip });
    if (!this.active) this._next();
  }

  _next() {
    const item = this.queue.shift();
    if (!item) { this.active = false; return; }
    this.active = true;
    // No pop-up wall, no "Got it" button. HELA simply SAYS it, once, and it fades.
    const said = (typeof window !== "undefined" && window.__helaSay);
    if (said) window.__helaSay(item.tip.line || item.tip.title, { ms: 6000 });
    setTimeout(() => this._next(), said ? 3200 : 0);   // stagger her lines so they never stack
  }
}

export const tutorials = new TutorialManager();
