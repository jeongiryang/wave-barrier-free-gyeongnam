import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

test("안내형 보기에서 보관 일정을 열면 재검색 없이 일정과 누락된 지도 위치를 확인한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".reference-progress button").nth(5).click();
  await page.locator(".reference-itinerary-details > summary").click();
  await page.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
  await expect(page.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
  await page.getByRole("link", { name: /저장한 일정 보기/ }).click();
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(page).toHaveURL(/from=travel-book#itinerary$/);
  await page.locator(".reference-itinerary-details > summary").click();
  await expect(page.locator(".reference-day-list").getByText("경남도립미술관").first()).toBeVisible();
  await expect(page.locator(".reference-itinerary-details > .route-scope-note")).toContainText("일정 1곳 중 지도에 표시할 수 있는 장소 0곳");
  await expect(page.getByRole("status").filter({ hasText: "좌표를 확인하지 못한 장소:" })).toContainText("경남도립미술관");
  // The privacy contract still excludes coordinates from the archive; never
  // substitute unrelated recommendations or invented markers during restore.
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).not.toMatch(/mapX|mapY|128\.691|35\.238/);
});

test("플래너의 일정은 로컬 여행집에서 기록하고 다시 복원할 수 있다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner?travelStart=2026-09-01&travelEnd=2026-09-02");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
  const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
  await itinerary.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
  await expect(itinerary.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");

  const serialized = await page.evaluate(() => window.localStorage.getItem("wave-travel-book-v1") || "");
  expect(serialized).toContain("경남도립미술관");
  expect(serialized).not.toMatch(/mapX|mapY|128\.691|35\.238/);

  await itinerary.getByRole("link", { name: /저장한 일정 보기/ }).click();
  await expect(page).toHaveURL(/\/travel-book$/);
  await expect(page.getByRole("heading", { name: "창원 1곳 여행" })).toBeVisible();
  await expect(page.getByText("여행의 기억을 다음 여행으로.")).toBeVisible();
  await expect(page.getByText("경남도립미술관")).toBeVisible();
  await expect(page.getByRole("link", { name: "사진으로 코스 되살리기" })).toHaveAttribute("href", "/photo-course");
  await expect(page.getByRole("link", { name: "여행 후기 초안" })).toHaveAttribute("href", /draft=journal/);

  await page.getByRole("button", { name: "다녀온 여행" }).click();
  const note = page.getByPlaceholder(/현장에서 편했던 동선/);
  await note.fill("입구 경사로가 편했고 오전 방문이 여유로웠다.");
  await note.blur();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("wave-travel-book-v1") || "")).toContain("오전 방문이 여유로웠다");
  await page.reload();
  await expect(page.getByRole("button", { name: "다녀온 여행" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByPlaceholder(/현장에서 편했던 동선/)).toHaveValue("입구 경사로가 편했고 오전 방문이 여유로웠다.");

  await page.getByRole("button", { name: /이 일정 다시 열기/ }).click();
  await expect(page).toHaveURL(/\/planner\?.*from=travel-book/);
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" }).getByText("경남도립미술관").first()).toBeVisible();
});

test("여행집의 주요 조작은 44px 이상이고 삭제는 확인을 거친다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-travel-book-v1", JSON.stringify([{
      id: "book-mobile", fingerprint: "mobile", title: "창원 한 곳 여행", region: "창원", theme: "휴양", profiles: ["걷기 불편"],
      travelStart: "2026-09-01", travelEnd: "2026-09-01", dayStartTime: "10:00", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", status: "planned", note: "",
      places: [{ id: "1001", name: "경남도립미술관", city: "창원", address: "경남 창원", image: "", score: 100, knownFields: 4, source: "한국관광공사" }], scheduleAssignments: { "1001": "2026-09-01" },
    }]));
  });
  await page.goto("/travel-book");
  for (const control of [
    page.getByRole("button", { name: "갈 여행" }),
    page.getByRole("button", { name: /이 일정 다시 열기/ }),
    page.getByRole("link", { name: "사진으로 코스 되살리기" }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "여행집에서 삭제" }).click();
  const deleteTrigger = page.getByRole("button", { name: "여행집에서 삭제" });
  await expect(deleteTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(deleteTrigger).toHaveAttribute("aria-controls", /travel-book-delete-/);
  await expect(page.getByText("이 여행을 삭제할까요?")).toBeVisible();
  await expect(page.getByRole("button", { name: "삭제 확인" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(deleteTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(deleteTrigger).toBeFocused();

  const note = page.getByRole("textbox", { name: "출발 전에 기억할 점" });
  await note.fill("출발 전 운영시간 확인");
  await note.blur();
  await expect(page.getByRole("status").filter({ hasText: "메모를 저장했습니다" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "창원 한 곳 여행" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
