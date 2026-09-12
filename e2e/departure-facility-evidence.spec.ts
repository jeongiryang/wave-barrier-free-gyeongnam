import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const scenario of ["complete", "partial", "negative", "legacy"] as const) for (const en of [false, true]) test(`${scenario} ${en ? "EN dark" : "KO light"}: departure facilities require current item-level evidence`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(color => localStorage.setItem("wave-theme", color), en ? "dark" : "light");
  const fields = ["parking", "route", "wheelchair", "elevator", "restroom"].map((key, index) => ({
    key, label: key, detail: "Official facility record",
    state: scenario !== "complete" && index === 3 ? "unknown" : scenario === "negative" && index === 4 ? "negative" : "confirmed",
  }));
  let searches = 0;
  let omitSavedPlace = false;
  await page.route("**/api/wave?*", route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("action") !== "plan") return route.fallback();
    searches++;
    const facilityKeys = [...fields.map(field => field.key), ...(params.get("profiles")?.split(",").includes("baby") ? ["stroller", "lactationroom", "babysparechair"] : [])];
    return route.fulfill({ json: { ...plan, criteria: { facilityKeys }, places: plan.places.filter(place => !omitSavedPlace || place.id !== "1001").map(place => ({ ...place, score: 100, knownFields: 5, accessibility: scenario === "legacy" ? undefined : fields })) } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  if (en) {
    await page.keyboard.press("Control+Home");
    await openSupportMenu(page);
    const preferences = page.locator(".preference-controls:visible");
    await openSupportMenu(page);
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await openSupportMenu(page);
    await preferences.getByLabel("Open preferences", { exact: true }).click();
    // Changing locale changes the recommendation contract: explicitly search again.
    await page.locator(".condition-actions").getByRole("button", { name: "Find places →", exact: true }).click();
  }
  const card = page.locator(".departure-readiness");
  const evidence = card.locator("article").filter({ has: page.getByText(en ? "Place accessibility evidence" : "장소 편의근거", { exact: true }) });
  await expect(evidence).toHaveClass(scenario === "complete" ? "confirmed" : scenario === "partial" ? "partial" : "recheck");
  if (scenario !== "legacy") {
    const confirmed = scenario === "complete" ? 5 : scenario === "partial" ? 4 : 3;
    await expect(evidence).toContainText(en ? `Reported available ${confirmed}` : `확인됨 ${confirmed}`);
    await expect(evidence).toContainText(en ? `Unknown ${scenario === "complete" ? 0 : 1}` : `미확인 ${scenario === "complete" ? 0 : 1}`);
    await expect(evidence).toContainText(en ? `Reported unavailable ${scenario === "negative" ? 1 : 0}` : `미제공 기록 ${scenario === "negative" ? 1 : 0}`);
  }
  await card.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include(".departure-readiness").analyze()).violations).toEqual([]);
  if (scenario === "negative" && test.info().project.name === "desktop-chromium") for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.screenshot({ path: test.info().outputPath(`facilities-${en ? "en-dark" : "ko-light"}-${width}.png`) });
  }
  if (scenario === "complete") {
    const before = searches;
    await page.getByRole("button", { name: en ? /Facilities for young children/ : /유아 편의시설/ }).click();
    await expect(evidence).toHaveClass("recheck");
    expect(searches).toBe(before);
    const search = page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 찾기 →", exact: true });
    await search.click();
    await expect(evidence).toHaveClass("partial");
    await expect(evidence).toContainText(en ? "Reported available 5" : "확인됨 5");
    await expect(evidence).toContainText(en ? "Unknown 3" : "미확인 3");
    omitSavedPlace = true;
    await search.click();
    await expect(evidence).toHaveClass("recheck");
    expect(searches).toBe(before + 2);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    await page.reload();
    await expect(evidence).toHaveClass("recheck");
    expect(searches).toBe(before + 2);
  }
});
