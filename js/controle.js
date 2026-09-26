/* =========================================================================
   controle.js, the Xbox controller as the game's pointer
   -------------------------------------------------------------------------
   The whole game plays with clicks. This module puts a virtual cursor on
   screen, moved by the left stick, and turns the buttons into the same
   pointer and keyboard events the mouse and keyboard would make. Nothing
   else in the client needs to know a controller exists.

   Two modes:
     solo:       the page reads its own navigator.getGamepads() (?pad=N)
     split table: mesa.html reads the controllers and feeds each panel by
                 calling window.__pdxPad.feed(reading, dt)

   Map (the Gamepad API "standard" layout, which is the Xbox controller's):
     left stick    moves the cursor        LT (hold)   slow cursor
     d-pad         jumps to the neighbouring button in that direction
     A or RT       click                   B or Back   Esc
     X             Space (the hand)        Y           T (the reference sheet)
     LB / RB       previous / next button
     right stick   the camera: up W, left A, down S, right D
     Start         settings
   ========================================================================= */

const DEAD_ZONE = 0.22;
const CAMERA_ON = 0.62;
const CAMERA_RELEASE = 0.38;
const TRIGGER = 0.6;
const DPAD_STEP = 48;
const HOLD_MS = 70;

// Everything clickable in the game, read from app.css (cursor: pointer / grab) plus
// the native controls. Anything outside this list is still in reach of the free
// cursor; the list only serves the d-pad jump and the LB / RB cycle.
const BUTTON_SELECTOR = [
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

const IDLE = {
  lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0,
  a: false, b: false, x: false, y: false, lb: false, rb: false,
  back: false, start: false, up: false, down: false, left: false, right: false,
};

/** A normalised reading of one Gamepad. Covers the "standard" layout (the Xbox
    one in Chrome and Firefox) and the raw xpad layout on Linux, which Firefox
    sometimes hands over unmapped: 11 buttons, 8 axes, d-pad on axes 6 and 7
    and triggers on axes 2 and 5. */
export function readPad(gp) {
  const b = gp.buttons || [];
  const a = gp.axes || [];
  const bt = (i) => { const x = b[i]; return !!(x && (x.pressed || x.value > 0.5)); };
  const bv = (i) => { const x = b[i]; return x ? (typeof x === "number" ? x : (x.value || 0)) : 0; };
  const ax = (i) => (typeof a[i] === "number" ? a[i] : 0);
  const raw = gp.mapping !== "standard" && a.length >= 8 && b.length <= 11;
  if (raw) {
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

/** True when the reading shows any use at all: it wakes the ring. */
function inUse(l) {
  return Math.hypot(l.lx, l.ly) > DEAD_ZONE || Math.hypot(l.rx, l.ry) > DEAD_ZONE
    || l.lt > TRIGGER || l.rt > TRIGGER
    || l.a || l.b || l.x || l.y || l.lb || l.rb || l.back || l.start
    || l.up || l.down || l.left || l.right;
}

export class PadCursor {
  constructor(opts = {}) {
    this.colour = opts.colour || "#f2a93b";
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.prev = IDLE;
    this.camArmed = false;
    this.over = null;          // the element under the cursor, for mouseover / mouseout
    this.visible = false;
    this._build();
    window.__pdxPad = this;
    // the real mouse hides the ring; the controller brings it back
    window.addEventListener("mousemove", (e) => { if (e.isTrusted) this._show(false); }, { passive: true });
    window.addEventListener("resize", () => this._move(this.x, this.y, true));
  }

  /* ------------------------------ solo mode ------------------------------ */

  /** Reads its own Gamepad every frame. padIndex < 0 takes the first one connected. */
  runSolo(padIndex) {
    let tPrev = performance.now();
    const step = (t) => {
      const dt = Math.min(0.05, (t - tPrev) / 1000);
      tPrev = t;
      let gp = null;
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        gp = padIndex >= 0 ? pads[padIndex] : Array.from(pads).find((p) => p && p.connected);
      } catch (e) { gp = null; }
      if (gp && gp.connected) this.feed(readPad(gp), dt);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------ the frame ------------------------------ */

  /** One reading per frame. dt in seconds. */
  feed(l, dt) {
    const prev = this.prev;
    const pressed = (k) => l[k] && !prev[k];

    // 1. the left stick moves the cursor; the curve keeps the centre fine
    const mag = Math.hypot(l.lx, l.ly);
    if (mag > DEAD_ZONE) {
      const f = Math.pow((Math.min(1, mag) - DEAD_ZONE) / (1 - DEAD_ZONE), 1.6);
      const speed = this._speed() * (l.lt > TRIGGER ? 0.32 : 1);
      this._move(this.x + (l.lx / mag) * f * speed * dt, this.y + (l.ly / mag) * f * speed * dt);
    }

    // 2. the d-pad jumps to the neighbour
    if (pressed("up")) this.jump(0, -1);
    if (pressed("down")) this.jump(0, 1);
    if (pressed("left")) this.jump(-1, 0);
    if (pressed("right")) this.jump(1, 0);

    // 3. the buttons
    if (pressed("a") || (l.rt > TRIGGER && !(prev.rt > TRIGGER))) this.click();
    if (pressed("b") || pressed("back")) this.key("Escape", "Escape");
    if (pressed("x")) this.key(" ", "Space");
    if (pressed("y")) this.key("t", "KeyT");
    if (pressed("lb")) this.cycle(-1);
    if (pressed("rb")) this.cycle(1);
    if (pressed("start")) this.settings();

    // 4. the camera on the right stick: one flick, one view
    this._camera(l.rx, l.ry);

    if (inUse(l)) this._show(true);
    this.prev = l;
  }

  /* ------------------------------ the cursor ----------------------------- */

  _speed() {
    // crosses the panel in a little under a second, whatever its size
    return Math.max(window.innerWidth, window.innerHeight * 16 / 9) * 1.15;
  }

  _move(x, y, quiet) {
    this.x = Math.max(0, Math.min(window.innerWidth - 1, x));
    this.y = Math.max(0, Math.min(window.innerHeight - 1, y));
    this._paint();
    if (quiet) return;
    const target = this._target();
    const base = this._init(0);
    if (target !== this.over) {
      if (this.over) this.over.dispatchEvent(new MouseEvent("mouseout", { ...base, relatedTarget: target }));
      target.dispatchEvent(new MouseEvent("mouseover", { ...base, relatedTarget: this.over }));
      this.over = target;
    }
    target.dispatchEvent(new PointerEvent("pointermove", base));
    target.dispatchEvent(new MouseEvent("mousemove", base));
  }

  _target() {
    let target = null;
    try { target = document.elementFromPoint(this.x, this.y); } catch (e) { target = null; }
    return target || document.body;
  }

  _init(buttons) {
    return {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y,
      button: 0, buttons, detail: 1,
      pointerId: 7, pointerType: "mouse", isPrimary: true,
    };
  }

  /** Click whatever is under the cursor. Press, wait a moment (the cabin hand
      animates the grip on mousedown) and release on the same target. */
  click() {
    const target = this._target();
    const down = this._init(1);
    target.dispatchEvent(new PointerEvent("pointerdown", down));
    target.dispatchEvent(new MouseEvent("mousedown", down));
    if (this.node) this.node.classList.add("down");
    setTimeout(() => {
      const up = this._init(0);
      target.dispatchEvent(new PointerEvent("pointerup", up));
      target.dispatchEvent(new MouseEvent("mouseup", up));
      target.dispatchEvent(new MouseEvent("click", up));
      if (this.node) this.node.classList.remove("down");
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName) && target.focus) {
        try { target.focus({ preventScroll: true }); } catch (e) {}
      }
    }, HOLD_MS);
  }

  /** A key as the keyboard would give it: keydown and keyup on the body, which
      bubble up to document and window, where the game listens. */
  key(key, code) {
    const init = { key, code, bubbles: true, cancelable: true, composed: true };
    document.body.dispatchEvent(new KeyboardEvent("keydown", init));
    document.body.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  settings() {
    const backdrop = document.getElementById("settings-backdrop");
    const open = document.getElementById("btn-settings");
    const close = document.getElementById("settings-close");
    if (backdrop && !backdrop.hidden) { if (close) close.click(); return; }
    if (open) open.click();
  }

  _camera(rx, ry) {
    if (!this.camArmed) {
      if (ry < -CAMERA_ON) { this.key("w", "KeyW"); this.camArmed = true; }
      else if (ry > CAMERA_ON) { this.key("s", "KeyS"); this.camArmed = true; }
      else if (rx < -CAMERA_ON) { this.key("a", "KeyA"); this.camArmed = true; }
      else if (rx > CAMERA_ON) { this.key("d", "KeyD"); this.camArmed = true; }
    } else if (Math.abs(rx) < CAMERA_RELEASE && Math.abs(ry) < CAMERA_RELEASE) {
      this.camArmed = false;
    }
  }

  /* ---------------------------- the d-pad jump --------------------------- */

  /** The clickable targets visible right now, with the centre of each. */
  candidates() {
    const out = [];
    let nodes;
    try { nodes = document.querySelectorAll(BUTTON_SELECTOR); } catch (e) { return out; }
    for (const n of nodes) {
      if (n.disabled || n.hidden) continue;
      const r = n.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.pointerEvents === "none" || parseFloat(cs.opacity) < 0.05) continue;
      if (!/^(BUTTON|A|INPUT|SELECT)$/.test(n.tagName) && !/pointer|grab/.test(cs.cursor)) continue;
      let top = null;
      try { top = document.elementFromPoint(cx, cy); } catch (e) { top = null; }
      if (!top || !(top === n || n.contains(top))) continue;   // covered by something else
      out.push({ node: n, cx, cy });
    }
    return out;
  }

  /** Jump to the nearest target in that direction. With none, take a step.
      Over a slider, left and right move its value. */
  jump(dx, dy) {
    const under = this._target();
    if (dx && under && under.tagName === "INPUT" && under.type === "range") {
      const step = parseFloat(under.step) || 1;
      const range = (parseFloat(under.max) || 100) - (parseFloat(under.min) || 0);
      under.value = String(parseFloat(under.value) + dx * Math.max(step, range / 20));
      under.dispatchEvent(new Event("input", { bubbles: true }));
      under.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    let best = null, score = Infinity;
    for (const c of this.candidates()) {
      const ex = c.cx - this.x, ey = c.cy - this.y;
      const ahead = ex * dx + ey * dy;
      if (ahead < 6) continue;
      const aside = Math.abs(ex * dy - ey * dx);
      const s = ahead + aside * 2.2;
      if (s < score) { score = s; best = c; }
    }
    if (best) this._move(best.cx, best.cy);
    else this._move(this.x + dx * DPAD_STEP, this.y + dy * DPAD_STEP);
  }

  /** LB / RB: previous and next in reading order, wrapping at the ends. */
  cycle(dir) {
    const list = this.candidates();
    if (!list.length) return;
    list.sort((p, q) => (Math.round(p.cy / 40) - Math.round(q.cy / 40)) || (p.cx - q.cx));
    let current = -1, nearest = Infinity;
    list.forEach((c, i) => {
      const d = Math.hypot(c.cx - this.x, c.cy - this.y);
      if (d < nearest) { nearest = d; current = i; }
    });
    let target;
    if (nearest > 12) target = dir > 0 ? list[current] : list[(current - 1 + list.length) % list.length];
    else target = list[(current + dir + list.length) % list.length];
    this._move(target.cx, target.cy);
  }

  /* ------------------------------- the ring ------------------------------ */

  _build() {
    if (!document.getElementById("controle-css")) {
      const l = document.createElement("link");
      l.id = "controle-css"; l.rel = "stylesheet"; l.href = "styles/controle.css?v2";
      document.head.appendChild(l);
    }
    const n = document.createElement("div");
    n.className = "ctl-cursor";
    n.style.setProperty("--ctl-colour", this.colour);
    n.innerHTML = '<span class="ctl-ring"></span>';
    document.body.appendChild(n);
    this.node = n;
    this._paint();
  }

  _paint() {
    if (this.node) this.node.style.transform = `translate3d(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px, 0)`;
  }

  _show(on) {
    if (this.visible === on) return;
    this.visible = on;
    if (this.node) this.node.classList.toggle("on", on);
  }
}
