import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi } from "./fixtures";

test.beforeEach(async ({ page }) => { await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done")); });

for (const width of [390, 1366]) test(`real region boundaries and the text alternative work at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  const region = page.locator(".region-picker");
  await region.scrollIntoViewIfNeeded();
  const shapes = region.locator("svg [data-region-boundary]");
  await expect(shapes).toHaveCount(18);
  const names = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  const list = region.getByRole("group", { name: "여행 지역 선택", exact: true });
  const buttons = list.getByRole("button");
  await expect(buttons).toHaveCount(19);
  for (const name of names) {
    const button = list.getByRole("button", { name, exact: true });
    await button.focus();
    await button.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(region.locator(`[data-region-boundary="${name}"]`)).toHaveAttribute("data-selected", "true");
    await expect(region.locator("svg text")).toHaveText(name);
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate((element) => { const b = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)); })).toBe(true);
  }
  await expect(region.getByText(/SGIS 2020/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).include(".region-picker").analyze()).violations).toEqual([]);
  await region.screenshot({ path: test.info().outputPath(`boundaries-${width}.png`) });
});

for (const theme of ["light", "dark"]) test(`English regions retain the same IDs and a readable ${theme} map`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((value) => { localStorage.setItem("wave-locale", "en"); localStorage.setItem("wave-theme", value); }, theme);
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  const section = page.locator(".region-picker");
  await section.scrollIntoViewIfNeeded();
  const list = section.getByRole("group", { name: "Choose a region", exact: true });
  await list.getByRole("button", { name: "Tongyeong", exact: true }).click();
  await expect(section.locator('[data-region-boundary="통영"]')).toHaveAttribute("data-selected", "true");
  await expect(section.locator("svg text")).toHaveText("Tongyeong");
  await expect(section.locator(".region-picker-visual > span")).toHaveText("SOUTH KOREA · SOUTHEAST");
  expect(await list.getByRole("button").evaluateAll((buttons) => buttons.every((button) => button.scrollWidth <= button.clientWidth + 1))).toBe(true);
  expect((await new AxeBuilder({ page }).include(".region-picker").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await section.screenshot({ path: test.info().outputPath(`boundaries-en-${theme}.png`) });
});

test("Landing loads no boundary module; actual Planner retains its inline map and text context", async ({ page }) => {
  await mockPlannerApi(page);
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.route("**/maps/korea-sgis-2020.svg", route => route.abort());
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await page.locator("#regions").scrollIntoViewIfNeeded();
  await expect(page.locator("#regions [data-region-boundary]")).toHaveCount(0);
  expect(requests.filter(url => /RegionBoundarySurface|korea-sgis-2020/.test(url))).toEqual([]);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await expect(page.locator(".region-picker [data-region-boundary]")).toHaveCount(18);
  await expect(page.locator(".region-picker-visual > span")).toHaveText("대한민국 남동쪽, 경상남도");
  await page.getByRole("group", { name: "여행 지역 선택", exact: true }).getByRole("button", { name: "김해", exact: true }).click();
  await expect(page.locator('[data-region-boundary="김해"]')).toHaveAttribute("data-selected", "true");
});

test("failed remote images cannot disable any region in the inline Planner map", async ({ page }) => {
  await mockPlannerApi(page);
  await page.route("**/*", route => route.request().resourceType() === "image" ? route.abort() : route.fallback());
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  const list = page.getByRole("group", { name: "여행 지역 선택", exact: true });
  await expect(list.getByRole("button")).toHaveCount(19);
  await expect(page.locator(".region-picker [data-region-boundary]")).toHaveCount(18);
  for (const name of ["통영", "거창", "김해"]) {
    const button = list.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`[data-region-boundary="${name}"]`)).toHaveAttribute("data-selected", "true");
  }
});

test("the actual polygon supports pointer preview and selection of coastal and inland regions", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await page.locator(".region-picker").scrollIntoViewIfNeeded();
  for (const name of ["거제", "진주", "김해"]) {
    const shape = page.locator(`[data-region-boundary="${name}"]`);
    await expect(shape).toBeVisible();
    await shape.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    const point = await shape.evaluate((node) => {
      const path = node as SVGGeometryElement, box = path.getBBox(), matrix = path.getScreenCTM();
      if (!matrix) return null;
      for (const y of [.5,.4,.6,.3,.7]) for (const x of [.5,.4,.6,.3,.7]) {
        const local = new DOMPoint(box.x+box.width*x,box.y+box.height*y);
        if (path.isPointInFill(local)) {
          const screen = local.matrixTransform(matrix);
          if (document.elementFromPoint(screen.x,screen.y) === path) return { x: screen.x, y: screen.y };
        }
      }
      return null;
    });
    expect(point).not.toBeNull();
    // Measure the fill geometry; Playwright's SVG box also includes the thicker highlight stroke.
    const beforePreview = await shape.evaluate((node) => node.getBoundingClientRect().y);
    await page.mouse.move(point!.x,point!.y);
    await expect(shape).toBeVisible();
    const afterPreview = await shape.evaluate((node) => node.getBoundingClientRect().y);
    expect(Math.abs(afterPreview - beforePreview), "preview must not scroll the pointer away from the region").toBeLessThanOrEqual(1);
    await page.mouse.click(point!.x,point!.y);
    await expect(shape).toHaveAttribute("data-selected", "true");
    await expect(page.locator(".region-picker-list").getByRole("button", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-pressed", "true");
  }
});
