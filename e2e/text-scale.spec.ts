import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openSupportMenu } from "./support-menu";
import { expectNoOverflow } from "./landing-contract";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary, showItineraryMap } from "./fixtures";

const STORAGE_KEY = "wave-text-scale-v1";

/** 저시력 사용자는 첫 그리기부터 큰 글자를 본다. 부팅 스크립트 경로를 그대로 쓴다. */
async function startAt(page: Page, scale: "standard" | "large" | "larger") {
  await page.addInitScript(([key, value]) => {
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
    // 새로고침 뒤 유지 검사를 위해 부팅 스크립트가 읽는 값을 덮어쓰지 않는다.
    if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
  }, [STORAGE_KEY, scale] as const);
}

async function mockEverything(page: Page) {
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.route("**/api/community/posts**", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
}

async function openPreferences(page: Page) {
  await openSupportMenu(page);
  const preferences = page.locator(".preference-controls:visible");
  await expect(preferences).toHaveAttribute("aria-busy", "false");
  await preferences.getByLabel("환경설정 열기", { exact: true }).click();
  await expect(preferences.locator(".preference-panel")).toBeVisible();
  return preferences;
}

test("글자 크기 세 단계가 즉시 반영되고 새로고침 뒤에도 유지된다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockEverything(page);
  await startAt(page, "standard");
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "standard");

  const preferences = await openPreferences(page);
  const group = preferences.getByRole("radiogroup", { name: "글자 크기", exact: true });
  await expect(group.getByRole("radio")).toHaveCount(3);
  await expect(group).toContainText("기본");
  await expect(group).toContainText("16px");
  await expect(group).toContainText("18px");
  await expect(group).toContainText("20px");

  const rootSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await rootSize()).toBeCloseTo(16, 1);

  await group.getByRole("radio", { name: /크게/ }).first().check();
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "large");
  expect(await rootSize()).toBeCloseTo(18, 1);
  // 변경 사실은 색이 아니라 문구로도 전달된다.
  await expect(preferences.locator(".preference-text-scale [aria-live='polite']")).toHaveText("글자 크기를 크게로 바꿨어요.");

  await group.getByRole("radio", { name: /아주 크게/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");
  expect(await rootSize()).toBeCloseTo(20, 1);
  await expect(preferences.locator(".preference-text-scale [aria-live='polite']")).toHaveText("글자 크기를 아주 크게로 바꿨어요.");

  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe("larger");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");
  expect(await rootSize()).toBeCloseTo(20, 1);
});

test("글자 크기 radiogroup은 키보드만으로 조작되고 axe 위반이 없다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockEverything(page);
  await startAt(page, "standard");
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  const preferences = await openPreferences(page);
  const group = preferences.getByRole("radiogroup", { name: "글자 크기", exact: true });

  const standard = group.getByRole("radio").first();
  await standard.focus();
  await expect(standard).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "large");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "large");
  await expect(group.getByRole("radio", { name: /크게/ }).first()).toBeFocused();

  // 초점 표시는 커진 글자에서도 화면 안에 남아야 한다.
  await expect(group.getByRole("radio", { name: /크게/ }).first()).toBeInViewport();
  expect((await new AxeBuilder({ page }).include(".preference-controls").analyze()).violations).toEqual([]);
});

test("저장소가 막혀도 글자 크기는 기본값으로 동작하고 오류를 띄우지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockEverything(page);
  await page.addInitScript(() => {
    const blocked = () => { throw new DOMException("blocked", "SecurityError"); };
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => ({ getItem: blocked, setItem: blocked, removeItem: blocked }) });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  const preferences = await openPreferences(page);
  const group = preferences.getByRole("radiogroup", { name: "글자 크기", exact: true });
  await group.getByRole("radio", { name: /아주 크게/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(20, 1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors, "저장소 차단이 오류로 새어 나오면 안 된다").toEqual([]);
});

const SCREENS = ["/", "/planner", "/festivals", "/community", "/travel-book", "/guide"];

for (const width of [390, 960, 1440]) {
  test(`아주 크게 상태에서 ${width}px 주요 화면에 가로 넘침이 없다`, async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockEverything(page);
    await startAt(page, "larger");
    for (const path of SCREENS) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");
      await expect(page.locator(".preference-controls").first()).toHaveAttribute("aria-busy", "false");
      await expectNoOverflow(page);
    }

    // 장소 상세 dialog와 지도 도구 패널도 같은 배율에서 넘치지 않아야 한다.
    await page.goto("/planner", { waitUntil: "domcontentloaded" });
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
    await expect(page.locator(".native-place-dialog")).toBeVisible();
    await expectNoOverflow(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
    await openItinerary(page);
    await showItineraryMap(page);
    const commandBar = page.locator("nav.map-command-bar");
    await commandBar.scrollIntoViewIfNeeded();
    await commandBar.getByRole("button", { name: "지도 도구", exact: true }).click();
    await expect(commandBar.getByRole("button", { name: "◎ 편의 표시", exact: true })).toBeVisible();
    await expect(commandBar.locator(".map-advanced-controls")).toBeVisible();
    await expectNoOverflow(page);
    // 도구 버튼은 배율이 올라가도 자기 도구 막대 안에 남는다.
    expect(await commandBar.evaluate(node => [...node.querySelectorAll("button")].every(button => {
      const box = node.getBoundingClientRect(), rect = button.getBoundingClientRect();
      return rect.left >= box.left - 1 && rect.right <= box.right + 1;
    }))).toBe(true);
  });
}

test("아주 크게 상태에서 조작 영역 44px 기준을 지킨다", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockEverything(page);
  await startAt(page, "larger");
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");

  const preferences = await openPreferences(page);
  const sizes = await preferences.getByRole("radio").evaluateAll(nodes => nodes.map(node => {
    const rect = (node.closest("label") as HTMLElement).getBoundingClientRect();
    return { text: node.closest("label")?.textContent?.trim() || "radio", width: rect.width, height: rect.height };
  }));
  expect(sizes).toHaveLength(3);
  for (const size of sizes) {
    expect(size.height, `${size.text} 높이`).toBeGreaterThanOrEqual(44);
    expect(size.width, `${size.text} 너비`).toBeGreaterThanOrEqual(44);
  }
  await expectNoOverflow(page);
  await page.keyboard.press("Escape");

  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page);
  await showItineraryMap(page);
  const commandBar = page.locator("nav.map-command-bar");
  await commandBar.scrollIntoViewIfNeeded();
  await commandBar.getByRole("button", { name: "지도 도구", exact: true }).click();
  const toolSizes = await commandBar.getByRole("button").evaluateAll(nodes => nodes.map(node => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return { text: node.textContent?.trim() || "button", width: rect.width, height: rect.height };
  }));
  expect(toolSizes.length).toBeGreaterThan(4);
  await expect(commandBar.getByRole("button", { name: "◎ 편의 표시", exact: true })).toBeVisible();
  for (const size of toolSizes) {
    expect(size.height, `${size.text} 높이`).toBeGreaterThanOrEqual(44);
    expect(size.width, `${size.text} 너비`).toBeGreaterThanOrEqual(44);
  }
});

test("아주 크게 + 390px에서 지역 고르기부터 저장까지 끝까지 간다", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockEverything(page);
  await startAt(page, "larger");
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "larger");

  await chooseTripConditions(page);
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page);
  await expect(page.locator("#itinerary")).toBeVisible();
  await expectNoOverflow(page);
  // 저장은 기기 안의 현재 여행 상태로 이뤄진다. 배율 값은 함께 저장하지 않는다.
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("wave-current-trip")))).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage).includes("textScale"))).toBe(false);
});

