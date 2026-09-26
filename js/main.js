/* =========================================================================
   main.js, entry point: landing, lobby, and message routing into the Game
   ========================================================================= */
import { api, Connection } from "./net.js?202609261009";
import { hydrateIcons, icon } from "./icons.js?202609261009";
import { seatColor, initials, el } from "./util.js?202609261009";
import { Game } from "./game.js?202609261009";
import { audio } from "./audio.js?202609261009";
import { tutorials } from "./tutorial.js?202609261009";
import { profile } from "./profile.js?202609261009";
import { launchTutorial } from "./tutorial-drive.js?202609261009";
import { Controle } from "./controle.js?202609261009";

hydrateIcons(document);
// the auction-phase module (an IIFE outside the module graph) draws the live
// machine with the game's own icon set
window.__icons = { icon, hydrateIcons };

/* ── A MESA DIVIDIDA ─────────────────────────────────────────────────────
   mesa.html abre este mesmo cliente num iframe por jogador e passa na URL
   a sala, o assento e o numero do painel (o resto da costura esta no fim
   deste arquivo). So o painel 1 tem som: os outros ouviriam o mesmo evento
   em eco, e o silencio deles nao pode ir para o localStorage, que os
   paineis compartilham. */
const QS = new URLSearchParams(location.search);
const PAINEL = parseInt(QS.get("painel")) || 0;
if (QS.get("som") === "0") audio.quiet = true;

/* ----------------------- Audio + Settings ------------------------------- */
// Resume the audio context on the first user gesture (autoplay policy).
audio.init();
let _audioUnlocked = false;
function unlockAudio() { if (!_audioUnlocked) { _audioUnlocked = true; audio.unlock(); } }
window.addEventListener("pointerdown", unlockAudio, { once: false });

(function wireSettings() {
  const backdrop = document.getElementById("settings-backdrop");
  const open = () => { syncSettingsUI(); backdrop.hidden = false; audio.play("click"); };
  const close = () => { backdrop.hidden = true; };
  document.getElementById("btn-settings").addEventListener("click", open);
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

  document.getElementById("speed-seg").addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn"); if (!b) return;
    document.querySelectorAll("#speed-seg .seg-btn").forEach((x) => x.classList.toggle("is-on", x === b));
    if (state.game) state.game.setSpeed(b.dataset.speed);
    localStorage.setItem("paradoxo.speed", b.dataset.speed);
  });

  // TELA CHEIA. No app (janela nativa) quem manda e o pywebview; no navegador
  // e a Fullscreen API. F11 faz o mesmo em qualquer um dos dois, porque a
  // janela nativa nao tem barra de titulo para arrastar ate a borda.
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
    const still = q === "low" || lsGet(AMB_KEY) === "off";
    const b = document.body;
    b.classList.toggle("gfx-medium", q === "medium");
    b.classList.toggle("gfx-low", q === "low");
    b.classList.toggle("gfx-still", lsGet(AMB_KEY) === "off");
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
}

const state = { name: "", code: "", seat: "", host: false, conn: null, game: null, room: null };

/* ----------------------------- Landing ---------------------------------- */
const inpName = document.getElementById("inp-name");
const inpCode = document.getElementById("inp-code");
const outPlayers = document.getElementById("out-players");
const errLine = document.getElementById("landing-error");

document.getElementById("players-stepper").addEventListener("click", (e) => {
  const btn = e.target.closest(".step-btn");
  if (!btn) return;
  let v = parseInt(outPlayers.textContent) + parseInt(btn.dataset.step);
  v = Math.max(2, Math.min(6, v));
  outPlayers.textContent = v;
});

function fail(msg) { errLine.textContent = msg; }

/* ── O PERFIL: nome fixo, cor e folha de servico. Guardado nesta maquina. ── */
const PALETTE_HEX = ["#f2a93b", "#2fa3a3", "#8f6fd6",
                     "#6fae6a", "#c2693f", "#5b8fd6"];

function renderProfile() {
  const p = profile.get();
  const st = profile.stats();
  if (p.name && !inpName.value) inpName.value = p.name;

  const sw = document.getElementById("prof-swatches");
  sw.innerHTML = "";
  PALETTE_HEX.forEach((hex, i) => {
    const b = el("button", "prof-sw" + (i === p.colour ? " is-on" : ""));
    b.type = "button";
    b.style.background = hex;
    b.title = "Your colour on the table";
    b.addEventListener("click", () => { profile.setColour(i); renderProfile(); });
    sw.appendChild(b);
  });

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
  const rows = p.history.slice(-8).reverse();
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
}

inpName.addEventListener("change", () => profile.setName(inpName.value));
document.getElementById("btn-clear-history").addEventListener("click", () => {
  profile.clearHistory(); renderProfile(); audio.play("click");
});
renderProfile();

document.getElementById("btn-create").addEventListener("click", async () => {
  const name = inpName.value.trim();
  if (!name) return fail("Enter your operative name first.");
  try {
    profile.setName(name);
    const r = await api.createRoom(name, parseInt(outPlayers.textContent),
                                   "classic", profile.get().colour);
    enterRoom(name, r.code, r.seat, r.room);
  } catch (e) { fail(e.message); }
});

document.getElementById("btn-tutorial").addEventListener("click", () => {
  try { launchTutorial(); } catch (e) { fail(e.message || "Could not start the tutorial."); }
});

// The Test Room: the CLASSIC game with the Machine Auction as its opening
// phase. Same cabin, same client; leilao_fase.js surfaces the auction
// decisions when they arrive.
// A BUILD QUE VAI PARA OS AMIGOS E O JOGO CLASSICO. O Test Room (o leilao,
// ainda em obras) some do menu quando o servidor se declara "classic", para
// ninguem tropecar no que nao esta pronto.
(async () => {
  try {
    const h = await fetch("/api/health").then((r) => r.json());
    if (h && h.build === "classic") {
      const b = document.getElementById("btn-testroom");
      if (b) b.remove();
    }
  } catch (e) { /* servidor mudo: deixa o menu como esta */ }
})();

document.getElementById("btn-testroom").addEventListener("click", async () => {
  const name = inpName.value.trim();
  if (!name) return fail("Enter your operative name first.");
  try {
    const r = await api.createRoom(name, parseInt(outPlayers.textContent), "leilao");
    enterRoom(name, r.code, r.seat, r.room);
  } catch (e) { fail(e.message); }
});

document.getElementById("btn-join").addEventListener("click", async () => {
  const name = inpName.value.trim();
  const code = inpCode.value.trim().toUpperCase();
  if (!name) return fail("Enter your operative name first.");
  if (code.length < 4) return fail("Enter a 4-character room code.");
  try {
    profile.setName(name);
    const r = await api.joinRoom(code, name, profile.get().colour);
    enterRoom(name, code, r.seat, r.room);
  } catch (e) { fail(e.message); }
});

/* ----------------------------- Lobby ------------------------------------ */
function enterRoom(name, code, seat, room) {
  state.name = name; state.code = code; state.seat = seat; state.room = room;
  state.host = room.host === seat;
  document.body.dataset.roomMode = room.mode || "classic";   // cabin.js reads it for the phase strip
  document.getElementById("lobby-code").textContent = code;
  renderLobby(room);
  show("lobby");

  const conn = new Connection(code, seat);
  state.conn = conn;
  state.game = new Game(conn, seat);
  try { state.game.learnSeatColours(room); } catch (e) {}
  if (typeof window !== "undefined") window.__game = state.game;

  conn.on("lobby", (m) => {
    window.__pdxLigado = true;    // a mesa dividida espera por isto antes de comecar
    state.room = m.room;
    try { state.game.learnSeatColours(m.room); } catch (e) {}
    if (m.room.status === "playing") {
      show("game");
      state.game.begin(m.room);
    } else {
      renderLobby(m.room);
    }
  });
  // Game-phase messages flow through the Game's paced event queue so the turn
  // is legible (events animate one at a time; decisions wait for their lead-up).
  conn.on("state", (m) => { show("game"); state.game.onMessage("state", m); });
  conn.on("event", (m) => state.game.onMessage("event", m));
  conn.on("decision_request", (m) => state.game.onMessage("decision", m));
  conn.on("error", (m) => console.warn("server error:", m.detail));
  // Apply any saved presentation speed.
  const savedSpeed = localStorage.getItem("paradoxo.speed");
  if (savedSpeed) {
    state.game.setSpeed(savedSpeed);
    document.querySelectorAll("#speed-seg .seg-btn").forEach((x) =>
      x.classList.toggle("is-on", x.dataset.speed === savedSpeed));
  }
  conn.connect();
}

const seatList = document.getElementById("seat-list");
const btnStart = document.getElementById("btn-start");

function renderLobby(room) {
  seatList.innerHTML = "";
  room.seats.forEach((s, i) => {
    const row = el("li", "seat-row");
    const badge = el("div", "seat-badge");
    // a cor e a que o jogador escolheu no perfil (o servidor ja resolveu
    // colisao); sem escolha, a ordem do assento
    badge.style.background = seatColor(Number.isInteger(s.colour) ? s.colour : i);
    badge.textContent = s.kind === "open" ? "--": initials(s.name);
    row.appendChild(badge);

    const nm = el("div", "seat-name", s.kind === "open" ? "Open seat" : s.name);
    row.appendChild(nm);

    const kind = el("span", `seat-kind ${s.kind}`, s.kind === "bot" ? `bot · ${s.bot_strategy}` : s.kind);
    row.appendChild(kind);

    if (state.host && s.kind === "open") {
      // One click per temperament: the seat takes that bot on the spot.
      const ctl = el("div", "seat-controls");
      ["smart", "aggressive", "conservative", "collector"].forEach((strat) => {
        const b = el("button", "btn btn-ghost btn-sm bot-pick", strat);
        b.title = `Seat a ${strat} bot here`;
        b.addEventListener("click", () => state.conn.addBot(s.name, strat));
        ctl.appendChild(b);
      });
      row.appendChild(ctl);
    }
    if (state.host && s.kind === "bot") {
      // Clicking the chip re-seats the next temperament: cycle to taste.
      const kinds = ["smart", "aggressive", "conservative", "collector"];
      kind.classList.add("bot-cycle");
      kind.title = "Click to change this bot's temperament";
      kind.addEventListener("click", () => {
        const next = kinds[(kinds.indexOf(s.bot_strategy) + 1) % kinds.length];
        state.conn.addBot(s.name, next);
      });
    }
    seatList.appendChild(row);
  });

  btnStart.style.display = state.host ? "" : "none";
  document.getElementById("lobby-hint").textContent = state.host
    ? "Empty seats become bots when the game begins."
      : "Waiting for the host to begin the operation...";
}

btnStart.addEventListener("click", () => state.conn.start());

// Allow Enter to submit on the landing inputs.
[inpName, inpCode].forEach((i) =>
  i.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("btn-join").click(); }));


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
// and at every phase turn: full-table effects (the hour seal blur, banners) can leave the
// promoted table on a soft raster; on a GPU the re-raster costs no dropped frame
new MutationObserver(() => pdxRefit(900))
  .observe(document.body, { attributes: true, attributeFilter: ["data-phase"] });
window.pdxApplyFit = pdxApplyFit;
window.addEventListener("resize", pdxApplyFit);
pdxApplyFit();


/* ── A MESA DIVIDIDA e o controle ─────────────────────────────────────────
   O painel entra direto na sala que mesa.html montou: sem tela de entrada,
   sem lobby para clicar. Com F5 o painel volta sozinho ao mesmo assento.
   ?pad=N (ou ?pad sem numero: o primeiro controle ligado) liga o controle
   numa janela normal, para jogar sozinho no sofa. */
document.getElementById("btn-mesa").addEventListener("click", () => { location.href = "mesa.html"; });

(async function entrarPeloEndereco() {
  const sala = (QS.get("sala") || "").trim().toUpperCase();
  const assento = (QS.get("assento") || "").trim();
  if (!sala || !assento) return;
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(sala)}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.room) throw new Error(d.detail || "No such room");
    if (!d.room.seats.some((s) => s.name === assento)) throw new Error("No such seat in this room");
    enterRoom(assento, sala, assento, d.room);
  } catch (e) { fail(e.message || "Could not enter the table."); }
})();

if (PAINEL || QS.has("pad")) {
  const cor = parseInt(QS.get("cor"));
  const ctl = new Controle({ cor: seatColor(Number.isInteger(cor) ? cor : Math.max(0, PAINEL - 1)) });
  if (QS.has("pad") && window.top === window) {
    const n = parseInt(QS.get("pad"));
    ctl.ligarSozinho(Number.isInteger(n) ? n : -1);
  }
}
