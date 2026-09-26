/* =========================================================================
   controle.js, o controle de Xbox como ponteiro do jogo
   -------------------------------------------------------------------------
   O jogo inteiro se joga com clique. Este modulo poe um cursor virtual na
   tela, movido pelo analogico esquerdo, e traduz os botoes em eventos de
   ponteiro e de teclado iguais aos que o mouse e o teclado gerariam. Nada
   do resto do cliente precisa saber que existe um controle.

   Dois modos:
     sozinho:  a pagina le o proprio navigator.getGamepads() (?pad=N)
     na mesa:  mesa.html le os controles e alimenta cada painel chamando
               window.__pdxControle.alimentar(leitura, dt)

   Mapa (layout "standard" do Gamepad API, que e o do controle de Xbox):
     analogico esquerdo   move o cursor       LT (segurar)   cursor lento
     direcional           pula para o botao vizinho naquela direcao
     A ou RT              clique              B ou Back      Esc
     X                    Espaco (a mao)      Y              T (a ficha)
     LB / RB              botao anterior / proximo
     analogico direito    a camera: cima W, esquerda A, baixo S, direita D
     Start                as configuracoes
   ========================================================================= */

const ZONA_MORTA = 0.22;
const CAMERA_LIGA = 0.62;
const CAMERA_SOLTA = 0.38;
const GATILHO = 0.6;
const PASSO_DIRECIONAL = 48;
const SEGURA_MS = 70;

// Tudo que se clica no jogo, lido do app.css (cursor: pointer / grab) mais os
// botoes nativos. O que estiver fora desta lista continua ao alcance do cursor
// livre; a lista so serve ao pulo do direcional e ao ciclo de LB / RB.
const SELETOR_BOTOES = [
  "button", "a[href]", "input", "select", "[role=button]",
  "[tabindex]:not([tabindex='-1'])",
  ".card.is-actionable", ".card.selectable", ".card.can-drag", ".card.act-ready",
  ".cell.legal", ".cell.cell-choose", ".die", ".escape-drop.legal",
  ".ruck-voucher.usable", ".pd-recycle", ".pd-card.targetable", ".dir-btn",
  ".do-attach", ".mc.targetable", ".drw-contract.drw-choose", ".pcard-choose",
  ".tl-target", ".doc-inplace", ".mala-ct", ".mkey", "#mala-lock.lk-live",
  ".cab2-front", ".cab2-cell", ".ct2-read", ".ctd-stampbtn", ".seg-btn",
  ".step-btn", ".icon-btn", ".bot-pick", ".bot-cycle", ".decision-beacon.on",
].join(",");

const VAZIO = {
  lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0,
  a: false, b: false, x: false, y: false, lb: false, rb: false,
  back: false, start: false, up: false, down: false, left: false, right: false,
};

/** Leitura normalizada de um Gamepad. Cobre o layout "standard" (o do Xbox
    no Chrome e no Firefox) e o layout cru do xpad no Linux, que o Firefox as
    vezes entrega sem mapear: 11 botoes, 8 eixos, direcional nos eixos 6 e 7
    e gatilhos nos eixos 2 e 5. */
export function normalizar(gp) {
  const b = gp.buttons || [];
  const a = gp.axes || [];
  const bt = (i) => { const x = b[i]; return !!(x && (x.pressed || x.value > 0.5)); };
  const bv = (i) => { const x = b[i]; return x ? (typeof x === "number" ? x : (x.value || 0)) : 0; };
  const ax = (i) => (typeof a[i] === "number" ? a[i] : 0);
  const cru = gp.mapping !== "standard" && a.length >= 8 && b.length <= 11;
  if (cru) {
    return {
      lx: ax(0), ly: ax(1), rx: ax(3), ry: ax(4),
      lt: (ax(2) + 1) / 2, rt: (ax(5) + 1) / 2,
      a: bt(0), b: bt(1), x: bt(2), y: bt(3), lb: bt(4), rb: bt(5),
      back: bt(6), start: bt(7),
      up: ax(7) < -0.5, down: ax(7) > 0.5, left: ax(6) < -0.5, right: ax(6) > 0.5,
    };
  }
  return {
    lx: ax(0), ly: ax(1), rx: ax(2), ry: ax(3),
    lt: bv(6), rt: bv(7),
    a: bt(0), b: bt(1), x: bt(2), y: bt(3), lb: bt(4), rb: bt(5),
    back: bt(8), start: bt(9),
    up: bt(12), down: bt(13), left: bt(14), right: bt(15),
  };
}

/** Verdadeiro quando a leitura tem qualquer uso: serve para acordar o anel. */
export function emUso(l) {
  return Math.hypot(l.lx, l.ly) > ZONA_MORTA || Math.hypot(l.rx, l.ry) > ZONA_MORTA
    || l.lt > GATILHO || l.rt > GATILHO
    || l.a || l.b || l.x || l.y || l.lb || l.rb || l.back || l.start
    || l.up || l.down || l.left || l.right;
}

export class Controle {
  constructor(opts = {}) {
    this.cor = opts.cor || "#f2a93b";
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.ant = VAZIO;
    this.camArmada = false;
    this.sobre = null;          // o elemento sob o cursor, para mouseover / mouseout
    this.visivel = false;
    this._montar();
    window.__pdxControle = this;
    // o mouse de verdade esconde o anel; o controle traz de volta
    window.addEventListener("mousemove", (e) => { if (e.isTrusted) this._mostrar(false); }, { passive: true });
    window.addEventListener("resize", () => this._mover(this.x, this.y, true));
  }

  /* --------------------------- modo sozinho ------------------------------ */

  /** Le o proprio Gamepad a cada quadro. padIndex < 0 pega o primeiro ligado. */
  ligarSozinho(padIndex) {
    let tAnt = performance.now();
    const passo = (t) => {
      const dt = Math.min(0.05, (t - tAnt) / 1000);
      tAnt = t;
      let gp = null;
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        gp = padIndex >= 0 ? pads[padIndex] : Array.from(pads).find((p) => p && p.connected);
      } catch (e) { gp = null; }
      if (gp && gp.connected) this.alimentar(normalizar(gp), dt);
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  /* ------------------------------ o quadro ------------------------------- */

  /** Uma leitura por quadro. dt em segundos. */
  alimentar(l, dt) {
    const ant = this.ant;
    const sobe = (k) => l[k] && !ant[k];

    // 1. o analogico esquerdo move o cursor; a curva deixa o centro fino
    const mag = Math.hypot(l.lx, l.ly);
    if (mag > ZONA_MORTA) {
      const f = Math.pow((Math.min(1, mag) - ZONA_MORTA) / (1 - ZONA_MORTA), 1.6);
      const vel = this._velocidade() * (l.lt > GATILHO ? 0.32 : 1);
      this._mover(this.x + (l.lx / mag) * f * vel * dt, this.y + (l.ly / mag) * f * vel * dt);
    }

    // 2. o direcional pula para o vizinho
    if (sobe("up")) this.pular(0, -1);
    if (sobe("down")) this.pular(0, 1);
    if (sobe("left")) this.pular(-1, 0);
    if (sobe("right")) this.pular(1, 0);

    // 3. os botoes
    if (sobe("a") || (l.rt > GATILHO && !(ant.rt > GATILHO))) this.clicar();
    if (sobe("b") || sobe("back")) this.tecla("Escape", "Escape");
    if (sobe("x")) this.tecla(" ", "Space");
    if (sobe("y")) this.tecla("t", "KeyT");
    if (sobe("lb")) this.ciclar(-1);
    if (sobe("rb")) this.ciclar(1);
    if (sobe("start")) this.configuracoes();

    // 4. a camera no analogico direito: um toque, uma cena
    this._camera(l.rx, l.ry);

    if (emUso(l)) this._mostrar(true);
    this.ant = l;
  }

  /* ------------------------------ o cursor ------------------------------- */

  _velocidade() {
    // atravessa o painel em pouco menos de um segundo, seja ele do tamanho que for
    return Math.max(window.innerWidth, window.innerHeight * 16 / 9) * 1.15;
  }

  _mover(x, y, silencio) {
    this.x = Math.max(0, Math.min(window.innerWidth - 1, x));
    this.y = Math.max(0, Math.min(window.innerHeight - 1, y));
    this._pintar();
    if (silencio) return;
    const alvo = this._alvo();
    const base = this._base(alvo, 0);
    if (alvo !== this.sobre) {
      if (this.sobre) this.sobre.dispatchEvent(new MouseEvent("mouseout", { ...base, relatedTarget: alvo }));
      alvo.dispatchEvent(new MouseEvent("mouseover", { ...base, relatedTarget: this.sobre }));
      this.sobre = alvo;
    }
    alvo.dispatchEvent(new PointerEvent("pointermove", base));
    alvo.dispatchEvent(new MouseEvent("mousemove", base));
  }

  _alvo() {
    let alvo = null;
    try { alvo = document.elementFromPoint(this.x, this.y); } catch (e) { alvo = null; }
    return alvo || document.body;
  }

  _base(alvo, buttons) {
    return {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y,
      button: 0, buttons, detail: 1,
      pointerId: 7, pointerType: "mouse", isPrimary: true,
    };
  }

  /** Clique no que estiver sob o cursor. Desce, espera um instante (a mao da
      cabine anima o aperto no mousedown) e sobe no mesmo alvo. */
  clicar() {
    const alvo = this._alvo();
    const baixo = this._base(alvo, 1);
    alvo.dispatchEvent(new PointerEvent("pointerdown", baixo));
    alvo.dispatchEvent(new MouseEvent("mousedown", baixo));
    if (this.no) this.no.classList.add("down");
    setTimeout(() => {
      const cima = this._base(alvo, 0);
      alvo.dispatchEvent(new PointerEvent("pointerup", cima));
      alvo.dispatchEvent(new MouseEvent("mouseup", cima));
      alvo.dispatchEvent(new MouseEvent("click", cima));
      if (this.no) this.no.classList.remove("down");
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(alvo.tagName) && alvo.focus) {
        try { alvo.focus({ preventScroll: true }); } catch (e) {}
      }
    }, SEGURA_MS);
  }

  /** Uma tecla como o teclado daria: keydown e keyup no body, que sobem ate
      document e window, onde o jogo escuta. */
  tecla(key, code) {
    const init = { key, code, bubbles: true, cancelable: true, composed: true };
    document.body.dispatchEvent(new KeyboardEvent("keydown", init));
    document.body.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  configuracoes() {
    const fundo = document.getElementById("settings-backdrop");
    const abrir = document.getElementById("btn-settings");
    const fechar = document.getElementById("settings-close");
    if (fundo && !fundo.hidden) { if (fechar) fechar.click(); return; }
    if (abrir) abrir.click();
  }

  _camera(rx, ry) {
    if (!this.camArmada) {
      if (ry < -CAMERA_LIGA) { this.tecla("w", "KeyW"); this.camArmada = true; }
      else if (ry > CAMERA_LIGA) { this.tecla("s", "KeyS"); this.camArmada = true; }
      else if (rx < -CAMERA_LIGA) { this.tecla("a", "KeyA"); this.camArmada = true; }
      else if (rx > CAMERA_LIGA) { this.tecla("d", "KeyD"); this.camArmada = true; }
    } else if (Math.abs(rx) < CAMERA_SOLTA && Math.abs(ry) < CAMERA_SOLTA) {
      this.camArmada = false;
    }
  }

  /* ------------------------- o pulo do direcional ------------------------ */

  /** Os alvos clicaveis visiveis agora, com o centro de cada um. */
  candidatos() {
    const fora = [];
    let nos;
    try { nos = document.querySelectorAll(SELETOR_BOTOES); } catch (e) { return fora; }
    for (const n of nos) {
      if (n.disabled || n.hidden) continue;
      const r = n.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.pointerEvents === "none" || parseFloat(cs.opacity) < 0.05) continue;
      if (!/^(BUTTON|A|INPUT|SELECT)$/.test(n.tagName) && !/pointer|grab/.test(cs.cursor)) continue;
      let topo = null;
      try { topo = document.elementFromPoint(cx, cy); } catch (e) { topo = null; }
      if (!topo || !(topo === n || n.contains(topo))) continue;   // coberto por outra coisa
      fora.push({ no: n, cx, cy });
    }
    return fora;
  }

  /** Pula para o alvo mais proximo naquela direcao. Sem alvo, da um passo.
      Sobre um controle deslizante, esquerda e direita mexem no valor. */
  pular(dx, dy) {
    const sob = this._alvo();
    if (dx && sob && sob.tagName === "INPUT" && sob.type === "range") {
      const passo = parseFloat(sob.step) || 1;
      const alcance = (parseFloat(sob.max) || 100) - (parseFloat(sob.min) || 0);
      sob.value = String(parseFloat(sob.value) + dx * Math.max(passo, alcance / 20));
      sob.dispatchEvent(new Event("input", { bubbles: true }));
      sob.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    let melhor = null, pontos = Infinity;
    for (const c of this.candidatos()) {
      const ex = c.cx - this.x, ey = c.cy - this.y;
      const frente = ex * dx + ey * dy;
      if (frente < 6) continue;
      const lado = Math.abs(ex * dy - ey * dx);
      const p = frente + lado * 2.2;
      if (p < pontos) { pontos = p; melhor = c; }
    }
    if (melhor) this._mover(melhor.cx, melhor.cy);
    else this._mover(this.x + dx * PASSO_DIRECIONAL, this.y + dy * PASSO_DIRECIONAL);
  }

  /** LB / RB: anterior e proximo na ordem de leitura, girando nas pontas. */
  ciclar(dir) {
    const lista = this.candidatos();
    if (!lista.length) return;
    lista.sort((p, q) => (Math.round(p.cy / 40) - Math.round(q.cy / 40)) || (p.cx - q.cx));
    let atual = -1, perto = Infinity;
    lista.forEach((c, i) => {
      const d = Math.hypot(c.cx - this.x, c.cy - this.y);
      if (d < perto) { perto = d; atual = i; }
    });
    let alvo;
    if (perto > 12) alvo = dir > 0 ? lista[atual] : lista[(atual - 1 + lista.length) % lista.length];
    else alvo = lista[(atual + dir + lista.length) % lista.length];
    this._mover(alvo.cx, alvo.cy);
  }

  /* -------------------------------- o anel ------------------------------- */

  _montar() {
    if (!document.getElementById("controle-css")) {
      const l = document.createElement("link");
      l.id = "controle-css"; l.rel = "stylesheet"; l.href = "styles/controle.css?v1";
      document.head.appendChild(l);
    }
    const n = document.createElement("div");
    n.className = "ctl-cursor";
    n.style.setProperty("--ctl-cor", this.cor);
    n.innerHTML = '<span class="ctl-anel"></span>';
    document.body.appendChild(n);
    this.no = n;
    this._pintar();
  }

  _pintar() {
    if (this.no) this.no.style.transform = `translate3d(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px, 0)`;
  }

  _mostrar(on) {
    if (this.visivel === on) return;
    this.visivel = on;
    if (this.no) this.no.classList.toggle("on", on);
  }
}
