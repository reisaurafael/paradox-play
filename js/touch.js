/* =========================================================================
   touch.js, THE TABLE ON A PHONE OR A TABLET (phase 1)
   -------------------------------------------------------------------------
   Loaded in <head>, before the first paint, as a plain script.

   WHO IS WHO. A device counts as touch when its PRIMARY pointer is coarse and
   it cannot hover (CSS media features, not the user agent). A desktop, a
   laptop driven by its trackpad, a touch laptop used with its mouse: the
   script stops at the first test and nothing below ever runs, no class, no
   listener, no element. Everything in styles/mobile.css hangs off html.pdx-touch.

   On touch, <html> carries:
     pdx-touch                  always
     pdx-phone | pdx-tablet     by the screen's short side (under 600 CSS px = phone)
     pdx-portrait | pdx-landscape   live
     pdx-standalone             launched from the home screen (no browser bars)
     pdx-fs                     in full screen now
     pdx-no-fs                  the browser cannot full-screen a page (iPhone)
     pdx-in-match               the table is on screen

   THE F11 OF THE PHONE.
     Android and every browser with the Fullscreen API: the tap that starts a
       match (Learn to Play, Play vs AI, Start) asks for full screen with the
       browser's navigation hidden and turns the table to landscape. Out of
       full screen a small "Full screen" key brings it back (in the menu, under
       every panel; in a match, in HELA's column). Never a cover over the menu.
     iPhone (no Fullscreen API for pages): a one-time guide, "Add to Home
       Screen", with the Share icon; launched from there the game has no bars
       (manifest.webmanifest + the apple meta tags in index.html).
     A phone held upright during a match gets "Turn your phone sideways".

   TOUCH BASICS. Long-press shows what a mouse hover would (card details, the
   chart's tips, titles); a long-press on a die in the tray sockets it (the
   right-click of the desktop); dice drag with a finger; the TAB key becomes a
   "?" (tap = tips, press and hold = the table's reference); the W / A / S
   scenes get tappable keycaps.

   Nothing here sends anything anywhere: the only storage is two flags in this
   device's localStorage / sessionStorage.
   ========================================================================= */
(function () {
  "use strict";
  var mm = function (q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
  if (!(mm("(pointer: coarse)") && mm("(hover: none)"))) return;   // a desktop: nothing at all

  var d = document.documentElement;
  var shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  var PHONE = shortSide < 600;
  var el0 = document.documentElement;
  var FS_API = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)
    && !!(el0.requestFullscreen || el0.webkitRequestFullscreen);
  // wording only (the Share icon of Safari), never a decision on its own: the choice
  // between the card and the guide is made by FS_API above
  var APPLE = /iP(hone|ad|od)/.test(navigator.userAgent || "")
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = function () {
    return mm("(display-mode: fullscreen)") || mm("(display-mode: standalone)") || navigator.standalone === true;
  };
  var isFs = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  d.classList.add("pdx-touch", PHONE ? "pdx-phone" : "pdx-tablet");
  if (!FS_API) d.classList.add("pdx-no-fs");
  function syncShape() {
    var portrait = mm("(orientation: portrait)");
    d.classList.toggle("pdx-portrait", portrait);
    d.classList.toggle("pdx-landscape", !portrait);
    d.classList.toggle("pdx-standalone", standalone());
    d.classList.toggle("pdx-fs", isFs());
  }
  syncShape();
  window.addEventListener("resize", syncShape);
  window.addEventListener("orientationchange", syncShape);

  // ADD TO HOME SCREEN on Android: Chrome offers the install once the page qualifies
  // (manifest + icons). Its own mini bar is held back; the game offers it in its own words
  // (a key in the menu). No event (another browser, or Chrome
  // not ready yet): the same buttons show the browser-menu steps instead.
  var installEv = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); installEv = e;
    if (document.body) try { syncFs(); } catch (err) {}
  });
  window.addEventListener("appinstalled", function () {
    installEv = null;
    if (document.body) try { syncFs(); } catch (err) {}
  });

  // main.js reads this for the graphics preset when the player has saved none:
  // phones are weak, so they start on Low, tablets on Medium (Settings still offers all three)
  window.__pdxTouch = { phone: PHONE, gfxDefault: PHONE ? "low" : "medium",
    fullscreen: function () { return goFullscreen().then(syncFs); }, isFs: function () { return isFs(); },
    canFs: FS_API, guide: function () { showGuide(true); }, standalone: function () { return standalone(); } };

  var ready = function (fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn();
  };

  /* ── small helpers ── */
  var ICON_FS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';
  var ICON_HOME = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v7M8.5 11.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_ADD = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var EYE = '<svg viewBox="-60 -60 120 120" aria-hidden="true"><path class="tx-burst" d="M0 -56 L12 -30 L40 -44 L32 -16 L58 -8 L34 8 L48 34 L18 28 L8 56 L-6 30 L-34 48 L-28 18 L-58 10 L-34 -8 L-46 -36 L-16 -28 Z"/>'
    + '<path class="tx-lid" d="M -36 0 Q 0 -27 36 0 Q 0 27 -36 0 Z"/><circle class="tx-iris" r="13"/><circle class="tx-pupil" r="6"/><circle class="tx-glint" cx="-4" cy="-4" r="2.4"/></svg>';
  function make(tag, id, cls, html) {
    var n = document.createElement(tag);
    if (id) n.id = id;
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }
  var inMatch = function () {
    var sg = document.getElementById("screen-game");
    return !!(sg && sg.classList.contains("is-active"));
  };
  var veilUp = function () { return !!document.getElementById("play-veil"); };

  /* ══ THE F11 OF THE PHONE ══════════════════════════════════════════════ */
  var pill = null, guide = null;
  var GUIDE_SEEN = "pdx-home-guide-seen";    // this device: the iPhone guide was read

  function goFullscreen() {
    var t = document.documentElement;
    var req = t.requestFullscreen || t.webkitRequestFullscreen;
    if (!req) return Promise.resolve(false);
    var p;
    try { p = req.call(t, { navigationUI: "hide" }); } catch (e) { p = null; }
    return Promise.resolve(p).then(function () {
      // the table is a landscape table; a phone turns with it (works only in full screen)
      try {
        if (screen.orientation && screen.orientation.lock) return screen.orientation.lock("landscape").catch(function () {});
      } catch (e) {}
    }).then(function () { return true; }, function () { return false; });
  }

  // THE CORNER KEY: back to full screen after leaving it (or the guide on an iPhone)
  function buildPill() {
    pill = make("button", "pdx-fs-pill", "", ICON_FS + '<span>Full screen</span>');
    pill.type = "button";
    pill.setAttribute("aria-label", "Play full screen");
    pill.addEventListener("click", function (e) {
      e.stopPropagation();
      pill.classList.remove("tx-nudge");
      if (FS_API) goFullscreen().then(syncFs); else showGuide(true);
    });
    document.body.appendChild(pill);
  }
  var homeKey = null;
  function buildHomeKey() {
    homeKey = make("button", "pdx-home-key", "", ICON_HOME + '<span>Add to Home Screen</span>');
    homeKey.type = "button";
    homeKey.addEventListener("click", function (e) { e.stopPropagation(); addToHome(); });
    document.body.appendChild(homeKey);
  }
  function syncFs() {
    syncShape();
    if (!pill) buildPill();
    if (!homeKey) buildHomeKey();
    // in the menu only, never over the table; on an iPhone the full-screen key already is the guide
    homeKey.hidden = standalone() || veilUp() || inMatch() || (APPLE && !FS_API) || !!(guide && !guide.hidden);
    // no key once the game has the whole screen, or while the guide is up; in a match on a
    // phone the key lives in HELA's column (mobile-table.js), never over the table
    pill.hidden = isFs() || standalone() || veilUp() || !!(guide && !guide.hidden)
      || (inMatch() && d.classList.contains("pdx-m-on"));
  }

  // kind "ios": Safari's Share steps (no full screen for pages there); "menu": the
  // browser menu's steps (Android when Chrome gave no install offer)
  function buildGuide(kind) {
    var ios = kind !== "menu";
    var APP = '<li><span class="tx-ico tx-ico-app"><img src="assets/icons/apple-touch-icon.png" alt="" width="28" height="28"></span><span>Open <b>Paradox</b> from your Home Screen, and turn the phone sideways.</span></li>';
    guide = make("div", "pdx-ios-guide", "tx-cover", ''
      + '<div class="tx-card" role="dialog" aria-modal="true" aria-labelledby="tx-ios-title">'
      + '<span class="tx-eye">' + EYE + '</span>'
      + '<h2 class="tx-title" id="tx-ios-title">' + (ios ? "Play full screen" : "Add to Home Screen") + '</h2>'
      + '<p class="tx-line">' + (ios
        ? (APPLE ? "Safari cannot hide its bars for a page, but" : "This browser cannot hide its bars for a page, but")
          + " Paradox can live on your Home Screen and open with the whole screen to itself."
        : "Paradox can live on your Home Screen like an app and open with the whole screen to itself.") + '</p>'
      + '<ol class="tx-steps">'
      + (ios
        ? '<li><span class="tx-ico">' + ICON_SHARE + '</span><span>Tap <b>Share</b>' + (APPLE ? " in Safari's bar" : "") + '.</span></li>'
          + '<li><span class="tx-ico">' + ICON_ADD + '</span><span>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</span></li>'
        : '<li><span class="tx-ico">' + ICON_MENU + '</span><span>Open the browser\'s <b>menu</b> (the three dots).</span></li>'
          + '<li><span class="tx-ico">' + ICON_HOME + '</span><span>Choose <b>Add to Home screen</b> or <b>Install app</b>.</span></li>')
      + APP
      + '</ol>'
      + '<button class="tx-later tx-ok" type="button" data-ios-close>Got it</button>'
      + '</div>');
    guide.dataset.kind = ios ? "ios" : "menu";
    guide.querySelector("[data-ios-close]").addEventListener("click", function () {
      if (ios) ls.set(GUIDE_SEEN, "1");
      guide.hidden = true;
      guide.classList.remove("on");
      syncFs();
    });
    document.body.appendChild(guide);
  }
  function addToHome() {
    if (installEv) {
      var ev = installEv;
      try {
        ev.prompt();
        Promise.resolve(ev.userChoice).then(function (c) { if (c && c.outcome === "accepted") installEv = null; syncFs(); }, function () {});
      } catch (err) { installEv = null; showGuide(true, "menu"); }
      return;
    }
    showGuide(true, APPLE || !FS_API ? "ios" : "menu");
  }
  function showGuide(force, kind) {
    if (standalone()) return;
    kind = kind || "ios";
    if (!force && ls.get(GUIDE_SEEN)) return;
    if (guide && guide.dataset.kind !== kind) { guide.remove(); guide = null; }
    if (!guide) buildGuide(kind);
    guide.hidden = false;
    requestAnimationFrame(function () { if (guide) guide.classList.add("on"); });
    syncFs();
  }

  // NEVER A COVER OVER THE MENU (the menu's panels must stay reachable): the tap that
  // starts a match is the gesture that asks for full screen (Learn to Play, Play vs AI,
  // Start); in the menu the two small keys sit under every panel. On an iPhone, whose
  // browser cannot full-screen a page, the key wiggles once to be noticed.
  function wireMatchEntry() {
    document.addEventListener("click", function (e) {
      if (!FS_API || isFs() || standalone()) return;
      if (e.target && e.target.closest && e.target.closest("#btn-tutorial, #btn-solo, #btn-start")) goFullscreen().then(syncFs);
    }, true);
  }
  function firstOffer() {
    if (standalone()) return;
    syncFs();
    if (!FS_API && !ls.get(GUIDE_SEEN) && pill) pill.classList.add("tx-nudge");
  }

  /* ══ TURN YOUR PHONE SIDEWAYS ══════════════════════════════════════════ */
  function buildRotate() {
    var r = make("div", "pdx-rotate", "", ''
      + '<div class="tx-rot-box">'
      + '<svg class="tx-phone" viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="6" width="24" height="44" rx="4"/><circle cx="32" cy="45" r="1.8"/>'
      + '<path class="tx-arc" d="M50 22 A20 20 0 0 1 44 52"/><path class="tx-arc-tip" d="M40 50 L44 53 L47 48"/></svg>'
      + '<p class="tx-rot-title">Turn your phone sideways</p>'
      + '<p class="tx-rot-line">The table is laid out in landscape.</p>'
      + '</div>');
    r.setAttribute("role", "status");
    document.body.appendChild(r);
  }

  /* ══ THE MATCH: scene keys and the "?" key ═════════════════════════════ */
  var SCENES = [["market", "W", "Merchant"], ["main", "S", "Desk"], ["drawer", "A", "Records"]];
  var tabs = null;
  function buildTabs() {
    tabs = make("nav", "pdx-scenes", "", SCENES.map(function (s) {
      return '<button type="button" data-scene="' + s[0] + '"><kbd>' + s[1] + '</kbd><span>' + s[2] + '</span></button>';
    }).join(""));
    tabs.setAttribute("aria-label", "Look around the table");
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-scene]");
      if (!b) return;
      e.stopPropagation();
      var g = window.__game, cam = g && g.camera;
      if (!cam || !cam.setScene) return;
      var to = b.dataset.scene;
      if (cam.scene === to) return;
      // the same steps as the W / A / S / D keys (game.js)
      cam._engage && cam._engage();
      cam.setScene(to);
      cam._manualUntil = (cam._now ? cam._now() : performance.now()) + 6000;
      try { g.updateBeacon && g.updateBeacon(); } catch (err) {}
      try { g._onSceneArrive && g._onSceneArrive(to); } catch (err) {}
      paintTabs();
    });
    document.body.appendChild(tabs);
  }
  function paintTabs() {
    if (!tabs) return;
    var on = inMatch() && document.body.classList.contains("cabin-on");
    tabs.hidden = !on;
    if (!on) return;
    var g = window.__game, now = g && g.camera ? g.camera.scene : "main";
    // HELA's arrow (game.showBeacon): the key of the place she points at beckons too
    var eye = document.getElementById("hela-eye");
    var want = g && g._beaconTarget && eye && eye.classList.contains("he-directs") ? g._beaconTarget : null;
    var bs = tabs.querySelectorAll("button");
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle("is-on", bs[i].dataset.scene === now);
      bs[i].classList.toggle("beckon", !!want && bs[i].dataset.scene === want && want !== now);
    }
  }

  // THE "?" KEY: help.js draws #pdx-tabkey and wires its click to the tips. On touch a
  // press held past a quarter second is the held Tab instead (the table's reference, while
  // the finger stays down), and the click that follows the release is swallowed.
  var HOLD_MS = 280, keyHoldT = 0, keyHeld = false, keyEat = false;
  function wireHelpKey() {
    document.addEventListener("pointerdown", function (e) {
      var k = e.target && e.target.closest && e.target.closest("#pdx-tabkey, .pdx-helpkey");
      if (!k || !window.__pdxHelp) return;
      clearTimeout(keyHoldT);
      keyHeld = false;
      keyHoldT = setTimeout(function () {
        keyHeld = true; keyEat = true;
        try { window.__pdxHelp.hold(true); } catch (err) {}
      }, HOLD_MS);
    }, true);
    var release = function () {
      clearTimeout(keyHoldT); keyHoldT = 0;
      if (keyHeld) { keyHeld = false; try { window.__pdxHelp.hold(false); } catch (err) {} }
    };
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    document.addEventListener("click", function (e) {
      if (!keyEat) return;
      if (e.target && e.target.closest && e.target.closest("#pdx-tabkey, .pdx-helpkey")) { e.preventDefault(); e.stopImmediatePropagation(); }
      keyEat = false;
    }, true);
    // iOS: a held button would otherwise open the text-selection loupe
    document.addEventListener("contextmenu", function (e) {
      if (e.target && e.target.closest && e.target.closest("#pdx-tabkey, .pdx-helpkey, #pdx-scenes, #pdx-fs-pill, #pdx-mrail, #pdx-mcol button")) e.preventDefault();
    }, true);
  }

  /* ══ LONG-PRESS = HOVER ════════════════════════════════════════════════
     A finger cannot hover. Held still for LP_MS, it becomes a hover at that
     point: the game's own mouseover / mouseenter / mousemove handlers run
     (card details, the chart's tips, the case files' peeks), and an element
     with only a title gets the title in a bubble. The click that would follow
     the lift is swallowed, so a long look never buys or fires anything. The
     next touch anywhere ends the hover. On a die in the tray a long-press
     sockets it, like the desktop's right-click (comic.js _quickPlace). */
  var LP_MS = 480, LP_SLOP = 10;
  var lp = null, hoverChain = [], eatClickUntil = 0, tip = null;
  function mouse(type, target, x, y, bubbles) {
    try {
      target.dispatchEvent(new MouseEvent(type, { bubbles: bubbles, cancelable: true, view: window,
        clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: 0 }));
    } catch (e) {}
  }
  function pointerEv(type, target, x, y, bubbles) {
    try {
      target.dispatchEvent(new PointerEvent(type, { bubbles: bubbles, cancelable: true, view: window,
        clientX: x, clientY: y, pointerType: "mouse", isPrimary: true }));
    } catch (e) {}
  }
  function unhover() {
    if (tip) { tip.classList.remove("on"); tip.hidden = true; }
    if (!hoverChain.length) return;
    var chain = hoverChain; hoverChain = [];
    var leaf = chain[chain.length - 1], x = -9999, y = -9999;
    if (leaf.isConnected) { mouse("mouseout", leaf, x, y, true); pointerEv("pointerout", leaf, x, y, true); }
    for (var i = chain.length - 1; i >= 0; i--) {
      if (!chain[i].isConnected) continue;
      mouse("mouseleave", chain[i], x, y, false);
      pointerEv("pointerleave", chain[i], x, y, false);
    }
    // the game's own "did the pointer really leave?" guards listen to mousemove
    mouse("mousemove", document.body, x, y, true);
  }
  function hoverAt(target, x, y) {
    unhover();
    var chain = [];
    for (var n = target; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n);
    hoverChain = chain;
    mouse("mouseover", target, x, y, true);
    pointerEv("pointerover", target, x, y, true);
    for (var i = 0; i < chain.length; i++) {
      mouse("mouseenter", chain[i], x, y, false);
      pointerEv("pointerenter", chain[i], x, y, false);
    }
    mouse("mousemove", target, x, y, true);
    // a plain title (a native tooltip) has no hover of its own on a phone: show it
    var t = target.closest && target.closest("[title]");
    var text = t && t.getAttribute("title");
    if (text) {
      if (!tip) { tip = make("div", "pdx-touch-tip"); tip.setAttribute("role", "status"); document.body.appendChild(tip); }
      tip.textContent = text;
      tip.hidden = false;
      var w = Math.min(280, innerWidth - 24);
      tip.style.maxWidth = w + "px";
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = Math.max(12, Math.min(innerWidth - tw - 12, x - tw / 2));
      var top = y - th - 34; if (top < 8) top = y + 34;
      tip.style.left = left + "px"; tip.style.top = top + "px";
      tip.classList.add("on");
    }
  }
  function wireLongPress() {
    document.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch") return;
      if (e.target && e.target.closest && e.target.closest("#pdx-tabkey, .pdx-helpkey, #pdx-scenes, #pdx-fs-pill, #pdx-mrail, #pdx-mcol, .tx-cover, input, select, textarea")) { lp = null; return; }
      // any new touch ends the last long look (a tap elsewhere closes the details)
      if (hoverChain.length || (tip && !tip.hidden)) unhover();
      var tgt = e.target, x = e.clientX, y = e.clientY;
      clearTimeout(lp && lp.t);
      lp = { x: x, y: y, id: e.pointerId, target: tgt, fired: false };
      lp.t = setTimeout(function () {
        if (!lp || lp.target !== tgt) return;
        lp.fired = true;
        eatClickUntil = performance.now() + 900;
        var die = tgt.closest && tgt.closest('.die[data-source="pool"]');
        if (die) {
          // the right-click of the desktop: the die sockets itself in the next open slot
          dragCancel();
          try { die.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 2 })); } catch (err) {}
          return;
        }
        if (drag && drag.moved) return;
        hoverAt(tgt, x, y);
      }, LP_MS);
    }, true);
    document.addEventListener("pointermove", function (e) {
      if (!lp || e.pointerId !== lp.id || lp.fired) return;
      if (Math.abs(e.clientX - lp.x) > LP_SLOP || Math.abs(e.clientY - lp.y) > LP_SLOP) { clearTimeout(lp.t); lp = null; }
    }, true);
    var end = function (e) { if (lp && e.pointerId === lp.id) { clearTimeout(lp.t); lp = null; } };
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);
    document.addEventListener("click", function (e) {
      if (performance.now() < eatClickUntil) { eatClickUntil = 0; e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    // the browser's own long-press menu (Android) and text callout: the game has its own
    document.addEventListener("contextmenu", function (e) {
      if (!e.isTrusted) return;          // ours, from the long-press above, goes through
      var t = e.target;
      if (t && t.closest && t.closest("input, textarea, a[href]")) return;
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
  }

  /* ══ DICE UNDER THE FINGER ═════════════════════════════════════════════
     The desktop drags a die with the browser's drag and drop, which a finger
     does not start. Here a die dragged by a finger takes the same road as two
     clicks: the press picks it up (the game's click on the die, so the bit
     swarm, the legal sockets and the reject all come from game.js), the
     swarm follows the finger, and the lift clicks whatever is under it: a
     socket, the escape valve, the tray, or bare desk to put it back. A plain
     tap is still a tap (tap the die, tap the socket). */
  var drag = null;
  function dragCancel() { if (drag) drag = null; }
  function wireDiceDrag() {
    document.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch" || drag) return;
      var die = e.target && e.target.closest && e.target.closest('.die[draggable="true"]');
      if (!die || !window.__game || !window.__game.alloc) return;
      drag = { die: die, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    }, true);
    document.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.x) < 9 && Math.abs(e.clientY - drag.y) < 9) return;
        drag.moved = true;
        if (lp) { clearTimeout(lp.t); lp = null; }
        var g = window.__game;
        // pick it up exactly as a click on it would (unless it is already in hand)
        if (!(g && g._carry && g.selected)) drag.die.click();
        document.body.classList.add("pdx-dragging-die");
      }
      e.preventDefault();
      // the swarm (game.js) and the cursor art follow window mousemove
      mouse("mousemove", document.body, e.clientX, e.clientY, true);
    }, { capture: true, passive: false });
    var drop = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dd = drag; drag = null;
      document.body.classList.remove("pdx-dragging-die");
      // a tap: the browser's own click does the rest. A finger that moved makes no click
      // of its own (touch-action: none on the dice, mobile.css), so the lift clicks here.
      if (!dd.moved) return;
      var g = window.__game;
      if (!g || !g.selected) return;
      var under = e.type === "pointercancel" ? null : document.elementFromPoint(e.clientX, e.clientY);
      // bare desk (or a cancelled touch) puts the die back, exactly like a click on nothing
      var target = (under && under.closest && under.closest(".cell, [data-drop='escape'], .escape-drop, .die")) || under || document.body;
      mouse("mousemove", document.body, e.clientX, e.clientY, true);
      try { target.click(); } catch (err) {}
    };
    document.addEventListener("pointerup", drop, true);
    document.addEventListener("pointercancel", drop, true);
    // a finger must never start the browser's own drag of a die or a card
    document.addEventListener("dragstart", function (e) {
      if (drag || (lp && !lp.fired)) { e.preventDefault(); }
    }, true);
  }

  /* ══ HER WORDS FOR A FINGER ════════════════════════════════════════════
     tutorial-drive.js passes every line through window.__pdxWords on touch: a key
     becomes the thing a finger taps (on a phone the rail's views and HELA's column,
     on a tablet the scene keycaps), and "click" becomes "tap". */
  var KEYS_PHONE = { W: "MERCHANT", A: "RECORDS", S: "MACHINE", D: "MACHINE", TAB: "?", L: "HELA's eye", ENTER: "CONFIRM", SPACE: "" };
  var KEYS_TABLET = { W: "W", A: "A", S: "S", D: "S", TAB: "?", L: "HELA's memory", ENTER: "CONFIRM", SPACE: "" };
  window.__pdxWords = function (html) {
    var phone = d.classList.contains("pdx-m-on");
    var K = phone ? KEYS_PHONE : KEYS_TABLET;
    var out = String(html);
    // "Close it with <kbd>Esc</kbd>" and the like: a tap outside closes
    out = out.replace(/with <kbd>Esc<\/kbd>/gi, "with a tap outside").replace(/<kbd>Esc<\/kbd>/gi, "a tap outside");
    // "then Confirm <kbd>Enter</kbd>": the key hint goes, the word stays
    out = out.replace(/\s*<kbd>Enter<\/kbd>/gi, function (m, i) { return /confirm\s*$/i.test(out.slice(Math.max(0, i - 12), i)) ? "" : " <b class=\"pw-key\">CONFIRM</b>"; });
    out = out.replace(/<kbd>([^<]{1,6})<\/kbd>/gi, function (m, k) {
      var v = K[k.toUpperCase()];
      if (v === undefined) return m;
      return v ? '<b class="pw-key">' + v + "</b>" : "";
    });
    // a delivery on a phone: the case and the cabinet are two views; a relic tapped in the
    // case is carried, and the view turns to the cabinet by itself
    if (phone) out = out.replace(/Drag (.+?) from your case into the open drawer/g,
      'Tap <b class="pw-key">CASE</b>, tap $1, then tap the open drawer');
    // on touch the Merchant's card opens its sheet first, and the sheet's big key buys
    out = out.replace(/drag it into your case, or click it/g, "tap it, then its <b class=\"pw-key\">BUY</b> key");
    // the verbs of a mouse and a keyboard
    out = out.replace(/\bPress\b(?=\s*<b class="pw-key">)/g, "Tap").replace(/\bpress\b(?=\s*<b class="pw-key">)/g, "tap")
      .replace(/\bClick(ing|ed|s)?\b/g, function (m, e) { return "Tap" + (e === "ing" ? "ping" : e === "ed" ? "ped" : e || ""); })
      .replace(/\bclick(ing|ed|s)?\b/g, function (m, e) { return "tap" + (e === "ing" ? "ping" : e === "ed" ? "ped" : e || ""); });
    return out;
  };

  /* ══ WIRING ════════════════════════════════════════════════════════════ */
  ready(function () {
    buildRotate();
    buildTabs();
    wireHelpKey();
    wireLongPress();
    wireDiceDrag();
    syncFs();

    wireMatchEntry();
    // the first offer waits for the loading veil to lift (the demo boots Python first)
    var offered = false;
    var tryFirst = function () {
      if (offered || veilUp()) return;
      offered = true;
      firstOffer();
    };
    tryFirst();

    var wasMatch = false;
    var onBody = function () {
      tryFirst();
      var m = inMatch();
      d.classList.toggle("pdx-in-match", m);
      wasMatch = m;
      paintTabs();
      syncFs();
    };
    new MutationObserver(onBody).observe(document.body, { attributes: true, attributeFilter: ["class"], childList: true });
    var sg = document.getElementById("screen-game");
    if (sg) new MutationObserver(onBody).observe(sg, { attributes: true, attributeFilter: ["class"] });
    // the camera turns without a class change on body (W / A / S, HELA's arrow)
    var cam = document.getElementById("cam");
    if (cam) new MutationObserver(paintTabs).observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
    var fsChange = function () {
      syncShape();
      syncFs();
      if (window.pdxApplyFit) window.pdxApplyFit();
    };
    document.addEventListener("fullscreenchange", fsChange);
    document.addEventListener("webkitfullscreenchange", fsChange);
    try {
      var dm = window.matchMedia("(display-mode: standalone)");
      if (dm.addEventListener) dm.addEventListener("change", syncFs);
    } catch (e) {}
    onBody();
    // her arrow comes and goes without a class on body: a light look twice a second, in a match only
    setInterval(function () { if (d.classList.contains("pdx-in-match")) paintTabs(); }, 500);
  });
})();
