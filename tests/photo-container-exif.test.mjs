import assert from "node:assert/strict";
import test from "node:test";
import { readPhotoExif } from "../lib/photo-exif.js";

function tiffBytes() {
  const buffer = new ArrayBuffer(128);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  u8.set([0x49,0x49,0x2a,0x00]);
  view.setUint32(4, 8, true);
  view.setUint16(8, 1, true);
  view.setUint16(10, 0x8769, true);
  view.setUint16(12, 4, true);
  view.setUint32(14, 1, true);
  view.setUint32(18, 26, true);
  view.setUint32(22, 0, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 0x9003, true);
  view.setUint16(30, 2, true);
  view.setUint32(32, 20, true);
  view.setUint32(36, 44, true);
  view.setUint32(40, 0, true);
  const text = new TextEncoder().encode("2026:08:29 09:15:00\0");
  u8.set(text, 44);
  return u8.slice(0, 64);
}

function pngWithExif(tiff) {
  const result = new Uint8Array(8 + 4 + 4 + tiff.length + 4 + 12);
  result.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a], 0);
  const view = new DataView(result.buffer);
  view.setUint32(8, tiff.length, false);
  result.set(new TextEncoder().encode("eXIf"), 12);
  result.set(tiff, 16);
  const next = 16 + tiff.length + 4;
  view.setUint32(next, 0, false);
  result.set(new TextEncoder().encode("IEND"), next + 4);
  return result;
}

function webpWithExif(tiff) {
  const size = 8 + 8 + tiff.length + (tiff.length % 2);
  const result = new Uint8Array(size);
  const view = new DataView(result.buffer);
  result.set(new TextEncoder().encode("RIFF"), 0);
  view.setUint32(4, size - 8, true);
  result.set(new TextEncoder().encode("WEBP"), 8);
  result.set(new TextEncoder().encode("EXIF"), 12);
  view.setUint32(16, tiff.length, true);
  result.set(tiff, 20);
  return result;
}

test("TIFF EXIF is parsed directly", () => {
  const result = readPhotoExif(tiffBytes().buffer);
  assert.equal(result.takenAt?.date, "2026-08-29");
  assert.equal(result.takenAt?.minutes, 9 * 60 + 15);
});

test("PNG eXIf chunk is parsed without reading image pixels", () => {
  const result = readPhotoExif(pngWithExif(tiffBytes()).buffer);
  assert.equal(result.takenAt?.date, "2026-08-29");
});

test("WebP EXIF chunk is parsed without decoding the bitmap", () => {
  const result = readPhotoExif(webpWithExif(tiffBytes()).buffer);
  assert.equal(result.takenAt?.date, "2026-08-29");
});
