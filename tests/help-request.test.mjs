import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { helpMessage, helpSituations } from "../lib/help-request.js";

const situations = helpSituations().map((item) => item.id);

test("each situation produces a distinct message", () => {
  const messages = situations.map((situation) => helpMessage(situation, "가야테마파크"));
  assert.equal(new Set(messages).size, messages.length);
});

test("every situation message includes the chosen place name", () => {
  for (const situation of situations) {
    assert.match(helpMessage(situation, "가야테마파크"), /가야테마파크/);
  }
  assert.match(helpMessage(null, "가야테마파크"), /가야테마파크/);
});

test("message is complete even without a place", () => {
  for (const situation of [...situations, null]) {
    const message = helpMessage(situation, null);
    assert.ok(message.length > 0);
    assert.ok(!message.includes("null"));
    assert.ok(!message.includes("undefined"));
  }
});

test("message length stays within the fixed cap even with a long place name", () => {
  const longName = "가".repeat(500);
  for (const situation of situations) {
    assert.ok(helpMessage(situation, longName).length <= 200);
  }
});

test("helpSituations exposes exactly the four required situations", () => {
  assert.deepEqual(situations.sort(), ["body", "companion", "equipment", "lost"].sort());
});

test("the module references no network, storage, or location APIs", () => {
  const source = readFileSync(fileURLToPath(new URL("../lib/help-request.js", import.meta.url)), "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "navigator.geolocation", "geolocation"]) {
    assert.ok(!source.includes(forbidden), `help-request.js must not reference ${forbidden}`);
  }
});
