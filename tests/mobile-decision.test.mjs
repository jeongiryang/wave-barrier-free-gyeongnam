import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("the mobile delivery decision stays consistent with the installable responsive web", async () => {
  const [decision, manifest] = await Promise.all([
    source("docs/mobile-app-decision.md"),
    source("app/manifest.ts"),
  ]);
  assert.match(decision, /별도 네이티브 앱을 만들지 않고 반응형 웹 하나로/);
  assert.match(decision, /## 앱을 다시 검토할 조건/);
  assert.match(decision, /Kotlin \+ Jetpack Compose/);
  assert.match(decision, /48dp/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/"/);
});
