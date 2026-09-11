import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

async function prepare(page: Page) {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/wave?*", route => {
    if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
    const places = Array.from({ length: 4 }, (_, i) => ({ ...plan.places[i % 2], id: String(1001 + i), name: ["경남도립미술관", "용지호수공원", "창원수목원", "해안공원"][i], accessibility: [
      { key: "parking", label: "장애인 주차", state: "confirmed", detail: "전용 주차 공간 있음" },
      ...(i === 2 ? [] : [{ key: "route", label: "접근로", state: i === 1 ? "negative" : "confirmed", detail: i === 1 ? "입구에 계단이 있음" : "계단 없는 입구" }]),
    ] }));
    return route.fulfill({ json: { ...plan, places, criteria: { facilityKeys: ["route", "restroom", "parking"] } } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.evaluate(() => document.fonts.ready);
}

test("comparison limits selection, distinguishes missing evidence, and keeps saved places on close", async ({ page, isMobile }) => {
  await prepare(page);
  await page.getByRole("button", { name: "편의 비교", exact: true }).click();
  const choice = page.getByRole("button", { name: /편의 비교 선택$/ });
  for (let i = 0; i < 3; i++) await choice.nth(i).click();
  await expect(choice.nth(3)).toBeDisabled();
  const open = page.getByRole("button", { name: "선택한 3곳 비교", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "편의를 나란히 살펴보세요." });
  await expect(dialog.getByRole("heading")).toBeFocused();
  const route = dialog.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "접근로", exact: true }) });
  await expect(route.locator("td strong")).toHaveText(["확인됨", "조건과 맞지 않음", "미확인"]);
  await expect(dialog.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "장애인 화장실", exact: true }) }).locator("td strong")).toHaveText(["미확인", "미확인", "미확인"]);
  await dialog.getByRole("button", { name: "일정에 담기", exact: true }).first().click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
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
  await page.getByRole("button", { name: /^음식/ }).click();
  await page.getByRole("button", { name: "선택한 2곳 비교", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "일정에 담기", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "일정에서 빼기", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

for (const denied of [false, true]) test(`inquiry card edits, exports and returns focus to the place, clipboard ${denied ? "denied" : "available"}`, async ({ page }) => {
  await prepare(page);
  await page.evaluate(denied => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { if (denied) throw new Error("denied"); (window as unknown as { inquiryCopy: string }).inquiryCopy = value; } } }), denied);
  await page.locator(".place-card").first().getByRole("button", { name: "이용 정보" }).click();
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
