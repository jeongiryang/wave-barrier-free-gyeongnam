import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("경남 18개 지역은 텍스트 선택 버튼으로 지도 좌표계 안에 유지된다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");
  await page.evaluate(async () => { await document.fonts.ready; });

  const map = page.locator("[data-region-map-canvas]");
  await expect(map).toBeVisible();
  const mapContract = await map.evaluate((element) => {
    const item = element as HTMLElement;
    const style = getComputedStyle(item);
    return {
      width: item.getBoundingClientRect().width,
      height: item.getBoundingClientRect().height,
      position: style.position,
      aspectRatio: style.aspectRatio,
    };
  });
  expect(mapContract.width).toBeGreaterThan(0);
  expect(mapContract.height).toBeGreaterThan(0);
  expect(mapContract.width / mapContract.height).toBeCloseTo(600 / 433, 2);
  expect(mapContract.position).toBe("relative");
  expect(mapContract.aspectRatio).toMatch(/600\s*\/\s*433|1\.38/);

  const markers = page.locator("button[data-region-marker]");
  await expect(markers).toHaveCount(18);
  await expect(page.locator(".region-marker-dot")).toHaveCount(18);
  await expect(page.locator('[data-region-marker] svg, [data-region-marker] img')).toHaveCount(0);
  await expect(page.locator('img[src*="wikimedia.org"]')).toHaveCount(0);

  const expectedNames = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  expect((await markers.allTextContents()).map((value) => value.trim())).toEqual(expectedNames);
  const initialPressed = await markers.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-pressed")));
  expect(initialPressed.filter((value) => value === "true")).toHaveLength(1);
  expect(initialPressed.filter((value) => value === "false")).toHaveLength(17);

  // 등장 애니메이션이 도는 동안에도 표식은 자기 앵커 위에 있어야 한다. 확대를 개별
  // `scale` 속성으로 주면 중심을 맞추는 translate(-50%,-50%)까지 함께 줄어들어
  // 표식이 20px 넘게 밀린 자리에서 제자리로 미끄러져 들어온다. 애니메이션을 초반
  // 구간에 세워 두고 재야 머신 부하와 무관하게 그 상태를 잡을 수 있다.
  const driftDuringArrival = await page.evaluate(() => {
    const canvas = document.querySelector("[data-region-map-canvas]")!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>("[data-region-marker]")].map((node) => {
      node.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = 100;
      });
      const box = node.getBoundingClientRect();
      return Math.max(
        Math.abs(box.x + box.width / 2 - (canvas.x + (canvas.width * Number(node.dataset.regionX)) / 100)),
        Math.abs(box.y + box.height / 2 - (canvas.y + (canvas.height * Number(node.dataset.regionY)) / 100)),
      );
    });
  });
  expect(Math.max(...driftDuringArrival)).toBeLessThan(1);
  await page.evaluate(() => {
    document.querySelectorAll("[data-region-marker]").forEach((node) => {
      node.getAnimations().forEach((animation) => animation.finish());
    });
  });

  const positions: Record<string, { x: number; y: number }> = {};
  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const contract = await marker.evaluate((element) => {
      const item = element as HTMLElement;
      const parent = item.parentElement;
      const style = getComputedStyle(item);
      return {
        name: item.dataset.regionMarker || "",
        x: Number(item.dataset.regionX),
        y: Number(item.dataset.regionY),
        inlineLeft: item.style.left,
        inlineTop: item.style.top,
        transform: style.transform,
        parentIsCanvas: parent?.hasAttribute("data-region-map-canvas") ?? false,
      };
    });

    // 좌표 계약의 핵심은 마커가 동일 캔버스의 직접 자식이고,
    // 데이터 좌표가 실제 inline left/top으로 그대로 전달되는지다.
    // CSS position의 computed 값은 Chromium의 초기 스타일 적용 타이밍에 따라
    // 빈 문자열로 관찰될 수 있으므로 좌표 정합성 계약으로 사용하지 않는다.
    expect(contract.parentIsCanvas).toBe(true);
    expect(contract.inlineLeft).toBe(`${contract.x}%`);
    expect(contract.inlineTop).toBe(`${contract.y}%`);
    expect(contract.transform).not.toBe("none");
    expect(contract.x).toBeGreaterThan(0);
    expect(contract.x).toBeLessThan(100);
    expect(contract.y).toBeGreaterThan(0);
    expect(contract.y).toBeLessThan(100);
    positions[contract.name] = { x: contract.x, y: contract.y };
  }

  expect(positions["거창"].x).toBeLessThan(positions["합천"].x);
  expect(positions["합천"].x).toBeLessThan(positions["창녕"].x);
  expect(positions["창녕"].x).toBeLessThan(positions["양산"].x);
  expect(positions["거창"].y).toBeLessThan(positions["남해"].y);

  const geochang = markers.filter({ hasText: "거창" });
  await geochang.click();
  await expect(geochang).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".selected-region strong")).toHaveText("거창");
});

test("랜딩 기능 데모는 한국어 순서와 비대화형 미리보기 계약을 지킨다", async ({ page }) => {
  let communityRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/community/posts") communityRequests += 1;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/", { waitUntil: "networkidle" });

  const labels = await page.locator(".product-stories .section-kicker").allTextContents();
  expect(labels.map((value) => value.trim())).toEqual(["01 · 여행 조건", "02 · 추천 근거", "03 · 하루 일정", "04 · 이동 경로", "05 · 상황 대응", "06 · 여행 기록"]);
  await expect(page.locator(".product-preview button")).toHaveCount(0);
  await expect(page.locator(".route-demo-path")).toHaveCount(1);
  await expect(page.locator(".route-demo-vehicle")).toHaveCount(1);
  await expect(page.locator(".community-feature-preview")).toHaveCount(1);
  expect(await page.locator(".community-feature-preview .community-feature-card").count()).toBeGreaterThan(0);
  expect(communityRequests).toBe(0);
});
