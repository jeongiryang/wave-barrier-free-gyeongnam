import assert from "node:assert/strict";
import test from "node:test";
import { createTravelProfile, sanitizeTravelProfile } from "../features/planner/profile/travel-profile.js";

const allowed = ["route", "parking", "elevator", "restroom", "audioguide"];

test("travel profile stores only unique user-selected catalog IDs", () => {
  assert.deepEqual(createTravelProfile(["parking", "unknown", "parking", "audioguide"], allowed, 1000), {
    version: 1,
    selectedIds: ["parking", "audioguide"],
    updatedAt: 1000,
  });
});

test("damaged, empty and unsupported profile payloads fail closed", () => {
  assert.equal(sanitizeTravelProfile(null, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 2, selectedIds: ["parking"], updatedAt: 1000 }, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 1, selectedIds: ["unknown"], updatedAt: 1000 }, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 1, selectedIds: ["parking"], updatedAt: "bad" }, allowed), null);
});

test("profile sanitation removes unknown values without inventing conditions", () => {
  assert.deepEqual(sanitizeTravelProfile({ version: 1, selectedIds: ["senior", "diagnosis"], updatedAt: 2000 }, allowed), {
    version: 1,
    selectedIds: ["route", "elevator", "restroom"],
    updatedAt: 2000,
  });
});
