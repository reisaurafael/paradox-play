/* ═══════════════════════════════════════════════════════════════════════════
   THE PARADOX SEA: six era charts, assembled (the DEFAULT timeline)
   Six sheets of different ages and inks, one per era, interlock as a puzzle
   covering the whole panel. The four centuries that belong to TWO eras
   (V, XV, XIX, XXIII) sit exactly ON the torn seams, ringed in both colors.
   Islands are real islands: irregular coasts, highlands, an era landmark.
   A pinned CHART KEY explains every glyph. The survey route, a faint dotted
   scrawl, threads all thirty centuries down to the Wellspring.
   Fully functional against the live game + Balatro-grade juice:
   course lines draw themselves, serpents lunge on paradoxes, lightning on
   explosions, the Merchant's ship sails, the sea idles alive.
   Layout is computed; a programmatic audit must return ZERO violations.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  let W = 780;             // set from the rail's real box at mount, the chart FILLS its frame
  let H = 950;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  // scale the x of every coordinate pair in an authored path (M/C absolute, x y alternating)
  function scalePathX(d, fn) {
    let ix = 0;
    return d.replace(/-?\d+(?:\.\d+)?/g, n => {
      const isX = ix % 2 === 0; ix++;
      return isX ? String(Math.round(fn(parseFloat(n)) * 10) / 10) : n;
    });
  }
  const ROM = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV",
    "XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX"];
  const rom = c => c === 0 ? "0" : ROM[c - 1];
  const rnd = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── THE CHART IN ONE LOOK ON A PHONE (the owner, 27/09: "one single look", no pan, no zoom) ──
     On a touch phone (html.pdx-phone, touch.js) each of the three charts is recomposed for
     the phone's landscape chart page instead of shrinking the tall desk chart into it. The
     same thirty centuries, the same road from XXX down to Year Zero, the same six periods,
     laid out as six bands read like a book: the Timeless on top, Antiquity at the foot, the
     road turning at the end of each band (XXX top right, I and Year Zero bottom right), the
     four border centuries (XXIII, XIX, XV, V) on the seam between their two bands. Every
     chart keeps its own skin on that frame (the vellum and castles, the sea and islands,
     the stars); the boards ask this for the geometry and draw it their own way. The chart's
     box takes the stage's own aspect (--pdx-chart-ar), so mobile-table.js fits it whole. */
  window.__pdxPhoneChart = window.__pdxPhoneChart || (function () {
    const D = document.documentElement;
    const on = () => D.classList.contains("pdx-phone");
    const HP = 560;
    function ar() {
      const cs = getComputedStyle(D);
      const cw = parseFloat(cs.getPropertyValue("--pdx-colw")) || 150, rw = parseFloat(cs.getPropertyValue("--pdx-railw")) || 64;
      const w = Math.max(innerWidth, innerHeight) - cw - rw, h = Math.min(innerWidth, innerHeight);   // the table is always landscape
      return Math.max(1.2, Math.min(2.1, w / Math.max(1, h)));
    }
    function dims() { const a = ar(); D.style.setProperty("--pdx-chart-ar", a.toFixed(4)); return { W: Math.round(HP * a), H: HP }; }
    // the six bands, top to bottom, and the direction the road runs along each
    const ROWS = [
      { era: "tim", cs: [30, 29, 28, 27, 26, 25, 24], x: [.93, .2] },
      { era: "con", cs: [22, 21, 20], x: [.27, .73] },
      { era: "mod", cs: [18, 17, 16], x: [.73, .27] },
      { era: "lma", cs: [14, 13, 12, 11], x: [.2, .8] },
      { era: "hma", cs: [10, 9, 8, 7, 6], x: [.92, .2] },
      { era: "ant", cs: [4, 3, 2, 1], x: [.2, .62] },
    ];
    const SEAMS = { 23: [0, .075], 19: [1, .925], 15: [2, .075], 5: [4, .075] };   // century: [band above, x]
    function layout(W, H, o) {
      o = o || {};
      // o.top: extra room above the first band only (the Sea's pieces stand above their islands)
      const m = o.margin != null ? o.margin : 14, t0 = o.top || 0, rowH = (H - 2 * m - t0) / 6, wob = o.wobble != null ? o.wobble : 7;
      const band = (r) => ({ top: r ? m + t0 + r * rowH : m, bot: m + t0 + (r + 1) * rowH, cy: m + t0 + (r + .5) * rowH, h: rowH });
      const pos = {}, rowOf = {};
      ROWS.forEach((R, r) => {
        const b = band(r), n = R.cs.length;
        R.cs.forEach((c, i) => {
          const t = n === 1 ? .5 : i / (n - 1);
          pos[c] = [Math.round(W * (R.x[0] + (R.x[1] - R.x[0]) * t)), Math.round(b.cy + (i % 2 ? wob : -wob))];
          rowOf[c] = r;
        });
      });
      for (const [cs, [r, fx]] of Object.entries(SEAMS)) { pos[+cs] = [Math.round(W * fx), Math.round(band(r).bot)]; rowOf[+cs] = r + .5; }
      const yz = [Math.round(W * (o.yzX || .85)), Math.round(band(5).cy + (o.yzDy || 4))];
      // the widest free stretch of a band (for its name, a church, a cove): [x0, x1]
      // side "top" / "bot": only the border centuries on that edge of the band count
      function gaps(r, pad, side) {
        pad = pad == null ? 46 : pad;
        const xs = [];
        for (let c = 1; c <= 30; c++) { const k = rowOf[c]; if (k === r || (k === r - .5 && side !== "bot") || (k === r + .5 && side !== "top")) xs.push(pos[c][0]); }
        if (r === 5) xs.push(yz[0]);
        xs.sort((a, b) => a - b);
        const pts = [[12, 0]].concat(xs.map((x) => [x, pad]), [[W - 12, 0]]), out = [];
        for (let i = 0; i + 1 < pts.length; i++) { const x0 = pts[i][0] + pts[i][1], x1 = pts[i + 1][0] - pts[i + 1][1]; if (x1 - x0 > 20) out.push([x0, x1]); }
        return out.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      }
      return { pos, rowOf, yz, band, gaps, rows: ROWS, rowH, W, H };
    }
    // THE TEXT WAS LAID OUT FOR A CHART NOBODY COULD SEE. The two charts off screen are
    // content-visibility: hidden (app.css PERF), and Chromium sizes SVG text for the screen
    // scale it has when laid out: a chart built or re-framed while hidden kept its words at
    // the wrong size (the names did not paint at all, the numerals came out at 0.6), and
    // turning it visible, or the phone's page re-framing it (mobile-table.js --pdx-s), did
    // not lay them out again. On a phone, whenever the chart on show or its framing
    // changes, the visible chart is laid out once more (display off and on, one frame).
    // It runs SYNCHRONOUSLY, from the observers' microtask, so the words are laid out before
    // the next frame is painted (a page is never revealed with the stale text first).
    function relayout() {
      const rail = document.getElementById("timeline-rail"); if (!rail || !on()) return;
      const cp = rail.querySelector(rail.classList.contains("skin-sing") ? ":scope > .cplot-sing" : rail.classList.contains("skin-ori") ? ":scope > .cplot-ori" : ":scope > .cplot");
      const svg = cp && cp.querySelector(":scope > svg"); if (!svg) return;
      svg.style.display = "none"; void svg.getBoundingClientRect(); svg.style.display = "";
    }
    // a board that re-composed its chart (its shape follows the stage) tells the page to frame
    // it again: mobile-table.js reframes on resize, the boards find nothing to redo
    let kickT = null;
    function remounted() { relayout(); clearTimeout(kickT); kickT = setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} }, 0); }
    function watch() {
      const rail = document.getElementById("timeline-rail"); if (!rail || !on()) return false;
      new MutationObserver(relayout).observe(rail, { attributes: true, attributeFilter: ["class"] });
      let lastS = "", lastCols = "";
      new MutationObserver(() => {
        const s2 = D.style.getPropertyValue("--pdx-s");
        if (s2 !== lastS) { lastS = s2; relayout(); }
        // HELA's column or the rail changed width: the chart page changed shape, so the
        // boards re-compose to it (their resize handlers compare the shape and redo it)
        const cols = D.style.getPropertyValue("--pdx-colw") + "|" + D.style.getPropertyValue("--pdx-railw");
        if (cols !== lastCols) { const first = !lastCols; lastCols = cols; if (!first) { clearTimeout(kickT); kickT = setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} }, 0); } }
      }).observe(D, { attributes: true, attributeFilter: ["style"] });
      return true;
    }
    if (!watch()) document.addEventListener("DOMContentLoaded", watch, { once: true });
    return { on, dims, layout, relayout, remounted, H: HP };
  })();

  /* ── THE SHEET RUNS ON (shared by all three charts; app.css THE CHART SHEET GROWS) ──
     Mounts a decorative sheet UNDER a chart that may run past the chart's right and
     bottom edges into the room a wider or taller screen has spare. art(EX, EY) returns SVG
     in the chart's own units covering 0..W+EX by 0..H+EY; CSS sizes the visible part and
     tears its edge. The chart itself never moves: this only paints beneath it. */
  window.__pdxSheetExt = window.__pdxSheetExt || function (cp, W0, H0, art) {
    if (!cp) return;
    const old = cp.querySelector(":scope > .sheet-ext"); if (old) old.remove();
    const ow = cp.offsetWidth, oh = cp.offsetHeight; if (!ow || !oh) return;
    const k = Math.min(ow / W0, oh / H0), ox = (ow - W0 * k) / 2, oy = (oh - H0 * k) / 2;
    // the most a screen can ever ask for, in plane px: 32:9 beside, 5:4 below
    const EX = Math.ceil(1150 / k), EY = Math.ceil(560 / k);
    const d = document.createElement("div");
    d.className = "sheet-ext"; d.setAttribute("aria-hidden", "true");
    d.innerHTML = `<svg xmlns="${"http://www.w3.org/2000/svg"}" width="100%" height="100%" preserveAspectRatio="none">`
      + `<g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${k.toFixed(5)})">${art(EX, EY)}</g></svg>`;
    cp.insertBefore(d, cp.firstChild);
  };

  /* ── THE CHART ROLLS WITH THE HEAD (the owner, 27/09: one continuous workstation) ──
     The chart rolls up on the Market scene (app.css THE CHART ROLLS UP). cabin.js used to
     notice the scene on its 400 ms tick and then roll for .68 s, so turning back to the
     desk landed on a rolled chart that unrolled afterwards. The camera flips #cam's
     data-scene the moment the head starts to turn (camera.js _turnHead); this flips
     chart-rolled in that same moment and gives the roll the turn's own length and curve,
     so the sheet unrolls while the desk swings into view and rolls up as it swings away. */
  if (!window.__pdxRollWithHead) {
    window.__pdxRollWithHead = true;
    const hookRoll = () => {
      const cam = document.getElementById("cam"); if (!cam) return false;
      let was = cam.dataset.scene === "market";
      new MutationObserver(() => {
        const now = cam.dataset.scene === "market", b = document.body;
        if (now === was) return; was = now;
        if (!b.classList.contains("cabin-on") || !document.getElementById("chart-roll")) return;
        if (b.classList.contains("chart-rolled") === now) return;
        const g = window.__game;
        const calm = REDUCED || document.documentElement.classList.contains("pdx-a11y")
          || !!(g && g._reducedMotion && g._reducedMotion());
        const ms = calm ? 240 : ({ slow: 650, normal: 560, brisk: 500, fast: 450 })[(g && g.speed) || "normal"] || 560;
        b.style.setProperty("--roll-ms", ms + "ms");
        b.style.setProperty("--roll-ease", "cubic-bezier(.42,0,.2,1)");   // the head turn's own curve
        b.classList.toggle("chart-rolled", now);
        // the black sheet under the chart (#timeline-rail::after, it casts the chart's
        // shadow) rests 90px past the chart's bottom for that shadow, so while rolling it
        // ran ahead of the paper as a dark band under the rod. Its box is the chart's box
        // plus the extension, so the chart's own edge sits at (1 - p) * 100% of it: ride
        // exactly there on the same curve, and give the shadow its room back at the end.
        if (!calm) {
          const rail = document.getElementById("timeline-rail"), E = "cubic-bezier(.42,0,.2,1)";
          const K = (bot) => ({ clipPath: `inset(0px -90px ${bot} 0px)` });
          try {
            if (rail) rail.animate(now
              ? [Object.assign(K("0%"), { easing: E }), K("100%")]
              : [Object.assign(K("100%"), { easing: E }), Object.assign(K("0%"), { offset: ms / (ms + 140) }), K("-90px")],
              { duration: now ? ms : ms + 140, pseudoElement: "::after" });
          } catch (e) {}
        }
        try { window.__audio && window.__audio.play("chart_creak"); } catch (e) {}
      }).observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
      return true;
    };
    if (!hookRoll()) document.addEventListener("DOMContentLoaded", hookRoll, { once: true });
  }

  /* ── THE ERA TURNS LIKE A COMIC PAGE (shared by the Origins and Singularity charts) ──
     My traveller crosses into another period and the chart re-skins in one move: a slab of
     ink edged with a paper gutter (the border between two comic panels) whips across the
     whole sheet, extension included, the chart swaps under it, the ink whips off the far
     side, and the new chart lands inside a heavy inked panel border with a jolt. Back in
     time it runs left to right, forward right to left. Normal pace: in 360 ms, held 90,
     out 380 (the new chart is fully in at 830), the border slams at 770 and is gone by
     1190; every length scales with the pace. Light comic effects keep the wipe alone, shorter; Off, a skip or calm motion
     swap at once. Only transform and opacity animate, on static layers (app.css
     .chart-turn). paradoxo:skinwarp fires at the start with detail.landMs, the moment the
     panel border lifts off the new chart (fx.js turns the era's page in then). swap() runs under the
     ink, done() when it is over. A second chart that re-skins during a turn (Origins to
     Singularity in one voyage) swaps under the same ink. */
  let turning = null;   // the turn on screen: its swaps, whether they ran, its dones
  window.__pdxChartTurn = window.__pdxChartTurn || function (back, swap, done) {
    if (turning) {
      if (turning.swapped) swap(); else turning.swaps.push(swap);
      if (done) turning.dones.push(done);
      return;
    }
    const rail = document.getElementById("timeline-rail");
    const fx = window.__fx, lvl = fx && fx.level ? fx.level() : "full";
    const P = (ms) => Math.round(window.__pdxPace ? window.__pdxPace(ms) : ms);
    const fire = (landMs) => { try { window.dispatchEvent(new CustomEvent("paradoxo:skinwarp", { detail: { landMs } })); } catch (e) {} };
    const now = () => { try { swap(); } finally { if (done) done(); } };
    if (!rail || REDUCED || document.documentElement.classList.contains("pdx-a11y")) { now(); return; }
    if (lvl === "off" || document.hidden || (fx && fx.game && fx.game._skip)) { fire(0); now(); return; }
    const full = lvl !== "light";
    const IN = P(full ? 360 : 300), HOLD = P(full ? 90 : 60), OUT = P(full ? 380 : 320), RUN = IN + HOLD + OUT;
    const old = rail.querySelector(":scope > .chart-turn"); if (old) old.remove();
    const t = document.createElement("div");
    t.className = "chart-turn" + (full ? "" : " ct-light");
    t.setAttribute("aria-hidden", "true");
    t.innerHTML = `<i class="ct-ink"></i>${full ? `<i class="ct-frame"></i>` : ""}`;
    rail.appendChild(t);
    const tr = turning = { swaps: [swap], swapped: false, dones: done ? [done] : [] };
    // the era's page (fx.js) lands as the panel border lifts, after the turn, never under it
    const FR = P(420), at = RUN - P(60);
    fire(full ? Math.round(at + FR * .5) : RUN);
    // the slab is 160% of the sheet wide and starts 30% left of it: at 94% of its own width
    // (plus the gutter and the skew) it sits just off the sheet, so the ink is on screen
    // from the first frame of the turn instead of spending half its run out of sight
    const dir = back ? 1 : -1, X = (v) => `translateX(${v}%) skewX(${-9 * dir}deg)`;
    try {
      t.firstChild.animate([
        { transform: X(-94 * dir), easing: "cubic-bezier(.5,0,.75,.4)" },
        { transform: X(0), offset: IN / RUN },
        { transform: X(0), offset: (IN + HOLD) / RUN, easing: "cubic-bezier(.2,.5,.35,1)" },
        { transform: X(94 * dir) }], { duration: RUN, fill: "both" });
    } catch (e) {}
    chartTurnSound(IN, RUN, full);
    setTimeout(() => { tr.swapped = true; for (const f of tr.swaps) try { f(); } catch (e) {} }, IN);
    let end = RUN;
    if (full) {
      end = at + FR;
      try {
        t.lastChild.animate([
          { opacity: 0, transform: "scale(1.045)" },
          { opacity: 1, transform: "none", offset: .16, easing: "linear" },
          { opacity: 1, transform: "none", offset: .5, easing: "ease-in" },
          { opacity: 0, transform: "none" }], { duration: FR, delay: at, fill: "both" });
        rail.animate([{ transform: "none" }, { transform: "translate(-3px, 2px)" },
          { transform: "translate(2px, -1px)" }, { transform: "none" }], { duration: P(170), delay: at + P(60) });
      } catch (e) {}
    }
    setTimeout(() => { t.remove(); turning = null; for (const f of tr.dones) try { f(); } catch (e) {} }, end + 20);
  };
  // the sound of the turn: the ink's whoosh, then (full) the panel's thud as it lands
  function chartTurnSound(IN, RUN, full) {
    try {
      const A = window.__audio; if (!A || !A.ctx) return;
      const C = A.ctx, bus = A.sfxBus || A.master || C.destination, t = C.currentTime, len = (RUN / 1000) + .1;
      const nb = C.createBuffer(1, Math.ceil(C.sampleRate * len), C.sampleRate), dd = nb.getChannelData(0);
      for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      const ns = C.createBufferSource(); ns.buffer = nb;
      const bp = C.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(420, t); bp.frequency.exponentialRampToValueAtTime(2600, t + IN / 1000);
      bp.frequency.exponentialRampToValueAtTime(700, t + RUN / 1000);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + IN / 1000);
      g.gain.exponentialRampToValueAtTime(0.0001, t + RUN / 1000);
      ns.connect(bp); bp.connect(g); g.connect(bus); ns.start(t); ns.stop(t + len);
      if (!full) return;
      const s = t + RUN / 1000 - .03, o = C.createOscillator(), og = C.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(140, s); o.frequency.exponentialRampToValueAtTime(48, s + .22);
      og.gain.setValueAtTime(0.0001, s); og.gain.exponentialRampToValueAtTime(0.32, s + .012);
      og.gain.exponentialRampToValueAtTime(0.0001, s + .34);
      o.connect(og); og.connect(bus); o.start(s); o.stop(s + .36);
    } catch (e) {}
  }

  /* ── THE COMIC MARKS ON A CHART PIECE (shared by all three charts) ──
     The case files wear the comic's emanata (comic.js); the pieces on the chart wear the
     same four, from public state only: ! Wanted, sweat drops at critical energy (6 or
     less), stars the Hour a motor exploded, z z Z awaiting respawn. The piece's wrapper
     gets st-wanted / st-crit / st-exploded / st-respawn, and a .pc-em-anchor group sits
     just above the piece for anything else to hang there. The marks are static ink in the
     seat's colour; a mark only pops once, the render it first appears (app.css). */
  window.__pdxEmanata = window.__pdxEmanata || function (t, col, memo, dy) {
    const st = t.statuses || [], set = [];
    if (st.includes("awaiting_respawn") || t.awaiting_respawn) set.push("respawn");
    else {
      if (t.is_wanted || st.includes("wanted")) set.push("wanted");
      if ((t.energy || 0) <= 6) set.push("crit");
      if (st.includes("exploded")) set.push("exploded");
    }
    const had = new Set((memo[t.name] || "").split(" "));
    memo[t.name] = set.join(" ");
    const ink = `fill="${col}" stroke="#0b0806" stroke-width="2.8" paint-order="stroke"`;
    const G = {
      wanted: `<text y="7" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="21" ${ink}>!</text>`,
      crit: `<path d="M -4.2 -7 Q -.8 -.8 -4.2 2.8 Q -7.6 -.8 -4.2 -7 Z M 4.8 -2.8 Q 7.8 2.8 4.8 6.2 Q 1.8 2.8 4.8 -2.8 Z" fill="${col}" stroke="#0b0806" stroke-width="1.8" paint-order="stroke"/>`,
      exploded: `<text y="5" text-anchor="middle" font-size="13" ${ink}>\u2605\u2726\u2605</text>`,
      respawn: `<text y="3.5" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="bold" font-size="13.5" ${ink}>z z Z</text>`,
    };
    const WD = { wanted: 10, crit: 17, exploded: 38, respawn: 40 };
    let x = -(set.reduce((a, k) => a + WD[k], 0) + (set.length - 1) * 4) / 2, marks = "";
    for (const k of set) {
      marks += `<g transform="translate(${(x + WD[k] / 2).toFixed(1)} 0)"><g class="pc-em-${k}${had.has(k) ? "" : " pc-em-new"}">${G[k]}</g></g>`;
      x += WD[k] + 4;
    }
    return { cls: set.map((k) => " st-" + k).join(""),
      g: `<g class="pc-em-anchor" transform="translate(0 ${dy})" pointer-events="none">${marks}</g>` };
  };

  /* ── FIGURE AND GROUND: THE PIECE PLATES (shared by all three charts) ──
     The pieces were drawn in the same inks and at the same weight as the chart under
     them, so the eye had to hunt for them. Every actor now stands on its own PLATE: a soft
     knockout halo that quietly washes the chart art right around it, a small static ground
     shadow, an opaque ink disc, a light rim and a saturated seat ring. Mine is the largest,
     wears a second ring and a YOU tag; rivals wear their initials, so colour is never the
     only cue. The Merchant stands on a GOLD cartouche, a shape no traveller has, with a
     MERCHANT tag. All static SVG: no filters, no blur, no loops (the one-shot arrival
     pulse plays once, the render the piece lands). html.pdx-a11y thickens all of it. */
  window.__pdxInitials = window.__pdxInitials || function (name) {
    const p = String(name).trim().split(/\s+/);
    return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
  };
  window.__pdxInkOn = window.__pdxInkOn || function (col) {
    let r = 128, g = 128, b = 128;
    const m = /^#?([0-9a-f]{6})$/i.exec(String(col || "").trim());
    const m3 = /^#?([0-9a-f]{3})$/i.exec(String(col || "").trim());
    const mr = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(String(col || ""));
    if (m) { r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16); }
    else if (m3) { r = parseInt(m3[1][0] + m3[1][0], 16); g = parseInt(m3[1][1] + m3[1][1], 16); b = parseInt(m3[1][2] + m3[1][2], 16); }
    else if (mr) { r = +mr[1]; g = +mr[2]; b = +mr[3]; }
    return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? "#140e06" : "#fffaf0";
  };
  // (the knockout gradient went with the big plates: the owner found the discs made the
  // chart illegible around a piece; kept as a no-op so every chart can still call it)
  window.__pdxPieceDefs = window.__pdxPieceDefs || function () { return ""; };
  /* THE OUTLINE: the piece's own silhouette drawn twice beneath it, a light rim and then
     an ink line (app.css .pc-ol), so it hugs the drawing by a few px and nothing around
     it is covered. o = { gold } (the Merchant's rim is gold, a traveller's is light). */
  window.__pdxOutline = window.__pdxOutline || function (inner, o) {
    o = o || {};
    return `<g class="pc-ol pc-ol-rim${o.gold ? " pc-ol-gold" : ""}" aria-hidden="true">${inner}</g>`
      + `<g class="pc-ol pc-ol-ink" aria-hidden="true">${inner}</g>${inner}`;
  };
  // the small base under a piece: a ground shadow and a seat-coloured foot, the size of
  // the hull (no disc). o = { col, self, base: keel y, w: half width, dark, pulse }
  window.__pdxPlate = window.__pdxPlate || function (o) {
    const ink = o.dark ? "#070a16" : "#1c150c", rim = o.dark ? "#e9f1ff" : "#fff8e4";
    // tolerant of an older caller (r / cy) or a missing value: never throw mid-render
    const by = Number.isFinite(+o.base) ? +o.base : (+o.cy || 0) + (+o.r || 12);
    const hw = Number.isFinite(+o.w) ? +o.w : (+o.r || 12) * .7;
    const rx = hw * (o.self ? 1.05 : .95), ry = Math.max(3, rx * .3);
    let s = `<ellipse class="pc-shadow" cx="1.2" cy="${(by + 2.2).toFixed(1)}" rx="${(rx + 1).toFixed(1)}" ry="${(ry + .8).toFixed(1)}" fill="#000" fill-opacity="${o.dark ? .55 : .3}"/>`;
    if (o.self && o.pulse) s += `<ellipse class="pc-pulse" cy="${by.toFixed(1)}" rx="${(rx + 3).toFixed(1)}" ry="${(ry + 2).toFixed(1)}" fill="none" stroke="${o.col}" stroke-width="2.4"/>`;
    s += `<ellipse class="pc-ring pc-base" cy="${by.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${o.col}" stroke="${o.self ? rim : ink}" stroke-width="${o.self ? 2.2 : 1.6}"/>`;
    if (o.self) s += `<ellipse class="pc-crown" cy="${by.toFixed(1)}" rx="${(rx + 2.2).toFixed(1)}" ry="${(ry + 1.6).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1.4"/>`;
    return `<g class="pc-plate">${s}</g>`;
  };
  // the name tag under a piece: YOU on mine (in my colour), initials on a rival's
  window.__pdxTag = window.__pdxTag || function (text, col, y, o) {
    o = o || {};
    const fs = o.fs || 9, w = Math.max(20, String(text).length * fs * .7 + 9), h = fs + 5;
    const ink = o.dark ? "#070a16" : "#1c150c";
    const fill = o.self ? col : ink, stroke = o.chased ? "#e8c05a" : o.self ? ink : col;
    const txt = o.self ? window.__pdxInkOn(col) : "#fff8e4";
    return `<g class="pc-tag${o.self ? " pc-tag-self" : ""}" transform="translate(0 ${y})" pointer-events="none">`
      + `<rect x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${(h / 2).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
      + `<text y="${(fs * .36).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="${fs}" letter-spacing=".8" fill="${txt}">${text}</text></g>`;
  };
  // under the Merchant: only a small ground shadow (his gold outline is __pdxOutline). o = { w, base, dark }
  window.__pdxMerchPlate = window.__pdxMerchPlate || function (o) {
    const w = +o.w || 40, base = Number.isFinite(+o.base) ? +o.base : 14;
    return `<ellipse class="pc-shadow pc-merch-plate" cx="1.2" cy="${base}" rx="${(w / 2).toFixed(1)}" ry="${Math.max(3, w * .12).toFixed(1)}" fill="#000" fill-opacity="${o.dark ? .55 : .3}"/>`;
  };
  // his tag says who he is and whom he chases, in one short line ("MERCHANT → P2")
  window.__pdxMerchTag = window.__pdxMerchTag || function (y) {
    let sub = "";
    try { const r = window.__game && window.__game.view && window.__pdxMerchantRule(window.__game.view); if (r && r.aim) sub = " \u2192 " + r.aim; } catch (e) {}
    // whom he chases is a reminder, not the game: it shows only while Tab is held (HELA
    // extended, help.js); the table itself shows just his name (app.css .pc-tag-aim)
    const one = (txt, cls) => { const w = Math.round(txt.length * 6.6 + 14);
      return `<g class="pc-tag pc-tag-merch${cls}" transform="translate(0 ${y})" pointer-events="none">`
        + `<rect x="${-w / 2}" y="-7.5" width="${w}" height="15" rx="7.5" fill="#e8c05a" stroke="#2a1c08" stroke-width="1.5"/>`
        + `<text y="3.3" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="8.8" letter-spacing="1" fill="#1c1206">${txt}</text></g>`; };
    return sub ? one("MERCHANT", " pc-tag-plain") + one("MERCHANT" + sub, " pc-tag-aim") : one("MERCHANT", "");
  };
  // FAN OUT a stack: pieces on one century push apart until their plates clear each
  // other (and stay inside the chart). pts = [{ x, y, r }], mutated in place.
  window.__pdxFan = window.__pdxFan || function (pts, gap, box) {
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    for (let it = 0; it < 40; it++) {
      let moved = false;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        const need = a.r + b.r + gap;
        if (d >= need) continue;
        if (d < .01) { dx = (j - i) % 2 ? 1 : -1; dy = .3; d = Math.hypot(dx, dy); }
        if (a.fixed && b.fixed) continue;
        const push = (need - d) / (a.fixed || b.fixed ? 1 : 2) + .1;
        if (!a.fixed) { a.x -= dx / d * push; a.y -= dy / d * push; }
        if (!b.fixed) { b.x += dx / d * push; b.y += dy / d * push; }
        moved = true;
      }
      if (box) for (const p of pts) if (!p.fixed) { p.x = cl(p.x, box[0] + p.r, box[2] - p.r); p.y = cl(p.y, box[1] + p.r, box[3] - p.r); }
      if (!moved) break;
    }
    return pts;
  };

  /* ── THE NUMERALS STAY READABLE UNDER THE PIECES (shared by all three charts) ──
     At a match's start every piece stands on XXX, in the chart's top corner: the frame
     clamped the berths down and their name tags hung over XXX's numeral, and pushed aside
     they landed on XXIX's. After the fan, each piece keeps its berth if its body and tag
     (below = how far the tag hangs under the berth) touch no century's plate and no piece
     already placed; otherwise it takes the nearest free spot on rings round its own
     century (its leash still ties it home). plates = [[x0, y0, x1, y1], ...]; fixed points
     (the Merchant) are obstacles too. */
  window.__pdxPlacePieces = window.__pdxPlacePieces || function (pts, node, plates, box, below) {
    const pad = 3, placed = [];
    const rectOf = (x, y, r) => [x - r, y - r, x + r, y + below];
    const clash = (q) => plates.some((P) => q[0] < P[2] + pad && q[2] > P[0] - pad && q[1] < P[3] + pad && q[3] > P[1] - pad)
      || placed.some((P) => q[0] < P[2] + 2 && q[2] > P[0] - 2 && q[1] < P[3] + 2 && q[3] > P[1] - 2);
    const inBox = (x, y, r) => !box || (x - r >= box[0] && x + r <= box[2] && y - r >= box[1] && y + below <= box[3] + 12);
    for (const p of pts) if (p.fixed) placed.push([p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r]);
    for (const p of pts) {
      if (p.fixed) continue;
      let best = null;
      if (inBox(p.x, p.y, p.r) && !clash(rectOf(p.x, p.y, p.r))) best = [p.x, p.y];
      for (let R = 26; !best && R <= 150; R += 8) {
        for (let k = 0; k < 24 && !best; k++) {
          const a = -Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 12;   // above first, then round both ways
          const x = node[0] + Math.cos(a) * R, y = node[1] + Math.sin(a) * R * .8;
          if (inBox(x, y, p.r) && !clash(rectOf(x, y, p.r))) best = [x, y];
        }
      }
      if (best) { p.x = best[0]; p.y = best[1]; }
      placed.push(rectOf(p.x, p.y, p.r));
    }
    return pts;
  };

  /* ── THE PIECES ON A PHONE (the owner, 28/09: "hard to tell whether the characters are in
     a given century or its vertical neighbours", "a little hard to see the characters") ──
     On the phone's one-look chart the bands are close, so a piece pushed out on a long
     string read as belonging to the band above or below. Here every piece is a TOKEN (an
     ink edge, a light disc in the seat's colour, the seat's own ship on it, a name ribbon;
     mine wears a white crown ring and YOU) that stands ON its own century: the board gives
     the spots where a stack may stand (on the castle or star, above the island, and
     fallbacks), and a stack on one century is a tight row of coins at that spot (two rows
     from four pieces on). A spot is refused when a token would leave the chart, cover a
     numeral plate, a cost tag, a sea tab, the Merchant or another stack, or stand nearer
     another century than its own. Only the phone uses this; the desk keeps its berths. */
  window.__pdxPhonePlace = window.__pdxPhonePlace || function (o) {
    // o = { groups: [{ c, node: [x, y], toks: [{ r, self }], spots: [[dx, dy, back]] }],
    //       nodes: { c: [x, y] } (every century and Year Zero), obst: [[x0, y0, x1, y1, c?, cost?]]
    //       (an obstacle tagged with a century does not count for that century's own stack;
    //       cost: how much covering it weighs, 10 by default, less for small marks),
    //       box: [x0, y0, x1, y1], below: how far a token's ribbon hangs under its centre }
    // returns { c: [[x, y, top], ...] } in the order given (top: a back-row token whose
    // ribbon rides above it, its lower edge being behind the front row)
    const out = {}, placed = [], below = o.below == null ? 6 : o.below;
    const hit = (a, b, pad) => a[0] < b[2] + pad && a[2] > b[0] - pad && a[1] < b[3] + pad && a[3] > b[1] - pad;
    const foot = (x, y, t, top) => { const e = t.self ? 6 : 2.5; return [x - t.r - e, y - t.r - (top ? 9 : e), x + t.r + e, y + t.r + (top ? e : Math.max(e, below))]; };
    // a row's places, the middle one last (mine is last: in the middle, in front)
    const rowOff = (k) => { const a = Array.from({ length: k }, (_, i) => i - (k - 1) / 2); return a.sort((p, q) => Math.abs(q) - Math.abs(p) || p - q); };
    const REAR = [-.5, .5, -1.5, 1.5];   // the back row stands in the front row's gaps
    const groups = o.groups.slice().sort((a, b) => b.toks.length - a.toks.length);
    for (const G of groups) {
      const [nx, ny] = G.node, n = G.toks.length, rM = Math.max(...G.toks.map((t) => t.r));
      const shapes = n > 3 ? [3, n] : [n];
      let best = null, bestPen = 1e9;
      G.spots.forEach(([dx, dy, back], si) => shapes.forEach((perRow, hi) => {
        // the front row holds the last pieces (mine is last, in its middle); the rest stand
        // one row behind, drawn first, in its gaps, higher (back -1) or lower (back 1)
        const front = Math.min(perRow, n), rear = n - front, pos = [];
        const step = rM * (front > 3 ? 1.3 : 1.7), fo = rowOff(front);
        for (let i = 0; i < rear; i++) pos.push([nx + dx + REAR[i] * step, ny + dy + (back || -1) * rM * .8, (back || -1) < 0]);
        for (let i = 0; i < front; i++) pos.push([nx + dx + fo[i] * step, ny + dy, false]);
        if (o.box) {   // a row that would run off the chart's side slides back in (a short way only)
          let lo = 1e9, hi = -1e9; pos.forEach(([x], i) => { const e = G.toks[i].r + (G.toks[i].self ? 6 : 2.5); lo = Math.min(lo, x - e); hi = Math.max(hi, x + e); });
          const sh = lo < o.box[0] ? o.box[0] - lo : hi > o.box[2] ? o.box[2] - hi : 0;
          if (sh && Math.abs(sh) <= step * 1.6) pos.forEach((p) => { p[0] += sh; });
        }
        let pen = si * .02 + hi * .5;
        pos.forEach(([x, y, top], i) => {
          const t = G.toks[i], f = foot(x, y, t, top);
          if (o.box && (f[0] < o.box[0] || f[2] > o.box[2] || f[1] < o.box[1] || f[3] > o.box[3])) pen += 50;
          for (const q of o.obst) if (q[4] !== G.c && hit(f, q, 1.5)) pen += q[5] || 10;
          for (const q of placed) if (hit(f, q, 1)) pen += 12;
          const dOwn = Math.hypot(x - nx, y - ny);
          for (const k in o.nodes) { if (+k === G.c) continue; const P = o.nodes[k]; if (Math.hypot(x - P[0], y - P[1]) < dOwn + 14) pen += 30; }
        });
        if (pen < bestPen) { bestPen = pen; best = pos; }
      }));
      best.forEach(([x, y, top], i) => placed.push(foot(x, y, G.toks[i], top)));
      out[G.c] = best.map(([x, y, top]) => [Math.round(x), Math.round(y), top]);
    }
    return out;
  };
  // a voyage's cost tag at (x, ty) on a phone slides sideways (up to 60 units) off any of
  // the boxes given (the Merchant, a chest); b = its half width, up/down = its extent
  window.__pdxSlideTag = window.__pdxSlideTag || function (x, ty, b, up, down, blocks, W) {
    const clash = (tx) => blocks.some((o) => tx - b < o[2] + 3 && tx + b > o[0] - 3 && ty - up < o[3] + 3 && ty + down > o[1] - 3);
    if (clash(x)) for (let d = 6; d <= 60; d += 6) {
      if (!clash(x + d) && x + d + b < W - 8) return x + d;
      if (!clash(x - d) && x - d - b > 8) return x - d;
    }
    return x;
  };
  // the boxes the placed tokens cover (for the names and tabs that step aside from them)
  window.__pdxPhoneFootprints = window.__pdxPhoneFootprints || function (groups, out) {
    const f = [];
    for (const G of groups) (out[G.c] || []).forEach(([x, y, top], i) => { const t = G.toks[i]; if (!t) return; const e = t.self ? 6 : 2.5;
      f.push([x - t.r - e, y - t.r - (top ? 9 : e), x + t.r + e, y + t.r + (top ? e : 6)]); });
    return f;
  };
  /* THE NAMES STEP ASIDE (phone): a band's printed name (the Itinerarium's kingdoms, the
     Singularity's constellations) is base art at a resting spot clear of the centuries; when
     a voyage's cost tag or a token lands on it, it slides along its band edge to the nearest
     spot clear of those and of the chart's fixed marks, and fades only if there is none.
     els: the name groups (data-x, data-y: their resting translate; data-r: x0,y0,x1,y1 of
     their box at rest), live: the tags' and tokens' boxes, fixed: plates, centuries, marks. */
  window.__pdxPhoneNameDodge = window.__pdxPhoneNameDodge || function (els, live, fixed, W) {
    const hitAny = (q, L, p) => L.some((o) => q[0] < o[2] + p && q[2] > o[0] - p && q[1] < o[3] + p && q[3] > o[1] - p);
    for (const el of els) {
      const x = +el.dataset.x, y = +el.dataset.y, r = String(el.dataset.r || "").split(",").map(Number);
      if (r.length !== 4 || !Number.isFinite(x)) continue;
      let dx = 0, dy = 0, k = 1, dim = false;
      if (hitAny(r, live, 3)) {
        let best = null;
        // along its band edge, nearest first; a few units lower into its band if need be;
        // printed a little smaller if the band is that crowded
        seek: for (const kk of [1, .8]) for (let d = 0; d < W; d += 6) for (const sgn of d ? [1, -1] : [1]) for (const v of [0, 5, 10]) {
          const X = x + sgn * d, Y = y + v, q = [X + (r[0] - x) * kk, Y + (r[1] - y) * kk, X + (r[2] - x) * kk, Y + (r[3] - y) * kk];
          if (q[0] < 14 || q[2] > W - 14) continue;
          if (!hitAny(q, live, 3) && !hitAny(q, fixed, 0)) { best = [sgn * d, v, kk]; break seek; }
        }
        if (best == null) dim = true; else [dx, dy, k] = best;
      }
      const tr = `translate(${x + dx} ${y + dy})${k !== 1 ? ` scale(${k})` : ""}`;
      if (el.getAttribute("transform") !== tr) el.setAttribute("transform", tr);
      el.style.opacity = dim ? ".3" : "";
    }
  };
  // a seat colour mixed toward white (the token's light disc)
  function tintOf(col, k) {
    let r = 128, g = 128, b = 128; const s = String(col || "").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(s), m3 = /^#?([0-9a-f]{3})$/i.exec(s), mr = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s);
    if (m) { r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16); }
    else if (m3) { r = parseInt(m3[1][0] + m3[1][0], 16); g = parseInt(m3[1][1] + m3[1][1], 16); b = parseInt(m3[1][2] + m3[1][2], 16); }
    else if (mr) { r = +mr[1]; g = +mr[2]; b = +mr[3]; }
    const f = (v) => Math.round(v + (255 - v) * k);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  /* The token, drawn round its own centre. o = { col, self, r, dark, ship (the seat's ship at
     its own scale), fit: [cx, cy, h] (that ship's centre and height), label, chased, pulse, lost,
     top (a back-row token: its ribbon rides above it) } */
  window.__pdxPhoneToken = window.__pdxPhoneToken || function (o) {
    const r = o.r, ink = o.dark ? "#04050c" : "#140e06", col = o.col;
    let s = `<g class="pc-piece pc-token">`;
    if (o.pulse) s += `<circle class="pc-pulse" r="${r + 3}" fill="none" stroke="${col}" stroke-width="2.4"/>`;
    if (o.self) s += `<circle r="${(r + 6.2).toFixed(1)}" fill="${ink}"/><circle r="${(r + 4.1).toFixed(1)}" fill="#fff8e4"/>`;
    s += `<circle class="pc-disc-ink" r="${(r + 2.2).toFixed(1)}" fill="${ink}"/>`
      + `<circle class="pc-disc" r="${r}" fill="${tintOf(col, o.dark ? .5 : .62)}"/>`
      + `<circle r="${(r - 1.7).toFixed(1)}" fill="none" stroke="${col}" stroke-width="2.6"/>`;
    const [fx, fy, fh] = o.fit || [0, 0, 20], k = (r * 1.42) / fh;
    s += `<g transform="translate(${(-fx * k).toFixed(2)} ${(-fy * k - r * .14).toFixed(2)}) scale(${k.toFixed(3)})${o.lost ? " rotate(-24)" : ""}">${window.__pdxOutline(o.ship)}</g>`;
    s += window.__pdxTag(o.label, col, o.top ? -r - 1 : r - 1, { self: o.self, dark: o.dark, chased: o.chased, fs: 9 });
    return s + `</g>`;
  };
  // the STRING, short: from the century's edge to the token's edge, in the seat's colour on an
  // ink core, with a knot on the century; none when the token stands on it. Drawn in the
  // token's own frame: node = its century's centre relative to the token, nodeR = how far
  // that century's own art reaches, r = the token's radius
  window.__pdxPhoneLeash = window.__pdxPhoneLeash || function (node, nodeR, r, col, dark) {
    const [nx, ny] = node, L = Math.hypot(nx, ny), nr = nodeR || 8, ink = dark ? "#04050c" : "#140e06";
    if (L - r - nr <= 3) return "";
    const ux = nx / L, uy = ny / L, x1 = (ux * (r + 1)).toFixed(1), y1 = (uy * (r + 1)).toFixed(1), x2 = (nx - ux * nr).toFixed(1), y2 = (ny - uy * nr).toFixed(1);
    return `<g class="pc-leash" aria-hidden="true"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="4.4" stroke-linecap="round"/>`
      + `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`
      + `<circle cx="${x2}" cy="${y2}" r="3.2" fill="${col}" stroke="${ink}" stroke-width="1.4"/></g>`;
  };

  /* ── THE MERCHANT, READ ALOUD (shared by all three charts and the TAB layer) ──
     Players could not tell WHEN, WHY, HOW or WHERE the Merchant moves. The rule is written
     in plain words from public state (view.merchant_plan, server/serialize.py). The chart
     keeps a one-line summary under him (who he chases, how many dice) and, on hover, in
     the Market phase and while TAB is held, the line to the traveler he chases and rings
     on the centuries his roll can reach. The full rule is read on TAB (js/help.js), at a
     size that can be read. Static SVG shown or hidden by CSS: no loops, no filters. */
  const MROM = c => (c >= 1 && c <= 30 ? ROM[c - 1] : String(c));
  window.__pdxMerchantRule = window.__pdxMerchantRule || function (v) {
    const p = (v && v.merchant_plan) || {};
    const n = p.dice || (v && v.merchant_movement_dice) || 1;
    const me = v && (v.travelers || []).find(t => t.is_self);
    const who = p.target_seat ? (me && me.name === p.target_seat ? "you" : p.target_seat) : null;
    const how = `He rolls ${n} ${n === 1 ? "die" : "dice"} (1 to 3 each) and sails that many centuries toward his target,`
      + " stopping early if he reaches it. He rolls 1 die at the start, 2 once anyone ends an Hour on XX,"
      + ` 3 once anyone ends an Hour on X${p.harald ? ", and 1 more while anyone has Harald's Bluetooth" : ""}.`;
    let why, short;
    if (p.why === "secret") { why = "Everyone is in his century, so he heads to the Secret Market at XI."; short = "heads to XI"; }
    else if (p.why === "future") { why = "Everyone is with him at the Secret Market, so he heads to XXX."; short = "heads to XXX"; }
    else if (who) {
      why = `He chases the richest traveler who is not in his century: ${who === "you" ? "YOU" : who} (${p.target_gold} gold), at ${MROM(p.target_century)}.`;
      short = `chases ${who === "you" ? "YOU" : window.__pdxInitials(who)}`;
    } else { why = "He chases the richest traveler who is not in his century."; short = "chases the richest"; }
    const mc = v && v.merchant_century;
    const stops = mc != null ? window.__pdxMerchantReach(mc, p.target_century, n).sort((a, b) => b - a).map(MROM) : [];
    const where = mc == null ? "" : `He is at ${MROM(mc)} now. `
      + (stops.length ? `His next roll can stop him at ${stops.length > 1 ? stops.slice(0, -1).join(", ") + " or " + stops[stops.length - 1] : stops[0]}.` : "He stays where he is.");
    let last = null;
    const roll = v && v.merchant_last_roll, mv = v && v.merchant_last_move;
    if (roll) last = `Last move: he rolled ${roll} and sailed ${Math.abs(mv || 0)}${Math.abs(mv || 0) < roll ? ", stopping on his target" : ""}.`;
    const aim = p.why === "secret" ? "XI" : p.why === "future" ? "XXX" : who ? (who === "you" ? "YOU" : window.__pdxInitials(who)) : "";
    return { n, who, aim, when: "At the end of every Market phase, after the travelers at his port have traded.",
      why, how, where, last, short: `${short} · ${n} ${n === 1 ? "die" : "dice"}` };
  };
  // which centuries can his next roll reach? (n dice of 1..3, capped at the target)
  window.__pdxMerchantReach = window.__pdxMerchantReach || function (mc, target, n) {
    const out = new Set();
    if (target == null || target === mc) return [];
    const dir = target > mc ? 1 : -1, D = Math.abs(target - mc);
    for (let k = n; k <= 3 * n; k++) out.add(Math.max(1, Math.min(30, mc + dir * Math.min(k, D))));
    return [...out];
  };
  /* The HUD beside the Merchant: the chase line, the reach rings and the summary pill.
     o = { v, m: [x,y] his plate centre, tpos: [x,y] the chased piece or null,
     pos: c => [x,y] or null, dark, pillDy } */
  window.__pdxMerchantHUD = window.__pdxMerchantHUD || function (o) {
    const esc2 = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
    const hidden = window.__pdxMerchantHiddenNow();
    document.body.classList.toggle("pc-merch-hidden", hidden);
    if (hidden) return "";
    const v = o.v, rule = window.__pdxMerchantRule(v), p = v.merchant_plan || {};
    const [mx, my] = o.m, ink = o.dark ? "#070a16" : "#1c150c";
    let s = `<g class="pc-mhud" pointer-events="none">`;
    // the line to the traveller he chases, and the centuries his roll can reach
    let key = "";
    if (o.tpos) {
      const [tx, ty] = o.tpos, d = Math.hypot(tx - mx, ty - my) || 1, ux = (tx - mx) / d, uy = (ty - my) / d;
      const ex = tx - ux * 27, ey = ty - uy * 27, a = Math.atan2(uy, ux);
      const hx = (dx, dy) => `${(ex + Math.cos(a) * dx - Math.sin(a) * dy).toFixed(1)} ${(ey + Math.sin(a) * dx + Math.cos(a) * dy).toFixed(1)}`;
      key += `<line x1="${(mx + ux * 30).toFixed(1)}" y1="${(my + uy * 30).toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${ink}" stroke-width="5" stroke-linecap="round" opacity=".55"/>`
        + `<line x1="${(mx + ux * 30).toFixed(1)}" y1="${(my + uy * 30).toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#e8c05a" stroke-width="2.4" stroke-dasharray="7 5" stroke-linecap="round"/>`
        + `<path d="M ${hx(4, 0)} L ${hx(-8, -6)} L ${hx(-8, 6)} Z" fill="#e8c05a" stroke="${ink}" stroke-width="1.2"/>`;
    }
    for (const c of window.__pdxMerchantReach(v.merchant_century, p.target_century, rule.n)) {
      const q = o.pos(c); if (!q) continue;
      key += `<circle cx="${q[0]}" cy="${q[1]}" r="15" fill="none" stroke="${ink}" stroke-width="5" opacity=".45"/>`
        + `<circle cx="${q[0]}" cy="${q[1]}" r="15" fill="none" stroke="#e8c05a" stroke-width="2.2" stroke-dasharray="3.5 3"/>`;
    }
    s += `<g class="pc-mhud-key">${key}</g>`;
    // the summary pill, under his MERCHANT tag
    const sw = rule.short.length * 5.2 + 14;
    if (o.pillDy != null) s += `<g class="pc-mhud-pill" transform="translate(${mx} ${my + o.pillDy})"><rect x="${(-sw / 2).toFixed(1)}" y="-7" width="${sw.toFixed(1)}" height="14" rx="7" fill="${ink}" fill-opacity=".92" stroke="#e8c05a" stroke-width="1.3"/>`
      + `<text y="3.2" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="8.4" fill="#f6e6b4">${esc2(rule.short)}</text></g>`;
    return s + `</g>`;
  };

  /* THE MERCHANT'S VOYAGE, TOLD. At the end of every Market phase he rolls and sails. It
     used to be a glide across the chart that nobody could read. Now, in every chart:
     his roll is thrown beside him (each die, then the total), he travels one century at a
     time along a gold trail with a count at each stop, the traveller he chases is ringed,
     and he lands on a STOP mark that says why he stopped; then the trail fades. The pace
     follows the Presentation speed (slower in the tutorial), F skips it, calm motion and
     Low graphics drop the tumbling, and every node it adds is removed at the end.
     o = { layer, piece (his live node, cloned), pos: c => [x,y], m0: [x,y] his plate
     centre at `from`, p: the merchant_moved payload, tpos, dark, onLand, onDone } */
  window.__pdxTripBusy = false;
  window.__pdxMerchantTrip = window.__pdxMerchantTrip || function (o) {
    const NS = "http://www.w3.org/2000/svg", p = o.p || {}, game = window.__game;
    const from = p.from, to = p.to;
    const skip = () => !!(game && game._skip) || document.hidden;
    const calm = document.documentElement.classList.contains("pdx-a11y")
      || document.body.classList.contains("gfx-low")
      || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let k = ({ slow: 1.5, normal: 1, brisk: .8, fast: .6 })[(game && game.speed) || "normal"] || 1;
    if (document.body.dataset.roomMode === "tutorial" || document.body.classList.contains("tut-on")) k *= 1.35;
    const ink = o.dark ? "#070a16" : "#1c150c";
    const root = document.createElementNS(NS, "g");
    root.setAttribute("class", "pc-mtrip-fx"); root.setAttribute("pointer-events", "none");
    o.layer.appendChild(root);
    const add = (html) => { const g = document.createElementNS(NS, "g"); g.innerHTML = html; root.appendChild(g); return g; };
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    let ended = false;
    window.__pdxTripBusy = true; window.__pdxTripPending = false;
    document.body.classList.add("pc-mtrip");
    // HANDOVER: the real piece takes his new berth, the game moves on (no empty wait);
    // only the static trail, counts and STOP mark linger a while and fade
    let tok = null;
    const handover = () => {
      try { o.onLand && o.onLand(); } catch (e) {}
      try { if (o.onLand !== null) window.__fxMerchantLanded && window.__fxMerchantLanded(p); } catch (e) {}   // ANCHORS DOWN beside his port (fx.js)
      o.onLand = null;
      if (tok) tok.remove();
      document.body.classList.remove("pc-mtrip");
      window.__pdxTripBusy = false;
      try { o.onDone && o.onDone(); } catch (e) {}
      o.onDone = null;
    };
    const finish = () => {
      if (ended) return; ended = true;
      timers.forEach(clearTimeout);
      handover();
      root.remove();
    };
    if (from == null || to == null || !o.pos(from) || !o.pos(to) || skip() || window.__pdxMerchantHiddenNow()) { finish(); return; }
    const [x0, y0] = o.m0, cdy = o.cdy || 0;
    const off = [x0 - o.pos(from)[0], y0 - o.pos(from)[1]];   // his berth sits off the century's centre
    const at = c => { if (o.anchor) return o.anchor(c); const q = o.pos(c); return q ? [q[0] + off[0], q[1] + off[1]] : null; };
    // his token travels as a clone (the live chart may redraw under it at any time)
    tok = document.createElementNS(NS, "g");
    tok.setAttribute("class", "pc-mtrip-tok");
    if (o.piece) {
      const cl = o.piece.cloneNode(true);
      cl.removeAttribute("data-tip"); cl.classList.remove("pc-merch-live");
      cl.setAttribute("transform", (cl.getAttribute("transform") || "").replace(/translate\([^)]*\)/, "").trim());
      tok.appendChild(cl);
    }
    // 1. attention: a ring at his berth, and the target ringed
    add(`<circle cx="${x0}" cy="${y0 + cdy}" r="26" fill="none" stroke="#e8c05a" stroke-width="3" class="pc-mtrip-call"/>`);
    if (o.tpos) add(`<circle cx="${o.tpos[0]}" cy="${o.tpos[1] - (o.tdy || 0)}" r="23" fill="none" stroke="${ink}" stroke-width="5" opacity=".5"/>`
      + `<circle cx="${o.tpos[0]}" cy="${o.tpos[1] - (o.tdy || 0)}" r="23" fill="none" stroke="#e8c05a" stroke-width="2.6" stroke-dasharray="6 4"/>`
      + `<g transform="translate(${o.tpos[0]} ${o.tpos[1] - (o.tdy || 0) - 36})"><rect x="-30" y="-8" width="60" height="16" rx="8" fill="#e8c05a" stroke="${ink}" stroke-width="1.5"/>`
      + `<text y="3.6" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="9" letter-spacing="1" fill="#1c1206">CHASED</text></g>`);
    // 2. the roll: each die, then the total
    const rolls = (p.rolls && p.rolls.length) ? p.rolls : (p.roll ? [p.roll] : []);
    const total = p.roll || rolls.reduce((a, b) => a + b, 0);
    const dist = Math.abs(to - from);
    let dice = null;
    if (rolls.length && !p.teleport) {
      // beside him, on the side away from the chart's edge (HELA speaks from the other side)
      const dw = rolls.length * 22 + 50, rightSide = x0 + 44 + dw < (o.W || 900) - 8;
      const dx = rightSide ? x0 + 44 : x0 - 44 - dw, dy = Math.max(8, y0 + cdy - 14);
      let faces = "";
      rolls.forEach((r2, i) => {
        const pips = { 1: [[0, 0]], 2: [[-3.4, -3.4], [3.4, 3.4]], 3: [[-4, -4], [0, 0], [4, 4]] }[r2] || [[0, 0]];
        faces += `<g transform="translate(${dx + 15 + i * 22} ${dy + 14})"><g class="pc-die"><rect x="-9" y="-9" width="18" height="18" rx="3.5" fill="#fff8e4" stroke="${ink}" stroke-width="1.6"/>`
          + pips.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.9" fill="${ink}"/>`).join("") + `</g></g>`;
      });
      dice = add(`<rect x="${dx}" y="${dy}" width="${dw}" height="28" rx="6" fill="${ink}" fill-opacity=".92" stroke="#e8c05a" stroke-width="1.6"/>${faces}`
        + `<text x="${dx + rolls.length * 22 + 10}" y="${dy + 18.5}" font-family="Georgia,serif" font-weight="bold" font-size="13" fill="#f6e6b4">= ${total}</text>`);
      if (!calm) dice.querySelectorAll(".pc-die").forEach((d, i) => {
        d.style.transformBox = "fill-box"; d.style.transformOrigin = "center";
        d.animate([{ transform: "rotate(-200deg) scale(.4)", opacity: 0 }, { transform: "rotate(20deg) scale(1.15)", opacity: 1, offset: .7 }, { transform: "none", opacity: 1 }],
          { duration: 800 * k, delay: i * 160 * k, easing: "ease-out", fill: "both" });
      });
    }
    // 3. the voyage, century by century
    const step = to > from ? 1 : -1, way = [];
    if (p.teleport) way.push(to);
    else for (let c = from + step; ; c += step) { if (at(c)) way.push(c); if (c === to) break; }
    const HOP = 720 * k, START = (rolls.length && !p.teleport ? 1700 : 700) * k;   // slow and one at a time: each hop can be followed
    root.appendChild(tok);
    tok.setAttribute("transform", `translate(${x0} ${y0})`);
    let prev = [x0, y0];
    way.forEach((c, i) => later(() => {
      if (skip()) { finish(); return; }
      const q = at(c); if (!q) return;
      const seg = add(`<line x1="${prev[0]}" y1="${prev[1] + cdy}" x2="${q[0]}" y2="${q[1] + cdy}" stroke="${ink}" stroke-width="6" stroke-linecap="round" opacity=".45"/>`
        + `<line x1="${prev[0]}" y1="${prev[1] + cdy}" x2="${q[0]}" y2="${q[1] + cdy}" stroke="#e8c05a" stroke-width="3" stroke-linecap="round"/>`);
      root.insertBefore(seg, root.firstChild);
      const n = p.teleport ? "" : String(i + 1);
      if (n) add(`<g transform="translate(${q[0] + 34} ${q[1] + cdy + 24})"><circle r="9" fill="#e8c05a" stroke="${ink}" stroke-width="1.6"/>`
        + `<text y="3.6" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="10.5" fill="#1c1206">${n}</text></g>`);
      if (calm) tok.setAttribute("transform", `translate(${q[0]} ${q[1]})`);
      else {
        const a = tok.animate([{ transform: `translate(${prev[0]}px,${prev[1]}px)` }, { transform: `translate(${q[0]}px,${q[1]}px)` }],
          { duration: HOP * .8, easing: "cubic-bezier(.45,.05,.35,1)", fill: "forwards" });
        a.onfinish = () => { tok.setAttribute("transform", `translate(${q[0]} ${q[1]})`); try { a.cancel(); } catch (e) {} };
      }
      try { window.__audio && window.__audio.play && window.__audio.play("merchant_step"); } catch (e) {}
      prev = q;
    }, START + i * HOP));
    // 4. the STOP mark, and why he stopped there
    const landAt = START + way.length * HOP;
    later(() => {
      if (skip()) { finish(); return; }
      const q = at(to) || prev;
      const why = p.teleport ? "sent here by a Chaos reward"
        : (dist < total ? `reached ${p.target || "his target"}` : `rolled ${total}, moved ${dist}`);
      const tw = (`STOP ${MROM(to)}: ${why}`).length * 6.3 + 22;
      add(`<circle cx="${q[0]}" cy="${q[1] + cdy}" r="27" fill="none" stroke="${ink}" stroke-width="5" opacity=".5"/><circle cx="${q[0]}" cy="${q[1] + cdy}" r="27" fill="none" stroke="#e8c05a" stroke-width="3"/>`
        + `<g transform="translate(${q[0]} ${q[1] + cdy + (o.stopDy || 54)})"><rect x="${(-tw / 2).toFixed(1)}" y="-11" width="${tw.toFixed(1)}" height="22" rx="11" fill="${ink}" fill-opacity=".94" stroke="#e8c05a" stroke-width="2"/>`
        + `<text y="4.2" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="11.5" fill="#f6e6b4">STOP ${MROM(to)}: ${why}</text></g>`);
      try { window.__audio && window.__audio.play && window.__audio.play("merchant_teleport"); } catch (e) {}
    }, landAt);
    // 5. the STOP mark is read, the real piece takes over and the game moves on; the
    //    marks stay a little longer and fade gently
    later(() => { if (skip()) { finish(); return; } handover(); }, landAt + 1600 * k);
    later(() => {
      const f = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1600 * k, easing: "ease-in", fill: "forwards" });
      f.onfinish = finish;
      later(finish, 1600 * k + 300);
    }, landAt + 3400 * k);
    later(finish, landAt + 5000 * k + 1500);   // hard cap: a stuck frame never strands the flag
  };
  /* THE TUTORIAL'S HOOK. The Merchant is ALWAYS on the chart by default, in every match
     and in the tutorial. Only a tutorial that asks for it hides him: it calls
     window.__pdxMerchantReveal(false) before his story beat and (true) at it; he, his
     readout and his voyage are hidden only in between. Any chart repaint applies it. */
  window.__pdxMerchantRevealed = window.__pdxMerchantRevealed === undefined ? null : window.__pdxMerchantRevealed;
  window.__pdxMerchantHiddenNow = window.__pdxMerchantHiddenNow || function () {
    return window.__pdxMerchantRevealed === false;
  };
  window.__pdxMerchantReveal = window.__pdxMerchantReveal || function (on) {
    window.__pdxMerchantRevealed = on == null ? null : !!on;
    document.body.classList.toggle("pc-merch-hidden", window.__pdxMerchantHiddenNow());
  };
  // the event queue waits for the voyage (capped; F or a hidden tab release it at once)
  window.__pdxTripWait = window.__pdxTripWait || async function () {
    for (let i = 0; i < 320 && (window.__pdxTripBusy || (window.__pdxTripPending && i < 60)); i++) {
      const g = window.__game;
      if ((g && g._skip) || document.hidden) break;
      await new Promise(r => setTimeout(r, 100));
    }
    window.__pdxTripPending = false;
  };


  /* ── the five torn seams between the six era sheets ── */
  const SEAMS = [
    x => 208 + 14 * x / W,   // timeless | contemporary   (XXIII lives here)
    x => 338 - 12 * x / W,   // contemporary | modern     (XIX)
    x => 462 + 10 * x / W,   // modern | low medieval     (XV)
    x => 596 - 16 * x / W,   // low medieval | high medieval, THE PERIOD TEAR
    x => 772 + 12 * x / W,   // high medieval | antiquity (V)
  ];
  const BANDS = [
    { id: "tim", name: "THE TIMELESS REACHES", span: "XXIII: XXX", islands: [30,29,28,27,26,25,24],
      top: () => 0, bottom: SEAMS[0],
      paper: ["#c9c7d6", "#57508022"], ink: "#3a3458", accent: "#5a4fa0",
      font: "'Courier New', monospace",
      guide: "M 712 64 C 560 22, 452 96, 486 148 C 512 188, 352 76, 238 112 C 142 140, 66 148, 98 178",
      fracs: [0, .15, .3, .46, .62, .8, 1], amp: 14 },
    { id: "con", name: "CONTEMPORARY ISLES", span: "XIX: XXIII", islands: [22,21,20],
      top: SEAMS[0], bottom: SEAMS[1],
      paper: ["#c5cede", "#3a62a822"], ink: "#2c3f58", accent: "#3a62a8",
      font: "'Trebuchet MS', sans-serif",
      guide: "M 130 268 C 250 240, 380 298, 512 258", fracs: [0, .5, 1], amp: 12 },
    { id: "mod", name: "MODERN ISLES", span: "XV, XIX", islands: [18,17,16],
      top: SEAMS[1], bottom: SEAMS[2],
      paper: ["#c2d6d6", "#2e8a8a22"], ink: "#26494a", accent: "#2e8a8a",
      font: "Georgia, serif",
      guide: "M 528 412 C 420 372, 300 444, 184 391", fracs: [0, .5, 1], amp: 12 },
    { id: "lma", name: "LOW MEDIEVAL CHAIN", span: "XI, XV", islands: [14,13,12,11],
      top: SEAMS[2], bottom: SEAMS[3],
      paper: ["#c8d6c3", "#3f8a3a22"], ink: "#2f4a26", accent: "#43883a",
      font: "Georgia, serif",
      guide: "M 196 526 C 296 554, 366 500, 448 538 C 494 556, 532 532, 556 542", fracs: [0, .34, .66, 1], amp: 12 },
    { id: "hma", name: "HIGH MEDIEVAL CHAIN", span: "V, X", islands: [10,9,8,7,6],
      top: SEAMS[3], bottom: SEAMS[4],
      paper: ["#e2d0b4", "#c0762a22"], ink: "#5a3a14", accent: "#c0762a",
      font: "Georgia, serif",
      guide: "M 636 650 C 505 706, 420 638, 330 700 C 252 748, 175 686, 128 716", fracs: [0, .26, .5, .75, 1], amp: 12 },
    { id: "ant", name: "ISLES OF ANTIQVITY", span: "I, V", islands: [4,3,2,1],
      top: SEAMS[4], bottom: () => H,
      paper: ["#e4d9a8", "#b3941a26"], ink: "#55470e", accent: "#a88b16",
      font: "'Times New Roman', serif",
      guide: "M 636 846 C 520 892, 400 852, 300 878 C 240 892, 190 872, 158 892", fracs: [0, .34, .66, 1], amp: 12 },
  ];
  // the four dual-era centuries sit ON their seam, x hand-set for the zigzag
  const STRAITS = { 23: { x: 170, seam: 0 }, 19: { x: 545, seam: 1 }, 15: { x: 128, seam: 2 }, 5: { x: 470, seam: 4 } };
  const ERAS_OF = c => {
    const e = [];
    if (c >= 1 && c <= 5) e.push("ant"); if (c >= 5 && c <= 10) e.push("hma");
    if (c >= 11 && c <= 15) e.push("lma"); if (c >= 15 && c <= 19) e.push("mod");
    if (c >= 19 && c <= 23) e.push("con"); if (c >= 23 && c <= 30) e.push("tim");
    return e;
  };
  const ERA_NAME = { tim: "Timeless", con: "Contemporary", mod: "Modern", lma: "Low Middle Ages", hma: "High Middle Ages", ant: "Antiquity" };
  const PERIOD_ERAS = { Origins: ["ant", "hma"], Ascension: ["lma", "mod"], Singularity: ["con", "tim"] };
  const islR = c => ((ERAS_OF(c).length === 2 ? 38 : 31) + rnd(c, 3) * 5) * (window.__pdxPhoneChart && window.__pdxPhoneChart.on() ? .8 : 1);
  const ACCENT = {}; BANDS.forEach(b => ACCENT[b.id] = b.accent);
  const FIXCOL = { self: "#1d6b52", r0: "#3a5a86", r1: "#6a4a8a", r2: "#8c5a2a", r3: "#8c2a4a", r4: "#4a7a5a" };

  /* ═══ LAYOUT ═══ */
  const POS = {}, LBL = {}, META = {};
  const ANCH = { taken: [], obst: [] };
  const isStrait = c => c in STRAITS;
  function addObst(x, y, w, h, kind) { ANCH.obst.push({ x, y, w, h, kind: kind || "glyph" }); }
  function inObst(x, y, mx, my, forIsland) {
    return ANCH.obst.some(o => {
      if (forIsland && o.kind === "soft") return false;
      const px = forIsland ? (o.kind === "panel" ? mx : 12) : mx;
      const py = forIsland ? (o.kind === "panel" ? my : 12) : my;
      return x > o.x - px && x < o.x + o.w + px && y > o.y - py && y < o.y + o.h + py;
    });
  }
  function samplePath(d, fracs) {
    const svg = document.createElementNS(NS, "svg");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); svg.appendChild(p);
    document.body.appendChild(svg);
    const L = p.getTotalLength();
    const pts = fracs.map(f => {
      const a = p.getPointAtLength(L * f);
      const b = p.getPointAtLength(Math.min(L, L * f + 2));
      return { x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y, t: f, L };
    });
    pts._path = p; pts._svg = svg; pts.L = L;
    return pts;
  }
  /* ═══ THE PARADOX SEA ON A PHONE: one look, no pan, no zoom ═══════════════════════════════
     The six seas stay six coloured sheets of water, stacked Timeless to Antiquity, their
     torn seams foaming, the waves adrift; each century is its island with its numeral on it;
     the survey route runs from XXX to the Skull Mount; the four straits sit on their seams;
     the sharks patrol I to IX, the lighthouses stand on X and XX, the haven hides at XI, the
     registry posts stand on their tears. Short sea names, bigger numerals, no cartouche and
     no compass. The geometry is board_draft.js window.__pdxPhoneChart. */
  const PH = window.__pdxPhoneChart, PHONE = () => !!(PH && PH.on());
  let PL = null;
  const PSHORT = { tim: "TIMELESS REACHES", con: "CONTEMPORARY ISLES", mod: "MODERN ISLES", lma: "LOW MEDIEVAL CHAIN", hma: "HIGH MEDIEVAL CHAIN", ant: "ANTIQVITY" };
  function phoneLayout() {
    PL = PH.layout(W, H, { yzX: .86, yzDy: 2, top: 14 });   // room above the first islands for the pieces
    BANDS.forEach((m, i) => {
      if (i < BANDS.length - 1) { const y0 = PL.band(i).bot, k = (i % 2 ? -5 : 5); SEAMS[i] = x => y0 + k * (x / W - .5); }
    });
    BANDS.forEach((m, i) => { m.top = i ? SEAMS[i - 1] : () => 0; m.bottom = i < BANDS.length - 1 ? SEAMS[i] : () => H; });
    for (const m of BANDS) for (const c of m.islands) { POS[c] = PL.pos[c].slice(); META[c] = m; LBL[c] = POS[c]; }
    for (const [cs, st] of Object.entries(STRAITS)) {
      const c = +cs, x = PL.pos[c][0];
      POS[c] = [x, Math.round(SEAMS[st.seam](x))]; META[c] = BANDS[st.seam]; LBL[c] = POS[c];
    }
  }
  // a tab rides its sheet's top tear: clear of the straits on that tear (they sit ON it),
  // between the islands of the two seas it parts, off the top-right corner where the
  // voyages start (XXX), and (live, phoneTabsDodge) clear of the Merchant and cost tags
  function tabBestX(i, hw, obst, loose) {
    const yOf = (x2) => (i === 0 ? 22 : BANDS[i].top(x2) + 1);
    let x = Math.round(W / 2), best = -1e9;
    tabBestX.score = -1e9;
    for (let x2 = hw + 16; x2 <= W - hw - 16; x2 += 6) {
      let sc = 200;
      for (let c = 1; c <= 30; c++) {
        const k = PL.rowOf[c], dx = Math.abs(x2 - POS[c][0]);
        if (k === i - .5) sc = Math.min(sc, dx - hw - 52);
        // (loose, when it steps aside from a tag: an island counts only where it comes near
        // the tear; the phone's rows stand well off it, the tab may pass above its shore)
        else if ((k === i || k === i - 1) && (!loose || Math.abs(POS[c][1] - yOf(x2)) < islR(c) * .74 + 16)) sc = Math.min(sc, (dx - hw - 14) * .5 + 30);
      }
      if (i <= 1) sc = Math.min(sc, Math.abs(x2 - POS[30][0]) - hw - 70);
      if (obst) { const y2 = yOf(x2); for (const o of obst) if (y2 + 13 > o[1] && y2 - 13 < o[3]) sc = Math.min(sc, Math.max(o[0] - (x2 + hw), (x2 - hw) - o[2]) - 10); }
      sc -= x2 * .002;
      if (sc > best) { best = sc; x = x2; }
    }
    tabBestX.score = best;
    return x;
  }
  let LIVEOBST = [];
  // on a phone the sea tabs step aside, along their tear, from the Merchant and from a
  // voyage's cost tags (the tabs are base art; they move by an offset on their wrapper)
  function phoneTabsDodge() {
    if (!PHONE() || !PL) return;
    BANDS.forEach((m, i) => {
      const el = document.querySelector(`#timeline-rail .cplot .sea-tab[data-band="${m.id}"]`); if (!el) return;
      const T = ANCH.tab[m.id]; if (!T) return;
      const [x, y] = T.spot, hw = T.hw;
      const hit = LIVEOBST.some(o => x + hw + 10 > o[0] && x - hw - 10 < o[2] && y + 13 > o[1] && y - 13 < o[3]);
      let dx = 0, dy = 0, dim = false, sc = 1;
      if (hit) {
        // how crowded its resting spot is with islands alone: a spot clear of the tags that
        // is no more crowded than that is as good a home (on a phone the islands stand well
        // off the tears, so the tab can always sit between them)
        tabBestX(i, hw, null); const rest = Math.min(0, tabBestX.score);
        const fixed = [];   // ...and it never steps onto the registry posts or the lighthouses
        for (const k in (ANCH.post || {})) { const P = (R.postLive && R.postLive[k]) || ANCH.post[k]; if (P) fixed.push(postBox(P[0], P[1])); }
        for (const c of [10, 20]) { const L = ANCH.light && ANCH.light[c]; if (L) fixed.push([L[0] - 10, L[1] - 26, L[0] + 10, L[1] + 4]); }
        const obs = LIVEOBST.concat(fixed), yAt = (x2) => Math.round(i === 0 ? 22 : m.top(x2) + 1);
        const clearAt = (x2, h, k) => !obs.some(o => x2 + h + 4 > o[0] && x2 - h - 4 < o[2] && yAt(x2) + 13 * k > o[1] && yAt(x2) - 13 * k < o[3]);
        // a clear spot along the tear: step there, at full size, else printed a little smaller;
        // none (the tear is crowded, every stretch would cover an island or a tag): stay put
        // and fade under what is on top of it
        dim = true;
        for (const k of [1, .8]) {
          const nx = tabBestX(i, hw * k, obs, true);
          if (tabBestX.score >= rest - 4 && clearAt(nx, hw * k, k)) { dx = nx - x; dy = yAt(nx) - y; sc = k; dim = false; break; }
        }
      }
      const tr = sc !== 1 ? `translate(${x + dx} ${y + dy}) scale(${sc}) translate(${-x} ${-y})` : dx || dy ? `translate(${dx} ${dy})` : "";
      if ((el.getAttribute("transform") || "") !== tr) { if (tr) el.setAttribute("transform", tr); else el.removeAttribute("transform"); }
      el.style.opacity = dim ? ".3" : "";
    });
  }
  function phoneAnchors() {
    ANCH.taken.length = 0; ANCH.obst.length = 0;
    ANCH.key = [W - 196, 24];
    ANCH.tab = {};
    BANDS.forEach((m, i) => {
      const label = PSHORT[m.id], hw = label.length * 5.2 + 10;
      const x = tabBestX(i, hw, null);
      const y = Math.round(i === 0 ? 22 : m.top(x) + 1);
      ANCH.tab[m.id] = { spot: [x, y], label, hw };
      addObst(x - hw - 8, y - 12, hw * 2 + 16, 24);
    });
    ANCH.ord = [0, 88];
    addObst(0, 84, 30, 152, "soft");
    ANCH.compass = [W - 60, H - 60];
    ANCH.well = PL.yz.slice();
    addObst(ANCH.well[0] - 26, ANCH.well[1] - 26, 52, 56);
    ANCH.light = {};
    for (const c of [10, 20]) { const [x, y] = POS[c]; ANCH.light[c] = [x - 6, y - islR(c) * 0.74 - 13]; }
    ANCH.post = {};
    [["Origins", 4], ["Ascension", 2], ["Singularity", 0]].forEach(([pname, si]) => {
      let best = null, bestD = -1;
      for (let fx2 = 0.12; fx2 <= 0.88; fx2 += 0.01) {
        const x = Math.round(W * fx2), y = Math.round(SEAMS[si](x));
        let dmin = 1e9;
        for (let c = 1; c <= 30; c++) dmin = Math.min(dmin, Math.hypot((x - POS[c][0]) * .8, (y - POS[c][1]) * 1.6) - islR(c));
        for (const id of [BANDS[si].id, BANDS[si + 1].id]) { const t = ANCH.tab[id]; if (t) dmin = Math.min(dmin, Math.abs(x - t.spot[0]) - t.hw - 50); }
        if (dmin > bestD) { bestD = dmin; best = [x, y]; }
      }
      ANCH.post[pname] = best;
      addObst(best[0] - 46, best[1] - 30, 92, 62, "soft");
    });
    ANCH.coveLab = [POS[11][0] - 48, POS[11][1] - 50];
  }
  function layout() {
    if (PHONE()) return phoneLayout();
    const sx = W / 780;
    // islands spread toward the freed corners, straits stay PINNED below
    const SPREAD = 1.07;
    const fxX = x => W / 2 + (x * sx - W / 2) * SPREAD;
    for (const m of BANDS) {
      const pts = samplePath(scalePathX(m.guide, fxX), m.fracs);
      for (let iter = 0; iter < 30; iter++) {
        let moved = false;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          if (Math.hypot(a.x - b.x, a.y - b.y) < 88) {
            const t = Math.min(1, b.t + 0.012);
            const q = pts._path.getPointAtLength(pts.L * t);
            b.x = q.x; b.y = q.y; b.t = t; moved = true;
          }
        }
        if (!moved) break;
      }
      pts.forEach((p, i) => {
        const c = m.islands[i];
        POS[c] = [Math.round(p.x), Math.round(p.y)];
        META[c] = m;
        LBL[c] = [POS[c][0], POS[c][1]];   // the numeral sits INSIDE its island
      });
      document.body.removeChild(pts._svg);
    }
    // strait islands: ON their seam, labels beside
    for (const [cs, st] of Object.entries(STRAITS)) {
      const c = +cs, sxx = Math.round(st.x * sx), y = Math.round(SEAMS[st.seam](sxx));
      POS[c] = [sxx, y];
      META[c] = BANDS[st.seam];      // upper sheet styles the disc
      LBL[c] = [sxx, y];
    }
  }
  function lblHalfW(c) { return rom(c).length * 5.2 + 4; }
  function seaSpot(prefX, prefY, bandId, taken, minClear) {
    const CLEAR = minClear || 18;
    const m = BANDS.find(mm => mm.id === bandId);
    let best = null, bestScore = -1;
    for (let gx = 46; gx < W - 46; gx += 30) {
      for (let gy = 34; gy < H - 34; gy += 30) {
        if (m && (gy < m.top(gx) + 32 || gy > m.bottom(gx) - 32)) continue;
        let dmin = 1e9;
        for (let c = 1; c <= 30; c++) {
          dmin = Math.min(dmin, Math.hypot(gx - POS[c][0], gy - POS[c][1]) - 40,
                                Math.hypot(gx - LBL[c][0], gy - LBL[c][1]) - 28);
        }
        for (const t of taken) dmin = Math.min(dmin, Math.hypot(gx - t[0], gy - t[1]) - 46);
        if (inObst(gx, gy, 40, 26)) continue;
        const score = Math.min(dmin, 90) - Math.hypot(gx - prefX, gy - prefY) * 0.25;
        if (dmin > CLEAR && score > bestScore) { bestScore = score; best = [gx, gy]; }
      }
    }
    if (best) taken.push(best);
    return best || [prefX, prefY];
  }
  function computeAnchors() {
    if (PHONE()) return phoneAnchors();
    ANCH.taken.length = 0; ANCH.obst.length = 0;   // fresh solver state on every layout
    addObst(24, 18, 258, 56, "panel");                            // cartouche
    // the CHART KEY pins itself to the clearest water (islands are the hard
    // constraint, they cannot move; the key can). Clearance uses the AUDIT's own
    // per-axis margins so a chosen spot can never fail the gate.
    let bestK = null, bestKs = -1, leastBad = null, leastBadS = -1e9;
    for (let gx = Math.round(W * 0.42); gx <= W - 184; gx += 14) {
      for (let gy = 56; gy <= H - 308; gy += 16) {
        let worst = 1e9, dLbl = 1e9;
        for (let c = 1; c <= 30; c++) {
          const [ix, iy] = POS[c];
          const cx2 = Math.max(gx - 34 - ix, ix - (gx + 164 + 34), 0);
          const cy2 = Math.max(gy - 30 - iy, iy - (gy + 290 + 30), 0);
          worst = Math.min(worst, Math.max(cx2, cy2));   // clear if beyond the pad in x OR y
          const [lx, ly] = LBL[c];
          const lx2 = Math.max(gx - 12 - lx, lx - (gx + 176), 0);
          const ly2 = Math.max(gy - 12 - ly, ly - (gy + 302), 0);
          dLbl = Math.min(dLbl, Math.hypot(lx2, ly2));
        }
        const score = Math.min(worst, 40) + Math.min(dLbl, 40) * .5 + gx * 0.03;
        if (score > leastBadS) { leastBadS = score; leastBad = [gx, gy]; }
        if (worst < 2) continue;                        // an island would sit under the key
        if (score > bestKs) { bestKs = score; bestK = [gx, gy]; }
      }
    }
    ANCH.key = bestK || leastBad || [W - 184, 350];
    addObst(ANCH.key[0], ANCH.key[1], 164, 290, "panel");            // the true rect (islands audit)
    // extra padded ring for LABELS only, the key is rotated; text must not kiss it
    addObst(ANCH.key[0] - 12, ANCH.key[1] - 12, 188, 314, "soft");
    // Era TABS: each sheet's name is a label pasted ON its top tear, one uniform
    // rule, never floating mid-water over islands. Solver picks the clearest x.
    ANCH.tab = {};
    BANDS.forEach((m, i) => {
      const label = `${m.name} · ${m.span}`;
      const hw = label.length * 3.35 + 10;
      const seamY = i === 0 ? () => 16 : m.top;
      const straitXs = Object.values(STRAITS).filter(s => s.seam === i - 1).map(s => Math.round(s.x * W / 780));
      let best = null, bestD = -1;
      for (let fx = 0.14; fx <= 0.86; fx += 0.03) {
        const x = Math.round(W * fx), y = Math.round(seamY(x));
        if (x - hw < 8 || x + hw > W - 8) continue;
        if (inObst(x, y, hw + 12, 18)) continue;
        let dmin = 1e9;
        for (const sxx of straitXs) dmin = Math.min(dmin, Math.abs(x - sxx) - hw - 62);
        for (let c = 1; c <= 30; c++) {
          if (Math.abs(POS[c][1] - y) < 42) dmin = Math.min(dmin, Math.abs(x - POS[c][0]) - hw - 42);
          if (Math.abs(LBL[c][1] - y) < 26) dmin = Math.min(dmin, Math.abs(x - LBL[c][0]) - hw - lblHalfW(c) - 10);
        }
        if (dmin > bestD) { bestD = dmin; best = [x, y]; }
      }
      ANCH.tab[m.id] = { spot: best || [Math.round(W / 2), Math.round(seamY(W / 2))], label, hw };
      const sp = ANCH.tab[m.id].spot;
      addObst(sp[0] - hw - 8, sp[1] - 12, hw * 2 + 16, 24);
    });
    // THE SAILING ORDER, a slim wooden tab docked on the chart's left edge.
    // Glance = the leader's boat on the tab · hover = the full order · click =
    // the slate slides out OVER the water (transient, player-invoked).
    ANCH.ord = [0, 88];
    addObst(0, 84, 30, 152, "soft");   // labels keep clear of the tab
    ANCH.compass = seaSpot(W - 78, POS[10][1] + 4, "hma", ANCH.taken, 34);
    addObst(ANCH.compass[0] - 30, ANCH.compass[1] - 42, 60, 92);
    ANCH.well = [Math.max(60, POS[1][0] - 62), Math.min(H - 58, POS[1][1] + 34)];
    addObst(ANCH.well[0] - 26, ANCH.well[1] - 26, 52, 56);
    ANCH.light = {};
    for (const c of [10, 20]) {
      const [x, y] = POS[c];
      const ry = islR(c) * 0.74;
      ANCH.light[c] = [x - 6, y - ry - 13];    // base buried in the coast, no floating
      // soft: the tower stands ON its island by design, repel labels, not land
      addObst(ANCH.light[c][0] - 4, ANCH.light[c][1] - 2, 22, 26, "soft");
    }
    // PERIOD POSTS (§5.4), a registry marker planted ON each period's internal
    // tear (the one seam that lies wholly inside it): pole, plate, filling chest.
    ANCH.post = {};
    [["Origins", 4], ["Ascension", 2], ["Singularity", 0]].forEach(([pname, si]) => {
      let best = null, bestD = -1;
      for (let fx2 = 0.1; fx2 <= 0.9; fx2 += 0.02) {
        const x = Math.round(W * fx2), y = Math.round(SEAMS[si](x));
        if (x < 56 || x > W - 56) continue;
        if (inObst(x, y, 52, 36)) continue;
        let dmin = 1e9;
        for (let c = 1; c <= 30; c++)
          dmin = Math.min(dmin, Math.hypot(x - POS[c][0], y - POS[c][1]) - islR(c));
        for (const s of Object.values(STRAITS)) if (s.seam === si)
          dmin = Math.min(dmin, Math.abs(x - Math.round(s.x * W / 780)) - 60);
        if (dmin > bestD) { bestD = dmin; best = [x, y]; }
      }
      ANCH.post[pname] = best || [Math.round(W * .5), Math.round(SEAMS[si](W * .5))];
      // soft: a compact marker like the lighthouses, repels nothing but labels
      addObst(ANCH.post[pname][0] - 46, ANCH.post[pname][1] - 30, 92, 62, "soft");
    });
    ANCH.coveLab = seaSpot(POS[11][0] - 60, POS[11][1] - 60, "lma", ANCH.taken, 28);
    addObst(ANCH.coveLab[0] - 52, ANCH.coveLab[1] - 12, 104, 24);   // cove label
  }
  let TEARS = [];   // [{band index, rect}]
  function audit() {
    const v = [];
    for (let c = 1; c <= 30; c++) {
      const [x, y] = POS[c], m = META[c];
      if (x < 46 || x > W - 46) v.push(`island ${rom(c)} x-margin`);
      if (!isStrait(c) && (y < m.top(x) + 30 || y > m.bottom(x) - 30)) v.push(`island ${rom(c)} seam-margin`);
      for (const T of TEARS)
        if (T.r && x > T.r.x - 34 && x < T.r.x + T.r.w + 34 && y > T.r.y - 30 && y < T.r.y + T.r.h + 30)
          v.push(`island ${rom(c)} in tear`);
      for (let d = c + 1; d <= 30; d++) {
        const [x2, y2] = POS[d];
        if (Math.hypot(x - x2, y - y2) < 74) v.push(`islands ${rom(c)}/${rom(d)} too close`);
      }
      if (inObst(x, y, 34, 30, true)) v.push(`island ${rom(c)} under chart furniture`);
    }
    return v;
  }

  /* ═══ STATE ═══ */
  const R = { trails: [], monsters: [], wrecks: [], storms: [], restored: new Set(),
    merchantLast: null, merchantHist: [], taken: [], fx: [], prevShip: null,
    presented: new Set(), preplot: null, shown: {}, sailing: false, deliveries: [], pendingSelf: null,
    ordIdx: null, ordFlip: null, merchantShown: null };
  const trailKey = t => `${t.seat}:${t.from}:${t.to}:${t.hour}`;
  let app = null, rivalKeys = {};
  function hookApp() {
    app = window.__game;
    if (!app || app.__seaHooked) return !!app;
    app.__seaHooked = true;
    const orig = app.playEvent.bind(app);
    app.playEvent = async msg => {
      try { onEvent(msg); } catch (e) {}
      const r = await orig(msg);
      // the Merchant's voyage is told on the chart; the next event waits for it
      const k = msg && (msg.event || msg.kind || msg.type);
      if (k === "merchant_moved" && window.__pdxTripWait) await window.__pdxTripWait();
      return r;
    };
    const origDec = app.onDecision.bind(app);
    app.onDecision = req => {
      const r = origDec(req);
      try { pollDecisions(); } catch (e) {}
      return r;
    };
    window.__seaState = R; window.__seaFx = (f) => { R.fx.push(f); drainFx(); };
    window.__seaPresenting = () => __live() && (fxBusy || R.fx.length > 0 || R.sailing);
    // Screen rect of an island, lets game.js land card flights ON the chart
    // (the delivered artifact flies home to its century's island).
    window.__seaIslandRect = c => {
      const el = document.querySelector(`.sea-isle[data-c="${c}"]`);
      const r = el && el.isConnected ? el.getBoundingClientRect() : null;
      return r && r.width ? r : null;
    };
    return true;
  }
  // The sea speaks through the game's audio engine (game.js exposes window.__audio).
  const audible = () => { const r = document.getElementById("timeline-rail"); return !!r && (!r.classList.contains("skin-sing") && !r.classList.contains("skin-ori")); };
  const snd = (n, o) => { try { if (window.__audio) audible() && window.__audio.play(n, o); } catch (e) {} };
  function hourNow() { return app && app.view ? app.view.hour : 0; }
  function voyagePath(from, to, hour) {
    // a course NEVER crosses land: bow the arc wider and wider until every league is open sea
    const [x1, y1] = POS[from], [x2, y2] = POS[to];
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const base = Math.min(30, Math.max(10, L * .14)) * (rnd(from * 31 + to, hour) > .5 ? 1 : -1);
    const clear = (mx, my) => {
      for (let k = 1; k < 15; k++) {
        const t = k / 15, u = 1 - t;
        const px = u * u * x1 + 2 * u * t * mx + t * t * x2, py = u * u * y1 + 2 * u * t * my + t * t * y2;
        for (let c2 = 1; c2 <= 30; c2++) {
          if (c2 === from || c2 === to || !POS[c2]) continue;
          if (Math.hypot(px - POS[c2][0], py - POS[c2][1]) < islR(c2) + 9) return false;
        }
        if (ANCH.well && Math.hypot(px - ANCH.well[0], py - ANCH.well[1]) < 30 && from !== 0 && to !== 0) return false;
      }
      return true;
    };
    let mx = x1 + dx / 2 - dy / L * base, my = y1 + dy / 2 + dx / L * base;
    for (const mult of [1, -1, 1.9, -1.9, 2.8, -2.8, 3.8, -3.8, 5]) {
      const bw = base * mult;
      const tx2 = x1 + dx / 2 - dy / L * bw, ty2 = y1 + dy / 2 + dx / L * bw;
      if (clear(tx2, ty2)) { mx = tx2; my = ty2; break; }
    }
    return `M ${x1} ${y1} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2} ${y2}`;
  }
  function selfT() { return app && app.view ? app.view.travelers.find(t => t.is_self) : null; }
  // THE SEAT COLOUR COMES FROM THE GAME NOW. This chart used to keep its own palette AND
  // its own first-seen index (rivalKeys), so the boat you saw here and the badge on the
  // desk were two different colours for the same rival, and no squinting was ever going
  // to fix it. Colour is a LABEL; a label that disagrees with itself is worse than none.
  // FIXCOL survives only as a fallback for previewing a chart with no game attached.
  function seatColor(seat) {
    try{ if(window.__seatColor){ const c=window.__seatColor(seat); if(c) return c; } }catch(e){}
    const s = selfT();
    if (s && seat === s.name) return FIXCOL.self;
    if (!(seat in rivalKeys)) rivalKeys[seat] = "r" + (Object.keys(rivalKeys).length % 5);
    return FIXCOL[rivalKeys[seat]];
  }
  // A stable RIG index per captain, you are your SILHOUETTE as much as your colour.
  function seatRig(seat) {
    const s = selfT();
    if (s && seat === s.name) return 0;             // the flagship sloop is yours
    seatColor(seat);                                // ensure a rival slot exists
    const k = rivalKeys[seat];
    return k ? (parseInt(k.slice(1), 10) + 1) % 6 : 0;
  }
  // The rig (sail plan) for a kind 0..5, drawn around a shared hull. `dead` heels
  // the hull; `ghost` hollows it (terminated in the Reaches); `burst` furls + smokes.
  // ONE boat for every captain (the square-rigger reads best); the
  // CAPTAIN'S COLOUR is the hull, a bold band on the sail and the masthead pennant.
  function rigSVG(kind, col, { ghost = false, burst = false, plate = false } = {}) {
    // on an ink plate the rigging is drawn in light ink, or the mast would vanish
    const dk = plate ? "rgba(248,240,218,.92)" : "rgba(20,12,4,.85)";
    const hull = ghost
      ? `<path d="M -9 3 Q 0 9 9 3 L 7 8 Q 0 11 -7 8 Z" fill="none" stroke="${col}" stroke-width="1.2" stroke-dasharray="2.5 2"/>`
      : `<path d="M -9 3 Q 0 9 9 3 L 7 8 Q 0 11 -7 8 Z" fill="${col}" stroke="${dk}" stroke-width="1.1"/>
         <path d="M -6 4.4 Q 0 6.8 6 4.4" fill="none" stroke="#f2e8cd" stroke-width=".8" opacity=".7"/>`;
    if (burst)   // boiler burst, furled sail, rising smoke
      return hull + `<path d="M 0 3 V -9" stroke="${dk}" stroke-width="1.4"/>
        <path d="M 0 -9 q 3 3.5 0 7" fill="none" stroke="${dk}" stroke-width="1.7"/>
        <path class="sea-smoke" d="M 1.5 -11 q 3.5 -3.5 1 -7 q -2.5 -2.5 1.5 -6" fill="none" stroke="#5a5f6a" stroke-width="1.5"/>`;
    const sailFill = ghost ? "none" : "#f2e8cd";
    const sailStroke = ghost ? col : "rgba(20,12,4,.7)";
    const dash = ghost ? ' stroke-dasharray="2.5 2"' : "";
    return hull
      + `<path d="M 0 4.6 V -15.5" stroke="${dk}" stroke-width="1.6"/>`
      + `<path d="M -7.6 -11.6 H 7.6" stroke="${dk}" stroke-width="1.3"/>`
      + `<path d="M -7.2 -11.6 Q 0 -8.8 7.2 -11.6 L 5.8 2.6 Q 0 4.9 -5.8 2.6 Z" fill="${sailFill}" stroke="${sailStroke}" stroke-width=".9"${dash}/>`
      + (ghost ? "" : `<path d="M -6 -4.4 Q 0 -2 6 -4.4" fill="none" stroke="${col}" stroke-width="2"/>`)
      + `<path d="M 0 -15.5 l 7.5 2.4 l -7.5 2.4 Z" fill="${col}" stroke="${dk}" stroke-width=".5"/>`;
  }
  // A faithful split of a total across n three-sided dice (each 1..3). The server
  // never sends the individual rolls, but any split summing to the moved distance
  // is a true picture of 'Nd3 that summed to this'.
  function d3Split(total, n) {
    const out = new Array(n).fill(1);
    let rem = Math.max(0, Math.min(3 * n, total | 0) - n);
    for (let i = 0; i < n && rem > 0; i++) { const add = Math.min(2, rem); out[i] += add; rem -= add; }
    return out;
  }
  const PIPS = { 1: [[0, 0]], 2: [[-1.4, -1.4], [1.4, 1.4]], 3: [[-1.6, -1.6], [0, 0], [1.6, 1.6]] };
  function d3Token(v, tx, ty) {
    const dots = (PIPS[v] || PIPS[1]).map(([dx, dy]) =>
      `<circle cx="${(tx + dx).toFixed(1)}" cy="${(ty + dy).toFixed(1)}" r=".85" fill="#3a2c16"/>`).join("");
    return `<rect x="${tx - 4}" y="${ty - 4}" width="8" height="8" rx="1.6" fill="#f2e8cd" stroke="#3a2c16" stroke-width=".8"/>${dots}`;
  }
  function centuryOf(seat) {
    const t = app.view.travelers.find(x => x.name === seat);
    return t ? t.century : null;
  }
  function onEvent(msg) {
    const k = msg.event || msg.kind || msg.type, p = msg.payload || {};
    if (k === "traveled" && p.from >= 0 && p.to >= 0) {
      const tr = { seat: p.seat, from: Math.max(1, p.from), to: Math.max(1, p.to), hour: hourNow() };
      R.trails.push(tr);
      const st = selfT();
      if (st && p.seat === st.name && R.preplot === `${tr.from}:${tr.to}`) {
        R.presented.add(trailKey(tr));   // the click already inked this voyage
        R.preplot = null;
      } else {
        R.fx.push({ t: "trail", ...tr });
      }
      if (st && p.seat === st.name) R.pendingSelf = tr.to;   // server truth wins, corrects an over-plotted (clamped) landfall
    }
    if (k === "paradox_resolved")
      for (const h of (p.hits || [])) {
        const c = centuryOf(h.seat);
        if (!c) continue;
        let mo = R.monsters.find(m => m.c === c);
        if (!mo) {
          mo = { c, dmg: 0, count: 0, hour: hourNow(),
            spot: seaSpot(POS[c][0] + islR(c) + 18, POS[c][1] - islR(c) * .6 - 16, META[c].id, R.taken) };
          R.monsters.push(mo);
        }
        mo.dmg += h.damage || 1; mo.count++; mo.hour = hourNow();
        R.fx.push({ t: "monster", c, d: h.damage || 1, seat: h.seat });
      }
    if (k === "exploded") {
      const c = centuryOf(p.seat);
      if (c) { R.storms.push({ c, hour: hourNow() }); R.fx.push({ t: "flash", c }); }
    }
    if (k === "terminated") {
      const c = centuryOf(p.seat);
      if (c) { R.wrecks.push({ seat: p.seat, c, hour: hourNow(),
        spot: seaSpot(POS[c][0] - islR(c) - 18, POS[c][1] + islR(c) * .6 + 16, META[c].id, R.taken) });
        R.fx.push({ t: "wreck", c }); }
    }
    if (k === "respawned") R.fx.push({ t: "respawn", seat: p.seat });
    if (k === "milestone") R.fx.push({ t: "sail", seat: p.seat, c: p.century });
    if (k === "delivered") {
      R.restored.add(p.century);
      R.deliveries.push({ seat: p.seat, card: p.card, century: p.century, hour: hourNow() });
      R.fx.push({ t: "restore", c: p.century });
    }
    if (k === "merchant_moved") {
      R.merchantLast = p;
      if (p.from != null && p.to != null && p.from !== p.to) {
        R.merchantHist.push({ from: p.from, to: p.to, hour: hourNow() });
        if (R.merchantHist.length > 6) R.merchantHist.shift();
      }
      R.fx.push({ t: "ship", p });
      if (__live() && !p.teleport) window.__pdxTripPending = true;   // the queue waits for the voyage
    }
    scheduleLive();
  }

  /* ═══ ISLANDS THAT ARE ISLANDS ═══ */
  function coastPath(c, R0, squish) {
    const n = 12, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const rr = R0 * (0.68 + 0.42 * rnd(c * 7 + 1, i));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * squish]);
    }
    let d = "";
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += (i === 0 ? `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ` : "")
        + `C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
    }
    return d + "Z";
  }
  function islandG(c) {
    const [x, y] = POS[c], m = META[c];
    const eras = ERAS_OF(c), dual = eras.length === 2;
    const R0 = islR(c);
    const rot = (rnd(c, 9) - .5) * 30;
    const coast = coastPath(c, R0, 0.74);
    const high = coastPath(c + 60, R0 * .5, 0.7);
    const sand = "#e9dcb8";

    // the century's number lives ON its island, no floating labels to collide
    const fs = PHONE() ? (rom(c).length <= 2 ? 22 : rom(c).length <= 4 ? 19 : 16.5) : rom(c).length <= 2 ? 18 : rom(c).length <= 4 ? 14 : 11.5;
    return `<g class="sea-isle${c <= 9 ? " od" : ""}" data-c="${c}">
      <g transform="translate(${x} ${y}) rotate(${rot})">
        <path d="${coast}" fill="${sand}" stroke="${m.ink}" stroke-width="2"/>
        <path d="${high}" fill="${ACCENT[META[c].id] || m.accent}" opacity=".18"/>
      </g>
      <circle class="sea-hit" data-c="${c}" cx="${x}" cy="${y}" r="${PHONE() ? 40 : R0 + 10}" fill="transparent"/>
      <text x="${x}" y="${y + fs * .36}" text-anchor="middle" font-family="${m.font}" font-weight="bold"
        font-size="${fs}" letter-spacing=".5" fill="${m.ink}"
        stroke="${sand}" stroke-width="3.5" paint-order="stroke" class="sea-num" data-c="${c}">${rom(c)}</text>
    </g>`;
  }

  /* ═══ SHEETS, SEAMS, FURNITURE ═══ */
  function zig(x0, y0, x1, y1, amp, n) {
    let d = `L ${x0} ${y0} `;
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const j = (i * 2654435761 % 97) / 97 - 0.5;
      d += `L ${x.toFixed(1)} ${(y + j * amp).toFixed(1)} `;
    }
    return d;
  }
  function holePath(T) {
    const { x, y, w, h } = T;
    return `M ${x + 8} ${y} L ${x + w * .4} ${y + 6} L ${x + w * .7} ${y - 2} L ${x + w} ${y + 10}
      L ${x + w - 6} ${y + h * .5} L ${x + w} ${y + h - 8} L ${x + w * .6} ${y + h} L ${x + w * .3} ${y + h - 6}
      L ${x} ${y + h - 2} L ${x + 6} ${y + h * .4} Z`;
  }
  function bandClip(i) {
    const m = BANDS[i];
    const G = 0;    // the six seas meet at the seam, the boundary is foam, not paper
    const tear = TEARS.find(t => t.band === i && t.r);
    const tT = x => m.top(x) + G, tB = x => m.bottom(x) - G;
    let d;
    if (i === 0) d = `M 0 0 L ${W} 0 L ${W} ${tB(W)} ` + zig(W, tB(W), 0, tB(0), m.amp, 24) + "Z";
    else if (i === BANDS.length - 1) d = `M 0 ${tT(0)} ` + zig(0, tT(0), W, tT(W), m.amp, 22) + ` L ${W} ${H} L 0 ${H} Z`;
    else d = `M 0 ${tT(0)} ` + zig(0, tT(0), W, tT(W), m.amp, 22) + ` L ${W} ${tB(W)} ` + zig(W, tB(W), 0, tB(0), m.amp, 24) + "Z";
    return { main: d, hole: tear ? holePath(tear.r) : null };
  }
  let SHARKS = "";
  // THE PARCHMENT TOOTH, BAKED ONCE. seaRough was a LIVE feTurbulence wrapped around the
  // entire 832x1000 chart, and a live SVG filter is re-evaluated on every repaint of what
  // it wraps. The sixteen sharks animate offset-distance (a PAINT property), so the chart
  // repainted every frame and the filter chain ran with it, 60x a second, over 832,000
  // pixels. Measured in Firefox on my RTX at 165Hz: the Sea ran at 27 fps; frozen
  // solid it still only reached 55; frozen with the filters off, 164. ONE filter, 109 fps.
  // The texture never changes, so it is an IMAGE the browser rasterises once and caches.
  const ROUGH_TEX = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0"/></filter>' +
    '<rect width="100%" height="100%" filter="url(#n)"/></svg>');
  function sharkBody(scale) {
    return `<g transform="scale(${scale})">
      <path d="M -8 0 Q -5 -3 2 -2.6 Q 7 -1.3 9.5 0 Q 7 1.3 2 2.6 Q -5 3 -8 0 Z" fill="#2c3a46" stroke="#141f28" stroke-width=".9"/>
      <path d="M -8 0 l -4.5 -3.2 l 1.6 3.2 l -1.6 3.2 z" fill="#2c3a46" stroke="#141f28" stroke-width=".8"/>
      <path d="M 0 -2.4 l -2.4 -4.2 l 4.6 1.8 z" fill="#24303c" stroke="#141f28" stroke-width=".7"/>
      <circle cx="6.8" cy="-.9" r=".55" fill="#0c1418"/>
    </g>`;
  }
  function finG(scale) {
    return `<g class="flip"><g transform="scale(${scale})">
      <path d="M 3.4 0 Q 2.6 -5.6 -1.2 -7.9 Q -.6 -3.4 -5.4 0 Z" fill="#2c3a46" stroke="#141f28" stroke-width=".8"/>
      <path d="M -12 1 q 5 1.8 16 1.2 M -9 3 q 4 1.2 10 .9" stroke="#eaf4f6" stroke-width=".9" fill="none" opacity=".5"/>
    </g></g>`;
  }
  function sharkWaters(m) {
    // the school IS the overdrive: each shark patrols its own stretch of open water,
    // placed with clearance from every island, seam, panel, sign and the Skull Mount
    const zone = m.islands.filter(c => c <= 9);
    if (!zone.length) return "";
    const pts2 = zone.map(c => POS[c]);
    if (POS[5]) pts2.push(POS[5]);
    const cx = pts2.reduce((t, q) => t + q[0], 0) / pts2.length;
    const cy = pts2.reduce((t, q) => t + q[1], 0) / pts2.length;
    const rx = Math.max(...pts2.map(q => Math.abs(q[0] - cx))) + 70;
    const ry = Math.max(...pts2.map(q => Math.abs(q[1] - cy))) + 48;
    const want = m.id === "hma" ? 9 : 7;
    const spots = [];
    const okSpot = (px, py, hw) => {
      if (px - hw < 24 || px + hw > W - 24 || py < 30 || py > H - 22) return false;
      for (let c2 = 1; c2 <= 30; c2++) if (POS[c2] && Math.hypot(px - POS[c2][0], py - POS[c2][1]) < islR(c2) + hw + 11) return false;
      if (ANCH.well && Math.hypot(px - ANCH.well[0], py - ANCH.well[1]) < hw + 40) return false;
      for (const f of SEAMS) if (Math.abs(py - f(px)) < 19) return false;
      for (const o of (ANCH.obst || [])) if (o.kind !== "soft" && px + hw > o.x - 10 && px - hw < o.x + o.w + 10 && py > o.y - 13 && py < o.y + o.h + 13) return false;
      for (const sp of spots) if (Math.hypot(px - sp[0], py - sp[1]) < 42) return false;
      return true;
    };
    let tries = 0;
    while (spots.length < want && tries < 900) {
      const i = tries++;
      const px = cx - rx + ((i * 53.7 + (m.id === "hma" ? 17 : 211)) % (2 * rx)) + (rnd(i, 2) - .5) * 22;
      const py = cy - ry + ((i * 37.3 + 29) % (2 * ry)) + (rnd(i, 3) - .5) * 16;
      const hw = 15 + rnd(i, 6) * 11;
      if (okSpot(px, py, hw + 6)) spots.push([px, py, hw]);
    }
    spots.forEach(([px, py, hw], i) => {
      const r = Math.min(hw, 13 + rnd(i, 21) * 8), cw = i % 2 === 0, sw = cw ? 1 : 0;
      const T = (9 + rnd(i, 33) * 6).toFixed(1), D = (-rnd(i, 47) * 9).toFixed(1);
      // THE SHARKS SWAM ON A PAINT PROPERTY. offset-distance is not compositable: every
      // frame, all sixteen of them forced a repaint of the whole 832x1000 chart, and the
      // chart was wearing a live feTurbulence, so the filter chain ran with it. Together
      // they took the Paradox Sea to 27 fps on an RTX 5050 (Firefox, 165Hz panel).
      // But `offset-rotate: 0deg` means the shark never actually TURNED along the path,
      // it only travelled it, and a separate scaleX flip makes it face its heading. So
      // the path is pure translation around an ellipse, and pure translation is exactly
      // what `transform` does, for free, on the compositor, with no repaint at all.
      // Outer <g> carries the CENTRE as an SVG attribute; the inner <g> orbits in CSS.
      // (Never both on one node: a CSS transform OVERRIDES the SVG transform attribute.)
      SHARKS += `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)})"><g class="sea-shark ${cw ? "cw": "ccw"}" data-tip="shark waters, every league here costs 2 energy"
        style="--r: ${r.toFixed(1)}; --ry: ${(r * .72).toFixed(1)}; animation-duration: ${T}s; animation-delay: ${D}s; --t2: ${T}s">${finG(.95 + rnd(i, 51) * .35)}</g></g>`;
    });
    if (m.id === "hma") {
      const sx2 = cx, sy2 = cy - ry + 16;
      SHARKS += `<g class="sea-sign pdx-ref" data-tip="DANGER: shark waters (centuries I-IX): every league costs 2 energy" transform="translate(${sx2.toFixed(0)} ${sy2.toFixed(0)}) rotate(-3)">
        <path d="M -4 16 q 4 2 8 0 M -6 19 q 6 3 12 0" stroke="#eaf4f6" stroke-width="1" fill="none" opacity=".5"/>
        <rect x="-1.4" y="-6" width="2.8" height="22" fill="#6a4a26" stroke="#241708" stroke-width=".9"/>
        <rect x="-24" y="-20" width="48" height="15" rx="2" fill="#c9a45c" stroke="#241708" stroke-width="1.1"/>
        <path d="M -19 -8.5 Q -18 -15 -13.5 -16.5 Q -14.5 -12 -12 -8.5 Z" fill="#2c3a46"/>
        <text x="4" y="-9.5" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="7.5" letter-spacing=".5" fill="#4a2f10">2 ENERGY</text>
      </g>`;
    }
    return "";
  }
  function eraTabs() {
    let g = "";
    BANDS.forEach((m, i) => {
      const { spot: [x, y], label, hw } = ANCH.tab[m.id];
      const tilt = ((rnd(i, 5) - .5) * 2.4).toFixed(1);
      g += `<g class="sea-tab" data-band="${m.id}"><g transform="translate(${x} ${y}) rotate(${tilt})">
        <rect x="${-hw - 8}" y="-11" width="${hw * 2 + 16}" height="22" fill="${m.paper[0]}" stroke="${m.ink}" stroke-width="1.2" opacity=".96"/>
        <rect x="${-hw - 5}" y="-8" width="${hw * 2 + 10}" height="16" fill="none" stroke="${m.ink}" stroke-width=".5" opacity=".5"/>
        <text y="${PHONE() ? 5 : 4}" text-anchor="middle" font-family="${m.font}" font-weight="bold" font-size="${PHONE() ? 14 : 11}" letter-spacing="${PHONE() ? .6 : 1.2}" fill="${m.ink}">${label}</text></g></g>`;
    });
    return g;
  }
  function surveyRoute() {
    // the faint survey scrawl, trimmed at every coastline so it never crosses land
    const pts = [];
    for (let c = 30; c >= 1; c--) pts.push([POS[c][0], POS[c][1], islR(c)]);
    pts.push([ANCH.well[0], ANCH.well[1], 26]);
    let d = "", chev = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1, r1] = pts[i], [x2, y2, r2] = pts[i + 1];
      const L = Math.hypot(x2 - x1, y2 - y1) || 1;
      // cap each end's trim at 40% of the run so consecutive islands ALWAYS connect
      const t1 = Math.min(r1 + 2, L * 0.4) / L, t2 = 1 - Math.min(r2 + 2, L * 0.4) / L;
      if (t2 <= t1) continue;
      d += `M ${(x1 + (x2 - x1) * t1).toFixed(1)} ${(y1 + (y2 - y1) * t1).toFixed(1)} L ${(x1 + (x2 - x1) * t2).toFixed(1)} ${(y1 + (y2 - y1) * t2).toFixed(1)} `;
      if (L > 60) { const mx3 = (x1 + x2) / 2, my3 = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        chev += `<path d="M -4.2 -3.8 L 4.2 0 L -4.2 3.8" fill="none" stroke="#2a2018" stroke-width="1.8"
          transform="translate(${mx3.toFixed(1)} ${my3.toFixed(1)}) rotate(${ang.toFixed(1)})" opacity=".55"/>`; }
    }
    return `<path d="${d}" fill="none" stroke="#f6eeda" stroke-width="5.5" opacity=".5" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#2a2018" stroke-width="2.2"
      stroke-dasharray="7 5" opacity=".55" stroke-linecap="round"/>` + chev;
  }
  function legendPanel() {
    const [kx, ky] = ANCH.key;
    const row = (i, glyph, label) =>
      `<g transform="translate(9 ${34 + i * 21})">${glyph}
        <text x="26" y="4" font-family="Georgia" font-style="italic" font-size="8" fill="#3a2c16">${label}</text></g>`;
    let keyOpen = true;
    try { keyOpen = localStorage.getItem("seaKeyOpen") !== "0"; } catch (e) {}
    return `<g class="sea-key pdx-ref${keyOpen ? "" : " folded"}" transform="translate(${kx} ${ky}) rotate(-1.2)${PHONE() ? " scale(1.1)" : ""}">
      <g class="sea-key-body">
      <rect width="160" height="286" fill="#ead9b0" stroke="#5a4526" stroke-width="1.6" rx="2"/>
      <rect x="4" y="4" width="152" height="278" fill="none" stroke="#5a4526" stroke-width=".5" opacity=".6"/>
      <text x="80" y="24" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="11" letter-spacing="2" fill="#3a2c16">CHART KEY</text>
      ${row(0, `<g transform="translate(7 -1) scale(.4)">${rigSVG(0, "#1d6b52", {})}</g>`, "a traveler's boat")}
      ${row(1, `<line x1="0" y1="0" x2="18" y2="0" stroke="#1d6b52" stroke-width="2.4"/>`, "a voyage (fades with hours)")}
      ${row(2, `<path d="M 0 1 a 6 3 0 0 1 12 0" fill="none" stroke="#7a2a1a" stroke-width="1.4" stroke-dasharray="2.5 2.5"/>`, "troubled water, a paradox")}
      ${row(3, `<path d="M 2 2 q -3 -5 3 -6 q 1 -4 6 -3 q 5 -3 8 1 q 5 0 4 5 z" fill="#5a5f6a"/>`, "a storm = gathering booms")}
      ${row(4, `<path d="M 0 4 q 6 4 12 0 l -2 3 q -4 2 -8 0 z M 5 3 V -4 l 4 2 -4 2" fill="#4a3a1c"/>`, "a wreck = a termination")}
      ${row(5, `<path d="M 0 4 Q 8 8 16 4 L 14.5 7 Q 8 10 1.5 7 Z" fill="#4a3620"/><path d="M 1.5 0 Q 8 -3 14.5 0 L 14.5 2 Q 8 -1 1.5 2 Z" fill="#8c3b2a"/><path d="M 8 -1 V -7 M 8 -7 L 13 -5.5 L 8 -4 Z" stroke="#241708" stroke-width=".8" fill="#c9a45c"/>`, "the Merchant (sails=speed)")}
      ${row(6, `<path d="M 2 6 V -6 L 11 -3 L 2 0" fill="#a04a2a"/>`, "you deliver at this century")}
      ${row(7, `<ellipse cx="9" cy="0" rx="9" ry="6" fill="none" stroke="#b8862a" stroke-width="2"/>`, "restored, a delivery landed")}
      ${row(8, `<path d="M 6 6 L 7 -2 H 11 L 12 6 Z M 5 -2 L 0 -5 M 12 -2 L 17 -5" stroke="#5a4526" stroke-width="1" fill="#c9a45c"/>`, "milestone light (X · XX)")}
      ${row(9, `<path d="M 3 4 Q 1 -3 6 -5 Q 9 -7 13 -5 Q 17 -3 15 4 Q 12 6 6 6 Z" fill="#5c566e" stroke="#2a2438" stroke-width=".8"/><ellipse cx="7" cy="-1" rx="1.6" ry="2" fill="#171226"/><ellipse cx="12" cy="-1" rx="1.6" ry="2" fill="#171226"/><path d="M 6 4 l 1.4 -2 l 1.4 2 M 10 4 l 1.4 -2 l 1.4 2" fill="#171226"/>`, "the Skull Mount, Year Zero")}
      ${row(10, `<path d="M 4 4 Q 5 -2 9 -3.5 Q 8.2 0 10.5 4 Z M 12 3 Q 12.7 -1 15.5 -2 Q 15 .6 16.8 3 Z" fill="#2c3a46"/><path d="M 1 5.5 q 4 1.6 9 1 M 11 5.5 q 3.5 1.2 7 .6" stroke="#7a94a0" stroke-width=".8" fill="none"/>`, "shark waters, costs 2 energy")}
      <text x="80" y="280" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="7.5" fill="#6a5232">- in the traveler's own hand -</text>
      </g>
      <g class="sea-key-pin">
        <circle cx="80" cy="9" r="6" fill="#8c2a1a" stroke="#4a1608" stroke-width="1.2"/>
        <circle cx="78.4" cy="7.4" r="2" fill="#c05a4a"/>
        <text class="sea-key-tag" x="80" y="27" text-anchor="middle" font-family="Georgia" font-weight="bold"
          font-size="9" letter-spacing="1.5" fill="#3a2c16" stroke="#ead9b0" stroke-width="3" paint-order="stroke">KEY</text>
      </g>
    </g>`;
  }
  function furniture() {
    // (a phone draws no cartouche and no compass: fewer ornaments, the lights and the key stay)
    let g = PHONE() ? "" : `<g class="sea-cart" transform="translate(24 18)">
      <rect width="258" height="56" fill="#d9cba4" stroke="#3a2c16" stroke-width="1.4" opacity=".95"/>
      <rect x="4" y="4" width="250" height="48" fill="none" stroke="#3a2c16" stroke-width=".5"/>
      <text x="129" y="20" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="14" letter-spacing="3" fill="#3a2c16">THE PARADOX SEA</text>
      <text x="129" y="33" text-anchor="middle" font-family="'Courier New',monospace" font-size="7" letter-spacing=".8" fill="#3a2c16">C.R.O.N.O.S. SURVEY · THE SIX SEAS OF TIME</text>
      <text x="129" y="46" text-anchor="middle" font-family="'Courier New',monospace" font-size="7.5" letter-spacing="1" fill="#8c2a1a" class="sea-hour">TUESDAY 31 DEC 2999 · HOUR -</text></g>`;
    const cp = ANCH.compass;
    if (!PHONE()) g += `<g transform="translate(${cp[0]} ${cp[1]})" stroke="#3a3458" fill="none" opacity=".9" class="sea-compass">
      <circle r="26" stroke-width="1"/><circle r="18" stroke-width=".5" opacity=".7"/>
      <path d="M0 -24 L4.5 -5 L0 0 L-4.5 -5 Z" fill="#8c2a1a" stroke="none"/>
      <path d="M0 24 L4.5 5 L0 0 L-4.5 5 Z M-24 0 L-5 -4.5 L0 0 L-5 4.5 Z M24 0 L5 -4.5 L0 0 L5 4.5 Z" fill="#3a3458" stroke="none" opacity=".6"/>
      <text class="pdx-ref" y="-31" text-anchor="middle" font-size="9" fill="#3a3458" stroke="none" font-family="Georgia" font-style="italic">future</text>
      <text class="pdx-ref" y="38" text-anchor="middle" font-size="9" fill="#3a3458" stroke="none" font-family="Georgia" font-style="italic">past</text></g>`;
    for (const c of [10, 20]) {
      const [lx2, ly2] = ANCH.light[c];
      const ink = META[c].ink;
      g += `<g transform="translate(${lx2} ${ly2})" class="sea-light" data-c="${c}">
        <circle cx="7.5" cy="5.4" r="17" fill="url(#seaLightGlow)" class="sea-beam"/>
        <path d="M3.6 5.4 L-16 -1 L-16 10 Z" fill="#ffe9b0" opacity=".3" class="sea-beam"/>
        <path d="M11.4 5.4 L31 -1 L31 10 Z" fill="#ffe9b0" opacity=".3" class="sea-beam"/>
        <path d="M4 20 L5.2 7 L9.8 7 L11 20 Z" fill="#8a6a3a" stroke="${ink}" stroke-width=".9"/>
        <rect x="4.6" y="3.4" width="5.8" height="4" rx="1" fill="#c9a45c" stroke="${ink}" stroke-width=".9"/>
        <path d="M3.6 5.4 L-13 .4 M11.4 5.4 L28 .4" stroke="#e8c05a" stroke-width="1.4" opacity=".95" class="sea-beam"/>
        <circle cx="7.5" cy="5.4" r="1.8" fill="#fff4cc"/>
        <g class="sea-pips" data-c="${c}"></g></g>`;
    }
    g += legendPanel();
    return g;
  }
  function waveRows(ink) {
    // engraved chart waves in this sea's own ink, two layers, gently adrift
    const row = (y, ph, op) => { let d = `M ${-96 + ph} ${y} `; for (let x = -96 + ph; x < W + 96; x += 48) d += `q 12 -8 24 0 q 12 8 24 0 `; return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1" opacity="${op}"/>`; };
    let l1 = "", l2 = "";
    for (let y = 8; y < H + 12; y += 14) { const k = (y / 14) | 0; if (k % 2 === 0) l1 += row(y, (k * 17) % 48, .16); else l2 += row(y, (k * 29) % 48, .11); }
    let curls = "";
    for (let i = 0; i < 26; i++) { const x = (i * 173 + 40) % W, y = 16 + ((i * 107) % (H - 30));
      curls += `<path d="M ${x} ${y} q 7 -7 14 -2 q -6 0 -8 4" fill="none" stroke="#f4f8f6" stroke-width="1" opacity=".22"/>`; }
    return `<g class="sea-waves w1">${l1}</g><g class="sea-waves w2">${l2}${curls}</g>`;
  }
  function foamSeams() {
    // where two seas of time meet, the currents raise a line of foam
    let g = "";
    SEAMS.forEach((f, i) => {
      const amp = BANDS[i].amp;
      g += `<path d="M 0 ${f(0) + 2} ${zig(0, f(0) + 2, W, f(W) + 2, amp, 24)}" fill="none" stroke="rgba(26,66,84,.28)" stroke-width="5"/>
        <path d="M 0 ${f(0)} ${zig(0, f(0), W, f(W), amp, 24)}" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="2" class="sea-foamline"/>`;
      for (let x = 40 + i * 25; x < W - 20; x += 96)
        g += `<path d="M ${x} ${(f(x) - 3).toFixed(1)} q 6 -6 12 -1 q -5 0 -7 3.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.1"/>`;
    });
    return g;
  }
  // THE SEA RUNS ON: past the chart's right edge the six seas keep their bands, seams and
  // foam; below it the Antiquity sea keeps going. Open water only: no island, no route,
  // no shark, nothing that could be read as a place to sail to.
  function seaExtArt(EX, EY) {
    const X1 = W + EX, Y1 = H + EY, L = BANDS.length;
    // the sea starts 96 units INSIDE the chart's right and bottom edges, under the band
    // where the chart fades into it (app.css), so that band shows water, never a gap
    const XS = W - 96, YS = H - 96;
    const n = Math.max(2, Math.round(24 * EX / W));
    const seamPts = SEAMS.map((f, i) => {   // one jagged line per seam, shared by both bands
      const pts = [[XS, f(XS)], [W - 48, f(W - 48)]];
      for (let j = 0; j <= n; j++) { const x = W + EX * j / n, jj = j === 0 ? 0 : ((j * 2654435761 % 97) / 97 - 0.5);
        pts.push([x, f(x) + jj * BANDS[i].amp]); }
      return pts;
    });
    const line = pts => pts.map(q => `L ${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
    let defs = "", g = `<rect x="0" y="0" width="${X1}" height="${Y1}" fill="#587f8f"/>`;
    for (let i = 0; i < L; i++) {
      const m = BANDS[i];
      const top = i === 0 ? `M ${XS} 0 L ${X1} 0` : `M ${seamPts[i - 1][0].map(v => v.toFixed(1)).join(" ")} ${line(seamPts[i - 1].slice(1))}`;
      const bot = i === L - 1 ? `L ${X1} ${Y1} L 0 ${Y1} L 0 ${YS} L ${XS} ${YS}`
                              : line(seamPts[i].slice().reverse());
      const d = `${top} ${bot} Z`, cid = "seaxc" + m.id;
      defs += `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
      const y0 = i === 0 ? 0 : Math.min(...seamPts[i - 1].map(q => q[1])) - 16;
      const y1 = i === L - 1 ? Y1 : Math.max(...seamPts[i].map(q => q[1])) + 16;
      // the chart's own wave rows, on its 48px grid and phase, in its two drifting layers
      // (waveRows): where the chart fades into this sheet the waves are the same waves
      let l1 = "", l2 = "";
      for (let y = Math.floor(y0 / 14) * 14 + 8; y < y1; y += 14) {
        const kk = (y / 14) | 0, ph = (kk * (kk % 2 ? 29 : 17)) % 48;
        const x0 = -96 + ph + (i === L - 1 ? 0 : 48 * Math.max(0, Math.floor(XS / 48) - 2));
        let pd = `M ${x0} ${y} `; for (let x = x0; x < X1 + 96; x += 48) pd += "q 12 -8 24 0 q 12 8 24 0 ";
        const row = `<path d="${pd}" fill="none" stroke="${m.ink}" stroke-width="1" opacity="${kk % 2 ? .11 : .16}"/>`;
        if (kk % 2) l2 += row; else l1 += row;
      }
      for (let c = 0; c < 10; c++) { const cx = W + 30 + rnd(c + i * 13, 7) * (EX - 60), cy = y0 + 20 + rnd(c + i * 13, 9) * Math.max(10, y1 - y0 - 40);
        l2 += `<path d="M ${cx.toFixed(0)} ${cy.toFixed(0)} q 7 -7 14 -2 q -6 0 -8 4" fill="none" stroke="#f4f8f6" stroke-width="1" opacity=".22"/>`; }
      if (i === L - 1) for (let c = 0; c < 18; c++) { const cx = 30 + rnd(c, 21) * (W - 60), cy = H + 20 + rnd(c, 23) * (EY - 40);
        l2 += `<path d="M ${cx.toFixed(0)} ${cy.toFixed(0)} q 7 -7 14 -2 q -6 0 -8 4" fill="none" stroke="#f4f8f6" stroke-width="1" opacity=".22"/>`; }
      g += `<g clip-path="url(#${cid})"><rect x="0" y="0" width="${X1}" height="${Y1}" fill="${m.paper[0]}"/>`
        + `<rect x="0" y="0" width="${X1}" height="${Y1}" fill="${m.paper[1]}"/>`
        + `<g class="sea-waves w1">${l1}</g><g class="sea-waves w2">${l2}</g></g>`;
    }
    SEAMS.forEach((f, i) => {
      g += `<path d="M ${XS} ${(f(XS) + 2).toFixed(1)} ${line(seamPts[i].map(q => [q[0], q[1] + 2]))}" fill="none" stroke="rgba(26,66,84,.28)" stroke-width="5"/>`
        + `<path d="M ${XS} ${f(XS).toFixed(1)} ${line(seamPts[i])}" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="2"/>`;
    });
    // the parchment tooth at the chart's own grain: its texture tiled at the chart's size
    defs += `<pattern id="seaxRough" patternUnits="userSpaceOnUse" width="${W}" height="${H}">`
      + `<image href="${ROUGH_TEX}" width="${W}" height="${H}" preserveAspectRatio="none"/></pattern>`;
    g += `<rect x="0" y="0" width="${X1}" height="${Y1}" fill="url(#seaxRough)" opacity=".55"/>`;
    return `<defs>${defs}</defs>${g}`;
  }
  function baseMap() {
    layout();
    computeAnchors();
    TEARS = [];   // sheet-holes read as render BUGS in open water, the torn seams alone sell the puzzle
    const violations = audit();
    window.__seaAudit = () => violations;
    window.__seaProbe = c => ({ pos: POS[c], hits: ANCH.obst.filter(o => {
      const px = o.kind === "panel" ? 34 : 12, py = o.kind === "panel" ? 30 : 12;
      return o.kind !== "soft" && POS[c][0] > o.x - px && POS[c][0] < o.x + o.w + px
        && POS[c][1] > o.y - py && POS[c][1] < o.y + o.h + py; }) });
    window.__seaDebug = () => ({ W, xxv: POS[25], lbl: LBL[25],
      obst: ANCH.obst.filter(o => o.kind !== "soft" && POS[25][0] > o.x - 46 && POS[25][0] < o.x + o.w + 46
        && POS[25][1] > o.y - 46 && POS[25][1] < o.y + o.h + 46),
      compass: ANCH.compass, tab: ANCH.tab });
    let defs = `<linearGradient id="seaDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb5bd"/><stop offset=".5" stop-color="#6d9aa6"/><stop offset="1" stop-color="#587f8f"/></linearGradient>
      <radialGradient id="seaLightGlow"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>
      <radialGradient id="seaCoveGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".8"/><stop offset="1" stop-color="#6a4a8a" stop-opacity=".15"/></radialGradient>
      <radialGradient id="seaOD"><stop offset="0" stop-color="rgba(160,58,26,.42)"/><stop offset=".55" stop-color="rgba(160,58,26,.18)"/><stop offset="1" stop-color="rgba(160,58,26,0)"/></radialGradient>
      <filter id="seaRough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .05 0" result="na"/>
      <feComposite in="na" in2="SourceGraphic" operator="in" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"/></filter>`;
    SHARKS = "";
    let out = `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#seaDeep)"/>`;
    for (let i = BANDS.length - 1; i >= 0; i--) {   // bottom sheet first, top last
      const m = BANDS[i];
      const clip = bandClip(i);
      const cid = "seaclip" + m.id;
      defs += `<clipPath id="${cid}"><path d="${clip.main} ${clip.hole || ""}" fill-rule="evenodd"/></clipPath>`;
      out += `<g clip-path="url(#${cid})">
        <rect x="0" y="0" width="${W}" height="${H}" fill="${m.paper[0]}"/>
        <rect x="0" y="0" width="${W}" height="${H}" fill="${m.paper[1]}"/>`;
      out += PHONE() ? `<g class="ph-deco">${waveRows(m.ink)}${sharkWaters(m)}</g>` : waveRows(m.ink) + sharkWaters(m);   // a phone: the water steps back a little (app.css .ph-deco)
      for (const c of m.islands) out += islandG(c);
      out += `</g>`;
      if (clip.hole) out += `<path d="${clip.hole}" fill="none" stroke="rgba(20,12,4,.6)" stroke-width="2.2"/>
        <path d="${clip.hole}" fill="none" stroke="rgba(255,246,220,.5)" stroke-width="1" transform="translate(-1.2 -1.5)"/>`;
    }
    out += PHONE() ? `<g class="ph-deco">${SHARKS}${foamSeams()}</g>` : SHARKS + foamSeams();
    out += surveyRoute();
    for (const c of Object.keys(STRAITS)) out += islandG(+c);   // straits sit ON the seams, unclipped
    out += eraTabs();
    out += furniture();
    return { defs, out, violations };
  }

  /* ═══ THE PIECES ON A PHONE (window.__pdxPhonePlace / __pdxPhoneToken) ═══
     A stack stands on its island's north beach, right above the numeral, its string a short
     step to the shore; where the chart's edge or a tag leaves no room there (the top row,
     the Merchant's own port) it hangs under the numeral or beside it. */
  const SEA_TR = (t, n) => (n >= 4 ? (t.is_self ? 17 : 14) : (t.is_self ? 20 : 17));   // a crowd of four or more stands smaller
  // where the Merchant's carrack rides for a century: above its island; on a phone's first
  // row there is no sea above the island for his hull and tag, so he rides beside it, inland
  // (beside: on the side whose neighbouring islands hold no travellers and no voyage tag)
  function seaMerchAt(c) {
    const [x, y] = POS[c];
    if (!(PHONE() && y - 47 - 30 < 8)) return [x, y - 47];
    const v = app && app.view, busy = new Set();
    if (v) for (const t of v.travelers) busy.add(R.shown[t.name] != null ? R.shown[t.name] : t.century);
    if (mode && mode.kind === "travel") for (let k = 1; k <= 30; k++) { const d = Math.abs(k - mode.self); if (d && d <= mode.max) busy.add(k); }
    let best = null, bestS = 1e9;
    for (const sd of [1, -1]) {
      const ax = x + sd * 54; if (ax < 40 || ax > W - 40) continue;
      let sc = sd === (x > W * .8 ? -1 : 1) ? 0 : .5;
      for (let k = 1; k <= 30; k++) if (k !== c && POS[k] && busy.has(k) && Math.abs(POS[k][0] - ax) < 80 && Math.abs(POS[k][1] - y) < 60) sc += 2;
      if (sc < bestS) { bestS = sc; best = [ax, y + 6]; }   // low enough that his tag clears the first sea's tab
    }
    return best || [x, y - 47];
  }
  const seaMerchBox = (c) => { const [ax, ay] = seaMerchAt(c); return [ax - 36, ay - 33, ax + 36, ay + 35]; };   // his hull and his MERCHANT tag
  function seaNumPlate(c) {   // the numeral's box on the island (phone sizes)
    const L = rom(c).length, fs = L <= 2 ? 22 : L <= 4 ? 19 : 16.5, hw = L * fs * .34 + 3, ny = POS[c][1] + fs * .36;
    return [POS[c][0] - hw, ny - fs * .82, POS[c][0] + hw, ny + 3];
  }
  function seaPhoneBerths(byC, view) {
    const nodes = {}, obst = [], groups = [];
    for (let c = 1; c <= 30; c++) if (POS[c]) { nodes[c] = POS[c]; obst.push(seaNumPlate(c)); }
    if (ANCH.well) { nodes[0] = ANCH.well; obst.push([ANCH.well[0] - 30, ANCH.well[1] - 26, ANCH.well[0] + 30, ANCH.well[1] + 46]); }
    const tagBoxes = [];
    if (mode && mode.kind === "travel") for (let c = 1; c <= 30; c++) {   // a voyage's cost tags (costTag)
      const d = Math.abs(c - mode.self); if (d === 0 || d > mode.max || !POS[c]) continue;
      if (mode.locked != null && Math.sign(c - mode.self) !== mode.locked) continue;
      const [ix, ty] = seaCostSpot(c);
      tagBoxes.push([ix - 36, ty - 17, ix + 36, ty + 13]);
    }
    for (const q of tagBoxes) obst.push(q);
    for (const id in ANCH.tab) { const T = ANCH.tab[id]; obst.push([T.spot[0] - T.hw - 6, T.spot[1] - 11, T.spot[0] + T.hw + 6, T.spot[1] + 11]); }
    for (const k in (ANCH.post || {})) { const P = ANCH.post[k]; if (P) obst.push([P[0] - 16, P[1] - 10, P[0] + 16, P[1] + 14]); }
    for (const c of [10, 20]) { const L = ANCH.light && ANCH.light[c]; if (L) obst.push([L[0] - 8, L[1] - 24, L[0] + 8, L[1] + 4, c]); }
    const mc = R.merchantShown != null ? R.merchantShown : view.merchant_century;
    if (POS[mc]) obst.push(seaMerchBox(mc));   // his hull and tag
    // the delivery flags on the beaches: a stack steps aside rather than hide one, if it can
    for (const t of view.travelers) {
      let k2 = 0;
      for (const card of (t.is_self ? (t.hand || []) : (t.equipment || []))) {
        const c = card.delivery_century; if (c == null || !POS[c]) continue;
        const fx = POS[c][0] + (t.is_self ? -4 : 8 + k2 * 8), fy = POS[c][1] - islR(c) * .74 + 3; if (!t.is_self) k2++;
        obst.push([fx - 2, fy - 23, fx + 15, fy + 3, undefined, 6]);
      }
    }
    for (const [cs, ts] of Object.entries(byC)) {
      const c = +cs; if (!POS[c]) continue;
      ts.sort((a, b) => (a.is_self ? 1 : 0) - (b.is_self ? 1 : 0));   // mine is drawn last, in front
      const rM = Math.max(...ts.map(t => SEA_TR(t, ts.length))), pl = seaNumPlate(c), y = POS[c][1], hw = (pl[2] - pl[0]) / 2;
      const up = pl[1] - y - 2 - rM - 6, down = pl[3] - y + 2 + rM + 3, side = hw + rM + 7;
      groups.push({ c, node: POS[c], toks: ts.map(t => ({ r: SEA_TR(t, ts.length), self: t.is_self })),
        spots: [[0, up, -1], [0, down, 1], [-side * .75, up * .8, -1], [side * .75, up * .8, -1], [-side, -4, -1], [side, -4, -1]] });
    }
    const out = window.__pdxPhonePlace({ groups, nodes, obst, box: [12, 8, W - 12, H - 8], below: 6 });
    // what a registry chest steps aside from: the voyage's tags, the tokens, the Merchant
    R.phLive = tagBoxes.concat(window.__pdxPhoneFootprints(groups, out), POS[mc] ? [seaMerchBox(mc)] : []);
    return out;
  }
  /* A REGISTRY CHEST STEPS ASIDE (phone): its post rests on its tear where the islands and
     sea tabs leave room (phoneAnchors); when a voyage's cost tag, a token or the Merchant
     lands on it, it slides along the same tear to the nearest spot clear of them that is
     still clear of the islands and tabs. */
  const POST_SEAM = { Origins: 4, Ascension: 2, Singularity: 0 };
  const postBox = (x, y) => [x - 16, y - 12, x + 43, y + 26];
  function seaPostAt(pname, live) {
    const rest = ANCH.post[pname], si = POST_SEAM[pname];
    const hitL = (q) => live.some(o => q[0] < o[2] + 3 && q[2] > o[0] - 3 && q[1] < o[3] + 3 && q[3] > o[1] - 3);
    if (!PHONE() || !rest || si == null || !hitL(postBox(rest[0], rest[1]))) return rest;
    let best = null, bd = 1e9;
    for (let fx2 = 0.08; fx2 <= 0.92; fx2 += 0.01) {
      const x = Math.round(W * fx2), y = Math.round(SEAMS[si](x));
      if (hitL(postBox(x, y))) continue;
      let dmin = 1e9;
      for (let c = 1; c <= 30; c++) dmin = Math.min(dmin, Math.hypot((x - POS[c][0]) * .8, (y - POS[c][1]) * 1.6) - islR(c));
      for (const id of [BANDS[si].id, BANDS[si + 1].id]) { const t = ANCH.tab[id]; if (t) dmin = Math.min(dmin, Math.abs(x - t.spot[0]) - t.hw - 50); }
      if (dmin < 8) continue;
      const d = Math.abs(x - rest[0]); if (d < bd) { bd = d; best = [x, y]; }
    }
    return best || rest;
  }
  // the string ends on the island just clear of its numeral, on the token's side
  function seaLeashR(c, bx, by) {
    const pl = seaNumPlate(c), [x, y] = POS[c], dx = bx - x, dy = by - y;
    if (Math.abs(dy) >= Math.abs(dx) * .6) return (dy < 0 ? y - pl[1] : pl[3] - y) + 3;
    return (pl[2] - pl[0]) / 2 + 3;
  }
  function seaPhoneStack(c, ts, at, view) {
    const [x, y] = POS[c], chase = view.merchant_plan && view.merchant_plan.target_seat;
    const pcPos = R.pcPos || (R.pcPos = {}), memo = R.pcAt || (R.pcAt = {});
    let g = "";
    ts.forEach((t, i) => {
      const col = seatColor(t.name), [bx, by] = at && at[i] ? at[i] : [x, y - 36];
      const dead = t.is_terminated && t.awaiting_respawn, st = t.statuses || [];
      const ghost = st.includes("terminated") && t.century >= 24, burst = st.includes("exploded");
      const hunted = chase === t.name && view.merchant_century !== t.century;
      const r = SEA_TR(t, ts.length), top = !!(at && at[i] && at[i][2]);
      pcPos[t.name] = [bx, by];
      LIVEOBST.push([bx - r - 3, by - r - 3, bx + r + 3, by + r + 7]);   // a sea tab steps aside from a token too
      const pulse = t.is_self && memo[t.name] != null && memo[t.name] !== c;
      if (t.is_self) memo[t.name] = c;
      const em = window.__pdxEmanata(t, col, R.em || (R.em = {}), -(r + (t.is_self ? 7 : 3) + (top ? 20 : 11)));
      g += `<g class="sea-fixg pc-piece-g pc-ph${t.is_self ? " pc-self" : ""}${ghost ? " sea-ghost": ""}${em.cls}" data-seat="${t.name}" data-tip="${esc(`${t.name}${t.is_self ? " (you)": ""}, ${rom(c)} · ${t.energy} energy · ${t.gold} gold · ${t.booms}/12 booms${t.is_wanted ? " · WANTED": ""}${hunted ? " · the Merchant is chasing you (richest traveller not in his century)": ""}${burst ? " · boiler burst, cannot sail or activate this hour": ""}${ghost ? " · sheltered beyond time, the Reaches spare the terminated": ""}${dead && !ghost ? " · lost at sea (respawning)": ""}`)}" opacity="${dead && !ghost ? .55: 1}">`
        + `<g transform="translate(${bx} ${by})">${window.__pdxPhoneLeash([x - bx, y - by], seaLeashR(c, bx, by), r, col, false)}<g class="sea-fix-boat">`
        + window.__pdxPhoneToken({ col, self: t.is_self, r, dark: false, ship: rigSVG(0, col, { ghost, burst }), fit: [-.7, -2.3, 26.5],
          label: t.is_self ? "YOU" : esc(window.__pdxInitials(t.name)), chased: hunted, pulse, lost: dead && !ghost, top })
        + `</g>${em.g}</g></g>`;
    });
    return g;
  }

  /* ═══ LIVE LAYER ═══ */
  function liveLayer() {
    LIVEOBST = [];
    if (!app || !app.view) return "";
    const view = app.view, self = selfT(), h = view.hour;
    let g = "";
    for (const t of R.trails) {
      if (!R.presented.has(trailKey(t))) continue;    // a voyage appears only when PLAYED
      const age = h - t.hour;
      const col = age >= 3 ? "#8a8578" : seatColor(t.seat);
      const op = age <= 0 ? .95 : age === 1 ? .65 : age === 2 ? .5 : .3;
      const wdt = age <= 0 ? 3 : age === 1 ? 2.2 : 1.6;
      const dash = age >= 2 ? `stroke-dasharray="6 6"` : "";
      g += `<path class="sea-voyage" data-k="${trailKey(t)}" data-tip="${esc(`${t.seat} sailed ${rom(t.from)} to ${rom(t.to)}, H${t.hour}`)}" d="${voyagePath(t.from, t.to, t.hour)}"
        fill="none" stroke="${col}" stroke-width="${wdt}" ${dash} opacity="${op}" stroke-linecap="round"/>`;
    }
    for (const mo of R.monsters) {
      const [x, y] = mo.spot, s = .7 + Math.min(.5, mo.dmg * .06);
      // a paradox leaves TROUBLED WATER, small, still, unobtrusive (no creature)
      g += `<g class="sea-scar" data-mc="${mo.c}" data-tip="${esc(`troubled water off ${rom(mo.c)}, ${mo.count} paradox strike${mo.count > 1 ? "s": ""} · ${mo.dmg} energy taken in all · last H${mo.hour}`)}" transform="translate(${x} ${y}) scale(${s})" opacity=".5">
        <path d="M -9 0 a 9 5 0 0 1 18 0" fill="none" stroke="#7a2a1a" stroke-width="1.3" stroke-dasharray="3 3"/>
        <path d="M -5 3 a 5 3 0 0 1 10 0" fill="none" stroke="#7a2a1a" stroke-width="1.1" stroke-dasharray="2 3"/></g>`;
    }
    for (const wk of R.wrecks) {
      const [x, y] = wk.spot;
      g += `<g class="sea-wreck" data-wc="${wk.c}" data-tip="${esc(`wreck of ${wk.seat}, terminated H${wk.hour} near ${rom(wk.c)}`)}" transform="translate(${x} ${y}) rotate(-12)" opacity=".85">
        <g class="wk-in">
        <path d="M -10 4 q 10 8 20 0 l -3 5 q -7 4 -14 0 z" fill="#4a3a1c"/>
        <path d="M 1 3 L 1 -10 M 1 -10 l 8 4 l -8 3" stroke="#4a3a1c" stroke-width="1.4" fill="none"/></g></g>`;
    }
    for (const st of R.storms) {
      const [x, y] = POS[st.c];
      g += `<g class="sea-storm" data-tip="${esc(`a storm broke here, H${st.hour} (a motor exploded)`)}" transform="translate(${x - 22} ${y - 40})" opacity=".55">
        <path d="M -14 4 q -5 -9 5 -11 q 1 -8 11 -6 q 9 -5 15 1 q 9 -1 8 8 q 5 8 -5 9 z" fill="#5a5f6a"/></g>`;
    }
    // gathering storms over EVERY loaded traveler, threats readable at a glance
    for (const t of view.travelers) {
      if (!POS[t.century] || (t.booms || 0) < 5) continue;
      const [x, y] = POS[t.century];
      const dark = Math.min(1, t.booms / 12);
      g += `<g class="sea-gt" data-tip="${esc(`a storm gathers over ${t.name}, ${t.booms}/12 booms`)}" transform="translate(${x} ${y - 46})" opacity="${.3 + dark * .55}">
        <g class="gt-in">
        <path d="M -20 6 q -7 -12 7 -15 q 2 -10 15 -8 q 12 -7 20 2 q 12 -2 10 10 q 7 10 -7 12 z" fill="#4a4f5a"
          transform="scale(${.7 + dark * .6})"/>
        ${t.booms >= 10 ? `<path d="M -2 8 l -6 10 l 6 -2 l -4 10" fill="none" stroke="#e8c05a" stroke-width="2"/>` : ""}</g></g>`;
    }
    for (const c of R.restored) {
      if (!POS[c]) continue;
      const [x, y] = POS[c];
      g += `<ellipse class="sea-restored" data-rc="${c}" data-tip="${esc(`${rom(c)}, restored. it was always thus.`)}" cx="${x}" cy="${y}" rx="34" ry="26" fill="none"
        stroke="#b8862a" stroke-width="2.2" opacity=".9"/>`;
    }
    if (self) for (const card of (self.hand || [])) {
      const c = card.delivery_century;
      if (!POS[c]) continue;
      const [x, y] = POS[c];
      const fy = y - islR(c) * .74 + 3;   // pole foot on the north beach
      g += `<g class="sea-flag" data-tip="${esc(`${card.display_name || card.name} delivers at ${rom(c)}, sail here and deliver`)}" transform="translate(${x - 4} ${fy})">
        <path d="M 0 2 V -22" stroke="#5e2a16" stroke-width="1.4"/>
        <path d="M 0 -22 L 15 -18 L 0 -13 Z" fill="#a04a2a" stroke="#5e2a16" stroke-width="1"/>
        <circle cx="0" cy="3" r="1.6" fill="#5e2a16"/></g>`;
    }
    for (const t of view.travelers) {   // rivals' pennants, smaller, in their color
      if (t.is_self) continue;
      let k2 = 0;
      for (const card of (t.equipment || [])) {
        const c = card.delivery_century;
        if (c == null || !POS[c]) continue;
        const [x, y] = POS[c];
        const rfy = y - islR(c) * .74 + 3;
        g += `<g class="sea-flag" data-tip="${esc(`${t.name} must deliver ${card.display_name || card.name} at ${rom(c)}`)}" transform="translate(${x + 8 + k2 * 8} ${rfy})">
          <path d="M 0 2 V -17" stroke="rgba(20,12,4,.6)" stroke-width="1.1"/>
          <path d="M 0 -17 L 10 -14 L 0 -11 Z" fill="${seatColor(t.name)}" stroke="rgba(20,12,4,.6)" stroke-width=".6" opacity=".9"/></g>`;
        k2++;
      }
    }
    const byC = {};
    R.pcPos = {};
    g += window.__pdxPieceDefs("sea", false);
    for (const t of view.travelers) {
      const sc = R.shown[t.name] != null ? R.shown[t.name] : t.century;
      (byC[sc] = byC[sc] || []).push(t);
    }
    const PHT = PHONE() ? seaPhoneBerths(byC, view) : null;   // a phone: tokens on their islands
    for (const [cStr, ts] of Object.entries(byC)) {
      const c = +cStr; if (!POS[c]) continue;
      const [x, y] = POS[c];
      const rx = islR(c), ry = rx * .74;
      if (PHT) { g += seaPhoneStack(c, ts, PHT[c], view); continue; }
      if (ts.length > 1) g += `<circle data-tip="shared anchorage, agreements possible" cx="${x}" cy="${y}" r="${rx + 16}" fill="none" stroke="#8a6a3a"
        stroke-width="1.2" stroke-dasharray="4 4" opacity=".7"/>`;
      // BERTHS, RE-CUT FOR THE AURA. The hulls used to KISS the shore at a single fixed
      // radius, five of them within 90 degrees, lovely when a boat was a thumbnail, a
      // single unreadable knot now that each one wears a ring. An anchorage does not moor
      // its ships in one line: they ride at TWO depths. Alternate rings, wider angles, and
      // three rivals in one port stay three rivals.
      const SLOTS = [96, 40, 152, 6, 180];    // beach berths, southern shores first
      const RING  = [0, 1, 1, 0, 1];          // ...at two depths, so neighbours never touch
      // THE OUTLINES (window.__pdxOutline / __pdxPlate): each piece is ringed tight by its
      // own silhouette and stands on a small seat-coloured foot; the berths are FANNED until
      // the pieces clear each other, inside the chart (a berth near the edge used to hang
      // off the frame) and clear of the Merchant.
      const PR = t => (t.is_self ? 17 : 14);
      ts.sort((a, b) => (a.is_self ? 1 : 0) - (b.is_self ? 1 : 0));   // mine is drawn last, on top
      const berth = ts.map((t, i) => {
        let deg = SLOTS[i % SLOTS.length];
        if (x > W - 76) deg = 180 - deg;        // near an edge the berths face INLAND
        else if (x < 76) deg = deg;             // (left edge already faces inland)
        if (y > H - 70) deg = -deg;             // bottom edge: berth on the north shore
        const a = deg * Math.PI / 180;
        // ...but not so far out that the hull stops belonging to its isle.
        // Pushing the berths too far traded a knot of
        // boats for a fleet of orphans. They come back to the SHORE; the second ring
        // is now a step, not a swim, and the mooring line carries the rest.
        const rg = RING[i % RING.length];
        return { x: x + Math.cos(a) * (rx + 3 + rg * 13), y: y + Math.sin(a) * (ry + 5 + rg * 12) + 2, r: PR(t) + 4 };
      });
      const mcNow = R.merchantShown != null ? R.merchantShown : view.merchant_century;
      const obst = POS[mcNow] ? [{ x: POS[mcNow][0], y: POS[mcNow][1] - 47 + 10, r: 28, fixed: true }] : [];
      window.__pdxFan(berth.concat(obst), 5, [30, 40, W - 34, H - 26]);   // clear of the torn frame and of the Merchant
      {   // ...and clear of every island's numeral (the pieces' tags hang ~37 under the berth)
        const plates = [];
        for (let c2 = 1; c2 <= 30; c2++) {
          if (!POS[c2] || Math.hypot(POS[c2][0] - x, POS[c2][1] - y) > 190) continue;
          const fs = PHONE() ? (rom(c2).length <= 2 ? 22 : rom(c2).length <= 4 ? 19 : 16.5) : rom(c2).length <= 2 ? 18 : rom(c2).length <= 4 ? 14 : 11.5;
          const hw = rom(c2).length * fs * .34 + 3, ny = POS[c2][1] + fs * .36;
          plates.push([POS[c2][0] - hw, ny - fs * .82, POS[c2][0] + hw, ny + 3]);
        }
        if (mode && mode.kind === "travel") for (let c2 = 1; c2 <= 30; c2++) {   // and off a voyage's cost tags
          const d = Math.abs(c2 - mode.self); if (d === 0 || d > mode.max || !POS[c2]) continue;
          const k = PHONE() ? 1.5 : 1, ix = POS[c2][0], iy = POS[c2][1]; let ty = iy - islR(c2) * .74 - 24;
          if (PHONE() && ty < 30) ty = iy + islR(c2) * .74 + 26;
          plates.push([ix - 24 * k, ty - 12 * k, ix + 24 * k, ty + 8 * k]);
        }
        if (PHONE()) for (const id in ANCH.tab) { const T = ANCH.tab[id]; plates.push([T.spot[0] - T.hw - 8, T.spot[1] - 11, T.spot[0] + T.hw + 8, T.spot[1] + 11]); }
        window.__pdxPlacePieces(berth.concat(obst), [x, y], plates, [30, 40, W - 34, H - 26], 37);
      }
      const pcPos = R.pcPos || (R.pcPos = {});
      const chase = view.merchant_plan && view.merchant_plan.target_seat;
      ts.forEach((t, i) => {
        const col = seatColor(t.name);
        const bx = Math.round(berth[i].x), by = Math.round(berth[i].y);
        const dead = t.is_terminated && t.awaiting_respawn;
        const st = t.statuses || [];
        const ghost = st.includes("terminated") && t.century >= 24;   // the Reaches shelter the terminated (§28)
        const burst = st.includes("exploded");                        // boiler burst, no sailing this hour (§5.2)
        const hunted = chase === t.name && view.merchant_century !== t.century;
        const pr = PR(t), pcy = -4;
        pcPos[t.name] = [bx, by + pcy];
        const memo = R.pcAt || (R.pcAt = {});
        const pulse = t.is_self && memo[t.name] != null && memo[t.name] !== c;
        if (t.is_self) memo[t.name] = c;
        const em = window.__pdxEmanata(t, col, R.em || (R.em = {}), -44);   // above the plate
        g += `<g class="sea-fixg pc-piece-g${t.is_self ? " pc-self" : ""}${ghost ? " sea-ghost": ""}${em.cls}" data-seat="${t.name}" data-tip="${esc(`${t.name}${t.is_self ? " (you)": ""}, ${rom(c)} · ${t.energy} energy · ${t.gold} gold · ${t.booms}/12 booms${t.is_wanted ? " · WANTED": ""}${hunted ? " · the Merchant is chasing you (richest traveller not in his century)": ""}${burst ? " · boiler burst, cannot sail or activate this hour": ""}${ghost ? " · sheltered beyond time, the Reaches spare the terminated": ""}${dead && !ghost ? " · lost at sea (respawning)": ""}`)}" opacity="${dead && !ghost ? .5: 1}">
          <g transform="translate(${bx} ${by})"><line x1="${(x - bx).toFixed(1)}" y1="${(y - by).toFixed(1)}" x2="0" y2="${pcy}" stroke="${col}" stroke-width="1.8" stroke-linecap="round" opacity=".7" stroke-dasharray="2.6 2.4"/><g class="sea-fix-boat"><g class="pc-piece">
            <g class="sea-aura">${window.__pdxPlate({ col, self: t.is_self, base: t.is_self ? 17.5 : 15.5, w: t.is_self ? 14.6 : 13, dark: false, pulse })}</g>
            <g transform="scale(${t.is_self ? 1.62 : 1.45})${dead && !ghost ? " rotate(-24)" : ""}">${window.__pdxOutline(rigSVG(0, col, { ghost, burst }))}</g>
            ${window.__pdxTag(t.is_self ? "YOU" : esc(window.__pdxInitials(t.name)), col, t.is_self ? 30 : 27, { self: t.is_self, chased: hunted })}
          </g></g>${em.g}</g></g>`;
      });
    }
    // ═══ PERIOD MARKERS, a carved plaque lying ON the divide, a chest beside it ═══
    for (const pname of Object.keys(PERIOD_ERAS)) {
      if (!ANCH.post || !ANCH.post[pname]) continue;
      const [px, py] = PHONE() ? seaPostAt(pname, R.phLive || []) : ANCH.post[pname];
      if (PHONE()) (R.postLive || (R.postLive = {}))[pname] = [px, py];
      const eras2 = PERIOD_ERAS[pname];
      const items = R.deliveries.filter(dv => ERAS_OF(dv.century).some(e2 => eras2.includes(e2)));
      const covered = view.travelers.filter(t => (t.delivered_periods || []).includes(pname));
      const open = items.length > 0;
      // the plaque is centred ON the seam; the chest sits just to its right, also on the line
      g += `<g class="sea-postg" data-period="${pname}" transform="translate(${px} ${py})">
        <ellipse cx="0" cy="12" rx="15" ry="3" fill="rgba(20,12,4,.25)"/>
        <path d="M -13 12 V 2 Q -13 0 -11 0 H 11 Q 13 0 13 2 V 12 Z" fill="#7a4f24" stroke="#241708" stroke-width="1.2"/>
        <path d="M -13 2 Q -13 -9 0 -9 Q 13 -9 13 2 Z" fill="#8a5c2c" stroke="#241708" stroke-width="1.2"/>
        <path d="M -13 -1.5 H 13" stroke="#241708" stroke-width="1.1"/>
        <path d="M -6 -8.4 V 12 M 6 -8.4 V 12" stroke="#5a3a1a" stroke-width="1.6"/>
        <rect x="-2.6" y="-1" width="5.2" height="6" rx="1" fill="#c9a45c" stroke="#241708" stroke-width=".8"/>
        <circle cx="0" cy="1.6" r=".9" fill="#241708"/>
        ${open ? `<circle cx="0" cy="2" r="9" fill="rgba(201,164,92,.28)"/>
          <path d="M -7 -3 l 2 -3 M 5 -4 l 2 -3 M -2 -5 l 1 -3" stroke="#e8c05a" stroke-width="1.2" opacity=".8"/>
          <text x="20" y="4" font-family="Georgia" font-weight="bold" font-size="11" fill="#c9a45c" stroke="#2a1c0c" stroke-width="2.4" paint-order="stroke">×${items.length}</text>` : ""}
        ${covered.length ? `<g transform="translate(0 21)">${covered.map((t, k) => `<circle cx="${(k - (covered.length - 1) / 2) * 8}" cy="0" r="3" fill="${seatColor(t.name)}" stroke="#241708" stroke-width=".6"/>`).join("")}</g>` : ""}
      </g>`;
    }
    // ═══ THE SAILING ORDER, who resolves first (century desc -> gold -> energy) ═══
    {
      const [ox, oy] = ANCH.ord;
      const order = [...view.travelers].sort((a, b) =>
        b.century - a.century || b.gold - a.gold || b.energy - a.energy);
      const bh = 38 + order.length * 30 + 6;
      let rows = "";
      const newIdx = {};
      order.forEach((t, i) => { newIdx[t.name] = i; });
      R.ordFlip = { prev: R.ordIdx || null, next: newIdx };   // renderLive plays the slide
      R.ordIdx = newIdx;
      order.forEach((t, i) => {
        const col = seatColor(t.name), yy = 36 + i * 30;
        const stt = t.statuses || [];
        const ghost2 = stt.includes("terminated") && t.century >= 24;
        const burst2 = stt.includes("exploded");
        const pers = t.delivered_periods || [];
        const pips = ["Origins", "Ascension", "Singularity"].map((p, k) =>
          `<rect x="${104 + k * 13}" y="${yy - 6}" width="9" height="9" rx="1.5"
            fill="${pers.includes(p) ? col : "none"}" stroke="#c9b890" stroke-width=".8" opacity="${pers.includes(p) ? .95 : .45}"/>`).join("");
        const cameo = t.is_wanted
          ? `<g transform="translate(88 ${yy - 1})"><rect x="-7.5" y="-10" width="15" height="20" fill="#e8d9b8" stroke="#c0392b" stroke-width="1"/>
             <text y="-4.6" text-anchor="middle" font-size="3.7" font-family="Georgia" font-weight="bold" fill="#8c2a1a" letter-spacing=".3">WANTED</text>
             <circle cy="1.5" r="3.2" fill="#3a2c1c"/><path d="M -4 7.5 Q 0 4 4 7.5 Z" fill="#3a2c1c"/></g>`
          : `<g transform="translate(88 ${yy - 1})"><circle r="6.5" fill="none" stroke="${col}" stroke-width="1"/>
             <circle cy="-1.4" r="2.6" fill="#c9b890"/><path d="M -3.6 4.6 Q 0 1.4 3.6 4.6 Z" fill="#c9b890"/></g>`;
        rows += `<g data-hlseat="${esc(t.name)}" data-ordrow="${esc(t.name)}" data-tip="${esc(`${i + 1}. ${t.name}${t.is_self ? " (you)": ""}, ${rom(t.century)} · ${t.gold} gold · ${t.energy} energy${t.is_wanted ? " · WANTED": ""}${burst2 ? " · boiler burst (cannot sail this hour)": ""}${ghost2 ? " · beyond time's reach": ""} · periods ${pers.length}/3`)}">
          <rect x="6" y="${yy - 12}" width="142" height="26" fill="rgba(233,220,184,.06)" stroke="none"/>
          <text x="15" y="${yy + 3}" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="12" fill="#e8dcc0">${i + 1}</text>
          <g transform="translate(31 ${yy}) scale(.82)">${rigSVG(seatRig(t.name), col, { ghost: ghost2, burst: burst2 })}</g>
          <text x="44" y="${yy + 3}" font-family="Georgia" font-weight="bold" font-size="10" fill="${col}" stroke="rgba(0,0,0,.4)" stroke-width="2" paint-order="stroke">${esc(t.name.slice(0, 6).toUpperCase())}</text>
          ${cameo}${pips}
        </g>`;
      });
      const lead = order[0], leadCol = lead ? seatColor(lead.name) : "#e8dcc0";
      g += `<g class="sea-ord${ordHovered ? " open" : ""}" transform="translate(${ox} ${oy})">
        <g class="sea-ord-body" data-tip="when voyages tie in a module, the farthest-future traveler sails first; then the richest; then the most energised">
          <rect width="154" height="${bh}" rx="2" fill="#3c2e1a" stroke="#241708" stroke-width="1.6"/>
          <rect x="4" y="4" width="146" height="${bh - 8}" fill="none" stroke="#c9b890" stroke-width=".5" opacity=".4"/>
          <text x="77" y="20" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="10.5" letter-spacing="2.2" fill="#e8dcc0">SAILING ORDER</text>
          <text x="77" y="${bh - 8}" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="6.8" fill="#c9b890" opacity=".8">future first · then gold · then energy, squares = periods</text>
          ${rows}
        </g>
        <g class="sea-ord-pin">
          <path d="M 0 0 H 21 Q 26 0 26 6 V 134 Q 26 140 21 140 H 0 Z" fill="#3c2e1a" stroke="#241708" stroke-width="1.4"/>
          <g transform="translate(13 21) scale(.92)">${lead ? rigSVG(seatRig(lead.name), leadCol, {}) : ""}</g>
          <text transform="translate(17.5 52) rotate(90)" font-family="Georgia" font-weight="bold"
            font-size="9.5" letter-spacing="2.6" fill="#e8dcc0">ORDER</text>
        </g>
      </g>`;
    }
    const mc = R.merchantShown != null ? R.merchantShown : view.merchant_century;
    if (POS[mc]) {
      const [x, y] = POS[mc];
      if (PHONE()) LIVEOBST.push(seaMerchBox(mc));   // his hull and his MERCHANT tag
      const [mx, my] = seaMerchAt(mc);
      const dice = view.merchant_movement_dice || 1;
      const dir = R.merchantLast ? Math.sign((R.merchantLast.to || mc) - (R.merchantLast.from || mc)) || 1 : 1;
      // the sail wears one RED STRIPE per movement die (1..3), speed you can read
      let stripes = "";
      const bands = Math.min(3, dice);
      for (let i = 0; i < bands; i++)
        stripes += `<rect x="-9.5" y="${(-18 + (i + .5) * 19 / bands).toFixed(1)}" width="19.5" height="${(19 / bands * .42).toFixed(1)}" rx="1" fill="#8c3b2a" opacity=".9"/>`;
      g += `<g class="sea-shipg pc-merch-live" data-tip="${esc(`the Merchant's carrack, ${dice} sail${dice > 1 ? "s": ""} (${dice}d3 speed)${R.merchantLast && R.merchantLast.target ? " · hunting " + R.merchantLast.target: ""} · anchored at ${rom(mc)}`)}" transform="translate(${mx} ${my})">
        ${window.__pdxMerchPlate({ w: 46, base: 33, dark: false })}
        <g class="sh-slide"><g transform="scale(${dir < 0 ? -1 : 1} 1)" class="sea-ship"><g class="sh-bob">
        ${window.__pdxOutline(`        <g transform="translate(0 12) scale(.8)">
        <path d="M -21 14 Q -23 22 -14 25 L 9 25 Q 19 23 21 14 L 17 12 Q 0 17 -17 12 Z" fill="#6a4522" stroke="#241708" stroke-width="1.1"/>
        <path d="M -18 17 Q 0 21 18 16" fill="none" stroke="#3a2510" stroke-width=".7" opacity=".65"/>
        <path d="M -16 21 Q 0 24 15 20" fill="none" stroke="#3a2510" stroke-width=".7" opacity=".5"/>
        <path d="M 21 14 q 4 -1 4 -5 l -3 .5 z" fill="#5a3a1e" stroke="#241708" stroke-width=".8"/>
        <path d="M -21 14 q -3 -4 -1 -8 l 4 4 z" fill="#5a3a1e" stroke="#241708" stroke-width=".8"/>
        <rect x="8" y="6" width="9" height="7" rx="1" fill="#7a5228" stroke="#241708" stroke-width=".8"/>
        <path d="M 7 6 h 11 l -1.6 -3 h -7.8 z" fill="#8a5c2c" stroke="#241708" stroke-width=".7"/>
        <path d="M 0 13 V -24" stroke="#3a2510" stroke-width="1.8"/>
        <path d="M -12 -22 H 13" stroke="#3a2510" stroke-width="1.3"/>
        <path d="M -11 -21 Q 1 -17 12 -21 L 10 2 Q 0 8 -9 2 Z" fill="#e8d9b8" stroke="#241708" stroke-width=".9"/>
        ${stripes}
        <path d="M -11 -21 Q 1 -17 12 -21 L 10 2 Q 0 8 -9 2 Z" fill="none" stroke="#241708" stroke-width=".9"/>
        <path d="M 0 -24 l 8 2.2 l -8 2.2 z" fill="#8c3b2a" stroke="#241708" stroke-width=".6"/>
        <path d="M -12 -22 L -19 12 M 13 -22 L 19 12" stroke="#3a2510" stroke-width=".6" opacity=".5"/>
        <circle cx="15" cy="4" r="1.7" fill="#ffd98a" class="sea-lantern"/>
        <path d="M -23 22 q -8 3 -14 1 M 22 21 q 7 3 12 1" fill="none" stroke="#eaf4f6" stroke-width="1.1" opacity=".55"/>
        </g>`, { gold: true })}
        ${(() => {
          const last = R.merchantHist.length ? R.merchantHist[R.merchantHist.length - 1] : null;
          const dist = last ? Math.abs(last.to - last.from) : 0;
          const split = dist ? d3Split(dist, dice) : new Array(dice).fill(1);
          return `<g transform="translate(${-6 - dice * 5} 30)"><g class="sea-dice">`
            + split.slice(0, 3).map((v, i) => d3Token(v, i * 10, 0)).join("") + `</g></g>`;
        })()}</g></g></g>${window.__pdxMerchTag(-22)}</g>`;
      // the chase line and the reach beside him (window.__pdxMerchantHUD)
      if (view.merchant_plan) {
        const pl = view.merchant_plan, tt = pl.target_seat && view.travelers.find(t2 => t2.name === pl.target_seat);
        g += window.__pdxMerchantHUD({ v: view, m: [mx, my + 13],
          tpos: tt && tt.century !== mc && R.pcPos && R.pcPos[tt.name] || null,
          pos: c2 => POS[c2] || null, dark: false });
      }
    }
    {
      const [cx2, cy2] = POS[11];
      const open = !!view.secret_market_open;
      const [clx, cly] = ANCH.coveLab;
      g += `<g class="sea-cove" data-tip="${esc(open ? "THE SMUGGLERS' HAVEN stands open, a secret market trades on these docks": "a sealed haven, dark piers and shuttered doors; find it, and something will trade")}" transform="translate(${cx2 - 38} ${cy2 - 2})">
        <path d="M -18 6 q -6 -12 4 -16 q 8 -4 16 -1 q 7 3 6 10 q -12 6 -26 7 z" fill="#4a4258" stroke="#2c2438" stroke-width="1.2"/>
        <path d="M -14 -9 l 3 -6 l 3 5 z" fill="#3a3248" stroke="#2c2438" stroke-width=".7"/>
        <path d="M -2 8 H 22 M 2 8 V 12 M 8 8 V 13 M 14 8 V 12 M 20 8 V 13" stroke="#5a4326" stroke-width="1.6"/>
        <rect x="-12" y="-8" width="9" height="8" fill="${open ? "#6a5238" : "#463a50"}" stroke="#241708" stroke-width=".9"/>
        <path d="M -13.5 -8 L -7.5 -13.5 L -1.5 -8 Z" fill="#8a5c2c" stroke="#241708" stroke-width=".8"/>
        <rect x="-1" y="-6" width="8" height="6" fill="${open ? "#75593c" : "#4a3e54"}" stroke="#241708" stroke-width=".9"/>
        <path d="M -2 -6 L 3 -10.5 L 8 -6 Z" fill="#7a4e24" stroke="#241708" stroke-width=".8"/>
        <rect x="-10" y="-5.5" width="2.2" height="2.6" fill="${open ? "#ffd98a" : "#241c30"}" class="${open ? "sea-lantern" : ""}"/>
        <rect x="-6" y="-5.5" width="2.2" height="2.6" fill="${open ? "#ffd98a" : "#241c30"}"/>
        <rect x="1.5" y="-4" width="2" height="2.4" fill="${open ? "#ffe9b0" : "#241c30"}"/>
        <path d="M 9 -6 V -18 ${open ? "M 9 -18 l 7 2.2 l -7 2.2" : ""}" stroke="#241708" stroke-width="1" fill="none"/>
        ${open ? `<path d="M 9 -18 l 7 2.2 l -7 2.2 z" fill="#22202c"/><circle cx="11.5" cy="-15.5" r=".7" fill="#e8e2d0"/>` : ""}
        ${open
          ? `<g transform="translate(16 11)"><path d="M -5 0 q 5 4 10 0 l -1.5 -3 h -7 z" fill="#5a3a1e" stroke="#241708" stroke-width=".7"/></g>
             <circle cx="23" cy="6" r="4.5" fill="rgba(255,217,138,.4)" class="sea-lantern"/><circle cx="23" cy="6" r="1.3" fill="#ffd98a"/>`
          : `<path d="M -2 3 l 4 3 m 0 -3 l -4 3 M 6 2 l 4 3 m 0 -3 l -4 3" stroke="#8a8072" stroke-width="1"/>
             <ellipse class="sea-fog f1" cx="2" cy="0" rx="17" ry="6" fill="#cfd6d2" opacity=".38"/>
             <ellipse class="sea-fog f2" cx="10" cy="5" rx="13" ry="5" fill="#dde2de" opacity=".3"/>`}
        <line class="pdx-ref" x1="${clx - cx2 + 38}" y1="${cly - cy2 + 7}" x2="2" y2="-2" stroke="#6a4a8a" stroke-width=".8" stroke-dasharray="2 3" opacity=".7"/>
        <text class="pdx-ref" x="${clx - cx2 + 38}" y="${cly - cy2 + 2}" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="10" fill="#6a4a8a"
          stroke="#c8d6c3" stroke-width="3" paint-order="stroke">${open ? "the haven stands open" : "sealed haven"}</text></g>`;
    }
    const [wx, wy] = ANCH.well;
    g += `<g class="sea-well" data-tip="YEAR ZERO: the Skull Mount; the last voyage sails into its maw and ends the game (+2 CP)" transform="translate(${wx} ${wy})">
      <g class="sea-well-rings">
      <circle r="24" fill="none" stroke="#6a5a9e" stroke-width="1.2" stroke-dasharray="10 6" opacity=".6"/>
      <path d="M -18 12 q 10 7 26 3 M -22 6 q -6 6 2 12" fill="none" stroke="#8fb0ba" stroke-width="1.2" opacity=".7"/></g>
      <path d="M -17 12 Q -22 -2 -13 -10 Q -6 -17 3 -16 Q 13 -14 16 -6 Q 19 2 15 12 Q 8 15 -2 15 Q -11 15 -17 12 Z" fill="#5c566e" stroke="#2a2438" stroke-width="1.5"/>
      <path d="M -13 -8 q 5 -5 12 -4 M 12 -8 q 3 4 3 9" fill="none" stroke="#787290" stroke-width="1" opacity=".7"/>
      <ellipse cx="-6.5" cy="-3" rx="3.6" ry="4.4" fill="#171226"/>
      <ellipse cx="5.5" cy="-3" rx="3.6" ry="4.4" fill="#171226"/>
      <circle cx="-5.8" cy="-2.2" r="1" fill="#6a5a9e" class="sea-skulleye"/>
      <circle cx="6.2" cy="-2.2" r="1" fill="#6a5a9e" class="sea-skulleye e2"/>
      <path d="M -1.6 3.5 L 0 .4 L 1.6 3.5 Z" fill="#171226"/>
      <path d="M -9 12 L -6.5 7.5 L -4 12 M -2.5 12 L 0 7.5 L 2.5 12 M 4 12 L 6.5 7.5 L 9 12" fill="#171226" stroke="#171226" stroke-width=".6"/>
      <path d="M -6 12 q 6 4 12 0 q -6 5 -12 0 z" fill="#0e0a1c"/>
      <path d="M -20 14 q 4 -3 7 0 M 13 14 q 4 -3 7 0" fill="none" stroke="#eaf4f6" stroke-width="1" opacity=".5"/>
      <circle class="sea-hit" data-c="0" r="${PHONE() ? 40 : 26}" fill="transparent"/>${PHONE() ? `<text y="38" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="15" fill="#2a2438" stroke="#e8e0cc" stroke-width="3.2" paint-order="stroke">YEAR ZERO</text>` : ""}</g>`;
    return g;
  }

  /* ═══ INTERACTION ═══ */
  let mode = null;
  let ordHovered = false;   // the Sailing Order reveals on hover (data-driven, survives re-renders)
  function pollDecisions() {
    if (!app) return;
    const req = app.pendingReq;
    if (!req) { if (mode) { mode = null; scheduleLive(); } return; }
    if (mode && mode.req === req) return;
    const self = selfT(); if (!self) return;
    if (req.kind === "travel") {
      const o = req.options || {};
      mode = { kind: "travel", req, max: o.max, self: o.century != null ? o.century : self.century,
        energy: self.energy, locked: o.direction_locked != null ? o.direction_locked : null,
        ppc: o.energy_per_past_century != null ? o.energy_per_past_century : 1 };   // 0: the Compass rides free
      scheduleLive();
    } else if (req.kind === "merchant_century") {
      mode = { kind: "merchant", req, centuries: new Set(req.options.centuries || []) };
      scheduleLive();
    } else if (req.kind === "target" && req.options && req.options.target_type === "century") {
      // candidates arrive as {century: n} objects (Astrolabe): Number() of an object is
      // NaN, which left the chart with no target and the match waiting forever
      mode = { kind: "century", req, centuries: new Set((req.options.candidates || [])
        .map((x) => Number(x && typeof x === "object" ? x.century : x)).filter((c) => c >= 0)) };
      scheduleLive();
    } else if (mode) { mode = null; scheduleLive(); }
  }
  function stepCost(from, dist) {
    let cost = 0;
    for (let s = 1; s <= dist; s++) {
      const dest = from - s;
      if (dest <= 0) break;
      cost += dest <= 9 ? 2 : 1;
    }
    return cost;
  }
  const BOLT = "M 0 0 l -2.7 4.9 h 2 l -1.2 4.7 4.5 -6.1 h -2.1 l 2 -3.5 z";
  // where a voyage's cost tag hangs on a phone: above its island (under it on the top row),
  // slid sideways a little when the Merchant stands there
  function seaCostSpot(c) {
    const [x, y] = POS[c];
    let ty = y - islR(c) * .74 - 24;
    if (ty < 30) ty = y + islR(c) * .74 + 26;
    const posts = [];   // (a registry chest steps aside from the tag instead: seaPostAt)
    const mc = R.merchantShown != null ? R.merchantShown : app && app.view && app.view.merchant_century;
    if (POS[mc] && mc !== c) posts.push(seaMerchBox(mc));   // the Merchant's hull and tag
    const clash = (tx) => posts.some(o => tx - 36 < o[2] + 3 && tx + 36 > o[0] - 3 && ty - 17 < o[3] + 3 && ty + 13 > o[1] - 3);
    if (clash(x)) for (let d = 6; d <= 60; d += 6) {
      if (!clash(x + d) && x + d + 36 < W - 8) return [x + d, ty];
      if (!clash(x - d) && x - d - 36 > 8) return [x - d, ty];
    }
    return [x, ty];
  }
  function costTag(c, cost, kind) {
    let [x, y] = POS[c];
    let ty = y - islR(c) * .74 - 24;
    if (PHONE()) [x, ty] = seaCostSpot(c);   // a phone's top row: the tag hangs under the island
    const col = kind === "free" ? "#1d6b52" : kind === "risk" ? "#c0392b" : "#8a6215";
    const label = kind === "free" ? "free" : String(cost) + (kind === "risk" ? "!" : "");
    const w2 = label.length * 6.8 + (kind === "free" ? 14 : 26);
    if (PHONE()) LIVEOBST.push([x - w2 * .75, ty - 16, x + w2 * .75, ty + 12]);
    return `<g class="sea-cost"${PHONE() ? ` transform="translate(${x} ${ty}) scale(1.5) translate(${-x} ${-ty})"` : ""}>
      <rect x="${x - w2 / 2}" y="${ty - 11}" width="${w2}" height="18" rx="3" fill="rgba(255,246,220,.95)" stroke="${col}" stroke-width="1.4"/>
      ${kind === "free" ? "" : `<path d="${BOLT}" transform="translate(${x - w2 / 2 + 9} ${ty - 7})" fill="${col}"/>`}
      <text x="${x + (kind === "free" ? 0 : 6)}" y="${ty + 3}" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="11" fill="${col}">${label}</text></g>`;
  }
  function highlights() {
    if (!mode) return "";
    let g = "";
    const ring = (c, cls, tip) => {
      const [x, y] = POS[c];
      g += `<circle class="sea-glow ${cls}" data-c="${c}" data-tip="${esc(tip)}" cx="${x}" cy="${y}" r="${islR(c) + 12}"/>`;
    };
    if (mode.kind === "travel") {
      for (let c = 1; c <= 30; c++) {
        const d = Math.abs(c - mode.self);
        if (d === 0 || d > mode.max) continue;
        if (mode.locked != null && Math.sign(c - mode.self) !== mode.locked) continue;
        if (c > mode.self || mode.ppc === 0) { ring(c, "glow-go", c > mode.self ? `sail with the current to ${rom(c)}, free` : `the Compass carries you to ${rom(c)}, free`); g += costTag(c, 0, "free"); }
        else {
          const cost = stepCost(mode.self, d);
          const risky = cost >= mode.energy;
          ring(c, risky ? "glow-risk" : "glow-cost",
            `beat upstream to ${rom(c)}, ${cost} energy${risky ? " (this could sink you)": ""}`);
          g += costTag(c, cost, risky ? "risk" : "cost");
        }
      }
    } else if (mode.kind === "merchant") {
      for (const c of mode.centuries) if (POS[c]) ring(c, "glow-amber", `send the wagon to ${rom(c)}`);
    } else if (mode.kind === "century") {
      for (const c of mode.centuries) if (POS[c]) ring(c, "glow-violet", `target ${rom(c)}`);
    }
    return g;
  }
  function pickCandidates() {
    if (!mode) return null;
    const set = new Set();
    if (mode.kind === "travel") {
      for (let c = 1; c <= 30; c++) {
        const d = Math.abs(c - mode.self);
        if (d === 0 || d > mode.max) continue;
        if (mode.locked != null && Math.sign(c - mode.self) !== mode.locked) continue;
        set.add(c);
      }
      set.add(mode.self);   // staying put is a choice too
    } else for (const c of mode.centuries) set.add(c);
    return set;
  }
  function applyFocus() {
    const svg = document.querySelector(".pc-world");
    if (!svg) return;
    const cands = pickCandidates();
    svg.classList.toggle("mode-pick", !!cands);
    svg.querySelectorAll(".sea-isle").forEach(el => {
      el.classList.toggle("can-go", !!cands && cands.has(+el.dataset.c));
    });
  }
  function commandText() {
    if (!mode) return "";
    if (mode.kind === "travel")
      return `<span class="vz-sigil cmd-sigil">${window.__helaSigil||""}</span><span class="vz-name">HELA</span>` + `PLOT YOUR COURSE <b class="cgo">\u25CF free</b> <b class="ccost">\u25CF costs</b>`
        + `<span class="sea-anchor"><svg width="11" height="12" viewBox="0 0 12 13"><path d="M6 1.4 a1.7 1.7 0 1 0 .01 0 M6 4.6 V 11 M2.6 6.6 H 9.4 M1.8 8.4 Q 2 11.6 6 11.6 Q 10 11.6 10.2 8.4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg> ${rom(mode.self)}</span>`;
    if (mode.kind === "merchant") return `<span class="vz-sigil cmd-sigil">${window.__helaSigil||""}</span><span class="vz-name">HELA</span>` + "CHAOS III: choose the Merchant's new harbor";
    return `<span class="vz-sigil cmd-sigil">${window.__helaSigil||""}</span><span class="vz-name">HELA</span>` + "CHOOSE A TARGET CENTURY on the chart";
  }
  let prevC = null, prevEl = null;
  function setPreview(c) {
    if (c === prevC) return;
    prevC = c;
    if (prevEl) { prevEl.remove(); prevEl = null; }
    if (!c || !mode || mode.kind !== "travel" || !liveG || REDUCED) return;
    prevEl = document.createElementNS(NS, "path");
    prevEl.setAttribute("d", voyagePath(mode.self, c, hourNow()));
    prevEl.setAttribute("fill", "none");
    prevEl.setAttribute("stroke", c > mode.self ? "#2fae7c" : "#c9a45c");
    prevEl.setAttribute("stroke-width", "2.2");
    prevEl.setAttribute("stroke-dasharray", "3 6");
    prevEl.setAttribute("opacity", ".7");
    prevEl.setAttribute("pointer-events", "none");
    (fxG || liveG).appendChild(prevEl);
  }
  function popIsle(c) {
    if (REDUCED) return;
    const el = document.querySelector(`.sea-isle[data-c="${c}"]`);
    if (el) el.animate([
      { transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }
    ], { duration: 280, easing: "cubic-bezier(.3,1.6,.4,1)" });
    if (POS[c] && liveG) ripple(POS[c][0], POS[c][1], "#8a6a3a");
  }
  function plotJuice(fromC, toC) {
    if (!POS[fromC] || !POS[toC]) return;
    R.preplot = `${fromC}:${toC}`; R.travelFrom = fromC;
    if (REDUCED || !liveG) { snd("quill", { dur: 500 }); return; }
    const stt = selfT();
    const col = stt ? seatColor(stt.name) : "#1d6b52";
    if (stt) { R.shown[stt.name] = -1; R.sailing = true; renderNow(); }   // anchored boat yields
    // the course stroke lives in fxG so a state re-render can't wipe it mid-draw
    const tmp = document.createElementNS(NS, "path");
    tmp.setAttribute("d", voyagePath(fromC, toC, hourNow()));
    tmp.setAttribute("fill", "none");
    tmp.setAttribute("stroke", col); tmp.setAttribute("stroke-width", "3.2");
    tmp.setAttribute("stroke-linecap", "round"); tmp.classList.add("sea-temp");
    (fxG || liveG).appendChild(tmp);
    const L = tmp.getTotalLength();
    const dur = Math.min(2600, 850 + L * 3.4) * (window.__pdxPace ? window.__pdxPace(1) : 1);   // a voyage is an EVENT; the Pace setting stretches it
    snd("quill", { dur }); snd("sea_sail", { dur });
    tmp.style.strokeDasharray = L;
    tmp.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
      { duration: dur, easing: "cubic-bezier(.35,.1,.35,1)", fill: "forwards" });
    sailBoat(tmp, dur, col, stt ? seatRig(stt.name) : 0);
    setTimeout(() => {   // landfall of YOUR own optimistic voyage
      if (stt) { const real = selfT(); const land = (real && real.century !== R.travelFrom) ? real.century : toC; R.shown[stt.name] = land; R.pendingSelf = land; R.sailing = false; R.travelFrom = null; }
      tmp.remove();      // the permanent trail (drawn by liveLayer) takes over
      renderNow();
      if (POS[toC]) { ripple(POS[toC][0], POS[toC][1], col); snd("chart_splash"); }
    }, dur);
    const cp = document.querySelector(".cplot");
    if (cp) cp.animate([
      { transform: "translate(0,0)" }, { transform: "translate(1.5px,2px)" }, { transform: "translate(-1px,-1px)" }, { transform: "translate(0,0)" }
    ], { duration: 220, easing: "ease-out" });
  }
  function onIslandClick(c) {
    if (!app) return;
    if (!mode && app.pendingReq) pollDecisions();
    if (!mode || !app.pendingReq) return;
    if (mode.kind === "travel") {
      if (c === 0) {
        if (mode.self <= mode.max && mode.locked !== 1) {
          plotJuice(mode.self, 1);
          app.respond({ direction: -1, distance: mode.self });
        }
        mode = null; scheduleLive(); return;
      }
      const d = Math.abs(c - mode.self);
      if (c === mode.self) { snd("chart_stamp"); app.respond({ direction: 1, distance: 0 }); mode = null; scheduleLive(); return; }
      if (d === 0 || d > mode.max) { snd("chart_brush"); return; }
      if (mode.locked != null && Math.sign(c - mode.self) !== mode.locked) { snd("chart_brush"); return; }
      popIsle(c);
      plotJuice(mode.self, c);
      app.respond({ direction: c > mode.self ? 1 : -1, distance: d });
      mode = null; scheduleLive();
    } else if (mode.kind === "merchant" && mode.centuries.has(c)) {
      popIsle(c); snd("chart_stamp");
      app.respond({ century: c }); mode = null; scheduleLive();
    } else if (mode.kind === "century" && mode.centuries.has(c)) {
      popIsle(c); snd("chart_stamp");
      app.respond({ choice: c }); mode = null; scheduleLive();
    } else if (mode.kind === "merchant" || mode.kind === "century") {
      snd("chart_brush");   // armed pick, but this island is not one of the options
    }
  }

  /* ═══ FX (the sauce), a serialized little theater: one thing at a time ═══ */

  /* ═══ THE STALL, the bug that made the game unplayable ═══════════════════════
     drainFx() lives at the END of renderLive(). When I gated renderLive() on "am I the
     skin on screen?" (a real win, three maps were re-rendering on every state tick,
     two of them invisible), I put the `return` ABOVE the drain. So the moment the
     traveller's period switched the visible skin, THIS map's fx queue started filling
     and never emptied.

     That is not a cosmetic leak. game.js line 300 holds the entire paced event queue
     open on this flag:

         for (let w = 0; w < 80 && window.__seaPresenting(); w++) await this._sleep(150);

     ...before it will prompt for ANY decision. A permanently-true flag therefore taxed
     every single action in the game, buy a card, end a turn, plot a voyage, with a
     multi-second dead stall. Every event had at least a 4-second gap between them,
     which made the game unplayable.

     Two guards now, because a flag that can freeze the whole game deserves belts AND
     braces:
       1. Off-screen, the theatre plays to an empty house, so it plays INSTANTLY. Bank
          whatever state the fx carried, drop the animation, clear the flags. (Exactly
          what the reduced-motion path already does, for exactly the same reason.)
       2. *Presenting() answers false whenever this skin is not the one on screen. It
          cannot be "presenting" to somebody who is looking at a different map.
     And drainFx() gets a watchdog: if playFx ever fails to call done(), fxBusy unsticks
     itself instead of hanging the game forever. ═══════════════════════════════════ */
  let fxBusy = false, renderPending = false, fxGuard = null;
  function __flushFxSilently() {
    // and DROP OUR ORDER. An off-screen chart holding a stale command banner is what the
    // pip-boy mirror used to latch onto and pin over the matrix forever.
    try{ const r=document.getElementById("timeline-rail"); const c=r&&r.querySelector(".sea-cmd");
      if(c) c.innerHTML=""; }catch(e){}
    if (R.fx.length) R.fx.splice(0).forEach(f => { if (f.t === "trail") R.presented.add(trailKey(f)); });
    if (fxGuard) { clearTimeout(fxGuard); fxGuard = null; }
    fxBusy = false; renderPending = false; R.sailing = false; R.travelFrom = null;
  }
  function drainFx() {
    if (!liveG) { R.fx.length = 0; return; }
    if (REDUCED) {   // no animation: everything is simply already there
      // redraw only when something was drained: renderLive() ends by calling drainFx()
      // again, and an unconditional redraw here recursed until the stack ran out
      const drained = R.fx.splice(0);
      drained.forEach(f => { if (f.t === "trail") R.presented.add(trailKey(f)); });
      if (drained.length) renderNow();
      return;
    }
    if (fxBusy) return;
    const f = R.fx.shift();
    if (!f) return;
    fxBusy = true;
    // WATCHDOG: this flag gates the whole game's event queue. If playFx ever fails to
    // call done(), a throw inside a callback, an animation that never fires, the game
    // must not hang. Unstick and carry on.
    if (fxGuard) clearTimeout(fxGuard);
    // (the Merchant's voyage is longer and carries its own hard cap, window.__pdxMerchantTrip)
    fxGuard = setTimeout(() => { fxGuard = null; if (fxBusy && !window.__pdxTripBusy) { fxBusy = false; drainFx(); } }, 6000);
    const done = ms => setTimeout(() => {
      if (fxGuard) { clearTimeout(fxGuard); fxGuard = null; }
      fxBusy = false;
      if (renderPending) { renderPending = false; renderNow(); }
      drainFx();
    }, ms);
    try {
      playFx(f, done);
    } catch (e) { fxBusy = false; }
  }
  function sharkBite(c, seat) {
    // the paradox is a SHARK, it strikes the boat that suffered, wherever it floats
    const svg = fxG || liveG; if (!svg || !POS[c]) return;
    let tx = POS[c][0] + islR(c) * .6, ty = POS[c][1] - islR(c) * .35;
    const fg = seat && liveG && liveG.querySelector(`.sea-fixg[data-seat="${seat}"] > g`);
    if (fg) { const mm = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(fg.getAttribute("transform") || ""); if (mm) { tx = +mm[1]; ty = +mm[2]; } }
    const a = -0.6, sx0 = tx + Math.cos(a) * 54, sy0 = ty + Math.sin(a) * 54;
    const bx2 = tx + Math.cos(a) * 8, by2 = ty + Math.sin(a) * 8;
    const g = document.createElementNS(NS, "g");
    g.innerHTML = sharkBody(1.15);
    g.setAttribute("transform", `translate(${sx0} ${sy0}) rotate(${(a * 180 / Math.PI + 180).toFixed(0)})`);
    svg.appendChild(g);
    g.animate([{ transform: `translate(${sx0}px,${sy0}px) rotate(${(a * 180 / Math.PI + 180).toFixed(0)}deg)` },
               { transform: `translate(${bx2}px,${by2}px) rotate(${(a * 180 / Math.PI + 180).toFixed(0)}deg)` }],
      { duration: 320, easing: "cubic-bezier(.4,0,.9,.5)", fill: "forwards" });
    setTimeout(() => {   // THE CHOMP: jaws close twice at the waterline
      const jaw = document.createElementNS(NS, "g");
      jaw.innerHTML = `<g class="sea-jaw-t"><path d="M -9 -7 L -5 -1.5 L -2 -7 L 1 -1.5 L 4 -7 L 8 -1.5 L 8 -8 L -9 -8 Z" fill="#e8f0f2" stroke="#16222a" stroke-width=".8"/></g>
        <g class="sea-jaw-b"><path d="M -9 7 L -5 1.5 L -2 7 L 1 1.5 L 4 7 L 8 1.5 L 8 8 L -9 8 Z" fill="#e8f0f2" stroke="#16222a" stroke-width=".8"/></g>`;
      jaw.setAttribute("transform", `translate(${bx2} ${by2}) rotate(${(a * 180 / Math.PI).toFixed(0)})`);
      svg.appendChild(jaw);
      const jt = jaw.querySelector(".sea-jaw-t"), jb = jaw.querySelector(".sea-jaw-b");
      for (const [el, dy] of [[jt, -6], [jb, 6]]) {
        el.style.transformBox = "fill-box"; el.style.transformOrigin = "center";
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }, { transform: `translateY(${dy * .7}px)` }, { transform: "translateY(0)" }, { transform: `translateY(${dy}px)`, opacity: 0 }],
          { duration: 620, easing: "ease-in-out", fill: "forwards" });
      }
      snd("crack");
      for (let i = 0; i < 6; i++) {   // splash
        const dr = document.createElementNS(NS, "circle");
        const aa = a + (Math.random() - .5) * 1.6, sp = 10 + Math.random() * 16;
        dr.setAttribute("cx", bx2); dr.setAttribute("cy", by2); dr.setAttribute("r", (1 + Math.random() * 1.6).toFixed(1)); dr.setAttribute("fill", "#eaf4f6");
        svg.appendChild(dr);
        dr.animate([{ transform: "translate(0,0)", opacity: .95 }, { transform: `translate(${(Math.cos(aa) * sp).toFixed(0)}px,${(Math.sin(aa) * sp - 8).toFixed(0)}px)`, opacity: 0 }],
          { duration: 480 + Math.random() * 220, easing: "ease-out" }).onfinish = () => dr.remove();
      }
      const boat = seat && liveG && liveG.querySelector(`.sea-fixg[data-seat="${seat}"] .sea-fix-boat`);
      if (boat && boat.animate) boat.animate([{ transform: "rotate(0)" }, { transform: "rotate(-11deg) translateY(-2px)" }, { transform: "rotate(8deg)" }, { transform: "rotate(0)" }], { duration: 460, easing: "ease-out" });
      setTimeout(() => { jaw.remove(); g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: "forwards" }).onfinish = () => g.remove(); }, 700);
    }, 330);
  }
  function playFx(f, done) {
    {
      {
        if (f.t === "trail") {
          R.presented.add(trailKey(f));
          R.shown[f.seat] = -1;              // the anchored boat yields to the SAILING one
          renderNow();
          const el = liveG.querySelector(`path[data-k="${trailKey(f)}"]`);
          let dur = 1100;
          if (el) {
            const L = el.getTotalLength();
            dur = Math.min(2600, 850 + L * 3.4) * (window.__pdxPace ? window.__pdxPace(1) : 1);   // a voyage is an EVENT; the Pace setting stretches it
            snd("quill", { dur }); snd("sea_sail", { dur });
            el.style.strokeDasharray = L;
            el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
              { duration: dur, easing: "cubic-bezier(.35,.1,.35,1)" }).onfinish = () => { el.style.strokeDasharray = ""; };
            sailBoat(el, dur, seatColor(f.seat), seatRig(f.seat));
          }
          setTimeout(() => {   // landfall: the boat drops anchor, splash, stamp
            R.shown[f.seat] = f.to;
            (R.pend || (R.pend = {}))[f.seat] = { c: f.to, t: performance.now() };
            renderNow();
            if (POS[f.to]) { ripple(POS[f.to][0], POS[f.to][1], seatColor(f.seat)); popIsle(f.to); snd("chart_splash"); }
            try { window.__fxLanded && window.__fxLanded(f.seat, f.to); } catch (e) {}   // landfall (fx.js: the immunity spent)
            const fixg = [...liveG.querySelectorAll(`.sea-fixg[data-seat="${f.seat}"] .sea-fix-boat`)].pop();
            if (fixg) fixg.animate([
              { transform: "scale(1.9) rotate(-10deg)", opacity: .2 }, { transform: "scale(1) rotate(0)", opacity: 1 }
            ], { duration: 420, easing: "cubic-bezier(.2,1.4,.4,1)" });
            setTimeout(() => snd("chart_stamp"), 200);
          }, Math.max(0, dur - 60));
          done(dur + 650);
          return;
        }
        if (f.t === "monster") {
          snd("sea_monster");   // something vast beneath the water, the self-hit alarm stays in game.js
          setTimeout(() => snd("chart_splash"), 260);
          sharkBite(f.c, f.seat);
          const el = liveG.querySelector(`.sea-scar[data-mc="${f.c}"]`);
          if (el) el.animate([{ opacity: 0, transform: el.getAttribute("transform") + " scale(1.6)" },
            { opacity: .5, transform: el.getAttribute("transform") }],
            { duration: 700, easing: "ease-out" });
          const isle = document.querySelector(`.sea-isle[data-c="${f.c}"]`);
          if (isle) isle.animate([
            { transform: "translate(0,0)" }, { transform: "translate(-2.5px,1.5px)" },
            { transform: "translate(2px,-1px)" }, { transform: "translate(0,0)" }
          ], { duration: 300, easing: "ease-out" });
          ripple(POS[f.c][0] + 30, POS[f.c][1] - 20, "#3a5a52");
          setTimeout(() => floatText(POS[f.c][0], POS[f.c][1] - 28, "−" + (f.d || 1), "#8c2a1a"), 640);
          done(1650); return;
        }
        if (f.t === "flash") {
          const [x, y] = POS[f.c];
          const fl = document.createElementNS(NS, "circle");
          fl.setAttribute("cx", x); fl.setAttribute("cy", y); fl.setAttribute("r", 42);
          fl.setAttribute("fill", "#fff"); liveG.appendChild(fl);
          fl.animate([{ opacity: .9 }, { opacity: 0 }], { duration: 300, easing: "ease-out" }).onfinish = () => fl.remove();
          const cl = document.createElementNS(NS, "g");
          cl.setAttribute("transform", `translate(${x} ${y - 44})`);
          cl.innerHTML = `<path d="M -18 6 q -6 -11 6 -13 q 2 -9 13 -7 q 11 -6 18 2 q 11 -1 9 9 q 6 9 -6 11 z" fill="#3a3f4a"/>
            <path d="M -8 12 l -5 9 M 2 12 l -5 9 M 12 12 l -5 9" stroke="#8a9aa5" stroke-width="1.4" opacity=".8"/>`;
          liveG.appendChild(cl);
          snd("sea_storm");
          cl.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }],
            { duration: 1600, easing: "ease-out" }).onfinish = () => cl.remove();
          const bolt = document.createElementNS(NS, "path");
          bolt.setAttribute("d", `M ${x - 2} ${y - 30} l -7 14 l 7 -3 l -6 13`);
          bolt.setAttribute("stroke", "#ffe9b0"); bolt.setAttribute("stroke-width", "2.4");
          bolt.setAttribute("fill", "none"); bolt.setAttribute("stroke-linejoin", "round");
          liveG.appendChild(bolt);
          bolt.animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: .2, offset: .3 },
            { opacity: 1, offset: .42 }, { opacity: 0 }],
            { duration: 700, easing: "ease-out" }).onfinish = () => bolt.remove();
          const cp2 = document.querySelector(".cplot");
          if (cp2) cp2.animate([
            { transform: "translate(0,0)" }, { transform: "translate(-3px,2px)" },
            { transform: "translate(2.5px,-2px)" }, { transform: "translate(0,0)" }
          ], { duration: 240, easing: "ease-out" });
          setTimeout(() => floatText(x, y - 30, "−2", "#8c2a1a"), 380);
          done(1750); return;
        }
        if (f.t === "wreck") {
          snd("chart_creak");
          const el = liveG.querySelector(`.sea-wreck[data-wc="${f.c}"] .wk-in`);
          if (el) el.animate([{ opacity: 0, transform: "translateY(-8px) rotate(6deg)" },
            { opacity: 1, transform: "translateY(0) rotate(0)" }], { duration: 1150, easing: "ease-in" });
          const wk = [...R.wrecks].reverse().find(w => w.c === f.c);
          if (wk) for (let b = 0; b < 3; b++) {
            const bub = document.createElementNS(NS, "circle");
            bub.setAttribute("cx", wk.spot[0] + 4 + b * 5); bub.setAttribute("cy", wk.spot[1] + 4);
            bub.setAttribute("r", 2.2 - b * .5); bub.setAttribute("fill", "none");
            bub.setAttribute("stroke", "#8a9aa5"); bub.setAttribute("stroke-width", "1");
            liveG.appendChild(bub);
            bub.animate([{ transform: "translateY(0)", opacity: 0 },
              { transform: "translateY(-7px)", opacity: .8, offset: .4 },
              { transform: "translateY(-16px)", opacity: 0 }],
              { duration: 900, delay: 500 + b * 260, easing: "ease-out" }).onfinish = () => bub.remove();
          }
          done(1900); return;
        }
        if (f.t === "restore") {
          snd("chart_bell", { warm: true }); setTimeout(() => snd("sea_treasure"), 350);
          const el = liveG.querySelector(`.sea-restored[data-rc="${f.c}"]`);
          if (el) el.animate([{ transform: "scale(1.6)", opacity: 0 },
            { transform: "scale(1)", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" });
          if (POS[f.c]) {
            const [rx2, ry2] = POS[f.c];
            for (let i = 0; i < 8; i++) {
              const a = i / 8 * Math.PI * 2, ln = document.createElementNS(NS, "line");
              ln.setAttribute("x1", rx2 + Math.cos(a) * 30); ln.setAttribute("y1", ry2 + Math.sin(a) * 23);
              ln.setAttribute("x2", rx2 + Math.cos(a) * 46); ln.setAttribute("y2", ry2 + Math.sin(a) * 34);
              ln.setAttribute("stroke", "#b8862a"); ln.setAttribute("stroke-width", "2"); ln.setAttribute("stroke-linecap", "round");
              liveG.appendChild(ln);
              ln.animate([{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }],
                { duration: 900, delay: i * 40, easing: "ease-out" }).onfinish = () => ln.remove();
            }
          }
          done(1100); return;
        }
        if (f.t === "sail") {
          const sl = liveG.querySelector(".sea-shipg .sh-slide");
          if (sl) sl.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }],
            { duration: 700, easing: "cubic-bezier(.3,1.4,.4,1)" });
          const mc2 = app.view.merchant_century;
          if (POS[mc2]) floatText(POS[mc2][0], POS[mc2][1] - 66, "+1 sail", "#b8862a");
          if (POS[f.c]) { popIsle(f.c); ripple(POS[f.c][0], POS[f.c][1], "#b8862a"); }
          snd("chart_bell"); setTimeout(() => snd("chart_creak"), 320);
          done(1150); return;
        }
        if (f.t === "respawn") {
          const c = centuryOf(f.seat);
          if (c) R.shown[f.seat] = c;
          if (c && POS[c]) {
            ripple(POS[c][0], POS[c][1], seatColor(f.seat)); popIsle(c); snd("chart_splash");
            setTimeout(() => floatText(POS[c][0], POS[c][1] - 30, "returned", seatColor(f.seat)), 300);
          }
          done(950); return;
        }
        if (f.t === "ship") {
          // THE VOYAGE, TOLD (window.__pdxMerchantTrip): the roll, the hops with a count,
          // the chased traveller ringed, the STOP mark and why; the queue waits for it.
          const p = f.p || R.merchantLast || {};
          const to = p.to != null ? p.to : app.view.merchant_century;
          const from = p.from != null ? p.from : R.prevShip;
          if (from != null && from !== to && POS[from] && POS[to] && __live()) {
            R.merchantShown = from;   // HOLD the barge at the old port, no teleport
            renderNow();
            const piece = liveG.querySelector(".sea-shipg.pc-merch-live");
            snd("chart_creak");
            window.__pdxMerchantTrip({ layer: fxG || liveG, piece, pos: c2 => POS[c2] || null,
              m0: seaMerchAt(from), anchor: c2 => (POS[c2] ? seaMerchAt(c2) : null), cdy: 13, stopDy: 58, p, W, H, dark: false,
              tpos: (p.target && R.pcPos && R.pcPos[p.target]) || null,
              onLand: () => { R.merchantShown = to; R.prevShip = to; R.mPend = { c: to, t: performance.now() }; renderNow(); snd("chart_bell"); },
              onDone: () => done(60) });
            return;
          }
          window.__pdxTripPending = false;
          R.prevShip = to; R.merchantShown = to;
        }
      }
    }
    done(60);
  }
  function sailBoat(pathEl, dur, col, rig) {
    // the boat itself sails the plotted course; the ink line rises in its wake
    try {
      const b = document.createElementNS(NS, "g");
      b.innerHTML = `<g transform="scale(1.6)">${rigSVG(0, col, {})}</g>`;
      b.style.offsetPath = `path("${pathEl.getAttribute("d")}")`;
      b.style.offsetRotate = "0deg";
      (fxG || liveG).appendChild(b);
      b.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }],
        { duration: dur, easing: "cubic-bezier(.35,.1,.35,1)" }).onfinish = () => b.remove();
    } catch (e) {}
  }
  function floatText(x, y, txt, col) {
    if (REDUCED || !liveG) return;
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-family", "Georgia"); t.setAttribute("font-weight", "bold");
    t.setAttribute("font-style", "italic"); t.setAttribute("font-size", "18");
    t.setAttribute("fill", col);
    t.setAttribute("stroke", "rgba(255,246,220,.85)"); t.setAttribute("stroke-width", "3.5");
    t.setAttribute("paint-order", "stroke");
    t.style.transformBox = "fill-box"; t.style.transformOrigin = "center";
    t.textContent = txt;
    liveG.appendChild(t);
    t.animate([
      { transform: "translateY(6px) scale(.6)", opacity: 0 },
      { transform: "translateY(-4px) scale(1.15)", opacity: 1, offset: .3 },
      { transform: "translateY(-30px) scale(1)", opacity: 0 },
    ], { duration: 1100, easing: "cubic-bezier(.2,.8,.4,1)" }).onfinish = () => t.remove();
  }
  function ripple(x, y, col) {
    for (const [delay, r0] of [[0, 6], [140, 4]]) {
      const rp = document.createElementNS(NS, "circle");
      rp.setAttribute("cx", x); rp.setAttribute("cy", y); rp.setAttribute("r", r0);
      rp.setAttribute("fill", "none"); rp.setAttribute("stroke", col); rp.setAttribute("stroke-width", "1.6");
      liveG.appendChild(rp);
      rp.animate([{ opacity: .6 }, { opacity: 0 }], { duration: 700, delay, easing: "ease-out" }).onfinish = () => rp.remove();
      rp.animate([{ r: r0 }, { r: r0 + 22 }], { duration: 700, delay, easing: "ease-out" });
    }
  }

  /* ═══ MOUNT ═══ */
  let liveG = null, fxG = null, topG = null, baseCache = null, liveTimer = null;
  let __dirty = false;
  function __live() { const r = document.getElementById("timeline-rail");
    return !!r && (!r.classList.contains("skin-sing") && !r.classList.contains("skin-ori")); }
  function scheduleLive() {
    if (liveTimer) return;
    liveTimer = setTimeout(() => { liveTimer = null; renderLive(); }, 120);
  }
  function renderNow() {
    if (liveTimer) { clearTimeout(liveTimer); liveTimer = null; }
    renderLive(true);
  }
  function renderLive(force) {
    // PERF: all three timeline skins live in the DOM at once, and all three ran
    // this on every state tick, including the two you cannot see. The CPU profile
    // caught them: 21.9 + 15.8 + 14.9 ms of self-time, on maps nobody is looking at.
    // Skip the work while we are not the skin on screen; remember we fell behind and
    // catch up the instant we become visible (SEA).
    if (!__live()) { __dirty = true; __flushFxSilently(); return; }
    if (__dirty) { __dirty = false; force = true; }
    if (!liveG || !liveG.isConnected) return;
    // A re-render rebuilds the live layer and KILLS any playing animation mid-flight
    // (the teleporting-barge bug). While the theater plays, renders wait their turn.
    if (fxBusy && !force) { renderPending = true; return; }
    // idle = truth: displayed positions resync to the engine between presentations
    if (!fxBusy && !R.sailing && R.fx.length === 0 && app && app.view)
      app.view.travelers.forEach(t => {
        if (t.is_self && R.pendingSelf != null) {          // just made an optimistic landfall
          if (t.century === R.pendingSelf) R.pendingSelf = null;   // server confirmed
          else return;                                     // hold the boat at destination
        }
        // ONE JOURNEY, PLAYED ONCE: a piece that just landed holds its new berth until the
        // state catches up (the event plays before the state arrives; syncing to the stale
        // century sent it back, and the state then jumped it forward again)
        const pd = R.pend && R.pend[t.name];
        if (pd) { if (t.century === pd.c || performance.now() - pd.t > 20000) delete R.pend[t.name]; else return; }
        R.shown[t.name] = t.century;
      });
    if (R.mPend && app && app.view && (app.view.merchant_century === R.mPend.c || performance.now() - R.mPend.t > 20000)) R.mPend = null;
    if (!fxBusy && R.fx.length === 0 && app && app.view && !R.mPend) R.merchantShown = app.view.merchant_century;
    // THE LIVE LAYER IS REWRITTEN ONLY WHEN IT CHANGED. The 300ms poll below calls this
    // forever, and it used to rebuild the whole layer every time: a style, layout, paint
    // and tile raster of the chart three times a second on a table where nothing moved.
    const liveHTML = liveLayer() + highlights();
    const liveSame = !force && liveG.__pdxHTML === liveHTML;
    if (!liveSame) { liveG.innerHTML = liveHTML; liveG.__pdxHTML = liveHTML; phoneTabsDodge();
      // a phone: the pieces stand above everything on the chart (lit ports and tags included)
      if (PHONE()) for (const n of liveG.querySelectorAll(":scope > .pc-ph")) liveG.appendChild(n); }
    if (!liveSame && R.ordFlip && R.ordFlip.prev && !REDUCED) {   // the slate re-orders with a slide
      const { prev, next } = R.ordFlip;
      liveG.querySelectorAll("[data-ordrow]").forEach(row => {
        const s = row.getAttribute("data-ordrow");
        if (prev[s] == null || prev[s] === next[s]) return;
        const dy = (prev[s] - next[s]) * 30;
        row.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
          { duration: 520, easing: "cubic-bezier(.3,1.1,.4,1)" });
        if (next[s] < prev[s]) {   // climbed, a brief gilt flash
          const bar = row.querySelector("rect");
          if (bar) bar.animate([{ fill: "rgba(201,164,92,.5)" }, { fill: "rgba(233,220,184,.06)" }],
            { duration: 900, easing: "ease-out" });
        }
      });
    }
    R.ordFlip = null;
    if (topG && !liveSame) {   // the Sailing Order rides ABOVE every object (opaque, never see-through)
      topG.replaceChildren();
      const ord = liveG.querySelector(".sea-ord");
      if (ord) topG.appendChild(ord);
    }
    const svgEl = document.querySelector(".pc-world");
    if (svgEl && app && app.view)   // someone nears Year Zero -> the whole sea tenses
      svgEl.classList.toggle("sea-endgame",
        app.view.travelers.some(t => t.century <= 5 && !(t.statuses || []).includes("terminated")));
    const cmd = document.querySelector(".sea-cmd");
    if (cmd) {
      const t = commandText();
      if (cmd.__pdxHTML !== t) { cmd.innerHTML = t; cmd.__pdxHTML = t; }
      cmd.classList.toggle("on", !!t);
    }
    const hourEl = document.querySelector(".sea-hour");
    if (hourEl && app && app.view) { const ht = `TUESDAY 31 DEC 2999 · HOUR ${app.view.hour}`; if (hourEl.textContent !== ht) hourEl.textContent = ht; }
    for (const c of [10, 20]) {
      const pipG = document.querySelector(`.sea-pips[data-c="${c}"]`);
      if (!pipG || !app || !app.view) continue;
      let pips = "";
      app.view.travelers.forEach((t, i) => {
        const claimed = c === 10 ? t.scored_century_x : t.scored_century_xx;
        if (claimed) pips += `<circle cx="${i * 8 - 4}" cy="37" r="3" fill="${seatColor(t.name)}" stroke="#2a1c0c" stroke-width=".6"/>`;
      });
      if (pipG.__pdxHTML !== pips) { pipG.innerHTML = pips; pipG.__pdxHTML = pips; }
    }
    const well = document.querySelector(".sea-well");
    if (well) well.classList.toggle("well-reach", !!(mode && mode.kind === "travel" && mode.self <= mode.max && mode.locked !== 1));
    applyFocus();
    drainFx();
  }
  function mount() {
    const rail = document.getElementById("timeline-rail");
    if (!rail) return false;
    if (rail.querySelector(".cplot")) return true;
    if (!baseCache) {
      // the chart FILLS its frame: derive W from the rail's real aspect (no side void)
      const rb = rail.getBoundingClientRect();
      const bw = rb.width - 6, bh = rb.height - 74;   // .cplot insets (74px top, 6px left)
      if (!PHONE() && (bw < 60 || bh < 60)) return false;   // rail not laid out yet, retry (a phone composes from the stage, built ahead while its page is hidden)
      if (PHONE()) { const d = PH.dims(); W = d.W; H = d.H; } else W = Math.max(700, Math.min(1200, Math.round(H * bw / bh)));
      baseCache = baseMap();
      if (baseCache.violations.length) console.warn("SEA AUDIT VIOLATIONS:", baseCache.violations);
    }
    const base = baseCache;
    rail.insertAdjacentHTML("beforeend", `
      <div class="cplot">
        <svg class="pc-world" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <defs>${base.defs}</defs>
          <g>${base.out}</g>
          <!-- THE PARCHMENT TOOTH, BAKED. This used to be filter=url(#seaRough) wrapped
               around the ENTIRE 832x1000 chart: a live feTurbulence + feComposite + feBlend.
               The texture never changes - but a live SVG filter is re-evaluated on every
               repaint of what it wraps, and the sixteen sharks animate offset-distance
               (a PAINT property), so the chart repainted every frame and the whole filter
               chain ran with it, sixty times a second, over 832,000 pixels.
               MEASURED in Firefox on my RTX at 165Hz:
                   the Sea, frozen solid ................  55 fps
                   the Sea, frozen, filters off ......... 164 fps    <- ONE filter: 109 fps
                   the Sea as he plays it ...............  27 fps
               It is a static texture, so it is now a static IMAGE: rasterised once by the
               browser and cached forever, instead of recomputed every frame. Same tooth. -->
          <image href="${ROUGH_TEX}" x="0" y="0" width="${W}" height="${H}"
                 preserveAspectRatio="none" opacity=".55" style="pointer-events:none"/>
          <g class="sea-live"></g>
          <g class="sea-fx"></g>
          <g class="sea-top"></g>
        </svg>
        <div class="sea-cmd"></div>
      </div>`);
    if (!PHONE()) window.__pdxSheetExt(rail.querySelector(".cplot"), W, H, seaExtArt);
    liveG = rail.querySelector(".sea-live");
    fxG = rail.querySelector(".sea-fx");
    topG = rail.querySelector(".sea-top");
    rail.querySelector(".sea-cmd").addEventListener("click", e => {
      if (!e.target.closest(".sea-anchor") || !mode || mode.kind !== "travel" || !app.pendingReq) return;
      snd("chart_stamp");
      app.respond({ direction: 1, distance: 0 });
      mode = null; scheduleLive();
    });
    rail.querySelector(".pc-world").addEventListener("click", e => {
      const kp = e.target.closest(".sea-key-pin");
      if (kp) {
        const kg = kp.closest(".sea-key");
        kg.classList.toggle("folded");
        try { localStorage.setItem("seaKeyOpen", kg.classList.contains("folded") ? "0" : "1"); } catch (err) {}
        snd("chart_stamp");
        return;
      }
      const t = e.target.closest(".sea-hit, .sea-glow, .sea-cost");
      if (!t) return;
      const c = t.classList.contains("sea-hit") ? +t.dataset.c : nearestIsland(e);
      if (c !== null && c !== undefined && !isNaN(c)) onIslandClick(c);
    });
    function nearestIsland(e) {
      const svg = rail.querySelector(".pc-world");
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      let best = null, bd = 1e9;
      for (let c = 1; c <= 30; c++) {
        const d = Math.hypot(x - POS[c][0], y - POS[c][1]);
        if (d < bd) { bd = d; best = c; }
      }
      return bd < 54 ? best : null;
    }
    /* ── the surveyor's slip: instant, in-fiction hover info (glance -> hover) ── */
    const tipEl = document.createElement("div");
    tipEl.className = "sea-tip";
    rail.querySelector(".cplot").appendChild(tipEl);
    // (the old hover cards on islands, posts, lights and scenery are gone: the only map
    //  tips now are the deliberate ones on travellers and the haven, see mousemove below)
    const world2 = rail.querySelector(".pc-world");
    world2.addEventListener("mousemove", e => {
      if (!__live()) return;   // ...and the Sea, when it is not the chart on screen
      // ONE TOOLTIP, AND ONLY ON PURPOSE: a tip opens only after the pointer rests ~600 ms
      // on a traveller or the secret haven, closes the moment it leaves, and never while
      // dice are placed, a voyage is chosen, a button is held or the chart is animating.
      // (The Merchant's own readout opens the same way, app.css .pc-mhud.)
      mount._tipXY = [e.clientX, e.clientY];
      const pc = e.target.closest("[data-seat][data-tip], .sea-cove");
      const key = pc ? (pc.dataset.seat || "cove") : null;
      const quiet = !pc || fxBusy || R.sailing || R.fx.length || mode || e.buttons
        || document.body.classList.contains("allocating") || document.body.classList.contains("pc-mtrip");
      if (quiet) { clearTimeout(mount._tipT); mount._tipKey = null; tipEl.classList.remove("on"); }
      else if (key !== mount._tipKey) {
        mount._tipKey = key; tipEl.classList.remove("on"); clearTimeout(mount._tipT);
        mount._tipT = setTimeout(() => {
          if (mount._tipKey !== key) return;
          const el3 = key === "cove" ? liveG && liveG.querySelector(".sea-cove") : liveG && liveG.querySelector(`.sea-fixg[data-seat="${CSS.escape(key)}"]`);
          if (!el3 || !el3.dataset.tip) return;
          tipEl.innerHTML = esc(el3.dataset.tip);
          tipEl.classList.remove("tip-wide");
          tipEl.classList.add("on");
          const [mx2, my2] = mount._tipXY;
          const box = rail.querySelector(".cplot").getBoundingClientRect();
          const fit = window.__pdxFit || 1;   // .cplot is inside the fit-scaled plane; offsetW/H are plane px
          const localW = box.width / fit, localH = box.height / fit;
          let tx = (mx2 - box.left) / fit + 14, ty = (my2 - box.top) / fit + 12;
          tipEl.style.left = "0px"; tipEl.style.top = "0px";   // measure at natural size
          const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
          if (tx + tw > localW - 8) tx = (mx2 - box.left) / fit - tw - 12;
          if (ty + th > localH - 8) ty = (my2 - box.top) / fit - th - 10;
          tipEl.style.left = tx + "px"; tipEl.style.top = ty + "px";
        }, 600);
      }
      // hovering a reachable island PREVIEWS the course before you commit
      let pv = null;
      if (mode && mode.kind === "travel") {
        const el2 = e.target.closest(".sea-isle, .sea-hit, .sea-glow, .sea-cost");
        if (el2) {
          const c2 = el2.dataset && el2.dataset.c !== undefined ? +el2.dataset.c : nearestIsland(e);
          const cands = pickCandidates();
          if (c2 && c2 !== mode.self && cands && cands.has(c2)) pv = c2;
        }
      }
      setPreview(pv);
      const hl = e.target.closest("[data-hlseat]");
      const hlSeat = hl ? hl.getAttribute("data-hlseat") : null;
      if (hlSeat !== mount._hl) {
        mount._hl = hlSeat;
        liveG && liveG.querySelectorAll(".sea-fixg").forEach(n =>
          n.classList.toggle("sea-hl", n.dataset.seat === hlSeat));
      }
      const oh = !!e.target.closest(".sea-ord");
      if (oh !== ordHovered) {
        ordHovered = oh;
        const ordEl = document.querySelector(".sea-ord");
        if (ordEl) ordEl.classList.toggle("open", oh);
      }
    });
    world2.addEventListener("mouseleave", () => { clearTimeout(mount._tipT); mount._tipKey = null; tipEl.classList.remove("on"); setPreview(null); ordHovered = false; const oe = document.querySelector(".sea-ord"); if (oe) oe.classList.remove("open"); });
    world2.addEventListener("mousedown", () => { clearTimeout(mount._tipT); mount._tipKey = null; tipEl.classList.remove("on"); });
    renderLive();
    return true;
  }
  function rehome() {
    // re-seat monsters/wrecks in clear water after a re-layout
    R.taken.length = 0;
    for (const mo of R.monsters) if (POS[mo.c])
      mo.spot = seaSpot(POS[mo.c][0] + islR(mo.c) + 18, POS[mo.c][1] - islR(mo.c) * .6 - 16, META[mo.c].id, R.taken);
    for (const wk of R.wrecks) if (POS[wk.c])
      wk.spot = seaSpot(POS[wk.c][0] - islR(wk.c) - 18, POS[wk.c][1] + islR(wk.c) * .6 + 16, META[wk.c].id, R.taken);
  }
  let rzT = null;
  const seaRelayout = () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      const rail = document.getElementById("timeline-rail");
      const cp = rail && rail.querySelector(".cplot");
      if (!cp) return;
      const box = cp.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const want = PHONE() ? PH.dims().W : Math.max(700, Math.min(1200, Math.round(H * box.width / box.height)));
      if (Math.abs(want - W) < 12) return;   // the chart must FILL its frame, tiny drifts only
      cp.remove(); baseCache = null; liveG = null;
      if (mount()) { rehome(); renderNow(); if (PHONE()) PH.remounted(); }
    }, 350);
  };
  window.addEventListener("resize", seaRelayout);
  // the rail itself resizes without a window resize (cabin toggle recomposes scenes)
  if (window.ResizeObserver) {
    const railEl = document.getElementById("timeline-rail");
    if (railEl) new ResizeObserver(seaRelayout).observe(railEl);
  }

  const style = document.createElement("style");
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      .sea-waves.w1 { animation: seaDriftA 12s linear infinite; }
      .sea-waves.w2 { animation: seaDriftB 19s linear infinite; }
      .sea-fog { animation: seaFog 7s ease-in-out infinite alternate; }
      .sea-fog.f2 { animation-duration: 9.5s; animation-direction: alternate-reverse; }
      .sea-glint { animation: seaGlint 2.6s ease-in-out infinite; }
      .sea-glint.g2 { animation-delay: 1.2s; }
      .sea-skulleye { animation: seaGlint 4.8s ease-in-out infinite; }
      .sea-skulleye.e2 { animation-delay: 2.1s; }
    }
    .sea-shark { transform-box: view-box; }
    @media (prefers-reduced-motion: no-preference) {
      .sea-shark { animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
      .sea-shark.cw  { animation-name: seaSharkOrbitCW; }
      .sea-shark.ccw { animation-name: seaSharkOrbitCCW; }
      .sea-shark .flip { transform-box: fill-box; transform-origin: center; animation-duration: var(--t2); animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-delay: inherit; }
      .sea-shark.cw .flip { animation-name: seaSharkFaceCW; }
      .sea-shark.ccw .flip { animation-name: seaSharkFaceCCW; }
    }
    @keyframes seaSharkOrbitCW { 0% { transform: translate(calc(var(--r) * 1.0000px), calc(var(--ry) * 0.0000px)); } 4.167% { transform: translate(calc(var(--r) * 0.9659px), calc(var(--ry) * 0.2588px)); } 8.333% { transform: translate(calc(var(--r) * 0.8660px), calc(var(--ry) * 0.5000px)); } 12.5% { transform: translate(calc(var(--r) * 0.7071px), calc(var(--ry) * 0.7071px)); } 16.67% { transform: translate(calc(var(--r) * 0.5000px), calc(var(--ry) * 0.8660px)); } 20.83% { transform: translate(calc(var(--r) * 0.2588px), calc(var(--ry) * 0.9659px)); } 25% { transform: translate(calc(var(--r) * 0.0000px), calc(var(--ry) * 1.0000px)); } 29.17% { transform: translate(calc(var(--r) * -0.2588px), calc(var(--ry) * 0.9659px)); } 33.33% { transform: translate(calc(var(--r) * -0.5000px), calc(var(--ry) * 0.8660px)); } 37.5% { transform: translate(calc(var(--r) * -0.7071px), calc(var(--ry) * 0.7071px)); } 41.67% { transform: translate(calc(var(--r) * -0.8660px), calc(var(--ry) * 0.5000px)); } 45.83% { transform: translate(calc(var(--r) * -0.9659px), calc(var(--ry) * 0.2588px)); } 50% { transform: translate(calc(var(--r) * -1.0000px), calc(var(--ry) * 0.0000px)); } 54.17% { transform: translate(calc(var(--r) * -0.9659px), calc(var(--ry) * -0.2588px)); } 58.33% { transform: translate(calc(var(--r) * -0.8660px), calc(var(--ry) * -0.5000px)); } 62.5% { transform: translate(calc(var(--r) * -0.7071px), calc(var(--ry) * -0.7071px)); } 66.67% { transform: translate(calc(var(--r) * -0.5000px), calc(var(--ry) * -0.8660px)); } 70.83% { transform: translate(calc(var(--r) * -0.2588px), calc(var(--ry) * -0.9659px)); } 75% { transform: translate(calc(var(--r) * -0.0000px), calc(var(--ry) * -1.0000px)); } 79.17% { transform: translate(calc(var(--r) * 0.2588px), calc(var(--ry) * -0.9659px)); } 83.33% { transform: translate(calc(var(--r) * 0.5000px), calc(var(--ry) * -0.8660px)); } 87.5% { transform: translate(calc(var(--r) * 0.7071px), calc(var(--ry) * -0.7071px)); } 91.67% { transform: translate(calc(var(--r) * 0.8660px), calc(var(--ry) * -0.5000px)); } 95.83% { transform: translate(calc(var(--r) * 0.9659px), calc(var(--ry) * -0.2588px)); } 100% { transform: translate(calc(var(--r) * 1.0000px), calc(var(--ry) * -0.0000px)); } }
    @keyframes seaSharkOrbitCCW { 0% { transform: translate(calc(var(--r) * 1.0000px), calc(var(--ry) * -0.0000px)); } 4.167% { transform: translate(calc(var(--r) * 0.9659px), calc(var(--ry) * -0.2588px)); } 8.333% { transform: translate(calc(var(--r) * 0.8660px), calc(var(--ry) * -0.5000px)); } 12.5% { transform: translate(calc(var(--r) * 0.7071px), calc(var(--ry) * -0.7071px)); } 16.67% { transform: translate(calc(var(--r) * 0.5000px), calc(var(--ry) * -0.8660px)); } 20.83% { transform: translate(calc(var(--r) * 0.2588px), calc(var(--ry) * -0.9659px)); } 25% { transform: translate(calc(var(--r) * 0.0000px), calc(var(--ry) * -1.0000px)); } 29.17% { transform: translate(calc(var(--r) * -0.2588px), calc(var(--ry) * -0.9659px)); } 33.33% { transform: translate(calc(var(--r) * -0.5000px), calc(var(--ry) * -0.8660px)); } 37.5% { transform: translate(calc(var(--r) * -0.7071px), calc(var(--ry) * -0.7071px)); } 41.67% { transform: translate(calc(var(--r) * -0.8660px), calc(var(--ry) * -0.5000px)); } 45.83% { transform: translate(calc(var(--r) * -0.9659px), calc(var(--ry) * -0.2588px)); } 50% { transform: translate(calc(var(--r) * -1.0000px), calc(var(--ry) * -0.0000px)); } 54.17% { transform: translate(calc(var(--r) * -0.9659px), calc(var(--ry) * 0.2588px)); } 58.33% { transform: translate(calc(var(--r) * -0.8660px), calc(var(--ry) * 0.5000px)); } 62.5% { transform: translate(calc(var(--r) * -0.7071px), calc(var(--ry) * 0.7071px)); } 66.67% { transform: translate(calc(var(--r) * -0.5000px), calc(var(--ry) * 0.8660px)); } 70.83% { transform: translate(calc(var(--r) * -0.2588px), calc(var(--ry) * 0.9659px)); } 75% { transform: translate(calc(var(--r) * -0.0000px), calc(var(--ry) * 1.0000px)); } 79.17% { transform: translate(calc(var(--r) * 0.2588px), calc(var(--ry) * 0.9659px)); } 83.33% { transform: translate(calc(var(--r) * 0.5000px), calc(var(--ry) * 0.8660px)); } 87.5% { transform: translate(calc(var(--r) * 0.7071px), calc(var(--ry) * 0.7071px)); } 91.67% { transform: translate(calc(var(--r) * 0.8660px), calc(var(--ry) * 0.5000px)); } 95.83% { transform: translate(calc(var(--r) * 0.9659px), calc(var(--ry) * 0.2588px)); } 100% { transform: translate(calc(var(--r) * 1.0000px), calc(var(--ry) * 0.0000px)); } }
    @keyframes seaSharkFaceCW { 0% { transform: scaleX(.06); } 7% { transform: scaleX(-1); } 43% { transform: scaleX(-1); } 50% { transform: scaleX(-.06); } 57% { transform: scaleX(1); } 93% { transform: scaleX(1); } 100% { transform: scaleX(.06); } }
    @keyframes seaSharkFaceCCW { 0% { transform: scaleX(-.06); } 7% { transform: scaleX(1); } 43% { transform: scaleX(1); } 50% { transform: scaleX(.06); } 57% { transform: scaleX(-1); } 93% { transform: scaleX(-1); } 100% { transform: scaleX(-.06); } }
    /* the drift animates the individual translate property, not transform: Chrome hands a
       transform animation on an SVG group to the compositor, and every overlapping wave
       path then became its own layer (468 layers, half the compositor's frame time).
       translate paints on the main thread, and under steps(6) that is one repaint a step. */
    @keyframes seaDriftA { from { translate: 0 0; } to { translate: -48px 0; } }
    @keyframes seaDriftB { from { translate: -48px 0; } to { translate: 0 0; } }
    @keyframes seaFog { from { transform: translateX(-3px); opacity: .42; } to { transform: translateX(4px); opacity: .26; } }
    @keyframes seaGlint { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
  ` + `
    #timeline-rail > :not(.cplot) { display: none !important; }
    #timeline-rail .cplot { pointer-events: auto; }   /* the sea is an instrument, not decoration */
    .sea-cmd { pointer-events: none; }
    .travel-ghost { display: none !important; }   /* the sea presents voyages now */
    .cplot { position: absolute; inset:74px 0 0 6px; }
    .pc-world { width: 100%; height: 100%; display: block;
      filter: drop-shadow(0 10px 26px rgba(0,0,0,.6)); }
    .sea-hit { cursor: pointer; }
    .sea-glow { fill: transparent; stroke-width: 3.4; cursor: pointer; animation: seaglow 1.1s infinite alternate; }
    .sea-cost { cursor: pointer; }
    .glow-go { stroke: #2fae7c; } .glow-cost { stroke: #c9a45c; }
    .glow-risk { stroke: #c0392b; } .glow-amber { stroke: #e0972b; } .glow-violet { stroke: #8f6fd6; }
    @keyframes seaglow { from { opacity: .4; } to { opacity: 1; } }
    .sea-well.well-reach circle { animation: seaglow 1.1s infinite alternate; }
    .sea-isle { transform-box: fill-box; transform-origin: center; transition: opacity .35s ease, transform .18s ease; }
    .mode-pick .sea-isle { opacity: .38; }
    .sea-cart { transition: opacity .3s ease; }
    .mode-pick .sea-cart { opacity: .22; }   /* the strip gives orders OVER the title */
    .mode-pick .sea-isle.can-go { opacity: 1; cursor: pointer; }
    .mode-pick .sea-isle.can-go:hover { transform: scale(1.07); }
    .mode-pick .sea-hit { cursor: pointer; }
    .sea-cmd { position: absolute; left: 50%; top: 6px; transform: translateX(-50%) scale(.9);
      background: rgba(26,20,12,.92); border: 1px solid #8a6a3a; border-radius: 4px;
      color: #e8dcc0; font: 600 11px/1.5 Georgia, serif; letter-spacing: .5px;
      padding: 5px 14px; opacity: 0; pointer-events: none; transition: all .25s ease; white-space: nowrap; }
    .sea-cmd.on { opacity: 1; transform: translateX(-50%) scale(1); }
    .sea-cmd .cgo { color: #5fd6a3; } .sea-cmd .ccost { color: #e8c05a; }
    .sea-cmd .sea-anchor { pointer-events: auto; cursor: pointer; display: inline-block;
      margin-left: 12px; padding: 1px 9px 2px; border: 1px solid #8a6a3a; border-radius: 3px;
      color: #e8dcc0; background: rgba(138,106,58,.18); transition: all .18s ease; }
    .sea-cmd .sea-anchor:hover { background: rgba(138,106,58,.42); color: #fff; }
    .sea-cmd .sea-anchor svg { vertical-align: -1.5px; }
    .sea-key-pin { cursor: pointer; }
    .sea-key-pin circle { transition: transform .2s ease; transform-box: fill-box; transform-origin: center; }
    .sea-key-pin:hover circle { transform: scale(1.25); }
    .sea-key-body { transform-box: fill-box; transform-origin: 80px 9px;
      transition: transform .4s cubic-bezier(.3,1.15,.4,1), opacity .3s ease;
      filter: drop-shadow(3px 5px 7px rgba(0,0,0,.4)); }
    .sea-key.folded .sea-key-body { transform: scale(.05) rotate(-9deg); opacity: 0; pointer-events: none; }
    .sea-key-tag { opacity: 0; transition: opacity .25s ease; pointer-events: none; }
    .sea-key.folded .sea-key-tag { opacity: 1; }
    .sea-tip { position: absolute; left: 0; top: 0; max-width: 250px; background: #f2e8cd; color: #2a2018;
      border: 1px solid #6a5232; padding: 7px 10px; font: 11px/1.55 Georgia, serif;
      box-shadow: 3px 4px 12px rgba(0,0,0,.45); opacity: 0; pointer-events: none;
      transform: rotate(-.5deg); transition: opacity .12s ease; z-index: 5; }
    .sea-tip.on { opacity: 1; }
    .sea-tip b { letter-spacing: .5px; }
    .sea-tip i { color: #8c2a1a; }
    .sea-voyage { pointer-events: stroke; }
    .sea-beam { animation: seabeam 3.4s ease-in-out infinite alternate; }
    @keyframes seabeam { from { opacity: .45; } to { opacity: 1; } }
    .sea-od { animation: seaod 7s ease-in-out infinite alternate; }
    @keyframes seaod { from { opacity: .55; } to { opacity: .85; } }
    .mo-in, .gt-in, .wk-in, .sh-bob, .sh-slide, .sea-restored, .sea-fix-boat {
      transform-box: fill-box; transform-origin: center; }
    .sea-ghost { opacity: .6; }
    @keyframes seatremble { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(.7px, -.4px); }
      50% { transform: translate(-.5px, .5px); } 75% { transform: translate(.4px, .3px); } }
    .sea-endgame .sea-isle.od { animation: seatremble 2.4s ease-in-out infinite; }
    .sea-endgame .sea-od { animation-duration: 2.4s; opacity: .95; }
    .sea-endgame .sea-well-rings { animation-duration: 1.5s; }
    .sea-fixg.sea-hl .sea-fix-boat { transform: scale(1.28); }
    .sea-ord-pin { cursor: help; }
    .sea-ord-pin:hover path { filter: brightness(1.25); }
    .sea-ord-body { transform: translate(-180px, 0); opacity: 0; pointer-events: none;
      transition: transform .42s cubic-bezier(.3,1.1,.4,1), opacity .3s ease;
      filter: drop-shadow(3px 5px 7px rgba(0,0,0,.45)); }
    .sea-ord.open .sea-ord-body { transform: translate(22px, 0); opacity: 1; pointer-events: auto; }
    .sea-hunt { transform-box: fill-box; transform-origin: center; animation: seasway 3s ease-in-out infinite alternate; }
    .sea-smoke { transform-box: fill-box; transform-origin: center bottom; animation: seasmoke 2.8s ease-in-out infinite; }
    @keyframes seasmoke { 0% { opacity: .2; transform: translateY(0); } 55% { opacity: .75; } 100% { opacity: 0; transform: translateY(-4px); } }
    .sea-tip.tip-wide { max-width: 430px; }
    .sea-tip .tm-head { font-size: 8.5px; letter-spacing: 1.4px; font-weight: bold;
      border-top: 1px solid #6a5232; margin-top: 5px; padding-top: 4px; }
    .sea-tip .tip-cards { display: flex; gap: 6px; margin-top: 4px; }
    .sea-tip .tip-card { flex: 1 1 0; min-width: 88px; max-width: 108px; background: #221a10;
      color: #e8dcc0; border: 1px solid #8a6a3a; border-radius: 4px; padding: 6px 7px;
      font-size: 9.5px; line-height: 1.35; }
    .sea-tip .tc-name { font-weight: bold; font-size: 10px; color: #f2e8cd; }
    .sea-tip .tc-kind { font-style: italic; opacity: .75; margin: 1px 0 3px; }
    .sea-tip .tc-desc { opacity: .85; max-height: 52px; overflow: hidden; }
    .sea-tip .tc-cost { margin-top: 4px; color: #e8c05a; font-weight: bold; letter-spacing: .5px; }
    .sea-dice { transform-box: fill-box; transform-origin: center; }
    .sea-lantern { animation: sealant 2.6s ease-in-out infinite alternate; }
    @keyframes sealant { from { opacity: .55; } to { opacity: 1; } }
    .sea-trade { animation: seatrade 14s linear infinite; }
    @keyframes seatrade { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -120; } }
    .mo-in { animation: seasway 5.5s ease-in-out infinite alternate; }
    .gt-in { animation: seasway 4s ease-in-out infinite alternate; }
    .sh-bob { animation: seabob 3.2s ease-in-out infinite alternate; }
    .sea-well-rings { transform-box: fill-box; transform-origin: center;
      animation: seabreathe 4s ease-in-out infinite alternate; }
    @keyframes seasway { from { transform: rotate(-1.8deg); } to { transform: rotate(1.8deg); } }
    @keyframes seabob { from { transform: translateY(0); } to { transform: translateY(2.4px); } }
    @keyframes seabreathe { from { opacity: .72; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .sea-glow, .sea-well.well-reach circle, .mo-in, .gt-in, .sh-bob, .sea-beam, .sea-od,
      .sea-endgame .sea-isle.od, .sea-smoke, .sea-hunt { animation: none; } }
  `;
  document.head.appendChild(style);

  setInterval(() => {
    if (hookApp()) { mount(); pollDecisions(); scheduleLive(); }
  }, 300);
})();
