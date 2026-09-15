import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  mockPlannerApi,
  mockPublicShellApi,
  openItinerary,
  plan,
} from "./fixtures";
test.use({
  storageState: { cookies: [], origins: [] },
  serviceWorkers: "block",
});
async function setup(page: Page) {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.route("**/api/observations**", (route) =>
    route.fulfill({ json: { reports: [], checkedAt: Date.now() } }),
  );
  await page.goto("/planner");
  await expect(
    page.getByRole("combobox", { name: "여행 지역", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("combobox", { name: "여행 지역", exact: true })
    .selectOption("창원");
  for (const p of plan.places)
    await page
      .getByRole("button", { name: `${p.name} 일정에 담기`, exact: true })
      .click();
  await openItinerary(page, { start: "2026-09-15" });
  await expect(
    page.getByRole("button", { name: "오늘의 페이스", exact: true }),
  ).toBeVisible();
}
test("pace preview, apply and undo preserve itinerary; sensory reports and passport remain accessible", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "오늘의 페이스", exact: true })
    .click();
  await page.getByRole("button", { name: "휴식 변경안 미리보기" }).click();
  await expect(
    page.getByRole("region", { name: "오늘의 페이스 변경안" }),
  ).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("wave-trip-schedule-v1"),
  );
  await page
    .getByRole("button", { name: "이 변경안 적용", exact: true })
    .click();
  await expect(
    page.getByText("오늘의 페이스를 반영했어요.", { exact: false }),
  ).toBeVisible();
  await page
    .locator(".simple-command-receipt")
    .getByRole("button", { name: "되돌리기" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("wave-trip-schedule-v1")),
    )
    .toBe(before);
  await page
    .getByRole("button", { name: "감각지도·지금 현장", exact: true })
    .click();
  await expect(page.getByText("소리: 미확인", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "쉬는 곳", exact: true }).click();
  await expect(page.getByText("쉬는 곳: 미확인", { exact: true })).toHaveCount(
    2,
  );
  const axe = await new AxeBuilder({ page })
    .include('[aria-label="오늘의 여행 도우미"]')
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("sensory.png") });
  await page
    .getByRole("button", { name: "경남 여행여권", exact: true })
    .click();
  await page.getByLabel("참여 날짜", { exact: true }).fill("2026-09-15");
  await page
    .getByRole("combobox", { name: "참여 방식", exact: true })
    .selectOption("story");
  await page.getByRole("button", { name: "내 여행여권에 기록" }).click();
  await expect(
    page.getByText("음성·글로 만난 풍경: 1개", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /기록 삭제/ }).click();
  await expect(
    page.getByText("아직 기록이 없어요.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("passport deletion preserves an unseen record from another writer", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "경남 여행여권", exact: true })
    .click();
  await page.getByRole("button", { name: "내 여행여권에 기록" }).click();
  await expect(page.getByRole("button", { name: /기록 삭제/ })).toHaveCount(1);
  await page.evaluate(() => {
    const key = "wave-travel-passport-v1";
    const old = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(
      key,
      JSON.stringify([
        ...old,
        {
          placeId: "1002",
          date: "2026-09-14",
          kind: "story",
          recordedAt: Date.now(),
        },
      ]),
    );
  });
  await page.getByRole("button", { name: /기록 삭제/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("wave-travel-passport-v1") || "[]").map(
          (x: { placeId: string }) => x.placeId,
        ),
      ),
    )
    .toEqual(["1002"]);
});
test("nearby passport stamp stores method but never GPS coordinates", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: Number(plan.places[0].mapY),
    longitude: Number(plan.places[0].mapX),
    accuracy: 10,
  });
  await setup(page);
  await page
    .getByRole("button", { name: "경남 여행여권", exact: true })
    .click();
  await page.getByRole("button", { name: "기기 위치로 방문 기록" }).click();
  await expect(page.getByText(/기기에서 위치 근접 확인/)).toBeVisible();
  const entry = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("wave-travel-passport-v1") || "[]")[0],
  );
  expect(entry.method).toBe("nearby");
  expect(Object.keys(entry).sort()).toEqual([
    "date",
    "kind",
    "method",
    "placeId",
    "recordedAt",
  ]);
});
const roomId = "abcdef123456abcdef123456";
const room = () => ({
  id: roomId,
  role: "editor",
  revision: 1,
  expiresAt: Date.now() + 86400000,
  selections: {
    region: "창원",
    theme: "",
    profiles: [],
    locale: "ko",
    travelStart: "2026-09-15",
    travelEnd: "2026-09-15",
    dayStartTime: "10:00",
    travelMode: "transit",
    selectedPlaceIds: ["1001", "1002"],
    scheduleAssignments: { 1001: "2026-09-15", 1002: "2026-09-15" },
    visitMinutesByPlaceId: { 1001: 60, 1002: 90 },
    breakMinutesByPlaceId: {},
    fixedVisits: {},
    dayDeadlines: {},
    restPurposeByPlaceId: {},
  },
  expenses: [],
  proposals: [],
  history: [],
});
test("companion receives updates, preserves stale draft and removes UI after access expires", async ({
  page,
}) => {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  let data = room(),
    expired = false,
    posts = 0;
  await page.route(`**/api/companions/${roomId}`, async (route) => {
    if (expired)
      return route.fulfill({
        status: 403,
        json: { error: "초대 권한이 종료됐어요." },
      });
    if (route.request().method() === "POST") {
      posts++;
      const body = route.request().postDataJSON();
      if (body.revision !== data.revision)
        return route.fulfill({
          status: 409,
          json: { error: "다른 동행이 먼저 수정했어요." },
        });
      data = {
        ...data,
        revision: data.revision + 1,
        selections: {
          ...data.selections,
          visitMinutesByPlaceId: {
            ...data.selections.visitMinutesByPlaceId,
            [body.edit.id]: body.edit.minutes,
          },
        },
      };
    }
    await route.fulfill({ json: data });
  });
  await page.goto(`/companion/${roomId}`);
  await expect(
    page.getByRole("heading", { name: "경남도립미술관", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "시간 변경안 작성" }).first().click();
  await page.getByLabel("체류 시간(분)", { exact: true }).fill("45");
  data = { ...data, revision: 2 };
  await page.getByRole("button", { name: "최신 일정 확인" }).click();
  await expect(
    page.getByRole("button", { name: "변경 적용", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("체류 시간(분)", { exact: true })).toHaveValue(
    "45",
  );
  expect(posts).toBe(0);
  await page.getByRole("button", { name: "최신 일정과 비교했어요" }).click();
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(
    page.getByText("2026-09-15 · 체류 45분 · 휴식 0분", { exact: true }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("companion.png") });
  expired = true;
  await page.getByRole("button", { name: "최신 일정 확인" }).click();
  await expect(
    page.getByText("초대 권한이 종료됐어요.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "시간 변경안 작성" }),
  ).toHaveCount(0);
});
test("mobile and tablet travel helper fits and supplies keyboard focus targets", async ({
  page,
}) => {
  await setup(page);
  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page
      .getByRole("button", { name: "오늘의 페이스", exact: true })
      .click();
    await page.getByRole("button", { name: "휴식 변경안 미리보기" }).focus();
    await expect(
      page.getByRole("button", { name: "휴식 변경안 미리보기" }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page
      .getByRole("button", { name: "오늘의 페이스", exact: true })
      .click();
  }
});
