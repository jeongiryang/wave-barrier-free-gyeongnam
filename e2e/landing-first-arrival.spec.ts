import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

// Literal expectations from the visually reviewed eab2442 Production recording.
// Never derive expected dates, IDs, ranks or dimensions from the component.
const finalRecordedTrip = {
  sessionId: "production-eab2442-20260909-064600",
  day1: "2026-09-09",
  day2: "2026-09-10",
  displayedDates: {
    ko: { day1: "9월 9일", day2: "9월 10일" },
    en: { day1: "September 9", day2: "September 10" },
  },
  dimensions: {
    "timeline-before-itinerary": [441, 703],
    "timeline-before-map": [948, 1253],
    "timeline-after-day1-itinerary": [441, 400],
    "timeline-after-day1-map": [948, 1254],
    "timeline-after-day2-itinerary": [442, 400],
    "timeline-after-day2-map": [948, 1254],
  },
} as const;

const recordedCases = {
  together: {
    index: 0, phase: "before", day: "day1",
    ids: ["126117", "2758443"], names: ["주남저수지 철새도래지", "대산플라워랜드"],
    englishNames: ["Junam Reservoir", "Daesan Flowerland"], ranks: ["1", "2"],
    itinerary: "timeline-before-itinerary", map: "timeline-before-map",
  },
  day1: {
    index: 1, phase: "after", day: "day1",
    ids: ["126117"], names: ["주남저수지 철새도래지"], englishNames: ["Junam Reservoir"], ranks: ["1"],
    itinerary: "timeline-after-day1-itinerary", map: "timeline-after-day1-map",
  },
  day2: {
    index: 2, phase: "after", day: "day2",
    ids: ["2758443"], names: ["대산플라워랜드"], englishNames: ["Daesan Flowerland"], ranks: ["1"],
    itinerary: "timeline-after-day2-itinerary", map: "timeline-after-day2-map",
  },
} as const;

function requireFinalRecordedTrip() {
  expect(finalRecordedTrip.sessionId).not.toMatch(/PENDING/);
  expect(finalRecordedTrip.day1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(finalRecordedTrip.day2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(finalRecordedTrip.day2 > finalRecordedTrip.day1).toBe(true);
  for (const [width, height] of Object.values(finalRecordedTrip.dimensions)) {
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  }
}

function observeStoryRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (["/api/route", "/api/map-config"].includes(url.pathname)
      || (url.pathname === "/api/wave" && ["plan", "spot-photo", "crowd", "enrich"].includes(url.searchParams.get("action") || ""))
      || /(^|\.)(dapi\.kakao\.com|tile\.openstreetmap\.org)$/.test(url.hostname)) requests.push(url.origin + url.pathname);
  });
  return requests;
}

async function expectActualRecording(stage: Locator, name: keyof typeof finalRecordedTrip.dimensions) {
  const image = stage.locator(`#journey-stage-panel img[src$="/${name}.webp"]`);
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("lang", "ko");
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => [node.naturalWidth, node.naturalHeight])).toEqual([...finalRecordedTrip.dimensions[name]]);
  await expect(stage.locator("#journey-stage-panel > .journey-capture-frame img")).toHaveCount(1);
}

async function expectRecordedIdentity(stage: Locator, key: keyof typeof recordedCases, scene: "itinerary" | "map", locale: "ko" | "en" = "ko") {
  const record = recordedCases[key];
  const list = stage.locator("ol.journey-scene-stops");
  await expect(list).toHaveAttribute("data-recording", finalRecordedTrip.sessionId);
  await expect(list).toHaveAttribute("data-date", finalRecordedTrip[record.day]);
  await expect(list).toHaveAttribute("data-phase", record.phase);
  await expect(list.locator("strong")).toHaveText([...record[locale === "en" ? "englishNames" : "names"]]);
  await expect(list.locator("li > b")).toHaveText([...record.ranks]);
  expect(await list.locator("li").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-place-id")))).toEqual([...record.ids]);
  if (scene === "map") {
    expect(await list.locator("li").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-map-place-id")))).toEqual([...record.ids]);
    await expect(stage.locator("svg, canvas, .leaflet-container")).toHaveCount(0);
  }
  const choices = recordedDateControls(stage, locale);
  await expect(choices.getByRole("button")).toHaveCount(3);
  await expect(choices.getByRole("button").nth(record.index)).toHaveAttribute("aria-pressed", "true");
  await expect(choices.locator('[aria-pressed="true"]')).toHaveCount(1);
  const title = stage.locator("#journey-stage-title");
  await expect(title).toHaveAttribute("aria-live", "polite");
  await expect(title).toHaveAttribute("aria-atomic", "true");
  await expect(title).toContainText(finalRecordedTrip.displayedDates[locale][record.day]);
  for (const name of record[locale === "en" ? "englishNames" : "names"]) await expect(title).toContainText(name);
  await expect(stage.locator("#journey-stage-panel")).toHaveAttribute("aria-labelledby", "journey-stage-title");
}

async function chooseRecordedState(page: Page, stage: Locator, key: keyof typeof recordedCases, input: "pointer" | "Space" | "Enter", locale: "ko" | "en" = "ko") {
  const button = recordedDateControls(stage, locale).getByRole("button").nth(recordedCases[key].index);
  const originalButton = await button.elementHandle();
  expect(originalButton).not.toBeNull();
  await expect(button).toHaveAttribute("aria-controls", "journey-stage-panel");
  if (input === "pointer") await button.click();
  else { await button.focus(); await page.keyboard.press(input); }
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  expect(await originalButton!.evaluate(node => node.isConnected)).toBe(true);
  expect(await button.evaluate((node, original) => node === original, originalButton!)).toBe(true);
  await button.scrollIntoViewIfNeeded();
  expect(await button.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return rect.height >= 44 && node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
  await originalButton!.dispose();
}

function recordedDateControls(stage: Locator, locale: "ko" | "en" = "ko") {
  return stage.getByRole("group", {
    name: locale === "en" ? "Choose a dated state from the same recording" : "같은 시연의 날짜별 기록 선택",
    exact: true,
  });
}

async function expectRecordedPanelSettled(stage: Locator) {
  // The mobile copy above the figure can be exiting while the new panel enters.
  // Observe both real transitions ending before axe; keep motion and full scope.
  await expect.poll(() => stage.locator("#journey-stage-panel")
    .evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await expect.poll(() => stage.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await expect.poll(() => stage.evaluate(node => {
    const scene = node.closest(".journey-scene")!;
    return [...scene.querySelectorAll("[data-land-reveal]")].every(reveal =>
      reveal.getAnimations().every(animation => animation.playState !== "running" && !animation.pending));
  })).toBe(true);
}


test.use({ video: "on" });

// Recorded product scenes begin after arrival; the intro cases below explicitly start a fresh arrival.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

for (const seenBefore of [false, true]) {
  test(`normal arrival is visibly painted and usable with prior legacy session marker ${seenBefore}`, async ({ page }) => {
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
    const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
    const canvas = intro.locator(".arrival-wave-canvas");
    const planning = intro.getByRole("button", { name: "소개로 건너뛰기" });
    await expect(planning).toBeVisible();
    await expect(planning).toBeEnabled();
    await expect(intro).toBeVisible();
    await expect(canvas).toHaveAttribute("data-intro-phase", "wordmark");
    expect(await page.evaluate(() => (window as unknown as { arrivalPhases: string[] }).arrivalPhases)).toEqual(["wave", "accessibility", "wordmark"]);
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
    await expect(canvas).toBeHidden();
    await expect(intro.getByRole("heading", { name: "W.A.V.E" })).toBeVisible();
    await expect(planning).toBeFocused();
    await page.screenshot({ path: test.info().outputPath("first-arrival-static.png") });
    await page.keyboard.press("Escape");
    await expect(intro).toBeHidden();
    await expect(page.locator("#landing-title")).toBeFocused();
  });
}

test("the expansion follows forward and reverse scroll while reduced motion stays complete", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const scene = page.locator(".story-expansion");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  const progress: number[] = [];
  for (const offset of [.95, .625, .3, .625, .95]) {
    await scene.evaluate((node, offset) => scrollTo({ top: scrollY + node.getBoundingClientRect().top - innerHeight * offset, behavior: "instant" }), offset);
    await expect.poll(() => scene.evaluate((node) => Number(getComputedStyle(node).getPropertyValue("--scene-open")))).toBeCloseTo(Math.max(0, Math.min(1, (.95 - offset) / .65)), 1);
    progress.push(await scene.evaluate((node) => Number(getComputedStyle(node).getPropertyValue("--scene-open"))));
    await page.screenshot({ path: test.info().outputPath(`expansion-${offset}-${progress.length}.png`) });
  }
  expect(progress[1]).toBeGreaterThan(progress[0]);
  expect(progress[2]).toBeGreaterThan(progress[1]);
  expect(progress[3]).toBeCloseTo(progress[1], 1);
  expect(progress[4]).toBeCloseTo(progress[0], 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => scene.evaluate((node) => Number(getComputedStyle(node).getPropertyValue("--scene-open")))).toBe(1);
  await expect(scene.getByRole("link", { name: "내 여행 시작하기" })).toBeVisible();
});

test("the Korean story preserves real place identity, shared recorded dates and keyboard focus", async ({ page }) => {
  requireFinalRecordedTrip();
  await mockPublicShellApi(page);
  const planningRequests = observeStoryRequests(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toHaveCount(1);
  const stage = page.locator(".journey-stage");
  const controls = stage.getByRole("group", { name: "여행 계획 소개 단계 선택" });
  await expect(controls.getByRole("button")).toHaveText(["1편의와 추천", "2날짜와 일정", "3지도와 이동", "4출발 전 확인"]);
  const names = ["주남저수지 철새도래지", "대산플라워랜드"];
  const ids = ["126117", "2758443"];

  // Preserve the original four-stage, full-trip and real-evidence checks.
  for (const index of [0, 1, 2, 3, 1, 2]) {
    const control = controls.getByRole("button").nth(index);
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(controls.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(stage.locator("#journey-stage-panel")).toHaveAttribute("aria-labelledby", "journey-stage-title");
    const sameTrip = stage.locator("ol.journey-scene-stops");
    await expect(sameTrip.locator("strong")).toHaveText(names);
    expect(await sameTrip.locator("li").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-place-id")))).toEqual(ids);

    if (index === 0) {
      await expect(stage).toContainText("접근로와 승강기");
      await expect(stage.locator('img[src$="/places-two.webp"]')).toBeVisible();
      await expect.poll(() => stage.locator('img[src$="/places-two.webp"]').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(833);
      await stage.locator("summary").filter({ hasText: "선택한 편의와 대산플라워랜드 근거 보기" }).click();
      const evidence = stage.locator('[data-place-evidence="2758443"]');
      await expect(evidence).toContainText("확인 2");
      await expect(evidence).toContainText("미확인 1");
      await expect(evidence).toContainText("승강기 정보가 없어");
      await expect(stage).toContainText("인증하거나 보장하지 않아요");
    }
    if (index === 1 || index === 2) {
      const scene = index === 1 ? "itinerary" : "map";
      await expectRecordedIdentity(stage, "together", scene);
      await expectActualRecording(stage, recordedCases.together[scene]);
    }
    if (index === 2) {
      await expect(stage).toContainText("실제 길찾기 결과가 아니에요");
      await expect(stage.locator("svg")).toHaveCount(0);
    }
    if (index === 3) {
      await expect(stage).toContainText("직선거리 추정");
      await expect(stage).toContainText("승강기 미확인");
      await expect(stage).toContainText("최신 예보 확인");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await stage.screenshot({ path: test.info().outputPath(`journey-stage-${index}.png`) });
  }

  const dateStage = controls.getByRole("button").nth(1);
  const mapStage = controls.getByRole("button").nth(2);
  await dateStage.click();
  const choices = recordedDateControls(stage);
  await expect(choices.getByRole("button")).toHaveText(["옮기기 전 · 첫날 두 곳", "옮긴 뒤 · 첫날 주남", "옮긴 뒤 · 둘째 날 대산"]);
  await choices.getByRole("button").nth(0).focus();
  await page.keyboard.press("Tab");
  await expect(choices.getByRole("button").nth(1)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(choices.getByRole("button").nth(2)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(choices.getByRole("button").nth(1)).toBeFocused();

  // Explicit expected cases are independent of runtime component data. DAY1
  // before/after and Daesan rank1 catch mismatched images and stale global ranks.
  for (const [key, input] of [["together", "pointer"], ["day2", "Space"], ["day1", "Enter"], ["together", "pointer"]] as const) {
    await chooseRecordedState(page, stage, key, input);
    await expectRecordedIdentity(stage, key, "itinerary");
    await expectActualRecording(stage, recordedCases[key].itinerary);
    const originalChoices = await choices.elementHandle();
    await mapStage.focus();
    await page.keyboard.press("Enter");
    await expect(mapStage).toBeFocused();
    expect(await originalChoices!.evaluate(node => node.isConnected)).toBe(true);
    expect(await choices.evaluate((node, original) => node === original, originalChoices!)).toBe(true);
    await expectRecordedIdentity(stage, key, "map");
    await expectActualRecording(stage, recordedCases[key].map);
    await expect(stage).toContainText("직선거리 추정");
    await stage.screenshot({ path: test.info().outputPath(`recorded-${key}-map.png`) });
    if (key === "day2") {
      await expectRecordedPanelSettled(stage);
      expect((await new AxeBuilder({ page }).include(".journey-scene").analyze()).violations).toEqual([]);
    }
    await dateStage.click();
    await expectRecordedIdentity(stage, key, "itinerary");
    await expectActualRecording(stage, recordedCases[key].itinerary);
    await originalChoices!.dispose();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }

  // Change the recording from the MAP stage in reduced motion too, then prove
  // the selected date/image survives the return to the itinerary stage.
  await mapStage.click();
  await mapStage.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mapStage).toBeFocused();
  await expect.poll(() => stage.locator(".journey-stage-board").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await chooseRecordedState(page, stage, "day2", "Enter");
  await expectRecordedIdentity(stage, "day2", "map");
  await expectActualRecording(stage, recordedCases.day2.map);
  await dateStage.click();
  await expectRecordedIdentity(stage, "day2", "itinerary");
  await expectActualRecording(stage, recordedCases.day2.itinerary);
  await expect(page.locator('.journey-scene-copy a[href="/planner?region=%EC%B0%BD%EC%9B%90"]')).toBeVisible();
  expect(planningRequests).toEqual([]);
  expect(errors).toEqual([]);
});


for (const locale of ["ko", "en"] as const) {
  test(`${locale}: a failed recorded screen preserves its space, place names and planning link`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockPublicShellApi(page);
    await page.addInitScript(language => localStorage.setItem("wave-locale", language), locale);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/media/wave-journey/*.webp", async route => { await pending; await route.abort(); });
    await page.goto("/");
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    const stage = page.locator(".journey-stage");
    const frame = stage.locator(".journey-stage-board > .journey-capture-frame");
    await frame.scrollIntoViewIfNeeded();
    const before = await frame.boundingBox();
    expect(before?.height).toBeGreaterThan(100);
    release();
    await expect(frame.getByRole("status")).toContainText(locale === "en" ? "could not load" : "불러오지 못했어요");
    const after = await frame.boundingBox();
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
    await expect(stage.locator(".journey-scene-stops strong")).toHaveText(locale === "en" ? ["Junam Reservoir", "Daesan Flowerland"] : ["주남저수지 철새도래지", "대산플라워랜드"]);
    await expect(stage.locator(".journey-capture-frame").first().getByRole("img")).toHaveCount(0);
    const planning = page.locator(".journey-scene-copy > a");
    await planning.focus();
    await expect(planning).toBeFocused();
    await expect(planning).toHaveAttribute("href", "/planner?region=%EC%B0%BD%EC%9B%90");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: a failed day map cannot leak its image state into another recorded day`, async ({ page }) => {
    requireFinalRecordedTrip();
    await mockPublicShellApi(page);
    await page.addInitScript(language => localStorage.setItem("wave-locale", language), locale);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const planningRequests = observeStoryRequests(page);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/media/wave-journey/timeline-after-day1-map.webp", async route => { await pending; await route.abort(); });
    try {
      await page.goto("/");
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
      const stage = page.locator(".journey-stage");
      await stage.locator(".journey-stage-controls button").nth(2).click();
      await expectActualRecording(stage, recordedCases.together.map);
      await chooseRecordedState(page, stage, "day1", "Enter", locale);
      await expectRecordedIdentity(stage, "day1", "map", locale);
      const frame = stage.locator("#journey-stage-panel > .journey-capture-frame");
      await frame.scrollIntoViewIfNeeded();
      const before = await frame.boundingBox();
      expect(before?.height).toBeGreaterThan(100);
      release();
      await expect(frame.getByRole("status")).toContainText(locale === "en" ? "could not load" : "불러오지 못했어요");
      const after = await frame.boundingBox();
      expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
      await expect(frame.locator("img")).toHaveCount(0);
      await expectRecordedIdentity(stage, "day1", "map", locale);

      await chooseRecordedState(page, stage, "day2", "pointer", locale);
      await expectRecordedIdentity(stage, "day2", "map", locale);
      await expectActualRecording(stage, recordedCases.day2.map);
      await expect(frame.getByRole("status")).toHaveCount(0);
      await expectRecordedPanelSettled(stage);
      expect((await new AxeBuilder({ page }).include(".journey-scene").analyze()).violations).toEqual([]);

      await chooseRecordedState(page, stage, "day1", "Space", locale);
      await expectRecordedIdentity(stage, "day1", "map", locale);
      await expect(frame.getByRole("status")).toContainText(locale === "en" ? "could not load" : "불러오지 못했어요");
      await expect(frame.locator("img")).toHaveCount(0);
      await expect(stage.locator('img[src$="/timeline-after-day2-map.webp"]')).toHaveCount(0);
      await stage.screenshot({ path: test.info().outputPath(`recorded-map-failure-${locale}.png`) });
      const planning = page.locator(".journey-scene-copy > a");
      await planning.focus();
      await expect(planning).toBeFocused();
      await expect(planning).toHaveAttribute("href", "/planner?region=%EC%B0%BD%EC%9B%90");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect(planningRequests).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      release();
    }
  });
}
