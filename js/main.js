/* =========================================================================
   main.js, entry point: landing, lobby, and message routing into the Game
   ========================================================================= */
import { api, Connection } from "./net.js?202609270121";
import { hydrateIcons, icon } from "./icons.js?202609270121";
import { seatColor, initials, el } from "./util.js?202609270121";
import { Game } from "./game.js?202609270121";
import { audio } from "./audio.js?202609270121";
import { tutorials } from "./tutorial.js?202609270121";
import { profile } from "./profile.js?202609270121";
import { access } from "./access.js?202609270121";
import "./menu-cursor.js";
import { launchTutorial } from "./tutorial-drive.js?202609270121";
import { PadCursor } from "./controle.js?202609270121";
import { fx, PACES, LEVELS } from "./fx.js?202609270121";

hydrateIcons(document);
// the auction-phase module (an IIFE outside the module graph) draws the live
// machine with the game's own icon set
window.__icons = { icon, hydrateIcons };

/* ── THE SPLIT-SCREEN TABLE ──────────────────────────────────────────────
   mesa.html opens this same client in one iframe per player and passes the
   room, the seat and the panel number in the URL (the rest of the wiring is at
   the end of this file). Only panel 1 has sound: the others would echo the same
   event, and their silence cannot go to localStorage, which the panels share. */
const QS = new URLSearchParams(location.search);
const PANEL = parseInt(QS.get("panel")) || 0;
if (QS.get("sound") === "0") audio.quiet = true;

/* ----------------------- Audio + Settings ------------------------------- */
// Resume the audio context on the first user gesture (autoplay policy).
audio.init();
let _audioUnlocked = false;
function unlockAudio() { if (!_audioUnlocked) { _audioUnlocked = true; audio.unlock(); } }
window.addEventListener("pointerdown", unlockAudio, { once: false });

// the pace and comic-effects choices on show, each with its one-line description
function syncPaceUI(sp) {
  const g = state.game || window.__game;
  let s = sp || (g && g.speed);
  if (!s) { try { s = localStorage.getItem("paradoxo.speed"); } catch (e) {} }
  if (!PACES[s]) s = "normal";
  document.querySelectorAll("#speed-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x.dataset.speed === s));
  const sd = document.getElementById("speed-desc"); if (sd) sd.textContent = PACES[s].desc;
  const lv = fx.storedLevel();
  document.querySelectorAll("#fx-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x.dataset.fx === lv));
  const fd = document.getElementById("fx-desc");
  if (fd) fd.textContent = LEVELS[lv].desc + (lv === "full" && document.body.classList.contains("gfx-low") ? " (Low graphics plays them as Light.)" : "");
}
(function wireSettings() {
  const backdrop = document.getElementById("settings-backdrop");
  const open = () => { syncSettingsUI(); backdrop.hidden = false; audio.play("click"); };
  const close = () => { backdrop.hidden = true; };
  document.getElementById("btn-settings").addEventListener("click", open);
  // the main menu has its own Settings button (text size, accessible interface, audio)
  const menuSet = document.getElementById("btn-menu-settings");
  if (menuSet) menuSet.addEventListener("click", open);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.hidden) close();
  });
  document.getElementById("settings-close").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

  const vm = document.getElementById("vol-master");
  const vmu = document.getElementById("vol-music");
  const vs = document.getElementById("vol-sfx");
  const mute = document.getElementById("chk-mute");
  vm.addEventListener("input", () => { unlockAudio(); audio.setVolume("master", vm.value / 100); });
  vmu.addEventListener("input", () => { unlockAudio(); audio.setVolume("music", vmu.value / 100); });
  vs.addEventListener("input", () => { unlockAudio(); audio.setVolume("sfx", vs.value / 100); audio.play("place"); });
  mute.addEventListener("change", () => audio.setMuted(mute.checked));

  // PACE and COMIC EFFECTS (js/fx.js): each choice shows one line saying what it does.
  // The pace goes to the live table (the match, or the tutorial's own table) and is kept
  // for the next match; the tutorial still starts at its own Slow.
  document.getElementById("speed-seg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn"); if (!b || !PACES[b.dataset.speed]) return;
    const g = state.game || window.__game;
    if (g) g.setSpeed(b.dataset.speed);
    try { localStorage.setItem("paradoxo.speed", b.dataset.speed); } catch (err) {}
    fx.applyPace();
    syncPaceUI(b.dataset.speed);
    audio.play("click");
  });
  const fxSeg = document.getElementById("fx-seg");
  if (fxSeg) fxSeg.addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn"); if (!b || !LEVELS[b.dataset.fx]) return;
    fx.setLevel(b.dataset.fx);
    syncPaceUI();
    audio.play("click");
  });

  // FULLSCREEN. In the app (native window) pywebview handles it; in the browser
  // it is the Fullscreen API. F11 does the same in both, because the native
  // window has no title bar to drag to the edge.
  const fs = document.getElementById("chk-fullscreen");
  const nativeFS = () => {
    try { return window.pywebview && window.pywebview.api
      && window.pywebview.api.fullscreen; } catch (e) { return null; }
  };
  function toggleFullscreen(want) {
    const nat = nativeFS();
    if (nat) { nat(); return; }
    const on = !!document.fullscreenElement;
    if (want === undefined) want = !on;
    if (want && !on) document.documentElement.requestFullscreen().catch(() => {});
    if (!want && on) document.exitFullscreen().catch(() => {});
  }
  window.__pdxFullscreen = toggleFullscreen;
  fs.addEventListener("change", () => toggleFullscreen(fs.checked));
  document.addEventListener("fullscreenchange", () => {
    fs.checked = !!document.fullscreenElement;
    if (window.pdxApplyFit) window.pdxApplyFit();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "F11") { e.preventDefault(); toggleFullscreen(); }
  });

  const tut = document.getElementById("chk-tutorials");
  tut.addEventListener("change", () => tutorials.setEnabled(tut.checked));
  document.getElementById("btn-reset-tutorials").addEventListener("click", () => {
    tutorials.resetAll(); audio.play("click");
  });

  // GRAPHICS. A quality preset and an ambient switch, both body classes read by app.css
  // (GRAPHICS QUALITY block), and the table size that main.js fit-scale multiplies in.
  // All three persist in this machine's localStorage and apply at startup.
  const GFX_KEY = "pdx-gfx-quality", AMB_KEY = "pdx-gfx-ambient", UI_KEY = "pdx-ui-scale";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const gfxSeg = document.getElementById("gfx-seg");
  const amb = document.getElementById("chk-ambient");
  const uiSel = document.getElementById("sel-ui-scale");
  function applyGfx() {
    const q = ["high", "medium", "low"].includes(lsGet(GFX_KEY)) ? lsGet(GFX_KEY) : "high";
    // Medium stills the chart's ambient loops too: measured on an awake table they cost about
    // a quarter of the frame rate (their layers and overlaps), the biggest single item left
    // the accessible interface rests the ambient loops too (calm motion, js/access.js)
    const calm = document.documentElement.classList.contains("pdx-a11y");
    const still = q !== "high" || lsGet(AMB_KEY) === "off" || calm;
    const b = document.body;
    b.classList.toggle("gfx-medium", q === "medium");
    b.classList.toggle("gfx-low", q === "low");
    b.classList.toggle("gfx-still", lsGet(AMB_KEY) === "off" || calm);
    // map-still is the chart's own ambient kill switch (app.css, also on F6)
    if (still) b.classList.add("map-still");
    else if (b.dataset.gfxStill === "1") b.classList.remove("map-still");
    b.dataset.gfxStill = still ? "1" : "0";
    return q;
  }
  window.__pdxApplyGfx = applyGfx;
  applyGfx();
  if (gfxSeg) gfxSeg.addEventListener("click", (e) => {
    const bt = e.target.closest(".seg-btn"); if (!bt) return;
    lsSet(GFX_KEY, bt.dataset.gfx);
    applyGfx(); syncGfxUI(); audio.play("click");
  });
  if (amb) amb.addEventListener("change", () => { lsSet(AMB_KEY, amb.checked ? "on" : "off"); applyGfx(); });
  if (uiSel) uiSel.addEventListener("change", () => {
    lsSet(UI_KEY, uiSel.value);
    if (window.pdxApplyFit) window.pdxApplyFit();
  });
  function syncGfxUI() {
    const q = applyGfx();
    if (gfxSeg) gfxSeg.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("is-on", x.dataset.gfx === q));
    if (amb) { amb.checked = lsGet(AMB_KEY) !== "off" && q !== "low"; amb.disabled = q === "low"; }
    if (uiSel) {
      const v = parseFloat(lsGet(UI_KEY)) || 1;
      const opt = [...uiSel.options].find((o) => Math.abs(parseFloat(o.value) - v) < 1e-3);
      uiSel.value = opt ? opt.value : "1";
    }
  }

  function syncSettingsUI() {
    syncGfxUI();
    // the native window (pywebview) goes fullscreen without the Fullscreen API
    fs.checked = !!document.fullscreenElement
      || (window.innerWidth >= screen.width && window.innerHeight >= screen.height);
    vm.value = Math.round(audio.vol.master * 100);
    vmu.value = Math.round(audio.vol.music * 100);
    vs.value = Math.round(audio.vol.sfx * 100);
    mute.checked = audio.muted;
    tut.checked = tutorials.enabled;
    access.sync();
    syncPaceUI();
    // Leave match shows only while a match is on the table
    const lv = document.getElementById("set-leave");
    if (lv) lv.hidden = !(document.getElementById("screen-game").classList.contains("is-active") && !PANEL);
  }
})();
document.getElementById("cronos-mark").innerHTML = icon("cronos");
document.getElementById("cronos-mark-game").innerHTML = icon("cronos");

const screens = {
  landing: document.getElementById("screen-landing"),
  lobby: document.getElementById("screen-lobby"),
  game: document.getElementById("screen-game"),
};
function show(name) {
  const was = screens.game.classList.contains("is-active");
  Object.entries(screens).forEach(([k, s]) => s.classList.toggle("is-active", k === name));
  if (name === "game" && !was && window.pdxRefit) window.pdxRefit(1500);
  if (name === "game") setTimeout(dockLeave, 0);
  // the settings panel belongs to whichever screen is up; the Leave line only to a match
  const lv = document.getElementById("set-leave");
  if (lv) lv.hidden = !(name === "game" && !PANEL);
}

const state = { name: "", code: "", seat: "", host: false, solo: false, conn: null, game: null, room: null };

/* The build tells the truth about itself: the browser demo (tools/play/play-shim.js
   sets window.PARADOX_DEMO) is you against AI opponents, with no friends to invite
   and no room code to share; the desktop app also hosts and joins rooms. */
const DEMO = !!window.PARADOX_DEMO;
if (DEMO) document.documentElement.classList.add("pdx-demo");

/* ----------------------------- Landing ---------------------------------- */
const inpName = document.getElementById("inp-name");
const inpCode = document.getElementById("inp-code");
const outPlayers = document.getElementById("out-players");
const errLine = document.getElementById("landing-error");
const playersNote = document.getElementById("players-note");
const nPlayers = () => Math.max(2, Math.min(6, parseInt(outPlayers.textContent) || 3));

function updatePlayersNote() {
  const opp = nPlayers() - 1;
  playersNote.textContent = `You and ${opp} AI opponent${opp === 1 ? "" : "s"}`;
}
document.getElementById("players-stepper").addEventListener("click", (e) => {
  const btn = e.target.closest(".step-btn");
  if (!btn) return;
  outPlayers.textContent = Math.max(2, Math.min(6, nPlayers() + parseInt(btn.dataset.step)));
  updatePlayersNote();
});
updatePlayersNote();
document.getElementById("play-lede").textContent = DEMO
  ? "You against AI opponents, right here in your browser."
  : "You against AI opponents, on this computer.";

function fail(msg) { errLine.textContent = msg || ""; }

// No name is no reason to be stuck on the menu: an empty field plays as "Traveler".
function playerName() {
  let name = inpName.value.trim();
  if (!name) { name = "Traveler"; inpName.value = name; }
  profile.setName(name);
  return name;
}

// One request at a time: a second click while a room is being made does nothing.
let _busy = false;
async function busy(fn) {
  if (_busy) return;
  _busy = true;
  document.body.classList.add("menu-busy");
  fail("");
  try { await fn(); }
  catch (e) { fail(e.message || "Something went wrong. Please try again."); }
  finally { _busy = false; document.body.classList.remove("menu-busy"); }
}

/* ── THE PROFILE: fixed name, colour and service record, kept on this machine ── */
const PALETTE_HEX = ["#f2a93b", "#2fa3a3", "#8f6fd6",
                     "#6fae6a", "#c2693f", "#5b8fd6"];
// the colour is never told by colour alone: every swatch has its name
const PALETTE_NAME = ["Amber", "Teal", "Violet", "Green", "Rust", "Blue"];

function renderProfile() {
  const p = profile.get();
  const st = profile.stats();
  if (p.name && !inpName.value) inpName.value = p.name;

  const sw = document.getElementById("prof-swatches");
  sw.innerHTML = "";
  PALETTE_HEX.forEach((hex, i) => {
    const on = i === p.colour;
    const b = el("button", "prof-sw" + (on ? " is-on" : ""));
    b.type = "button";
    b.style.background = hex;
    b.title = PALETTE_NAME[i];
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.setAttribute("aria-label", PALETTE_NAME[i]);
    b.addEventListener("click", () => { profile.setColour(i); renderProfile(); audio.play("click"); });
    sw.appendChild(b);
  });
  const cn = document.getElementById("colour-name");
  if (cn) cn.textContent = PALETTE_NAME[p.colour] || "";

  const stats = document.getElementById("prof-stats");
  stats.innerHTML = "";
  [["Matches", st.games], ["Wins", st.wins],
   ["Win rate", st.rate + "%"], ["Streak", st.streak]].forEach(([k, v]) => {
    const d = el("div", "prof-stat");
    d.appendChild(el("b", "", String(v)));
    d.appendChild(el("span", "", k));
    stats.appendChild(d);
  });

  const log = document.getElementById("prof-log");
  log.innerHTML = "";
  const rows = p.history.slice(-5).reverse();
  if (!rows.length) {
    const li = el("li", "", "No matches on record yet.");
    log.appendChild(li);
  }
  rows.forEach((r) => {
    const li = el("li", r.won ? "win" : "loss");
    li.appendChild(el("b", "", r.won ? "WON" : "LOST"));
    li.appendChild(el("span", "",
      `${r.players.length} seats · Hour ${r.hours} · ${r.cp} CP`));
    const when = new Date(r.at);
    li.appendChild(el("span", "pl-when",
      `${String(when.getDate()).padStart(2, "0")}/${String(when.getMonth() + 1).padStart(2, "0")}`));
    log.appendChild(li);
  });
  document.getElementById("btn-clear-history").hidden = !p.history.length;
}

inpName.addEventListener("change", () => profile.setName(inpName.value));
document.getElementById("btn-clear-history").addEventListener("click", () => {
  profile.clearHistory(); renderProfile(); audio.play("click");
});
renderProfile();

// PLAY VS AI: a match setup where every other seat is an AI opponent.
document.getElementById("btn-solo").addEventListener("click", () => busy(async () => {
  const name = playerName();
  const r = await api.createRoom(name, nPlayers(), "classic", profile.get().colour);
  enterRoom(r.seat, r.code, r.seat, r.room, { solo: true });
}));

// HOST A ROOM (desktop): the same setup, with a room code for friends.
document.getElementById("btn-create").addEventListener("click", () => busy(async () => {
  const name = playerName();
  const r = await api.createRoom(name, nPlayers(), "classic", profile.get().colour);
  enterRoom(r.seat, r.code, r.seat, r.room, { solo: false });
}));

document.getElementById("btn-tutorial").addEventListener("click", () => {
  if (_busy) return;
  playerName();
  try { launchTutorial(); } catch (e) { fail(e.message || "Could not start the tutorial."); }
});

// The Test Room: the CLASSIC game with the Machine Auction as its opening
// phase. Same cabin, same client; leilao_fase.js surfaces the auction
// decisions when they arrive.
// The build that goes to friends is the classic game. The Test Room (the auction,
// still under construction) leaves the menu when the server says it is "classic",
// so nobody trips over what is not ready.
(async () => {
  try {
    const h = await fetch("/api/health").then((r) => r.json());
    if (h && h.build === "classic") {
      const b = document.getElementById("btn-testroom");
      if (b) b.remove();
    }
  } catch (e) { /* no answer from the server: leave the menu as it is */ }
})();

document.getElementById("btn-testroom").addEventListener("click", () => busy(async () => {
  const name = playerName();
  const r = await api.createRoom(name, nPlayers(), "leilao", profile.get().colour);
  enterRoom(r.seat, r.code, r.seat, r.room, { solo: false });
}));

document.getElementById("btn-join").addEventListener("click", () => busy(async () => {
  const code = inpCode.value.trim().toUpperCase();
  if (code.length < 4) { inpCode.focus(); throw new Error("Type the 4-character room code your friend gave you."); }
  const name = playerName();
  const r = await api.joinRoom(code, name, profile.get().colour);
  enterRoom(r.seat, code, r.seat, r.room, { solo: false });
}));

// Enter on the name plays against the AI; Enter on the room code joins.
inpName.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("btn-solo").click(); });
inpCode.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("btn-join").click(); });

/* ----------------------------- Lobby ------------------------------------ */
const seatList = document.getElementById("seat-list");
const btnStart = document.getElementById("btn-start");
const lobbyErr = document.getElementById("lobby-error");
const lobbyStatus = document.getElementById("lobby-status-text");
const BOT_STYLES = ["smart", "aggressive", "conservative", "collector"];
const STYLE_NAME = { smart: "Smart", aggressive: "Aggressive", conservative: "Cautious", collector: "Collector" };

// The Game is built when the match starts, not in the lobby: going back to the
// menu from the lobby then leaves nothing behind.
function ensureGame() {
  if (state.game) return state.game;
  const g = new Game(state.conn, state.seat);
  state.game = g;
  try { g.learnSeatColours(state.room); } catch (e) {}
  window.__game = g;
  let savedSpeed = null;
  try { savedSpeed = localStorage.getItem("paradoxo.speed"); } catch (e) {}
  if (savedSpeed) g.setSpeed(savedSpeed);
  syncPaceUI(g.speed);
  return g;
}

function enterRoom(name, code, seat, room, opts) {
  state.name = name; state.code = code; state.seat = seat; state.room = room;
  state.host = room.host === seat;
  state.solo = !!(opts && opts.solo);
  state.game = null;
  state.open = false;
  state.openWaiters = [];
  document.body.dataset.roomMode = room.mode || "classic";   // cabin.js reads it for the phase strip
  document.getElementById("lobby-code").textContent = code;
  lobbyErr.textContent = "";
  btnStart.disabled = false;
  renderLobby(room);
  show("lobby");

  const conn = new Connection(code, seat);
  state.conn = conn;
  const mine = () => state.conn === conn;

  conn.on("open", () => {
    if (!mine()) return;
    state.open = true;
    state.openWaiters.splice(0).forEach((f) => f());
  });
  conn.on("close", () => { if (mine()) state.open = false; });
  conn.on("lobby", (m) => {
    if (!mine()) return;
    window.__pdxConnected = true;    // the split-screen table waits for this before it starts
    state.room = m.room;
    try { state.game && state.game.learnSeatColours(m.room); } catch (e) {}
    if (m.room.status === "playing") {
      const g = ensureGame();
      show("game");
      g.begin(m.room);
    } else {
      renderLobby(m.room);
    }
  });
  conn.on("room_closed", () => { if (mine()) backToMenu("The host closed the room."); });
  // Game-phase messages flow through the Game's paced event queue so the turn
  // is legible (events animate one at a time; decisions wait for their lead-up).
  conn.on("state", (m) => { if (!mine()) return; pdxWake(); const g = ensureGame(); show("game"); g.onMessage("state", m); });
  conn.on("event", (m) => { if (!mine()) return; pdxWake(); ensureGame().onMessage("event", m); });
  conn.on("decision_request", (m) => { if (!mine()) return; pdxWake(); ensureGame().onMessage("decision", m); });
  conn.on("error", (m) => {
    console.warn("server error:", m.detail);
    if (mine() && screens.lobby.classList.contains("is-active")) {
      lobbyErr.textContent = m.detail || "The server refused that.";
      btnStart.disabled = false;
    }
  });
  conn.connect();
}

function seatLabel(s) {
  if (s.name === state.seat) return state.host && !state.solo ? `${s.name} (you, host)` : `${s.name} (you)`;
  if (s.kind === "open" && !state.solo) return "Open seat";
  return s.name;   // the name the table will show
}

function renderLobby(room) {
  const solo = state.solo;
  const opp = room.seats.filter((s) => s.name !== state.seat).length;
  const humans = room.seats.filter((s) => s.kind === "human").length;
  document.getElementById("lobby-kicker").textContent = solo ? "Your match" : state.host ? "Your room" : "Room";
  document.getElementById("lobby-title").textContent = solo
    ? `You against ${opp} AI opponent${opp === 1 ? "" : "s"}`
    : `${room.seats.length} seats, ${humans} taken`;
  // the room code is only worth showing when there is someone to share it with
  document.getElementById("lobby-share").hidden = solo || DEMO;

  seatList.innerHTML = "";
  room.seats.forEach((s, i) => {
    const me = s.name === state.seat;
    const row = el("li", "seat-row" + (me ? " is-me" : "") + (s.kind === "open" ? " is-open" : ""));
    const badge = el("div", "seat-badge");
    // the colour the player chose in the profile (the server already settled any
    // clash); with no choice, the seat order
    badge.style.background = seatColor(Number.isInteger(s.colour) ? s.colour : i);
    badge.textContent = s.kind === "open" ? (solo ? "AI" : "?") : initials(s.name);
    row.appendChild(badge);

    const nm = el("div", "seat-name");
    nm.textContent = seatLabel(s);   // a typed name is text, never HTML
    row.appendChild(nm);

    const aiSeat = s.kind === "bot" || (solo && s.kind === "open");
    // the host sees the style on the buttons below; everyone else reads it here
    const kindTxt = s.kind === "human" ? "Player"
      : aiSeat ? (state.host ? "AI opponent" : `AI · ${STYLE_NAME[s.bot_strategy || "smart"] || "Smart"}`)
      : "Waiting for a friend";
    const kind = el("span", `seat-kind ${aiSeat ? "bot" : s.kind}`, kindTxt);
    row.appendChild(kind);

    if (state.host && s.kind !== "human") {
      // the AI's playing style, one click each; an empty seat takes it on the spot
      const ctl = el("div", "seat-controls");
      ctl.setAttribute("role", "group");
      ctl.setAttribute("aria-label", "AI playing style");
      const cur = s.kind === "bot" ? s.bot_strategy : (solo ? "smart" : null);
      ctl.appendChild(el("span", "seat-ctl-lbl", s.kind === "open" && !solo ? "Or seat an AI now:" : "AI style:"));
      BOT_STYLES.forEach((strat) => {
        const b = el("button", "btn btn-ghost btn-sm bot-pick" + (strat === cur ? " is-on" : ""), STYLE_NAME[strat]);
        b.type = "button";
        b.title = `An AI opponent with the ${STYLE_NAME[strat]} style takes this seat`;
        b.setAttribute("aria-pressed", strat === cur ? "true" : "false");
        b.addEventListener("click", () => state.conn && state.conn.addBot(s.name, strat));
        ctl.appendChild(b);
      });
      row.appendChild(ctl);
    }
    seatList.appendChild(row);
  });

  const open = room.seats.filter((s) => s.kind === "open").length;
  btnStart.style.display = state.host ? "" : "none";
  lobbyStatus.textContent = !state.host ? "Waiting for the host"
    : solo || !open ? "Ready to start" : `${open} open seat${open === 1 ? "" : "s"}`;
  document.getElementById("lobby-hint").textContent = !state.host
    ? "You are in. The host starts the match; any seat still empty then is played by an AI opponent."
    : solo
      ? "Pick a playing style for each AI opponent if you like, then press Start match."
      : open
        ? "Wait for your friends to join, then press Start match. Any seat still empty is played by an AI opponent."
        : "Every seat is taken. Press Start match when everyone is ready.";
  document.getElementById("btn-lobby-back").lastChild.textContent = state.host ? " Back to menu" : " Leave room";
}

// START. Sent on the open channel; if the channel is still opening, it waits for it
// (a click that used to vanish into a socket not yet open, leaving you stuck here).
function whenOpen(ms) {
  return new Promise((res, rej) => {
    if (state.open) return res();
    const t = setTimeout(() => rej(new Error("Could not reach the game server. Press Start match to try again.")), ms);
    state.openWaiters.push(() => { clearTimeout(t); res(); });
  });
}
btnStart.addEventListener("click", async () => {
  if (!state.conn || btnStart.disabled) return;
  btnStart.disabled = true;
  lobbyErr.textContent = "";
  lobbyStatus.textContent = "Starting";
  const conn = state.conn;
  try {
    await whenOpen(8000);
    if (state.conn !== conn) return;
    conn.start();
    setTimeout(() => {
      if (state.conn === conn && screens.lobby.classList.contains("is-active")) {
        btnStart.disabled = false;
        lobbyStatus.textContent = "Ready to start";
        lobbyErr.textContent = "The match did not start. Press Start match again.";
      }
    }, 12000);
  } catch (e) {
    btnStart.disabled = false;
    lobbyStatus.textContent = "Ready to start";
    lobbyErr.textContent = e.message;
  }
});

/* ── BACK TO THE MENU ─────────────────────────────────────────────────────
   From the lobby: the seat is given back (the host's room closes) and the menu
   shows at once. From a running match: the page starts over clean on the menu;
   the table holds too much live state to take apart piece by piece, and on the
   desktop the seat is played by an AI opponent from then on. */
function backToMenu(msg) {
  const conn = state.conn;
  state.conn = null; state.room = null; state.code = ""; state.open = false;
  if (conn) {
    try { conn.send({ type: "leave" }); } catch (e) {}
    try { conn.close(); } catch (e) {}
  }
  show("landing");
  renderProfile();
  fail(msg || "");
}
document.getElementById("btn-lobby-back").addEventListener("click", () => { audio.play("click"); backToMenu(); });

function leaveMatch() {
  try { state.conn && state.conn.close(); } catch (e) {}
  location.href = location.pathname;
}
window.__pdxLeaveMatch = leaveMatch;

// The confirm is a line in place of the button, never a pop-up: it covers
// nothing, and it stays until the player answers (Leave, Stay or Escape).
function wireLeave(box) {
  const fold = () => { box.classList.remove("is-asking"); };
  box.querySelector(".leave-ask").addEventListener("click", (e) => {
    e.stopPropagation();
    box.classList.add("is-asking");
    audio.play("click");
    const no = box.querySelector(".leave-no"); if (no) no.focus({ preventScroll: true });
  });
  box.querySelector(".leave-no").addEventListener("click", (e) => { e.stopPropagation(); fold(); });
  box.querySelector(".leave-yes").addEventListener("click", (e) => { e.stopPropagation(); leaveMatch(); });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape" && box.classList.contains("is-asking")) { e.stopPropagation(); fold(); } });
}
document.querySelectorAll("[data-leave]").forEach(wireLeave);

// The table's own Leave control sits beside the settings gear, wherever the cabin
// docks the gear (cabin.js moves it into the visor's station).
const leaveKnob = el("div", "leave-inline leave-knob");
leaveKnob.id = "leave-knob";
leaveKnob.setAttribute("data-leave", "");
leaveKnob.innerHTML =
  `<button class="icon-btn leave-ask" type="button" title="Leave the match" aria-label="Leave the match">${icon("past")}<span class="leave-lbl">Menu</span></button>` +
  `<span class="leave-confirm"><span class="leave-q">Leave the match?</span>` +
  `<button class="btn btn-danger btn-sm leave-yes" type="button">Leave</button>` +
  `<button class="btn btn-ghost btn-sm leave-no" type="button">Stay</button></span>`;
wireLeave(leaveKnob);
function dockLeave() {
  if (PANEL || !screens.game.classList.contains("is-active")) return;
  const gear = document.getElementById("btn-settings");
  if (gear && gear.parentElement && leaveKnob.previousElementSibling !== gear) gear.after(leaveKnob);
}
setInterval(dockLeave, 1000);


// ── FIT-SCALE ─────────────────────────────────────────────────────────────
// The board-HUD (#cam.cam-world) is authored at a fixed 2133x1200 reference and
// scaled to fit the window, so its density is identical on every monitor / OS
// scaling / browser zoom, my calibrated "90%-zoom" look. See app.css .cam-world.
const PDX_REF_W = 2133, PDX_REF_H = 1200;
let _pdxRefitT = 0;
function pdxApplyFit() {
  let ui = 1;
  try { ui = parseFloat(localStorage.getItem("pdx-ui-scale")) || 1; } catch (e) {}
  const fit = Math.min(window.innerWidth / PDX_REF_W, window.innerHeight / PDX_REF_H) * ui;
  const changed = window.__pdxFit !== undefined && Math.abs(window.__pdxFit - fit) > 1e-4;
  window.__pdxFit = fit;   // cabin.js cursor math reads this (rect-free, perf-safe)
  document.documentElement.style.setProperty("--fit", fit.toFixed(4));
  // the chart sheet runs on into the spare room (app.css THE CHART SHEET GROWS): these
  // mirror its --ext-b / --ext-r so the chart's own tear goes straight where the sheet
  // continues past it
  document.body.classList.toggle("sheet-ext-b", window.innerHeight / fit - 1216 > 0.5);
  document.body.classList.toggle("sheet-ext-r", window.innerWidth / fit / 2 - 1082.5 > 0.5);
  // RE-RASTER AT THE NEW SCALE. The table is one promoted layer (will-change) and Chrome
  // keeps the raster scale it first chose for it: go fullscreen from a small window and
  // it stretches the old, smaller picture, so everything turns soft. Once the resize
  // settles, drop the promotion for two frames (app.css body.pdx-refit) and it re-rasters
  // sharp at the new size. One redraw per resize, nothing per frame.
  // The camera's eased transform must not animate the resize either: a transform mid
  // animation also keeps its raster scale locked, so the table snaps to the new size.
  if (changed) pdxRefit(180, true);
}
// Also called once the table first appears (show("game")): the boot itself leaves the
// promoted table rastered at a transitional scale, measurably softer than a refit one.
function pdxRefit(delay, resized) {
  const cam = document.getElementById("cam");
  if (resized && cam) cam.style.setProperty("--cam-dur", "0s");
  clearTimeout(_pdxRefitT);
  _pdxRefitT = setTimeout(() => {
    document.body.classList.add("pdx-refit");
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove("pdx-refit");
      if (cam) cam.style.removeProperty("--cam-dur");
    })));
  }, delay);
}
window.pdxRefit = pdxRefit;
// NOT at every phase turn any more: a refit re-rasters the whole camera plane twice, and in
// a bot match that was the biggest source of 100-900ms stalls (the main thread waits for
// the raster to commit). The hour seal no longer blurs the table (app.css .hh-veil), so
// nothing leaves it on a soft raster between resizes.
window.pdxApplyFit = pdxApplyFit;

// ── THE NAP: an idle table costs nothing ─────────────────────────────────────────────
// Thirty-odd ambient loops (HELA's rings and eye, the cat, gears, vents, heartbeats, the
// chart's waves) plus five rAF loops kept every frame busy while nothing was happening:
// measured on a table waiting for the player's decision, the GPU process near 90% busy and
// the page's main thread near 45%, forever, which is what made the whole computer lag.
// The table naps when nothing is happening: no input for 12s and no game message (sooner,
// 2.5s, when the window has lost focus; at once when it is hidden). Napping pauses the
// CSS animations where they stand and holds every requestAnimationFrame callback; the
// first mouse move, key, message or focus plays them on from the same frame. One-shot
// effects are never paused, and the table never naps while the game is still presenting.
const NAP_IDLE_MS = 12000, NAP_BLUR_MS = 2500;
let _napping = false, _napLast = performance.now(), _napHeld = [], _napId = -1;
const _rawRAF = window.requestAnimationFrame.bind(window);
const _rawCancelRAF = window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame = (cb) => {
  if (!_napping) return _rawRAF(cb);
  const id = _napId--; _napHeld.push([id, cb]); return id;
};
window.cancelAnimationFrame = (id) => {
  if (id < 0) { _napHeld = _napHeld.filter((h) => h[0] !== id); return; }
  _rawCancelRAF(id);
};
function pdxWake() {
  _napLast = performance.now();
  if (!_napping) return;
  _napping = false;
  document.body.classList.remove("pdx-nap");
  const held = _napHeld; _napHeld = [];
  if (held.length) _rawRAF((t) => { for (const h of held) { try { h[1](t); } catch (e) { console.error(e); } } });
}
function pdxNap() {
  if (_napping) return;
  _napping = true;
  document.body.classList.add("pdx-nap");   // app.css: every CSS animation holds still
}
function _napBusy() {
  const g = state.game;
  if (g && (g.busy || (g.queue && g.queue.length))) return true;
  // a one-shot effect still playing (a stamp, a flight, the seal) keeps the table awake
  return document.getAnimations().some((a) => a.playState === "running" && a.effect
    && a.effect.getTiming().iterations !== Infinity);
}
setInterval(() => {
  if (_napping) return;
  const quiet = performance.now() - _napLast;
  if (document.hidden) { pdxNap(); return; }
  if (quiet > (document.hasFocus() ? NAP_IDLE_MS : NAP_BLUR_MS) && !_napBusy()) pdxNap();
}, 500);
["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach((t) =>
  window.addEventListener(t, pdxWake, { passive: true, capture: true }));
window.addEventListener("focus", pdxWake);
document.addEventListener("visibilitychange", () => { if (document.hidden) pdxNap(); else pdxWake(); });
window.__pdxWake = pdxWake;
window.__pdxNapping = () => _napping;
window.addEventListener("resize", pdxApplyFit);
pdxApplyFit();


/* ── THE SPLIT-SCREEN TABLE and the controller ───────────────────────────
   A panel goes straight into the room mesa.html set up: no start screen, no
   lobby to click through. On F5 the panel comes back to the same seat by itself.
   ?pad=N (or ?pad with no number: the first controller connected) turns the
   controller on in a normal window, to play solo from the couch. */
document.getElementById("btn-table").addEventListener("click", () => { location.href = "mesa.html"; });

(async function enterFromAddress() {
  const code = (QS.get("room") || "").trim().toUpperCase();
  const seat = (QS.get("seat") || "").trim();
  if (!code || !seat) return;
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.room) throw new Error(d.detail || "No such room");
    if (!d.room.seats.some((s) => s.name === seat)) throw new Error("No such seat in this room");
    enterRoom(seat, code, seat, d.room);
  } catch (e) { fail(e.message || "Could not enter the table."); }
})();

if (PANEL || QS.has("pad")) {
  const colour = parseInt(QS.get("colour"));
  const cursor = new PadCursor({ colour: seatColor(Number.isInteger(colour) ? colour : Math.max(0, PANEL - 1)) });
  if (QS.has("pad") && window.top === window) {
    const n = parseInt(QS.get("pad"));
    cursor.runSolo(Number.isInteger(n) ? n : -1);
  }
}
