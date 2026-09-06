import assert from "node:assert/strict";
import test from "node:test";
import { verifiedPublicTransport } from "../scripts/production-transport-contract.mjs";

test("only completed validated transport queries can pass the Production provider gate", () => {
  const good = { configured: true, queryStatus: "success", resultCount: 3, state: "connected" };
  assert.equal(verifiedPublicTransport(good), true);
  for (const change of [
    { configured: false }, { queryStatus: undefined }, { queryStatus: "not-requested" }, { queryStatus: "error" },
    ...[undefined, null, "3", -1, 1.5, NaN, Infinity].map((resultCount) => ({ resultCount })),
    { state: "ready" }, { state: "error" }, { state: "missing" },
  ]) assert.equal(verifiedPublicTransport({ ...good, ...change }), false);
});

test("current arrival and train queries may be truly empty, while required catalogs must have records", () => {
  const empty = { configured: true, queryStatus: "success", resultCount: 0, state: "ready" };
  assert.equal(verifiedPublicTransport(empty, true), true);
  assert.equal(verifiedPublicTransport(empty), false);
  for (const change of [{ queryStatus: undefined }, { queryStatus: "not-requested" }, { queryStatus: "error" }, { resultCount: null }, { state: "error" }, { state: "connected" }]) {
    assert.equal(verifiedPublicTransport({ ...empty, ...change }, true), false);
  }
  assert.equal(verifiedPublicTransport({ configured: true, state: "ready" }, true), false);
  assert.equal(verifiedPublicTransport({ configured: true, state: "connected" }), false);
});
