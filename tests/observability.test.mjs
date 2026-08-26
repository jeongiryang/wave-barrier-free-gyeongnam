import assert from "node:assert/strict";
import test from "node:test";
import { recordOperationalEvent } from "../server/shared/observability.js";

test("operational events exclude coordinates, user identity and secrets", () => {
  const messages = [];
  const original = console.info;
  console.info = (...args) => messages.push(args.join(" "));
  try {
    recordOperationalEvent("route_result", {
      configured: true,
      alternatives: 2,
      startLat: 35.2,
      userEmail: "traveler@example.com",
      apiKey: "secret",
    });
  } finally {
    console.info = original;
  }
  assert.equal(messages.length, 1);
  assert.match(messages[0], /route_result/);
  assert.match(messages[0], /alternatives/);
  assert.doesNotMatch(messages[0], /35\.2|traveler|secret|apiKey|startLat/);
});
