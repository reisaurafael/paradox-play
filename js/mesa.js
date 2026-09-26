/* =========================================================================
   mesa.js, a mesa dividida: um monitor, ate quatro paineis, um controle cada
   -------------------------------------------------------------------------
   Cada painel e o proprio cliente do jogo num iframe, entrando direto na
   sala pelo endereco (?painel=K&sala=...&assento=...). O tabuleiro ja se
   desenha numa referencia fixa e escala pelo --fit, entao cada painel mostra
   o jogo inteiro, na proporcao certa, no espaco que tiver.

   Esta pagina faz tres coisas:
     1. pareia os controles: A pega um assento, B solta, START comeca
     2. monta a sala pelo REST: cria, entra, poe os bots, comeca
     3. le os controles a cada quadro e alimenta o painel de cada um

   Regra do servidor que manda aqui: assento sem conexao e jogado pelo bot
   na hora. A mesa so comeca depois que TODOS os paineis estao ligados.
   ========================================================================= */
import { normalizar } from "./controle.js?202609261550";
import { api } from "./net.js?202609261550";
import { PALETTE } from "./util.js?202609261550";

const MAX_PAINEIS = 4;
const LS_KEY = "paradoxo.mesa.v1";
const ESTRATEGIAS = ["smart", "aggressive", "conservative", "collector"];
const ESPERA_LIGAR_MS = 20000;

const $ = (id) => document.getElementById(id);

/* ------------------------------- o estado ------------------------------- */
const slots = [];
for (let k = 0; k < MAX_PAINEIS; k++) slots.push({ nome: "", pad: null, mouse: false });
const anterior = new Map();      // gp.index -> leitura anterior, para a borda dos botoes
let assentos = 4;
let estrategia = "smart";
let fase = "setup";              // setup | montando | jogo
const paineis = [];              // { slot, iframe, etiqueta }
let padsVistos = -1;

const ativo = (s) => s.pad !== null || s.mouse;

/* ----------------------------- persistencia ----------------------------- */
function carregar() {
  let salvo = {};
  try { salvo = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { salvo = {}; }
  let perfil = "";
  try { perfil = (JSON.parse(localStorage.getItem("paradoxo.profile.v1")) || {}).name || ""; } catch (e) { perfil = ""; }
  const nomes = Array.isArray(salvo.nomes) ? salvo.nomes : [];
  slots.forEach((s, k) => {
    s.nome = String(nomes[k] || (k === 0 && perfil) || `Player ${k + 1}`).slice(0, 24);
  });
  if (Number.isInteger(salvo.assentos)) assentos = Math.max(2, Math.min(6, salvo.assentos));
  if (ESTRATEGIAS.includes(salvo.estrategia)) estrategia = salvo.estrategia;
}
function guardar() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ nomes: slots.map((s) => s.nome), assentos, estrategia }));
  } catch (e) {}
}

/* ------------------------------ a preparacao ---------------------------- */
function renderSlots() {
  const ol = $("slots");
  ol.innerHTML = "";
  slots.forEach((s, k) => {
    const li = document.createElement("li");
    li.className = "slot" + (ativo(s) ? " is-on" : "");
    li.style.setProperty("--cor", PALETTE[k]);

    const badge = document.createElement("span");
    badge.className = "slot-badge";
    badge.textContent = String(k + 1);

    const inp = document.createElement("input");
    inp.className = "slot-name";
    inp.maxLength = 24;
    inp.value = s.nome;
    inp.placeholder = "Name";
    inp.autocomplete = "off";
    inp.addEventListener("input", () => { s.nome = inp.value; guardar(); });

    const st = document.createElement("span");
    st.className = "slot-status";
    st.textContent = s.pad !== null ? `Controller ${s.pad + 1} ready`
      : s.mouse ? "Mouse and keyboard" : "Press A on a controller";

    const bt = document.createElement("button");
    bt.type = "button";
    bt.className = "slot-btn";
    bt.textContent = ativo(s) ? "Leave" : "Join with mouse";
    bt.addEventListener("click", () => {
      if (ativo(s)) { s.pad = null; s.mouse = false; } else s.mouse = true;
      renderSlots();
    });

    li.append(badge, inp, st, bt);
    ol.appendChild(li);
  });
  $("out-seats").textContent = String(assentos);
  $("sel-strategy").value = estrategia;
}

function lerPads() {
  try {
    return Array.from(navigator.getGamepads ? navigator.getGamepads() : [])
      .filter((g) => g && g.connected);
  } catch (e) { return []; }
}

function lacoSetup() {
  if (fase !== "setup") return;
  let mudou = false;
  const pads = lerPads();
  if (pads.length !== padsVistos) {
    padsVistos = pads.length;
    $("pads-seen").textContent = `${pads.length} controller${pads.length === 1 ? "" : "s"} detected`;
  }
  for (const gp of pads) {
    const l = normalizar(gp);
    const ant = anterior.get(gp.index) || {};
    const k = slots.findIndex((s) => s.pad === gp.index);
    if (l.a && !ant.a && k < 0) {
      const livre = slots.findIndex((s) => !ativo(s));
      if (livre >= 0) { slots[livre].pad = gp.index; mudou = true; }
    }
    if (l.b && !ant.b && k >= 0) { slots[k].pad = null; mudou = true; }
    if (l.start && !ant.start && k === 0) { anterior.set(gp.index, l); comecar(); return; }
    anterior.set(gp.index, l);
  }
  for (const s of slots) {
    if (s.pad !== null && !pads.some((g) => g.index === s.pad)) { s.pad = null; mudou = true; }
  }
  if (mudou) renderSlots();
  requestAnimationFrame(lacoSetup);
}

/* -------------------------------- a sala -------------------------------- */
async function comecar() {
  if (fase !== "setup") return;
  const erro = $("setup-error");
  erro.textContent = "";
  const ativos = slots.filter(ativo);
  if (!ativos.length) { erro.textContent = "Press A on a controller, or join with the mouse."; return; }
  const nomes = ativos.map((s) => s.nome.trim());
  if (nomes.some((n) => !n)) { erro.textContent = "Every seat needs a name."; return; }
  if (new Set(nomes.map((n) => n.toLowerCase())).size !== nomes.length) {
    erro.textContent = "Names must be different."; return;
  }
  if (assentos < ativos.length) assentos = ativos.length;
  fase = "montando";
  guardar();
  try {
    const r = await api.createRoom(nomes[0], assentos, "classic", slots.indexOf(ativos[0]));
    const code = r.code;
    let room = r.room;
    for (let i = 1; i < ativos.length; i++) {
      const j = await api.joinRoom(code, nomes[i], slots.indexOf(ativos[i]));
      room = j.room;
    }
    for (const s of room.seats) {
      if (s.kind !== "open") continue;
      const b = await api.addBot(code, s.name, estrategia);
      room = b.room;
    }
    montar(code, room, ativos);
    const faltaram = await esperarLigados(ESPERA_LIGAR_MS);
    for (const p of faltaram) etiqueta(p, "not connected", true);
    await api.start(code);
    fase = "jogo";
    requestAnimationFrame(lacoJogo);
  } catch (e) {
    fase = "setup";
    $("mesa").hidden = true;
    $("mesa").innerHTML = "";
    paineis.length = 0;
    $("setup").hidden = false;
    $("btn-leave").hidden = true;
    erro.textContent = e.message || "Could not open the table.";
    requestAnimationFrame(lacoSetup);
  }
}

function montar(code, room, ativos) {
  const mesa = $("mesa");
  mesa.innerHTML = "";
  mesa.className = "mesa n" + ativos.length;
  ativos.forEach((s, i) => {
    const nome = s.nome.trim();
    const seat = room.seats.find((x) => x.name === nome) || {};
    const cor = Number.isInteger(seat.colour) ? seat.colour : slots.indexOf(s);

    const no = document.createElement("div");
    no.className = "painel";

    const q = new URLSearchParams({
      painel: String(i + 1), sala: code, assento: nome, cor: String(cor), som: i === 0 ? "1" : "0",
    });
    const f = document.createElement("iframe");
    f.src = "/?" + q.toString();
    f.allow = "autoplay; fullscreen; gamepad";
    f.title = nome;

    const et = document.createElement("div");
    et.className = "etiqueta";
    et.style.setProperty("--cor", PALETTE[cor % PALETTE.length]);
    et.innerHTML = '<span class="et-dot"></span><span class="et-nome"></span><span class="et-ctl"></span>';
    et.querySelector(".et-nome").textContent = nome;

    no.append(f, et);
    mesa.appendChild(no);
    const p = { slot: s, iframe: f, etiqueta: et };
    paineis.push(p);
    etiqueta(p, s.pad !== null ? `controller ${s.pad + 1}` : "mouse");
  });
  $("setup").hidden = true;
  mesa.hidden = false;
  $("btn-leave").hidden = false;
}

function etiqueta(p, texto, alerta) {
  p.etiqueta.querySelector(".et-ctl").textContent = texto;
  p.etiqueta.classList.toggle("alerta", !!alerta);
}

function ligado(p) {
  try { return !!(p.iframe.contentWindow && p.iframe.contentWindow.__pdxLigado); } catch (e) { return false; }
}

function esperarLigados(ms) {
  const t0 = performance.now();
  return new Promise((res) => {
    const tic = () => {
      const faltam = paineis.filter((p) => !ligado(p));
      if (!faltam.length || performance.now() - t0 > ms) return res(faltam);
      setTimeout(tic, 100);
    };
    tic();
  });
}

/* -------------------------------- o jogo -------------------------------- */
let tAnt = 0;
function lacoJogo(t) {
  if (fase !== "jogo") return;
  const dt = Math.min(0.05, tAnt ? (t - tAnt) / 1000 : 0.016);
  tAnt = t;
  const pads = lerPads();
  const vivos = new Set(pads.map((g) => g.index));
  for (const p of paineis) {
    if (p.slot.pad !== null && !vivos.has(p.slot.pad)) {
      p.slot.pad = null;
      etiqueta(p, "controller lost, press A", true);
    }
  }
  for (const gp of pads) {
    const l = normalizar(gp);
    const ant = anterior.get(gp.index) || {};
    anterior.set(gp.index, l);
    const p = paineis.find((x) => x.slot.pad === gp.index);
    if (!p) {
      // controle solto: A pega o primeiro painel que estiver sem controle
      if (l.a && !ant.a) {
        const orfao = paineis.find((x) => x.slot.pad === null && !x.slot.mouse)
          || paineis.find((x) => x.slot.pad === null);
        if (orfao) {
          orfao.slot.pad = gp.index;
          etiqueta(orfao, `controller ${gp.index + 1}`);
          const ctl = controle(orfao);
          if (ctl) ctl.ant = l;    // o A que pareou nao vira clique
        }
      }
      continue;
    }
    const ctl = controle(p);
    if (ctl) ctl.alimentar(l, dt);
  }
  requestAnimationFrame(lacoJogo);
}

function controle(p) {
  try { return (p.iframe.contentWindow && p.iframe.contentWindow.__pdxControle) || null; } catch (e) { return null; }
}

/* ------------------------------- a fiacao ------------------------------- */
carregar();
renderSlots();
window.__mesa = { slots, paineis };    // a prova (tools/dev/mesa_prova.py) le daqui

$("seats-stepper").addEventListener("click", (e) => {
  const b = e.target.closest(".step-btn");
  if (!b) return;
  assentos = Math.max(2, Math.min(6, assentos + parseInt(b.dataset.step)));
  $("out-seats").textContent = String(assentos);
  guardar();
});
$("sel-strategy").addEventListener("change", (e) => { estrategia = e.target.value; guardar(); });
$("btn-begin").addEventListener("click", () => comecar());
$("btn-fullscreen").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
});
$("btn-leave").addEventListener("click", () => {
  if (confirm("End the table and go back to the setup?")) location.reload();
});
window.addEventListener("gamepadconnected", () => { padsVistos = -1; });
window.addEventListener("gamepaddisconnected", () => { padsVistos = -1; });

requestAnimationFrame(lacoSetup);
