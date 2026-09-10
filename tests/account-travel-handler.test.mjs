import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";
import { verifySameOriginMutation } from "../lib/security/request-boundaries.js";
import { TravelError } from "../lib/account-travel/model.js";

function compile(path, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!dependencies[name]) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; }, Response, Request, URL, TextEncoder, Set, Date });
  return exports;
}
const serverRequest = compile("../lib/server-request.ts", { "./security/request-boundaries.js": { verifySameOriginMutation } });
function handler(user = "owner") {
  const calls = [];
  const repo = { list: async id => { calls.push(id); return []; }, create: async (id, requestId, payload) => { calls.push([id, requestId, payload]); return { id: requestId }; }, savePreferences: async (id, ids, revision) => { calls.push([id, ids, revision]); return {}; } };
  const loaded = compile("../server/trips/account-handler.ts", {
    "../../features/community/server/session": { requiredCommunityUser: async () => user ? { user: { id: user } } : { error: "unauthenticated" } },
    "../../lib/server-request": serverRequest,
    "../../lib/account-travel/database.js": { accountTravelRepository: () => repo },
    "../../lib/account-travel/model.js": { TravelError },
    "../tourism/catalog": { profileFields: { wheelchair: true } },
    "../shared/env": { portableEnv: () => ({}) }, "../shared/provider-data": {}, "../tourism/accessibility-model": {},
  });
  return { run: loaded.accountTravelHandler, calls };
}
const request = (path = "", body, origin = "https://wave.example") => new Request(`https://wave.example/api/account/travel${path}`, { method: body === undefined ? "GET" : "POST", headers: { origin, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
test("account travel authenticates before storage and every response stays private", async () => {
  const anonymous = handler("");
  const result = await anonymous.run(request()); assert.equal(result.status, 401); assert.equal(anonymous.calls.length, 0); assert.match(result.headers.get("cache-control"), /private, no-store/);
  const signed = handler(); const success = await signed.run(request()); assert.equal(success.status, 200); assert.deepEqual(signed.calls, ["owner"]); assert.match(success.headers.get("cache-control"), /private, no-store/);
});
test("cross-origin, oversized and invalid preference requests never mutate; client owner cannot impersonate", async () => {
  const h = handler();
  assert.equal((await h.run(request("", { payload: {} }, "https://attacker.example"))).status, 403);
  assert.equal((await h.run(request("", { note: "x".repeat(16001) }))).status, 413);
  assert.equal((await h.run(request("/preferences", { revision: 0, selectedIds: ["invented-sensitive-data"] }))).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.run(request("", { id: "fixture", userId: "victim", payload: { title: "trip" } }))).status, 201);
  assert.equal(h.calls[0][0], "owner");
});
