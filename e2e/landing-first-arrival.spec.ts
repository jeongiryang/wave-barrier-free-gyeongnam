import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";
import { prepareStory, storyReady, expectUsableTarget } from "./landing-contract";

test.use({ video: "on" });

// Recorded product scenes begin after arrival; the intro cases below explicitly start a fresh arrival.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

for (const seenBefore of [false, true]) {
  test(`normal arrival is visibly painted and usable with prior legacy session marker ${seenBefore}`, async ({ page }) => {
    await page.clock.install();
    await mockPublicShellApi(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript((seen) => {
      sessionStorage.removeItem("wave-arrival-session-v1");
      if (seen) sessionStorage.setItem("wave-intro-seen-v2", "1");
      const observed: string[] = [];
      Object.defineProperty(window, "arrivalPhases", { value: observed });
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.attributeName === "data-intro-phase") {
            const phase = (record.target as HTMLElement).dataset.introPhase;
            if (phase && !observed.includes(phase)) observed.push(phase);
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-intro-phase"] });
    }, seenBefore);
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveCount(1);
    const intro = page.getByRole("dialog", { name: "WAVE", exact: true });
    const canvas = intro.locator(".arrival-wave-canvas");
    const planning = intro.getByRole("heading", { name: "WAVE" });
    await expect(planning).toBeVisible();
    await expect(planning).toBeEnabled();
    await expect(intro).toBeVisible();
    await expect(canvas).toHaveAttribute("data-intro-phase", "wordmark");
    // Inspect the painted final frame without screenshot/CI latency consuming
    // the 5.2s handoff deadline. Automatic handoff has separate timed coverage.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    // The server's still frame may be observed before the motion preference is hydrated.
    expect(await page.evaluate(() => (window as unknown as { arrivalPhases: string[] }).arrivalPhases.filter(phase => phase !== "static"))).toEqual(["wave", "accessibility", "wordmark"]);
    expect(await canvas.evaluate((node: HTMLCanvasElement) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const pixels = node.getContext("2d")!.getImageData(0, 0, node.width, node.height).data;
      const colors = new Set<number>();
      for (let i = 0; i < pixels.length; i += 404) colors.add(pixels[i] * 65536 + pixels[i + 1] * 256 + pixels[i + 2]);
      return rect.x === 0 && rect.y === 0 && rect.width === innerWidth && rect.height === innerHeight
        && style.opacity === "1" && style.maskImage === "none" && colors.size > 20;
    })).toBe(true);
    await page.screenshot({ path: test.info().outputPath("first-arrival-wordmark.png") });
    await planning.focus();
    await expect(planning).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.runFor(32);
    await expect(canvas).toBeHidden();
    await expect(intro.getByRole("heading", { name: "WAVE" })).toBeVisible();
    await expect(planning).toBeFocused();
    await page.screenshot({ path: test.info().outputPath("first-arrival-static.png") });
    await page.keyboard.press("Escape");
    await page.clock.runFor(32);
    await expect(intro).toBeHidden();
    await expect(page.locator("#landing-title")).toBeFocused();
  });
}

test("the region film follows forward and reverse scroll while reduced motion stays complete", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const scene = page.locator("#regions");
  const rails = scene.locator(".region-card-rail");
  await expect(rails).toHaveCount(2);
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  await expect(scene).toHaveAttribute("data-film", "true");
  const progress: number[] = [];
  for (const offset of [0, .25, .75, 1, .75, .25, 0]) {
    await scene.evaluate((node, offset) => {
      const sticky = (node as HTMLElement).dataset.filmSticky === "true";
      // The scene reserves 116px above its rails; sample its complete scroll range.
      const distance = sticky ? (node as HTMLElement).offsetHeight - (innerHeight - 116) : (node as HTMLElement).offsetHeight + innerHeight - 116;
      scrollTo({ top: scrollY + node.getBoundingClientRect().top - (sticky ? 116 : innerHeight) + distance * offset, behavior: "instant" });
    }, offset);
    await expect.poll(() => rails.first().evaluate(node => node.scrollLeft / (node.scrollWidth - node.clientWidth))).toBeCloseTo(1 - Math.min(1, offset / .46), 1);
    await expect.poll(() => rails.last().evaluate(node => node.scrollLeft / (node.scrollWidth - node.clientWidth))).toBeCloseTo(Math.max(0, Math.min(1, (offset - .54) / .46)), 1);
    progress.push(await rails.last().evaluate(node => node.scrollLeft / (node.scrollWidth - node.clientWidth)));
    await page.screenshot({ path: test.info().outputPath(`expansion-${offset}-${progress.length}.png`) });
  }
  expect(progress[1]).toBeCloseTo(progress[0], 1);
  expect(progress[2]).toBeGreaterThan(progress[1]);
  expect(progress[3]).toBeGreaterThan(progress[2]);
  expect(progress[4]).toBeCloseTo(progress[2], 1);
  expect(progress[5]).toBeCloseTo(progress[1], 1);
  expect(progress[6]).toBeCloseTo(progress[0], 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveAttribute("data-film", "false");
  await expect(scene.locator(".region-showcase-stage")).toHaveCSS("position", "relative");
  await expect(scene.getByRole("link", { name: /이 지역으로 여행 시작/ })).toBeVisible();
});

test("the account invitation uses licensed scenery and preserves deferred source recordings", async ({ page }) => {
  await prepareStory(page); await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("/"); await storyReady(page);
  const scene = page.locator("#recommendation"); await scene.scrollIntoViewIfNeeded();
  const capture = scene.locator(".horizon-account-photo img");
  await expect(capture).toHaveAttribute("src", "/media/horizon/coastal-park.jpg");
  await expect(capture).toHaveAttribute("lang", "ko");
  await expect(capture).toHaveAttribute("alt", /이순신공원/);
  await expect.poll(() => capture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(capture).toHaveCSS("object-fit", "cover");
  await expect(scene.locator("figcaption")).toContainText("CC BY-SA 4.0");
  expect(requests.filter(url => /timeline-|date-before|date-after|map-two-desktop/.test(url))).toEqual([]);
  await expect(page.locator(".itinerary-chapter,.map-chapter,.journey-stage")).toHaveCount(0);
  await expectUsableTarget(page.locator(".landing-actions a[href='/planner']"));
  expect((await new AxeBuilder({ page }).include("#recommendation").analyze()).violations).toEqual([]);
  // #386 retains original recordings. Verify bytes rather than remounting retired UI.
  const manifest = JSON.parse(await readFile("public/media/wave-journey/manifest.json", "utf8"));
  for (const name of ["places-two.webp", "date-before.webp", "date-after.webp", "map-two-desktop.webp"]) {
    const record = manifest.records.find((item: {file: string}) => item.file === name);
    expect(record).toBeDefined();
    const bytes = await readFile(`public/media/wave-journey/${name}`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
  }
  const timeline = JSON.parse(await readFile("public/media/wave-journey/timeline-manifest.json", "utf8"));
  expect(timeline.recordingId).toBe("production-eab2442-20260909-064600");
  expect([timeline.day1, timeline.day2]).toEqual(["2026-09-09", "2026-09-10"]);
  const recordings = [
    ["timeline-before-itinerary", 441, 703, ["126117", "2758443"], [1, 2]],
    ["timeline-before-map", 948, 1253, ["126117", "2758443"], [1, 2]],
    ["timeline-after-day1-itinerary", 441, 400, ["126117"], [1]],
    ["timeline-after-day1-map", 948, 1254, ["126117"], [1]],
    ["timeline-after-day2-itinerary", 442, 400, ["2758443"], [1]],
    ["timeline-after-day2-map", 948, 1254, ["2758443"], [1]],
  ];
  expect(timeline.assets).toHaveLength(6);
  for (const [name, width, height, ids, ranks] of recordings) {
    const record = timeline.assets.find((item: {name: string}) => item.name === name);
    expect([record.width, record.height, record.placeIds, record.ranks]).toEqual([width, height, ids, ranks]);
    const bytes = await readFile(`public/media/wave-journey/${name}.webp`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
  }
});

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: a failed account photograph retains source attribution and planning focus`, async ({ page }) => {
    await prepareStory(page);
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.route("**/media/horizon/coastal-park.jpg", route => route.abort());
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    const scene = page.locator("#recommendation"); await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("figcaption")).toContainText("불러오지 못했어요");
    await expect(scene.locator(".horizon-account-photo img")).toHaveCount(0);
    await expect(scene.locator("figcaption a").first()).toHaveAttribute("href", /^https:/);
    await expectUsableTarget(page.locator(".landing-actions a[href='/planner']"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("#recommendation").analyze()).violations).toEqual([]);
  });

  test(`${locale}: failure of one regional photograph does not leak into another album`, async ({ page }) => {
    await prepareStory(page);
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    const stage = page.locator("[data-region-stage]"); await stage.scrollIntoViewIfNeeded();
    const photos = stage.locator(".region-photo-selector button");
    const firstName = (await photos.nth(0).innerText()).trim();
    // Target the second exact asset, leaving the adjacent album's source untouched.
    await photos.nth(1).click();
    const failedUrl = (await stage.locator(".region-featured-card .region-scene-photo img").getAttribute("src"))!;
    await page.route(failedUrl, route => route.abort());
    await page.reload(); await storyReady(page); await stage.scrollIntoViewIfNeeded();
    await stage.locator(".region-photo-selector button").nth(1).click();
    await expect(stage.locator(".region-featured-card .region-scene-photo figcaption")).toContainText(locale === "en" ? "Photo unavailable" : "불러오지 못했어요");
    await stage.locator(".region-photo-selector button").nth(0).press("Enter");
    await expect(stage.locator(".region-photo-selector button").nth(0)).toHaveAccessibleName(firstName);
    await expect(stage.locator(".region-featured-card .region-scene-photo img")).toBeVisible();
    await expect(stage.locator(".region-featured-card .region-scene-photo figcaption")).not.toContainText(locale === "en" ? "Photo unavailable" : "불러오지 못했어요");
    await stage.getByRole("button", { name: locale === "en" ? "Next region" : "다음 지역", exact: true }).press("Enter");
    await expect(stage).toHaveAttribute("data-active-region", "하동");
    await expect(stage.locator(".region-featured-card .region-scene-photo img")).toBeVisible();
  });
}
