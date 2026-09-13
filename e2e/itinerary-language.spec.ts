import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Locator } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions, openItinerary } from "./fixtures";

async function setup(page: Page, options: Parameters<typeof mockPlannerApi>[1] = {}) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { ...options, preserveView: true });
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
}
async function prepare(page: Page, options: Parameters<typeof mockPlannerApi>[1] = {}) {
  await setup(page, options);
  for (const name of ["경남도립미술관", "용지호수공원"]) await page.getByRole("button", { name: `${name} add to itinerary`, exact: true }).click();
  await openItinerary(page);
}
async function language(locator: Locator) { return locator.evaluate(element => element.closest("[lang]")?.getAttribute("lang")); }
async function records(page: Page) { return page.evaluate(() => {
  const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values;
  return { ids: JSON.parse(values["wave-saved-places"]), order: JSON.parse(values["wave-trip-order-v1"]), schedule: JSON.parse(values["wave-trip-schedule-v1"]) };
}); }
async function settings(page: Page) { await page.getByRole("button", { name: "여행 설정", exact: true }).click(); return page.getByRole("dialog", { name: "여행 설정", exact: true }); }
async function tools(page: Page) { await page.locator(".simple-more-trip-tools > summary").click(); }

for (const theme of ["light", "dark"] as const) test(`English preference with Korean controls preserves itinerary data and declares each language in ${theme}`, async ({ page }, info) => {
  await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
  await page.emulateMedia({ reducedMotion: "reduce" }); await prepare(page);
  const itinerary = page.locator("#itinerary"), rows = itinerary.locator(".simple-stops > li");
  expect(await language(itinerary.getByRole("button", { name: "여행 설정", exact: true }))).toBe("ko");
  expect(await language(rows.first().getByRole("button", { name: "경남도립미술관", exact: true }))).toBe("ko");
  await expect(rows.locator(".simple-leg-time").first()).toContainText(/직선거리 추정|미확인/);
  await page.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동", exact: true }).click();
  expect((await records(page)).order.ids).toEqual(["1002", "1001"]);
  await expect(rows.first()).toContainText("용지호수공원");
  await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
  const stop = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true });
  expect(await language(stop)).toBe("ko");
  await stop.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-10-09");
  await stop.getByRole("button", { name: "적용", exact: true }).click();
  await itinerary.getByRole("button", { name: /^2일차/ }).click(); await expect(rows).toContainText("경남도립미술관");
  await expect(rows.getByRole("button", { name: "경남도립미술관 같은 날 앞 순서로 이동", exact: true })).toBeDisabled();
  let editor = await settings(page); expect(await language(editor)).toBe("ko");
  await editor.getByLabel("하루 시작", { exact: true }).fill("08:30"); await editor.getByRole("button", { name: "적용", exact: true }).click();
  await itinerary.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await expect(itinerary.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
  await tools(page);
  const coverage = itinerary.locator(".itinerary-route-coverage");
  await expect(coverage).toContainText("Route availability does not confirm wheelchair access");
  expect(await language(coverage.getByRole("heading", { name: "Check every journey", exact: true }))).toBe("en");
  await itinerary.locator(".simple-audio-journal > summary").click();
  const audio = itinerary.getByRole("complementary", { name: "Place audio guide", exact: true });
  await expect(audio.getByRole("button", { name: "Play", exact: true })).toBeDisabled();
  await audio.getByRole("button", { name: /Show transcript/ }).click();
  await expect(audio.locator(".transcript")).toContainText("No transcript was supplied");
  expect(await language(audio.locator(".transcript"))).toBe("en");
  expect((await new AxeBuilder({ page }).include("#itinerary").analyze()).violations).toEqual([]);
  for (const width of [320, 960, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    editor = await settings(page); await editor.getByLabel("하루 시작", { exact: true }).focus();
    for (const control of await editor.locator("input,select,button").all()) {
      if (!await control.isVisible()) continue;
      const box = await control.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect((await new AxeBuilder({ page }).include('dialog[aria-labelledby="trip-settings-title"]').analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`itinerary-edit-${width}-${theme}.png`) });
    await editor.getByRole("button", { name: "취소", exact: true }).click();
  }
  const before = await records(page); await page.reload();
  await itinerary.getByRole("button", { name: /^2일차/ }).click(); await expect(rows).toContainText("경남도립미술관");
  expect(await records(page)).toEqual(before);
  editor = await settings(page); await expect(editor.getByLabel("하루 시작", { exact: true })).toHaveValue("08:30");
});

test("changing locale updates translated journey evidence while preserving Korean edit notices and the trip", async ({ page }) => {
  await prepare(page); await page.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동", exact: true }).click();
  const receipt = page.locator("#itinerary .simple-command-receipt"), before = await records(page), notice = await receipt.innerText();
  await expect(receipt).toBeVisible(); expect(await language(receipt)).toBe("ko");
  await tools(page); await openSupportMenu(page);
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(page.locator(".itinerary-route-coverage")).toContainText("경로가 있어도 휠체어 통행");
  await expect(receipt).toHaveText(notice, { useInnerText: true }); expect(await records(page)).toEqual(before);
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(page.locator(".itinerary-route-coverage")).toContainText("Route availability does not confirm wheelchair access");
  await expect(receipt).toHaveText(notice, { useInnerText: true }); expect(await records(page)).toEqual(before);
  await preferences.getByLabel("Language", { exact: true }).focus(); await expect(preferences.getByLabel("Language", { exact: true })).toBeFocused();
});

test("optional audio loads on request and a missing module leaves itinerary editing usable", async ({ page }) => {
  let guideRequests = 0; page.on("request", request => { if (request.url().includes("AudioGuidePlayer")) guideRequests++; });
  await prepare(page); expect(guideRequests).toBe(0);
  await page.route("**/AudioGuidePlayer*", route => route.abort()); await tools(page); expect(guideRequests).toBe(0);
  const itinerary = page.locator("#itinerary"), toggle = itinerary.locator(".simple-audio-journal > summary");
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(itinerary.getByRole("status").filter({ hasText: "audio guide couldn't open" })).toBeVisible();
  await expect(toggle).toBeFocused(); expect(guideRequests).toBeGreaterThan(0);
  const editor = await settings(page); await editor.getByLabel("하루 시작", { exact: true }).fill("10:30");
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  expect((await records(page)).schedule.dayStartTime).toBe("10:30");
  expect((await records(page)).ids).toEqual(["1001", "1002"]);
});

test("an audio playback rejection offers the original transcript without an unhandled error", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = async () => { throw new DOMException("Playback blocked", "NotAllowedError"); }; });
  await page.route("https://wave.test/audio-guide.mp3", route => route.fulfill({ status: 200, contentType: "audio/mpeg", body: "" }));
  await prepare(page, { audio: { title: "관광지", audioTitle: "공식 음성 해설", audioUrl: "https://wave.test/audio-guide.mp3", script: "관광지 해설 원문입니다.", playTime: "60" } });
  await tools(page); await page.locator(".simple-audio-journal > summary").click();
  const audio = page.getByRole("complementary", { name: "Place audio guide", exact: true });
  await audio.getByRole("button", { name: "Play", exact: true }).click();
  await expect(audio.getByRole("alert")).toContainText("Audio couldn't play");
  await expect(audio.locator(".guide-top")).toContainText("Playback unavailable");
  await expect(audio.locator(".transcript")).toHaveAttribute("lang", "ko");
  await expect(audio.locator(".transcript")).toHaveText("관광지 해설 원문입니다.");
  expect(await language(audio.getByRole("alert"))).toBe("en");
  await expect(audio.getByRole("button", { name: "Play", exact: true })).toBeFocused(); expect(errors).toEqual([]);
});

test("an empty itinerary does not load the editor and a missing editor module is explained", async ({ page }) => {
  let editorRequests = 0; page.on("request", request => { if (request.url().includes("PlannerItineraryBoard")) editorRequests++; });
  await setup(page);
  await expect(page.locator(".simple-planner-tabs button").nth(1)).toBeDisabled(); expect(editorRequests).toBe(0);
  await page.route("**/PlannerItineraryBoard*", route => route.abort());
  await page.getByRole("button", { name: "경남도립미술관 add to itinerary", exact: true }).click(); expect(editorRequests).toBe(0);
  await openItinerary(page);
  await expect(page.locator("#itinerary").getByRole("status").filter({ hasText: "itinerary editor couldn't open" })).toBeVisible();
  expect(editorRequests).toBeGreaterThan(0);
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: "여행지 찾기", exact: true }).click();
  const remove = page.getByRole("button", { name: "경남도립미술관 added · remove from itinerary", exact: true });
  await expect(remove).toBeEnabled(); await remove.click(); expect((await records(page)).ids).toEqual([]);
});
