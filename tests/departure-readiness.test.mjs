import assert from "node:assert/strict";
import test from "node:test";
import { assessDepartureReadiness, assessTripDatePhase, buildTripCalendarIcs, foldIcsLine } from "../lib/departure-readiness.js";
import { tripPrecautionItems } from "../lib/trip-precautions.js";

const verifiedPlace = {
  id: "1001", name: "경남도립미술관", score: 100, knownFields: 4,
  checkedAt: "2026-08-30T01:00:00.000Z", source: "무장애 여행정보",
};
const weather = {
  source: "기상청 단기예보", updatedAt: "2026-08-30T02:00:00.000Z",
  days: [{ date: "2026-08-31", label: "맑음", rainProbability: 10, min: 22, max: 29 }],
};

test("여행 대비 네 항목은 내부 화면만 연결하고 금융 관련 표현을 쓰지 않는다", () => {
  const items = tripPrecautionItems();
  assert.deepEqual(items.map(item => item.label), [
    "그날 날씨를 확인하고 실내 대안을 준비했나요?",
    "이동 수단의 편의시설을 미리 확인했나요?",
    "보조기기가 고장 났을 때 연락할 곳을 알고 있나요?",
    "급할 때 연락할 곳을 저장해 두었나요?",
  ]);
  assert.deepEqual(items.map(item => item.href), ["#layers", "#navigation", "#equipment-rental", "#more-trip-tools"]);
  assert.ok(items.every(item => item.href.startsWith("#")));
  assert.doesNotMatch(items.map(item => item.label).join(" "), /보험|상품|가입/);
});

test("여행 날짜 없음·과거·당일·임박 상태를 구분한다", () => {
  assert.equal(assessTripDatePhase("", "2026-08-31").id, "no-date");
  assert.equal(assessTripDatePhase("2026-08-30", "2026-08-31").id, "past");
  assert.equal(assessTripDatePhase("2026-08-31", "2026-08-31").id, "today");
  assert.equal(assessTripDatePhase("2026-09-02", "2026-08-31").id, "imminent");
});

test("부분 API 성공을 전체 확인됨으로 올리지 않는다", () => {
  const result = assessDepartureReadiness({
    travelStart: "2026-08-31", today: "2026-08-31", weather, places: [verifiedPlace],
    crowd: { rate: 24, place: "경남도립미술관", baseYmd: "20260831" },
    transportProviders: [
      { name: "Kakao Mobility", state: "connected" },
      { name: "KORAIL", state: "ready" },
      { name: "TAGO BUS", state: "error" },
    ],
    routeCoverage: { total: 3, verified: 1 },
  });
  assert.equal(result.state, "recheck", "mobility access remains unverified even with a route response");
  assert.equal(result.items.find((item) => item.id === "weather")?.state, "confirmed");
  assert.equal(result.items.find((item) => item.id === "crowd")?.state, "confirmed");
  assert.equal(result.items.find((item) => item.id === "transport")?.state, "partial");
  const transportSummary = result.items.find((item) => item.id === "transport")?.summary || "";
  assert.match(transportSummary, /전체 3구간 중 1구간/);
  assert.match(transportSummary, /이동 편의는 별도 확인/);
  assert.doesNotMatch(transportSummary, /개 실제 경로 확인/);
});

test("날씨 조회 실패와 근거 없는 장소는 재확인 필요로 남긴다", () => {
  const result = assessDepartureReadiness({
    travelStart: "2026-09-01", today: "2026-08-31", weather: null,
    places: [{ id: "unknown", name: "미확인 장소", score: 0, knownFields: 0 }],
    transportProviders: [{ name: "KORAIL", state: "ready" }],
  });
  assert.equal(result.state, "recheck");
  assert.deepEqual(result.items.filter((item) => item.state === "recheck").map((item) => item.id), ["weather", "crowd", "transport", "mobility", "evidence"]);
});

test("한국 시간대와 공유 URL을 포함한 표준 캘린더를 만든다", () => {
  const ics = buildTripCalendarIcs({
    travelStart: "2026-09-01", travelEnd: "2026-09-02", dayStartTime: "09:30",
    title: "WAVE 창원 무장애 여행", region: "창원", placeNames: ["경남도립미술관", "용지호수공원"],
    shareUrl: "https://wave.example/trip/abc", createdAt: new Date("2026-08-31T00:00:00.000Z"),
  });
  assert.match(ics, /BEGIN:VCALENDAR\r\nVERSION:2\.0/);
  assert.match(ics, /TZID:Asia\/Seoul/);
  assert.match(ics, /DTSTART;TZID=Asia\/Seoul:20260901T093000/);
  assert.match(ics, /DTEND;TZID=Asia\/Seoul:20260902T173000/);
  assert.match(ics, /URL:https:\/\/wave\.example\/trip\/abc/);
  assert.match(ics, /출발 전 WAVE에서/);
  assert.ok(ics.endsWith("\r\n"));
});

test("긴 한글 iCalendar 행을 UTF-8 75바이트 경계에 맞춰 접는다", () => {
  const folded = foldIcsLine(`DESCRIPTION:${"여행 준비 확인 ".repeat(20)}`);
  const lines = folded.split("\r\n");
  assert.ok(lines.length > 1);
  assert.ok(lines.every((line) => new TextEncoder().encode(line).length <= 75));
  assert.ok(lines.slice(1).every((line) => line.startsWith(" ")));
});

test("공개 링크 없이 기기에 저장할 캘린더를 만든다", () => {
  const input = { travelStart: "2026-09-01", travelEnd: "2026-09-02", dayStartTime: "09:30", title: "창원 여행", region: "창원", placeNames: ["경남도립미술관"] };
  const ics = buildTripCalendarIcs(input);
  assert.match(ics, /DTSTART;TZID=Asia\/Seoul:20260901T093000/);
  assert.match(ics, /경남도립미술관/);
  assert.doesNotMatch(ics, /(?:^|\r\n)URL:|공유 일정:/);
  assert.equal(ics.match(/UID:([^\r]+)/)[1], buildTripCalendarIcs(input).match(/UID:([^\r]+)/)[1]);
  assert.notEqual(ics.match(/UID:([^\r]+)/)[1], buildTripCalendarIcs({ ...input, placeNames: ["용지호수공원"] }).match(/UID:([^\r]+)/)[1]);
});

test("늦은 출발은 자정 뒤 종료 시각으로 계산하고 위험한 공유 스킴은 거부한다", () => {
  const ics = buildTripCalendarIcs({
    travelStart: "2026-09-01", travelEnd: "2026-09-01", dayStartTime: "20:30",
    shareUrl: "https://wave.example/trip/night", createdAt: new Date("2026-08-31T00:00:00.000Z"),
  });
  assert.match(ics, /DTEND;TZID=Asia\/Seoul:20260902T043000/);
  assert.throws(() => buildTripCalendarIcs({
    travelStart: "2026-09-01", travelEnd: "2026-09-01", dayStartTime: "10:00", shareUrl: "javascript:alert(1)",
  }), /HTTP\(S\)/);
});
