import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  TRAVEL_BOOK_MAX_ITEMS,
  TRAVEL_BOOK_MAX_PLACES,
  buildTravelBookPlannerHref,
  createTravelBookSnapshot,
  patchTravelBook,
  sanitizeTravelBooks,
  sanitizeTravelBook,
  travelBookRestorePayload,
  upsertTravelBook,
  travelBookRegions,
} from "../lib/travel-book.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function input(overrides = {}) {
  return {
    title: "창원 나들이",
    region: "창원",
    theme: "자연",
    profiles: ["휠체어 이용", "걷기 불편"],
    travelStart: "2026-09-01",
    travelEnd: "2026-09-02",
    dayStartTime: "09:30",
    scheduleAssignments: { a: "2026-09-01", b: "2026-09-02" },
    places: [
      { id: "a", name: "대산플라워랜드", city: "창원", address: "경남 창원", image: "https://example.com/a.jpg", score: 100, knownFields: 5, source: "한국관광공사", mapX: "128.1", mapY: "35.1" },
      { id: "b", name: "주남저수지", city: "창원", image: "http://unsafe.example/b.jpg", score: 75, source: "한국관광공사", lat: 35.2, lng: 128.2 },
    ],
    ...overrides,
  };
}

test("archive region labels follow itinerary places rather than the next search region", () => {
  const book = createTravelBookSnapshot(input({ title: undefined, region: "하동" }));
  assert.equal(book.title, "창원 2곳 여행");
  assert.deepEqual(travelBookRegions(book.places), ["창원"]);
  assert.equal(book.region, "하동", "restoring preserves the separately selected search region");
  const multi = createTravelBookSnapshot(input({ title: undefined, region: "진주", places: [input().places[0], { ...input().places[1], city: "하동" }] }));
  assert.equal(multi.title, "창원 · 하동 2곳 여행");
  assert.deepEqual(travelBookRegions(multi.places), ["창원", "하동"]);
  assert.equal(sanitizeTravelBook(input({ region: "하동", title: "하동 2곳 여행" })).title, "창원 2곳 여행");
  assert.equal(sanitizeTravelBook(input({ region: "하동", title: "가족 여행" })).title, "가족 여행", "custom titles are preserved");
});

test("여행집 스냅샷은 복원에 필요한 일정만 남기고 위치·원본 사진 정보는 버린다", () => {
  const book = createTravelBookSnapshot(input(), "2026-09-01T00:00:00.000Z");
  assert.ok(book);
  assert.equal(book.places[0].image, "https://example.com/a.jpg");
  assert.equal(book.places[1].image, "");
  const serialized = JSON.stringify(book);
  assert.doesNotMatch(serialized, /mapX|mapY|lat|lng|128\.1|35\.1|rawPhoto|exif/i);
  const restored = travelBookRestorePayload(book);
  assert.deepEqual(restored.savedPlaceIds, ["a", "b"]);
  assert.equal(restored.schedule.dayStartTime, "09:30");
  assert.match(restored.href, /^\/planner\?region=/);
  assert.match(buildTravelBookPlannerHref(book), /from=travel-book/);
  assert.equal(new URL(restored.href, "https://wave.test").hash, "#itinerary", "guided restoration opens the saved itinerary rather than asking for new preferences");
});

test("오래된 기록의 손상된 날짜는 정리하되 유효한 원래 장소 날짜는 이동하지 않는다", () => {
  const places = Array.from({ length: TRAVEL_BOOK_MAX_PLACES + 8 }, (_, index) => ({ id: `p-${index}`, name: `장소 ${index}` }));
  const legacy = input({
    travelStart: "2026-02-28",
    travelEnd: "2026-02-30",
    dayStartTime: "28:90",
    scheduleAssignments: { "p-0": "2030-01-01" },
    note: "x".repeat(3000),
    places,
  });
  assert.equal(createTravelBookSnapshot(legacy), null, "새 기록은 손상된 기간을 저장하지 않는다");
  const book = sanitizeTravelBook(legacy);
  assert.equal(book.travelEnd, "2026-02-28");
  assert.equal(book.dayStartTime, "10:00");
  assert.equal(book.scheduleAssignments["p-0"], "2030-01-01");
  assert.equal(book.places.length, TRAVEL_BOOK_MAX_PLACES);
});

test("새 여행집은 7일 초과 또는 날짜 해결 전 장소를 다른 날짜로 저장하지 않는다", () => {
  assert.equal(createTravelBookSnapshot(input({ travelEnd: "2026-09-09" })), null);
  assert.equal(createTravelBookSnapshot(input({ travelEnd: "2026-09-01" })), null);
  const original = input({ travelEnd: "2026-09-01" });
  assert.equal(travelBookRestorePayload(original).schedule.scheduleAssignments.b, "2026-09-02");
});

test("같은 일정은 메모와 상태를 보존해 갱신하고 전체 여행 수는 20개로 제한한다", () => {
  const first = createTravelBookSnapshot(input(), "2026-09-01T00:00:00.000Z");
  let books = upsertTravelBook([], first, "2026-09-01T00:00:00.000Z");
  books = patchTravelBook(books, first.id, { status: "visited", note: "경사로가 편했다." }, "2026-09-02T00:00:00.000Z");
  books = upsertTravelBook(books, createTravelBookSnapshot(input({ title: "새 제목", places: [...input().places].reverse() }), "2026-09-03T00:00:00.000Z"), "2026-09-03T00:00:00.000Z");
  assert.equal(books.length, 1);
  assert.equal(books[0].title, "새 제목");
  assert.equal(books[0].status, "visited");
  assert.equal(books[0].note, "경사로가 편했다.");
  assert.deepEqual(books[0].places.map((place) => place.id), ["b", "a"]);

  const many = Array.from({ length: TRAVEL_BOOK_MAX_ITEMS + 5 }, (_, index) => createTravelBookSnapshot(input({
    travelStart: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
    travelEnd: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
    places: [{ id: `place-${index}`, name: `장소 ${index}` }],
  }), `2026-10-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`));
  assert.equal(sanitizeTravelBooks(many).length, TRAVEL_BOOK_MAX_ITEMS);
});

test("여행집 UI는 로컬 저장·키보드·모바일·다크 테마 계약을 명시한다", async () => {
  const [helper, hook, page, css, planner, privacy] = await Promise.all([
    source("lib/travel-book.js"),
    source("features/travel-book/useTravelBook.ts"),
    source("app/travel-book/page.tsx"),
    source("app/styles/travel-book.css"),
    source("features/planner/components/TripDayPlanner.tsx"),
    source("app/privacy/page.tsx"),
  ]);
  assert.match(helper, /wave-travel-book-v1/);
  assert.match(hook, /wave-saved-places/);
  assert.match(hook, /wave-trip-schedule-v1/);
  assert.match(privacy, /여행집은 브라우저의 기기 저장소에 둡니다/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /role="group"/);
  assert.match(page, /maxLength=\{1200\}/);
  assert.match(planner, /TravelBookArchiveAction/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /html\[data-theme="dark"\] \.travel-book-page/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
