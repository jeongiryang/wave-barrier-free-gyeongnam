import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

const place = {
  id: "evidence-place", contentTypeId: "14", city: "창원", name: "검증용 관광지", address: "경상남도 창원시",
  summary: "공식 원문 설명", image: "", mapX: "128.691", mapY: "35.238", score: 33,
  knownFields: 2, unknownFields: 1, negativeFields: 1, checkedAt: "2026-09-06T00:00:00Z",
  accessibility: [
    { key: "route", label: "접근로", state: "confirmed", detail: "주출입구까지 평탄한 접근로" },
    { key: "elevator", label: "엘리베이터", state: "negative", detail: "승강기 없음" },
    { key: "restroom", label: "화장실", state: "unknown", detail: "" },
  ], features: ["접근로"], details: [], source: "무장애 여행정보 · 국문 관광정보",
};

async function prepare(page: Page, locale: "ko" | "en" = "en") {
  await mockPlannerApi(page, { plannerView: "overview" });
  await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    mode: "live", generatedAt: place.checkedAt, places: [place], stops: [], statuses: [],
  } }));
  await page.goto("/planner");
  if (locale === "ko") await chooseTripConditions(page);
  else {
    await expect(page.getByRole("button", { name: "Overview", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Changwon", exact: true }).click();
    await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
    await page.getByRole("button", { name: /Nature and relaxation/ }).click();
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
  }
  const trigger = page.locator("#places").getByRole("button", { name: locale === "en" ? "View facilities" : "편의시설 보기", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toBeFocused();
  return trigger;
}

for (const theme of ["light", "dark"] as const) {
  test(`English facility evidence preserves original records and keyboard actions in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const trigger = await prepare(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Visitor stories are not translated");
    await expect(dialog.getByRole("group", { name: "Official information coverage" })).toHaveText(/Reported available 1Not reported 1Reported unavailable 1/);
    await expect(dialog.locator('.facility-evidence-list [data-state="confirmed"]')).toHaveText("Access pathReported available주출입구까지 평탄한 접근로");
    await expect(dialog.locator('.facility-evidence-list [data-state="negative"]')).toHaveText("ElevatorReported unavailable승강기 없음");
    await expect(dialog.locator('.facility-evidence-list [data-state="unknown"]')).toContainText("ToiletsNot reportedNo information supplied");
    await expect(dialog.locator('.facility-evidence-list [data-state="confirmed"] dd')).toHaveAttribute("lang", "ko");
    await dialog.getByText("Source, retrieval time and method", { exact: true }).click();
    await expect(dialog.locator(".place-evidence")).toContainText(place.source);
    await expect(dialog.locator(".place-evidence")).toContainText("Retrieval time is not the provider's facility update date");
    await expect(dialog.locator(".place-community-empty")).toContainText("There are no public visitor stories");
    await expect(dialog.locator(".place-community-stories")).not.toContainText(/[가-힣]/);
    await expect(dialog.getByRole("link", { name: /Visitor reviews and photos/ })).toHaveAttribute("target", "_blank");
    await expect(dialog.getByRole("link", { name: /Write a field report/ })).toHaveAttribute("href", /placeId=evidence-place/);
    await expect(dialog.getByRole("button", { name: "Report a correction" })).toBeDisabled();
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`evidence-${theme}.png`) });
    await dialog.getByRole("textbox").scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`participation-${theme}.png`) });
    await dialog.getByRole("button", { name: "Close", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("textbox")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

for (const locale of ["ko", "en"] as const) {
  for (const failure of ["http", "invalid"] as const) {
    test(`${locale} visitor stories distinguish ${failure} failure from empty and retry without losing focus`, async ({ page }) => {
      let calls = 0;
      let release!: () => void;
      const pending = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**/api/community/posts?*", async (route) => {
        if (!new URL(route.request().url()).searchParams.has("placeId")) return route.fulfill({ json: { posts: [] } });
        calls++;
        if (calls === 1) return route.fulfill(failure === "http" ? { status: 503, json: { error: "Unavailable" } } : { json: { error: "Invalid response" } });
        await pending;
        return route.fulfill({ json: { posts: [] } });
      });
      await prepare(page, locale);
      const stories = page.locator(".place-community-stories");
      await expect(stories.getByRole("status")).toContainText(locale === "en" ? "We couldn't load visitor stories" : "현장 후기를 불러오지 못했습니다");
      await expect(stories.locator(".place-community-empty")).toHaveCount(0);
      const retry = stories.getByRole("button", { name: locale === "en" ? "Reload visitor stories" : "현장 후기 다시 확인" });
      await retry.focus();
      await page.keyboard.press("Enter");
      try {
        await expect(stories.getByRole("status")).toContainText(locale === "en" ? "Loading visitor stories" : "확인하고 있어요");
        await expect(retry).toBeFocused();
        await page.keyboard.press("Enter");
        expect(calls).toBe(2);
      } finally { release(); }
      await expect(stories.locator(".place-community-empty")).toBeVisible();
      await expect(retry).toBeFocused();
      expect(calls).toBe(2);
    });
  }
}

test("English visitor stories and feedback stay separate from official evidence", async ({ page }) => {
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [{
    id: "story", title: "방문자가 적은 글", authorName: "여행자", visitDate: null, fieldReports: [{ field: "entrance", status: "changed", note: "" }], commentCount: 2,
  }] } }));
  let submissions = 0;
  await page.route("**/api/feedback", async (route) => {
    submissions++;
    expect(route.request().postDataJSON()).toEqual({ placeId: place.id, placeName: place.name, field: "접근성 정보", message: "The elevator has changed." });
    await route.fulfill(submissions === 1 ? { status: 503, json: { error: "Unavailable" } } : { json: { ok: true } });
  });
  await prepare(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".place-community-story-list strong")).toHaveAttribute("lang", "ko");
  await expect(dialog.locator(".place-community-story-list")).toContainText("Visit date not supplied");
  await expect(dialog.locator(".place-community-stories")).toContainText("excluded from official scores");
  const text = dialog.getByRole("textbox", { name: "Has the facility information changed?" });
  await text.fill("The elevator has changed.");
  await dialog.getByRole("button", { name: "Report a correction" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Your text is kept");
  await expect(text).toHaveValue("The elevator has changed.");
  await dialog.getByRole("button", { name: "Report a correction" }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "Your report was received" })).toBeVisible();
  await expect(dialog.locator('.facility-evidence-list [data-state="negative"]')).toContainText("Reported unavailable승강기 없음");
  expect(submissions).toBe(2);
});

test("a failed visitor story module leaves facility evidence and a community alternative usable", async ({ page }) => {
  await page.route("**/features/planner/components/PlaceCommunityStories.tsx*", (route) => route.abort("failed"));
  const trigger = await prepare(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status").filter({ hasText: "Visitor stories couldn't open here" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Open community", exact: true })).toHaveAttribute("href", /placeId=evidence-place/);
  await expect(dialog.locator(".facility-evidence-list")).toContainText("Access pathReported available");
  await expect(dialog.getByRole("button", { name: "Add to itinerary", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
