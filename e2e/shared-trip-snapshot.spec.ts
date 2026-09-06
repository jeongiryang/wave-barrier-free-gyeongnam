import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

async function prepare(page: Page) {
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (url: string) => {
      window.sessionStorage.setItem("test-copied-links", JSON.stringify([...JSON.parse(window.sessionStorage.getItem("test-copied-links") || "[]"), url]));
    } } });
  });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
}

test("editing a shared itinerary creates a new snapshot and preserves the old link", async ({ page }) => {
  await prepare(page);
  const snapshots: Array<{ selections: { dayStartTime: string; selectedPlaceIds: string[]; scheduleAssignments: Record<string, string> } }> = [];
  await page.route("**/api/trips", async (route) => {
    snapshots.push(route.request().postDataJSON());
    await route.fulfill({ json: { url: `${new URL(page.url()).origin}/trips/snapshot-${snapshots.length}` } });
  });
  const actions = page.locator(".itinerary-primary-actions");
  await actions.getByRole("button").click();
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-1$/);
  await page.getByLabel("하루 시작", { exact: true }).fill("10:30");
  await expect(actions.getByRole("link")).toHaveCount(0);
  await actions.getByRole("button").click();
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-2$/);
  expect(snapshots[0].selections.dayStartTime).not.toBe("10:30");
  expect(snapshots[1].selections.dayStartTime).toBe("10:30");
  await page.getByLabel("경남도립미술관 여행 날짜", { exact: true }).selectOption("2026-10-09");
  await expect(actions.getByRole("link")).toHaveCount(0);
  await actions.getByRole("button").click();
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-3$/);
  expect(snapshots[2].selections.scheduleAssignments["1001"]).toBe("2026-10-09");
  await actions.getByRole("button").click();
  await expect(actions.getByRole("button")).toHaveText("링크 복사 완료");
  expect(snapshots).toHaveLength(3);
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  await expect(actions.getByRole("link")).toHaveCount(0);
  await page.getByLabel("경남도립미술관 여행 날짜", { exact: true }).selectOption("2026-10-08");
  await page.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동", exact: true }).click();
  await actions.getByRole("button").click();
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-4$/);
  expect(snapshots[3].selections.selectedPlaceIds).toEqual(["1002", "1001"]);
  await page.getByRole("button", { name: "경남도립미술관 일정에서 제거", exact: true }).click();
  await expect(actions.getByRole("link")).toHaveCount(0);
  await actions.getByRole("button").click();
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-5$/);
  expect(snapshots[4].selections.selectedPlaceIds).toEqual(["1002"]);
});

test("an obsolete response cannot replace the edited itinerary link or copy it", async ({ page }) => {
  await prepare(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  await page.route("**/api/trips", async (route) => {
    const call = ++calls;
    if (call === 1) await held;
    await route.fulfill({ json: { url: `${new URL(page.url()).origin}/trips/snapshot-${call}` } });
  });
  const actions = page.locator(".itinerary-primary-actions");
  await actions.getByRole("button").click();
  await expect.poll(() => calls).toBe(1);
  await page.getByLabel("하루 시작", { exact: true }).fill("11:00");
  await expect(actions.getByRole("button")).toBeEnabled();
  await actions.getByRole("button").click();
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-2$/);
  const oldResponse = page.waitForResponse(async (response) => response.url().endsWith("/api/trips") && (await response.json()).url.endsWith("snapshot-1"));
  release();
  await oldResponse;
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(actions.getByRole("link")).toHaveAttribute("href", /snapshot-2$/);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("test-copied-links") || "[]"))).toEqual([`${new URL(page.url()).origin}/trips/snapshot-2`]);
  expect(calls).toBe(2);
});

for (const theme of ["light", "dark"] as const) {
  test(`clipboard failure preserves a usable link and an accessible retry in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await prepare(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let calls = 0;
    await page.route("**/api/trips", async (route) => {
      calls++;
      await route.fulfill({ json: { url: `${new URL(page.url()).origin}/trips/copy-retry` } });
    });
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
    const actions = page.locator(".itinerary-primary-actions");
    const button = actions.getByRole("button");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(actions.getByRole("alert")).toContainText("공유 링크는 만들었지만 복사하지 못했습니다");
    await expect(button).toBeFocused();
    await expect(button).not.toHaveText("링크 복사 완료");
    await expect(actions.getByRole("link")).toHaveAttribute("href", /copy-retry$/);
    expect((await new AxeBuilder({ page }).include(".itinerary-primary-actions").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`shared-link-${theme}.png`) });
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } }));
    await page.keyboard.press("Enter");
    await expect(button).toHaveText("링크 복사 완료");
    expect(calls).toBe(1);
    expect(errors).toEqual([]);
  });
}
