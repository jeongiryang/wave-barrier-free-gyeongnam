import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const invalid of ["invalid-json", "missing-fields", "damaged-place"] as const) for (const en of [false, true]) {
  test(`${en ? "EN dark" : "KO light"} ${invalid}: a malformed successful response keeps the previous itinerary usable`, async ({ page }, testInfo) => {
    await mockPlannerApi(page);
    await page.addInitScript(en => { localStorage.setItem("wave-theme", en ? "dark" : "light"); localStorage.setItem("wave-locale", en ? "en" : "ko"); }, en);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: `경남도립미술관 ${en ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let attempts = 0;
    await page.route("**/api/wave?*", route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
      attempts++;
      if (attempts > 1) return route.fallback();
      return route.fulfill({ status: 200, contentType: "application/json", body: invalid === "invalid-json" ? "not-json" : invalid === "missing-fields" ? "{}" : JSON.stringify({ ...plan, places: [null] }) });
    });
    await page.locator(".simple-activity-filter").getByRole("button", { name: "역사·문화", exact: true }).click();
    await expect(page.locator(".simple-result-notice")).toBeVisible();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 add to itinerary" : "용지호수공원 일정에 담기", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: en ? "경남도립미술관 added · remove from itinerary" : "경남도립미술관 담았음 · 일정에서 빼기", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => JSON.parse((JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"]) || "[]"))).toEqual(["1001"]);
    expect(errors).toEqual([]);
    expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
    expect(attempts).toBe(1);
    if (testInfo.project.name === "desktop-chromium" && invalid === "missing-fields") {
      await page.setViewportSize({ width: en ? 1440 : 960, height: 960 });
      await page.locator(".simple-result-notice").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("plan-integrity.png") });
    }
    await page.getByRole("button", { name: en ? "Retry with these preferences" : "같은 조건으로 다시 시도", exact: true }).click();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 add to itinerary" : "용지호수공원 일정에 담기", exact: true })).toBeEnabled();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => JSON.parse((JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"]) || "[]"))).toEqual(["1001"]);
  });
}

test("search validation has no additional deferred module request", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("combobox", { name: "여행 지역" })).toBeEnabled();
  let modules = 0;
  await page.route("**/features/planner/services/plan-response.ts*", route => {
    modules++;
    return route.abort("failed");
  });
  await chooseTripConditions(page);
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true })).toBeEnabled();
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
  const card = page.locator(".simple-place-row").filter({ has: page.getByRole("heading", { name: "경남도립미술관", exact: true }) });
  const add = page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true });
  await expect(add).toBeEnabled();
  await expect.poll(() => modules).toBe(1);
  await expect(card.getByRole("status")).toBeVisible();
  await expect(card).toContainText("경상남도 창원시");
  await add.click();
  await card.getByRole("button", { name: "경남도립미술관", exact: true }).click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await expect(page.locator("dialog[open]")).toContainText("경남도립미술관");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "경남도립미술관 담았음 · 일정에서 빼기", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse((JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"]) || "[]"))).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
});
