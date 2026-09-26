import { openNaruTool } from './naru-tool-fixtures';
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions, openItinerary } from "./fixtures";

const MOBILE = { width: 390, height: 844 };

test("모바일 경남 18개 지역 사진은 44px 조작 영역과 선택 가능한 버튼 계약을 유지한다", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/planner");
  await page.getByRole("button", { name: "전체 18개 지역", exact: true }).click();

  const markers = page.locator(".simple-region-link");
  await expect(markers).toHaveCount(18);

  // 18개 전체의 크기·버튼 계약은 상호작용 전에 한 번에 읽는다. 지역 선택은 상세
  // 영역 이동과 React 재렌더를 동반하므로 한 페이지에서 18번 연속 actionability를
  // 검사하면 제품 크기와 무관한 DOM 교체 경쟁 조건이 생긴다.
  const markerState = await markers.evaluateAll((nodes) => nodes.map((node) => {
    const element = node as HTMLButtonElement;
    const rect = element.getBoundingClientRect();
    return {
      name: element.querySelector("h3")?.textContent?.trim() || "지역",
      width: rect.width,
      height: rect.height,
      tagName: element.tagName,
      type: element.type,
      disabled: element.disabled,
      label: element.getAttribute("aria-label") || element.textContent?.trim() || "",
    };
  }));

  expect(new Set(markerState.map((marker) => marker.name)).size).toBe(18);
  for (const marker of markerState) {
    expect(marker.width, `${marker.name} 표식 너비`).toBeGreaterThanOrEqual(44);
    expect(marker.height, `${marker.name} 표식 높이`).toBeGreaterThanOrEqual(44);
    expect(marker.tagName, `${marker.name} 표식 요소`).toBe("BUTTON");
    expect(marker.type, `${marker.name} 버튼 type`).toBe("button");
    expect(marker.disabled, `${marker.name} 표식 활성 상태`).toBe(false);
    expect(marker.label, `${marker.name} 접근 가능한 이름`).toContain(marker.name);
  }

  // Each photo uses the same button loop. Follow one actual pointer selection
  // into the selected region; the discovery gallery then leaves the screen.
  const representativeName = markerState[0].name;
  const search = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan" && url.searchParams.get("region") === representativeName;
  });
  await page.getByRole("button", { name: `${representativeName} 지역 선택`, exact: true }).click();
  await search;
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue(representativeName);
});

test("모바일 지도 기본·추가 도구는 44px 영역과 빠짐없는 접근 경로를 유지한다", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page);
  await page.getByRole("group", { name: "일정 보기 방식" }).getByRole("button", { name: "지도", exact: true }).click();

  const commandBar = page.locator("nav.map-command-bar");
  await commandBar.scrollIntoViewIfNeeded();
  await expect(commandBar).toBeVisible();

  await expect(commandBar.getByRole("button")).toHaveCount(4);
  const more = commandBar.getByRole("button", { name: "지도 도구", exact: true });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  const buttons = commandBar.getByRole("button");
  await expect(commandBar.locator('.map-advanced-controls')).toBeVisible();
  expect(await buttons.count()).toBeGreaterThan(4);
  await expect(commandBar.getByRole("button", { name: "◎ 편의 표시", exact: true })).toBeVisible();
  const sizes = await buttons.evaluateAll((nodes) => nodes.map((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return { text: node.textContent?.trim() || "button", width: rect.width, height: rect.height };
  }));
  for (const size of sizes) {
    expect(size.height, `${size.text} 높이`).toBeGreaterThanOrEqual(44);
    expect(size.width, `${size.text} 너비`).toBeGreaterThanOrEqual(44);
  }

  expect(await commandBar.evaluate(node => [...node.querySelectorAll("button")].every(button => {
    const box = node.getBoundingClientRect(), rect = button.getBoundingClientRect();
    return rect.left >= box.left - 1 && rect.right <= box.right + 1;
  }))).toBe(true);
  await expect(commandBar.getByRole("button", { name: "페이지 링크", exact: true })).toBeVisible();

  await openNaruTool(page, "출발 전 확인");
  for (const summary of await page.locator(".simple-readiness > details > summary").all()) await summary.click();
  const readinessActions = page.locator(".simple-readiness button, .simple-readiness a");
  // Four new precaution actions join the existing six readiness controls.
  await expect(readinessActions).toHaveCount(10);
  const precautions = page.getByRole("group", { name: "여행 대비 확인", exact: true });
  await expect(precautions.getByRole("checkbox")).toHaveCount(4);
  for (const [name, href] of [["날씨 확인", "#layers"], ["이동 화면 확인", "#navigation"], ["대여처 확인", "#equipment-rental"], ["도움 요청 확인", "#more-trip-tools"]]) {
    await expect(precautions.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  const readinessSizes = await readinessActions.evaluateAll((nodes) => nodes.map((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return { text: node.textContent?.trim() || "button", width: rect.width, height: rect.height };
  }));
  for (const size of readinessSizes) {
    expect(size.height, `${size.text} 높이`).toBeGreaterThanOrEqual(44);
    expect(size.width, `${size.text} 너비`).toBeGreaterThanOrEqual(44);
  }
});
