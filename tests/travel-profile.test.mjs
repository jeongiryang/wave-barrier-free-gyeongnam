import assert from "node:assert/strict";
import test from "node:test";
import { createTravelProfile, sanitizeTravelProfile } from "../features/planner/profile/travel-profile.js";

const allowed = ["wheel", "senior", "baby", "pregnant", "visual", "hearing"];

test("travel profile stores only unique user-selected catalog IDs", () => {
  assert.deepEqual(createTravelProfile(["wheel", "unknown", "wheel", "hearing"], allowed, 1000), {
    version: 1,
    selectedIds: ["wheel", "hearing"],
    updatedAt: 1000,
  });
});

test("damaged, empty and unsupported profile payloads fail closed", () => {
  assert.equal(sanitizeTravelProfile(null, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 2, selectedIds: ["wheel"], updatedAt: 1000 }, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 1, selectedIds: ["unknown"], updatedAt: 1000 }, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 1, selectedIds: ["wheel"], updatedAt: "bad" }, allowed), null);
});

test("profile sanitation removes unknown values without inventing conditions", () => {
  assert.deepEqual(sanitizeTravelProfile({ version: 1, selectedIds: ["senior", "diagnosis"], updatedAt: 2000 }, allowed), {
    version: 1,
    selectedIds: ["senior"],
    updatedAt: 2000,
  });
});
