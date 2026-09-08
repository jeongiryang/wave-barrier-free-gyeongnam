import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.use({ video: "on" });

for (const seenBefore of [false, true]) {
  test(`normal arrival is visibly painted and usable with prior session marker ${seenBefore}`, async ({ page }) => {
    await mockPublicShellApi(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript((seen) => {
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
    const canvas = page.locator(".hero-arrival canvas");
    const planning = page.locator(".landing-actions a");
    await expect(planning).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(canvas).toHaveAttribute("data-intro-phase", "wordmark");
    expect(await page.evaluate(() => (window as unknown as { arrivalPhases: string[] }).arrivalPhases)).toEqual(["wave", "accessibility", "wordmark"]);
    await canvas.scrollIntoViewIfNeeded();
    expect(await canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 200 && rect.height >= 180 && style.opacity === "1" && style.maskImage === "none"
        && document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === node;
    })).toBe(true);
    await page.locator(".hero-opening").screenshot({ path: test.info().outputPath("first-arrival-wordmark.png") });
    await planning.focus();
    await expect(planning).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(canvas).toBeHidden();
    await expect(page.locator(".hero-arrival-still")).toContainText("W.A.V.E");
    await expect(planning).toBeFocused();
    await page.locator(".hero-opening").screenshot({ path: test.info().outputPath("first-arrival-static.png") });
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

test("the Korean story preserves real place identity, recorded dates and keyboard focus", async ({ page }) => {
  await mockPublicShellApi(page);
  const planningRequests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/route" || (url.pathname === "/api/wave" && ["plan", "spot-photo", "crowd", "enrich"].includes(url.searchParams.get("action") || ""))) planningRequests.push(url.pathname);
  });
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toHaveCount(1);
  const stage = page.locator(".journey-stage");
  const controls = stage.getByRole("group", { name: "여행 계획 소개 단계 선택" });
  await expect(controls.getByRole("button")).toHaveText(["1편의와 추천", "2날짜와 일정", "3지도와 이동", "4출발 전 확인"]);
  const names = ["주남저수지 철새도래지", "대산플라워랜드"];
  const ids = ["126117", "2758443"];

  for (const index of [0, 1, 2, 3, 1, 2]) {
    const control = controls.getByRole("button").nth(index);
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(controls.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(stage.locator("#journey-stage-panel")).toHaveAttribute("aria-labelledby", "journey-stage-title");
    const sameTrip = stage.locator('ol.journey-scene-stops[data-recording="map-0308"]');
    await expect(sameTrip).toHaveAttribute("data-date", "2026-09-09");
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
      const list = sameTrip;
      await expect(list).toHaveAttribute("data-date", "2026-09-09");
      await expect(list.locator("strong")).toHaveText(names);
      const attribute = index === 1 ? "data-place-id" : "data-map-place-id";
      expect(await list.locator("li").evaluateAll((nodes, attr) => nodes.map(node => node.getAttribute(attr)), attribute)).toEqual(ids);
    }
    if (index === 1) {
      await expect(stage.locator('img[src$="/map-matching-itinerary.webp"]')).toBeVisible();
      await stage.locator("summary").filter({ hasText: "날짜를 나눈 다른 실제 시연 보기" }).click();
      const choices = stage.getByRole("group", { name: "촬영된 날짜 배정 선택" });
      const recording = stage.locator("#journey-date-recording");
      for (const split of [false, true, false]) {
        const button = choices.getByRole("button").nth(split ? 1 : 0);
        await button.focus();
        await page.keyboard.press("Space");
        await expect(button).toBeFocused();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(recording).toHaveAttribute("data-recording", "journey-0229");
        await expect(recording).toHaveAttribute("data-split", String(split));
        await expect(recording.getByRole("status")).toHaveText(split ? "9월 9일 주남저수지 · 9월 10일 대산플라워랜드" : "9월 9일 대산플라워랜드 다음 주남저수지");
        await expect(recording.locator("img")).toHaveAttribute("src", new RegExp(`/date-${split ? "after" : "before"}\\.webp$`));
        await expect(stage.locator('ol[data-recording="map-0308"] strong')).toHaveText(names);
      }
    }
    if (index === 2) {
      await expect(stage.locator('img[src$="/map-two-desktop.webp"]')).toBeVisible();
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
  expect(planningRequests).toEqual([]);
  const current = controls.getByRole("button").nth(2);
  await current.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(current).toBeFocused();
  await expect.poll(() => stage.locator(".journey-stage-board").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.locator('.journey-scene-copy a[href="/planner?region=%EC%B0%BD%EC%9B%90"]')).toBeVisible();
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
