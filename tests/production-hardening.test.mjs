import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("landing route composes restored scenes and keeps browser effects inside their owners", async () => {
  const [page, hero, regions, story, naru] = await Promise.all([
    source("app/page.tsx"),
    source("features/landing/components/LandingHero.tsx"),
    source("features/landing/components/LandingRegionStory.tsx"),
    source("features/landing/components/LandingChapters.tsx"),
    source("features/landing/components/LandingAssistantStory.tsx"),
  ]);
  // Each responsive branch renders one copy of each scene; mobile moves the
  // feature entry before the region picker without duplicating either section.
  const responsiveScenes = /\{compact\s*\? \[([^\]]+)\]\s*:\s*\[([^\]]+)\]\}/;
  const branches = page.match(responsiveScenes);
  assert.ok(branches, "landing keeps explicit compact and desktop scene order");
  const sceneNames = content => [...content.matchAll(/<(Landing[A-Za-z]+)\b/g)].map(match => match[1]);
  assert.deepEqual(sceneNames(branches[1]), ["LandingFeatureLinks", "LandingRegionStory"]);
  assert.deepEqual(sceneNames(branches[2]), ["LandingRegionStory", "LandingFeatureLinks"]);
  for (const [index, middle] of [[1, ["LandingFeatureLinks", "LandingRegionStory"]], [2, ["LandingRegionStory", "LandingFeatureLinks"]]]) {
    assert.deepEqual(sceneNames(page.replace(responsiveScenes, branches[index])),
      ["LandingIntro", "LandingHeader", "LandingHero", ...middle, "LandingChapters", "LandingCommunityScene", "LandingDepartureScene", "LandingAssistantStory", "LandingFeatureList", "LandingCallToAction", "LandingFooter"]);
  }
  assert.match(page, /useSyncExternalStore\(subscribeCompact, compactSnapshot, desktopSnapshot\)/);
  assert.match(page, /query\.addEventListener\("change", onChange\)/);
  assert.match(page, /return \(\) => query\.removeEventListener\("change", onChange\)/);
  assert.deepEqual([hero, regions, story, naru].flatMap(content => [...content.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1])), ["top", "regions", "story", "naru"]);
  assert.doesNotMatch(page, /useState|useEffect|IntersectionObserver|AbortController/);
  assert.match(regions, /new IntersectionObserver/);
  assert.match(regions, /observer\.disconnect\(\)/);
  assert.match(hero, /href="\/planner"/);
  assert.match(naru, /href="\/planner\?assistant=naru"/);
  assert.match(story, /night-journey-input/);
  assert.match(story, /lazy\(\(\) => import\("\.\.\/\.\.\/\.\.\/components\/GyeongnamRegionPicker"\)/);
  assert.match(story, /observer\.disconnect\(\)/);
  assert.match(story, /encodeURIComponent\(region\)/);
  assert.match(story, /href=\{href\}/);
  assert.match(naru, /Example conversation/);
  assert.doesNotMatch(story + naru, /fetch\(|localStorage|sessionStorage|<form\b|<input\b|<textarea\b/);
});

test("the arrival intro is dismissible, accessible and isolated from global landing styles", async () => {
  const [landing, intro, css] = await Promise.all([
    source("app/page.tsx"),
    source("features/landing/components/LandingIntro.tsx"),
    source("features/landing/components/LandingIntro.module.css"),
  ]);
  assert.match(landing, /<LandingIntro/);
  assert.match(landing, /<LandingHero/);
  assert.match(intro, /<dialog ref=\{dialog\} className=\{`\$\{styles\.scene\} arrival-scene`\}/);
  assert.match(intro, /"모두의 발걸음이 닿는 경상남도"/);
  assert.match(intro, /node\.showModal\(\)/);
  assert.match(intro, /onCancel=\{event\s*=>\s*\{\s*event\.preventDefault\(\);\s*finishRef\.current\(\);\s*\}\}/);
  assert.match(intro, /건너뛰기<\/button>/);
  assert.match(css, /\.scene\s*\{/);
  assert.match(intro, /onComplete=\{\(\)=>finishRef\.current\(\)\}/);
  assert.match(intro, /watchdog\s*=\s*setTimeout\([\s\S]*!ready\.current[\s\S]*8000\)/);
  assert.match(intro, /sessionStorage\.getItem\("wave-arrival-session-v1"\)/);
  assert.match(intro, /sessionStorage\.setItem\("wave-arrival-session-v1", "done"\)/);
  assert.match(intro, /document\.documentElement\.dataset\.introSeen = "1"/);
  assert.match(intro, /media\.matches/);
  assert.match(intro, /!replay && \(seen \|\| window\.scrollY/);
  assert.match(intro, /media\.addEventListener\("change", reduce\)/);
  assert.match(intro, /media\.removeEventListener\("change", reduce\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("place-photo recovery has a finite timeout and a stale result cannot replace the current card image", async () => {
  const [row, photo, hook, client] = await Promise.all([
    source("features/planner/components/PlaceResultRow.tsx"),
    source("features/tourism/components/SmartSpotImage.tsx"),
    source("features/tourism/hooks/useOfficialSpotImage.ts"),
    source("features/tourism/client/spot-photo.ts"),
  ]);
  assert.match(row, /<SmartSpotImage[^>]*contentId=\{place\.id\}/);
  assert.match(photo, /onLoad=\{photo\.onLoad\} onError=\{photo\.onError\}/);
  assert.match(hook, /const controller = new AbortController\(\)/);
  assert.match(hook, /setTimeout\(\(\) => controller\.abort\(\), 12000\)/);
  assert.match(hook, /cancelled\(\) \|\| controller\.signal\.aborted \|\| fallbackRequest\.current !== request/);
  assert.match(hook, /fallbackRequest\.current\?\.key === imageKey\) return/);
  assert.match(hook, /fallbackRequest\.current\.controller\.abort\(\)/);
  assert.match(hook, /window\.clearTimeout\(timeout\)/);
  assert.match(hook, /window\.clearTimeout\(slowImage\)/);
  assert.match(client, /action: "spot-photo"/);
  assert.match(client, /params\.set\("contentId", query\.contentId\)/);
  assert.match(client, /signal,/);
});

test("tourism images allow only normalized HTTPS URLs", async () => {
  const [image, serverMedia] = await Promise.all([
    Promise.all([
      source("features/tourism/components/SmartSpotImage.tsx"),
      source("features/tourism/hooks/useOfficialSpotImage.ts"),
      source("features/tourism/client/spot-photo.ts"),
      source("features/tourism/image-url.ts"),
    ]).then((parts) => parts.join("\n")),
    Promise.all([
      source("server/tourism/accessibility-model.ts"),
      source("server/tourism/content-model.ts"),
      source("server/tourism/region-photo.ts"),
    ]).then((parts) => parts.join("\n")),
  ]);
  assert.match(image, /function safeTourismImageUrl/);
  assert.match(image, /if \(url\.protocol === "http:"\) url\.protocol = "https:"/);
  assert.match(image, /return url\.protocol === "https:" \? url\.toString\(\) : ""/);
  assert.match(image, /safeTourismImageUrl\(data\?\.image\)/);
  assert.match(image, /safeTourismImageUrl\(src\)/);
  assert.match(serverMedia, /image: httpsUrl\(/);
  assert.match(serverMedia, /audioUrl: httpsUrl\(/);
  assert.doesNotMatch(serverMedia, /image: clean\([^\n]+\.replace\(\/\^http/);
});

test("barrier-free place merging keeps an existing official photo when the primary field is empty", async () => {
  const provider = await source("server/tourism/provider-model.ts");
  assert.match(provider, /Object\.entries\(item\)\.filter\(\(\[, value\]\) => clean\(value\) !== ""\)/);
  assert.doesNotMatch(provider, /\{ \.\.\.\(merged\.get\(id\) \|\| \{\}\), \.\.\.item \}/);
});
