import { expect, test } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import { placeFrom } from '../server/tourism/accessibility-model';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

test('시설 상세는 제공처 서식을 텍스트로 읽고 없음과 미확인을 그대로 구분한다', async ({ page }, info) => {
  // Exercise the real provider-to-place normalization before the browser renders
  // this synthetic API response; no live provider credentials are needed.
  const place = placeFrom({ contentid: '1001', title: '합성 시설 서식 관광지', contenttypeid: '14', addr1: '경상남도 창원시', mapx: '128.691', mapy: '35.238' }, {
    restroom: '장애인 전용 화장실 있음<br />전시실이 위치한 1,2,3층&nbsp;안내소 &amp; 입구 옆',
    elevator: '승강기 없음<BR/>직원에게 문의', parking: '정보 없음', route: '주출입구 접근로 있음<br>정문을 이용하세요.',
  }, '창원', ['restroom', 'elevator', 'parking', 'route'], 0);
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API not configured' } }));
  await mockPlannerApi(page); await mockPublicShellApi(page);
  await page.route('**/api/wave?**', route => {
    const action = new URL(route.request().url()).searchParams.get('action');
    if (action === 'plan') return route.fulfill({ json: { ...plan, places: [place], stops: [] } });
    if (action === 'places') return route.fulfill({ json: { places: [place], missing: [] } });
    return route.fallback();
  });
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.getByRole('button', { name: place.name, exact: true }).click();
  const pane = page.locator('.simple-place-pane[open]');
  const evidence = pane.locator('.facility-evidence-list');
  await expect(evidence.getByText('장애인 전용 화장실 있음 전시실이 위치한 1,2,3층 안내소 & 입구 옆', { exact: true })).toBeVisible();
  await expect(evidence.locator('[data-state="negative"]')).toContainText('승강기 없음 직원에게 문의');
  await expect(evidence.locator('[data-state="unknown"]')).toContainText('정보 없음');
  await expect(pane.locator('.place-decision-summary')).not.toContainText('<br');
  await expect(pane.locator('.place-decision-summary')).not.toContainText('&nbsp;');
  await expect(evidence.locator('script, img, iframe')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await pane.screenshot({ path: info.outputPath('facility-evidence-text.png') });
});
