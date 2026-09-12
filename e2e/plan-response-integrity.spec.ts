import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const invalid of ["invalid-json", "missing-fields", "damaged-place"] as const) for (const en of [false, true]) {
  test(`${en ? "EN dark" : "KO light"} ${invalid}: a malformed successful response keeps the previous itinerary usable`, async ({ page }, testInfo) => {
    await mockPlannerApi(page);
    await page.addInitScript(en => localStorage.setItem("wave-theme", en ? "dark" : "light"), en);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    await expect(page.locator(".travel-book-archive-controls button")).toBeEnabled();
    if (en) {
      await page.keyboard.press("Control+Home");
      await openSupportMenu(page);
      const preferences = page.locator(".preference-controls:visible");
      await openSupportMenu(page);
      await preferences.getByLabel("환경설정 열기", { exact: true }).click();
      await preferences.getByLabel("언어", { exact: true }).selectOption("en");
      await openSupportMenu(page);
      await preferences.getByLabel("Open preferences", { exact: true }).click();
      await page.locator(".condition-actions").getByRole("button", { name: "Find places →", exact: true }).click();
      await expect(page.getByRole("button", { name: "용지호수공원 Add to itinerary", exact: true })).toBeEnabled();
    }
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let attempts = 0;
    await page.route("**/api/wave?*", route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
      attempts++;
      if (attempts > 1) return route.fallback();
      return route.fulfill({ status: 200, contentType: "application/json", body: invalid === "invalid-json" ? "not-json" : invalid === "missing-fields" ? "{}" : JSON.stringify({ ...plan, places: [null] }) });
    });
    await page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 찾기 →", exact: true }).click();
    await expect(page.locator(".result-notice.error")).toBeVisible();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 Add to itinerary" : "용지호수공원 일정에 추가", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: en ? "경남도립미술관 Remove from itinerary" : "경남도립미술관 일정에서 빼기", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    expect(errors).toEqual([]);
    expect((await new AxeBuilder({ page }).include("#places").analyze()).violations).toEqual([]);
    expect(attempts).toBe(1);
    if (testInfo.project.name === "desktop-chromium" && invalid === "missing-fields") {
      await page.setViewportSize({ width: en ? 1440 : 960, height: 960 });
      await page.locator(".result-notice.error").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("plan-integrity.png") });
    }
    await page.getByRole("button", { name: en ? "Try again" : "다시 시도", exact: true }).click();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 Add to itinerary" : "용지호수공원 일정에 추가", exact: true })).toBeEnabled();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  });
}

test("search validation has no additional deferred module request", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle").getByRole("button", { name: "전체 보기", exact: true })).toBeEnabled();
  let modules = 0;
  await page.route("**/features/planner/services/plan-response.ts*", route => {
    modules++;
    return route.abort("failed");
  });
  await chooseTripConditions(page);
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true })).toBeEnabled();
  expect(modules).toBe(0);
});

test("a failed photo module keeps facility evidence, place actions and visitor details available", async ({ page }) => {
  await mockPlannerApi(page);
  let modules = 0;
  await page.route("**/features/tourism/components/SmartSpotImage.tsx*", route => {
    modules++;
    return route.abort("failed");
  });
  await page.goto("/planner");
  expect(modules).toBe(0);
  await chooseTripConditions(page);
  const card = page.locator(".place-card").filter({ has: page.getByRole("heading", { name: "경남도립미술관", exact: true }) });
  const add = page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true });
  await expect(add).toBeEnabled();
  await expect.poll(() => modules).toBe(1);
  await expect(card.getByRole("status")).toBeVisible();
  await expect(card.locator(".place-facilities")).toBeVisible();
  await add.click();
  await card.locator(".place-actions button").last().click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await expect(page.locator("dialog[open]")).toContainText("경남도립미술관");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에서 빼기", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).include("#places").analyze()).violations).toEqual([]);
});
