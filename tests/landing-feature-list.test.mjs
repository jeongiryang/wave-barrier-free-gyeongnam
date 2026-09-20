import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { landingFeatures } from "../features/landing/feature-list.ts";

test("landing lists no more than eight verified features", () => {
  assert.ok(landingFeatures.length > 0 && landingFeatures.length <= 8);
  for (const feature of landingFeatures) {
    assert.ok(feature.title.trim());
    assert.ok(feature.body.trim());
    assert.doesNotMatch(`${feature.title} ${feature.body}`, /모두|안전(?:하게|한)|완벽|보장(?:해요|합니다)/);
  }
});

test("every linked feature points to an implemented application route", () => {
  for (const feature of landingFeatures) {
    if (!feature.href) continue;
    const pathname = new URL(feature.href, "https://wave.local").pathname;
    const route = pathname === "/" ? "app/page.tsx" : `app${pathname}/page.tsx`;
    assert.equal(existsSync(new URL(`../${route}`, import.meta.url)), true, `${feature.id}: ${route}`);
  }
});
