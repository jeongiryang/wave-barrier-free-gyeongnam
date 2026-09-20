import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

const toneControl = "[data-preference='tone']";

async function openPreferences(page: import("@playwright/test").Page) {
  await openSupportMenu(page);
  const details = page.locator(".preference-controls");
  await expect(details).toHaveAttribute("aria-busy", "false");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  return details;
}

test("화면 말투는 표준말이 기본이고 설정에서 경남 말을 고를 수 있다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");
  await expect(page.locator("html")).toHaveAttribute("data-tone", "standard");
  const details = await openPreferences(page);
  await expect(details.locator(toneControl)).toContainText("표준말");
  await details.locator(toneControl).click();
  await expect(page.locator("html")).toHaveAttribute("data-tone", "gyeongnam");
  await expect(details.locator(toneControl)).toContainText("경남 말");
  // 같은 기기의 같은 브라우저에서만 유지된다.
  expect(await page.evaluate(() => localStorage.getItem("wave-tone-v1"))).toBe("gyeongnam");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tone", "gyeongnam");
  expect(errors).toEqual([]);
});

test("말투를 바꿔도 버튼·메뉴 이름과 오류 문구가 바뀌지 않는다", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  const sessionReady = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/get-session");
  await page.goto("/planner");
  await (await sessionReady).finished();
  // The header's lazy fallback contains spans. Compare only after its real
  // anonymous-session links mount, so loading is not mistaken for a tone edit.
  await expect(page.locator("a.night-login")).toHaveAttribute("href", "/login?next=%2Fplanner");
  await expect(page.locator("a.night-signup")).toHaveAttribute("href", "/register?next=%2Fplanner");
  // 말투 설정 자체는 현재 값을 읽어 주므로 비교에서 제외한다. 사투리로 적히지는 않는다.
  const names = async () => page.locator("main button:not([data-preference]), main a, header button:not([data-preference]), header a").evaluateAll(nodes => nodes.map(node => (node.getAttribute("aria-label") || node.textContent || "").trim()));
  // 설정 패널을 연 같은 상태에서 두 번 읽어, 패널 자체의 열림 여부가 비교에 섞이지 않게 한다.
  const details = await openPreferences(page);
  const standardNames = await names();
  await details.locator(toneControl).click();
  await expect(page.locator("html")).toHaveAttribute("data-tone", "gyeongnam");
  const dialectNames = await names();
  expect(dialectNames).toEqual(standardNames);
});

test("두 말투 모두 390·960·1440px에서 가로 넘침이 없고 axe 위반이 없다", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");
  for (const expected of ["standard", "gyeongnam"] as const) {
    if (expected === "gyeongnam") {
      const details = await openPreferences(page);
      await details.locator(toneControl).click();
      await page.keyboard.press("Escape");
    }
    await expect(page.locator("html")).toHaveAttribute("data-tone", expected);
    for (const width of [390, 960, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${expected} 말투 ${width}px 가로 넘침`).toBeLessThanOrEqual(1);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`tone-${expected}-${width}.png`) });
    }
  }
});

test("저장소를 읽지 못해도 표준말로 조용히 동작한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // 말투 키에만 예외를 던져, 다른 기능의 저장소 사용과 섞이지 않게 한다.
  await page.addInitScript(() => {
    const real = window.localStorage;
    const guard = (name: "getItem" | "setItem" | "removeItem") => (key: string, value?: string) => {
      if (key === "wave-tone-v1") throw new Error("storage blocked");
      return (real[name] as (key: string, value?: string) => string | null).call(real, key, value as string);
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => ({ ...real, getItem: guard("getItem"), setItem: guard("setItem"), removeItem: guard("removeItem"), key: (index: number) => real.key(index), get length() { return real.length; } }),
    });
  });
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-tone", "standard");
  expect(errors).toEqual([]);
});
