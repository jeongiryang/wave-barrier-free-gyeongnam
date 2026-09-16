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
  assert.deepEqual([...page.matchAll(/<(Landing[A-Za-z]+)\b/g)].map(match => match[1]),
    ["LandingIntro", "LandingHeader", "LandingHero", "LandingChapters", "LandingRegionStory", "LandingAssistantStory", "LandingDepartureScene", "LandingCommunityScene", "LandingCallToAction", "LandingFooter"]);
  assert.deepEqual([hero, regions, story, naru].flatMap(content => [...content.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1])), ["top", "regions", "story", "naru"]);
  assert.doesNotMatch(page, /useState|useEffect|IntersectionObserver|AbortController/);
  assert.match(regions, /new IntersectionObserver/);
  assert.match(regions, /observer\.disconnect\(\)/);
  assert.match(hero, /href="\/planner"/);
  assert.match(naru, /href="\/planner\?assistant=naru"/);
  assert.match(story, /horizon-chapter-stream/);
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
  assert.match(intro, /WAVE가 당신의 발걸음을 응원합니다<\/p>/);
  assert.doesNotMatch(intro, /WAVE가 당신의 발걸음을 응원합니다\./);
  assert.match(intro, /node\.showModal\(\)/);
  assert.match(intro, /onCancel=\{\(event\) => \{ event\.preventDefault\(\); dismiss\(\); \}\}/);
  assert.match(intro, /건너뛰기<\/button>/);
  assert.match(css, /\.scene \{/);
  assert.match(intro, /setTimeout\(finish, 2000\)/);
  assert.match(intro, /sessionStorage\.getItem\("wave-arrival-session-v1"\)/);
  assert.match(intro, /sessionStorage\.setItem\("wave-arrival-session-v1", "done"\)/);
  assert.match(intro, /document\.documentElement\.dataset\.introSeen = "1"/);
  assert.match(intro, /seen \|\| media\.matches/);
  assert.match(intro, /media\.addEventListener\("change", reduce\)/);
  assert.match(intro, /media\.removeEventListener\("change", reduce\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
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
