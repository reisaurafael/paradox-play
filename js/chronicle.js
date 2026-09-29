/* =========================================================================
   chronicle.js, THE CHRONICLE: records, daily missions, quests and the
   cosmetics they unlock, kept on THIS machine

   The hook that keeps a player at the table after Learn to Play. Everything is
   read from the match's own event stream (game.js playEvent hands every event
   here, one line) and written to this browser's localStorage. Nothing is sent
   anywhere: there is no account, no server, no leaderboard online yet.

   WHAT COUNTS
     Records, missions and quests count only in a finished match against AI
     opponents (every other seat a bot). Learn to Play never counts toward
     records (its dice are scripted), but finishing it grants the first quest.
     The Test Room and a split-screen panel other than the first never count.

   THE PARTS
     RECORDS    personal bests, updated when a match ends.
     MISSIONS   three a day (local date), the same three for everyone on that
                date (a seeded pick from POOL), each one achievable in one match.
                Progress is live in the match; completion is stamped on screen.
     QUESTS     a longer list in four tiers, from first steps to legend.
     RANK       a title earned from quest points and completed missions.
     COSMETICS  unlocked by quests, never gameplay power: a traveller badge
                (pinned on your case in play and on the record card), a Herald
                print style (every Temporal Herald edition you read) and a case
                file stamp (your results card and your record card).
     THE CARD   a picture of your best records, drawn on a canvas in the comic
                style, to save or copy and share anywhere you like.

   THE STABLE SHAPE (for a future opt-in online board, read by snapshot()):
     { schema: 1, kind: "paradox.chronicle", nickname, title, points,
       records: { <record id>: { value, at, players, hours } },
       totals: { matches, wins, relics, damage, wrecks, missions, missionDays, herald },
       winsByTable: { 2..6: n }, streak: { now, best },
       quests: [<quest id>], generatedAt }
     Record and quest ids never change meaning; new ones may be added.

   COSTS: no loops, no per-frame work. Work happens once per game event (a few
   comparisons), once at the end of a match, and when the player opens a page.
   Storage is wrapped in try/catch everywhere: a blocked localStorage keeps the
   Chronicle in memory for the session and never breaks the game.

   HOOKS
     window.__pdxChronicle.event(kind, payload, game)   game.js, every event
     window.__pdxChronicle.missions()   today's three, with live progress, for the
                                        Tab hold view (help.js)
     window.__pdxChronicle.onChange(cb) -> unsubscribe (missions or quests moved)
     window.__pdxChronicle.open() / close()   the Chronicle page
     window.__pdxChronicle.snapshot()   the stable shape above
     window.__pdxChronicle.tutorialDone()     Learn to Play finished
   ========================================================================= */
import { profile } from "./profile.js?202609282226";
import { audio } from "./audio.js?202609282226";
import { roman, esc, seatColor } from "./util.js?202609282226";
import { THEMES, THEME_BY_ID, TIER_NAME, applyTheme } from "./theme.js?202609282226";

const PANEL = (() => {
  try { return parseInt(new URLSearchParams(location.search).get("panel")) || 0; } catch (e) { return 0; }
})();
const KEY = "paradoxo.chronicle.v1" + (PANEL > 1 ? ".panel" + PANEL : "");
const SCHEMA = 1;
const POOL_VERSION = 1;          // part of the daily seed: a new pool deals new days
const TABLES = [2, 3, 4, 5, 6];

/* ───────────────────────────── storage ───────────────────────────── */
function blank() {
  return {
    schema: SCHEMA,
    records: {},
    totals: { matches: 0, wins: 0, relics: 0, damage: 0, wrecks: 0, missions: 0, missionDays: 0, herald: 0 },
    winsByTable: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    streak: { now: 0, best: 0 },
    days: {},                    // "YYYY-MM-DD": { done: { missionId: at } }
    quests: {},                  // questId: at
    eras: [],                    // the eras you have delivered a relic to, ever (ERA_SPANS)
    equip: { badge: "cronos", herald: "standard", stamp: "filed", colour: null },
  };
}
const num = (v, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
function clean(raw) {
  const d = blank();
  if (!raw || typeof raw !== "object") return d;
  if (raw.records && typeof raw.records === "object") {
    for (const [k, r] of Object.entries(raw.records)) {
      if (r && typeof r === "object" && typeof r.value === "number" && isFinite(r.value))
        d.records[k] = { value: r.value, at: num(r.at), players: num(r.players), hours: num(r.hours) };
    }
  }
  if (raw.totals) for (const k of Object.keys(d.totals)) d.totals[k] = Math.max(0, num(raw.totals[k]));
  if (raw.winsByTable) for (const n of TABLES) d.winsByTable[n] = Math.max(0, num(raw.winsByTable[n]));
  if (raw.streak) { d.streak.now = Math.max(0, num(raw.streak.now)); d.streak.best = Math.max(0, num(raw.streak.best)); }
  if (raw.days && typeof raw.days === "object") {
    for (const [day, v] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !v || typeof v.done !== "object") continue;
      const done = {};
      for (const [id, at] of Object.entries(v.done)) if (MISSION_BY_ID[id]) done[id] = num(at);
      d.days[day] = { done };
    }
  }
  if (raw.quests && typeof raw.quests === "object")
    for (const [id, at] of Object.entries(raw.quests)) if (QUEST_BY_ID[id]) d.quests[id] = num(at);
  if (Array.isArray(raw.eras)) d.eras = raw.eras.filter((e) => ERA_SPANS.some((x) => x[0] === e));
  if (raw.equip && typeof raw.equip === "object") {
    for (const kind of ["badge", "herald", "stamp", "colour"]) {
      const c = COSMETIC_BY_ID[raw.equip[kind]];
      if (c && c.kind === kind) d.equip[kind] = c.id;
    }
  }
  return d;
}
let D = null;                    // the live copy; the only one if storage is blocked
function load() {
  try { const raw = localStorage.getItem(KEY); D = clean(raw ? JSON.parse(raw) : null); }
  catch (e) { D = D || blank(); }
  return D;
}
function save() {
  // keep the day log short: the last 60 days are plenty to show (the totals keep the rest)
  try {
    const days = Object.keys(D.days).sort();
    while (days.length > 60) delete D.days[days.shift()];
  } catch (e) {}
  try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {}
}

/* ───────────────────────────── the date ───────────────────────────── */
function dayKey(t) {
  const d = t ? new Date(t) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function msToMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}
// a small seeded generator: the same date gives the same three orders everywhere
function seedOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────────── the eras ───────────────────────────── */
// The three delivery periods (engine/constants.py PERIODS). Century XIX sits on the
// border of the Modern and Contemporary eras, so it belongs to both periods.
const inOrigins = (c) => c >= 1 && c <= 10;
const inAscension = (c) => c >= 11 && c <= 19;
const inSingularity = (c) => c >= 19 && c <= 30;
// whom a paradox from `from` reaches in its direction (engine/paradox.py _targets_for_module)
function inReach(col, from, to) {
  if (from == null || to == null) return false;
  return col === 0 ? to > from : col === 1 ? to === from : to < from;
}

// the six eras (engine/constants.py ERAS); a border century belongs to both eras
const ERA_SPANS = [["Antiquity", 1, 5], ["High Middle Ages", 5, 10], ["Low Middle Ages", 11, 15],
  ["Modern", 15, 19], ["Contemporary", 19, 23], ["Timeless", 23, 30]];
const erasOf = (c) => ERA_SPANS.filter(([, a, b]) => c >= a && c <= b).map(([n]) => n);

/* ───────────────────────────── RECORDS ─────────────────────────────
   One personal best each. `better`: "high" keeps the larger value, "low" the
   smaller. value(m) reads the finished match and returns null when the record
   does not apply to it (a fastest win needs a win). */
const RECORDS = [
  { id: "cp", name: "The Fattest Contract", what: "Most Contract Points in one match", unit: "CP", better: "high",
    value: (m) => m.cp || null },
  { id: "hour_damage", name: "The Heaviest Hour", what: "Most paradox damage you dealt in a single Hour", unit: "damage", better: "high",
    value: (m) => m.bestHourDmg || null },
  { id: "match_damage", name: "The Paradox Ledger", what: "Most paradox damage you dealt in one match", unit: "damage", better: "high",
    value: (m) => m.dmg || null },
  { id: "fastest_win", name: "The Swiftest Crown", what: "Fewest Hours to win a match", unit: "Hours", better: "low",
    value: (m) => (m.won ? m.hour : null) },
  { id: "relics", name: "Relics Brought Home", what: "Most relics delivered in one match", unit: "relics", better: "high",
    value: (m) => m.relics || null },
  { id: "widest", name: "The Widest Paradox", what: "Most travellers struck by one of your paradoxes", unit: "travellers", better: "high",
    value: (m) => m.widest || null },
  { id: "wrecks", name: "Wrecks on the Sea", what: "Most rivals you terminated in one match", unit: "wrecks", better: "high",
    value: (m) => m.wrecks || null },
  { id: "survival", name: "The Longest Watch", what: "Most Hours in a row without being lost at sea", unit: "Hours", better: "high",
    value: (m) => m.bestRun || null },
  { id: "deepest", name: "Nearest to Year Zero", what: "The earliest century you reached", unit: "century", better: "low",
    value: (m) => (m.deepest < 30 ? m.deepest : null) },
  { id: "purse", name: "The Heaviest Purse", what: "Most gold you held at once", unit: "gold", better: "high",
    value: (m) => m.purse || null },
  { id: "margin", name: "The Widest Margin", what: "Biggest Contract Point lead in a win", unit: "CP", better: "high",
    value: (m) => (m.won && m.margin > 0 ? m.margin : null) },
  { id: "leap", name: "The Longest Leap", what: "Most centuries crossed in one voyage", unit: "centuries", better: "high",
    value: (m) => m.leap || null },
];
const RECORD_BY_ID = Object.fromEntries(RECORDS.map((r) => [r.id, r]));
const ONE = { Hours: "Hour", relics: "relic", travellers: "traveller", wrecks: "wreck", centuries: "century" };
const unitOf = (r, v) => (v === 1 && ONE[r.unit]) || r.unit;
function fmtRecord(r, v) {
  if (v == null) return "--";
  if (r.id === "deepest") return v === 0 ? "Year Zero" : `Century ${roman(v)}`;
  return String(v);
}

/* ───────────────────────────── MISSIONS ─────────────────────────────
   The pool of daily orders. Each is achievable in one match against the AI.
   check(m, final) -> { cur, target, done, failed }: live while the match runs,
   final once it ended (a "finish without" order can only be judged then). */
const count = (cur, target) => ({ cur: Math.min(cur, target), target, done: cur >= target, failed: false });
const clean_finish = (bad, m, final) => ({ cur: final && !bad ? 1 : 0, target: 1, done: final && !bad, failed: bad });
const win = (m, final, ok = true) => ({ cur: final && m.won && ok ? 1 : 0, target: 1, done: final && m.won && ok, failed: final && !(m.won && ok) });
const POOL = [
  // deliveries
  { id: "origins", cat: "deliver", title: "Home to the Origins", text: "Deliver a relic to a century of the Origins (I to X).",
    check: (m) => count(m.relicO, 1) },
  { id: "ascension", cat: "deliver", title: "Home to the Ascension", text: "Deliver a relic to a century of the Ascension (XI to XIX).",
    check: (m) => count(m.relicA, 1) },
  { id: "singularity", cat: "deliver", title: "Home to the Singularity", text: "Deliver a relic to a century of the Singularity (XIX to XXX).",
    check: (m) => count(m.relicS, 1) },
  { id: "two_relics", cat: "deliver", title: "Two for the Drawer", text: "Deliver two relics in one match.",
    check: (m) => count(m.relics, 2) },
  // paradoxes
  { id: "double_strike", cat: "paradox", title: "Double Strike", text: "Hit two travellers with one paradox (a table of three or more).",
    check: (m) => count(m.widest, 2) },
  { id: "payroll", cat: "paradox", title: "Paradox Payroll", text: "Deal 6 paradox damage in one match.",
    check: (m) => count(m.dmg, 6) },
  { id: "heavy_hour", cat: "paradox", title: "A Heavy Hour", text: "Deal 4 paradox damage in a single Hour.",
    check: (m) => count(Math.max(m.bestHourDmg, m.dmgHour), 4) },
  { id: "lost_at_sea", cat: "paradox", title: "Lost at Sea", text: "Terminate a rival.",
    check: (m) => count(m.wrecks, 1) },
  { id: "chaos_clause", cat: "paradox", title: "The Chaos Clause", text: "Sign a Chaos reward contract.",
    check: (m) => count(m.chaos, 1) },
  // the Merchant and the cove
  { id: "smugglers", cat: "market", title: "Smugglers' Cove", text: "Buy from the Secret Market.",
    check: (m) => count(m.secretBuys, 1) },
  { id: "good_customer", cat: "market", title: "Good Customer", text: "Buy three items from the Merchant in one match.",
    check: (m) => count(m.buys, 3) },
  { id: "briefcase", cat: "market", title: "Briefcase Carrier", text: "Acquire a Temporal Briefcase.",
    check: (m) => count(m.briefcase, 1) },
  { id: "fresh_stock", cat: "market", title: "Fresh Stock", text: "Renew a card on the Merchant's shelf.",
    check: (m) => count(m.renews, 1) },
  { id: "deep_pockets", cat: "market", title: "Deep Pockets", text: "Hold 8 gold at once.",
    check: (m) => count(m.purse, 8) },
  // the machine
  { id: "reactor", cat: "machine", title: "Reactor Hum", text: "Fill the reactor through a calm escape valve.",
    check: (m) => count(m.reactor, 1) },
  { id: "steady_hands", cat: "machine", title: "Steady Hands", text: "Finish a match without overloading a function.",
    check: (m, f) => clean_finish(m.overloads > 0, m, f) },
  { id: "hands_on", cat: "machine", title: "Hands On", text: "Activate your items three times in one match.",
    check: (m) => count(m.activations, 3) },
  { id: "paperwork", cat: "machine", title: "Paperwork", text: "Sign two reward contracts in one match.",
    check: (m) => count(m.rewards, 2) },
  // the sea
  { id: "millennium", cat: "travel", title: "Breach a Millennium", text: "Claim a millennium milestone (Century XX or X).",
    check: (m) => count(m.milestones, 1) },
  { id: "deep_water", cat: "travel", title: "Deep Water", text: "Reach Century X or earlier.",
    check: (m) => ({ cur: m.deepest <= 10 ? 1 : 0, target: 1, done: m.deepest <= 10, failed: false }) },
  { id: "long_leap", cat: "travel", title: "The Long Leap", text: "Cross 5 centuries in one voyage.",
    check: (m) => count(m.leap, 5) },
  // survive and win
  { id: "still_standing", cat: "survive", title: "Still Standing", text: "Finish a match without being terminated.",
    check: (m, f) => clean_finish(m.died > 0, m, f) },
  { id: "monarch_day", cat: "survive", title: "Monarch for a Day", text: "Win a match.",
    check: (m, f) => win(m, f) },
  { id: "five_signatures", cat: "survive", title: "Five Signatures", text: "Finish a match with 5 Contract Points or more.",
    check: (m) => count(m.cp, 5) },
  { id: "before_the_bell", cat: "survive", title: "Before the Bell", text: "Win in 15 Hours or fewer.",
    check: (m, f) => win(m, f, m.hour <= 15) },
  { id: "cool_head", cat: "survive", title: "Cool Head", text: "Win a match without your motor exploding.",
    check: (m, f) => Object.assign(win(m, f, m.explosions === 0), m.explosions > 0 ? { failed: true } : {}) },
  { id: "full_house", cat: "survive", title: "Full House", text: "Win at a table of four or more.",
    check: (m, f) => win(m, f, m.n >= 4) },
];
const MISSION_BY_ID = Object.fromEntries(POOL.map((x) => [x.id, x]));
const CATS = ["deliver", "paradox", "market", "machine", "travel", "survive"];
// three orders from three different kinds of play, the same for everyone on that date
function dailyIds(day) {
  const r = rng(seedOf(`paradox-daily-${POOL_VERSION}-${day}`));
  const cats = CATS.slice();
  for (let i = cats.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cats[i], cats[j]] = [cats[j], cats[i]]; }
  return cats.slice(0, 3).map((c) => {
    const opts = POOL.filter((x) => x.cat === c);
    return opts[Math.floor(r() * opts.length)].id;
  });
}

/* ───────────────────────────── QUESTS ─────────────────────────────
   Four tiers, worth 1, 2, 4 and 8 Chronicle points. check(q) reads q.m (the
   match, live or finished; null on the menu), q.final and tot(key): the lifetime
   total plus what this match has added and not yet filed. */
const TIERS = [
  { n: 1, name: "First Steps", pts: 1 },
  { n: 2, name: "Field Work", pts: 2 },
  { n: 3, name: "Mastery", pts: 4 },
  { n: 4, name: "Legend", pts: 8 },
];
const QUESTS = [
  // I. first steps
  { id: "wake_call", tier: 1, name: "Wake Call", text: "Finish Learn to Play. HELA opens her eye on you.", check: () => false },
  { id: "signed_on", tier: 1, name: "Signed On", text: "Finish a match against the AI.", check: (q) => q.final },
  { id: "monarch", tier: 1, name: "Monarch of Time", text: "Win a match.", check: (q) => q.final && q.m.won },
  { id: "first_relic", tier: 1, name: "Filed in the Drawer", text: "Deliver your first relic.", check: (q) => q.tot("relics") >= 1 },
  { id: "first_strike", tier: 1, name: "First Strike", text: "Hit a rival with your paradox.", check: (q) => q.m && q.m.widest >= 1 },
  { id: "customer", tier: 1, name: "Customer of the Wagon", text: "Buy an item from the Merchant.", check: (q) => q.m && q.m.buys >= 1 },
  { id: "daily_duty", tier: 1, name: "Daily Duty", text: "Complete a daily mission.", check: (q) => D.totals.missions >= 1 },
  { id: "front_page", tier: 1, name: "Front Page", text: "Make the Temporal Herald: deliver a relic, claim a milestone, carry a warrant, or be lost at sea.",
    check: (q) => q.tot("herald") >= 1 },
  // II. field work
  { id: "full_docket", tier: 2, name: "Full Docket", text: "Complete all three missions of one day.",
    check: () => Object.values(D.days).some((d) => Object.keys(d.done || {}).length >= 3) },
  { id: "cove", tier: 2, name: "Smugglers' Cove", text: "Buy from the Secret Market.", check: (q) => q.m && q.m.secretBuys >= 1 },
  { id: "briefcase", tier: 2, name: "The Briefcase", text: "Acquire a Temporal Briefcase.", check: (q) => q.m && q.m.briefcase >= 1 },
  { id: "reactor", tier: 2, name: "Reactor Hum", text: "Fill the reactor through a calm escape valve.", check: (q) => q.m && q.m.reactor >= 1 },
  { id: "wanted", tier: 2, name: "Wanted Poster", text: "Have the Bureau put a warrant on your head.", check: (q) => q.m && q.m.wanted >= 1 },
  { id: "clean_record", tier: 2, name: "Clean Record", text: "Pay off a warrant at the Merchant's wagon.", check: (q) => q.m && q.m.declared >= 1 },
  { id: "wrecker", tier: 2, name: "Wrecker", text: "Terminate a rival.", check: (q) => q.m && q.m.wrecks >= 1 },
  { id: "millennium", tier: 2, name: "Millennium Claim", text: "Claim a millennium milestone.", check: (q) => q.m && q.m.milestones >= 1 },
  { id: "relic_runner", tier: 2, name: "Relic Runner", text: "Deliver 10 relics in all.", check: (q) => q.tot("relics") >= 10 },
  { id: "lamplighter", tier: 2, name: "Lamplighter", text: "Deliver two relics in one match.", check: (q) => q.m && q.m.relics >= 2 },
  { id: "two_at_a_stroke", tier: 2, name: "Two at a Stroke", text: "Hit two travellers with one paradox.", check: (q) => q.m && q.m.widest >= 2 },
  { id: "merchants_friend", tier: 2, name: "The Merchant's Friend", text: "Buy three items from the Merchant in one match.", check: (q) => q.m && q.m.buys >= 3 },
  { id: "duel", tier: 2, name: "Duel Won", text: "Win a two-player match.", check: (q) => q.final && q.m.won && q.m.n === 2 },
  { id: "crowded", tier: 2, name: "Crowded Table", text: "Win at a table of six.", check: (q) => q.final && q.m.won && q.m.n === 6 },
  // III. mastery
  { id: "mended", tier: 3, name: "The Mended Timeline", text: "Win by mending all three periods.",
    check: (q) => q.final && q.m.won && q.m.reason === "full_receptor" },
  { id: "year_zero", tier: 3, name: "Year Zero", text: "Win by reaching Year Zero.",
    check: (q) => q.final && q.m.won && q.m.reason === "year_zero" },
  { id: "last_afloat", tier: 3, name: "Last One Afloat", text: "Win as the last traveller never terminated.",
    check: (q) => q.final && q.m.won && q.m.reason === "last_traveler" && q.m.died === 0 },
  { id: "hat_trick", tier: 3, name: "Hat Trick", text: "Win three matches in a row.", check: () => D.streak.best >= 3 },
  { id: "double_wreck", tier: 3, name: "The Wrecker's Harvest", text: "Terminate two rivals in one match.", check: (q) => q.m && q.m.wrecks >= 2 },
  { id: "storm", tier: 3, name: "Paradox Storm", text: "Hit three travellers with one paradox.", check: (q) => q.m && q.m.widest >= 3 },
  { id: "heavy_hour", tier: 3, name: "The Heavy Hour", text: "Deal 10 paradox damage in a single Hour.",
    check: (q) => q.m && Math.max(q.m.bestHourDmg, q.m.dmgHour) >= 10 },
  { id: "swift", tier: 3, name: "Swift Hand", text: "Win in 10 Hours or fewer.", check: (q) => q.final && q.m.won && q.m.hour <= 10 },
  { id: "untouchable", tier: 3, name: "Untouchable", text: "Win without ever being struck by a paradox.",
    check: (q) => q.final && q.m.won && q.m.hitsTaken === 0 },
  { id: "cold_engine", tier: 3, name: "Cold Engine", text: "Win without overloading a function or exploding your motor.",
    check: (q) => q.final && q.m.won && q.m.overloads === 0 && q.m.explosions === 0 },
  { id: "week", tier: 3, name: "A Week of Duty", text: "Complete daily missions on seven different days.", check: () => D.totals.missionDays >= 7 },
  { id: "ten_crowns", tier: 3, name: "Ten Crowns", text: "Win 10 matches.", check: () => D.totals.wins >= 10 },
  // IV. legend
  { id: "every_table", tier: 4, name: "Every Table", text: "Win at every table size, two to six.",
    check: () => TABLES.every((n) => D.winsByTable[n] > 0) },
  { id: "darling", tier: 4, name: "The Herald's Darling", text: "Make the Temporal Herald 25 times.", check: (q) => q.tot("herald") >= 25 },
  { id: "hela_file", tier: 4, name: "HELA Keeps a File", text: "Complete 30 daily missions.", check: () => D.totals.missions >= 30 },
  { id: "curator", tier: 4, name: "Curator of Ages", text: "Deliver 50 relics in all.", check: (q) => q.tot("relics") >= 50 },
  { id: "keeper", tier: 4, name: "Keeper of the Last Timeline", text: "Win 25 matches.", check: () => D.totals.wins >= 25 },
  { id: "every_era", tier: 4, name: "Chronicler of Every Era", text: "Deliver a relic to each of the six eras, Antiquity to the Timeless, over any number of matches.",
    check: (q) => new Set([...D.eras, ...(q.m && !q.m.filed ? q.m.eras : [])]).size >= ERA_SPANS.length },
  { id: "outlaw", tier: 4, name: "The Outlaw's Crown", text: "Win a match with a warrant still on your head.",
    check: (q) => q.final && q.m.won && q.m.wantedAtEnd },
  { id: "back_from_dead", tier: 4, name: "Back from the Dead", text: "Be terminated and still win the match.",
    check: (q) => q.final && q.m.won && q.m.died > 0 },
];
const QUEST_BY_ID = Object.fromEntries(QUESTS.map((x) => [x.id, x]));

/* ───────────────────────────── RANK ───────────────────────────── */
const RANKS = [
  [0, "Recruit"], [3, "Field Clerk"], [8, "Operative"], [16, "Senior Operative"],
  [30, "Chrono-Marshal"], [50, "Keeper of Hours"], [80, "Monarch of the Last Timeline"],
];
function points() {
  let p = D.totals.missions;
  for (const id of Object.keys(D.quests)) { const q = QUEST_BY_ID[id]; if (q) p += TIERS[q.tier - 1].pts; }
  return p;
}
function rank() {
  const p = points();
  let i = 0;
  while (i + 1 < RANKS.length && p >= RANKS[i + 1][0]) i++;
  const next = RANKS[i + 1] || null;
  return { points: p, title: RANKS[i][1], index: i, next: next ? { at: next[0], title: next[1] } : null, from: RANKS[i][0] };
}

/* ───────────────────────────── COSMETICS ─────────────────────────────
   Badges are small ink drawings in a 48 x 48 box, used as inline SVG on the
   page and as Path2D on the record card. Each part: d, and fill "ink", "paper"
   or "accent" (the player's colour), or stroke: true for a line. */
const BADGE_ART = {
  cronos: [{ d: "M24 4 41 14v20L24 44 7 34V14z", fill: "accent" },
    { d: "M17 13h14v3c0 5-4 6-5 8 1 2 5 3 5 8v3H17v-3c0-5 4-6 5-8-1-2-5-3-5-8z", fill: "ink" },
    { d: "M20 32c1-2 3-3 4-3s3 1 4 3z", fill: "paper" }],
  eye: [{ d: "M4 24C10 14 17 10 24 10s14 4 20 14c-6 10-13 14-20 14S10 34 4 24z", fill: "paper" },
    { d: "M15 24a9 9 0 1 0 18 0 9 9 0 1 0-18 0z", fill: "accent" },
    { d: "M20 24a4 4 0 1 0 8 0 4 4 0 1 0-8 0z", fill: "ink" },
    { d: "M4 24C10 14 17 10 24 10s14 4 20 14c-6 10-13 14-20 14S10 34 4 24z", stroke: true }],
  crown: [{ d: "M7 34 10 14l8 9 6-13 6 13 8-9 3 20z", fill: "accent" },
    { d: "M7 36h34v5H7z", fill: "ink" },
    { d: "M22 27a2 2 0 1 0 4 0 2 2 0 1 0-4 0z", fill: "paper" },
    { d: "M7 34 10 14l8 9 6-13 6 13 8-9 3 20z", stroke: true }],
  key: [{ d: "M4 24a9 9 0 1 0 18 0 9 9 0 1 0-18 0z", fill: "accent" },
    { d: "M9 24a4 4 0 1 0 8 0 4 4 0 1 0-8 0z", fill: "paper" },
    { d: "M21 21h23v6h-3v6h-5v-6h-3v4h-5v-4h-7z", fill: "ink" }],
  sigil: [{ d: "M24 5 43 39H5z", fill: "accent" },
    { d: "M17 29a7 7 0 1 0 14 0 7 7 0 1 0-14 0z", fill: "paper" },
    { d: "M21 29a3 3 0 1 0 6 0 3 3 0 1 0-6 0z", fill: "ink" },
    { d: "M24 5 43 39H5z", stroke: true }],
  lantern: [{ d: "M21 4h6v4h-6z", fill: "ink" }, { d: "M17 8h14l3 6H14z", fill: "ink" },
    { d: "M15 14h18v20H15z", fill: "accent" }, { d: "M20 18h8v12h-8z", fill: "paper" },
    { d: "M13 34h22v5H13z", fill: "ink" }],
  quill: [{ d: "M40 5C27 9 16 21 13 38l4 2C21 27 30 16 40 5z", fill: "accent" },
    { d: "M40 5 17 40", stroke: true }, { d: "M9 43l4-5 4 2-3 5z", fill: "ink" }],
  star: [{ d: "M24 3l4 13 13-5-8 12 12 7-14 1 2 14-9-11-9 11 2-14-14-1 12-7-8-12 13 5z", fill: "accent" },
    { d: "M19 24a5 5 0 1 0 10 0 5 5 0 1 0-10 0z", fill: "paper" },
    { d: "M24 3l4 13 13-5-8 12 12 7-14 1 2 14-9-11-9 11 2-14-14-1 12-7-8-12 13 5z", stroke: true }],
  thread: [{ d: "M6 16h36v16H6z", fill: "paper" },
    { d: "M4 26c5-9 9-9 13 0s8 9 13 0 9-9 14 0", stroke: true },
    { d: "M36 6 42 12 18 36l-7 1 1-7z", fill: "accent" }, { d: "M36 9a2 2 0 1 0 3 3", stroke: true }],
  hourglass: [{ d: "M12 5h24v5H12zM12 38h24v5H12z", fill: "ink" },
    { d: "M15 10h18c0 8-6 10-7 14 1 4 7 6 7 14H15c0-8 6-10 7-14-1-4-7-6-7-14z", fill: "paper" },
    { d: "M18 36c2-4 4-5 6-5s4 1 6 5z M20 14h8c-1 3-3 4-4 6-1-2-3-3-4-6z", fill: "accent" },
    { d: "M15 10h18c0 8-6 10-7 14 1 4 7 6 7 14H15c0-8 6-10 7-14-1-4-7-6-7-14z", stroke: true }],
  anchor: [{ d: "M21 4a3 3 0 1 0 6 0", stroke: true }, { d: "M22 7h4v31h-4z", fill: "ink" },
    { d: "M15 13h18v4H15z", fill: "ink" },
    { d: "M7 26c1 10 8 15 17 15s16-5 17-15l-5 3c-1 6-6 8-12 8s-11-2-12-8z", fill: "accent" },
    { d: "M7 26c1 10 8 15 17 15s16-5 17-15", stroke: true }],
};
const COSMETICS = [
  // traveller badges
  { id: "cronos", kind: "badge", name: "C.R.O.N.O.S. Pin", art: "cronos", quest: null },
  { id: "eye", kind: "badge", name: "HELA's Eye", art: "eye", quest: "wake_call" },
  { id: "crown", kind: "badge", name: "Monarch's Crown", art: "crown", quest: "monarch" },
  { id: "key", kind: "badge", name: "The Relic Key", art: "key", quest: "first_relic" },
  { id: "quill", kind: "badge", name: "The Herald's Quill", art: "quill", quest: "front_page" },
  { id: "lantern", kind: "badge", name: "The Smuggler's Lantern", art: "lantern", quest: "cove" },
  { id: "sigil", kind: "badge", name: "The Paradox Sigil", art: "sigil", quest: "storm" },
  { id: "hourglass", kind: "badge", name: "The Swift Hourglass", art: "hourglass", quest: "swift" },
  { id: "anchor", kind: "badge", name: "The Last Anchor", art: "anchor", quest: "last_afloat" },
  { id: "star", kind: "badge", name: "The Year Zero Star", art: "star", quest: "year_zero" },
  { id: "thread", kind: "badge", name: "The Mended Thread", art: "thread", quest: "mended" },
  // Herald print styles
  { id: "standard", kind: "herald", name: "Standard Print", quest: null, note: "The Herald as the Bureau prints it." },
  { id: "red_extra", kind: "herald", name: "Red Extra", quest: "wrecker", note: "Blood-red headlines and a louder EXTRA." },
  { id: "night", kind: "herald", name: "Night Edition", quest: "full_docket", note: "Cream ink on the late-night black stock." },
  { id: "bureau_blue", kind: "herald", name: "Bureau Blue", quest: "hat_trick", note: "The Bureau's own blue ink, for trusted readers." },
  { id: "gold_foil", kind: "herald", name: "Gold Foil Masthead", quest: "ten_crowns", note: "The masthead pressed in gold foil." },
  // case file stamps
  { id: "filed", kind: "stamp", name: "FILED", quest: null, tone: "ink" },
  { id: "approved", kind: "stamp", name: "APPROVED BY HELA", quest: "daily_duty", tone: "teal" },
  { id: "certified", kind: "stamp", name: "PARADOX CERTIFIED", quest: "first_strike", tone: "violet" },
  { id: "monarch", kind: "stamp", name: "MONARCH", quest: "monarch", tone: "red" },
  { id: "top_secret", kind: "stamp", name: "TOP SECRET", quest: "cove", tone: "red" },
  { id: "mended", kind: "stamp", name: "TIMELINE MENDED", quest: "mended", tone: "gold" },
  { id: "legend", kind: "stamp", name: "LEGEND", quest: "keeper", tone: "gold" },
];
// the colours (js/theme.js): green and blue to start, every other one a quest
const COLOUR_QUEST = {
  amber: "lamplighter", teal: "monarch", violet: "two_at_a_stroke", rust: "merchants_friend",
  teal_gold: "hat_trick", crimson_ivory: "double_wreck", violet_jade: "heavy_hour", amber_midnight: "swift",
  blue_rose: "untouchable", green_copper: "cold_engine", gold_violet: "week",
  rainbow: "every_era", wanted: "outlaw", terminated: "back_from_dead",
};
for (const t of THEMES) COSMETICS.push({ id: t.id, kind: "colour", name: t.name, quest: COLOUR_QUEST[t.id] || null, theme: t });
const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));
const STAMP_INK = { ink: "#1d1a16", teal: "#11706d", violet: "#5a3aa8", red: "#a3241a", gold: "#9a6a12" };
const unlocked = (c) => !c.quest || !!D.quests[c.quest];
function equipped(kind) {
  const c = COSMETIC_BY_ID[D.equip[kind]];
  if (c && c.kind === kind && unlocked(c)) return c;
  return COSMETICS.find((x) => x.kind === kind && !x.quest);
}
function badgeSvg(id, accent, cls = "") {
  const art = BADGE_ART[(COSMETIC_BY_ID[id] || {}).art || id] || BADGE_ART.cronos;
  const paint = (p) => p.stroke
    ? `<path d="${p.d}" fill="none" stroke="#15100a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${p.d}" fill="${p.fill === "accent" ? accent : p.fill === "paper" ? "#f4e6b0" : "#15100a"}" stroke="#15100a" stroke-width="1.6" stroke-linejoin="round"/>`;
  return `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true">${art.map(paint).join("")}</svg>`;
}

/* ───────────────────────────── the nickname ───────────────────────────── */
// The same rule as the server's clean_name (server/lobby.py): printable text,
// no markup characters, spaces collapsed, 1 to 24 characters.
function nickname() {
  let n = "";
  try { n = profile.get().name || ""; } catch (e) {}
  n = String(n).replace(/[\u0000-\u001f\u007f-\u009f<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
  return n || "Traveller";
}
function myColour() {
  try { return equipped("colour").theme.a; } catch (e) {}
  try { return seatColor(profile.get().colour || 0); } catch (e) { return "#6fae6a"; }
}

/* ───────────────────────────── THE MATCH ─────────────────────────────
   Everything one match adds, read from its events. The view the game holds
   when an event is played is the state right before that event (the server
   sends a fresh state after every event), which is what the paradox reach and
   the chaos damage are measured against. */
class Match {
  constructor(game) {
    this.game = game; this.me = game.seat;
    this.tutorial = !!(window.__tut && window.__tut.game === game);
    this.day = dayKey();
    this.hour = 1; this.n = 0;
    this.cp = 0; this.relics = 0; this.relicO = 0; this.relicA = 0; this.relicS = 0;
    this.dmg = 0; this.dmgHour = 0; this.bestHourDmg = 0; this.widest = 0; this.hitsTaken = 0;
    this.wrecks = 0; this.died = 0; this.runStart = 1; this.bestRun = 0; this.alive = true;
    this.buys = 0; this.secretBuys = 0; this.briefcase = 0; this.renews = 0; this.declared = 0;
    this.reactor = 0; this.overloads = 0; this.explosions = 0; this.activations = 0;
    this.rewards = 0; this.chaos = 0; this.milestones = 0; this.wanted = 0; this.herald = 0;
    this.deepest = 30; this.leap = 0; this.purse = 0; this.eras = new Set(); this.wantedAtEnd = false;
    this.alloc = null; this.cent = null; this.roller = null; this.pendingChaos = null;
    this.over = false; this.filed = false; this.won = false; this.reason = ""; this.margin = 0;
    this.counts = null;          // decided once the table is known (vs AI, not the tutorial)
    this.newRecords = []; this.missionsDone = []; this.questsDone = [];
    // the match record (MATCH RECORDS below): what happened, Hour by Hour
    this.startedAt = Date.now(); this.lines = []; this.dice = {}; this.noteKeys = new Set();
    this.recId = null;
  }
  view() { return this.game && this.game.view; }
  decide() {
    if (this.counts !== null) return this.counts;
    if (this.tutorial || PANEL > 1) return (this.counts = false);
    const mode = document.body.dataset.roomMode;
    if (mode && mode !== "classic") return (this.counts = false);
    const v = this.view();
    if (!v || !v.travelers || !v.travelers.length) return null;          // not yet known
    const bots = this.game._bots;
    const others = v.travelers.filter((t) => t.name !== this.me);
    if (bots && bots.size) return (this.counts = others.every((t) => bots.has(t.name)));
    return (this.counts = !!window.PARADOX_DEMO);                         // the demo is always vs AI
  }
  sample() {
    const v = this.view();
    if (!v || !v.travelers) return;
    this.n = Math.max(this.n, v.travelers.length);
    const me = v.travelers.find((t) => t.is_self || t.name === this.me);
    if (!me) return;
    if (typeof me.gold === "number") this.purse = Math.max(this.purse, me.gold);
    if (typeof me.contract_points === "number") this.cp = Math.max(this.cp, me.contract_points);
  }
  energies() {
    const v = this.view(), out = {};
    if (v && v.travelers) for (const t of v.travelers) out[t.name] = t.energy;
    return out;
  }
  // the Chaos I contract lands 3 damage on every rival; the next state tells how much stuck
  settleChaos() {
    const pc = this.pendingChaos; if (!pc) return;
    this.pendingChaos = null;
    const now = this.energies();
    let sum = 0;
    for (const [name, before] of Object.entries(pc)) {
      if (typeof before !== "number" || typeof now[name] !== "number") continue;
      sum += Math.max(0, Math.min(3, before - now[name]));
    }
    this.dmg += sum; this.dmgHour += sum;
  }
  closeHour() { this.bestHourDmg = Math.max(this.bestHourDmg, this.dmgHour); this.dmgHour = 0; }

  on(kind, p) {
    const me = this.me;
    this.settleChaos();
    this.sample();
    switch (kind) {
      case "game_started": if (p && Array.isArray(p.seats)) this.n = Math.max(this.n, p.seats.length); break;
      case "hour_started": this.closeHour(); this.hour = num(p.hour, this.hour + 1); break;
      case "allocations_revealed": {
        this.alloc = {};
        for (const [s, a] of Object.entries(p.allocations || {})) if (a && a.matrix) this.alloc[s] = a.matrix;
        this.cent = {};
        const v = this.view();
        if (v && v.travelers) for (const t of v.travelers) this.cent[t.name] = t.century;
        break;
      }
      case "generator_rolled": if (p.source === "reward") this.roller = p.seat || null; break;
      case "paradox_resolved": {
        const hits = p.hits || [];
        if (hits.some((h) => h.seat === me && (h.damage == null || h.damage > 0))) this.hitsTaken++;
        if (p.module === "chaos_reward") {
          if (this.roller === me) {
            const rivals = hits.filter((h) => h.seat !== me);
            this.widest = Math.max(this.widest, rivals.length);
            const e = this.energies(); this.pendingChaos = {};
            for (const h of rivals) this.pendingChaos[h.seat] = e[h.seat];
          }
          break;
        }
        const col = num(p.module, 0) - 4;
        const A = this.alloc || {}, C = this.cent || {};
        const mine = A[me] && A[me][1] ? num(A[me][1][col]) : 0;
        if (col < 0 || col > 2 || mine <= 0) break;
        let struck = 0, dealt = 0;
        for (const h of hits) {
          if (h.seat === me || !(h.damage > 0) || !inReach(col, C[me], C[h.seat])) continue;
          // shared pools: my share of the damage is my generator's share of the pool
          let pool = 0;
          for (const [s, m] of Object.entries(A)) {
            if (s !== h.seat && m[1] && m[1][col] > 0 && inReach(col, C[s], C[h.seat])) pool += m[1][col];
          }
          struck++;
          dealt += Math.max(1, Math.round(h.damage * mine / (pool || mine)));
        }
        this.widest = Math.max(this.widest, struck);
        this.dmg += dealt; this.dmgHour += dealt;
        break;
      }
      case "delivered":
        if (p.seat !== me) break;
        this.relics++; this.herald++;
        for (const e of erasOf(num(p.century))) this.eras.add(e);
        if (inOrigins(p.century)) this.relicO++;
        if (inAscension(p.century)) this.relicA++;
        if (inSingularity(p.century)) this.relicS++;
        break;
      case "cp_earned": if (p.seat === me) this.cp = Math.max(this.cp, num(p.total)); break;
      case "card_bought":
        if (p.seat !== me || p.stolen) break;
        if (p.secret) this.secretBuys++; else this.buys++;
        break;
      case "briefcase_acquired": if (p.seat === me) this.briefcase++; break;
      case "card_renewed": if (p.seat === me) this.renews++; break;
      case "declared": if (p.seat === me) this.declared++; break;
      case "valve_reward": if (p.seat === me) this.reactor++; break;
      case "overloaded": if (p.seat === me) this.overloads++; break;
      case "exploded": if (p.seat === me) this.explosions++; break;
      case "activated": if (p.seat === me) this.activations++; break;
      case "reward_resolved":
        if (p.seat !== me) break;
        this.rewards++; if (p.category === "Chaos") this.chaos++;
        break;
      case "milestone": if (p.seat === me) { this.milestones++; this.herald++; } break;
      case "wanted": if (p.seat === me) { this.wanted++; this.herald++; } break;
      case "secret_market_opened": if (p.by === me) this.herald++; break;
      case "terminated":
        if (p.seat === me) {
          this.died++; this.herald++;
          if (this.alive) this.bestRun = Math.max(this.bestRun, this.hour - this.runStart);
          this.alive = false;
        } else if (p.by === me) this.wrecks++;
        break;
      case "respawned": if (p.seat === me) { this.alive = true; this.runStart = this.hour; } break;
      case "traveled":
        if (p.seat !== me) break;
        this.leap = Math.max(this.leap, Math.abs(num(p.from) - num(p.to)));
        this.deepest = Math.min(this.deepest, num(p.to, 30));
        break;
      case "game_over": {
        this.closeHour();
        this.over = true;
        {
          const v = this.view(), me = v && v.travelers && v.travelers.find((t) => t.is_self || t.name === this.me);
          this.wantedAtEnd = !!(me && (me.is_wanted || (me.statuses || []).includes("wanted")));
        }
        this.won = !!p.winner && p.winner === me;
        this.winnerName = String(p.winner || ""); this.lastScores = p.scores || {};
        this.reason = String(p.reason || "");
        const sc = p.scores || {};
        if (typeof sc[me] === "number") this.cp = sc[me];
        const others = Object.entries(sc).filter(([n]) => n !== me).map(([, v]) => num(v));
        this.n = Math.max(this.n, Object.keys(sc).length);
        this.margin = this.won ? this.cp - (others.length ? Math.max(...others) : 0) : 0;
        if (this.alive) this.bestRun = Math.max(this.bestRun, this.hour - this.runStart + 1);
        break;
      }
      default: break;
    }
  }
}

/* ───────────────────────────── the live wiring ───────────────────────────── */
let M = null;                    // the match on the table now
const listeners = new Set();
function changed() { for (const f of listeners) { try { f(); } catch (e) {} } }

function questCtx(m, final) {
  return { m, final: !!final && !!m && m.over,
    tot: (k) => num(D.totals[k]) + (m && !m.filed && typeof m[k] === "number" ? m[k] : 0) };
}
function grantQuest(id, m) {
  if (D.quests[id] || !QUEST_BY_ID[id]) return false;
  D.quests[id] = Date.now();
  if (m) m.questsDone.push(id);
  return true;
}
function checkQuests(m, final) {
  const q = questCtx(m, final);
  const got = [];
  for (const def of QUESTS) {
    if (D.quests[def.id]) continue;
    let ok = false;
    try { ok = !!def.check(q); } catch (e) { ok = false; }
    if (ok && grantQuest(def.id, m)) got.push(def);
  }
  return got;
}
function missionState(def, m, final) {
  try { return def.check(m, !!final); } catch (e) { return { cur: 0, target: 1, done: false, failed: false }; }
}
function checkMissions(m, final) {
  const day = m.day;
  const rec = D.days[day] || (D.days[day] = { done: {} });
  const got = [];
  for (const id of dailyIds(day)) {
    if (rec.done[id]) continue;
    const def = MISSION_BY_ID[id];
    const st = missionState(def, m, final);
    if (!st.done) continue;
    const firstToday = !Object.keys(rec.done).length;
    rec.done[id] = Date.now();
    D.totals.missions++;
    if (firstToday) D.totals.missionDays++;
    m.missionsDone.push(id);
    got.push(def);
  }
  return got;
}

// the end of a match against the AI: records, totals, the streak, the last checks
function file(m) {
  if (m.filed) return;
  const T = D.totals;
  T.matches++;
  if (m.won) { T.wins++; if (D.winsByTable[m.n] != null) D.winsByTable[m.n]++; }
  D.streak.now = m.won ? D.streak.now + 1 : 0;
  D.streak.best = Math.max(D.streak.best, D.streak.now);
  T.relics += m.relics; T.damage += m.dmg; T.wrecks += m.wrecks; T.herald += m.herald;
  D.eras = ERA_SPANS.map(([n]) => n).filter((n) => D.eras.includes(n) || m.eras.has(n));
  m.filed = true;
  const at = Date.now();
  for (const r of RECORDS) {
    let v = null;
    try { v = r.value(m); } catch (e) { v = null; }
    if (v == null || !isFinite(v)) continue;
    const old = D.records[r.id];
    const beats = !old || (r.better === "low" ? v < old.value : v > old.value);
    if (beats) {
      D.records[r.id] = { value: v, at, players: m.n, hours: m.hour };
      m.newRecords.push({ id: r.id, value: v, old: old ? old.value : null });
    }
  }
}

function onEvent(kind, payload, game) {
  if (!game || !kind) return;
  if (!M || M.game !== game) M = new Match(game);
  const m = M;
  if (m.over && kind !== "game_over") return;
  if (m.over && m.filed) return;
  const p = payload || {};
  try { jot(m, kind, p); } catch (e) {}
  m.on(kind, p);
  if (m.tutorial) {
    if (kind === "game_over") {
      if (tutorialDone()) m.questsDone.push("wake_call");
      keepRecord(m);
      watchResults(m);
    }
    return;
  }
  // your look shows in every match you play (never in the tutorial's story)
  if (kind === "hour_started" || kind === "phase_started") applyInPlay();
  if (!m.decide()) return;
  if (!D) load();
  const final = kind === "game_over";
  const done = checkMissions(m, final);
  if (final) file(m);
  const quests = checkQuests(m, final);
  if (done.length || quests.length || final) save();
  // one stamp per kind and event: the end of a match can file several at once
  if (done.length === 1) stamp("MISSION COMPLETE", done[0].title, `Daily orders · ${Object.keys(D.days[m.day].done).length} of 3`, "mission");
  else if (done.length) stamp("MISSIONS COMPLETE", `${done.length} orders done`, done.map((d) => d.title).join(" · "), "mission");
  if (quests.length === 1) {
    const gets = COSMETICS.filter((c) => c.quest === quests[0].id).map((c) => c.name);
    stamp("QUEST", quests[0].name, TIERS[quests[0].tier - 1].name + (gets.length ? ` · unlocks ${gets.join(", ")}` : ""), "quest");
  }
  else if (quests.length) stamp("QUESTS", `${quests.length} quests filed`, quests.map((q) => q.name).join(" · "), "quest");
  if (final) keepRecord(m);
  if (done.length || quests.length || final) changed();
  if (final) watchResults(m);
}

function tutorialDone() {
  if (!D) load();
  if (grantQuest("wake_call", null)) {
    save();
    stamp("QUEST", QUEST_BY_ID.wake_call.name, "First Steps · unlocks HELA's Eye", "quest");
    changed();
    return true;
  }
  return false;
}

/* ───────────────────────── the stamp in the match ─────────────────────────
   A mission or quest completed is pressed on the screen like a rubber stamp
   on the case file: it comes down, holds long enough to read, lifts away. One
   at a time; a second waits its turn. Never while the tab is hidden. */
const stampQueue = [];
let stampBusy = false;
function stamp(word, title, sub, tone) {
  stampQueue.push({ word, title, sub, tone });
  if (!stampBusy) nextStamp();
}
function nextStamp() {
  const s = stampQueue.shift();
  if (!s) { stampBusy = false; return; }
  stampBusy = true;
  if (document.hidden) {           // pressed when the player is back, not into an empty room
    stampQueue.unshift(s);
    const back = () => { if (document.hidden) return; document.removeEventListener("visibilitychange", back); setTimeout(nextStamp, 400); };
    document.addEventListener("visibilitychange", back);
    return;
  }
  const n = document.createElement("div");
  // on a phone the stage is all play (the case, the shelf, the rail): the stamp is
  // pressed in HELA's column instead, under her line, and the log makes room
  const col = document.documentElement.classList.contains("pdx-m-on") && document.querySelector("#pdx-mcol .mc-slot");
  n.className = `chr-stamp chr-stamp-${s.tone}` + (col ? " chr-stamp-col" : "");
  n.setAttribute("role", "status");
  n.innerHTML = `<span class="cs-word">${esc(s.word)}</span><b class="cs-title">${esc(s.title)}</b><span class="cs-sub">${esc(s.sub)}</span>`;
  if (col) col.insertAdjacentElement("afterend", n); else document.body.appendChild(n);
  try { audio.play("chart_stamp"); } catch (e) {}
  const calm = document.documentElement.classList.contains("pdx-a11y")
    || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const dur = 4600;
  const frames = calm || col
    ? [{ opacity: 0 }, { opacity: 1, offset: .06 }, { opacity: 1, offset: .9 }, { opacity: 0 }]
    : [{ opacity: 0, transform: "translateX(-50%) rotate(-4deg) scale(1.5)", easing: "cubic-bezier(.2,.8,.3,1)" },
       { opacity: 1, transform: "translateX(-50%) rotate(-4deg) scale(1)", offset: .05 },
       { opacity: 1, transform: "translateX(-50%) rotate(-4deg) scale(1)", offset: .88 },
       { opacity: 0, transform: "translateX(-50%) translateY(-8px) rotate(-4deg) scale(1.03)" }];
  try { n.animate(frames, { duration: dur, fill: "both" }); } catch (e) {}
  setTimeout(() => { n.remove(); setTimeout(nextStamp, 250); }, dur + 30);
}

/* ─────────────────────── the cosmetics in play ─────────────────────── */
// the Herald print style on every edition (a body class, chronicle.css)
function applyHerald() {
  const b = document.body; if (!b) return;
  const want = "chr-hs-" + equipped("herald").id;
  for (const c of [...b.classList]) if (c.startsWith("chr-hs-") && c !== want) b.classList.remove(c);
  b.classList.add(want);
}
// the traveller badge, pinned on your case (the rucksack) while a match is on
function applyPin() {
  const zone = document.getElementById("rucksack-zone");
  if (!zone) return;
  let pin = document.getElementById("chr-pin");
  const badge = equipped("badge");
  if (!pin) {
    pin = document.createElement("div");
    pin.id = "chr-pin";
    pin.setAttribute("aria-hidden", "true");
  }
  if (pin.parentElement !== zone) zone.appendChild(pin);
  const key = badge.id + "|" + myColour();
  if (pin.dataset.key !== key) {
    pin.dataset.key = key;
    pin.title = badge.name;
    pin.innerHTML = badgeSvg(badge.id, myColour(), "chr-pin-art");
  }
}
function applyInPlay() {
  try { applyHerald(); } catch (e) {}
  try { if (!M || !M.tutorial) applyPin(); } catch (e) {}
}

/* ─────────────────────── the results card, at the end ───────────────────────
   game.js draws the results a few seconds after the last event; the Chronicle
   adds its lines to that card: new records, today's orders, quests, and your
   case file stamp with your title. Watched once, then let go. */
function watchResults(m) {
  const root = document.getElementById("overlay-root") || document.body;
  const add = () => {
    const card = root.querySelector(".gameover .gameover-card");
    if (!card || card.querySelector(".chr-result")) return !!card;
    card.appendChild(resultBlock(m));
    return true;
  };
  if (add()) return;
  const mo = new MutationObserver(() => { if (add()) mo.disconnect(); });
  mo.observe(root, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 60000);
}
function resultBlock(m) {
  const box = document.createElement("div");
  box.className = "chr-result";
  const recBtns = m.recId ? `<span class="cr-rec-btns"><button class="btn btn-ghost btn-sm cr-match" type="button">Match record</button><button class="btn btn-ghost btn-sm cr-print" type="button">Print / save as PDF</button></span>` : "";
  if (m.tutorial) {
    box.innerHTML = `<div class="cr-head"><span class="cr-kick">The Chronicle</span></div>
      <p class="cr-note">This match is filed in your Chronicle, Hour by Hour.</p>
      <div class="cr-foot">${recBtns}</div>`;
    wireResult(box, m);
    return box;
  }
  const st = equipped("stamp"), rk = rank();
  const lines = [];
  // the orders and quests first (they are the news), then the records
  for (const id of m.missionsDone) lines.push(`<li class="cr-mis"><b>Mission</b> ${esc(MISSION_BY_ID[id].title)}</li>`);
  for (const id of m.questsDone) lines.push(`<li class="cr-qst"><b>Quest</b> ${esc(QUEST_BY_ID[id].name)}</li>`);
  for (const r of m.newRecords) {
    const def = RECORD_BY_ID[r.id]; if (!def) continue;
    lines.push(`<li class="cr-rec"><b>New record</b> ${esc(def.name)}: ${esc(fmtRecord(def, r.value))}${def.id === "deepest" ? "" : " " + esc(unitOf(def, r.value))}</li>`);
  }
  if (!lines.length) lines.push(`<li class="cr-none">No new records this time. Today's orders still stand.</li>`);
  box.innerHTML = `
    <div class="cr-head"><span class="cr-kick">The Chronicle</span><span class="cr-rank">${esc(rk.title)}</span></div>
    <ul class="cr-list">${lines.slice(0, 8).join("")}${lines.length > 8 ? `<li class="cr-more">and ${lines.length - 8} more in the Chronicle</li>` : ""}</ul>
    <div class="cr-foot">
      <span class="chr-inkstamp chr-ink-${st.tone}" aria-label="${esc(st.name)}">${esc(st.name)}</span>
      ${recBtns}
      <button class="btn btn-ghost btn-sm cr-open" type="button">Open the Chronicle</button>
    </div>`;
  box.querySelector(".cr-open").addEventListener("click", () => open());
  wireResult(box, m);
  return box;
}

function wireResult(box, m) {
  const v = box.querySelector(".cr-match"), pr = box.querySelector(".cr-print");
  if (v) v.addEventListener("click", () => openMatch(m.recId));
  if (pr) pr.addEventListener("click", () => { openMatch(m.recId); printMatch(); });
}

/* ───────────────────────────── THE COLOURS ─────────────────────────────
   The colour you wear (js/theme.js). The menu's picker is drawn here: green and
   blue from the start, every other colour locked until its quest is done, and the
   quest named on the line under the swatches. */
function wearColour(id) {
  const c = COSMETIC_BY_ID[id];
  if (!c || c.kind !== "colour" || !unlocked(c)) return false;
  D.equip.colour = id; save();
  try { const base = c.theme.base; if (base != null && profile.get().colour !== base) profile.setColour(base); } catch (e) {}
  applyTheme(id);
  return true;
}
// the colour to ask the server for: a palette index, or the theme's id (server/lobby.py clean_colour)
export function colourWish() {
  if (!D) load();
  const t = equipped("colour").theme;
  return t.kind === "single" ? t.base : t.id;
}
const LOCK_SVG = `<svg class="chp-lock" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="7" width="10" height="7" rx="1.2" fill="currentColor"/></svg>`;
const STAR_SVG = `<svg class="chp-star" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0-9 2.6-4.5 7.8-4.5 5.2 0 7.8 4.5 2.6 4.5 0 9-2.6 4.5-7.8 4.5-5.2 0-7.8-4.5-2.6-4.5Z" fill="#d9a441" stroke="#2a1606" stroke-width="1.2"/><circle r="2.2" fill="#2a1606"/></svg>`;
function whyLine(c) {
  const t = c.theme, tier = TIER_NAME[t.tier];
  if (unlocked(c)) return `${t.name}: ${tier.toLowerCase()}${t.tier === "free" ? "" : " reward"}, yours to wear.`;
  const q = QUEST_BY_ID[c.quest];
  return `${t.name} (${tier.toLowerCase()}) is locked. Quest: ${q.name}. ${q.text}`;
}
// The picker folds: one row of the colours you can wear, then a Rewards button
// that opens, in place (never a pop-up), the locked tiers with the quest of each.
let drawerOpen = false;
function swatch(t, cur, say, onWear) {
  const c = COSMETIC_BY_ID[t.id], ok = unlocked(c), on = cur.id === t.id;
  const b = document.createElement("button");
  b.type = "button";
  b.className = `chp-sw chp-${t.kind} chp-tier-${t.tier}` + (on ? " is-on" : "") + (ok ? "" : " is-locked");
  b.dataset.colour = t.id;
  b.style.setProperty("--a", t.a);
  if (t.b) b.style.setProperty("--b", t.b);
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", on ? "true" : "false");
  if (!ok) b.setAttribute("aria-disabled", "true");
  b.setAttribute("aria-label", `${t.name}, ${TIER_NAME[t.tier].toLowerCase()}${ok ? "" : `, locked: quest ${QUEST_BY_ID[c.quest].name}, ${QUEST_BY_ID[c.quest].text}`}`);
  b.title = ok ? t.name : `${t.name}: quest ${QUEST_BY_ID[c.quest].name}`;
  b.innerHTML = (t.kind === "wanted" ? STAR_SVG : "") + (ok ? "" : LOCK_SVG);
  if (say) { b.addEventListener("mouseenter", () => say(c)); b.addEventListener("focus", () => say(c)); }
  b.addEventListener("click", () => {
    if (!unlocked(c)) { if (say) say(c); try { audio.play("click"); } catch (e) {} return; }
    onWear(t.id);
  });
  return b;
}
export function colourPicker(box, nameEl, onPick) {
  if (!box) return;
  if (!D) load();
  const cur = equipped("colour");
  const wear = (id) => { wearColour(id); if (onPick) onPick(); else colourPicker(box, nameEl, onPick); };
  const redraw = () => colourPicker(box, nameEl, onPick);
  box.classList.add("chr-picker");
  box.innerHTML = "";
  const old = document.getElementById("prof-colour-why"); if (old) old.remove();
  // the row: every colour you can wear, then the door to the rewards
  const row = document.createElement("div");
  row.className = "chp-row chp-mine";
  for (const t of THEMES.filter((x) => unlocked(COSMETIC_BY_ID[x.id]))) row.appendChild(swatch(t, cur, null, wear));
  const locked = THEMES.filter((x) => !unlocked(COSMETIC_BY_ID[x.id]));
  if (locked.length) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "chp-more" + (drawerOpen ? " is-open" : "");
    more.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
    more.setAttribute("aria-controls", "chp-drawer");
    more.innerHTML = `${LOCK_SVG}<span>Rewards</span><b>${locked.length}</b>`;
    more.title = "Colours you earn with Chronicle quests";
    more.addEventListener("click", () => { drawerOpen = !drawerOpen; try { audio.play("click"); } catch (e) {} redraw();
      const m = box.querySelector(".chp-more"); if (m) m.focus({ preventScroll: true }); });
    row.appendChild(more);
  }
  box.appendChild(row);
  // the drawer: the locked colours by tier, and what each one asks
  if (locked.length && drawerOpen) {
    const dr = document.createElement("div");
    dr.id = "chp-drawer"; dr.className = "chp-drawer";
    const why = document.createElement("p");
    why.id = "prof-colour-why"; why.className = "chp-why"; why.setAttribute("aria-live", "polite");
    const say = (c) => { why.textContent = whyLine(c); why.classList.toggle("is-locked", !unlocked(c)); };
    for (const tier of ["common", "rare", "epic", "legendary"]) {
      const ts = locked.filter((t) => t.tier === tier);
      if (!ts.length) continue;
      const r = document.createElement("div");
      r.className = "chp-row";
      r.innerHTML = `<span class="chp-lbl chp-lbl-${tier}">${esc(TIER_NAME[tier])}</span>`;
      for (const t of ts) r.appendChild(swatch(t, cur, say, wear));
      dr.appendChild(r);
    }
    why.textContent = "Point at a colour to see the quest that earns it.";
    dr.appendChild(why);
    box.appendChild(dr);
  }
  if (nameEl) nameEl.textContent = cur.theme.name;
}

/* ───────────────────────────── THE MENU ENTRY ─────────────────────────────
   A block on the main menu, under You: your rank, today's three orders, and the
   door to the Chronicle page. If the menu offers #chronicle-slot it goes there. */
function menuBlock() {
  const side = document.querySelector("#screen-landing .landing-side");
  const slot = document.getElementById("chronicle-slot");
  if (!side && !slot) return;
  let box = document.getElementById("chronicle-block");
  if (!box) {
    box = document.createElement("section");
    box.id = "chronicle-block";
    box.className = "menu-block chronicle-block";
    box.setAttribute("aria-labelledby", "chr-block-title");
    if (slot) slot.appendChild(box);
    else {
      const you = side.querySelector(".you-block");
      if (you && you.nextSibling) side.insertBefore(box, you.nextSibling); else side.appendChild(box);
    }
    box.addEventListener("click", (e) => { if (e.target.closest(".chr-open")) { try { audio.play("click"); } catch (x) {} open(); } });
  }
  const rk = rank(), day = dayKey(), rec = (D.days[day] || { done: {} }).done;
  const ids = dailyIds(day);
  const done = ids.filter((id) => rec[id]).length;
  const pct = rk.next ? Math.round(((rk.points - rk.from) / Math.max(1, rk.next.at - rk.from)) * 100) : 100;
  box.innerHTML = `
    <div class="chb-top">
      ${badgeSvg(equipped("badge").id, myColour(), "chb-badge")}
      <h2 class="form-title" id="chr-block-title">The Chronicle</h2>
      <p class="chb-rank"><b>${esc(rk.title)}</b> <span>${rk.points} pts</span></p>
      <button class="chr-open" type="button" title="Records, quests, your look and your record card">Open <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l6 4-6 4z" fill="currentColor"/></svg></button>
      <div class="chb-gauge">
        <div class="chb-bar" role="img" aria-label="${rk.next ? `${rk.points} of ${rk.next.at} points to ${esc(rk.next.title)}` : "Highest rank"}"><i style="width:${pct}%"></i></div>
        <span class="chb-next" aria-hidden="true">${rk.next ? `${esc(rk.next.title)} at ${rk.next.at}` : "Highest rank"}</span>
      </div>
    </div>
    <p class="chb-lede">Today's orders <span>${done} of 3 done</span></p>
    <ul class="chb-missions">${ids.map((id) => {
      const d = MISSION_BY_ID[id], ok = !!rec[id];
      return `<li class="${ok ? "is-done" : ""}" title="${esc(d.title)}: ${esc(d.text)}"><span class="chb-box" aria-hidden="true">${ok ? "&#10003;" : ""}</span><span class="chb-line"><b>${esc(d.title)}</b> ${esc(d.text)}</span>${ok ? `<span class="sr-only"> (done)</span>` : ""}</li>`;
    }).join("")}</ul>`;
}

/* ───────────────────────────── THE PAGE ───────────────────────────── */
let pageEl = null, pageTick = 0, cardUrl = null, lastFocus = null;
function open() {
  if (!D) load();
  close(true);
  lastFocus = document.activeElement;
  pageEl = document.createElement("div");
  pageEl.id = "chronicle";
  pageEl.className = "chr-page";
  pageEl.setAttribute("role", "dialog");
  pageEl.setAttribute("aria-modal", "true");
  pageEl.setAttribute("aria-labelledby", "chr-title");
  document.body.appendChild(pageEl);
  // the screen under the page takes no focus or clicks while the page is up
  document.querySelectorAll(".screen.is-active").forEach((sc) => { sc.inert = true; sc.dataset.chrInert = "1"; });
  renderPage();
  pageEl.addEventListener("click", onPageClick);
  pageEl.addEventListener("keydown", onPageKey);
  // the countdown to new orders, once a minute while the page is open
  pageTick = setInterval(() => {
    const n = pageEl && pageEl.querySelector(".chr-reset");
    if (n) n.textContent = resetText();
  }, 60000);
  const c = pageEl.querySelector(".chr-close"); if (c) c.focus({ preventScroll: true });
}
function close(silent) {
  clearInterval(pageTick);
  if (cardUrl) { try { URL.revokeObjectURL(cardUrl); } catch (e) {} cardUrl = null; }
  if (pageEl) { pageEl.remove(); pageEl = null; }
  document.querySelectorAll("[data-chr-inert]").forEach((sc) => { sc.inert = false; delete sc.dataset.chrInert; });
  if (!silent) {
    try { menuBlock(); } catch (e) {}
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
}
function resetText() {
  const ms = msToMidnight(), h = Math.floor(ms / 3600000), mn = Math.floor((ms % 3600000) / 60000);
  return `New orders in ${h}h ${String(mn).padStart(2, "0")}m`;
}
function onPageKey(e) {
  if (e.key === "Escape") { e.stopPropagation(); close(); }
}
function onPageClick(e) {
  const t = e.target;
  if (t === pageEl || t.closest(".chr-close")) { close(); return; }
  if (onPastClick(t)) return;
  const eq = t.closest("[data-equip]");
  if (eq && !eq.disabled) {
    const c = COSMETIC_BY_ID[eq.dataset.equip];
    if (c && unlocked(c)) {
      if (c.kind === "colour") wearColour(c.id);
      else { D.equip[c.kind] = c.id; save(); }
      applyInPlay();
      try { audio.play("click"); } catch (x) {}
      renderPage(); const again = pageEl.querySelector(`[data-equip="${c.id}"]`); if (again) again.focus({ preventScroll: true });
    }
    return;
  }
  if (t.closest(".chr-make-card")) { makeCard(); return; }
  if (t.closest(".chr-save-card")) { saveCard(); return; }
  if (t.closest(".chr-copy-card")) { copyCard(); return; }
  const clr = t.closest(".chr-clear");
  if (clr) {
    const box = clr.closest(".chr-clearbox");
    if (clr.classList.contains("chr-clear-ask")) box.classList.add("is-asking");
    else if (clr.classList.contains("chr-clear-no")) box.classList.remove("is-asking");
    else if (clr.classList.contains("chr-clear-yes")) { D = blank(); save(); try { bootColour(); } catch (x) {} applyInPlay(); renderPage(); changed(); }
  }
}

function renderPage() {
  if (!pageEl) return;
  const rk = rank(), name = nickname(), col = myColour();
  const day = dayKey(), rec = (D.days[day] || { done: {} }).done;
  const live = M && !M.over && !M.tutorial && M.counts ? M : null;
  const T = D.totals;
  const tiers = TIERS.map((t) => {
    const qs = QUESTS.filter((q) => q.tier === t.n);
    const got = qs.filter((q) => D.quests[q.id]).length;
    return `<section class="chr-tier" aria-label="${esc(t.name)}">
      <h4><span>${roman(t.n)}. ${esc(t.name)}</span><small>${got} of ${qs.length} · ${t.pts} pt${t.pts > 1 ? "s" : ""} each</small></h4>
      <ul class="chr-quests">${qs.map((q) => {
        const ok = !!D.quests[q.id];
        const KIND = { badge: "badge", herald: "Herald print", stamp: "stamp", colour: "colour" };
        const unlocks = COSMETICS.filter((c) => c.quest === q.id).map((c) => `the ${c.name.replace(/^The /, "")} ${KIND[c.kind]}`);
        return `<li class="${ok ? "is-done" : ""}">
          <span class="chq-mark" aria-hidden="true">${ok ? "&#10003;" : ""}</span>
          <span class="chq-words"><b>${esc(q.name)}</b><span>${esc(q.text)}</span>
          ${unlocks.length ? `<em>Unlocks ${unlocks.map(esc).join(" and ")}</em>` : ""}</span>
          ${ok ? `<span class="chq-when">${esc(shortDate(D.quests[q.id]))}</span>` : `<span class="sr-only">not yet</span>`}
        </li>`;
      }).join("")}</ul></section>`;
  }).join("");
  const recCards = RECORDS.map((r) => {
    const v = D.records[r.id];
    return `<li class="chr-rec ${v ? "" : "is-empty"}">
      <span class="chr-rec-name">${esc(r.name)}</span>
      <b class="chr-rec-val">${v ? esc(fmtRecord(r, v.value)) : "--"}${v && r.id !== "deepest" ? ` <small>${esc(unitOf(r, v.value))}</small>` : ""}</b>
      <span class="chr-rec-what">${esc(r.what)}</span>
      ${v ? `<span class="chr-rec-when">${esc(shortDate(v.at))} · ${v.players} seats · Hour ${v.hours}</span>` : ""}
    </li>`;
  }).join("");
  const kinds = [["colour", "Colour", "Your piece, HELA's eye and her words. Green and blue to start; every other colour is a quest."],
    ["badge", "Traveller badge", "Pinned on your case in every match, and on your record card."],
    ["herald", "Herald print", "How every Temporal Herald edition is printed for you."],
    ["stamp", "Case file stamp", "Pressed on your results and on your record card."]];
  const cos = kinds.map(([k, title, note]) => `<section class="chr-cos" aria-label="${esc(title)}">
      <h4>${esc(title)} <small>${esc(note)}</small></h4>
      <div class="chr-cos-row">${COSMETICS.filter((c) => c.kind === k).map((c) => {
        const ok = unlocked(c), on = equipped(k).id === c.id;
        const face = k === "colour" ? `<span class="chp-sw chp-${c.theme.kind} chc-sw ${ok ? "" : "is-locked"}" style="--a:${c.theme.a};${c.theme.b ? `--b:${c.theme.b}` : ""}">${c.theme.kind === "wanted" ? STAR_SVG : ""}${ok ? "" : LOCK_SVG}</span>`
          : k === "badge" ? badgeSvg(c.id, ok ? col : "#6b6456", "chc-art")
          : k === "stamp" ? `<span class="chr-inkstamp chr-ink-${c.tone}">${esc(c.name)}</span>`
          : `<span class="chc-herald chr-hs-${c.id}"><span class="bn-mast">The Temporal Herald</span></span>`;
        const why = (k === "colour" ? `${esc(TIER_NAME[c.theme.tier])} · ` : "") + (ok ? (on ? "Worn" : "Wear it") : `Quest: ${esc(QUEST_BY_ID[c.quest].name)}`);
        return `<button type="button" class="chr-cos-item ${on ? "is-on" : ""} ${ok ? "" : "is-locked"}" data-equip="${c.id}" ${ok ? "" : "disabled"}
          aria-pressed="${on ? "true" : "false"}" aria-label="${esc(c.name)}, ${ok ? (on ? "worn" : "unlocked") : "locked"}">
          <span class="chc-face">${face}</span><span class="chc-name">${esc(c.name)}</span><span class="chc-why">${why}</span></button>`;
      }).join("")}</div></section>`).join("");
  const missions = dailyIds(day).map((id) => {
    const d = MISSION_BY_ID[id], ok = !!rec[id];
    const st = live && live.day === day && !ok ? missionState(d, live, false) : null;
    return `<li class="${ok ? "is-done" : ""}"><span class="chm-box" aria-hidden="true">${ok ? "&#10003;" : ""}</span>
      <span class="chm-words"><b>${esc(d.title)}</b><span>${esc(d.text)}</span></span>
      <span class="chm-state">${ok ? "Done" : st ? `${st.cur} of ${st.target}` : "Open"}</span></li>`;
  }).join("");
  const questsGot = Object.keys(D.quests).length;
  pageEl.innerHTML = `
  <div class="chr-sheet">
    <header class="chr-head">
      ${badgeSvg(equipped("badge").id, col, "chr-head-badge")}
      <div class="chr-head-words">
        <p class="overline">C.R.O.N.O.S. · Temporal Operations Division · Personal file</p>
        <h2 id="chr-title" class="chr-name">${esc(name)}</h2>
        <p class="chr-rankline"><b>${esc(rk.title)}</b> · ${rk.points} Chronicle points${rk.next ? ` · ${rk.next.at - rk.points} more to ${esc(rk.next.title)}` : ""}</p>
      </div>
      <span class="chr-inkstamp chr-ink-${equipped("stamp").tone} chr-head-stamp">${esc(equipped("stamp").name)}</span>
      <button class="icon-btn chr-close" type="button" title="Close (Esc)" aria-label="Close the Chronicle"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
    </header>
    <div class="chr-body">
      <div class="chr-col">
        <section class="chr-block chr-today" aria-labelledby="chr-today-h">
          <h3 id="chr-today-h">Today's orders <span class="chr-reset">${resetText()}</span></h3>
          <p class="chr-note">The same three orders for every traveller today. Each one fits in a single match against the AI; press Tab in a match to see how far along you are.</p>
          <ul class="chr-missions">${missions}</ul>
        </section>
        <section class="chr-block" aria-labelledby="chr-rec-h">
          <h3 id="chr-rec-h">Records</h3>
          <ul class="chr-recs">${recCards}</ul>
          <div class="chr-tables" aria-label="Wins by table size">
            <span class="chr-tables-lbl">Wins by table</span>
            ${TABLES.map((n) => `<span class="chr-table"><b>${D.winsByTable[n]}</b><small>${n} seats</small></span>`).join("")}
            <span class="chr-table chr-streak"><b>${D.streak.now}</b><small>win streak</small></span>
            <span class="chr-table chr-streak"><b>${D.streak.best}</b><small>best streak</small></span>
          </div>
          <p class="chr-totals">${T.matches} matches · ${T.wins} wins · ${T.relics} relics home · ${T.damage} paradox damage · ${T.wrecks} rivals wrecked · ${T.missions} orders done · ${questsGot} of ${QUESTS.length} quests</p>
        </section>
        <section class="chr-block chr-pastbox" aria-labelledby="chr-past-h">
          <h3 id="chr-past-h">Past matches <span>Each match, Hour by Hour</span></h3>
          ${pastMatchesHtml()}
        </section>
        <section class="chr-block chr-share" aria-labelledby="chr-share-h">
          <h3 id="chr-share-h">Your record card</h3>
          <p class="chr-note">A picture of your best records, with your name, badge and stamp. Save it or copy it, and share it wherever you like: nothing is uploaded from here.</p>
          <div class="chr-card-row">
            <button class="btn btn-primary btn-ink chr-make-card" type="button">Print my record card</button>
            <button class="btn btn-ghost chr-save-card" type="button" hidden>Save image</button>
            <button class="btn btn-ghost chr-copy-card" type="button" hidden>Copy image</button>
          </div>
          <p class="chr-card-msg" role="status" aria-live="polite"></p>
          <div class="chr-card-view"></div>
        </section>
      </div>
      <div class="chr-col">
        <section class="chr-block" aria-labelledby="chr-q-h">
          <h3 id="chr-q-h">Quests <span>${questsGot} of ${QUESTS.length}</span></h3>
          ${tiers}
        </section>
        <section class="chr-block" aria-labelledby="chr-c-h">
          <h3 id="chr-c-h">Your look <span>Cosmetic only: none of it changes the game</span></h3>
          ${cos}
        </section>
        <div class="chr-clearbox chr-foot">
          <p class="chr-note">Kept on this computer only. Nothing is sent anywhere.</p>
          <button class="btn btn-ghost btn-sm chr-clear chr-clear-ask" type="button">Clear the Chronicle</button>
          <span class="chr-clear-confirm"><span>Erase every record, order and quest?</span>
            <button class="btn btn-danger btn-sm chr-clear chr-clear-yes" type="button">Erase</button>
            <button class="btn btn-ghost btn-sm chr-clear chr-clear-no" type="button">Keep</button></span>
        </div>
      </div>
    </div>
  </div>`;
}
function shortDate(t) {
  if (!t) return "";
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/* ───────────────────────────── THE RECORD CARD ─────────────────────────────
   Drawn once per click on a 1200 x 675 canvas (a size every social site shows
   whole), in the comic layer's look: halftone paper, a thick ink line and the
   hard ink shadow, lettering with an offset in the player's colour. */
const CW = 1200, CH = 675;
async function drawCard() {
  const cv = document.createElement("canvas");
  cv.width = CW; cv.height = CH;
  const x = cv.getContext("2d");
  try {
    await Promise.all([
      document.fonts.load('italic 700 64px "Oswald"'), document.fonts.load('700 20px "Oswald"'),
      document.fonts.load('500 16px "JetBrains Mono"'), document.fonts.load('700 16px "JetBrains Mono"'),
    ]);
  } catch (e) {}
  const INK = "#15100a", PAPER = "#f4e6b0", col = myColour(), name = nickname(), rk = rank();
  const D1 = '"Oswald", "Arial Narrow", sans-serif', MONO = '"JetBrains Mono", monospace';
  // the paper and its halftone
  x.fillStyle = "#211a10"; x.fillRect(0, 0, CW, CH);
  const dot = document.createElement("canvas"); dot.width = dot.height = 7;
  const dx = dot.getContext("2d"); dx.fillStyle = PAPER; dx.fillRect(0, 0, 7, 7);
  dx.fillStyle = "rgba(120,84,20,.17)"; dx.beginPath(); dx.arc(3.5, 3.5, 1.2, 0, Math.PI * 2); dx.fill();
  const panel = (px, py, w, h, fill, sh = 8) => {
    x.fillStyle = INK; x.fillRect(px + sh, py + sh, w, h);
    x.fillStyle = fill; x.fillRect(px, py, w, h);
    x.lineWidth = 4; x.strokeStyle = INK; x.strokeRect(px, py, w, h);
  };
  panel(24, 24, CW - 56, CH - 56, x.createPattern(dot, "repeat"), 10);
  // speed lines behind the name
  x.save(); x.beginPath(); x.rect(28, 28, CW - 64, 190); x.clip();
  x.strokeStyle = "rgba(21,16,10,.08)"; x.lineWidth = 3;
  for (let i = 0; i < 26; i++) { x.beginPath(); x.moveTo(40 + i * 48, 28); x.lineTo(i * 48 - 160, 220); x.stroke(); }
  x.restore();
  // the tab on the edge
  x.save(); x.translate(56, 24); x.rotate(-0.03);
  x.font = `700 16px ${MONO}`; const tabW = x.measureText("PARADOX: THE LAST TIMELINE").width + 28;
  x.fillStyle = INK; x.fillRect(5, -14, tabW, 32); x.fillStyle = col; x.fillRect(0, -19, tabW, 32);
  x.lineWidth = 3; x.strokeStyle = INK; x.strokeRect(0, -19, tabW, 32);
  x.fillStyle = INK; x.textBaseline = "middle"; x.fillText("PARADOX: THE LAST TIMELINE", 14, -2);
  x.restore();
  // the badge in a medallion
  const bx = 70, by = 64, bs = 132;
  x.fillStyle = INK; x.beginPath(); x.arc(bx + bs / 2 + 6, by + bs / 2 + 6, bs / 2 + 6, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#fff6d6"; x.beginPath(); x.arc(bx + bs / 2, by + bs / 2, bs / 2 + 6, 0, Math.PI * 2); x.fill();
  x.lineWidth = 4; x.strokeStyle = INK; x.stroke();
  const art = BADGE_ART[(equipped("badge").art)] || BADGE_ART.cronos;
  x.save(); x.translate(bx + 14, by + 14); x.scale((bs - 28) / 48, (bs - 28) / 48);
  x.lineJoin = "round"; x.lineCap = "round";
  for (const p of art) {
    const path = new Path2D(p.d);
    if (p.stroke) { x.lineWidth = 2.4; x.strokeStyle = INK; x.stroke(path); continue; }
    x.fillStyle = p.fill === "accent" ? col : p.fill === "paper" ? PAPER : INK; x.fill(path);
    x.lineWidth = 1.6; x.strokeStyle = INK; x.stroke(path);
  }
  x.restore();
  // the name, inked with an offset in the player's colour
  x.textBaseline = "alphabetic";
  let fs = 76; x.font = `italic 700 ${fs}px ${D1}`;
  while (x.measureText(name.toUpperCase()).width > 640 && fs > 40) { fs -= 4; x.font = `italic 700 ${fs}px ${D1}`; }
  const nx = 236, ny = 128;
  x.lineWidth = 8; x.strokeStyle = INK; x.lineJoin = "round";
  x.fillStyle = col; x.strokeText(name.toUpperCase(), nx + 5, ny + 5); x.fillText(name.toUpperCase(), nx + 5, ny + 5);
  x.fillStyle = PAPER; x.strokeText(name.toUpperCase(), nx, ny); x.fillText(name.toUpperCase(), nx, ny);
  x.font = `700 22px ${MONO}`; x.fillStyle = INK;
  x.fillText(`${rk.title.toUpperCase()} · ${rk.points} PTS`, nx + 2, ny + 42);
  x.font = `500 15px ${MONO}`; x.fillStyle = "#4a3a20";
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  x.fillText(`${pl(D.totals.matches, "MATCH", "MATCHES")} · ${pl(D.totals.wins, "WIN", "WINS")} · ${Object.keys(D.quests).length}/${QUESTS.length} QUESTS · ${pl(D.totals.missions, "ORDER", "ORDERS")} DONE`, nx + 2, ny + 70);
  // the six best records
  const order = ["cp", "hour_damage", "fastest_win", "relics", "widest", "survival", "wrecks", "deepest", "margin", "purse", "leap", "match_damage"];
  const shown = order.filter((id) => D.records[id]).slice(0, 6);
  while (shown.length < 6) { const id = order.find((o) => !shown.includes(o)); if (!id) break; shown.push(id); }
  const gx = 56, gy = 250, gw = 350, gh = 150, gap = 26;
  shown.forEach((id, i) => {
    const r = RECORD_BY_ID[id], v = D.records[id];
    const px = gx + (i % 3) * (gw + gap), py = gy + Math.floor(i / 3) * (gh + 24);
    panel(px, py, gw, gh, i % 2 ? "#fff6d6" : "#fbeec4", 7);
    x.fillStyle = col; x.fillRect(px + 2, py + 2, 10, gh - 4);
    x.fillStyle = INK; x.font = `700 15px ${MONO}`;
    x.fillText(r.name.toUpperCase(), px + 26, py + 32);
    const val = v ? fmtRecord(r, v.value) : "--";
    let vs = 64; x.font = `italic 700 ${vs}px ${D1}`;
    while (x.measureText(val).width > gw - 150 && vs > 30) { vs -= 4; x.font = `italic 700 ${vs}px ${D1}`; }
    x.fillText(val, px + 24, py + 104);
    const vw = x.measureText(val).width;
    if (v && r.id !== "deepest") { x.font = `700 20px ${D1}`; x.fillStyle = "#4a3a20"; x.fillText(unitOf(r, v.value).toUpperCase(), px + 34 + vw, py + 104); }
    x.font = `500 13px ${MONO}`; x.fillStyle = "#4a3a20";
    x.fillText(v ? `${shortDate(v.at)} · ${v.players} SEATS · HOUR ${v.hours}` : "NOT YET SET", px + 26, py + 132);
  });
  // wins by table, along the foot
  x.font = `700 15px ${MONO}`; x.fillStyle = INK;
  x.fillText("WINS BY TABLE", 56, 614);
  let tx = 206;
  TABLES.forEach((n) => {
    x.font = `500 13px ${MONO}`; x.fillStyle = "#4a3a20"; x.fillText(`${n} SEATS`, tx, 614);
    tx += x.measureText(`${n} SEATS`).width + 6;
    x.font = `italic 700 30px ${D1}`; x.fillStyle = INK; x.fillText(String(D.winsByTable[n]), tx, 618);
    tx += x.measureText(String(D.winsByTable[n])).width + 22;
  });
  x.font = `500 13px ${MONO}`; x.fillStyle = "#4a3a20"; x.textAlign = "right";
  x.fillText(`KEPT BY HELA · C.R.O.N.O.S. · ${shortDate(Date.now())}`, CW - 58, 614);
  x.textAlign = "left";
  // the case file stamp, pressed at an angle over the corner
  const st = equipped("stamp"), ink = STAMP_INK[st.tone] || STAMP_INK.ink;
  x.save(); x.translate(1010, 128); x.rotate(-0.16);
  x.font = `700 30px ${D1}`;
  const sw = Math.max(170, x.measureText(st.name).width + 44), sh = 70;
  x.globalAlpha = .86; x.strokeStyle = ink; x.fillStyle = ink;
  x.lineWidth = 5; x.strokeRect(-sw / 2, -sh / 2, sw, sh);
  x.lineWidth = 2; x.strokeRect(-sw / 2 + 7, -sh / 2 + 7, sw - 14, sh - 14);
  x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(st.name, 0, 2);
  // a worn stamp: a few specks of paper through the ink
  x.globalCompositeOperation = "destination-out"; x.globalAlpha = .5;
  const r = rng(seedOf(name + st.id));
  for (let i = 0; i < 90; i++) { x.beginPath(); x.arc((r() - .5) * sw, (r() - .5) * sh, r() * 1.8 + .4, 0, Math.PI * 2); x.fill(); }
  x.restore();
  return cv;
}
let cardBlob = null;
async function makeCard() {
  if (!pageEl) return;
  const view = pageEl.querySelector(".chr-card-view"), msg = pageEl.querySelector(".chr-card-msg");
  msg.textContent = "Printing...";
  try {
    const cv = await drawCard();
    cardBlob = await new Promise((res) => cv.toBlob(res, "image/png"));
    if (!pageEl) return;
    if (cardUrl) { try { URL.revokeObjectURL(cardUrl); } catch (e) {} }
    cardUrl = cardBlob ? URL.createObjectURL(cardBlob) : cv.toDataURL("image/png");
    view.innerHTML = `<img class="chr-card-img" alt="Your record card: ${esc(nickname())}, ${esc(rank().title)}, and your best records" src="${cardUrl}">`;
    pageEl.querySelector(".chr-save-card").hidden = false;
    pageEl.querySelector(".chr-copy-card").hidden = !(navigator.clipboard && window.ClipboardItem && cardBlob);
    msg.textContent = "Printed. Save it or copy it, then share it wherever you like.";
  } catch (e) {
    msg.textContent = "The card could not be printed in this browser.";
  }
}
function saveCard() {
  if (!cardUrl) return;
  const a = document.createElement("a");
  a.href = cardUrl;
  a.download = `paradox-chronicle-${nickname().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "traveller"}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  const msg = pageEl && pageEl.querySelector(".chr-card-msg"); if (msg) msg.textContent = "Saved to your downloads.";
}
async function copyCard() {
  const msg = pageEl && pageEl.querySelector(".chr-card-msg");
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": cardBlob })]);
    if (msg) msg.textContent = "Copied. Paste it into Discord or anywhere else.";
  } catch (e) {
    if (msg) msg.textContent = "This browser would not copy the picture. Use Save image instead.";
  }
}

/* ───────────────────────────── MATCH RECORDS ─────────────────────────────
   The owner: "a way of saving match histories, like printing the whole
   Chronicle, but just for one match." Every finished match against the AI and
   every Learn to Play is filed as a record: the table, how it ended, an account
   Hour by Hour (your dice, the voyages, the paradox hits, purchases, deliveries,
   contracts, the Herald's headlines, HELA's notes), everyone's final state and
   what the match earned. It is drawn as a comic-paper document; the page prints
   clean (Print / save as PDF), downloads as one self-contained .html file or as
   a picture, and can be deleted. Kept in localStorage under its own versioned
   key, the last MATCH_KEEP matches, the oldest dropped first.

   The record's shape (v 1, compact on purpose):
     { v, id, start, at, mode: "solo"|"tutorial", me, n, hours, won, winner, reason,
       table: [{ n, c, me, ai }], persona: { build, skin } | null, theme,
       final: [{ n, cp, e, g, c, rel, eq: [names], st: [statuses] }],
       earned: { rec: [[recordId, value]], mis: [missionIds], qst: [questIds] },
       h: [[hour, dice | null, [[cls, text], ...]], ...] }
     dice = [matrix 3x3 of generator values, escape value]. Texts are plain text. */
const MATCH_KEY = "paradoxo.matches.v1" + (PANEL > 1 ? ".panel" + PANEL : "");
const MATCH_KEEP = 20, LINES_PER_HOUR = 48, NOTES_PER_MATCH = 80;
const MODULE_NAME = { 4: "Future", 5: "Present", 6: "Past" };
const FN_NAME = ["Recharge", "Paradox", "Travel"];

function plain(html) {
  const s0 = String(html == null ? "" : html);
  if (!/[<&]/.test(s0)) return s0.slice(0, 300);
  try { return (new DOMParser().parseFromString(s0, "text/html").body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300); }
  catch (e) { return s0.replace(/<[^>]*>/g, "").slice(0, 300); }
}
function who(m, name) { return name === m.me ? "You" : String(name || "Someone"); }
function cardName(m, n) { try { return m.game.nameEn ? m.game.nameEn(n) : n; } catch (e) { return n; } }
function add(m, cls, text) {
  const h = m.hour;
  const count = m.lines.reduce((k, l) => k + (l[0] === h ? 1 : 0), 0);
  if (count >= LINES_PER_HOUR) return;
  m.lines.push([h, cls, String(text).slice(0, 300)]);
}

// one line per thing worth reading later; everyone's moves, yours in the first person
function jot(m, kind, p) {
  hookSources();
  const W = (n) => who(m, n), C = (n) => cardName(m, n);
  // "the Oil Lamp", never "the The First Smartphone"
  const T = (n) => { const c = String(C(n) || ""); return /^the /i.test(c) ? c.replace(/^the /i, "the ") : /'s\b/.test(c) ? c : "the " + c; };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  switch (kind) {
    case "allocations_revealed": {
      const a = p.allocations && p.allocations[m.me];
      if (a && a.matrix) m.dice[m.hour] = [a.matrix.map((r) => r.slice(0, 3)), num(a.escape_valve)];
      break;
    }
    case "delivered": add(m, "deliver", `${W(p.seat)} delivered ${T(p.card)} to Century ${roman(num(p.century))}.`); break;
    case "card_bought":
      add(m, "market", p.stolen ? `${W(p.seat)} took ${T(p.card)} for nothing, a theft.`
        : `${W(p.seat)} bought ${T(p.card)}${p.secret ? " at the Secret Market" : ""} for ${num(p.cost)} gold.`); break;
    case "card_renewed": add(m, "market", `${W(p.seat)} renewed ${T(p.card)} on the Merchant's shelf (${num(p.cost)} gold).`); break;
    case "briefcase_acquired": add(m, "market", `${W(p.seat)} bought a Temporal Briefcase.`); break;
    case "declared": add(m, "market", `${W(p.seat)} paid off the warrant.`); break;
    case "traveled": add(m, "travel", `${W(p.seat)} sailed from Century ${roman(num(p.from))} to ${num(p.to) === 0 ? "Year Zero" : "Century " + roman(num(p.to))}.`); break;
    case "paradox_resolved": {
      const hits = p.hits || [];
      if (p.module === "chaos_reward") {
        add(m, "paradox", `Chaos contract${m.roller ? ` by ${W(m.roller)}` : ""}: a paradox on ${hits.map((h) => W(h.seat)).join(", ") || "no one"}.`);
        break;
      }
      const col = num(p.module) - 4, A = m.alloc || {};
      const fired = Object.keys(A).filter((s) => A[s][1] && A[s][1][col] > 0).map(W);
      const hit = hits.map((h) => `${W(h.seat)} -${num(h.damage)}`).join(", ");
      if (hit) add(m, "paradox", `Paradox, ${MODULE_NAME[p.module] || "module " + p.module}${fired.length ? ` (fired by ${fired.join(", ")})` : ""}: ${hit}.`);
      break;
    }
    case "exploded": add(m, "danger", `${W(p.seat)}: the motor exploded${p.energy_lost ? ` (-${num(p.energy_lost)} energy)` : ""}.`); break;
    case "overloaded":
      if (p.seat === m.me) add(m, "machine", `You overloaded ${(p.functions || []).map((f) => FN_NAME[f] || f).join(" and ") || "a function"}: shut next Hour.`); break;
    case "valve_reward": if (p.seat === m.me) add(m, "machine", "Your reactor filled through the calm escape valve."); break;
    case "reward_resolved": add(m, "contract", `${W(p.seat)} signed a ${p.category} contract (${["", "I", "II", "III"][num(p.roll)] || p.roll}).`); break;
    case "milestone": add(m, "cp", `${W(p.seat)} claimed the millennium milestone at Century ${roman(num(p.century))}.`); break;
    case "wanted": add(m, "danger", `${W(p.seat)} ${p.seat === m.me ? "are" : "is"} declared WANTED.`); break;
    case "terminated": add(m, "danger", `${W(p.seat)} ${p.seat === m.me ? "were" : "was"} terminated${p.by && p.by !== p.seat ? ` by ${W(p.by)}` : ""}.`); break;
    case "respawned": add(m, "travel", `${W(p.seat)} came back at Century ${roman(num(p.century))}.`); break;
    case "secret_market_opened": add(m, "market", `The Secret Market opened at Century XI${p.by ? `, found by ${W(p.by)}` : ""}.`); break;
    case "activated": add(m, "item", `${W(p.seat)} used ${T(p.card)}.`); break;
    case "card_stolen": add(m, "danger", `${W(p.seat)} stole ${T(p.card)}${p.from ? ` from ${W(p.from)}` : ""}.`); break;
    case "card_destroyed": add(m, "danger", `${cap(T(p.card))} was destroyed.`); break;
    case "game_over": add(m, "end", `The match ends: ${W(p.winner)} ${p.winner === m.me ? "win" : "wins"}.`); break;
    default: break;
  }
}

// The Herald and HELA's notes are not game events: listen where they are filed
// (cabin.js __helaFileNews, help.js __pdxHelp.note), passing every call through.
function hookSources() {
  try {
    const fn = window.__helaFileNews;
    if (typeof fn === "function" && !fn.__chr) {
      const wrapped = function (item) {
        try { if (M && !M.over && item && item.headline) add(M, "herald", `${plain(item.headline)}${item.sub ? ". " + plain(item.sub) : ""}`); } catch (e) {}
        return fn.apply(this, arguments);
      };
      wrapped.__chr = true; window.__helaFileNews = wrapped;
    }
  } catch (e) {}
  try {
    const H = window.__pdxHelp;
    if (H && typeof H.note === "function" && !H.note.__chr) {
      const orig = H.note;
      const wrapped = function (html, opt) {
        try {
          if (M && !M.over && M.noteKeys.size < NOTES_PER_MATCH) {
            const t = plain(html && html.nodeType === 1 ? html.innerHTML : html), k = (opt && opt.key) || t;
            // her narration of a voyage or a purchase is already a line of the Hour
            const echo = /^[^.]{1,40} (sails?|buys?) /.test(t) && t.length < 90;
            if (t && !echo && !M.noteKeys.has(k)) { M.noteKeys.add(k); add(M, "note", t); }
          }
        } catch (e) {}
        return orig.apply(this, arguments);
      };
      wrapped.__chr = true; H.note = wrapped;
    }
  } catch (e) {}
}

function buildRecord(m) {
  const g = m.game, v = g.view || {}, tr = v.travelers || [];
  const scores = (m.lastScores || {});
  const colour = (n) => { try { return g.colorOf(n); } catch (e) { return "#888"; } };
  const bots = g._bots || new Set();
  const byHour = {};
  for (const [h, c, t] of m.lines) (byHour[h] = byHour[h] || []).push([c, t]);
  const hours = Object.keys(Object.assign({}, byHour, m.dice)).map(Number).sort((a, b) => a - b);
  let persona = null;
  try { persona = window.__pdxPersona ? window.__pdxPersona.get() : null; } catch (e) {}
  return {
    v: 1, id: `${m.startedAt.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    start: m.startedAt, at: Date.now(), mode: m.tutorial ? "tutorial" : "solo", me: m.me,
    n: m.n || tr.length, hours: m.hour, won: !!m.won, winner: m.winnerName || "", reason: m.reason,
    table: tr.map((t) => ({ n: t.name, c: colour(t.name), me: t.name === m.me, ai: bots.has(t.name) || t.name !== m.me })),
    persona, theme: (document.body && document.body.dataset.pdxTheme) || null,
    final: tr.map((t) => ({
      n: t.name, cp: typeof scores[t.name] === "number" ? scores[t.name] : num(t.contract_points),
      e: num(t.energy), g: num(t.gold), c: num(t.century),
      rel: (t.temporal_receptor || []).length,
      eq: (t.equipment || t.hand || []).map((c) => cardName(m, c.name || c)).slice(0, 8),
      st: (t.statuses || []).filter((x) => x === "terminated" || x === "wanted"),
    })).sort((a, b) => b.cp - a.cp),
    earned: { rec: m.newRecords.map((r) => [r.id, r.value]), mis: m.missionsDone.slice(), qst: m.questsDone.slice() },
    h: hours.map((h) => [h, m.dice[h] || null, byHour[h] || []]),
  };
}

function loadMatches() {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((r) => r && r.v === 1 && typeof r.id === "string" && Array.isArray(r.h)) : [];
  } catch (e) { return memMatches.slice(); }
}
let memMatches = [];                 // the copy kept when storage is blocked or full
function saveMatches(list) {
  list = list.slice(-MATCH_KEEP);
  memMatches = list.slice();
  // full storage: the oldest records go first until it fits
  for (let tries = 0; tries <= list.length; tries++) {
    try { localStorage.setItem(MATCH_KEY, JSON.stringify(list)); return list; }
    catch (e) { if (list.length <= 1) break; list = list.slice(1); }
  }
  return list;
}
function keepRecord(m) {
  if (m.recId) return;
  try {
    const rec = buildRecord(m);
    m.recId = rec.id;
    const list = loadMatches(); list.push(rec); saveMatches(list);
  } catch (e) { console.warn("chronicle record:", e); }
}
function findMatch(id) { return loadMatches().find((r) => r.id === id) || memMatches.find((r) => r.id === id) || null; }
function deleteMatch(id) { saveMatches(loadMatches().filter((r) => r.id !== id)); }

const REASON = { year_zero: "a traveller reached Year Zero", full_receptor: "a traveller mended all three periods",
  last_traveler: "the last traveller standing", all_terminated: "every traveller was terminated", merchant_empty: "the Merchant ran out of relics" };
function whenText(t) {
  const d = new Date(t);
  return `${shortDate(t)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function recTitle(r) { return r.mode === "tutorial" ? "Learn to Play" : `Against the AI, ${r.n} at the table`; }

/* the document: the same markup on screen, in print and in the downloaded file */
function matchDocHtml(r) {
  const me = r.table.find((t) => t.me) || { n: r.me, c: "#6fae6a" };
  const colOf = (n) => (r.table.find((t) => t.n === n) || {}).c || "#888";
  const W = (n) => (n === r.me ? "You" : n);
  const dur = Math.max(1, Math.round((r.at - r.start) / 60000));
  const earned = [
    ...r.earned.mis.map((id) => MISSION_BY_ID[id] ? `<li><b>Mission</b> ${esc(MISSION_BY_ID[id].title)}</li>` : ""),
    ...r.earned.qst.map((id) => QUEST_BY_ID[id] ? `<li><b>Quest</b> ${esc(QUEST_BY_ID[id].name)}</li>` : ""),
    ...r.earned.rec.map(([id, v]) => RECORD_BY_ID[id] ? `<li><b>New record</b> ${esc(RECORD_BY_ID[id].name)}: ${esc(fmtRecord(RECORD_BY_ID[id], v))}${id === "deepest" ? "" : " " + esc(unitOf(RECORD_BY_ID[id], v))}</li>` : ""),
  ].join("");
  const dice = (d) => {
    if (!d) return "";
    const R = ["", "I", "II", "III"];
    const cells = d[0].map((row, ri) => `<tr><th>${FN_NAME[ri]}</th>${row.map((v) => `<td class="${v ? "on" : ""}">${v ? R[v] || v : ""}</td>`).join("")}</tr>`).join("");
    return `<table class="chd-dice" aria-label="Your dice this Hour"><caption>Your dice</caption>${cells}${d[1] ? `<tr><th>Valve</th><td class="on" colspan="3">${R[d[1]] || d[1]}</td></tr>` : ""}</table>`;
  };
  const hours = r.h.map(([h, d, lines]) => {
    const heralds = lines.filter((l) => l[0] === "herald"), notes = lines.filter((l) => l[0] === "note");
    const rest = lines.filter((l) => l[0] !== "herald" && l[0] !== "note");
    return `<section class="chd-hour">
      <h3><span>Hour ${h}</span></h3>
      <div class="chd-hbody">${dice(d)}
        <div class="chd-hcol">
          ${rest.length ? `<ul class="chd-lines">${rest.map(([c, t]) => `<li class="chd-${esc(c)}">${esc(t)}</li>`).join("")}</ul>` : `<p class="chd-quiet">A quiet Hour.</p>`}
          ${heralds.map(([, t]) => `<p class="chd-herald"><span>The Temporal Herald</span>${esc(t)}</p>`).join("")}
          ${notes.length ? `<ul class="chd-notes">${notes.map(([, t]) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        </div></div></section>`;
  }).join("");
  const finals = r.final.map((f) => `<tr class="${f.n === r.me ? "is-me" : ""}">
      <td><i style="background:${esc(colOf(f.n))}"></i>${esc(W(f.n))}${f.n === r.winner ? ` <b class="chd-crown">winner</b>` : ""}</td>
      <td>${f.cp}</td><td>${f.rel}</td><td>${f.e}</td><td>${f.g}</td><td>${f.c === 0 ? "Year Zero" : roman(f.c)}</td>
      <td>${f.st.map((x) => `<b class="chd-st">${esc(x)}</b>`).join(" ")}${esc(f.eq.join(", "))}</td></tr>`).join("");
  return `<article class="chr-doc" data-match="${esc(r.id)}">
    <header class="chd-head" style="--me:${esc(me.c)}">
      <p class="chd-kick">Paradox: The Last Timeline · C.R.O.N.O.S. match record</p>
      <h2>${esc(r.mode === "tutorial" ? "Learn to Play" : "A match against the AI")}</h2>
      <p class="chd-meta">${esc(whenText(r.start))} · ${r.n} travellers · ${r.hours} Hours · about ${dur} min · filed for ${esc(r.me)}</p>
      <span class="chd-result ${r.won ? "won" : "lost"}">${r.won ? "WON" : "LOST"}</span>
      <p class="chd-how">${esc(W(r.winner))} ${r.winner === r.me ? "win" : "wins"}: ${esc(REASON[r.reason] || r.reason || "time settles")}.</p>
    </header>
    <section class="chd-table">
      <h3><span>The table and the final state</span></h3>
      <table class="chd-final"><thead><tr><th>Traveller</th><th>CP</th><th>Relics</th><th>Energy</th><th>Gold</th><th>Century</th><th>Carrying</th></tr></thead><tbody>${finals}</tbody></table>
      <p class="chd-seats">${r.table.map((t) => `<span><i style="background:${esc(t.c)}"></i>${esc(t.me ? `${t.n} (you)` : `${t.n}, AI`)}</span>`).join("")}${r.persona ? `<span class="chd-persona">Your arm: ${r.persona.build === "f" ? "feminine" : "masculine"}, tone ${num(r.persona.skin) + 1}</span>` : ""}</p>
    </section>
    ${earned ? `<section class="chd-earned"><h3><span>Earned in this match</span></h3><ul>${earned}</ul></section>` : ""}
    <section class="chd-account"><h3 class="chd-acc-h"><span>Hour by Hour</span></h3>${hours || `<p class="chd-quiet">No Hours were filed.</p>`}</section>
    <footer class="chd-foot">Kept by HELA on this device · nothing is sent anywhere · printed ${esc(shortDate(Date.now()))}</footer>
  </article>`;
}

let matchEl = null;
function openMatch(id) {
  const r = findMatch(id);
  if (!r) return;
  closeMatch();
  matchEl = document.createElement("div");
  matchEl.id = "chr-match";
  matchEl.className = "chr-page chr-match-page";
  matchEl.setAttribute("role", "dialog"); matchEl.setAttribute("aria-modal", "true"); matchEl.setAttribute("aria-label", "Match record");
  matchEl.innerHTML = `<div class="chr-match-wrap">
    <div class="chr-match-bar">
      <button class="btn btn-primary btn-sm chm-print" type="button">Print / save as PDF</button>
      <button class="btn btn-ghost btn-sm chm-html" type="button">Download page</button>
      <button class="btn btn-ghost btn-sm chm-png" type="button">Download picture</button>
      <span class="chm-del-box"><button class="btn btn-ghost btn-sm chm-del" type="button">Delete</button>
        <span class="chm-del-ask">Delete this record for good? <button class="btn btn-danger btn-sm chm-del-yes" type="button">Delete</button> <button class="btn btn-ghost btn-sm chm-del-no" type="button">Keep</button></span></span>
      <span class="chm-msg" role="status" aria-live="polite"></span>
      <button class="icon-btn chm-close" type="button" aria-label="Close the match record" title="Close (Esc)"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
    </div>
    ${matchDocHtml(r)}</div>`;
  document.body.appendChild(matchEl);
  const msg = (t) => { const n = matchEl && matchEl.querySelector(".chm-msg"); if (n) n.textContent = t; };
  matchEl.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeMatch(); } });
  matchEl.addEventListener("click", (e) => {
    const t = e.target;
    if (t === matchEl || t.closest(".chm-close")) return closeMatch();
    if (t.closest(".chm-print")) return printMatch();
    if (t.closest(".chm-html")) { downloadMatchHtml(r); return msg("Saved to your downloads."); }
    if (t.closest(".chm-png")) { downloadMatchPng(r).then((ok) => msg(ok ? "Saved to your downloads." : "The picture could not be drawn in this browser.")); return; }
    const box = t.closest(".chm-del-box");
    if (t.closest(".chm-del")) { box.classList.add("is-asking"); const k = box.querySelector(".chm-del-no"); if (k) k.focus(); return; }
    if (t.closest(".chm-del-no")) { box.classList.remove("is-asking"); return; }
    if (t.closest(".chm-del-yes")) { deleteMatch(r.id); closeMatch(); if (pageEl) renderPage(); return; }
  });
  const pb = matchEl.querySelector(".chm-print"); if (pb) pb.focus({ preventScroll: true });
}
function closeMatch() { if (matchEl) { matchEl.remove(); matchEl = null; } }

// The browser's own print dialog, with a print sheet that shows the record alone
// on paper (chronicle.css @media print): "Save as PDF" makes the file.
function printMatch() {
  if (!matchEl) return;
  const html = document.documentElement;
  html.classList.add("chr-printing");
  const done = () => { html.classList.remove("chr-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => { try { window.print(); } catch (e) {} setTimeout(done, 1000); }, 60);
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function fileName(r, ext) {
  const d = new Date(r.start);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `paradox-match-${stamp}.${ext}`;
}
// the document's own rules, lifted from chronicle.css, so the file needs nothing else
function docCss() {
  let css = "";
  for (const sh of document.styleSheets) {
    let rules = null;
    try { if (!/chronicle\.css/.test(sh.href || "")) continue; rules = sh.cssRules; } catch (e) { continue; }
    for (const rule of rules) if (/chr-doc|chd-/.test(rule.cssText) && !/chr-printing/.test(rule.cssText)) css += rule.cssText + "\n";
  }
  return css;
}
function downloadMatchHtml(r) {
  const title = `Paradox match record, ${whenText(r.start)}`;
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>body{margin:0;padding:24px 12px;background:#2a2218}\n${docCss()}</style></head>
<body>${matchDocHtml(r)}</body></html>`;
  saveBlob(new Blob([doc], { type: "text/html" }), fileName(r, "html"));
}

// the summary card: a picture of the result and the table, in the record card's style
async function downloadMatchPng(r) {
  try {
    const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 675;
    const x = cv.getContext("2d");
    try { await Promise.all([document.fonts.load('italic 700 64px "Oswald"'), document.fonts.load('500 16px "JetBrains Mono"')]); } catch (e) {}
    const INK = "#15100a", PAPER = "#f4e6b0", D1 = '"Oswald", "Arial Narrow", sans-serif', MONO = '"JetBrains Mono", monospace';
    const me = r.table.find((t) => t.me) || { c: "#6fae6a" };
    x.fillStyle = "#211a10"; x.fillRect(0, 0, 1200, 675);
    x.fillStyle = INK; x.fillRect(34, 34, 1144, 619); x.fillStyle = PAPER; x.fillRect(24, 24, 1144, 619);
    x.lineWidth = 4; x.strokeStyle = INK; x.strokeRect(24, 24, 1144, 619);
    x.fillStyle = me.c; x.fillRect(26, 26, 14, 615);
    x.fillStyle = INK; x.font = `700 16px ${MONO}`; x.fillText("PARADOX: THE LAST TIMELINE · MATCH RECORD", 64, 70);
    x.font = `italic 700 64px ${D1}`; x.fillText(r.mode === "tutorial" ? "LEARN TO PLAY" : "A MATCH AGAINST THE AI", 64, 140);
    x.font = `500 18px ${MONO}`; x.fillStyle = "#4a3a20";
    x.fillText(`${whenText(r.start)} · ${r.n} TRAVELLERS · ${r.hours} HOURS`.toUpperCase(), 66, 176);
    x.fillStyle = INK; x.font = `500 20px ${MONO}`;
    x.fillText(`${(r.winner === r.me ? "You win" : r.winner + " wins")}: ${REASON[r.reason] || r.reason || ""}`.slice(0, 80), 66, 212);
    // the stamp
    x.save(); x.translate(1010, 118); x.rotate(-0.14);
    const ink = r.won ? "#11706d" : "#a3241a";
    x.strokeStyle = ink; x.fillStyle = ink; x.globalAlpha = .88; x.lineWidth = 6; x.strokeRect(-110, -44, 220, 88);
    x.lineWidth = 2; x.strokeRect(-100, -34, 200, 68);
    x.font = `700 50px ${D1}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(r.won ? "WON" : "LOST", 0, 3);
    x.restore();
    // the table
    x.textBaseline = "alphabetic";
    const cols = [66, 470, 580, 700, 820, 930];
    x.font = `700 15px ${MONO}`; x.fillStyle = "#4a3a20";
    ["TRAVELLER", "CP", "RELICS", "ENERGY", "GOLD", "CENTURY"].forEach((h, i) => x.fillText(h, cols[i], 262));
    r.final.slice(0, 6).forEach((f, i) => {
      const y = 306 + i * 50, col = (r.table.find((t) => t.n === f.n) || {}).c || "#888";
      if (f.n === r.me) { x.fillStyle = "rgba(21,16,10,.08)"; x.fillRect(56, y - 32, 1090, 44); }
      x.fillStyle = col; x.fillRect(66, y - 22, 18, 18); x.lineWidth = 2; x.strokeStyle = INK; x.strokeRect(66, y - 22, 18, 18);
      x.fillStyle = INK; x.font = `italic 700 28px ${D1}`;
      x.fillText((f.n === r.me ? `${f.n} (you)` : f.n).toUpperCase().slice(0, 24) + (f.n === r.winner ? "  ★" : ""), 96, y);
      x.font = `italic 700 28px ${D1}`;
      [f.cp, f.rel, f.e, f.g, f.c === 0 ? "YEAR ZERO" : roman(f.c)].forEach((v, k) => x.fillText(String(v), cols[k + 1], y));
    });
    // the moments worth a headline: your deliveries, milestones, wrecks, the Herald
    const top = [];
    for (const [h, , lines] of r.h) for (const [c, t] of lines) if (/^(deliver|cp|herald)$/.test(c) || (c === "danger" && /terminated/.test(t))) top.push(`HOUR ${h} · ${t}`);
    const y0 = 316 + Math.min(6, r.final.length) * 50;
    if (top.length && y0 < 560) {
      x.fillStyle = INK; x.fillRect(66, y0 - 6, 1070, 2);
      x.font = `500 16px ${MONO}`; x.fillStyle = "#3a2c16";
      top.slice(0, Math.floor((590 - y0) / 26)).forEach((t, i) => x.fillText(t.length > 96 ? t.slice(0, 95) + "..." : t, 66, y0 + 22 + i * 26));
    }
    x.font = `500 14px ${MONO}`; x.fillStyle = "#4a3a20";
    const got = r.earned.mis.length + r.earned.qst.length + r.earned.rec.length;
    const pl = (n, w) => `${n} ${w}${n === 1 ? "" : "S"}`;
    x.fillText(`${got ? `${pl(r.earned.mis.length, "ORDER")} · ${pl(r.earned.qst.length, "QUEST")} · ${pl(r.earned.rec.length, "RECORD")} EARNED · ` : ""}KEPT BY HELA ON THIS DEVICE`, 66, 618);
    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    if (!blob) return false;
    saveBlob(blob, fileName(r, "png"));
    return true;
  } catch (e) { return false; }
}

// the Chronicle page's list of past matches (renderPage calls it)
function pastMatchesHtml() {
  const list = loadMatches().slice().reverse();
  if (!list.length) return `<p class="chr-note">No match filed yet. Every match you finish against the AI, and Learn to Play, is kept here.</p>`;
  return `<ul class="chr-past">${list.map((r) => {
    const me = r.final.find((f) => f.n === r.me) || { cp: 0 };
    return `<li data-match="${esc(r.id)}">
      <span class="chp-res ${r.won ? "won" : "lost"}">${r.won ? "Won" : "Lost"}</span>
      <span class="chp-what"><b>${esc(recTitle(r))}</b><span>${esc(whenText(r.start))} · ${r.hours} Hours · ${me.cp} CP</span></span>
      <span class="chp-acts">
        <button class="btn btn-ghost btn-sm chp-view" type="button">View</button>
        <button class="btn btn-ghost btn-sm chp-print" type="button">Print</button>
        <button class="btn btn-ghost btn-sm chp-dl" type="button">Download</button>
        <button class="btn btn-ghost btn-sm chp-del" type="button" aria-label="Delete this match record">Delete</button>
        <span class="chp-ask">Delete for good? <button class="btn btn-danger btn-sm chp-del-yes" type="button">Delete</button> <button class="btn btn-ghost btn-sm chp-del-no" type="button">Keep</button></span>
      </span></li>`;
  }).join("")}</ul>
  <p class="chr-note">The last ${MATCH_KEEP} matches are kept; the oldest goes first. Print makes a PDF through your browser's print dialog; Download saves one page you can open anywhere.</p>`;
}
function onPastClick(t) {
  const li = t.closest(".chr-past li"); if (!li) return false;
  const id = li.dataset.match;
  if (t.closest(".chp-view")) { openMatch(id); return true; }
  if (t.closest(".chp-print")) { openMatch(id); printMatch(); return true; }
  if (t.closest(".chp-dl")) { const r = findMatch(id); if (r) downloadMatchHtml(r); return true; }
  if (t.closest(".chp-del")) { li.classList.add("is-asking"); const k = li.querySelector(".chp-del-no"); if (k) k.focus(); return true; }
  if (t.closest(".chp-del-no")) { li.classList.remove("is-asking"); return true; }
  if (t.closest(".chp-del-yes")) { deleteMatch(id); renderPage(); return true; }
  return false;
}

/* ───────────────────────────── the snapshot ───────────────────────────── */
function snapshot() {
  if (!D) load();
  const rk = rank();
  const records = {};
  for (const [k, r] of Object.entries(D.records)) records[k] = { value: r.value, at: r.at, players: r.players, hours: r.hours };
  return {
    schema: SCHEMA, kind: "paradox.chronicle", nickname: nickname(), title: rk.title, points: rk.points,
    records, totals: { ...D.totals }, winsByTable: { ...D.winsByTable }, streak: { ...D.streak },
    quests: Object.keys(D.quests), generatedAt: Date.now(),
  };
}

/* the three orders of today, with live progress while a counted match is on */
let _zero = null;
const zeroMatch = () => _zero || (_zero = new Match({ seat: "" }));
function missions() {
  if (!D) load();
  const day = dayKey(), rec = (D.days[day] || { done: {} }).done;
  const live = M && !M.tutorial && M.counts && M.day === day && !M.filed ? M : null;
  return dailyIds(day).map((id) => {
    const d = MISSION_BY_ID[id], ok = !!rec[id];
    const st = ok ? { cur: 1, target: 1, done: true, failed: false }
      : live ? missionState(d, live, false) : { cur: 0, target: missionState(d, zeroMatch(), false).target, done: false, failed: false };
    const target = st.target || 1;
    return {
      id, title: d.title, text: d.text, kind: d.cat, done: ok, cur: ok ? target : st.cur, target,
      failed: !ok && !!st.failed, line: `${d.title}: ${d.text} ${ok ? "(done)" : st.failed ? "(missed this match)" : `(${st.cur} of ${target})`}`,
    };
  });
}

/* ───────────────────────────── start ───────────────────────────── */
load();
window.__pdxChronicle = {
  event: (k, p, g) => { try { onEvent(k, p, g); } catch (e) { console.warn("chronicle:", e); } },
  missions, snapshot, open, close: () => close(), tutorialDone, colourPicker, colourWish,
  matches: () => loadMatches(), openMatch, printMatch,
  day: () => dayKey(),
  onChange: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
  // for tests and the harness: the pool, the definitions and a given day's pick
  _defs: { RECORDS, POOL, QUESTS, COSMETICS, RANKS, dailyIds },
  _match: () => (M ? { counts: M.counts, tutorial: M.tutorial, hour: M.hour, dmg: M.dmg, widest: M.widest, buys: M.buys, relics: M.relics, cp: M.cp } : null),
};
// The colour on first run of this version: the profile's colour if it is still
// yours to wear (green or blue, or unlocked), otherwise green.
function bootColour() {
  if (!D.equip.colour) {
    let id = "green";
    try {
      const pc = profile.get().colour, t = THEMES.find((x) => x.kind === "single" && x.base === pc);
      if (t && unlocked(COSMETIC_BY_ID[t.id])) id = t.id;
    } catch (e) {}
    D.equip.colour = id; save();
  }
  const c = equipped("colour");
  try { if (c.theme.base != null && profile.get().colour !== c.theme.base) profile.setColour(c.theme.base); } catch (e) {}
  applyTheme(c.id);
}
function boot() {
  try { bootColour(); } catch (e) { console.warn("chronicle colour:", e); }
  try { menuBlock(); } catch (e) { console.warn("chronicle menu:", e); }
  try { applyHerald(); } catch (e) {}
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
// the menu block follows the profile's colour and name when they change
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest("#prof-swatches, #btn-clear-history")) setTimeout(() => { try { menuBlock(); } catch (x) {} }, 0);
});
