import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("landing intro traps keyboard focus and restores page scrolling", async () => {
  const landing = await source("app/page.tsx");
  assert.match(landing, /const previousOverflow = document\.body\.style\.overflow/);
  assert.match(landing, /document\.body\.style\.overflow = "hidden"/);
  assert.match(landing, /event\.key === "Tab"/);
  assert.match(landing, /event\.preventDefault\(\)[\s\S]*startButtonRef\.current\?\.focus\(\)/);
  assert.match(landing, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(landing, /previousFocus\?\.focus\(\)/);
});

test("landing region photos time out and can retry after transient failures", async () => {
  const landing = await source("app/page.tsx");
  assert.match(landing, /const controller = new AbortController\(\)/);
  assert.match(landing, /setTimeout\(\(\) => controller\.abort\(\), 10000\)/);
  assert.match(landing, /signal: controller\.signal/);
  assert.match(landing, /photoRequests\.current\.delete\(region\)/);
  assert.match(landing, /window\.clearTimeout\(timeout\)/);
});

test("tourism images allow only normalized HTTPS URLs", async () => {
  const image = await source("components/SmartSpotImage.tsx");
  assert.match(image, /function safeImageUrl/);
  assert.match(image, /if \(url\.protocol === "http:"\) url\.protocol = "https:"/);
  assert.match(image, /return url\.protocol === "https:" \? url\.toString\(\) : ""/);
  assert.match(image, /const nextImage = safeImageUrl\(data\?\.image\)/);
  assert.match(image, /const nextImage = safeImageUrl\(src\)/);
});
