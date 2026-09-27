/* =========================================================================
   trailer.js, THE TRAILER: a comic book that plays over the menu
   -------------------------------------------------------------------------
   One panel at a time, in the game's inked comic style, paced for reading
   (the rule over everything: nothing appears and vanishes fast). The menu's
   News panel opens it with window.__pdxTrailer.play().

   How a page is paced: every word on it stays at least max(4 s, 75 ms per
   character) from the moment it lands (twice that on the Slow pace), and the
   page holds a moment after its last drawing lands. Then it turns by itself.
     Click, Space, Enter, Right arrow : the first press lands everything still
                                        on its way, the next turns the page
     Left arrow                       : the page before
     Esc, Skip                        : straight to the title card; Esc again closes
   Calm motion (the Accessible interface, or the system's reduced motion):
   static pages, turned only by hand, no camera push, no wipes.

   A panel is data (PANELS below):
     key     a name for it
     wipe    how it comes in: "ink" (an ink slab sweeps across), "ink-back",
             "fade" (crossfade), "dip" (through black), "turn" (page turn),
             "flash" (a paper flash), "cut"
     art()   the drawing: layers in a 1600x900 canvas that crops to 4:5 on a
             tall screen (keep what matters between x 440 and 1160)
     words   captions and balloons: { text, at (s), pos (tl tr bl br tc bc mc),
             kind (cap, dark, motto, big, balloon), style }
     reads   text drawn inside the art that also needs reading time: [[at, text]]
     over()  more HTML over the words (a title card)
     acts    buttons on the page: { label, act (community, again, close), primary }
     sounds  [[at, name, opt]]: audio.js sounds, or the trailer's own (SYNTH)
     jolts   [at]: the panel shakes on an impact
     land    when its last drawing lands (s); min: the least it holds (s)
     ken     the slow camera push { z, x, y }
     title   Skip lands here; stay: it never turns by itself
   Costs: transforms and opacities only, no filters; one panel in the page at a
   time (two during a wipe); every timer and sound is dropped on each turn.
   ========================================================================= */
import { audio } from "./audio.js?202609271559";

// THE SCRIPT: the owner's panels go here, in order.
const PANELS = [];

const readMs = (chars) => Math.max(4000, 75 * chars);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const calmMotion = () => !!window.__pdxCalm
  || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
// the Slow pace doubles every reading time; the others never shorten it
const readPace = () => { try { return localStorage.getItem("paradoxo.speed") === "slow" ? 2 : 1; } catch (e) { return 1; } };

/* ---- the trailer's own sound beats, on the game's SFX bus (so its volume and
   mute apply); anything else is an audio.js sound by name ---- */
const canSound = () => audio.ready && !audio.muted && !audio.quiet && audio.ctx && audio.ctx.state === "running";
const SYNTH = {
  // a low drone that swells in and dies away over `sec` seconds
  tr_drone(tr, opt) {
    const c = audio.ctx, t = c.currentTime, sec = Math.max(2, (opt && opt.sec) || 5);
    const g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 1.3);
    g.gain.setValueAtTime(0.14, t + sec - 1.5);
    g.gain.linearRampToValueAtTime(0.0001, t + sec);
    const oscs = [["sine", 55, 0], ["triangle", 82.4, 7], ["sine", 110.6, -5]].map(([type, f, det]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + sec + 0.1); return o;
    });
    lp.connect(g); g.connect(audio.sfxBus);
    tr.voice(g, oscs);
  },
  // a deep hit, for the heaviest beat
  tr_boom(tr) {
    const c = audio.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.42, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(g); g.connect(audio.sfxBus); o.start(t); o.stop(t + 1.35);
    const n = c.createBufferSource(); n.buffer = audio._noiseBuf();
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    const ng = c.createGain(); ng.gain.setValueAtTime(0.22, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    n.connect(lp); lp.connect(ng); ng.connect(audio.sfxBus); n.start(t); n.stop(t + 0.6);
    tr.voice(g, [o, n]);
  },
  // paper tearing: a noise band sweeping down, fluttering
  tr_rip(tr) {
    const c = audio.ctx, t = c.currentTime, dur = 0.5;
    const n = c.createBufferSource(); n.buffer = audio._noiseBuf();
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    for (let i = 1; i <= 12; i++) g.gain.linearRampToValueAtTime(i === 12 ? 0.0001 : (i % 2 ? 0.26 : 0.1), t + dur * i / 12);
    n.connect(bp); bp.connect(g); g.connect(audio.sfxBus); n.start(t); n.stop(t + dur + 0.05);
    tr.voice(g, [n]);
  },
};

class Trailer {
  constructor() {
    this.root = null;
    this.i = -1;              // the page on show
    this.cur = null;          // its element
    this.timers = [];         // this page's sounds, jolts and turn
    this.voices = [];         // this page's own synth voices, faded on each turn
    this.anims = [];          // the wipe's running animations (fast-forwarded by a press)
    this.held = [];           // the wipe's finished animations, holding their last frame
    this.turning = false;
    this.fast = false;
    this.playing = false;
    this.seen = new Set();
  }

  get ready() { return PANELS.length > 0; }

  /* ---- the stage, built once ---- */
  _build() {
    const r = document.createElement("div");
    r.className = "pdx-trailer-root";
    r.hidden = true;
    r.setAttribute("role", "dialog");
    r.setAttribute("aria-modal", "true");
    r.setAttribute("aria-label", "Trailer");
    r.innerHTML = `
      <div class="tr-page" tabindex="0" aria-label="Trailer page. Space or click for the next page, Escape to skip.">
        <div class="tr-frame"><div class="tr-slab"></div><div class="tr-flash"></div></div>
      </div>
      <div class="tr-bar">
        <div class="tr-pips"></div>
        <div class="tr-hint"></div>
        <div class="tr-ctl">
          <button class="tr-btn tr-skip" type="button">Skip</button>
          <button class="tr-btn tr-close" type="button">Close</button>
        </div>
      </div>
      <div class="tr-sr" aria-live="polite"></div>`;
    document.body.appendChild(r);
    this.root = r;
    this.page = r.querySelector(".tr-page");
    this.frame = r.querySelector(".tr-frame");
    this.slab = r.querySelector(".tr-slab");
    this.flash = r.querySelector(".tr-flash");
    this.pips = r.querySelector(".tr-pips");
    this.hint = r.querySelector(".tr-hint");
    this.skipBtn = r.querySelector(".tr-skip");
    this.live = r.querySelector(".tr-sr");
    this.skipBtn.addEventListener("click", (e) => { e.stopPropagation(); this.skip(); });
    r.querySelector(".tr-close").addEventListener("click", (e) => { e.stopPropagation(); this.stop(); });
    this.page.addEventListener("click", (e) => {
      const act = e.target.closest && e.target.closest("[data-act]");
      if (act) { e.stopPropagation(); this._act(act.dataset.act); return; }
      this.next();
    });
    this.pips.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest(".tr-pip");
      if (b) { e.stopPropagation(); this.go(+b.dataset.i); }
    });
    this._onKey = (e) => this._key(e);
    this._onVis = () => this._visibility();
    // the bar is as wide as the page
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => r.style.setProperty("--tr-bar-w", this.page.offsetWidth + "px"));
      this._ro.observe(this.page);
    }
  }

  /* ---- open and close ---- */
  play() {
    if (!this.ready) return false;
    if (!this.root) this._build();
    if (this.playing) { this.go(0); return true; }
    this.playing = true;
    this.calm = calmMotion();
    this.pace = readPace();
    this.seen.clear();
    this._back = document.activeElement;
    this.root.classList.toggle("calm", this.calm);
    this.pips.innerHTML = PANELS.map((p, i) =>
      `<button class="tr-pip" type="button" data-i="${i}" aria-label="Page ${i + 1} of ${PANELS.length}"></button>`).join("");
    const touch = !!(window.matchMedia && window.matchMedia("(hover: none)").matches);
    this.hint.textContent = touch ? "Tap: next page" : this.calm ? "Click or Space: next page" : "Click or Space: next page \u00b7 Esc: skip";
    this.root.hidden = false;
    void this.root.offsetWidth;
    this.root.classList.add("on");
    window.addEventListener("keydown", this._onKey, true);
    document.addEventListener("visibilitychange", this._onVis);
    try { audio.unlock(); } catch (e) {}
    this._duck(true);
    this.i = -1;
    this.go(0);
    this.page.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent("pdx:trailer", { detail: { open: true } }));
    return true;
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    this._clear();
    this.anims.splice(0).forEach((a) => { try { a.cancel(); } catch (e) {} });
    this.held.splice(0).forEach((a) => { try { a.cancel(); } catch (e) {} });
    this.turning = false; this.fast = false;
    window.removeEventListener("keydown", this._onKey, true);
    document.removeEventListener("visibilitychange", this._onVis);
    this._duck(false);
    const r = this.root;
    r.classList.remove("on");
    const done = () => {
      if (this.playing) return;
      r.hidden = true;
      this.frame.querySelectorAll(".tr-panel").forEach((n) => n.remove());
      this.cur = null; this.i = -1;
    };
    if (this.calm) done(); else setTimeout(done, 520);
    try { if (this._back && this._back.focus) this._back.focus({ preventScroll: true }); } catch (e) {}
    window.dispatchEvent(new CustomEvent("pdx:trailer", { detail: { open: false } }));
  }

  /* ---- turning pages ---- */
  next() {
    if (!this.playing) return;
    if (this.turning) { this._hurry(); return; }
    // the first press lands whatever is still on its way; the next one turns the page
    if (this.cur && !this.cur.classList.contains("settled") && performance.now() < this._landsAt) { this._settle(); return; }
    if (this.i < PANELS.length - 1) this.go(this.i + 1);
  }
  back() {
    if (!this.playing || this.i <= 0) return;
    if (this.turning) this._hurry();
    this.go(this.i - 1, { back: true });
  }
  skip() {
    const t = PANELS.findIndex((p) => p.title);
    if (t < 0 || this.i >= t) { this.stop(); return; }
    this.go(t, { back: false, wipe: "flash" });
  }

  async go(i, opt = {}) {
    if (!this.playing || i < 0 || i >= PANELS.length) return;
    if (this.turning) { this._hurry(); await this._turned; }
    if (!this.playing) return;
    const p = PANELS[i], old = this.cur, first = this.i < 0;
    this._clear();
    this.i = i;
    this.seen.add(i);
    this._pips();
    const el = this._panel(p);
    if (this.calm || opt.back) el.classList.add("settled");
    this.cur = el;
    const wipe = this.calm ? "cut" : first ? "dip" : opt.back ? "fade" : (opt.wipe || p.wipe || "ink");
    let release;
    this._turned = new Promise((r) => { release = r; });
    this.turning = true;
    try { await this._wipe(wipe, old, el, () => this._start(p, el)); }
    finally {
      // the wipe's last frames were held; let every node fall back to its own style
      this.held.splice(0).forEach((a) => { try { a.cancel(); } catch (e) {} });
      this.turning = false; this.fast = false; release();
    }
  }

  /* the page is in: its clock starts now (sounds, jolts, the turn) */
  _start(p, el) {
    if (!this.playing) return;
    const now = performance.now();
    const settled = el.classList.contains("settled");
    this._landsAt = now + (p.land || 0) * 1000 + 300;
    if (!settled) {
      for (const [at, name, o] of p.sounds || []) this._later(at * 1000, () => this._sound(name, o));
      for (const at of p.jolts || []) this._later(at * 1000, () => this._jolt(el));
    } else if (!this.calm) this._sound("pan");
    this.live.textContent = [...(p.words || []).map((w) => w.text), ...(p.reads || []).map((r) => r[1])].join(" ");
    if (!this.calm && !p.stay) this._turnIn(settled ? Math.max(4000 * this.pace, this._hold(p) - 1200) : this._hold(p));
    const t = PANELS.findIndex((q) => q.title);
    this.skipBtn.hidden = t >= 0 ? this.i >= t : this.i === PANELS.length - 1;
    this.hint.style.visibility = p.stay ? "hidden" : "";
  }

  // how long a page holds: every word gets its reading time from when it lands
  _hold(p) {
    let end = Math.max((p.land || 0) * 1000 + 1800, (p.min || 0) * 1000);
    const items = [...(p.words || []).map((w) => [w.at || 0, w.text]), ...(p.reads || [])];
    let chars = 0, first = Infinity;
    for (const [at, text] of items) {
      end = Math.max(end, at * 1000 + readMs(text.length) * this.pace);
      chars += text.length; first = Math.min(first, at);
    }
    if (items.length) end = Math.max(end, first * 1000 + readMs(chars) * this.pace);
    return end;
  }

  _turnIn(ms) {
    clearTimeout(this._turnT);
    this._turnDue = performance.now() + ms;
    this._turnT = setTimeout(() => { if (this.playing && !document.hidden) this.go(this.i + 1); }, ms);
  }

  _settle() {
    const p = PANELS[this.i];
    this.cur.classList.add("settled");
    this._clear();
    this._landsAt = 0;
    if (!this.calm && !p.stay) this._turnIn(Math.max(4000 * this.pace, this._turnDue - performance.now()));
  }

  /* ---- one panel's DOM ---- */
  _panel(p) {
    const el = document.createElement("div");
    el.className = "tr-panel";
    el.dataset.key = p.key || "";
    const k = p.ken || {};
    el.style.setProperty("--ken-z", k.z != null ? k.z : 1.045);
    el.style.setProperty("--ken-x", (k.x || 0) + "%");
    el.style.setProperty("--ken-y", (k.y || 0) + "%");
    el.style.setProperty("--ken-s", Math.round(this._hold(p) / 1000 + 3) + "s");
    const words = (p.words || []).map((w) => {
      const balloon = w.kind === "balloon";
      const cls = balloon ? "tr-balloon" : "tr-cap" + (w.kind && w.kind !== "cap" ? " " + w.kind : "");
      return `<div class="${cls} ${w.pos || "tl"} a ${balloon ? "a-pop" : "a-rise"}" style="--d:${w.at || 0}s;${w.style || ""}">${esc(w.text).replace(/\n/g, "<br>")}</div>`;
    }).join("");
    const acts = (p.acts || []).length ? `<div class="tr-acts a a-rise" style="--d:${p.actsAt || 0}s">${p.acts.map((a) =>
      `<button type="button" class="tr-act${a.primary ? " primary" : ""}" data-act="${esc(a.act)}">${esc(a.label)}</button>`).join("")}</div>` : "";
    el.innerHTML = `<div class="tr-cam"><div class="tr-jolt"><div class="tr-canvas">${p.art ? p.art() : ""}</div></div></div>`
      + `<div class="tr-words">${p.over ? p.over() : ""}${words}${acts}</div>`;
    return el;
  }

  _act(act) {
    if (act === "again") { this.go(0, { wipe: "turn" }); return; }
    if (act === "community") {
      this.stop();
      try { if (window.__pdxCommunity && window.__pdxCommunity.open) window.__pdxCommunity.open(); } catch (e) {}
      return;
    }
    this.stop();
  }

  /* ---- the wipes: `swap` puts the new page in at the moment the old one is hidden ---- */
  async _wipe(kind, old, el, swap) {
    const f = this.frame;
    const put = (under) => { if (under && old) f.insertBefore(el, old); else f.insertBefore(el, this.slab); swap(); };
    const drop = () => { if (old) old.remove(); };
    if (kind === "cut" || !old && kind !== "dip") { put(); drop(); return; }
    if (kind === "dip") {
      if (old) { await this._anim(old, [{ opacity: 1 }, { opacity: 0 }], 420, "ease-in"); drop(); }
      put();
      await this._anim(el, [{ opacity: 0 }, { opacity: 1 }], 700, "ease-out");
      return;
    }
    if (kind === "fade") {
      put(true);
      await this._anim(old, [{ opacity: 1 }, { opacity: 0 }], 600, "ease-in-out");
      drop();
      return;
    }
    if (kind === "turn") {
      await this._anim(old, [{ transform: "perspective(2200px) rotateY(0deg)", transformOrigin: "0 50%" },
        { transform: "perspective(2200px) rotateY(-88deg)", transformOrigin: "0 50%" }], 380, "cubic-bezier(.55,0,.9,.45)");
      drop(); put();
      this._sound("pan");
      await this._anim(el, [{ transform: "perspective(2200px) rotateY(88deg)", transformOrigin: "100% 50%" },
        { transform: "perspective(2200px) rotateY(0deg)", transformOrigin: "100% 50%" }], 440, "cubic-bezier(.15,.6,.35,1)");
      return;
    }
    if (kind === "flash") {
      put(); drop();
      await Promise.all([
        this._anim(this.flash, [{ opacity: 1 }, { opacity: 0 }], 750, "ease-out"),
        this._anim(el, [{ transform: "scale(1.07)" }, { transform: "scale(1)" }], 520, "cubic-bezier(.2,.8,.3,1)"),
      ]);
      return;
    }
    // "ink" and "ink-back": an ink slab with paper speed lines sweeps across the panel
    const dir = kind === "ink-back" ? -1 : 1;
    const at = (x) => ({ transform: `translateX(${x}%) skewX(-14deg)`, opacity: 1 });
    this._sound("pan");
    await this._anim(this.slab, [at(-100 * dir), at(0)], 360, "cubic-bezier(.6,0,.9,.5)");
    drop(); put();
    await this._anim(this.slab, [at(0), at(0)], 90, "linear");
    await this._anim(this.slab, [at(0), at(100 * dir)], 420, "cubic-bezier(.15,.55,.35,1)");
  }

  _anim(node, frames, ms, easing) {
    if (!node || !this.playing) return Promise.resolve();
    const a = node.animate(frames, { duration: this.fast ? 0 : ms, easing, fill: "forwards" });
    this.anims.push(a);
    this.held.push(a);
    return a.finished.catch(() => {}).then(() => { const k = this.anims.indexOf(a); if (k >= 0) this.anims.splice(k, 1); });
  }
  _hurry() { this.fast = true; this.anims.slice().forEach((a) => { try { a.finish(); } catch (e) {} }); }

  _jolt(el) {
    const j = el.querySelector(".tr-jolt");
    if (!j) return;
    j.animate([{ transform: "translate(0,0)" }, { transform: "translate(-1.1%, .8%)" }, { transform: "translate(.9%, -.6%)" },
      { transform: "translate(-.5%, .4%)" }, { transform: "translate(.2%, -.1%)" }, { transform: "translate(0,0)" }],
      { duration: 380, easing: "ease-out" });
  }

  /* ---- controls ---- */
  _key(e) {
    if (!this.playing) return;
    const k = e.key;
    const onButton = e.target && e.target.closest && e.target.closest("button");
    e.stopPropagation();
    if (k === "Tab") { this._trap(e); return; }
    if (k === "Escape") { e.preventDefault(); this.skip(); return; }
    if ((k === " " || k === "Enter") && onButton) return;   // the focused button answers
    if (k === " " || k === "Enter" || k === "ArrowRight" || k === "PageDown") { e.preventDefault(); this.next(); return; }
    if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); this.back(); }
  }
  _trap(e) {
    const f = [...this.root.querySelectorAll(".tr-page, button:not([hidden])")].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const k = f.indexOf(document.activeElement);
    const n = e.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k < 0 || k === f.length - 1 ? 0 : k + 1);
    e.preventDefault();
    f[n].focus();
  }
  _visibility() {
    if (!this.playing || this.calm || this.turning) return;
    const p = PANELS[this.i];
    if (!p || p.stay) return;
    if (document.hidden) { this._left = Math.max(0, this._turnDue - performance.now()); clearTimeout(this._turnT); }
    else if (this._left != null) { this._turnIn(Math.max(this._left, 2500)); this._left = null; }
  }
  _pips() {
    this.pips.querySelectorAll(".tr-pip").forEach((b, k) => {
      b.classList.toggle("on", k === this.i);
      b.classList.toggle("seen", this.seen.has(k));
      if (k === this.i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
  }

  /* ---- time and sound ---- */
  _later(ms, fn) { this.timers.push(setTimeout(fn, ms)); }
  _clear() {
    this.timers.splice(0).forEach(clearTimeout);
    clearTimeout(this._turnT);
    this._left = null;
    if (this.voices.length && audio.ctx) {
      const t = audio.ctx.currentTime;
      this.voices.splice(0).forEach(({ g, srcs }) => {
        try { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.12); } catch (e) {}
        srcs.forEach((s) => { try { s.stop(t + 0.5); } catch (e) {} });
      });
    }
  }
  voice(g, srcs) {
    const v = { g, srcs };
    this.voices.push(v);
    srcs[0].onended = () => { const k = this.voices.indexOf(v); if (k >= 0) this.voices.splice(k, 1); };
  }
  _sound(name, opt) {
    try {
      if (SYNTH[name]) { if (canSound()) SYNTH[name](this, opt); }
      else audio.play(name, opt || {});
    } catch (e) {}
  }
  // the menu's music steps back while the trailer plays
  _duck(on) {
    if (!audio.ready || !audio.musicBus || !audio.ctx) return;
    try {
      const g = audio.musicBus.gain, t = audio.ctx.currentTime, v = audio.vol.music;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(on ? v * 0.3 : v, t, on ? 0.35 : 0.6);
    } catch (e) {}
  }
}

// the menu shows its "Watch the trailer" button once this exists (js/menu-panels.js),
// so it exists only when there is a script to play
const trailer = new Trailer();
if (trailer.ready) {
  window.__pdxTrailer = {
    play: () => trailer.play(),
    stop: () => trailer.stop(),
    get playing() { return trailer.playing; },
  };
  window.dispatchEvent(new CustomEvent("pdx:trailer", { detail: { ready: true } }));
}
