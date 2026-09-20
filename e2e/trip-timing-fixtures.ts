import { expect, type Page } from '@playwright/test';

/** Existing feature flows explicitly acknowledge known synthetic schedule warnings. */
export async function acceptTripTimingWarning(page: Page) {
  const warning = page.getByRole('dialog', { name: '저장·공유 전 일정 확인', exact: true });
  if (await warning.isVisible()) {
    await expect(warning.locator('li')).not.toHaveCount(0);
    await warning.getByRole('button', { name: '확인하고 계속', exact: true }).click();
    await expect(warning).toHaveCount(0);
  }
}
