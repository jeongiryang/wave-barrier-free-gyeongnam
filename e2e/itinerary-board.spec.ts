import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("일정 보드는 버튼 편집·날짜 이동·로컬 복원·공유 순서를 보존한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  let sharedSelections: Record<string, unknown> | null = null;
  await page.route("**/api/trips", async (requestRoute) => {
    sharedSelections = (requestRoute.request().postDataJSON() as { selections?: Record<string, unknown> }).selections || null;
    await requestRoute.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://wave.test/trip/manual-order" }),
    });
  });

  await page.goto("/planner?travelStart=2026-09-01&travelEnd=2026-09-02");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가" }).click();

  const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
  const firstDay = itinerary.locator(".day-planner-grid article").first();
  const museum = firstDay.locator("li").filter({ hasText: "경남도립미술관" });
  await museum.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동" }).click();
  await expect(firstDay.locator("li").first()).toContainText("용지호수공원");
  await expect(firstDay.locator("li").first().getByRole("button", { name: /같은 날 앞 순서로 이동/ })).toBeDisabled();
  await expect(firstDay.locator("li").last().getByRole("button", { name: /같은 날 뒤 순서로 이동/ })).toBeDisabled();
  await itinerary.getByLabel("하루 시작").fill("08:30");

  await page.getByRole("button", { name: "공유 링크 만들기" }).click();
  await expect.poll(() => sharedSelections).not.toBeNull();
  expect(sharedSelections).toMatchObject({
    dayStartTime: "08:30",
    selectedPlaceIds: ["1002", "1001"],
  });

  await page.reload();
  const restored = page.getByRole("region", { name: "날짜별 여행 일정" });
  await expect(restored.getByText("내가 정한 순서", { exact: true })).toBeVisible();
  await expect(restored.locator(".day-planner-grid article").first().locator("li").first()).toContainText("용지호수공원");
  await expect(restored.getByLabel("하루 시작")).toHaveValue("08:30");

  const restoredMuseum = restored.locator("li").filter({ hasText: "경남도립미술관" });
  await restoredMuseum.getByLabel("경남도립미술관 여행 날짜").selectOption("2026-09-02");
  await expect(restored.locator(".day-planner-grid article").nth(1)).toContainText("경남도립미술관");
  await page.reload();
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" }).locator(".day-planner-grid article").nth(1)).toContainText("경남도립미술관");

  await page.getByRole("button", { name: "경남도립미술관 일정에서 제거" }).click();
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" }).locator("li").filter({ hasText: "경남도립미술관" })).toHaveCount(0);
});

test("한 장소 일정은 불가능한 순서 동작을 모두 비활성화한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
  const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
  await expect(itinerary.getByRole("button", { name: "경남도립미술관 같은 날 앞 순서로 이동" })).toBeDisabled();
  await expect(itinerary.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동" })).toBeDisabled();
  await expect(itinerary.getByText(/확인된 편의시설 100%/)).toBeVisible();
});

test("다른 지역으로 이동해도 이전 지역 장소가 날짜별 일정에 남는다", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-saved-places", JSON.stringify(["jinju-1", "1001"]));
    window.localStorage.setItem("wave-saved-place-catalog-v1", JSON.stringify([{
      id: "jinju-1", name: "진주 수목원", city: "진주", address: "경상남도 진주시",
      image: "", score: 75, knownFields: 3, source: "공식 관광정보",
    }]));
  });
  await mockPlannerApi(page);
  await page.goto("/planner");

  const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
  await expect(itinerary).toContainText("진주 수목원");
  await expect(itinerary).toContainText("경남도립미술관");
  await expect(itinerary.getByText("2곳을 날짜별로 정리했어요.")).toBeVisible();
});

for (const width of [1440, 960, 390]) {
  test(`${width}px에서 일정 편집 조작이 장소 설명을 가리지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPlannerApi(page);
    await page.goto("/planner");
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
    await page.getByRole("button", { name: "용지호수공원 일정에 추가" }).click();

    const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
    const cards = itinerary.locator(".day-planner-grid li");
    const layout = await cards.evaluateAll((items) => items.map((item) => {
      const card = item.getBoundingClientRect();
      const copy = item.querySelector(".day-place-copy")?.getBoundingClientRect();
      const editor = item.querySelector(".day-place-editor")?.getBoundingClientRect();
      const targets = [...item.querySelectorAll(".day-place-editor select,.day-place-editor button")].map((target) => {
        const rect = target.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      return {
        card: { left: card.left, right: card.right },
        copyBottom: copy?.bottom || 0,
        editor: { left: editor?.left || 0, right: editor?.right || 0, top: editor?.top || 0 },
        targets,
      };
    }));

    expect(layout.length).toBe(2);
    for (const item of layout) {
      expect(item.editor.top, "편집 영역은 장소 설명 아래에 놓인다").toBeGreaterThanOrEqual(item.copyBottom - 1);
      expect(item.editor.left, "편집 영역 왼쪽이 카드 안에 있다").toBeGreaterThanOrEqual(item.card.left);
      expect(item.editor.right, "편집 영역 오른쪽이 카드 안에 있다").toBeLessThanOrEqual(item.card.right);
      for (const target of item.targets) {
        expect(target.height, "날짜·순서·제거 조작 높이").toBeGreaterThanOrEqual(44);
        expect(target.width, "날짜·순서·제거 조작 너비").toBeGreaterThanOrEqual(44);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
}
