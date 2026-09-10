import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const id = "12345678-1234-4123-8123-123456789012";
const payload = { version: 1, title: "통영에서 함께", region: "통영", travelStart: "2026-09-20", travelEnd: "2026-09-21", dayStartTime: "10:00", themes: ["nature"], placeIds: ["123456", "654321"], scheduleAssignments: { "123456": "2026-09-20", "654321": "2026-09-21" }, note: "첫날 바닷가", status: "planned" };
async function signedIn(page: Page) {
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: { user: { id: "owner", name: "여행자", email: "owner@example.com" }, session: { id: "session" } } }));
}
test("account travel edits remain visible on conflict and can be preserved as a separate trip", async ({ page }) => {
  await signedIn(page);
  const detail = { id, payload, role: "owner", revision: 1, updatedAt: Date.now(), members: [], votes: [], comments: [], invitationActive: false };
  let saved = false;
  await page.route("**/api/account/travel**", async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.pathname.endsWith("/places")) return route.fulfill({ json: { places: [], missing: 2 } });
    if (request.method() === "GET") return route.fulfill({ json: detail });
    if (url.pathname.endsWith(id)) return route.fulfill({ status: 409, json: { error: "다른 화면에서 수정한 여행이 있습니다." } });
    saved = request.postDataJSON().payload.title === "내 수정한 통영 여행";
    return route.fulfill({ status: 201, json: { ...detail, id: "87654321-1234-4123-8123-123456789012", payload: request.postDataJSON().payload } });
  });
  await page.goto(`/my-trips/${id}`);
  await expect(page.getByLabel("여행 이름", { exact: true })).toHaveValue(payload.title);
  await page.getByLabel("여행 이름", { exact: true }).fill("내 수정한 통영 여행");
  await page.getByRole("button", { name: "변경 사항 저장", exact: true }).click();
  await expect(page.getByRole("heading", { name: "다른 화면의 수정본과 내 수정본이 달라요." })).toBeVisible();
  await expect(page.getByLabel("여행 이름", { exact: true })).toHaveValue("내 수정한 통영 여행");
  expect((await new AxeBuilder({ page }).include("#account-travel").analyze()).violations).toEqual([]);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`account-travel-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "내 수정본을 새 여행으로 저장" }).click();
  await expect(page).toHaveURL(/87654321-1234-4123-8123-123456789012/);
  expect(saved).toBe(true);
});
test("invited member explicitly joins after login; invite token stays out of navigation URLs", async ({ page }) => {
  await signedIn(page);
  let joined = false;
  await page.route("**/api/account/travel/**", async route => {
    if (route.request().url().endsWith("/places")) return route.fulfill({ json: { places: [], missing: 2 } });
    if (route.request().url().endsWith("/join")) { joined = route.request().postDataJSON().token === "a".repeat(64) && route.request().postDataJSON().name === "동행자"; return route.fulfill({ json: { id } }); }
    return route.fulfill({ json: { id, payload, role: "member", revision: 1, updatedAt: Date.now(), members: [{ userId: "owner", name: "동행자" }], votes: [], comments: [], invitationActive: true } });
  });
  await page.goto(`/join-trip/${id}#token=${"a".repeat(64)}`);
  await expect(page.getByLabel("동행자에게 표시할 이름")).toBeVisible();
  await expect(page).not.toHaveURL(/token=/);
  expect(joined).toBe(false);
  await page.getByLabel("동행자에게 표시할 이름").fill("동행자");
  await page.getByRole("button", { name: "여행에 참여하기", exact: true }).click();
  await expect(page).toHaveURL(`/my-trips/${id}`);
  expect(joined).toBe(true);
  await expect(page.getByLabel("여행 이름", { exact: true })).toHaveCount(0);
});
test("signed-out account travel remains private and help explains real entry points", async ({ page }) => {
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: null }));
  let privateRequests = 0;
  await page.route("**/api/account/travel**", route => { privateRequests++; return route.fulfill({ status: 401, json: { error: "로그인이 필요합니다." } }); });
  await page.goto("/my-trips");
  await expect(page.getByRole("link", { name: "로그인하고 이어가기" })).toBeVisible();
  expect(privateRequests).toBe(0);
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: "01. 내 여행을 여러 기기에서 이어가기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "03. 동행자와 함께 계획하기" })).toBeVisible();
  expect((await new AxeBuilder({ page }).include("#account-travel").analyze()).violations).toEqual([]);
});
