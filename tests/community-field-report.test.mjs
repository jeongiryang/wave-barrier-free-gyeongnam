import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildTravelJournalHref,
  normalizeAccessibilityReports,
  normalizeJournalPlaces,
  parseTravelJournalDraft,
  validCommunityDate,
} from "../lib/community/field-report.js";
import { validatePostInput } from "../lib/community/validation.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const base = {
  category: "review",
  title: "미술관에서 확인한 접근성 정보",
  content: "입구부터 전시실까지 직접 이동하며 확인했습니다.",
  region: "창원",
  placeId: "1001",
  placeName: "경남도립미술관",
};

test("현장 제보는 허용된 항목과 상태만 한 번씩 보관한다", () => {
  assert.deepEqual(normalizeAccessibilityReports([
    { field: "entrance", status: "confirmed", note: " 경사로 확인 " },
    { field: "entrance", status: "changed", note: "중복" },
    { field: "secret", status: "confirmed", note: "무시" },
    { field: "toilet", status: "changed", note: `위치가 바뀜\u0000${"가".repeat(200)}` },
  ]), [
    { field: "entrance", status: "confirmed", note: "경사로 확인" },
    { field: "toilet", status: "changed", note: `위치가 바뀜${"가".repeat(154)}` },
  ]);
});

test("구조화 제보는 후기와 공식 장소 연결이 있을 때만 저장한다", () => {
  const valid = validatePostInput({ ...base, visitDate: "2026-08-30", fieldReports: [{ field: "elevator", status: "not_checked", note: "운휴 여부는 확인하지 못함" }] });
  assert.deepEqual(valid.value.fieldReports, [{ field: "elevator", status: "not_checked", note: "운휴 여부는 확인하지 못함" }]);
  assert.equal(valid.value.visitDate, "2026-08-30");
  assert.match(validatePostInput({ ...base, category: "place", fieldReports: [{ field: "entrance", status: "confirmed" }] }).error, /여행 후기/);
  assert.match(validatePostInput({ ...base, placeId: "", placeName: "", fieldReports: [{ field: "entrance", status: "confirmed" }] }).error, /관광지/);
  assert.match(validatePostInput({ ...base, visitDate: "2026-02-31" }).error, /방문일/);
});

test("일정 초안은 최대 여섯 장소와 유효한 날짜만 왕복한다", () => {
  const places = Array.from({ length: 8 }, (_, index) => ({ id: `${index + 1}`, name: `장소 ${index + 1}`, day: index === 0 ? "2026-09-01" : "invalid" }));
  const normalized = normalizeJournalPlaces(places);
  assert.equal(normalized.length, 6);
  assert.equal(normalized[0].day, "2026-09-01");
  assert.equal(normalized[1].day, "");
  const href = buildTravelJournalHref({ places, region: "창원", visitDate: "2026-09-01" });
  const params = new URL(`https://wave.test${href}`).searchParams;
  const draft = parseTravelJournalDraft(params);
  assert.equal(draft.journalPlaces.length, 6);
  assert.equal(draft.placeId, "1");
  assert.equal(draft.visitDate, "2026-09-01");
  assert.equal(parseTravelJournalDraft(new URLSearchParams("draft=journal&journal=%7Bbad")), null);
  assert.equal(validCommunityDate("2026-02-29"), "");
});

test("여행자 제보는 공식 근거와 별도 저장·표시되고 샘플을 명시한다", async () => {
  const [database, writes, reads, mapper, editor, detail, board, planner, migration] = await Promise.all([
    source("features/community/server/database.ts"),
    source("features/community/server/post-write-repository.ts"),
    source("features/community/server/post-read-repository.ts"),
    source("features/community/server/post-mappers.ts"),
    source("features/community/components/CommunityFieldReportEditor.tsx"),
    source("features/community/components/CommunityFieldReport.tsx"),
    source("features/community/components/CommunityBoard.tsx"),
    source("features/planner/components/TripDayPlanner.tsx"),
    source("migrations/005_community_field_reports.sql"),
  ]);
  assert.match(database, /field_reports JSONB/);
  assert.match(writes, /field_reports.*journal_places/);
  assert.match(reads, /journal_places @>/);
  assert.match(mapper, /isSample: row\.author_id === "wave-seed"/);
  assert.match(editor, /공식 편의근거 점수에 합산되지 않고/);
  assert.match(detail, /작성자 1명이 남긴 개별 경험/);
  assert.match(board, /‘샘플’이 붙은 글/);
  assert.match(planner, /buildTravelJournalHref/);
  assert.match(migration, /community_posts_journal_places_idx/);
});
