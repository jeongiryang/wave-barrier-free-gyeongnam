import { expect, test } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const event = { ...plan.places[1], id: '3001', contentTypeId: '15', name: '합성 편의 유지 축제', image: '',
  startDate: '2026-09-20', endDate: '2026-09-22', phone: '', officialUrl: '', state: 'upcoming', facilityState: 'available', accessibility: [] };
const selected = ['restroom', 'elevator'];

for (const legacy of [false, true]) test(`축제를 담고 돌아와도 ${legacy ? '탭에서 복구한' : '현재 여행의'} 필수 편의를 유지한다`, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-21T03:00:00.000Z'));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API not configured' } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [plan.places[0], event] });
  await mockPublicShellApi(page);
  await page.route('**/api/festivals?**', route => route.fulfill({ json: { items: [event], state: 'live', partial: false, checkedAt: '2026-09-21T03:00:00.000Z' } }));
  const searches: string[][] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan') searches.push((url.searchParams.get('facilityKeys') || '').split(',').filter(Boolean));
  });
  await page.addInitScript(({ legacy, selected, original }) => {
    if (localStorage.getItem('wave-current-trip-v1')) return;
    const values = {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature"]', 'wave-saved-places': '["1001"]',
      'wave-saved-place-catalog-v1': JSON.stringify([original]), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001"]}',
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-09-20', travelEnd: '2026-09-22', dayStartTime: '09:30', travelMode: 'car',
        scheduleAssignments: { '1001': '2026-09-20' }, fixedVisits: { '1001': { kind: 'event', position: 0, time: '11:00' } }, visitMinutesByPlaceId: { '1001': 75 } }),
      ...(!legacy ? { 'wave-trip-facilities-v1': JSON.stringify(selected) } : {}),
    };
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
    sessionStorage.setItem('wave-session-facilities-v1', JSON.stringify(selected));
  }, { legacy, selected, original: plan.places[0] });
  await page.goto('/festivals');
  const card = page.locator('.festival-card').filter({ has: page.getByRole('heading', { name: event.name, exact: true }) });
  await card.locator('.night-festival-more > summary').click();
  await card.getByLabel('방문 날짜', { exact: true }).fill('2026-09-21');
  await card.getByRole('button', { name: '내 일정에 담기', exact: true }).click();
  await expect(page).toHaveURL(/\/planner\?region=.*#itinerary$/);
  await page.locator('.simple-planner-tabs button').first().click();
  await page.locator('.simple-facility-trigger').click();
  const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
  await expect(picker.getByRole('checkbox', { name: '장애인 화장실', exact: true })).toBeChecked();
  await expect(picker.getByRole('checkbox', { name: '승강기', exact: true })).toBeChecked();
  await expect.poll(() => searches.at(-1)?.sort()).toEqual([...selected].sort());
  const persisted = await page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1')!).values;
    return { facilities: JSON.parse(values['wave-trip-facilities-v1']), session: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1')!),
      ids: JSON.parse(values['wave-saved-places']), schedule: JSON.parse(values['wave-trip-schedule-v1']) };
  });
  expect(persisted.facilities.sort()).toEqual([...selected].sort());
  expect(persisted.session.sort()).toEqual([...selected].sort());
  expect(persisted.ids).toEqual(['1001', '3001']);
  expect(persisted.schedule).toMatchObject({ travelStart: '2026-09-20', travelEnd: '2026-09-22', travelMode: 'car', dayStartTime: '09:30',
    scheduleAssignments: { '1001': '2026-09-20', '3001': '2026-09-21' }, fixedVisits: { '1001': { kind: 'event', position: 0, time: '11:00' } }, visitMinutesByPlaceId: { '1001': 75, '3001': 120 } });
});
