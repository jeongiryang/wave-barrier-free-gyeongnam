import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { alternativePlan } from "./alternative-fixtures";

async function setup(page: Page) {
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true, savedPlaces: alternativePlan.places });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (!localStorage.getItem("wave-trip-schedule-v1")) {
      localStorage.setItem("wave-trip-schedule-v1", JSON.stringify({ travelStart: "2026-09-14", travelEnd: "2026-09-14", dayStartTime: "10:00", scheduleAssignments: {}, visitMinutesByPlaceId: { "1001": 180 }, breakMinutesByPlaceId: { "1001": 15 } }));
      localStorage.setItem("wave-trip-order-v1", JSON.stringify({ mode: "manual", ids: ["1001", "1002"] }));
    }
  });
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: alternativePlan }));
  await page.route("**/api/wave?action=visit-info*", route => {
    const id = new URL(route.request().url()).searchParams.get("contentId");
    return route.fulfill({ json: { id, status: "available", checkedAt: new Date().toISOString(), source: "ⓒ한국관광공사", hours: "09:00~18:00", setting: id === "1003" ? { state: "indoor-space", detail: "실내 전시 공간에서 쉴 수 있습니다." } : { state: "unknown", detail: "" } } });
  });
  await page.goto("/planner"); await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  await page.locator(".planner-navigation nav button").nth(3).click();
  return page.locator(".reference-day-list");
}
async function open(page: Page, name = "경남도립미술관") {
  const tools = page.locator("#itinerary > .place-evidence").filter({ has: page.locator("summary").filter({ hasText: /^장소·날짜 대안 비교$/ }) });
  if (!await tools.getAttribute("open").then(value => value !== null)) await tools.locator("summary").click();
  await tools.getByRole("button", { name: `${name} 비교`, exact: true }).click();
  return page.getByRole("dialog", { name: "이곳만 바꿔 볼까요?", exact: true });
}

test("one-place comparison keeps dates/order, supports cancel and undo, and respects later edits", async ({ page }, info) => {
  const board = await setup(page);
  let dialog = await open(page);
  await expect(dialog).not.toContainText("편의 미확인 전시실");
  await expect(dialog).toContainText("현재 여행의 편의 5개");
  await dialog.getByRole("button", { name: "더 짧게 둘러볼래요", exact: true }).click();
  for (const width of info.project.name.startsWith("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.screenshot({ path: info.outputPath(`alternatives-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".place-comparison-dialog").analyze()).violations).toEqual([]);
  }
  await dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "현재 일정 유지", exact: true }).click();
  await expect(board.locator(".reference-stop-copy > button")).toHaveText(["경남도립미술관", "용지호수공원"]);
  dialog = await open(page); await dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "선택한 장소로 교체", exact: true }).click();
  await expect(board.locator(".reference-stop-copy > button")).toHaveText(["시민문화쉼터", "용지호수공원"]);
  await page.getByRole("button", { name: "방금 교체 되돌리기", exact: true }).click();
  await expect(board.locator(".reference-stop-copy > button")).toHaveText(["경남도립미술관", "용지호수공원"]);
  await expect(board).toContainText("체류 180분"); await expect(board).toContainText("방문 뒤 15분 휴식");
  dialog = await open(page); await dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true }).click(); await dialog.getByRole("button", { name: "선택한 장소로 교체", exact: true }).click();
  await board.getByLabel("시민문화쉼터 일정 수정", { exact: true }).click(); await board.getByLabel("시민문화쉼터 머무는 시간", { exact: true }).selectOption("30"); await board.getByLabel("시민문화쉼터 일정 수정", { exact: true }).click();
  await page.getByRole("button", { name: "방금 교체 되돌리기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "새 선택을 보존하기 위해" })).toBeVisible();
  await page.reload(); await expect(board.locator(".reference-stop-copy > button")).toHaveText(["시민문화쉼터", "용지호수공원"]); await expect(board).toContainText("체류 30분");
});

test("indoor evidence is checked explicitly and nearby discovery retains facility and activity choices", async ({ page }) => {
  await setup(page);
  const calls: URL[] = []; page.on("request", request => { if (request.url().includes("/api/wave?")) calls.push(new URL(request.url())); });
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "실내 공간으로", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true })).toHaveCount(0);
  // Saved-place evidence may refresh in the background, but indoor details and
  // alternative searches still require their own explicit action.
  expect(calls.filter(url => url.searchParams.get("action") !== "places")).toHaveLength(0);
  for (const lookup of calls) {
    expect(lookup.searchParams.get("ids")?.split(",").sort()).toEqual(["1001", "1002"]);
    expect(lookup.searchParams.get("profiles")).toBe("wheel");
  }
  await dialog.locator(".travel-book-actions").filter({ hasText: "시민문화쉼터" }).getByRole("button", { name: "실내 공간 정보 확인", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true })).toBeVisible();
  expect(calls.filter(url => url.searchParams.get("action") === "visit-info")).toHaveLength(1);
  expect(calls.find(url => url.searchParams.get("action") === "visit-info")?.searchParams.get("contentId")).toBe("1003");
  await dialog.getByRole("button", { name: "새로운 곳을 볼래요", exact: true }).click();
  await dialog.getByRole("button", { name: "다음 후보 보기", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true })).toHaveCount(0);
  await dialog.getByText("경남의 다른 후보 살펴보기", { exact: true }).click();
  await dialog.getByRole("combobox", { name: "살펴볼 지역", exact: true }).selectOption("함안");
  await dialog.getByRole("button", { name: "같은 편의로 후보 찾기", exact: true }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "함안에서 후보" })).toBeVisible();
  expect(calls.filter(url => url.searchParams.get("action") === "plan")).toHaveLength(1);
  const request = calls.find(url => url.searchParams.get("action") === "plan")!;
  expect(request.searchParams.get("region")).toBe("함안"); expect(request.searchParams.get("themes")).toBe("nature"); expect(request.searchParams.get("profiles")).toBe("wheel");
  await page.keyboard.press("Escape");
  await expect(page.locator("#itinerary > .place-evidence").getByRole("button", { name: "경남도립미술관 비교", exact: true })).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001", "1002"]);
});

test("forecast comparison leaves missing dates unknown and moves only the selected stop within seven days", async ({ page }) => {
  const board = await setup(page);
  await page.route("**/api/wave?action=crowd-calendar*", route => route.fulfill({ json: { id: "1001", title: "경남도립미술관", checkedAt: new Date().toISOString(), source: "ⓒ한국관광공사", status: "available", days: [{ date: "2026-09-13", rate: 0 }, { date: "2026-09-15", rate: 20 }, { date: "2026-09-25", rate: 10 }] } }));
  const dialog = await open(page); await dialog.getByText("장소를 유지하고 날짜 비교", { exact: true }).click();
  await dialog.getByRole("button", { name: "날짜별 예측 확인", exact: true }).click();
  const table = dialog.getByRole("region", { name: "날짜별 관광 집중률", exact: true });
  await expect(table.getByRole("row").filter({ hasText: "2026-09-14" })).toContainText("미확인");
  await expect(table.getByRole("row").filter({ hasText: "2026-09-13" })).toContainText("0.0%");
  await expect(table.getByRole("button", { name: "09-25 선택", exact: true })).toBeDisabled();
  await table.getByRole("button", { name: "09-13 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "이 날짜로 방문일 변경", exact: true }).click();
  await expect(board.locator(".reference-stop-copy > button")).toHaveText(["경남도립미술관"]);
  await board.getByRole("button", { name: "DAY 2 · 09/14", exact: true }).click();
  await expect(board.locator(".reference-stop-copy > button")).toHaveText(["용지호수공원"]);
  await page.reload();
  const value = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-trip-schedule-v1") || "{}"));
  expect(value.scheduleAssignments).toEqual({ "1001": "2026-09-13", "1002": "2026-09-14" });
  expect(value.travelStart).toBe("2026-09-13"); expect(value.travelEnd).toBe("2026-09-14");
  expect(value.visitMinutesByPlaceId["1001"]).toBe(180); expect(value.breakMinutesByPlaceId["1001"]).toBe(15);
});

test("unverified facility candidates need explicit opt-in and remain visibly unverified", async ({ page }) => {
  await setup(page);
  const dialog = await open(page);
  await expect(dialog.getByRole('button', { name: '편의 미확인 전시실 선택', exact: true })).toHaveCount(0);
  await dialog.getByLabel('편의 미확인 후보도 직접 비교', { exact:true }).check();
  await dialog.getByRole('button', { name: '편의 미확인 전시실 선택', exact: true }).click();
  await expect(dialog.getByRole('status').filter({hasText:'이 후보는 필요한 편의'})).toContainText('미확인');
  await dialog.getByLabel('편의 미확인 후보도 직접 비교', { exact:true }).uncheck();
  await expect(dialog.getByRole('button', {name:'선택한 장소로 교체',exact:true})).toBeDisabled();
  await expect(dialog.getByRole('button', { name: '편의 미확인 전시실 선택', exact: true })).toHaveCount(0);
});
