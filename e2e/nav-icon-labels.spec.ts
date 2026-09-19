import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

const LABELS = ["서비스 소개", "여행 설계", "축제", "커뮤니티"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
});

test("네 메뉴는 그림과 글자를 함께 보여주고 접근 가능한 이름은 글자 그대로다", async ({ page }) => {
  await page.goto("/");
  const links = page.locator(".wave-header nav a");
  await expect(links).toHaveCount(4);
  await expect(links).toHaveText(LABELS);

  for (const [index, label] of LABELS.entries()) {
    const link = links.nth(index);
    // 그림과 글자가 함께 있다. 글자를 그림으로 대체하지 않는다.
    await expect(link.locator("svg")).toHaveCount(1);
    await expect(link.locator("svg")).toBeVisible();
    await expect(link.locator("span")).toHaveText(label);
    // 접근 가능한 이름은 글자에서만 나온다. 그림은 장식이다.
    await expect(link).toHaveAccessibleName(label);
    await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
  }
});

test("그림은 별도 초점 대상이 아니고 현재 항목만 aria-current를 가진다", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator(".wave-header nav");
  // 그림 추가로 초점 대상이 늘지 않는다. 링크 네 개가 전부다.
  expect(await nav.locator("a, button, [tabindex]:not([tabindex='-1'])").count()).toBe(4);
  expect(await nav.locator("svg[tabindex], svg[role='img'], svg a").count()).toBe(0);

  await expect(nav.locator("a[aria-current='page']")).toHaveCount(1);
  await expect(nav.locator("a[aria-current='page']")).toHaveAccessibleName("서비스 소개");

  for (const label of LABELS) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await link.focus();
    await expect(link).toBeFocused();
  }
});

for (const width of [390, 320]) {
  test(`${width}px 세로 배치에서도 이름이 같고 44px 조작 영역과 넘침 0을 지킨다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const links = page.locator(".wave-header nav a");
    await expect(links).toHaveCount(4);

    for (const [index, label] of LABELS.entries()) {
      const link = links.nth(index);
      await expect(link).toHaveAccessibleName(label);
      await expect(link.locator("svg")).toBeVisible();
      await expect(link.locator("span")).toHaveText(label);
      const box = await link.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      // 좁은 화면에서는 그림이 글자 위에 온다.
      const icon = await link.locator("svg").boundingBox();
      const text = await link.locator("span").boundingBox();
      expect(icon!.y + icon!.height).toBeLessThanOrEqual(text!.y + 1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("메뉴에 axe 위반이 없다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".wave-header nav a")).toHaveCount(4);
  expect((await new AxeBuilder({ page }).include(".wave-header").analyze()).violations).toEqual([]);
});
