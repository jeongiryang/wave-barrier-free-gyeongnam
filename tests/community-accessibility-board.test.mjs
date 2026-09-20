import assert from "node:assert/strict";
import test from "node:test";
import { asFieldReport, fieldReportAgeMessage, fieldReportBoardEnabled } from "../lib/community/field-report-board.js";
import { validatePostInput } from "../lib/community/validation.js";
import { readFile } from "node:fs/promises";

const report = { category: "field-report", content: "입구의 낮은 경사로를 현장에서 직접 확인했습니다.", region: "창원", placeId: "123456", placeName: "경남도립미술관", visitDate: "2026-08-20" };

test("현장 확인 게시판은 운영자 확인 전 기본 비활성이다", () => {
  assert.equal(fieldReportBoardEnabled({}), false);
  assert.equal(fieldReportBoardEnabled({ WAVE_FIELD_REPORT_BOARD: "enabled" }), true);
  assert.match(validatePostInput(report, Date.parse("2026-09-20T00:00:00+09:00")).error, /준비 중/);
});

test("공개 장소와 과거 확인일이 있는 최소 정보만 저장한다", () => {
  const result = validatePostInput({ ...report, title: "사용자 제목은 저장하지 않음", disabilityType: "wheelchair", latitude: 35.1, visitPhotos: [] }, Date.parse("2026-09-20T00:00:00+09:00"), { fieldReportEnabled: true });
  assert.equal(result.value.title, "경남도립미술관 · 2026-08-20 현장 확인");
  assert.deepEqual(asFieldReport(result.value), { kind: "field-report", contentId: "123456", checkedOn: "2026-08-20", body: report.content });
  assert.deepEqual(Object.keys(asFieldReport(result.value)), ["kind", "contentId", "checkedOn", "body"]);
  assert.equal("disabilityType" in result.value, false);
  assert.equal("latitude" in result.value, false);
});

test("가짜 장소 식별자와 미래 날짜, 사진을 거부한다", () => {
  const options = { fieldReportEnabled: true };
  const now = Date.parse("2026-09-20T00:00:00+09:00");
  assert.match(validatePostInput({ ...report, placeId: "abc" }, now, options).error, /식별자/);
  assert.match(validatePostInput({ ...report, visitDate: "2026-09-21" }, now, options).error, /미래/);
  assert.match(validatePostInput({ ...report, visitPhotos: [{ id: "a", dataUrl: "data:image/jpeg;base64,AAAA", alt: "입구" }], photoConsent: true }, now, options).error, /사진/);
});

test("한 달 이상 지난 정보는 상대 경과 문구를 표시한다", () => {
  assert.equal(fieldReportAgeMessage("2026-06-15", Date.parse("2026-09-20T12:00:00+09:00")), "3개월 전에 확인한 정보예요.");
  assert.equal(fieldReportAgeMessage("2026-09-15", Date.parse("2026-09-20T12:00:00+09:00")), "");
});

test("기능 플래그는 API 직접 접근과 장소 상세 조회에도 적용된다", async () => {
  const [actions, reads, placeStories, migration, board] = await Promise.all([
    readFile(new URL("../features/community/server/post-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/community/server/post-read-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/planner/components/PlaceCommunityStories.tsx", import.meta.url), "utf8"),
    readFile(new URL("../migrations/018_community_field_report_kind.sql", import.meta.url), "utf8"),
    readFile(new URL("../features/community/components/CommunityBoard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(actions, /filters\.category === "field-report" && !enabled/);
  assert.match(actions, /result\.post\.category === "field-report" && !fieldReportBoardEnabled/);
  assert.match(reads, /placeId && category[\s\S]*p\.place_id=\$\{placeId\} AND p\.category=\$\{category\}/);
  assert.equal((reads.match(/\$\{fieldReportsVisible\} OR p\.category <> 'field-report'/g) || []).length, 9);
  assert.match(placeStories, /placePreview: '1'/);
  assert.doesNotMatch(placeStories, /Promise\.all/);
  assert.match(reads, /PARTITION BY \(p\.category='field-report'\)/);
  assert.match(board, /이 관광지에서 확인한 정보 남기기/);
  assert.match(migration, /'travel-talk', 'field-report'/);
});
