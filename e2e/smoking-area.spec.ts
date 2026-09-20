import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFacilityPanel } from './facility-layer-fixtures';

const item = {
  id: 'official-no-smoking-1', name: '공원 외부 금연구역', address: '경상남도 창원시 의창구 중앙대로 1',
  distanceMeters: 135, destination: { latitude: 35.231, longitude: 128.681 },
  institutionName: '창원시청', note: '지정 경계', referenceDate: '2026-06-19',
};

test('금연구역은 켜기 전 요청하지 않고 공식 근거 카드와 사각 핀을 표시한다', async ({ page }) => {
  const panel = await openFacilityPanel(page);
  const requests: string[] = [];
  await page.route('**/api/wave?action=smoking-area**', route => {
    const url = new URL(route.request().url());
    requests.push(url.search);
    return route.fulfill({ json: { status: 'available', contentId: url.searchParams.get('contentId'), kind: 'no-smoking', checkedAt: '2026-09-20T00:00:00.000Z', source: '전국금연구역표준데이터', items: [item] } });
  });
  expect(requests).toEqual([]);
  await panel.getByRole('button', { name: '금연 구역', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect([...new URLSearchParams(requests[0]).keys()].sort()).toEqual(['action', 'contentId']);
  const marker = page.locator('[data-facility-layer="no-smoking"]');
  await expect(marker).toHaveCount(1);
  await expect(marker).toHaveClass(/facility-official/);
  await marker.dispatchEvent('click');
  const card = panel.locator('.facility-card');
  await expect(card).toContainText('공원 외부 금연구역');
  await expect(card).toContainText('여행지 기준 직선거리');
  await expect(card).toContainText('창원시청');
  await expect(card).toContainText('2026-06-19');
  await expect(card).toContainText('전국금연구역표준데이터');
  await expect(card.getByRole('button', { name: '도착지로 선택', exact: true })).toHaveCount(0);
  await expect(panel.locator('.facility-evidence')).toHaveText('공공데이터에 등록된 위치예요. 현재 운영 여부와 정확한 경계는 확인되지 않았어요.');
  expect((await new AxeBuilder({ page }).include('#map-panel-facility').analyze()).violations).toEqual([]);
});

test('빈 결과, 공개 좌표 미확인, 제공처 오류를 서로 다르게 표시한다', async ({ page }) => {
  const panel = await openFacilityPanel(page);
  let status: 'empty' | 'location-unconfirmed' | 'provider-error' = 'empty';
  await page.route('**/api/wave?action=smoking-area**', route => route.fulfill({
    status: status === 'provider-error' ? 502 : 200,
    json: { status, contentId: '1001', kind: 'no-smoking', checkedAt: '', source: '전국금연구역표준데이터', items: [] },
  }));
  const layer = panel.getByRole('button', { name: '금연 구역', exact: true });
  await layer.click();
  await expect(panel.locator('.facility-chip')).toContainText('등록된 위치가 없어요.');
  await layer.click(); status = 'location-unconfirmed'; await layer.click();
  await expect(panel.locator('.facility-chip')).toContainText('이 여행지의 공개 좌표를 확인하지 못했어요.');
  await layer.click(); status = 'provider-error'; await layer.click();
  await expect(panel.locator('.facility-chip.failed')).toContainText('위치 정보를 받지 못했어요.');
  await expect(panel.locator('.facility-chip.failed').getByRole('button', { name: '다시 시도', exact: true })).toBeVisible();
});
