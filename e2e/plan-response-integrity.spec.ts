import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const invalid of ["invalid-json", "missing-fields"] as const) {
  test(`${invalid}: a malformed successful response keeps the previous itinerary usable`, async ({ page }) => {
    await mockPlannerApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    await expect(page.locator(".travel-book-archive-controls button")).toBeEnabled();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let attempts = 0;
    await page.route("**/api/wave?*", route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
      attempts++;
      if (attempts > 1) return route.fallback();
      return route.fulfill({ status: 200, contentType: "application/json", body: invalid === "invalid-json" ? "not-json" : "{}" });
    });
    await page.locator(".condition-actions").getByRole("button", { name: "여행지 찾기 →", exact: true }).click();
    await expect(page.locator(".result-notice.error")).toBeVisible();
    await expect(page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "경남도립미술관 일정에서 빼기", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    expect(errors).toEqual([]);
    expect((await new AxeBuilder({ page }).include("#places").analyze()).violations).toEqual([]);
    expect(attempts).toBe(1);
    await page.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true })).toBeEnabled();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  });
}
