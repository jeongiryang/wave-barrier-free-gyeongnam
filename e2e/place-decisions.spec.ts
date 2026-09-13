import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, plan } from "./fixtures";

const savedIds = (page: Page) => page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"] || "[]"));

async function prepare(page: Page) {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.route("**/api/community/posts?*", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/wave?*", route => {
    if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
    const places = Array.from({ length: 4 }, (_, i) => ({ ...plan.places[i % 2], id: String(1001 + i), name: ["경남도립미술관", "용지호수공원", "창원수목원", "해안공원"][i], accessibility: [
      { key: "parking", label: "장애인 주차", state: "confirmed", detail: "전용 주차 공간 있음" },
      ...(i === 0 ? [{ key: "restroom", label: "장애인 화장실", state: "unknown", detail: "" }] : []),
      ...(i === 2 ? [] : [{ key: "route", label: "접근로", state: i === 1 ? "negative" : "confirmed", detail: i === 1 ? "입구에 계단이 있음" : "계단 없는 입구" }]),
    ] }));
    return route.fulfill({ json: { ...plan, places, criteria: { facilityKeys: ["parking"] } } });
  });
  await page.goto("/planner");
  // Only parking is required. Other fields remain visible for comparison and
  // their negative/missing records must not become confirmed by a high score.
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.locator(".simple-facility-trigger").click();
  const facilities = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await facilities.getByRole("checkbox", { name: "장애인 주차구역", exact: true }).check();
  const searched = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan" && url.searchParams.get("facilityKeys") === "parking";
  });
  await facilities.getByRole("button", { name: /^적용/ }).click();
  await (await searched).finished();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-results > .simple-place-list article")).toHaveCount(4);
  await page.evaluate(() => document.fonts.ready);
}

test("comparison limits selection, distinguishes missing evidence, and keeps saved places on close", async ({ page, isMobile }) => {
  await prepare(page);
  await page.getByRole("button", { name: "편의 비교", exact: true }).click();
  const choice = page.locator(".simple-place-list").getByRole("checkbox", { name: "비교", exact: true });
  for (let i = 0; i < 3; i++) await choice.nth(i).check();
  await expect(choice.nth(3)).toBeDisabled();
  const open = page.getByRole("button", { name: "선택한 3곳 비교", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "편의를 나란히 살펴보세요." });
  await expect(dialog.getByRole("heading")).toBeFocused();
  const route = dialog.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "접근로", exact: true }) });
  await expect(route.locator("td strong")).toHaveText(["확인됨", "조건과 맞지 않음", "미확인"]);
  await expect(dialog.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "장애인 화장실", exact: true }) }).locator("td strong")).toHaveText(["미확인", "미확인", "미확인"]);
  await dialog.getByRole("button", { name: "일정에 담기", exact: true }).first().click();
  expect(await savedIds(page)).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).include(".place-comparison-dialog").analyze()).violations).toEqual([]);
  await dialog.screenshot({ path: test.info().outputPath("comparison.png") });
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 740 });
    await dialog.locator(".place-comparison-scroll").evaluate(element => { element.scrollLeft = element.scrollWidth; });
    const visible = await route.evaluate(row => {
      const label = row.querySelector("th")!.getBoundingClientRect();
      const last = row.querySelector("td:last-child")!.getBoundingClientRect();
      return { labelLeft: label.left, labelRight: label.right, valueLeft: last.left, valueRight: last.right };
    });
    expect(visible.labelLeft).toBeGreaterThanOrEqual(0);
    expect(visible.labelRight).toBeLessThanOrEqual(visible.valueLeft + 1);
    expect(visible.valueRight).toBeLessThanOrEqual(320);
  }
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  await page.getByRole("button", { name: "용지호수공원 비교에서 빼기", exact: true }).click();
  await expect(choice.nth(3)).toBeEnabled();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let newSearches = 0;
  await page.route("**/api/wave?*", async request => {
    if (new URL(request.request().url()).searchParams.get("action") !== "plan") return request.fallback();
    newSearches++; await pending; return request.fallback();
  });
  try {
    await page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button", { name: "음식", exact: true }).click();
    await expect.poll(() => newSearches).toBe(1);
    await page.getByRole("button", { name: "선택한 2곳 비교", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "일정에 담기", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "일정에서 빼기", exact: true })).toBeEnabled();
    await page.keyboard.press("Escape");
    expect(await savedIds(page)).toEqual(["1001"]);
  } finally { release(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

for (const denied of [false, true]) test(`inquiry card edits, exports and returns focus to the place, clipboard ${denied ? "denied" : "available"}`, async ({ page }) => {
  await prepare(page);
  const navigations: string[] = [];
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  await page.evaluate(denied => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { if (denied) throw new Error("denied"); (window as unknown as { inquiryCopy: string }).inquiryCopy = value; } } }), denied);
  await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
  const entry = page.getByRole("button", { name: /문의 카드 만들기/ });
  await entry.click();
  const dialog = page.getByRole("dialog", { name: "이렇게 물어보세요." });
  await dialog.getByRole("checkbox", { name: "계단 없는 이동", exact: true }).check();
  await dialog.getByRole("textbox", { name: "추가로 전하고 싶은 말", exact: true }).fill("조용한 곳에서 안내받고 싶어요.");
  await dialog.getByRole("button", { name: "내용 복사", exact: true }).click();
  if (denied) {
    await expect(dialog.getByRole("textbox", { name: "복사할 문의 내용", exact: true })).toHaveValue(/조용한 곳에서/);
  } else {
    expect(await page.evaluate(() => (window as unknown as { inquiryCopy: string }).inquiryCopy)).toContain("계단 없이 들어갈 수 있는 입구");
  }
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "이미지 저장", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("WAVE-방문-문의카드.png");
  await file.saveAs(test.info().outputPath("inquiry.png"));
  expect(navigations, "Downloading an inquiry card must preserve the current document and draft").toEqual([]);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "큰 글씨로 보기", exact: true }).click();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(dialog.locator(".inquiry-card-preview")).toContainText("조용한 곳에서");
  expect((await new AxeBuilder({ page }).include(".inquiry-dialog").analyze()).violations).toEqual([]);
  await dialog.screenshot({ path: test.info().outputPath("large-inquiry.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(entry).toBeFocused();
  await expect(page.locator(".native-place-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
