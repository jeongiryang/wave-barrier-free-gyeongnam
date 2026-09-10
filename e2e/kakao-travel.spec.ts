import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const origin = "https://wave-barrier-free-gyeongnam.vercel.app";
const id = "12345678-1234-4123-8123-123456789012";
const payload = { version: 1, title: "통영 하루 여행", region: "통영", travelStart: "2026-09-20", travelEnd: "2026-09-20", dayStartTime: "10:00", themes: ["nature"], placeIds: ["1001"], scheduleAssignments: { "1001": "2026-09-20" }, note: "비공개 메모", status: "planned" };
async function accountFixture(page: Page) {
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: { user: { id: "owner", name: "여행자" }, session: { id: "session" } } }));
  await page.route("**/api/account/travel/**", route => route.fulfill({ json: route.request().url().endsWith("/places") ? { places: [{ id: "1001", name: "통영 여행지", address: "경남 통영시", source: "한국관광공사" }], missing: 0 } : { id, payload, role: "owner", revision: 1, updatedAt: Date.now(), members: [], votes: [], comments: [], invitationActive: false } }));
}
test("Kakao card prepares a private-field-free public snapshot then opens the picker only on click", async ({ page, baseURL }) => {
  // Serve the local implementation under the registered origin; no requests reach Production.
  await page.route(`${origin}/**`, async route => { const url = new URL(route.request().url()); const local = new URL(baseURL!); const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}`, headers: { ...route.request().headers(), host: local.host, origin: local.origin, referer: `${local.origin}/` } }); await route.fulfill({ response }); });
  await accountFixture(page);
  await page.addInitScript(() => { (window as unknown as { __cards: unknown[] }).__cards = []; window.Kakao = { init: () => {}, isInitialized: () => true, Share: { sendDefault: card => { (window as unknown as { __cards: unknown[] }).__cards.push(card); } } }; });
  await page.route("**/api/kakao/share", route => route.fulfill({ json: { javascriptKey: "a".repeat(32) } }));
  let snapshots = 0;
  await page.route("**/api/trips", route => {
    snapshots++; const body = route.request().postDataJSON(); expect(body.selections.profiles).toEqual([]); expect(body.origin).toEqual({ label: "" }); expect(JSON.stringify(body)).not.toContain("비공개 메모");
    return route.fulfill({ status: 201, json: { url: `${origin}/trip/abcdef123456` } });
  });
  await page.goto(`${origin}/my-trips/${id}`);
  expect(snapshots).toBe(0);
  await page.getByRole("button", { name: "카카오톡 여행 카드 만들기" }).click();
  await expect(page.getByRole("button", { name: "카카오톡으로 공유", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { __cards: unknown[] }).__cards.length)).toBe(0);
  await page.getByRole("button", { name: "카카오톡으로 공유", exact: true }).click();
  const cards = await page.evaluate(() => (window as unknown as { __cards: { content: { link: { webUrl: string } } }[] }).__cards);
  expect(cards[0].content.link.webUrl).toBe(`${origin}/trip/abcdef123456`); expect(snapshots).toBe(1);
  await page.getByRole("button", { name: "카카오톡 여행 카드 만들기" }).click(); expect(snapshots).toBe(1);
  expect((await new AxeBuilder({ page }).include("#account-travel").analyze()).violations).toEqual([]);
});
test("self-chat requires explicit consent and send; taxi link never claims a booking", async ({ page }) => {
  await accountFixture(page);
  let sends = 0, grants = 0;
  await page.route("**/api/kakao/message", route => { sends++; expect(route.request().postDataJSON()).toEqual({ tripId: id }); return route.fulfill({ status: sends === 1 ? 403 : 200, json: sends === 1 ? { code: "CONSENT_REQUIRED", error: "카카오 메시지 동의가 필요합니다." } : { ok: true } }); });
  await page.route("**/api/auth/link-social", route => { grants++; expect(route.request().postDataJSON().scopes).toEqual(["talk_message"]); return route.fulfill({ json: { redirect: false, url: "" } }); });
  await page.goto(`/my-trips/${id}`);
  await expect(page.getByRole("link", { name: "카카오 T 열기 ↗" })).toHaveAttribute("href", "https://service.kakaomobility.com/launch/kakaot/?ref=KM_homepage_a");
  expect(sends).toBe(0);
  await page.getByRole("button", { name: "카카오톡 나에게 보내기", exact: true }).click();
  await page.getByRole("button", { name: "카카오 메시지 전송 동의하기" }).click();
  expect(grants).toBe(1); expect(sends).toBe(1);
  await page.getByRole("button", { name: "카카오톡 나에게 보내기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "나와의 채팅으로 보냈어요" })).toBeVisible();
  for (const width of [1440, 960, 390]) { await page.setViewportSize({ width, height: 960 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await page.screenshot({ path: test.info().outputPath(`kakao-travel-${width}.png`), fullPage: true }); }
});
