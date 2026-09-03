import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("공개 정책 허브는 개인정보·약관·커뮤니티·서비스 운영 기준을 연결한다", async () => {
  const [hub, footer, sitemap, productionCheck] = await Promise.all([
    source("app/policies/page.tsx"),
    source("components/PolicyFooterLinks.tsx"),
    source("app/sitemap.ts"),
    source("scripts/check-production-apis.mjs"),
  ]);
  for (const phrase of ["커뮤니티 운영정책", "서비스 운영정책", "서로 다른 사용자 3명", "공개 유지·숨김", "장애와 성능 저하"]) {
    assert.match(hub, new RegExp(phrase));
  }
  for (const content of [footer, sitemap, productionCheck]) assert.match(content, /\/policies/);
});

test("개인정보처리방침은 구현된 처리·보관·권리 경계를 공개한다", async () => {
  const privacy = await source("app/privacy/page.tsx");
  for (const phrase of [
    "처리 목적과 항목", "보관 기간과 파기", "외부 제공처와 처리 경계", "사용자의 권리와 행사 방법",
    "공유 여행은 생성 후 30일", "최대 48시간", "작성 후 1년", "광고·행동 분석 목적의 추적기는",
    "정확한 현재 위치와 사진 원본은 서버에 저장하지",
  ]) assert.match(privacy, new RegExp(phrase));
  assert.match(privacy, /자동 탈퇴를 지원하지 않는 상태에서는 운영 문의로 수동 처리/);
});

test("이용약관은 정보 서비스의 한계와 사용자 콘텐츠 권리를 분명히 한다", async () => {
  const terms = await source("app/terms/page.tsx");
  for (const phrase of ["예약·운송·시설 운영 주체가 아니며", "권리는 작성자에게", "비독점적 권한", "대한민국 법령", "등록 이메일로 비밀번호를 재설정"]) {
    assert.match(terms, new RegExp(phrase));
  }
  assert.doesNotMatch(terms, /모든 사람의 이용 가능성을 보장합니다/);
});
