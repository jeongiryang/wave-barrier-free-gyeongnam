import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPlannerApi, mockPublicShellApi, plan } from "./fixtures";

const savedIds = (page: Page) => page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"] || "[]"));

async function prepare(page: Page, en = false) {
  await mockPlannerApi(page, { plannerView: "overview" });
  await mockPublicShellApi(page);
  await page.addInitScript(value => localStorage.setItem("wave-locale", value ? "en" : "ko"), en);
  const image = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://wave.test/museum.svg", route => route.fulfill({ contentType: "image/webp", body: image }));
  await page.route("**/api/community/posts?*", route => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: {
    ...plan, criteria: { facilityKeys: ["route"] }, places: [{ ...plan.places[0], knownFields: 99, unknownFields: 98, negativeFields: 97,
      accessibility: [
        { key: "elevator", label: "승강기", state: "negative", detail: "승강기 없음" },
        { key: "restroom", label: "화장실", state: "unknown", detail: "" },
        { key: "route", label: "접근로", state: "confirmed", detail: "출입구까지 턱이 없음" },
      ],
    }],
  } }));
  await page.goto("/planner");
  // Route is the only selected requirement. Unselected negative/unknown fields
  // remain intact, while aggregate counts deliberately conflict with evidence.
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.locator(".simple-facility-trigger").click();
  const facilities = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await facilities.getByRole("checkbox", { name: "접근로", exact: true }).check();
  const searched = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan" && url.searchParams.get("facilityKeys") === "route";
  });
  await facilities.getByRole("button", { name: /^적용/ }).click();
  await (await searched).finished();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  const trigger = page.getByRole("button", { name: en ? "경남도립미술관 details" : "경남도립미술관 상세 보기", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toBeFocused();
  return trigger;
}

test('Odii 해설은 소리·전체 대본·원문 기반 쉬운 설명을 한 자리에서 바꾼다', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/wave?action=place-audio*', route => {
    const id = new URL(route.request().url()).searchParams.get('contentId') || '';
    requests.push(id);
    return route.fulfill({ json: { checkedAt: '2026-09-14T01:00:00.000Z', stories: [{
      id: 'odii-1', title: '경남도립미술관', audioTitle: '미술관 이야기', audioUrl: '', playTime: '0',
      script: '첫 번째 공식 문장입니다. 두 번째 공식 문장입니다. 세 번째 공식 문장입니다.',
    }] } });
  });
  await prepare(page);
  const dialog = page.getByRole('dialog');
  const guide = dialog.locator('.place-audio-guide');
  await guide.locator(':scope > summary').click();
  await expect(guide.getByRole('button', { name: '소리로 듣기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => requests).toEqual(['1001']);
  await guide.getByRole('button', { name: '대본 읽기', exact: true }).click();
  await expect(guide.getByRole('region', { name: '미술관 이야기 전체 대본', exact: true })).toHaveText('첫 번째 공식 문장입니다. 두 번째 공식 문장입니다. 세 번째 공식 문장입니다.');
  await guide.getByRole('button', { name: '쉬운 설명', exact: true }).click();
  const easy = guide.getByRole('region', { name: '미술관 이야기 핵심 문장', exact: true });
  await expect(easy.getByRole('listitem')).toHaveText(['첫 번째 공식 문장입니다.', '두 번째 공식 문장입니다.', '세 번째 공식 문장입니다.']);
  await expect(easy).toContainText('새로운 사실을 덧붙이지 않습니다.');
  expect(requests).toEqual(['1001']);
});

for (const en of [false, true]) for (const theme of ["light", "dark"]) {
  test(`detail puts the trip action before grouped, unmodified evidence ${en ? "en" : "ko"} ${theme}`, async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
    const trigger = await prepare(page, en);
    const dialog = page.getByRole("dialog");
    const add = dialog.getByRole("button", { name: en ? "Add to itinerary" : "일정에 추가", exact: true });
    await expect(add).toBeEnabled();
    await expect(add).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Tab");
    if (!isMobile) {
      // The desktop details are a nonmodal side pane: natural DOM order takes
      // the focused heading directly to Add; reverse Tab still reaches Close.
      await expect(add).toBeFocused();
      await page.keyboard.press("Shift+Tab");
    }
    await expect(dialog.getByRole("button", { name: en ? "Close" : "닫기", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(add).toBeFocused();
    await expect(add).toBeInViewport();
    expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await expect(dialog.locator(".evidence-counts")).toHaveText(en ? "Reported available 1Not reported 1Reported unavailable 1" : "확인됨 1미확인 1불일치 1");
    await expect(dialog.locator(".place-decision-summary h3")).toHaveText(en ? [
      "Facilities in the official record 1", "Facilities to check before visiting 1", "Facilities reported unavailable 1",
    ] : ["공식 기록에 있는 편의 1", "방문 전 확인할 편의 1", "제공되지 않는 것으로 기록된 편의 1"]);
    await expect(dialog.locator('.facility-evidence-list [data-state="confirmed"] dd')).toHaveText("출입구까지 턱이 없음");
    await expect(dialog.locator('.facility-evidence-list [data-state="unknown"] dd')).toHaveText(en ? "No information supplied. Please check with the venue." : "제공된 정보가 없습니다. 시설에 직접 확인해 주세요.");
    await expect(dialog.locator('.facility-evidence-list [data-state="negative"] dd')).toHaveText("승강기 없음");
    await expect(dialog.locator(".modal-visual > span")).toHaveAttribute("lang", "ko");
    // Theme colors can change; legibility is verified against their actual
    // surface by axe rather than by pinning the old light-only palette.
    expect(await dialog.locator(".modal-body > button").evaluate(button => Boolean(button.compareDocumentPosition(document.querySelector(".place-decision-summary")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`detail-${en ? "en" : "ko"}-${theme}.png`) });
    if (!en && theme === "light" && test.info().project.name === "desktop-chromium") {
      await page.setViewportSize({ width: 960, height: 960 });
      await add.focus();
      await expect(add).toBeInViewport();
      await page.screenshot({ path: test.info().outputPath("detail-960.png") });
    }
    expect(await dialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await add.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await savedIds(page)).toEqual(["1001"]);
    await trigger.click();
    const remove = dialog.getByRole("button", { name: en ? "Remove from itinerary" : "일정에서 빼기", exact: true });
    await expect(remove).toHaveAttribute("aria-pressed", "true");
    await remove.click();
    await expect(dialog).toHaveCount(0);
    expect(await savedIds(page)).toEqual([]);
    await trigger.click();
    await expect(add).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let newSearches = 0;
    await page.route("**/api/wave?action=plan*", async request => { newSearches++; await pending; return request.fallback(); });
    try {
      await page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button", { name: "자연·휴양", exact: true }).click();
      await expect.poll(() => newSearches).toBe(1);
      await trigger.click();
      await expect(add).toBeDisabled();
      await expect(dialog.getByText(en
        ? "Open a place from your current search before adding it. If your preferences or results changed, search again and reopen its details."
        : "현재 검색의 장소를 확인한 뒤 담을 수 있어요. 조건이나 검색 결과가 바뀌었다면 다시 찾아 이용 정보를 열어 주세요.", { exact: true })).toBeVisible();
      await expect(dialog.locator(".place-unknown-consent")).toHaveCount(0);
      expect(await savedIds(page)).toEqual([]);
    } finally { release(); }
    expect(errors).toEqual([]);
  });
}

test("a failed participation module leaves the primary trip action usable", async ({ page }) => {
  await page.route("**/features/planner/components/PlaceParticipationActions.tsx*", route => route.abort("failed"));
  await prepare(page);
  const dialog = page.getByRole("dialog");
  await dialog.locator('.place-visitor-records > summary').click();
  await expect(dialog.getByRole("alert")).toContainText("상세 화면을 불러오지 못했어요");
  await expect(dialog.locator('.facility-evidence-list [data-state="confirmed"] dd')).toHaveText("출입구까지 턱이 없음");
  await dialog.getByRole("button", { name: "일정에 추가", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await savedIds(page)).toEqual(["1001"]);
});
