import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { proxyFetch } from "httpxy";
import { devWorkerConnection } from "../scripts/vite-dev-connection.mjs";

function middleware() {
  let handle;
  const plugin = devWorkerConnection();
  assert.equal(plugin.apply, "serve");
  assert.equal(plugin.enforce, "pre");
  plugin.configureServer({ middlewares: { use(fn) { handle = fn; } } });
  return handle;
}

test("development worker receives fresh connections and unchanged request data", async t => {
  const received = [];
  const sockets = new Set();
  const server = createServer(async (req, res) => {
    sockets.add(req.socket);
    let body = "";
    for await (const part of req) body += part;
    received.push({ method: req.method, url: req.url, body, connection: req.headers.connection });
    res.end("actual worker response");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = `http://127.0.0.1:${server.address().port}`;
  const handle = middleware();
  for (const method of ["GET", "POST", "GET"]) {
    const headers = { connection: "keep-alive", "content-type": "text/plain" };
    let calls = 0;
    handle({ headers }, {}, () => { calls++; });
    assert.equal(calls, 1);
    const response = await proxyFetch(address, `${address}/planner?region=Changwon`, {
      method, headers, ...(method === "POST" ? { body: "preserved body" } : {}),
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "actual worker response");
  }
  assert.equal(sockets.size, 3, "no worker socket is reused after a response");
  assert.deepEqual(received, ["GET", "POST", "GET"].map(method => ({
    method, url: "/planner?region=Changwon", body: method === "POST" ? "preserved body" : "", connection: "close",
  })));
});

test("development connection policy preserves upgrades and genuine server failures", async t => {
  const handle = middleware();
  const headers = { connection: "Upgrade", upgrade: "websocket" };
  handle({ headers }, {}, () => {});
  assert.deepEqual(headers, { connection: "Upgrade", upgrade: "websocket" });
  let requests = 0;
  const server = createServer((_req, res) => { requests++; res.writeHead(500); res.end("worker failure"); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = `http://127.0.0.1:${server.address().port}`;
  const request = { headers: {} };
  handle(request, {}, () => {});
  const response = await proxyFetch(address, `${address}/planner`, { headers: request.headers });
  assert.equal(response.status, 500);
  assert.equal(await response.text(), "worker failure");
  assert.equal(requests, 1, "errors are not hidden by an automatic retry");
});
