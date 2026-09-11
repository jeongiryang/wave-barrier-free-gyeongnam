import assert from "node:assert/strict";
import test from "node:test";
import { assessVisitHours, visitHoursWindow } from "../lib/visit-hours.js";

const info = { status: "available", hours: "09:00~18:00 (입장마감 17:00)", restDays: "매주 월요일" };
const friday = { day: "2026-09-11", startsAt: 600, endsAt: 720 };
test("arrival, admission and entire visit are compared, including exact boundaries", () => {
  assert.equal(assessVisitHours(info, friday).reason, "within-hours");
  assert.equal(assessVisitHours(info, { ...friday, startsAt: 530 }).reason, "before-opening");
  assert.equal(assessVisitHours(info, { ...friday, startsAt: 1020, endsAt: 1080 }).state, "within");
  assert.equal(assessVisitHours(info, { ...friday, startsAt: 1021, endsAt: 1080 }).reason, "after-admission");
  assert.equal(assessVisitHours(info, { ...friday, endsAt: 1081 }).reason, "visit-overrun");
  assert.equal(assessVisitHours(info, { ...friday, startsAt: 1080, endsAt: 1110 }).reason, "after-closing");
});
test("weekly closing and festival bounds use the planned date, not today's date", () => {
  assert.equal(assessVisitHours(info, { ...friday, day: "2026-09-14" }).reason, "closed-day");
  const event = { ...info, eventStart: "20260912", eventEnd: "20260913" };
  assert.equal(assessVisitHours(event, friday).reason, "outside-event");
  assert.equal(assessVisitHours(event, { ...friday, day: "2026-09-12" }).state, "within");
  assert.equal(assessVisitHours(event, { ...friday, day: "2026-09-13" }).state, "within");
  assert.equal(assessVisitHours({ ...info, restDays: "매주 월요일,금요일 휴관" }, friday).reason, "closed-day");
});
test("seasonal, lunch-break, holiday exceptions and night opening are not guessed", () => {
  for (const hours of ["하절기 09:00~18:00 / 동절기 10:00~17:00", "09:00~18:00 (공휴일 10:00~17:00)", "09:00~18:00, 12:00~13:00 점심", "22:00~02:00", "9시~18시", "09:00~18:00, 최종입장 별도 문의", "25:00~28:00", "09:60~18:00", "09:00~18:00 (입장마감 19:00)", ""]) {
    assert.equal(visitHoursWindow(hours), null, hours);
    assert.equal(assessVisitHours({ ...info, hours }, friday).state, "unknown", hours);
  }
  for (const restDays of ["", "월요일(공휴일이면 다음날)", "공휴일", "첫째·셋째 월요일", "매주 월요일 및 명절"]) assert.equal(assessVisitHours({ ...info, restDays }, friday).reason, "confirm-holiday", restDays);
});
test("all-day operation still requires closing-day evidence", () => {
  for (const hours of ["24시간", "상시 개방", "00:00~24:00"]) {
    assert.equal(assessVisitHours({ ...info, hours, restDays: "연중무휴" }, { ...friday, startsAt: 1380, endsAt: 1440 }).state, "within");
    assert.equal(assessVisitHours({ ...info, hours, restDays: "" }, friday).state, "unknown");
  }
});
test("invalid dates, unavailable records and visits crossing midnight cannot pass", () => {
  for (const day of ["", "2026-02-30", "not-a-date"]) assert.equal(assessVisitHours(info, { ...friday, day }).state, "unknown");
  for (const visit of [{ ...friday, startsAt: -1 }, { ...friday, endsAt: 1441 }, { ...friday, endsAt: 600 }, { ...friday, startsAt: "600" }]) assert.equal(assessVisitHours(info, visit).state, "unknown");
  for (const status of ["empty", "unsupported", "location-unconfirmed", "provider-error"]) assert.equal(assessVisitHours({ ...info, status }, friday).state, "unknown");
});
