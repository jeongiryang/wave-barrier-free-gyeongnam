import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { sanitizeVisitDurations } from "../lib/visit-durations.js";
import { createTravelBookSnapshot, travelBookRestorePayload } from "../lib/travel-book.js";
import { bookToAccountTrip } from "../lib/account-travel/model.js";
import { publicTravelBody } from "../lib/kakao-travel.js";
import { normalizeThemes } from "../lib/planner-criteria.js";

function sharedPayload() {
  const output = ts.transpileModule(readFileSync(new URL("../server/trips/payload.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", output)(mod, mod.exports, name => {
    if (name === "../shared/http") return { clean: (value, max) => String(value ?? "").trim().slice(0, max) };
    if (name === "../tourism/catalog") return { languageServices: { ko: "ko" }, profileFields: {}, regionCodes: { "창원": "1" } };
    if (name.endsWith("planner-criteria.js")) return { normalizeThemes };
    if (name.endsWith("visit-durations.js")) return { sanitizeVisitDurations };
    throw Error(name);
  });
  return mod.exports;
}

test("visit choices remain in archive, restore, account and public share without unknown IDs", () => {
  const book = createTravelBookSnapshot({ region: "창원", travelStart: "2026-09-11", travelEnd: "2026-09-11", places: [{ id: "1001", name: "미술관" }, { id: "1002", name: "공원" }], visitMinutesByPlaceId: { "1001": 137, "1002": 15, other: 90 } });
  const expected = { "1001": 137, "1002": 15 };
  assert.deepEqual(book.visitMinutesByPlaceId, expected);
  assert.deepEqual(travelBookRestorePayload(book).schedule.visitMinutesByPlaceId, expected);
  const account = bookToAccountTrip(book);
  assert.deepEqual(account.visitMinutesByPlaceId, expected);
  assert.deepEqual(publicTravelBody(account).selections.visitMinutesByPlaceId, expected);
});

test("invalid and inherited duration values never override defaults", () => {
  assert.deepEqual(sanitizeVisitDurations(Object.assign(Object.create({ inherited: 30 }), { valid: 720, a: true, b: "60", c: 30.5, d: 14, e: 721, f: null }), ["valid", "inherited", "a", "b", "c", "d", "e", "f"]), { valid: 720 });
  assert.deepEqual(sanitizeVisitDurations(null), {});
});

test("public share normalization keeps visit times only for the final deduplicated place list", () => {
  const { normalizeTripSelections, storedTripPayload } = sharedPayload();
  const ids = Array.from({ length: 13 }, (_, i) => String(1000 + i));
  const selections = normalizeTripSelections({ selectedPlaceIds: [ids[0], ids[0], "", ...ids], visitMinutesByPlaceId: Object.fromEntries([...ids.map(id => [id, 137]), ["private-location", 30]]) });
  assert.deepEqual(selections.selectedPlaceIds, ids.slice(0, 12));
  assert.deepEqual(Object.keys(selections.visitMinutesByPlaceId), ids.slice(0, 12));
  assert.equal(selections.visitMinutesByPlaceId[ids[11]], 137);
  const stored = storedTripPayload({ plan: { places: [{ id: ids[0], details: "provider raw details" }] } }, selections);
  assert.deepEqual(stored.selections.visitMinutesByPlaceId, selections.visitMinutesByPlaceId);
  assert.equal(JSON.stringify(stored).includes("provider raw details"), false);
});
