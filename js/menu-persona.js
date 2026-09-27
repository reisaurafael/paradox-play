/* =========================================================================
   menu-persona.js, THE PERSONA in the main menu: the arm you play with

   Two choices under your colour in the You block: the build of the arm (a
   masculine or a feminine symbol, never the words on the button face) and the
   skin tone. The arm's art (cabin.js PERSONA) owns the choice and keeps it:
     window.__pdxPersona.get()              -> { build: "m" | "f", skin: 0..n-1 }
     window.__pdxPersona.set({ build, skin })
     window.__pdxPersona.tones              -> one swatch colour per skin index
   Until window.__pdxPersona exists the field stays hidden. The menu's pointer is the live preview: its hand is redrawn
   the moment the choice changes (menu-cursor.js listens for pdx:persona).
   Every choice is a radio button: arrows move within a group, Space or Enter
   or a click picks, and every swatch carries its name, never colour alone.
   ========================================================================= */

// the builds, as the art names them
const BUILDS = [
  { id: "m", name: "Masculine arm" },
  { id: "f", name: "Feminine arm" },
];
// the tones' names, light to dark (the art lists seven); any other count reads "Skin tone N"
const TONE_NAMES = ["Very light", "Light", "Light medium", "Medium", "Medium dark", "Dark", "Very dark"];
// the two symbols, drawn in ink so no system font or emoji can stand in
const SYMBOL = {
  m: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="14" r="6"/><path d="M14.3 9.7L20 4M14.5 4H20V9.5"/></svg>`,
  f: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M12 15V22M8.5 18.5H15.5"/></svg>`,
};

const field = document.getElementById("persona-field");
const buildsBox = document.getElementById("persona-builds");
const skinsBox = document.getElementById("persona-skins");
const nameOut = document.getElementById("persona-name");

const api = () => (window.__pdxPersona && typeof window.__pdxPersona.get === "function"
  && typeof window.__pdxPersona.set === "function") ? window.__pdxPersona : null;

function lists(P) {
  const tones = Array.isArray(P.tones) ? P.tones : [];
  const named = tones.length === TONE_NAMES.length;
  const skins = tones.map((hex, i) => ({ id: String(i), name: named ? TONE_NAMES[i] + " skin" : `Skin tone ${i + 1}`, hex: String(hex) }));
  return { builds: BUILDS, skins };
}

function current(P) {
  let g = {};
  try { g = P.get() || {}; } catch (e) {}
  return g;
}

function radio(box, items, on, cls, draw) {
  on = on == null ? null : String(on);
  box.innerHTML = "";
  items.forEach((it) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls + (it.id === on ? " is-on" : "");
    b.dataset.id = it.id;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", it.id === on ? "true" : "false");
    b.setAttribute("aria-label", it.name);
    b.title = it.name;
    // one tab stop per group: the chosen one (or the first)
    b.tabIndex = (it.id === on || (on == null && box.childElementCount === 0)) ? 0 : -1;
    draw(b, it);
    box.appendChild(b);
  });
  if (!box.querySelector('[tabindex="0"]') && box.firstElementChild) box.firstElementChild.tabIndex = 0;
}

function render() {
  const P = api();
  if (!field) return;
  if (!P) { field.hidden = true; return; }
  const { builds, skins } = lists(P);
  const g = current(P);
  radio(buildsBox, builds, g.build, "persona-build", (b, it) => {
    b.innerHTML = SYMBOL[it.id] || "";
  });
  radio(skinsBox, skins, g.skin, "persona-skin", (b, it) => { if (it.hex) b.style.background = it.hex; });
  skinsBox.hidden = !skins.length;
  const bn = (builds.find((x) => x.id === String(g.build)) || {}).name || "";
  const sn = (skins.find((x) => x.id === String(g.skin)) || {}).name || "";
  if (nameOut) nameOut.textContent = [bn.replace(/ arm$/i, ""), sn.replace(/ skin$/i, "")].filter(Boolean).join(", ");
  field.hidden = false;
}

function choose(kind, id) {
  const P = api();
  if (!P) return;
  const g = current(P);
  const next = { build: g.build, skin: g.skin };
  next[kind] = kind === "skin" ? parseInt(id, 10) : id;
  try { P.set(next); } catch (e) {}
  render();
  try { window.dispatchEvent(new CustomEvent("pdx:persona", { detail: next })); } catch (e) {}
  try { window.__audio && window.__audio.play && window.__audio.play("click"); } catch (e) {}
}

if (field) {
  field.addEventListener("click", (e) => {
    const b = e.target.closest(".persona-build, .persona-skin");
    if (!b) return;
    choose(b.classList.contains("persona-build") ? "build" : "skin", b.dataset.id);
    const again = field.querySelector(`.${b.classList.contains("persona-build") ? "persona-build" : "persona-skin"}[data-id="${CSS.escape(b.dataset.id)}"]`);
    if (again) again.focus();
  });
  // arrows move and pick inside a group, like any radio group
  field.addEventListener("keydown", (e) => {
    const b = e.target.closest(".persona-build, .persona-skin");
    if (!b) return;
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(k)) return;
    e.preventDefault();
    const group = b.parentElement;         // render() rebuilds the buttons, not the group
    const all = [...group.children];
    let i = all.indexOf(b);
    if (k === "Home") i = 0; else if (k === "End") i = all.length - 1;
    else i = (i + (k === "ArrowLeft" || k === "ArrowUp" ? -1 : 1) + all.length) % all.length;
    const t = all[i];
    choose(t.classList.contains("persona-build") ? "build" : "skin", t.dataset.id);
    const again = group.querySelector(`[data-id="${CSS.escape(t.dataset.id)}"]`);
    if (again) again.focus();
  });
}

// the arm's art may arrive after the menu; a change made elsewhere shows here too
render();
try { const P = api(); if (P && typeof P.onChange === "function") P.onChange(() => render()); } catch (e) {}
window.addEventListener("load", render);
window.addEventListener("pdx:persona-ready", render);
