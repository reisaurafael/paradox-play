/* =========================================================================
   resume.js, RECONNECT after a reload, and the purposeful LEAVE
   -------------------------------------------------------------------------
   The browser demo runs the game in the page itself: a reload used to lose the
   match. Now the game keeps a small record of it on this device (play-shim.js
   writes it at every save point; server/replay.py rebuilds the match from it),
   and the main menu offers it back at the top: "Reconnect to your match", with
   the Hour, who is at the table and when it was saved, plus Discard.

   The record never leaves this browser. LEAVING KEEPS IT (the owner, 27/09:
   "Always keep it"): Leave from Settings or the Menu key goes to the menu with the
   match waiting on this card. It goes only by Discard on this card, when the match
   ends, or when another match starts (the card warns first). A record from an
   older build of the game says so and offers only Discard: another game code may
   deal other dice from the same seed.
   ========================================================================= */
import { seatColor } from "./util.js?202609282350";
import { hydrateIcons } from "./icons.js?202609282350";
// Learn to Play keeps its lesson beside the record (tutorial-drive.js): a Reconnect
// in the middle of the lessons goes back to HELA's coach, lesson and all
import { resumeTutorial, readLesson, dropLesson } from "./tutorial-drive.js?202609282350";

const KEY = "pdx.resume.v1";           // play-shim.js writes the same key
const IN_MATCH = "pdx.inMatch";         // sessionStorage: a match was on screen in this tab
const RECORD_VERSION = 1;               // server/replay.py RECORD_VERSION

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object" || !o.record || typeof o.record !== "object") {
      localStorage.removeItem(KEY);
      return null;
    }
    return o;
  } catch (e) { return null; }
}
function remove() { try { localStorage.removeItem(KEY); } catch (e) {} }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }

/** The saved match, forgotten (Discard on the card, or a finished match left). */
function discard() {
  remove();
  dropLesson();
  try { window.__helaMemoryForget && window.__helaMemoryForget(); } catch (e) {}   // HELA's pages kept for it (cabin.js)
  ssSet(IN_MATCH, null);
}

/** Leaving on purpose: the record stays as it was at the open decision. The page
    is about to go; what the table does meanwhile (its AI stands in for the seat
    that left) must neither overwrite nor clear it. */
function keepForLater() {
  window.__pdxResumeBlocked = true;
  ssSet(IN_MATCH, null);
}

/** Is the match on screen the one the record keeps? */
function keptNow() {
  const saved = read();
  const g = window.__game;
  const code = g && g.conn && g.conn.code;
  return !!(saved && code && saved.room === code);
}

function ago(ms) {
  const d = new Date(ms);
  if (!ms || isNaN(d)) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "saved just now";
  if (s < 3600) { const m = Math.round(s / 60); return `saved ${m} minute${m === 1 ? "" : "s"} ago`; }
  const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `saved today at ${hh}:${mm}`;
  return `saved ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} at ${hh}:${mm}`;
}

function txt(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;   // names are text, never HTML
  return n;
}

/** The menu card, its states and the Reconnect itself.
    deps: { enterRoom(name, code, seat, room, opts), fail(msg), audio } */
export function initResume(deps) {
  const card = document.getElementById("resume-card");
  window.__pdxResume = { discard, keepForLater, keptNow, read };
  if (!card) return;
  let serverCode = null;               // the running build's game code (/api/health)
  let busy = false;

  // A reload during a match lands here: the flag survives the reload in this tab.
  const reloaded = ssGet(IN_MATCH) === "1";
  ssSet(IN_MATCH, null);

  function stale(saved) {
    const r = saved.record;
    if (r.v !== RECORD_VERSION) return true;
    return serverCode != null && r.build !== serverCode;
  }

  function render(state) {
    // a redraw keeps the keyboard where it was (the same button, drawn again)
    const had = card.contains(document.activeElement)
      ? ["rc-go", "rc-drop", "leave-ask"].find((c) => document.activeElement.classList.contains(c)) || "any"
      : null;
    draw(state);
    if (had) {
      const n = card.querySelector("." + had) || card.querySelector("button");
      if (n) n.focus({ preventScroll: true });
    }
  }

  function draw(state) {
    const saved = read();
    card.innerHTML = "";
    card.classList.remove("is-stale", "is-fresh", "is-failed", "is-busy");
    if (!saved) { card.hidden = true; return; }
    const r = saved.record;
    const old = stale(saved);
    const failed = state === "failed";
    card.hidden = false;
    card.classList.toggle("is-stale", old);
    card.classList.toggle("is-failed", failed);
    card.classList.toggle("is-fresh", reloaded && !old && !failed);
    card.setAttribute("aria-labelledby", "rc-title");

    const tut = r.mode === "tutorial";
    card.appendChild(txt("span", "rc-tag", old ? "Older version" : failed ? "Could not restore" : "Match saved"));
    const words = txt("div", "rc-words");
    const title = txt("h2", "rc-title",
      old ? "This match was saved by an older version"
        : failed ? "This match could not be restored"
          : tut ? "Reconnect to Learn to Play" : "Reconnect to your match");
    title.id = "rc-title";
    words.appendChild(title);

    const seats = Array.isArray(r.seats) ? r.seats : [];
    const meta = [`Hour ${Number(r.hour) || 1}`, `${seats.length} at the table`, ago(saved.saved_at)].filter(Boolean);
    words.appendChild(txt("p", "rc-meta", meta.join(" · ")));

    const table = txt("ul", "rc-table");
    table.setAttribute("aria-label", "Who is at the table");
    seats.forEach((s, i) => {
      const li = txt("li", s.name === r.host ? "is-you" : "");
      const dot = txt("i", "rc-dot");
      dot.setAttribute("aria-hidden", "true");
      dot.style.background = seatColor(Number.isInteger(s.colour) ? s.colour : i);
      li.appendChild(dot);
      li.appendChild(txt("span", "", s.name === r.host ? `${s.name} (you)` : String(s.name || "")));
      table.appendChild(li);
    });
    words.appendChild(table);

    let note = "";
    if (old) note = "The game has changed since it was saved, so it cannot be picked up again.";
    else if (failed) note = "It did not come back exactly as it was, so it cannot be picked up.";
    else if (reloaded) note = "The page reloaded during your match. It is waiting right where you left it.";
    else note = "It is waiting right where you left it.";
    words.appendChild(txt("p", "rc-note", note));
    // before he starts anything else: a new match takes this one's place
    if (!old && !failed) words.appendChild(txt("p", "rc-warn", "Starting a new match replaces your saved one."));
    card.appendChild(words);

    const acts = txt("div", "rc-actions");
    if (!old && !failed) {
      const go = txt("button", "btn btn-primary btn-ink rc-go");
      go.type = "button";
      go.innerHTML = '<span class="btn-ico" data-icon="play"></span> ';
      go.appendChild(txt("span", "rc-go-lbl", "Reconnect"));
      go.setAttribute("aria-describedby", "rc-title");
      go.addEventListener("click", () => reconnect(go));
      acts.appendChild(go);
      // Discard asks once, in place (the same line as Leave: never a pop-up)
      const box = txt("div", "leave-inline rc-discard");
      box.innerHTML =
        '<button class="btn btn-ghost btn-sm leave-ask" type="button">Discard</button>' +
        '<span class="leave-confirm" role="group" aria-label="Discard the saved match">' +
        '<span class="leave-q">Discard this match for good?</span>' +
        '<button class="btn btn-danger btn-sm leave-yes" type="button">Discard</button>' +
        '<button class="btn btn-ghost btn-sm leave-no" type="button">Keep</button></span>';
      const ask = box.querySelector(".leave-ask");
      const fold = (focus) => { box.classList.remove("is-asking"); if (focus) ask.focus({ preventScroll: true }); };
      ask.addEventListener("click", () => {
        box.classList.add("is-asking");
        box.querySelector(".leave-no").focus({ preventScroll: true });
        if (deps.audio) deps.audio.play("click");
      });
      box.querySelector(".leave-no").addEventListener("click", () => fold(true));
      box.querySelector(".leave-yes").addEventListener("click", () => {
        discard();
        if (deps.audio) deps.audio.play("click");
        render();
        const next = document.getElementById("btn-tutorial");
        if (next) next.focus({ preventScroll: true });
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && box.classList.contains("is-asking")) { e.stopPropagation(); fold(true); }
      });
      acts.appendChild(box);
    } else {
      const drop = txt("button", "btn btn-ghost rc-drop", "Discard");
      drop.type = "button";
      drop.addEventListener("click", () => {
        discard();
        if (deps.audio) deps.audio.play("click");
        render();
        const next = document.getElementById("btn-tutorial");
        if (next) next.focus({ preventScroll: true });
      });
      acts.appendChild(drop);
    }
    card.appendChild(acts);
    hydrateIcons(card);
  }

  async function reconnect(btn) {
    if (busy) return;
    const saved = read();
    if (!saved) { render(); return; }
    busy = true;
    card.classList.add("is-busy");
    card.setAttribute("aria-busy", "true");
    btn.disabled = true;
    btn.querySelector(".rc-go-lbl").textContent = "Restoring your match…";
    if (deps.fail) deps.fail("");
    let res = null, body = {};
    try {
      res = await fetch("/api/rooms/restore", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: saved.record }),
      });
      body = await res.json().catch(() => ({}));
    } catch (e) { res = null; }
    if (res && res.ok && body.code) {
      // the card keeps saying "Restoring" until the table is up (nothing flickers)
      window.__pdxResumeBlocked = false;
      if (saved.record.mode === "tutorial") {
        // the coach again, with the lesson it kept (or rebuilt from the table)
        resumeTutorial({ code: body.code, seat: body.seat, room: body.room }, readLesson(saved.room));
      } else {
        deps.enterRoom(body.seat, body.code, body.seat, body.room, { solo: true, resumed: true });
      }
      setTimeout(() => {
        if (!busy) return;
        busy = false;                        // the table never came: let him try again
        card.removeAttribute("aria-busy");
        render();
      }, 20000);
      return;
    }
    busy = false;
    card.removeAttribute("aria-busy");
    if (res && res.status === 409) {
      serverCode = "(changed)";
      render();
    } else {
      render("failed");
    }
    const first = card.querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }

  // The running build's game code: a record from another code is an older version.
  (async () => {
    try {
      const h = await fetch("/api/health").then((x) => x.json());
      if (h && typeof h.code === "string") {
        const saved = read();
        const was = saved ? stale(saved) : false;
        serverCode = h.code;
        if (!busy && !card.hidden && saved && stale(saved) !== was) render();
      }
    } catch (e) { /* no answer: Reconnect itself will tell */ }
  })();

  // A MATCH ON SCREEN. The tab remembers it (a reload lands back on the menu with
  // the Reconnect offered first), and a new match drops a saved record of another.
  const game = document.getElementById("screen-game");
  const landing = document.getElementById("screen-landing");
  if (game) new MutationObserver(() => {
    if (!game.classList.contains("is-active")) return;
    ssSet(IN_MATCH, "1");
    if (busy) { busy = false; card.removeAttribute("aria-busy"); }
    const saved = read();
    const g = window.__game;
    const code = g && g.conn && g.conn.code;
    if (saved && code && saved.room !== code) {
      // the new match's own save points write the record from here on
      remove();
      const les = readLesson(null);
      if (les && les.room !== code) dropLesson();
      window.__pdxResumeBlocked = false;
    }
  }).observe(game, { attributes: true, attributeFilter: ["class"] });
  if (landing) new MutationObserver(() => {
    if (landing.classList.contains("is-active") && !busy) render();
  }).observe(landing, { attributes: true, attributeFilter: ["class"] });

  // Learn to Play's own Leave (its lesson track) leaves on purpose too: keep it.
  document.addEventListener("click", (e) => {
    if (e.target && e.target.closest && e.target.closest("#tut-track .tt-leave")) keepForLater();
  }, true);

  render();
  if (reloaded && !card.hidden) {
    // offered right after the reload: the Reconnect has the keyboard focus
    const focusGo = () => {
      const go = card.querySelector(".rc-go") || card.querySelector("button");
      if (go && landing && landing.classList.contains("is-active")) go.focus({ preventScroll: true });
    };
    setTimeout(focusGo, 50);
  }
}

/** Labels of the Leave controls for the table on screen. Leaving keeps the match
    for Reconnect, Learn to Play too (lesson and all) from its first decision; before
    that nothing is kept yet, and it simply starts again. */
export function leaveWords() {
  const tut = document.body.classList.contains("tut") || document.body.dataset.roomMode === "tutorial";
  const back = "You can come back to it from the menu with Reconnect.";
  if (tut && !keptNow()) {
    const q = "Leave Learn to Play? You can start it again from the menu.";
    return { ask: "Leave Learn to Play", q, yes: "Leave", knob: q };
  }
  const q = `${tut ? "Leave Learn to Play" : "Leave the match"}? ${back}`;
  return { ask: tut ? "Leave Learn to Play" : "Leave match and go to menu", q, yes: "Leave", knob: q };
}
