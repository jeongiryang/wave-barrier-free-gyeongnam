import { expect, test } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

test('추천에 담은 실제 주소 형태의 미술관은 직접 검색에서도 같은 공식 장소로 유지된다', async ({ page }) => {
  const museum = { ...plan.places[0], id: '1622590', name: '경남도립미술관', address: '경상남도 창원시 의창구 용지로 296 (퇴촌동)',
    mapX: '128.6908827248', mapY: '35.2395039295', accessibility: [{ key: 'restroom', label: '장애인 화장실', state: 'confirmed' as const, detail: '장애인 전용 화장실 있음' }] };
  const searched = { id: '23821302', name: museum.name, address: '경남 창원시 의창구 용지로 296', mapX: '128.69085550149', mapY: '35.2394650280721', resultType: 'tourism', placeUrl: 'https://place.map.kakao.com/23821302' };
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API not configured' } }));
  await mockPlannerApi(page, { savedPlaces: [museum] }); await mockPublicShellApi(page);
  await page.route('**/api/wave?**', route => {
    if (new URL(route.request().url()).searchParams.get('action') === 'plan') return route.fulfill({ json: { ...plan, places: [museum], stops: [] } });
    return route.fallback();
  });
  await page.route('**/api/location-search?**', route => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('official')).toBe('1'); expect(params.get('profiles')).toBe('restroom');
    return route.fulfill({ json: { places: [searched, { ...searched, id: '10173325', name: '경남도립미술관 도서자료실' }], officialPlaces: [museum], officialState: 'available' } });
  });
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.locator('.simple-facility-trigger').click();
  const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
  await picker.getByRole('checkbox', { name: '장애인 화장실', exact: true }).check();
  await picker.getByRole('button', { name: /^적용/ }).click();
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  const savedIds = () => page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1')!).values['wave-saved-places']));
  await expect.poll(savedIds).toEqual(['1622590']);
  const query = page.getByRole('combobox', { name: '여행지 검색', exact: true });
  await query.fill(museum.name); await query.press('Enter');
  const results = page.locator('#direct-place-results'), venue = results.getByRole('listitem').first();
  await expect(venue).toContainText('장애인 화장실 확인됨');
  await expect(venue).toContainText('무장애 여행정보 · 국문 관광정보');
  await expect(venue.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(results.getByRole('listitem').nth(1)).toContainText('공식 관광정보 연결 미확인 · 시설은 별도 확인');
  // The saved action reverses the same official visit; it cannot add a second
  // Kakao-ID visit with unknown facilities to the existing recommendation.
  await venue.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true }).click();
  await expect.poll(savedIds).toEqual([]);
  await venue.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  await expect.poll(savedIds).toEqual(['1622590']);
  await venue.getByRole('button', { name: museum.name, exact: true }).click();
  await expect(page.locator('.simple-place-pane[open]')).toContainText('장애인 전용 화장실 있음');
});
