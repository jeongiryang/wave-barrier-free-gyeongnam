import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("landing route composes restored scenes and keeps browser effects inside their owners", async () => {
  const [page, hero, regions, story, naru, departure, reveal] = await Promise.all([
    source("app/page.tsx"),
    source("features/landing/components/LandingHero.tsx"),
    source("features/landing/components/LandingRegionStory.tsx"),
    source("features/landing/components/LandingChapters.tsx"),
    source("features/landing/components/LandingAssistantStory.tsx"),
    source("features/landing/components/LandingDepartureScene.tsx"),
    source("features/landing/hooks/useLandingReveal.ts"),
  ]);
  // Owner's approved local layout uses one responsive tree: the region gallery
  // follows the journey preview, feature entries live in the departure section,
  // and the final invitation shares its box with the footer.
  const sceneNames = content => [...content.matchAll(/<(Landing[A-Za-z]+)\b/g)].map(match => match[1]);
  assert.deepEqual(sceneNames(page), ["LandingIntro", "LandingHeader", "LandingHero", "LandingChapters", "LandingJourneyPreview", "LandingRegionStory", "LandingRestoredConversation", "LandingDepartureScene", "LandingCommunityScene", "LandingCommunityScene", "LandingAssistantStory", "LandingFeatureList", "LandingCallToAction", "LandingFooter"]);
  assert.match(page, /<LandingJourneyPreview[^>]*\/><LandingRegionStory\s*\/>/);
  assert.deepEqual([...page.matchAll(/<LandingCommunityScene scene="([^"]+)"/g)].map(match => match[1]), ["community", "festival"]);
  assert.match(page, /className="landing-finale"><LandingCallToAction[^>]*\/><LandingFooter/);
  assert.equal((departure.match(/<LandingFeatureLinks\s*\/>/g) || []).length, 1, "the relocated feature links remain reachable once");
  assert.match(page, /useLandingReveal\(root\)/);
  assert.match(reveal, /observer\.disconnect\(\); preferenceObserver\.disconnect\(\); cancel\(\)/);
  assert.deepEqual([hero, regions, story, naru].flatMap(content => [...content.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1])), ["top", "regions", "story", "naru"]);
  assert.doesNotMatch(page, /useState|useEffect|IntersectionObserver|AbortController/);
  assert.match(regions, /new IntersectionObserver/);
  assert.match(regions, /observer\.disconnect\(\)/);
  assert.match(hero, /action="\/planner"/);
  assert.match(naru, /useOpenNaru\(\)/);
  assert.match(naru, /onClick=\{\(\) => openNaru\(item\.example\)\}/);
  assert.match(naru, /disabled=\{!ready\}/);
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
  assert.match(intro, /모두의 발걸음이 닿는 경상남도/);
  assert.match(intro, /node\.showModal\(\)/);
  assert.match(intro, /onCancel=\{event\s*=>\s*\{\s*event\.preventDefault\(\);\s*finishRef\.current\(\);\s*\}\}/);
  assert.match(intro, /건너뛰기<\/button>/);
  assert.match(css, /\.scene\s*\{/);
  assert.match(intro, /onComplete=\{\(\)=>finishRef\.current\(\)\}/);
  assert.match(intro, /watchdog\s*=\s*setTimeout\([\s\S]*!ready\.current[\s\S]*8000\)/);
  assert.match(intro, /sessionStorage\.getItem\("wave-arrival-session-v1"\)/);
  assert.match(intro, /sessionStorage\.setItem\("wave-arrival-session-v1", "done"\)/);
  assert.match(intro, /document\.documentElement\.dataset\.introSeen = "1"/);
  // Keep the approved automatic first-visit playback. Focus return and SSR
  // selection preservation are exercised by landing-initial-paint.spec.ts.
  assert.match(intro, /!replay && \(seen \|\| window\.location\.hash \|\| \(!booting && window\.scrollY > 24\)/);
});

test("place-photo recovery has a finite timeout and a stale result cannot replace the current card image", async () => {
  const [row, photo, hook, client] = await Promise.all([
    source("features/planner/components/PlaceResultRow.tsx"),
    source("features/tourism/components/SmartSpotImage.tsx"),
    source("features/tourism/hooks/useOfficialSpotImage.ts"),
    source("features/tourism/client/spot-photo.ts"),
  ]);
  assert.match(row, /<SmartSpotImage[^>]*contentId=\{place\.id\}/);
  assert.match(photo, /photo\.onLoad\(\)/);
  assert.match(photo, /rememberPhotoCredits/);
  assert.match(photo, /onError=\{demoImage \? undefined : photo\.onError\}/);
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
