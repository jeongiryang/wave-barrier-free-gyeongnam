import assert from "node:assert/strict";
import test from "node:test";
import { calculateAccessibilityEvidence } from "../lib/accessibility-score.js";

test("accessibility evidence does not invent a score without official fields", () => {
  assert.deepEqual(calculateAccessibilityEvidence(0, 0, 5), { score: null, confidence: 0 });
});

test("accessibility evidence is based only on requested official fields", () => {
  assert.deepEqual(calculateAccessibilityEvidence(3, 3, 5), { score: 60, confidence: 60 });
  assert.deepEqual(calculateAccessibilityEvidence(3, 5, 5), { score: 60, confidence: 100 });
  assert.deepEqual(calculateAccessibilityEvidence(5, 5, 5), { score: 100, confidence: 100 });
});

test("accessibility evidence clamps malformed provider counts", () => {
  assert.deepEqual(calculateAccessibilityEvidence(9, 8, 5), { score: 100, confidence: 100 });
  assert.deepEqual(calculateAccessibilityEvidence(-1, -2, 5), { score: null, confidence: 0 });
  assert.deepEqual(calculateAccessibilityEvidence(0, 0, 0), { score: null, confidence: 0 });
});
