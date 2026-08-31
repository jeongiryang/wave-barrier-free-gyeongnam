import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("README는 실제 화면·핵심 여정·데이터 경계를 1분 소개 구조로 연결한다", async () => {
  const readme = await source("README.md");
  assert.match(readme, /## 1분 안에 보는 W\.A\.V\.E/);
  assert.match(readme, /## 실제 화면/);
  assert.match(readme, /## 검증 가능한 핵심 기능/);
  assert.match(readme, /## 공식 근거·경험·추정은 합치지 않습니다/);
  for (const route of ["/planner#conditions", "/planner#places", "/planner#navigation", "/planner#layers", "/photo-course", "/community"]) {
    assert.match(readme, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(readme, /공식 OpenAPI[\s\S]*여행자 직접 제보[\s\S]*W\.A\.V\.E 계산·예측/);
  assert.match(readme, /<summary><strong>로컬 실행·환경 변수 펼치기<\/strong><\/summary>/);
  assert.doesNotMatch(readme, /대상 수상|최우수상|누적 사용자|사용자 수 \d/);
});

test("README 화면은 대체 텍스트가 있는 저장소 내부 Production 캡처다", async () => {
  const readme = await source("README.md");
  const screenshots = [...readme.matchAll(/!\[([^\]]+)\]\((docs\/screenshots\/[^)]+)\)/g)];
  assert.equal(screenshots.length, 4);
  for (const [, alt, path] of screenshots) {
    assert.ok(alt.trim().length >= 15, `${path} 대체 텍스트가 너무 짧다.`);
    await access(new URL(`../${path}`, import.meta.url));
  }
  assert.match(readme, /목업이 아닌 Production 캡처/);
});

test("3분 시연 문서는 정상·부분 실패·접근성 대체 동선을 함께 제공한다", async () => {
  const [readme, demo] = await Promise.all([source("README.md"), source("docs/demo-script.md")]);
  assert.match(readme, /\[3분 시연 동선과 실패 대안\]\(docs\/demo-script\.md\)/);
  for (const checkpoint of ["0:00–0:25", "0:25–1:05", "1:05–1:45", "1:45–2:20", "2:20–3:00"]) assert.match(demo, new RegExp(checkpoint));
  for (const fallback of ["관광 API 지연", "Kakao 지도 키 미설정", "대중교통 승인/응답 없음", "공유 저장 실패"]) assert.match(demo, new RegExp(fallback));
  assert.match(demo, /키보드[\s\S]*모바일[\s\S]*동작 감소[\s\S]*테마/);
});
