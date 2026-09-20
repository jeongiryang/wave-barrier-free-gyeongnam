import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { openNaruTool, closeNaruTool, naruDialog } from './naru-tool-fixtures';
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

async function editStop(page: Page) {
  if (await naruDialog(page).isVisible()) await closeNaruTool(page);
  await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true });
  await editor.locator(".simple-stop-options > summary").click();
  return editor;
}
async function startTime(page: Page, value: string) {
  await closeNaruTool(page);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await editor.getByLabel("하루 시작", { exact: true }).fill(value);
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  await openNaruTool(page, "이동 부담·휴식");
}

test("fixed visits keep their date and order, and return deadlines follow the live schedule", async ({ page }, info) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [], shares: Array<Record<string, unknown>> = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/kakao/share", route => route.fulfill({ json: { javascriptKey: "" } }));
  await page.route("**/api/trips", route => {
    shares.push(route.request().postDataJSON().selections);
    return route.fulfill({ json: { id: "123456789abc", url: `${new URL(page.url()).origin}/trip/123456789abc`, revision: 1, expiresAt: Date.now() + 30 * 86_400_000 } });
  });
  await page.goto("/planner?travelStart=2026-09-14&travelEnd=2026-09-15"); await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 담기", exact: true }).click();
  await openItinerary(page);
  const board = page.locator("#itinerary");
  let editor = await editStop(page);
  await editor.getByLabel("경남도립미술관 장소 고정", { exact: true }).selectOption("event");
  await editor.getByLabel("경남도립미술관 고정 도착 시각", { exact: true }).fill("13:00");
  await expect(editor.getByRole("combobox", { name: "방문 날짜", exact: true })).toBeDisabled();
  await expect(editor.getByRole("button", { name: "일정에서 빼기", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  await expect(board.locator(".simple-stop > time").first()).toHaveText("13:00");
  await expect(board).toContainText("고정 시각 전");
  await expect(board.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동", exact: true })).toBeDisabled();
  await openNaruTool(page, "이동 부담·휴식");
  const deadline = page.locator(".day-deadline"), summary = deadline.locator("summary");
  await summary.click();
  await deadline.getByLabel("도착 마감 시각", { exact: true }).fill("18:00");
  await deadline.getByRole("button", { name: "적용", exact: true }).click();
  await expect(summary).toBeFocused();
  await expect(deadline).toContainText("귀가 이동시간 확인 필요");
  await summary.click();
  await deadline.getByLabel("마지막 장소부터 이동 (분, 선택)", { exact: true }).fill("721");
  await deadline.getByRole("button", { name: "적용", exact: true }).click();
  await expect(deadline.getByRole("alert")).toBeVisible();
  await deadline.getByLabel("마지막 장소부터 이동 (분, 선택)", { exact: true }).fill("30");
  await deadline.getByLabel("마지막 장소부터 이동 (분, 선택)", { exact: true }).press("Enter");
  await expect(deadline).toContainText("계획상");
  await startTime(page, "17:00");
  await expect(board).toContainText("도착 예상"); await expect(deadline).toContainText("초과 예상");
  await startTime(page, "10:00");
  await summary.click(); await deadline.getByLabel("도착 마감 시각", { exact: true }).fill("12:00");
  await deadline.getByLabel("도착 마감 시각", { exact: true }).press("Escape"); await expect(summary).toBeFocused();
  await expect(summary).toContainText("18:00");
  await closeNaruTool(page);
  await board.getByRole("button", { name: /^2일차/ }).click();
  await openNaruTool(page, "이동 부담·휴식");
  await expect(deadline.locator(".day-deadline-summary")).toHaveCount(0);
  await summary.click();
  await deadline.getByLabel("도착 마감 시각", { exact: true }).fill("20:00");
  await deadline.getByLabel("마지막 장소부터 이동 (분, 선택)", { exact: true }).fill("0");
  await deadline.getByRole("button", { name: "적용", exact: true }).click();
  await expect(summary).toContainText("20:00");
  await summary.click(); await deadline.getByRole("button", { name: "마감 해제", exact: true }).click();
  await closeNaruTool(page);
  await board.getByRole("button", { name: /^1일차/ }).click();
  for (const width of info.project.name.startsWith("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    editor = await editStop(page);
    await editor.getByLabel("경남도립미술관 장소 고정", { exact: true }).scrollIntoViewIfNeeded();
    await expect(editor.getByRole("combobox", { name: "방문 날짜", exact: true })).toBeDisabled();
    await expect(editor.getByRole("button", { name: "일정에서 빼기", exact: true })).toBeDisabled();
    await page.screenshot({ path: info.outputPath(`fixed-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".simple-stop-editor").analyze()).violations).toEqual([]);
    await editor.getByRole("button", { name: "취소", exact: true }).click();
  }
  await page.reload(); await expect(board.locator(".simple-stop > time").first()).toHaveText("13:00");
  await openNaruTool(page, "이동 부담·휴식"); await expect(deadline).toContainText("18:00");
  await closeNaruTool(page);
  await board.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await expect(board.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
  await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(board.locator(".simple-stop > time").first()).toHaveText("13:00");
  await openNaruTool(page, "이동 부담·휴식"); await expect(deadline).toContainText("18:00");
  await closeNaruTool(page);
  await page.getByRole("button", { name: "공유", exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
  const share = page.getByRole("dialog", { name: "여행 공유", exact: true });
  await expect(share.getByRole("link", { name: "공유 일정 보기", exact: true })).toBeVisible();
  expect(shares[0].fixedVisits).toEqual({ "1001": { kind: "event", time: "13:00", position: 0 } });
  expect(shares[0].dayDeadlines).toEqual({ "2026-09-14": { time: "18:00", returnMinutes: 30, bufferMinutes: 15 } });
  expect(shares[0].profiles).toEqual([]);
  await share.getByRole("button", { name: "공유 닫기", exact: true }).click();
  editor = await editStop(page);
  await editor.getByLabel("경남도립미술관 장소 고정", { exact: true }).selectOption("");
  await expect(editor.getByRole("combobox", { name: "방문 날짜", exact: true })).toBeEnabled();
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  await expect(board.locator(".simple-stop > time").first()).not.toHaveText("13:00");
  expect(errors).toEqual([]);
});
