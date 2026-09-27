/* ═══════════════════════════════════════════════════════════════════════════
   THE CAT: a living animal on the records desk (the game's soul and its scale
   ruler). A young orange tabby, white bib and socks, green eyes; her body next
   to the briefcase is how the player reads the size of the world.

   She has her own places on the paperwork desk: her cushion in the corner, the
   spot beside HELA's core, the floor under the cabinet, and a nook under the
   briefcase. She sleeps a lot, sits and grooms, walks between her places now
   and then, hunts the hand when it darts past her (and nibbles it), purrs under
   a slow hand, and plays with HELA's memory when she spins, batting at the Hours
   without touching them. Everything is rare and slow; nothing she does is constant.

   The drawing is static inked SVG in the desk's comic style (one light, top
   left). Every pose is ONE body: all its parts share a single ink underlay, so
   the outline runs round the whole silhouette and never between head, body and
   legs; where a part lies over another, a soft fur-coloured edge tells them
   apart. The outline itself is fur: edges marked as furry break into irregular
   clumps swept along the coat. The engine is event driven: timers decide, CSS
   transitions move her, and the pointer is read only from real mouse moves.
   API: new CatEngine() · start() · stop() · pet() · startle() · setMood(m)
   · hitTest(x, y) · _enter(state, secs) · state · root · onMeow.
   ═══════════════════════════════════════════════════════════════════════════ */

const NS = "http://www.w3.org/2000/svg";
const VB_W = 900, VB_H = 700;

const INK = "#24150c";
const FUR = "url(#cwFur)", FUR_S = "#cd7431", FUR_H = "url(#cwFurH)";
const WHT = "url(#cwWht)", WHT_H = "url(#cwWhtH)", WHITE_S = "#dccbb0";
const STRIPE = "#b0501a", EDGE = "#94410f", LIGHT = "#ffd08f", PINK = "#e58f8a";

const n1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => `${n1(p[0])} ${n1(p[1])}`;
const line = (d, col = INK, w = 2, op = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${op < 1 ? ` opacity="${op}"` : ""}/>`;

function rng(seed) {
  let s = Math.imul(seed + 7, 2654435761) >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/* A closed outline through hand-placed points [x, y, fur]. Plain edges pass smoothly
   through the points; an edge whose first point carries a fur weight breaks into
   irregular clumps, each tip swept along the coat (a negative weight sweeps it the
   other way). Also returns the grain: short strands running from each clump inward. */
function fur(pts, seed = 1, amp = 9) {
  const R = rng(seed), n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const cw = area > 0;
  const P = (i) => pts[(i + n) % n];
  const seg = (i) => {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    return [p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2];
  };
  const at = (b, t) => {
    const u = 1 - t, a = u * u * u, c = 3 * u * u * t, e = 3 * u * t * t, f = t * t * t;
    return [a * b[0][0] + c * b[1][0] + e * b[2][0] + f * b[3][0], a * b[0][1] + c * b[1][1] + e * b[2][1] + f * b[3][1]];
  };
  let d = `M ${pt(pts[0])}`, strands = "";
  for (let i = 0; i < n; i++) {
    const b = seg(i), w = pts[i][2] || 0;
    if (!w) { d += ` C ${pt(b[1])} ${pt(b[2])} ${pt(b[3])}`; continue; }
    const len = Math.hypot(b[3][0] - b[0][0], b[3][1] - b[0][1]);
    const k = Math.max(1, Math.round(len / (15 + R() * 10)));
    const sw = Math.sign(w), aw = Math.abs(w);
    for (let j = 0; j < k; j++) {
      const t0 = j / k, t1 = (j + 1) / k, tm = t0 + (t1 - t0) * (0.5 + R() * 0.3);
      const a0 = at(b, t0), a1 = at(b, t1), q = at(b, tm);
      let dx = a1[0] - a0[0], dy = a1[1] - a0[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const nx = cw ? dy : -dy, ny = cw ? -dx : dx;
      const h = amp * aw * (R() < 0.18 ? 0.25 : 0.5 + R() * 0.8);
      const tip = [q[0] + nx * h + dx * h * 0.6 * sw, q[1] + ny * h + dy * h * 0.6 * sw];
      const c1 = at(b, t0 + (tm - t0) * 0.45), c2 = at(b, tm + (t1 - tm) * 0.55);
      d += ` Q ${pt([c1[0] + nx * h * 0.45, c1[1] + ny * h * 0.45])} ${pt(tip)} Q ${pt(c2)} ${pt(a1)}`;
      if (h > amp * 0.35 && R() < 0.75) {
        const s0 = [q[0] - nx * 3, q[1] - ny * 3], s1 = [q[0] - nx * h * 1.5 - dx * h * 0.5 * sw, q[1] - ny * h * 1.5 - dy * h * 0.5 * sw];
        strands += `M ${pt(s0)} Q ${pt([(s0[0] + s1[0]) / 2 + dx * 2, (s0[1] + s1[1]) / 2 + dy * 2])} ${pt(s1)} `;
      }
    }
  }
  return { d: d + " Z", strands };
}
const mirror = (pts) => pts.map(([x, y, w]) => [-x, y, w]);

// a tapered brush mark (tabby stripe, fur clump): base on (x,y), pointing at `ang` degrees
function mark(x, y, ang, len, w) {
  const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const tip = [x + dx * len, y + dy * len];
  return `M ${pt([x + nx * w / 2, y + ny * w / 2])} Q ${pt([x + dx * len * 0.5 + nx * w * 0.45, y + dy * len * 0.5 + ny * w * 0.45])} ${pt(tip)} Q ${pt([x + dx * len * 0.45 - nx * w * 0.5, y + dy * len * 0.45 - ny * w * 0.5])} ${pt([x - nx * w / 2, y - ny * w / 2])} Z`;
}
const marks = (list, col = STRIPE, op = 1) => `<path d="${list.map((m) => mark(...m)).join(" ")}" fill="${col}"${op < 1 ? ` opacity="${op}"` : ""}/>`;

let clipN = 0;
/* A body. parts: { pts | d, fill, seed, amp, cls, tr, soft, sock, detail, ink:false, vol:false }.
   Ink first (all parts, one silhouette), then the paint in order. */
function body(name, parts, before = "", after = "") {
  let ink = "", paint = "";
  for (const p of parts) {
    const wrap = (inner) => {
      let g = inner;
      if (p.cls) g = `<g class="${p.cls}">${g}</g>`;
      if (p.tr) g = `<g transform="${p.tr}">${g}</g>`;
      return g;
    };
    if (p.raw) { ink += wrap(p.raw.ink); paint += wrap(p.raw.paint); continue; }
    const s = p.d ? { d: p.d, strands: "" } : fur(p.pts, p.seed || 1, p.amp || 9);
    if (p.ink !== false) ink += wrap(`<path d="${s.d}"/>`);
    let g = `<path d="${s.d}" fill="${p.fill || FUR}"/>`;
    if (p.sock) {
      const id = "cwK" + (++clipN);
      const r = Array.isArray(p.sock) ? p.sock : [0, p.sock, 900, 120];
      g += `<clipPath id="${id}"><path d="${s.d}"/></clipPath><g clip-path="url(#${id})">`
        + `<path d="M ${r[0]} ${r[1] + r[3]} L ${r[0]} ${r[1] + 6} Q ${r[0] + r[2] * .25} ${r[1] - 8} ${r[0] + r[2] * .4} ${r[1] + 2} Q ${r[0] + r[2] * .6} ${r[1] - 10} ${r[0] + r[2] * .75} ${r[1] + 1} Q ${r[0] + r[2] * .9} ${r[1] - 6} ${r[0] + r[2]} ${r[1] + 4} L ${r[0] + r[2]} ${r[1] + r[3]} Z" fill="${p.fill === FUR_S ? WHITE_S : WHT}"/></g>`;
    }
    if (p.vol !== false) g += `<path d="${s.d}" fill="url(#cwVol)"/>`;
    if (p.detail) g += p.detail;
    if (s.strands) g += `<path d="${s.strands}" fill="none" stroke="${EDGE}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`;
    if (p.soft) g += `<path d="${s.d}" fill="none" stroke="${EDGE}" stroke-width="2.6" opacity=".55"/>`;
    paint += wrap(g);
  }
  return `<g class="cw-pose cw-${name}">${before}<g fill="${INK}" stroke="${INK}" stroke-width="7" transform="translate(.9 1.4)">${ink}</g>${paint}${after}</g>`;
}

/* ── the face. Her eyes are almonds with a life of their own: each expression is a
      drawing of its own, and the engine shows one (class x-<kind> on the cat). ── */
const EYES = {   // the right eye (screen right); the left is its mirror. [p0 c1 p1 c2 p2 c3 p3 c4], pupil [cx cy rx ry]
  open:    { s: [[24, -10], [34, -30], [52, -28], [68, -24], [72, -12], [66, 4], [48, 6], [30, 4]], p: [48, -11, 6.5, 11] },
  relaxed: { s: [[24, -8], [36, -20], [52, -19], [66, -17], [72, -11], [66, 4], [48, 5], [30, 4]], p: [48, -8, 6, 9.5] },
  focused: { s: [[24, -6], [38, -21], [54, -24], [68, -25], [72, -15], [66, 3], [48, 5], [30, 3]], p: [49, -9, 2.8, 12] },
  scared:  { s: [[24, -10], [27, -35], [48, -35], [70, -33], [72, -12], [70, 9], [48, 10], [26, 9]], p: [48, -12, 4, 4] },
};
const eyeD = (s, m) => { const q = s.map(([x, y]) => [x * m, y]);
  return `M ${pt(q[0])} Q ${pt(q[1])} ${pt(q[2])} Q ${pt(q[3])} ${pt(q[4])} Q ${pt(q[5])} ${pt(q[6])} Q ${pt(q[7])} ${pt(q[0])} Z`; };
const lidD = (s, m) => { const q = s.map(([x, y]) => [x * m, y]);
  return `M ${pt([q[0][0] - 2 * m, q[0][1] + 1])} Q ${pt(q[1])} ${pt(q[2])} Q ${pt(q[3])} ${pt([q[4][0] + 3 * m, q[4][1] + 1])}`; };
function eyeDefs() {
  let d = "";
  for (const k of Object.keys(EYES)) for (const [m, sd] of [[1, "R"], [-1, "L"]]) d += `<clipPath id="cwE${k}${sd}"><path d="${eyeD(EYES[k].s, m)}"/></clipPath>`;
  return d;
}
function eye(k, m) {
  const E = EYES[k], sd = m > 0 ? "R" : "L", [cx, cy, rx, ry] = E.p;
  const lid = lidD(E.s, m), low = `M ${pt([E.s[4][0] * m, E.s[4][1]])} Q ${pt([E.s[5][0] * m, E.s[5][1]])} ${pt([E.s[6][0] * m, E.s[6][1]])}`;
  return `<path d="${eyeD(E.s, m)}" fill="url(#cwIris)"/>
    <g clip-path="url(#cwE${k}${sd})">
      <path d="M ${pt([E.s[0][0] * m, E.s[0][1] - 20])} L ${pt([E.s[4][0] * m, E.s[4][1] - 20])} L ${pt([E.s[4][0] * m, E.s[4][1] + 4])} Q ${pt([E.s[2][0] * m, E.s[2][1] + 12])} ${pt([E.s[0][0] * m, E.s[0][1] + 4])} Z" fill="#2c4a0e" opacity=".5"/>
      <ellipse class="cw-pupil" cx="${cx * m}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#130f08"/>
    </g>
    <circle cx="${(cx - 6) * m}" cy="${cy - 6}" r="${k === "scared" ? 2.6 : 3.3}" fill="#fff"/><circle cx="${(cx + 5) * m}" cy="${cy + 7}" r="1.5" fill="#fff" opacity=".8"/>
    ${line(lid, INK, 4.6)}${line(low, INK, 1.6, .75)}
    ${line(`M ${pt([E.s[4][0] * m + 2 * m, E.s[4][1]])} l ${7 * m} -4`, INK, 2)}`;
}
function face(kinds) {
  const group = (k, inner) => `<g class="cw-x cw-x-${k}">${inner}</g>`;
  let g = "";
  for (const k of kinds) {
    if (EYES[k]) {
      let brow = "";
      if (k === "focused") brow = marks([[20, -24, -16, 40, 6], [-20, -24, 196, 40, 6]], EDGE, .9);
      if (k === "scared") brow = marks([[26, -46, -18, 30, 4], [-26, -46, 198, 30, 4]], EDGE, .6);
      g += group(k, `<g class="cw-eyeball">${eye(k, 1)}${eye(k, -1)}</g>${brow}`);
    } else if (k === "happy") {
      g += group(k, line("M 24 -6 Q 48 -28 72 -8", INK, 5) + line("M -24 -6 Q -48 -28 -72 -8", INK, 5)
        + `<ellipse cx="62" cy="20" rx="15" ry="7" fill="#f08a8a" opacity=".5"/><ellipse cx="-62" cy="20" rx="15" ry="7" fill="#f08a8a" opacity=".5"/>`);
    } else if (k === "sleepy") {
      g += group(k, line("M 24 -12 Q 48 4 72 -12", INK, 4.6) + line("M -24 -12 Q -48 4 -72 -12", INK, 4.6)
        + line("M 72 -12 l 8 -3 M -72 -12 l -8 -3", INK, 2));
    }
  }
  return g;
}

/* The head: the same drawing in every pose, in its own frame (centre 0,0, about
   230 wide). Ears sit behind the head and share its ink, so no line crosses their root. */
const EAR = [[18, -78], [58, -112], [88, -146, .35], [100, -152], [106, -142], [108, -104], [104, -40]];
const HEAD = [[0, -92], [40, -88], [76, -66], [100, -34, .9], [110, -4, 1.1], [116, 22, 1], [106, 46, .8], [86, 66], [56, 86],
  [24, 96], [0, 98], [-24, 96], [-56, 86], [-86, 66, .8], [-106, 46, 1], [-116, 22, 1.1], [-110, -4, .9], [-100, -34], [-76, -66], [-40, -88]];
const MUZZLE = [[-8, -58], [8, -58], [12, -2], [34, 4, .7], [52, 22, .8], [50, 50], [30, 74], [0, 86], [-30, 74], [-50, 50, -.8], [-52, 22, -.7], [-34, 4], [-12, -2]];
function head(kinds, mouth = true) {
  const earR = fur(EAR, 21, 7), earL = fur(mirror(EAR), 22, 7), hd = fur(HEAD, 23, 11), mz = fur(MUZZLE, 24, 7);
  const earPaint = (e, m) => `<path d="${e.d}" fill="${FUR_H}"/><path d="${e.d}" fill="url(#cwVol)"/>
      <path d="M ${30 * m} -84 L ${86 * m} -134 Q ${98 * m} -136 ${98 * m} -122 L ${92 * m} -60 Z" fill="#f2b0a2"/>
      <path d="M ${86 * m} -134 Q ${98 * m} -136 ${98 * m} -122 L ${92 * m} -60 L ${80 * m} -104 Z" fill="#cf7f76" opacity=".6"/>
      ${line(`M ${48 * m} -86 q ${9 * m} -14 ${8 * m} -28 M ${60 * m} -84 q ${10 * m} -12 ${11 * m} -26 M ${72 * m} -80 q ${9 * m} -10 ${12 * m} -22`, "#fff6e6", 2, .85)}`;
  const ink = `<g class="cw-earL"><path d="${earL.d}"/></g><g class="cw-earR"><path d="${earR.d}"/></g><path d="${hd.d}"/>`;
  const paint = `<g class="cw-earL">${earPaint(earL, -1)}</g><g class="cw-earR">${earPaint(earR, 1)}</g>
    <path d="${hd.d}" fill="${FUR_H}"/><path d="${hd.d}" fill="url(#cwVol)"/>
    <path d="${hd.strands}" fill="none" stroke="${EDGE}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
    ${line("M -88 -44 C -70 -76 -36 -90 -2 -90", LIGHT, 4, .8)}
    ${marks([[0, -92, 90, 30, 9], [-26, -88, 100, 26, 8], [26, -88, 80, 26, 8], [-114, 2, -8, 26, 8], [-108, 24, -4, 22, 7], [114, 2, 188, 26, 8], [108, 24, 184, 22, 7], [-60, -72, 60, 16, 6], [60, -72, 120, 16, 6]])}
    <path d="${mz.d}" fill="${WHT_H}"/>
    <path d="M 22 8 Q 50 22 48 50 Q 40 70 14 84 Q 36 56 22 8 Z" fill="${WHITE_S}" opacity=".7"/>
    <path d="${mz.strands}" fill="none" stroke="#c9b08c" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
    ${face(kinds)}
    <path d="M -9 16 Q 0 12 9 16 Q 9 21 4 25 L 0 28 L -4 25 Q -9 21 -9 16 Z" fill="${PINK}" stroke="${INK}" stroke-width="2"/>
    ${line("M -4 17 Q 0 15.6 4 17", "#fff", 1.6, .8)}
    <g class="cw-mouth-calm">${line("M 0 28 L 0 34 M 0 34 Q -8 42 -17 36 M 0 34 Q 8 42 17 36", INK, 2.4)}</g>
    ${mouth ? `<g class="cw-mouth-open">
      <path d="M -16 34 Q -8 31 0 35 Q 8 31 16 34 Q 13 58 0 61 Q -13 58 -16 34 Z" fill="#5e1f2a" stroke="${INK}" stroke-width="2.2"/>
      <path d="M -9 50 Q 0 45 9 50 Q 7 59 0 60 Q -7 59 -9 50 Z" fill="#e67f88"/>
      <path d="M -12 35 L -9 45 L -6 36 Z M 12 35 L 9 45 L 6 36 Z" fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>
    </g>
    <path class="cw-tongue" d="M -7 35 Q -8 54 0 56 Q 8 54 7 35 Q 0 39 -7 35 Z" fill="#e67f88" stroke="${INK}" stroke-width="1.8"/>` : ""}
    <g fill="#b89a7c"><circle cx="-20" cy="36" r="1.8"/><circle cx="-28" cy="31" r="1.8"/><circle cx="-29" cy="41" r="1.8"/><circle cx="20" cy="36" r="1.8"/><circle cx="28" cy="31" r="1.8"/><circle cx="29" cy="41" r="1.8"/></g>
    <g fill="none" stroke="#fffaf0" stroke-width="1.8" stroke-linecap="round" opacity=".95">
      <path d="M -34 34 Q -94 24 -150 30 M -34 41 Q -92 44 -142 58 M -32 48 Q -82 60 -122 82"/>
      <path d="M 34 34 Q 94 24 150 30 M 34 41 Q 92 44 142 58 M 32 48 Q 82 60 122 82"/>
    </g>`;
  return { ink, paint };
}
const headPart = (tr, kinds, mouth) => ({ tr, cls: "cw-head", raw: (() => { const h = head(kinds, mouth);
  return { ink: `<g class="cw-headin">${h.ink}</g>`, paint: `<g class="cw-headin">${h.paint}</g>` }; })() });

// comic purr lines, shown only while she purrs
const purr = (x, y, flip) => `<g class="cw-purr" transform="translate(${x} ${y})${flip ? " scale(-1 1)" : ""}">${line("M 0 0 q -10 10 0 20 M -12 -6 q -14 16 0 32", INK, 2.6, .8)}</g>`;
const claws = (d) => `<g class="cw-claws">${line(d, INK, 4.4)}${line(d, "#fffaf0", 2.2)}</g>`;
const toes = (d) => line(d, "#a89274", 1.8, .9);
const shadow = (cx, rx, op = .24) => `<ellipse class="cw-shadow" cx="${cx}" cy="693" rx="${rx}" ry="12" fill="#000" opacity="${op}"/>`;
const glow = (d) => `<path class="cw-glow" d="${d}" fill="url(#cwGlow)"/>`;

/* ── the poses. Every pose stands on the same ground (y 690) and faces left;
      the engine mirrors the whole drawing when she faces right. ── */
function sitParts(raised) {
  const parts = [
    { seed: 31, pts: [[600, 646], [628, 668], [626, 694, .5], [596, 704, .6], [520, 706, .6], [440, 704, .6], [372, 702, .5], [336, 698], [324, 686], [340, 678], [372, 686], [430, 690], [500, 690], [566, 688], [590, 676]],
      cls: "cw-tail", detail: marks([[548, 688, 90, 15, 9], [488, 689, 90, 15, 9], [428, 689, 90, 14, 9], [340, 684, 30, 18, 10]]) },
    { seed: 32, pts: [[452, 456], [496, 436], [548, 436, .6], [594, 462, .8], [620, 508, .9], [630, 564, .8], [626, 620, .6], [608, 664], [576, 688], [530, 694], [440, 694]],
      detail: marks([[556, 442, 118, 44, 12], [598, 474, 152, 46, 12], [620, 526, 172, 44, 12], [624, 584, 188, 40, 11]])
        + line("M 474 460 C 520 442 564 450 592 474", LIGHT, 3.4, .7) },
    { seed: 33, fill: WHT, pts: [[512, 692], [512, 676], [532, 664], [568, 662], [600, 668], [612, 682], [602, 696], [520, 697]], detail: toes("M 572 696 v -10 M 588 694 v -9") },
    { seed: 34, pts: [[396, 372], [374, 398], [358, 446, .7], [350, 500, .8], [344, 560, .6], [338, 620], [338, 668], [350, 690], [386, 695], [470, 695], [540, 695], [562, 684], [568, 650], [566, 600], [554, 540, -.5], [536, 478, -.5], [512, 420], [474, 372]],
      detail: `<ellipse cx="440" cy="386" rx="46" ry="18" fill="#7a300c" opacity=".35"/>`
        + marks([[352, 470, 8, 30, 10], [346, 536, 4, 30, 10], [540, 490, 176, 30, 10], [556, 556, 178, 30, 10]])
        + line("M 372 420 C 356 470 350 530 354 590", LIGHT, 3.4, .7) + line("M 538 490 C 556 550 562 620 556 676", "#ffcf8a", 2.6, .45)
        + glow("M 396 372 C 372 400 350 470 344 560 C 338 620 338 668 350 690 L 372 690 C 362 600 370 480 404 380 Z") },
    { seed: 37, fill: WHT, ink: false, pts: [[394, 380], [430, 396], [468, 382], [486, 440], [482, 500], [470, 548, .7], [456, 576, .7], [432, 582, .7], [410, 572, .7], [394, 542, .6], [384, 480]],
    detail: `<path d="M 452 396 Q 474 392 480 404 Q 490 460 480 522 Q 472 556 460 574 Q 474 500 452 396 Z" fill="${WHITE_S}" opacity=".8"/>` },
    { seed: 35, fill: FUR_S, sock: 632, soft: true, pts: [[430, 520], [482, 520], [481, 600], [480, 668], [472, 690], [456, 695], [440, 690], [432, 668], [431, 600]],
      detail: toes("M 449 694 v -9 M 463 694 v -9") },
  ];
  if (!raised) parts.push({ seed: 36, sock: 626, soft: true, pts: [[372, 520], [430, 520], [429, 600], [428, 668], [420, 690], [400, 696], [380, 690], [372, 668], [372, 600]],
    detail: line("M 382 556 L 381 614", LIGHT, 3, .6) + toes("M 392 695 v -10 M 408 695 v -10") });
  return parts;
}
function poseSit() {
  return body("sit", [...sitParts(false), headPart("translate(438 282)", ["relaxed", "open", "happy"])],
    shadow(472, 176), purr(330, 520, false) + purr(630, 540, true));
}
// sitting up with a paw raised: batting at HELA's Hours, holding the hand to nibble it, grooming
function poseBat() {
  const paw = { seed: 38, cls: "cw-paw", soft: true, sock: [290, 300, 80, 76],
    pts: [[364, 508], [344, 466], [324, 420], [308, 380], [300, 356], [312, 342], [330, 340], [344, 356], [358, 392], [382, 434], [408, 474]],
    detail: `<g fill="#e99a94"><ellipse cx="322" cy="360" rx="7" ry="6"/><circle cx="308" cy="352" r="3.4"/><circle cx="314" cy="344" r="3.4"/><circle cx="324" cy="342" r="3.4"/></g>`
      + line("M 352 470 C 340 440 330 408 322 380", LIGHT, 3, .6) + claws("M 304 350 q -8 -4 -6 -12 M 310 341 q -5 -7 0 -13 M 321 338 q -2 -8 4 -12") };
  return body("bat", [...sitParts(true), headPart("translate(446 284) rotate(7)", ["focused", "open", "happy"]), paw],
    shadow(472, 176));
}

function poseStand() {
  const legs = {
    farF: { fill: FUR_S, sock: 634, pts: [[370, 500], [420, 500], [416, 560], [413, 620], [414, 668], [404, 690], [386, 693], [376, 684], [376, 640], [372, 580]], j: [394, 520], s: -1 },
    farH: { fill: FUR_S, sock: 634, pts: [[560, 500], [596, 504], [606, 540, .6], [602, 600], [600, 668], [590, 690], [572, 693], [562, 680], [561, 610], [552, 560]], j: [590, 520], s: 1 },
    nearF: { sock: 628, soft: true, pts: [[322, 490], [384, 490], [378, 560], [376, 620], [376, 666], [366, 690], [344, 695], [330, 684], [330, 630], [324, 560]], j: [352, 510], s: 1 },
    nearH: { sock: 632, soft: true, pts: [[604, 500], [648, 500], [668, 530, .7], [664, 570, .8], [656, 620, .5], [656, 668], [646, 690], [624, 695], [612, 684], [611, 630], [606, 600], [594, 560]], j: [630, 500], s: -1 },
  };
  // a step is the same legs swung about the shoulder and the hip
  const frames = (keys) => [["cw-fN", 0], ["cw-fA", 13], ["cw-fB", -13]].flatMap(([f, a]) => keys.map((k, i) => ({
    ...legs[k], seed: 40 + i, cls: "cw-frame " + f, tr: a ? `rotate(${a * legs[k].s} ${legs[k].j[0]} ${legs[k].j[1]})` : undefined })));
  return body("stand", [
    { seed: 44, cls: "cw-tail", pts: [[664, 432], [690, 410], [712, 380], [722, 340], [728, 300], [742, 268], [764, 252], [786, 258], [792, 278], [778, 292], [764, 290, .6], [758, 312, .6], [756, 350, .6], [750, 392, .5], [732, 432], [706, 460], [678, 474]],
      detail: marks([[710, 384, 8, 26, 8], [720, 334, 4, 24, 8], [730, 292, -8, 22, 8]]) + line("M 700 420 C 716 400 724 370 724 330", LIGHT, 3, .6) },
    ...frames(["farF", "farH"]),
    { seed: 45, pts: [[330, 440], [352, 414], [396, 404], [450, 407], [510, 409], [566, 405], [614, 407], [656, 421], [682, 450], [688, 490], [674, 528], [642, 552, .7], [600, 561, .8], [530, 563, .8], [460, 563, .8], [410, 561, .7], [368, 552], [334, 532, .6], [318, 500, .6], [320, 466]],
      detail: marks([[452, 408, 94, 40, 11], [502, 410, 92, 42, 11], [552, 408, 90, 40, 11], [602, 410, 86, 38, 11], [646, 428, 70, 34, 10]])
        + line("M 356 430 C 410 416 520 420 620 418", LIGHT, 3.6, .75) + line("M 596 476 C 640 462 680 496 672 546", EDGE, 2.4, .55)
        + `<path d="M 420 540 C 480 552 560 552 640 540 C 620 556 560 562 500 562 C 460 562 430 556 420 540 Z" fill="#fff1d8" opacity=".35"/>` },
    { seed: 46, fill: WHT, ink: false, vol: false, pts: [[316, 440], [352, 434], [362, 468], [358, 498, .6], [340, 514, .6], [322, 506, .5], [312, 474]] },
    ...frames(["nearF", "nearH"]),
    headPart("translate(300 352) scale(.9)", ["open", "relaxed", "scared"]),
  ], shadow(490, 220, .22));
}

// low on the desk, weight on the haunches: hunting, or frightened with the ears flat
function poseCrouch() {
  return body("crouch", [
    { seed: 51, fill: FUR_S, sock: [270, 668, 80, 30], pts: [[380, 612], [360, 640], [330, 662], [298, 670], [278, 682], [284, 693], [336, 693], [366, 686], [390, 664], [410, 616]] },
    { seed: 52, cls: "cw-rump cw-tail", pts: [[692, 590], [740, 600, .4], [790, 610, .4], [830, 606], [850, 596], [853, 580], [842, 571], [832, 579], [834, 588], [800, 594], [760, 588], [726, 582], [694, 572]],
      detail: marks([[742, 592, 90, 12, 8], [792, 598, 90, 12, 8]]) },
    { seed: 53, cls: "cw-rump", pts: [[296, 600], [308, 572], [346, 552], [410, 550], [490, 549], [560, 524], [620, 516], [672, 512], [700, 540], [702, 590], [690, 630], [660, 652, .6], [624, 657, .7], [520, 660, .7], [400, 662, .6], [336, 660], [302, 640]],
      detail: `<path d="M 330 640 C 380 628 470 632 560 646 C 590 650 610 652 624 656 C 520 662 420 664 336 658 Z" fill="${WHT}"/>`
        + marks([[470, 550, 96, 34, 10], [520, 540, 96, 36, 10], [572, 526, 96, 36, 10], [626, 518, 100, 34, 10]])
        + line("M 350 566 C 420 558 540 540 636 528", LIGHT, 3.2, .5) },
    { seed: 54, cls: "cw-rump", soft: true, sock: [530, 664, 80, 32], pts: [[560, 562], [590, 540], [640, 538], [690, 560, .6], [700, 610, .6], [686, 660], [652, 688], [600, 691], [556, 691], [540, 683], [552, 670], [600, 666], [580, 640], [562, 604]],
      detail: marks([[640, 544, 110, 34, 10], [680, 580, 150, 30, 10]]) },
    { seed: 55, soft: true, sock: [232, 666, 70, 30], pts: [[350, 610], [330, 640], [300, 662], [262, 672], [240, 682], [242, 693], [300, 693], [330, 688], [352, 668], [372, 648], [384, 612]] },
    headPart("translate(262 566) scale(.9)", ["focused", "scared"]),
  ], shadow(480, 250));
}

// mid-air, reaching for the hand
function poseLeap() {
  return body("leap", [
    { seed: 61, fill: FUR_S, pts: [[312, 410], [286, 420], [258, 430], [230, 432], [208, 426], [212, 410], [232, 408], [258, 406], [282, 398], [300, 386]] },
    { seed: 62, fill: FUR_S, pts: [[660, 480], [700, 510], [736, 546], [764, 580], [778, 600], [766, 608], [750, 610], [740, 596], [714, 562], [684, 530], [648, 500]] },
    { seed: 63, cls: "cw-tail", pts: [[690, 494], [740, 500], [800, 506], [860, 496], [882, 494], [886, 508], [880, 522], [862, 524, .5], [800, 532, .5], [740, 532, .5], [684, 542]],
      detail: marks([[760, 502, 90, 26, 9], [820, 500, 90, 26, 9]]) },
    { seed: 64, pts: [[286, 398], [316, 356], [396, 354], [468, 376], [556, 402], [628, 438], [680, 478], [712, 506], [708, 548], [668, 566, .6], [618, 572, .7], [556, 540, .7], [478, 510, .7], [402, 482, .6], [330, 468], [298, 448], [280, 420]],
      detail: `<path d="M 296 440 C 330 470 420 486 490 512 C 560 540 610 560 650 566 C 600 574 540 548 470 524 C 400 500 330 482 296 440 Z" fill="${WHT}"/>`
        + marks([[470, 378, 104, 44, 11], [526, 394, 106, 44, 11], [580, 416, 110, 42, 11], [630, 444, 116, 36, 10]])
        + line("M 324 384 C 400 372 520 404 636 458", LIGHT, 3.6, .75) },
    { seed: 65, soft: true, sock: [690, 626, 60, 50], pts: [[640, 500], [676, 540], [700, 590], [726, 636], [738, 660], [722, 668], [702, 672], [696, 650], [676, 606], [648, 566], [612, 532]] },
    { seed: 66, soft: true, sock: [186, 452, 44, 50], pts: [[330, 430], [300, 452], [262, 478], [222, 490], [196, 494], [194, 480], [196, 468], [214, 462], [250, 454], [282, 432], [306, 408]],
      detail: claws("M 196 472 q -9 -1 -12 -8 M 195 483 q -9 1 -14 -3 M 204 492 q -6 5 -13 3") },
    headPart("translate(256 366) rotate(-10) scale(.9)", ["focused"]),
  ], shadow(470, 150, .14));
}

// asleep on her side, belly to the room, paws curled
function poseSleep() {
  return body("sleep", [
    { seed: 71, cls: "cw-tail", pts: [[640, 640], [700, 626], [770, 632], [820, 652], [844, 664], [838, 682], [824, 690], [806, 680, .5], [766, 660, .5], [712, 656, .5], [660, 664]],
      detail: marks([[720, 630, 90, 26, 9], [772, 636, 96, 24, 9], [818, 654, 110, 20, 8]]) },
    { seed: 72, fill: FUR_S, pts: [[330, 600], [300, 590], [270, 590], [246, 596], [230, 606], [236, 616], [258, 618], [282, 612], [306, 614], [332, 620]] },
    { seed: 73, fill: FUR_S, pts: [[600, 620], [640, 612], [690, 614], [722, 624], [740, 634], [732, 644], [706, 644], [676, 634], [636, 634], [600, 640]] },
    { seed: 74, pts: [[300, 620], [310, 582], [350, 548, .3], [440, 530, .3], [530, 526, .3], [614, 540], [662, 574], [690, 610], [684, 650], [640, 678], [580, 694], [460, 696], [380, 690], [330, 680], [304, 656]],
      detail: marks([[420, 532, 94, 38, 10], [470, 529, 92, 40, 10], [520, 528, 90, 40, 10], [570, 534, 84, 38, 10], [614, 552, 70, 34, 10]])
        + line("M 336 580 C 384 550 480 538 578 550", LIGHT, 3.6, .75)
        + `<path d="M 340 650 C 380 612 470 600 560 612 C 610 620 634 646 614 668 C 574 690 450 692 380 684 C 350 680 334 668 340 650 Z" fill="${WHT}"/>`
        + `<path d="M 360 676 C 440 690 560 686 612 668 C 574 690 450 692 380 684 Z" fill="${WHITE_S}" opacity=".8"/>`
        + glow("M 300 620 C 296 570 350 536 440 530 C 380 550 330 580 322 640 Z") + purr(700, 560, true) },
    { seed: 75, soft: true, pts: [[556, 640], [566, 610], [604, 598], [636, 612, .5], [652, 640, .5], [640, 672], [610, 680], [580, 676], [558, 660]] },
    { seed: 76, soft: true, sock: [700, 660, 50, 44], pts: [[580, 646], [626, 650], [676, 664], [716, 668], [742, 676], [740, 690], [728, 700], [712, 696], [668, 690], [624, 684], [584, 676]] },
    { seed: 77, soft: true, sock: [236, 640, 34, 44], pts: [[350, 624], [318, 626], [282, 640], [258, 650], [242, 662], [248, 674], [262, 678], [274, 674], [298, 664], [326, 656], [356, 654]],
      detail: `<g fill="#e99a94"><circle cx="252" cy="664" r="3"/><circle cx="258" cy="672" r="3"/></g>` },
    headPart("translate(262 606) rotate(-18) scale(.88)", ["sleepy"], false),
  ], shadow(480, 270, .22), `<g class="cw-zzz" fill="#f6ecd4" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round">
      <path class="z1" d="M 150 470 h 22 l -16 20 h 18 v 6 h -30 l 16 -20 h -10 Z"/>
      <path class="z2" d="M 118 424 h 30 l -22 28 h 24 v 8 h -40 l 22 -28 h -14 Z"/></g>`);
}

// the croissant: nose under the tail
function poseCurl() {
  return body("curl", [
    { seed: 81, pts: [[310, 640], [304, 600], [330, 556], [380, 522, .5], [446, 508, .5], [520, 506, .5], [578, 530, .5], [614, 570, .4], [624, 612], [612, 660], [580, 686], [520, 694], [380, 694], [336, 688], [316, 668]],
      detail: marks([[410, 516, 96, 38, 10], [466, 508, 92, 40, 10], [526, 510, 100, 40, 10], [578, 534, 120, 38, 10], [610, 578, 150, 32, 10]])
        + line("M 346 566 C 384 534 460 518 540 528", LIGHT, 3.6, .75)
        + glow("M 310 640 C 294 574 346 516 446 508 C 380 530 330 580 330 650 Z") + purr(640, 560, true) },
    { seed: 82, fill: WHT, pts: [[334, 684], [336, 668], [354, 664], [374, 670], [378, 684], [366, 694], [344, 694]] },
    { seed: 83, fill: WHT, pts: [[380, 688], [384, 672], [402, 670], [420, 676], [422, 688], [410, 697], [390, 697]] },
    headPart("translate(390 606) rotate(-12) scale(.74)", ["sleepy"], false),
    { seed: 84, cls: "cw-tail", soft: true, pts: [[618, 630], [628, 660], [612, 686, .5], [570, 700, .6], [460, 704, .6], [390, 700, .5], [330, 694], [316, 678], [340, 684], [400, 688], [460, 688], [548, 688], [598, 672], [606, 640]],
      detail: marks([[560, 700, -90, 14, 9], [500, 702, -90, 14, 9], [440, 702, -90, 14, 9], [330, 690, -30, 16, 9]]) },
  ], shadow(460, 200, .22));
}

export function catSVG() {
  clipN = 0;
  return `
<svg class="catw-svg" viewBox="0 0 ${VB_W} ${VB_H}" xmlns="${NS}" preserveAspectRatio="xMidYMax meet" stroke-linejoin="round">
<defs>
  <linearGradient id="cwFur" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="120" y2="700"><stop offset="0" stop-color="#f8b465"/><stop offset=".5" stop-color="#e98f3b"/><stop offset="1" stop-color="#c86d2a"/></linearGradient>
  <linearGradient id="cwFurH" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#f9b868"/><stop offset=".55" stop-color="#ea933f"/><stop offset="1" stop-color="#d27933"/></linearGradient>
  <linearGradient id="cwWht" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="0" y2="700"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e9dbbf"/></linearGradient>
  <linearGradient id="cwWhtH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efe3c9"/></linearGradient>
  <linearGradient id="cwVol" x1=".15" y1="0" x2=".75" y2="1"><stop offset="0" stop-color="#fff0c8" stop-opacity=".28"/><stop offset=".35" stop-color="#fff0c8" stop-opacity="0"/><stop offset=".62" stop-color="#6e2406" stop-opacity="0"/><stop offset="1" stop-color="#6e2406" stop-opacity=".42"/></linearGradient>
  <linearGradient id="cwGlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity=".95"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  <radialGradient id="cwIris" cx=".5" cy=".62" r=".7"><stop offset="0" stop-color="#eef59a"/><stop offset=".45" stop-color="#a6d24a"/><stop offset="1" stop-color="#4d7f1c"/></radialGradient>
  ${eyeDefs()}
</defs>
${poseSit()}${poseBat()}${poseStand()}${poseCrouch()}${poseLeap()}${poseSleep()}${poseCurl()}
</svg>`;
}

// her bed: a worn velvet cushion (the briefcase's velvet), dented where she sleeps, with her hairs on it
function bedSVG() {
  return `<svg viewBox="0 0 420 150" xmlns="${NS}" stroke-linejoin="round">
  <defs><linearGradient id="cbVel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a3342"/><stop offset=".55" stop-color="#65212e"/><stop offset="1" stop-color="#43141d"/></linearGradient></defs>
  <ellipse cx="212" cy="128" rx="200" ry="18" fill="#000" opacity=".3"/>
  <path d="M 22 92 C 14 60 90 34 210 32 C 330 30 410 56 400 92 C 392 124 320 136 210 136 C 100 136 30 124 22 92 Z" transform="translate(2 3)" fill="${INK}"/>
  <path d="M 22 92 C 14 60 90 34 210 32 C 330 30 410 56 400 92 C 392 124 320 136 210 136 C 100 136 30 124 22 92 Z" fill="url(#cbVel)" stroke="${INK}" stroke-width="3.2"/>
  <path d="M 70 82 C 90 60 160 50 214 50 C 280 50 340 62 354 84 C 330 104 270 110 212 110 C 150 110 94 102 70 82 Z" fill="#3a1018" opacity=".55"/>
  <path d="M 44 78 C 70 50 150 40 214 40 C 290 40 360 52 380 76" fill="none" stroke="#c98a8f" stroke-width="3" stroke-linecap="round" opacity=".45"/>
  <path d="M 36 96 C 70 124 150 130 212 130 C 290 130 360 122 390 98" fill="none" stroke="#caa06a" stroke-width="1.6" stroke-dasharray="6 5" opacity=".6"/>
  <g stroke="#f0a256" stroke-width="1.4" stroke-linecap="round" opacity=".8" fill="none">
    <path d="M 150 86 q 6 -2 10 1"/><path d="M 196 96 q 5 -3 9 0"/><path d="M 262 84 q 5 2 8 -1"/><path d="M 236 100 q 4 -3 8 -1"/><path d="M 120 100 q 5 -1 8 2"/>
  </g>
  <g stroke="#fff4e0" stroke-width="1.2" stroke-linecap="round" opacity=".7" fill="none"><path d="M 178 90 q 4 -2 7 0"/><path d="M 290 96 q 4 1 7 -1"/></g>
</svg>`;
}

/* ── the camera plane: she lives in the FIXED fit-scaled plane (2133x1200), so a
      unit is 1% of the plane, not of the window ── */
const UX = 2133 / 100, UY = 1200 / 100;
// Her size: her drawing box is this many plane units wide (the sitting cat is about a
// third of it). At 18 she sits a little shorter than the briefcase is deep, a real
// cat's scale against the desk's objects. setSize() changes it (the phone table).
const SIZE = 18;

/* Her places (plane units, feet point). The paperwork desk is left of the plane's
   origin: HELA's core owns its left half and the cabinet its top, so she keeps to the
   strip on their right. One place lies under the briefcase, on the seam between the
   two desks, so now and then the player finds her asleep beside the machine too.
   `sit` says whether she may sit up there without covering a drawer or the case. */
const PLACES = {
  bed:   { x: -7.5, y: 95.5, lie: true, sit: true },    // her cushion, the desk's bottom right corner
  core:  { x: -11, y: 80, lie: false, sit: true },      // beside HELA's core, where her light is warm
  ledge: { x: -6, y: 57, lie: true, sit: false },       // the floor under the cabinet, where she hides
  case:  { x: 6, y: 64, lie: true, sit: false },        // under the briefcase, on the seam of the two desks
};
const ROAM = { x0: -14, x1: 6 };           // how far a leap may carry her (never into her core)

const POSE_OF = { sit: "sit", pet: "sit", watch: "sit", groom: "bat", bat: "bat", bite: "bat",
  walk: "stand", flee: "stand", crouch: "crouch", scared: "crouch", pounce: "leap", sleep: "sleep", curl: "curl" };
// her face in each state: relaxed at rest, curious when she watches, focused on the hunt
const EXPR = { sit: "relaxed", watch: "open", walk: "open", flee: "scared", pet: "happy", groom: "happy",
  bat: "focused", bite: "focused", crouch: "focused", pounce: "focused", scared: "scared", sleep: "sleepy", curl: "sleepy" };
const WALK_SPEED = 4.2;                   // plane units per second, an unhurried stroll

export class CatEngine {
  constructor() {
    this.onMeow = null;
    this.mood = "calm";
    this.state = "sleep";
    this.place = "bed";
    this.places = PLACES;
    this.pos = { x: PLACES.bed.x, y: PLACES.bed.y };
    this._size(SIZE);
    this.face = -1;                         // -1 faces left (as drawn), 1 faces right
    this.root = null;
    this._timers = new Set();
    this._mouse = { x: -1, y: -1, t: 0, v: 0 };
    this._petMs = 0;
    this._huntCool = 0;
    this._batCool = 0;
    this._running = false;
    this._onMove = (e) => this._move(e);
  }

  /* ── lifecycle ── */
  start() {
    if (this._running) return;
    this._running = true;
    try { window.__pdxCat = this; } catch (err) {}
    if (!this.root && !this._mount()) { this._later(() => { this._running = false; this.start(); }, 500); return; }
    window.addEventListener("mousemove", this._onMove, { passive: true });
    this._watchScene();
    this._watchCore();
    this._think(4 + Math.random() * 6);
  }
  stop() {
    this._running = false;
    window.removeEventListener("mousemove", this._onMove);
    this._timers.forEach(clearTimeout); this._timers.clear();
    if (this._sceneObs) this._sceneObs.disconnect();
    this._setPurr(false);
  }

  _mount() {
    const grid = document.querySelector(".game-grid");
    if (!grid) return false;
    const old = document.getElementById("cat"); if (old) old.remove();
    const bed = document.createElement("div");
    bed.id = "cat-bed"; bed.setAttribute("aria-hidden", "true");
    bed.innerHTML = bedSVG();
    grid.appendChild(bed);
    this.bed = bed;
    const root = document.createElement("div");
    root.id = "cat"; root.setAttribute("aria-label", "The cat"); root.setAttribute("role", "img");
    root.innerHTML = catSVG();
    grid.appendChild(root);
    this.root = root;
    this.svg = root.querySelector(".catw-svg");
    this._poseEls = [...root.querySelectorAll(".cw-pose")];
    this._applyPose("sleep");
    this._size(this.sizeUnits);
    return true;
  }

  /* ── her size and her places, for tables other than the desk (the phone layout):
        window.__pdxCat.setSize(units) and window.__pdxCat.setPlaces({ name: { x, y,
        lie, sit } }, home). Units are plane units (1% of the 2133x1200 plane); a
        place named "bed" carries her cushion, without one the cushion hides. ── */
  setSize(units) { if (units > 4 && units < 60) this._size(units); }
  setPlaces(places, home) {
    if (!places || !Object.keys(places).length) return;
    this._cancelMove();
    this.places = places;
    this.place = places[home] ? home : Object.keys(places)[0];
    const p = this.places[this.place];
    this.pos = { x: p.x, y: p.y };
    this._size(this.sizeUnits);
    this._settle();
  }
  _size(units) {
    this.sizeUnits = units;
    this.boxW = units * UX; this.boxH = this.boxW * VB_H / VB_W;
    if (!this.root) return;
    this.root.style.width = this.boxW.toFixed(1) + "px";
    this.root.style.height = this.boxH.toFixed(1) + "px";
    const b = this.places.bed;
    if (this.bed) {
      this.bed.style.display = b ? "" : "none";
      if (b) {
        const bw = units * 0.48 * UX;
        this.bed.style.width = bw.toFixed(1) + "px";
        this.bed.style.transform = `translate(${(b.x * UX - bw / 2).toFixed(1)}px, ${(b.y * UY + units * 0.04 * UY - bw * 150 / 420).toFixed(1)}px)`;
      }
    }
    this._place(0);
  }

  /* ── public API ── */
  pet() {
    // a click on her: she leans into it wherever she is
    if (!this.root) return;
    this._petStart(2600);
  }
  // The one truth of "on the cat": the DRAWN pose's rect (hidden poses have none),
  // inset so the whole cursor ring must be over her.
  hitTest(x, y) {
    const r = this._poseRect(); if (!r) return false;
    const IN = 16;
    return x >= r.left + IN && x <= r.right - IN && y >= r.top + IN && y <= r.bottom - IN;
  }
  startle() {
    if (!this.root || this.state === "scared") return;
    this._cancelMove();
    this._enter("scared", 0);
    this.root.classList.add("jolt");
    this._later(() => this.root && this.root.classList.remove("jolt"), 420);
    if (this.onMeow && Math.random() < 0.5) this.onMeow();
    this._later(() => this._goTo(this.places.ledge ? "ledge" : this.place, 1.8), 700);
  }
  setMood(m) {
    if (m === this.mood) return;
    this.mood = m;
    if (this.root) this.root.classList.toggle("mood-afraid", m === "afraid");
    if (m === "afraid" && this.places.ledge && this.place !== "ledge") this._later(() => this._goTo("ledge", 1.5), 400);
  }

  /* ── states ── */
  _enter(state, secs) {
    this.state = state;
    this._applyPose(state);
    clearTimeout(this._stateT);
    if (secs > 0) this._stateT = this._later(() => { if (this.state === state) this._settle(); }, secs * 1000);
  }
  _applyPose(state) {
    if (!this.root) return;
    const pose = POSE_OF[state] || "sit";
    const extra = { walk: "walking", flee: "walking ears-back", pet: "petted purring", groom: "grooming", crouch: "hunting",
      scared: "ears-back", bite: "biting", bat: "batting", watch: "pupils-wide", sleep: "sleeping", curl: "sleeping" }[state] || "";
    const keep = ["mood-afraid", "by-core", "offstage", "face-right", "petted", "purring", "jolt"].filter((c) => this.root.classList.contains(c)
      && (c !== "petted" && c !== "purring" || state === "pet" || this._petting));
    const x = "x-" + (this.mood === "afraid" && pose === "crouch" ? "scared" : (EXPR[state] || "relaxed"));
    this.root.className = ["cat-being", "pose-" + pose, x, extra, ...keep].filter(Boolean).join(" ");
    if (this._pose && this._pose !== pose) {
      // a new drawing lands with a little squash (the class goes, or it would hold every other loop)
      void this.root.offsetWidth;
      this.root.classList.add("shift");
      clearTimeout(this._shiftT);
      this._shiftT = setTimeout(() => this.root && this.root.classList.remove("shift"), 340);
    }
    this._pose = pose;
    this._rect = null;
    if (state !== "pet" && !this._petting) this._setPurr(false);
  }
  // after anything, she goes back to being a cat in her place
  _settle() {
    if (this.mood === "afraid") { this._enter("scared", 0); return; }
    const p = this.places[this.place];
    if (p && p.lie) this._enter(Math.random() < 0.55 ? "curl" : "sleep", 0);
    else this._enter("sit", 0);
    this._think(10 + Math.random() * 14);
  }

  _setPurr(on) {
    if (on === !!this._purring) return;
    this._purring = on;
    try { const a = window.__audio; if (a && a.purrLoop) a.purrLoop(on); } catch (err) {}
    if (this.root) this.root.classList.toggle("purring", on);
  }

  /* ── the slow brain of a cat: every so often, maybe do something ── */
  _think(secs) {
    clearTimeout(this._thinkT);
    this._thinkT = this._later(() => this._decide(), secs * 1000);
  }
  _decide() {
    if (!this._running || !this.root) return;
    const busy = ["walk", "crouch", "pounce", "bite", "bat", "pet", "scared"].includes(this.state);
    if (busy || this._petting) { this._think(6); return; }
    if (!this._seen) { this._think(20 + Math.random() * 20); return; }   // nobody is watching: she naps on
    if (this.mood === "afraid") { this._think(12); return; }
    const r = Math.random();
    const lying = this.state === "sleep" || this.state === "curl";
    if (lying) {
      // mostly she sleeps on; now and then she gets up and sits a while
      if (r < 0.7) { this._think(24 + Math.random() * 24); return; }
      if (!this.places[this.place].sit) { this._goTo(this._otherPlace()); return; }
      this._enter("sit", 0); this._flick();
      this._think(8 + Math.random() * 8);
      return;
    }
    if (r < 0.35) {
      // a stroll to another of her places
      this._goTo(this._otherPlace());
    } else if (r < 0.55) {
      this._enter("groom", 3.2 + Math.random() * 2.5);
    } else if (r < 0.8 && this.places[this.place] && this.places[this.place].lie) {
      this._settle();
    } else {
      this._flick();
      if (this.onMeow && Math.random() < 0.15) this.onMeow();
      this._think(10 + Math.random() * 10);
    }
  }
  _otherPlace() {
    const others = Object.keys(this.places).filter((k) => k !== this.place);
    return others[Math.floor(Math.random() * others.length)];
  }
  _flick() {
    if (!this.root) return;
    this.root.classList.remove("flick"); void this.root.offsetWidth;
    this.root.classList.add("flick");
    this._later(() => this.root && this.root.classList.remove("flick"), 950);
  }

  /* ── moving: a CSS transition carries her, the timer tells her she arrived ── */
  _goTo(name, speedMul = 1) {
    const p = this.places[name]; if (!p || !this.root) return;
    this._cancelMove();
    const dx = p.x - this.pos.x, dy = p.y - this.pos.y, dist = Math.hypot(dx, dy * UY / UX);
    this.place = name;
    this.root.classList.toggle("by-core", name === "core");
    if (dist < 0.4) { this._settle(); return; }
    if (Math.abs(dx) > 0.3) this.face = dx > 0 ? 1 : -1;
    this._enter(this.state === "scared" || this.mood === "afraid" ? "flee" : "walk", 0);
    const secs = dist / (WALK_SPEED * speedMul);
    this.pos = { x: p.x, y: p.y };
    this._place(secs);
    this._moveT = this._later(() => {
      this._moveT = null;
      if (this._updSeen) this._updSeen();
      if (name === "core" && Math.random() < 0.6) { this._enter("sit", 0); this._faceCore(); this._think(8 + Math.random() * 10); }
      else this._settle();
    }, secs * 1000 + 60);
  }
  _cancelMove() {
    if (this._moveT) { clearTimeout(this._moveT); this._timers.delete(this._moveT); this._moveT = null; }
    if (this.root && this.root.style.transitionDuration !== "0s") {
      // freeze where she is now: read the live position once and pin it
      const m = new DOMMatrixReadOnly(getComputedStyle(this.root).transform);
      this.pos = { x: (m.m41 + this.boxW / 2) / UX, y: (m.m42 + this.boxH) / UY };
      this._place(0);
    }
  }
  _place(secs) {
    if (!this.root) return;
    const tx = this.pos.x * UX - this.boxW / 2, ty = this.pos.y * UY - this.boxH;
    this.root.style.transitionDuration = secs > 0 ? secs.toFixed(2) + "s" : "0s";
    this.root.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    this.root.classList.toggle("face-right", this.face > 0);
    this._rect = null;
  }
  _faceCore() {
    const core = document.getElementById("hela-brain-full");
    const r = core && core.getBoundingClientRect(), me = this._poseRect();
    if (!r || !me || !r.width) return;
    const want = (r.left + r.width / 2) > (me.left + me.width / 2) ? 1 : -1;
    if (want !== this.face) { this.face = want; this._place(0); }
  }

  /* ── the scene: she acts only while the paperwork desk is in view ── */
  _watchScene() {
    const cam = document.getElementById("cam");
    const upd = this._updSeen = () => {
      const g = window.__game;
      const scene = (g && g.camera && g.camera.scene) || (cam && cam.dataset.scene) || "main";
      const seen = scene === "drawer" || (scene === "main" && this.pos.x > -4);
      if (seen === this._seen) return;
      this._seen = seen;
      this._rect = null;
      if (this.root) this.root.classList.toggle("offstage", !seen);
      if (!seen) { this._petEnd(); }
    };
    upd();
    if (cam && window.MutationObserver) {
      this._sceneObs = new MutationObserver(upd);
      this._sceneObs.observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
    }
  }
  _poseRect() {
    if (!this.root || !this._seen) return null;
    if (this._rect && performance.now() - this._rectT < 400) return this._rect;
    let rr = null;
    for (const gp of this._poseEls) { const r = gp.getBoundingClientRect(); if (r.width > 0) { rr = r; break; } }
    this._rect = rr; this._rectT = performance.now();
    return rr;
  }

  /* ── the pointer: gaze, petting, the hunt. Read only on real mouse moves. ── */
  _move(e) {
    const now = performance.now();
    const m = this._mouse, dt = Math.max(16, now - m.t);
    const v = m.t ? Math.hypot(e.clientX - m.x, e.clientY - m.y) / dt : 0;   // px per ms
    m.v = m.v * 0.7 + v * 0.3; m.x = e.clientX; m.y = e.clientY; m.t = now;
    if (!this._seen || !this.root || !this._running) return;
    const r = this._poseRect(); if (!r) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
    const dx = m.x - cx, dy = m.y - cy, dist = Math.hypot(dx, dy);
    this._gaze(dx, dy, dist);

    // petting: a slow hand on her
    const on = this.hitTest(m.x, m.y);
    if (on && m.v < 0.9 && !["pounce", "bite", "crouch", "scared", "walk"].includes(this.state)) {
      this._petMs += Math.min(dt, 80);
      if (this._petMs > 380) this._petStart(1500);
      else if (this._petting) this._petStart(1500);
      return;
    }
    if (!on) this._petMs = Math.max(0, this._petMs - dt);

    // the hunt: the hand darts past her while she is up, and she has not played lately
    const awake = ["sit", "watch", "groom"].includes(this.state);
    if (awake && m.v > 1.4 && dist < r.width * 1.6 && dist > r.width * 0.4 && now > this._huntCool && this.mood !== "afraid") {
      this._huntCool = now + 70000 + Math.random() * 60000;
      if (Math.random() < 0.6) this._hunt();
    }
  }
  _gaze(dx, dy) {
    if (!["sit", "watch", "bat", "crouch", "scared"].includes(this.state)) return;
    if (this.face > 0) dx = -dx;               // the drawing is mirrored when she faces right
    const px = Math.round(Math.max(-5, Math.min(5, dx * 0.015))), py = Math.round(Math.max(-3, Math.min(4, dy * 0.015)));
    if (px !== this._px) { this._px = px; this.root.style.setProperty("--px", px + "px"); }
    if (py !== this._py) { this._py = py; this.root.style.setProperty("--py", py + "px"); }
  }
  _petStart(ms) {
    if (!this.root) return;
    this._petting = true;
    const lying = this.state === "sleep" || this.state === "curl";
    if (!lying && this.state !== "pet") { this._cancelMove(); this._enter("pet", 0); }
    this.root.classList.add("petted");
    document.body.classList.add("cat-petting");     // the hand strokes her (app.css armPet)
    this._setPurr(true);
    clearTimeout(this._petT);
    this._petT = this._later(() => this._petEnd(), ms);
  }
  _petEnd() {
    if (!this._petting) return;
    this._petting = false; this._petMs = 0;
    clearTimeout(this._petT);
    if (this.root) this.root.classList.remove("petted");
    document.body.classList.remove("cat-petting");
    this._setPurr(false);
    if (this.state === "pet") this._enter("sit", 2.5 + Math.random() * 2);
  }
  _hunt() {
    this._cancelMove();
    this._enter("crouch", 0);
    const m = this._mouse;
    const r = this._poseRect(); if (!r) return;
    const want = m.x > r.left + r.width / 2 ? 1 : -1;
    if (want !== this.face) { this.face = want; this._place(0); }
    // the butt wiggle, then the leap at wherever the hand is by then
    this._later(() => {
      if (this.state !== "crouch" || !this._seen) return;
      const r2 = this._poseRect(); if (!r2) return;
      const scale = this.boxW / (this.root.getBoundingClientRect().width || this.boxW);   // viewport px -> plane px
      const hop = Math.max(-7, Math.min(7, (this._mouse.x - (r2.left + r2.width / 2)) * scale / UX * 0.6));
      const from = { ...this.pos }, to = { x: Math.max(ROAM.x0, Math.min(ROAM.x1, from.x + hop)), y: from.y };
      this._enter("pounce", 0);
      const a = (p, lift) => `translate(${(p.x * UX - this.boxW / 2).toFixed(1)}px, ${(p.y * UY - this.boxH - lift * this.sizeUnits / 26).toFixed(1)}px)`;
      const anim = this.root.animate([{ transform: a(from, 0) }, { transform: a({ x: (from.x + to.x) / 2, y: from.y }, 70) }, { transform: a(to, 0) }],
        { duration: 460, easing: "cubic-bezier(.3,.6,.4,1)" });
      this.pos = to; this._place(0);
      anim.onfinish = () => {
        if (this.state !== "pounce") return;
        const hand = this.hitTest(this._mouse.x, this._mouse.y) || Math.abs(this._mouse.x - (r2.left + r2.width / 2)) < r2.width;
        if (hand) {
          this._enter("bite", 0);
          try { window.__handNibble && window.__handNibble(this._mouse.x, this._mouse.y); } catch (err) {}
          if (this.onMeow) this.onMeow();
        }
        // then she sits a moment, pleased with herself, and strolls back to her place
        this._later(() => {
          if (this.state !== "bite" && this.state !== "pounce") return;
          this._enter("sit", 0); this._flick();
          this._later(() => { if (this.state === "sit") this._goTo(this.place); }, 1800);
        }, hand ? 1100 : 300);
      };
    }, 1300);
  }

  /* ── HELA's core: she watches her spin and bats at the Hours; she is never touched ── */
  _watchCore() {
    const bind = () => {
      const core = document.getElementById("hela-brain-full");
      if (!core) { this._later(bind, 3000); return; }
      core.addEventListener("pointerdown", () => this._coreSpins(), { passive: true });
    };
    bind();
  }
  _coreSpins() {
    if (!this._seen || this._petting || this.mood === "afraid") return;
    const now = performance.now();
    if (["walk", "crouch", "pounce", "bite", "scared"].includes(this.state)) return;
    const lying = this.state === "sleep" || this.state === "curl";
    if (lying) {
      // one ear turns to her; she does not get up for it every time
      this.root.classList.add("ear-flick");
      this._later(() => this.root && this.root.classList.remove("ear-flick"), 900);
      if (Math.random() < 0.7 || now < this._batCool) return;
    }
    if (now < this._batCool) { this._enter("watch", 3); this._faceCore(); return; }
    this._batCool = now + 45000 + Math.random() * 30000;
    this._enter("watch", 0); this._faceCore();
    this._later(() => {
      if (this.state !== "watch") return;
      const core = this.places.core;
      if (!core) { this._batAtCore(); return; }
      if (this.place !== "core") { this._goTo("core", 1.4); this._later(() => this._batAtCore(), 600 + 1000 * Math.hypot(this.pos.x - core.x, this.pos.y - core.y) / (WALK_SPEED * 1.4)); }
      else this._batAtCore();
    }, 900);
  }
  _batAtCore() {
    if (!this.root || this._petting || this.state === "walk") return;
    this._faceCore();
    this._enter("bat", 2.4);
  }

  _later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); fn(); }, ms);
    this._timers.add(t);
    return t;
  }
}
