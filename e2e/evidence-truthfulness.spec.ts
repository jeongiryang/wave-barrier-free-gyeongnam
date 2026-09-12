import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions, plan } from "./fixtures";

test("명시적 편의 불일치와 미확인은 구분하고 불일치 장소는 일정에 추가하지 않는다", async ({ page }) => {
  await mockPlannerApi(page, { explorationOnly: true });
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: { ...plan, places: [], stops: [], criteria: { facilityKeys: ["route"] }, explorationPlaces: plan.places.map((place, index) => ({ ...place, score: index ? null : 0, accessibility: [{ key: "route", label: "접근로", state: index ? "unknown" : "negative", detail: index ? "" : "접근로 없음" }], knownFields: index ? 0 : 1, unknownFields: index ? 1 : 0, negativeFields: index ? 0 : 1 })) } }));
  await page.goto("/planner");
  await chooseTripConditions(page);

  await expect(page.getByRole("heading", { name: /선택한 조건에 맞는 여행지를 찾지 못했어요/ })).toBeVisible();
  await expect(page.locator(".place-card:not(.place-card-skeleton)")).toHaveCount(0);
  const exploration = page.locator(".exploration-places");
  await exploration.locator("summary").click();
  await expect(exploration.locator("article")).toHaveCount(2);
  await expect(exploration.getByText("조건 불일치", { exact: true })).toBeVisible();
  await expect(exploration.getByText("정보 미확인", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "내 일정", exact: true }).getByText("아직 일정에 추가한 장소가 없어요.")).toBeVisible();

  await exploration.getByRole("button", { name: "이용 정보 확인" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "일정에 추가" })).toBeDisabled();
  await expect(dialog.getByText(/필요한 편의가 제공되지 않는 것으로 기록된 장소는 추가할 수 없어요/)).toBeVisible();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
});

test("교통·요금·임시 이동값은 확인 범위를 그대로 말한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);

  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".itinerary-route-coverage select").selectOption("car");
  await expect(page.locator(".service-status-summary")).toContainText("교통정보 1개 직접 확인");
  await expect(page.getByText("통행료 없음", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("시간 정보 없음", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /도보 걸어서 이동 시간 정보 없음/ }).click();
  await expect(page.getByText(/확인되지 않은 시간을 임의로 표시하지 않습니다/)).toBeVisible();
  await expect(page.getByRole("link", { name: /카카오맵에서 도보 확인/ })).toBeVisible();
});
