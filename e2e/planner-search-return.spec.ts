import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import { chooseWaveOption } from './wave-select-fixture';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

async function currentTrip(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    const parse = (key: string, fallback: string) => JSON.parse(values[key] || fallback);
    return {
      ids: parse('wave-saved-places', '[]'),
      schedule: parse('wave-trip-schedule-v1', '{}'),
      facilities: parse('wave-trip-facilities-v1', '[]'),
      region: values['wave-planner-region-v1'] || '',
      identity: parse('wave-trip-identity-v1', 'null'),
    };
  });
}

for (const boundary of ['missing region and catalogue', 'failed plan request'] as const) {
  test(`a restored itinerary returns to search with ${boundary} without replacing the trip`, async ({ page }, info) => {
    const failedPlan = boundary === 'failed plan request';
    let failRequest = failedPlan;
    const requests: URL[] = [], unconfigured: string[] = [], errors: string[] = [];
    const origin = new URL(String(info.project.use.baseURL)).origin;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && !url.pathname.startsWith('/api/')) return route.continue();
      unconfigured.push(url.href);
      return route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic request' } });
    });
    await mockPublicShellApi(page);
    await mockPlannerApi(page, { preserveView: true });
    await page.route('**/api/wave?*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('action') !== 'plan') return route.fallback();
      requests.push(url);
      return failRequest
        ? route.fulfill({ status: 503, json: { error: 'Synthetic plan failure' } })
        : route.fallback();
    });
    await page.addInitScript(({ failedPlan, place }) => {
      const values = {
        'wave-saved-places': JSON.stringify([place.id]),
        // Older saved IDs can be resolved without a local place catalogue.
        'wave-saved-place-catalog-v1': JSON.stringify(failedPlan ? [place] : []),
        'wave-planner-region-v1': failedPlan ? '창원' : '',
        'wave-trip-facilities-v1': JSON.stringify(['parking', 'restroom']),
        'wave-trip-themes-v1': '[]',
        'wave-trip-identity-v1': JSON.stringify({ version: 1, id: '00000000-0000-4000-8000-000000000901', binding: null, share: null }),
        'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: [place.id] }),
        'wave-trip-schedule-v1': JSON.stringify({
          travelStart: '2026-10-08', travelEnd: '2026-10-09', dayStartTime: '10:00', travelMode: 'transit',
          scheduleAssignments: { [place.id]: '2026-10-08' }, visitMinutesByPlaceId: { [place.id]: 60 },
          fixedVisits: {}, dayDeadlines: {}, comfort: { maxWalkMinutes: 15, breakEveryMinutes: 60, breakMinutes: 15 },
          breakMinutesByPlaceId: {}, restPurposeByPlaceId: {},
        }),
      };
      localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
      localStorage.setItem('wave-planner-stage-view-v2', 'guided');
      sessionStorage.setItem('wave-planner-active-step-v1', 'itinerary');
    }, { failedPlan, place: plan.places[0] });

    await page.goto('/planner#itinerary', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.simple-stops > li')).toContainText('경남도립미술관');
    // Place evidence may arrive after initial stage validation. Use the actual
    // now-ready header action to enter the restored trip before testing return.
    await page.locator('.wave-header .wave-my-trips').click();
    await expect(page.getByRole('button', { name: '경남도립미술관 일정 수정', exact: true })).toBeEnabled();
    if (failedPlan) await expect(page.locator('.simple-results')).toContainText('서버가 요청을 처리하지 못했어요.');
    else expect(requests).toEqual([]);
    const before = await currentTrip(page);
    expect(before).toMatchObject({
      ids: ['1001'], facilities: ['parking', 'restroom'], region: failedPlan ? '창원' : '',
      identity: { id: '00000000-0000-4000-8000-000000000901', binding: null, share: null },
      schedule: { travelStart: '2026-10-08', travelEnd: '2026-10-09', scheduleAssignments: { '1001': '2026-10-08' }, visitMinutesByPlaceId: { '1001': 60 } },
    });

    await page.locator('.wave-header').getByRole('link', { name: '여행지 검색', exact: true }).click();
    await expect(page).toHaveURL(failedPlan ? /#places$/ : /#conditions$/);
    await expect(page.locator('.simple-browse-view')).toBeVisible();
    await expect(page.locator('#itinerary')).toBeHidden();
    const focusedHeading = page.locator(failedPlan ? '#places' : '#conditions').locator('h2:focus, h3:focus');
    await expect(focusedHeading).toHaveCount(1);
    await expect(focusedHeading).toBeVisible();
    await expect(focusedHeading).toBeInViewport();
    expect(await currentTrip(page)).toEqual(before);

    if (failedPlan) {
      await expect(page.locator('.simple-results')).toContainText('서버가 요청을 처리하지 못했어요.');
      failRequest = false;
      await page.getByRole('button', { name: '같은 조건으로 다시 시도', exact: true }).click();
    } else {
      await chooseWaveOption(page.getByRole('combobox', { name: '여행 지역', exact: true }), '창원');
    }
    await expect(page.locator('.simple-results[aria-busy="false"] .simple-place-row')).toHaveCount(2);
    await expect(page.getByRole('button', { name: '용지호수공원 일정에 담기', exact: true })).toBeEnabled();
    expect(requests.length).toBeGreaterThanOrEqual(failedPlan ? 2 : 1);
    for (const request of requests) {
      expect(request.searchParams.get('region')).toBe('창원');
      expect(request.searchParams.get('facilityKeys')).toBe('parking,restroom');
    }
    expect(await currentTrip(page)).toEqual({ ...before, region: '창원' });
    expect(errors).toEqual([]);
    expect(unconfigured).toEqual([]);
  });
}
