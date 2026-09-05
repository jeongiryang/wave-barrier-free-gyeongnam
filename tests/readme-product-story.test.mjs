import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("README는 가치에서 운영까지 실제 사용자 여정 순서로 설명한다", async () => {
  const readme = await source("README.md");
  const headings = [
    "## 핵심 사용자 여정",
    "## 기능과 데이터 신뢰",
    "## 접근성, 개인정보와 저장 범위",
    "## 실행과 저장소 구조",
    "## 배포와 운영",
  ];
  let cursor = -1;
  for (const heading of headings) {
    const position = readme.indexOf(heading);
    assert.ok(position > cursor, `${heading} 순서를 확인해 주세요.`);
    cursor = position;
  }
  for (const route of ["/planner#conditions", "/planner#places", "/planner#itinerary", "/planner#departure-readiness", "/planner#navigation", "/planner#layers", "/photo-course", "/community"]) {
    assert.ok(readme.includes(route), `${route} 링크가 필요합니다.`);
  }
  assert.match(readme, /실패 응답은 캐시하지 않고/);
  assert.match(readme, /정확한 출발 좌표는 저장하지 않으며 30일 뒤/);
  assert.match(readme, /Kakao·ODsay에\s*전달될 수 있습니다/);
});

test("README는 서비스 소개와 별도 운영·제출·검증 문서를 연결한다", async () => {
  const readme = await source("README.md");
  assert.doesNotMatch(readme, /AI 작업 로그|docs\/ai-logs/);
  assert.match(readme, /docs\/contest-compliance.md/);
  assert.match(readme, /docs\/launch-audit-2026-09-05.md/);
  assert.match(readme, /\[운영·보안·개인정보 안내\]\(docs\/operations\.md\)/);
  assert.match(readme, /Neon 백업 일정이나 복구 시점 목표가 코드로 설정되어 있지 않으므로/);
});

test("소셜 메타데이터는 실제 저장소 화면 캡처와 정확한 크기를 사용한다", async () => {
  const metadata = await source("lib/site-metadata.ts");
  assert.match(metadata, /wave-landing-desktop\.jpg/);
  assert.match(metadata, /width: 1348, height: 926/);
  await access(new URL("../docs/screenshots/wave-landing-desktop.jpg", import.meta.url));
});

test("운영 문서는 데이터·보안·접근성·백업·장애 대응의 한계를 구분한다", async () => {
  const operations = await source("docs/operations.md");
  for (const heading of ["## 데이터 신뢰 기준", "## 보안 기준", "## 접근성 기준", "## 배포와 장애 대응", "## 백업과 복구", "## 출시·운영 확인표"]) {
    assert.match(operations, new RegExp(heading));
  }
  assert.match(operations, /종합 상태 검사는 아닙니다/);
  assert.match(operations, /자동 역방향 migration은 없으므로/);
  assert.match(operations, /저장소에는 Neon 백업 보존기간/);
});
