import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("the mobile delivery decision stays consistent with the contest submission", async () => {
  const [decision, compliance, readme] = await Promise.all([
    source("docs/mobile-app-decision.md"),
    source("docs/contest-compliance.md"),
    source("README.md"),
  ]);
  // 제출 형태와 모바일 결정이 서로 어긋나면 안 된다.
  assert.match(decision, /별도 네이티브 앱을 만들지 않고 반응형 웹 하나로/);
  assert.match(compliance, /제출 형태: \*\*반응형 웹 서비스\*\*/);
  // 결정을 뒤집을 조건이 비어 있으면 기록이 아니라 선언에 그친다.
  assert.match(decision, /## 앱을 다시 검토할 조건/);
  assert.match(decision, /Kotlin \+ Jetpack Compose/);
  assert.match(decision, /48dp/);
  assert.match(readme, /\[모바일 제공 형태 결정 기록\]\(docs\/mobile-app-decision\.md\)/);
});
