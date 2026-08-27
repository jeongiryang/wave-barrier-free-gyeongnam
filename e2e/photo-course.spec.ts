import { expect, test } from "@playwright/test";
import { buildExifJpeg } from "../tests/helpers/exif-jpeg.mjs";

test("사진 EXIF 코스를 기기 안에서 복원하고 좌표 없이 공식정보를 확인한다", async ({ page }) => {
  const outgoingSpotPhotoUrls: string[] = [];
  await page.route(/\/api\/wave\?.*action=spot-photo/, async (route) => {
    outgoingSpotPhotoUrls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "live",
        image: "https://example.com/german-village.jpg",
        source: "한국관광공사 관광정보",
        matchedTitle: "남해 독일마을",
        contentId: "123456",
        address: "경상남도 남해군 삼동면",
        query: "남해 독일마을",
      }),
    });
  });

  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "다녀온 사진을 고르면 날짜별 코스를 다시 만듭니다" })).toBeVisible();
  const input = page.locator("#photo-course-input");
  await expect(input).toBeEnabled();
  await expect(page.locator(".photo-course[data-client-ready='true']")).toBeAttached();

  const jpeg = Buffer.from(buildExifJpeg({
    takenAt: "2026:08:14 09:31:02",
    lat: 34.8377,
    lng: 127.8925,
  }));
  await input.setInputFiles({
    name: "gyeongnam-trip.jpg",
    mimeType: "image/jpeg",
    buffer: jpeg,
  });

  await expect(page.getByText("사진 1장에서 1일치 코스를 만들었습니다.")).toBeVisible();
  const placeName = page.getByLabel("방문지 이름").first();
  await expect(placeName).toHaveValue("남해 방문지 1");
  await placeName.fill("남해 독일마을");

  await page.getByRole("button", { name: "공식정보 확인", exact: true }).first().click();
  await expect(page.getByText("contentId 123456")).toBeVisible();
  expect(outgoingSpotPhotoUrls).toHaveLength(1);
  const requestUrl = new URL(outgoingSpotPhotoUrls[0]);
  expect(requestUrl.searchParams.get("action")).toBe("spot-photo");
  expect(requestUrl.searchParams.get("region")).toBe("남해");
  expect(requestUrl.searchParams.get("title")).toBe("남해 독일마을");
  expect(requestUrl.searchParams.get("strict")).toBe("1");
  expect(requestUrl.search).not.toMatch(/lat|lng|point|34\.8377|127\.8925/i);

  await page.getByRole("button", { name: "여행 조건에 반영하기" }).click();
  await expect(page.getByText(/남해 · 2026-08-14 ~ 2026-08-14 · 1일 1곳을 여행 조건에 반영했습니다/)).toBeVisible();
});