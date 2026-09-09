import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { proxyFetch } from "httpxy";
import { NodeRequest, sendNodeResponse } from "srvx/node";
import { devWorkerConnection } from "../scripts/vite-dev-connection.mjs";

function middleware() {
  let handle;
  const plugin = devWorkerConnection();
  assert.equal(plugin.apply, "serve");
  assert.equal(plugin.enforce, "pre");
  plugin.configureServer({ middlewares: { use(fn) { handle = fn; } } });
  return handle;
}

test("Nitro's NodeRequest forwards the same close policy through header iteration", async t => {
  const received = [];
  const sockets = new Set();
  const worker = createServer(async (req, res) => {
    sockets.add(req.socket);
    let body = "";
    for await (const part of req) body += part;
    received.push({ method: req.method, url: req.url, body, connection: req.headers.connection, custom: req.headers["x-wave-test"] });
    res.end("actual worker response");
  });
  worker.listen(0, "127.0.0.1");
  await once(worker, "listening");
  const address = `http://127.0.0.1:${worker.address().port}`;
  const handle = middleware();
  const ingress = createServer(async (req, res) => {
    try {
      handle(req, res, () => {});
      const response = await proxyFetch(address, new NodeRequest({ req, res }));
      await sendNodeResponse(res, response);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  ingress.listen(0, "127.0.0.1");
  await once(ingress, "listening");
  t.after(() => { ingress.closeAllConnections(); ingress.close(); worker.closeAllConnections(); worker.close(); });
  for (const method of ["GET", "POST", "GET"]) {
    const response = await fetch(`http://127.0.0.1:${ingress.address().port}/planner?region=Changwon`, {
      method, headers: { connection: "keep-alive", "x-wave-test": "preserved" },
      ...(method === "POST" ? { body: "preserved body" } : {}),
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "actual worker response");
  }
  assert.deepEqual(received, ["GET", "POST", "GET"].map(method => ({
    method, url: "/planner?region=Changwon", body: method === "POST" ? "preserved body" : "", connection: "close", custom: "preserved",
  })));
  assert.equal(sockets.size, 3, "the actual NodeRequest forwarding path must not pool worker sockets");
});

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
  const rawHeaders = ["Connection", "Upgrade", "Upgrade", "websocket"];
  handle({ headers, rawHeaders }, {}, () => {});
  assert.deepEqual(headers, { connection: "Upgrade", upgrade: "websocket" });
  assert.deepEqual(rawHeaders, ["Connection", "Upgrade", "Upgrade", "websocket"]);
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

test("development raw header policy handles absent and repeated mixed-case Connection only", () => {
  const handle = middleware();
  for (const connections of [[], ["Connection", "keep-alive", "cOnNeCtIoN", "keep-alive"]]) {
    const rawHeaders = ["Host", "localhost", ...connections, "X-Example", "first", "X-Example", "second"];
    const request = { headers: { host: "localhost", "x-example": "first, second" }, rawHeaders };
    let calls = 0;
    handle(request, {}, () => { calls++; });
    const webHeaders = new NodeRequest({ req: request }).headers;
    assert.equal(webHeaders.get("connection"), "close");
    assert.equal(new Headers(webHeaders).get("connection"), "close");
    assert.equal(new Headers(webHeaders).get("x-example"), "first, second");
    assert.deepEqual(rawHeaders, ["Host", "localhost", "X-Example", "first", "X-Example", "second", "Connection", "close"]);
    assert.equal(calls, 1);
  }
});
