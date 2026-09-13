import { expect, type Page } from '@playwright/test';
import { chooseTripConditions, openItinerary } from './fixtures';
export async function enterDeparture(page: Page, name = '경남도립미술관') {
  await chooseTripConditions(page);
  await page.locator('.simple-place-row').filter({ has: page.getByRole('heading', { name, exact: true }) }).locator('.simple-place-add').click();
  await openItinerary(page, { start: '2026-10-08', end: '2026-10-09' });
  return openDeparture(page);
}
export async function openDeparture(page: Page) {
  const section = page.locator('#departure-readiness');
  if (await section.getAttribute('open') === null) await section.locator(':scope > summary').click();
  await expect(section.locator('.simple-readiness')).toBeVisible();
  return section.locator('.simple-readiness');
}
export async function departureItem(page: Page, label: string) {
  const item = page.locator('.simple-readiness > details').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${label}$`) }) });
  if (await item.getAttribute('open') === null) await item.locator('summary').click();
  return item;
}
export async function routeTools(page: Page) {
  const tools = page.locator('.simple-more-trip-tools');
  if (await tools.getAttribute('open') === null) await tools.locator(':scope > summary').click();
  return page.locator('.itinerary-route-coverage');
}
export async function validShareApi(page: Page, id = 'abcdef123456') {
  await page.route('**/api/trips', route => route.fulfill({ status: 201, json: { id, url: `${new URL(route.request().url()).origin}/trip/${id}`, live: true, revision: 1, expiresAt: Date.now() + 30 * 86400000 } }));
}
