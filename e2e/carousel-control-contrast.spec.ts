import { expect, test, type Locator } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

async function contrast(button: Locator) {
  return button.evaluate(element => {
    const luminance = (value: string) => {
      const rgb = (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(channel => {
        const s = channel / 255;
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const style = getComputedStyle(element);
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
  });
}

for (const locale of ["ko", "en"] as const) for (const theme of ["light", "dark"] as const) {
  test(locale + " " + theme + " photo result has one readable add control and predictable keyboard focus", async ({ page }) => {
    const en = locale === "en";
    await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 320 : 1366, height: 768 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await mockPlannerApi(page, { preserveView: true });
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem("wave-locale", locale);
      localStorage.setItem("wave-theme", theme);
    }, { locale, theme });
    await page.goto("/planner");
    const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
    await expect(region).toBeEnabled();
    await region.selectOption("창원");
    const rows = page.locator(".simple-place-row");
    await expect(rows).toHaveCount(2);
    const row = rows.first();
    const photo = row.getByRole("button", { name: en ? "경남도립미술관 details" : "경남도립미술관 상세 보기", exact: true });
    const title = row.getByRole("button", { name: "경남도립미술관", exact: true });
    const add = row.locator(".simple-place-add");
    await expect(add).toHaveCount(1);
    await expect(add).toHaveAccessibleName(en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기");
    for (const control of [photo, title, add]) {
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
      const size = await control.boundingBox();
      expect(size?.width).toBeGreaterThanOrEqual(44);
      expect(size?.height).toBeGreaterThanOrEqual(44);
    }
    const initialContrast = await contrast(add);
    expect(initialContrast).toBeGreaterThanOrEqual(4.5);
    await photo.focus();
    await photo.press("Tab");
    await expect(title).toBeFocused();
    await title.press("Tab");
    await expect(add).toBeFocused();
    expect(await add.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
    const beforeUrl = page.url();
    await add.press("Enter");
    await expect(add).toBeFocused();
    await expect(add).toHaveAttribute("aria-pressed", "true");
    await expect(add).toHaveAccessibleName(en ? "경남도립미술관 added · undo" : "경남도립미술관 담았음 · 되돌리기");
    await expect(page.locator(".simple-results")).toBeVisible();
    expect(page.url()).toBe(beforeUrl);
    await expect.poll(() => page.evaluate(() => {
      const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
      const schedule = JSON.parse(values["wave-trip-schedule-v1"] || "{}");
      return { ids: JSON.parse(values["wave-saved-places"] || "[]"), dates: [schedule.travelStart, schedule.travelEnd], assignments: schedule.scheduleAssignments };
    })).toEqual({ ids: ["1001"], dates: ["", ""], assignments: {} });
    expect(await contrast(add)).toBeGreaterThanOrEqual(4.5);
    await add.hover();
    await expect.poll(() => contrast(add)).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await test.info().attach("control-contrast", {
      body: Buffer.from(JSON.stringify({ locale, theme, initial: initialContrast, addedHover: await contrast(add) })),
      contentType: "application/json",
    });
    await page.screenshot({ path: test.info().outputPath("result-" + locale + "-" + theme + ".png") });
    const nextAdd = rows.last().locator(".simple-place-add");
    await nextAdd.scrollIntoViewIfNeeded();
    const hit = await nextAdd.evaluate(element => {
      const box = element.getBoundingClientRect();
      const covering = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { reachable: element.contains(covering), covering: covering?.closest("button")?.getAttribute("aria-label") || covering?.tagName, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
    });
    await test.info().attach("next-add-hit-target", { body: Buffer.from(JSON.stringify(hit)), contentType: "application/json" });
    expect(hit.reachable, "the visible add action must not be covered by the Naru launcher: " + hit.covering).toBe(true);
    const launcher = page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true });
    await expect(launcher).toBeVisible();
    const launcherBox = (await launcher.boundingBox())!;
    expect(launcherBox.width).toBeGreaterThanOrEqual(44);
    expect(launcherBox.height).toBeGreaterThanOrEqual(44);
    expect(await launcher.evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
  });
}
