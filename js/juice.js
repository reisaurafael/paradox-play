/* =========================================================================
   juice.js, the GAME-FEEL kernel for Paradoxo's living operations table
   -------------------------------------------------------------------------
   Additive, presentation-only. Layers the techniques a STATIC board needs to
   out-punch Hearthstone / The Bazaar: HIT-PAUSE (a freeze-frame on impact),
   full-screen IMPACT FLASH, SQUASH & STRETCH punches, and UNIVERSAL hover/press
   micro-feedback (a sound + a lift on every interactive element). Mirrors the
   `audio` singleton; holds no game state; honours prefers-reduced-motion.
   ========================================================================= */
import { audio } from "./audio.js?202609282144";

const FLASH = {
  white:   "#fdf6e6",
  gold:    "#f7c168",
  danger:  "#ff5330",
  paradox: "#b98cff",
  teal:    "#6fd3c9",
  cp:      "#f7c168",
};

// Everything that earns universal tactile feedback (a hover tick + press squish).
const INTERACTIVE = [
  ".card", ".mkt-card", ".drw-folder", ".drw-contract", ".pcard", ".pd-card",
  ".vital-chip", ".ruck-voucher", ".gen-cell", ".mod-cell", ".prio-token",
  ".choice-card", ".cat", "[role='button']", ".btn",
].join(",");

class Juice {
  constructor() {
    this.flashEl = null;
    this._reduced = false;
    this._hoverEl = null;
    this._hp = null;
  }

  init() {
    if (this.flashEl) return;                       // idempotent
    this._reduced = !!(window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      window.matchMedia("(prefers-reduced-motion: reduce)")
        .addEventListener("change", (e) => { this._reduced = e.matches; });
    } catch (_) {}
    const f = document.createElement("div");
    f.className = "juice-flash";
    f.setAttribute("aria-hidden", "true");
    (document.getElementById("overlay-root") || document.body).appendChild(f);
    this.flashEl = f;
    this._wireMicroFeedback();
  }

  reduced() { return this._reduced; }

  /* ---- HIT-PAUSE, a brief global freeze-frame on impact (highest-value juice) --- */
  hitPause(ms = 90) {
    if (this._reduced) return;
    // WAAPI hit-stop: pause the animations THEMSELVES. The old body-class flip hit a
    // universal selector (`body.hitpause *`) that invalidated every element's style
    // twice per impact, a style-recalc storm on the game's most stressful beats.
    clearTimeout(this._hp);
    if (this._hpAnims) { this._hpAnims.forEach((a) => { try { a.play(); } catch (e) {} }); }
    let anims = [];
    try { anims = document.getAnimations(); } catch (e) {}
    anims.forEach((a) => { try { a.pause(); } catch (e) {} });
    this._hpAnims = anims;
    this._hp = setTimeout(() => {
      anims.forEach((a) => { try { a.play(); } catch (e) {} });
      this._hpAnims = null;
    }, ms);
  }

  /* ---- IMPACT FLASH, a full-screen tone flash that snaps in and fades ---------- */
  flash(tone = "white", opt = {}) {
    if (this._reduced || !this.flashEl) return;
    // COALESCE: stacked events used to fire 3-4 full-screen flashes in one beat
    const nowT = performance.now();
    if (nowT - (this._lastFlash || 0) < 280) return;
    this._lastFlash = nowT;
    // no flash is a flash any more (the rule over everything: nothing appears and
    // vanishes fast): a softer wash that rises and settles over at least 0.9 s
    const intensity = (opt.intensity != null ? opt.intensity : 0.42) * 0.3;
    const dur = Math.max(900, opt.dur != null ? opt.dur : 260);
    this.flashEl.style.background = FLASH[tone] || FLASH.white;
    // .fl-on carries the screen-blend + the promotion. Off the rest of the time, the
    // flash is a plain invisible div and the compositor ignores it entirely, instead
    // of blending a full-screen texture over every frame of the game for nothing.
    this.flashEl.classList.add("fl-on");
    const a = this.flashEl.animate(
      [{ opacity: 0 }, { opacity: intensity, offset: 0.25 }, { opacity: 0 }],
      { duration: dur, easing: "cubic-bezier(.2,.7,.3,1)" }
    );
    a.onfinish = a.oncancel = () => this.flashEl.classList.remove("fl-on");
  }

  /* ---- PUNCH, a squash&stretch pop on an element (pickup / land / success) ----- */
  punch(el, opt = {}) {
    if (this._reduced || !el || !el.animate) return;
    const amt = opt.amt != null ? opt.amt : 0.16;
    const dur = opt.dur != null ? opt.dur : 260;
    const s = 1 + amt, u = 1 - amt * 0.7;
    el.animate([
      { transform: "scale(1,1)" },
      { transform: `scale(${u.toFixed(3)},${s.toFixed(3)})`, offset: 0.3 },   // stretch up
      { transform: `scale(${s.toFixed(3)},${u.toFixed(3)})`, offset: 0.55 },  // squash down
      { transform: "scale(1,1)" },
    ], { duration: dur, easing: "cubic-bezier(.34,1.5,.5,1)" });
  }

  // a quick press-in on pointerdown
  press(el) {
    if (this._reduced || !el || !el.animate) return;
    el.animate(
      [{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }],
      { duration: 150, easing: "ease-out" }
    );
  }

  /* ---- SHAKE, reuse the .game-grid shake keyframes (sm / md / lg) -------------- */
  shake(level = "md") {
    if (this._reduced) return;
    const g = document.querySelector(".game-grid");
    if (!g) return;
    const cls = "shake-" + level;
    g.classList.remove("shake-sm", "shake-md", "shake-lg");
    void g.offsetWidth;
    g.classList.add(cls);
    setTimeout(() => g.classList.remove(cls), 620);
  }

  /* ---- IMPACT, the full combo for a big beat (flash + hit-pause + shake) ------- */
  /* ---- per-card SIGNATURE primitives (4c), small parameterized bursts ----
     kind: flare (radial petals) · glint (sharp sparks) · ripple (expanding ring)
     spec: { kind, hue (0-360), count, size(px) }, anchored to a screen rect. */
  signature(rect, spec) {
    if (this.reduced() || !rect) return;
    const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
    const kind = spec.kind || "glint", hue = spec.hue ?? 45;
    const count = spec.count ?? 10, size = spec.size ?? 7;
    if (kind === "ripple") {
      const ring = document.createElement("span");
      ring.className = "fx-sig-ring";
      ring.style.cssText = `left:${cx}px;top:${cy}px;border-color:hsl(${hue} 80% 62%)`;
      document.body.appendChild(ring);
      ring.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: .9 },
                    { transform: "translate(-50%,-50%) scale(2.6)", opacity: 0 }],
        { duration: 620, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => ring.remove();
      return;
    }
    for (let i = 0; i < count; i++) {
      const d = document.createElement("span");
      d.className = "fx-sig";
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const v = kind === "flare" ? 46 + Math.random() * 26 : 26 + Math.random() * 60;
      const sz = kind === "flare" ? size * 1.6 : size * (0.5 + Math.random() * 0.8);
      d.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${kind === "glint" ? sz * 0.35 : sz}px;` +
        `background:hsl(${hue} 85% ${kind === "flare" ? 66 : 74}%);` +
        (kind === "glint" ? `transform:rotate(${a}rad);` : "border-radius:50%;");
      document.body.appendChild(d);
      d.animate([
        { transform: `translate(-50%,-50%) translate(0,0) ${kind === "glint" ? `rotate(${a}rad)` : ""}`, opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 14}px) ` +
          `${kind === "glint" ? `rotate(${a}rad)` : ""} scale(.3)`, opacity: 0 },
      ], { duration: 480 + Math.random() * 240, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => d.remove();
    }
  }

  impact(tone = "white", opt = {}) {
    this.flash(tone, { intensity: opt.intensity != null ? opt.intensity : 0.42 });
    this.hitPause(opt.pause != null ? opt.pause : 90);
    if (opt.level) this.shake(opt.level);
    if (opt.sound) audio.play(opt.sound);
  }

  /* ---- UNIVERSAL micro-feedback, a hover tick + press squish on everything ----- */
  _wireMicroFeedback() {
    document.addEventListener("pointerover", (e) => {
      const t = e.target && e.target.closest ? e.target.closest(INTERACTIVE) : null;
      if (t === this._hoverEl) return;
      if (this._hoverEl) this._hoverEl.classList.remove("j-hover");
      this._hoverEl = t;
      if (t && !t.classList.contains("is-disabled") && !t.hasAttribute("disabled")) {
        t.classList.add("j-hover");
        audio.play("hover");
      }
    }, true);
    document.addEventListener("pointerdown", (e) => {
      const t = e.target && e.target.closest ? e.target.closest(INTERACTIVE) : null;
      if (!t || t.classList.contains("is-disabled") || t.hasAttribute("disabled")) return;
      audio.play("tap");
      this.press(t);
    }, true);
  }
}

export const juice = new Juice();
