import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions, openItinerary } from "./fixtures";
import { alternativePlan } from "./alternative-fixtures";
import { openSupportMenu } from "./support-menu";

/** `navigator.vibrate` 를 가로채 호출을 세어 둔다. 실제 진동은 일어나지 않는다. */
async function recordVibrations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __vibrations: unknown[] }).__vibrations = [];
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: unknown) => { (window as unknown as { __vibrations: unknown[] }).__vibrations.push(pattern); return true; },
    });
  });
}

const vibrations = (page: Page) => page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations);

async function setup(page: Page, haptics?: "on" | "off") {
  await recordVibrations(page);
  if (haptics) await page.addInitScript(value => localStorage.setItem("wave-haptics-v1", value), haptics);
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true, savedPlaces: alternativePlan.places });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: alternativePlan }));
  await page.addInitScript(() => {
    if (!localStorage.getItem("wave-trip-schedule-v1")) {
      localStorage.setItem("wave-trip-schedule-v1", JSON.stringify({ travelStart: "2026-09-15", travelEnd: "2026-09-16", dayStartTime: "10:00", scheduleAssignments: { "1001": "2026-09-15", "1002": "2026-09-15", "1003": "2026-09-15" }, visitMinutesByPlaceId: { "1001": 45 }, breakMinutesByPlaceId: { "1001": 15 } }));
      localStorage.setItem("wave-trip-order-v1", JSON.stringify({ mode: "manual", ids: ["1001", "1002", "1003"] }));
    }
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  for (const name of ["경남도립미술관", "용지호수공원", "시민문화쉼터"]) await page.getByRole("button", { name: name + " 일정에 담기", exact: true }).click();
  await openItinerary(page);
  await page.locator(".simple-more-trip-tools > summary").click();
}

const guide = (page: Page) => page.getByRole("region", { name: "여행 당일 진행", exact: true });
const hapticsRow = (page: Page) => page.locator(".preference-controls button[data-haptics]");

/** 공개 탐색 경로를 따라 환경설정 패널을 연다. */
async function openPreferences(page: Page) {
  await openSupportMenu(page);
  const details = page.locator(".preference-controls");
  await expect(details).toHaveAttribute("aria-busy", "false");
  if (await details.getAttribute("open") === null) await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
}

test("the vibration preference defaults to off, toggles on and is stored only in localStorage", async ({ page }) => {
  await setup(page);
  await openPreferences(page);
  const row = hapticsRow(page);
  await expect(row).toHaveAttribute("data-haptics", "off");
  await expect(row).toHaveAttribute("aria-pressed", "false");
  await expect(row).toContainText("진동 알림");
  await expect(row).toContainText("중요한 순간에 짧게 진동해요. 기기에 따라 동작하지 않을 수 있어요.");
  // 조작 영역은 44px 이상이어야 한다.
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => localStorage.getItem("wave-haptics-v1"))).toBe("off");

  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  await expect(row).toHaveAttribute("data-haptics", "on");
  expect(await page.evaluate(() => localStorage.getItem("wave-haptics-v1"))).toBe("on");
  // 설정을 켜고 끄는 것만으로는 진동하지 않는다.
  expect(await vibrations(page)).toEqual([]);

  await page.reload();
  await openPreferences(page);
  await expect(hapticsRow(page)).toHaveAttribute("aria-pressed", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("an unsupported browser never shows the vibration preference", async ({ page }) => {
  await page.addInitScript(() => {
    // 지원하지 않는 기기를 흉내 낸다. 항목 자체가 보이지 않아야 한다.
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });
  });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");
  await openPreferences(page);
  await expect(hapticsRow(page)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("with the preference off nothing vibrates and the on-screen wording is unchanged", async ({ page }) => {
  await setup(page, "off");
  await page.getByRole("button", { name: "여행 당일 진행", exact: true }).click();
  const panel = guide(page);
  await panel.getByRole("button", { name: "여행 시작하기", exact: true }).click();
  await panel.getByRole("button", { name: "이곳 방문 완료", exact: true }).click();
  // 진동 없이도 같은 안내가 화면 글자와 aria-live 로 전달된다.
  await expect(panel.getByRole("status")).toContainText("방문을 완료했어요");
  await expect(panel).toContainText("1곳 방문 완료");
  expect(await vibrations(page)).toEqual([]);
});

test("with the preference on only the recorded visit vibrates, once, for 40ms", async ({ page }) => {
  await setup(page, "on");
  await page.getByRole("button", { name: "여행 당일 진행", exact: true }).click();
  const panel = guide(page);
  // 배경 갱신과 화면 전환에는 진동하지 않는다.
  expect(await vibrations(page)).toEqual([]);
  await panel.getByRole("button", { name: "여행 시작하기", exact: true }).click();
  expect(await vibrations(page)).toEqual([]);

  await panel.getByRole("button", { name: "이곳 방문 완료", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("방문을 완료했어요");
  expect(await vibrations(page)).toEqual([[40]]);

  // 건너뛰기·되돌리기·시각 변경은 정해진 네 순간이 아니다.
  await panel.getByRole("button", { name: "이번에는 건너뛰기", exact: true }).click();
  await expect(panel).toContainText("1곳 건너뜀");
  await panel.getByRole("button", { name: "직전 진행 되돌리기", exact: true }).click();
  await panel.getByRole("button", { name: "지금 시각으로", exact: true }).click();
  expect(await vibrations(page)).toEqual([[40]]);
  expect((await new AxeBuilder({ page }).include('[aria-label="여행 당일 진행"]').analyze()).violations).toEqual([]);
});

test("a failed save vibrates twice and still explains itself on screen", async ({ page }) => {
  await setup(page, "on");
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === "wave-on-trip-v1") throw new DOMException("Full", "QuotaExceededError"); write.call(this, key, value); };
  });
  await page.getByRole("button", { name: "여행 당일 진행", exact: true }).click();
  const panel = guide(page);
  await panel.getByRole("button", { name: "여행 시작하기", exact: true }).click();
  await panel.getByRole("button", { name: "이곳 방문 완료", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("진행 기록을 저장하지 못했어요");
  const recorded = await vibrations(page);
  expect(recorded).toEqual([[40, 60, 40]]);
  // 총 진동 시간이 200ms 를 넘지 않는다.
  for (const pattern of recorded as number[][]) expect(pattern.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(200);
});
