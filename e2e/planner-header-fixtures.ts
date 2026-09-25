import { expect, type Page } from '@playwright/test';
import { openSupportMenu } from './support-menu';

/** The retired header-row reset action lives in the shared support menu. */
export async function newTripAction(page: Page) {
  await openSupportMenu(page);
  const action = page.locator('.wave-support-panel').getByRole('button', { name: /^(새 여행|New trip)$/, exact: true });
  await expect(action).toBeEnabled();
  return action;
}

export async function startNewTrip(page: Page) {
  await (await newTripAction(page)).click();
  await finishNewTrip(page);
}

export async function closeNewTripMenu(page: Page) {
  await page.locator('.wave-support-trigger').press('Escape');
  await expect(page.locator('.wave-support-panel')).toBeHidden();
}

export async function finishNewTrip(page: Page) {
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toHaveValue('');
  await expect(page.locator('.wave-support-panel')).toBeHidden();
}
