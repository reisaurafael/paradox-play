/* =========================================================================
   tutorial-drive.js, the teaching mode.

   The tutorial does not rebuild the game. It DRIVES the real one: the same desk,
   the same arm, the same time machine, the same star map. The Game only ever
   talks to an injected connection, so here the connection goes nowhere and the
   tutorial itself plays the server, feeding crafted state and decisions and
   catching the player's answers to advance the lesson. The board is taken apart
   and put back together in front of the traveller, one piece at a time.

   The machine is reduced to four cells and the map to the first era, both by CSS,
   since they are hardwired to the full machine and the full thirty centuries.
   Everything else on screen is the real thing. Objects appear on the desk only
   when the lesson needs them; the side scenes stay locked.

   HELA speaks the source lines below (English, British spelling). She is a Norse
   death-goddess: patient, cold, elegant, amused by the warm and the doomed. She
   addresses the traveller and never lectures. Every line becomes recorded voice.
   ========================================================================= */

import { Game } from "./game.js?202609261009";
import { icon } from "./icons.js?202609261009";
import { roman } from "./util.js?202609261009";

const SELF = "TRAVELLER";
// The Merchant's shelf is CURATED, not random: it carries exactly the relic this lesson
// needs. Super Motor is cheap (two gold), it is delivered at XXVII which sits inside the
// only era the traveller can see, and what it does (your motor survives its first
// explosion) speaks to the machine he has just learned to fear.
const RELIC = {
  name: "Super Motor", display_name: "Super Motor",
  gold_cost: 2, delivery_century: 27, recycle_value: 1,
  ability_type: "passive", is_large_item: false,
  text: "The first time your motor would explode, it doesn't. Discard 6 booms.",
};
const RIVAL = "VARR";
// The blade the rival is fed once the traveller has scored, so that death arrives from a
// thing he can read on their file rather than from nowhere: it cuts for exactly as much
// gold as its owner is carrying, which is why the rival is made rich first.
const WEAPON = {
  name: "Arma de Laser", display_name: "Laser Gun",
  gold_cost: 4, delivery_century: 23, recycle_value: 3,
  ability_type: "active", is_large_item: false,
  text: "Choose a synchronic traveler, they lose 6 energy.",
};
// THE SHELF KEEPS TRADING AFTER THE FIRST DELIVERY. It used to go bare the moment he had
// carried one relic home, so the Merchant became a man who sold a single thing once and the
// lesson never said what a card actually IS. These two are real cards, straight out of the
// engine with their real costs, centuries and wording: one PASSIVE that simply keeps working
// once it is in the case, and one ACTIVE that does nothing until he pulls it. That contrast
// is the whole rule about abilities, and it is cheaper to show than to describe.
const TESLA = {
  name: "Motor de Corrente Alternada de Tesla", display_name: "Tesla's AC Motor",
  gold_cost: 1, delivery_century: 19, recycle_value: 2,
  ability_type: "passive", is_large_item: false,
  text: "Whenever you gain one or more booms, gain 1 energy.",
};
const MERCATOR = {
  name: "Mapa de Geradus Mercator", display_name: "Mercator's Map",
  gold_cost: 2, delivery_century: 16, recycle_value: 2,
  ability_type: "active", is_large_item: false,
  text: "Travel up to 3 centuries.",
};
const BLADE = {
  name: "Espada do Carlos Magno", display_name: "Charlemagne's Sword",
  gold_cost: 3, delivery_century: 8, recycle_value: 3,
  ability_type: "active", is_large_item: false,
  text: "Choose a synchronic traveler, they lose energy equal to the amount of gold you have.",
};

// ---- HELA, source lines by beat ----
const L = {
  wake: [
    "Wake up, traveller. Still warm, still breathing. How rare, at my table.",
    "That tech on your arm is a time machine. I am the one who will guide you through it.",
    "I will teach you to wear it, one piece at a time. Watch, and do as I say.",
  ],
  t1prompt: "Two dice, two functions. Drag a die onto a module to program it. One value per function, and fill it left to right.",
  prompt: "New dice. Place both in the machine.",
  oneValue: "One value to a function, traveller. Those two do not match, so that die comes back to you.",
  oneValueGood: "Two values, and you sent each to its own function without being told. One value to a function. You had that before I opened my mouth.",
  overload: "You filled both modules of one function. That OVERLOADS it, so it seals shut for the next hour.",
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
  sealed: "That function is sealed this hour, from the overload. Use the other one.",
  tabHelp: "One more thing, and then I stop holding your hand. This is what T gives you: every module on the machine, and what each one does. Press T whenever you forget. It waits, patient as I am not.",
  mod3: "Your machine grows again. A third module on every function, and a fourth generator to feed them. That is the whole machine, traveller. Everything a real rival brings to a table, you are now holding.",
  paradoxHit: "That was a PARADOX. Your rival reached across the centuries and tore into you from where they stand, and there was nothing on your machine to answer with.",
  paradox: "So I am giving you the function. PARADOX reaches across the years and tears into a traveller standing in another century. Ahead of you with the first module, behind you with the second. A third function earns a third generator too, and yours read as high as III from here on. I want you armed when you answer.",
  paradoxAim: "Your paradox has its third module now, and that one is the PRESENT: it strikes whoever is standing in your own century. First ahead of you, second behind you, third right on top of you. Three modules, three directions. Pick the one they are standing in.",
  paradoxDone: "Your paradox landed. They felt that across the years.",
  merchantArrives: "Something new on your chart, traveller. A wagon has rolled into XXIV, at the far end of the only era you can see.",
  merchantWho: "The MERCHANT. He carries relics and he trades with one man only: whoever is standing in his own year. That wagon crawls the centuries on its own business, never on yours, so do not sit there waiting on it. If you want what he has, you cross the years and you stand in front of him.",
  merchantSign: "That sign over his booth answers one question and only one: whether HE will trade with YOU today. It reads CLOSED from everywhere except his century.",
  marketScene: "This is his wagon, up close. The shelf is what he is willing to sell this hour.",
  marketCard: "One relic on it. Two gold, which you have. Look at the century stamped on its face.",
  marketPromise: "That number is a PROMISE. Buy the relic, carry it to that century, hand it over there, and the C.R.O.N.O.S. pays you in the only currency that decides this game.",
  merchant: "A wagon crawls the centuries. The Merchant. He trades only with whoever stands in his year, and he keeps to his own road, so if you want what he carries you go to him.",
  merchantGo: "He is in {c}. Six centuries of road between you and him, and every one of them costs. Plan the crossing.",
  marketOpen: "His shelf, and one relic on it. Two gold. Look at the century stamped on the card: that is where the relic must be delivered.",
  bought: "It is yours. Gear rides in your case from now on, and this one is promised to {c}. Carry it there and someone will pay you for the trouble.",
  carry: "The relic is promised to {c}, and promises are the only currency I respect. Take it there.",
  receptor: "The cabinet under your desk, traveller. The TEMPORAL RECEPTOR. Every relic you hand over is filed in the era it belonged to, and those drawers are the only record that you were ever worth anything.",
  deliverAsk: "You are standing where it was promised. The cabinet under your desk is open. Take the relic out of your case and file it in the drawer yourself, then turn the lock. I do not do your paperwork.",
  delivered: "Delivered. That is a CONTRACT POINT, traveller, and points are how this ends: the one with the most when the last hour burns is the one who mattered. The rest of you I simply collect.",
  chartOpen: "Look up. You kept a promise, so the roll comes off the chart and you get the rest of the years. Thirty centuries, all of them yours to cross, and the last thing down there at the end is YEAR ZERO.",
  ending: "So here is how it ends, since you have earned the question. Three ways. Fill your receptor with a relic from all three periods. Or walk all the way down to Year Zero, and I promise you nobody arrives there cheaply. Or be the only traveller still breathing. Whichever comes first stops the clock, and then we count points. Only points.",
  shelfPassive: "That word under the name is what the card IS. PASSIVE. It asks you for nothing: it sits in your case and it simply keeps happening, whether you remember it or not. Rest your hand on the card if you want the whole line.",
  shelfActive: "Now read this one's word. ACTIVE. It waits, and it does nothing at all until you reach in and pull it, once, inside the activation window.",
  passiveGot: "In the case, and already working. Take heat this hour and it pays you a life for it, with no help from you. I will not remind you it is there. That is the point of it.",
  activeGot: "This one you have to use. It sits there, loaded, until you decide the moment.",
  abilityRule: "Two cards, two natures, and that is the whole rule. A passive works because you own it. An active works because you pulled it. Everything on the Merchant's shelf is one or the other, and the line printed on the card tells you which.",
  passiveFired: "That was your motor, not you. The heat came in and it paid you a life for the trouble. That is a passive earning its place in the case.",
  weaponUp: "The wagon found you again, and this time it is carrying something with a trigger. Four gold. You have watched what an ACTIVE item does when it is pointed at you.",
  weaponBought: "Good. An item with a trigger does nothing sitting in your case: it waits for the ACTIVATION phase, and then you choose when to pull it.",
  paybackAsk: "They are standing in your century. Open your case and fire.",
  payback: "Six energy out of them, by your hand, in your own activation. Now you have taken every part of this game and used it.",
  richRival: "Look at their case, traveller. Coin is piling up over there, and coin in the wrong hands stops being money and starts being a weapon.",
  bladeBought: "They bought a blade. It cuts for as much gold as they carry, and they carry plenty. Items can be ACTIVATED, and that one is pointed at you.",
  killed: "And there it is. Energy nothing, and you are terminated. They take a point for the killing and the mark of WANTED for the manner of it.",
  respawned: "Up you get. Death is not the end here, it is a toll: you keep your gold and your heat, you come back to XXX with fresh energy, and the record of your dying costs you a point at the very end.",
  rewardIntro: "A point earns you more than a number. The C.R.O.N.O.S. owes you a favour, and you get to say what KIND of favour. Three contracts, and you sign one.",
  rewardPick: "Chaos hurts people. Time bends the rules of the hour. Resource pays. Open the contracts drawer and choose.",
  rewardRolled: "{cat}, and the generator came up {roll}. {text}",
  voucherGot: "That is a TICKET, and it lives in your case with the rest of your things. Spend it when the hour suits you.",
  nextHour: "The hour passes. The dice roll again.",
  gradIntro: "Enough. You have handled every piece of it now: the machine, the years, the coin, the wagon, the promise, the blade, and your own death.",
  gradList: "You know what a generator is worth, what an overload costs, where a relic must go, and what it feels like when someone across the centuries decides you have had enough.",
  gradEnd: "So I have nothing left to teach you, which means the only thing left is to see how long you last. Go and play a real hour, traveller. I will be watching, and I am patient. I always get my table back.",
};

// A connection that leads nowhere. The tutorial is the server.
class StubConn {
  constructor() { this.handlers = {}; this.onRespond = null; }
  on(type, fn) { this.handlers[type] = fn; return this; }
  connect() { return this; }
  send() {}
  start() {}
  addBot() {}
  sync() {}
  respond(requestId, data) { if (this.onRespond) this.onRespond(requestId, data); }
  close() {}
}

// Fixed pauses only. The waits that belong to the traveller (every line she holds until
// he clicks) are untouched; this just lets an automated playthrough skip the scenery so a
// whole lesson can be verified in a couple of minutes.
const wait = (ms) => new Promise((r) => setTimeout(r, window.__tutTurbo ? Math.min(ms, 25) : ms));

// ---- the tutorial director: holds the "server" state and drives the real Game ----
class Tutorial {
  constructor() {
    this.conn = new StubConn();
    this.game = null;
    this.reqN = 0;
    this.taught = {};
    this.overloadedFn = null;
    this.shownMaleta = false;
    this.shownRival = false;
    this.shownValve = false;
    this._teaching = false;    // guards the allow-undo-teach correction from re-entry
    this._curPrompt = "";      // the prompt held in the eye while the player allocates
    this.taughtOneValue = false;   // once the one-value rule is taught, the machine enforces it normally
    // each module's effect is EXPLAINED only the first time it fires; after that it just resolves
    this.taughtEnergy = false;
    this.taughtGold = false;
    this.taughtBoom = false;
    this.taughtBoth = false;
    this.taughtReveal = false;
    this.taughtTravel = false;
    this.taughtHour = false;
    this.taughtOverload = false;
    this.taughtSealed = false;
    this.modules = 2;              // modules per function at this stage (grows to 3 later)
    this._rivalMatrix = null;      // the rival's last revealed hand, for their overload marker
    this.learned = new Set();      // every element the traveller has been shown, by id
    this.hoursIdle = 0;            // hours in a row that taught nothing (the director hates these)
    this.maletaLabels = { gold: false, equipment: false, contracts: false, vouchers: false };
    this.s = {
      hour: 1, century: 30, rivalCentury: 30, merchantCentury: null,
      travelers: {
        [SELF]: { energy: 6, gold: 0, booms: 0, contract_points: 0, valve_charge: 0, hand: [] },
        [RIVAL]: { energy: 5, gold: 0, booms: 0, contract_points: 0, valve_charge: 0, hand: [] },
      },
    };
  }

  // build the view the real renderers read
  view() {
    const t = (name) => {
      const v = this.s.travelers[name];
      return {
        name, display_name: name === SELF ? "You" : "Varr", is_self: name === SELF,
        century: name === SELF ? this.s.century : this.s.rivalCentury,
        energy: v.energy, gold: v.gold, booms: v.booms,
        contract_points: v.contract_points, valve_charge: v.valve_charge,
        matrix_buffs: [],
        // EQUIPMENT AND HAND CARRY THE SAME CARDS HERE. Everything the renderers use to draw
        // another traveller's belongings reads `equipment || hand`, and an empty array is
        // truthy, so sending `equipment: []` won a fallback that was never meant to lose: the
        // rival's blade never appeared on their file and the death that follows arrived from
        // nowhere, which is the one thing that beat was built to avoid.
        equipment: [...(v.hand || [])],
        hand: [...(v.hand || [])],
        is_wanted: !!v.wanted, awaiting_respawn: !!v.awaitingRespawn,
        // THE CASE READS THESE, so the tutorial has to fill them by their real names. A
        // delivered period is what puts the contract clipping in the case and the seal on the
        // file, and the three tickets are separate fields, not one counter: a ticket written
        // to a name nothing reads is a reward the traveller is told about and never receives.
        delivered_periods: [...(v.periods || [])],
        solo_voucher: v.solo_voucher || 0,
        market_voucher: v.market_voucher || 0,
        item_voucher: v.item_voucher || 0,
        receptor_cards: [...(v.receptor || [])],
        temporal_receptor: (v.receptor || []).map((c) => c.name),
        overloaded_functions: [...(v.ovl || [])],      // sealed this hour
        overloaded_next: [...(v.ovlNext || [])],       // just blew at clean-up
        is_terminated: !!v.terminated,
      };
    };
    return {
      hour: this.s.hour,
      merchant_century: this.s.merchantCentury == null ? undefined : this.s.merchantCentury,
      market_revealed: this.knows("merchant") && this.shopItem() ? [this.shopItem()] : [],
      // The wooden sign over the wagon reads this, and it is the synchronic rule made
      // visible: OPEN only while he stands in the Merchant's own year, CLOSED everywhere
      // else. The board teaches the rule without a word from me.
      market_access: this.s.merchantCentury != null && this.s.century === this.s.merchantCentury,
      merchant_movement_dice: 1,
      merchant_card_count: this.knows("buy") ? 0 : 1,
      merchant_last_move: 0,
      travelers: [t(SELF), t(RIVAL)],
    };
  }

  pushState() { this.game.onMessage("state", { view: this.view() }); setTimeout(() => this.limitMap(), 80); }

  // ---- HELA speaks through a large, persistent panel; every teaching line holds
  //      until the traveller clicks to continue (no small auto-fading chip) ----
  buildHela() {
    const p = document.createElement("div");
    p.id = "tut-hela";
    p.innerHTML =
      `<div class="th-sigil">${icon("hela")}</div>` +
      `<div class="th-body"><div class="th-name">HELA</div><div class="th-line" id="th-line"></div></div>` +
      `<div class="th-hint">click anywhere ▸</div>`;
    document.body.appendChild(p);
    this._panel = p;
    this._helaLine = p.querySelector("#th-line");
    const eh = document.createElement("div");   // a click hint for the eye lines
    eh.id = "tut-eye-hint"; eh.textContent = "click anywhere ▸"; eh.style.display = "none";
    document.body.appendChild(eh);
    this._eyeHint = eh;
  }
  // resolve on any click or key, anywhere (the cursor is hidden while she teaches)
  // "Click anywhere" meant exactly that, including THROUGH the caption and onto the
  // board underneath: the same click that turned her page also pressed CONFIRM on the
  // pip-boy or dropped a carried die. Players read that as the tutorial playing itself.
  // A click that advances her is now consumed and reaches nothing else, and while she is
  // speaking a shield covers the board so there is nothing to hit by accident.
  _shieldOn() {
    let sh = document.getElementById("tut-shield");
    if (!sh) { sh = document.createElement("div"); sh.id = "tut-shield"; document.body.appendChild(sh); }
    sh.classList.remove("gone");
  }
  _shieldOff() { const sh = document.getElementById("tut-shield"); if (sh) sh.classList.add("gone"); }

  _awaitAnyClick() {
    return new Promise((resolve) => {
      let armed = false;
      const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };
      const off = () => {
        document.removeEventListener("pointerdown", down, true);
        document.removeEventListener("keydown", key, true);
        document.removeEventListener("pointerup", tail, true);
        document.removeEventListener("click", tail, true);
      };
      const tail = (e) => { swallow(e); };            // eat the rest of the same gesture
      const finish = () => {
        setTimeout(() => { document.removeEventListener("pointerup", tail, true);
          document.removeEventListener("click", tail, true); }, 350);
        resolve();
      };
      const down = (e) => {
        if (!armed) return;
        swallow(e);
        document.removeEventListener("pointerdown", down, true);
        document.removeEventListener("keydown", key, true);
        finish();
      };
      const key = (e) => {
        const k = (e.key || "").toLowerCase();
        if (k === "t" || k === "escape") return;      // those belong to the reference card
        off(); resolve();
      };
      setTimeout(() => {
        armed = true;
        document.addEventListener("pointerdown", down, true);
        document.addEventListener("keydown", key, true);
        document.addEventListener("pointerup", tail, true);
        document.addEventListener("click", tail, true);
      }, 260);
    });
  }
  // the big bottom panel: only the opening wake goes here
  async tellBig(text) {
    this._panel.style.display = "";
    if (this._helaLine) this._helaLine.innerHTML = text;
    this._shieldOn();
    await this._awaitAnyClick();
    this._shieldOff();
  }
  // every other line lives in HELA's purple eye, enlarged, held until any click
  async tell(text) {
    this._panel.style.display = "none";
    if (window.__helaSay) window.__helaSay(text, { ms: 600000, force: true, jump: true });
    this._eyeHint.style.display = "";
    this._shieldOn();                 // her line owns the click; the board is not listening
    await this._awaitAnyClick();
    this._shieldOff();
    this._eyeHint.style.display = "none";
    this.clearSay();                  // he answered it; it goes
  }
  // a line that just holds (no click) in the eye while the player acts on the machine
  // A standing instruction, held while he acts on it. An empty one CLEARS the screen
  // instead of leaving the last sentence hanging over the board.
  hold(text) {
    this._shieldOff();                // his turn to touch the machine
    this._curPrompt = text;
    this._panel.style.display = "none";
    if (!text) { this.clearSay(); return; }
    if (window.__helaSay) window.__helaSay(text, { ms: 600000, force: true, jump: true });
  }
  // Her voice is dismissed by taking the "speaking" state off the eye. Sending an empty
  // line does nothing at all: say() returns early on falsy text, which is exactly why
  // spent instructions were still sitting over the board minutes later.
  clearSay() {
    const eye = document.getElementById("hela-eye");
    if (eye) eye.classList.remove("he-says");
    const chip = document.querySelector(".he-chip");
    if (chip) chip.innerHTML = "";
  }

  async narrate(lines) { for (const line of lines) await this.tellBig(line); }

  // the immersive wake: he sleeps face-down on the desk. The camera starts pushed
  // into the desk, blurred and dark; a click lifts his head, the camera eases back
  // to the seat and the blur clears while HELA's eye wakes and speaks.
  wakeStart() {
    document.body.classList.add("tut-waking");
    const cam = document.getElementById("cam");
    if (cam) {
      cam.style.setProperty("--cam-dur", "0s");
      cam.style.setProperty("--cam-s", "2.2");
      cam.style.setProperty("--cam-ty", "-120px");
    }
    this.showBlack();
  }
  wakeRise() {
    const cam = document.getElementById("cam");
    if (cam) {
      cam.style.setProperty("--cam-dur", "6s");     // the slow lift back to the seat
      cam.style.removeProperty("--cam-s");
      cam.style.removeProperty("--cam-ty");
      setTimeout(() => cam.style.removeProperty("--cam-dur"), 6400);
    }
    document.body.classList.remove("tut-waking");    // the blur and dark clear (CSS transition)
    this.hideBlack();
  }

  showBlack() {
    let v = document.getElementById("tut-black");
    if (!v) { v = document.createElement("div"); v.id = "tut-black"; document.body.appendChild(v); }
    v.classList.remove("gone");
  }
  hideBlack() { const v = document.getElementById("tut-black"); if (v) v.classList.add("gone"); }
  // Faces I and II while the machine is small; once the third module exists the
  // generators reach III, the same range a real hand has.
  // THE HAND GROWS WITH THE MACHINE, in two steps, and the second one lands him exactly on
  // a real match: four generators, three faces, three modules on each of three functions.
  // The third FUNCTION brings the third generator and opens the III face (a machine with
  // somewhere new to send power is worth being dealt more, and stronger). The third MODULE
  // on every function brings the fourth, because only then is there room to spend it.
  diceCount() { return this.modules >= 3 ? 4 : (this.knows("paradox") ? 3 : 2); }
  maxFace() { return this.knows("paradox") ? 3 : 2; }
  rollDie() { return 1 + Math.floor(Math.random() * this.maxFace()); }
  // a hand of one value, as many generators as he is currently dealt
  same(v) { return new Array(this.diceCount()).fill(v); }
  // a hand that cannot be split evenly: one odd generator, every other one matching. This
  // is the shape that teaches the one-value rule and that strands a die for the valve.
  odd(lone, rest) { return [lone, ...new Array(this.diceCount() - 1).fill(rest)]; }

  reveal(cls) { document.body.classList.add(cls); }
  hide(cls) { document.body.classList.remove(cls); }

  /* ══ THE GRADUATION CHECKLIST ══
     The lesson ends when every element has been met, not after a fixed number of hours.
     Ids are added here as each cluster is built; the loop runs until all of them are known.
     The tail of the list is what a traveller needs AFTER his first delivery, which is where
     the lesson used to simply stop talking: the chart unrolling to the full thirty centuries,
     the two natures of a card, and how the game actually ends. A tutorial that never says how
     you win is not a tutorial. */
  static get CHECKLIST() {
    return ["place", "oneValue", "energy", "boom", "rival", "reveal", "gold", "travel", "overload", "valve",
      "module3", "paradoxHit", "paradox", "merchant", "buy", "carry", "deliver",
      "rivalfile", "tab", "receptor", "reward", "chart", "passive", "active", "ending",
      "activation", "death", "weapon", "payback"];
  }
  knows(id) { return this.learned.has(id); }
  learn(id) { this.learned.add(id); }
  missing() { return Tutorial.CHECKLIST.filter((id) => !this.learned.has(id)); }
  graduated() { return this.missing().length === 0; }

  /* ══ THE DIRECTOR ══
     It is aggressive on purpose: every hour must teach AT LEAST ONE new thing and AT
     MOST TWO. It never waits for the traveller to stumble into a rule, it arranges the
     hour so the rule is the natural play. It rigs three things: the dice he is dealt,
     the dice the rival is dealt, and what the rival does with them.

     The pair is the lever. Two dice of the SAME value can legally fill both modules of
     one function, which is what opens the second module (gold, or the move) and what
     causes the overload. Two DIFFERENT values cannot share a function, so they force
     one die into each, which is what teaches the one-value rule and keeps the machine
     calm when nothing new is due. */
  planDice(n) {
    // Hour two is fixed: a matching pair of I, so he learns what a PAIR buys him.
    if (n === 2) return [1, 1];
    const need = this.missing();
    const wants = (id) => need.includes(id);
    // THE VALVE'S MOMENT, manufactured: with one function sealed by an overload, a
    // mismatched pair cannot be split across what is left, so a generator ends up in his
    // hand with nowhere lawful to go. That is precisely when the valve earns its lesson.
    if (wants("valve") && (this.s.travelers[SELF].ovl || []).length) {
      return this.odd(1, 2);
    }
    // the one-value rule is taught by a mismatched pair, so deal one of each
    if (wants("oneValue")) return Math.random() < 0.5 ? this.odd(1, 2) : this.odd(2, 1);
    // gold, travel and the overload all need a matching pair to be reachable
    // Once the wagon is on the chart the hand is chosen to get him TO it and PAY for it,
    // and the rhythm the game already owns does the steering. Minting gold fills both
    // recharge modules, which overloads recharge and seals it for the next hour, and an
    // hour with recharge sealed is an hour whose dice can only go into travel. So: mint
    // while recharge is open, cross while it is shut. The rule pushes him, not me.
    // carrying a relic: every hand is cut to the distance still between him and the
    // century it was promised to
    // a planned value can never read higher than the faces his generators actually have
    const face = (x) => Math.max(1, Math.min(this.maxFace(), x));
    const goal = this.goalCentury();
    if (this.knows("buy") && goal != null && this.s.century !== goal) {
      return this.same(face(Math.abs(this.s.century - goal)));
    }
    if (this.knows("merchant") && this.shopItem()) {
      const me = this.s.travelers[SELF];
      const price = this.shopItem().gold_cost;
      const rechargeSealed = (me.ovl || []).includes(0);
      const gap = Math.abs(this.s.century - this.s.merchantCentury);
      if (rechargeSealed && gap > 0) return this.same(face(gap));   // exactly the distance to the wagon
      // MINT WITH THE BIGGEST FACE HE OWNS. Dealing I every time meant the strongest face
      // on his generators was a number he had been told about and never once seen, and it
      // took two hours of minting to afford a two gold relic. The top face pays for the
      // relic in a single hour and puts a III on the desk where he can read it.
      if (!rechargeSealed && me.gold < price) return this.same(this.maxFace());
      if (gap > 0) return this.same(face(gap));
      // he is standing in the wagon's year with the price in his case: hold him there
      return this.odd(2, 1);
    }
    if (wants("gold") || wants("travel") || wants("overload")) {
      const v = wants("travel") && !wants("gold") ? 2 : 1;   // a bigger die makes the crossing worth watching
      return this.same(v);
    }
    return new Array(this.diceCount()).fill(0).map(() => this.rollDie());
  }
  // the rival is a teacher too: what they do sets up the NEXT hour's lesson
  planRival(n) {
    // Hour two: a pair of II in travel, and the rival crosses two centuries with it.
    if (n === 2) return [[0, 0, 0], [0, 0, 0], [2, 2, 0]];
    // Hour three: the rival is handed PARADOX one hour before the traveller is, and uses
    // it on him at once. The column is chosen from where the two of them actually stand,
    // so the blow always lands whatever the traveller did with his own hour.
    if (n === 3) {
      const meC = this.s.century, rc = this.s.rivalCentury;
      const col = meC > rc ? 0 : (meC === rc ? 1 : 2);
      const mm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      mm[1][col] = 2;
      return mm;
    }
    // blade in hand and the traveller somewhere else: they close the distance themselves
    const rr = this.s.travelers[RIVAL];
    if (rr.hand && rr.hand.length && !this.knows("payback")) {
      if (this.s.rivalCentury === this.s.century) {
        const mm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        mm[1][1] = 3;                                                      // present paradox, standing on him
        return mm;
      }
      return [[0, 0, 0], [0, 0, 0], [0, 0, 0]];      // the walking is done by huntStep, either way
    }
    if (!this.knows("reveal")) return [[1, 0, 0], [0, 0, 0], [0, 0, 0]];   // a plain hand, easy to read
    if (!this.knows("rivalfile")) return [[1, 1, 0], [0, 0, 0], [0, 0, 0]];  // their first coin
    // they overload their own recharge, so the traveller can read an overload on someone
    // else's file before it ever happens to him
    if (!this.knows("overload")) return [[2, 2, 0], [0, 0, 0], [0, 0, 0]];
    // THE RIVAL'S MACHINE GROWS WITH HIS. Their hand was two generators for the whole
    // lesson, which read as an opponent who never learned anything and, worse, meant the
    // purse across the table filled by decree instead of by playing. Once the traveller has
    // scored, they pour every generator they own into Recharge, in the open, on their own
    // file: that is where the gold for the blade visibly comes from.
    const mm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const n2 = this.diceCount();
    if (this.knows("deliver") && !this.knows("death")) {
      for (let c = 0; c < Math.min(3, this.modules, n2); c++) mm[0][c] = 2;
      if (n2 > this.modules) mm[2][0] = 2;      // the spare goes to their motor, where I can see it
      return mm;
    }
    for (let c = 0; c < Math.min(2, this.modules); c++) mm[0][c] = 2;
    if (n2 >= 3) mm[2][0] = 1;
    if (n2 >= 4) mm[1][0] = 1;
    return mm;
  }

  /* ══ THE MACHINE GROWS ══
     The pieces the traveller was never shown arrive one at a time, each materialising
     into the machine he already knows how to use, so growth reads as his own kit
     getting bigger rather than as a new interface. */
  async growModule3() {
    this.reveal("tut-mod3");
    this.modules = 3;
    this.game._modSwap = null;   // full width: Future / Present / Past, each where it belongs
    await wait(60);
    this.game.renderMachineIdle();
    const born = [...document.querySelectorAll('#machine-body .cell[data-c="2"]')];
    born.forEach((c) => c.classList.add("tut-new"));
    this.bitMaterialize(document.getElementById("machine-body"));
    await wait(500);
    this.learn("module3");
    await this.tell(L.mod3);
    // the third module is what puts every paradox column back where it belongs, so this is
    // where the three directions are finally named
    if (this.knows("paradox")) {
      this.frame("#machine-body .matrix-fnlabel.fn-paradox", "red");
      await this.tell(L.paradoxAim);
      this.unframe();
    }
    born.forEach((c) => c.classList.remove("tut-new"));
    this.unreduceMachine();
  }
  async growParadox() {
    // Two columns wide, so his second paradox module is the PAST: the shortened function
    // still reaches both ways along the years, which is the whole point of a paradox. The
    // cell is relabelled to match, so it says Past and does Past.
    this.game._modSwap = { "1,1": ["past", "Past"] };
    this.reveal("tut-show-paradox");
    await wait(60);
    this.game.renderMachineIdle();
    const born = [...document.querySelectorAll('#machine-body .cell[data-r="1"]'),
      ...document.querySelectorAll("#machine-body .matrix-fnlabel.fn-paradox")];
    born.forEach((c) => c.classList.add("tut-new"));
    this.bitMaterialize(document.getElementById("machine-body"));
    await wait(500);
    this.frame("#machine-body .matrix-wrap", "red");
    this.learn("paradox");
    await this.tell(L.paradox);
    this.unglow();
    born.forEach((c) => c.classList.remove("tut-new"));
    this.unreduceMachine();
  }

  /* ══ PARADOX ══
     Same targeting as the real engine: module 4 (col 0) strikes whoever stands in the
     FUTURE (a higher century), module 5 (col 1) whoever is in the same century, module 6
     (col 2) whoever is in the PAST (a lower century). The damage is the die's value.
     The traveller meets this the hard way first: the rival hits him from XXX while he is
     further down the chart, and only after he has felt it does he get the function. */
  // Canonical, the same mapping the engine uses: column 0 strikes the FUTURE (a higher
  // century), column 1 the PRESENT (his own century), column 2 the PAST.
  // WHILE THE MACHINE IS ONLY TWO MODULES WIDE, his second paradox module is the PAST
  // instead of the present. A two-column paradox reading future-then-present hands him a
  // function whose second half cannot reach a traveller standing anywhere else, in the same
  // breath as being told he can finally answer. Future and past is the pair that teaches
  // what a paradox is for: it reaches either way along the years. The third module arrives
  // and brings the present with it, and from then on every column means what it says.
  paradoxHits(col, fromC, toC, mine) {
    if (mine && this.modules < 3 && col === 1) return toC < fromC;
    return col === 0 ? toC > fromC : col === 1 ? toC === fromC : toC < fromC;
  }
  async resolveParadox(m) {
    const meC = this.s.century, rivC = this.s.rivalCentury;
    const inbound = [], outbound = [];
    for (let c = 0; c < 3; c++) {
      const rd = this._rivalMatrix && this._rivalMatrix[1] ? this._rivalMatrix[1][c] : 0;
      if (rd && this.paradoxHits(c, rivC, meC)) inbound.push({ dmg: rd, col: c });
      const md = m[1] ? m[1][c] : 0;
      // his own paradox reads with the gift-hour rule; the rival's always reads canonically
      if (md && this.paradoxHits(c, meC, rivC, true)) outbound.push({ dmg: md, col: c });
    }
    // HE TAKES IT FIRST
    for (const h of inbound) {
      const me = this.s.travelers[SELF];
      me.energy = Math.max(0, me.energy - h.dmg);
      await this.restate(m);
      this.glow("#players-zone .pcard .bd-alloc");     // where it came from
      this.frame(".vital-ekg", "red");                 // and what it cost him
      if (!this.knows("paradoxHit")) { this.learn("paradoxHit"); await this.tell(L.paradoxHit); }
      else await wait(900);
      this.unglow();
    }
    // AND LATER HE ANSWERS
    for (const h of outbound) {
      const them = this.s.travelers[RIVAL];
      them.energy = Math.max(0, them.energy - h.dmg);
      this.showMatrix(m); this.glowCell(1, h.col);
      await this.restate(m); this.glowCell(1, h.col);
      this.glow("#players-zone .pcard");
      await this.tell(L.paradoxDone);
      this.unglow();
    }
  }

  /* ══ THE MERCHANT AND HIS SHELF ══
     He is met on the chart first, as a thing that MOVES and cannot be summoned, and the
     rule that defines him is taught in the same breath: he deals only with whoever
     stands in his year. That single rule is what turns travel from a lesson into a
     reason, and it is why the market is introduced only after the traveller can move. */
  // The wagon ARRIVES, it was never standing there. It rolls into the far end of his
  // era so that reaching it is a journey he has to plan, which is the whole reason he
  // was taught to travel in the first place.
  async introMerchant() {
    this.s.merchantCentury = 24;
    this.learn("merchant");
    this.pushState();
    await wait(500);
    const node = document.querySelector('#timeline-rail [data-c="24"]');
    this.bitMaterialize(node);                       // it materialises onto the chart
    await wait(700);
    if (node) node.classList.add("tut-attn");
    await this.tell(L.merchantArrives);
    await this.tell(L.merchantWho);
    this.unglow();
    await this.tell(L.merchantGo.replace("{c}", roman(24)));
  }

  // the one century the lesson currently wants him standing in, or null
  goalCentury() {
    const me = this.s.travelers[SELF];
    // THE WAGON COMES FIRST WHILE IT STILL HAS A LESSON ON THE SHELF. Otherwise a card he is
    // already carrying sends him walking across the whole map, and the card still sitting in
    // front of the Merchant, the one that teaches the other half of the rule about abilities,
    // is never bought at all. Nothing on the shelf means the promise he carries takes over.
    if (this.knows("merchant") && this.shopItem()) return this.s.merchantCentury;
    const relic = (me.hand || []).find((c) => c.ability_type !== "active");
    if (relic && this.knows("buy")) return relic.delivery_century;   // a promise to keep
    return null;
  }

  /* ══ THE DELIVERY ══
     The whole point of the game, met last of the basic loop and only once he is holding
     something worth delivering: a relic bought with gold he minted, carried to the century
     printed on its face, handed over for the first CONTRACT POINT. */
  deliverDecision(cards) {
    this.reqN += 1;
    const rid = "tut-deliver-" + this.reqN;
    return new Promise((resolve) => {
      this.conn.onRespond = (id, data) => { this.conn.onRespond = null; resolve(data || {}); };
      this.game.onMessage("decision", {
        kind: "deliver", seat: SELF, request_id: rid,
        options: { deliverable: cards, century: this.s.century },
      });
    });
  }

  async deliveryPhase() {
    const me = this.s.travelers[SELF];
    const due = (me.hand || []).filter((c) => c.delivery_century === this.s.century);
    if (!due.length) return;
    this.game.setPhase("delivery");
    if (this.game.banner) this.game.banner("delivery");
    await wait(1700);

    // THE STAGE OPENS BEFORE THE QUESTION IS ASKED. A delivery is not answered in a popup:
    // the game hands it to the cabinet, where the relic is dragged out of the case into the
    // century's folder and FILED with the lock on the case. Both of those were still hidden
    // when the question was asked, so a traveller standing on his delivery century had no
    // drawer to drop into and no lock to turn, and the hour could never close. The cabinet
    // and the lock are opened first now, and only then is he asked to hand it over.
    this.game.__tutScenes.add("drawer");
    this.reveal("tut-show-nav");
    this.reveal("tut-show-maletafull");            // the case's lock IS the FILE control
    await this.revealDrawer(this.drawerKeyFor(this.s.century));
    this.game.camera.setScene("drawer");
    await wait(900);

    await this.tell(L.deliverAsk);
    const data = await this.deliverDecision(due);
    const names = new Set((data && data.deliver) || due.map((c) => c.name));
    let any = false;
    for (const card of due) {
      if (!names.has(card.name)) continue;
      me.hand = me.hand.filter((c) => c.name !== card.name);
      me.receptor = [...(me.receptor || []), card];     // it rests in the drawer from now on
      me.contract_points += 1;
      // and the PERIOD is sealed under his name, which is what files the contract in his
      // case and stamps the seal on his own file
      const period = this.drawerKeyFor(card.delivery_century);
      me.periods = [...new Set([...(me.periods || []), period])];
      any = true;
    }
    if (!any) return;
    this.learn("deliver");
    this.pushState();
    await wait(500);
    // he is already standing at the open cabinet, and what he just filed is inside it, so
    // the receptor is named over the drawer that now holds his own relic
    if (!this.knows("receptor")) {
      this.learn("receptor");
      this.bitMaterialize(document.getElementById("drawer-zone"));
      this.glow("#drawer-zone");
      await this.tell(L.receptor);
      this.unglow();
    }
    this.game.camera.setScene("main");             // back to the desk with the point banked
    await wait(800);
    await this.revealMaletaLabel("contracts");     // the case earns its last-but-one word
    this.glow("#rucksack-zone, .vital-chip.vc-cp");
    await this.tell(L.delivered);
    this.unglow();
    await this.rewardBeat();                   // the point buys him a favour, and a ticket
    // THE LESSON DOES NOT STOP HERE. A first delivery used to be the last thing it had to
    // say, which left a traveller holding a point and no idea what it was for. So the chart
    // comes off its roll, and then he is finally told how the thing ends.
    await this.openMap();
    await this.endingBeat();
  }

  // How it ends, told once the chart is open in front of him, because two of the three ways
  // out are things he can now see: the drawer he just filed a relic in, and Year Zero sitting
  // at the far end of the years he has just been given.
  async endingBeat() {
    if (this.knows("ending")) return;
    this.learn("ending");
    this.frame("#timeline-rail", "green");
    await this.tell(L.ending);
    this.unframe();
  }

  /* ══ THE RIVAL GETS RICH, THEN GETS A BLADE, THEN KILLS HIM ══
     Death is the last thing taught, and only once he has scored a point of his own, so it
     lands on someone who already understands what he is losing. It arrives readably: the
     coin piles up on their file where he can see it, the blade is bought in the open, and
     only then does it come down. Then he stands back up, which is the actual lesson. */
  async richRivalBeat() {
    const r = this.s.travelers[RIVAL];
    if (!this.knows("deliver") || this.knows("death")) return;
    // THE PURSE MUST ACTUALLY BECOME LETHAL. The blade cuts for exactly as much gold as its
    // owner carries, and this used to stop dead at twelve while the traveller's own life kept
    // climbing past it on the recharge every single hour. So the cut could never land, and
    // death, the weapon and the payback, the last four things the lesson has to teach, were
    // never reached at all. They now save toward his life itself, closing half the distance
    // each hour, so it arrives soon and it arrives readably on their file.
    const life = this.s.travelers[SELF].energy;
    if (r.gold < life + 1) r.gold += Math.max(2, Math.ceil((life + 1 - r.gold) / 2));
    if (!this._saidRich && r.gold >= 4) {
      this._saidRich = true;
      this.pushState(); await wait(300);
      this.glow("#players-zone .pcard");
      await this.tell(L.richRival);
      this.unglow();
    }
    if (!r.hand.length && r.gold >= BLADE.gold_cost + 4) {
      r.gold -= BLADE.gold_cost;
      r.hand = [BLADE];
      this.pushState(); await wait(400);
      this.bitMaterialize(document.querySelector("#players-zone .pcard"));
      this.glow("#players-zone .pcard");
      await this.tell(L.bladeBought);
      this.unglow();
    }
  }

  // The Activation phase, met from the wrong end: the rival spends it on him.
  async activationPhase() {
    const me = this.s.travelers[SELF], r = this.s.travelers[RIVAL];
    if (this.knows("death") || !r.hand.length) return;
    if (this.s.rivalCentury !== this.s.century) return;     // the blade needs them synchronic
    if (r.gold < me.energy) return;                          // and it must actually be lethal
    this.game.setPhase("activation");
    if (this.game.banner) this.game.banner("activation");
    await wait(1700);
    this.learn("activation");
    me.energy = Math.max(0, me.energy - r.gold);
    this.pushState(); await wait(300);
    this.frame(".vital-ekg", "red");
    this.glow("#players-zone .pcard");
    await this.tell(L.bladeBought.replace("They bought a blade. It cuts", "The blade cuts"));
    this.unglow();
    if (me.energy > 0) return;
    // TERMINATED: the equipment is recycled into the energy he comes back with, the killer
    // takes a point and the Wanted mark, and he sits out the rest of this hour.
    const recycled = (me.hand || []).reduce((n, c) => n + (c.recycle_value || 0), 0);
    me.hand = [];
    me.terminated = true; me.awaitingRespawn = true;
    me.respawnEnergy = 12 + recycled;
    r.contract_points += 1; r.wanted = true;
    this.learn("death");
    this.pushState(); await wait(600);
    await this.tell(L.killed);
  }

  // His OWN activation, the last thing he learns: the item in his case has a trigger and
  // he is the one who decides when it is pulled. Same shape as the paradox and the blade,
  // he met it as a victim first.
  activationDecision(actives) {
    this.reqN += 1;
    const rid = "tut-act-" + this.reqN;
    return new Promise((resolve) => {
      this.conn.onRespond = (id, data) => { this.conn.onRespond = null; resolve(data || {}); };
      this.game.onMessage("decision", {
        kind: "activation", seat: SELF, request_id: rid,
        options: { actives: actives.map((c) => ({ ...c })) },
      });
    });
  }

  async paybackPhase() {
    const me = this.s.travelers[SELF], r = this.s.travelers[RIVAL];
    if (!this.knows("weapon") || this.knows("payback")) return;
    const gun = (me.hand || []).find((c) => c.ability_type === "active");
    if (!gun) return;
    if (this.s.rivalCentury !== this.s.century) return;    // the gun needs them synchronic
    this.game.setPhase("activation");
    if (this.game.banner) this.game.banner("activation");
    await wait(1700);
    this.glow("#rucksack-zone");
    await this.tell(L.paybackAsk);
    this.unglow();
    const data = await this.activationDecision([gun]);
    const fired = ((data && data.activations) || []).some((a) => a && a.card === gun.name);
    if (!fired) return;
    r.energy = Math.max(0, r.energy - 6);
    this.learn("payback");
    this.pushState();
    await wait(400);
    this.glow("#players-zone .pcard");
    await this.tell(L.payback);
    this.unglow();
  }

  // Start of the next hour: he comes back at XXX, gold and heat intact.
  async respawnBeat() {
    const me = this.s.travelers[SELF];
    if (!me.awaitingRespawn) return;
    me.awaitingRespawn = false;
    me.energy = me.respawnEnergy || 12;
    this.s.century = 30;
    this.pushState(); await wait(500);
    this.bitMaterialize(document.querySelector("#timeline-rail [data-c=\"30\"]"));
    this.frame(".vital-ekg", "green");
    await this.tell(L.respawned);
    this.unglow();
  }

  /* ══ GRADUATION ══
     The lesson ends because he PROVED every element, not because a counter ran out. She
     names what he learned, then hands him back the door to a real match. */
  async graduate() {
    document.body.classList.remove("tut-rolling", "tut-allocating", "tut-spot");
    this.game.cleanUpGenerators();
    await wait(500);
    await this.tell(L.gradIntro);
    await this.tell(L.gradList);
    await this.tell(L.gradEnd);
    await wait(400);
    this.showBlack();                        // the table goes dark the way it woke
    await wait(1500);
    this.handBack();
  }

  // Something in the lesson broke. She says so, in her own voice, and the board is left
  // exactly where it is so nothing is yanked away from him. Being told is survivable;
  // being silently returned to the main menu is not.
  async breakDown() {
    document.body.classList.remove("tut-rolling", "tut-allocating", "tut-valve-need", "tut-spot");
    this.unglow();
    try {
      await this.tell("Something in my machinery just gave out, traveller. Not your doing. "
        + "Leave the table and come back, and I will start you again from the beginning.");
    } catch (e) {}
  }

  // back to the door he came in through, with the tutorial's fingerprints wiped off
  handBack() {
    ["tut", "tut-2x2", "tut-waking", "tut-mod3", "tut-show-paradox", "tut-rolling",
      "tut-allocating", "tut-spot", "tut-badge-intro", "gen-cleaned", "gen-live",
      "tut-show-dice", "tut-show-travel", "tut-show-vitals", "tut-show-rival",
      "tut-show-maleta", "tut-show-valve", "tut-show-nav"].forEach((c) => document.body.classList.remove(c));
    ["tut-hela", "tut-eye-hint", "tut-black"].forEach((id) => {
      const n = document.getElementById(id); if (n) n.remove();
    });
    if (this._railObs) this._railObs.disconnect();
    if (this._hostObs) this._hostObs.disconnect();
    if (this._malaObs) this._malaObs.disconnect();
    window.__helaMute = false;
    ["screen-landing", "screen-lobby", "screen-game"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("is-active", id === "screen-landing");
    });
  }

  // A rival with a blade follows him, up the centuries or down. Same one-step pace and
  // the same anti-swap guard the wagon uses.
  huntStep() {
    const r = this.s.travelers[RIVAL];
    if (!r.hand || !r.hand.length || this.knows("payback")) return;
    const gap = this.s.century - this.s.rivalCentury;
    if (Math.abs(gap) < 1) return;
    this.s.rivalCentury += Math.sign(gap);
    this.pushState();
  }

  // The cabinet's drawers are earned one at a time. A century belongs to one period, and
  // that period's drawer opens the first time something of his is filed in it.
  drawerKeyFor(century) {
    if (century >= 21) return "Singularity";
    if (century >= 11) return "Ascension";
    return "Origins";
  }
  async revealDrawer(key) {
    const cls = "tut-drawer-" + key.toLowerCase();
    if (document.body.classList.contains(cls)) return;
    this.reveal(cls);
    await wait(120);
    const cell = document.querySelector(`#drawer-zone .cab2-cell[data-drawer="${key}"]`);
    if (cell) { cell.classList.add("tut-new"); setTimeout(() => cell.classList.remove("tut-new"), 1600); }
    this.bitMaterialize(cell);
    await wait(500);
  }

  /* ══ THE REWARD FOR A POINT ══
     A contract point is not just a number: it opens the CONTRACTS drawer, where the
     traveller signs one of three kinds of favour and a generator decides how big it is.
     This is also where his first ticket comes from, and the last word on his case. */
  static get REWARDS() {
    return {
      Chaos: ["Every other traveller loses three energy.",
              "Destroy a card, from the Market or off a rival.",
              "Move the Merchant to any century you like."],
      Time: ["A solo generators phase, all to yourself.",
             "A market ticket: trade wherever you stand.",
             "An item ticket: one more activation window."],
      Resource: ["Three energy and three gold.",
                 "Steal a revealed Merchant card.",
                 "A permanent point of power on one module."],
    };
  }
  rewardDecision(cats) {
    this.reqN += 1;
    const rid = "tut-reward-" + this.reqN;
    return new Promise((resolve) => {
      this.conn.onRespond = (id, data) => { this.conn.onRespond = null; resolve(data || {}); };
      this.game.onMessage("decision", {
        kind: "reward_category", seat: SELF, request_id: rid,
        options: { categories: cats },
      });
    });
  }

  async rewardBeat() {
    if (this.knows("reward")) return;
    const me = this.s.travelers[SELF];
    this.learn("reward");
    await this.revealDrawer("CONTRACTS");        // the drawer earns its place on the cabinet
    this.game.camera.setScene("drawer");
    await wait(1000);
    this.glow("#drawer-zone .cab2-contracts");
    await this.tell(L.rewardIntro);
    await this.tell(L.rewardPick);
    this.unglow();
    const cats = ["Chaos", "Time", "Resource"];
    const data = await this.rewardDecision(cats);
    const cat = (data && data.category && cats.includes(data.category)) ? data.category : "Time";
    const roll = this.rollDie();
    const text = (Tutorial.REWARDS[cat] || [])[roll - 1] || "";
    await wait(400);
    await this.tell(L.rewardRolled.replace("{cat}", cat).replace("{roll}", ["I", "II", "III"][roll - 1]).replace("{text}", text));
    // a Time reward is a ticket, and a ticket is the last thing his case had no word for
    if (cat === "Time") {
      // the roll decides WHICH ticket, and each one is its own field on the case
      const kind = ["solo_voucher", "market_voucher", "item_voucher"][roll - 1];
      me[kind] = (me[kind] || 0) + 1;
      this.game.camera.setScene("main");
      await wait(800);
      await this.revealMaletaLabel("vouchers");
      this.glow("#rucksack-zone");
      await this.tell(L.voucherGot);
      this.unglow();
    } else {
      if (cat === "Resource" && roll === 1) { me.energy += 3; me.gold += 3; }
      this.game.camera.setScene("main");
      await wait(800);
    }
    this.pushState();
  }

  moveMerchant() {
    if (!this.knows("merchant") || !this.shopItem()) return;
    const gap = this.s.century - this.s.merchantCentury;
    const moved = this._lastCentury != null && this._lastCentury !== this.s.century;
    this._lastCentury = this.s.century;
    if (gap === 0) return;
    // Hold off on the last century WHILE HE IS STILL WALKING. The wagon used to refuse any
    // gap of one so the two of them could not swap places hour after hour and never meet.
    // But a traveller who simply stops walking, and a beginner who pours every generator into
    // Recharge because more life looks like the safe play does exactly that, then leaves the
    // wagon parked one century away for ever: I watched it sit there for twelve straight
    // hours with the lesson frozen and no way out of it. So the last step is refused only
    // while he is actually closing the distance himself. The moment he stands still, the
    // wagon takes it, and the Market can finally happen.
    if (Math.abs(gap) === 1 && moved) return;
    this.s.merchantCentury += Math.sign(gap);      // one century an hour, the wagon's own pace
    this.pushState();
  }

  // Whatever the lesson needs him to own next, and nothing else on the shelf beside it.
  shopItem() {
    if (!this.knows("buy")) return RELIC;
    if (this.knows("death") && !this.knows("weapon")) return WEAPON;
    // once he has delivered, the wagon goes back to being a wagon: it stocks ordinary cards,
    // a passive first and then an active, which is how the rule about abilities gets taught
    // by owning them rather than by being lectured about them
    if (this.knows("deliver") && !this.knows("passive")) return TESLA;
    if (this.knows("passive") && !this.knows("active")) return MERCATOR;
    return null;
  }

  // The shelf is the REAL market decision, stocked with one card. He buys it with his own
  // gold, in the wagon, by clicking it. Nothing is bought for him.
  marketDecision() {
    this.reqN += 1;
    const rid = "tut-market-" + this.reqN;
    return new Promise((resolve) => {
      this.conn.onRespond = (id, data) => { this.conn.onRespond = null; resolve(data || {}); };
      this.game.onMessage("decision", {
        kind: "market", seat: SELF, request_id: rid,
        options: { buyable: [{ ...this.shopItem(), secret: false }], renewable: [], can_declare: false, gold: this.s.travelers[SELF].gold },
      });
    });
  }

  async marketPhase() {
    const me = this.s.travelers[SELF];
    const item = this.shopItem();
    if (!item || !this.knows("merchant")) return;
    if (this.s.century !== this.s.merchantCentury) return;      // the rule: stand in his year
    if (me.gold < item.gold_cost) return;                       // and be able to pay
    this.game.setPhase("market");
    if (this.game.banner) this.game.banner("market");
    await wait(1700);
    this.game.__tutScenes.add("market");                        // the wagon is reachable now
    this.reveal("tut-show-nav");
    this.game.camera.setScene("market");
    await wait(1100);                                           // let the pan land before speaking
    this.pushState();
    await wait(300);
    if (item === RELIC) {
      this.bitMaterialize(document.getElementById("market-zone"));
      await this.tell(L.marketScene);
      this.frame("#market-sign", "green");
      await this.tell(L.merchantSign);
      this.unglow();
    }
    const data = await this.marketDecision();
    // the one relic on the shelf is pointed at, by name, before he is asked to buy it
    await wait(260);
    this.glow("#market-zone .card");
    if (item === RELIC) {
      await this.tell(L.marketCard);
      this.frame("#market-zone .card .card-deliver", "green");
      await this.tell(L.marketPromise);
    } else if (item === TESLA || item === MERCATOR) {
      // the card prints its own NATURE on its face, which is the thing being taught, so that
      // is what gets traced. The full wording lives in the hover, and she says so.
      this.frame("#market-zone .card .card-type", "green");
      await this.tell(item === TESLA ? L.shelfPassive : L.shelfActive);
    } else {
      await this.tell(L.weaponUp);
    }
    this.unglow();
    if (!data || data.action !== "buy") return;
    me.gold = Math.max(0, me.gold - item.gold_cost);
    me.hand = [...(me.hand || []), item];
    this.pushState();
    await wait(500);
    this.game.camera.setScene("main");                          // back to the desk with the goods
    await wait(700);
    if (item === RELIC) {
      this.learn("buy");
      await this.revealMaletaLabel("equipment");                // the case earns its next word
      this.glow("#rucksack-zone");
      await this.tell(L.bought.replace("{c}", roman(RELIC.delivery_century)));
      this.unglow();
      this.learn("carry");        // he knows where it has to go; the road is the rest
      this.game.__tutScenes.add("drawer");     // he may go and look at the receptor now
      this.reveal("tut-show-nav");
    } else if (item === TESLA) {
      // A PASSIVE is owned, not played. It is already working, in the case, and the proof is
      // that the next boom he takes pays him, which he will see happen without touching it.
      this.learn("passive");
      this.glow("#rucksack-zone");
      await this.tell(L.passiveGot);
      this.unglow();
    } else if (item === MERCATOR) {
      // An ACTIVE waits for him. Same case, same shelf, opposite nature, and that contrast
      // is the rule: a card either works on its own or waits to be pulled.
      this.learn("active");
      this.glow("#rucksack-zone");
      await this.tell(L.activeGot);
      this.unglow();
      await this.tell(L.abilityRule);
    } else {
      this.learn("weapon");
      this.glow("#rucksack-zone");
      await this.tell(L.weaponBought);
      this.unglow();
    }
  }

  // The rest of the rival's dossier opens the first time they have coin, because that is
  // the first moment anything about them beyond a pulse actually matters to him.
  async checkRivalFile() {
    const r = this.s.travelers[RIVAL];
    if (this.knows("rivalfile") || !this.shownRival || r.gold <= 0) return;
    this.learn("rivalfile");
    this.reveal("tut-show-rivalfull");
    this.pushState();
    await wait(120);
    this.bitMaterialize(document.querySelector("#players-zone .pcard .csheet")
      || document.querySelector("#players-zone .pcard"));
    await wait(500);
    this.glow("#players-zone .pcard .csheet");
    await this.tell(L.rivalFile);
    this.unglow();
  }

  // the rival's own hand resolves too, quietly: it is what puts him in another century
  applyRival(rm) {
    if (!rm) return;
    const r = this.s.travelers[RIVAL];
    if (rm[0][0]) r.energy += rm[0][0];
    if (rm[0][1]) r.gold += rm[0][1];
    if (rm[0][2]) { r.energy += rm[0][2]; r.gold += rm[0][2]; }   // the greedy module pays them both, same as his
    if (rm[2][0]) r.booms += rm[2][0];
    if (rm[2][1]) this.s.rivalCentury = Math.max(0, this.s.rivalCentury - rm[2][1]);
  }

  // THE ESCAPE VALVE is taught at the exact moment it is needed: a generator is left in
  // hand with no lawful module anywhere on the machine. Not a beat earlier.
  // Is a generator stranded right now, with no lawful module anywhere on the machine?
  strandedDie() {
    const g = this.game;
    if (!g || !g.alloc || !g.alloc.pool.length) return false;
    const can = this._realCanPlace || g.canPlace.bind(g);
    const v = g.alloc.pool[0], d = { value: v, source: "pool", idx: 0 };
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < this.modules; c++)
        if (can(r, c, v, d)) return false;
    return true;
  }

  // THE VALVE IS A DEAD END IF HE MISSES IT. Confirm stays disabled while a generator is
  // in his hand, so a traveller who does not find the slot cannot finish the hour at all.
  // So the slot is not mentioned once and forgotten: it burns, continuously, for exactly
  // as long as he is holding something that has nowhere else to go.
  maybeTeachValve() {
    if (this._teaching) return;
    const stranded = this.strandedDie();
    if (stranded && !this.shownValve) {
      this.shownValve = true;
      this.learn("valve");
      this.reveal("tut-show-valve");
      document.body.classList.add("tut-valve-need");   // the slot starts burning at once
      (async () => {
        await wait(80);
        this.frame("#dice-body .escape-slot", "red");
        await this.tell(L.valve);
        await this.tell(L.valveWhere);
        this.unframe();
        this.hold(this._curPrompt);
      })();
      return;
    }
    // taught already, or the line is still playing: keep the slot lit while it is needed
    document.body.classList.toggle("tut-valve-need", stranded);
    if (!stranded) this.unframe();
  }

  // Once every module and every function is on the screen there is nothing left to
  // reduce, so the tutorial's own layout override is dropped and the machine goes back
  // to being laid out exactly as it is in a real match.
  async unreduceMachine() {
    if (!this.knows("module3") || !this.knows("paradox")) return;
    document.body.classList.remove("tut-2x2");
    this.game.renderMachineIdle();
    await wait(400);
    if (!this.knows("tab")) {
      this.learn("tab");
      // open the game's OWN reference card, the same one T opens in a real match, so what
      // he is told about is the exact thing he will summon later
      // She speaks FIRST and then gets out of the way. Talking over the card meant her
      // caption sat on top of the very rows she was telling him to read.
      await this.tell(L.tabHelp);
      this.game._manoHelpToggle(true);
      // the game hands the visible class to a requestAnimationFrame, and a page that is
      // not actively painting may never run it. The lesson cannot depend on that.
      const card = document.getElementById("mano-help");
      if (card) card.classList.add("on");
      if (window.__helaSay) window.__helaSay("", { ms: 1, force: true, jump: true });   // her voice clears the card
      this._eyeHint.style.display = "";
      await this._awaitAnyClick();          // he reads it for as long as he likes
      this._eyeHint.style.display = "none";
      this.game._manoHelpToggle(false);
      if (card) card.classList.remove("on");
      await wait(400);
    }
  }

  // a function overloads when every module it HAS is filled (two at this stage, three later)
  overloadedRows(mm) {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      let filled = 0;
      for (let c = 0; c < this.modules; c++) if (mm[r] && mm[r][c]) filled++;
      if (filled >= this.modules) rows.push(r);
    }
    return rows;
  }

  // the classic hacker roll: each generator churns 0s and 1s for 800ms before its
  // numeral snaps in. A first-timer must SEE the dice compute their values, so the
  // tutorial rolls slower than a real match, but not so slow that watching it drags.
  slowRoll(pool) {
    const dice = [...pool.querySelectorAll(".die")];
    if (!dice.length) return;
    const GLYPHS = "01101001011010010110";
    dice.forEach((d, i) => {
      const face = d.querySelector(".pips-face");
      if (!face) return;
      const finalTxt = face.textContent;
      d.classList.add("rolling");
      const start = performance.now();
      const dur = 800 + i * 120;                 // staggered so they land one after another
      const tick = (now) => {
        if (now - start >= dur) {
          face.textContent = finalTxt;
          d.classList.remove("rolling"); d.classList.add("rolled");
          try { window.__audio && window.__audio.play("dice_lock"); } catch (e) {}
          setTimeout(() => d.classList.remove("rolled"), 360);
          return;
        }
        let s = ""; for (let k = 0; k < 2; k++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        face.textContent = s;
        setTimeout(() => requestAnimationFrame(tick), 55);
      };
      requestAnimationFrame(tick);
    });
  }
  // wait for the previous hour's finalisation rite (seal) to run AND finish, fully,
  // before anything else this hour, so nothing overlaps.
  async awaitSeal() {
    for (let i = 0; i < 14; i++) { if (document.body.classList.contains("hh-sealing")) break; await wait(120); }
    for (let i = 0; i < 42; i++) { if (!document.body.classList.contains("hh-sealing")) break; await wait(120); }
    await wait(250);
  }
  // the GENERATORS phase title sweeps the stage; the dice deal only AFTER it clears
  async generatorsPhase() {
    this.game.setPhase("main");                       // the phase is LIVE: the screen lights and stays lit
    if (this.game.banner) this.game.banner("main");   // "Causality Generators", Hour N
    await wait(1950);
  }

  // ---- the illegal move, allowed then taught ----
  // The real machine simply refuses a die whose value clashes with the function
  // it is dropped into. The tutorial instead LETS the traveller try it, so the
  // rule is learned by doing: the mismatched die goes in, HELA names the rule,
  // and the die is handed back for the correct placement.
  setupIllegalLesson() {
    const g = this.game;
    const realCanPlace = g.canPlace.bind(g);
    this._realCanPlace = realCanPlace;   // the machine's true answer, kept for the valve check
    g.canPlace = (r, c, v, drag) => {
      if (realCanPlace(r, c, v, drag)) return true;
      if (this.taughtOneValue) return false;   // rule learned: the machine enforces it normally, no illegal placement
      if (!g.alloc || g.alloc.unavailable.has(r)) return false;
      if (g.alloc.matrix[r][c] !== 0) return false;
      if (c > 0) {   // still honour fill-left-to-right
        const prev = g.alloc.matrix[r][c - 1];
        const movingOut = drag && drag.source === "cell" && +drag.r === r && +drag.c === c - 1;
        if (prev === 0 || movingOut) return false;
      }
      // the ONLY remaining block is the one-value rule: permit it ONCE, so the player can try the illegal move
      const existing = g.alloc.matrix[r].filter((x, i) => x !== 0 && !(drag && drag.source === "cell" && +drag.r === r && i === +drag.c));
      return !!(existing.length && existing[0] !== v);
    };
    const realAfter = g.afterPlace.bind(g);
    g.afterPlace = () => {
      const js = g._justSocketed;            // capture before the real hook clears it
      realAfter();
      if (!g.alloc || this._teaching) return;
      let bad = -1;
      for (let r = 0; r < 3; r++) {
        const vals = g.alloc.matrix[r].filter((x) => x !== 0);
        if (vals.length >= 2 && vals.some((x) => x !== vals[0])) { bad = r; break; }
      }
      this.maybeTeachValve();
      if (bad >= 0) {
        const cf = document.getElementById("confirm-alloc");   // an illegal matrix can NEVER be sealed
        if (cf) cf.disabled = true;
        this.teachOneValue(bad, js);
      }
    };
  }

  async teachOneValue(bad, js) {
    this._teaching = true;
    this.hold(L.oneValue);                   // HELA names the rule, in her eye
    // call literal visual attention to the clashing function
    const g = this.game, cells = [];
    g.dom.machine.querySelectorAll(`.cell[data-r="${bad}"]`).forEach((n) => { if (n.querySelector(".die")) { n.classList.add("tut-attn"); cells.push(n); } });
    await wait(1600);
    cells.forEach((n) => n.classList.remove("tut-attn"));
    // hand the mismatched die back: the just-placed one if it sits in the clashing row, else the rightmost
    const row = g.alloc.matrix[bad];
    let mc = (js && js.r === bad && row[js.c]) ? js.c : -1;
    if (mc < 0) for (let c = 2; c >= 0; c--) if (row[c] !== 0) { mc = c; break; }
    if (mc >= 0) { g.alloc.pool.push(row[mc]); row[mc] = 0; g.renderMachineAlloc(); g.renderDiceCockpit(); }
    this.taughtOneValue = true; this.learn("oneValue");   // learned: from here the machine refuses the illegal move on its own
    this.hold(this._curPrompt);              // restore the standing prompt
    this._teaching = false;
    this.maybeTeachValve();                  // the die she just handed back may have nowhere to go
  }

  // drive one allocation and wait for the player to confirm
  allocate({ dice, unavailable }) {
    this.reqN += 1;
    const rid = "tut-" + this.reqN;
    return new Promise((resolve) => {
      this.conn.onRespond = (id, data) => {
        this.conn.onRespond = null;
        document.body.classList.remove("tut-allocating", "tut-valve-need");
        this._curPrompt = "";
        this.clearSay();               // the instruction is spent the moment he confirms
        this.unframe();
        resolve(data);
      };
      this.game._rollFx = true;   // the classic binary roll: the dice churn 0s and 1s, then their faces snap in
      this.game.onMessage("decision", {
        kind: "allocate", seat: SELF, request_id: rid,
        options: { dice: dice.slice(), unavailable_functions: unavailable || [] },
      });
      document.body.classList.add("tut-allocating");   // the dice glow to call the eye; nothing moves (no zoom)
    });
  }

  // ---- resolution helpers: nothing resolves fast or silently ----
  // keep the confirmed matrix on the machine so the placed dice stay visible + glow-able
  showMatrix(m) {
    const mc = this.game.dom.machine;
    if (!mc) return;
    mc.innerHTML = "";
    mc.appendChild(this.game.matrixEl(m, {}));
  }
  glowCell(r, c) {
    const cell = this.game.dom.machine && this.game.dom.machine.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) { cell.classList.add("tut-attn"); document.body.classList.add("tut-spot"); }   // the rest of the board dims
  }
  glow(sel) { document.querySelectorAll(sel).forEach((n) => n.classList.add("tut-attn")); }

  // ---- PRESENTING A PIECE OF THE UI ----
  // Whenever HELA names a part of the board for the first time, that part gets traced,
  // whole, so the traveller knows exactly which shape she means. SVG parts are traced
  // inside the artwork (the outline rides along when the device moves or scales);
  // plain elements get an overlay box.
  frame(sel, tone = "red") {
    const el = document.querySelector(sel);
    if (!el) return;
    this._frames = this._frames || [];
    if (el.ownerSVGElement) {
      let b; try { b = el.getBBox(); } catch (e) { return; }
      if (!b || !b.width) return;
      const pad = 7;
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("class", `tut-frame tut-frame-${tone}`);
      r.setAttribute("x", b.x - pad); r.setAttribute("y", b.y - pad);
      r.setAttribute("width", b.width + pad * 2); r.setAttribute("height", b.height + pad * 2);
      r.setAttribute("rx", "9"); r.setAttribute("fill", "none");
      el.parentNode.appendChild(r);
      this._frames.push(r);
    } else {
      const rc = el.getBoundingClientRect();
      if (!rc.width || !rc.height) return;
      // refuse to trace something that fills the screen: that is not pointing, that is
      // just drawing a box around everything
      if (rc.width > window.innerWidth * 0.8 && rc.height > window.innerHeight * 0.6) return;
      const d = document.createElement("div");
      d.className = `tut-frame-box tut-frame-${tone}`;
      d.style.cssText = `left:${rc.left - 6}px;top:${rc.top - 6}px;width:${rc.width + 12}px;height:${rc.height + 12}px;`;
      document.body.appendChild(d);
      this._frames.push(d);
    }
  }
  unframe() { (this._frames || []).forEach((n) => n.remove()); this._frames = []; }
  unglow() {
    document.querySelectorAll(".tut-attn").forEach((n) => n.classList.remove("tut-attn"));
    document.body.classList.remove("tut-spot");
    this.unframe();
  }

  // the classic 0s-and-1s materialisation, over any object as it forms
  bitMaterialize(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const ov = document.createElement("div");
    ov.className = "tut-bitmat";
    ov.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    const N = Math.max(16, Math.min(70, Math.round((r.width * r.height) / 1500)));
    let h = "";
    for (let i = 0; i < N; i++)
      h += `<span style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(Math.random() * 700) | 0}ms">${Math.random() < 0.5 ? "0" : "1"}</span>`;
    ov.innerHTML = h;
    document.body.appendChild(ov);
    if (el.classList) { el.classList.add("tut-materialize"); setTimeout(() => el.classList.remove("tut-materialize"), 1000); }
    setTimeout(() => ov.remove(), 1600);
  }

  async materializeMaleta() {
    this.reveal("tut-show-maleta");
    await wait(60);
    this.setupMaletaGuard();               // mask the recess labels; they surface one by one
    this.applyMaletaCovers();
    this.bitMaterialize(document.getElementById("rucksack-zone"));
    await wait(700);
  }

  async introRival() {
    this.reveal("tut-show-rival");
    await wait(140);
    const card = document.querySelector("#players-zone .pcard") || document.querySelector("#players-zone .badge");
    this.bitMaterialize(card);                 // it forms out of the 0s and 1s where it lives
    if (card) card.classList.add("tut-attn");
    this.learn("rival");
    await this.tell(L.rival);
    if (card) card.classList.remove("tut-attn");
  }

  // TRAVEL is plotted BY HAND: the reachable centuries invite a click; the player may
  // hold, or cross up to the die's value toward Year Zero, and picks the landing himself.
  // Hand the chart the REAL travel decision. It arms the reachable worlds, lets him
  // hold where he is by clicking his own century, and answers {direction, distance}.
  // The chart's own cost rule: one energy per century crossed into the past, and TWO
  // for every century from the ninth down, where the years press hardest.
  travelCost(from, dist) {
    let c = 0;
    for (let s = 1; s <= dist; s++) {
      const d = from - s;
      if (d <= 0) break;
      c += d <= 9 ? 2 : 1;
    }
    return c;
  }

  travelDecision(V) {
    this.reqN += 1;
    const rid = "tut-travel-" + this.reqN;
    return new Promise((resolve) => {
      this.conn.onRespond = (id, data) => { this.conn.onRespond = null; resolve(data || {}); };
      this.game.onMessage("decision", {
        kind: "travel", seat: SELF, request_id: rid,
        options: {
          module: 8, max: V, century: this.s.century,
          energy: this.s.travelers[SELF].energy,
          energy_per_past_century: 1,     // crossing the years COSTS, the same as a real match
        },
      });
    });
  }

  async plotTravel(V) {
    const from = this.s.century;
    if (!this.taughtTravel) await this.tell(L.travelAsk.replace(/\{n\}/g, V));
    else if (!this._travelCued) { this._travelCued = 1; this.hold(L.travelAgain.replace(/\{n\}/g, V)); }
    else this.hold("");                          // the armed chart is the cue by now
    // The chart already knows how to plot a voyage: hand it the REAL travel decision and
    // it arms the reachable centuries, lets him hold where he is by clicking his own
    // world, and answers with the direction and the distance. Nothing to reinvent.
    const data = await this.travelDecision(V);
    const dist = Math.max(0, Math.min(V, parseInt(data && data.distance, 10) || 0));
    const dir = (data && data.direction === 1) ? 1 : -1;      // he picks the way himself
    this.s.century = Math.max(0, Math.min(30, from + dir * dist));
    // THE CROSSING IS PAID FOR. Every century into the past burns energy, and the deep
    // centuries burn double. Hiding that would teach a game that does not exist.
    const cost = dir < 0 ? this.travelCost(from, dist) : 0;
    const me = this.s.travelers[SELF];
    if (cost) me.energy = Math.max(0, me.energy - cost);
    this.pushState();
    await wait(650);                       // let the marker land on the chart
    const node = document.querySelector(`#timeline-rail [data-c="${this.s.century}"]`);
    if (node) { node.classList.add("tut-attn"); }
    this.learn("travel");
    if (!this.taughtTravel) {
      this.taughtTravel = true;
      if (cost) {
        this.frame(".vital-ekg", "red");   // and here is what it took out of you
        await this.tell(L.travelPaid.replace("{c}", cost).replace("{s}", cost === 1 ? "" : "s"));
      } else {
        await this.tell(L.travelHeld);
      }
    } else await wait(500);                // taught already: it just happens
    this.unglow();
  }

  async start() {
    window.__helaMute = true;            // silence the cabin's ambient HELA; the tutorial drives her
    this.game = new Game(this.conn, SELF);
    this.game.showWaiting = () => {};    // solo lesson: no "awaiting other operatives"
    window.__game = this.game;
    window.__tut = this;

    // lock the camera to the desk; the side scenes stay blocked
    const realSetScene = this.game.camera.setScene.bind(this.game.camera);
    this.game.__tutScenes = new Set(["main"]);
    this.game.camera.setScene = (n) => (this.game.__tutScenes.has(n) ? realSetScene(n) : undefined);
    this.setupIllegalLesson();           // let the player try the illegal move, then teach the rule
    this.game._animateRoll = (pool) => this.slowRoll(pool);   // the hacker roll, 800ms for a watcher

    document.body.classList.add("tut", "tut-2x2");
    ["screen-landing", "screen-lobby", "screen-game"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("is-active", id === "screen-game");
    });

    this.buildHela();
    this.wakeStart();                    // black, camera pushed into the desk, vision blurred
    this.game.begin({ seats: [{ name: SELF }, { name: RIVAL }] });
    this.game._introShown = true;        // my immersive wake replaces the desk-settle intro
    this.pushState();                    // the desk renders behind the black+blur
    this.setupMapGuard();                // keep the first-era cut applied through every re-render
    [200, 700, 1400, 2400, 3200].forEach((t) => setTimeout(() => this.limitMap(), t));
    this.stripHover();
    const strip = setInterval(() => this.stripHover(), 700);
    setTimeout(() => clearInterval(strip), 16000);

    await this.tellBig(L.wake[0]);       // "Wake up", any click lifts his head (big panel over black)
    this.wakeRise();                     // the slow camera lift back to the seat + the blur clears
    this._panel.style.display = "none";
    for (let i = 1; i < L.wake.length; i++) await this.tell(L.wake[i]);   // the rest speak from her eye, as it wakes
    await wait(700);

    this.reveal("tut-show-dice");
    this.reveal("tut-show-travel");      // TWO functions from the start (Recharge + Travel)
    this.reveal("tut-show-vitals");
    // NO TURN LIMIT. The lesson runs until every element on the checklist has been met.
    // The director makes sure each hour carries its own new thing, so this terminates by
    // teaching, not by counting. The cap is only a runaway guard, never the intended end.
    let n = 1, broken = 0;
    while (!this.graduated() && n <= 60) {
      // An hour that throws must not be swallowed and marched past. Doing that turned any
      // repeating fault into a silent sprint through every remaining hour, and the lesson
      // then "graduated" the player straight out to the main menu with all progress gone,
      // which is exactly what a tester reported. A fault now stops the run where it is.
      try { await this.oneTurn(n); broken = 0; }
      catch (e) {
        broken += 1;
        console.error("[tutorial] hour " + n + " broke:", e);
        window.__tutError = String((e && e.stack) || e);
        document.body.classList.remove("tut-rolling", "tut-allocating", "tut-valve-need");
        this._teaching = false;
        if (broken >= 2) { await this.breakDown(); return; }   // stop, do not dump him out
      }
      n += 1;
    }
    if (!this.graduated()) { await this.breakDown(); return; }  // ran out of hours: also a fault
    await this.graduate();
  }

  async oneTurn(n) {
    // ORDER IS SACRED. Nothing overlaps. The hour finalises, its title sweeps, THEN the
    // dice materialise slowly, THEN the player is invited to act.
    this.s.hour = n;
    // start-of-hour housekeeping: what blew at clean-up is now IN EFFECT, for everyone
    for (const who of [SELF, RIVAL]) {
      const t = this.s.travelers[who];
      t.ovl = [...(t.ovlNext || [])];
      t.ovlNext = [];
    }
    const sealed = [...(this.s.travelers[SELF].ovl || [])];
    this.pushState();
    if (n > 1) await this.awaitSeal();            // the previous hour is pressed & shelved, fully
    // The Merchant is met once the traveller can actually go to him, and the market
    // opens only when he is standing in the wagon's year. Market runs before Generators,
    // the same order a real Hour keeps.
    if (n >= 5 && !this.knows("merchant")) await this.introMerchant();
    await this.respawnBeat();     // whoever died last hour stands up first
    await this.deliveryPhase();   // Delivery opens the Hour, before the Market
    this.moveMerchant();          // the wagon travels too, whether or not he does
    this.huntStep();              // and whoever is carrying a blade keeps following
    await this.marketPhase();

    await this.checkRivalFile();  // their first coin unfolds the rest of their dossier
    await this.richRivalBeat();   // the purse across the table keeps filling
    await this.activationPhase(); // and eventually it is spent on him
    await this.paybackPhase();    // and then he answers with one of his own

    await this.generatorsPhase();                 // the GENERATORS phase title, then it clears
    // Once the basics are known the machine starts growing, a piece per hour. This runs
    // AFTER the phase opens, on purpose: the screen has to be lit for the new module to
    // materialise into something the traveller can actually see.
    if (this.knows("paradoxHit") && !this.knows("paradox")) {
      await this.growParadox();                 // hour four: he answers, now that he has been hit
    } else if (this.knows("paradox") && !this.knows("module3") && this.knows("overload")) {
      await this.growModule3();
    }
    if (sealed.length && !this.taughtSealed) { this.taughtSealed = true; await this.tell(L.sealed); }
    // the director chooses the hand so this hour carries its lesson (Paradox stays out
    // of the machine for now, along with anything sealed by an overload)
    const dice = this.planDice(n);
    const withheld = this.knows("paradox") ? [] : [1];   // Paradox is kept out until it is shown
    document.body.classList.add("tut-rolling");   // hands off while the generators compute
    const dealt = this.allocate({ dice, unavailable: withheld.concat(sealed) });   // the dice appear + churn 0s/1s
    await wait(1300);                             // the roll plays out IN FULL, uninterrupted
                                                  // (the last of four lands at 800 + 3x120)
    document.body.classList.remove("tut-rolling");
    if (n === 1) this.hold(L.t1prompt);
    else if (n <= 3) this.hold(L.prompt);        // after that the glowing generators say it
    else this.hold("");
    this.maybeTeachValve();                       // a hand with nowhere to go, from the start
    const data = await dealt;
    const m = data.matrix;
    // THE ONE-VALUE RULE IS ALSO LEARNED BY GETTING IT RIGHT. It used to be credited only
    // to a traveller who BROKE it, and the director keeps dealing mismatched pairs until it
    // is credited. So a careful player who never made the mistake was dealt nothing but
    // mismatched pairs for ever: the hand that mints gold was never reached, he could never
    // afford the relic, and the lesson ran to the runaway guard and broke down instead of
    // ending. Splitting a mismatched hand across two functions proves he has the rule, so
    // she gives him the credit and moves on.
    if (!this.taughtOneValue) {
      const placed = m.flat().filter((x) => x !== 0);
      const clash = m.some((row) => {
        const v = row.filter((x) => x !== 0);
        return v.length > 1 && v.some((x) => x !== v[0]);
      });
      if (!clash && new Set(placed).size > 1) {
        this.taughtOneValue = true; this.learn("oneValue");
        await this.tell(L.oneValueGood);
      }
    }
    if (this.shownRival) await this.revealBoth(m, this.planRival(n));
    await this.resolveTurn(m, n);
  }

  // push new state but KEEP the confirmed dice on the pip-boy (the state re-render would
  // otherwise clear the machine; the dice must stay until the phase ends)
  async restate(m) { this.pushState(); await wait(70); this.showMatrix(m); }

  // walk every module that fired, ONE at a time: apply it, glow the die that fired and
  // the thing it changed, let HELA name it, and hold on the player's own click. Nothing
  // materialises or resolves without a word and a beat to understand it.
  async resolveTurn(m, n) {
    const me = this.s.travelers[SELF];
    this.showMatrix(m);
    // 1) RECHARGE -> energy (life). Explained the FIRST time only; after that it just resolves.
    if (m[0][0]) {
      this.showMatrix(m); this.glowCell(0, 0); this.glow("#vz-holo, .vital-ekg");
      if (!this.taughtEnergy) {
        this.taughtEnergy = true; this.learn("energy"); this.learn("place");
        await this.tell(L.vitals);                         // what the bar is
        me.energy += m[0][0]; await this.restate(m);
        this.glowCell(0, 0); this.glow("#vz-holo, .vital-ekg");
        await this.tell(L.energyGot);                      // what the recharge did
      } else {
        me.energy += m[0][0]; await this.restate(m);
        this.glowCell(0, 0); this.glow("#vz-holo, .vital-ekg"); await wait(850);
      }
      this.unglow();
    }
    // 2) RECHARGE -> gold (the case materialises the first time)
    if (m[0][1]) {
      this.showMatrix(m); this.glowCell(0, 1);
      if (!this.shownMaleta) { this.shownMaleta = true; await this.materializeMaleta(); }
      me.gold += m[0][1]; await this.restate(m);
      await this.revealMaletaLabel("gold");
      this.glowCell(0, 1); this.glow("#rucksack-zone");
      if (!this.taughtGold) { this.taughtGold = true; this.learn("gold"); await this.tell(L.goldCase); }
      else await wait(850);
      this.unglow();
    }
    // 2.5) PARADOX resolves between recharge and heat, the real order. He feels the
    // rival's before he owns the function, then the rival's own hand carries him away.
    await this.resolveParadox(m);
    this.applyRival(this._rivalMatrix);

    // 2.75) RECHARGE module three: life AND coin, both by the die
    if (m[0][2]) {
      this.showMatrix(m); this.glowCell(0, 2); this.glow("#vz-holo, .vital-ekg, #rucksack-zone");
      me.energy += m[0][2]; me.gold += m[0][2];
      await this.restate(m);
      this.glowCell(0, 2); this.glow("#vz-holo, .vital-ekg, #rucksack-zone");
      if (!this.taughtBoth) { this.taughtBoth = true; await this.tell(L.bothGot); }
      else await wait(850);
      this.unglow();
    }

    // 3) TRAVEL -> heat / boom. Explained the FIRST time only.
    if (m[2][0]) {
      this.showMatrix(m); this.glowCell(2, 0); this.glow("#vz-holo");
      me.booms += m[2][0];
      // A PASSIVE PROVES ITSELF HERE. Tesla's motor pays a life for any heat taken, and he
      // never touched it: that is the whole difference between a passive and an active, shown
      // on his own vitals the first time it fires.
      const tesla = (me.hand || []).some((c) => c.name === TESLA.name);
      if (tesla) me.energy += 1;
      await this.restate(m);
      this.glowCell(2, 0);
      if (!this.taughtBoom) {
        this.taughtBoom = true; this.learn("boom");
        this.frame("#mano-boomg", "red");     // the whole gauge is traced, so he sees WHICH bar she means
        await this.tell(L.boomGot);
      } else { this.glow("#vz-holo"); await wait(850); }
      this.unglow();
      // and the first time the motor in his case answers that heat, she names it, so the
      // passive is understood by having watched it happen rather than by being told
      if (tesla && !this._saidPassiveFired) {
        this._saidPassiveFired = true;
        this.frame("#rucksack-zone", "green");
        this.glow(".vital-ekg");
        await this.tell(L.passiveFired);
        this.unframe(); this.unglow();
      }
    }
    // 4) TRAVEL -> move: the player PLOTS his own crossing, up to the die value, and the
    //    third travel module carries him DOUBLE that
    if (m[2][1]) {
      this.showMatrix(m); this.glowCell(2, 1);
      await this.plotTravel(m[2][1]);
      this.unglow();
    }
    if (m[2][2]) {
      this.showMatrix(m); this.glowCell(2, 2);
      await this.plotTravel(m[2][2] * 2);
      this.unglow();
    }
    // CLEAN-UP: the last step of the phase, once the travelling is done. The generators
    // come off the machine and the screen goes dark, and only then the overload lands,
    // because the clean-up is exactly when an overload triggers.
    // The overload markers land here, for everyone at the table. The traveller has to
    // SEE his own function being sealed, on the machine, while the screen is still lit.
    // Only after that do the generators come off and the screen goes dark.
    const mineOvl = this.overloadedRows(m);
    this.s.travelers[SELF].ovlNext = mineOvl;
    if (this._rivalMatrix) this.s.travelers[RIVAL].ovlNext = this.overloadedRows(this._rivalMatrix);
    this.pushState();                          // the rival's file marks theirs too
    if (mineOvl.length) {
      this.showMatrix(m);
      this.game.showOverload(mineOvl);         // the row is condemned, in front of him
      mineOvl.forEach((r) => { for (let c = 0; c < this.modules; c++) this.glowCell(r, c); });
      if (!this.taughtOverload) { this.taughtOverload = true; this.learn("overload"); await this.tell(L.overload); }
      else await wait(1200);
      this.unglow();
    }
    this.game.cleanUpGenerators();             // now the machine empties and the screen dies
    await wait(560);
    // the rival joins at the end of the first hour
    if (!this.shownRival) { this.shownRival = true; this.learn("rival"); await this.introRival(); }
    if (!this.taughtHour) { this.taughtHour = true; await this.tell(L.nextHour); }
  }

  // drive the REAL simultaneous-reveal: inject allocations_revealed so the parade
  // flashes the player's pip-boy and lifts the rival's dossier, one hand at a time
  async revealBoth(playerMatrix, rivalMatrix) {
    this._rivalMatrix = rivalMatrix;   // kept so their overload marker can land at clean-up
    this.learn("reveal");
    if (!this.taughtReveal) { this.taughtReveal = true; await this.tell(L.reveal); }
    else await wait(300);
    this.game.onMessage("event", {
      kind: "allocations_revealed",
      payload: { allocations: { [SELF]: { matrix: playerMatrix }, [RIVAL]: { matrix: rivalMatrix } } },
    });
    await wait(900);
    this.showMatrix(playerMatrix);   // keep the player's own dice on the pip-boy through the reveal
    // call literal visual attention to the thing being taught: the rival's revealed dice
    const attn = () => document.querySelectorAll(".pcard .bd-alloc");
    attn().forEach((el) => el.classList.add("tut-attn"));
    await wait(2800);
    attn().forEach((el) => el.classList.remove("tut-attn"));
  }

  // The map cut must SURVIVE every re-render. The board redraws whenever the state
  // changes (travel, reveal, hour), which wipes the clip-path; a single timed call
  // after pushState is not enough. This guard re-applies the cut on any rail change.
  setupMapGuard() {
    const kick = () => { if (this._mapT) return; this._mapT = setTimeout(() => { this._mapT = null; this.limitMap(); }, 40); };
    this._kickMap = kick;
    const attach = () => {
      const rail = document.getElementById("timeline-rail");
      if (!rail || rail === this._railNode) return;
      this._railNode = rail;
      if (this._railObs) this._railObs.disconnect();
      this._railObs = new MutationObserver(kick);
      this._railObs.observe(rail, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
      kick();
    };
    const host = document.getElementById("screen-game") || document.body;
    this._hostObs = new MutationObserver(() => { attach(); });
    this._hostObs.observe(host, { childList: true, subtree: true });
    attach();
  }

  // ---- the maleta arrives bare: its recess labels are printed into briefcase.svg
  // (a CSS background), so we mask each one with a velvet patch on the inline overlay
  // and lift the patch only when that compartment is first earned. ----
  // label boxes in the briefcase's own 800x500 space (measured from briefcase.svg)
  static get MALA_LABELS() {
    return {
      gold:      { x: 165, y: 370, w: 112, h: 15 },   // GOLD RESERVE (base left)
      equipment: { x: 458, y: 370, w: 112, h: 15 },   // EQUIPMENT (base right)
      contracts: { x: 206, y: 197, w: 116, h: 15 },   // CONTRACTS (lid left)
      vouchers:  { x: 472, y: 197, w: 116, h: 15 },   // VOUCHERS (lid right)
    };
  }
  setupMaletaGuard() {
    const host = document.getElementById("rucksack-zone");
    if (!host) return;
    const reapply = () => { if (this._malaT) return; this._malaT = setTimeout(() => { this._malaT = null; this.applyMaletaCovers(); }, 30); };
    this._malaObs = new MutationObserver(reapply);
    this._malaObs.observe(host, { childList: true, subtree: true });
    this.applyMaletaCovers();
  }
  applyMaletaCovers() {
    const svg = document.querySelector("#mala-extra svg");
    if (!svg) return;
    if (this._malaObs) this._malaObs.disconnect();   // avoid observing our own edit
    svg.querySelectorAll(".tut-mala-cover").forEach((n) => n.remove());
    const boxes = Tutorial.MALA_LABELS;
    let rects = "";
    for (const k of Object.keys(boxes)) {
      if (this.maletaLabels[k]) continue;            // this label has been earned: leave it visible
      const b = boxes[k];
      rects += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="#3a1320"/>`;
    }
    if (rects) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "tut-mala-cover");
      g.innerHTML = rects;
      svg.appendChild(g);
    }
    if (this._malaObs) { const host = document.getElementById("rucksack-zone"); if (host) this._malaObs.observe(host, { childList: true, subtree: true }); }
  }
  async revealMaletaLabel(which) {
    if (!this.maletaLabels || this.maletaLabels[which]) return;
    this.maletaLabels[which] = true;
    this.applyMaletaCovers();
    const svg = document.querySelector("#mala-extra svg");
    const b = Tutorial.MALA_LABELS[which];
    if (svg && b) {   // a brief materialise flourish where the label just surfaced
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "tut-mala-flash");
      g.innerHTML = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="none" stroke="#c77aa6" stroke-width="3"/>`;
      svg.appendChild(g);
      setTimeout(() => g.remove(), 1200);
    }
  }

  // cut the star chart just below the first era (XXIV..XXX) and sit the roll asset
  // exactly on the cut, measured live so the plot clip and the roll align to the pixel.
  // THE CHART UNROLLS, once he has kept a promise and filed his first relic. Until then the
  // years below XXIV are none of his business and the roll covers them. From here the whole
  // timeline is his to cross, so the guard that keeps re-cutting it is switched off for good
  // and every era comes out from behind the roll at once.
  async openMap() {
    if (this._mapOpen) return;
    this._mapOpen = true;
    if (this._railObs) { this._railObs.disconnect(); this._railObs = null; }
    const rail = document.getElementById("timeline-rail");
    if (rail) {
      rail.querySelectorAll(".tut-era-hidden").forEach((n) => n.classList.remove("tut-era-hidden"));
      rail.querySelectorAll(".cplot, .cplot-sing, .cplot-ori").forEach((cp) =>
        cp.style.removeProperty("clip-path"));
    }
    const roll = document.getElementById("chart-roll");
    if (roll) {
      roll.style.setProperty("transition", "opacity .9s ease, top .9s ease", "important");
      roll.style.setProperty("opacity", "0", "important");
      setTimeout(() => roll.style.setProperty("display", "none", "important"), 950);
    }
    this.pushState();
    await wait(1000);
    this.frame("#timeline-rail", "green");
    this.learn("chart");
    await this.tell(L.chartOpen);
    this.unframe();
  }

  limitMap() {
    if (this._mapOpen) return;          // the chart is his now, in full: nothing left to cut
    const rail = document.getElementById("timeline-rail");
    if (!rail) return;
    // go deaf while we write: limitMap sets inline styles, and the guard watches inline
    // styles, so without this the two of them feed each other in a loop that never rests
    if (this._railObs) this._railObs.disconnect();
    try { this._limitMapInner(rail); } finally {
      if (this._railObs && this._railNode && this._railNode.isConnected) {
        this._railObs.observe(this._railNode,
          { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
      }
    }
  }
  _limitMapInner(rail) {
    const cplot = rail.querySelector(".cplot-sing") || rail.querySelector(".cplot") || rail.querySelector(".cplot-ori");
    if (!cplot) return;
    const cRect = cplot.getBoundingClientRect();
    if (!cRect.height) return;
    let cut = 0;   // screen px below the cplot top where the first era ends
    rail.querySelectorAll("[data-c]").forEach((n) => {
      const c = parseInt(n.getAttribute("data-c"), 10);
      if (isNaN(c)) return;
      if (c < 24) { n.classList.add("tut-era-hidden"); return; }   // hide the lower eras
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
      // position the roll in the SAME layout space as the plot (both absolute in the
      // rail), so the same fit-scale applies to both and they align to the pixel.
      const ratio = cut / cRect.height;                          // visible fraction, scale-invariant
      const rollH = roll.offsetHeight || 20;
      roll.style.setProperty("top", (cplot.offsetTop + cplot.offsetHeight * ratio - rollH / 2) + "px", "important");
    }
  }
  stripHover() { document.querySelectorAll("#screen-game [title]").forEach((n) => n.removeAttribute("title")); }
}

export function launchTutorial() {
  new Tutorial().start();
}
