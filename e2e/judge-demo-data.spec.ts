import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("공개 DB 일정은 모든 방문자에게 보이고 공식 장소 한도 오류를 숨기지 않는다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.route("**/api/judge-demo-trips", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ trips: [{
      id: "judge-changwon", title: "[시연] 창원 문화와 공원", region: "창원", theme: "역사·문화",
      note: "장소별 운영시간과 출입 편의는 출발 전에 확인하세요.", profileKeys: ["route", "restroom"],
      placeIds: ["1748884", "1904774", "2784014"], dayOffsets: [0, 0, 1],
      visitMinutes: [75, 90, 60], breakMinutes: [15, 20, 20],
    }] }),
  }));
  await page.route(/\/api\/wave\?.*action=places/, route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ places: [], missing: ["1748884", "1904774", "2784014"], failure: {
      provider: "KorService2", operation: "detailCommon2", kind: "quota_exhausted",
    } }),
  }));

  await page.goto("/travel-book");
  await expect(page.getByRole("heading", { name: "[시연] 창원 문화와 공원" })).toBeVisible();
  await page.getByRole("button", { name: "내 여행에 사본 담기" }).click();
  await expect(page.getByText(/현재 제공처의 이용 한도로 최신 정보를 확인하지 못했습니다/)).toBeVisible();
  await expect(page.getByText(/공식 장소를 모두 확인할 때까지 일정 사본은 담지 않습니다/)).toBeVisible();
});
