import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { TOUR_API_SERVICE_KEY_ENCODED: "synthetic-private-key" };
const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const body = (id = "verified-1") => ({ response: { header: { resultCode: "0000" }, body: {
  items: { item: [{ contentid: id, title: `Place ${id}` }] }, totalCount: 1,
} } });
const ok = (id) => Response.json(body(id));
const requestId = url => new URL(url).searchParams.get("pageNo") || "1";

// Run the real adapter and requester with an isolated transport/cache/clock.
// No global fetch replacement and no live provider or account requests.
function fixture(fetchFixture, now = () => 0) {
  const modules = new Map();
  class FixtureDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now()])); }
    static now() { return now(); }
  }
  function load(name) {
    let file = resolve(root, name);
    if (!existsSync(file)) file += ".ts";
    if (modules.has(file)) return modules.get(file).exports;
    const mod = { exports: {} };
    modules.set(file, mod);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("module", "exports", "require", "fetch", "Date", code)(
      mod, mod.exports, specifier => {
        if (!specifier.startsWith(".")) throw Error("Unexpected adapter dependency");
        return load(resolve(dirname(file), specifier));
      }, fetchFixture, FixtureDate,
    );
    return mod.exports;
  }
  const { fetchTourismData } = load("server/shared/tourism-provider.ts");
  return {
    load,
    run: (page = "1", { service = "KorService2", operation = "areaBasedList2", params = {}, signal, key = env.TOUR_API_SERVICE_KEY_ENCODED } = {}) =>
      fetchTourismData({ TOUR_API_SERVICE_KEY_ENCODED: key }, service, operation, { pageNo: String(page), ...params }, signal),
  };
}

function gatedTransport(result = id => ok(id)) {
  const calls = [];
  const pending = new Map();
  let draining = false;
  let active = 0;
  let peak = 0;
  const fetcher = async (url, options) => {
    const id = requestId(url);
    calls.push(id);
    active++;
    peak = Math.max(peak, active);
    const gate = deferred();
    pending.set(id, gate);
    const aborted = deferred();
    const onAbort = () => aborted.resolve();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      if (options.signal?.aborted) throw new DOMException("Synthetic cancelled request", "AbortError");
      if (!draining) await Promise.race([gate.promise, aborted.promise]);
      if (options.signal?.aborted) throw new DOMException("Synthetic cancelled request", "AbortError");
      return result(id);
    } finally {
      options.signal?.removeEventListener("abort", onAbort);
      active--;
      pending.delete(id);
    }
  };
  return {
    fetcher, calls, peak: () => peak,
    release: id => pending.get(String(id))?.resolve(),
    drain: () => { draining = true; for (const gate of pending.values()) gate.resolve(); },
  };
}

test("public tourism lists share a maximum of three active requests across both list services", { timeout: 5000 }, async t => {
  const transport = gatedTransport();
  const { run } = fixture(transport.fetcher);
  t.after(transport.drain);
  const pending = Array.from({ length: 9 }, (_, index) => run(index + 1, {
    service: index % 2 ? "KorWithService2" : "KorService2",
  }));
  const settled = Promise.allSettled(pending);
  await turn();
  assert.equal(transport.calls.length, 3, "the initial district/theme burst must stop at three");
  transport.release("1");
  await turn();
  assert.equal(transport.calls.length, 4, "one completed request admits one queued request");
  transport.drain();
  const results = await settled;
  assert.equal(transport.calls.length, 9);
  assert.equal(transport.peak(), 3);
  assert.deepEqual(results.map(result => result.status), Array(9).fill("fulfilled"));
  assert.deepEqual(results.map(result => result.value.items[0].contentid), Array.from({ length: 9 }, (_, index) => String(index + 1)));
});

test("a list keeps its slot until the response body has been read and validated", { timeout: 5000 }, async t => {
  const calls = [];
  const gates = new Map();
  let draining = false;
  const { run } = fixture(async url => {
    const id = requestId(url);
    calls.push(id);
    const gate = deferred();
    gates.set(id, gate);
    return { ok: true, status: 200, headers: new Headers(), text: async () => {
      if (!draining) await gate.promise;
      return JSON.stringify(body(id));
    } };
  });
  const drain = () => { draining = true; for (const gate of gates.values()) gate.resolve(); };
  t.after(drain);
  const settled = Promise.allSettled([1, 2, 3, 4].map(page => run(page)));
  await turn();
  assert.equal(calls.length, 3, "receiving headers alone must not admit the fourth request");
  gates.get("1").resolve();
  await turn();
  assert.equal(calls.length, 4);
  drain();
  assert.ok((await settled).every(result => result.status === "fulfilled"));
});

test("identical list callers coalesce and later callers reuse an independent successful result", { timeout: 5000 }, async t => {
  const transport = gatedTransport();
  const { run } = fixture(transport.fetcher);
  t.after(transport.drain);
  const pending = [run(1), run(1), run(1)];
  const settled = Promise.allSettled(pending);
  await turn();
  assert.equal(transport.calls.length, 1);
  transport.drain();
  const results = await settled;
  assert.ok(results.every(result => result.status === "fulfilled"));
  results[0].value.items[0].title = "Consumer-local change";
  const cached = await run(1);
  assert.equal(transport.calls.length, 1, "completed public data must be reused within its TTL");
  assert.equal(cached.items[0].title, "Place 1", "one consumer cannot mutate the cached public result");
});

test("successful list data expires and is never returned indefinitely as a fresh provider result", async () => {
  let time = 0;
  let calls = 0;
  const { run } = fixture(async () => ok(`version-${++calls}`), () => time);
  assert.equal((await run()).items[0].contentid, "version-1");
  time = 299999;
  assert.equal((await run()).items[0].contentid, "version-1");
  assert.equal(calls, 1);
  time = 300000;
  assert.equal((await run()).items[0].contentid, "version-2");
  assert.equal(calls, 2);
});

test("public cache keys isolate service, district, theme, page and credentials without exposing the key", async () => {
  let calls = 0;
  const { run } = fixture(async () => ok(`variant-${++calls}`));
  const variants = [
    [1, {}],
    [2, {}],
    [1, { service: "KorWithService2" }],
    [1, { operation: "searchKeyword2" }],
    [1, { params: { lDongSignguCd: "121" } }],
    [1, { params: { contentTypeId: "14" } }],
    [1, { key: "synthetic-alternate-key" }],
  ];
  const first = [];
  for (const [page, options] of variants) first.push(await run(page, options));
  assert.equal(calls, variants.length);
  assert.equal(new Set(first.map(result => result.items[0].contentid)).size, variants.length);
  for (let index = 0; index < variants.length; index++) {
    const [page, options] = variants[index];
    assert.deepEqual(await run(page, options), first[index]);
  }
  assert.equal(calls, variants.length);
  assert.doesNotMatch(JSON.stringify(first), /synthetic-private|synthetic-alternate|serviceKey|https:\/\//);
});

test("HTTP failures, provider errors and malformed success bodies never enter the public success cache", async () => {
  const failures = [
    () => Response.json({ private: "synthetic-error-detail" }, { status: 503 }),
    () => Response.json({ response: { header: { resultCode: "10", resultMsg: "synthetic-error-detail" } } }),
    () => new Response("synthetic-malformed-json"),
    () => Response.json({ ok: true }),
    () => Response.json({ response: { header: { resultCode: "0000" }, body: { totalCount: 1, items: "" } } }),
  ];
  for (const failedResponse of failures) {
    let calls = 0;
    const { run } = fixture(async () => ++calls === 1 ? failedResponse() : ok("recovered"));
    await assert.rejects(run(), error => !/synthetic|serviceKey/.test(error.message));
    assert.equal((await run()).items[0].contentid, "recovered");
    assert.equal(calls, 2, "recovery must make a new provider request after a failed response");
    assert.equal((await run()).items[0].contentid, "recovered");
    assert.equal(calls, 2, "only the recovered successful response is cacheable");
  }
});

test("an official successful empty list is distinct from a failure and may be reused", async () => {
  let calls = 0;
  const { run } = fixture(async () => {
    calls++;
    return Response.json({ response: { header: { resultCode: "0000" }, body: { items: "", totalCount: 0 } } });
  });
  assert.deepEqual(await run(), { items: [], total: 0 });
  assert.deepEqual(await run(), { items: [], total: 0 });
  assert.equal(calls, 1);
});

test("non-list detail and private model POST responses retain their uncached contract", async () => {
  let listCalls = 0;
  const { run, load } = fixture(async () => { listCalls++; return ok(); });
  await run(1, { operation: "detailWithTour2" });
  await run(1, { operation: "detailWithTour2" });
  assert.equal(listCalls, 2);
  const { createProviderRequester } = load("server/shared/provider-request.js");
  const request = createProviderRequester();
  let privateCalls = 0;
  const privateFetch = async () => { privateCalls++; return Response.json({ reply: `reply-${privateCalls}` }); };
  const context = { provider: "local-llm", operation: "chat/completions" };
  for (let index = 1; index <= 2; index++) {
    const response = await request(context, "https://synthetic.test/chat", { method: "POST", body: "synthetic-message" }, privateFetch);
    assert.equal((await response.json()).reply, `reply-${index}`);
  }
  assert.equal(privateCalls, 2);
});

test("a 429 closes already queued requests before fetch and a late success cannot reopen the circuit", { timeout: 5000 }, async t => {
  let time = 0;
  const transport = gatedTransport(id => id === "1"
    ? Response.json({ private: "synthetic-error-detail" }, { status: 429, headers: { "Retry-After": "120" } })
    : ok(id));
  const { run } = fixture(transport.fetcher, () => time);
  t.after(transport.drain);
  const pending = Array.from({ length: 8 }, (_, index) => run(index + 1));
  const settled = Promise.allSettled(pending);
  await turn();
  assert.equal(transport.calls.length, 3);
  transport.release("1");
  await turn();
  assert.equal(transport.calls.length, 3, "queued requests must recheck the new circuit before fetching");
  transport.drain();
  const results = await settled;
  assert.deepEqual(results.map(result => result.status), ["rejected", "fulfilled", "fulfilled", ...Array(5).fill("rejected")]);
  for (const result of results.filter(result => result.status === "rejected")) {
    assert.equal(result.reason.failure.kind, "rate_limited");
    assert.equal(result.reason.failure.retryAfterMs, 120000);
    assert.doesNotMatch(JSON.stringify(result.reason), /synthetic|serviceKey|https:\/\//);
  }
  await assert.rejects(run(9), error => error.failure.kind === "rate_limited");
  assert.equal(transport.calls.length, 3);
  time = 120000;
  assert.equal((await run(9)).items[0].contentid, "9");
  assert.equal(transport.calls.length, 4);
});

test("aborting a queued list settles without a fetch and does not block the next queued request", { timeout: 5000 }, async t => {
  const transport = gatedTransport();
  const { run } = fixture(transport.fetcher);
  t.after(transport.drain);
  const active = [run(1), run(2), run(3)];
  const allActive = Promise.allSettled(active);
  const controller = new AbortController();
  let abortedSettled = false;
  const cancelled = run(4, { signal: controller.signal }).then(
    () => { abortedSettled = true; return "fulfilled"; },
    () => { abortedSettled = true; return "rejected"; },
  );
  const next = run(5);
  const nextSettled = Promise.allSettled([next]);
  await turn();
  assert.equal(transport.calls.length, 3);
  controller.abort();
  await turn();
  assert.equal(abortedSettled, true, "cancellation must not wait for an occupied network slot");
  assert.equal(await cancelled, "rejected");
  assert.ok(!transport.calls.includes("4"));
  transport.release("1");
  await turn();
  assert.deepEqual(transport.calls, ["1", "2", "3", "5"]);
  transport.drain();
  assert.ok((await allActive).every(result => result.status === "fulfilled"));
  assert.equal((await nextSettled)[0].value.items[0].contentid, "5");
  assert.equal((await run(4)).items[0].contentid, "4", "the cancelled key remains retryable");
  assert.equal(transport.calls.filter(id => id === "4").length, 1);
});

test("aborting an active list releases its slot and leaves neither a cached failure nor an in-flight entry", { timeout: 5000 }, async t => {
  const transport = gatedTransport();
  const { run } = fixture(transport.fetcher);
  t.after(transport.drain);
  const controller = new AbortController();
  const pending = [run(1, { signal: controller.signal }), run(2), run(3), run(4)];
  const settled = Promise.allSettled(pending);
  await turn();
  assert.deepEqual(transport.calls, ["1", "2", "3"]);
  controller.abort();
  await turn();
  assert.deepEqual(transport.calls, ["1", "2", "3", "4"]);
  transport.drain();
  const results = await settled;
  assert.deepEqual(results.map(result => result.status), ["rejected", "fulfilled", "fulfilled", "fulfilled"]);
  assert.equal((await run(1)).items[0].contentid, "1");
  assert.equal(transport.calls.filter(id => id === "1").length, 2);
  assert.ok(transport.peak() <= 3);
});

test("a pre-aborted list never contacts the provider and does not poison a later valid request", async () => {
  let calls = 0;
  const { run } = fixture(async () => { calls++; return ok(); });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(run(1, { signal: controller.signal }));
  assert.equal(calls, 0);
  assert.equal((await run(1)).items[0].contentid, "verified-1");
  assert.equal(calls, 1);
});

test("cancelling one identical-list consumer preserves the other consumer and caches its successful result", { timeout: 5000 }, async t => {
  const transport = gatedTransport();
  const { run } = fixture(transport.fetcher);
  t.after(transport.drain);
  const first = new AbortController();
  const second = new AbortController();
  let cancelledSettled = false;
  let survivorSettled = false;
  const cancelled = run(1, { signal: first.signal }).then(
    () => { cancelledSettled = true; return "fulfilled"; },
    () => { cancelledSettled = true; return "rejected"; },
  );
  const survivor = run(1, { signal: second.signal }).then(
    value => { survivorSettled = true; return { status: "fulfilled", value }; },
    reason => { survivorSettled = true; return { status: "rejected", reason }; },
  );
  await turn();
  assert.equal(transport.calls.length, 1);
  first.abort();
  await turn();
  assert.equal(cancelledSettled, true);
  assert.equal(await cancelled, "rejected");
  assert.equal(survivorSettled, false, "one caller must not cancel a shared request still needed by another caller");
  transport.drain();
  const result = await survivor;
  assert.equal(result.status, "fulfilled");
  assert.equal(result.value.items[0].contentid, "1");
  assert.equal((await run(1)).items[0].contentid, "1");
  assert.equal(transport.calls.length, 1);
});

test("cancelling the last identical-list consumer aborts the transport and permits a fresh same-key request", { timeout: 5000 }, async t => {
  const transport = gatedTransport();
  const { run } = fixture(transport.fetcher);
  t.after(transport.drain);
  const first = new AbortController();
  const second = new AbortController();
  let complete = false;
  const settled = Promise.allSettled([run(1, { signal: first.signal }), run(1, { signal: second.signal })])
    .then(results => { complete = true; return results; });
  await turn();
  assert.equal(transport.calls.length, 1);
  first.abort();
  second.abort();
  // A retry in the same turn must not join the old, already-aborted transport.
  transport.drain();
  const replacement = Promise.allSettled([run(1)]);
  await turn();
  assert.equal(complete, true, "the last cancellation must settle without waiting for the response body");
  assert.deepEqual((await settled).map(result => result.status), ["rejected", "rejected"]);
  const result = (await replacement)[0];
  assert.equal(result.status, "fulfilled");
  assert.equal(result.value.items[0].contentid, "1");
  assert.equal(transport.calls.length, 2, "a fully cancelled request is neither cached nor retained as in flight");
});
