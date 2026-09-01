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
  travelBookRestorePayload,
  upsertTravelBook,
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
});

test("손상된 날짜·배정·메모·장소 수는 보관 한계 안으로 정리된다", () => {
  const places = Array.from({ length: TRAVEL_BOOK_MAX_PLACES + 8 }, (_, index) => ({ id: `p-${index}`, name: `장소 ${index}` }));
  const book = createTravelBookSnapshot(input({
    travelStart: "2026-02-28",
    travelEnd: "2026-02-30",
    dayStartTime: "28:90",
    scheduleAssignments: { "p-0": "2030-01-01" },
    note: "x".repeat(3000),
    places,
  }));
  assert.equal(book.travelEnd, "2026-02-28");
  assert.equal(book.dayStartTime, "10:00");
  assert.equal(book.scheduleAssignments["p-0"], "2026-02-28");
  assert.equal(book.places.length, TRAVEL_BOOK_MAX_PLACES);
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
  const [helper, hook, page, css, planner] = await Promise.all([
    source("lib/travel-book.js"),
    source("features/travel-book/useTravelBook.ts"),
    source("app/travel-book/page.tsx"),
    source("app/styles/travel-book.css"),
    source("features/planner/components/TripDayPlanner.tsx"),
  ]);
  assert.match(helper, /wave-travel-book-v1/);
  assert.match(hook, /wave-saved-places/);
  assert.match(hook, /wave-trip-schedule-v1/);
  assert.match(page, /원본 사진, GPS 좌표, 정확한 출발지/);
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
