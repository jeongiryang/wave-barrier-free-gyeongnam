import assert from "node:assert/strict";
import test from "node:test";
import { assessDepartureReadiness, assessTripDatePhase, buildTripCalendarIcs, foldIcsLine } from "../lib/departure-readiness.js";

const verifiedPlace = {
  id: "1001", name: "경남도립미술관", score: 100, knownFields: 4,
  checkedAt: "2026-08-30T01:00:00.000Z", source: "무장애 여행정보",
};
const weather = {
  source: "기상청 단기예보", updatedAt: "2026-08-30T02:00:00.000Z",
  days: [{ date: "2026-08-31", label: "맑음", rainProbability: 10, min: 22, max: 29 }],
};

test("여행 날짜 없음·과거·당일·임박 상태를 구분한다", () => {
  assert.equal(assessTripDatePhase("", "2026-08-31").id, "no-date");
  assert.equal(assessTripDatePhase("2026-08-30", "2026-08-31").id, "past");
  assert.equal(assessTripDatePhase("2026-08-31", "2026-08-31").id, "today");
  assert.equal(assessTripDatePhase("2026-09-02", "2026-08-31").id, "imminent");
});

test("부분 API 성공을 전체 확인됨으로 올리지 않는다", () => {
  const result = assessDepartureReadiness({
    travelStart: "2026-08-31", today: "2026-08-31", weather, places: [verifiedPlace],
    crowd: { rate: 24, place: "경남도립미술관", baseYmd: "20260830" },
    transportProviders: [
      { name: "Kakao Mobility", state: "connected" },
      { name: "KORAIL", state: "ready" },
      { name: "TAGO BUS", state: "error" },
    ],
  });
  assert.equal(result.state, "partial");
  assert.equal(result.items.find((item) => item.id === "weather")?.state, "confirmed");
  assert.equal(result.items.find((item) => item.id === "crowd")?.state, "confirmed");
  assert.equal(result.items.find((item) => item.id === "transport")?.state, "partial");
});

test("날씨 조회 실패와 근거 없는 장소는 재확인 필요로 남긴다", () => {
  const result = assessDepartureReadiness({
    travelStart: "2026-09-01", today: "2026-08-31", weather: null,
    places: [{ id: "unknown", name: "미확인 장소", score: 0, knownFields: 0 }],
    transportProviders: [{ name: "KORAIL", state: "ready" }],
  });
  assert.equal(result.state, "recheck");
  assert.deepEqual(result.items.filter((item) => item.state === "recheck").map((item) => item.id), ["weather", "crowd", "transport", "evidence"]);
});

test("한국 시간대와 공유 URL을 포함한 표준 캘린더를 만든다", () => {
  const ics = buildTripCalendarIcs({
    travelStart: "2026-09-01", travelEnd: "2026-09-02", dayStartTime: "09:30",
    title: "W.A.V.E 창원 무장애 여행", region: "창원", placeNames: ["경남도립미술관", "용지호수공원"],
    shareUrl: "https://wave.example/trip/abc", createdAt: new Date("2026-08-31T00:00:00.000Z"),
  });
  assert.match(ics, /BEGIN:VCALENDAR\r\nVERSION:2\.0/);
  assert.match(ics, /TZID:Asia\/Seoul/);
  assert.match(ics, /DTSTART;TZID=Asia\/Seoul:20260901T093000/);
  assert.match(ics, /DTEND;TZID=Asia\/Seoul:20260902T173000/);
  assert.match(ics, /URL:https:\/\/wave\.example\/trip\/abc/);
  assert.match(ics, /출발 전 W\.A\.V\.E에서/);
  assert.ok(ics.endsWith("\r\n"));
});

test("긴 한글 iCalendar 행을 UTF-8 75바이트 경계에 맞춰 접는다", () => {
  const folded = foldIcsLine(`DESCRIPTION:${"여행 준비 확인 ".repeat(20)}`);
  const lines = folded.split("\r\n");
  assert.ok(lines.length > 1);
  assert.ok(lines.every((line) => new TextEncoder().encode(line).length <= 75));
  assert.ok(lines.slice(1).every((line) => line.startsWith(" ")));
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
