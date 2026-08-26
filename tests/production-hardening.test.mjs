import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("landing route delegates section UI and browser effects to feature modules", async () => {
  const [page, experience] = await Promise.all([
    source("app/page.tsx"),
    Promise.all([
      source("features/landing/hooks/useLandingExperience.ts"),
      source("features/landing/hooks/useLandingMotion.ts"),
      source("features/landing/hooks/useLandingRegions.ts"),
      source("features/landing/client/region-photo.ts"),
    ]).then((parts) => parts.join("\n")),
  ]);
  for (const component of ["LandingHeader", "LandingHero", "LandingManifesto", "LandingRegionStory", "LandingEvidenceStory", "LandingFooter"]) {
    assert.match(page, new RegExp(`<${component}`));
  }
  assert.doesNotMatch(page, /useState|useEffect|IntersectionObserver|AbortController/);
  assert.match(experience, /IntersectionObserver/);
  assert.match(experience, /AbortController/);
});

test("landing intro traps keyboard focus and restores page scrolling", async () => {
  const landing = await source("features/landing/components/LandingIntro.tsx");
  assert.match(landing, /const previousOverflow = document\.body\.style\.overflow/);
  assert.match(landing, /document\.body\.style\.overflow = "hidden"/);
  assert.match(landing, /event\.key === "Tab"/);
  assert.match(landing, /event\.preventDefault\(\)[\s\S]*startButtonRef\.current\?\.focus\(\)/);
  assert.match(landing, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(landing, /previousFocus\?\.focus\(\)/);
});

test("landing region photos time out and can retry after transient failures", async () => {
  const landing = await Promise.all([
    source("features/landing/hooks/useLandingRegions.ts"),
    source("features/landing/client/region-photo.ts"),
  ]).then((parts) => parts.join("\n"));
  assert.match(landing, /const controller = new AbortController\(\)/);
  assert.match(landing, /setTimeout\(\(\) => controller\.abort\(\), 10000\)/);
  assert.match(landing, /fetchRegionPhoto\(region, controller\.signal\)/);
  assert.match(landing, /photoRequests\.current\.delete\(region\)/);
  assert.match(landing, /window\.clearTimeout\(timeout\)/);
});

test("tourism images allow only normalized HTTPS URLs", async () => {
  const image = await Promise.all([
    source("features/tourism/components/SmartSpotImage.tsx"),
    source("features/tourism/hooks/useOfficialSpotImage.ts"),
    source("features/tourism/client/spot-photo.ts"),
    source("features/tourism/image-url.ts"),
  ]).then((parts) => parts.join("\n"));
  assert.match(image, /function safeTourismImageUrl/);
  assert.match(image, /if \(url\.protocol === "http:"\) url\.protocol = "https:"/);
  assert.match(image, /return url\.protocol === "https:" \? url\.toString\(\) : ""/);
  assert.match(image, /safeTourismImageUrl\(data\?\.image\)/);
  assert.match(image, /safeTourismImageUrl\(src\)/);
});

test("barrier-free place merging keeps an existing official photo when the primary field is empty", async () => {
  const provider = await source("server/tourism/provider-model.ts");
  assert.match(provider, /Object\.entries\(item\)\.filter\(\(\[, value\]\) => clean\(value\) !== ""\)/);
  assert.doesNotMatch(provider, /\{ \.\.\.\(merged\.get\(id\) \|\| \{\}\), \.\.\.item \}/);
});
