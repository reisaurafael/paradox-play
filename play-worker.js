/* play-worker.js, runs the Python game (engine, bots, session) under Pyodide,
   off the page's main thread so the table never freezes while bots think. */
import { loadPyodide } from "./pyodide/pyodide.mjs";

const queue = [];
let server = null;

async function boot() {
  const pyodide = await loadPyodide();
  const zip = await (await fetch("game.zip?202609261550")).arrayBuffer();
  pyodide.FS.writeFile("/game.zip", new Uint8Array(zip));
  pyodide.runPython("import sys; sys.path.insert(0, '/game.zip')");
  server = pyodide.pyimport("play_server");
  postMessage(JSON.stringify({ op: "ready" }));
  while (queue.length) handle(queue.shift());
}

async function handle(m) {
  try {
    if (m.op === "http") {
      const res = await server.http(m.method, m.path, m.body || "");
      postMessage(JSON.stringify({ op: "http_res", id: m.id, res: JSON.parse(res) }));
    } else if (m.op === "ws_open") {
      await server.ws_open(m.id, m.code, m.seat);
    } else if (m.op === "ws_msg") {
      await server.ws_msg(m.id, m.data);
    } else if (m.op === "ws_close") {
      server.ws_close(m.id);
    }
  } catch (e) {
    console.error(e);
    if (m.op === "http") {
      postMessage(JSON.stringify({ op: "http_res", id: m.id,
        res: { status: 500, body: { detail: "The time machine hit an error." } } }));
    }
  }
}

onmessage = (e) => {
  const m = e.data;
  if (server) handle(m); else queue.push(m);
};

boot().catch((e) => postMessage(JSON.stringify({ op: "boot_error", detail: String(e) })));
