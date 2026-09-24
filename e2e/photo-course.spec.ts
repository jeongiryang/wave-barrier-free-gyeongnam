import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { buildExifJpeg } from "../tests/helpers/exif-jpeg.mjs";

test("사진 EXIF 코스를 기기 안에서 복원하고 좌표 없이 공식정보를 확인한다", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
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

  await page.goto("/photo-course");
  await expect(page.getByRole("heading", { name: "사진 속 여행을 다시 코스로 연결해요." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "다녀온 사진을 고르면 날짜별 코스를 다시 만듭니다" })).toBeVisible();
  await expect(page.locator(".photo-course[data-client-ready='true']")).toBeAttached();
  const helpButton = page.locator(".photo-course-help-button");
  await helpButton.click();
  const help = page.getByRole("dialog", { name: "사진 코스 사용 방법", exact: true });
  await expect(help).toBeVisible();
  await expect(help.getByText("같은 지역의 동일 장소만 연결하고, 확인되지 않으면 비워 둡니다.", { exact: true })).toBeVisible();
  await expect(help.getByRole("heading", { name: "사진 코스 사용 방법", exact: true })).toBeFocused();
  await help.getByRole("button", { name: "확인", exact: true }).click();
  await expect(helpButton).toBeFocused();
  const input = page.locator("#photo-course-input");
  await expect(input).toBeEnabled();

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
  const stopRegion = page.getByRole("combobox", { name: "시·군", exact: true }).first();
  const officialLookup = page.getByRole("button", { name: "공식정보 확인", exact: true }).first();
  // EXIF coordinates group photos locally; they cannot infer a region that will
  // be sent to a provider. A typed place name does not grant that permission.
  await expect(placeName).toHaveValue("방문지 1");
  await expect(stopRegion).toHaveValue("");
  await expect(officialLookup).toBeDisabled();
  expect(outgoingSpotPhotoUrls).toHaveLength(0);
  await placeName.fill("남해 독일마을");
  await expect(stopRegion).toHaveValue("");
  await expect(officialLookup).toBeDisabled();
  expect(outgoingSpotPhotoUrls).toHaveLength(0);
  await stopRegion.selectOption("남해");
  await expect(officialLookup).toBeEnabled();
  expect(outgoingSpotPhotoUrls).toHaveLength(0);

  await officialLookup.click();
  await expect(page.getByText(/공식정보 번호 123456/)).toBeVisible();
  expect(outgoingSpotPhotoUrls).toHaveLength(1);
  const requestUrl = new URL(outgoingSpotPhotoUrls[0]);
  expect(requestUrl.searchParams.get("action")).toBe("spot-photo");
  expect(requestUrl.searchParams.get("region")).toBe("남해");
  expect(requestUrl.searchParams.get("title")).toBe("남해 독일마을");
  expect(requestUrl.searchParams.get("strict")).toBe("1");
  expect(requestUrl.search).not.toMatch(/lat|lng|point|34\.8377|127\.8925/i);

  await page.getByRole("button", { name: "여행 조건에 반영하기" }).click();
  await expect(page).toHaveURL(/\/planner\?[^#]*region=%EB%82%A8%ED%95%B4/);
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toHaveValue("남해");
  await expect(page.locator(".simple-results").getByRole("heading", { name: "남해 여행지", exact: true })).toBeVisible();
  const period = () => page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    const saved = JSON.parse(values["wave-trip-schedule-v1"] || "{}");
    return [saved.travelStart, saved.travelEnd];
  });
  await expect.poll(period).toEqual(["2026-08-14", "2026-08-14"]);
  const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await expect(tabs.getByRole("button", { name: /^내 일정/ })).toBeEnabled();
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await tabs.getByRole("button", { name: /^내 일정/ }).click();
  await expect(page.locator(".simple-initial-setup")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "일정 날짜", exact: true })).toContainText("08/14");
  await expect(page.locator(".simple-itinerary-heading")).toContainText("2026-08-14");
  expect(await period()).toEqual(["2026-08-14", "2026-08-14"]);
  await page.reload();
  await expect(page.locator(".simple-itinerary-heading")).toContainText("2026-08-14");
  expect(await period()).toEqual(["2026-08-14", "2026-08-14"]);
});
