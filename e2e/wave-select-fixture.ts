import { expect, type Locator } from '@playwright/test';

/** Exercise the visible select menu while resolving the native form value. */
export async function chooseWaveOption(field: Locator, value: string) {
  await expect(field).toBeEnabled();
  const native = field.locator('..').locator('select');
  const label = await native.evaluate((node: HTMLSelectElement, target) => Array.from(node.options).find(option => option.value === target)?.text, value);
  if (label === undefined) throw new Error(`Unknown select value: ${value}`);
  await field.click();
  await field.page().getByRole('listbox').getByRole('option', { name: label, exact: true }).click();
  await expect(native).toHaveValue(value);
}
