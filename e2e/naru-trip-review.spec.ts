import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });
async function setup(page: Page, dated = true) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'fixture only' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route('**/api/route?**', route => route.fulfill({ status: 503, json: { error: 'route unavailable' } }));
  let aiCalls = 0;
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: false } });
    aiCalls++; return route.fulfill({ status: 503, json: { error: 'offline' } });
  });
  await page.addInitScript(({ places, dated }) => {
    localStorage.setItem('wave-naru-starter-v1', 'done');
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-saved-places': '["1001","1002"]',
      'wave-saved-place-catalog-v1': JSON.stringify(places),
      'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}',
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: dated ? '2026-10-14' : '', travelEnd: dated ? '2026-10-14' : '', dayStartTime: '10:00', travelMode: 'car',
        scheduleAssignments: {}, visitMinutesByPlaceId: { '1001': 120, '1002': 90 }, breakMinutesByPlaceId: {},
        fixedVisits: { '1002': { kind: 'visit', time: '10:30', position: 1 } },
        dayDeadlines: { '2026-10-14': { time: '12:00', returnMinutes: null, bufferMinutes: 15 } },
        comfort: { maxWalkMinutes: 15, breakEveryMinutes: 60, breakMinutes: 20 } })
    }}));
  }, { places: plan.places, dated });
  await page.goto('/planner');
  await expect(page.locator(".wave-header").locator(".wave-my-trips")).toBeEnabled();
  await page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  return { chat, aiCalls: () => aiCalls };
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values['wave-trip-schedule-v1']);

test('모델 연결 없이 일정 지각·귀가 미확인·휴식·추정 구간을 설명하고 여행을 보존한다', async ({ page }) => {
  const { chat, aiCalls } = await setup(page);
  const before = await saved(page);
  await chat.locator('.naru-suggestions > summary').click();
  await chat.getByRole('button', { name: '내 여행 점검', exact: true }).click();
  const review = chat.getByRole('region', { name: '나루 여행 점검', exact: true });
  await expect(review).toBeFocused();
  await expect(review).toContainText('용지호수공원: 고정 시각 10:30보다 예상 도착이');
  await expect(review).toContainText('귀가 이동시간도 아직 빠져 있어요');
  await expect(review).toContainText('추정값');
  await expect(review).toContainText('경남도립미술관 방문 뒤 휴식');
  await expect(review).toContainText('이동시간은 걷기시간과 다릅니다');
  expect(await saved(page)).toBe(before);
  expect(aiCalls()).toBe(0);
  await review.getByRole('button', { name: '나루에게 여유로운 변경안 요청', exact: true }).click();
  await expect(chat.getByRole('textbox')).toHaveValue('기존 날짜와 고정 방문을 유지하고 현재 일정에서 이동 부담을 줄여줘');
  expect(await saved(page)).toBe(before);
  expect(aiCalls()).toBe(0);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('날짜 없는 여행 점검은 날짜 입력으로 연결하고 임의 날짜를 생성하지 않는다', async ({ page }) => {
  const { chat, aiCalls } = await setup(page, false);
  const before = await saved(page);
  await chat.getByRole('textbox').fill('일정 점검해줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  const review = chat.getByRole('region', { name: '나루 여행 점검', exact: true });
  await expect(review).toContainText('담은 2곳은 그대로');
  expect(await saved(page)).toBe(before);
  await review.getByRole('button', { name: '날짜·출발지 정하기', exact: true }).click();
  await expect(chat).toBeHidden();
  await expect(page.locator('#itinerary-setup input').first()).toBeFocused();
  expect(aiCalls()).toBe(0);
});


test('여행 점검은 PC·태블릿·모바일에서 넘치지 않고 기존 설정으로 연결된다', async ({ page }, info) => {
  const { chat } = await setup(page);
  await chat.locator('.naru-suggestions > summary').click();
  await chat.getByRole('button', { name: '내 여행 점검', exact: true }).click();
  const review = chat.getByRole('region', { name: '나루 여행 점검', exact: true });
  await expect(review).toBeVisible();
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    const geometry = await review.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth,
      buttons: [...element.querySelectorAll('button')].filter(button => button.checkVisibility()).map(button => button.getBoundingClientRect().height) }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.buttons.every(height => height >= 44)).toBe(true);
    await page.screenshot({ path: info.outputPath(`review-${width}.png`) });
  }
  await review.getByRole('button', { name: '걷기·휴식·귀가 설정', exact: true }).click();
  await expect(chat).toBeVisible();
  await expect(chat.locator('.simple-day-options > summary')).toBeFocused();
});
