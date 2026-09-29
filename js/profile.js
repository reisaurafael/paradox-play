/* =========================================================================
   profile.js, the operative's profile, kept on THIS machine

   Fixed name, preferred colour, and the match history with the win rate.
   It all lives in the app's own localStorage: nothing leaves, there is no
   account, no profile server, nobody collects anything from anyone.
   ========================================================================= */
// On the split-screen table each panel is a player. Panel 1 is the machine's
// owner and uses the usual profile; the others keep theirs under their own key,
// or all four would write to the same service record.
const PANEL = (() => {
  try { return parseInt(new URLSearchParams(location.search).get("panel")) || 0; } catch (e) { return 0; }
})();
const KEY = "paradoxo.profile.v1" + (PANEL > 1 ? ".panel" + PANEL : "");
const MAX_HISTORY = 40;
import { seatColor, setHelaColour } from "./util.js?202609282350";
// HELA wears the chosen colour from the menu on; in a match game.js hands her the
// seat colour the server settled (the same one the piece wears on the map).
function tintHela(i) { try { setHelaColour(seatColor(i)); } catch (e) {} }

const EMPTY = { name: "", colour: 0, history: [] };

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw);
    return {
      name: typeof p.name === "string" ? p.name.slice(0, 24) : "",
      colour: Number.isInteger(p.colour) ? Math.max(0, Math.min(5, p.colour)) : 0,
      history: Array.isArray(p.history) ? p.history.slice(-MAX_HISTORY) : [],
    };
  } catch (e) { return { ...EMPTY }; }
}

function write(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  return p;
}

tintHela(read().colour);

export const profile = {
  get() { return read(); },

  setName(name) {
    const p = read();
    p.name = String(name || "").trim().slice(0, 24);
    return write(p);
  },

  setColour(i) {
    const p = read();
    p.colour = Math.max(0, Math.min(5, Number(i) || 0));
    tintHela(p.colour);
    return write(p);
  },

  /** A finished match goes into the history. I keep what is worth checking
      later over a drink: when, who won, how many Hours, my CP. */
  record(entry) {
    const p = read();
    p.history.push({
      at: Date.now(),
      won: !!entry.won,
      winner: String(entry.winner || "").slice(0, 24),
      players: (entry.players || []).slice(0, 6).map((n) => String(n).slice(0, 24)),
      hours: Number(entry.hours) || 0,
      cp: Number(entry.cp) || 0,
      reason: String(entry.reason || "").slice(0, 40),
    });
    if (p.history.length > MAX_HISTORY) p.history = p.history.slice(-MAX_HISTORY);
    return write(p);
  },

  stats() {
    const h = read().history;
    const games = h.length;
    const wins = h.filter((x) => x.won).length;
    return {
      games, wins, losses: games - wins,
      rate: games ? Math.round((wins / games) * 100) : 0,
      streak: (() => {
        let s = 0;
        for (let i = h.length - 1; i >= 0; i--) { if (!h[i].won) break; s++; }
        return s;
      })(),
      bestCp: h.reduce((m, x) => Math.max(m, x.cp || 0), 0),
    };
  },

  clearHistory() {
    const p = read();
    p.history = [];
    return write(p);
  },
};
