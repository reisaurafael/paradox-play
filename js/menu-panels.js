/* =========================================================================
   menu-panels.js, NEWS and COMMUNITY, the two panels from the main menu

   COMMUNITY_LINKS below is the only place the links live. An entry whose link
   is empty is not shown at all, so a link can be dropped in later without
   touching the layout. Every entry is a plain link that opens in a new tab
   only when the player clicks it (no referrer, no opener); the page itself
   sends nothing anywhere.

   Both panels close with Esc, the X and Back to menu, and give the focus back
   to the control that opened them. window.__pdxCommunity = { open, close } lets
   the trailer's last panel open Community; the News panel's "Watch the
   trailer" button shows once window.__pdxTrailer exists and calls its play().
   ========================================================================= */

const GITHUB_ISSUES = "https://github.com/reisaurafael/paradox-play/issues/new";

export const COMMUNITY_LINKS = {
  bug: GITHUB_ISSUES,      // Report a bug (GitHub Issues)
  idea: GITHUB_ISSUES,     // Share an idea or critique (GitHub Issues)
  form: "",                // Feedback form, no account needed
  discord: "",             // Discord
  donate: "",              // Support the project (donation)
};

const ENTRIES = [
  { key: "bug", title: "Report a bug", line: "Something broke or looked wrong? Tell me on GitHub.",
    need: "Needs a free GitHub account" },
  { key: "idea", title: "Share an idea or critique", line: "What would make the game better, or what did not work for you.",
    need: "Needs a free GitHub account" },
  { key: "form", title: "Feedback form", line: "Tell me what you think in a short form.", need: "No account needed" },
  { key: "discord", title: "Discord", line: "Talk about the game, share your records, support it.", need: "" },
  { key: "donate", title: "Support the project", line: "A donation keeps Paradox going.", need: "" },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function fillCommunity() {
  const list = document.getElementById("community-list");
  if (!list) return;
  list.innerHTML = ENTRIES.filter((e) => String(COMMUNITY_LINKS[e.key] || "").trim()).map((e) => `
    <li><a class="cm-link cm-${e.key}" href="${esc(COMMUNITY_LINKS[e.key].trim())}" target="_blank" rel="noopener noreferrer">
      <span class="cm-words"><b class="cm-title">${esc(e.title)}</b>
        <span class="cm-line">${esc(e.line)}</span>
        ${e.need ? `<span class="cm-need">${esc(e.need)}</span>` : ""}</span>
      <span class="cm-out" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></span>
      <span class="sr-only"> (opens in a new tab)</span></a></li>`).join("");
}

/* ---- open, close, focus ---- */
const PANELS = ["panel-news", "panel-community"];
let opener = null;

function current() {
  for (const id of PANELS) { const p = document.getElementById(id); if (p && !p.hidden) return p; }
  return null;
}

function syncTrailer() {
  const b = document.getElementById("btn-trailer");
  if (b) b.hidden = !(window.__pdxTrailer && typeof window.__pdxTrailer.play === "function");
}

function openPanel(id, from) {
  const p = document.getElementById(id);
  if (!p) return;
  const was = current();
  if (was && was !== p) was.hidden = true;
  else if (!was) opener = from || document.activeElement;
  if (id === "panel-news") syncTrailer();
  p.hidden = false;
  document.body.classList.add("menu-sheet-on");
  const sheet = p.querySelector(".menu-sheet");
  try { (sheet || p).focus({ preventScroll: true }); } catch (e) {}
}

function closePanels() {
  let any = false;
  for (const id of PANELS) { const p = document.getElementById(id); if (p && !p.hidden) { p.hidden = true; any = true; } }
  document.body.classList.remove("menu-sheet-on");
  if (any && opener && opener.isConnected && typeof opener.focus === "function") {
    try { opener.focus({ preventScroll: true }); } catch (e) {}
  }
  opener = null;
}

function focusables(p) {
  return [...p.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !el.hidden && el.offsetParent !== null);
}

document.addEventListener("keydown", (e) => {
  const p = current();
  if (!p) return;
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePanels(); return; }
  if (e.key === "Tab") {            // the focus stays inside the open panel
    const f = focusables(p);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !p.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !p.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }
}, true);

document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t || !t.closest) return;
  if (t.closest("#btn-news")) { openPanel("panel-news", t.closest("#btn-news")); return; }
  if (t.closest("#btn-community")) { openPanel("panel-community", t.closest("#btn-community")); return; }
  if (t.closest("[data-open-community]")) { openPanel("panel-community"); return; }
  if (t.closest("[data-sheet-close]")) { closePanels(); return; }
  if (t.closest("#btn-trailer")) {
    try { window.__pdxTrailer && window.__pdxTrailer.play(); } catch (err) {}
    return;
  }
  // a click on the dim backdrop, outside the paper, closes too
  if (t.classList && t.classList.contains("menu-sheet-back")) closePanels();
});

// the trailer may load after the menu: show its button as soon as it exists
window.addEventListener("pdx:trailer", syncTrailer);
window.addEventListener("load", syncTrailer);

window.__pdxCommunity = {
  open: () => openPanel("panel-community"),
  close: closePanels,
};
window.__pdxNews = {
  open: () => openPanel("panel-news"),
  close: closePanels,
};

fillCommunity();
syncTrailer();
