import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GYEONGNAM_REGION_POINTS, nearestGyeongnamRegion } from "../lib/gyeongnam-regions.js";
import {
  buildPhotoCourse,
  changePhotoCourseDayDate,
  courseToSelections,
  movePhotoCourseStop,
  photoCourseShareText,
  portablePhotoCourseExport,
} from "../lib/photo-course.js";
import { EXIF_HEAD_BYTES, MAX_PHOTOS, readPhotoMetadataFiles } from "../lib/photo-import.js";
import { parseExifTimestamp, readPhotoExif } from "../lib/photo-exif.js";
import { buildExifJpeg } from "./helpers/exif-jpeg.mjs";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const at = (date, hour, minute) => ({ date, minutes: (hour * 60) + minute });

test("EXIF reading recovers capture time and coordinates from JPEG bytes", () => {
  const little = readPhotoExif(buildExifJpeg({ takenAt: "2026:08:14 09:31:02", lat: 34.8377, lng: 127.8925 }));
  assert.deepEqual(little.takenAt, { date: "2026-08-14", minutes: 571 });
  assert.ok(Math.abs(little.point.lat - 34.8377) < 0.0005);
  assert.ok(Math.abs(little.point.lng - 127.8925) < 0.0005);
  const big = readPhotoExif(buildExifJpeg({ takenAt: "2026:08:14 11:05:00", lat: 35.2279, lng: 128.6811, little: false }));
  assert.deepEqual(big.takenAt, { date: "2026-08-14", minutes: 665 });
  const south = readPhotoExif(buildExifJpeg({ takenAt: "2026:01:02 03:04:05", lat: -33.8688, lng: -70.6693 }));
  assert.ok(south.point.lat < 0 && south.point.lng < 0);
});

test("EXIF reading invents nothing when metadata is absent or damaged", () => {
  assert.deepEqual(readPhotoExif(buildExifJpeg({ takenAt: "2026:08:14 12:00:00" })).point, null);
  assert.deepEqual(readPhotoExif(buildExifJpeg({ lat: 35.2279, lng: 128.6811 })).takenAt, null);
  assert.deepEqual(readPhotoExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer), { takenAt: null, point: null });
  assert.deepEqual(readPhotoExif(null), { takenAt: null, point: null });
});

test("EXIF timestamps reject impossible clock values", () => {
  assert.deepEqual(parseExifTimestamp("2026:08:14 00:00:00"), { date: "2026-08-14", minutes: 0 });
  assert.equal(parseExifTimestamp("2026:13:14 09:00:00"), null);
  assert.equal(parseExifTimestamp("2026:08:32 09:00:00"), null);
  assert.equal(parseExifTimestamp("2026:08:14 25:00:00"), null);
});

test("coordinates resolve to a Gyeongnam district without inventing one", () => {
  assert.equal(nearestGyeongnamRegion(GYEONGNAM_REGION_POINTS.통영), "통영");
  assert.equal(nearestGyeongnamRegion({ lat: 34.8377, lng: 127.8925 }), "남해");
  assert.equal(nearestGyeongnamRegion({ lat: 37.5665, lng: 126.9780 }), "");
  assert.equal(nearestGyeongnamRegion({ lat: 33.4996, lng: 126.5312 }), "");
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
  assert.equal(course.days[0].stops.length, 2);
  assert.equal(course.days[0].stops[0].photoCount, 2);
  assert.equal(course.days[0].stops[0].timeLabel, "오전 9:30");
  assert.equal(course.days[0].region, "남해");
});

test("date and visit order can be corrected without restoring coordinates", () => {
  const course = buildPhotoCourse([
    { takenAt: at("2026-08-14", 9, 0), point: { lat: 34.8377, lng: 127.8925 } },
    { takenAt: at("2026-08-14", 13, 0), point: { lat: 34.8544, lng: 128.4332 } },
  ]);
  const firstId = course.days[0].stops[0].id;
  const moved = movePhotoCourseStop(course.days, 0, 0, 1);
  assert.equal(moved[0].stops[1].id, firstId);
  assert.deepEqual(moved[0].stops.map((stop) => stop.order), [0, 1]);
  const redated = changePhotoCourseDayDate(moved, 0, "2026-08-16");
  assert.equal(redated[0].date, "2026-08-16");
  assert.doesNotMatch(JSON.stringify(redated), /34\.83|127\.89|\"lat\"|\"lng\"/);
});

test("photos without usable metadata are reported instead of guessed", () => {
  const course = buildPhotoCourse([
    { takenAt: at("2026-08-14", 9, 0), point: { lat: 34.8377, lng: 127.8925 } },
    { takenAt: at("2026-08-14", 9, 20), point: null },
    { takenAt: null, point: { lat: 34.8377, lng: 127.8925 } },
  ]);
  assert.equal(course.skipped.withoutDate, 1);
  assert.equal(course.skipped.withoutPoint, 1);
  assert.equal(course.photoCount, 2);
});

test("large source files are read sequentially and only through the bounded EXIF head", async () => {
  const jpeg = buildExifJpeg({ takenAt: "2026:08:14 09:31:02", lat: 34.8377, lng: 127.8925 });
  let maxSliceEnd = 0;
  let activeReads = 0;
  let maxActiveReads = 0;
  const files = Array.from({ length: MAX_PHOTOS + 7 }, (_, index) => ({
    name: `huge-${index}.jpg`,
    size: 8 * 1024 * 1024 * 1024,
    slice(start, end) {
      assert.equal(start, 0);
      maxSliceEnd = Math.max(maxSliceEnd, end);
      return {
        async arrayBuffer() {
          activeReads += 1;
          maxActiveReads = Math.max(maxActiveReads, activeReads);
          await Promise.resolve();
          activeReads -= 1;
          return jpeg;
        },
      };
    },
  }));
  const result = await readPhotoMetadataFiles(files);
  assert.equal(result.selectedCount, MAX_PHOTOS);
  assert.equal(result.truncated, 7);
  assert.equal(result.photos.length, MAX_PHOTOS);
  assert.equal(maxSliceEnd, EXIF_HEAD_BYTES);
  assert.equal(maxActiveReads, 1);
});

test("only confirmed names dates and contentIds can leave the browser", async () => {
  const course = buildPhotoCourse([{ takenAt: at("2026-08-14", 9, 0), point: { lat: 34.8377, lng: 127.8925 } }]);
  const stop = course.days[0].stops[0];
  const names = { [stop.id]: "남해 독일마을" };
  const enrichments = { [stop.id]: { contentId: "123456", source: "한국관광공사 관광정보" } };
  const selections = courseToSelections(course.days, names, enrichments);
  const exported = portablePhotoCourseExport(course.days, names, enrichments);
  const shared = photoCourseShareText(course.days, names, enrichments);
  for (const serialized of [JSON.stringify(selections), JSON.stringify(exported), shared]) {
    assert.doesNotMatch(serialized, /\"lat\"|\"lng\"|34\.83|127\.89/);
  }
  assert.equal(selections[0].stops[0].contentId, "123456");
  assert.match(exported.privacy, /GPS 좌표는 포함하지 않/);

  const hook = await source("features/photo-course/usePhotoCourse.ts");
  assert.match(hook, /new URLSearchParams\(\{ action: "spot-photo", region, title \}\)/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(hook, /URLSearchParams\([^\n]*(lat|lng|point)/);
});

test("official enrichment uses KTO tourism search and public tourism photos", async () => {
  const provider = await source("server/tourism/spot-photo.ts");
  assert.match(provider, /PhotoGalleryService1/);
  assert.match(provider, /searchKeyword2/);
  assert.match(provider, /contentId: clean\(item\.contentid/);
  assert.match(provider, /address: clean/);
  const component = await source("features/photo-course/PhotoCourseRestore.tsx");
  assert.match(component, /전체 장소 공식정보 확인/);
  assert.match(component, /contentId/);
  assert.match(component, /원본 사진과 GPS는 포함되지 않습니다/);
});

test("photo course UI documents limitations and supports accessible correction", async () => {
  const component = await source("features/photo-course/PhotoCourseRestore.tsx");
  assert.match(component, /기기 안에서만/);
  assert.match(component, /HEIC는 이번 버전에서 지원하지 않습니다/);
  assert.match(component, /type="date"/);
  assert.match(component, /순서를 위로/);
  assert.match(component, /<select/);
  assert.match(component, /role="status"/);
  assert.match(component, /aria-live="polite"/);
});

test("photo course styles keep touch targets mobile layout and dark theme readable", async () => {
  const css = await source("app/styles/photo-course.css");
  assert.match(css, /min-height: 48px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.photo-course-badge\.is-located::before \{ content: "✓ "; \}/);
  assert.match(css, /\.photo-course-badge\.is-unlocated::before \{ content: "\? "; \}/);
  assert.match(css, /html\[data-theme="dark"\] \.photo-course/);
});

test("weather and browser region inference share one coordinate table", async () => {
  const weather = await source("server/weather/catalog.ts");
  assert.match(weather, /gyeongnam-regions\.js/);
  assert.doesNotMatch(weather, /35\.2279/);
  assert.equal(Object.keys(GYEONGNAM_REGION_POINTS).length, 19);
});