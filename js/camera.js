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

import { audio } from "./audio.js?202609270154";

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
    this.scene = name;
    // the seascape (waves + gulls) plays only while the chart fills the eyes
    try { if (window.__audio && window.__audio.setSeascape) window.__audio.setSeascape(name === "timeline"); } catch (e) {}
    if (window.__room) window.__room.setScene(name);   // the Room turns with us
    // a locked AudioContext must never kill the pan mid-function (the scene
    // flag had already turned, the world had not, the camera looked haunted)
    try { if (this._engaged) audio.play("pan"); } catch (e) {}
    if (this._reduced()) return this._crossfadeTo(name);
    this.cam.classList.add("is-panning");
    this.cam.dataset.scene = name;                 // CSS eases the transform
    clearTimeout(this._settle);
    this._settle = setTimeout(() => this.cam.classList.remove("is-panning"), 900);
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
