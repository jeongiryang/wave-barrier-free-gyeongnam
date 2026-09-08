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

test("the Korean story connects the same stops across dates, map and departure with keyboard control", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toHaveCount(1);
  const stage = page.locator(".journey-stage");
  const controls = stage.getByRole("group", { name: "여행 계획 소개 단계 선택" });
  const stops = stage.locator("ol [data-example-stop-id]");
  const identity = await stops.evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute("data-example-stop-id"), name: node.querySelector("strong")?.textContent })));
  expect(identity).toHaveLength(3);
  for (const index of [0, 1, 2, 3, 1, 2]) {
    const control = controls.getByRole("button").nth(index);
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    expect(await stops.evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute("data-example-stop-id"), name: node.querySelector("strong")?.textContent })))).toEqual(identity);
    if (index === 1) {
      await expect(stage.locator("td[data-selected=true]")).toHaveText("17");
      await expect(stops.first()).toContainText("10:00");
    }
    if (index === 2) {
      expect(await stage.locator("svg [data-example-stop-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-example-stop-id")))).toEqual(identity.map(stop => stop.id));
      await expect(stage).toContainText("실제 경로가 아니에요");
    }
    if (index === 3) await expect(stage).toContainText("세 장소 사이 모든 구간");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await stage.screenshot({ path: test.info().outputPath(`journey-stage-${index}.png`) });
  }
});
