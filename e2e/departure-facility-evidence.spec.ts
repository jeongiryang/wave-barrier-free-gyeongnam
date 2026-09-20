import { closeNaruTool } from './naru-tool-fixtures';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { chooseTripConditions, mockPlannerApi, openItinerary, plan } from './fixtures';
import { openDeparture, departureItem } from './departure-fixtures';
for (const scenario of ['complete', 'partial', 'negative', 'legacy'] as const) for (const en of [false, true]) test(`${scenario} ${en ? 'EN dark' : 'KO light'}: departure facilities require current item-level evidence`, async ({ page }) => {
  await mockPlannerApi(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ en, place }) => {
    localStorage.setItem('wave-locale', en ? 'en' : 'ko'); localStorage.setItem('wave-theme', en ? 'dark' : 'light');
    localStorage.setItem('wave-saved-places', '["1001"]'); localStorage.setItem('wave-saved-place-catalog-v1', JSON.stringify([place]));
  }, { en, place: plan.places[0] });
  const fields = ['parking', 'route', 'wheelchair', 'elevator', 'restroom'].map((key, index) => ({ key, label: key, detail: 'Official facility record', state: scenario !== 'complete' && index === 3 ? 'unknown' : scenario === 'negative' && index === 4 ? 'negative' : 'confirmed' }));
  let searches = 0, omitSavedPlace = false;
  await page.route('**/api/wave?*', route => {
    const params = new URL(route.request().url()).searchParams, action = params.get('action'); if (action !== 'plan' && action !== 'places') return route.fallback();
    const places = plan.places.filter(place => !omitSavedPlace || place.id !== '1001').map(place => ({ ...place, score: 100, knownFields: 5, accessibility: scenario === 'legacy' ? undefined : fields }));
    if (action === 'places') { const ids = (params.get('ids') || '').split(','); return route.fulfill({ json: { places: places.filter(place => ids.includes(place.id)), missing: ids.filter(id => !places.some(place => place.id === id)) } }); }
    searches++; const facilityKeys = (params.get('facilityKeys') || '').split(',').filter(Boolean);
    const isNegative = fields.some(field => facilityKeys.includes(field.key) && field.state === 'negative');
    const isUnknown = scenario === 'legacy' || facilityKeys.some(key => !fields.some(field => field.key === key && field.state === 'confirmed'));
    return route.fulfill({ json: { ...plan, criteria: { facilityKeys }, places: !isNegative && !isUnknown ? places : [], stops: [], explorationPlaces: !isNegative && isUnknown ? places : [], excludedPlaces: isNegative ? places : [] } });
  });
  await page.goto('/planner'); await chooseTripConditions(page); await openItinerary(page, { start: '2026-10-08' }); const card = await openDeparture(page);
  const evidence = await departureItem(page, '장소 편의근거'); const state = scenario === 'complete' ? '조회한 정보 있음' : scenario === 'partial' ? '일부 정보 있음' : '확인할 정보 있음';
  await expect(evidence.locator('summary')).toContainText(state);
  if (scenario !== 'legacy') { await expect(evidence).toContainText(`확인됨 ${scenario === 'complete' ? 5 : scenario === 'partial' ? 4 : 3}`); await expect(evidence).toContainText(`미확인 ${scenario === 'complete' ? 0 : 1}`); await expect(evidence).toContainText(`미제공 기록 ${scenario === 'negative' ? 1 : 0}`); }
  else await expect(evidence).toContainText('항목별 공식 편의근거와 조회 시각');
  await card.scrollIntoViewIfNeeded(); expect((await new AxeBuilder({ page }).include('.simple-readiness').analyze()).violations).toEqual([]);
  if (scenario === 'negative' && test.info().project.name === 'desktop-chromium') for (const width of [960, 1440]) { await page.setViewportSize({ width, height: 900 }); await card.screenshot({ path: test.info().outputPath(`facilities-${en}-${width}.png`) }); }
  if (scenario === 'complete') {
    await closeNaruTool(page);
    const before = searches; await page.locator('.simple-planner-tabs button').first().click(); await page.locator('.simple-facility-trigger').click(); const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
    await picker.getByRole('checkbox', { name: '수유실', exact: true }).check(); expect(searches).toBe(before);
    await picker.getByRole('button', { name: /^적용/ }).click(); await expect.poll(() => searches).toBe(before + 1); await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy', 'false');
    await page.locator('.simple-planner-tabs button').nth(1).click(); await openDeparture(page); await expect(evidence.locator('summary')).toContainText('일부 정보 있음'); await expect(evidence).toContainText('확인됨 5'); await expect(evidence).toContainText('미확인 1');
    omitSavedPlace = true; await card.getByRole('button', { name: '다시 조회', exact: true }).click(); await expect(evidence.locator('summary')).toContainText('확인할 정보 있음');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toEqual(['1001']);
    await page.reload(); await openItinerary(page); await openDeparture(page); await expect(evidence.locator('summary')).toContainText('확인할 정보 있음');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toEqual(['1001']);
  }
});
