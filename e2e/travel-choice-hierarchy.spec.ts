import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const en of [false, true]) for (const theme of ["light", "dark"]) {
  test(`place choices keep evidence, primary action and keyboard order ${en ? "en" : "ko"} ${theme}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockPlannerApi(page, { plannerView: "overview" });
    await page.addInitScript(({ en, theme }) => {
      localStorage.setItem("wave-locale", en ? "en" : "ko");
      localStorage.setItem("wave-theme", theme);
    }, { en, theme });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const image = await readFile("public/media/wave-story/hero-coast-small.webp");
    await page.route("https://wave.test/museum.svg", route => route.fulfill({ contentType: "image/webp", body: image }));
    await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: image }));
    const evidence = [
      { key: "route", label: "접근로", state: "confirmed", detail: "공식 접근로 기록" },
      { key: "parking", label: "장애인 주차", state: "confirmed", detail: "공식 주차 기록" },
      { key: "wheelchair", label: "휠체어", state: "confirmed", detail: "공식 휠체어 기록" },
      { key: "stroller", label: "유아차", state: "confirmed", detail: "공식 유아차 기록" },
      { key: "restroom", label: "화장실", state: "unknown", detail: "" },
      { key: "elevator", label: "승강기", state: "negative", detail: "승강기 없음" },
    ];
    await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: {
      ...plan, places: [{ ...plan.places[0], accessibility: evidence, knownFields: 5, unknownFields: 1, negativeFields: 1 }, plan.places[1]],
      explorationPlaces: [{ ...plan.places[1], id: "unknown-place", score: null, confidence: 0 }],
    } }));
    await page.route("**/api/community/posts?*", route => route.fulfill({ json: { posts: [] } }));
    await page.goto("/planner");
    if (!en) await chooseTripConditions(page);
    else {
      await expect(page.getByRole("button", { name: "Overview", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Changwon", exact: true }).click();
      await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
      await page.getByRole("button", { name: /Nature and relaxation/ }).click();
      await page.getByRole("button", { name: "Find places →", exact: true }).click();
    }
    const card = page.locator(".place-card").first();
    await expect(card).toHaveAccessibleName("경남도립미술관");
    await expect(card.locator(".place-facilities li")).toHaveCount(3);
    await expect(card.locator(".facility-caution")).toContainText(en ? "Not reported 1" : "미확인 1개");
    await expect(card.locator(".facility-caution")).toContainText(en ? "Reported unavailable 1" : "조건 불일치 1개");
    await expect(card.locator(".place-visual em, .place-visual strong, .city-chip")).toHaveCount(0);
    await expect(card).not.toContainText(/\d+%/);
    const legacy = page.locator(".place-card").nth(1);
    await expect(legacy.locator(".place-facilities li")).toHaveCount(0);
    await expect(legacy.locator(".place-facilities")).toContainText(en ? "No facilities are confirmed at item level" : "항목별로 확인된 편의가 없습니다");
    const add = card.locator(".place-actions").getByRole("button").first();
    await expect(add).toHaveAccessibleName(`경남도립미술관 ${en ? "Add to itinerary" : "일정에 추가"}`);
    await expect(card.locator("h3")).toHaveAttribute("lang", "ko");
    await add.focus();
    await page.keyboard.press("Tab");
    const details = card.getByRole("button", { name: en ? "Visitor information" : "이용 정보", exact: true });
    await expect(details).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toBeFocused();
    await expect(page.getByRole("dialog").locator('.facility-evidence-list [data-state="confirmed"]')).toHaveCount(4);
    await page.keyboard.press("Escape");
    await expect(details).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(add).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(add).toHaveAttribute("aria-pressed", "true");
    const removeLabel = en ? "Remove from itinerary" : "일정에서 빼기";
    await expect(add).toHaveAccessibleName(`경남도립미술관 ${removeLabel}`);
    await expect(add).toContainText(removeLabel);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    await expect(page.locator('.journey-stage-panel[data-step="places"]')).toBeVisible();
    for (const button of await card.getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await card.scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({ page }).include(".place-carousel").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await card.screenshot({ path: test.info().outputPath(`card-${en ? "en" : "ko"}-${theme}.png`) });
    if (!en && theme === "light" && test.info().project.name === "desktop-chromium") {
      await page.setViewportSize({ width: 960, height: 960 });
      await card.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator('.journey-stage-panel[data-step="places"]').screenshot({ path: test.info().outputPath("choices-960.png") });
    }
    const exploration = page.locator(".exploration-places");
    await exploration.locator("summary").click();
    await expect(exploration.getByRole("button")).toHaveCount(1);
    await expect(exploration.getByRole("button")).toHaveText(en ? "View information" : "이용 정보 확인");
    await expect(exploration.locator("h3")).toHaveAttribute("lang", "ko");
    await add.click();
    await expect(add).toHaveAttribute("aria-pressed", "false");
    // Region changes intentionally clear results. A changed activity retains
    // previous results, which is the stale-card state this assertion exercises.
    await page.getByRole("button", { name: en ? /Nature and relaxation/ : /자연·휴양 공원/ }).click();
    await expect(card).toHaveAttribute("data-result-current", "false");
    await expect(add).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
