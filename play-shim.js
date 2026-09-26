/* play-shim.js, loaded before the game. The browser version has no server:
   the Python game runs in a Web Worker (play-worker.js). This shim routes the
   client's fetch("/api/...") and WebSocket(".../ws/...") calls to that worker,
   so the game client itself runs unchanged. */
(function () {
  // THE DEMO MARKER. The client reads this to tell the truth about the build: the
  // browser demo is you against AI opponents, with no friends to invite and no
  // room code to share. The class lets the stylesheets hide desktop-only controls
  // before the first paint.
  window.PARADOX_DEMO = true;
  document.documentElement.classList.add("pdx-demo");
  const worker = new Worker("play-worker.js?202609261656", { type: "module" });
  let nextId = 1;
  const httpWaiters = new Map();
  const sockets = new Map();

  // ---- loading veil until Python is up ------------------------------------
  const veil = document.createElement("div");
  veil.id = "play-veil";
  veil.innerHTML = '<div class="pv-box"><div class="pv-title">PARA<span>DOX</span></div>' +
    '<div class="pv-line">Warming up the time machine…</div><div class="pv-bar"><i></i></div></div>';
  const css = document.createElement("style");
  css.textContent =
    "#play-veil{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;" +
    "background:#13100C;color:#EFE6D0;font:14px/1.4 ui-monospace,Menlo,Consolas,monospace;transition:opacity .5s}" +
    "#play-veil .pv-title{font-size:44px;font-weight:800;letter-spacing:.04em;margin-bottom:14px}" +
    "#play-veil .pv-title span{color:#4FD6C0}" +
    "#play-veil .pv-bar{margin-top:14px;height:2px;width:260px;background:#34291F;overflow:hidden}" +
    "#play-veil .pv-bar i{display:block;height:100%;width:40%;background:#4FD6C0;animation:pv 1.2s ease-in-out infinite}" +
    "@keyframes pv{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}" +
    // Browser version: solo against AI opponents. Hosting, joining by code, the
    // split-screen table and the Test Room need the desktop app or a server.
    "#btn-testroom,#btn-table,.desktop-only{display:none!important}";
  document.head.appendChild(css);
  const mountVeil = () => document.body && !veil.isConnected && document.body.appendChild(veil);
  if (document.body) mountVeil(); else document.addEventListener("DOMContentLoaded", mountVeil);

  // The public build is a demo: say so where the build stamp sits.
  const stampDemo = () => {
    const s = document.getElementById("build-stamp");
    if (s) { s.textContent = "DEMO"; s.style.opacity = ".6"; }
  };
  if (document.readyState !== "loading") stampDemo(); else document.addEventListener("DOMContentLoaded", stampDemo);

  // ---- updates for testers -------------------------------------------------
  // A tab left open learns about a new build from the page's own ETag check
  // (index.html); here the notice says it in the demo's words and reloads on a
  // click. A tester who comes back after an update gets a short "what's new"
  // note in the corner, once, that never blocks the table.
  const BUILD = "202609261656", WHATS_NEW = ["A clearer main menu: Play vs AI, Learn to Play, and a way back to the menu from anywhere, even mid-match.", "Text size and an accessible interface option in the menu and in Settings.", "Messages stay until you have read them; tutorial lines wait for you.", "Slow pace is really slow now, and the tutorial starts on it.", "The cursor stays on top of everything.", "The tutorial starts over: HELA wakes you up. More of the story is on its way.", "HELA's memory is a comic book on your desk: press L to open it.", "A line under the phases says what the current phase is for and who can act.", "Every traveller has their own colour."];
  const noticeUpdate = () => {
    const b = document.getElementById("stale-banner");
    if (!b) return;
    b.textContent = "A new version of the demo is out. Click here or press F5 to reload.";
    b.style.cursor = "pointer";
    b.style.pointerEvents = "auto";
    b.addEventListener("click", () => location.reload());
  };
  const showWhatsNew = () => {
    let seen = null;
    try { seen = localStorage.getItem("pdx-demo-build"); localStorage.setItem("pdx-demo-build", BUILD); } catch (e) {}
    if (!seen || seen === BUILD || !WHATS_NEW.length) return;
    const note = document.createElement("div");
    note.id = "whats-new";
    note.setAttribute("role", "status");
    const head = document.createElement("b");
    head.textContent = "Updated since your last visit";
    const list = document.createElement("ul");
    for (const line of WHATS_NEW) { const li = document.createElement("li"); li.textContent = line; list.appendChild(li); }
    const hint = document.createElement("i");
    hint.textContent = "Click to close";
    note.append(head, list, hint);
    note.addEventListener("click", () => note.remove());
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 30000);
  };
  const whatsNewCss = document.createElement("style");
  whatsNewCss.textContent =
    "#whats-new{position:fixed;left:16px;bottom:40px;z-index:9998;max-width:380px;padding:12px 14px;" +
    "background:#1c1711;color:#efe6d0;border:2px solid #c9a227;box-shadow:4px 4px 0 #000;" +
    "font:14px/1.45 ui-monospace,Menlo,Consolas,monospace;cursor:pointer}" +
    "#whats-new b{display:block;color:#c9a227;margin-bottom:6px;letter-spacing:.04em}" +
    "#whats-new ul{margin:0;padding-left:18px}#whats-new i{display:block;margin-top:6px;opacity:.6;font-size:12px}";
  document.head.appendChild(whatsNewCss);
  const onReady = () => { noticeUpdate(); showWhatsNew(); };
  if (document.readyState !== "loading") onReady(); else document.addEventListener("DOMContentLoaded", onReady);

  worker.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.op === "ready") {
      veil.style.opacity = "0";
      setTimeout(() => veil.remove(), 600);
    } else if (m.op === "boot_error") {
      veil.querySelector(".pv-line").textContent = "The game could not load. Please refresh the page.";
      console.error(m.detail);
    } else if (m.op === "http_res") {
      const w = httpWaiters.get(m.id);
      if (w) { httpWaiters.delete(m.id); w(m.res); }
    } else if (m.op === "ws_open") {
      const s = sockets.get(m.id);
      if (s) s._opened();
    } else if (m.op === "ws_recv") {
      const s = sockets.get(m.id);
      if (s) s._deliver(JSON.stringify(m.data));
    } else if (m.op === "ws_close") {
      const s = sockets.get(m.id);
      if (s) s._closed(m.code || 1000);
    }
  };

  // ---- fetch("/api/...") -------------------------------------------------
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    if (!path.startsWith("/api/")) return realFetch(input, init);
    const id = nextId++;
    return new Promise((resolve) => {
      httpWaiters.set(id, (res) => resolve(new Response(JSON.stringify(res.body),
        { status: res.status, headers: { "Content-Type": "application/json" } })));
      worker.postMessage({ op: "http", id, path, method: (init && init.method) || "GET",
                           body: (init && init.body) || "" });
    });
  };

  // ---- WebSocket(".../ws/{code}/{seat}") ---------------------------------
  const RealWS = window.WebSocket;
  class PageSocket {
    constructor(url) {
      const m = String(url).match(/\/ws\/([^/]+)\/(.+)$/);
      this.id = nextId++;
      this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      sockets.set(this.id, this);
      worker.postMessage({ op: "ws_open", id: this.id, code: m[1], seat: decodeURIComponent(m[2]) });
    }
    _opened() { this.readyState = 1; if (this.onopen) this.onopen({}); }
    _deliver(data) { if (this.onmessage) this.onmessage({ data }); }
    _closed(code) {
      if (this.readyState === 3) return;
      this.readyState = 3; sockets.delete(this.id);
      if (this.onclose) this.onclose({ code });
    }
    send(data) { if (this.readyState === 1) worker.postMessage({ op: "ws_msg", id: this.id, data }); }
    close() {
      if (this.readyState === 3) return;
      worker.postMessage({ op: "ws_close", id: this.id });
      this._closed(1000);
    }
  }
  PageSocket.CONNECTING = 0; PageSocket.OPEN = 1; PageSocket.CLOSING = 2; PageSocket.CLOSED = 3;
  window.WebSocket = function (url, protocols) {
    return /\/ws\//.test(String(url)) ? new PageSocket(url) : new RealWS(url, protocols);
  };
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
})();
