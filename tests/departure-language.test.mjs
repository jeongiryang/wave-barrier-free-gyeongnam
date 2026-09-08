import assert from "node:assert/strict";
import test from "node:test";
import { assessDepartureReadiness, buildTripCalendarIcs } from "../lib/departure-readiness.js";

test("English departure review preserves evidence states, dates and original source text", () => {
  const input = {
    travelStart: "2026-10-08", today: "2026-10-07",
    weather: { source: "원문 기상기관", updatedAt: "2026-10-07T01:00:00Z", days: [{ date: "2026-10-08", label: "비", rainProbability: 80, min: 20, max: 24 }] },
    crowd: { place: "경남도립미술관", rate: 24, baseYmd: "20261008" },
    transportProviders: [{ name: "Kakao Mobility", state: "connected" }, { name: "KORAIL", state: "ready" }],
    places: [{ id: "1001", name: "경남도립미술관", score: 100, knownFields: 4, checkedAt: "2026-10-06T01:00:00Z", source: "공식 원문 출처" }],
  };
  const ko = assessDepartureReadiness(input);
  const en = assessDepartureReadiness({ ...input, locale: "en" });
  assert.equal(en.state, ko.state);
  assert.equal(en.phase.id, ko.phase.id);
  assert.equal(en.phase.daysUntil, 1);
  assert.match(en.phase.label, /1 day/);
  assert.deepEqual(en.items.map(({ id, state, checkedAt, href }) => ({ id, state, checkedAt, href })), ko.items.map(({ id, state, checkedAt, href }) => ({ id, state, checkedAt, href })));
  assert.match(en.items[0].summary, /80%/);
  assert.equal(en.items[0].source, input.weather.source);
  assert.equal(en.items[0].subject, "비");
  assert.equal(en.items[1].subject, "경남도립미술관");
  assert.match(en.items[1].summary, /not a live visitor count/);
  assert.match(en.items[2].summary, /not a count of actual routes/);
  for (const item of en.items) assert.doesNotMatch(item.label + item.summary, /[가-힣]/);
  assert.equal(en.items[3].source, "공식 원문 출처");
});

test("English missing, loading, future and past evidence cannot become confirmed", () => {
  for (const input of [{}, { travelStart: "2026-10-08", weatherLoading: true }, { travelStart: "2026-10-06" }, { travelStart: "2026-11-08", transportProviders: [{ name: "KORAIL", state: "ready" }] }]) {
    const value = assessDepartureReadiness({ ...input, today: "2026-10-07", locale: "en" });
    assert.equal(value.state, "recheck");
    for (const item of value.items) assert.doesNotMatch(item.label + item.summary + item.source, /[가-힣]/);
  }
});

test("English calendar preserves the same event identity, Korean time zone and original place names", () => {
  const input = { travelStart: "2026-10-08", travelEnd: "2026-10-09", dayStartTime: "10:30", shareUrl: "https://wave.example/trip/abc", placeNames: ["경남도립미술관"], createdAt: new Date("2026-10-07T00:00:00Z") };
  const ko = buildTripCalendarIcs(input).replaceAll("\r\n ", "");
  const en = buildTripCalendarIcs({ ...input, locale: "en", region: "Changwon" }).replaceAll("\r\n ", "");
  assert.equal(en.match(/^UID:.*$/m)[0], ko.match(/^UID:.*$/m)[0]);
  assert.match(en, /DTSTART;TZID=Asia\/Seoul:20261008T103000/);
  assert.match(en, /SUMMARY:W.A.V.E accessible trip/);
  assert.match(en, /Before leaving/);
  assert.match(en, /경남도립미술관/);
  assert.match(en, /original language/);
  assert.match(en, /URL:https:\/\/wave.example\/trip\/abc/);
});
