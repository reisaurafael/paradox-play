/* =========================================================================
   mesa.js, the split-screen table: one monitor, up to four panels, one
   controller each
   -------------------------------------------------------------------------
   Each panel is the game client itself in an iframe, going straight into the
   room from its address (?panel=K&room=...&seat=...). The board already draws
   at a fixed reference size and scales by --fit, so each panel shows the whole
   game, in the right proportion, in whatever space it has.

   This page does three things:
     1. pairs the controllers: A takes a seat, B lets it go, START begins
     2. sets up the room over REST: create, join, seat the bots, start
     3. reads the controllers every frame and feeds each one to its panel

   The server rule that shapes this: a seat with no connection is played by
   the bot at once. So the table only starts once EVERY panel is connected.
   ========================================================================= */
import { readPad } from "./controle.js?202609280647";
import { api } from "./net.js?202609280647";
import { PALETTE } from "./util.js?202609280647";

const MAX_PANELS = 4;
const LS_KEY = "paradoxo.table.v1";
const STRATEGIES = ["smart", "aggressive", "conservative", "collector"];
const CONNECT_WAIT_MS = 20000;

const $ = (id) => document.getElementById(id);

/* ------------------------------- the state ------------------------------ */
const slots = [];
for (let k = 0; k < MAX_PANELS; k++) slots.push({ name: "", pad: null, mouse: false });
const prevReading = new Map();   // gp.index -> last reading, to catch the button edge
let seats = 4;
let strategy = "smart";
let stage = "setup";             // setup | opening | playing
const panels = [];               // { slot, iframe, tag }
let padsSeen = -1;

const joined = (s) => s.pad !== null || s.mouse;

/* ------------------------------ persistence ----------------------------- */
function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { saved = {}; }
  let profileName = "";
  try { profileName = (JSON.parse(localStorage.getItem("paradoxo.profile.v1")) || {}).name || ""; } catch (e) { profileName = ""; }
  const names = Array.isArray(saved.names) ? saved.names : [];
  slots.forEach((s, k) => {
    s.name = String(names[k] || (k === 0 && profileName) || `Player ${k + 1}`).slice(0, 24);
  });
  if (Number.isInteger(saved.seats)) seats = Math.max(2, Math.min(6, saved.seats));
  if (STRATEGIES.includes(saved.strategy)) strategy = saved.strategy;
}
function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ names: slots.map((s) => s.name), seats, strategy }));
  } catch (e) {}
}

/* -------------------------------- the setup ----------------------------- */
function renderSlots() {
  const ol = $("slots");
  ol.innerHTML = "";
  slots.forEach((s, k) => {
    const li = document.createElement("li");
    li.className = "slot" + (joined(s) ? " is-on" : "");
    li.style.setProperty("--colour", PALETTE[k]);

    const badge = document.createElement("span");
    badge.className = "slot-badge";
    badge.textContent = String(k + 1);

    const inp = document.createElement("input");
    inp.className = "slot-name";
    inp.maxLength = 24;
    inp.value = s.name;
    inp.placeholder = "Name";
    inp.autocomplete = "off";
    inp.addEventListener("input", () => { s.name = inp.value; save(); });

    const st = document.createElement("span");
    st.className = "slot-status";
    st.textContent = s.pad !== null ? `Controller ${s.pad + 1} ready`
      : s.mouse ? "Mouse and keyboard" : "Press A on a controller";

    const bt = document.createElement("button");
    bt.type = "button";
    bt.className = "slot-btn";
    bt.textContent = joined(s) ? "Leave" : "Join with mouse";
    bt.addEventListener("click", () => {
      if (joined(s)) { s.pad = null; s.mouse = false; } else s.mouse = true;
      renderSlots();
    });

    li.append(badge, inp, st, bt);
    ol.appendChild(li);
  });
  $("out-seats").textContent = String(seats);
  $("sel-strategy").value = strategy;
}

function connectedPads() {
  try {
    return Array.from(navigator.getGamepads ? navigator.getGamepads() : [])
      .filter((g) => g && g.connected);
  } catch (e) { return []; }
}

function setupLoop() {
  if (stage !== "setup") return;
  let changed = false;
  const pads = connectedPads();
  if (pads.length !== padsSeen) {
    padsSeen = pads.length;
    $("pads-seen").textContent = `${pads.length} controller${pads.length === 1 ? "" : "s"} detected`;
  }
  for (const gp of pads) {
    const l = readPad(gp);
    const prev = prevReading.get(gp.index) || {};
    const k = slots.findIndex((s) => s.pad === gp.index);
    if (l.a && !prev.a && k < 0) {
      const free = slots.findIndex((s) => !joined(s));
      if (free >= 0) { slots[free].pad = gp.index; changed = true; }
    }
    if (l.b && !prev.b && k >= 0) { slots[k].pad = null; changed = true; }
    if (l.start && !prev.start && k === 0) { prevReading.set(gp.index, l); begin(); return; }
    prevReading.set(gp.index, l);
  }
  for (const s of slots) {
    if (s.pad !== null && !pads.some((g) => g.index === s.pad)) { s.pad = null; changed = true; }
  }
  if (changed) renderSlots();
  requestAnimationFrame(setupLoop);
}

/* -------------------------------- the room ------------------------------ */
async function begin() {
  if (stage !== "setup") return;
  const error = $("setup-error");
  error.textContent = "";
  const players = slots.filter(joined);
  if (!players.length) { error.textContent = "Press A on a controller, or join with the mouse."; return; }
  const names = players.map((s) => s.name.trim());
  if (names.some((n) => !n)) { error.textContent = "Every seat needs a name."; return; }
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
    error.textContent = "Names must be different."; return;
  }
  if (seats < players.length) seats = players.length;
  stage = "opening";
  save();
  try {
    const r = await api.createRoom(names[0], seats, "classic", slots.indexOf(players[0]));
    const code = r.code;
    let room = r.room;
    for (let i = 1; i < players.length; i++) {
      const j = await api.joinRoom(code, names[i], slots.indexOf(players[i]));
      room = j.room;
    }
    for (const s of room.seats) {
      if (s.kind !== "open") continue;
      const b = await api.addBot(code, s.name, strategy);
      room = b.room;
    }
    mountPanels(code, room, players);
    const missing = await waitConnected(CONNECT_WAIT_MS);
    for (const p of missing) setTag(p, "not connected", true);
    await api.start(code);
    stage = "playing";
    requestAnimationFrame(playLoop);
  } catch (e) {
    stage = "setup";
    $("table").hidden = true;
    $("table").innerHTML = "";
    panels.length = 0;
    $("setup").hidden = false;
    $("btn-leave").hidden = true;
    error.textContent = e.message || "Could not open the table.";
    requestAnimationFrame(setupLoop);
  }
}

function mountPanels(code, room, players) {
  const table = $("table");
  table.innerHTML = "";
  table.className = "table n" + players.length;
  players.forEach((s, i) => {
    const name = s.name.trim();
    const seat = room.seats.find((x) => x.name === name) || {};
    const colour = Number.isInteger(seat.colour) ? seat.colour : slots.indexOf(s);

    const node = document.createElement("div");
    node.className = "panel";

    const q = new URLSearchParams({
      panel: String(i + 1), room: code, seat: name, colour: String(colour), sound: i === 0 ? "1" : "0",
    });
    const f = document.createElement("iframe");
    f.src = "/?" + q.toString();
    f.allow = "autoplay; fullscreen; gamepad";
    f.title = name;

    const tag = document.createElement("div");
    tag.className = "tag";
    tag.style.setProperty("--colour", PALETTE[colour % PALETTE.length]);
    tag.innerHTML = '<span class="tag-dot"></span><span class="tag-name"></span><span class="tag-ctl"></span>';
    tag.querySelector(".tag-name").textContent = name;

    node.append(f, tag);
    table.appendChild(node);
    const p = { slot: s, iframe: f, tag };
    panels.push(p);
    setTag(p, s.pad !== null ? `controller ${s.pad + 1}` : "mouse");
  });
  $("setup").hidden = true;
  table.hidden = false;
  $("btn-leave").hidden = false;
}

function setTag(p, text, alert) {
  p.tag.querySelector(".tag-ctl").textContent = text;
  p.tag.classList.toggle("alert", !!alert);
}

function isConnected(p) {
  try { return !!(p.iframe.contentWindow && p.iframe.contentWindow.__pdxConnected); } catch (e) { return false; }
}

function waitConnected(ms) {
  const t0 = performance.now();
  return new Promise((res) => {
    const tick = () => {
      const missing = panels.filter((p) => !isConnected(p));
      if (!missing.length || performance.now() - t0 > ms) return res(missing);
      setTimeout(tick, 100);
    };
    tick();
  });
}

/* -------------------------------- the game ------------------------------ */
let tPrev = 0;
function playLoop(t) {
  if (stage !== "playing") return;
  const dt = Math.min(0.05, tPrev ? (t - tPrev) / 1000 : 0.016);
  tPrev = t;
  const pads = connectedPads();
  const alive = new Set(pads.map((g) => g.index));
  for (const p of panels) {
    if (p.slot.pad !== null && !alive.has(p.slot.pad)) {
      p.slot.pad = null;
      setTag(p, "controller lost, press A", true);
    }
  }
  for (const gp of pads) {
    const l = readPad(gp);
    const prev = prevReading.get(gp.index) || {};
    prevReading.set(gp.index, l);
    const p = panels.find((x) => x.slot.pad === gp.index);
    if (!p) {
      // a loose controller: A takes the first panel left without one
      if (l.a && !prev.a) {
        const orphan = panels.find((x) => x.slot.pad === null && !x.slot.mouse)
          || panels.find((x) => x.slot.pad === null);
        if (orphan) {
          orphan.slot.pad = gp.index;
          setTag(orphan, `controller ${gp.index + 1}`);
          const cursor = padCursor(orphan);
          if (cursor) cursor.prev = l;    // the A that paired it is not a click
        }
      }
      continue;
    }
    const cursor = padCursor(p);
    if (cursor) cursor.feed(l, dt);
  }
  requestAnimationFrame(playLoop);
}

function padCursor(p) {
  try { return (p.iframe.contentWindow && p.iframe.contentWindow.__pdxPad) || null; } catch (e) { return null; }
}

/* ------------------------------- the wiring ----------------------------- */
load();
renderSlots();
window.__splitTable = { slots, panels };    // tools/dev/split_table_check.py reads this

$("seats-stepper").addEventListener("click", (e) => {
  const b = e.target.closest(".step-btn");
  if (!b) return;
  seats = Math.max(2, Math.min(6, seats + parseInt(b.dataset.step)));
  $("out-seats").textContent = String(seats);
  save();
});
$("sel-strategy").addEventListener("change", (e) => { strategy = e.target.value; save(); });
$("btn-begin").addEventListener("click", () => begin());
$("btn-fullscreen").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
});
$("btn-leave").addEventListener("click", () => {
  if (confirm("End the table and go back to the setup?")) location.reload();
});
window.addEventListener("gamepadconnected", () => { padsSeen = -1; });
window.addEventListener("gamepaddisconnected", () => { padsSeen = -1; });

requestAnimationFrame(setupLoop);
