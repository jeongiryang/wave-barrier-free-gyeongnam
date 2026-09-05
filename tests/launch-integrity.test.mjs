import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normalizeThemes, mergeThemeResults, criteriaSignature } from "../lib/planner-criteria.js";
import { accessibilityFieldState, buildAccessibilityItems } from "../lib/accessibility-score.js";
import { communityToday } from "../lib/community/field-report.js";
import { validatePostInput } from "../lib/community/validation.js";
import { buildItinerarySchedule } from "../features/planner/optimization/itinerary-schedule.js";
import { filterGyeongnamResult, isGyeongnamItem } from "../lib/tourism/regional-scope.js";
import { verifiedCrowdItem } from "../lib/tourism/crowd-integrity.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("crowd signals require the selected attraction and a real numeric rate", () => {
  for (const rate of [null, undefined, "", " ", "미확인", -1, 101]) assert.equal(verifiedCrowdItem({ tAtsNm: "경남도립미술관", cnctrRate: rate }, "경남도립미술관"), false);
  assert.equal(verifiedCrowdItem({ tAtsNm: "경남도립미술관", cnctrRate: "0" }, "경남도립미술관"), true);
  assert.equal(verifiedCrowdItem({ tAtsNm: "다른 장소", cnctrRate: "10" }, "경남도립미술관"), false);
});
test("legacy and multiple themes retain valid, unique choices", () => {
  assert.deepEqual(normalizeThemes("nature"), ["nature"]);
  assert.deepEqual(normalizeThemes("food,nature,food,invalid"), ["food", "nature"]);
  assert.deepEqual(normalizeThemes("invalid"), ["nature"]);
  assert.equal(criteriaSignature({ region: "창원", themes: "food,nature", selected: ["wheel", "visual"], locale: "ko" }), criteriaSignature({ region: "창원", themes: "nature,food", selected: ["visual", "wheel"], locale: "ko" }));
});
test("multi-theme results interleave fairly and remove duplicate place IDs", () => {
  assert.deepEqual(mergeThemeResults([[{ contentid: "1" }, { contentid: "2" }], [], [{ contentid: "1" }, { contentid: "3" }], [{ contentid: "4" }]], 4).map((item) => item.contentid), ["1", "4", "2", "3"]);
});
test("unknown facility information never becomes negative evidence", () => {
  for (const value of ["", "정보 없음", "정보 없음 (시설 문의 필요)", "미확인", "해당 없음", "확인 필요", null]) assert.equal(accessibilityFieldState(value), "unknown");
  assert.equal(accessibilityFieldState("엘리베이터 없음"), "negative");
  assert.equal(accessibilityFieldState("엘리베이터 설치"), "confirmed");
  assert.equal(buildAccessibilityItems([["elevator", "승강기"], ["elevator", "승강기"]], { elevator: "미확인" }).length, 1);
});
test("regional content requires a verified province, not a matching town name or ignored request filter", () => {
  const items = [{ address: "강원특별자치도 고성군", lDongRegnCd: "48" }, { koFilmst: "경상남도 고성군" }, { svarAddr: "경남 함안군" }, { title: "고성의 아침" }, { lDongRegnCd: "48" }];
  assert.deepEqual(items.map(isGyeongnamItem), [false, true, true, false, true]);
  assert.deepEqual(filterGyeongnamResult({ ok: true, value: { items, total: 99 } }), { ok: true, value: { items: [items[1], items[2], items[4]], total: 3 } });
  const failure = { ok: false, error: "provider unavailable" };
  assert.equal(filterGyeongnamResult(failure), failure);
});
test("review date validation uses Korea date and rejects future visits including journal items", () => {
  const now = Date.parse("2026-09-05T15:00:00Z");
  const post = { category: "review", title: "직접 방문한 시설 후기", content: "방문해서 출입구 시설을 확인했습니다." };
  assert.equal(communityToday(now), "2026-09-06");
  assert.ok(validatePostInput({ ...post, visitDate: "2026-09-06" }, now).value);
  assert.match(validatePostInput({ ...post, visitDate: "2026-09-07" }, now).error, /미래/);
  assert.match(validatePostInput({ ...post, journalPlaces: [{ id: "1", name: "장소", day: "2026-09-07" }] }, now).error, /미래/);
});
test("date changes never silently move old stops into a new trip", async () => {
  const scheduleSource = await source("features/planner/hooks/useTripSchedule.ts");
  assert.doesNotMatch(scheduleSource, /assignmentsWithinDays/);
  const result = buildItinerarySchedule({ places: [{ id: "old" }, { id: "new" }], assignments: { old: "2026-10-08", new: "2026-10-14" }, days: ["2026-10-14", "2026-10-15"] });
  assert.deepEqual(result.map((day) => day.entries.map((entry) => entry.place.id)), [["new"], []]);
});
test("device location requires notice and browser permission and bypasses the route API", async () => {
  const request = await source("features/planner/hooks/useRouteRequest.ts");
  const privateBranch = request.slice(request.indexOf("if (privateOrigin)"), request.indexOf("const controller", request.indexOf("if (privateOrigin)")));
  assert.match(privateBranch, /return/);
  assert.doesNotMatch(privateBranch, /plannerJson|fetch\(/);
  for (const path of ["features/planner/hooks/useRouteOrigin.ts", "features/routing/useMapJourneyActions.ts"]) {
    const contents = await source(path);
    assert.ok(contents.indexOf("if (!confirmMapLocationUse()) return") < contents.indexOf("navigator.geolocation.getCurrentPosition"));
  }
});
test("native place dialog makes the background inert and restores focus", async () => {
  const [dialog, focus] = await Promise.all([source("features/planner/components/PlaceDecisionDialog.tsx"), source("features/planner/hooks/usePlaceDialogFocus.ts")]);
  assert.match(dialog, /<dialog/);
  assert.match(focus, /dialog.showModal\(\)/);
  assert.match(focus, /addEventListener\("cancel"/);
  assert.match(focus, /previousFocus\.focus\(\)/);
  assert.doesNotMatch(dialog, /place.score.*%/);
});
test("public community reads exclude future field experiences without deleting user content", async () => {
  const [reads, migration] = await Promise.all([source("features/community/server/post-read-repository.ts"), source("migrations/007_review_date_integrity.sql")]);
  assert.match(reads, /p.visit_date <= to_char/);
  assert.match(reads, /NOT EXISTS.*jsonb_array_elements/);
  assert.match(migration, /SET moderation_status = 'under_review'/);
  assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE/);
});
test("failed shared-place restoration never substitutes unrelated recommendations", async () => {
  const restoration = await source("server/tourism/shared-plan-restoration.ts");
  assert.match(restoration, /plan: \{ \.\.\.currentPlan, places: \[\], stops: \[\] \}/);
  assert.doesNotMatch(restoration, /places\.slice\(0, 3\)|mode: "condition-fallback"/);
  for (const path of ["features/planner/components/TripDayPlanner.tsx", "features/trips/components/SharedTripSummary.tsx", "features/routing/components/MapPlacePanel.tsx", "app/travel-book/page.tsx"]) {
    assert.doesNotMatch(await source(path), /score\}%/);
  }
});
