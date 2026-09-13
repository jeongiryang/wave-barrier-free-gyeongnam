import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, chooseTripConditions, openItinerary, plan, showItineraryMap } from "./fixtures";

async function setup(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
}
async function twoPlaces(page: Page, start = "2026-09-20", end = "2026-09-21") {
  await page.goto(`/planner?travelStart=${start}&travelEnd=${end}`); await chooseTripConditions(page);
  for (const name of ["경남도립미술관", "용지호수공원"]) await page.getByRole("button", { name: `${name} 일정에 담기`, exact: true }).click();
  await openItinerary(page);
}
async function current(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { ids: JSON.parse(values["wave-saved-places"] || "[]"), order: JSON.parse(values["wave-trip-order-v1"] || "{}"), schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}") };
  });
}
async function timeboard(page: Page) {
  const view = page.getByRole("group", { name: "일정 보기 방식", exact: true });
  if (await view.isVisible()) await view.getByRole("button", { name: "시간표", exact: true }).click();
}

test("기본 지도 일정은 장소 핀과 일정 위치 버튼의 선택을 양방향으로 동기화한다", async ({ page }) => {
  await setup(page); await twoPlaces(page); await showItineraryMap(page);
  const map = page.locator(".simple-itinerary-map"); await expect(map.locator(".leaflet-container")).toBeVisible();
  const museumPin = map.locator('.wave-map-icon.place[data-place-id="1001"]'), lakePin = map.locator('.wave-map-icon.place[data-place-id="1002"]');
  const museum = page.locator("#itinerary-stop-1001"), lake = page.locator("#itinerary-stop-1002");
  await expect(museumPin).toBeVisible(); await expect(lakePin).toBeVisible();
  await lakePin.click(); await expect(lake).toHaveAttribute("data-selected", "true");
  await expect(lakePin).toHaveAttribute("aria-current", "location"); await expect(museum).toHaveAttribute("data-selected", "false");
  await timeboard(page); await expect(lake).toBeVisible();
  // This explicit row action must remain reachable on a narrow screen too.
  await museum.getByRole("button", { name: "경남도립미술관 지도에서 보기", exact: true }).click();
  await expect(museum).toHaveAttribute("data-selected", "true");
  await expect(museumPin).toBeVisible(); await expect(museumPin).toHaveAttribute("aria-current", "location");
  await expect(lake).toHaveAttribute("data-selected", "false");
  await timeboard(page);
  const days = page.getByRole("group", { name: "일정 날짜", exact: true });
  await days.getByRole("button", { name: /^2일차/ }).click();
  await expect(page.locator(".simple-timeboard > .simple-empty")).toContainText("이 날짜에 담은 장소가 없어요");
  await showItineraryMap(page); await expect(map.locator(".wave-map-icon.place")).toHaveCount(0);
  await timeboard(page); await days.getByRole("button", { name: /^1일차/ }).click();
  await showItineraryMap(page); await expect(museumPin).toBeVisible(); await expect(lakePin).toBeVisible();
  await expect(museum).toHaveAttribute("data-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("일정 보드는 버튼 편집·날짜 이동·로컬 복원·공유 순서를 보존한다", async ({ page }) => {
  await setup(page);
  const shares: Array<Record<string, unknown>> = [];
  let revision = 0;
  await page.route("**/api/kakao/share", route => route.fulfill({ json: { javascriptKey: "" } }));
  await page.route(/\/api\/trips(?:\/123456789abc)?$/, route => {
    const body = route.request().postDataJSON();
    if (body.operation === "status") return route.fulfill({ json: { revision, expiresAt: Date.now() + 86_400_000, live: true } });
    shares.push(body.selections); revision++;
    return route.fulfill({ json: { id: "123456789abc", url: `${new URL(page.url()).origin}/trip/123456789abc`, revision, expiresAt: Date.now() + 86_400_000 } });
  });
  await twoPlaces(page, "2026-09-01", "2026-09-02");
  const itinerary = page.locator("#itinerary"), rows = itinerary.locator(".simple-stops > li");
  await page.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동", exact: true }).click();
  await expect(rows.first()).toContainText("용지호수공원");
  await expect(rows.first().getByRole("button", { name: /같은 날 앞 순서로 이동/ })).toBeDisabled();
  await expect(rows.last().getByRole("button", { name: /같은 날 뒤 순서로 이동/ })).toBeDisabled();
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await settings.getByLabel("하루 시작", { exact: true }).fill("08:30"); await settings.getByRole("button", { name: "적용", exact: true }).click();
  await page.getByRole("button", { name: "공유", exact: true }).click();
  const share = page.getByRole("dialog", { name: "여행 공유", exact: true });
  await expect(share.getByRole("link", { name: "공유 일정 보기", exact: true })).toBeVisible();
  expect(shares[0]).toMatchObject({ dayStartTime: "08:30", selectedPlaceIds: ["1002", "1001"], profiles: [] });
  await share.getByRole("button", { name: "공유 닫기", exact: true }).click();
  await page.reload(); await expect(rows.first()).toContainText("용지호수공원");
  expect(await current(page)).toMatchObject({ order: { mode: "manual", ids: ["1002", "1001"] }, schedule: { dayStartTime: "08:30" } });
  await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true });
  await editor.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-09-02");
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  await expect(rows).toHaveCount(1); await itinerary.getByRole("button", { name: /^2일차/ }).click();
  await expect(rows).toHaveCount(1); await expect(rows).toContainText("경남도립미술관");
  await page.reload(); await itinerary.getByRole("button", { name: /^2일차/ }).click();
  await expect(rows).toContainText("경남도립미술관");
  expect((await current(page)).schedule.scheduleAssignments).toEqual({ "1001": "2026-09-02", "1002": "2026-09-01" });
  await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
  await editor.getByRole("button", { name: "일정에서 빼기", exact: true }).click();
  await expect(rows).toHaveCount(0); expect((await current(page)).ids).toEqual(["1002"]);
  await expect.poll(() => shares.at(-1)?.selectedPlaceIds).toEqual(["1002"]);
});

test("한 장소 일정은 불가능한 순서 동작을 모두 비활성화한다", async ({ page }) => {
  await setup(page); await page.goto("/planner"); await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-07" });
  const itinerary = page.locator("#itinerary");
  for (const direction of ["앞", "뒤"]) await expect(itinerary.getByRole("button", { name: `경남도립미술관 같은 날 ${direction} 순서로 이동`, exact: true })).toBeDisabled();
  // The fixture has counts but no per-facility evidence: never manufacture a confirmed percentage.
  await expect(itinerary.locator(".simple-stop-copy")).not.toContainText("%");
  await expect(itinerary.locator(".simple-facility-summary")).toHaveCount(0);
  await itinerary.getByRole("button", { name: "경남도립미술관", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "경남도립미술관", exact: true });
  await expect(detail).toContainText(/방문 전|재확인|확인 필요/);
});

test("다른 지역으로 이동해도 이전 지역 장소가 날짜별 일정에 남는다", async ({ page }) => {
  await setup(page);
  const jinju = { ...plan.places[0], id: "2101", name: "진주 수목원", city: "진주", address: "경상남도 진주시", image: "", mapX: "128.08", mapY: "35.19" };
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [...plan.places, jinju] });
  await page.route("**/api/wave?**", route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") !== "plan" || url.searchParams.get("region") !== "진주") return route.fallback();
    return route.fulfill({ json: { ...plan, places: [jinju], stops: [{ ...plan.stops[0], id: jinju.id, title: jinju.name, mapX: jinju.mapX, mapY: jinju.mapY }] } });
  });
  await page.goto("/planner?region=진주&travelStart=2026-09-20&travelEnd=2026-09-21");
  await page.getByRole("button", { name: "진주 수목원 일정에 담기", exact: true }).click();
  const before = await current(page);
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page);
  const itinerary = page.locator("#itinerary");
  await expect(itinerary.locator(".simple-stops > li")).toHaveCount(2);
  await expect(itinerary).toContainText("진주 수목원"); await expect(itinerary).toContainText("경남도립미술관");
  expect((await current(page)).ids).toEqual(["2101", "1001"]);
  expect((await current(page)).schedule.scheduleAssignments["2101"]).toBe(before.schedule.scheduleAssignments["2101"]);
  await page.reload(); await expect(itinerary.locator(".simple-stops > li")).toHaveCount(2);
  expect((await current(page)).ids).toEqual(["2101", "1001"]);
});

for (const width of [1440, 960, 390]) test(`${width}px에서 일정 편집 조작이 장소 설명을 가리지 않는다`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 }); await setup(page); await twoPlaces(page);
  const itinerary = page.locator("#itinerary"), cards = itinerary.locator(".simple-stops > li");
  // Opening the itinerary loads the board lazily; measure the rendered rows,
  // never the empty DOM while its module is still being requested.
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toBeVisible();
  await expect(cards.nth(1)).toBeVisible();
  const layout = await cards.evaluateAll(items => items.map(item => {
    const card = item.getBoundingClientRect(), copy = item.querySelector(".simple-stop-copy")!.getBoundingClientRect();
    const edit = item.querySelector(".simple-edit-stop")!.getBoundingClientRect(), controls = item.querySelector(".simple-stop-controls")!.getBoundingClientRect();
    return { card: { left: card.left, right: card.right }, copy: { right: copy.right, bottom: copy.bottom }, edit: { left: edit.left, right: edit.right }, controls: { left: controls.left, right: controls.right, top: controls.top }, targets: [...item.querySelectorAll(".simple-edit-stop,.simple-stop-controls button")].map(target => { const rect = target.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }) };
  }));
  expect(layout).toHaveLength(2);
  for (const item of layout) {
    expect(item.edit.left, "수정 버튼이 설명과 겹치지 않는다").toBeGreaterThanOrEqual(item.copy.right - 1);
    expect(item.edit.right).toBeLessThanOrEqual(item.card.right);
    expect(item.controls.top, "순서 조작은 설명 아래에 놓인다").toBeGreaterThanOrEqual(item.copy.bottom - 1);
    expect(item.controls.left).toBeGreaterThanOrEqual(item.card.left); expect(item.controls.right).toBeLessThanOrEqual(item.card.right);
    for (const target of item.targets) { expect(target.height).toBeGreaterThanOrEqual(44); expect(target.width).toBeGreaterThanOrEqual(44); }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true });
  for (const control of [editor.getByRole("combobox", { name: "방문 날짜", exact: true }), editor.getByRole("button", { name: "일정에서 빼기", exact: true }), editor.getByRole("button", { name: "적용", exact: true })]) {
    const box = await control.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: info.outputPath(`itinerary-edit-${width}.png`) });
  expect((await new AxeBuilder({ page }).include(".simple-stop-editor").analyze()).violations).toEqual([]);
});
