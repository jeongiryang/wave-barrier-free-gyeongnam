import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GYEONGNAM_REGION_POINTS, nearestGyeongnamRegion } from "../lib/gyeongnam-regions.js";
import { buildPhotoCourse, courseToSelections } from "../lib/photo-course.js";
import { parseExifTimestamp, readPhotoExif } from "../lib/photo-exif.js";
import { buildExifJpeg } from "./helpers/exif-jpeg.mjs";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const at = (date, hour, minute) => ({ date, minutes: (hour * 60) + minute });

test("EXIF reading recovers capture time and coordinates from real JPEG bytes", () => {
  const little = readPhotoExif(buildExifJpeg({ takenAt: "2026:08:14 09:31:02", lat: 34.8377, lng: 127.8925 }));
  assert.deepEqual(little.takenAt, { date: "2026-08-14", minutes: 571 });
  assert.ok(Math.abs(little.point.lat - 34.8377) < 0.0005);
  assert.ok(Math.abs(little.point.lng - 127.8925) < 0.0005);

  // 카메라마다 바이트 순서가 다르다.
  const big = readPhotoExif(buildExifJpeg({ takenAt: "2026:08:14 11:05:00", lat: 35.2279, lng: 128.6811, little: false }));
  assert.deepEqual(big.takenAt, { date: "2026-08-14", minutes: 665 });
  assert.ok(Math.abs(big.point.lat - 35.2279) < 0.0005);

  // 남반구·서반구 표기도 부호를 지켜야 한다.
  const south = readPhotoExif(buildExifJpeg({ takenAt: "2026:01:02 03:04:05", lat: -33.8688, lng: -70.6693 }));
  assert.ok(south.point.lat < 0 && south.point.lng < 0);
});

test("EXIF reading invents nothing when the information is absent or damaged", () => {
  assert.deepEqual(readPhotoExif(buildExifJpeg({ takenAt: "2026:08:14 12:00:00" })).point, null);
  assert.deepEqual(readPhotoExif(buildExifJpeg({ lat: 35.2279, lng: 128.6811 })).takenAt, null);
  assert.deepEqual(readPhotoExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer), { takenAt: null, point: null });
  assert.deepEqual(readPhotoExif(new Uint8Array([1, 2, 3]).buffer), { takenAt: null, point: null });
  assert.deepEqual(readPhotoExif(null), { takenAt: null, point: null });
});

test("EXIF timestamps reject impossible clock values", () => {
  assert.deepEqual(parseExifTimestamp("2026:08:14 00:00:00"), { date: "2026-08-14", minutes: 0 });
  assert.equal(parseExifTimestamp("2026:13:14 09:00:00"), null);
  assert.equal(parseExifTimestamp("2026:08:32 09:00:00"), null);
  assert.equal(parseExifTimestamp("2026:08:14 25:00:00"), null);
  assert.equal(parseExifTimestamp(""), null);
  assert.equal(parseExifTimestamp(undefined), null);
});

test("coordinates resolve to a Gyeongnam district without inventing one", () => {
  assert.equal(nearestGyeongnamRegion(GYEONGNAM_REGION_POINTS.통영), "통영");
  assert.equal(nearestGyeongnamRegion({ lat: 34.8377, lng: 127.8925 }), "남해");
  // 경남에서 먼 좌표를 경남 여행으로 둔갑시키지 않는다.
  assert.equal(nearestGyeongnamRegion({ lat: 37.5665, lng: 126.9780 }), "");
  assert.equal(nearestGyeongnamRegion({ lat: 33.4996, lng: 126.5312 }), "");
  assert.equal(nearestGyeongnamRegion({ lat: "x", lng: null }), "");
  // "경남 전체"는 실제 시·군이 아니므로 추론 결과가 되지 않는다.
  assert.notEqual(nearestGyeongnamRegion(GYEONGNAM_REGION_POINTS["경남 전체"]), "경남 전체");
});

test("photos become day-by-day visits ordered by capture time", () => {
  const course = buildPhotoCourse([
    { takenAt: at("2026-08-15", 10, 5), point: { lat: 34.8544, lng: 128.4332 } },
    { takenAt: at("2026-08-14", 14, 10), point: { lat: 34.7460, lng: 127.9270 } },
    { takenAt: at("2026-08-14", 9, 30), point: { lat: 34.8377, lng: 127.8925 } },
    { takenAt: at("2026-08-14", 9, 42), point: { lat: 34.8380, lng: 127.8930 } },
  ]);
  assert.deepEqual(course.days.map((day) => day.date), ["2026-08-14", "2026-08-15"]);
  // 가깝고 12분 차이인 두 장은 한 방문지로 묶인다.
  assert.equal(course.days[0].stops.length, 2);
  assert.equal(course.days[0].stops[0].photoCount, 2);
  assert.equal(course.days[0].stops[0].timeLabel, "오전 9:30");
  assert.equal(course.days[0].stops[1].timeLabel, "오후 2:10");
  assert.equal(course.days[0].region, "남해");
  assert.equal(course.days[1].region, "통영");
});

test("photos without usable metadata are reported instead of guessed", () => {
  const course = buildPhotoCourse([
    { takenAt: at("2026-08-14", 9, 0), point: { lat: 34.8377, lng: 127.8925 } },
    { takenAt: at("2026-08-14", 9, 20), point: null },
    { takenAt: null, point: { lat: 34.8377, lng: 127.8925 } },
    { takenAt: null, point: null },
  ]);
  assert.equal(course.skipped.withoutDate, 2);
  assert.equal(course.skipped.withoutPoint, 1);
  assert.equal(course.photoCount, 2);
  assert.deepEqual(buildPhotoCourse([]).days, []);
  assert.deepEqual(buildPhotoCourse(null).days, []);
});

test("only names and dates can leave the browser, never coordinates", async () => {
  const course = buildPhotoCourse([
    { takenAt: at("2026-08-14", 9, 0), point: { lat: 34.8377, lng: 127.8925 } },
  ]);
  const selections = courseToSelections(course.days);
  const serialized = JSON.stringify(selections);
  assert.doesNotMatch(serialized, /lat|lng|34\.83|127\.89/);
  assert.deepEqual(selections, [{ date: "2026-08-14", region: "남해", stops: [{ order: 0, name: "남해 방문지 1" }] }]);

  // 클라이언트 모듈이 좌표를 담아 요청을 보내지 않는지 고정한다.
  const [hook, component] = await Promise.all([
    source("features/photo-course/usePhotoCourse.ts"),
    source("features/photo-course/PhotoCourseRestore.tsx"),
  ]);
  const client = `${hook}\n${component}`;
  assert.doesNotMatch(client, /fetch\(|XMLHttpRequest|navigator\.sendBeacon|FormData/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|indexedDB/);
  assert.match(hook, /file\.slice\(0, EXIF_HEAD_BYTES\)/);
});

test("the photo course tool tells people what it cannot do", async () => {
  const component = await source("features/photo-course/PhotoCourseRestore.tsx");
  assert.match(component, /기기 안에서만/);
  assert.match(component, /서버로 전송되지 않/);
  assert.match(component, /JPEG 원본/);
  assert.match(component, /직접 고치실 수 있습니다/);
  assert.match(component, /role="status"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /className="sr-only"/);
});

test("the photo course styles keep touch targets and dark theme readable", async () => {
  const css = await source("app/styles/photo-course.css");
  assert.match(css, /\.photo-course-pick,[\s\S]*min-height: 48px/);
  assert.match(css, /\.photo-course-name input \{[\s\S]*min-height: 44px/);
  assert.match(css, /\.photo-course-limits summary \{[\s\S]*min-height: 44px/);
  // 상태를 색으로만 말하지 않는다.
  assert.match(css, /\.photo-course-badge\.is-located::before \{ content: "✓ "; \}/);
  assert.match(css, /\.photo-course-badge\.is-unlocated::before \{ content: "\? "; \}/);
  // 밝은 구역을 어둡게 바꿀 때 안쪽 글자색도 함께 바꾼다.
  assert.match(css, /html\[data-theme="dark"\] \.photo-course \{[\s\S]*color: #eaf5f9/);
  assert.match(css, /html\[data-theme="dark"\] \.photo-course-name input \{[\s\S]*color: #eaf5f9/);
});

test("the shared region table has one definition for server and browser", async () => {
  const weather = await source("server/weather/catalog.ts");
  assert.match(weather, /from "\.\.\/\.\.\/lib\/gyeongnam-regions\.js"/);
  assert.doesNotMatch(weather, /35\.2279/);
  assert.equal(Object.keys(GYEONGNAM_REGION_POINTS).length, 19);
});
