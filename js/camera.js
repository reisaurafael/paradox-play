/* =========================================================================
   camera.js, the camera-scene system for Paradoxo's v2 HUD
   -------------------------------------------------------------------------
   The board is ONE fixed 2D plane; NOTHING moves but the CAMERA (COMPOSITION.md).
   The camera is a transform on #cam (.cam-world), eased in CSS; WASD + phase +
   decisions pan it between 4 scenes (main / market / drawer / timeline). Panning
   between flat 2D scenes is what creates the 2.5D feel, no real 3D. Presentation
   only: never touches engine state or the applyState/playEvent ingest path. Only
   real user gestures _engage() the camera, so a passive headless client
   (tools/dev/harness.py shot) stays at the identity "main" scene.
   ========================================================================= */

import { audio } from "./audio.js?202609281737";

const SCENES = new Set(["main", "market", "drawer", "timeline"]);
const ZONE_SCENE = { market: "market", secret: "market", receptor: "drawer" };

export class Camera {
  constructor(camNode, game) {
    this.cam = camNode;
    this.game = game;
    this.scene = "main";
    // FRAMING WATCHDOG: no ancestor of the stage may ever hold a scroll offset,
    // one stray focus()/scrollIntoView would knock EVERY scene out of frame.
    setInterval(() => this._frameGuard(), 1500);
    this._engaged = false;         // only real user gestures engage -> headless stays at main
    this._decisionLocked = false;  // a live decision owns the camera
    this._manualUntil = 0;         // user drove recently -> don't auto-yank
    this._settle = null;
  }

  _engage() { this._engaged = true; }

  _reduced() {
    return !!(this.game && this.game._reducedMotion && this.game._reducedMotion());
  }

  _now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

  setScene(name) {
    // CABIN LAW: the chart lives ON the desk, the old timeline scene is gone.
    if (name === "timeline" && document.body.classList.contains("cabin-on")) name = "main";
    if (!this.cam || !SCENES.has(name) || name === this.scene) return;
    // ON A PHONE OR A TABLET nothing turns the camera by itself: the player changes scene with
    // the rail's keys (js/mobile-table.js, which alone may set window.__pdxSceneByHand); any
    // other request only pings the key of that scene. The camera never animates there.
    if (document.documentElement.classList.contains("pdx-m-on")) {
      if (!window.__pdxSceneByHand) { try { window.__pdxScenePing && window.__pdxScenePing(name); } catch (e) {} return; }
      this.scene = name; this.cam.dataset.scene = name; return;
    }
    this.scene = name;
    // the seascape (waves + gulls) plays only while the chart fills the eyes
    try { if (window.__audio && window.__audio.setSeascape) window.__audio.setSeascape(name === "timeline"); } catch (e) {}
    if (window.__room) window.__room.setScene(name);   // the Room turns with us
    // a locked AudioContext must never kill the pan mid-function (the scene
    // flag had already turned, the world had not, the camera looked haunted)
    try { if (this._engaged) audio.play("pan"); } catch (e) {}
    const from = this.cam.dataset.scene || "main";
    if (this._turnHead(from, name)) return;
    if (this._reduced()) return this._crossfadeTo(name);   // no Web Animations: the old cover
    this.cam.classList.add("is-panning");
    this.cam.dataset.scene = name;                 // CSS eases the transform
    clearTimeout(this._settle);
    this._settle = setTimeout(() => this.cam.classList.remove("is-panning"), 900);
  }

  /* ── TURNING YOUR HEAD AT ONE WORKSTATION (the owner, 27/09) ─────────────────────
     The scenes are one table and one wall; a scene change is the player turning his
     head, never a cut or a fade. One Web Animation on #cam's transform, transform only
     (Firefox: no filters, no blur):
       - the pan itself, eased in and out, 450 to 650 ms by the pace setting;
       - the head's own motion on top of it, about the SCREEN's centre (it comes before
         the pan in the transform list): a small turn toward where he looks (rotateX /
         rotateY in #screen-game's perspective), a hair of roll on sideways looks, and a
         small pull back at mid-turn, all zero at both ends;
       - depth: the wall (the wallpaper layers) moves a little less than the table while
         the head turns and is back in register when it stops, so the table's grain and
         everything on it stay one continuous surface in front of a farther wall.
     The hull (hands, arm, console) and HELA's eye are not in #cam: they stay with him
     like his body. data-scene still flips at the start (every observer, the tutorial's
     atScene / whenScene, the beacon and the nap read it as before); the CSS transition
     is held at 0s while the animation plays, so the resting transform is the CSS one.
     Reduced motion: a short, gentle move of the pan alone. Falls back to the plain CSS
     pan when Web Animations are missing or someone else is driving the camera (the
     tutorial's wake sets --cam-dur inline). */
  _turnHead(from, to) {
    const cam = this.cam;
    if (!cam.animate || typeof getComputedStyle === "undefined") return false;
    const own = cam.style.getPropertyValue("--cam-dur");
    if (own && !this._turn && !this._holding) return false;   // another hand holds the camera (tutorial wake, refit)
    const RM = this._reduced();
    const cs0 = getComputedStyle(cam);
    const v = (cs, k, d) => { const x = (cs.getPropertyValue(k) || "").trim(); return x === "" ? d : (x === "0" ? "0px" : x); };
    const num = (cs, k, d) => { const x = parseFloat(cs.getPropertyValue(k)); return isFinite(x) ? x : d; };
    // where we are NOW: mid-turn, the live matrix; at rest, the scene's own values
    const live = this._turn ? cs0.transform : null;
    const A = { tx: v(cs0, "--cam-tx", "0px"), ty: v(cs0, "--cam-ty", "0px") };
    if (this._turn) { try { this._turn.cancel(); } catch (e) {} this._turn = null; }
    (this._walls || []).forEach((w) => { try { w.cancel(); } catch (e) {} }); this._walls = [];
    cam.style.setProperty("--cam-dur", "0s");      // the CSS transition must not fight the animation
    this._holding = true;
    cam.classList.add("is-panning");
    cam.dataset.scene = to;
    const cs = getComputedStyle(cam);
    const B = { tx: v(cs, "--cam-tx", "0px"), ty: v(cs, "--cam-ty", "0px") };
    const fit = num(cs, "--fit", 1), s = num(cs, "--cam-s", 1);
    const rx = v(cs, "--cam-rx", "0deg"), rz = v(cs, "--cam-rz", "0deg");
    const tail = `scale(${s}) rotateX(${rx === "0px" ? "0deg" : rx}) rotateZ(${rz === "0px" ? "0deg" : rz})`;
    const T = (tx, ty, lx, ly, lz, ls) =>
      `translate(-50%, -50%) scale(${fit}) rotateX(${lx}deg) rotateY(${ly}deg) rotateZ(${lz}deg) scale(${ls}) translate3d(${tx}, ${ty}, 0px) ${tail}`;
    const mid = (a, b) => `calc(0.5 * (${a}) + 0.5 * (${b}))`;
    // which way he looks, in scene steps (desk centre, Market above, records to the left)
    const P = { main: [0, 0], timeline: [1, 0], market: [0, -1], drawer: [-1, 0] };
    const pa = P[from] || [0, 0], pb = P[to] || [0, 0];
    const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
    const sp = (this.game && this.game.speed) || "normal";
    const ms = RM ? 240 : ({ slow: 650, normal: 560, brisk: 500, fast: 450 })[sp] || 560;
    let frames;
    if (RM) {
      frames = [{ transform: live || T(A.tx, A.ty, 0, 0, 0, 1) }, { transform: T(B.tx, B.ty, 0, 0, 0, 1) }];
    } else {
      const lx = (-dy * 1.3).toFixed(2), ly = (dx * 1.6).toFixed(2), lz = (dx * 0.25).toFixed(2);
      frames = [
        { transform: live || T(A.tx, A.ty, 0, 0, 0, 1), offset: 0 },
        { transform: T(mid(A.tx, B.tx), mid(A.ty, B.ty), lx, ly, lz, 0.976), offset: 0.5 },
        { transform: T(B.tx, B.ty, 0, 0, 0, 1), offset: 1 },
      ];
    }
    let anim;
    try {
      anim = cam.animate(frames, { duration: ms, easing: RM ? "cubic-bezier(.25,.1,.25,1)" : "cubic-bezier(.42,0,.2,1)" });
    } catch (e) {
      cam.style.removeProperty("--cam-dur"); this._holding = false;   // the plain CSS pan takes it from here
      clearTimeout(this._settle);
      this._settle = setTimeout(() => cam.classList.remove("is-panning"), 900);
      return true;
    }
    this._turn = anim;
    // the wall lags the table (only when the look has a vertical part: sideways, the
    // wall is out of view on a 16:9 screen and costs nothing to leave alone)
    if (!RM && dy) {
      const k = 0.075, ox = (dx * 1066 * k).toFixed(1), oy = (dy * 600 * k).toFixed(1);
      const wf = [{ transform: "translate(0px, 0px)" }, { transform: `translate(${ox}px, ${oy}px)`, offset: 0.5 }, { transform: "translate(0px, 0px)" }];
      const opt = (pe) => ({ duration: ms, easing: "cubic-bezier(.42,0,.2,1)", pseudoElement: pe });
      const grid = cam.querySelector(".game-grid");
      try { this._walls.push(cam.animate(wf, opt("::after"))); } catch (e) {}
      try { if (grid) this._walls.push(grid.animate(wf, opt("::after"))); } catch (e) {}
    }
    clearTimeout(this._settle);
    const done = () => {
      if (this._turn !== anim) return;             // a newer turn took over
      this._turn = null; this._walls = [];
      cam.classList.remove("is-panning");
      // hand the transform back to CSS only once a frame has been drawn at rest: lifting
      // the 0s in the same frame the animation ends let the CSS transition start from
      // the animation's last frame and drift for .6 s (a hair of leftover tilt)
      // (a timer, not frames: the nap holds every requestAnimationFrame, main.js)
      setTimeout(() => { if (!this._turn) { cam.style.removeProperty("--cam-dur"); this._holding = false; } }, 60);
    };
    anim.onfinish = done;
    this._settle = setTimeout(done, ms + 400);     // a paused tab never strands the flag
    return true;
  }

  _crossfadeTo(name) {
    const veil = this.cam.querySelector(".cam-veil");
    if (veil) veil.classList.add("show");
    setTimeout(() => {
      this.cam.style.setProperty("--cam-dur", "0s");
      this.cam.dataset.scene = name;
      if (veil) veil.classList.remove("show");
      if (typeof requestAnimationFrame !== "undefined")
        requestAnimationFrame(() => this.cam.style.removeProperty("--cam-dur"));
      else this.cam.style.removeProperty("--cam-dur");
    }, 180);
  }

  // Phase is a SOFT suggestion (scene != phase). Passive/headless never auto-moves.
  suggestScene() {
    // Disabled by design: nothing auto-moves the camera. A pending decision beckons
    // with an on-screen arrow (game.showBeacon); the player walks there themselves.
  }

  _frameGuard() {
    try {
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
      let n = this.cam;
      while (n && n !== document.documentElement) {
        if (n.scrollTop || n.scrollLeft) { n.scrollTop = 0; n.scrollLeft = 0; }
        n = n.parentElement;
      }
    } catch (e) {}
  }
  _zoneScene(candidates) {
    for (const c of candidates || []) {
      const s = ZONE_SCENE[c && c.zone];
      if (s) return s;
    }
    return "main";
  }

  // Which quadrant a decision lives in, a PURE lookup. The camera never moves on
  // its own; game.js turns this into a beckoning arrow instead.
  sceneForDecision(kind, o) {
    o = o || {};
    const S = {
      travel: "timeline", merchant_century: "timeline",
      deliver: "drawer", reward_category: "drawer",
      market: "market", steal_target: "market", destroy_target: "market",
      // Edison's Lamp deal is answered in the Secret bay: without this the beacon
      // stayed dark and nothing told the player where the waiting decision was.
      secret_deal: "market",
      // (the auction bid guides itself: the phase turns the camera and HELA
      // speaks; a beacon pointing at the window MID-SEAL would misguide)
      // activation lives in NO scene: the case is deliberately present in all three
      capacity: "main", recycle: "main", matrix_buff: "main",
    };
    let to = S[kind];
    if (kind === "target") {
      const tt = o.target_type;
      to = tt === "century" ? "timeline"
         : tt === "traveler" ? "main"
         : this._zoneScene(o.candidates);
    }
    if (to === "timeline" && document.body.classList.contains("cabin-on")) to = "main";
    return to || null;
  }
}
