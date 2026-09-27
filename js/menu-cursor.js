/* =========================================================================
   menu-cursor.js, the MATCH POINTER in the main menu

   The menu wears the same pointer as the table: HELA's reticle with the
   gloved right hand on its rim (the art comes from cabin.js, window.__cursorArt).
   The reticle is drawn in HELA's colour, which is the player's colour, so
   picking a swatch recolours the pointer under the player's own hand.

   It lives only while the menu or the match setup is on screen. The moment
   the table mounts (body.cabin-on) the cabin's own pointer takes over and
   this one empties itself: the hand's gradient id must exist only once.
   It sits on top of absolutely everything, and it never takes a click.
   A touch screen or a keyboard never sees it: it wakes on a real mouse move.
   ========================================================================= */

const box = document.createElement("div");
box.id = "menu-cursor";
box.setAttribute("aria-hidden", "true");
document.body.appendChild(box);

let filled = false, x = -999, y = -999, raf = 0, mouse = false;

function wanted() {
  const b = document.body;
  if (b.classList.contains("cabin-on")) return false;
  const game = document.getElementById("screen-game");
  if (game && game.classList.contains("is-active")) return false;
  return mouse && !!window.__cursorArt;
}

function fill(on) {
  if (on === filled) return;
  filled = on;
  if (on) {
    const art = window.__cursorArt;
    box.innerHTML = `<div class="mc-radar">${art.radar()}</div><div class="mc-hand" data-grab="0">${art.hand()}</div>`;
  } else {
    box.innerHTML = "";
  }
  document.body.classList.toggle("menu-hand", on);
}

/* HELA's eye on the Learn to Play panel looks at the hand: the pupil leans a
   few units toward the pointer. Calm motion keeps it still, looking ahead. */
let eyeX = 0, eyeY = 0;
function look() {
  const eye = document.querySelector("#btn-tutorial .hl-eye");
  if (!eye) return;
  let dx = 0, dy = 0;
  const calm = window.__pdxCalm || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (mouse && x > -999 && !calm && eye.offsetWidth) {
    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ax = x - cx, ay = y - cy, d = Math.hypot(ax, ay) || 1;
    const k = Math.min(1, d / 260);          // near the eye it leans less
    dx = (ax / d) * 13 * k; dy = (ay / d) * 7 * k;
  }
  if (Math.abs(dx - eyeX) < 0.3 && Math.abs(dy - eyeY) < 0.3) return;
  eyeX = dx; eyeY = dy;
  eye.style.setProperty("--hl-x", dx.toFixed(1) + "px");
  eye.style.setProperty("--hl-y", dy.toFixed(1) + "px");
}

function draw() {
  raf = 0;
  const on = wanted();
  fill(on);
  if (!on) return;
  look();
  // the same size the pointer will have on the table (the plane's fit scale)
  const f = window.__pdxFit || 1;
  box.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${f.toFixed(4)})`;
}
const soon = () => { if (!raf) raf = requestAnimationFrame(draw); };

window.addEventListener("pointermove", (e) => {
  if (e.pointerType && e.pointerType !== "mouse") return;
  mouse = true; x = e.clientX; y = e.clientY; soon();
}, { passive: true });
window.addEventListener("pointerdown", (e) => {
  if (e.pointerType && e.pointerType !== "mouse") { mouse = false; soon(); return; }
  const h = box.querySelector(".mc-hand"); if (h) h.dataset.grab = "1";
}, true);
window.addEventListener("pointerup", () => {
  const h = box.querySelector(".mc-hand"); if (h) h.dataset.grab = "0";
}, true);
document.addEventListener("mouseleave", () => { x = y = -999; soon(); });
// a new persona (menu-persona.js) redraws the hand at once: the live preview
window.addEventListener("pdx:persona", () => { if (filled) { filled = false; box.innerHTML = ""; } soon(); });
// the screens change without a mouse move (a match starts, Back to menu)
new MutationObserver(soon).observe(document.body, { attributes: true, attributeFilter: ["class"] });
