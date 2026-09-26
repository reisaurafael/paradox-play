/* =========================================================================
   net.js, REST + WebSocket client for the Paradoxo server
   -------------------------------------------------------------------------
   Talks the protocol defined in server/protocol.py + server/app.py. The server
   base URL is configurable so the same client runs in a browser (same origin)
   or inside the Tauri .exe (pointing at the official host).
   ========================================================================= */

// Same-origin by default; override for the desktop build (window.PARADOXO_SERVER).
export const SERVER = window.PARADOXO_SERVER || "";

const httpBase = SERVER || "";
const wsBase = (() => {
  if (SERVER) return SERVER.replace(/^http/, "ws");
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
})();

async function post(path, body) {
  const res = await fetch(httpBase + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export const api = {
  createRoom: (host, n_players, mode = "classic", colour = null) =>
    post("/api/rooms", { host, n_players, mode, colour }),
  joinRoom: (code, name, colour = null) =>
    post(`/api/rooms/${code}/join`, { name, colour }),
  addBot: (code, seat, strategy) => post(`/api/rooms/${code}/bot`, { seat, strategy }),
  start: (code) => post(`/api/rooms/${code}/start`),
};

/**
 * A live game connection. Opens one WebSocket for a seat and dispatches typed
 * messages to handlers. Auto-reconnects with backoff so a dropped link recovers
 * (the seat is bot-played in the meantime, then resumes on reconnect).
 */
export class Connection {
  constructor(code, seat) {
    this.code = code;
    this.seat = seat;
    this.handlers = {};        // type -> fn(msg)
    this.ws = null;
    this.closed = false;
    this._backoff = 500;
  }

  on(type, fn) { this.handlers[type] = fn; return this; }

  connect() {
    const url = `${wsBase}/ws/${this.code}/${encodeURIComponent(this.seat)}`;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { this._backoff = 500; this._emit("open", {}); };
    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this._emit(msg.type, msg);
    };
    this.ws.onclose = () => {
      this._emit("close", {});
      if (!this.closed) setTimeout(() => this._reconnect(), this._backoff);
    };
    this.ws.onerror = () => { try { this.ws.close(); } catch {} };
    return this;
  }

  _reconnect() {
    this._backoff = Math.min(this._backoff * 1.8, 8000);
    this.connect();
  }

  _emit(type, msg) { const h = this.handlers[type]; if (h) h(msg); }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  // High-level senders
  start() { this.send({ type: "start" }); }
  addBot(seat, strategy) { this.send({ type: "add_bot", seat, strategy }); }
  sync() { this.send({ type: "sync" }); }
  respond(requestId, data) {
    this.send({ type: "decision_response", request_id: requestId, data });
  }

  close() { this.closed = true; if (this.ws) this.ws.close(); }
}
